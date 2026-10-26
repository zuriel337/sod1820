// Single read seam for the protected Book publication/evidence review desk.
//
// Order is security-significant: server-derived admin verification happens
// before Book identity resolution, and the existing bounded Book reader is
// called only after both pass. The same authorized row snapshot feeds the
// publication-review and private-evidence projections so their items cannot
// drift. This module has no write, governance or publication operation.

import {
  fetchBookEntityBySlug,
  fetchBookResearch,
  MAX_BOOK_RESEARCH_LIMIT,
} from "./bookResearchProjection.js";
import {
  DEFAULT_BOOK_PUBLICATION_REVIEW_LIMIT,
  projectBookPublicationReview,
} from "./bookPublicationReviewProjection.js";
import { verifyBookPublicationReviewAdmin } from "./bookPublicationReviewReader.js";
import { projectBookPrivateEvidencePackets } from "./bookPrivateEvidencePacketProjection.js";
import { buildBookPrivateEvidenceCollectionPresentation } from "./bookPrivateEvidencePresentation.js";

function clean(value) {
  return value == null ? "" : String(value).trim();
}

function restrictedState(restriction, adminVerified) {
  return {
    phase: "restricted",
    restriction,
    book: null,
    reviewPacket: null,
    evidencePacket: null,
    evidencePresentation: null,
    partial: false,
    publicationEffect: "none",
    source: {
      adminVerified,
      restricted: true,
      truncated: false,
      focusIncluded: false,
    },
  };
}

export async function loadBookPublicationEvidenceReviewDesk(slug, options = {}) {
  const verifyAdminAccess = typeof options.verifyAdminAccess === "function"
    ? options.verifyAdminAccess
    : verifyBookPublicationReviewAdmin;
  const readBookEntity = typeof options.readBookEntity === "function"
    ? options.readBookEntity
    : fetchBookEntityBySlug;
  const readBookResearch = typeof options.readBookResearch === "function"
    ? options.readBookResearch
    : fetchBookResearch;
  const safeSlug = clean(slug);
  const focusId = clean(options.focusId) || undefined;
  const limit = options.limit ?? DEFAULT_BOOK_PUBLICATION_REVIEW_LIMIT;

  const adminVerified = await verifyAdminAccess();
  if (!adminVerified) return restrictedState("admin", false);

  const book = await readBookEntity(safeSlug);
  if (!book) {
    return {
      phase: "unavailable",
      restriction: null,
      book: null,
      reviewPacket: null,
      evidencePacket: null,
      evidencePresentation: null,
      partial: false,
      publicationEffect: "none",
      source: {
        adminVerified: true,
        restricted: false,
        truncated: false,
        focusIncluded: false,
      },
    };
  }

  const source = await readBookResearch(book, {
    limit: MAX_BOOK_RESEARCH_LIMIT,
    focusId,
  });
  if (source?.restricted === true) return restrictedState("reader", true);

  const projectionOptions = {
    book,
    sourceRefPrefixes: options.sourceRefPrefixes,
    limit,
    offset: options.offset,
    focusId,
  };
  const rows = Array.isArray(source?.rows) ? source.rows : [];
  const reviewPacket = projectBookPublicationReview(rows, projectionOptions);
  const evidencePacket = projectBookPrivateEvidencePackets(rows, projectionOptions);
  const evidencePresentation = buildBookPrivateEvidenceCollectionPresentation(evidencePacket);
  const reviewIds = reviewPacket.items.map(item => item.id);
  const evidenceIds = evidencePacket.packets.map(packet => packet.id);
  const presentationIds = evidencePresentation.packets.map(packet => packet.id);

  // Both projections share candidate filtering and order. Any divergence is a
  // contract failure, never a reason to show a partially mismatched desk.
  if (reviewIds.length !== evidenceIds.length || reviewIds.some((id, index) => id !== evidenceIds[index])) {
    throw new Error("book_review_evidence_alignment_failed");
  }
  if (evidenceIds.length !== presentationIds.length || evidenceIds.some((id, index) => id !== presentationIds[index])) {
    throw new Error("book_evidence_presentation_alignment_failed");
  }

  const truncated = source?.truncated === true;
  return {
    phase: "ready",
    restriction: null,
    book,
    reviewPacket,
    evidencePacket,
    evidencePresentation,
    partial: truncated,
    publicationEffect: "none",
    source: {
      adminVerified: true,
      restricted: false,
      truncated,
      focusIncluded: source?.focusIncluded === true,
    },
  };
}
