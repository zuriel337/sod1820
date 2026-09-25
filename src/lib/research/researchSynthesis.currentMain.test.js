import test from "node:test";
import assert from "node:assert/strict";
import { composeResearchW2 } from "./researchComposerW2.js";
import { normalizeResearchSynthesis } from "./researchSynthesis.js";

test("Research Synthesis forbids universal truth scores", () => {
  assert.throws(() => normalizeResearchSynthesis({
    truth_score: 91,
    claims: [{ id: "c1", text: "claim" }],
  }), /truth_score is forbidden/);
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
        calibration: {
          state: "holdout_pending",
          bias_controls: {
            message_frozen_before_validation: true,
            validation_data_hidden_during_synthesis: true,
          },
        },
      };
    },
  });

  assert.ok(seenBundle);
  assert.equal(Object.prototype.hasOwnProperty.call(seenBundle.plan, "authorization_context"), false);
  assert.equal(bundle.synthesis.status, "composed");
  assert.equal(bundle.synthesis.message, "one canonical synthesis");
  assert.equal(bundle.synthesis.freeze.frozen, true);
  assert.equal(bundle.synthesis.invariants.synthesis_is_not_truth, true);
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
