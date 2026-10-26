// Judgment bridge tests. All items and executors are synthetic; no RPC is called.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  availableBookReviewJudgments,
  buildBookReviewJudgment,
  executeBookReviewJudgment,
} from "./bookPublicationReviewJudgment.js";
import { buildResearchObjectJudgmentRpcArgs } from "./researchViewerProjection.js";

function item(overrides = {}) {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    humanGateRequired: true,
    decision: null,
    review: { readiness: "ready_for_human_review", needsRepair: [] },
    status: {
      governance: { state: "candidate" },
      publicationAccess: { state: "public_candidate", isPublic: false },
    },
    ...overrides,
  };
}

test("candidate and approved items expose only the canonical governance transitions", () => {
  assert.deepEqual(availableBookReviewJudgments(item()), ["approve", "reject"]);
  assert.deepEqual(availableBookReviewJudgments(item({
    status: {
      governance: { state: "approved" },
      publicationAccess: { state: "public_candidate", isPublic: false },
    },
  })), ["canonicalize", "reject"]);
});

test("canonical, rejected, public and non-review items expose no Judgment action", () => {
  for (const governance of ["canonical", "rejected"]) {
    assert.deepEqual(availableBookReviewJudgments(item({
      status: {
        governance: { state: governance },
        publicationAccess: { state: "public_candidate", isPublic: false },
      },
    })), []);
  }
  assert.deepEqual(availableBookReviewJudgments(item({
    status: {
      governance: { state: "candidate" },
      publicationAccess: { state: "public", isPublic: true },
    },
  })), []);
  assert.deepEqual(availableBookReviewJudgments(item({ humanGateRequired: false })), []);
});

test("publish is rejected because Judgment never changes publication/access", () => {
  assert.throws(
    () => buildBookReviewJudgment(item(), { decision: "publish" }),
    /Invalid Book review Judgment decision/,
  );
});

test("items needing repair cannot enter Human-Gate Judgment", () => {
  assert.throws(
    () => buildBookReviewJudgment(item({ review: { readiness: "needs_repair_before_human_review" } }), { decision: "approve" }),
    /requires repair/,
  );
});

test("canonicalization acknowledgement is carried only for canonicalize", () => {
  const approved = item({
    status: {
      governance: { state: "approved" },
      publicationAccess: { state: "public_candidate", isPublic: false },
    },
  });
  assert.equal(buildBookReviewJudgment(approved, {
    decision: "canonicalize",
    acknowledgeExtractionIncomplete: true,
  }).acknowledgeExtractionIncomplete, true);
  assert.equal(buildBookReviewJudgment(item(), {
    decision: "approve",
    acknowledgeExtractionIncomplete: true,
  }).acknowledgeExtractionIncomplete, false);
});

test("execution delegates to the canonical ID bridge and reports no publication effect", async () => {
  const calls = [];
  const output = await executeBookReviewJudgment(item(), {
    decision: "approve",
    reviewById: async (id, options) => {
      calls.push({ id, options });
      return { ok: true, status: "approved", published: false };
    },
  });
  assert.deepEqual(calls, [{
    id: "00000000-0000-4000-8000-000000000001",
    options: {
      decision: "approve",
      verificationState: null,
      acknowledgeExtractionIncomplete: false,
    },
  }]);
  assert.equal(output.result.status, "approved");
  assert.equal(output.publicationEffect, "none");
});

test("canonical Research Viewer RPC args preserve the live contract", () => {
  assert.deepEqual(buildResearchObjectJudgmentRpcArgs(
    "00000000-0000-4000-8000-000000000001",
    { decision: "approve" },
  ), {
    p_id: "00000000-0000-4000-8000-000000000001",
    p_decision: "approve",
    p_verification_state: null,
    p_ack_extraction_incomplete: false,
  });
  assert.throws(
    () => buildResearchObjectJudgmentRpcArgs("id", { decision: "publish" }),
    /Invalid Judgment decision/,
  );
});
