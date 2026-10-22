// Runtime seam for the authorized Book publication-review packet.
//
// Access remains owned by fetchBookResearch + database RLS. This adapter neither
// widens access nor returns the reader's raw rows/findings to its consumer.

import {
  fetchBookResearch,
  MAX_BOOK_RESEARCH_LIMIT,
} from "./bookResearchProjection.js";
import { projectBookPublicationReview } from "./bookPublicationReviewProjection.js";
import { supabase } from "../supabase.js";

function clean(value) {
  return value == null ? "" : String(value).trim();
}

export async function verifyBookPublicationReviewAdmin() {
  try {
    // Server-derived auth.uid() + users.role check. A UI isAdmin boolean is not
    // sufficient because research_objects also has a narrow public dossier policy.
    const { data, error } = await supabase.rpc("rd_is_admin");
    return !error && data === true;
  } catch {
    return false;
  }
}

export async function loadBookPublicationReview(book, options = {}) {
  const readBookResearch = typeof options.readBookResearch === "function"
    ? options.readBookResearch
    : fetchBookResearch;
  const verifyAdminAccess = typeof options.verifyAdminAccess === "function"
    ? options.verifyAdminAccess
    : verifyBookPublicationReviewAdmin;
  const focusId = clean(options.focusId) || undefined;

  const adminVerified = await verifyAdminAccess();
  if (!adminVerified) {
    return {
      ...projectBookPublicationReview([], {
        book,
        sourceRefPrefixes: options.sourceRefPrefixes,
        limit: options.limit,
        offset: options.offset,
        focusId,
      }),
      availability: "restricted",
      partial: false,
      source: {
        adminVerified: false,
        restricted: true,
        truncated: false,
        focusIncluded: false,
      },
    };
  }

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
      adminVerified: true,
      restricted,
      truncated: sourceTruncated,
      focusIncluded: source?.focusIncluded === true,
    },
  };
}
