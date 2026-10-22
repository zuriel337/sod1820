// Authorized Book publication-review projection.
//
// This is a pure review adapter over rows already returned by an authorized reader.
// It does not fetch data, authorize a viewer, publish a row or perform a governance
// transition. `public_candidate` remains non-public until a separate Human-Gate action.

import {
  describeBookMaterialStatus,
  sourceRefBelongsToBook,
} from "./bookPublicMaterialProjection.js";
import { parseSourceRefLocator } from "./bookResearchProjection.js";

export const DEFAULT_BOOK_PUBLICATION_REVIEW_LIMIT = 50;
export const MAX_BOOK_PUBLICATION_REVIEW_LIMIT = 100;

function clean(value) {
  return value == null ? "" : String(value).trim();
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

function candidateRows(rows, prefixes) {
  if (!prefixes.length) return [];
  return (Array.isArray(rows) ? rows : []).filter(row => (
    clean(row?.privacy_scope) === "public_candidate"
    && clean(row?.id)
    && sourceRefBelongsToBook(row?.source_ref, prefixes)
  ));
}

function exactClaimKey(row) {
  const sourceRef = clean(row?.source_ref);
  const statement = clean(row?.statement);
  return sourceRef && statement ? `${sourceRef}\u0000${statement}` : null;
}

function checklist(row, exactClaimCounts) {
  const sourceRef = clean(row?.source_ref);
  const locator = parseSourceRefLocator(sourceRef);
  const verificationState = clean(row?.engine_detail?.verification_state);
  const governanceState = clean(row?.status);
  const claimKey = exactClaimKey(row);
  const checks = {
    statementPresent: Boolean(clean(row?.statement)),
    sourceRefPresent: Boolean(sourceRef),
    pageLocatorPresent: Number.isInteger(locator.page) && locator.page > 0,
    verificationDeclared: Boolean(verificationState),
    governanceDeclared: Boolean(governanceState),
    exactDuplicateAbsent: !claimKey || exactClaimCounts.get(claimKey) === 1,
  };
  const needsRepair = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);
  return {
    checks,
    readiness: needsRepair.length ? "needs_repair_before_human_review" : "ready_for_human_review",
    needsRepair,
  };
}

function reviewItem(row, exactClaimCounts) {
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
    review: checklist(row, exactClaimCounts),
    humanGateRequired: true,
    decision: null,
  };
}

function reviewOrder(a, b) {
  return clean(a?.source_ref).localeCompare(clean(b?.source_ref), "he")
    || clean(a?.id).localeCompare(clean(b?.id));
}

function countBy(items, valueOf) {
  const counts = {};
  items.forEach(item => {
    const value = clean(valueOf(item)) || "unknown";
    counts[value] = (counts[value] || 0) + 1;
  });
  return counts;
}

export function projectBookPublicationReview(rows, options = {}) {
  const prefixes = sourcePrefixes(options.book, options.sourceRefPrefixes);
  const limit = boundedInteger(
    options.limit,
    DEFAULT_BOOK_PUBLICATION_REVIEW_LIMIT,
    1,
    MAX_BOOK_PUBLICATION_REVIEW_LIMIT,
  );
  const offset = boundedInteger(options.offset, 0, 0, Number.MAX_SAFE_INTEGER);
  const focusId = clean(options.focusId);
  const candidates = candidateRows(rows, prefixes).sort(reviewOrder);

  const exactClaimCounts = new Map();
  candidates.forEach(row => {
    const key = exactClaimKey(row);
    if (key) exactClaimCounts.set(key, (exactClaimCounts.get(key) || 0) + 1);
  });

  const allItems = candidates.map(row => reviewItem(row, exactClaimCounts));
  const pageItems = allItems.slice(offset, offset + limit);
  const focusedItem = focusId ? allItems.find(item => item.id === focusId) || null : null;
  const readyCount = allItems.filter(item => item.review.readiness === "ready_for_human_review").length;

  return {
    accessMode: "authorized_review",
    publicationEffect: "none",
    items: pageItems,
    focusedItem,
    summary: {
      totalCandidates: allItems.length,
      readyForHumanReview: readyCount,
      needsRepair: allItems.length - readyCount,
      byKind: countBy(allItems, item => item.kind),
      byVerificationState: countBy(allItems, item => item.status.verification.state),
      distinctSourceRefs: new Set(allItems.map(item => item.sourceRef)).size,
    },
    page: {
      offset,
      limit,
      total: allItems.length,
      hasMore: offset + pageItems.length < allItems.length,
    },
  };
}
