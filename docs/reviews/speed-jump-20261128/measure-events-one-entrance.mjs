const pw = await import("/opt/node22/lib/node_modules/playwright/index.mjs"); const { chromium, devices } = pw.default || pw;
const base = process.argv[2]; const b = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
const ctx = await b.newContext({ ...devices["Pixel 7"] }); await ctx.route("**/*", async r => { const q = r.request(), u = new URL(q.url()); if (u.origin === base && q.isNavigationRequest() && !u.pathname.includes(".")) { const h = await ctx.request.get(base + "/2029.html"); return r.fulfill({ response: h }); } r.continue(); });
const p = await ctx.newPage(); const ev = []; let phase = "entrance";
p.on("request", r => { const u = r.url(); if (r.method() === "POST" && /ingest_event|track_visit|rest\/v1\/rpc\/(record_|link_)/.test(u)) { let body = {}; try { body = JSON.parse(r.postData() || "{}"); } catch {} ev.push(`${phase}: ${u.split("/").pop()} ${body.p_surface || ""}/${body.p_event_type || ""}`); } });
await p.goto(base + "/stats", { waitUntil: "domcontentloaded" }); await p.waitForTimeout(8000);
phase = "window-switch x3"; for (const n of [1, 2, 0]) { const btn = p.locator(".stats29-window button").nth(n); await btn.scrollIntoViewIfNeeded(); await btn.click(); await p.waitForTimeout(1500); }
phase = "idle 20s"; await p.waitForTimeout(20000);
const counts = {}; for (const e of ev) counts[e] = (counts[e] || 0) + 1;
console.log(JSON.stringify(counts, null, 1)); await b.close();
