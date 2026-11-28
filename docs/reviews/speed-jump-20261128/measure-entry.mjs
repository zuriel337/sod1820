// What a visitor sees on entry: timeline of the first document and the app, layout shifts, when the typing field is visible / usable. Live or local.
const pw = await import("/opt/node22/lib/node_modules/playwright/index.mjs"); const { chromium, devices } = pw.default || pw;
const base = process.argv[2], path = process.argv[3], tag = process.argv[4] || "x", mode = process.argv[5] || "cold"; const net = process.argv[6] || "slow4g";
const b = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
const dev = devices["Pixel 7"];
const ctx = await b.newContext({ ...dev, recordVideo: { dir: `/tmp/spdrec/entry-${tag}-${mode}`, size: { width: 390, height: 844 } } });
await ctx.addInitScript(() => {
  window.__ls = []; window.__tl = []; window.__marks = {};
  new PerformanceObserver(l => { for (const e of l.getEntries()) { if (e.hadRecentInput) continue; window.__ls.push({ t: Math.round(e.startTime), v: +e.value.toFixed(4), src: (e.sources||[]).slice(0,3).map(s => { const n = s.node; return (n && ((n.id ? '#'+n.id : '') + (n.className ? '.' + String(n.className).split(' ')[0] : n.nodeName))) + ' ' + Math.round(s.previousRect.y) + '>' + Math.round(s.currentRect.y) + ' h' + Math.round(s.previousRect.height) + '>' + Math.round(s.currentRect.height); }) }); } }).observe({ type: "layout-shift", buffered: true });
  new PerformanceObserver(l => { for (const e of l.getEntries()) window.__marks[e.name] = Math.round(e.startTime); }).observe({ type: "paint", buffered: true });
  new PerformanceObserver(l => { for (const e of l.getEntries()) window.__marks.lcp = Math.round(e.startTime); }).observe({ type: "largest-contentful-paint", buffered: true });
  const snap = () => { const t = Math.round(performance.now()); const inp = document.querySelector("input[type=text], textarea, input:not([type]), [contenteditable=true]"); const r = inp && inp.getBoundingClientRect();
    const txt = (document.body?.innerText || "").replace(/\s+/g, " ").slice(0, 70);
    window.__tl.push({ t, root: !!document.querySelector("#root > *"), shell: !!document.querySelector("[data-sod-closed-shell],[data-closed-shell],.closed-shell,[data-public-document]"), input: inp ? [Math.round(r.top), Math.round(r.height), r.width > 0, getComputedStyle(inp).visibility, inp.disabled === true] : null, h: document.documentElement.scrollHeight, txt }); };
  setInterval(snap, 80);
});
const cdp = await ctx.newCDPSession(await ctx.newPage().then(async pg => { globalThis.__pg = pg; return pg; }));
const prof = { slow4g: { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 }, fast: { offline: false, latency: 20, downloadThroughput: 20 * 1024 * 1024 / 8, uploadThroughput: 10 * 1024 * 1024 / 8 } }[net];
await cdp.send("Network.enable"); await cdp.send("Network.emulateNetworkConditions", prof); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
const p = globalThis.__pg;
if (false) {}
if (mode === "warm") { await p.goto(base + path, { waitUntil: "load", timeout: 90000 }); await p.waitForTimeout(6000); }
if (mode === "internal") { await p.goto(base + "/", { waitUntil: "load", timeout: 90000 }); await p.waitForTimeout(5000); }
await p.evaluate(() => { window.__ls = []; window.__tl = []; });
const t0 = Date.now();
if (mode === "internal") { const link = p.locator(`a[href="${path}"]`).first(); if (await link.count()) await link.click(); else await p.evaluate(p2 => { history.pushState({}, "", p2); dispatchEvent(new PopStateEvent("popstate")); }, path); }
else await p.goto(base + path, { waitUntil: "commit", timeout: 90000 });
await p.waitForTimeout(14000);
const res = await p.evaluate(() => ({ ls: window.__ls, tl: window.__tl, marks: window.__marks, cls: window.__ls.reduce((a, s) => a + s.v, 0) }));
const firstInput = res.tl.find(x => x.input && x.input[2] && x.input[3] === "visible"); const firstRoot = res.tl.find(x => x.root);
// swap: text snapshot changes from the first document (SEO text) to the app
const txt0 = res.tl.find(x => x.txt && x.txt.length > 10); const heights = res.tl.map(x => x.h);
const changes = []; let last = ""; for (const f of res.tl) { const s = f.txt.slice(0, 40) + "|" + (f.input ? "in" : "no") + "|" + f.root; if (s !== last) { changes.push(`${f.t}ms root=${f.root} input=${f.input ? JSON.stringify(f.input) : "-"} h=${f.h} "${f.txt.slice(0, 50)}"`); last = s; } }
console.log(JSON.stringify({ tag, path, mode, net, marks: res.marks, cls: +res.cls.toFixed(4), shifts: res.ls.filter(s => s.v > 0.0003).slice(0, 8), firstInputVisibleMs: firstInput?.t ?? null, reactRootMs: firstRoot?.t ?? null, heightRange: [Math.min(...heights), Math.max(...heights)], changes: changes.slice(0, 14) }, null, 1));
await p.screenshot({ path: `/tmp/spdrec/entry-${tag}-${mode}-final.png` });
await ctx.close(); await b.close();
