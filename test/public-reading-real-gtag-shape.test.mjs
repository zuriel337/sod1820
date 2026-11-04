import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { buildPublicReadingWorker } from "../public-reading-deploy/transport.js";

// Request SHAPES observed from the REAL public gtag.js (fixture measurement id) run offline in jsdom with every
// network sink stubbed: docs/reviews/main-live-state-reconciliation-20261104/public-observability/real-sdk-offline-result.json
// Values below are synthetic; only the parameter-name set, hosts and methods come from the real SDK.
const SITE = "https://sod1820.co.il";
const GA_KEYS_REAL_SDK = ["_ee", "_fv", "_nsi", "_p", "_s", "_ss", "_tu", "cid", "dl", "dma", "dp", "dr", "dt", "en", "frm", "gcd", "gtm", "ngs", "npa",
  "pscdl", "rcb", "sct", "seg", "sid", "sr", "tag_exp", "tfd", "tid", "ul", "v"];
const values = { tid: "G-TEST12345", v: "2", en: "page_view", dl: SITE + "/number/:value", dp: "/number/:value", dt: "SOD1820", dr: "", cid: "1.1" };
const collectUrl = (origin, extra = {}) => {
  const q = new URLSearchParams();
  for (const key of GA_KEYS_REAL_SDK) q.set(key, values[key] ?? "1");
  for (const [key, value] of Object.entries(extra)) q.set(key, value);
  return origin + "/g/collect?" + q;
};
function worker() {
  const listeners = {}, calls = [];
  const self = { location: { origin: SITE }, skipWaiting() {}, clients: { claim() {}, get: async () => ({ type: "window", url: SITE + "/number/1" }) },
    addEventListener: (name, fn) => { listeners[name] = fn; } };
  const context = { self, Request, Response, Headers, URL, URLSearchParams, atob, TextEncoder, console,
    fetch: async req => { calls.push(req); return new Response(null, { status: 204 }); } };
  vm.runInNewContext(buildPublicReadingWorker("a".repeat(40), { anonKey: "public-fixture", gaId: "G-TEST12345" }), context);
  return { calls, async send(url, method = "POST") {
    let response = null;
    listeners.fetch({ request: new Request(url, { method }), clientId: "window-1", respondWith: value => { response = Promise.resolve(value); } });
    return response ? (await response).status : "passthrough";
  } };
}

test("the real gtag page_view collect request on the GA4 host is admitted unchanged", async () => {
  const w = worker();
  assert.equal(await w.send(collectUrl("https://www.google-analytics.com")), 204);
  assert.equal(w.calls.length, 1);
});

test("the real gtag secondary beacons and non-GA4 collection hosts stay denied", async () => {
  for (const origin of ["https://www.google.com", "https://analytics.google.com", "https://stats.g.doubleclick.net"]) {
    const w = worker();
    assert.equal(await w.send(collectUrl(origin, origin === "https://www.google.com" ? { gaf: "1" } : {})), 403, origin);
    assert.equal(w.calls.length, 0, origin);
  }
});

test("the SDK loader itself is not intercepted, while custom event params and identity keys remain denied", async () => {
  const w = worker();
  assert.equal(await w.send("https://www.googletagmanager.com/gtag/js?id=G-TEST12345", "GET"), "passthrough");
  assert.equal(await w.send("https://www.googletagmanager.com/gtag/destination?id=G-TEST12345&l=dataLayer", "GET"), "passthrough");
  for (const extra of [{ "ep.page_path": "/x" }, { uid: "u" }, { user_id: "u" }, { "up.plan": "x" }, { dr: "https://elsewhere.invalid/" }, { en: "purchase" }]) {
    const denied = worker();
    assert.equal(await denied.send(collectUrl("https://www.google-analytics.com", extra)), 403, JSON.stringify(extra));
    assert.equal(denied.calls.length, 0);
  }
});
