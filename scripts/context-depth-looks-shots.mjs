import { build } from "vite"; import react from "@vitejs/plugin-react"; import http from "node:http"; import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, existsSync, mkdirSync } from "node:fs"; import { tmpdir } from "node:os"; import { join, extname } from "node:path";
const root = "/home/user/sod1820/"; const out = process.argv[2]; mkdirSync(out, { recursive: true });
const { chromium } = createRequire("file:///opt/node-tools/node_modules/")("playwright");
const dist = mkdtempSync(join(tmpdir(), "looks-")); const harness = join(root, "test/fixtures/context-map-harness");
await build({ root: harness, logLevel: "error", plugins: [react()], build: { outDir: dist, emptyOutDir: true, rollupOptions: { input: join(harness, "depth.html") } } });
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const server = http.createServer((req, res) => { const p = req.url.split("?")[0]; const f = join(dist, p === "/" ? "depth.html" : p); if (!existsSync(f)) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": types[extname(f)] || "application/octet-stream" }).end(readFileSync(f)); }).listen(0);
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
for (const [device, viewport] of [["desktop", { width: 1280, height: 900 }], ["mobile", { width: 390, height: 900 }]]) for (const theme of ["light", "dark"]) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2 }); await page.goto(`${base}?theme=${theme}&view=looks`); await page.waitForSelector(".sod29-post-index-card"); await page.waitForTimeout(500);
  await page.screenshot({ path: join(out, `looks-${device}-${theme}.png`), fullPage: true }); await page.close(); }
await browser.close(); server.close(); console.log("ok");
