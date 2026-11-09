// Public reading worker: exact admission of first-party visit (track_visit) and page engagement
// (ingest_event surface=page). All identities and responses are synthetic; no request reaches network.
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { buildPublicReadingWorker } from "../public-reading-deploy/transport.js";
import { readingVisitBody, readingEngagementBody } from "../src/lib/publicReadingTelemetry2029.js";

const SITE = "https://sod1820.co.il";
const API = "https://linswmnnkjxvweumprav.supabase.co";
const ANON = "synthetic-public-anon-key";
const sha = "a".repeat(40);

function harness({ origin = SITE, anonKey = ANON, clientUrl = SITE + "/post/some-slug" } = {}) {
  const listeners = {}, calls = [];
  vm.runInNewContext(buildPublicReadingWorker(sha, { anonKey }), { self: { location: { origin }, skipWaiting() {},
    clients: { claim: () => Promise.resolve(), get: async id => id === "window" ? { type: "window", url: clientUrl } : undefined },
    addEventListener: (name, handler) => { listeners[name] = handler; } },
    URL, Response, Request, Set, Map, JSON, fetch: async (...args) => { calls.push(args); return new Response("{}", { status: 200 }); } });
  return { calls, async post(path, body, { clientId = "window", headers = {} } = {}) {
    let pending;
    const request = new Request(API + path, { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) });
    Object.defineProperty(request, "destination", { value: "" });
    listeners.fetch({ request, clientId, respondWith(value) { pending = value; } });
    return pending ? await pending : null;
  } };
}

const visit = { p_path: "/post/:item", p_referrer: "www.google.com", p_visitor: "7b160de1-ff4c-4da2-a00a-421ed39a4996", p_device: "mobile", p_is_bot: false };
const engagement = { p_sod_id: null, p_surface: "page", p_event_type: "engagement", p_path: "/post/:item", p_session_id: null,
  p_app_context: "chrome", p_is_bot: false,
  p_props: { visible_ms: 12000, engaged_ms: 9000, max_scroll_pct: 64, flush_reason: "route_change", engagement_version: 1, idle_threshold_ms: 20000 } };

test("validators accept exactly the emitted shapes", () => {
  assert.equal(readingVisitBody(visit), true);
  assert.equal(readingVisitBody({ ...visit, p_referrer: null, p_visitor: null, p_device: null, p_is_bot: true }), true);
  assert.equal(readingEngagementBody(engagement), true);
  assert.equal(readingEngagementBody({ ...engagement, p_props: { ...engagement.p_props, flush_reason: "pagehide" } }), true);
});

test("visit is forwarded once with only the public anon key, bound to the sending window's normalized route", async () => {
  const h = harness();
  const response = await h.post("/rest/v1/rpc/track_visit", visit, { headers: { apikey: ANON, Authorization: "Bearer member-session-token" } });
  assert.equal(response.status, 200);
  assert.equal(h.calls.length, 1);
  const forwarded = h.calls[0][0];
  assert.equal(new URL(forwarded.url).pathname, "/rest/v1/rpc/track_visit");
  assert.equal(forwarded.headers.get("authorization"), "Bearer " + ANON);
  assert.equal(forwarded.credentials, "omit");
  assert.deepEqual(JSON.parse(await forwarded.text()), visit);
});

test("visit rejects raw slugs, extra fields, identity-like values, a query, a mismatched window or a non-public origin", async () => {
  const invalid = [{ ...visit, p_path: "/post/some-slug" }, { ...visit, p_path: "/post/:item?x=1" }, { ...visit, extra: 1 },
    { ...visit, p_visitor: "person@example.invalid" }, { ...visit, p_referrer: "https://evil.invalid/path" }, { ...visit, p_device: "tv" },
    { ...visit, p_is_bot: "false" }, { ...visit, p_path: "/me" }];
  for (const body of invalid) assert.equal(readingVisitBody(body), false, JSON.stringify(body));
  const h = harness();
  for (const body of invalid) assert.equal((await h.post("/rest/v1/rpc/track_visit", body)).status, 403, JSON.stringify(body));
  assert.equal((await h.post("/rest/v1/rpc/track_visit?select=*", visit)).status, 403);
  assert.equal((await h.post("/rest/v1/rpc/track_visit", visit, { clientId: "" })).status, 403);
  assert.equal((await harness({ clientUrl: SITE + "/gallery" }).post("/rest/v1/rpc/track_visit", visit)).status, 403);
  assert.equal((await harness({ origin: "https://sod1820-abc-sod1820-s-projects.vercel.app" }).post("/rest/v1/rpc/track_visit", visit)).status, 403);
  assert.equal((await harness({ anonKey: "" }).post("/rest/v1/rpc/track_visit", visit)).status, 403);
  assert.equal(h.calls.length, 0);
});

test("engagement is forwarded from a public window (route change or pagehide beacon) with only the anon key", async () => {
  const h = harness({ clientUrl: SITE + "/gallery" });
  assert.equal((await h.post("/rest/v1/rpc/ingest_event", engagement)).status, 200);
  const beacon = { ...engagement, p_props: { ...engagement.p_props, flush_reason: "pagehide" } };
  assert.equal((await h.post("/rest/v1/rpc/ingest_event?apikey=" + ANON, beacon)).status, 200);
  assert.equal(h.calls.length, 2);
  for (const [forwarded] of h.calls) assert.equal(forwarded.headers.get("authorization"), "Bearer " + ANON);
});

test("engagement rejects identity, generic events, out-of-range counters, foreign keys in the address and non-public origins", async () => {
  const p = engagement.p_props;
  const invalid = [{ ...engagement, p_sod_id: "visitor-id" }, { ...engagement, p_session_id: "7b160de1-ff4c-4da2-a00a-421ed39a4996" },
    { ...engagement, p_event_type: "view" }, { ...engagement, p_is_bot: true }, { ...engagement, p_path: "/post/raw-slug" },
    { ...engagement, p_app_context: "custom" }, { ...engagement, p_props: { ...p, email: "x@example.invalid" } },
    { ...engagement, p_props: { ...p, engaged_ms: p.visible_ms + 1 } }, { ...engagement, p_props: { ...p, max_scroll_pct: 101 } },
    { ...engagement, p_props: { ...p, flush_reason: "timer" } }, { ...engagement, p_props: { ...p, engagement_version: 2 } }];
  for (const body of invalid) assert.equal(readingEngagementBody(body), false, JSON.stringify(body));
  const h = harness();
  for (const body of invalid) assert.equal((await h.post("/rest/v1/rpc/ingest_event", body)).status, 403, JSON.stringify(body));
  assert.equal((await h.post("/rest/v1/rpc/ingest_event?apikey=other-key", engagement)).status, 403);
  assert.equal((await h.post("/rest/v1/rpc/ingest_event?apikey=" + ANON + "&select=*", engagement)).status, 403);
  assert.equal((await h.post("/rest/v1/rpc/ingest_event", engagement, { clientId: "" })).status, 403);
  assert.equal((await harness({ origin: "https://sod1820-abc-sod1820-s-projects.vercel.app" }).post("/rest/v1/rpc/ingest_event", engagement)).status, 403);
  assert.equal(h.calls.length, 0);
});

test("the anon-key address never opens other ingest_event surfaces", async () => {
  const h = harness();
  const report = { p_sod_id: null, p_surface: "issue_report", p_event_type: "issue_report", p_path: "/post", p_props: { message: "synthetic" }, p_is_bot: false };
  assert.equal((await h.post("/rest/v1/rpc/ingest_event?apikey=" + ANON, report)).status, 403);
  assert.equal(h.calls.length, 0);
  // The existing explicit report path is unchanged (no address key, no anon rewrite).
  assert.equal((await h.post("/rest/v1/rpc/ingest_event", report)).status, 200);
  assert.equal(h.calls.length, 1);
});
