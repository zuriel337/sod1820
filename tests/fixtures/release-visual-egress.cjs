'use strict';
// Release Visual "Mobile + Accessibility" egress guard — DEFAULT-DENY, FAIL-CLOSED, test-side only (no application code is touched).
//
// Why: that acceptance run drives the plain production build against a local preview. The plain build sends visit / identity telemetry
// on every route change (track_visit, ingest_event, link_identity — measured offline, see
// docs/reviews/audit-remediation-20261106/RELEASE-VISUAL-EGRESS-GUARD.md), and nothing stopped those writes from reaching the canonical
// Supabase project, or any third party, from the CI runner.
//
// Policy (one context-level route owns every decision; nothing else is trusted):
//   * loopback preview     GET / HEAD pass, anything else is denied;
//   * canonical Supabase   exactly the read policy of the reviewed shared guard (tests/fixtures/public-readonly-egress.cjs:
//                          allowsPublicRead) plus the extra GET RPCs listed in release-visual-egress-allowlist.json;
//   * third parties        DENIED unless an exact entry of release-visual-egress-allowlist.json matches host + method + resource type
//                          + path (+ query) over https. No wildcard, no "ordinary asset" class: an unknown image, pixel, script, font,
//                          stylesheet, frame or endpoint is denied, and analytics / advertising hosts can never be listed;
//   * WebSockets are closed (1008) and sendBeacon returns false.
// A denied request is answered with 403 + `x-sod-test-readonly-egress: denied-before-network` by THIS route.
//
// Proof ledger: the route records a request in `denied` BEFORE it awaits anything, and it never continues a request it denied, so a
// request in the ledger can only have been fulfilled locally — it was paused in the interceptor and never reached the network, whatever
// Chromium reports afterwards (a late ERR_ABORTED, a MIME-blocked <script>). The audit therefore treats a request the policy blocks as:
//   * proven        if it is in the ledger (any later response / failure is a consequence of the denial);
//   * a LEAK        otherwise — no matter whether it ended in a response, ERR_ABORTED or any other failure. There is no "unverified".
// afterEach calls finish(), which writes the receipt and throws on any leak.
//
// The spec must keep every page-level route handler to `route.fulfill` / `route.fallback`: a page-level `route.continue()` bypasses
// context-level routes (the workflow contract test forbids it, and the browser proof demonstrates the bypass is caught).
const fs = require('node:fs');
const path = require('node:path');
const { allowsPublicRead } = require('./public-readonly-egress.cjs');

const CANONICAL_API = 'https://linswmnnkjxvweumprav.supabase.co';
const CANONICAL_STORAGE = 'https://linswmnnkjxvweumprav.storage.supabase.co';
const SAFE_METHODS = new Set(['GET', 'HEAD']);
const READONLY_MARKER = 'x-sod-test-readonly-egress';
const REASON_HEADER = 'x-sod-test-egress-reason';
const DENIED = 'denied-before-network';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Analytics / advertising / session-recording hosts. Never allow-listable (validated below) and reported with their own reason.
const TELEMETRY_HOST_RE = /(^|\.)(google-analytics\.com|googletagmanager\.com|analytics\.google\.com|doubleclick\.net|googleadservices\.com|googlesyndication\.com|clarity\.ms|connect\.facebook\.net|facebook\.com|vercel-insights\.com|vercel-scripts\.com|hotjar\.com|hotjar\.io|mixpanel\.com|segment\.io|segment\.com|amplitude\.com|tiktok\.com|ads-twitter\.com|px\.ads\.linkedin\.com)$/i;
function isTelemetryHost(hostname) { return TELEMETRY_HOST_RE.test(String(hostname || '')); }

// ---- the allow-list: data, documented, validated at load (a malformed or over-broad entry makes every test fail) ---------------------
const ALLOWLIST = JSON.parse(fs.readFileSync(path.join(__dirname, 'release-visual-egress-allowlist.json'), 'utf8'));
function validateAllowlist(list) {
  const bad = (why) => { throw new Error(`release_visual_allowlist_invalid: ${why}`); };
  if (!list || !Array.isArray(list.thirdParty) || !Array.isArray(list.canonicalExtraGetRpcs)) bad('thirdParty and canonicalExtraGetRpcs arrays are required');
  const documented = (entry, label) => {
    for (const field of ['reason', 'evidence']) if (typeof entry[field] !== 'string' || entry[field].trim().length < 20) bad(`${label}: "${field}" must document the request and why it is needed`);
  };
  const seen = new Set();
  for (const entry of list.thirdParty) {
    const label = `third-party ${entry && entry.host}`;
    if (!entry || typeof entry.host !== 'string' || !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(entry.host)) bad(`${label}: host must be one exact lower-case DNS name (no wildcard, port or scheme)`);
    if (isTelemetryHost(entry.host)) bad(`${label}: analytics / advertising hosts can never be allowed`);
    if (`https://${entry.host}` === CANONICAL_API || `https://${entry.host}` === CANONICAL_STORAGE) bad(`${label}: canonical hosts follow the shared read policy`);
    if (seen.has(entry.host)) bad(`${label}: duplicate host (merge the entries)`);
    seen.add(entry.host);
    if (!Array.isArray(entry.methods) || !entry.methods.length || entry.methods.some((m) => !SAFE_METHODS.has(m))) bad(`${label}: methods must be GET / HEAD only`);
    if (!Array.isArray(entry.resourceTypes) || !entry.resourceTypes.length) bad(`${label}: at least one resource type is required`);
    if (typeof entry.pathRegex !== 'string' || !entry.pathRegex.startsWith('^') || entry.pathRegex === '^' || /^\^(\.\*|\/\.\*)\$?$/.test(entry.pathRegex)) bad(`${label}: pathRegex must be anchored and specific`);
    if (entry.search !== undefined && (typeof entry.search !== 'string' || !entry.search.startsWith('?'))) bad(`${label}: search must be an exact query string starting with "?"`);
    documented(entry, label);
  }
  for (const entry of list.canonicalExtraGetRpcs) {
    if (!entry || !/^[a-z_][a-z0-9_]*$/.test(entry.name || '')) bad('canonical extra GET RPC names must be exact function names');
    documented(entry, `canonical GET rpc ${entry.name}`);
  }
}
validateAllowlist(ALLOWLIST);
const THIRD_PARTY = Object.freeze(ALLOWLIST.thirdParty.map((entry) => Object.freeze({ ...entry, pathRe: new RegExp(entry.pathRegex) })));
const EXTRA_GET_RPCS = Object.freeze(ALLOWLIST.canonicalExtraGetRpcs.map((entry) => entry.name));

function isExtraGetRead(url, method) {
  return url.origin === CANONICAL_API && SAFE_METHODS.has(method) && EXTRA_GET_RPCS.some((name) => url.pathname === `/rest/v1/rpc/${name}`);
}

function matchThirdParty(url, method, resourceType) {
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  return THIRD_PARTY.find((entry) => entry.host === url.hostname && entry.methods.includes(method) && entry.resourceTypes.includes(resourceType)
    && entry.pathRe.test(url.pathname) && (entry.search === undefined || url.search === entry.search)) || null;
}

// Pure classification (used by the route, the audit and the tests): 'local' | 'read' | 'blocked'.
function classify(rawUrl, method, baseUrl, resourceType = 'other') {
  const url = new URL(rawUrl);
  if (url.origin === new URL(baseUrl).origin) return { verdict: 'local' };
  if (isTelemetryHost(url.hostname)) return { verdict: 'blocked', why: 'telemetry_host' };
  if (url.origin === CANONICAL_API || url.origin === CANONICAL_STORAGE) {
    if (isExtraGetRead(url, method)) return { verdict: 'read', why: 'canonical_extra_get_rpc' };
    return allowsPublicRead(rawUrl, method, baseUrl, resourceType) ? { verdict: 'read', why: 'canonical_read_policy' } : { verdict: 'blocked', why: 'canonical_not_an_explicit_read' };
  }
  const entry = matchThirdParty(url, method, resourceType);
  return entry ? { verdict: 'read', why: 'third_party_allowlist', host: entry.host } : { verdict: 'blocked', why: 'third_party_not_allowlisted' };
}

const keyOf = (request) => { try { const u = new URL(request.url()); return `${request.method()} ${u.host}${u.pathname}`; } catch { return `${request.method()} ${String(request.url()).slice(0, 80)}`; } };

async function installReleaseVisualEgress(context, { baseUrl } = {}) {
  if (!baseUrl) throw new Error('release_visual_egress_requires_base_url');
  allowsPublicRead(baseUrl, 'GET', baseUrl); // throws unless baseUrl is a loopback origin
  const localOrigin = new URL(baseUrl).origin;

  const denied = new Map();   // Request -> reason: the proof ledger (see the header)
  const watched = new Set();  // requests the policy blocks, seen through context events
  const outcomes = new Map(); // Request -> what Chromium reported afterwards (informational)
  const firstSeen = new Map(); // Request -> Date.now() when the context first reported it
  const sockets = [];
  let reads = 0;

  const verdictOf = (request) => {
    try { return classify(request.url(), request.method(), baseUrl, request.resourceType()); } catch { return { verdict: 'blocked', why: 'unclassifiable_url' }; }
  };
  const auditable = (request) => {
    try { const u = new URL(request.url()); return /^https?:$/.test(u.protocol) && u.origin !== localOrigin && request.method() !== 'OPTIONS'; } catch { return true; }
  };

  // The single route. Registered at context level, before any page exists; it is the only code that can let a request through.
  await context.route(/.*/, async (route) => {
    const request = route.request();
    const decision = verdictOf(request);
    if (decision.verdict === 'read' || (decision.verdict === 'local' && SAFE_METHODS.has(request.method()))) return route.fallback();
    denied.set(request, decision.why || 'local_non_read'); // BEFORE any await: from here on this request can only be fulfilled, never sent
    try {
      await route.fulfill({
        status: 403, contentType: 'application/json',
        headers: { 'cache-control': 'no-store', [READONLY_MARKER]: DENIED, [REASON_HEADER]: String(decision.why) },
        body: JSON.stringify({ error: 'release_visual_egress_denied', reason: decision.why }),
      });
    } catch { /* the page cancelled the request while it was paused here: it never left the browser */ }
    return undefined;
  });
  await context.routeWebSocket(/.*/, (socket) => { sockets.push(socket.url().replace(/\?.*$/, '?…')); socket.close({ code: 1008, reason: 'release_visual_websocket_denied' }); });
  await context.addInitScript(() => { navigator.sendBeacon = () => false; });

  const watch = (request) => {
    if (!auditable(request)) return null;
    const decision = verdictOf(request);
    if (decision.verdict === 'blocked') { watched.add(request); if (!firstSeen.has(request)) firstSeen.set(request, Date.now()); }
    return decision;
  };
  const afterMs = (request) => (firstSeen.has(request) ? Date.now() - firstSeen.get(request) : null);
  context.on('request', (request) => { const decision = watch(request); if (decision && decision.verdict === 'read') reads++; });
  context.on('response', (response) => {
    try {
      const request = response.request();
      watch(request);
      if (watched.has(request)) outcomes.set(request, { ...outcomes.get(request), status: response.status(), marked: response.headers()[READONLY_MARKER] === DENIED, afterMs: afterMs(request) });
    } catch { /* closed with its page */ }
  });
  context.on('requestfailed', (request) => {
    try {
      watch(request);
      if (watched.has(request)) outcomes.set(request, { ...outcomes.get(request), failure: (request.failure() || {}).errorText || 'failed', afterMs: afterMs(request) });
    } catch { /* closed with its page */ }
  });

  const unproven = () => [...watched].filter((request) => !denied.has(request));
  // The route callback is dispatched asynchronously: give a request that was just observed a moment to appear in the ledger.
  async function settle(timeoutMs = 2500) {
    const end = Date.now() + timeoutMs;
    while (unproven().length && Date.now() < end) await sleep(50);
  }
  const describe = (request) => {
    try { const u = new URL(request.url()); return { method: request.method(), host: u.host, path: u.pathname, type: request.resourceType() }; }
    catch { return { method: request.method(), host: '?', path: String(request.url()).slice(0, 80), type: request.resourceType() }; }
  };

  const api = {
    // Synchronous snapshot. Call settle() first when the last requests may still be in flight.
    summary() {
      const proven = [...watched].filter((request) => denied.has(request));
      const byKey = new Map();
      for (const request of proven) { const key = `${keyOf(request)} [${request.resourceType()}] ${denied.get(request)}`; byKey.set(key, (byKey.get(key) || 0) + 1); }
      const leaks = [];
      for (const request of unproven()) {
        leaks.push({ ...describe(request), why: verdictOf(request).why, outcome: outcomes.get(request) || null, problem: 'not_denied_by_this_guard',
          hint: 'the policy blocks this request but the guard route never denied it: it was cancelled before the route ran, or a page-level route handled it. It cannot be proven that it did not leave the browser.' });
      }
      for (const request of proven) {
        const outcome = outcomes.get(request);
        if (outcome && outcome.status !== undefined && !outcome.marked) leaks.push({ ...describe(request), outcome, problem: 'denied_but_response_without_denial_marker' });
      }
      return {
        reads, provenDenied: proven.length, webSockets: sockets.length,
        blocked: [...byKey.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count),
        leaks,
      };
    },
    settle,
    // [{ method, url, type, why }] of everything this guard denied (the ledger), for tests and receipts.
    deniedList() { return [...denied.entries()].map(([request, why]) => ({ method: request.method(), url: request.url(), type: request.resourceType(), why })); },
    // Called from afterEach: writes the receipt next to the other release evidence and FAILS the test on any leak.
    async finish(testInfo, { dir = path.join('test-results', 'release-visual') } = {}) {
      await settle();
      await sleep(150);
      const summary = { test: testInfo && testInfo.title, ...api.summary() };
      try { fs.mkdirSync(dir, { recursive: true }); fs.appendFileSync(path.join(dir, 'egress-receipt.ndjson'), JSON.stringify(summary) + '\n'); } catch { /* evidence only */ }
      const top = summary.blocked.slice(0, 6).map((entry) => `${entry.key} x${entry.count}`).join('; ') || 'none';
      console.log(`[release-visual egress] reads=${summary.reads} denied=${summary.provenDenied} websockets=${summary.webSockets} leaks=${summary.leaks.length} :: ${top}`);
      if (summary.leaks.length) throw new Error(`release_visual_egress_leak: ${JSON.stringify(summary.leaks)}`);
    },
    async dispose() { /* routes and listeners die with the context */ },
  };
  return api;
}

module.exports = {
  CANONICAL_API, CANONICAL_STORAGE, ALLOWLIST, EXTRA_GET_RPCS, TELEMETRY_HOST_RE, READONLY_MARKER, REASON_HEADER,
  isTelemetryHost, isExtraGetRead, matchThirdParty, classify, validateAllowlist, installReleaseVisualEgress,
};
