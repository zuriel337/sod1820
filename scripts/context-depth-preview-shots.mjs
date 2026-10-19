// Builds the context-depth harness page and screenshots it. Usage: node scripts/context-depth-preview-shots.mjs <outDir>
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
const dist = mkdtempSync(join(tmpdir(), "ctxdepth-"));
const harness = join(root, "test/fixtures/context-map-harness");
await build({ root: harness, logLevel: "error", plugins: [react()], build: { outDir: dist, emptyOutDir: true, rollupOptions: { input: join(harness, "depth.html") } } });
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const server = http.createServer((req, res) => {
  const path = req.url.split("?")[0]; const file = join(dist, path === "/" ? "depth.html" : path);
  if (!existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" }).end(readFileSync(file));
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.PERF_CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const shots = [];
// Interactions are real clicks on the production card: open the meter, pick a number, pick a map point.
const plan = [
  ["compare", "&view=compare", []],
  ["opened", "", ["[data-context-depth-compact]"]],
  ["n787", "", ["[data-context-depth-compact]", "button[aria-pressed]:has(b:text-is('787'))"]],
  ["n1718map", "", ["[data-context-depth-compact]", "button[aria-pressed]:has(b:text-is('1718'))", ".sod29-ctxmap-node >> nth=0"]],
  ["admin1718", "&audience=admin", ["[data-context-depth-compact]", "button[aria-pressed]:has(b:text-is('1718'))", ".sod29-ctxmap-node >> nth=2"]],
];
for (const [device, viewport] of [["desktop", { width: 1280, height: 900 }], ["mobile", { width: 390, height: 900 }]]) {
  for (const theme of ["light", "parchment", "dark"]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
    for (const [tag, query, clicks] of plan) {
      await page.goto(`${base}?theme=${theme}${query}`); await page.waitForSelector(".sod29-post-index-card"); await page.waitForTimeout(250);
      for (const sel of clicks) { await page.locator(sel).first().click(); await page.waitForTimeout(250); }
      const file = join(out, `card-${device}-${theme}-${tag}.png`); await page.screenshot({ path: file, fullPage: true }); shots.push(file);
    }
    await page.close();
  }
}
await browser.close(); server.close(); console.log(shots.length, "shots");
