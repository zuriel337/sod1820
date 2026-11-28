// A short recorded capture of /stats on a phone (Pixel 7, Slow 4G, 4x CPU): a red frame follows ONE row (the second post in "החם עכשיו") and a counter shows the time since the navigation.
// The reader scrolls down early (as a reader does while the page loads). Usage: node record-stats-jump.mjs <base> <outdir>
const pw = await import("/opt/node22/lib/node_modules/playwright/index.mjs"); const { chromium, devices } = pw.default || pw;
const base = process.argv[2], out = process.argv[3];
const b = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
const ctx = await b.newContext({ ...devices["Pixel 7"], recordVideo: { dir: out, size: { width: 390, height: 844 } } });
await ctx.route("**/*", async r => { const q = r.request(), u = new URL(q.url()); if (u.origin === base && q.isNavigationRequest() && !u.pathname.includes(".")) { const h = await ctx.request.get(base + "/2029.html"); return r.fulfill({ response: h }); } r.continue(); });
await ctx.addInitScript(() => {
  const t0 = performance.now(); const bar = () => { let c = document.getElementById("__t"); if (!c) { c = document.createElement("div"); c.id = "__t"; c.style.cssText = "position:fixed;top:0;left:0;z-index:2147483647;background:#000;color:#0f0;font:700 13px monospace;padding:2px 6px;direction:ltr"; document.documentElement.appendChild(c); } c.textContent = "t=" + Math.round(performance.now() - t0) + "ms  scrollY=" + Math.round(scrollY); };
  setInterval(() => { bar(); const li = [...document.querySelectorAll("main.stats29 .stats29-list li")]; li.forEach((e, i) => { e.style.outline = i === 1 ? "3px solid red" : ""; }); const f = document.querySelector(".f29"); if (f) f.style.outline = "3px solid #09f"; }, 40);
});
const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
await cdp.send("Network.enable"); await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 1.6*1024*1024/8, uploadThroughput: 750*1024/8 }); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
await p.goto(base + "/stats", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(3500); // the page is still loading: the reader already scrolls
for (let y = 150; y <= 900; y += 75) { await p.evaluate(y2 => scrollTo(0, y2), y); await p.waitForTimeout(220); }
await p.waitForTimeout(9000);
const cls = await p.evaluate(() => new Promise(res => { let v = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) v += e.value; }).observe({ type: "layout-shift", buffered: true }); setTimeout(() => res(+v.toFixed(3)), 100); }));
console.log(JSON.stringify({ base, cls }));
await ctx.close(); await b.close();
