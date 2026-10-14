import test from "node:test";
import assert from "node:assert/strict";
import { afterPrimaryContent } from "../src/components/experience2029/useSystemFeed2029.js";

function fakeWindow({ complete = true } = {}) {
  const listeners = new Map(); const timers = []; let idleCb = null;
  return {
    document: { readyState: complete ? "complete" : "loading" },
    addEventListener: (n, f) => { listeners.set(n, [...(listeners.get(n) || []), f]); },
    removeEventListener: (n, f) => { listeners.set(n, (listeners.get(n) || []).filter((x) => x !== f)); },
    setTimeout: (f, ms) => { timers.push({ f, ms, live: true }); return timers.length - 1; },
    clearTimeout: (i) => { if (timers[i]) timers[i].live = false; },
    requestIdleCallback: (f) => { idleCb = f; return 1; },
    cancelIdleCallback: () => { idleCb = null; },
    emit: (n) => (listeners.get(n) || []).slice().forEach((f) => f()),
    runTimers: () => timers.filter((t) => t.live).forEach((t) => { t.live = false; t.f(); }),
    runIdle: () => idleCb?.(),
    count: (n) => (listeners.get(n) || []).length,
  };
}

test("starts after the quiet window and an idle slot, once", () => {
  const w = fakeWindow(); let n = 0;
  afterPrimaryContent(() => { n += 1; }, { win: w });
  assert.equal(n, 0); w.runTimers(); assert.equal(n, 0); w.runIdle(); assert.equal(n, 1); w.runIdle(); w.emit("pointerdown"); assert.equal(n, 1);
});
test("waits for load when the document is still loading", () => {
  const w = fakeWindow({ complete: false }); let n = 0;
  afterPrimaryContent(() => { n += 1; }, { win: w });
  w.runTimers(); assert.equal(n, 0); w.emit("load"); w.runTimers(); w.runIdle(); assert.equal(n, 1);
});
test("the first interaction starts it immediately and removes every listener", () => {
  const w = fakeWindow({ complete: false }); let n = 0;
  afterPrimaryContent(() => { n += 1; }, { win: w });
  w.emit("keydown"); assert.equal(n, 1);
  for (const name of ["pointerdown", "keydown", "touchstart", "wheel", "focusin", "load"]) assert.equal(w.count(name), 0);
});
test("cancel before start never starts it and cleans up", () => {
  const w = fakeWindow(); let n = 0;
  const cancel = afterPrimaryContent(() => { n += 1; }, { win: w });
  cancel(); w.runTimers(); w.runIdle(); w.emit("wheel"); assert.equal(n, 0); assert.equal(w.count("wheel"), 0);
});
test("without a window it starts at once (server/test environments)", () => {
  let n = 0; afterPrimaryContent(() => { n += 1; }, { win: null }); assert.equal(n, 1);
});
