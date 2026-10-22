// Runtime seam for the authorized Book publication-review packet.
//
// Access remains owned by fetchBookResearch + database RLS. This adapter neither
// widens access nor returns the reader's raw rows/findings to its consumer.

import {
  fetchBookResearch,
  MAX_BOOK_RESEARCH_LIMIT,
} from "./bookResearchProjection.js";
import { projectBookPublicationReview } from "./bookPublicationReviewProjection.js";

function clean(value) {
  return value == null ? "" : String(value).trim();
}

export async function loadBookPublicationReview(book, options = {}) {
  const readBookResearch = typeof options.readBookResearch === "function"
    ? options.readBookResearch
    : fetchBookResearch;
  const focusId = clean(options.focusId) || undefined;

  // Read the existing bounded Book window once so duplicate/readiness summaries
  // are computed over the broadest already-supported batch. No offset scan and no
  // fallback reader are introduced here.
  const source = await readBookResearch(book, {
    limit: MAX_BOOK_RESEARCH_LIMIT,
    focusId,
  });
  const restricted = source?.restricted === true;
  const sourceTruncated = source?.truncated === true;
  const packet = projectBookPublicationReview(restricted ? [] : source?.rows, {
    book,
    sourceRefPrefixes: options.sourceRefPrefixes,
    limit: options.limit,
    offset: options.offset,
    focusId,
  });

  return {
    ...packet,
    availability: restricted ? "restricted" : "available",
    partial: sourceTruncated,
    source: {
      restricted,
      truncated: sourceTruncated,
      focusIncluded: source?.focusIncluded === true,
    },
  };
}
