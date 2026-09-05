// 📖 Book Phase B — source-selection Workspace adapter (book-local, additive).
//
// Fixes a concrete, live-verified identity bug (BOOK_ONE_TREE_APPROVED_EXECUTION_20260905,
// work_log 81611e63): saving a Book Entity ("this book") and saving one exact source
// selection ("this row of DS-06") must never share the same ref. research_items carries
// UNIQUE(user_id,bucket,entity_type,entity_ref) with metadata NOT part of the key, and
// ResearchProvider's own cart/saved/pinned state + auth.js's saveCloudResearch both
// de-dupe by the same ref/id — verified live in this session by reading both files.
// Reusing the book's own entity_ref for every row would silently collapse distinct
// saved selections into one.
//
// This module does not create a new entity_type family ("book" stays the only one),
// a new store, or a new engine — it only derives a stable, distinct ref per exact
// selection from data that already exists (book identity + source_ref locator).

import { pageFromSourceRef } from "./bookResearchProjection.js";

function clean(v) {
  return v == null ? "" : String(v).trim();
}

// The book itself — one identity, saved at most once. Mirrors bookResearchProjection.js's
// own bookToWorkspaceItem() intentionally (not re-imported, to keep this module import-order
// independent) — same ref shape, so a book-level save from either code path collides
// correctly WITH ITSELF (idempotent), not with a selection.
export function bookEntityRef(book) {
  return clean(book?.identity_key) || null;
}

// One exact, reproducible ref per (book, source_ref locator, snapshot version).
// Deterministic: identical inputs always produce the identical ref — this is what
// makes "save the same selection twice" an idempotent upsert instead of a duplicate,
// and what makes "save two different rows" produce two distinct, both-persisted refs.
export function selectionRef({ bookIdentityKey, sourceRef, snapshotVersion }) {
  const book = clean(bookIdentityKey);
  const ref = clean(sourceRef);
  if (!book || !ref) return null;
  const v = clean(snapshotVersion) || "v1";
  return `book-selection:${book}:${ref}:${v}`;
}

// selection: any row from the documented-snapshot bundle (a dataset row, an
// occurrence-table row, a content_block, or a live research_objects row) —
// shape varies by source; only source_ref (or sourceRef) is required.
export function selectionToWorkspaceItem(book, selection, opts = {}) {
  if (!selection) return null;
  const bookRef = bookEntityRef(book);
  const sourceRef = clean(selection.source_ref ?? selection.sourceRef);
  const snapshotVersion = clean(opts.snapshotVersion ?? selection.snapshot_version ?? selection.snapshotVersion) || "v1";
  const ref = selectionRef({ bookIdentityKey: bookRef, sourceRef, snapshotVersion });
  if (!ref) return null;
  const page = pageFromSourceRef(sourceRef);
  const title = clean(selection.title) || clean(selection.statement) || clean(selection.text_he) || clean(book?.label) || "בחירת-מקור";
  const route = clean(book?.metadata?.route) || "/book";
  return {
    id: ref,
    ref,
    type: "book",
    title,
    link: `${route}${page ? `?page=${page}` : ""}#selection=${encodeURIComponent(ref)}`,
    metadata: {
      bookIdentityKey: bookRef,
      sourceRef,
      page,
      snapshotVersion,
      witness: selection.witness ?? book?.metadata?.identity_tiers?.witness ?? null,
      status: selection.status ?? null,
      confidence: selection.confidence ?? null,
      truthClass: selection.truth_class ?? selection.truthClass ?? null,
      // Append-only: a later re-read of the same locator under a NEW snapshot version
      // gets its own ref (different snapshotVersion -> different selectionRef), so the
      // prior saved evidence is never overwritten in place — see selectionRef above.
      corrections: Array.isArray(selection.corrections) ? selection.corrections : [],
    },
  };
}

// STRICT / fail-closed: only a row explicitly tagged privacy_scope==='public' passes.
// Anything private, anything with no privacy_scope field at all (e.g. today's
// git-corpus documented-snapshot rows, which never had a privacy axis to begin with),
// and anything else is excluded by default. A caller that wants to include known-safe
// legacy content must tag it privacy_scope:'public' explicitly when building the row —
// this module never infers "public" from silence.
export function isPublicRow(row) {
  return clean(row?.privacy_scope) === "public";
}

export function buildPublicBundle(rows) {
  return (Array.isArray(rows) ? rows : []).filter(isPublicRow);
}
