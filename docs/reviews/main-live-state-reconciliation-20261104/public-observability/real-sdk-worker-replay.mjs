// Replays requests produced by the REAL public gtag.js (captured offline by real-sdk-offline-harness.cjs)
// through the EXACT emitted public-reading service worker (same VM seam as test/public-reading-observability.test.mjs).
// No network. Usage: SOD_CAPTURE=<raw scratch json> node real-sdk-worker-replay.mjs > real-sdk-worker-decisions.json
import fs from 'node:fs';
import vm from 'node:vm';
import {buildPublicReadingWorker} from '../../../../public-reading-deploy/transport.js';
const SITE = 'https://sod1820.co.il';
function worker(clientPath) {
  const L = {}, calls = [];
  const self = {location: {origin: SITE}, skipWaiting() {}, clients: {claim() {}, get: async () => ({type: 'window', url: SITE + clientPath})}, addEventListener: (n, f) => { L[n] = f; }};
  const ctx = {self, Request, Response, Headers, URL, URLSearchParams, atob, TextEncoder, console, fetch: async r => { calls.push(r); return new Response(null, {status: 204}); }};
  vm.runInNewContext(buildPublicReadingWorker('a'.repeat(40), {anonKey: 'public-fixture', gaId: 'G-TEST12345'}), ctx);
  return {calls, async send(url, init) { let r = null; L.fetch({request: new Request(url, init), clientId: 'window-1', respondWith: v => { r = Promise.resolve(v); }}); return r ? (await r).status : 'PASSTHROUGH'; }};
}
const decide = async (method, url) => { const w = worker('/number/1'); const s = await w.send(url, {method}); return {status: s, forwardedToNetwork: w.calls.length}; };
const out = {scope: 'REAL gtag.js request shapes replayed through the emitted worker; no network', realSdkRequests: [], otherEndpoints: []};
const cap = JSON.parse(fs.readFileSync(process.env.SOD_CAPTURE, 'utf8'));
for (const c of cap.collectRequests) out.realSdkRequests.push({origin: c.origin, path: c.path, method: c.method, en: c.en, ...await decide(c.method, c.__url)});
for (const [m, u] of [['GET', 'https://www.googletagmanager.com/gtag/js?id=G-TEST12345'], ['GET', 'https://www.googletagmanager.com/gtag/destination?id=G-TEST12345&l=dataLayer'],
  ['POST', 'https://analytics.google.com/g/collect?v=2&tid=G-TEST12345&en=page_view'], ['POST', 'https://stats.g.doubleclick.net/g/collect?v=2&tid=G-TEST12345'],
  ['POST', 'https://region1.google-analytics.com/g/collect?v=2&tid=G-TEST12345&en=page_view&dl=https%3A%2F%2Fsod1820.co.il%2Fnumber%2F%3Avalue&dt=SOD1820']])
  out.otherEndpoints.push({method: m, url: u.replace(/\?.*/, ''), ...await decide(m, u)});
console.log(JSON.stringify(out, null, 2));
