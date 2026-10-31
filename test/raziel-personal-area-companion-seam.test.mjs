import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

import {
  RAZIEL_PERSONAL_AREA_COMPANION_ACTION,
  RAZIEL_PERSONAL_AREA_COMPANION_SUBJECT,
  normalizeRazielPersonalAreaCompanionAction,
  normalizeRazielSuggestedActions,
  prepareRazielSessionSubmission,
} from "../src/lib/research/razielSessionRequest2029.js";
import { createInitialRazielSessionState } from "../src/lib/research/razielSession2029.js";
import { runAiAnalyze } from "./helpers/ai-analyze-handler.mjs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const providerSource = read("../src/lib/research/RazielSessionProvider2029.jsx");
const mountSource = read("../src/components/experience2029/RazielSessionMount2029.jsx");
const actionsSource = read("../src/components/experience2029/RazielOneShotActions2029.jsx");
const transportSource = read("../src/lib/supabase.js");

const PRIVATE_VALUES = [
  "טקסט רמז פרטי",
  "שם ילד פרטי",
  "2014-03-02",
  "https://signed.example/private.png?token=secret",
  "מונח-אי-אל-אס-פרטי",
  "calculator:previous-secret",
];

const validAction = (withEvidence = true) => ({
  id: RAZIEL_PERSONAL_AREA_COMPANION_ACTION,
  capability: "hint_review",
  focus: "checked_hint",
  opaqueRefs: ["journey:journey_AbC12345", "session:session_AbC12345"],
  ...(withEvidence ? {
    evidencePack: {
      contract: "personal_area_checked_evidence_v1",
      checked: true,
      checkRef: "check:checked_AbC12345",
      refs: ["finding:finding_AbC12345", "source:source_AbC12345"],
    },
  } : {}),
  raw_hint: PRIVATE_VALUES[0],
  family_name: PRIVATE_VALUES[1],
  birth_date: PRIVATE_VALUES[2],
  signed_url: PRIVATE_VALUES[3],
  els_term: PRIVATE_VALUES[4],
  calculator_state: PRIVATE_VALUES[5],
});

function prepared(withEvidence = true) {
  return prepareRazielSessionSubmission({
    question: "טקסט שהמסך אינו רשאי להעביר",
    state: createInitialRazielSessionState(),
    researchContext: {
      subject: { label: PRIVATE_VALUES[1], href: PRIVATE_VALUES[3] },
      dimensions: { elsFocus: { term: PRIVATE_VALUES[4] } },
    },
    facts: PRIVATE_VALUES.join(" | "),
    companionAction: validAction(withEvidence),
    startedAt: "2026-10-26T20:00:00.000Z",
    createTurnId: () => "personal-area-turn",
  });
}

function bodyOf(value) {
  const request = value.request;
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
    companion_action: request.companionAction,
  };
}

test("adapter contract sends only the explicit personal-area capability, focus, opaque refs and checked evidence receipt", () => {
  const action = normalizeRazielPersonalAreaCompanionAction(validAction());
  assert.deepEqual(action, {
    id: "personal_area_companion_v1",
    surface: "personal_area",
    capability: "hint_review",
    focus: "checked_hint",
    opaque_refs: ["journey:journey_AbC12345", "session:session_AbC12345"],
    evidence_pack: {
      contract: "personal_area_checked_evidence_v1",
      checked: true,
      check_ref: "check:checked_AbC12345",
      refs: ["finding:finding_AbC12345", "source:source_AbC12345"],
    },
  });
  const submission = prepared();
  assert.equal(submission.request.subject, RAZIEL_PERSONAL_AREA_COMPANION_SUBJECT);
  assert.equal(submission.request.context, null);
  assert.equal(submission.request.facts, "");
  assert.deepEqual(submission.request.surfaceSemantic, { surface: "personal_area" });
  assert.equal(submission.request.conversationResolution, null);
  assert.equal(submission.request.again, false);
  assert.equal(submission.request.intelligenceLevel, "fast");
  assert.equal(submission.contextSnapshot.surface, "personal_area");
  const serialized = JSON.stringify(submission);
  for (const value of PRIVATE_VALUES) assert.doesNotMatch(serialized, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("invalid personal-area contracts fail closed before the single transport boundary", () => {
  for (const companionAction of [
    null,
    { ...validAction(), id: "other" },
    { ...validAction(), capability: "family_search" },
    { ...validAction(), focus: "els" },
    { ...validAction(), opaqueRefs: ["https://private.example/value"] },
  ]) {
    if (companionAction === null) continue;
    assert.equal(prepareRazielSessionSubmission({
      state: createInitialRazielSessionState(),
      companionAction,
      startedAt: "now",
      createTurnId: () => "invalid",
    }), null);
  }
});

test("open, save, upload and reload paths have zero companion model calls; only the explicit method reaches submit", () => {
  const methodStart = providerSource.indexOf("const submitPersonalAreaCompanion");
  const methodEnd = providerSource.indexOf("const submitElsGuidedPlan", methodStart);
  const method = providerSource.slice(methodStart, methodEnd);
  assert.match(method, /=> submit\(\{/);
  assert.doesNotMatch(method, /transport|askRaziel|saveItem|upload|reload|useEffect/);
  const beforeMethod = providerSource.slice(0, methodStart);
  assert.doesNotMatch(beforeMethod, /personal_area_companion_v1[^]*submit\(/);
  assert.equal((providerSource.match(/await transport\(request\)/g) || []).length, 1);
  assert.match(providerSource, /Object\.defineProperty\(request, "__razielAbortSignal"/);
});

test("one explicit personal-area action makes exactly one model call and no legacy, ELS, family, personal-state or research-run read", async () => {
  const submission = prepared();
  const run = await runAiAnalyze({
    allowed: true,
    body: bodyOf(submission),
    modelResult: {
      text: JSON.stringify({
        v: 1,
        agent: "raziel",
        answer: "אפשר לבחור עכשיו צעד אחד ברור ולהמשיך ממנו בנחת.",
        facts: [],
        suggested_paths: [{ id: "forged", label: "לא" }],
      }),
      usage: { input_tokens: 11, output_tokens: 7 },
      attempts: 1,
      degraded: false,
    },
  });
  assert.equal(run.status, 200);
  assert.equal(run.models.length, 1);
  assert.equal(run.models[0].policy.retries, 1);
  assert.equal(JSON.stringify(run.models[0].policy.backoffMs), "[]");
  assert.match(run.models[0].user, /capability=hint_review/);
  assert.match(run.models[0].user, /focus=checked_hint/);
  for (const value of PRIVATE_VALUES) assert.doesNotMatch(run.models[0].user, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  const forbiddenCalls = new Set([
    "fn_raziel_answer", "fn_raziel_plan", "research-run", "research_state_snapshot_v1",
    "fn_research_path_resume_v1", "metatron_context",
  ]);
  assert.deepEqual(run.calls.filter((call) => forbiddenCalls.has(call.name)), []);
  assert.equal(run.calls.some((call) => /els|family/i.test(call.name)), false);
  assert.deepEqual(run.result.raziel.suggested_paths, [{
    id: "save_as_life_journey_hint",
    label: "שמור כרמז במסע שלי",
    icon: "hint",
    hint: "פתח טופס אישור באזור האישי; שום דבר לא נשמר אוטומטית.",
    href: "/2029/journey?focus=hints",
  }]);
});

test("a companion request without an explicit checked evidence pack cannot offer save-as-hint", async () => {
  const run = await runAiAnalyze({ allowed: true, body: bodyOf(prepared(false)) });
  assert.equal(run.models.length, 1);
  assert.deepEqual(run.result.raziel.suggested_paths, []);
});

test("private smuggling is rejected with zero model calls and no private value enters URL or operational telemetry", async () => {
  for (const patch of [
    { context: PRIVATE_VALUES[0] },
    { raw_hint: PRIVATE_VALUES[0] },
    { family_names: [PRIVATE_VALUES[1]] },
    { birth_date: PRIVATE_VALUES[2] },
    { signed_url: PRIVATE_VALUES[3] },
    { els_terms: [PRIVATE_VALUES[4]] },
    { calculator_state: PRIVATE_VALUES[5] },
  ]) {
    const rejected = await runAiAnalyze({ allowed: true, body: { ...bodyOf(prepared()), ...patch } });
    assert.equal(rejected.status, 400);
    assert.equal(rejected.result.error, "invalid_personal_area_companion_contract");
    assert.equal(rejected.models.length, 0);
  }

  const accepted = await runAiAnalyze({ allowed: true, body: bodyOf(prepared()) });
  for (const call of accepted.calls) {
    for (const value of PRIVATE_VALUES) {
      assert.doesNotMatch(call.url, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      if (call.name.startsWith("op_trace_")) {
        assert.doesNotMatch(JSON.stringify(call.payload), new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      }
    }
  }
  const begin = accepted.calls.find((call) => call.name === "op_trace_begin_v1");
  assert.equal(begin.payload.p_context.surface, "personal_area");
  assert.equal(begin.payload.p_context.capability, "ai-analyze:raziel:personal_area_companion");
  assert.equal(begin.payload.p_context.subject_ref, null);
});

test("principal switch aborts the active request, ignores its late answer and clears the keyed temporary context", () => {
  assert.match(mountSource, /const principalKey = loading \? "auth-loading" : \(user\?\.id \|\| "anon"\)/);
  assert.match(mountSource, /<RazielSessionProvider2029 key=\{principalKey\}/);
  assert.match(providerSource, /activeRequestRef\.current\?\.abort\(\)/);
  assert.match(providerSource, /mountedRef\.current = false/);
  assert.match(providerSource, /if \(!mountedRef\.current\) return \{ ok: false, error: "session_unmounted" \}/);
  assert.match(transportSource, /const signal = arguments\[0\]\?\.__razielAbortSignal \?\? null/);
  assert.match(transportSource, /signal instanceof AbortSignal \? \{ signal \} : \{\}/);
});

test("the real transport drops cancelled late quota/answers before global events or telemetry", async () => {
  const start = transportSource.indexOf("export async function askRaziel(");
  const end = transportSource.indexOf("// 🧭 askRazielAdvanced", start);
  const functionSource = transportSource.slice(start, end).replace("export async function", "async function");
  for (const payload of [{ error: "quota", tier: "anon" }, { analysis: "old principal answer" }]) {
    const controller = new AbortController();
    let calls = 0;
    const events = [], logs = [];
    const transport = runInNewContext(functionSource + "\naskRaziel;", {
      AbortSignal,
      supabase: { functions: { invoke: async (_name, options) => {
        calls++;
        assert.equal(options.signal, controller.signal);
        controller.abort();
        return { data: payload, error: null };
      } } },
      aiInteractionId: () => "synthetic-interaction",
      aiVisitorId: () => "synthetic-visitor",
      window: { dispatchEvent: (event) => events.push(event) },
      CustomEvent: class { constructor(type, value) { this.type = type; this.detail = value.detail; } },
      logAiAnalysis: (value) => logs.push(value),
      razielTransportMetadata: () => ({}),
    });
    assert.equal(await transport({ subject: "synthetic", __razielAbortSignal: controller.signal }), null);
    assert.equal(calls, 1);
    assert.deepEqual(events, []);
    assert.deepEqual(logs, []);
    assert.equal(await transport({ subject: "synthetic", __razielAbortSignal: controller.signal }), null);
    assert.equal(calls, 1, "already-aborted requests never start the transport");
  }
});

test("save-as-hint is a closed navigation action that opens the existing approval form and never saves by itself", () => {
  assert.deepEqual(normalizeRazielSuggestedActions([{
    id: "save_as_life_journey_hint",
    href: "/2029/journey?focus=hints",
    label: "forged label",
  }]), [{
    id: "save_as_life_journey_hint",
    label: "שמור כרמז במסע שלי",
    href: "/2029/journey?focus=hints",
  }]);
  assert.deepEqual(normalizeRazielSuggestedActions([{
    id: "save_as_life_journey_hint",
    href: "https://evil.example/2029/journey?focus=hints",
  }]), []);
  const actionStart = actionsSource.indexOf('if (action.id === "save_as_life_journey_hint")');
  const actionEnd = actionsSource.indexOf("setActionState", actionStart);
  const actionBlock = actionsSource.slice(actionStart, actionEnd);
  assert.match(actionBlock, /navigate\(action\.href\)/);
  assert.doesNotMatch(actionBlock, /saveItem|saveCurrentSession|research\.|fetch|transport/i);
});
