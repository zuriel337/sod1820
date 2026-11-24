// Traffic Intelligence v12 (ZURIEL 24.11.2026): the story_2029 family on the one public measurement path.
// One family list (readingActionSpec), one emitter (events.js emit), one intake (ingest_event); the story entry loads on demand.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { readingActionSpec, readingActionProps, readingActionBody, readingMeasurementBody, readingTelemetryPath }
  from "../src/lib/publicReadingTelemetry2029.js";
import { readingStorySpec, registerStorySpec2029 } from "../src/lib/publicReadingStorySpec2029.js";
import { buildPublicReadingWorker } from "../public-reading-deploy/transport.js";

const ITEM = "1e777c07-fb3b-446b-bd60-91a5bb94bd77";
const anonymousBody = (eventType, props) => ({ p_sod_id: null, p_session_id: null, p_is_bot: false, p_path: "/community/chat",
  p_app_context: "chrome", p_surface: "story_2029", p_event_type: eventType, p_props: { action_version: 1, ...props } });
const withSpec = (fn) => { const before = globalThis.sodSpecs; try { registerStorySpec2029(globalThis); return fn(); } finally {
  if (before === undefined) delete globalThis.sodSpecs; else globalThis.sodSpecs = before; } };

test("the story entry is not part of the code every page loads: absent until the story surface registers it", () => {
  assert.equal(readingActionSpec().story_2029, undefined);
  assert.equal(readingActionProps("story_2029", "view", { item_ref: ITEM }), null, "not measured before the story surface loads");
  assert.equal(readingActionBody(anonymousBody("view", { item_ref: ITEM })), false);
  withSpec(() => assert.deepEqual(readingActionSpec().story_2029, readingStorySpec().story_2029));
  assert.equal(readingActionSpec().story_2029, undefined, "registration is scoped to the loaded surface");
  for (const family of ["calculator_2029", "entry_2029", "journey_2029", "share", "join", "arrival", "content", "els", "activity_2029"])
    assert.ok(readingActionSpec()[family], `${family} unchanged`);
});

test("only the bounded story fields leave the browser: no title, caption, text or account", () => withSpec(() => {
  const props = readingActionProps("story_2029", "view", { content_world: "or_geula", entry_surface: "chat", item_ref: ITEM, index: 2,
    dwell_ms: 4200, title: "כותרת", caption: "כיתוב", text: "טקסט", account_id: "x", email: "a@b.c" });
  assert.deepEqual(props, { action_version: 1, content_world: "or_geula", entry_surface: "chat", item_ref: ITEM, index: 2, dwell_ms: 4200 });
  assert.equal(readingActionProps("story_2029", "page_view", {}), null, "an event outside the family is refused");
  assert.equal(readingActionBody(anonymousBody("view", { item_ref: ITEM, title: "x" })), false, "an extra field is refused");
  for (const type of ["impression", "open", "view", "next", "prev", "close", "complete"])
    assert.equal(readingActionBody(anonymousBody(type, { entry_surface: "or_geula", item_ref: ITEM })), true, type);
}));

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
  assert.match(worker, /globalThis\.sodSpecs = readingStorySpec;/);
  const sandbox = { body: anonymousBody("view", { item_ref: ITEM, entry_surface: "chat" }) };
  vm.runInNewContext(`${readingStorySpec}\nglobalThis.sodSpecs = readingStorySpec;\n${readingTelemetryPath}\n${readingActionSpec}\n${readingActionBody}\nresult = readingActionBody(body);`, sandbox);
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
