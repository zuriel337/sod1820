#!/usr/bin/env node
// Read-only browser check of the LIVE site, desktop and mobile (agent test procedure; CLAUDE.md section 9 / AGENTS.md "Live-site browser checks").
//   node scripts/live-browser-check.mjs [--host sod1820.co.il] [--paths /,/world,/number/1820] [--shots <dir>]
// What it does: opens each path in a desktop (1440x900) and a mobile (Pixel 7) context, reports HTTP status, title, layout overflow, console errors and
// failed requests. It is READ-ONLY: GET/HEAD pass; the site reads Supabase through POST /rest/v1/rpc/<name>, so a POST to an RPC passes only when its name is
// not a write or a beacon (WRITE_OR_BEACON below); every other POST/PUT/PATCH/DELETE, and every beacon (ingest_event, track_visit, meta-capi, ...), is ABORTED
// and listed. The RPC names that were allowed are listed too, so a reviewer can see them. It does not sign in; saving or signing in on the live site is a
// separate, explicitly approved procedure with a dedicated test account (CLAUDE.md section 9).
// Hosts the sandbox cannot reach (ERR_TUNNEL_CONNECTION_FAILED, for example the site's Supabase API unless the environment allows it, or Google/Meta
// scripts) are reported separately as environmentBlockedHosts: they are not site defects. Any other host the sandbox does not allow ends up there too.
// Why the user agent is rewritten: Playwright's default desktop agent contains "HeadlessChrome", and the edge middleware refuses that token
// (BAD_BOT, correctly: 403). Only the "Headless" token is removed; navigator.webdriver stays true, so the site's own bot verdict still marks the
// run as automation and records NO visitor events (BOT_READ_NO_SIDE_EFFECT_V1). The bot protection is not weakened or bypassed server-side.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
// Playwright is provided by the session image (require resolves it from any directory); it is not a project dependency. Never run `playwright install`.
const { chromium, devices } = createRequire(import.meta.url)("playwright");

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
const HOSTS = new Set(["sod1820.co.il", "www.sod1820.co.il", "sod1820.vercel.app"]);
const host = arg("host", "sod1820.co.il");
if (!HOSTS.has(host)) { console.error(`host must be one of ${[...HOSTS].join(", ")}`); process.exit(2); }
const paths = arg("paths", "/,/world,/number/1820").split(",").map((p) => p.trim()).filter((p) => p.startsWith("/"));
const shots = arg("shots", "");
if (shots) mkdirSync(shots, { recursive: true });

// RPC names that write, record, send or track. Unknown names are treated as reads, and are listed in the report (allowedPostRpc).
const WRITE_OR_BEACON = /(ingest_event|track_|log_|record_|save_|upsert_|insert_|update_|delete_|remove_|create_|set_|submit_|send_|notify|publish|subscribe|follow|react|vote|comment|claim|link_|register|sign|login|invite|erase|redact|approve|review_|admin_)/i;
const contexts = [
  ["desktop", { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }],
  ["mobile", { ...devices["Pixel 7"] }],
];
const browser = await chromium.launch();
const report = [];
let failed = false;
for (const [label, base] of contexts) {
  const { userAgent: ua0, ...rest } = base;
  const probe = await browser.newContext(); const page0 = await probe.newPage();
  const defaultUa = ua0 || await page0.evaluate(() => navigator.userAgent); await probe.close();
  const userAgent = defaultUa.replace(/Headless/g, "");
  const ctx = await browser.newContext({ ...rest, userAgent });
  const writes = [];
  const allowedRpc = new Set(), blockedHosts = new Set();
  await ctx.route("**/*", (route) => {
    const req = route.request(), m = req.method();
    if (m === "GET" || m === "HEAD" || m === "OPTIONS") return route.continue();
    const u = new URL(req.url()), rpc = u.pathname.match(/^\/rest\/v1\/rpc\/([\w]+)$/);
    if (m === "POST" && rpc && !WRITE_OR_BEACON.test(rpc[1])) { allowedRpc.add(rpc[1]); return route.continue(); }
    writes.push(`${m} ${u.host}${u.pathname}`);
    return route.abort("blockedbyclient");
  });
  for (const path of paths) {
    const page = await ctx.newPage(); const errors = [], bad = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 140)); });
    page.on("response", (r) => { const h = new URL(r.url()).host; if (r.status() === 403 && h !== host && !HOSTS.has(h)) blockedHosts.add(`${h} (403: the sandbox proxy, not the site)`); });
    page.on("requestfailed", (r) => {
      const err = r.failure()?.errorText || "";
      if (/blockedbyclient/.test(err)) return;
      const h = new URL(r.url()).host;
      if (/ERR_TUNNEL_CONNECTION_FAILED|ERR_PROXY/.test(err) || (h !== host && !HOSTS.has(h))) { blockedHosts.add(h); return; }
      bad.push(`${r.url().slice(0, 100)} ${err}`);
    });
    const res = await page.goto(`https://${host}${path}`, { waitUntil: "load", timeout: 60000 }).catch((e) => ({ status: () => `ERR ${String(e).slice(0, 80)}` }));
    await page.waitForTimeout(1500);
    const info = await page.evaluate(() => ({ webdriver: navigator.webdriver, w: innerWidth, overflowX: document.documentElement.scrollWidth > innerWidth + 1 })).catch(() => ({}));
    const status = typeof res.status === "function" ? res.status() : res;
    if (status !== 200) failed = true;
    if (shots) await page.screenshot({ path: `${shots}/${label}-${path.replace(/\W+/g, "_") || "home"}.png` }).catch(() => {});
    report.push({ label, path, status, title: await page.title().catch(() => ""), ...info, consoleErrors: errors.length, failedRequests: bad.length, sample: [...errors, ...bad].slice(0, 2) });
    await page.close();
  }
  report.push({ label, blockedWriteOrBeaconRequests: [...new Set(writes)], allowedPostRpc: [...allowedRpc], environmentBlockedHosts: [...blockedHosts] });
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(report, null, 1));
process.exit(failed ? 1 : 0);
