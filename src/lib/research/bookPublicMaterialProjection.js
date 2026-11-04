// Public Book material projection — pure, bounded and fail-closed.
//
// This module receives rows that an upstream authorized reader already obtained.
// It never grants access, never fetches research_objects and never returns a raw row.
// Authentication or admin status cannot widen this PUBLIC projection.

import { isPublicRow } from "./bookSelectionAdapter.js";
import { parseSourceRefLocator } from "./bookResearchProjection.js";

export const DEFAULT_PUBLIC_BOOK_MATERIAL_LIMIT = 24;
export const MAX_PUBLIC_BOOK_MATERIAL_LIMIT = 100;

function clean(value) {
  return value == null ? "" : String(value).trim();
}

function triBool(value) {
  return value === true ? true : value === false ? false : null;
}

function nullable(value) {
  return value == null ? null : value;
}

function boundedInteger(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(Math.trunc(number), max));
}

function sourcePrefixes(book, explicitPrefixes) {
  const values = Array.isArray(explicitPrefixes)
    ? explicitPrefixes
    : book?.metadata?.source_ref_prefixes;
  return [...new Set((Array.isArray(values) ? values : []).map(clean).filter(Boolean))];
}

// Prefix matching is boundary-aware: book:x:1 must not admit book:x:10.
export function sourceRefBelongsToBook(sourceRef, prefixes) {
  const ref = clean(sourceRef);
  if (!ref) return false;
  return (Array.isArray(prefixes) ? prefixes : []).some(rawPrefix => {
    const prefix = clean(rawPrefix);
    if (!prefix) return false;
    if (ref === prefix) return true;
    if (/[#:/]$/.test(prefix)) return ref.startsWith(prefix);
    return ["#", ":", "/"].some(separator => ref.startsWith(`${prefix}${separator}`));
  });
}

// The four user-facing ideas remain independent projections of canonical axes.
// In particular: engine match != Human-Gate acceptance != public access.
export function describeBookMaterialStatus(row) {
  const verificationState = clean(row?.engine_detail?.verification_state) || null;
  const governanceState = clean(row?.status) || null;
  const accessState = clean(row?.privacy_scope) || null;
  return {
    ingested: Boolean(clean(row?.id) && clean(row?.source_ref)),
    verification: {
      state: verificationState,
      isEngineMatch: verificationState === "match",
      compatibilityVerified: triBool(row?.engine_verified),
    },
    candidacy: {
      governance: governanceState === "candidate",
      publication: accessState === "public_candidate",
    },
    governance: { state: governanceState },
    publicationAccess: {
      state: accessState,
      isPublic: accessState === "public",
    },
  };
}

function publicItem(row) {
  const sourceRef = clean(row?.source_ref);
  return {
    id: clean(row?.id),
    createdAt: nullable(row?.created_at),
    kind: nullable(row?.kind),
    statement: nullable(row?.statement),
    terms: Array.isArray(row?.terms) ? [...row.terms] : [],
    value: nullable(row?.value),
    sourceRef,
    sourceLocator: parseSourceRefLocator(sourceRef),
    confidence: nullable(row?.confidence),
    status: describeBookMaterialStatus(row),
  };
}

function newestFirst(a, b) {
  const aTime = Number.isFinite(Date.parse(a?.created_at)) ? Date.parse(a.created_at) : 0;
  const bTime = Number.isFinite(Date.parse(b?.created_at)) ? Date.parse(b.created_at) : 0;
  return bTime - aTime || clean(a?.id).localeCompare(clean(b?.id));
}

export function projectBookPublicMaterial(rows, options = {}) {
  const prefixes = sourcePrefixes(options.book, options.sourceRefPrefixes);
  const limit = boundedInteger(
    options.limit,
    DEFAULT_PUBLIC_BOOK_MATERIAL_LIMIT,
    1,
    MAX_PUBLIC_BOOK_MATERIAL_LIMIT,
  );
  const offset = boundedInteger(options.offset, 0, 0, Number.MAX_SAFE_INTEGER);
  const focusId = clean(options.focusId);

  // A missing Book scope must never degrade into an all-books public dump.
  const eligibleRows = prefixes.length
    ? (Array.isArray(rows) ? rows : [])
      .filter(row => (
        isPublicRow(row)
        && clean(row?.id)
        && clean(row?.source_ref)
        && sourceRefBelongsToBook(row.source_ref, prefixes)
      ))
      .sort(newestFirst)
    : [];

  const pageRows = eligibleRows.slice(offset, offset + limit);
  const focusRow = focusId ? eligibleRows.find(row => clean(row?.id) === focusId) : null;

  return {
    accessMode: "public",
    items: pageRows.map(publicItem),
    focusedItem: focusRow ? publicItem(focusRow) : null,
    page: {
      offset,
      limit,
      total: eligibleRows.length,
      hasMore: offset + pageRows.length < eligibleRows.length,
    },
  };
}
