// Public 2029 measurement of product actions and content views (ZURIEL 12.11.2026 "fix measurement").
// The existing emit()/track()/logView() calls are measured through one bounded family: no visitor/session identity, the normalized
// route label, a fixed event list and fixed bounded fields per surface. Free text (expressions, phrases, slugs, values, share ids)
// never leaves the browser. All identities and responses are synthetic; no request reaches the network.
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { buildPublicReadingWorker } from "../public-reading-deploy/transport.js";
import { readingActionSpec, readingActionProps, readingActionBody, readingEngagementBody, readingWebVitalBody } from "../src/lib/publicReadingTelemetry2029.js";

const SITE = "https://sod1820.co.il";
const API = "https://linswmnnkjxvweumprav.supabase.co";
const ANON = "synthetic-public-anon-key";
const sha = "a".repeat(40);

function harness({ origin = SITE, anonKey = ANON, clientUrl = SITE + "/gematria" } = {}) {
  const listeners = {}, calls = [];
  vm.runInNewContext(buildPublicReadingWorker(sha, { anonKey }), { self: { location: { origin }, skipWaiting() {},
    clients: { claim: () => Promise.resolve(), get: async id => id.startsWith("window") ? { type: "window", url: clientUrl } : undefined },
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

const action = (surface, eventType, props, path = "/gematria") => ({ p_sod_id: null, p_surface: surface, p_event_type: eventType, p_path: path,
  p_session_id: null, p_app_context: "chrome", p_is_bot: false, p_props: readingActionProps(surface, eventType, props) });

test("the projection keeps only bounded fields and drops everything the visitor typed", () => {
  assert.deepEqual(readingActionProps("calculator_2029", "raziel_opened", { surface: "professional", expression: "משה רבנו", method: "Ragil", value: 345, share_id: "abc" }),
    { action_version: 1, surface: "professional", method: "ragil" });
  assert.deepEqual(readingActionProps("share", "share", { platform: "whatsapp", image_url: "https://x/y.png", page: "/post/raw-slug" }), { action_version: 1, platform: "whatsapp" });
  assert.deepEqual(readingActionProps("content", "view", { kind: "post", item_id: "5107", slug: "raw-slug" }), { action_version: 1, kind: "post", item_id: 5107 });
  assert.deepEqual(readingActionProps("arrival", "source", { source: "instagram", tag: "fb-meluha", tagged: true, landing: "post/raw" }),
    { action_version: 1, source: "instagram", tag: "fb-meluha", tagged: true });
  // free text that looks like a token is still refused when it is not a token (spaces, Hebrew, too long)
  assert.deepEqual(readingActionProps("calculator_2029", "first_compute", { method: "שם פרטי", surface: "x".repeat(49) }), { action_version: 1 });
  // unknown surfaces and events stay local
  assert.equal(readingActionProps("campaign_landing", "view", {}), null);
  assert.equal(readingActionProps("page", "view", {}), null);
  assert.equal(readingActionProps("share", "open", {}), null);
  assert.equal(readingActionProps("runtime_error", "window_error", { message: "x" }), null);
});

test("the validator accepts exactly the projected shapes and refuses identity, raw paths and free fields", () => {
  for (const [s, e, p] of [["calculator_2029", "first_compute", { surface: "classic", method: "ragil" }], ["share", "share", { platform: "copy" }],
    ["join", "click", { surface: "footer" }], ["arrival", "source", { source: "direct", tagged: false }], ["content", "view", { kind: "post", item_id: 12 }],
    ["entry_2029", "orientation_shown", { entry_surface: "post", step_index: 2 }], ["journey_2029", "path_saved", { journey_kind: "name", has_path: true }]])
    assert.equal(readingActionBody(action(s, e, p)), true, `${s}/${e}`);
  const ok = action("share", "share", { platform: "copy" });
  const invalid = [{ ...ok, p_sod_id: "visitor-id" }, { ...ok, p_session_id: "7b160de1-ff4c-4da2-a00a-421ed39a4996" }, { ...ok, p_is_bot: true },
    { ...ok, p_path: "/post/raw-slug" }, { ...ok, p_path: "/gematria?q=משה" }, { ...ok, p_app_context: "custom" },
    { ...ok, p_props: { ...ok.p_props, expression: "x" } }, { ...ok, p_props: { ...ok.p_props, platform: "Copy Link" } },
    { ...ok, p_props: { platform: "copy" } }, { ...ok, p_surface: "visitor_events" }, { ...ok, p_event_type: "search" },
    { ...ok, extra: 1 }, { ...action("content", "view", { kind: "post", item_id: 3 }), p_props: { action_version: 1, kind: "post", item_id: -1 } }];
  for (const body of invalid) assert.equal(readingActionBody(body), false, JSON.stringify(body));
  // the families are disjoint from the existing RUM and engagement families
  assert.equal(readingEngagementBody(ok), false);
  assert.equal(readingWebVitalBody(ok), false);
  assert.ok(!Object.keys(readingActionSpec()).some(s => ["page", "performance", "issue_report"].includes(s)));
});

test("the worker forwards an action once with only the anon key, from a window of the public site", async () => {
  const h = harness();
  const body = action("calculator_2029", "first_compute", { surface: "classic", method: "ragil" });
  const response = await h.post("/rest/v1/rpc/ingest_event", body, { headers: { authorization: "Bearer account-jwt", apikey: "account-key" } });
  assert.equal(response.status, 200);
  assert.equal(h.calls.length, 1);
  const forwarded = h.calls[0][0];
  assert.equal(forwarded.headers.get("apikey"), ANON);
  assert.equal(forwarded.headers.get("authorization"), "Bearer " + ANON);
  assert.deepEqual(JSON.parse(await forwarded.text()), body);
});

// An action after an in-app navigation: the window was created on a post and the visitor moved to the calculator in the app.
// Client.url still says the post, so binding the action to it refused every such action (found 13.11.2026).
test("the worker forwards an action from a window that was opened on another route", async () => {
  const body = action("calculator_2029", "first_compute", { surface: "classic" });
  const h = harness({ clientUrl: SITE + "/post/some-slug" });
  assert.equal((await h.post("/rest/v1/rpc/ingest_event", body)).status, 200);
  assert.equal(h.calls.length, 1);
});

test("the worker refuses a window of another origin, a non-public origin, the beacon address and free fields", async () => {
  const body = action("calculator_2029", "first_compute", { surface: "classic" });
  assert.equal((await harness({ clientUrl: "https://other-site.invalid/gematria" }).post("/rest/v1/rpc/ingest_event", body)).status, 403);
  assert.equal((await harness({ origin: "https://sod1820-abc-sod1820-s-projects.vercel.app" }).post("/rest/v1/rpc/ingest_event", body)).status, 403);
  const h = harness();
  assert.equal((await h.post("/rest/v1/rpc/ingest_event?apikey=" + ANON, body)).status, 403);
  assert.equal((await h.post("/rest/v1/rpc/ingest_event", { ...body, p_props: { ...body.p_props, expression: "משה" } })).status, 403);
  assert.equal((await h.post("/rest/v1/rpc/ingest_event", { ...body, p_sod_id: "visitor" })).status, 403);
  assert.equal((await h.post("/rest/v1/rpc/ingest_event", body, { clientId: "" })).status, 403);
  assert.equal(h.calls.length, 0);
});

test("the worker caps actions at 60 per window per 10 minutes", async () => {
  const h = harness();
  const body = action("share", "share", { platform: "copy" });
  let accepted = 0;
  for (let i = 0; i < 70; i++) if ((await h.post("/rest/v1/rpc/ingest_event", body)).status === 200) accepted++;
  assert.equal(accepted, 60);
  assert.equal((await h.post("/rest/v1/rpc/ingest_event", body, { clientId: "window-2" })).status, 200, "another window has its own budget");
});

test("client wiring: emit, track, share, join, arrival and post views use the public family; identity sinks stay closed", () => {
  const events = readFileSync(new URL("../src/lib/events.js", import.meta.url), "utf8");
  const tracking = readFileSync(new URL("../src/lib/tracking.js", import.meta.url), "utf8");
  const visits = readFileSync(new URL("../src/lib/visits.js", import.meta.url), "utf8");
  const supabase = readFileSync(new URL("../src/lib/supabase.js", import.meta.url), "utf8");
  const post = readFileSync(new URL("../src/pages/Post2029Page.jsx", import.meta.url), "utf8");
  assert.match(events, /if \(PUBLIC_READING_RELEASE\) \{ emitPublicReadingAction\(surface, eventType, opts\); return; \}/);
  const publicEmitter = events.slice(events.indexOf("function emitPublicReadingAction"), events.indexOf("const ARRIVAL_SOURCES"));
  assert.match(publicEmitter, /p_sod_id: null/); assert.match(publicEmitter, /p_session_id: null/);
  assert.match(publicEmitter, /readingActionBody\(body\)/); assert.match(publicEmitter, /isBot\(\)/);
  assert.doesNotMatch(publicEmitter, /getSodId|sessionId\(\)|utm\(\)|refHost\(\)/);
  const trackBody = tracking.slice(tracking.indexOf("export function track("), tracking.indexOf("// שיתוף"));
  assert.match(trackBody, /return trackPublicReading\(section, eventType, meta\);/);
  assert.match(tracking, /function trackPublicReading\(section, eventType, meta\) \{\n  try \{ emit\(section, eventType, \{ props: meta \|\| null \}\); \}/);
  assert.ok(trackBody.indexOf('from("visitor_events")') > trackBody.indexOf("if (PUBLIC_READING_RELEASE)"), "visitor_events stays after the public branch");
  assert.match(tracking, /if \(PUBLIC_READING_RELEASE\) return track\("share", null, "share", \{ platform \}\);/);
  assert.match(tracking, /if \(PUBLIC_READING_RELEASE\) return track\("join", null, "click", \{ surface: surface \|\| null \}\);/);
  assert.match(visits, /if \(firstHit\) \{ try \{ emitPublicArrivalOnce\(\); \}/);
  assert.match(post, /logView\("post", post\.slug, post\.id\)/);
  const logView = supabase.slice(supabase.indexOf("export async function logView"), supabase.indexOf("// 🔎 ספירת חיפושים כוללת"));
  assert.match(logView, /m\.emit\("content", "view", \{ props: \{ kind, item_id: Number\(publicItemId\) \} \}\)/);
  assert.doesNotMatch(logView.slice(logView.indexOf("PUBLIC_READING_RELEASE &&"), logView.indexOf("if (PUBLIC_READING_RELEASE) return;")), /slug|ref\b/);
});
