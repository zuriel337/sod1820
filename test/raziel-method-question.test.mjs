// RAZIEL_METHOD_QUESTION_V1 — the shared structural grammar (razielSemanticIntentGate.js) now recognises general
// "method of an expression" questions. The method slot is admitted only when the token IS a canonical method, using the
// engine definitions that mirror the Registry — no word of this file's examples (חכמה / בינה / מסתתר …) is in the grammar.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  canonicalMethodVocabulary,
  resolveExplicitHebrewExpressionResearchSubject,
} from "../src/lib/research/razielSemanticIntentGate.js";
import { buildRazielSessionRequest, createInitialRazielSessionState } from "../src/lib/research/razielSession2029.js";
import { METHODS, DEPTH_METHODS, methodLabel } from "../src/lib/gematria.js";
import { runAiAnalyze } from "./helpers/ai-analyze-handler.mjs";
import * as F from "./helpers/raziel-view-mode-fixtures.mjs";

const MODES = ["general", "landscape", "exploratory"];

const POSITIVE = [
  ["מה אומר המסתתר של חכמה?", "חכמה", "מסתתר"],
  ["מה יש לך על המסתתר של חכמה?", "חכמה", "מסתתר"],
  ["מה פירוש המסתתר של חכמה?", "חכמה", "מסתתר"],
  ["מה המשמעות של המסתתר של חכמה?", "חכמה", "מסתתר"],
  ["בדוק את חכמה בשיטת מסתתר", "חכמה", "מסתתר"],
  ["מה האתבש של משיח?", "משיח", "אתבש"],
  ["מה הקדמי של חכמה?", "חכמה", "קדמי"],
];

test("positive: every requested wording yields the expression + method hint (research)", () => {
  for (const [question, label, method] of POSITIVE) {
    const subject = resolveExplicitHebrewExpressionResearchSubject(question);
    assert.ok(subject, question);
    assert.equal(subject.label, label, question);
    assert.equal(subject.requested_method, method, question);
    assert.equal(subject.requested_action, "research", question);
    assert.equal(subject.identity_key, `phrase:${label}`, question);
    assert.equal(subject.explicit_text_computation, true);
  }
});

test("general by construction: other expressions, other methods, quote variants, multi-word methods — nothing is tied to the examples", () => {
  const cases = [
    ["מה אומר המילוי של שלום", "שלום", "מילוי"],
    ["מה פירוש האלבם של אמת?", "אמת", "אלבם"],
    ["מה האתב\"ש של תורה?", "תורה", "אתבש"],
    ["מה אומר האלב״ם של אהבה", "אהבה", "אלבם"],
    ["מה ההכפלה של שלום", "שלום", "הכפלה"],
    ["מה המשמעות של המשולש של אור", "אור", "משולש"],
    ["מה אומר המשולש מילה של אור", "אור", "משולש מילה"],
    ["מה הסידורי של יהוה?", "יהוה", "סידורי"],
    ["בדוק את אהבה בשיטת סידורי", "אהבה", "סידורי"],
    ["חשב את המילה שלום בשיטת אתבש", "שלום", "אתבש"],
    ["מה המסתתר של המילה צוריאל?", "צוריאל", "מסתתר"],
    ["מה הרגיל של בינה?", "בינה", "רגיל"],
  ];
  for (const [question, label, method] of cases) {
    const subject = resolveExplicitHebrewExpressionResearchSubject(question);
    assert.ok(subject, question);
    assert.equal(subject.label, label, question);
    assert.equal(subject.requested_method, method, question);
  }
});

test("the grammar source names no particular expression or method in code (comments excluded)", () => {
  const source = readFileSync(new URL("../src/lib/research/razielSemanticIntentGate.js", import.meta.url), "utf8");
  const code = source.split("\n").map((line) => line.replace(/\/\/.*$/u, "")).join("\n");
  for (const word of ["חכמה", "בינה", "מסתתר", "אתבש", "קדמי", "משיח"]) {
    assert.equal(code.includes(word), false, `"${word}" must not appear in grammar code`);
  }
  assert.match(code, /METHODS, DEPTH_METHODS, methodLabel/);
});

test("negative: 'מסתתר' as an ordinary verb, or a non-method noun in the slot, is NOT a method question", () => {
  const negatives = [
    "מי מסתתר מאחורי חכמה?",
    "מה אומר מי שמסתתר מאחורי המילה חכמה?",
    "מה מסתתר של חכמה?",                // verb, no definite article
    "מה אומר מסתתר של חכמה?",           // verb, no definite article
    "מה אומר הילד המסתתר של המשפחה?",   // 'המסתתר' qualifies a noun; the slot is not a method name
    "מה אומר הילד שמסתתר של חכמה?",
    "בדוק מי מסתתר בשיטת חכמה",         // method slot holds a non-method
    "בדוק את הילד שמסתתר",
    "הוא מסתתר של חכמה",
    "מה פירוש המילה מסתתר?",
    "מה אומר השם של דוד?",              // non-method noun in the slot
    "מה פירוש הערך של חכמה?",
    "מה הצבע של חכמה?",
    "מה אומר הנסתר של חכמה?",           // 'נסתר' is not a registered method name
  ];
  for (const question of negatives) {
    const subject = resolveExplicitHebrewExpressionResearchSubject(question);
    assert.equal(subject?.requested_method ?? null, null, question);
    assert.equal(subject, null, question);
  }
});

test("existing behaviour is unchanged: plain value/gematria questions and the older focused forms keep their meaning", () => {
  const unchanged = [
    ["מה הערך של חכמה", "חכמה", undefined],
    ["מה הגימטריה של שלום", "שלום", undefined],
    ["מה יש לך על המסתתר של חכמה", "חכמה", "מסתתר"],
    ["מה אתה אומר על 271 המשולש של חכמה", "חכמה", "משולש"],
    ["חשב את חכמה בשיטת הצללים", "חכמה בשיטת הצללים", undefined], // unknown "method" keeps the old generic parse
  ];
  for (const [question, label, method] of unchanged) {
    const subject = resolveExplicitHebrewExpressionResearchSubject(question);
    assert.equal(subject?.label, label, question);
    assert.equal(subject?.requested_method, method, question);
  }
});

test("method vocabulary mirrors the engine definitions and any Registry method missing from code is an explicit, tested gap", () => {
  const vocabulary = canonicalMethodVocabulary();
  const comparable = (value) => String(value).replace(/["'`׳״’‘“”]/gu, "").replace(/[־–—\-\s]+/gu, "");
  for (const method of [...METHODS, ...DEPTH_METHODS]) {
    assert.ok(vocabulary.has(comparable(method.key)), method.key);
    assert.ok(vocabulary.has(comparable(methodLabel(method.key))), methodLabel(method.key));
  }
  assert.ok(vocabulary.has("משולש") && vocabulary.has("קדמי"), "public alias and registry key both resolve");
  // Live gematria_methods (active, in_engine) snapshot, 2026-10-23, atomic keys only. A new Registry method that the
  // engine definitions do not yet carry shows up here instead of silently becoming un-askable.
  const registryAtomicKeys = [
    "רגיל", "מילוי", "מסתתר", "קדמי", "ריבוע", "גדול", "סידורי", "אתבש", "אלבם", "אטבח", "אותיות אחרי", "אותיות לפני",
    "מילוי בלבד", "הכפלה", "משולש גדול", "מסתתר גדול", "מילוי דמילוי", "מילוי דמילוי גדול", "הכפלה גדולה", "ריבוע גדול",
    "משולש מילה", "משולש הפוך", "משולש מדרגות", "מילוי גדול", "איק בכר", "אות רבתי", "מיקום האות", "מילוי בלבד גדול",
  ];
  const gap = registryAtomicKeys.filter((key) => !vocabulary.has(comparable(key))).sort();
  assert.deepEqual(gap, ["אות רבתי", "איק בכר", "מילוי בלבד גדול", "מילוי גדול", "מיקום האות"].sort());
});

test("the real client resolver produces the SAME identity and action in all three view modes (view_mode never feeds the grammar)", () => {
  for (const [question, label] of POSITIVE) {
    const resolutions = MODES.map((mode) => buildRazielSessionRequest({
      question, state: createInitialRazielSessionState(), contextSnapshot: null, intelligenceLevel: "fast", viewMode: mode,
    }).conversationResolution);
    assert.ok(resolutions[0], question);
    assert.deepEqual(resolutions[1], resolutions[0], question);
    assert.deepEqual(resolutions[2], resolutions[0], question);
    assert.deepEqual(resolutions[0].identities.map((i) => i.identity_key), [`phrase:${label}`], question);
    assert.equal(resolutions[0].requested_action, "research", question);
  }
});

// ── end to end through the real Edge handler, the real Bundle composer and the real client request builder ──
const BUNDLES = Object.freeze({
  researchBundleByExpression: { חכמה: F.expressionCrossingBundle("חכמה"), משיח: F.expressionCrossingBundle("משיח") },
  researchBundleByNumber: { 67: F.numberBundle(67), 271: F.numberBundle(271) },
});

async function ask(question, mode, { allowed = true } = {}) {
  const req = buildRazielSessionRequest({
    question, state: createInitialRazielSessionState(), contextSnapshot: null, intelligenceLevel: "fast", viewMode: mode,
  });
  return runAiAnalyze({
    answer: F.noMatchAnswer(), allowed, bearer: "synthetic-anon-key",
    body: {
      subject: req.subject, visitor_id: "vmethodquestion1", intelligence_level: "fast",
      research_contract: req.researchContract,
      ...(req.conversationResolution ? { conversation_resolution: req.conversationResolution } : {}),
      ...(req.viewMode ? { view_mode: req.viewMode } : {}),
    },
    ...BUNDLES,
  });
}
const reads = (run) => run.calls.filter((call) => call.name === "research-run")
  .map(({ payload }) => ({ contract: payload.contract, expression: payload.expression ?? null, number: payload.number ?? null, capabilities: payload.requested_capabilities ?? null }));

test("'מה אומר המסתתר של חכמה?' returns חכמה · מסתתר = 67 and opens the Number 67 Bundle where בינה · רגיל = 67 — in every mode", async () => {
  const question = "מה אומר המסתתר של חכמה?";
  const general = await ask(question, "general", { allowed: false });
  assert.equal(general.models.length, 0);
  assert.equal(general.result.model, "none");
  assert.deepEqual(general.result.raziel.facts, [
    { label: "חכמה · מסתתר", value: "67" },
    { label: "בינה · רגיל", value: "67" },
  ]);
  assert.match(general.result.raziel.answer, /חכמה בשיטת מסתתר = 67/);
  assert.match(general.result.raziel.answer, /בינה בשיטת רגיל = 67/);
  assert.doesNotMatch(general.result.raziel.answer, /מסתתר = 73/);
  assert.deepEqual(reads(general), [
    { contract: F.EXPRESSION_CONTRACT, expression: "חכמה", number: null, capabilities: ["gematria", "crossings"] },
    { contract: F.CONTRACT, expression: null, number: 67, capabilities: general.calls.find((c) => c.name === "research-run" && c.payload.number === 67).payload.requested_capabilities },
  ]);

  for (const mode of ["landscape", "exploratory"]) {
    const run = await ask(question, mode);
    assert.deepEqual(reads(run), reads(general), `${mode}: same Bundle reads as general`);
    assert.equal(run.models.length, 1);
    assert.equal(run.models[0].user.includes("בינה"), true, `${mode}: the 67 Bundle (בינה · רגיל) reaches the synthesis material`);
    assert.match(run.models[0].user, /67/);
    assert.equal(run.result.raziel.plan_meta.canonical_result_bundle.status, "ready");
  }
});

test("every חכמה/מסתתר wording opens the same two Bundles in all three modes; landscape and exploratory get byte-identical material", async () => {
  for (const [question] of POSITIVE.filter(([, label, method]) => label === "חכמה" && method === "מסתתר")) {
    const general = await ask(question, "general");
    const landscape = await ask(question, "landscape");
    const exploratory = await ask(question, "exploratory");
    assert.deepEqual(reads(general).map((r) => r.expression ?? r.number), ["חכמה", 67], question);
    assert.deepEqual(reads(landscape), reads(general), question);
    assert.deepEqual(reads(exploratory), reads(general), question);
    assert.equal(landscape.models[0].user, exploratory.models[0].user, question);
    assert.equal(general.models.length, 0, `${question}: general stays on the zero-token deterministic route`);
    assert.equal(general.result.model, "none");
  }
});

test("'מה הקדמי של חכמה?' → חכמה · משולש = 271 and the 271 Bundle (הריון · רגיל = 271), same in every mode", async () => {
  const question = "מה הקדמי של חכמה?";
  const general = await ask(question, "general");
  assert.equal(general.models.length, 0);
  assert.deepEqual(general.result.raziel.facts, [
    { label: "חכמה · משולש", value: "271" },
    { label: "הריון · רגיל", value: "271" },
  ]);
  for (const mode of ["landscape", "exploratory"]) {
    const run = await ask(question, mode);
    assert.deepEqual(reads(run), reads(general), mode);
    assert.match(run.models[0].user, /הריון/);
    assert.match(run.models[0].user, /271/);
  }
});

test("'מה האתבש של משיח?' researches the expression משיח through the one canonical Bundle in every mode", async () => {
  const question = "מה האתבש של משיח?";
  const runs = [];
  for (const mode of MODES) runs.push(await ask(question, mode));
  for (const run of runs) {
    assert.deepEqual(reads(run)[0], { contract: F.EXPRESSION_CONTRACT, expression: "משיח", number: null, capabilities: ["gematria", "crossings"] });
    assert.equal(run.result.raziel.plan_meta.canonical_result_bundle.subject_type, "expression");
  }
  assert.deepEqual(reads(runs[1]), reads(runs[0]));
  assert.deepEqual(reads(runs[2]), reads(runs[0]));
});

test("negative sentences open no Bundle and make no research read, in any mode", async () => {
  for (const question of ["מה מסתתר של חכמה?", "מי מסתתר מאחורי חכמה?", "מה אומר מסתתר של חכמה?"]) {
    for (const mode of MODES) {
      const run = await ask(question, mode);
      assert.equal(reads(run).length, 0, `${mode}: ${question}`);
    }
  }
});
