// Reproducible before/after load measurement for the 2029 build (no live network: only localhost is reachable).
//   node scripts/measure-2029-load.mjs --label before [--runs 3] [--route /2029]
// Static: build time, eager chunks/gzip/modules. Runtime (Chromium, CPU x4, 390x844): TTFB, FCP, LCP, long tasks,
// request count and transferred bytes for a first visit (cold HTTP cache) and a repeat visit (warm cache).
// Limits: Supabase/fonts are blocked, so this isolates client JS cost; it does not measure real backend/CDN latency. INP needs a real interaction and is not measured.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import zlib from "node:zlib";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const label = arg("label", "run"); const runs = Number(arg("runs", 3)); const route = arg("route", "/2029");
const root = process.cwd();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "m2029-"));
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };

// 1. Build time (2029 target only, no sourcemaps) and static graph numbers.
const t0 = Date.now();
execFileSync("npx", ["vite", "build", "--outDir", path.join(tmp, "dist")], { cwd: root, env: { ...process.env, SOD_BUILD_TARGET: "2029" }, stdio: "ignore" });
const buildMs = Date.now() - t0;
execFileSync("npx", ["vite", "build", "--sourcemap", "--outDir", path.join(tmp, "dist-map")], { cwd: root, env: { ...process.env, SOD_BUILD_TARGET: "2029" }, stdio: "ignore" });
const dist = path.join(tmp, "dist");
const manifest = JSON.parse(fs.readFileSync(path.join(dist, ".vite/manifest.json"), "utf8"));
const walk = (follow) => { const seen = new Set(); const v = (k) => { if (seen.has(k)) return; seen.add(k); for (const d of follow(manifest[k])) v(d); }; v("2029.html"); return seen; };
const eager = walk((r) => r.imports || []);
const reach = walk((r) => [...(r.imports || []), ...(r.dynamicImports || [])]);
const jsOf = (set) => [...set].map((k) => manifest[k].file).filter((f) => f.endsWith(".js"));
const gz = (f) => zlib.gzipSync(fs.readFileSync(path.join(dist, f))).length;
const eagerFiles = jsOf(eager);
const modules = new Set();
for (const f of eagerFiles) {
  const mp = path.join(tmp, "dist-map", f + ".map");
  if (fs.existsSync(mp)) for (const s of JSON.parse(fs.readFileSync(mp, "utf8")).sources) modules.add(s);
}
const stat = {
  buildMs,
  eagerChunks: eagerFiles.length, eagerGzipKB: +(eagerFiles.reduce((a, f) => a + gz(f), 0) / 1024).toFixed(1),
  eagerModules: modules.size, eagerAppModules: [...modules].filter((m) => !m.includes("node_modules")).length,
  reachableChunks: jsOf(reach).length, reachableGzipKB: +(jsOf(reach).reduce((a, f) => a + gz(f), 0) / 1024).toFixed(1),
};

// 2. Runtime.
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".ttf": "font/ttf", ".webp": "image/webp" };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  let f = path.join(dist, decodeURIComponent(u.pathname));
  if (!f.startsWith(dist) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(dist, "2029.html");
  const body = fs.readFileSync(f); const etag = `"${body.length}-${fs.statSync(f).mtimeMs}"`;
  if (req.headers["if-none-match"] === etag) { res.writeHead(304); return res.end(); }
  const hashed = /\/assets\//.test(u.pathname);
  res.writeHead(200, { "content-type": mime[path.extname(f)] || "application/octet-stream", etag, "cache-control": hashed ? "public, max-age=31536000, immutable" : "no-cache" });
  res.end(body);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
// No request interception (it disables the HTTP cache): external hosts are made unresolvable at the browser level instead.
const browser = await chromium.launch({ args: ["--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1"], ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
const samples = { first: [], repeat: [] };
for (let i = 0; i < runs; i++) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await context.addInitScript(() => {
    window.__m = { lcp: 0, long: [], fcp: 0 };
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.long.push(e.duration); }).observe({ type: "longtask", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === "first-contentful-paint") window.__m.fcp = e.startTime; }).observe({ type: "paint", buffered: true });
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  for (const kind of ["first", "repeat"]) {
    await page.goto(base + route, { waitUntil: "load" });
    await page.waitForTimeout(3500);
    const m = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0];
      const res = performance.getEntriesByType("resource");
      return {
        ttfb: nav.responseStart, dcl: nav.domContentLoadedEventEnd, fcp: window.__m.fcp, lcp: window.__m.lcp,
        longTasks: window.__m.long.length, longMs: window.__m.long.reduce((a, b) => a + b, 0), longMax: Math.max(0, ...window.__m.long),
        requests: res.length, jsRequests: res.filter((r) => r.name.endsWith(".js")).length, transferKB: res.reduce((a, r) => a + (r.transferSize || 0), 0) / 1024,
      };
    });
    samples[kind].push(m);
  }
  await context.close();
}
await browser.close(); server.close();
const agg = (arr) => Object.fromEntries(Object.keys(arr[0]).map((k) => [k, +median(arr.map((x) => x[k])).toFixed(1)]));
console.log(JSON.stringify({ label, route, runs, cpuThrottle: 4, static: stat, firstVisit: agg(samples.first), repeatVisit: agg(samples.repeat) }, null, 1));
fs.rmSync(tmp, { recursive: true, force: true });
