import test from "node:test";
import assert from "node:assert/strict";
import { createAnalyticsEmitterBoundary2029 } from "../src/lib/analyticsEmitterBoundary2029.js";
import { analyticsEmissionAllowed2029 } from "../src/lib/analyticsPolicy2029.js";
import { switchesFromFlags } from "../src/lib/runtimeSwitches2029.js";
import { cancelPageEngagementTracker2029 } from "../src/lib/engagementLifecycle2029.js";
import {
  attachRuntimeErrorReporter2029,
  prepareRuntimeErrorCapture2029,
  resetRuntimeErrorCollectorForTest2029,
  runtimeErrorCollectorState2029,
} from "../src/lib/runtimeErrorCollector2029.js";
import {
  attachTrackingEntryEmitter2029,
  resetTrackingEntryFacadeForTest2029,
  track,
  trackConversion,
  trackResearch,
  trackShare,
  trackSubscribe,
  trackingEntryFacadeState2029,
} from "../src/lib/trackingEntryFacade2029.js";

const settle = () => new Promise((resolve) => setImmediate(resolve));

test("fresh external landing preserves the Wave3 import-time acquisition snapshot", async () => {
  const previousStorage = globalThis.localStorage;
  const previousDocument = globalThis.document;
  try {
    globalThis.localStorage = { getItem: () => null };
    globalThis.document = { referrer: "https://www.google.com/search?q=sod1820" };
    const fresh = await import(`../src/lib/trackingEntryFacade2029.js?fresh=${Date.now()}`);
    assert.equal(fresh.isFreshSearchLanding(), true);

    globalThis.localStorage = { getItem: (key) => key === "sod_acq_first" ? "saved" : null };
    const returning = await import(`../src/lib/trackingEntryFacade2029.js?returning=${Date.now()}`);
    assert.equal(returning.isFreshSearchLanding(), false);

    globalThis.localStorage = { getItem: () => null };
    globalThis.document = { referrer: "https://sod1820.co.il/world" };
    const internal = await import(`../src/lib/trackingEntryFacade2029.js?internal=${Date.now()}`);
    assert.equal(internal.isFreshSearchLanding(), false);
  } finally {
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test("the boundary is cold while fx_analytics is loading or OFF, and Preview stays closed", () => {
  let imports = 0;
  createAnalyticsEmitterBoundary2029({ importer: async () => { imports += 1; return {}; } });
  assert.equal(imports, 0, "constructing the boundary must not request the emitter chunk");
  assert.equal(analyticsEmissionAllowed2029({ switchState: { loading: true, on: true } }), false);
  assert.equal(analyticsEmissionAllowed2029({ switchState: { loading: false, on: false } }), false);
  assert.equal(analyticsEmissionAllowed2029({ switchState: { loading: false, on: true }, hostedPreview: true }), false);
  assert.equal(analyticsEmissionAllowed2029({ switchState: { loading: false, on: true }, integratedPreview: true }), false);
  assert.equal(analyticsEmissionAllowed2029({ switchState: { loading: false, on: true }, kingdomPreview: true, pathname: "/kingdom" }), false);
  assert.equal(imports, 0);
});

test("failed flag reads preserve the existing fail-open analytics default", () => {
  const defaults = switchesFromFlags({});
  assert.equal(defaults.fx_analytics, true);
  assert.equal(analyticsEmissionAllowed2029({ switchState: { loading: false, on: defaults.fx_analytics } }), true);
});

test("switching the owner OFF cancels an open engagement tracker without a write", () => {
  const calls = [];
  let sealed = false;
  const tracker = {
    _state: {
      flush() { sealed = true; calls.push("seal"); return { engaged_ms: 10 }; },
    },
    flush(reason) {
      calls.push(["cleanup", reason]);
      if (!sealed) calls.push("write");
      return null;
    },
  };
  cancelPageEngagementTracker2029(tracker);
  assert.deepEqual(calls, ["seal", ["cleanup", "analytics_disabled"]]);
});

test("ON shares one load, starts before route emission and preserves the delayed pageview order", async () => {
  let resolveImport;
  let imports = 0;
  const calls = [];
  const emitter = {
    startAnalyticsEmitter2029: () => calls.push(["start"]),
    stopAnalyticsEmitter2029: () => calls.push(["stop"]),
    startRouteAnalytics2029: (path) => calls.push(["route", path]),
    finishRoutePageview2029: (path) => calls.push(["pageview", path]),
  };
  const boundary = createAnalyticsEmitterBoundary2029({
    importer: () => {
      imports += 1;
      return new Promise((resolve) => { resolveImport = resolve; });
    },
  });
  let due;
  let cleared = false;
  const stopOwner = boundary.activate();
  const stopRoute = boundary.beginRoute("/world", {
    delayMs: 350,
    setTimeoutFn: (fn, delay) => { assert.equal(delay, 350); due = fn; return 17; },
    clearTimeoutFn: (id) => { assert.equal(id, 17); cleared = true; },
  });
  await settle();
  assert.equal(imports, 1, "owner and route must share one import promise");
  assert.deepEqual(calls, []);
  due();
  resolveImport(emitter);
  await settle();
  assert.deepEqual(calls, [
    ["start"],
    ["route", "/world"],
    ["pageview", "/world"],
  ]);
  stopRoute();
  stopOwner();
  assert.equal(cleared, true);
  assert.deepEqual(calls.at(-1), ["stop"]);
});

test("a failed dynamic import is silent and retryable", async () => {
  let attempts = 0;
  const emitter = { startAnalyticsEmitter2029() {} };
  const boundary = createAnalyticsEmitterBoundary2029({
    importer: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("chunk unavailable");
      return emitter;
    },
  });
  await assert.rejects(boundary.load(), /chunk unavailable/);
  assert.equal(await boundary.load(), emitter);
  assert.equal(attempts, 2);
});

test("a route superseded during a slow chunk load emits only the current route", async () => {
  let resolveImport;
  const calls = [];
  const emitter = {
    startAnalyticsEmitter2029() {},
    stopAnalyticsEmitter2029() {},
    startRouteAnalytics2029: (path) => calls.push(["route", path]),
    finishRoutePageview2029: (path) => calls.push(["pageview", path]),
  };
  const timers = [];
  const boundary = createAnalyticsEmitterBoundary2029({
    importer: () => new Promise((resolve) => { resolveImport = resolve; }),
  });
  const stopOwner = boundary.activate();
  const options = { setTimeoutFn: (fn) => { timers.push(fn); return timers.length; }, clearTimeoutFn() {} };
  const stopFirst = boundary.beginRoute("/", options);
  await settle();
  stopFirst();
  boundary.beginRoute("/world", options);
  timers.forEach((fn) => fn());
  resolveImport(emitter);
  await settle();
  assert.deepEqual(calls, [
    ["route", "/world"],
    ["pageview", "/world"],
  ]);
  stopOwner();
});

test("StrictMode-like cleanup and remount cannot replay the old route", async () => {
  let resolveImport;
  const calls = [];
  const emitter = {
    startAnalyticsEmitter2029: () => calls.push(["start"]),
    stopAnalyticsEmitter2029: () => calls.push(["stop"]),
    startRouteAnalytics2029: (path) => calls.push(["route", path]),
    finishRoutePageview2029: (path) => calls.push(["pageview", path]),
  };
  const timers = [];
  const boundary = createAnalyticsEmitterBoundary2029({
    importer: () => new Promise((resolve) => { resolveImport = resolve; }),
  });
  const options = {
    setTimeoutFn: (fn) => { timers.push(fn); return timers.length; },
    clearTimeoutFn() {},
  };
  const stopOwner1 = boundary.activate();
  const stopRoute1 = boundary.beginRoute("/", options);
  await settle();
  stopRoute1();
  stopOwner1();
  const stopOwner2 = boundary.activate();
  boundary.beginRoute("/", options);
  timers.forEach((fn) => fn());
  resolveImport(emitter);
  await settle();
  assert.deepEqual(calls, [
    ["start"],
    ["route", "/"],
    ["pageview", "/"],
  ]);
  stopOwner2();
  assert.deepEqual(calls.at(-1), ["stop"]);
});

test("an OFF cleanup drops every queued route before the emitter resolves", async () => {
  let resolveImport;
  const calls = [];
  const emitter = {
    startAnalyticsEmitter2029: () => calls.push(["start"]),
    stopAnalyticsEmitter2029: () => calls.push(["stop"]),
    startRouteAnalytics2029: (path) => calls.push(["route", path]),
    finishRoutePageview2029: (path) => calls.push(["pageview", path]),
  };
  const boundary = createAnalyticsEmitterBoundary2029({
    importer: () => new Promise((resolve) => { resolveImport = resolve; }),
  });
  const stopOwner = boundary.activate();
  const stopRoute = boundary.beginRoute("/number/1820", {
    setTimeoutFn: () => 1,
    clearTimeoutFn() {},
  });
  await settle();
  stopRoute();
  stopOwner();
  resolveImport(emitter);
  await settle();
  assert.deepEqual(calls, []);
});

test("runtime errors are captured early in memory and flushed in exact order on authorization", () => {
  resetRuntimeErrorCollectorForTest2029();
  const win = new EventTarget();
  win.location = { pathname: "/number/1820" };
  assert.equal(prepareRuntimeErrorCapture2029(win), true);
  const first = new Event("error");
  Object.assign(first, { message: "first boom", filename: "https://sod1820.co.il/a.js?token=secret", lineno: 4, colno: 2, error: new Error("first boom") });
  win.dispatchEvent(first);
  const second = new Event("unhandledrejection");
  Object.assign(second, { reason: new Error("second boom") });
  win.dispatchEvent(second);
  assert.deepEqual(runtimeErrorCollectorState2029(), { prepared: true, collecting: true, pending: 2, authorized: false });

  const sent = [];
  const detach = attachRuntimeErrorReporter2029((...args) => sent.push(args));
  assert.deepEqual(sent.map((row) => [row[0], row[1], row[2]]), [
    ["runtime_error", "/number/1820", "window_error"],
    ["runtime_error", "/number/1820", "unhandled_rejection"],
  ]);
  assert.equal(runtimeErrorCollectorState2029().pending, 0);
  detach();
  resetRuntimeErrorCollectorForTest2029();
});

test("shared-shell tracking calls stay in memory and retain their exact order and arguments", () => {
  resetTrackingEntryFacadeForTest2029();
  track("story", "7", "story_open", { surface: "HOME" });
  trackResearch("open", { surface: "rail" });
  trackShare("whatsapp", "post-7", { image: "public.jpg" });
  trackConversion("members_signup", { source: "frame" });
  trackSubscribe({ source: "email-verify" });
  assert.deepEqual(trackingEntryFacadeState2029(), { collecting: true, pending: 5, authorized: false });
  const sent = [];
  const detach = attachTrackingEntryEmitter2029({
    track: (...args) => sent.push(["track", ...args]),
    trackResearch: (...args) => sent.push(["trackResearch", ...args]),
    trackShare: (...args) => sent.push(["trackShare", ...args]),
    trackConversion: (...args) => sent.push(["trackConversion", ...args]),
    trackSubscribe: (...args) => sent.push(["trackSubscribe", ...args]),
  });
  assert.deepEqual(sent, [
    ["track", "story", "7", "story_open", { surface: "HOME" }],
    ["trackResearch", "open", { surface: "rail" }],
    ["trackShare", "whatsapp", "post-7", { image: "public.jpg" }],
    ["trackConversion", "members_signup", { source: "frame" }],
    ["trackSubscribe", { source: "email-verify" }],
  ]);
  assert.deepEqual(trackingEntryFacadeState2029(), { collecting: true, pending: 0, authorized: true });
  detach();
  resetTrackingEntryFacadeForTest2029();
});
