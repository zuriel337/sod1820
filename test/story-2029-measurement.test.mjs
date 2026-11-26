// Traffic Intelligence v12 (ZURIEL 24.11.2026): the story_2029 family on the one public measurement path.
// One family list (readingActionSpec), one emitter (events.js emit), one intake (ingest_event); the story entry loads on demand.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import vm from "node:vm";
import { readingActionSpec, readingActionProps, readingActionBody, readingMeasurementBody, readingTelemetryPath }
  from "../src/lib/publicReadingTelemetry2029.js";
import { readingStorySpec, registerStorySpec2029 } from "../src/lib/publicReadingStorySpec2029.js";
import { registerMeasurementFamilies2029 } from "../src/lib/measurementFamilies2029.js";
import { buildPublicReadingWorker } from "../public-reading-deploy/transport.js";

const ITEM = "1e777c07-fb3b-446b-bd60-91a5bb94bd77";
const anonymousBody = (eventType, props) => ({ p_sod_id: null, p_session_id: null, p_is_bot: false, p_path: "/community/chat",
  p_app_context: "chrome", p_surface: "story_2029", p_event_type: eventType, p_props: { action_version: 1, ...props } });
const withSpec = (fn) => { const before = globalThis.sodSpecs; try { registerStorySpec2029(globalThis); return fn(); } finally {
  if (before === undefined) delete globalThis.sodSpecs; else globalThis.sodSpecs = before; } };

test("the story entry is not part of the code every page loads: absent until the story surface registers it", () => {
  assert.equal(readingActionSpec().story_2029, undefined);
  assert.equal(readingActionProps("story_2029", "item_view", { item_ref: ITEM }), null, "not measured before the story surface loads");
  assert.equal(readingActionBody(anonymousBody("item_view", { item_ref: ITEM })), false);
  withSpec(() => assert.deepEqual(readingActionSpec().story_2029, readingStorySpec().story_2029));
  assert.equal(readingActionSpec().story_2029, undefined, "registration is scoped to the loaded surface");
  for (const family of ["calculator_2029", "entry_2029", "journey_2029", "share", "join", "arrival", "content", "els", "activity_2029"])
    assert.ok(readingActionSpec()[family], `${family} unchanged`);
});

test("only the bounded story fields leave the browser: no title, caption, text or account", () => withSpec(() => {
  const props = readingActionProps("story_2029", "item_view", { content_world: "or_geula", entry_surface: "chat", item_ref: ITEM, index: 2,
    dwell_ms: 4200, title: "כותרת", caption: "כיתוב", text: "טקסט", account_id: "x", email: "a@b.c" });
  assert.deepEqual(props, { action_version: 1, content_world: "or_geula", entry_surface: "chat", item_ref: ITEM, index: 2, dwell_ms: 4200 });
  assert.equal(readingActionProps("story_2029", "page_view", {}), null, "an event outside the family is refused");
  assert.equal(readingActionBody(anonymousBody("item_view", { item_ref: ITEM, title: "x" })), false, "an extra field is refused");
  for (const type of ["impression", "viewer_open", "item_view", "next", "prev", "close", "complete"])
    assert.equal(readingActionBody(anonymousBody(type, { entry_surface: "or_geula", item_ref: ITEM })), true, type);
}));

// Live readers (fn_human_entrances, fn_ti_session_metrics, admin_funnel, admin_growth_center; read 24.11.2026) count event_type
// 'view' and 'open' on every surface. A story event with one of those names would inflate views and interactions, so none has one.
const SESSION_READER_EVENT_TYPES = ["view", "open", "search", "cross_search", "use", "save", "journey", "add", "engagement", "source"];
test("no double count: no story event shares a name that live session readers count on every surface", () => {
  const events = readingStorySpec().story_2029.events;
  for (const type of SESSION_READER_EVENT_TYPES) assert.ok(!events.includes(type), type);
  assert.deepEqual(events, ["impression", "viewer_open", "item_view", "next", "prev", "close", "complete"]);
  assert.equal(withSpec(() => readingActionBody(anonymousBody("view", { item_ref: ITEM }))), false, "a story event named view is refused");
  assert.equal(withSpec(() => readingActionBody(anonymousBody("open", { item_ref: ITEM }))), false, "a story event named open is refused");
});

test("story view != page view: a story event can never pass as surface=page", () => withSpec(() => {
  const page = { ...anonymousBody("view", {}), p_surface: "page" };
  assert.equal(readingActionBody(page), false);
  const measured = { p_sod_id: null, p_session_id: "s1234567", p_is_bot: false, p_path: "/community/chat", p_app_context: "chrome",
    p_surface: "page", p_event_type: "view",
    p_props: { item_ref: ITEM, measurement: { version: 2, visitor_id: "v1234567", page_path: "/community/chat" } } };
  assert.equal(readingMeasurementBody(measured), false, "a page view carries no story fields");
  assert.equal(readingTelemetryPath("/community/chat"), "/community/chat", "the story lives on its page; it adds no route");
}));

test("one list in three places: page, request worker and ingest_event carry the same story entry", () => {
  const worker = buildPublicReadingWorker("a".repeat(40));
  assert.match(worker, /function readingStorySpec\(\)/);
  assert.match(worker, /function registerMeasurementFamilies2029\(/);
  assert.match(worker, /registerMeasurementFamilies2029\(readingStorySpec\(\)\);/);
  assert.doesNotMatch(worker, /globalThis\.sodSpecs = /, "the worker never assigns the map wholesale");
  const sandbox = { body: anonymousBody("item_view", { item_ref: ITEM, entry_surface: "chat" }) };
  vm.runInNewContext(`${registerMeasurementFamilies2029}\n${readingStorySpec}\nregisterMeasurementFamilies2029(readingStorySpec());\n${readingTelemetryPath}\n${readingActionSpec}\n${readingActionBody}\nresult = readingActionBody(body);`, sandbox);
  assert.equal(sandbox.result, true, "the worker admits the story family from build time");
  const sql = readFileSync(new URL("../supabase/migrations/20261124190000_traffic_intelligence_v12_story_2029.sql", import.meta.url), "utf8");
  const entry = /v_spec jsonb := '\{"story_2029":(\{.*?\}\}),"calculator_2029":/.exec(sql);
  assert.ok(entry, "the migration adds story_2029 to ingest_event v_spec");
  assert.deepEqual(JSON.parse(entry[1]), readingStorySpec().story_2029, "the same entry as the client");
});

test("the projection simplification keeps every route label identical", () => {
  for (const [path, label] of [["/", "/"], ["/world", "/world"], ["/or-geula", "/or-geula"], ["/books", "/books"], ["/contact", "/contact"],
    ["/privacy", "/privacy"], ["/map", "/map"], ["/gallery", "/gallery"], ["/community", "/community"], ["/community/chat", "/community/chat"],
    ["/community/calculator", "/community/calculator"], ["/community/other", "/community/:item"], ["/World", "/world"], ["/me", null]])
    assert.equal(readingTelemetryPath(path), label, path);
});

// The worker budget (ZURIEL 24.11.2026): story_2029 counts on its own (30 per window per 10 minutes) and never draws on the 60 that
// saves, calculations and shares share. Both worker paths: the plain action body and the measurement-envelope body the emitter sends.
function workerHarness() {
  const listeners = {}, calls = [];
  vm.runInNewContext(buildPublicReadingWorker("a".repeat(40), { anonKey: "synthetic-public-anon-key" }), { self: { location: { origin: "https://sod1820.co.il" },
    skipWaiting() {}, clients: { claim: () => Promise.resolve(), get: async id => ({ type: "window", url: "https://sod1820.co.il/community/chat", id }) },
    addEventListener: (name, handler) => { listeners[name] = handler; } },
    URL, Response, Request, Set, Map, JSON, fetch: async (...args) => { calls.push(args); return new Response("{}", { status: 200 }); } });
  return async (body, clientId = "window-1") => {
    let pending;
    const request = new Request("https://linswmnnkjxvweumprav.supabase.co/rest/v1/rpc/ingest_event", { method: "POST", body: JSON.stringify(body) });
    Object.defineProperty(request, "destination", { value: "" });
    listeners.fetch({ request, clientId, respondWith(value) { pending = value; } });
    return (await pending).status;
  };
}
const plain = (surface, type, props) => ({ p_sod_id: null, p_session_id: null, p_is_bot: false, p_path: "/community/chat", p_app_context: "chrome",
  p_surface: surface, p_event_type: type, p_props: { action_version: 1, ...props } });
const measured = (surface, type, props) => ({ p_sod_id: null, p_session_id: "s1234567", p_is_bot: false, p_path: "/community/chat", p_app_context: "chrome",
  p_surface: surface, p_event_type: type, p_props: { action_version: 1, ...props, measurement: { version: 2, visitor_id: "v1234567", page_path: "/community/chat" } } });

for (const [name, make] of [["plain action body", plain], ["measurement envelope", measured]]) {
  test(`worker budget (${name}): 30 story events do not take any of the 60 shared by calculations, saves and shares`, async () => {
    const post = workerHarness();
    const story = make("story_2029", "item_view", { entry_surface: "chat", item_ref: ITEM });
    const share = make("share", "share", { platform: "copy" });
    let storyOk = 0, shareOk = 0;
    for (let i = 0; i < 40; i++) if (await post(story) === 200) storyOk++;
    assert.equal(storyOk, 30, "story stops at its own 30");
    for (let i = 0; i < 70; i++) if (await post(share) === 200) shareOk++;
    assert.equal(shareOk, 60, "the other families keep their full 60 after the story rail");
    assert.equal(await post(story, "window-2"), 200, "another window has its own story budget");
  });
}

// Family join without overwrite (ZURIEL 25.11.2026): page and request worker. A later on-demand family (for example runtime errors)
// joins next to story_2029; neither replaces the other, nor any built-in family.
const RUNTIME = { runtime_error_2029: { events: ["error"], fields: { code: "token", surface: "token" } } };
const withScope = (fn) => { const before = globalThis.sodSpecs; delete globalThis.sodSpecs;
  try { return fn(); } finally { if (before === undefined) delete globalThis.sodSpecs; else globalThis.sodSpecs = before; } };

test("page: a second on-demand family joins; it never replaces the first, and order does not matter", () => withScope(() => {
  assert.equal(registerStorySpec2029(), true);
  assert.deepEqual(registerMeasurementFamilies2029(RUNTIME), []);
  assert.deepEqual(readingActionSpec().story_2029, readingStorySpec().story_2029, "story unchanged after another family joined");
  assert.deepEqual(readingActionSpec().runtime_error_2029, RUNTIME.runtime_error_2029);
  delete globalThis.sodSpecs;
  registerMeasurementFamilies2029(RUNTIME); registerStorySpec2029();
  assert.deepEqual(readingActionSpec().story_2029, readingStorySpec().story_2029, "the other order gives the same list");
  assert.deepEqual(readingActionSpec().runtime_error_2029, RUNTIME.runtime_error_2029);
}));

test("page: a conflicting second definition of a family is refused and the first one stays; the same definition is a no-op", () => withScope(() => {
  registerStorySpec2029();
  const hostile = { story_2029: { events: ["view", "page_view"], fields: { title: "token", item_ref: "token" } } };
  assert.deepEqual(registerMeasurementFamilies2029(hostile), ["story_2029"]);
  assert.deepEqual(readingActionSpec().story_2029, readingStorySpec().story_2029);
  assert.equal(registerStorySpec2029(), true, "registering the same definition again is idempotent");
  assert.equal(readingActionProps("story_2029", "item_view", { item_ref: ITEM, title: "x" }).title, undefined, "the hostile field never became measurable");
}));

test("page: an on-demand family can never replace a built-in family", () => withScope(() => {
  const builtIn = readingActionSpec().calculator_2029;
  registerMeasurementFamilies2029({ calculator_2029: { events: ["anything"], fields: { expression: "token" } } });
  assert.deepEqual(readingActionSpec().calculator_2029, builtIn);
  assert.equal(readingActionProps("calculator_2029", "anything", { expression: "משה" }), null);
}));

test("page: a registered definition is frozen; a module loaded later cannot change its events or fields", () => withScope(() => {
  registerStorySpec2029();
  const entry = globalThis.sodSpecs.story_2029;
  assert.ok(Object.isFrozen(entry) && Object.isFrozen(entry.events) && Object.isFrozen(entry.fields));
  assert.throws(() => { "use strict"; entry.events.push("page_view"); });
  assert.throws(() => { "use strict"; entry.fields.title = "token"; });
  assert.deepEqual(readingActionSpec().story_2029, readingStorySpec().story_2029);
}));

test("page: malformed registrations are refused without touching the map", () => withScope(() => {
  assert.deepEqual(registerMeasurementFamilies2029({ "Bad Name": { events: [], fields: {} }, x: null, y_ok: { events: "view", fields: {} } }), ["Bad Name", "x", "y_ok"]);
  assert.deepEqual(Object.keys(globalThis.sodSpecs), []);
}));

test("request worker: the same join; a later family added in the worker never replaces story_2029 or a built-in", () => {
  const worker = buildPublicReadingWorker("a".repeat(40));
  const start = worker.indexOf("function registerMeasurementFamilies2029(");
  assert.ok(start >= 0 && worker.indexOf("registerMeasurementFamilies2029(readingStorySpec());") > start);
  const sandbox = { RUNTIME, ITEM };
  vm.runInNewContext(`${registerMeasurementFamilies2029}\n${readingStorySpec}\nregisterMeasurementFamilies2029(readingStorySpec());\n${readingActionSpec}
    refusedStory = registerMeasurementFamilies2029({ story_2029: { events: ["page_view"], fields: { title: "token" } } });
    refusedCalc = registerMeasurementFamilies2029({ calculator_2029: { events: ["x"], fields: {} } });
    added = registerMeasurementFamilies2029(RUNTIME);
    spec = readingActionSpec();`, sandbox);
  assert.deepEqual([...sandbox.refusedStory], ["story_2029"]);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.spec.story_2029)), readingStorySpec().story_2029);
  assert.deepEqual([...sandbox.added], []);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.spec.runtime_error_2029)), RUNTIME.runtime_error_2029);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.spec.calculator_2029)), JSON.parse(JSON.stringify(readingActionSpec().calculator_2029)), "built-in kept in the worker");
});

test("on demand only: the join module and the story entry are imported by no file of the code every page loads", () => {
  const importers = (name) => readdirSync(new URL("../src/", import.meta.url), { recursive: true })
    .filter((f) => /\.(m?js|jsx)$/.test(f) && new RegExp(`(?:from|import)\\s*\\(?\\s*["'][^"']*${name}(?:\\.js)?["']`).test(readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8")));
  assert.deepEqual(importers("measurementFamilies2029").sort(), ["lib/publicReadingStorySpec2029.js", "lib/publicReadingVideoSpec2029.js"], "only the on-demand family modules (story, video) import the join");
  assert.deepEqual(importers("publicReadingStorySpec2029").filter((f) => f !== "lib/publicReadingStorySpec2029.js"), [], "no page module imports the story entry yet");
});
