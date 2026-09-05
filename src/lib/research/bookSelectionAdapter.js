// 📖 Book source-selection Workspace adapter (book-local, additive).
//
// A Book Entity and an exact source/research selection must never share identity.
// This adapter derives deterministic selection refs from the existing Book identity +
// source locator and carries truth/access axes without merging them. It creates no new
// entity family, store, graph, engine, Workspace, or Research Context.

import { pageFromSourceRef } from "./bookResearchProjection.js";

function clean(v) {
  return v == null ? "" : String(v).trim();
}

function triBool(v) {
  return v === true ? true : v === false ? false : null;
}

// The book itself — one identity, saved at most once.
export function bookEntityRef(book) {
  return clean(book?.identity_key) || null;
}

// Pick an existing source-ref namespace from Book identity metadata. Prefer a
// book-qualified prefix when one exists; never hardcode a particular witness id.
// If metadata is incomplete, fall back to the locator contract and finally to the
// already-known witness identity. Missing identity fails closed (null).
export function bookSourceRefPrefix(book) {
  const prefixes = Array.isArray(book?.metadata?.source_ref_prefixes)
    ? book.metadata.source_ref_prefixes.map(clean).filter(Boolean)
    : [];
  const bookQualified = prefixes.find(x => x.toLowerCase().startsWith("book:"));
  if (bookQualified) return bookQualified;
  if (prefixes[0]) return prefixes[0];

  const locatorPattern = clean(book?.metadata?.identity_tiers?.locator?.pattern);
  if (locatorPattern.includes("#")) {
    const prefix = clean(locatorPattern.split("#")[0]);
    if (prefix) return prefix.toLowerCase().startsWith("book:") ? prefix : `book:${prefix}`;
  }

  const witness = book?.metadata?.identity_tiers?.witness || {};
  const provider = clean(witness.provider).toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  const nativeId = clean(witness.native_id);
  return provider && nativeId ? `book:${provider}:${nativeId}` : null;
}

function firstPdfPage(row) {
  const raw = Array.isArray(row?.pdf_pages) ? row.pdf_pages[0]
    : row?.pdf_pages ?? row?.pdf_page ?? row?.page;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function rowIdentity(row, idKey) {
  if (idKey && row?.[idKey] != null) return clean(row[idKey]);
  for (const key of ["dataset_id", "representation_id", "procedure_id", "matrix_id", "id", "n", "key", "slug"]) {
    const value = clean(row?.[key]);
    if (value) return value;
  }
  return "";
}

// Generic documented-snapshot locator. For Ahavat Torah this remains
// book:hebrewbooks:5635#p…; for Sefer HaPeli'ah it derives 6355 from the Book node.
// No Book-specific switch and no source content is copied here.
export function dossierSelectionSourceRef(book, row, idKey) {
  const prefix = bookSourceRefPrefix(book);
  const rowId = rowIdentity(row, idKey);
  if (!prefix || !rowId) return null;
  const page = firstPdfPage(row);
  return `${prefix}#p${page ?? 0}:${rowId}`;
}

// One exact, reproducible ref per (book, source_ref locator, snapshot version).
export function selectionRef({ bookIdentityKey, sourceRef, snapshotVersion }) {
  const book = clean(bookIdentityKey);
  const ref = clean(sourceRef);
  if (!book || !ref) return null;
  const v = clean(snapshotVersion) || "v1";
  return `book-selection:${book}:${ref}:${v}`;
}

// selection: any row from a documented snapshot or an authorized live reader.
// Shape varies; only a real source_ref/sourceRef is required. Truth axes are carried
// independently and never inferred from one another.
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
  const params = new URLSearchParams();
  params.set("tab", clean(opts.tab) || "dossier");
  params.set("selection", ref);
  if (page) params.set("page", String(page));
  return {
    id: ref,
    ref,
    type: "book",
    title,
    link: `${route}?${params.toString()}#selection`,
    metadata: {
      bookIdentityKey: bookRef,
      sourceRef,
      page,
      snapshotVersion,
      witness: selection.witness ?? book?.metadata?.identity_tiers?.witness ?? null,
      // GOVERNANCE — independent from engine verification and publication/access.
      status: selection.status ?? null,
      // VERIFICATION — tri-state: true/false/unknown, never inferred from status.
      engineVerified: triBool(selection.engine_verified ?? selection.engineVerified),
      engineVerificationState: selection.engine_detail?.verification_state ?? selection.engineVerificationState ?? null,
      // WITNESS / SOURCE ADJUDICATION — separate from engine and governance.
      witnessState: selection.witness_state ?? selection.exact_witness_state ?? selection.witnessState ?? null,
      // PUBLICATION / ACCESS — carried only when explicitly owned by the source row.
      privacyScope: selection.privacy_scope ?? selection.privacyScope ?? null,
      publicationState: selection.publication_state ?? selection.publicationState ?? null,
      confidence: selection.confidence ?? null,
      truthClass: selection.truth_class ?? selection.truthClass ?? null,
      representationShape: selection.representation_shape ?? selection.representationShape ?? null,
      // Append-only: a new snapshot version gets a new ref, preserving history.
      corrections: Array.isArray(selection.corrections) ? selection.corrections : [],
    },
  };
}

// STRICT / fail-closed: only a row explicitly tagged privacy_scope==='public' passes.
// Private, absent, candidate-only, engine-verified-only, or any other state is excluded.
export function isPublicRow(row) {
  return clean(row?.privacy_scope) === "public";
}

export function buildPublicBundle(rows) {
  return (Array.isArray(rows) ? rows : []).filter(isPublicRow);
}
