// Builds test/fixtures/context-map-harness and screenshots it (desktop + mobile, three palettes).
// Usage: node scripts/context-map-preview-shots.mjs <outDir>
import { build } from "vite";
import react from "@vitejs/plugin-react";
import http from "node:http";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const out = process.argv[2]; mkdirSync(out, { recursive: true });
const { chromium } = createRequire(`file://${process.env.PLAYWRIGHT_DIR || "/opt/node-tools"}/node_modules/`)("playwright");
const dist = mkdtempSync(join(tmpdir(), "ctxmap-"));
const harness = join(root, "test/fixtures/context-map-harness");
await build({ root: harness, logLevel: "error", plugins: [react()],
  build: { outDir: dist, emptyOutDir: true, rollupOptions: { input: join(harness, "index.html") } } });
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const server = http.createServer((req, res) => {
  const file = join(dist, req.url.split("?")[0] === "/" ? "index.html" : req.url.split("?")[0]);
  if (!existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" }).end(readFileSync(file));
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.PERF_CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const shots = [];
for (const [device, viewport] of [["desktop", { width: 1280, height: 860 }], ["mobile", { width: 390, height: 900 }]]) {
  for (const theme of ["light", "parchment", "dark"]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
    for (const [tag, query] of [["selected", "&select=e67caa39"], ["admin", "&audience=admin&select=3fd27516"], ["resting", ""]]) {
      await page.goto(`${base}?theme=${theme}${query}`); await page.waitForSelector("[data-context-map]");
      const file = join(out, `${device}-${theme}-${tag}.png`); await page.screenshot({ path: file, fullPage: true }); shots.push(file);
    }
    await page.close();
  }
}
await browser.close(); server.close();
console.log(shots.join("\n"));
