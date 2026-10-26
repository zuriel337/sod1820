import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { runAiAnalyze } from "./helpers/ai-analyze-handler.mjs";
import * as F from "./helpers/raziel-view-mode-fixtures.mjs";
import { createInitialRazielSessionState } from "../src/lib/research/razielSession2029.js";
import { buildRazielSessionRequest } from "../src/lib/research/razielSessionRequest2029.js";
import {
  resolveExplicitHebrewExpressionPairResearchSubject,
  resolveExplicitHebrewExpressionResearchSubject,
  resolveExplicitNumericPairResearchSubject,
  resolveExplicitNumericResearchSubject,
  resolveRazielConversationalAct,
  resolveRazielDeterministicGuidance,
  resolveRazielExpressionContinuationDirective,
} from "../src/lib/research/razielSemanticIntentGate.js";

const MATRIX = JSON.parse(readFileSync(new URL("./fixtures/raziel-quality-matrix-v1.json", import.meta.url), "utf8"));
const modelText = (answer) => ({
  text: JSON.stringify({ v: 1, agent: "raziel", answer, facts: [], suggested_paths: [], follow_up_question: null, continue_wa: true }),
  usage: { input_tokens: 21, output_tokens: 33 }, attempts: 1, degraded: false,
});

function stateFor(row) {
  const state = createInitialRazielSessionState();
  if (!row.prior) return state;
  const identity = row.prior.type === "number"
    ? { type: "number", value: row.prior.value, identity_key: `number:${row.prior.value}` }
    : { type: "phrase", label: row.prior.label, identity_key: `phrase:${row.prior.label}` };
  return {
    ...state,
    thread: [{
      role: "user",
      text: row.prior.type === "number" ? `מספר ${row.prior.value}` : `המילה ${row.prior.label}`,
      identity_resolution: { identities: [identity], explicit_text_computation: row.prior.type === "phrase" },
    }],
  };
}

function compactIdentities(resolution) {
  return (resolution?.identities || []).map((identity) => identity.type === "number"
    ? { type: "number", value: identity.value }
    : { type: "phrase", label: identity.label });
}

test("quality corpus is versioned, unique and broad enough to catch systemic regressions", () => {
  assert.equal(MATRIX.version, "raziel-quality-matrix-v1");
  assert.equal(MATRIX.cases.length, 32);
  assert.equal(new Set(MATRIX.cases.map((row) => row.id)).size, MATRIX.cases.length);
  const groups = new Set(MATRIX.cases.map((row) => row.group));
  for (const group of ["expression", "method", "number", "number_pair", "expression_pair", "continuation", "guidance", "act", "reject"]) {
    assert.ok(groups.has(group), group);
  }
});

for (const row of MATRIX.cases) {
  test(`routing golden: ${row.id}`, () => {
    const request = buildRazielSessionRequest({
      question: row.question,
      state: stateFor(row),
      contextSnapshot: null,
    });
    assert.ok(request, row.question);

    if (row.group === "expression" || row.group === "method") {
      const parsed = resolveExplicitHebrewExpressionResearchSubject(row.question);
      assert.equal(parsed?.label, row.expect.label);
      assert.equal(parsed?.requested_action, row.expect.action);
      assert.equal(parsed?.requested_method, row.expect.method);
      assert.deepEqual(compactIdentities(request.conversationResolution), [{ type: "phrase", label: row.expect.label }]);
      assert.equal(request.conversationResolution?.requested_action, row.expect.action);
      return;
    }
    if (row.group === "number") {
      const parsed = resolveExplicitNumericResearchSubject(row.question);
      assert.equal(parsed?.value, row.expect.value);
      assert.deepEqual(compactIdentities(request.conversationResolution), [{ type: "number", value: row.expect.value }]);
      assert.equal(request.conversationResolution?.requested_action, row.expect.action);
      return;
    }
    if (row.group === "number_pair") {
      const parsed = resolveExplicitNumericPairResearchSubject(row.question);
      assert.deepEqual(parsed?.numbers, row.expect.values);
      assert.deepEqual(compactIdentities(request.conversationResolution), row.expect.values.map((value) => ({ type: "number", value })));
      assert.equal(request.conversationResolution?.requested_action, row.expect.action);
      return;
    }
    if (row.group === "expression_pair") {
      const parsed = resolveExplicitHebrewExpressionPairResearchSubject(row.question);
      assert.deepEqual(parsed?.expressions, row.expect.labels);
      assert.deepEqual(compactIdentities(request.conversationResolution), row.expect.labels.map((label) => ({ type: "phrase", label })));
      assert.equal(request.conversationResolution?.requested_action, row.expect.action);
      return;
    }
    if (row.group === "continuation") {
      const directive = resolveRazielExpressionContinuationDirective(row.question);
      assert.equal(directive?.requested_action, row.expect.action);
      assert.equal(directive?.requested_method ?? undefined, row.expect.method);
      if (row.expect.allMethods != null) assert.equal(directive?.all_methods, row.expect.allMethods);
      assert.deepEqual(compactIdentities(request.conversationResolution), [{ type: "phrase", label: row.expect.label }]);
      assert.equal(request.conversationResolution?.referential_follow_up, true);
      return;
    }
    if (row.group === "guidance") {
      assert.equal(resolveRazielDeterministicGuidance(row.question)?.kind, row.expect.kind);
      assert.equal(request.conversationResolution, null);
      return;
    }
    if (row.group === "act") {
      assert.equal(resolveRazielConversationalAct(row.question)?.act, row.expect.act);
      assert.equal(request.conversationResolution, null);
      return;
    }
    assert.equal(resolveExplicitHebrewExpressionResearchSubject(row.question), null);
    assert.equal(resolveExplicitNumericResearchSubject(row.question), null);
    assert.equal(request.conversationResolution, null);
  });
}

const bundles = {
  researchBundleByExpression: {
    חכמה: F.expressionCrossingBundle("חכמה"),
    בינה: F.expressionCrossingBundle("בינה"),
  },
  researchBundleByNumber: {
    67: F.numberBundle(67),
    73: F.numberBundle(73),
    271: F.numberBundle(271),
    777: F.numberBundle(777),
  },
};

function bodyFor(question, { state = createInitialRazielSessionState(), viewMode = "general", level = "fast" } = {}) {
  const request = buildRazielSessionRequest({ question, state, contextSnapshot: null, viewMode, intelligenceLevel: level });
  return {
    subject: request.subject,
    facts: request.facts,
    context: request.context,
    again: request.again,
    visitor_id: "raziel-quality-matrix-v1",
    intelligence_level: request.intelligenceLevel,
    research_contract: request.researchContract,
    ...(request.conversationResolution ? { conversation_resolution: request.conversationResolution } : {}),
    ...(request.viewMode ? { view_mode: request.viewMode } : {}),
  };
}

test("handler golden: a natural method question reaches canonical חכמה=271 evidence without a model", async () => {
  const run = await runAiAnalyze({
    answer: F.noMatchAnswer(), allowed: true, bearer: "synthetic-anon-key",
    body: bodyFor("תחשב לי את חכמה בשיטת משולש"),
    ...bundles,
  });
  assert.equal(run.models.length, 0);
  assert.equal(run.result.model, "none");
  assert.match(run.result.raziel.answer, /חכמה בשיטת משולש = 271/);
  assert.doesNotMatch(run.result.raziel.answer, /1036|1734|3795/);
});

test("handler golden: natural hidden-method wording keeps חכמה=67 and בינה=67 together", async () => {
  const run = await runAiAnalyze({
    answer: F.noMatchAnswer(), allowed: true, bearer: "synthetic-anon-key",
    body: bodyFor("מה אומר המסתתר של חכמה?"),
    ...bundles,
  });
  assert.equal(run.models.length, 0);
  assert.match(run.result.raziel.answer, /חכמה בשיטת מסתתר = 67/);
  assert.match(run.result.raziel.answer, /בינה בשיטת רגיל = 67/);
});

test("handler golden: a number question reads one canonical bundle and uses one synthesis call", async () => {
  const run = await runAiAnalyze({
    answer: F.noMatchAnswer(), allowed: true, bearer: "synthetic-anon-key",
    body: bodyFor("מה יש לך על המספר 777"),
    modelResult: modelText("777 פותח כאן קריאה זהירה מתוך הנתונים שסופקו בלבד."),
    ...bundles,
  });
  assert.equal(run.calls.filter((call) => call.name === "research-run").length, 1);
  assert.equal(run.models.length, 1);
  assert.match(run.models[0].user, /777/);
  assert.equal(run.result.raziel.answer, "777 פותח כאן קריאה זהירה מתוך הנתונים שסופקו בלבד.");
});

test("handler golden: exploratory is deep prose over the same evidence, not a second calculator", async () => {
  const run = await runAiAnalyze({
    answer: F.noMatchAnswer(), allowed: true, bearer: "synthetic-anon-key",
    body: bodyFor("מה יש לך על הגימטריה של חכמה", { viewMode: "exploratory", level: "deep" }),
    modelResult: modelText("חכמה נפתחת כאן מתוך 73, ומעמיקה דרך 67 ו־271.\n\nהקריאה נשארת הצעה פרשנית המבוססת על הממצאים שסופקו."),
    ...bundles,
  });
  assert.equal(run.models.length, 1);
  assert.ok(run.models[0].maxTokens >= 4000, "exploratory keeps a materially deep response budget");
  assert.match(run.models[0].system, /מצב «מתפרע»/);
  assert.match(run.models[0].user, /תיק פרשנות/);
  assert.match(run.models[0].user, /73/);
  assert.match(run.models[0].user, /67/);
  assert.match(run.models[0].user, /271/);
  assert.equal(run.calls.filter((call) => /calc|gematria/i.test(call.name)).length, 0);
});

test("handler golden: exploratory without a canonical bundle fails closed with zero model calls", async () => {
  const run = await runAiAnalyze({
    answer: F.noMatchAnswer(), allowed: true, bearer: "synthetic-anon-key",
    body: bodyFor("ספר לי משהו מעניין", { viewMode: "exploratory", level: "deep" }),
  });
  assert.equal(run.models.length, 0);
  assert.equal(run.result.model, "none");
  assert.equal(run.result.raziel.plan_meta.view_mode.applied, false);
  assert.equal(run.result.raziel.plan_meta.view_mode.reason, "no_canonical_bundle");
});

test("quality boundary: matrix tests consume existing owners and add no runtime implementation", () => {
  const source = readFileSync(new URL("./raziel-quality-matrix-v1.test.mjs", import.meta.url), "utf8");
  for (const forbidden of ["create" + "Client", "globalThis." + "fetch", "Deno." + "env"]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
  for (const forbidden of ["credit_" + "ledger", "quota" + "Limit", "registration-" + "nudge", "sod:ai-" + "quota"]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});
