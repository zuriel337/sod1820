// F5 loopback experiment: how long does the blocking public_post_slug_exists RPC delay the
// HTML decision made by the REAL middleware-core.js?
//
// Local only. A loopback HTTP server stands in for Supabase and answers after an injected
// latency L; global fetch is redirected from https://linswmnnkjxvweumprav.supabase.co to it.
// No live DB, no network egress, no product-code change. The numbers are therefore
// "serial Supabase round trips added by the middleware" x L + local overhead — NOT production
// timings. Production RTT from the Vercel edge to Supabase is not measurable here.
//
// Usage (from repo root):
//   VERCEL_EDGE_ENTRY=<.../node_modules/@vercel/edge/dist/index.js> \
//   node --import ./docs/perf-evidence-20261018/post-middleware-f5/resolve-vercel-edge.mjs \
//        docs/perf-evidence-20261018/post-middleware-f5/loopback.mjs [out.json]
// Env: MW_DIR (dir holding middleware-core.js + route-legitimacy.js, default = repo root),
//      RUNS (default 15), LATENCIES (default "0,50,150").
import http from "node:http";
import { writeFileSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const MW_DIR = process.env.MW_DIR || path.resolve(here, "../../..");
const RUNS = Number(process.env.RUNS || 15);
const LATENCIES = (process.env.LATENCIES || "0,50,150").split(",").map(Number);
const HANG_CAP_MS = 2500;
const SUPABASE = "https://linswmnnkjxvweumprav.supabase.co";

const CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const GOOGLEBOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const NAV_HEADERS = { "sec-fetch-mode": "navigate", "sec-fetch-dest": "document", "sec-fetch-site": "none", "accept-language": "he-IL,he;q=0.9", accept: "text/html,application/xhtml+xml" };

// ── fake Supabase ────────────────────────────────────────────────────────────
const state = { latency: 0, mode: "ok", rpcCalls: 0, otherCalls: 0 };
const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const isRpc = req.url.includes("/rpc/public_post_slug_exists");
    if (isRpc) state.rpcCalls++; else state.otherCalls++;
    const respond = () => {
      if (!isRpc) { res.setHeader("content-type", "application/json"); return res.end(req.url.includes("edge_blocked_countries") ? "[]" : "null"); }
      if (state.mode === "reset") return req.socket.destroy();
      if (state.mode === "hang") return; // never answers
      if (state.mode === "500") { res.statusCode = 500; return res.end('{"message":"boom"}'); }
      if (state.mode === "badjson") { res.setHeader("content-type", "application/json"); return res.end("<html>"); }
      let slug = ""; try { slug = JSON.parse(body).p_slug; } catch { /* */ }
      res.setHeader("content-type", "application/json");
      res.end(String(slug).startsWith("exists-") ? "true" : "false");
    };
    // only the post RPC carries the injected latency; countryPolicy/log RPCs answer instantly
    // so that the post RPC is the single variable being measured.
    if (isRpc && state.latency > 0) setTimeout(respond, state.latency); else respond();
  });
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const PORT = server.address().port;
const realFetch = globalThis.fetch;
globalThis.fetch = (url, opts) => {
  const u = String(url);
  return realFetch(u.startsWith(SUPABASE) ? `http://127.0.0.1:${PORT}${u.slice(SUPABASE.length)}` : u, opts);
};
Math.random = () => 0.99; // keep browser log_edge sampling out of the picture (waitUntil, non-blocking anyway)

let importSeq = 0;
async function freshMiddleware() {
  const mod = await import(pathToFileURL(path.join(MW_DIR, "middleware-core.js")).href + "?i=" + importSeq++);
  return mod.default;
}
const ctx = () => ({ waitUntil: (p) => { Promise.resolve(p).catch(() => {}); } });
const hrMs = () => Number(process.hrtime.bigint()) / 1e6;

async function once(mw, { path: p, method = "GET", ua, nav = false, country = "IL", cap }) {
  const headers = { "user-agent": ua, "x-vercel-ip-country": country, ...(nav ? NAV_HEADERS : {}) };
  const req = new Request("https://sod1820.co.il" + p, { method, headers, redirect: "manual" });
  const rpcBefore = state.rpcCalls;
  const t0 = hrMs();
  let res = null, timedOut = false;
  const run = Promise.resolve(mw(req, ctx()));
  if (cap) {
    res = await Promise.race([run, new Promise((r) => setTimeout(() => r("TIMEOUT"), cap))]);
    if (res === "TIMEOUT") { timedOut = true; res = null; }
  } else res = await run;
  const ms = hrMs() - t0;
  return {
    ms, timedOut, rpc: state.rpcCalls - rpcBefore,
    status: res ? (res.headers.get("x-middleware-next") === "1" ? "next" : res.status) : null,
    location: res?.headers.get("location") || null,
    route: res?.headers.get("x-sod-route") || null,
    robots: res?.headers.get("x-robots-tag") || null,
  };
}
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))]; };
const stat = (xs) => ({ n: xs.length, min: +Math.min(...xs).toFixed(2), median: +q(xs, 0.5).toFixed(2), p95: +q(xs, 0.95).toFixed(2), max: +Math.max(...xs).toFixed(2) });
function summarize(rows) {
  const first = rows[0];
  return { ...stat(rows.map((r) => r.ms)), status: [...new Set(rows.map((r) => r.status))].join("|"), location: first.location, route: first.route, rpcPerRequest: [...new Set(rows.map((r) => r.rpc))].join("|"), timedOut: rows.filter((r) => r.timedOut).length };
}

const results = { meta: { mwDir: MW_DIR, runs: RUNS, latenciesMs: LATENCIES, node: process.version, note: "loopback, injected latency; not production timing" }, scenarios: [] };
let uniq = 0;
const slugFor = (exists) => `${exists ? "exists" : "missing"}-${process.pid}-${uniq++}`;
const UAS = { browser: { ua: CHROME, nav: true }, goodbot: { ua: GOOGLEBOT, nav: false } };

for (const L of LATENCIES) {
  state.latency = L; state.mode = "ok";
  for (const method of ["GET", "HEAD"]) {
    for (const [who, u] of Object.entries(UAS)) {
      const mw = await freshMiddleware();
      await once(mw, { path: "/posts", method, ...u }); // warms the 5-min country-policy cache (separate fetch, measured below)
      const mk = (name, pathFn, extra = {}) => ({ name, pathFn, ...extra });
      const plans = [
        mk("baseline_known_route(/posts)", () => "/posts"),
        mk("post_exists_cold", () => "/post/" + slugFor(true)),
        mk("post_missing_cold", () => "/post/" + slugFor(false)),
        mk("legacy_slug_exists_cold(308)", () => "/" + slugFor(true)),
        mk("legacy_slug_missing_cold(404)", () => "/" + slugFor(false)),
      ];
      for (const plan of plans) {
        const rows = [];
        for (let i = 0; i < RUNS; i++) rows.push(await once(mw, { path: plan.pathFn(), method, ...u }));
        results.scenarios.push({ latencyMs: L, method, who, scenario: plan.name, ...summarize(rows) });
      }
      for (const exists of [true, false]) {
        const rows = [];
        for (let i = 0; i < RUNS; i++) {
          const p = "/post/" + slugFor(exists);
          await once(mw, { path: p, method, ...u }); // prime
          rows.push(await once(mw, { path: p, method, ...u }));
        }
        results.scenarios.push({ latencyMs: L, method, who, scenario: exists ? "post_exists_warm_cache" : "post_missing_warm_cache", ...summarize(rows) });
      }
    }
  }
}

// ── the other serial fetch on the same path: country policy on an isolate with a cold 5-min cache ──
for (const L of LATENCIES) {
  state.latency = L; state.mode = "ok";
  const rows = [];
  for (let i = 0; i < RUNS; i++) { const mw = await freshMiddleware(); rows.push(await once(mw, { path: "/posts", ua: CHROME, nav: true })); }
  results.scenarios.push({ latencyMs: L, method: "GET", who: "browser", scenario: "known_route_cold_isolate(country-policy fetch; injected L does NOT apply to it)", ...summarize(rows) });
}

// ── Supabase failure modes (GET /post/:slug, cold cache) ──
state.latency = 50;
for (const mode of ["500", "badjson", "reset", "hang"]) {
  state.mode = mode;
  for (const [who, u] of Object.entries(UAS)) {
    const mw = await freshMiddleware();
    state.mode = "ok"; await once(mw, { path: "/posts", ...u }); state.mode = mode;
    const n = mode === "hang" ? 3 : RUNS;
    const rows = [];
    const slug = slugFor(false); // SAME slug each time: a failure is never cached, so every request pays again
    for (let i = 0; i < n; i++) rows.push(await once(mw, { path: "/post/" + slug, ...u, cap: mode === "hang" ? HANG_CAP_MS : undefined }));
    results.scenarios.push({ latencyMs: 50, method: "GET", who, scenario: `supabase_failure:${mode}${mode === "hang" ? ` (harness cap ${HANG_CAP_MS}ms)` : ""}`, ...summarize(rows), perRequestMs: rows.map((r) => +r.ms.toFixed(1)).slice(0, 5) });
  }
}
state.mode = "ok";

// ── UA classification gaps: who actually reaches the lookup as 'browser'? ──
const uaProbe = {
  "Googlebot": GOOGLEBOT,
  "Bingbot": "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
  "DuckDuckBot": "DuckDuckBot/1.1; (+http://duckduckgo.com/duckduckbot.html)",
  "Yahoo Slurp": "Mozilla/5.0 (compatible; Yahoo! Slurp; http://help.yahoo.com/help/us/ysearch/slurp)",
  "Naver Yeti": "Mozilla/5.0 (compatible; Yeti/1.1; +http://naver.me/spd)",
  "Qwant": "Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Qwantify/2.4w; +https://www.qwant.com/)/2.4w",
  "Sogou": "Sogou web spider/4.0(+http://www.sogou.com/docs/help/webmasters.htm#07)",
  "Seznam": "Mozilla/5.0 (compatible; SeznamBot/4.0; +http://napoveda.seznam.cz/seznambot-intro/)",
  "Chrome (human)": CHROME,
};
const mwP = await freshMiddleware();
results.uaClassification = [];
for (const [name, ua] of Object.entries(uaProbe)) {
  const req = new Request("https://sod1820.co.il/posts", { headers: { "user-agent": ua, "x-vercel-ip-country": "IL" } });
  const res = await mwP(req, ctx());
  const vb = /vb=([a-z]+)/.exec(res.headers.get("set-cookie") || "")?.[1] || null;
  results.uaClassification.push({ ua: name, outcome: res.status === 403 ? "403 (kind=bot)" : `kind=${vb}`, reachesPostLookupAs: res.status === 403 ? "blocked before lookup" : vb });
}

server.close();
const out = process.argv[2];
if (out) writeFileSync(out, JSON.stringify(results, null, 2) + "\n");
console.log(JSON.stringify(results, null, 1));
process.exit(0);
