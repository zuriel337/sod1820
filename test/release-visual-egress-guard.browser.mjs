// Browser proof for the Release Visual egress guard (real Chromium, no live network).
//
// Safety design: Chromium is launched behind a local TRIPWIRE proxy and the process drops every proxy environment variable.
// Nothing that is not answered locally (by the guard's routes) can go anywhere except the tripwire, which only logs and refuses
// (HTTPS CONNECT -> 502) or acknowledges plain HTTP (204). So this proof can neither reach Supabase / a third party nor harm
// them if the guard were broken — and the tripwire log is the independent evidence of what actually tried to leave the browser.
//
//   Phase 1  guarded context, write + telemetry + unexpected battery  -> every request answered 403 with a denial marker,
//            WebSocket closed 1008, sendBeacon refused, tripwire log EMPTY, audit reports zero leaks.
//   Phase 2  same context, explicit reads                              -> reads still pass (they reach the tripwire).
//   Phase 3a negative control, UNGUARDED context, one write            -> the write reaches the tripwire (the tripwire can see leaks).
//   Phase 3b a page-level route.continue() bypass inside a guarded context -> the request reaches the tripwire AND the audit flags
//            it and finish() throws (why the spec must never use route.continue(), and proof that the audit fails the test).
import http from "node:http";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

for (const key of ["HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy", "ALL_PROXY", "all_proxy"]) delete process.env[key];
const require = createRequire(import.meta.url);
const { chromium } = require("@playwright/test");
const { installReleaseVisualEgress, CANONICAL_API: API, READONLY_MARKER, TELEMETRY_MARKER } = require("../tests/fixtures/release-visual-egress.cjs");

const CANON_HOST = new URL(API).host;
const JSON_HEADERS = { "content-type": "application/json", apikey: "proof-not-a-key", authorization: "Bearer proof-not-a-key" };
const evidenceDir = fs.mkdtempSync(path.join(os.tmpdir(), "rv-egress-proof-"));

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

// ---- the in-page battery --------------------------------------------------------------------------------------------------
const f = (label, method, url, extra = {}) => ({ label, via: "fetch", method, url, headers: JSON_HEADERS, body: method === "GET" ? undefined : "{}", ...extra });
const BLOCKED_REQUESTS = [
  // canonical writes: telemetry / identity / DEF-012 / REST / functions / auth / storage
  f("track_visit", "POST", `${API}/rest/v1/rpc/track_visit`), f("ingest_event", "POST", `${API}/rest/v1/rpc/ingest_event`),
  f("link_identity", "POST", `${API}/rest/v1/rpc/link_identity`), f("log_journey_save", "POST", `${API}/rest/v1/rpc/log_journey_save`),
  f("page_views insert", "POST", `${API}/rest/v1/page_views`), f("posts PATCH", "PATCH", `${API}/rest/v1/posts?id=eq.1`),
  f("posts DELETE", "DELETE", `${API}/rest/v1/posts?id=eq.1`), f("posts PUT", "PUT", `${API}/rest/v1/posts?id=eq.1`),
  f("meta-capi (keepalive)", "POST", `${API}/functions/v1/meta-capi`, { keepalive: true }), f("auth token", "POST", `${API}/auth/v1/token?grant_type=password`),
  f("storage upload", "POST", `${API}/storage/v1/object/gallery/community/x.png`),
  { label: "track_visit via XHR", via: "xhr", method: "POST", url: `${API}/rest/v1/rpc/track_visit`, headers: JSON_HEADERS, body: "{}" },
  // unexpected shapes on the canonical origin
  f("unknown rpc", "POST", `${API}/rest/v1/rpc/some_function_that_does_not_exist`), f("volatile rpc lang_links_list", "POST", `${API}/rest/v1/rpc/lang_links_list`),
  f("GET non-read rpc", "GET", `${API}/rest/v1/rpc/track_visit`), f("extra read, wrong method", "POST", `${API}/rest/v1/rpc/canonical_follow_subject`), f("encoded name", "POST", `${API}/rest/v1/rpc/track%5Fvisit`),
  f("double slash", "POST", `${API}/rest/v1/rpc//track_visit`), f("look-alike host", "POST", "https://linswmnnkjxvweumprav.supabase.co.attacker.test/rest/v1/rpc/gematria_api"),
  // third parties
  f("GA collect", "POST", "https://www.google-analytics.com/g/collect?v=2"), f("clarity", "POST", "https://www.clarity.ms/collect"),
  f("vercel vitals", "POST", "https://vitals.vercel-insights.com/v1/vitals"), f("unknown POST", "POST", "https://unknown.example/collect"),
  f("unknown GET (fetch)", "GET", "https://unknown.example/api/ping"), f("plain-http POST (the canary that could succeed)", "POST", "http://escape-demo.test/collect"),
  { label: "GA pixel (img)", via: "img", method: "GET", url: "https://www.google-analytics.com/collect?v=1&t=pageview" },
  { label: "GTM loader (script)", via: "script", method: "GET", url: "https://www.googletagmanager.com/gtag/js?id=G-PROOF" },
];
const NON_REQUEST_CHANNELS = [
  { label: "sendBeacon", via: "beacon", url: `${API}/rest/v1/rpc/ingest_event` },
  { label: "WebSocket (realtime)", via: "ws", url: `wss://${CANON_HOST}/realtime/v1/websocket?apikey=proof&vsn=1.0.0` },
  { label: "EventSource", via: "es", url: "https://unknown.example/stream" },
];
const READS = [
  f("REST read (GET posts)", "GET", `${API}/rest/v1/posts?select=id&limit=1`), f("read RPC (fn_method_value)", "POST", `${API}/rest/v1/rpc/fn_method_value`),
  f("extra GET read (canonical_follow_subject)", "GET", `${API}/rest/v1/rpc/canonical_follow_subject`),
  { label: "accepted third-party image read", via: "img", method: "GET", url: "http://asset.test/pixel.png" },
];

async function runBattery(page, battery) {
  return page.evaluate(async (items) => {
    const results = [];
    for (const b of items) {
      try {
        if (b.via === "fetch") {
          await fetch(b.url, { method: b.method, headers: b.headers, body: b.body, keepalive: !!b.keepalive, mode: b.mode })
            .then((r) => results.push({ label: b.label, status: r.status }), (e) => results.push({ label: b.label, error: String(e).slice(0, 50) }));
        } else if (b.via === "xhr") {
          await new Promise((resolve) => {
            const x = new XMLHttpRequest(); x.open(b.method, b.url);
            for (const [k, v] of Object.entries(b.headers || {})) x.setRequestHeader(k, v);
            x.onloadend = () => { results.push({ label: b.label, status: x.status }); resolve(); }; x.send(b.body || null);
          });
        } else if (b.via === "img") {
          await new Promise((resolve) => { const i = new Image(); i.onload = i.onerror = () => { results.push({ label: b.label, loaded: i.complete && i.naturalWidth > 0 }); resolve(); }; i.src = b.url; });
        } else if (b.via === "script") {
          await new Promise((resolve) => { const s = document.createElement("script"); s.onload = s.onerror = () => { results.push({ label: b.label }); resolve(); }; s.src = b.url; document.head.appendChild(s); });
        } else if (b.via === "beacon") {
          results.push({ label: b.label, sent: navigator.sendBeacon(b.url, "x") });
        } else if (b.via === "ws") {
          await new Promise((resolve) => {
            let opened = false; const w = new WebSocket(b.url);
            w.onopen = () => { opened = true; }; w.onerror = () => {};
            w.onclose = (e) => { results.push({ label: b.label, opened, code: e.code }); resolve(); };
            setTimeout(() => { try { w.close(); } catch {} resolve(); }, 2500);
          });
        } else if (b.via === "es") {
          await new Promise((resolve) => { const e = new EventSource(b.url); e.onerror = () => { e.close(); results.push({ label: b.label, errored: true }); resolve(); }; setTimeout(() => { e.close(); resolve(); }, 2000); });
        }
      } catch (e) { results.push({ label: b.label, threw: String(e).slice(0, 50) }); }
    }
    return results;
  }, battery);
}

// Hosts the battery targets: a tripwire hit on any of them is a leak. (A full Chrome build can add its own update / sign-in chatter; that
// is not the page's and is only counted, never ignored silently.)
const BATTERY_HOSTS = new Set([...BLOCKED_REQUESTS, ...NON_REQUEST_CHANNELS, ...READS].map((b) => new URL(b.url).host).concat([`${CANON_HOST}:443`, `${CANON_HOST}`]));
const hostOf = (t) => (t.kind === "CONNECT" ? t.target : new URL(t.url).host);
const pageLeaks = () => tripwire.filter((t) => BATTERY_HOSTS.has(hostOf(t)) || BATTERY_HOSTS.has(hostOf(t).replace(/:443$/, "")));
const chatter = () => tripwire.length - pageLeaks().length;

// Playwright-side record of what the browser actually received for every non-loopback request (independent of the guard's own audit).
function observe(context) {
  const seen = [];
  context.on("response", (r) => {
    const h = r.headers();
    seen.push({ method: r.request().method(), url: r.url(), status: r.status(), marker: h[READONLY_MARKER] || h[TELEMETRY_MARKER] || null });
  });
  context.on("requestfailed", (r) => seen.push({ method: r.method(), url: r.url(), failed: (r.failure() || {}).errorText || "failed" }));
  return seen;
}
const settle = (page) => page.waitForTimeout(600);
const rows = [];
const note = (phase, ok, text) => { rows.push({ phase, ok, text }); console.log(`${ok ? "PASS" : "FAIL"}  ${phase}  ${text}`); };

(async () => {
  pagePort = await listen(pageServer);
  const proxyPort = await listen(proxy);
  const baseUrl = `http://127.0.0.1:${pagePort}`;
  const browser = await chromium.launch({ proxy: { server: `http://127.0.0.1:${proxyPort}` }, args: ["--disable-background-networking", "--disable-component-update", "--no-first-run"] });
  let failed = false;
  try {
    // ---------------------------------------------------------------- Phase 1 + 2: guarded context
    const context = await browser.newContext({ serviceWorkers: "block" });
    const egress = await installReleaseVisualEgress(context, { baseUrl });
    const seen = observe(context);
    const page = await context.newPage();
    await page.goto(baseUrl);
    tripwire.length = 0;

    const first = await runBattery(page, [...BLOCKED_REQUESTS, ...NON_REQUEST_CHANNELS]);
    await settle(page);

    // Outcome per blocked request: DENIED (a 403 with a denial marker) or ABORTED (Chromium cancelled the denied response itself — e.g. a
    // <script> whose 403 JSON body fails the MIME check — so no response event exists). Never acceptable: a response WITHOUT the marker.
    const missing = [];
    const abortedOnly = [];
    for (const b of BLOCKED_REQUESTS) {
      const mine = seen.filter((s) => s.method === b.method && s.url === b.url);
      const denied = mine.some((s) => s.status === 403 && s.marker === "denied-before-network");
      const escaped = mine.find((s) => s.status != null && !(s.status === 403 && s.marker));
      const aborted = mine.some((s) => s.failed);
      if (escaped || !(denied || aborted)) missing.push(`${b.method} ${b.url} -> ${JSON.stringify(escaped || "no outcome observed")}`);
      else if (!denied) abortedOnly.push(`${b.method} ${b.url}`);
    }
    note("1 guarded writes", missing.length === 0, `${BLOCKED_REQUESTS.length} write / telemetry / unexpected requests: ${BLOCKED_REQUESTS.length - abortedOnly.length} answered 403 with a denial marker, ${abortedOnly.length} cancelled by Chromium after the denial (${abortedOnly.join(", ") || "none"})${missing.length ? ` — MISSING: ${missing.join(" | ")}` : ""}`);
    assert.deepEqual(missing, [], "every blocked request must be denied before the network");

    const beacon = first.find((r) => r.label === "sendBeacon");
    assert.equal(beacon && beacon.sent, false, "sendBeacon must be refused");
    const ws = first.find((r) => r.label === "WebSocket (realtime)");
    assert.ok(ws && ws.code === 1008, `the realtime WebSocket must be closed by the guard (got ${JSON.stringify(ws)})`);
    note("1 non-request channels", true, "sendBeacon refused (false); WebSocket closed with code 1008; EventSource never connected");

    assert.deepEqual(pageLeaks(), [], `NOTHING the page sends may reach the network while the guard is on, but the tripwire saw: ${JSON.stringify(pageLeaks())}`);
    note("1 tripwire", true, `0 connections to any battery host reached the tripwire proxy while the write battery ran (browser-internal chatter ignored: ${chatter()})`);

    const afterWrites = egress.summary();
    assert.deepEqual(afterWrites.leaks, [], "the guard's own audit must report zero leaks");
    assert.ok(afterWrites.blocked.reduce((n, b) => n + b.count, 0) + afterWrites.unverifiedFailures >= BLOCKED_REQUESTS.length,
      `the audit must have accounted for every blocked request: ${JSON.stringify(afterWrites)}`);
    assert.equal(afterWrites.unverifiedFailures, abortedOnly.length, `the only blocked-class requests without a visible denial must be the ${abortedOnly.length} Chromium-cancelled ones (got ${JSON.stringify(afterWrites.unverified)})`);
    note("1 audit", true, `audit: ${afterWrites.blocked.reduce((n, b) => n + b.count, 0)} blocked (marker seen), ${afterWrites.unverifiedFailures} reported as unverified (cancelled), 0 leaks`);
    await egress.finish({ title: "proof phase 1" }, { dir: evidenceDir }); // must not throw

    // reads must still work
    tripwire.length = 0;
    await runBattery(page, READS);
    await settle(page);
    const connects = tripwire.filter((t) => t.kind === "CONNECT" && t.target === `${CANON_HOST}:443`).length;
    const asset = tripwire.some((t) => t.kind === "HTTP" && t.url.startsWith("http://asset.test/"));
    assert.ok(connects >= 3, `the 3 explicit canonical reads must reach the network layer (tripwire saw ${connects} CONNECT to ${CANON_HOST})`);
    assert.ok(asset, "the accepted third-party image read must pass");
    const falselyDenied = seen.filter((s) => READS.some((r) => r.url === s.url && r.method === s.method) && s.marker);
    assert.deepEqual(falselyDenied, [], "no explicit read may be denied");
    note("2 reads", true, `explicit reads pass the guard (${connects} canonical CONNECTs + 1 accepted asset read reached the tripwire, none denied)`);
    assert.deepEqual(egress.summary().leaks, []);
    await egress.finish({ title: "proof phase 2" }, { dir: evidenceDir });
    await egress.dispose();
    await context.close();

    // ---------------------------------------------------------------- Phase 3a: negative control (no guard)
    const bare = await browser.newContext({ serviceWorkers: "block" });
    const barePage = await bare.newPage();
    await barePage.goto(baseUrl);
    tripwire.length = 0;
    await runBattery(barePage, [f("UNGUARDED track_visit", "POST", `${API}/rest/v1/rpc/track_visit`)]);
    await settle(barePage);
    assert.ok(tripwire.some((t) => t.kind === "CONNECT" && t.target === `${CANON_HOST}:443`), "without the guard the write MUST reach the tripwire, otherwise this proof proves nothing");
    note("3a negative control", true, "an UNGUARDED context sends the write to the tripwire — the tripwire can see leaks, so the empty log in phase 1 is meaningful");
    await bare.close();

    // ---------------------------------------------------------------- Phase 3b: page-level continue() bypass
    const bypassCtx = await browser.newContext({ serviceWorkers: "block" });
    const bypassEgress = await installReleaseVisualEgress(bypassCtx, { baseUrl });
    const bypassPage = await bypassCtx.newPage();
    await bypassPage.route("**/*", (route) => route.continue()); // what the spec is forbidden to do
    await bypassPage.goto(baseUrl);
    tripwire.length = 0;
    await runBattery(bypassPage, [
      f("BYPASS write, CORS-rejected (fails with ERR_FAILED, but the server already saw it)", "POST", "http://escape-demo.test/collect"),
      { label: "BYPASS write, no-cors (answered 204)", via: "fetch", method: "POST", url: "http://escape-demo.test/simple", body: "x", headers: {}, mode: "no-cors" },
    ]);
    await settle(bypassPage);
    assert.ok(tripwire.filter((t) => t.kind === "HTTP" && t.url.startsWith("http://escape-demo.test/")).length >= 2, "a page-level continue() bypasses the context guard (that is why the spec must not use it)");
    assert.ok(bypassEgress.summary().leaks.length >= 2, `the independent audit must flag BOTH bypassed writes as leaks (got ${JSON.stringify(bypassEgress.summary().leaks)})`);
    await assert.rejects(() => bypassEgress.finish({ title: "bypass demo" }, { dir: evidenceDir }), /release_visual_egress_leak/);
    note("3b bypass + audit", true, "a page-level route.continue() lets a write through, the audit flags it, and finish() throws — a leak fails the test");
    await bypassEgress.dispose();
    await bypassCtx.close();
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
