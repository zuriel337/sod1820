// Current-main acceptance for the canonical Research Synthesis seam.
import test from "node:test";
import assert from "node:assert/strict";
import { composeResearchW2 } from "./researchComposerW2.js";
import { normalizeResearchSynthesis } from "./researchSynthesis.js";

test("Research Synthesis forbids universal scores at every nesting depth", () => {
  assert.throws(() => normalizeResearchSynthesis({
    truth_score: 91,
    claims: [{ id: "c1", text: "claim" }],
  }), /truth_score is forbidden/);

  assert.throws(() => normalizeResearchSynthesis({
    claims: [{ id: "c1", text: "claim" }],
    explain_why: { nested: { accuracy_score: 97 } },
  }), /accuracy_score is forbidden/);

  assert.throws(() => normalizeResearchSynthesis({
    claims: [{ id: "c1", text: "claim" }],
    provenance: { nested: [{ canonicalScore: 100 }] },
  }), /canonicalScore is forbidden/);
});

test("Research Synthesis cannot cite findings outside the access-filtered Bundle", () => {
  assert.throws(() => normalizeResearchSynthesis({
    claims: [{
      id: "c1",
      text: "claim",
      support: { finding_ids: ["uf:private:not-in-bundle"] },
    }],
  }, { allowedFindingIds: ["uf:public:1"] }), /unavailable finding/);
});

test("W2 composer exposes one optional canonical synthesis socket over the safe Bundle", async () => {
  let seenBundle = null;
  const bundle = await composeResearchW2({
    question: "bounded synthesis test",
    requestedCapabilities: [],
    synthesizer: async ({ bundle: safeBundle }) => {
      seenBundle = safeBundle;
      return {
        message: "one canonical synthesis",
        claims: [{ id: "claim:1", text: "atomic interpretation" }],
        motifs: [{ key: "integration", claim_ids: ["claim:1"] }],
        calibration: { state: "should_not_project" },
        resonance: { shares: 999 },
        learning: { champion_ref: "should_not_project" },
      };
    },
  });

  assert.ok(seenBundle);
  assert.equal(Object.prototype.hasOwnProperty.call(seenBundle.plan, "authorization_context"), false);
  assert.equal(bundle.synthesis.status, "composed");
  assert.equal(bundle.synthesis.message, "one canonical synthesis");
  assert.equal(bundle.synthesis.freeze.frozen, true);
  assert.equal(bundle.synthesis.invariants.synthesis_is_not_truth, true);
  assert.equal(bundle.synthesis.invariants.no_calibration_or_learning_policy_in_this_contract, true);
  assert.equal(Object.prototype.hasOwnProperty.call(bundle.synthesis, "calibration"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(bundle.synthesis, "resonance"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(bundle.synthesis, "learning"), false);
});

test("Synthesis failure is explicit and preserves the Result Bundle", async () => {
  const bundle = await composeResearchW2({
    question: "synthesis failure test",
    requestedCapabilities: [],
    synthesizer: async () => ({
      truth_score: 100,
      claims: [{ id: "x", text: "bad" }],
    }),
  });
  assert.equal(bundle.synthesis.status, "failed");
  assert.match(bundle.synthesis.explain_why.reason, /truth_score is forbidden/);
  assert.equal(Array.isArray(bundle.findings), true);
  assert.equal(bundle.invariants.no_auto_canonicalization, true);
  assert.equal(bundle.invariants.no_auto_publication, true);
});

test("No synthesizer preserves pre-existing Bundle behavior", async () => {
  const bundle = await composeResearchW2({
    question: "no synthesis",
    requestedCapabilities: [],
  });
  assert.equal(bundle.synthesis, null);
});
