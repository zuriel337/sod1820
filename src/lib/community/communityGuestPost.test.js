import test from "node:test";
import assert from "node:assert/strict";
import { COMMUNITY_GUEST_POST_KEY, clearGuestPost, normalizeGuestPost, peekGuestPost, stashGuestPost } from "./communityGuestPost.js";
import { COMMUNITY_DRAFT_CACHE } from "./communityDraft.js";

const memory = () => { const map = new Map(); return { getItem: k => map.has(k) ? map.get(k) : null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k), map }; };
const PARENT = "5a2d5b3e-1c1d-4e8f-9a0b-1234567890ab";

test("keeps a guest message for the signup and returns it once", () => {
  const storage = memory();
  assert.equal(stashGuestPost(storage, { body: "שלום קהילה", parentId: PARENT }, 1000), true);
  assert.deepEqual(peekGuestPost(storage, 2000), { version: 1, savedAt: 1000, body: "שלום קהילה", parentId: PARENT });
  storage.setItem(COMMUNITY_DRAFT_CACHE + "guest", "{}");
  clearGuestPost(storage);
  assert.equal(peekGuestPost(storage, 2000), null);
  assert.equal(storage.map.has(COMMUNITY_DRAFT_CACHE + "guest"), false);
});
test("rejects empty, oversized, expired and malformed messages", () => {
  const storage = memory();
  assert.equal(stashGuestPost(storage, { body: "   " }), false);
  assert.equal(stashGuestPost(storage, { body: "א".repeat(1501) }), false);
  assert.equal(normalizeGuestPost({ version: 1, savedAt: 0, body: "x" }, 7 * 3600000), null);
  assert.equal(normalizeGuestPost({ version: 2, savedAt: 1, body: "x" }, 2), null);
  assert.equal(normalizeGuestPost({ version: 1, savedAt: 1, body: "x", parentId: "nope" }, 2).parentId, null);
  storage.setItem(COMMUNITY_GUEST_POST_KEY, "not json");
  assert.equal(peekGuestPost(storage), null);
});
test("does not throw when storage is unavailable", () => {
  assert.equal(stashGuestPost(null, { body: "x" }), false);
  assert.equal(peekGuestPost(null), null);
  assert.doesNotThrow(() => clearGuestPost(null));
});
