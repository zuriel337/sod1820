import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
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
  return { calls, async send(url, method = "POST", body = undefined) {
    let response = null;
    listeners.fetch({ request: new Request(url, { method, ...(body === undefined ? {} : { body, headers: { "Content-Type": "application/json" } }) }), clientId: "window-1", respondWith: value => { response = Promise.resolve(value); } });
    return response ? (await response).status : "passthrough";
  } };
}

// ZURIEL, 10.11.2026: no blocking of Google Analytics on the 2029 public site. Every request shape the real gtag.js sends (any host it uses, any event,
// any parameter) goes to the network untouched: the worker neither answers, rewrites nor denies it. (Before: only two hosts, five events, no
// parameters beyond a fixed set, exact page/title, no referrer; the secondary beacons and every other event were answered 403.)
test("the real gtag page_view collect request is not intercepted on any GA4 host", async () => {
  for (const origin of ["https://www.google-analytics.com", "https://region1.google-analytics.com", "https://www.google.com", "https://analytics.google.com", "https://stats.g.doubleclick.net"]) {
    for (const method of ["POST", "GET"]) {
      const w = worker();
      assert.equal(await w.send(collectUrl(origin, origin === "https://www.google.com" ? { gaf: "1" } : {}), method), "passthrough", origin + " " + method);
      assert.equal(w.calls.length, 0, "the worker does not fetch it: the browser sends it");
    }
  }
});

test("the SDK loader, enhanced events, custom parameters and identity keys are not blocked either", async () => {
  const w = worker();
  assert.equal(await w.send("https://www.googletagmanager.com/gtag/js?id=G-TEST12345", "GET"), "passthrough");
  assert.equal(await w.send("https://www.googletagmanager.com/gtag/destination?id=G-TEST12345&l=dataLayer", "GET"), "passthrough");
  for (const extra of [{ "ep.page_path": "/x" }, { uid: "u" }, { user_id: "u" }, { "up.plan": "x" }, { dr: "https://elsewhere.invalid/" }, { en: "purchase" }, { en: "scroll", "epn.percent_scrolled": "90" }, { en: "click" }, { tid: "G-OTHER" }]) {
    const open = worker();
    assert.equal(await open.send(collectUrl("https://www.google-analytics.com", extra)), "passthrough", JSON.stringify(extra));
    assert.equal(open.calls.length, 0);
  }
});

test("the exemption is exact: other cross-origin writes (arbitrary hosts, look-alike hosts, google.com search) remain denied", async () => {
  for (const url of ["https://www.google.com/search", "https://foreign.invalid/g/collect", "https://evilfacebook.com/tr", "https://facebook.com.evil.invalid/tr", "https://googlesyndication.com.evil.invalid/x", "http://www.facebook.com/tr"]) {
    const w = worker();
    assert.equal(await w.send(url), 403, url);
    assert.equal(w.calls.length, 0, url);
  }
});

test("the published CSP admits every host the real gtag.js transports use", () => {
  const config = JSON.parse(readFileSync(new URL("../public-reading-deploy/vercel.json", import.meta.url), "utf8"));
  const csp = config.headers.flatMap(rule => rule.headers).find(header => header.key === "Content-Security-Policy").value;
  const sources = csp.split(";").map(part => part.trim()).find(part => part.startsWith("connect-src ")).split(/\s+/).slice(1);
  const allowed = url => { const u = new URL(url); return sources.some(source => source === "'self'" ? u.origin === SITE : /^https:\/\/\*\./.test(source) ? u.protocol === "https:" && u.hostname.endsWith(source.slice(9)) : source === u.origin); };
  for (const url of ["https://www.google-analytics.com/g/collect", "https://region1.google-analytics.com/g/collect", "https://region2.google-analytics.com/g/collect", "https://www.google.com/g/collect",
    "https://www.google.com/ccm/collect", "https://analytics.google.com/g/collect", "https://stats.g.doubleclick.net/g/collect", "https://www.googletagmanager.com/td"]) assert.ok(allowed(url), "connect-src must admit " + url);
  assert.ok(!allowed("https://foreign.invalid/g/collect"), "and nothing arbitrary");
});

test("Meta Pixel and AdSense transports pass through the worker untouched (ZURIEL, 11.11.2026), with the published CSP admitting their hosts", async () => {
  const urls = ["https://www.facebook.com/tr/?id=1&ev=PageView", "https://connect.facebook.net/en_US/fbevents.js", "https://pagead2.googlesyndication.com/getconfig/abg_config?client=ca-pub-1",
    "https://pagead2.googlesyndication.com/pagead/ping?e=1", "https://googleads.g.doubleclick.net/pagead/ads", "https://ep1.adtrafficquality.google/getconfig/sodar", "https://ep2.adtrafficquality.google/sodar/x",
    "https://www.google.com/pagead/1p-user-list/1/", "https://adservice.google.co.il/adsid/integrator.js"];
  for (const url of urls) for (const method of ["GET", "POST"]) {
    const w = worker();
    assert.equal(await w.send(url, method), "passthrough", method + " " + url);
    assert.equal(w.calls.length, 0, "the worker neither answers nor forwards: " + url);
  }
  const config = JSON.parse(readFileSync(new URL("../public-reading-deploy/vercel.json", import.meta.url), "utf8"));
  const csp = config.headers.flatMap(rule => rule.headers).find(header => header.key === "Content-Security-Policy").value;
  const sources = csp.split(";").map(part => part.trim()).find(part => part.startsWith("connect-src ")).split(/\s+/).slice(1);
  const allowed = url => { const u = new URL(url); return sources.some(source => source === "'self'" ? u.origin === SITE : /^https:\/\/\*\./.test(source) ? u.protocol === "https:" && u.hostname.endsWith(source.slice(9)) : u.origin === source); };
  for (const url of urls.filter(url => !url.includes("fbevents.js") && !url.includes("integrator.js"))) assert.ok(allowed(url), "connect-src admits " + url);
  assert.ok(!allowed("https://facebook.com.evil.invalid/tr") && !allowed("https://foreign.invalid/x"), "and nothing arbitrary");
});

test("Meta Conversions API relay: only an anonymous, bounded, fixed-shape POST reaches the edge function (rebuilt without the page's session)", async () => {
  const capi = "https://linswmnnkjxvweumprav.supabase.co/functions/v1/meta-capi";
  const good = { event_name: "PageView", event_id: "11111111-1111-4111-8111-111111111111", event_source_url: SITE + "/world", fbp: "fb.1.1.1", custom_data: {} };
  const w = worker();
  assert.equal(await w.send(capi, "POST", JSON.stringify(good)), 204);
  assert.equal(w.calls.length, 1);
  assert.equal(w.calls[0].url, capi);
  assert.equal(w.calls[0].headers.get("apikey"), "public-fixture");
  assert.equal(w.calls[0].credentials, "omit");
  for (const [method, url, body, why] of [["GET", capi, undefined, "GET"], ["POST", capi + "?x=1", JSON.stringify(good), "query"], ["POST", capi, "not json", "not json"],
    ["POST", capi, JSON.stringify({ ...good, user_email: "a@b.c" }), "extra field"], ["POST", capi, JSON.stringify({ ...good, event_name: "" }), "empty event"],
    ["POST", capi, JSON.stringify({ ...good, event_name: "x".repeat(65) }), "long event"], ["POST", capi, JSON.stringify({ ...good, custom_data: [1] }), "custom_data array"],
    ["POST", capi, JSON.stringify({ ...good, custom_data: { pad: "x".repeat(9000) } }), "too large"]]) {
    const denied = worker();
    assert.equal(await denied.send(url, method, body), 403, why);
    assert.equal(denied.calls.length, 0, why);
  }
});
