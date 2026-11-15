// Adversarial review of the measurement admission in the public request worker (public-reading-deploy/transport.js):
// visits, engagement and product actions are bound to a window of the public site and to a per-window budget (13.11.2026).
// This file pins what that does and does not protect, so a change to it is a decision and not an accident:
//  - one window cannot spend another window's budget, and the three families do not share a budget;
//  - every budget map is bounded (500 live windows) and ages out (10 minutes), so a busy or hostile window cannot grow the worker;
//  - a window may write a measured route that is not the one it is on (the address the worker can see is only the one the document
//    was created with) - this is a documented residual risk, bounded by shape and budget, pinned here on purpose;
//  - hard-load Web Vitals keep the creation-address binding.
// All identities and responses are synthetic; no request reaches the network.
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { buildPublicReadingWorker } from "../public-reading-deploy/transport.js";
import { readingActionProps } from "../src/lib/publicReadingTelemetry2029.js";
import { buildWebVitalsSnapshot } from "../src/lib/webVitalsCore.js";

const SITE = "https://sod1820.co.il";
const API = "https://linswmnnkjxvweumprav.supabase.co";
const ANON = "synthetic-public-anon-key";
const sha = "a".repeat(40);
const RPC = "/rest/v1/rpc/";

function harness({ origin = SITE, clientUrl = SITE + "/gallery", clientType = "window" } = {}) {
  const listeners = {}, calls = [];
  let clock = 1_000_000;
  // The worker reads Date.now() for its budgets; the test moves time by hand.
  const FakeDate = class extends Date { static now() { return clock; } };
  vm.runInNewContext(buildPublicReadingWorker(sha, { anonKey: ANON }), { self: { location: { origin }, skipWaiting() {},
    clients: { claim: () => Promise.resolve(), get: async id => id.startsWith("window") ? { type: clientType, url: clientUrl } : undefined },
    addEventListener: (name, handler) => { listeners[name] = handler; } },
    URL, Response, Request, Set, Map, JSON, Date: FakeDate, fetch: async (...args) => { calls.push(args); return new Response("{}", { status: 200 }); } });
  return { calls, advance: ms => { clock += ms; }, async post(path, body, { clientId = "window", headers = {} } = {}) {
    let pending;
    const request = new Request(API + path, { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) });
    Object.defineProperty(request, "destination", { value: "" });
    listeners.fetch({ request, clientId, respondWith(value) { pending = value; } });
    return pending ? await pending : null;
  } };
}

const visit = (path = "/world") => ({ p_path: path, p_referrer: null, p_visitor: "7b160de1-ff4c-4da2-a00a-421ed39a4996", p_device: "desktop", p_is_bot: false });
const engagement = (path = "/world") => ({ p_sod_id: null, p_surface: "page", p_event_type: "engagement", p_path: path, p_session_id: null, p_app_context: "chrome", p_is_bot: false,
  p_props: { visible_ms: 12000, engaged_ms: 9000, max_scroll_pct: 64, flush_reason: "route_change", engagement_version: 1, idle_threshold_ms: 20000 } });
const action = (path = "/world") => ({ p_sod_id: null, p_surface: "share", p_event_type: "share", p_path: path, p_session_id: null, p_app_context: "chrome", p_is_bot: false,
  p_props: readingActionProps("share", "share", { platform: "copy" }) });
const FAMILIES = { visit: [RPC + "track_visit", visit, 120], engagement: [RPC + "ingest_event", engagement, 240], action: [RPC + "ingest_event", action, 60] };

async function spend(h, family, count, clientId) {
  const [path, make] = FAMILIES[family];
  let accepted = 0;
  for (let i = 0; i < count; i++) if ((await h.post(path, make(), { clientId })).status === 200) accepted++;
  return accepted;
}

for (const [family, [, , limit]] of Object.entries(FAMILIES)) {
  test(`${family}: ${limit} per window per 10 minutes, a fresh budget after 10 minutes, and another window is untouched`, async () => {
    const h = harness();
    assert.equal(await spend(h, family, limit + 20, "window-a"), limit);
    assert.equal(await spend(h, family, 1, "window-b"), 1, "window B is not affected by window A");
    h.advance(600001);
    assert.equal(await spend(h, family, 1, "window-a"), 1, "the budget of window A is renewed after 10 minutes");
  });
}

test("the three families have separate budgets inside one window: exhausting one never blocks another", async () => {
  const h = harness();
  assert.equal(await spend(h, "action", 70, "window-a"), 60);
  assert.equal(await spend(h, "visit", 1, "window-a"), 1);
  assert.equal(await spend(h, "engagement", 1, "window-a"), 1);
  assert.equal(await spend(h, "visit", 130, "window-a"), 119, "the visit budget is its own: 1 spent, 119 left");
  assert.equal(await spend(h, "engagement", 1, "window-a"), 1);
});

for (const [family, [path, make]] of Object.entries(FAMILIES)) {
  test(`${family}: the budget map is bounded at 500 live windows and ages out; a refused window does not grow it`, async () => {
    const h = harness();
    for (let i = 0; i < 500; i++) assert.equal((await h.post(path, make(), { clientId: `window-${i}` })).status, 200, `window ${i}`);
    assert.equal((await h.post(path, make(), { clientId: "window-500" })).status, 403, "the 501st live window is refused");
    assert.equal((await h.post(path, make(), { clientId: "window-501" })).status, 403);
    assert.equal((await h.post(path, make(), { clientId: "window-7" })).status, 200, "a window already admitted keeps its budget");
    h.advance(600001);
    assert.equal((await h.post(path, make(), { clientId: "window-500" })).status, 200, "after 10 minutes the old records are dropped and the new window is admitted");
  });
}

test("a worker restart starts every budget again (the budgets live in the worker's memory; documented residual risk)", async () => {
  const first = harness(), second = harness();
  assert.equal(await spend(first, "action", 70, "window-a"), 60);
  assert.equal(await spend(second, "action", 70, "window-a"), 60, "a new worker instance has an empty budget for the same window id");
});

test("residual risk, pinned: a window opened on one route may write another measured route, bounded by shape and budget", async () => {
  // The worker sees only the address a document was created with (Client.url), not the address after history.pushState,
  // so it cannot tell which measured route the visitor is on now. Shape (normalized label, no free text) and budget still apply.
  const h = harness({ clientUrl: SITE + "/gallery" });
  assert.equal((await h.post(RPC + "track_visit", visit("/world"))).status, 200);
  assert.equal((await h.post(RPC + "ingest_event", engagement("/post/:item"))).status, 200);
  assert.equal((await h.post(RPC + "ingest_event", action("/gematria"))).status, 200);
  for (const bad of ["/post/raw-slug", "/world?x=1", "/me", "//evil.invalid", "/2029/control"])
    assert.equal((await h.post(RPC + "track_visit", visit(bad))).status, 403, bad);
  assert.equal((await h.post(RPC + "track_visit", { ...visit(), p_visitor: "x" })).status, 403, "a visitor token must be 8-64 characters of [0-9a-z-]");
  assert.equal(h.calls.length, 3);
  for (const [forwarded] of h.calls) assert.equal(forwarded.headers.get("authorization"), "Bearer " + ANON);
});

test("a caller that is not a window of the public site is refused for all three families, and a refused request never spends a budget", async () => {
  for (const options of [{ clientType: "worker" }, { clientUrl: "https://other-site.invalid/world" }]) {
    const h = harness(options);
    for (const family of Object.keys(FAMILIES)) assert.equal(await spend(h, family, 3, "window-a"), 0, `${family} ${JSON.stringify(options)}`);
    assert.equal(h.calls.length, 0);
  }
  const h = harness();
  for (const family of Object.keys(FAMILIES)) assert.equal(await spend(h, family, 3, ""), 0, `${family} without a client id`);
  // invalid bodies are refused before the budget is touched
  for (let i = 0; i < 200; i++) assert.equal((await h.post(RPC + "track_visit", visit("/post/raw-slug"), { clientId: "window-a" })).status, 403);
  assert.equal(await spend(h, "visit", 120, "window-a"), 120, "the invalid requests did not spend the visit budget");
});

test("hard-load Web Vitals keep the creation-address binding: the route must be the address the document was created with", async () => {
  const vital = path => ({ p_sod_id: null, p_session_id: null, p_surface: "performance", p_event_type: "web_vital", p_path: path, p_app_context: "chrome", p_is_bot: false,
    p_props: { ...buildWebVitalsSnapshot(), sample_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", phase: "checkpoint", flush_reason: "15s_checkpoint",
      initial_path: path, current_path: path, collector: "performance_observer", measurement_scope: "document_navigation_hard_load_only", nav_type: "navigate", visibility_at_flush: "visible" } });
  const h = harness({ clientUrl: SITE + "/gallery" });
  assert.equal((await h.post(RPC + "ingest_event", vital("/world"))).status, 403, "a vital for a route the document was not created on is refused");
  assert.equal((await h.post(RPC + "ingest_event", vital("/gallery"))).status, 200);
});
