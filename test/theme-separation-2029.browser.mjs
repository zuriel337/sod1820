// Browser acceptance for the 2029 theme store (own storage key, one-time seed, own document attribute).
// Needs a built dist/ (npm run build) and Chromium; network is blocked except localhost.
//   node test/theme-separation-2029.browser.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const root = process.cwd();
const dist = path.join(root, "dist");
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".ttf": "font/ttf" };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  let file = path.join(dist, decodeURIComponent(url.pathname));
  if (!file.startsWith(dist) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, "2029.html");
  res.writeHead(200, { "content-type": mime[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

async function open(init) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const consoleBad = [];
  await context.route("**/*", (route) => (new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort()));
  await context.addInitScript((init) => {
    if (!sessionStorage.getItem("__init_done")) { for (const [k, v] of Object.entries(init)) localStorage.setItem(k, v); sessionStorage.setItem("__init_done", "1"); }
    window.__attrLog = [];
    const attach = () => { if (!document.documentElement) return false; new MutationObserver(() => window.__attrLog.push(document.documentElement.getAttribute("data-theme-2029"))).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme-2029"] }); return true; };
    if (!attach()) { const wait = new MutationObserver(() => { if (attach()) wait.disconnect(); }); wait.observe(document, { childList: true }); }
    window.__reads = [];
    const orig = Storage.prototype.getItem;
    Storage.prototype.getItem = function (k) { window.__reads.push(String(k)); return orig.call(this, k); };
  }, init);
  const page = await context.newPage();
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|net::ERR/.test(m.text())) consoleBad.push(m.text()); });
  return { page, context, consoleBad };
}
const attrs = (page) => page.evaluate(() => {
  const h = document.documentElement;
  return { theme: h.getAttribute("data-theme"), preset: h.getAttribute("data-theme-preset"), t2029: h.getAttribute("data-theme-2029"), keys: Object.keys(localStorage).sort(), sodTheme: localStorage.getItem("sod-theme") };
});

try {
  const { page, context, consoleBad } = await open({ "sod-theme": "light" });
  await page.goto(base + "/2029", { waitUntil: "load" }); await page.waitForTimeout(2000);
  let a = await attrs(page);
  assert.equal(a.t2029, "light", "first visit copies the existing preference once (approved migration)");
  assert.equal(a.theme, null, "2029 sets no global data-theme"); assert.equal(a.preset, null, "2029 sets no data-theme-preset");
  assert.ok(a.keys.includes("sod2029:theme-preset") && a.keys.includes("sod2029:theme-preset-seeded"));
  assert.equal(a.sodTheme, "light", "the old key is never written");
  await page.evaluate(() => { const b = [...document.querySelectorAll(".sod29-theme-options button")].find((x) => x.getAttribute("aria-pressed") === "false"); b?.click(); });
  await page.waitForTimeout(300);
  const changed = await attrs(page);
  assert.notEqual(changed.t2029, "light", "the 2029 chooser changes the 2029 theme");
  assert.equal(changed.sodTheme, "light", "a 2029 change never writes the old key");
  await page.evaluate(() => localStorage.setItem("sod-theme", "dark"));
  await page.evaluate(() => { window.__reads.length = 0; });
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(2000);
  const reads = await page.evaluate(() => window.__reads.slice()); // before attrs(), which reads the old key for reporting
  const again = await attrs(page);
  assert.equal(again.t2029, changed.t2029, "the theme is not synced from the old key after the seed");
  assert.equal(reads.includes("sod-theme"), false, "after the seed the old theme key is never read");
  assert.equal(consoleBad.filter((m) => /hydrat|mismatch|did not match/i.test(m)).length, 0, "no hydration/mismatch warnings");
  const log = await page.evaluate(() => window.__attrLog);
  assert.ok(log.length >= 1 && new Set(log).size === 1 && log[0] === again.t2029, `theme flipped during load: ${JSON.stringify(log)}`);
  await context.close();
  console.log("theme separation browser acceptance: PASS");
} finally {
  await browser.close();
  server.close();
}
