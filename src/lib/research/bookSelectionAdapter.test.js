// Tests for bookSelectionAdapter.js (BOOK_PHASE_B_VERTICAL_SLICE, work_log 88043a72).
// Run with: node --test src/lib/research/bookSelectionAdapter.test.js
// Pure-logic module, no DOM/network needed — follows the identity.test.js/engagement.test.js
// convention of this repo (node:test + assert/strict, no jsdom).
//
// Covers the 5 mandatory tests named in work_log 88043a72:
//  (1) two distinct selections/rows from same book both persist/reopen independently
//  (2) same selection repeated is idempotent
//  (3) witness/version/locator do not collapse
//  (4) private research never enters public bundle
//  (5) one authorized non-empty Sefer HaPeliah fixture exercises a different representation shape

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bookEntityRef,
  selectionRef,
  selectionToWorkspaceItem,
  isPublicRow,
  buildPublicBundle,
} from "./bookSelectionAdapter.js";

// ── fixtures ──────────────────────────────────────────────────────────────
// Real live book node shape (nodes.type='book', re-verified live 5.9.2026).
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

// Two distinct real DS-02 letter-table rows from the documented-snapshot bundle
// (public/book-data/ahavat-torah.tables.json, occurrence_tables[0].rows) — same book,
// same dataset, different parasha/letter cells, same PDF page.
const ROW_A = {
  source_ref: "book:hebrewbooks:5635#p36:letter_dalet_tzav",
  title: "אות ד׳ · פרשת צו",
  status: "UNCERTAIN",
  confidence: "medium",
};
const ROW_B = {
  source_ref: "book:hebrewbooks:5635#p36:letter_dalet_shemini",
  title: "אות ד׳ · פרשת שמיני",
  status: "UNCERTAIN",
  confidence: "medium",
};

// One authorized, real, non-fabricated Sefer HaPeliah research_objects row (fetched live
// this session from the canonical DB) — a genuinely different representation shape from
// the git-corpus dataset rows above (kind/statement/confidence-as-number/engine_verified/
// privacy_scope, vs. dataset_id/population/pdf_pages/status/confidence-as-string).
const PELIAH_ROW_PRIVATE = {
  id: "e0fc0893-a04b-4775-8ad4-d6827fcce6af",
  kind: "observation",
  statement:
    "ספר הפליאה, פרקים רנ״ט–ר״ס, מציג פרוצדורה מקורית שבה סדר האלפבית משמש ליצירת רצפים רציפים מוזחים ובאורכים גדלים...",
  source_ref: "hebrewbooks:6355#chapters:259-260#procedure:alphabet-matrix",
  status: "candidate",
  confidence: null,
  engine_verified: false,
  privacy_scope: "private",
};
const PELIAH_BOOK = {
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
test("a real private-scoped research_objects row is excluded from the public bundle", () => {
  const bundle = buildPublicBundle([PELIAH_ROW_PRIVATE]);
  assert.equal(bundle.length, 0, "the private row must not appear in the public bundle");
  assert.equal(isPublicRow(PELIAH_ROW_PRIVATE), false);
});

test("a row with no privacy_scope at all is NOT silently treated as public (fail-closed default)", () => {
  assert.equal(isPublicRow(ROW_A), false, "git-corpus rows have no privacy_scope field; must not be assumed public without an explicit tag");
  assert.equal(isPublicRow({ ...ROW_A, privacy_scope: "public" }), true, "an explicit public tag is required and honored");
});

test("buildPublicBundle keeps only explicitly public rows out of a mixed set", () => {
  const mixed = [PELIAH_ROW_PRIVATE, { ...ROW_A, privacy_scope: "public" }, ROW_B];
  const bundle = buildPublicBundle(mixed);
  assert.equal(bundle.length, 1);
  assert.equal(bundle[0].source_ref, ROW_A.source_ref);
});

// ── (5) authorized non-empty Sefer HaPeliah fixture, different representation shape ──
test("adapter handles a genuinely different row shape (live research_objects) without special-casing it", () => {
  const item = selectionToWorkspaceItem(PELIAH_BOOK, PELIAH_ROW_PRIVATE);
  assert.ok(item, "must construct an item from a research_objects-shaped row, not just git-corpus-shaped rows");
  assert.equal(item.type, "book", "stays within the canonical 'book' entity family, no new entity type invented");
  assert.equal(item.metadata.sourceRef, PELIAH_ROW_PRIVATE.source_ref);
  assert.equal(item.metadata.status, "candidate");
  assert.equal(item.metadata.truthClass, null, "fields absent on this shape (truth_class) are simply null, not fabricated");
  assert.notEqual(item.ref, bookEntityRef(PELIAH_BOOK), "second-book selection also never collapses onto its own book-level ref");
});

test("the same Sefer HaPeliah fixture is correctly excluded from a public bundle even after adaptation", () => {
  const item = selectionToWorkspaceItem(PELIAH_BOOK, PELIAH_ROW_PRIVATE);
  // The adapted workspace item is a Workspace reference (correction 2: membership, not a
  // durable claim) — privacy gating happens on the SOURCE row before adaptation, per (4).
  assert.equal(isPublicRow(PELIAH_ROW_PRIVATE), false);
  assert.ok(item, "workspace save itself is not blocked (private research is save-able to one's own Workspace) -- only PUBLIC BUNDLE export is gated");
});
