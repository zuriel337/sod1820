import test from "node:test";
import assert from "node:assert/strict";

import {
  projectRazielConversationResolution,
  resolveRazielConversationTurn,
} from "./razielConversationResolver.js";
import { RESEARCH_CAPABILITY } from "./researchPlanV2.js";

test("one resolved Raziel turn delegates to the canonical Research Plan V2", () => {
  const out = resolveRazielConversationTurn({ question: "חקור את 776 מול 1820" });

  assert.equal(out.research_plan.v, 2);
  assert.equal(out.research_plan.strategy, "number_research");
  assert.strictEqual(out.research_plan.identities, out.identity_resolution.identities);
  assert.strictEqual(out.research_plan.route_grammar.requested_action, out.requested_action);
  assert.equal(out.research_plan.route_grammar.requested_action, "research");
  assert.ok(out.research_plan.requested_capabilities.includes(RESEARCH_CAPABILITY.NUMERIC));
  assert.ok(out.research_plan.requested_capabilities.includes(RESEARCH_CAPABILITY.OPERATORS));
  assert.ok(out.research_plan.requested_capabilities.includes(RESEARCH_CAPABILITY.RELATIONS));
  assert.equal(out.guards.canonical_research_plan, true);
  assert.equal(out.guards.research_plan_is_not_execution_authority, true);
});

test("semantic identity stays ahead of textual calculation in the shared plan", () => {
  const out = resolveRazielConversationTurn({
    question: "תבדוק את זה",
    thread: [{
      role: "user",
      identity_resolution: {
        identities: [{
          type: "book",
          identity_key: "book:ahavat-torah",
          label: "אהבת תורה",
          source: "graph_identity",
          confidence: "exact",
        }],
      },
    }],
  });

  assert.equal(out.research_plan.primary_identity.type, "book");
  assert.equal(out.research_plan.strategy, "source_research");
  assert.equal(out.research_plan.guards.semantic_identity_precedes_text_calculation, true);
  assert.equal(out.research_plan.guards.text_calculation_allowed, false);
  assert.ok(out.research_plan.requested_capabilities.includes(RESEARCH_CAPABILITY.BOOKS));
  assert.ok(out.research_plan.requested_capabilities.includes(RESEARCH_CAPABILITY.SOURCES));
  assert.equal(out.research_plan.requested_capabilities.includes(RESEARCH_CAPABILITY.GEMATRIA), false);
});

test("the canonical plan is temporary context and never crosses the client/server authority boundary", () => {
  const out = resolveRazielConversationTurn({ question: "מה ידוע על המספר 26" });
  const projected = projectRazielConversationResolution(out);

  assert.equal(projected.version, "raziel-conversation-resolver-v1");
  assert.deepEqual(projected.identities, [
    { type: "number", value: 26, identity_key: "number:26" },
  ]);
  assert.equal(Object.hasOwn(projected, "research_plan"), false);
  assert.equal(Object.hasOwn(projected, "requested_capabilities"), false);
  assert.equal(projected.guards.server_must_reauthorize, true);
});

test("planning adds zero model, network, storage or execution side effects", () => {
  const before = globalThis.fetch;
  const out = resolveRazielConversationTurn({
    question: "תשווה משיח ומלך ישראל בכל השיטות",
  });

  assert.strictEqual(globalThis.fetch, before);
  assert.equal(out.guards.no_model_inference, true);
  assert.equal(out.guards.no_tool_execution, true);
  assert.equal(out.guards.no_persistent_memory, true);
  assert.equal(out.research_plan.guards.canonical_owners_decide_execution, true);
  assert.equal(out.research_plan.route_grammar.guards.no_second_router, true);
});
