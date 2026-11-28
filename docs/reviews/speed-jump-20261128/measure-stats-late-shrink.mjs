// /stats on a phone, a reader who scrolled early to a row BELOW the discoveries while the discovery answer is still on its way (28.11.2026).
// The answer is held until the reader has scrolled, then released as: one (a single item), full (as served), empty, fail. Reported: how far the row
// the reader looks at moved on screen when the reserved slot shrank (viewport px), the scroll position change, and whether the same row can still be pressed.
// usage: node measure-stats-late-shrink.mjs <base> <one|full|empty|fail|none> [heldMs=6500]
const pw = await import("/opt/node22/lib/node_modules/playwright/index.mjs"); const { chromium, devices } = pw.default || pw;
const base = process.argv[2], scenario = process.argv[3] || "one", heldMs = Number(process.argv[4] || 6500);
const b = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
const ctx = await b.newContext({ ...devices["Pixel 7"] });
const shape = (o, keep) => Array.isArray(o) ? o.slice(0, keep).map(x => shape(x, keep)) : (o && typeof o === "object" ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, shape(v, keep)])) : o);
let release; const gate = new Promise(r => { release = r; });
await ctx.route("**/*", async r => { const q = r.request(), u = new URL(q.url());
  if (u.origin === new URL(base).origin && q.isNavigationRequest() && !u.pathname.includes(".")) { const h = await ctx.request.get(base + "/2029.html"); return r.fulfill({ response: h }); }
  if (/rpc\/discovery_center_(feed|stats)_v1/.test(u.pathname) && scenario !== "none") {
    await gate;
    if (scenario === "fail") return r.abort("failed");
    if (scenario === "empty") return r.fulfill({ status: 200, contentType: "application/json", body: /feed/.test(u.pathname) ? "{}" : "[]" });
    const resp = await r.fetch(); if (scenario === "full") return r.fulfill({ response: resp });
    let j; try { j = await resp.json(); } catch { return r.fulfill({ response: resp }); } return r.fulfill({ response: resp, body: JSON.stringify(shape(j, 1)) });
  }
  r.continue(); });
await ctx.addInitScript(() => { window.__ls = []; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__ls.push({ t: Math.round(e.startTime), v: +e.value.toFixed(4) }); }).observe({ type: "layout-shift", buffered: true }); });
await ctx.addInitScript(() => { window.__sb = []; const o = window.scrollBy.bind(window); window.scrollBy = (...a) => { const s = document.querySelector('.stats29-dc-slot'); window.__sb.push({ t: Math.round(performance.now()), top: a[0]?.top, slotH: s && Math.round(s.getBoundingClientRect().height), y: Math.round(scrollY) }); return o(...a); }; });
const p = await ctx.newPage(); const t0 = Date.now();
await p.goto(base + "/stats", { waitUntil: "domcontentloaded" });
await p.waitForSelector(".stats29-dc-slot", { timeout: 30000 });
// the row below the discoveries: the first tile link of the "added" grid that follows the slot
const target = p.locator(".stats29-dc-slot ~ .stats29-grid a, .stats29-block[data-stats-discoveries] .stats29-grid a").first();
await target.waitFor({ state: "attached" });
await target.evaluate(e => e.scrollIntoView({ block: "center" }));
await p.waitForTimeout(500);
const rest = Math.max(0, heldMs - (Date.now() - t0)); await p.waitForTimeout(rest);
const before = await p.evaluate(() => { const a = document.querySelector(".stats29-dc-slot ~ .stats29-grid a, .stats29-block[data-stats-discoveries] .stats29-grid a"); const s = document.querySelector(".stats29-dc-slot"); return { top: Math.round(a.getBoundingClientRect().top), slotH: Math.round(s.getBoundingClientRect().height), y: Math.round(scrollY), state: s.getAttribute("data-dc-state") }; });
release();
await p.waitForTimeout(3500);
const after = await p.evaluate(() => { const a = document.querySelector(".stats29-dc-slot ~ .stats29-grid a, .stats29-block[data-stats-discoveries] .stats29-grid a"); const s = document.querySelector(".stats29-dc-slot"); const r = a.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height / 2, 20)); return { top: Math.round(r.top), slotH: Math.round(s.getBoundingClientRect().height), y: Math.round(scrollY), state: s.getAttribute("data-dc-state"), pressable: !!hit && (hit === a || a.contains(hit)), href: a.getAttribute("href"), docH: document.documentElement.scrollHeight }; });
const ls = await p.evaluate(() => window.__ls); const sb = await p.evaluate(() => window.__sb);
console.log(JSON.stringify({ scenario, heldMs, before, after, rowMovedPx: after.top - before.top, scrollYChange: after.y - before.y, slotShrinkPx: before.slotH - after.slotH, cls: +ls.reduce((a, s) => a + s.v, 0).toFixed(4), shifts: ls.filter(s => s.v > 0.001), scrollBy: sb }));
await b.close();
