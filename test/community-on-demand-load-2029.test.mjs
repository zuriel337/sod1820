// Community first load on demand (S-64, ZURIEL 27.11.2026): decoration reads start on engagement or dwell, timers run only while visible, nothing else moves.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EventEmitter } from "node:events";
import { watchEngagement, visibleInterval, ENGAGED_DWELL_MS } from "../src/lib/community/communityOnDemandLoad.js";

const fake = (hidden = false) => {
  const listeners = {};
  const t = { hidden, listeners, addEventListener: (n, f) => { (listeners[n] ||= new Set()).add(f); }, removeEventListener: (n, f) => { listeners[n]?.delete(f); },
    emit: (n) => { for (const f of [...(listeners[n] || [])]) f(); } };
  return t;
};
const clock = () => { const timers = []; let now = 0; const real = { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout, setInterval: globalThis.setInterval, clearInterval: globalThis.clearInterval };
  let id = 0;
  globalThis.setTimeout = (fn, ms) => { const t = { id: ++id, at: now + ms, fn, every: null }; timers.push(t); return t.id; };
  globalThis.clearTimeout = (h) => { const i = timers.findIndex(t => t.id === h); if (i >= 0) timers.splice(i, 1); };
  globalThis.setInterval = (fn, ms) => { const t = { id: ++id, at: now + ms, fn, every: ms }; timers.push(t); return t.id; };
  globalThis.clearInterval = globalThis.clearTimeout;
  return { advance(ms) { const end = now + ms; for (;;) { const next = timers.filter(t => t.at <= end).sort((a, b) => a.at - b.at)[0]; if (!next) break; now = next.at; if (next.every) next.at += next.every; else timers.splice(timers.indexOf(next), 1); next.fn(); } now = end; },
    now: () => now, restore() { Object.assign(globalThis, real); } }; };

test("a visitor who leaves within seconds without touching the page triggers nothing", () => {
  const c = clock(); try {
    const doc = fake(), win = fake(); let fired = 0;
    const stop = watchEngagement(() => fired++, { doc, win });
    c.advance(ENGAGED_DWELL_MS - 1); assert.equal(fired, 0); stop();
    c.advance(60000); assert.equal(fired, 0, "cleanup cancels the dwell");
    for (const set of Object.values(win.listeners)) assert.equal(set.size, 0, "listeners removed");
  } finally { c.restore(); }
});

test("the first interaction, or a visible dwell, fires exactly once", () => {
  const c = clock(); try {
    for (const name of ["pointerdown", "keydown", "touchstart", "wheel", "scroll"]) {
      const doc = fake(), win = fake(); let fired = 0; watchEngagement(() => fired++, { doc, win });
      win.emit(name); win.emit(name); c.advance(ENGAGED_DWELL_MS * 2);
      assert.equal(fired, 1, name);
    }
    const doc = fake(), win = fake(); let fired = 0; watchEngagement(() => fired++, { doc, win });
    c.advance(ENGAGED_DWELL_MS); c.advance(ENGAGED_DWELL_MS); assert.equal(fired, 1, "dwell fires once");
  } finally { c.restore(); }
});

test("a hidden tab does not count as dwell, and resumes the count when it becomes visible", () => {
  const c = clock(); try {
    const doc = fake(true), win = fake(); let fired = 0; watchEngagement(() => fired++, { doc, win });
    c.advance(ENGAGED_DWELL_MS * 3); assert.equal(fired, 0, "hidden: no dwell");
    doc.hidden = false; doc.emit("visibilitychange"); c.advance(ENGAGED_DWELL_MS - 1); assert.equal(fired, 0);
    c.advance(1); assert.equal(fired, 1);
  } finally { c.restore(); }
});

test("visibleInterval runs only while visible and catches up once after a full period away", () => {
  const c = clock(); try {
    const doc = fake(); let runs = 0; const stop = visibleInterval(() => runs++, 60000, { doc, now: c.now });
    c.advance(60000); assert.equal(runs, 1);
    doc.hidden = true; c.advance(180000); assert.equal(runs, 1, "hidden: no run");
    doc.hidden = false; doc.emit("visibilitychange"); assert.equal(runs, 2, "back after a full period: one run at once");
    doc.hidden = true; c.advance(5000); doc.hidden = false; doc.emit("visibilitychange"); assert.equal(runs, 2, "back after a short absence: no extra run");
    stop(); c.advance(180000); assert.equal(runs, 2, "cleanup stops it"); assert.equal(doc.listeners.visibilitychange.size, 0);
  } finally { c.restore(); }
});

test("the page uses it only for decoration and moderation timers; feed, measurement, presence ping and thread updates are untouched", () => {
  const src = readFileSync(new URL("../src/components/community2029/CommunityLive2029.jsx", import.meta.url), "utf8");
  assert.match(src, /import \{ useEngagedOrDwell, visibleInterval \} from "..\/..\/lib\/community\/communityOnDemandLoad\.js"/);
  assert.match(src, /if \(!engaged && !treeHintRefresh && !treePinsLastSeen\(\)\) return undefined;/, "a browser that saw pins reads them at once");
  assert.match(src, /fetchCommunityStaffIds\(\)[\s\S]{0,200}\[engaged\]/);
  assert.match(src, /visibleInterval\(load, 60000\)/);
  assert.match(src, /visibleInterval\(refreshGuestUnreviewed, 30000\)/);
  assert.match(src, /const ping = \(\) => \{ if \(!document\.hidden\) pingCommunityPresence\(\)/, "the signed-in presence ping is unchanged");
  assert.doesNotMatch(src, /setInterval\(load, 60000\)|setInterval\(refreshGuestUnreviewed/, "the old always-on timers are gone");
  assert.match(src, /fetchCommunityPresenceOnline\(\)/);
});
