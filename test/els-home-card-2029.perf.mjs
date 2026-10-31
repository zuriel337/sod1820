// ELS home card - LOCAL before/after measurement (same machine, same Chromium, same real anonymous reads).
//   BEFORE_DIST=<build of the base commit>  AFTER_DIST=<build with the card>  RUNS=5  EVIDENCE_DIR=<out>
// Runs are interleaved with alternating order (ABBA) to spread network/CPU drift and cancel order bias. This is NOT a hosted-Preview
// measurement: the static files come from 127.0.0.1 and only the public Supabase reads cross the network.
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const BEFORE = resolve(process.env.BEFORE_DIST);
const AFTER = resolve(process.env.AFTER_DIST);
const RUNS = Number(process.env.RUNS || 5);
const OUT = process.env.EVIDENCE_DIR || "/tmp/els-home-card-evidence";
await mkdir(OUT, { recursive: true });
const types = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".ttf": "font/ttf", ".webp": "image/webp", ".jpg": "image/jpeg" };
async function serve(dist) {
  const server = createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, "http://l").pathname);
    let file = resolve(dist, "." + pathname);
    if (!file.startsWith(dist + sep) && file !== dist) { res.writeHead(403).end(); return; }
    if (!existsSync(file) || statSync(file).isDirectory()) file = resolve(dist, "index.html");
    res.setHeader("Content-Type", types[extname(file)] || "application/octet-stream");
    res.setHeader("Cache-Control", "no-store");
    createReadStream(file).pipe(res);
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}
const median = (list) => { const s = [...list].sort((a, b) => a - b); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };
const round = (n, d = 3) => (n == null ? null : Number(n.toFixed(d)));

const profiles = [
  { name: "desktop-1440 (no throttle)", width: 1440, height: 900, cpu: 1, net: null },
  { name: "mobile-390 (CPU 4x, ~1.6Mbps/150ms)", width: 390, height: 844, cpu: 4, net: { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 } },
];

async function once(browser, srv, profile) {
  const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, locale: "he-IL" });
  await context.addInitScript(() => {
    window.__m = { lcp: 0, lcpEl: "", cls: 0, shifts: 0 };
    try { new PerformanceObserver((list) => { for (const e of list.getEntries()) { window.__m.lcp = e.startTime; window.__m.lcpEl = (e.element?.tagName || "") + "." + String(e.element?.className || "").toString().slice(0, 40); } }).observe({ type: "largest-contentful-paint", buffered: true }); } catch (_) { /* optional */ }
    try { new PerformanceObserver((list) => { for (const e of list.getEntries()) { if (!e.hadRecentInput) { window.__m.cls += e.value; window.__m.shifts += 1; } } }).observe({ type: "layout-shift", buffered: true }); } catch (_) { /* optional */ }
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  if (profile.cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: profile.cpu });
  if (profile.net) { await cdp.send("Network.enable"); await cdp.send("Network.emulateNetworkConditions", profile.net); }
  let requests = 0; let transfer = 0; let staticBytes = 0;
  page.on("requestfinished", async (request) => { requests += 1; try { const sizes = await request.sizes(); transfer += sizes.responseBodySize + sizes.responseHeadersSize; if (new URL(request.url()).origin === srv.origin) staticBytes += sizes.responseBodySize; } catch (_) { /* aborted */ } });
  await page.goto(`${srv.origin}/2029`, { waitUntil: "load" });
  await page.waitForTimeout(profile.net ? 9000 : 5500);
  const load = await page.evaluate(() => ({ ...window.__m }));
  // scroll the whole page so below-the-fold content (and the card) renders; CLS keeps accumulating
  await page.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += Math.round(innerHeight * 0.6)) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 350)); } });
  await page.waitForTimeout(1500);
  const afterScroll = await page.evaluate(() => ({ ...window.__m }));
  // NOTE: not like-for-like - the base build has no card, so its sample is taken at the top of the page while the
  // card build is sampled with the card centred. The like-for-like card-vs-hidden-card A/B is reported in the receipt.
  const has = await page.evaluate(() => Boolean(document.querySelector(".els-hm")));
  await page.evaluate(() => { const card = document.querySelector(".els-hm"); if (card) card.scrollIntoView({ block: "center", behavior: "instant" }); else window.scrollTo(0, Number(window.__cardY || 0)); });
  await page.waitForTimeout(800);
  const frames = await page.evaluate(() => new Promise((done) => { const t = []; let last = performance.now(); const start = last; const tick = (now) => { t.push(now - last); last = now; if (now - start < 3000) requestAnimationFrame(tick); else done(t.slice(1)); }; requestAnimationFrame(tick); }));
  const sorted = [...frames].sort((a, b) => a - b);
  const frame = { n: frames.length, median: sorted[Math.floor(sorted.length / 2)], p95: sorted[Math.floor(sorted.length * 0.95)], over50: frames.filter((f) => f > 50).length };
  await context.close();
  return { has, lcp: load.lcp, lcpEl: load.lcpEl, clsLoad: load.cls, shiftsLoad: load.shifts, clsTotal: afterScroll.cls, shiftsTotal: afterScroll.shifts, requests, transfer, staticBytes, frame };
}

const before = await serve(BEFORE); const after = await serve(AFTER);
const browser = await chromium.launch();
const result = { runs: RUNS, note: "local, interleaved; static from 127.0.0.1, public reads over the real network", profiles: [] };
try {
  for (const profile of profiles) {
    const rows = { before: [], after: [] };
    for (let i = 0; i < RUNS; i += 1) {
      // ABBA ordering: alternate which build goes first so connection/CDN warm-up cannot favour one side.
      const order = i % 2 === 0 ? [["before", before], ["after", after]] : [["after", after], ["before", before]];
      for (const [label, srv] of order) rows[label].push(await once(browser, srv, profile));
    }
    const sum = (label) => ({
      lcp_ms: round(median(rows[label].map((r) => r.lcp)), 0), lcp_all: rows[label].map((r) => Math.round(r.lcp)), lcp_el: [...new Set(rows[label].map((r) => r.lcpEl))],
      cls_load: round(median(rows[label].map((r) => r.clsLoad)), 4), cls_total_after_scroll: round(median(rows[label].map((r) => r.clsTotal)), 4), cls_all: rows[label].map((r) => round(r.clsTotal, 4)),
      requests: median(rows[label].map((r) => r.requests)), transfer_kb: round(median(rows[label].map((r) => r.transfer)) / 1024, 0), static_kb: round(median(rows[label].map((r) => r.staticBytes)) / 1024, 0),
      frame_median_ms: round(median(rows[label].map((r) => r.frame.median)), 1), frame_p95_ms: round(median(rows[label].map((r) => r.frame.p95)), 1), frames_over_50ms: median(rows[label].map((r) => r.frame.over50)),
      card_present: rows[label].every((r) => r.has),
    });
    result.profiles.push({ profile: profile.name, before: sum("before"), after: sum("after") });
  }
} finally { await browser.close(); before.server.close(); after.server.close(); }
await writeFile(resolve(OUT, "perf.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
