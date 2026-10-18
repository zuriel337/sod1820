import test from "node:test";
import assert from "node:assert/strict";
import { createWebVitalsRuntime2029 } from "../src/lib/webVitals2029.js";

function clock(start = 10) {
  let time = start;
  let nextId = 1;
  const timers = new Map();
  return {
    now: () => time,
    setTimeout(fn, delay = 0) {
      const id = nextId++;
      timers.set(id, { at: time + Number(delay || 0), fn });
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
    advance(ms) {
      const target = time + ms;
      while (true) {
        const due = [...timers.entries()]
          .filter(([, timer]) => timer.at <= target)
          .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
        if (!due) break;
        timers.delete(due[0]);
        time = due[1].at;
        due[1].fn();
      }
      time = target;
    },
  };
}

class FakePerformanceObserver {
  static instances = [];
  constructor(callback) {
    this.callback = callback;
    this.type = null;
    this.disconnected = false;
    FakePerformanceObserver.instances.push(this);
  }
  observe({ type }) { this.type = type; }
  disconnect() { this.disconnected = true; }
  static emit(type, entries) {
    for (const instance of this.instances.filter((item) => item.type === type && !item.disconnected)) {
      instance.callback({ getEntries: () => entries });
    }
  }
  static reset() { this.instances = []; }
}

function environment({ pathname = "/", hostname = "sod1820.co.il", readyRoutes = [pathname] } = {}) {
  const timer = clock();
  const doc = new EventTarget();
  doc.visibilityState = "visible";
  doc.cookie = "vb=browser";
  const location = { pathname, hostname };
  const win = new EventTarget();
  win.location = location;
  win.document = doc;
  win.innerWidth = 390;
  win.innerHeight = 844;
  win.navigator = { userAgent: "Mozilla/5.0 (iPhone)", webdriver: false, maxTouchPoints: 5 };
  win.matchMedia = () => ({ matches: true });
  win.performance = {
    now: timer.now,
    getEntriesByType: (type) => type === "navigation"
      ? [{ type: "navigate", startTime: 0, responseStart: 120 }]
      : [],
  };
  const applyUrl = (url) => {
    if (url == null) return;
    location.pathname = new URL(String(url), `https://${hostname}${location.pathname}`).pathname;
  };
  win.history = {
    pushState(_state, _unused, url) { applyUrl(url); },
    replaceState(_state, _unused, url) { applyUrl(url); },
  };
  const ready = new Set(readyRoutes);
  return {
    timer,
    doc,
    win,
    ready,
    deps: {
      win,
      doc,
      PerformanceObserverCtor: FakePerformanceObserver,
      setTimeoutFn: timer.setTimeout,
      clearTimeoutFn: timer.clearTimeout,
      now: timer.now,
      readiness: (route) => ({ usable: ready.has(route), kind: `${route}-fixture` }),
      buildSha: "8f78c0c7ced835849a816a815abf05a7247ceead",
      deployEnv: "production",
      deviceClass: "mobile",
      trafficHint: "human_like",
      bot: false,
      checkpointMs: 50,
      usableTimeoutMs: 500,
      authorizationTimeoutMs: 1000,
      usablePollMs: 10,
      getSodId: () => "sod-test",
      sessionId: () => "session-test",
      appContext: () => "chrome",
      cryptoObject: { randomUUID: (() => { let id = 0; return () => `id-${++id}`; })() },
    },
  };
}

test("early observation is memory-only until the analytics switch authorizes it", () => {
  FakePerformanceObserver.reset();
  const env = environment();
  const sent = [];
  let identityReads = 0;
  const runtime = createWebVitalsRuntime2029({
    ...env.deps,
    getSodId: () => { identityReads += 1; return "sod-test"; },
    transport: (payload, options) => sent.push({ payload, options }),
  });
  FakePerformanceObserver.emit("largest-contentful-paint", [{ startTime: 900 }]);
  env.timer.advance(50); // queues checkpoint only
  env.doc.visibilityState = "hidden";
  env.doc.dispatchEvent(new Event("visibilitychange")); // final replaces queued checkpoint
  assert.equal(sent.length, 0);
  assert.equal(identityReads, 0, "early observation must not initialize identity or write");

  runtime.authorize();
  assert.equal(sent.length, 1);
  assert.equal(identityReads, 1);
  const event = sent[0].payload;
  assert.equal(event.p_event_type, "web_vital");
  assert.equal(event.p_props.phase, "final");
  assert.equal(event.p_props.vitals_version, 2);
  assert.equal(event.p_props.build_sha, env.deps.buildSha);
  assert.equal(event.p_props.deploy_env, "production");
  assert.equal(event.p_props.route, "/");
  assert.match(event.p_props.route_instance_id, /^route-/);
  assert.equal(event.p_props.nav_kind, "hard_load");
  assert.equal(event.p_props.device_class, "mobile");
  assert.equal(event.p_props.sample_id, "rum-id-1");
  assert.equal(event.p_props.measurement_scope, "hard_load_cwv_and_usable");
  assert.equal(event.p_props.lcp_ms, 900);
  assert.equal(event.p_props.usable_ms, 10);
  runtime.dispose();
});

test("a transmitted final supersedes checkpoint under one stable sample id", () => {
  FakePerformanceObserver.reset();
  const env = environment();
  const sent = [];
  const runtime = createWebVitalsRuntime2029({
    ...env.deps,
    transport: (payload) => sent.push(payload),
  });
  runtime.authorize();
  env.timer.advance(50);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].p_props.phase, "checkpoint");
  env.doc.visibilityState = "hidden";
  env.doc.dispatchEvent(new Event("visibilitychange"));
  assert.equal(sent.length, 2);
  assert.equal(sent[1].p_props.phase, "final");
  assert.equal(sent[0].p_props.sample_id, sent[1].p_props.sample_id);
  runtime.dispose();
});

test("SPA navigation emits usable navigation only and never labels route LCP", () => {
  FakePerformanceObserver.reset();
  const env = environment({ readyRoutes: ["/", "/world"] });
  const sent = [];
  const runtime = createWebVitalsRuntime2029({
    ...env.deps,
    transport: (payload) => sent.push(payload),
  });
  runtime.authorize();
  FakePerformanceObserver.emit("largest-contentful-paint", [{ startTime: 800 }]);
  env.win.history.pushState({}, "", "/world");
  FakePerformanceObserver.emit("largest-contentful-paint", [{ startTime: 9999 }]);
  env.timer.advance(0);
  assert.equal(sent.length, 2, "hard departure and soft usable route each emit once");
  const hard = sent.find((row) => row.p_props.measurement_scope === "hard_load_cwv_and_usable");
  const soft = sent.find((row) => row.p_props.measurement_scope === "spa_navigation_usable_only");
  assert.ok(hard);
  assert.ok(soft);
  assert.equal(hard.p_props.lcp_ms, 800, "destination paints cannot contaminate the hard-load snapshot");
  assert.equal(soft.p_props.route, "/world");
  assert.equal(soft.p_props.nav_kind, "spa_push");
  assert.equal(soft.p_props.usable_ms, 0);
  assert.equal("lcp_ms" in soft.p_props, false);
  assert.equal("cls" in soft.p_props, false);
  assert.notEqual(hard.p_props.route_instance_id, soft.p_props.route_instance_id);
  runtime.dispose();
});

test("preview authorizes zero writes and does not initialize identity", () => {
  FakePerformanceObserver.reset();
  const env = environment({ hostname: "candidate.vercel.app" });
  const sent = [];
  let identityReads = 0;
  const runtime = createWebVitalsRuntime2029({
    ...env.deps,
    production: false,
    getSodId: () => { identityReads += 1; return "never"; },
    transport: (payload) => sent.push(payload),
  });
  runtime.authorize();
  env.timer.advance(1000);
  assert.equal(sent.length, 0);
  assert.equal(identityReads, 0);
  assert.equal(runtime.isDisposed(), true);
});

test("suspected is a non-blocking telemetry hint and preserves the canonical ingest bot flag", () => {
  FakePerformanceObserver.reset();
  const env = environment();
  const sent = [];
  const runtime = createWebVitalsRuntime2029({
    ...env.deps,
    trafficHint: "suspected",
    bot: true,
    transport: (payload) => sent.push(payload),
  });
  runtime.authorize();
  env.doc.visibilityState = "hidden";
  env.doc.dispatchEvent(new Event("visibilitychange"));
  assert.equal(sent[0].p_props.traffic_hint, "suspected");
  assert.equal(sent[0].p_is_bot, true);
  runtime.dispose();
});

test("an unsupported CLS observer is reported as unknown rather than a false zero", () => {
  const env = environment();
  const sent = [];
  const runtime = createWebVitalsRuntime2029({
    ...env.deps,
    PerformanceObserverCtor: null,
    transport: (payload) => sent.push(payload),
  });
  runtime.authorize();
  env.doc.visibilityState = "hidden";
  env.doc.dispatchEvent(new Event("visibilitychange"));
  assert.equal(sent[0].p_props.cls, null);
  assert.equal(sent[0].p_props.ratings.cls, null);
  assert.equal(sent[0].p_props.metric_support.cls, false);
  assert.equal(sent[0].p_props.usable_ms, 10, "usable content remains measurable without CWV observers");
  runtime.dispose();
});
