const pw = await import("/opt/node22/lib/node_modules/playwright/index.mjs"); const { chromium, devices } = pw.default || pw;
const base = "http://127.0.0.1:4182"; const scenario = process.argv[2] || "full";
const b = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
const ctx = await b.newContext({ ...devices["Pixel 7"] });
const shape = (o, keep) => Array.isArray(o) ? o.slice(0, keep).map(x => shape(x, keep)) : (o && typeof o === "object" ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, shape(v, keep)])) : o);
await ctx.route("**/*", async r => { const q = r.request(), u = new URL(q.url());
  if (u.origin === base && q.isNavigationRequest() && !u.pathname.includes(".")) { const h = await ctx.request.get(base + "/2029.html"); return r.fulfill({ response: h }); }
  if (/rpc\/discovery_center_(feed|stats)_v1/.test(u.pathname)) {
    if (scenario === "fail") return r.abort("failed");
    if (scenario === "slow") { await new Promise(s => setTimeout(s, 9000)); return r.continue(); }
    if (scenario === "empty") return r.fulfill({ status: 200, contentType: "application/json", body: /feed/.test(u.pathname) ? "{}" : "[]" });
    if (scenario === "few") { const resp = await r.fetch(); let j; try { j = await resp.json(); } catch { return r.fulfill({ response: resp }); } return r.fulfill({ response: resp, body: JSON.stringify(shape(j, 1)) }); }
  }
  r.continue(); });
await ctx.addInitScript(() => { window.__ls = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__ls += e.value; }).observe({ type: "layout-shift", buffered: true }); });
const p = await ctx.newPage(); await p.goto(base + "/stats", { waitUntil: "domcontentloaded" }); await p.waitForTimeout(11000);
const m = await p.evaluate(() => {
  const slot = document.querySelector(".stats29-dc-slot"); const kids = slot ? [...slot.children].filter(e => e.getBoundingClientRect().height > 0) : [];
  const content = kids.reduce((a, e) => a + e.getBoundingClientRect().height, 0);
  const blocks = [...document.querySelectorAll("main.stats29 > .stats29-block, main.stats29 > section")].map(e => e.getBoundingClientRect()); let maxGap = 0; blocks.sort((a, b) => a.top - b.top); for (let i = 1; i < blocks.length; i++) maxGap = Math.max(maxGap, blocks[i].top - blocks[i - 1].bottom);
  const foot = document.querySelector(".f29"); const fr = foot && getComputedStyle(foot).display !== "none" ? foot.getBoundingClientRect() : null;
  return { slotState: slot?.getAttribute("data-dc-state"), slotH: slot ? Math.round(slot.getBoundingClientRect().height) : null, slotContentH: Math.round(content), blankInSlot: slot ? Math.round(slot.getBoundingClientRect().height - content) : null, maxGapBetweenBlocks: Math.round(maxGap), footerShown: !!fr, docH: document.documentElement.scrollHeight, cls: +window.__ls.toFixed(4) };
});
await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(1500); await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(500);
const f = await p.evaluate(() => { const ft = document.querySelector(".f29"); const r = ft && ft.getBoundingClientRect(); const main = document.querySelector("main.stats29").getBoundingClientRect(); return { footerVisible: !!ft && r.top < innerHeight && r.bottom > 0, footerTop: r && Math.round(r.top), gapMainEndToFooter: r ? Math.round(r.top - main.bottom) : null, viewport: innerHeight }; });
// the first post row: same element and position 8 s later (a late discovery answer must not move what is above it)
console.log(JSON.stringify({ scenario, ...m, ...f }));
await b.close();
