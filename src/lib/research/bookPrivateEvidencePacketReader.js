// Runtime seam for authorized private Book evidence packets.
// Uses the existing bounded Book reader and existing server-derived admin check.
// It introduces no new RPC, grant, RLS policy, persistence or publication path.

import {
  fetchBookResearch,
  MAX_BOOK_RESEARCH_LIMIT,
} from "./bookResearchProjection.js";
import { verifyBookPublicationReviewAdmin } from "./bookPublicationReviewReader.js";
import { projectBookPrivateEvidencePackets } from "./bookPrivateEvidencePacketProjection.js";

function clean(value) {
  return value == null ? "" : String(value).trim();
}

export async function loadBookPrivateEvidencePackets(book, options = {}) {
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
      ...projectBookPrivateEvidencePackets([], {
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

  const source = await readBookResearch(book, {
    limit: MAX_BOOK_RESEARCH_LIMIT,
    focusId,
  });
  const restricted = source?.restricted === true;
  const sourceTruncated = source?.truncated === true;
  const result = projectBookPrivateEvidencePackets(restricted ? [] : source?.rows, {
    book,
    sourceRefPrefixes: options.sourceRefPrefixes,
    limit: options.limit,
    offset: options.offset,
    focusId,
  });

  return {
    ...result,
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
