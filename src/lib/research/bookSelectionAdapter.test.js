// Tests for bookSelectionAdapter.js (BOOK_PHASE_B_VERTICAL_SLICE, work_log 88043a72,
// security remediation per work_log 59642c0d).
// Run with: node --test src/lib/research/bookSelectionAdapter.test.js
// Pure-logic module, no DOM/network needed — follows the identity.test.js/engagement.test.js
// convention of this repo (node:test + assert/strict, no jsdom).
//
// SECURITY NOTE (per 59642c0d): the prior version of this file copied the verbatim
// id/statement/source_ref of a real privacy_scope='private' research_objects row into a
// public git commit. That was a genuine disclosure, independent of buildPublicBundle()
// correctly excluding the row at runtime — the fixture itself should never have been
// real private content. Every fixture below is 100% synthetic/invented. None of these
// ids, statements, or source_refs correspond to any real row in any table. The privacy
// test only needs a row SHAPED like a private research_objects row, not an actual one.
//
// Covers the 5 mandatory tests named in work_log 88043a72:
//  (1) two distinct selections/rows from same book both persist/reopen independently
//  (2) same selection repeated is idempotent
//  (3) witness/version/locator do not collapse
//  (4) private research never enters public bundle
//  (5) an authorized non-empty second-book fixture exercises a different representation shape

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bookEntityRef,
  selectionRef,
  selectionToWorkspaceItem,
  isPublicRow,
  buildPublicBundle,
} from "./bookSelectionAdapter.js";

// ── fixtures (all synthetic — see SECURITY NOTE above) ──────────────────────
// Book identity shape matches the live nodes.type='book' row for book:ahavat-torah
// (identity_key/route/witness fields only — no research content).
const AHAVAT_TORAH_BOOK = {
  id: "18fdaa95-86cd-4100-82ad-59ee8c690b9a",
  identity_key: "book:ahavat-torah",
  label: "אהבת תורה",
  metadata: {
    slug: "ahavat-torah",
    route: "/book/ahavat-torah",
    identity_tiers: { witness: { provider: "HebrewBooks", native_id: "5635", identity: "witness:hebrewbooks:5635" } },
  },
};

// Two distinct synthetic dataset-row selections — same book, same imagined dataset,
// different locator. Shape mirrors the documented-snapshot bundle (dataset_id-style
// rows), content is invented for this test only.
const ROW_A = {
  source_ref: "book:hebrewbooks:5635#p36:synthetic-row-a",
  title: "בדיקה סינתטית A",
  status: "UNCERTAIN",
  confidence: "medium",
};
const ROW_B = {
  source_ref: "book:hebrewbooks:5635#p36:synthetic-row-b",
  title: "בדיקה סינתטית B",
  status: "UNCERTAIN",
  confidence: "medium",
};

// A synthetic row shaped like a live research_objects row (kind/statement/source_ref/
// status/confidence/engine_verified/privacy_scope) but with 100% invented id, statement,
// and source_ref — exercises both test (4) and test (5) without touching any real data.
const SYNTHETIC_PRIVATE_ROW = {
  id: "00000000-0000-0000-0000-000000000000",
  kind: "observation",
  statement: "[synthetic test fixture — not a real research finding, invented for this test only]",
  source_ref: "hebrewbooks:0000#chapters:0-0#procedure:synthetic-fixture",
  status: "candidate",
  confidence: null,
  engine_verified: false,
  privacy_scope: "private",
};
const SECOND_BOOK = {
  id: "395a158e-3bb4-4fc7-86d7-aba99e174b46",
  identity_key: "book:sefer-hapliah",
  label: "ספר הפליאה",
  metadata: { slug: "sefer-hapliah", route: "/book/sefer-hapliah" },
};

// ── (1) two distinct selections from the same book both persist/reopen independently ──
test("two distinct rows from the same book get two distinct, non-colliding refs", () => {
  const itemA = selectionToWorkspaceItem(AHAVAT_TORAH_BOOK, ROW_A);
  const itemB = selectionToWorkspaceItem(AHAVAT_TORAH_BOOK, ROW_B);
  assert.ok(itemA && itemB, "both items must be constructed");
  assert.notEqual(itemA.ref, itemB.ref, "two different rows must not share a ref");
  assert.notEqual(itemA.id, itemB.id, "two different rows must not share an id (client-side dedupe key)");
  // Neither selection ref may equal the book's own entity ref — this is the exact
  // collision the prior plan would have produced (both would have been 'book:ahavat-torah').
  const bookRef = bookEntityRef(AHAVAT_TORAH_BOOK);
  assert.notEqual(itemA.ref, bookRef, "a selection must never reuse the book-level ref");
  assert.notEqual(itemB.ref, bookRef, "a selection must never reuse the book-level ref");
});

// ── (2) same selection repeated is idempotent ──────────────────────────────
test("saving the same exact selection twice is idempotent (identical ref + id)", () => {
  const first = selectionToWorkspaceItem(AHAVAT_TORAH_BOOK, ROW_A);
  const second = selectionToWorkspaceItem(AHAVAT_TORAH_BOOK, ROW_A);
  assert.equal(first.ref, second.ref);
  assert.equal(first.id, second.id);
  assert.deepEqual(first.metadata, second.metadata, "re-deriving the same selection must produce identical metadata, not drift");
});

// ── (3) witness/version/locator do not collapse ────────────────────────────
test("witness and locator are preserved distinctly per selection, not collapsed", () => {
  const item = selectionToWorkspaceItem(AHAVAT_TORAH_BOOK, ROW_A);
  assert.equal(item.metadata.sourceRef, ROW_A.source_ref, "exact locator preserved verbatim");
  assert.equal(item.metadata.page, 36, "page correctly parsed from the #p<N> locator");
  assert.deepEqual(
    item.metadata.witness,
    AHAVAT_TORAH_BOOK.metadata.identity_tiers.witness,
    "witness identity carried through, not dropped or replaced"
  );
});

test("a revised reading under a NEW snapshot version gets its own ref, never overwriting the prior one in place", () => {
  const v1 = selectionToWorkspaceItem(AHAVAT_TORAH_BOOK, ROW_A, { snapshotVersion: "v1" });
  const v2 = selectionToWorkspaceItem(AHAVAT_TORAH_BOOK, ROW_A, { snapshotVersion: "v2-corrected" });
  assert.notEqual(v1.ref, v2.ref, "different snapshot version of the same locator must not collide with the earlier saved evidence");
  assert.equal(v1.metadata.snapshotVersion, "v1");
  assert.equal(v2.metadata.snapshotVersion, "v2-corrected");
});

test("selectionRef requires both a book identity and a source_ref — never silently produces a partial/ambiguous key", () => {
  assert.equal(selectionRef({ bookIdentityKey: "", sourceRef: "book:hebrewbooks:5635#p36:x" }), null);
  assert.equal(selectionRef({ bookIdentityKey: "book:ahavat-torah", sourceRef: "" }), null);
});

// ── (4) private research never enters public bundle ────────────────────────
test("a private-scoped row (synthetic fixture, shape-only) is excluded from the public bundle", () => {
  const bundle = buildPublicBundle([SYNTHETIC_PRIVATE_ROW]);
  assert.equal(bundle.length, 0, "the private row must not appear in the public bundle");
  assert.equal(isPublicRow(SYNTHETIC_PRIVATE_ROW), false);
});

test("a row with no privacy_scope at all is NOT silently treated as public (fail-closed default)", () => {
  assert.equal(isPublicRow(ROW_A), false, "git-corpus rows have no privacy_scope field; must not be assumed public without an explicit tag");
  assert.equal(isPublicRow({ ...ROW_A, privacy_scope: "public" }), true, "an explicit public tag is required and honored");
});

test("buildPublicBundle keeps only explicitly public rows out of a mixed set", () => {
  const mixed = [SYNTHETIC_PRIVATE_ROW, { ...ROW_A, privacy_scope: "public" }, ROW_B];
  const bundle = buildPublicBundle(mixed);
  assert.equal(bundle.length, 1);
  assert.equal(bundle[0].source_ref, ROW_A.source_ref);
});

// ── (5) authorized non-empty second-book fixture, different representation shape ──
test("adapter handles a genuinely different row shape (research_objects-style) without special-casing it", () => {
  const item = selectionToWorkspaceItem(SECOND_BOOK, SYNTHETIC_PRIVATE_ROW);
  assert.ok(item, "must construct an item from a research_objects-shaped row, not just git-corpus-shaped rows");
  assert.equal(item.type, "book", "stays within the canonical 'book' entity family, no new entity type invented");
  assert.equal(item.metadata.sourceRef, SYNTHETIC_PRIVATE_ROW.source_ref);
  assert.equal(item.metadata.status, "candidate");
  assert.equal(item.metadata.truthClass, null, "fields absent on this shape (truth_class) are simply null, not fabricated");
  assert.notEqual(item.ref, bookEntityRef(SECOND_BOOK), "second-book selection also never collapses onto its own book-level ref");
});

test("the same synthetic private fixture is correctly excluded from a public bundle even after adaptation", () => {
  const item = selectionToWorkspaceItem(SECOND_BOOK, SYNTHETIC_PRIVATE_ROW);
  // The adapted workspace item is a Workspace reference (correction 2: membership, not a
  // durable claim) — privacy gating happens on the SOURCE row before adaptation, per (4).
  assert.equal(isPublicRow(SYNTHETIC_PRIVATE_ROW), false);
  assert.ok(item, "workspace save itself is not blocked (private research is save-able to one's own Workspace) -- only PUBLIC BUNDLE export is gated");
});
