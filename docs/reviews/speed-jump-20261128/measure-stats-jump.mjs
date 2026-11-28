// Mobile reproduction of the /stats jump: layout shifts with sources, and every row/tile tracked by its text (does the SAME row change position, and when).
const pw = await import("/opt/node22/lib/node_modules/playwright/index.mjs"); const { chromium, devices } = pw.default || pw;
const base = process.argv[2] || "http://127.0.0.1:4181"; const tag = process.argv[3] || "before"; const action = process.argv[4] || "load";
const b = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
const dev = devices["Pixel 7"];
const ctx = await b.newContext({ ...dev, recordVideo: { dir: `/tmp/spdrec/${tag}-${action}`, size: { width: 390, height: 844 } } });
await ctx.addInitScript(() => {
  window.__shifts = [];
  new PerformanceObserver(l => { for (const e of l.getEntries()) { if (e.hadRecentInput) continue; window.__shifts.push({ t: Math.round(e.startTime), v: +e.value.toFixed(4), src: (e.sources||[]).map(s => { const n = s.node; return (n && (n.className ? String(n.className).split(' ')[0] : n.nodeName)) + ' ' + Math.round(s.previousRect.y) + '->' + Math.round(s.currentRect.y) + ' h' + Math.round(s.previousRect.height) + '->' + Math.round(s.currentRect.height); }) }); } }).observe({ type: "layout-shift", buffered: true });
  window.__rows = [];
  const snap = () => { const t = Math.round(performance.now()); const out = [];
    document.querySelectorAll("main.stats29 li, main.stats29 .stats29-tile, main.stats29 h2, main.stats29 h3").forEach((el, i) => { const r = el.getBoundingClientRect(); out.push([ (el.innerText||'').trim().slice(0, 28), Math.round(r.top + scrollY), Math.round(r.height) ]); });
    window.__rows.push({ t, n: out.length, rows: out }); };
  setInterval(snap, 120);
});
await ctx.route("**/*", async (route) => { const req = route.request(), u = new URL(req.url());
  if (u.origin === base && req.isNavigationRequest() && !u.pathname.includes(".")) { const h = await ctx.request.get(base + "/2029.html"); return route.fulfill({ response: h }); }
  if (req.method() !== "GET" && req.method() !== "POST" && req.method() !== "HEAD" && req.method() !== "OPTIONS") return route.fulfill({ status: 403, body: "{}" });
  if (req.method() === "POST" && u.origin !== base && !/\/rest\/v1\/rpc\//.test(u.pathname)) return route.fulfill({ status: 403, body: "{}" });
  route.continue(); });
const p = await ctx.newPage(); const calls = [];
if (process.env.NET === "slow4g") { const cdp = await ctx.newCDPSession(p); await cdp.send("Network.enable"); await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 1.6*1024*1024/8, uploadThroughput: 750*1024/8 }); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 }); }
p.on("request", r => { if (/rpc|rest\/v1/.test(r.url())) calls.push(Math.round(performance.now()) + " " + r.method() + " " + r.url().split("/").slice(-1)[0].slice(0, 40)); });
const t0 = Date.now();
await p.goto(base + "/stats", { waitUntil: "domcontentloaded" });
if (action === "scroll") { await p.waitForTimeout(1100); for (let y = 200; y <= 1300; y += 100) { await p.evaluate(y2 => scrollTo(0, y2), y); await p.waitForTimeout(160); } await p.waitForTimeout(8000); }
else await p.waitForTimeout(9000);
if (action === "window") { const btn = p.locator(".stats29-window button").nth(2); await btn.scrollIntoViewIfNeeded(); await p.waitForTimeout(500); await btn.click(); await p.waitForTimeout(6000); }
if (action === "reload") { await p.reload({ waitUntil: "domcontentloaded" }); await p.waitForTimeout(9000); }
const res = await p.evaluate(() => ({ shifts: window.__shifts, cls: window.__shifts.reduce((a, s) => a + s.v, 0), rows: window.__rows }));
// same row (by text) changing position over time
const track = new Map();
for (const f of res.rows) for (const [txt, top, h] of f.rows) { if (!txt) continue; const k = txt; if (!track.has(k)) track.set(k, []); const a = track.get(k); if (!a.length || a[a.length-1].top !== top) a.push({ t: f.t, top, h }); }
const moved = [...track.entries()].filter(([, a]) => a.length > 1).map(([k, a]) => ({ row: k, moves: a.map(x => x.t + 'ms:' + x.top).join(' > ') })).slice(0, 14);
const heads = new Map();
for (const f of res.rows) for (const [txt, top, h] of f.rows) { if (!/^(?:\S+ ?){1,6}$/.test(txt) && txt.length > 28) continue; }
const h2 = []; let prev = "";
for (const f of res.rows) { const sig = f.rows.filter(r => r[2] > 0).map(r => r[0].split("\n")[0].slice(0,18)+"@"+r[1]).join(" | "); if (sig !== prev) { h2.push({ t: f.t, n: f.n }); prev = sig; } }
const nz = res.shifts.filter(s => s.v > 0.0004);
const firstSeen = new Map(); for (const f of res.rows) for (const [txt, top, h] of f.rows) if (!firstSeen.has(txt)) firstSeen.set(txt, f.t);
const blocks = [...firstSeen.entries()].filter(([k]) => k.length < 40).map(([k, t]) => t + "ms " + k.split("\n")[0]).sort((a, b) => parseInt(a) - parseInt(b));
console.log(JSON.stringify({ tag, action, cls: +res.cls.toFixed(4), nonzeroShifts: nz, firstSeen: blocks.filter((b,i)=>/^(\d+)ms (חם|מגמה|הפעילות|פעילות|מה |סיכום|גילוי|הנתונים|מוצג|טוען|עוד|סך|פירוט|דפים|ביטויים|הגילויים|כותבים|התרומות|ה)/.test(b)).slice(0, 60), movedRows: moved.slice(0, 6) , rpcCalls: calls.slice(0, 40) }, null, 1));
await p.screenshot({ path: `/tmp/spdrec/${tag}-${action}-final.png`, fullPage: true });
await ctx.close(); await b.close();
