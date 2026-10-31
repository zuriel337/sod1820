import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  PUBLIC_POST_SUPPRESSED_TAGS,
  POST_2029_ONLY_RELEASE_TAG,
  publicPostOnlyFilter,
  hasSuppressedPublicPostTag,
  isPost2029OnlyReleased,
} from "../src/lib/research/publicPostBoundary.js";

const legacy = readFileSync(new URL("../src/lib/supabase.js", import.meta.url), "utf8");
const reader = readFileSync(new URL("../src/lib/research/post2029ReadingProjection.js", import.meta.url), "utf8");

test("2029-only visibility requires explicit release marker PLUS legacy draft", () => {
  const base = { id: 5130, slug: "mivchan-acharon-lifney-hapriza-dim5-20261031", home_hidden: true };
  assert.deepEqual(PUBLIC_POST_SUPPRESSED_TAGS, ["טיוטה", "פורום"]);
  assert.equal(POST_2029_ONLY_RELEASE_TAG, "2029-only-live");
  assert.equal(isPost2029OnlyReleased({ ...base, tags: ["מימד חמש", "טיוטה"] }), false);
  assert.equal(hasSuppressedPublicPostTag({ ...base, tags: ["טיוטה"] }), true);
  assert.equal(isPost2029OnlyReleased({ ...base, tags: ["מימד חמש", "טיוטה", "2029-only-live"] }), true);
  assert.equal(hasSuppressedPublicPostTag({ ...base, tags: ["מימד חמש", "טיוטה", "2029-only-live"] }), false);
  assert.equal(hasSuppressedPublicPostTag({ ...base, tags: ["טיוטה", "פורום", "2029-only-live"] }), true);
});

test("2029 query requires marked draft AND hidden Legacy home while public admission remains intact", () => {
  const filter = publicPostOnlyFilter();
  assert.ok(filter.includes("tags.not.ov.{טיוטה,פורום}"));
  assert.ok(filter.includes("and(tags.cs.{טיוטה,2029-only-live},tags.not.ov.{פורום},home_hidden.eq.true)"));
});

test("Legacy still excludes drafts from public posts and Dimension Five feed", () => {
  assert.ok(legacy.includes(".not('tags', 'cs', '{טיוטה}')"));
  assert.ok(legacy.includes('(p.tags || []).includes("טיוטה")'));
  assert.ok(!legacy.includes("2029-only-live"));
});

test("2029 reading is not draft after marked 2029-only release, with separate private stage gate", () => {
  assert.ok(reader.includes('import { isPost2029OnlyReleased } from "./publicPostBoundary.js"'));
  assert.ok(reader.includes('post._privateStage === true || (Array.isArray(post.tags) && post.tags.includes("טיוטה") && !isPost2029OnlyReleased(post))'));
});
