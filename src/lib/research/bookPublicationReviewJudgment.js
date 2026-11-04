// Book review → canonical Research Viewer Judgment bridge.
//
// These actions change governance only through admin_research_review. They never
// publish and never change privacy_scope. Publication remains a separate missing gate.

import { reviewResearchObjectById } from "./researchViewerProjection.js";

const DECISIONS_BY_GOVERNANCE = Object.freeze({
  candidate: Object.freeze(["approve", "reject"]),
  approved: Object.freeze(["canonicalize", "reject"]),
  canonical: Object.freeze([]),
  rejected: Object.freeze([]),
});

function clean(value) {
  return value == null ? "" : String(value).trim();
}

export function availableBookReviewJudgments(item) {
  if (item?.humanGateRequired !== true) return [];
  if (clean(item?.status?.publicationAccess?.state) !== "public_candidate") return [];
  const governance = clean(item?.status?.governance?.state);
  return [...(DECISIONS_BY_GOVERNANCE[governance] || [])];
}

export function buildBookReviewJudgment(item, options = {}) {
  const id = clean(item?.id);
  if (!id) throw new Error("Missing Book review item id");
  if (item?.review?.readiness !== "ready_for_human_review") {
    throw new Error("Book review item requires repair before Human-Gate Judgment");
  }

  const decision = clean(options.decision);
  const allowed = availableBookReviewJudgments(item);
  if (!allowed.includes(decision)) {
    throw new Error("Invalid Book review Judgment decision");
  }

  return {
    researchObjectId: id,
    decision,
    verificationState: options.verificationState || null,
    acknowledgeExtractionIncomplete: decision === "canonicalize"
      && options.acknowledgeExtractionIncomplete === true,
    publicationEffect: "none",
  };
}

export async function executeBookReviewJudgment(item, options = {}) {
  const request = buildBookReviewJudgment(item, options);
  const reviewById = typeof options.reviewById === "function"
    ? options.reviewById
    : reviewResearchObjectById;
  const result = await reviewById(request.researchObjectId, {
    decision: request.decision,
    verificationState: request.verificationState,
    acknowledgeExtractionIncomplete: request.acknowledgeExtractionIncomplete,
  });
  return {
    result,
    publicationEffect: "none",
  };
}
