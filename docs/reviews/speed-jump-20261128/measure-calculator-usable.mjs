const pw = await import("/opt/node22/lib/node_modules/playwright/index.mjs"); const { chromium, devices } = pw.default || pw;
const base = process.argv[2], mode = process.argv[3] || "cold", net = process.argv[4] || "slow4g";
const b = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
const ctx = await b.newContext({ ...devices["Pixel 7"] }); const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
const prof = { slow4g: { offline: false, latency: 150, downloadThroughput: 1.6*1024*1024/8, uploadThroughput: 750*1024/8 }, fast: { offline: false, latency: 20, downloadThroughput: 20*1024*1024/8, uploadThroughput: 10*1024*1024/8 } }[net];
await cdp.send("Network.enable"); await cdp.send("Network.emulateNetworkConditions", prof); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
if (mode === "warm") { await p.goto(base + "/gematria", { waitUntil: "load", timeout: 90000 }); await p.waitForTimeout(6000); }
await p.goto(base + "/gematria", { waitUntil: "commit", timeout: 90000 });
const sel = "input[type=text], textarea, input:not([type])";
await p.waitForSelector(sel, { state: "visible", timeout: 60000 });
const tVisible = await p.evaluate(() => Math.round(performance.now()));
const inp = p.locator(sel).first(); await inp.click(); const tFocus = await p.evaluate(() => Math.round(performance.now()));
await p.keyboard.type("אבג", { delay: 30 }); const tTyped = await p.evaluate(() => Math.round(performance.now()));
await p.waitForFunction(() => [...document.querySelectorAll("[class*=calcpro-tile], .sod29-calcpro-tile")].some(e => /[1-9]/.test(e.innerText || "")), null, { timeout: 60000 });
const tResult = await p.evaluate(() => Math.round(performance.now()));
console.log(JSON.stringify({ base, mode, net, fieldVisibleMs: tVisible, focusedMs: tFocus, typedMs: tTyped, firstResultMs: tResult, typeToResultMs: tResult - tTyped }));
await b.close();
