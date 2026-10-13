import test from "node:test";
import assert from "node:assert/strict";
import { captureCommunityScrollAnchor, mergeCommunityRefreshRows, restoreCommunityScrollAnchor, startCommunityRefresh } from "./communityRefresh.js";

const row = (id, body = id) => ({ id, body, createdAt: `2026-10-13T00:00:0${id}Z`, reactions: {} });

test("another member's message and reaction refresh without dropping loaded history or duplicating roots", () => {
  const current = [row("3"), row("2"), row("1")];
  const fresh = [row("4"), { ...row("3"), reactions: { "👍": ["another-member"] } }];
  const next = mergeCommunityRefreshRows(current, fresh);
  assert.deepEqual(next.map((item) => item.id), ["4", "3", "2", "1"]);
  assert.deepEqual(next[1].reactions, { "👍": ["another-member"] });
  assert.equal(current[0].reactions["👍"], undefined);
  assert.equal(mergeCommunityRefreshRows(next, fresh), next);
});

test("refresh drops a now-hidden row inside the proven page and retains historical rows beyond it", () => {
  const next = mergeCommunityRefreshRows([row("3"), row("2"), row("1")], [row("4"), row("2", "edited")]);
  assert.deepEqual(next.map((item) => item.id), ["4", "2", "1"]);
  assert.equal(next[1].body, "edited");
  assert.deepEqual(mergeCommunityRefreshRows(next, []), []);
  assert.deepEqual(mergeCommunityRefreshRows([row("3"), row("1")], [row("3")], "newest", { complete: true }).map((item) => item.id), ["3"]);
});

test("open-thread refresh keeps already-loaded later replies in chronological order", () => {
  const next = mergeCommunityRefreshRows([row("1"), row("2"), row("3")], [row("1", "edited"), row("2")], "oldest");
  assert.deepEqual(next.map((item) => item.id), ["1", "2", "3"]);
  assert.equal(next[0].body, "edited");
});

function environment() {
  const doc = new EventTarget();
  doc.hidden = false;
  doc.visibilityState = "visible";
  const win = new EventTarget();
  const timers = new Map();
  let sequence = 0;
  return {
    doc, win, timers,
    setTimer: (callback, delay) => { const id = ++sequence; timers.set(id, { callback, delay }); return id; },
    clearTimer: (id) => timers.delete(id),
    async tick() { const timer = timers.values().next().value; assert.ok(timer); await timer.callback(); },
    visibility(hidden) { doc.hidden = hidden; doc.visibilityState = hidden ? "hidden" : "visible"; doc.dispatchEvent(new Event("visibilitychange")); },
    focus() { win.dispatchEvent(new Event("focus")); },
  };
}

const settle = async () => { await Promise.resolve(); await Promise.resolve(); };

test("poll and focus coalesce, pause while hidden, and refresh the other user's latest state on return", async () => {
  const env = environment();
  let calls = 0;
  let resolve;
  let displayed = "old";
  let source = "another user's new message";
  const stop = startCommunityRefresh({ ...env, refresh: async () => { calls++; await new Promise((done) => { resolve = done; }); displayed = source; } });
  assert.equal([...env.timers.values()][0].delay, 30000);
  env.focus(); env.focus();
  assert.equal(calls, 1);
  env.visibility(true); env.focus();
  assert.equal(env.timers.size, 0);
  assert.equal(calls, 1);
  resolve(); await settle();
  assert.equal(displayed, source);
  assert.equal(env.timers.size, 0);
  source = "newer message";
  env.visibility(false);
  assert.equal(calls, 2);
  resolve(); await settle();
  assert.equal(displayed, "newer message");
  assert.equal(env.timers.size, 1);
  stop();
  assert.equal(env.timers.size, 0);
  env.focus(); env.visibility(false);
  assert.equal(calls, 2);
});

test("cleanup during a pending read never schedules another request; a failed read retries only on the next tick", async () => {
  const env = environment();
  let calls = 0;
  let resolve;
  const stop = startCommunityRefresh({ ...env, refresh: () => { calls++; return new Promise((done) => { resolve = done; }); } });
  env.focus(); stop(); resolve(); await settle();
  assert.equal(env.timers.size, 0);
  env.focus();
  assert.equal(calls, 1);
  const stopRetry = startCommunityRefresh({ ...env, refresh: async () => { calls++; throw new Error("offline"); } });
  await env.tick();
  assert.equal(calls, 2);
  assert.equal(env.timers.size, 1);
  await env.tick();
  assert.equal(calls, 3);
  stopRetry();
});

test("the visible message stays at the same viewport position after insertion above it", () => {
  let top = 12;
  const message = { id: "message-visible", getBoundingClientRect: () => ({ top, bottom: top + 120 }) };
  const root = { querySelectorAll: () => [{ id: "offscreen", getBoundingClientRect: () => ({ top: -200, bottom: -80 }) }, message] };
  const doc = { getElementById: (id) => id === message.id ? message : null };
  const win = { innerHeight: 900, scrollBy: ({ top: delta }) => { top -= delta; } };
  const anchor = captureCommunityScrollAnchor(root, win);
  top += 180;
  restoreCommunityScrollAnchor(anchor, doc, win);
  assert.equal(top, 12);
});
