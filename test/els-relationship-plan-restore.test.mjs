import test from "node:test";
import assert from "node:assert/strict";
import { prepareElsRelationshipResearchPlan } from "../src/lib/research/elsAutomaticResearchPlan.js";

test("restored relationship plan prepares only explicit primary-to-target pairs", () => {
  const plan = prepareElsRelationshipResearchPlan({ primaryTerm: "משיח", secondTerm: "דוד", additionalTerms: "אליהו\nיבואו" });
  assert.deepEqual(plan.pairs.map(pair => `${pair.axis}×${pair.term}`), ["משיח×דוד", "משיח×אליהו", "משיח×יבואו"]);
  assert.equal(plan.explicitExecutionRequired, true);
  assert.equal(plan.allPairsGenerated, false);
  assert.equal(plan.persisted, false);
  assert.equal(plan.aiUsed, false);
  assert.equal(plan.truthPromotion, false);
});

test("restored relationship plan rejects invalid or excessive input without executing anything", () => {
  assert.ok(prepareElsRelationshipResearchPlan({ primaryTerm: "א", secondTerm: "דוד" }).error);
  assert.ok(prepareElsRelationshipResearchPlan({ primaryTerm: "משיח", secondTerm: "משיח" }).error);
  assert.ok(prepareElsRelationshipResearchPlan({ primaryTerm: "משיח", additionalTerms: "אחד\nשנים\nשלשה\nארבעה\nחמשה\nששה\nשבעה" }).error);
});
