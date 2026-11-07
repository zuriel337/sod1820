'use strict';
// Release Visual "Mobile + Accessibility" egress guard — FAIL-CLOSED, test-side only.
//
// Why this exists: that acceptance run drives the plain production build against a local preview. The plain build sends
// visit/identity telemetry on every route change (track_visit, ingest_event, link_identity — measured offline, see
// docs/reviews/audit-remediation-20261106/RELEASE-VISUAL-EGRESS-GUARD.md), and before this guard nothing in that spec
// stopped those writes from reaching the canonical Supabase project from the CI runner.
//
// What it does (no application code is touched; the build under test is the same):
//   1. installs the reviewed shared read-only egress guard (tests/fixtures/public-readonly-egress.cjs): every request that
//      leaves the browser is DENIED before the network unless it is an explicit read — GET/HEAD of REST data, POST of an
//      RPC that is in the reviewed read inventory, public Storage reads, ordinary third-party asset reads. Everything else
//      (any other POST/PUT/PATCH/DELETE, any other RPC, auth/functions/storage writes, beacons, WebSockets) gets a 403
//      with `x-sod-test-readonly-egress: denied-before-network`;
//   2. on top of it, denies every known analytics / advertising host for ALL methods and resource types (a pixel GET to such
//      a host is a write to a third party);
//   3. allows exactly one extra read that the pages issue and the shared inventory does not list (a GET RPC, see below);
//   4. audits the OUTCOME independently of the policy: any non-loopback request that the policy classifies as blocked but
//      whose response does not carry a denial marker is recorded as a leak, and finish() throws so the test fails.
//
// The spec must keep every page-level route handler to `route.fulfill` / `route.fallback`: a page-level `route.continue()`
// bypasses context-level routes (that is why the workflow contract test forbids it).
const fs = require('node:fs');
const path = require('node:path');
const { allowsPublicRead, installPublicReadOnlyEgress, disposePublicReadOnlyEgress } = require('./public-readonly-egress.cjs');

const CANONICAL_API = 'https://linswmnnkjxvweumprav.supabase.co';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const READONLY_MARKER = 'x-sod-test-readonly-egress';
const TELEMETRY_MARKER = 'x-sod-test-telemetry-egress';

// Reads the plain-build pages issue that the shared inventory does not list. GET only: PostgREST refuses GET for volatile
// functions and runs GET calls read-only, and the public reading worker lists this RPC as a GET read
// (public-reading-deploy/transport.js PUBLIC_READING_GET_RPCS). Observed offline on the home and post pages.
const EXTRA_GET_RPCS = Object.freeze(['canonical_follow_subject']);

// Analytics / advertising / session-recording hosts. Denied for every method and resource type (even an <img> pixel).
const TELEMETRY_HOST_RE = /(^|\.)(google-analytics\.com|googletagmanager\.com|analytics\.google\.com|doubleclick\.net|googleadservices\.com|googlesyndication\.com|clarity\.ms|connect\.facebook\.net|facebook\.com|vercel-insights\.com|vercel-scripts\.com|hotjar\.com|hotjar\.io|mixpanel\.com|segment\.io|segment\.com|amplitude\.com|tiktok\.com|ads-twitter\.com|px\.ads\.linkedin\.com)$/i;

function isTelemetryHost(hostname) { return TELEMETRY_HOST_RE.test(String(hostname || '')); }

function isExtraGetRead(url, method) {
  return url.origin === CANONICAL_API && SAFE_METHODS.has(method) && method !== 'OPTIONS'
    && EXTRA_GET_RPCS.some((name) => url.pathname === `/rest/v1/rpc/${name}`);
}

// Pure classification used by the audit and by the tests: 'local' | 'read' | 'blocked'.
function classify(rawUrl, method, baseUrl, resourceType = 'other') {
  const url = new URL(rawUrl);
  const local = new URL(baseUrl);
  if (url.origin === local.origin) return { verdict: 'local' };
  if (isTelemetryHost(url.hostname)) return { verdict: 'blocked', why: 'telemetry_host' };
  if (isExtraGetRead(url, method)) return { verdict: 'read', why: 'extra_get_rpc' };
  if (allowsPublicRead(rawUrl, method, baseUrl, resourceType)) return { verdict: 'read', why: 'read_inventory' };
  return { verdict: 'blocked', why: 'not_an_explicit_read' };
}

const keyOf = (request) => { const u = new URL(request.url()); return `${request.method()} ${u.host}${u.pathname}`; };

async function installReleaseVisualEgress(context, { baseUrl } = {}) {
  if (!baseUrl) throw new Error('release_visual_egress_requires_base_url');
  // Throws unless baseUrl is loopback; the shared guard installs the default-deny route, WebSocket close and sendBeacon stub.
  const shared = await installPublicReadOnlyEgress(context, { baseUrl });

  // Registered after the shared guard, so these run first (Playwright runs the last registered matching route first).
  await context.route((url) => isTelemetryHost(url.hostname), async (route) => route.fulfill({
    status: 403, contentType: 'application/json',
    headers: { 'cache-control': 'no-store', [TELEMETRY_MARKER]: 'denied-before-network' },
    body: JSON.stringify({ error: 'release_visual_telemetry_denied' }),
  }));
  await context.route((url) => url.origin === CANONICAL_API && EXTRA_GET_RPCS.some((n) => url.pathname === `/rest/v1/rpc/${n}`), async (route) => {
    // Exact allow-listed GET read goes straight to the network; anything else on the same path falls through to the shared guard.
    return isExtraGetRead(new URL(route.request().url()), route.request().method()) ? route.continue() : route.fallback();
  });

  const localOrigin = new URL(baseUrl).origin;
  const blocked = new Map();
  const leaks = [];
  const state = new WeakMap(); // request -> 'denied' | 'failed' (a denial and a later Chromium cancellation must count once)
  const unverified = new Set();
  let reads = 0;
  // Which requests are in scope for the audit. A CORS preflight is a permission check, never a write.
  const auditable = (request) => {
    const url = new URL(request.url());
    return /^https?:$/.test(url.protocol) && url.origin !== localOrigin && request.method() !== 'OPTIONS';
  };
  // Outcome audit, independent of the policy that produced the denial: a request the policy classifies as blocked MUST have been
  // answered with a denial marker. `response` is used (not `requestfinished`): a denied cross-origin fetch fails the page's CORS
  // check, and Chromium then never reports it as finished.
  const onResponse = (response) => {
    try {
      const request = response.request();
      if (!auditable(request)) return;
      const verdict = classify(request.url(), request.method(), baseUrl, request.resourceType());
      if (verdict.verdict === 'read') { reads++; return; }
      if (verdict.verdict !== 'blocked') return;
      const headers = response.headers();
      const marked = headers[READONLY_MARKER] === 'denied-before-network' || headers[TELEMETRY_MARKER] === 'denied-before-network';
      if (marked) {
        if (state.get(request) === 'failed') unverified.delete(request);
        if (state.get(request) !== 'denied') blocked.set(keyOf(request), (blocked.get(keyOf(request)) || 0) + 1);
        state.set(request, 'denied');
      } else {
        const url = new URL(request.url());
        leaks.push({ method: request.method(), host: url.host, path: url.pathname, status: response.status(), why: verdict.why });
      }
    } catch { /* a response that vanished with its page is neither a leak nor a read */ }
  };
  // A blocked-class request that FAILED instead of being answered by a denial:
  //  - net::ERR_ABORTED means it was cancelled before completion (a page navigation, or Chromium dropping a denied <script> whose 403
  //    body fails the MIME check). It cannot be shown denied, so it is REPORTED as unverified, never counted as blocked.
  //  - any other failure (net::ERR_FAILED from a CORS rejection, connection errors, ...) means the request reached the network stack
  //    without passing a denial route: a third party may already have processed it. That is a LEAK.
  // The decision is deferred briefly so that a denial response that is reported after the failure is not mistaken for a leak.
  const onFailed = (request) => {
    try {
      if (!auditable(request)) return;
      const verdict = classify(request.url(), request.method(), baseUrl, request.resourceType());
      if (verdict.verdict === 'read') { reads++; return; }
      if (verdict.verdict !== 'blocked') return;
      const text = (request.failure() || {}).errorText || '';
      if (/ERR_ABORTED/.test(text)) { if (state.get(request) !== 'denied') { state.set(request, 'failed'); unverified.add(request); } return; }
      setTimeout(() => {
        if (state.get(request) === 'denied') return;
        const url = new URL(request.url());
        leaks.push({ method: request.method(), host: url.host, path: url.pathname, status: null, failure: text, why: verdict.why });
      }, 100);
    } catch { /* see above */ }
  };
  context.on('response', onResponse);
  context.on('requestfailed', onFailed);

  return {
    summary() {
      return {
        allowedReads: reads,
        blocked: [...blocked.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count),
        deniedBySharedGuard: shared.denied.length,
        unverifiedFailures: unverified.size,
        unverified: [...unverified].map(keyOf).slice(0, 20),
        leaks,
      };
    },
    // Called from afterEach: writes the receipt next to the other release evidence and FAILS the test on any leak.
    async finish(testInfo, { dir = path.join('test-results', 'release-visual') } = {}) {
      await new Promise((resolve) => setTimeout(resolve, 350)); // let the last events (and the deferred failure checks) settle
      const summary = { test: testInfo && testInfo.title, ...this.summary() };
      try { fs.mkdirSync(dir, { recursive: true }); fs.appendFileSync(path.join(dir, 'egress-receipt.ndjson'), JSON.stringify(summary) + '\n'); } catch { /* evidence only */ }
      const top = summary.blocked.slice(0, 6).map((b) => `${b.key} x${b.count}`).join('; ') || 'none';
      console.log(`[release-visual egress] reads=${summary.allowedReads} blocked=${summary.blocked.reduce((n, b) => n + b.count, 0)} unverified=${summary.unverifiedFailures} leaks=${summary.leaks.length} :: ${top}`);
      if (summary.leaks.length) throw new Error(`release_visual_egress_leak: ${JSON.stringify(summary.leaks)}`);
    },
    async dispose() { await disposePublicReadOnlyEgress(context); },
  };
}

module.exports = { CANONICAL_API, EXTRA_GET_RPCS, TELEMETRY_HOST_RE, READONLY_MARKER, TELEMETRY_MARKER, isTelemetryHost, isExtraGetRead, classify, installReleaseVisualEgress };
