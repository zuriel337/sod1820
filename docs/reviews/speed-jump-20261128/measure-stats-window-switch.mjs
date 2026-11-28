const pw = await import("/opt/node22/lib/node_modules/playwright/index.mjs"); const { chromium, devices } = pw.default || pw;
const base = "http://127.0.0.1:4182"; const b = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
const ctx = await b.newContext({ ...devices["Pixel 7"], hasTouch: true });
await ctx.route("**/*", async r => { const q = r.request(), u = new URL(q.url()); if (u.origin === base && q.isNavigationRequest() && !u.pathname.includes(".")) { const h = await ctx.request.get(base + "/2029.html"); return r.fulfill({ response: h }); } r.continue(); });
await ctx.addInitScript(() => { window.__ls = []; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__ls.push({ t: Math.round(e.startTime), v: +e.value.toFixed(4), input: e.hadRecentInput }); }).observe({ type: "layout-shift", buffered: true }); });
const p = await ctx.newPage(); await p.goto(base + "/stats", { waitUntil: "domcontentloaded" }); await p.waitForTimeout(10000);
const res = [];
for (const [idx, name] of [[0, "day"], [1, "week"], [2, "month"], [1, "week again"]]) {
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
  const btn = p.locator(".stats29-window button").nth(idx); const before = await p.evaluate(() => ({ h: document.documentElement.scrollHeight, first: (document.querySelector(".stats29-list li a, .stats29-chips li a")?.getAttribute("href")) }));
  await p.evaluate(() => { window.__heights = []; window.__iv = setInterval(() => window.__heights.push(document.documentElement.scrollHeight), 50); window.__ls = window.__ls.filter(() => false); });
  await btn.tap(); await p.waitForTimeout(2500);
  const during = await p.evaluate(() => { clearInterval(window.__iv); const hs = window.__heights; return { minH: Math.min(...hs), maxH: Math.max(...hs), label: document.querySelector(".stats29-window span")?.textContent, shifts: window.__ls.filter(s => !s.input).map(s => s.v) }; });
  res.push({ window: name, before, during, pressed: await p.evaluate(() => [...document.querySelectorAll(".stats29-window button")].map(b => b.getAttribute("aria-pressed")).join(",")) });
}
// the row stays under the finger: tap a post link while a switch is loading
await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
const link = p.locator(".stats29-list li a").first(); await link.scrollIntoViewIfNeeded(); const box = await link.boundingBox(); const href = await link.getAttribute("href");
await p.evaluate(() => scrollTo(0, 0)); await p.locator(".stats29-window button").nth(2).tap();
await p.evaluate(() => window.scrollTo(0, 0));
const link2 = p.locator(".stats29-list li a").first(); await link2.scrollIntoViewIfNeeded(); const b2 = await link2.boundingBox();
const tapped = { rowBefore: Math.round(box.y), rowAfter: Math.round(b2.y), sameLink: (await link2.getAttribute("href")) === href };
// footer: scroll to the bottom in steps, the largest empty stretch between blocks and whether the footer is reachable
await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(800);
const foot = await p.evaluate(() => { const f = document.querySelector(".f29"); const r = f && f.getBoundingClientRect(); return { visible: !!f && r.top < innerHeight && r.bottom > 0, top: r && Math.round(r.top), vh: innerHeight }; });
console.log(JSON.stringify({ switches: res, tap: tapped, footerAtBottom: foot }, null, 1)); await b.close();
