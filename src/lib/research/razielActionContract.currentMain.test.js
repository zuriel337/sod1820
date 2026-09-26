import test from "node:test";
import assert from "node:assert/strict";
import { composeResearchW2 } from "./researchComposerW2.js";

test("Raziel action reuses next_actions and stays message-free without Synthesis", async () => {
  const bundle = await composeResearchW2({
    question: "מה זה 1820?",
    requestedCapabilities: [],
    surfaceContext: { surface: "number" },
  });
  const action = bundle.next_actions.find((item) => item.action === "raziel_route");
  assert.ok(action);
  assert.equal(action.route_action, "understand");
  assert.equal(action.synthesis.state, "not_composed");
  assert.equal(action.synthesis.message_authority, null);
  assert.equal(action.synthesis.local_message, null);
  assert.equal(action.guards.no_tool_execution, true);
  assert.equal(action.guards.no_navigation_execution, true);
});

test("Raziel action points to the same canonical Bundle Synthesis and never copies its message", async () => {
  const bundle = await composeResearchW2({
    question: "מה הקשר בין 455 ל-424?",
    requestedCapabilities: [],
    surfaceContext: { surface: "number" },
    synthesizer: async () => ({
      message: "אותו Synthesis יחיד",
      claims: [{ id: "claim:route", text: "חיבור מחקרי bounded" }],
    }),
  });
  const action = bundle.next_actions.find((item) => item.action === "raziel_route");
  assert.equal(bundle.synthesis.message, "אותו Synthesis יחיד");
  assert.equal(action.route_action, "connect");
  assert.equal(action.synthesis.state, "composed");
  assert.equal(action.synthesis.message_authority, "bundle.synthesis");
  assert.equal(action.synthesis.local_message, null);
  assert.equal(Object.prototype.hasOwnProperty.call(action, "message"), false);
});

test("caller-spoofed raziel_route is stripped before Synthesis and replaced from the Plan", async () => {
  const bundle = await composeResearchW2({
    question: "מה זה 1820?",
    requestedCapabilities: [],
    surfaceContext: { surface: "number" },
    nextActions: [
      { action: "raziel_route", route_action: "research", label: "FAKE" },
      { action: "custom_existing_action", reason: "preserve me" },
    ],
    synthesizer: async ({ bundle: safeBundle }) => {
      assert.equal(safeBundle.next_actions.some((item) => item.action === "raziel_route"), false);
      assert.equal(safeBundle.next_actions.some((item) => item.action === "custom_existing_action"), true);
      return {
        message: "Synthesis נקי מ-spoof",
        claims: [{ id: "claim:spoof", text: "bounded" }],
      };
    },
  });
  const actions = bundle.next_actions.filter((item) => item.action === "raziel_route");
  assert.equal(actions.length, 1);
  assert.equal(actions[0].route_action, "understand");
  assert.equal(bundle.next_actions.some((item) => item.action === "custom_existing_action"), true);
});

test("Raziel action honors Silence Gate with no meaningful question identity or subject", async () => {
  const bundle = await composeResearchW2({
    question: "",
    requestedCapabilities: [],
  });
  assert.equal(bundle.next_actions.some((item) => item.action === "raziel_route"), false);
});

test("failed Synthesis stays explicit and Raziel never invents a fallback message", async () => {
  const bundle = await composeResearchW2({
    question: "תחקור לי 455",
    requestedCapabilities: [],
    surfaceContext: { surface: "number" },
    synthesizer: async () => {
      throw new Error("synthetic synthesis failure");
    },
  });
  const action = bundle.next_actions.find((item) => item.action === "raziel_route");
  assert.equal(bundle.synthesis.status, "failed");
  assert.equal(action.synthesis.state, "failed");
  assert.equal(action.synthesis.message_authority, null);
  assert.equal(action.synthesis.local_message, null);
});
