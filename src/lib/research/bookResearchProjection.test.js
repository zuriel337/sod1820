// Book projection minimal-delta tests — pure logic only, no network or real private rows.
// Run with: node --test src/lib/research/bookResearchProjection.test.js
//
// SECURITY NOTE: every research/content fixture below is 100% synthetic/invented.
// Never copy a private research_objects row into a source-controlled test fixture.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pageFromSourceRef,
  parseSourceRefLocator,
  DEFAULT_BOOK_INDEX_LIMIT,
  MAX_BOOK_INDEX_LIMIT,
} from "./bookResearchProjection.js";

// --- pageFromSourceRef: unchanged contract (number|null), both legacy forms ---

test("pageFromSourceRef: legacy #pN form still resolves", () => {
  assert.equal(pageFromSourceRef("book:hebrewbooks:5635#p36:synthetic-row-a"), 36);
});

test("pageFromSourceRef: legacy #pdf:N form still resolves", () => {
  assert.equal(pageFromSourceRef("hebrewbooks:6355#pdf:24"), 24);
});

test("pageFromSourceRef: no page present resolves to null", () => {
  assert.equal(pageFromSourceRef("book:sefer-yetzirah-9perushim"), null);
  assert.equal(pageFromSourceRef(null), null);
  assert.equal(pageFromSourceRef(""), null);
});

// --- parseSourceRefLocator: additive superset, never breaks pageFromSourceRef's contract ---

test("parseSourceRefLocator: rich multi-segment locator (Sefer Yetzirah shape)", () => {
  const ref = "book:sefer-yetzirah-9perushim#p140:chachmoni_treatise:part2:ch3:olam_shana_nefesh";
  const parsed = parseSourceRefLocator(ref);
  assert.equal(parsed.page, 140);
  assert.deepEqual(parsed.segments, ["chachmoni_treatise", "part2", "ch3", "olam_shana_nefesh"]);
  assert.equal(parsed.zone, "chachmoni_treatise");
  assert.equal(parsed.work, "part2");
  assert.equal(parsed.sublocator, "ch3:olam_shana_nefesh");
});

test("parseSourceRefLocator: single-segment locator (Ahavat Torah shape) leaves sublocator null", () => {
  const parsed = parseSourceRefLocator("book:hebrewbooks:5635#p1:title");
  assert.equal(parsed.page, 1);
  assert.deepEqual(parsed.segments, ["title"]);
  assert.equal(parsed.zone, "title");
  assert.equal(parsed.work, null);
  assert.equal(parsed.sublocator, null);
});

test("parseSourceRefLocator: two-segment locator has zone+work but no sublocator", () => {
  const parsed = parseSourceRefLocator("book:hebrewbooks:6355#p42:region:table");
  assert.equal(parsed.page, 42);
  assert.deepEqual(parsed.segments, ["region", "table"]);
  assert.equal(parsed.zone, "region");
  assert.equal(parsed.work, "table");
  assert.equal(parsed.sublocator, null);
});

test("parseSourceRefLocator: legacy #pdf:N form has a resolved page but no segments", () => {
  const parsed = parseSourceRefLocator("hebrewbooks:6355#pdf:24");
  assert.equal(parsed.page, 24);
  assert.deepEqual(parsed.segments, []);
  assert.equal(parsed.zone, null);
  assert.equal(parsed.work, null);
  assert.equal(parsed.sublocator, null);
});

test("parseSourceRefLocator: no source_ref at all resolves to all-null/empty, never throws", () => {
  const parsed = parseSourceRefLocator(null);
  assert.equal(parsed.page, null);
  assert.deepEqual(parsed.segments, []);
  assert.equal(parsed.zone, null);
  assert.equal(parsed.work, null);
  assert.equal(parsed.sublocator, null);
});

test("parseSourceRefLocator: page agrees with pageFromSourceRef for every form above", () => {
  const refs = [
    "book:hebrewbooks:5635#p36:synthetic-row-a",
    "hebrewbooks:6355#pdf:24",
    "book:sefer-yetzirah-9perushim#p140:chachmoni_treatise:part2:ch3:olam_shana_nefesh",
    "book:hebrewbooks:5635#p1:title",
    null,
    "",
  ];
  for (const ref of refs) {
    assert.equal(parseSourceRefLocator(ref).page, pageFromSourceRef(ref));
  }
});

// --- fetchBookEntities bounding: constants + clamping math, no live Supabase call needed ---

test("DEFAULT_BOOK_INDEX_LIMIT/MAX_BOOK_INDEX_LIMIT are sane and ordered", () => {
  assert.equal(typeof DEFAULT_BOOK_INDEX_LIMIT, "number");
  assert.equal(typeof MAX_BOOK_INDEX_LIMIT, "number");
  assert.ok(DEFAULT_BOOK_INDEX_LIMIT > 0);
  assert.ok(MAX_BOOK_INDEX_LIMIT >= DEFAULT_BOOK_INDEX_LIMIT);
  // Current live Book count (3) must comfortably fit under the default with no args passed —
  // this is the backward-compatibility guarantee: fetchBookEntities() with no args still
  // returns every current Book.
  assert.ok(DEFAULT_BOOK_INDEX_LIMIT >= 3);
});

// Mirrors the exact clamp expression inside fetchBookEntities(), kept in sync deliberately:
// a pure function under test is preferable, but this guardrail is intentionally tiny and
// duplicating it here (rather than exporting an internal) avoids growing the public API for
// a single scale guardrail. If the clamp expression in bookResearchProjection.js changes,
// update this mirror in the same commit.
function clampLimit(limit) {
  return Math.max(1, Math.min(Number(limit) || DEFAULT_BOOK_INDEX_LIMIT, MAX_BOOK_INDEX_LIMIT));
}

test("fetchBookEntities clamp: absent/invalid limit falls back to default", () => {
  assert.equal(clampLimit(undefined), DEFAULT_BOOK_INDEX_LIMIT);
  assert.equal(clampLimit(NaN), DEFAULT_BOOK_INDEX_LIMIT);
  assert.equal(clampLimit(0), DEFAULT_BOOK_INDEX_LIMIT);
});

test("fetchBookEntities clamp: over-large limit is capped at MAX_BOOK_INDEX_LIMIT", () => {
  assert.equal(clampLimit(999999), MAX_BOOK_INDEX_LIMIT);
});

test("fetchBookEntities clamp: small positive limit passes through unchanged", () => {
  assert.equal(clampLimit(5), 5);
});
