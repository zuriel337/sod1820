import test from "node:test";
import assert from "node:assert/strict";
import { projectWorldInsightReviewRows } from "../src/lib/research/worldInsightTriageProjection.js";

const base = {
  id: "14489c9d-b132-416b-aef5-5c35b4617183",
  title: "תובנה",
  body: "גוף",
  source_ref: "post:59",
  is_active: true,
  verified: true,
  evidence_level: 3,
  related_numbers: [59],
  related_phrases: [],
  tags: [],
};

test("insight source, evidence, verification and activity remain separate", () => {
  const [row] = projectWorldInsightReviewRows([base], { duplicateGroups: [] });
  assert.equal(row.sourceLocatorState, "locator_like");
  assert.equal(row.evidenceLevel, 3);
  assert.equal(row.verified, true);
  assert.equal(row.active, true);
  assert.equal(row.state, "ready_for_connection_review");
  assert.match(row.recommendation, /אין קידום אוטומטי/u);
});

test("missing and descriptive sources do not become exact locators", () => {
  const rows = projectWorldInsightReviewRows([
    { ...base, id: "missing", source_ref: null },
    { ...base, id: "label", source_ref: "סוד החשמל" },
  ], { duplicateGroups: [] });
  assert.equal(rows[0].state, "missing_source");
  assert.equal(rows[0].sourceHref, null);
  assert.equal(rows[1].state, "descriptive_source");
  assert.equal(rows[1].sourceHref, null);
});

test("exact text duplicate annotation retains both records", () => {
  const second = "c68bc9d0-a0e7-416e-b59e-6cd19824c0d7";
  const rows = projectWorldInsightReviewRows([base, { ...base, id: second }]);
  assert.deepEqual(rows[0].duplicateGroupIds, [base.id, second]);
  assert.equal(rows[1].sourceRef, `insights:${second}`);
});

test("evidence and verification gaps receive their own recommendations", () => {
  const rows = projectWorldInsightReviewRows([
    { ...base, id: "evidence", evidence_level: null },
    { ...base, id: "verify", verified: false },
  ], { duplicateGroups: [] });
  assert.equal(rows[0].state, "missing_evidence");
  assert.equal(rows[1].state, "not_verified");
});
