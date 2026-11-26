// The three publication tiers as the interface shows them must equal the tiers the database enforces (supabase/proposed/els-publication-tiers-20261126).
import test from "node:test";
import assert from "node:assert/strict";
import { cipherTier } from "../src/lib/elsSavedMatrix.js";

const t = row => cipherTier(row).key;
test("tier of every stored state, for members and administrators alike", () => {
  assert.equal(t({ status: "draft", visibility: "private", self_published: false }), "private");
  // the legacy leak tuple is private for everyone: the policy and the interface agree
  assert.equal(t({ status: "draft", visibility: "private", self_published: true }), "private");
  assert.equal(t({ status: "pending", visibility: "private", self_published: false }), "private");
  assert.equal(t({ status: "draft", visibility: "public", self_published: true }), "page");
  assert.equal(t({ status: "pending", visibility: "public", self_published: true }), "requested");
  assert.equal(t({ status: "published", visibility: "public", self_published: false }), "library");
  assert.equal(t({ status: "published", visibility: "public", self_published: true }), "library");
  // an administrator's own public save is published directly (the administrator is the approver): it reads as library, never as a request
  assert.equal(t({ status: "published", visibility: "public", self_published: true, owner_user_id: "admin" }), "library");
  assert.equal(t({ status: "hidden", visibility: "public", self_published: true }), "page");
});
