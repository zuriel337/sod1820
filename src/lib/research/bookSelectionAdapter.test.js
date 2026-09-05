// Book portability tests — pure identity/projection logic, no network or real private rows.
// Run with: node --test src/lib/research/bookSelectionAdapter.test.js
//
// SECURITY NOTE: every research/content fixture below is 100% synthetic/invented.
// Never copy a private research_objects row into a source-controlled test fixture.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bookEntityRef,
  bookSourceRefPrefix,
  dossierSelectionSourceRef,
  selectionRef,
  selectionToWorkspaceItem,
  isPublicRow,
  buildPublicBundle,
} from "./bookSelectionAdapter.js";
import {
  DEFAULT_BOOK_RESEARCH_LIMIT,
  researchRowToBookRepresentation,
  researchRowToWorkspaceItem,
  applyFocusRow,
  deriveBookConnections,
  bookContextPatch,
  hasUnresolvedBookSeeds,
} from "./bookResearchProjection.js";

// Public Book identity metadata only — no research content.
const AHAVAT_TORAH_BOOK = {
  id: "18fdaa95-86cd-4100-82ad-59ee8c690b9a",
  identity_key: "book:ahavat-torah",
  label: "אהבת תורה",
  metadata: {
    slug: "ahavat-torah",
    route: "/book/ahavat-torah",
    source_ref_prefixes: ["book:hebrewbooks:5635", "hebrewbooks:5635"],
    identity_tiers: {
      witness: { provider: "HebrewBooks", native_id: "5635", identity: "witness:hebrewbooks:5635" },
      locator: { pattern: "book:hebrewbooks:5635#p<PDF_PAGE>:<BLOCK_ID>" },
    },
  },
};

const SECOND_BOOK = {
  id: "395a158e-3bb4-4fc7-86d7-aba99e174b46",
  identity_key: "book:sefer-hapliah",
  label: "ספר הפליאה",
  metadata: {
    slug: "sefer-hapliah",
    route: "/book/sefer-hapliah",
    source_ref_prefixes: ["hebrewbooks:6355", "book:hebrewbooks:6355"],
    identity_tiers: {
      witness: { provider: "HebrewBooks", native_id: "6355", identity: "witness:hebrewbooks:6355" },
      locator: { pattern: "hebrewbooks:6355#p<PDF_PAGE>:<REGION>" },
    },
  },
};

const ROW_A = {
  source_ref: "book:hebrewbooks:5635#p36:synthetic-row-a",
  title: "בדיקה סינתטית A",
  status: "candidate",
  confidence: "medium",
};
const ROW_B = {
  source_ref: "book:hebrewbooks:5635#p36:synthetic-row-b",
  title: "בדיקה סינתטית B",
  status: "candidate",
  confidence: "medium",
};

const SYNTHETIC_PRIVATE_ROW = {
  id: "00000000-0000-0000-0000-000000000000",
  kind: "observation",
  statement: "[synthetic test fixture — invented, not a real research finding]",
  source_ref: "book:hebrewbooks:6355#p24:synthetic-private",
  status: "candidate",
  confidence: null,
  engine_verified: false,
  engine_detail: { verification_state: "not_tested" },
  privacy_scope: "private",
};

const SYNTHETIC_MATRIX_ROW = {
  ...SYNTHETIC_PRIVATE_ROW,
  id: "10000000-0000-0000-0000-000000000001",
  source_ref: "book:hebrewbooks:6355#p31:synthetic-matrix",
  statement: "[synthetic matrix representation]",
  matrix: [["A1", "A2"], ["B1", "B2"]],
};
const SYNTHETIC_PROCEDURE_ROW = {
  ...SYNTHETIC_PRIVATE_ROW,
  id: "10000000-0000-0000-0000-000000000002",
  source_ref: "book:hebrewbooks:6355#p32:synthetic-procedure",
  statement: "[synthetic procedure representation]",
  meta: { ext: { procedure: { steps: [{ operation: "synthetic-transform" }, { operation: "synthetic-project" }] } } },
};
const SYNTHETIC_COMPOSITION_ROW = {
  ...SYNTHETIC_PRIVATE_ROW,
  id: "10000000-0000-0000-0000-000000000003",
  source_ref: "book:hebrewbooks:6355#p33:synthetic-composition",
  statement: "[synthetic composition representation]",
  generated: ["synthetic-output-a", "synthetic-output-b"],
};

// ── stable identity / idempotence ──────────────────────────────────────────
test("two distinct rows from the same book get distinct non-colliding refs", () => {
  const itemA = selectionToWorkspaceItem(AHAVAT_TORAH_BOOK, ROW_A);
  const itemB = selectionToWorkspaceItem(AHAVAT_TORAH_BOOK, ROW_B);
  assert.ok(itemA && itemB);
  assert.notEqual(itemA.ref, itemB.ref);
  assert.notEqual(itemA.ref, bookEntityRef(AHAVAT_TORAH_BOOK));
  assert.notEqual(itemB.ref, bookEntityRef(AHAVAT_TORAH_BOOK));
});

test("saving the same exact selection twice is idempotent", () => {
  const first = selectionToWorkspaceItem(AHAVAT_TORAH_BOOK, ROW_A);
  const second = selectionToWorkspaceItem(AHAVAT_TORAH_BOOK, ROW_A);
  assert.equal(first.ref, second.ref);
  assert.equal(first.id, second.id);
  assert.deepEqual(first.metadata, second.metadata);
  assert.equal(first.link, second.link);
});

test("a revised reading under a new snapshot version gets a new ref", () => {
  const v1 = selectionToWorkspaceItem(AHAVAT_TORAH_BOOK, ROW_A, { snapshotVersion: "v1" });
  const v2 = selectionToWorkspaceItem(AHAVAT_TORAH_BOOK, ROW_A, { snapshotVersion: "v2-corrected" });
  assert.notEqual(v1.ref, v2.ref);
  assert.equal(v1.metadata.snapshotVersion, "v1");
  assert.equal(v2.metadata.snapshotVersion, "v2-corrected");
});

test("selectionRef fails closed without both Book identity and locator", () => {
  assert.equal(selectionRef({ bookIdentityKey: "", sourceRef: "book:hebrewbooks:5635#p36:x" }), null);
  assert.equal(selectionRef({ bookIdentityKey: "book:ahavat-torah", sourceRef: "" }), null);
});

// ── second-book locator portability ────────────────────────────────────────
test("Book source prefix is derived from identity metadata, not hardcoded to Ahavat Torah", () => {
  assert.equal(bookSourceRefPrefix(AHAVAT_TORAH_BOOK), "book:hebrewbooks:5635");
  assert.equal(bookSourceRefPrefix(SECOND_BOOK), "book:hebrewbooks:6355");
});

test("Peli'ah dossier selection derives 6355 and never leaks the 5635 witness namespace", () => {
  const syntheticRow = { representation_id: "REP-SYNTH-1", pdf_pages: [168] };
  const ref = dossierSelectionSourceRef(SECOND_BOOK, syntheticRow, "representation_id");
  assert.equal(ref, "book:hebrewbooks:6355#p168:REP-SYNTH-1");
  assert.equal(ref.includes("5635"), false);
});

test("two second-book dossier selections remain distinct and parent Book remains separate", () => {
  const a = dossierSelectionSourceRef(SECOND_BOOK, { procedure_id: "PROC-A", pdf_page: 24 }, "procedure_id");
  const b = dossierSelectionSourceRef(SECOND_BOOK, { procedure_id: "PROC-B", pdf_page: 24 }, "procedure_id");
  const itemA = selectionToWorkspaceItem(SECOND_BOOK, { source_ref: a, title: "synthetic A" });
  const itemB = selectionToWorkspaceItem(SECOND_BOOK, { source_ref: b, title: "synthetic B" });
  assert.notEqual(itemA.ref, itemB.ref);
  assert.notEqual(itemA.ref, bookEntityRef(SECOND_BOOK));
  assert.notEqual(itemB.ref, bookEntityRef(SECOND_BOOK));
});

test("selection URL exactly reopens tab, source page and stable selection identity", () => {
  const item = selectionToWorkspaceItem(SECOND_BOOK, {
    source_ref: "book:hebrewbooks:6355#p168:synthetic-depth",
    title: "synthetic exact reopen",
  });
  const url = new URL(item.link, "https://example.test");
  assert.equal(url.pathname, "/book/sefer-hapliah");
  assert.equal(url.searchParams.get("tab"), "dossier");
  assert.equal(url.searchParams.get("page"), "168");
  assert.equal(url.searchParams.get("selection"), item.ref);
  assert.equal(url.hash, "#selection");
});

// ── truth-axis independence ────────────────────────────────────────────────
test("witness, governance, engine, access and publication axes remain independent", () => {
  const item = selectionToWorkspaceItem(SECOND_BOOK, {
    source_ref: "book:hebrewbooks:6355#p168:synthetic-ambiguous",
    title: "synthetic ambiguous witness",
    status: "candidate",
    engine_verified: true,
    engine_detail: { verification_state: "match" },
    witness_state: "STILL AMBIGUOUS",
    privacy_scope: "private",
    publication_state: null,
  });
  assert.equal(item.metadata.status, "candidate");
  assert.equal(item.metadata.engineVerified, true);
  assert.equal(item.metadata.engineVerificationState, "match");
  assert.equal(item.metadata.witnessState, "STILL AMBIGUOUS");
  assert.equal(item.metadata.privacyScope, "private");
  assert.equal(item.metadata.publicationState, null);
});

test("missing truth/access state stays null instead of inheriting a default", () => {
  const item = selectionToWorkspaceItem(SECOND_BOOK, {
    source_ref: "book:hebrewbooks:6355#p40:synthetic-unknown",
    title: "synthetic unknown axes",
  });
  assert.equal(item.metadata.status, null);
  assert.equal(item.metadata.engineVerified, null);
  assert.equal(item.metadata.engineVerificationState, null);
  assert.equal(item.metadata.witnessState, null);
  assert.equal(item.metadata.privacyScope, null);
  assert.equal(item.metadata.publicationState, null);
});

// ── privacy fail-closed ────────────────────────────────────────────────────
test("a private-shaped synthetic row is excluded from the public bundle", () => {
  const bundle = buildPublicBundle([SYNTHETIC_PRIVATE_ROW]);
  assert.equal(bundle.length, 0);
  assert.equal(isPublicRow(SYNTHETIC_PRIVATE_ROW), false);
});

test("a row with no privacy_scope is never silently treated as public", () => {
  assert.equal(isPublicRow(ROW_A), false);
  assert.equal(isPublicRow({ ...ROW_A, privacy_scope: "public" }), true);
});

test("buildPublicBundle keeps only explicitly public rows from a mixed set", () => {
  const mixed = [SYNTHETIC_PRIVATE_ROW, { ...ROW_A, privacy_scope: "public" }, ROW_B];
  const bundle = buildPublicBundle(mixed);
  assert.equal(bundle.length, 1);
  assert.equal(bundle[0].source_ref, ROW_A.source_ref);
});

test("engine verification never makes a private candidate public", () => {
  const row = { ...SYNTHETIC_PRIVATE_ROW, engine_verified: true, engine_detail: { verification_state: "match" } };
  assert.equal(isPublicRow(row), false);
  assert.equal(buildPublicBundle([row]).length, 0);
});

// ── representation stress test: same Book contract, different shapes ──────
test("same representation adapter renders matrix, procedure and composition shapes", () => {
  const matrix = researchRowToBookRepresentation(SYNTHETIC_MATRIX_ROW);
  const procedure = researchRowToBookRepresentation(SYNTHETIC_PROCEDURE_ROW);
  const composition = researchRowToBookRepresentation(SYNTHETIC_COMPOSITION_ROW);
  assert.equal(matrix.shape, "matrix");
  assert.equal(matrix.matrix.length, 2);
  assert.equal(procedure.shape, "procedure");
  assert.equal(procedure.steps.length, 2);
  assert.equal(composition.shape, "composition");
  assert.equal(composition.generated.length, 2);
  for (const rep of [matrix, procedure, composition]) {
    assert.equal(rep.status, "candidate");
    assert.equal(rep.privacyScope, "private");
  }
});

test("authorized private research-object shape can be saved to own Workspace without becoming public", () => {
  const item = selectionToWorkspaceItem(SECOND_BOOK, SYNTHETIC_PRIVATE_ROW, { tab: "research" });
  assert.ok(item);
  assert.equal(item.type, "book");
  assert.equal(item.metadata.sourceRef, SYNTHETIC_PRIVATE_ROW.source_ref);
  assert.equal(item.metadata.status, "candidate");
  assert.equal(item.metadata.privacyScope, "private");
  assert.notEqual(item.ref, bookEntityRef(SECOND_BOOK));
  assert.equal(isPublicRow(SYNTHETIC_PRIVATE_ROW), false);
});

// ── exact research reopen + bounded scale ─────────────────────────────────
test("live research Workspace link addresses exact research selection, not only parent Book/page", () => {
  const item = researchRowToWorkspaceItem(SYNTHETIC_PRIVATE_ROW, SECOND_BOOK);
  const url = new URL(item.link, "https://example.test");
  assert.equal(url.pathname, "/book/sefer-hapliah");
  assert.equal(url.searchParams.get("tab"), "research");
  assert.equal(url.searchParams.get("research"), SYNTHETIC_PRIVATE_ROW.id);
  assert.equal(url.searchParams.get("page"), "24");
  assert.equal(url.hash, "#research-selection");
  assert.equal(item.metadata.privacyScope, "private");
});

test("default Book research projection is bounded below the current 42-row Peli'ah corpus", () => {
  assert.equal(DEFAULT_BOOK_RESEARCH_LIMIT, 24);
  assert.ok(DEFAULT_BOOK_RESEARCH_LIMIT < 42, "default Book page must not client-dump the entire 42-row private research corpus");
});

// ── exact reopen fold-in (finite fix for the FAIL_EXACT_REOPEN_STOP release blocker) ──
test("exact reopen: a focus row already inside the current bounded batch is recognized in place, not duplicated", () => {
  const inBatch = { id: "row-in-batch", source_ref: "hebrewbooks:6355#p1" };
  const rows = [inBatch, { id: "row-other", source_ref: "hebrewbooks:6355#p2" }];
  const byId = new Map(rows.map(r => [r.id, r]));
  const result = applyFocusRow(rows, byId, "row-in-batch", ["hebrewbooks:6355"], null);
  assert.equal(result.focusIncluded, true);
  assert.equal(result.rows.length, 2, "must not duplicate a row that is already in the batch");
});

test("exact reopen: a row aged outside the default batch is folded in via targeted fetch-by-id", () => {
  const rows = [{ id: "row-recent", source_ref: "hebrewbooks:6355#p1" }];
  const byId = new Map(rows.map(r => [r.id, r]));
  const agedFocusRow = { id: "row-aged-out", source_ref: "hebrewbooks:6355#p99" };
  const result = applyFocusRow(rows, byId, "row-aged-out", ["hebrewbooks:6355"], agedFocusRow);
  assert.equal(result.focusIncluded, true);
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0].id, "row-aged-out", "the exact-reopened row must render, not just the default page");
});

test("exact reopen fold-in fails closed: a fetched row that does not belong to this Book's witness prefixes is never folded in", () => {
  const rows = [{ id: "row-recent", source_ref: "hebrewbooks:6355#p1" }];
  const byId = new Map(rows.map(r => [r.id, r]));
  // Simulates an id belonging to a DIFFERENT book (e.g. Ahavat Torah, 5635) or any
  // unrelated row — must not leak across Book boundaries just because a URL guessed an id.
  const foreignRow = { id: "row-foreign", source_ref: "book:hebrewbooks:5635#p6" };
  const result = applyFocusRow(rows, byId, "row-foreign", ["hebrewbooks:6355"], foreignRow);
  assert.equal(result.focusIncluded, false);
  assert.equal(result.rows.length, 1, "a foreign-prefix row must never be folded into this Book's rendered rows");
});

test("exact reopen fold-in is a no-op with no focusId", () => {
  const rows = [{ id: "row-a", source_ref: "hebrewbooks:6355#p1" }];
  const result = applyFocusRow(rows, new Map(), "", ["hebrewbooks:6355"], null);
  assert.equal(result.focusIncluded, false);
  assert.equal(result.rows, rows);
});

// ── Book Experience + Research Context bridge (Book Experience v1) ───────────────────

test("connection projection: only curated number-family seeds resolve to /number/:n, never arbitrary text", () => {
  const snap = {
    seeds: [
      { key: "1820", label: "משפחת 1820", family: "number-family", status: "documented" },
      { key: "1830", label: "משפחת 1830", family: "number-family", status: "documented" },
      { key: "ds02", label: "DS-02 · אותיות × פרשה", family: "dataset", status: "partial" },
      { key: "klal", label: "כלל / קדמי / ריבוע", family: "operator", status: "partial" },
    ],
  };
  const connections = deriveBookConnections(snap);
  assert.equal(connections.length, 2, "only the two number-family seeds resolve — dataset/operator seeds are not numeric routes");
  assert.deepEqual(connections.map(c => c.href), ["/number/1820", "/number/1830"]);
  assert.ok(connections.every(c => /^\/number\/\d+$/.test(c.href)), "every connection must resolve to the existing universal /number/:n route, never a fabricated one");
});

test("connection projection is empty (not fabricated) when a Book has no curated number-family seeds", () => {
  const snap = { seeds: [{ key: "grammar", label: "Research Grammar", family: "procedure", status: "supported" }] };
  assert.deepEqual(deriveBookConnections(snap), []);
  assert.deepEqual(deriveBookConnections(null), []);
  assert.deepEqual(deriveBookConnections(undefined), []);
});

test("Research Context Golden Case A: fresh entry with no active root establishes the Book as subject and selection", () => {
  const patch = bookContextPatch({ book: SECOND_BOOK, slug: "sefer-hapliah", hasRoot: false, focusSelection: null });
  assert.equal(patch.subject.id, "book:sefer-hapliah");
  assert.equal(patch.subject.type, "book");
  assert.equal(patch.subject.href, "/book/sefer-hapliah");
  assert.equal(patch.selection.entityId, "book:sefer-hapliah");
  assert.equal(patch.lens, "book");
});

test("Research Context Golden Case C: an existing root stays sticky — the Book patch never carries a subject", () => {
  const patch = bookContextPatch({ book: SECOND_BOOK, slug: "sefer-hapliah", hasRoot: true, focusSelection: null });
  assert.equal(patch.subject, undefined, "must not include subject at all, so merging the patch preserves whatever root already exists");
  assert.equal(patch.selection.entityId, "book:sefer-hapliah");
  assert.equal(patch.lens, "book");
});

test("Research Context Golden Case B: an exact research row in view narrows selection to that row while the Book identity anchors it", () => {
  const focusSelection = { sourceRef: SYNTHETIC_PRIVATE_ROW.source_ref, locator: `research-object:${SYNTHETIC_PRIVATE_ROW.id}` };
  const patch = bookContextPatch({ book: SECOND_BOOK, slug: "sefer-hapliah", hasRoot: true, focusSelection });
  assert.equal(patch.selection.entityId, "book:sefer-hapliah");
  assert.equal(patch.selection.sourceRef, SYNTHETIC_PRIVATE_ROW.source_ref);
  assert.equal(patch.selection.locator, `research-object:${SYNTHETIC_PRIVATE_ROW.id}`);
});

test("Research Context Golden Case B (dossier variant): an exact dossier/source selection narrows selection the same way a research row does", () => {
  const focusSelection = { sourceRef: "book:hebrewbooks:5635#p6:1820", locator: "book-selection:book:ahavat-torah:book:hebrewbooks:5635#p6:1820:v1" };
  const patch = bookContextPatch({ book: AHAVAT_TORAH_BOOK, slug: "ahavat-torah", hasRoot: true, focusSelection });
  assert.equal(patch.selection.entityId, "book:ahavat-torah");
  assert.equal(patch.selection.sourceRef, focusSelection.sourceRef);
  assert.equal(patch.selection.locator, focusSelection.locator);
  assert.equal(patch.subject, undefined, "root still stays sticky for a dossier-selection focus, same as a research-row focus");
});

test("bookContextPatch is a no-op without a resolved Book (never writes Context for a book that doesn't exist)", () => {
  assert.equal(bookContextPatch({ book: null, slug: "sefer-hapliah", hasRoot: false, focusSelection: null }), null);
});

// ── honest connection state (PELIAH connection UX fix) ────────────────────────────────
test("hasUnresolvedBookSeeds is true when a Book has internal exploration seeds beyond number-family", () => {
  const snap = { seeds: [{ key: "grammar", label: "Research Grammar", family: "procedure", status: "supported" }] };
  assert.equal(hasUnresolvedBookSeeds(snap), true);
});

test("hasUnresolvedBookSeeds is false when every seed already resolves as a number-family connection", () => {
  const snap = { seeds: [{ key: "1820", label: "משפחת 1820", family: "number-family", status: "documented" }] };
  assert.equal(hasUnresolvedBookSeeds(snap), false);
});

test("hasUnresolvedBookSeeds is false (not fabricated true) for a Book with no seeds at all", () => {
  assert.equal(hasUnresolvedBookSeeds({ seeds: [] }), false);
  assert.equal(hasUnresolvedBookSeeds(null), false);
  assert.equal(hasUnresolvedBookSeeds(undefined), false);
});
