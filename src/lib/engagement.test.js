// Tests for engagement.js — run with: node --test src/lib/engagement.test.js
// Zero external dependencies (Node's built-in test runner), mirrors middleware.test.js convention.
// Exercises the REAL module: createEngagementState (pure) directly with a fake clock, and
// createPageEngagementTracker with fully-injected deps (no jsdom — none exists in this repo).
//
// ENGAGEMENT_TIME_V1_IMPLEMENTATION (25.8.2026) acceptance tests A-I — see work_log.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createEngagementState,
  createPageEngagementTracker,
  startPageEngagement,
  ENGAGEMENT_VERSION,
  IDLE_THRESHOLD_MS,
} from "./engagement.js";

// ── fake clock: deterministic, no real timers (per spec: "test deterministic clock logic") ──
function makeClock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms) => { t += ms; } };
}

// ── minimal fake DOM/window for createPageEngagementTracker wiring tests ──
function makeFakeEnv({ visibilityState = "visible" } = {}) {
  const docListeners = {};
  const winListeners = {};
  const doc = {
    visibilityState,
    documentElement: { scrollHeight: 2000 },
    addEventListener: (ev, fn) => { docListeners[ev] = fn; },
    removeEventListener: (ev, fn) => { if (docListeners[ev] === fn) delete docListeners[ev]; },
  };
  const win = {
    scrollY: 0,
    innerHeight: 800,
    addEventListener: (ev, fn) => { winListeners[ev] = fn; },
    removeEventListener: (ev, fn) => { if (winListeners[ev] === fn) delete winListeners[ev]; },
  };
  let intervalFn = null;
  const setIntervalFn = (fn) => { intervalFn = fn; return 1; };
  const clearIntervalFn = () => { intervalFn = null; };
  return {
    doc, win, docListeners, winListeners, setIntervalFn, clearIntervalFn,
    fireTick: () => { if (intervalFn) intervalFn(); },
    isTicking: () => intervalFn !== null,
  };
}

function makeSendRecorder() {
  const calls = [];
  return { sendFn: (payload, reason) => calls.push({ payload, reason }), calls };
}

// ── B/C/D/F: pure accumulator math via createEngagementState + fake clock ──

test("B. background tab — hidden time is excluded from visible_ms", () => {
  const clock = makeClock();
  const s = createEngagementState({ now: clock.now });
  // visible ~10s
  for (let i = 0; i < 10; i++) { clock.advance(1000); s.tick(); }
  // hidden ~5min — tick() must be a no-op while !visible
  s.setVisible(false);
  clock.advance(5 * 60 * 1000);
  for (let i = 0; i < 300; i++) s.tick(); // even if called, must not accumulate
  // visible again ~10s
  s.setVisible(true);
  for (let i = 0; i < 10; i++) { clock.advance(1000); s.tick(); }
  const snap = s.snapshot();
  assert.equal(snap.visible_ms, 20000, "visible_ms must be ~20s, not ~320s");
});

test("C. idle reading — engaged_ms bounded well below visible_ms with no interaction after load", () => {
  const clock = makeClock();
  const s = createEngagementState({ now: clock.now, idleThresholdMs: IDLE_THRESHOLD_MS });
  // creation itself counts as the one activity pulse (matches tracker's onVisibilityChange/creation
  // semantics); then 60s pass with zero further activity.
  for (let i = 0; i < 60; i++) { clock.advance(1000); s.tick(); }
  const snap = s.snapshot();
  assert.equal(snap.visible_ms, 60000);
  assert.ok(snap.engaged_ms <= IDLE_THRESHOLD_MS, `engaged_ms (${snap.engaged_ms}) must be bounded by idle threshold`);
  assert.ok(snap.engaged_ms < snap.visible_ms, "engaged_ms must be significantly lower than visible_ms");
});

test("D. active reading — engaged_ms grows with visible time under repeated activity", () => {
  const clock = makeClock();
  const s = createEngagementState({ now: clock.now, idleThresholdMs: IDLE_THRESHOLD_MS });
  for (let i = 0; i < 60; i++) {
    clock.advance(1000);
    s.recordActivity(); // activity every second — always within the 20s idle window
    s.tick();
  }
  const snap = s.snapshot();
  assert.equal(snap.visible_ms, 60000);
  assert.equal(snap.engaged_ms, 60000, "continuous activity within threshold must count as fully engaged");
});

test("E. instant scroll to bottom — max_scroll_pct=100 does not imply high engaged_ms", () => {
  const clock = makeClock();
  const s = createEngagementState({ now: clock.now });
  s.recordScroll(100);
  clock.advance(500);
  s.tick(500); // sub-second, minimal engaged accumulation
  const snap = s.snapshot();
  assert.equal(snap.max_scroll_pct, 100);
  assert.ok(snap.engaged_ms <= 500);
});

test("F. hidden -> visible resumes the SAME accumulator without resetting totals", () => {
  const clock = makeClock();
  const s = createEngagementState({ now: clock.now });
  clock.advance(5000); s.tick(5000);
  s.setVisible(false);
  clock.advance(60000);
  s.tick(60000); // no-op while hidden
  s.setVisible(true);
  clock.advance(5000); s.tick(5000);
  const snap = s.snapshot();
  assert.equal(snap.visible_ms, 10000, "totals must be cumulative across visible/hidden cycles");
  assert.equal(s.isFlushed, false, "hidden must never permanently close the page-instance");
});

// PR #195 pre-merge correction: visible ≠ active. Returning to a visible tab must NOT by itself
// grant a fresh idle-threshold engaged window — only a genuine activity signal may.
test("F2. visible ≠ active — resuming visibility after a long hidden gap does NOT refresh the activity window", () => {
  const clock = makeClock();
  const s = createEngagementState({ now: clock.now, idleThresholdMs: IDLE_THRESHOLD_MS });
  // visible 10s, active throughout
  for (let i = 0; i < 10; i++) { clock.advance(1000); s.recordActivity(); s.tick(); }
  // hidden 5min
  s.setVisible(false);
  clock.advance(5 * 60 * 1000);
  // visible again, 20s, ZERO interaction
  s.setVisible(true);
  for (let i = 0; i < 20; i++) { clock.advance(1000); s.tick(); }
  let snap = s.snapshot();
  assert.equal(snap.visible_ms, 30000, "visible_ms must grow during the final 20s (10s + 20s)");
  assert.equal(snap.engaged_ms, 10000, "engaged_ms must NOT get a fresh 20s window merely from visibility restoration — stays at the pre-hidden 10s");

  // now a real interaction happens
  s.recordActivity();
  for (let i = 0; i < 5; i++) { clock.advance(1000); s.tick(); }
  snap = s.snapshot();
  assert.equal(snap.visible_ms, 35000);
  assert.equal(snap.engaged_ms, 15000, "subsequent visible time within the idle threshold after a REAL activity signal must count as engaged");
});

test("flush() is idempotent — second call on the same state is a no-op", () => {
  const clock = makeClock();
  const s = createEngagementState({ now: clock.now });
  clock.advance(1000); s.tick();
  const first = s.flush();
  const second = s.flush();
  assert.ok(first, "first flush must return a snapshot");
  assert.equal(second, null, "second flush on the same state must be a no-op");
});

// ── A/G: page-instance lifecycle via createPageEngagementTracker + injected deps ──

test("A. SPA navigation A -> B -> C — exactly one summary per closed page-instance, none for the open one", () => {
  const clock = makeClock();
  const recorder = makeSendRecorder();
  const envA = makeFakeEnv();
  const trA = createPageEngagementTracker("/a", {
    now: clock.now, doc: envA.doc, win: envA.win,
    setIntervalFn: envA.setIntervalFn, clearIntervalFn: envA.clearIntervalFn,
    sendFn: recorder.sendFn, isBotFn: () => false,
    getSodIdFn: () => "sod-test", sessionIdFn: () => "sess-test", appContextFn: () => "chrome",
  });
  clock.advance(2000); envA.fireTick(); envA.fireTick();
  trA.flush("route_change"); // simulates App.jsx starting page B

  const envB = makeFakeEnv();
  const trB = createPageEngagementTracker("/b", {
    now: clock.now, doc: envB.doc, win: envB.win,
    setIntervalFn: envB.setIntervalFn, clearIntervalFn: envB.clearIntervalFn,
    sendFn: recorder.sendFn, isBotFn: () => false,
    getSodIdFn: () => "sod-test", sessionIdFn: () => "sess-test", appContextFn: () => "chrome",
  });
  clock.advance(1000); envB.fireTick();
  trB.flush("route_change"); // simulates App.jsx starting page C — B closes, C stays open

  const rowsForA = recorder.calls.filter(c => c.payload.p_path === "/a");
  const rowsForB = recorder.calls.filter(c => c.payload.p_path === "/b");
  assert.equal(rowsForA.length, 1, "exactly one engagement row for A");
  assert.equal(rowsForB.length, 1, "exactly one engagement row for B");
  assert.equal(rowsForA[0].payload.p_props.visible_ms, 2000);
  assert.equal(rowsForB[0].payload.p_props.visible_ms, 1000);
  // C never flushed in this test -> no row for it.
  assert.equal(recorder.calls.some(c => c.payload.p_path === "/c"), false);
});

test("G. pagehide / route-change race — only one final summary for the page-instance", () => {
  const clock = makeClock();
  const recorder = makeSendRecorder();
  const env = makeFakeEnv();
  const tr = createPageEngagementTracker("/race", {
    now: clock.now, doc: env.doc, win: env.win,
    setIntervalFn: env.setIntervalFn, clearIntervalFn: env.clearIntervalFn,
    sendFn: recorder.sendFn, isBotFn: () => false,
    getSodIdFn: () => "sod-test", sessionIdFn: () => "sess-test", appContextFn: () => "chrome",
  });
  clock.advance(3000); env.fireTick(); env.fireTick(); env.fireTick();
  tr.flush("pagehide");     // browser unload fires first
  tr.flush("route_change"); // App.jsx's effect cleanup/replacement also fires on the same instance
  assert.equal(recorder.calls.length, 1, "only one network send for this page-instance");
  assert.equal(recorder.calls[0].reason, "pagehide");
});

// ── H. bots ──

test("H. bot session — zero engagement rows, no timer/listeners wired", () => {
  const recorder = makeSendRecorder();
  const env = makeFakeEnv();
  const tr = createPageEngagementTracker("/bot-page", {
    doc: env.doc, win: env.win,
    setIntervalFn: env.setIntervalFn, clearIntervalFn: env.clearIntervalFn,
    sendFn: recorder.sendFn, isBotFn: () => true,
    getSodIdFn: () => "sod-test", sessionIdFn: () => "sess-test", appContextFn: () => "chrome",
  });
  assert.equal(env.isTicking(), false, "bot sessions must not get a running tick timer");
  const result = tr.flush("route_change");
  assert.equal(result, null);
  assert.equal(recorder.calls.length, 0, "zero persisted engagement rows for bots");
});

// ── envelope/versioning ──

test("every flushed payload carries engagement_version and idle_threshold_ms", () => {
  const clock = makeClock();
  const recorder = makeSendRecorder();
  const env = makeFakeEnv();
  const tr = createPageEngagementTracker("/v", {
    now: clock.now, doc: env.doc, win: env.win,
    setIntervalFn: env.setIntervalFn, clearIntervalFn: env.clearIntervalFn,
    sendFn: recorder.sendFn, isBotFn: () => false,
    getSodIdFn: () => "sod-test", sessionIdFn: () => "sess-test", appContextFn: () => "chrome",
  });
  clock.advance(1000); env.fireTick();
  tr.flush("route_change");
  const props = recorder.calls[0].payload.p_props;
  assert.equal(props.engagement_version, ENGAGEMENT_VERSION);
  assert.equal(props.idle_threshold_ms, IDLE_THRESHOLD_MS);
  assert.equal(recorder.calls[0].payload.p_event_type, "engagement");
  assert.equal(recorder.calls[0].payload.p_surface, "page");
});

test("startPageEngagement singleton: starting a new page flushes the previous active one", () => {
  const recorder = makeSendRecorder();
  const env1 = makeFakeEnv();
  startPageEngagement("/singleton-1", {
    doc: env1.doc, win: env1.win,
    setIntervalFn: env1.setIntervalFn, clearIntervalFn: env1.clearIntervalFn,
    sendFn: recorder.sendFn, isBotFn: () => false,
    getSodIdFn: () => "sod-test", sessionIdFn: () => "sess-test", appContextFn: () => "chrome",
  });
  const env2 = makeFakeEnv();
  startPageEngagement("/singleton-2", {
    doc: env2.doc, win: env2.win,
    setIntervalFn: env2.setIntervalFn, clearIntervalFn: env2.clearIntervalFn,
    sendFn: recorder.sendFn, isBotFn: () => false,
    getSodIdFn: () => "sod-test", sessionIdFn: () => "sess-test", appContextFn: () => "chrome",
  });
  assert.equal(recorder.calls.length, 1, "previous page-instance must be flushed exactly once");
  assert.equal(recorder.calls[0].payload.p_path, "/singleton-1");
  assert.equal(recorder.calls[0].reason, "route_change");
});
