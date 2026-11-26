// Video measurement (video_2029) on the one public measurement path: same family list, same emitter, same intake as story_2029.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { readingActionSpec, readingActionProps, readingActionBody, readingTelemetryPath } from "../src/lib/publicReadingTelemetry2029.js";
import { readingVideoSpec, registerVideoSpec2029 } from "../src/lib/publicReadingVideoSpec2029.js";
import { readingStorySpec, registerStorySpec2029 } from "../src/lib/publicReadingStorySpec2029.js";
import { registerMeasurementFamilies2029 } from "../src/lib/measurementFamilies2029.js";
import { buildPublicReadingWorker } from "../public-reading-deploy/transport.js";

const body = (eventType, props) => ({ p_sod_id: null, p_session_id: null, p_is_bot: false, p_path: "/community/chat", p_app_context: "chrome",
  p_surface: "video_2029", p_event_type: eventType, p_props: { action_version: 1, ...props } });
const withSpec = (fn) => { const before = globalThis.sodSpecs; try { registerVideoSpec2029(globalThis); return fn(); } finally {
  if (before === undefined) delete globalThis.sodSpecs; else globalThis.sodSpecs = before; } };

test("the video entry is not in the code every page loads: absent until the player registers it", () => {
  assert.equal(readingActionSpec().video_2029, undefined);
  assert.equal(readingActionProps("video_2029", "play_requested", { provider: "youtube" }), null);
  withSpec(() => assert.deepEqual(readingActionSpec().video_2029, readingVideoSpec().video_2029));
  assert.equal(readingActionSpec().video_2029, undefined);
  for (const family of ["calculator_2029", "entry_2029", "els", "activity_2029", "content"]) assert.ok(readingActionSpec()[family], `${family} unchanged`);
});

test("only provider, error code and whole seconds leave the browser: no video id, title, link or text", () => withSpec(() => {
  const props = readingActionProps("video_2029", "embed_refused", { provider: "youtube", code: 150, wait_s: 3, video_id: "abc", title: "כותרת", href: "https://x", text: "t" });
  assert.deepEqual(props, { action_version: 1, provider: "youtube", code: 150, wait_s: 3 });
  assert.equal(readingActionBody(body("embed_refused", { provider: "youtube", video_id: "abc" })), false, "an extra field is refused");
  assert.equal(readingActionBody(body("embed_refused", { provider: "bad provider!" })), false, "a provider must be a token");
  assert.equal(readingActionBody(body("page_view", { provider: "youtube" })), false, "an event outside the family is refused");
  for (const type of ["play_requested", "player_ready", "embed_refused", "watch_opened"]) assert.equal(readingActionBody(body(type, { provider: "vimeo" })), true, type);
}));

test("no event is named view or open (live readers count those names on every surface)", () => {
  for (const t of readingVideoSpec().video_2029.events) assert.ok(!["view", "open"].includes(t), t);
});

test("the entry joins without replacing story_2029 or a built-in family, in either order", () => {
  const before = globalThis.sodSpecs; try {
    delete globalThis.sodSpecs;
    registerVideoSpec2029(); registerStorySpec2029();
    assert.deepEqual(readingActionSpec().story_2029, readingStorySpec().story_2029);
    assert.deepEqual(readingActionSpec().video_2029, readingVideoSpec().video_2029);
    assert.deepEqual(registerMeasurementFamilies2029({ calculator_2029: { events: ["x"], fields: {} } }).length, 0, "an on-demand family cannot replace a built-in (built-ins are written after the spread)");
    assert.notDeepEqual(readingActionSpec().calculator_2029.events, ["x"]);
  } finally { if (before === undefined) delete globalThis.sodSpecs; else globalThis.sodSpecs = before; }
});

test("the request worker carries the same entry from build time", () => {
  const worker = buildPublicReadingWorker("a".repeat(40));
  assert.match(worker, /function readingVideoSpec\(\)/);
  assert.match(worker, /registerMeasurementFamilies2029\(readingVideoSpec\(\)\);/);
  const sandbox = { globalThis: {}, result: null }; sandbox.globalThis = sandbox;
  vm.runInNewContext(`${registerMeasurementFamilies2029}\n${readingVideoSpec}\nregisterMeasurementFamilies2029(readingVideoSpec());\nresult = JSON.stringify(sodSpecs.video_2029);`, sandbox);
  assert.deepEqual(JSON.parse(sandbox.result), readingVideoSpec().video_2029, "the same entry as the client");
});

test("the player measures lazily and never blocks: dynamic import, fire-and-forget, only provider/code/seconds", () => {
  const src = readFileSync(new URL("../src/components/experience2029/ExternalVideoFacade2029.jsx", import.meta.url), "utf8");
  assert.match(src, /import\("\.\.\/\.\.\/lib\/videoMeasurement2029\.js"\)/);
  assert.doesNotMatch(src, /^import .*videoMeasurement2029/m, "never a static import (shell budget)");
  for (const type of ["play_requested", "player_ready", "embed_refused", "watch_opened"]) assert.ok(src.includes(`measure("${type}"`), type);
  assert.doesNotMatch(src, /measure\([^)]*(link\.id|link\.href|title)/, "no video id, link or title is measured");
  const mod = readFileSync(new URL("../src/lib/videoMeasurement2029.js", import.meta.url), "utf8");
  assert.match(mod, /PROVIDERS = new Set\(\["youtube", "vimeo"\]\)/);
});

test("the exact database entry text (the consolidated ingest_event package carries this literal)", () => {
  const v = readingVideoSpec().video_2029;
  assert.equal(`"video_2029":{"events":${JSON.stringify(v.events)},"fields":${JSON.stringify(v.fields)}}`,
    '"video_2029":{"events":["play_requested","player_ready","embed_refused","watch_opened"],"fields":{"provider":"token","code":"int","wait_s":"int"}}');
});
