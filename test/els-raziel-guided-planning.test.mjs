import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  ELS_RAZIEL_PLANNING_ACTION,
  ELS_RAZIEL_PLANNING_SUBJECT,
  deriveLockedElsSearchPlan,
  normalizeElsRazielPlanningAction,
  normalizeElsRazielSearchPlan,
} from "../src/lib/research/elsRazielPlanning.js";
import { prepareElsGuidedPlanFromRaziel } from "../src/lib/research/elsRazielGuidedPlanAdapter.js";
import {
  normalizeRazielResponse,
  prepareRazielSessionSubmission,
} from "../src/lib/research/razielSessionRequest2029.js";
import { createInitialRazielSessionState } from "../src/lib/research/razielSession2029.js";
import { runAiAnalyze } from "./helpers/ai-analyze-handler.mjs";

const STORY = 'חפש לי שני מילים "צוריאל פולייס" בתורה';
const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

function action() {
  return normalizeElsRazielPlanningAction({
    id: ELS_RAZIEL_PLANNING_ACTION,
    surface: "els",
    story: STORY,
    scope: "torah",
  });
}

function prepared() {
  return prepareRazielSessionSubmission({
    question: STORY,
    state: createInitialRazielSessionState(),
    researchContext: { subject: { label: "unrelated" } },
    facts: "must-not-enter-planning",
    elsPlanningAction: {
      id: ELS_RAZIEL_PLANNING_ACTION,
      surface: "els",
      story: STORY,
      scope: "torah",
    },
    startedAt: "2026-10-27T10:00:00.000Z",
    createTurnId: () => "els-plan-turn",
  });
}

function bodyOf(submission, patch = {}) {
  const request = submission.request;
  return {
    kind: "research",
    subject: request.subject,
    facts: request.facts,
    context: request.context,
    path: null,
    again: request.again,
    intelligence_level: request.intelligenceLevel,
    surface_semantic: request.surfaceSemantic,
    conversation_resolution: request.conversationResolution,
    research_contract: request.researchContract,
    els_planning_action: request.elsPlanningAction,
    ...patch,
  };
}

test("the explicit quoted two-word request becomes one bounded crossed pair, not instruction-token alternatives", () => {
  const normalizedAction = action();
  assert.equal(normalizedAction.pair_requested, true);
  assert.deepEqual(normalizedAction.locked_phrases, ["צוריאל פולייס"]);
  const plan = normalizeElsRazielSearchPlan({
    contract: "els_search_plan_v1",
    status: "READY",
    scope: "torah",
    mode: "crossed_pair",
    axes: [{ term: "צוריאל" }, { term: "פולייס" }],
    context_terms: ["בתורה", "חיפוש"],
    confidence: "high",
    rationale: "שתי מילים מצוטטות",
  }, normalizedAction);
  assert.deepEqual(plan.axes.map((axis) => axis.term), ["צוריאל", "פולייס"]);
  assert.deepEqual(plan.context_terms, []);
  const executableTerms = [
    ...plan.axes.map((axis) => axis.term),
    ...plan.context_terms,
  ];
  assert.equal(executableTerms.includes("בתורה"), false);
  assert.equal(executableTerms.includes("חיפוש"), false);
  assert.equal(plan.authority, "PROPOSED_UNTIL_CANONICAL_ELS_MATCH");
  assert.equal("skip" in plan, false);
  assert.equal("start" in plan, false);
});

test("quoted text is locked and a malformed model plan falls back only to the explicit quote", () => {
  const repaired = normalizeElsRazielSearchPlan({
    contract: "els_search_plan_v1",
    status: "READY",
    scope: "torah",
    mode: "crossed_pair",
    axes: [{ term: "צוריאל" }, { term: "פוליס" }],
    context_terms: [],
  }, action());
  assert.deepEqual(repaired.axes.map((axis) => axis.term), ["צוריאל", "פולייס"]);
  const fallback = deriveLockedElsSearchPlan(action());
  assert.deepEqual(fallback.axes.map((axis) => axis.term), ["צוריאל", "פולייס"]);
  assert.equal(fallback.mode, "crossed_pair");
});

test("a user-locked two-letter axis reaches the canonical cross path without relaxing ordinary Guided defaults", () => {
  const story = 'חפש לי שתי מילים "אש אטום" בתורה';
  const shortAction = normalizeElsRazielPlanningAction({
    id: ELS_RAZIEL_PLANNING_ACTION,
    surface: "els",
    story,
    scope: "torah",
  });
  const searchPlan = deriveLockedElsSearchPlan(shortAction);
  const projected = prepareElsGuidedPlanFromRaziel({ story, scope: "torah", response: { elsSearchPlan: searchPlan } });
  assert.deepEqual(projected.axes, ["אש", "אטום"]);
  assert.equal(projected.anchorCandidates[0].canonicalTerm, "אש");
  assert.equal(projected.searchMode, "crossed_pair");
});

test("a two-letter context proposal survives the existing Guided plan without becoming evidence", () => {
  const story = "אירוע שבו ספינה עלתה באש";
  const response = { elsSearchPlan: { contract: "els_search_plan_v1", status: "READY", scope: "torah",
    mode: "anchor_context", axes: [{ term: "ספינה" }], context_terms: ["אש"], confidence: "medium", rationale: "הקשר" } };
  const plan = prepareElsGuidedPlanFromRaziel({ story, scope: "torah", response });
  assert.ok(plan.contextCandidates.some(candidate => candidate.term === "אש" && candidate.selected));
  assert.equal(plan.truthPromotion, false);
});

test("a three-word request keeps all three distinct locked terms and rejects a partial pair", () => {
  const story = 'חפש את שלוש המילים "משיח טבת עשירי" בתורה';
  const a = normalizeElsRazielPlanningAction({ id: ELS_RAZIEL_PLANNING_ACTION, surface: "els", story, scope: "torah" });
  const plan = deriveLockedElsSearchPlan(a);
  assert.equal(plan.mode, "crossed_three");
  assert.deepEqual(plan.axes.map(item => item.term), ["משיח", "טבת", "עשירי"]);
  assert.deepEqual(prepareElsGuidedPlanFromRaziel({ story, response: { elsSearchPlan: plan } }).axes, ["משיח", "טבת", "עשירי"]);
  assert.equal(normalizeElsRazielSearchPlan({ contract: "els_search_plan_v1", status: "READY", scope: "torah", mode: "crossed_pair", axes: ["משיח", "טבת"] }, a), null);
  assert.equal(normalizeElsRazielSearchPlan({ contract: "els_search_plan_v1", status: "READY", scope: "torah", mode: "crossed_three", axes: ["משיח", "טבת", "עשירי", "מלאך"] }, a), null);
  const separate = normalizeElsRazielPlanningAction({ id: ELS_RAZIEL_PLANNING_ACTION, surface: "els",
    story: 'חפש שלוש מילים "משיח" "טבת" "עשירי"', scope: "torah" });
  assert.deepEqual(deriveLockedElsSearchPlan(separate).axes.map(item => item.term), ["משיח", "טבת", "עשירי"]);
});

test("the existing server accepts one explicit three-term planning call and retains all locked words", async () => {
  const story = 'חפש שלוש מילים "משיח טבת עשירי" בתורה';
  const submission = prepareRazielSessionSubmission({ question: story, state: createInitialRazielSessionState(),
    elsPlanningAction: { id: ELS_RAZIEL_PLANNING_ACTION, surface: "els", story, scope: "torah" },
    startedAt: "2026-10-27T10:00:00.000Z", createTurnId: () => "three-turn" });
  const run = await runAiAnalyze({ allowed: true, body: bodyOf(submission), modelResult: {
    text: JSON.stringify({ els_search_plan: { contract: "els_search_plan_v1", status: "READY", scope: "torah", mode: "crossed_three", axes: ["משיח", "טבת", "עשירי"] } }),
    usage: { input_tokens: 25, output_tokens: 17 }, attempts: 1, degraded: false,
  } });
  assert.equal(run.models.length, 1);
  assert.deepEqual(run.result.raziel.els_search_plan.axes.map(item => item.term), ["משיח", "טבת", "עשירי"]);
  assert.match(run.result.raziel.answer, /תוכנית בלבד/);
});

test("the session adapter carries the full sealed story but no facts, context or second transport", () => {
  const submission = prepared();
  assert.equal(submission.request.subject, ELS_RAZIEL_PLANNING_SUBJECT);
  assert.equal(submission.request.facts, "");
  assert.equal(submission.request.context, null);
  assert.equal(submission.request.conversationResolution, null);
  assert.deepEqual(submission.request.surfaceSemantic, { surface: "els" });
  assert.equal(submission.turn.question, STORY);
  assert.equal(submission.request.elsPlanningAction.story, STORY);

  const provider = read("../src/lib/research/RazielSessionProvider2029.jsx");
  const page = read("../src/pages/Els2029Page.jsx");
  const guided = read("../src/components/experience2029/ElsGuidedDiscovery2029.jsx");
  assert.equal((provider.match(/await transport\(request\)/g) || []).length, 1);
  assert.match(provider, /const submitElsGuidedPlan[\s\S]*?=> submit\(\{/);
  assert.match(page, /submitElsGuidedPlan\(\{ story, scope \}\)/);
  assert.match(guided, /const submit = async \(event\)/);
  assert.match(guided, /await onPlan\(\{ story, scope \}\)/);
  assert.doesNotMatch(guided, /useEffect|askRaziel|functions\.invoke|fetch\s*\(/);
});

test("one explicit Guided submit makes one model call and bypasses every research, ELS and memory tool", async () => {
  const modelPlan = {
    els_search_plan: {
      contract: "els_search_plan_v1",
      status: "READY",
      scope: "torah",
      mode: "crossed_pair",
      axes: [{ term: "צוריאל" }, { term: "פולייס" }],
      context_terms: ["בתורה"],
      confidence: "high",
      rationale: "שתי מילים מצוטטות",
    },
  };
  const run = await runAiAnalyze({
    allowed: true,
    body: bodyOf(prepared()),
    modelResult: {
      text: JSON.stringify(modelPlan),
      usage: { input_tokens: 25, output_tokens: 17 },
      attempts: 1,
      degraded: false,
    },
  });
  assert.equal(run.status, 200);
  assert.equal(run.models.length, 1);
  assert.equal(run.models[0].policy.retries, 1);
  assert.match(run.models[0].user, /צוריאל פולייס/);
  assert.deepEqual(run.result.raziel.els_search_plan.axes.map((axis) => axis.term), ["צוריאל", "פולייס"]);
  assert.deepEqual(run.result.raziel.els_search_plan.context_terms, []);
  assert.match(run.result.raziel.answer, /תוכנית בלבד/);
  const forbidden = new Set([
    "fn_raziel_answer", "fn_raziel_plan", "research-run", "research_state_snapshot_v1",
    "fn_research_path_resume_v1", "metatron_context", "fn_raziel_context", "fn_raziel_remember",
  ]);
  assert.deepEqual(run.calls.filter((call) => forbidden.has(call.name)), []);
  assert.equal(run.calls.some((call) => /els.search|family/i.test(call.name)), false);
});

test("an unquoted narrative uses the deeper existing Raziel model while a locked short instruction stays fast", async () => {
  const story = "אני מביא סיפור היסטורי על עיר, ספינה ואירוע אש ורוצה שהמערכת תבין אילו מילים מרכזיות ראוי לבדוק";
  const submission = prepareRazielSessionSubmission({
    question: story,
    state: createInitialRazielSessionState(),
    elsPlanningAction: { id: ELS_RAZIEL_PLANNING_ACTION, surface: "els", story, scope: "torah" },
    startedAt: "2026-10-27T10:00:00.000Z",
    createTurnId: () => "narrative-turn",
  });
  assert.equal(submission.request.intelligenceLevel, "deep");
  const run = await runAiAnalyze({
    allowed: true,
    body: bodyOf(submission),
    modelResult: {
      text: JSON.stringify({ els_search_plan: {
        contract: "els_search_plan_v1", status: "READY", scope: "torah", mode: "anchor_context",
        axes: [{ term: "ספינה" }], context_terms: ["עיר", "אש"], confidence: "medium", rationale: "ציר מובחן מתוך הסיפור",
      } }),
      usage: { input_tokens: 30, output_tokens: 20 }, attempts: 1, degraded: false,
    },
  });
  assert.equal(run.models.length, 1);
  assert.doesNotMatch(run.models[0].model, /haiku/i);
  assert.equal(run.result.intelligence_level, "deep");
  assert.equal(run.result.raziel.els_search_plan.mode, "anchor_context");
});

test("invalid planning envelopes fail closed before quota or model work", async () => {
  for (const patch of [
    { context: "smuggled" },
    { facts: "smuggled" },
    { view_mode: "exploratory" },
    { surface_semantic: { surface: "els", secret: "x" } },
    { els_planning_action: { ...prepared().request.elsPlanningAction, story: "changed" } },
  ]) {
    const run = await runAiAnalyze({ allowed: true, body: bodyOf(prepared(), patch) });
    assert.equal(run.status, 400);
    assert.equal(run.result.error, "invalid_els_planning_contract");
    assert.equal(run.models.length, 0);
    assert.equal(run.calls.some((call) => call.name === "ai_quota_check"), false);
  }
});

test("accepted server plan projects into the existing canonical cross command without becoming evidence", () => {
  const lockedPlan = deriveLockedElsSearchPlan(action());
  const response = normalizeRazielResponse({
    v: 1,
    answer: "הבנתי",
    els_search_plan: lockedPlan,
  }, "fast", prepared().request);
  const projected = prepareElsGuidedPlanFromRaziel({ story: STORY, scope: "torah", response });
  assert.equal(projected.searchMode, "crossed_pair");
  assert.deepEqual(projected.axes, ["צוריאל", "פולייס"]);
  assert.equal(projected.aiUsed, true);
  assert.equal(projected.truthPromotion, false);
  assert.equal(projected.raziel.maySearchOrVerify, false);
  const native = read("../src/components/experience2029/ElsNativeClassic2029.jsx");
  assert.match(native, /\["crossed_pair", "crossed_three"\]\.includes\(researchLoad\.searchMode\)/);
  assert.match(native, /requestSearch\("cross", \{ axis: term, term: secondaryAxis/);
});
