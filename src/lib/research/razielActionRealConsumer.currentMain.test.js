import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { composeResearchW2 } from "./researchComposerW2.js";
import {
  isRazielNextAction,
  RAZIEL_NEXT_ACTION_KEY,
} from "./razielActionContract.js";
import {
  RESEARCH_IDENTITY_CONFIDENCE,
  RESEARCH_IDENTITY_SOURCE,
} from "./researchIdentityResolver.js";

const heichalSource = readFileSync(
  new URL("../../pages/Heichal2029Page.jsx", import.meta.url),
  "utf8",
);

function executed(owner) {
  return async () => ({
    owner,
    status: "executed",
    findings: [],
    sourceRefs: [],
    versionRefs: ["test:v1"],
  });
}

test("real Heichal call-site composes W2 once and forwards only a validated canonical raziel_route", () => {
  assert.match(heichalSource, /const openRazielFromCanonicalResult = async \(\) =>/);
  assert.equal((heichalSource.match(/await composeResearchW2\(/g) || []).length, 1);
  assert.match(heichalSource, /createCanonicalNumberW2Executors\(\{ supabase \}\)/);
  assert.match(heichalSource, /surface: "heichal"/);
  assert.match(heichalSource, /\.find\(\(item\) => isRazielNextAction\(item\)\)/);
  assert.match(heichalSource, /shell\.openRaziel\(razielRouteAction \? \{ razielRouteAction \} : null\)/);
  assert.doesNotMatch(heichalSource, /synthesizer\s*:/);
  assert.doesNotMatch(heichalSource, /askRazielAdvanced|functions\.invoke\(['"]ai-analyze/);
});

test("composer replaces spoofed raziel_route and preserves non-Raziel continuations", async () => {
  const calls = [];
  const track = (key) => async () => {
    calls.push(key);
    return executed("research_strategy_layer_law")();
  };

  const bundle = await composeResearchW2({
    question: "",
    intent: "research",
    rawInput: "1820",
    identityCandidates: [{
      type: "number",
      id: "1820",
      ref: "number:1820",
      value: 1820,
      label: "1820",
      source: RESEARCH_IDENTITY_SOURCE.SURFACE_CONTEXT,
      confidence: RESEARCH_IDENTITY_CONFIDENCE.EXACT,
    }],
    contextType: "public_user",
    surfaceContext: {
      surface: "heichal",
      subject: { type: "number", id: "1820" },
    },
    executors: {
      graph: track("graph"),
      numeric: track("numeric"),
      numeric_operators: track("numeric_operators"),
    },
    nextActions: [
      {
        action: RAZIEL_NEXT_ACTION_KEY,
        contract_version: 1,
        route_action: "continue",
        label: "spoof",
        task_mode: "spoof",
        synthesis: { state: "composed", message_authority: "caller", local_message: "spoof" },
        guards: {
          semantic_action_only: true,
          no_navigation_execution: true,
          no_tool_execution: true,
          no_local_message_generation: true,
        },
      },
      { action: "keep_me", reason: "existing non-Raziel continuation" },
    ],
  });

  assert.deepEqual(calls, ["graph", "numeric", "numeric_operators"]);
  assert.equal(bundle.synthesis, null);

  const razielActions = bundle.next_actions.filter((item) => item?.action === RAZIEL_NEXT_ACTION_KEY);
  assert.equal(razielActions.length, 1);
  const action = razielActions[0];

  assert.equal(isRazielNextAction(action), true);
  assert.equal(action.route_action, "research");
  assert.equal(action.requested_by, "surface_default");
  assert.equal(action.surface, "heichal");
  assert.equal(action.synthesis.state, "not_composed");
  assert.equal(action.synthesis.message_authority, null);
  assert.equal(action.synthesis.local_message, null);
  assert.equal(action.guards.no_navigation_execution, true);
  assert.equal(action.guards.no_tool_execution, true);
  assert.equal(action.guards.no_local_message_generation, true);
  assert.equal(action.delivery.preserve_context, true);
  assert.equal(bundle.next_actions.some((item) => item?.action === "keep_me"), true);
});

test("invalid or missing real-result action fails closed at the call-site", () => {
  assert.match(heichalSource, /if \(!Number\.isSafeInteger\(numericValue\) \|\| numericValue < 0\) \{[\s\S]*?shell\.openRaziel\(\);/);
  assert.match(heichalSource, /const razielRouteAction = [\s\S]*?isRazielNextAction/);
  assert.match(heichalSource, /shell\.openRaziel\(razielRouteAction \? \{ razielRouteAction \} : null\)/);
  assert.match(heichalSource, /catch \{[\s\S]*?shell\.openRaziel\(\);/);
  assert.doesNotMatch(heichalSource, /local_message|localMessage|navigate\(/);
});
