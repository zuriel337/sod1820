import test from "node:test";
import assert from "node:assert/strict";
import { getThreadSeenAt, isNewReply, markThreadSeen, repliesAuthorSummary } from "../src/lib/community/threadSeen2029.js";

const store = new Map();
globalThis.window = { localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) } };

test("first visit marks nothing; mark then read round-trips", () => {
  assert.equal(getThreadSeenAt("t1"), null);
  assert.equal(isNewReply({ createdAt: "2026-11-12T10:00:00Z" }, null, null), false);
  markThreadSeen("t1", "2026-11-12T09:00:00.000Z");
  assert.equal(getThreadSeenAt("t1"), "2026-11-12T09:00:00.000Z");
});

test("only replies newer than the last visit and not written by the reader are new", () => {
  const seen = "2026-11-12T09:00:00.000Z";
  assert.equal(isNewReply({ createdAt: "2026-11-12T10:00:00Z", authorUserId: "a" }, seen, "me"), true);
  assert.equal(isNewReply({ createdAt: "2026-11-12T08:00:00Z", authorUserId: "a" }, seen, "me"), false);
  assert.equal(isNewReply({ createdAt: "2026-11-12T10:00:00Z", authorUserId: "me" }, seen, "me"), false);
});

test("storage failures never throw", () => {
  globalThis.window = { localStorage: { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } } };
  assert.equal(getThreadSeenAt("x"), null);
  assert.doesNotThrow(() => markThreadSeen("x"));
});

test("author summary for the collapsed thread", () => {
  assert.equal(repliesAuthorSummary([]), "");
  assert.equal(repliesAuthorSummary([{ authorName: "אמילי" }]), "אמילי");
  assert.equal(repliesAuthorSummary([{ authorName: "אמילי" }, { authorName: "דני" }]), "אמילי ודני");
  assert.equal(repliesAuthorSummary([{ authorName: "א" }, { authorName: "ב" }, { authorName: "ג" }, { authorName: "ד" }]), "א, ב ועוד 2");
});
