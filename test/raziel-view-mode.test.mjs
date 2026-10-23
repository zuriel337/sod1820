// RAZIEL_VIEW_MODE_V1 — server contract. These tests execute the REAL ai-analyze handler (test/helpers/ai-analyze-handler.mjs,
// synthetic env + mocked fetch, no native network) over the REAL canonical Result Bundle composer, with requests built by the
// REAL client session builder. view_mode is a separate axis from intelligence_level and never changes what is calculated.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { runAiAnalyze, UID, USER_JWT } from "./helpers/ai-analyze-handler.mjs";
import * as F from "./helpers/raziel-view-mode-fixtures.mjs";
import { buildRazielSessionRequest, createInitialRazielSessionState } from "../src/lib/research/razielSession2029.js";
import { RAZIEL_VIEW_MODES } from "../src/lib/research/razielViewMode2029.js";
import { METHODS } from "../src/lib/gematria.js";

const MODES = ["general", "landscape", "exploratory"];
const NON_GENERAL = ["landscape", "exploratory"];
const MARKER = "[מצב התבוננות ניסיוני";

const Q_PAIR = "מה הקשר בין חכמה לבינה?";
const Q_271 = "מה אתה רואה ב־271?";
// Both formal and natural method-focused wording resolve through the same structural grammar.
const Q_HIDDEN = "מה יש לך על המסתתר של חכמה";
const Q_HIDDEN_NATURAL = "מה אומר המסתתר של חכמה?";

// Built once: every run in this file reads byte-identical fixtures (finding timestamps included).
const BUNDLES = Object.freeze({
  researchBundleByExpression: { חכמה: F.expressionCrossingBundle("חכמה"), בינה: F.expressionCrossingBundle("בינה") },
  researchBundleByNumber: { 67: F.numberBundle(67), 271: F.numberBundle(271) },
});
const bundles = () => BUNDLES;
// Plumbing that only exists once a model synthesis happens (persona/context fetch, token + cost accounting).
const SYNTHESIS_PLUMBING = ["ai_token_log", "fn_raziel_persona", "metatron_context", "op_trace_link_ai_cost_v1"];

const modelText = (answer) => ({
  text: JSON.stringify({ v: 1, agent: "raziel", answer, facts: [], suggested_paths: [], follow_up_question: null, continue_wa: true }),
  usage: { input_tokens: 21, output_tokens: 33 }, attempts: 1, degraded: false,
});

// Mirrors askRaziel's body: the request comes from the real client builder; view_mode is sent only when non-general.
function bodyFor(question, { mode = null, level = "fast", rawViewMode, extra = {} } = {}) {
  const req = buildRazielSessionRequest({
    question, state: createInitialRazielSessionState(), contextSnapshot: null, intelligenceLevel: level, viewMode: mode ?? "general",
  });
  return {
    subject: req.subject, facts: req.facts, context: req.context, again: req.again,
    visitor_id: "vviewmode12345", intelligence_level: req.intelligenceLevel,
    ...(req.surfaceSemantic ? { surface_semantic: req.surfaceSemantic } : {}),
    ...(req.conversationResolution ? { conversation_resolution: req.conversationResolution } : {}),
    research_contract: req.researchContract,
    ...(req.viewMode ? { view_mode: req.viewMode } : {}),
    ...(rawViewMode !== undefined ? { view_mode: rawViewMode } : {}),
    ...extra,
  };
}

async function ask(question, { mode = null, allowed = true, level = "fast", rawViewMode, modelResult, modelResults, extra, run: runExtra = {} } = {}) {
  return runAiAnalyze({
    answer: F.noMatchAnswer(), allowed, bearer: "synthetic-anon-key",
    body: bodyFor(question, { mode, level, rawViewMode, extra }),
    ...bundles(), ...(modelResult ? { modelResult } : {}), ...(modelResults ? { modelResults } : {}), ...runExtra,
  });
}

const researchCalls = (run) => run.calls.filter((call) => call.name === "research-run").map((call) => call.payload);
const callNames = (run) => run.calls.map((call) => call.name).sort();
// Trace ids are random per request; everything else must be identical.
const stripTrace = (result) => JSON.parse(JSON.stringify(result).replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, "<uuid>"));

// ── 1 + 2: general is untouched ─────────────────────────────────────────────────────────────────────────────
test("1) no view_mode ⇒ today's general behaviour: deterministic pair answer, zero model calls, no mode metadata", async () => {
  const run = await ask(Q_PAIR, { allowed: true });
  assert.equal(run.models.length, 0);
  assert.equal(run.result.engine, "deterministic");
  assert.equal(run.result.model, "none");
  assert.equal(run.result.intelligence_level, "deterministic");
  assert.match(run.result.raziel.answer, /חכמה בשיטת מסתתר = 67/);
  assert.equal(run.result.raziel.plan_meta.view_mode, undefined);
});

test("1b) general model synthesis carries no view-mode layer and keeps the original fast token ceiling", async () => {
  const run = await ask(Q_271);
  assert.equal(run.models.length, 1);
  assert.equal(run.models[0].system.includes(MARKER), false);
  assert.equal(run.models[0].maxTokens, 1600);
  assert.equal(run.result.raziel.plan_meta.view_mode, undefined);
  const model = run.spans.find((span) => span.p_name === "ai-analyze:raziel:model");
  assert.equal(model.p_detail.view_mode, undefined);
  assert.equal(model.p_detail.replay.parametersRef, "raziel:max_tokens:1600;level:fast;mode:baseline;numeric_truth_guard:v1");
});

test("2) explicit general and every unknown value fall to general: identical model call and response", async () => {
  const baseline = await ask(Q_271);
  for (const raw of ["general", "loud", "", "  ", null, 5, {}, ["landscape"], "landscape-ish", "exploratory;drop table", "mode"]) {
    const run = await ask(Q_271, { rawViewMode: raw });
    assert.equal(run.models.length, 1, `value ${JSON.stringify(raw)}`);
    assert.equal(run.models[0].system, baseline.models[0].system, `value ${JSON.stringify(raw)}`);
    assert.equal(run.models[0].user, baseline.models[0].user);
    assert.equal(run.models[0].maxTokens, baseline.models[0].maxTokens);
    assert.equal(run.models[0].model, baseline.models[0].model);
    assert.deepEqual(stripTrace(run.result), stripTrace(baseline.result));
  }
});

test("2b) view_mode without the canonical 2029 Research Contract is ignored (Legacy/WhatsApp-style callers)", async () => {
  const run = await runAiAnalyze({
    answer: F.noMatchAnswer(), allowed: true, bearer: "synthetic-anon-key",
    body: { subject: "מה זה 776?", visitor_id: "vlegacyviewmode1", intelligence_level: "fast", view_mode: "exploratory" },
  });
  assert.equal(run.calls.filter((call) => call.name === "research-run").length, 0);
  for (const model of run.models) assert.equal(model.system.includes(MARKER), false);
  assert.equal(run.result.raziel?.plan_meta?.view_mode, undefined);
});

// ── 3 + 7: same Result Bundle, same facts, one model call, no extra calculator ─────────────────────────────
for (const [name, question] of [["pair חכמה/בינה", Q_PAIR], ["271", Q_271], ["hidden method של חכמה", Q_HIDDEN]]) {
  test(`3/7) ${name}: landscape and exploratory read the SAME canonical Bundle as general; only the system layer differs`, async () => {
    const general = await ask(question);
    const runs = {};
    for (const mode of NON_GENERAL) runs[mode] = await ask(question, { mode });

    for (const mode of NON_GENERAL) {
      const run = runs[mode];
      // identical research reads, no extra capability/calculator/RPC family
      assert.deepEqual(researchCalls(run), researchCalls(general), `${mode}: research-run calls`);
      const extra = callNames(run).filter((n) => !callNames(general).includes(n));
      assert.deepEqual([...new Set(extra)].filter((n) => !SYNTHESIS_PLUMBING.includes(n)), [], `${mode}: only existing synthesis plumbing beyond general`);
      assert.equal(run.calls.filter((call) => /gematria|number_lookup|calc/i.test(call.name)).length, 0);
      // exactly one synthesis (no retry needed for a clean answer), provider/model axis untouched
      assert.equal(run.models.length, 1);
      assert.equal(run.models[0].model, "claude-haiku-4-5");
      assert.ok(run.models[0].system.includes(MARKER));
      assert.equal(run.result.raziel.plan_meta.view_mode.requested, mode);
      assert.equal(run.result.raziel.plan_meta.view_mode.applied, true);
    }
    // landscape and exploratory receive byte-identical factual material
    assert.equal(runs.landscape.models[0].user, runs.exploratory.models[0].user);
    // and the system prompt is persona + one small layer, never a duplicated persona
    const [l, e] = [runs.landscape.models[0].system, runs.exploratory.models[0].system];
    const common = l.slice(0, l.indexOf(MARKER));
    assert.equal(e.startsWith(common), true);
    assert.equal(l.split(MARKER).length, 2);
    assert.equal(e.split(MARKER).length, 2);

    if (general.models.length) {
      // general also synthesised → the user material is byte-identical to general's
      assert.equal(runs.landscape.models[0].user, general.models[0].user);
      assert.equal(runs.landscape.models[0].system.startsWith(general.models[0].system), true);
    } else {
      // general answered deterministically from the Bundle → every fact it showed is present in the material landscape received
      assert.equal(general.result.model, "none");
      for (const fact of general.result.raziel.facts) {
        assert.ok(runs.landscape.models[0].user.includes(fact.value), `fact value ${fact.value}`);
        assert.ok(runs.landscape.models[0].user.includes(fact.label.split(" · ")[0]), `fact label ${fact.label}`);
      }
    }
  });
}

test("7b) natural method wording resolves to the same canonical Bundle in every mode", async () => {
  const req = buildRazielSessionRequest({ question: Q_HIDDEN_NATURAL, state: createInitialRazielSessionState(), contextSnapshot: null });
  assert.deepEqual(req.conversationResolution?.identities, [
    { type: "phrase", label: "חכמה", identity_key: "phrase:חכמה" },
  ]);
  const general = await ask(Q_HIDDEN_NATURAL);
  assert.equal(researchCalls(general).length, 2);
  assert.equal(general.models.length, 0);
  assert.match(general.result.raziel.answer, /חכמה בשיטת מסתתר = 67/);
  assert.match(general.result.raziel.answer, /בינה בשיטת רגיל = 67/);
  for (const mode of NON_GENERAL) {
    const run = await ask(Q_HIDDEN_NATURAL, { mode });
    assert.equal(researchCalls(run).length, 2);
    assert.equal(run.models.length, 1);
    assert.match(run.models[0].user, /חכמה/);
    assert.match(run.models[0].user, /מסתתר/);
    assert.match(run.models[0].user, /67/);
    assert.match(run.models[0].user, /בינה/);
    assert.equal(run.result.raziel.plan_meta.view_mode.applied, true);
  }
});

// ── 8: the canonical numbers ───────────────────────────────────────────────────────────────────────────────────
test("8) explicit values: חכמה רגיל=73, חכמה מסתתר=67, בינה רגיל=67, הריון רגיל=271 — engine truth and Bundle material agree in every mode", async () => {
  const byKey = Object.fromEntries(METHODS.map((m) => [m.key, m.fn]));
  assert.equal(byKey["רגיל"]("חכמה"), 73);
  assert.equal(byKey["מסתתר"]("חכמה"), 67);
  assert.equal(byKey["רגיל"]("בינה"), 67);
  assert.equal(byKey["רגיל"]("הריון"), 271);
  assert.equal(byKey["קדמי"]("חכמה"), 271);

  for (const mode of MODES) {
    const wisdom = await ask(Q_PAIR, { mode: mode === "general" ? null : mode, allowed: mode === "general" ? false : true });
    const text = mode === "general" ? wisdom.result.raziel.answer : wisdom.models[0].user;
    assert.match(text, /חכמה/);
    assert.match(text, /בינה/);
    assert.match(text, /67/);
    assert.match(text, /מסתתר/);
    const n271 = await ask(Q_271, { mode: mode === "general" ? null : mode });
    assert.match(n271.models[0].user, /הריון/);
    assert.match(n271.models[0].user, /271/);
  }
  const wisdomCalc = await ask(Q_HIDDEN, { mode: "exploratory" });
  assert.match(wisdomCalc.models[0].user, /73/);
  assert.match(wisdomCalc.models[0].user, /271/);
});

// ── 4: no invented numbers, in all three modes ────────────────────────────────────────────────────────────────
for (const mode of MODES) {
  test(`4) numeric truth guard runs in "${mode}": a number outside the material is rejected, retried once, then replaced by a grounded fallback`, async () => {
    const invented = modelText("עובדה מאומתת: הריון בשיטת רגיל = 271. השערה ניסיונית: מספר 987654 קשור לכך.");
    const run = await ask(Q_271, { mode: mode === "general" ? null : mode, modelResults: [invented, invented] });
    assert.ok(run.models.length <= 2, "at most the existing guard retry");
    const shown = JSON.stringify(run.result);
    assert.equal(shown.includes("987654"), false);
    assert.equal(run.result.degraded, true);
    if (mode !== "general") {
      assert.equal(run.result.raziel.plan_meta.view_mode.applied, false);
      assert.equal(run.result.raziel.plan_meta.view_mode.reason, "degraded");
    }
  });
}

test("4b) a clean exploratory answer built only from provided numbers passes untouched", async () => {
  const answer = [
    "עובדה מאומתת: הריון בשיטת רגיל = 271.",
    "פרשנות אפשרית: ההתאמה מצביעה על קשר חישובי בלבד, ולא על קשר רעיוני.",
    "השערה ניסיונית: אפשר לבדוק אם ביטויים נוספים סביב 271 חולקים הקשר מילוני — עוד לא נבדק.",
  ].join("\n");
  const run = await ask(Q_271, { mode: "exploratory", modelResult: modelText(answer) });
  assert.equal(run.models.length, 1);
  assert.equal(run.result.raziel.answer, answer);
  assert.deepEqual(run.result.raziel.plan_meta.view_mode.structure, {
    verified_fact: true, possible_interpretation: true, experimental_hypothesis: true,
  });
});

// ── 5: three explicit tiers / landscape layers ────────────────────────────────────────────────────────────────
test("5) exploratory layer demands three separate tiers and forbids invention; landscape layer demands anchor + ordered layers + provenance prefixes", async () => {
  const [l, e] = [await ask(Q_271, { mode: "landscape" }), await ask(Q_271, { mode: "exploratory" })];
  const exploratory = e.models[0].system.slice(e.models[0].system.indexOf(MARKER));
  for (const tier of ["עובדה מאומתת:", "פרשנות אפשרית:", "השערה ניסיונית:"]) assert.ok(exploratory.includes(tier), tier);
  assert.match(exploratory, /אסור להמציא עובדות/);
  assert.match(exploratory, /המנוע מצא/);
  assert.match(exploratory, /אל תחשב גימטריה/);
  assert.match(exploratory, /אין בסיס מספיק להשערה/);
  assert.match(exploratory, /טקסט חשיבה גולמי/);
  assert.match(exploratory, /השערה אינה ממצא, מקור או ידע קנוני/);

  const landscape = l.models[0].system.slice(l.models[0].system.indexOf(MARKER));
  assert.ok(landscape.includes("עוגן:"));
  const order = ["עובדות חישוביות מאומתות", "הצלבות בין שיטות", "יחסים למילים, מספרים ומקורות", "היררכיה וסדר", "שאלות ונתיבי מחקר פתוחים"]
    .map((section) => landscape.indexOf(`‘${section}:’`));
  assert.ok(order.every((i) => i > 0), "all five layers named");
  assert.deepEqual([...order].sort((a, b) => a - b), order, "layers keep the required order");
  for (const prefix of ["עובדה מתמטית:", "לפי המקור:", "פרשנות רזיאל:"]) assert.ok(landscape.includes(prefix), prefix);
  assert.match(landscape, /אל תיצור היררכיה/);
  assert.match(landscape, /כפילות טבעית/);
  assert.match(landscape, /אל תחשב גימטריה/);
});

test("5b) the server reports which structural labels the model answer actually carried (telemetry only; the answer is never rewritten)", async () => {
  const partial = await ask(Q_271, { mode: "exploratory", modelResult: modelText("עובדה מאומתת: הריון בשיטת רגיל = 271.") });
  assert.equal(partial.result.raziel.answer, "עובדה מאומתת: הריון בשיטת רגיל = 271.");
  assert.deepEqual(partial.result.raziel.plan_meta.view_mode.structure, {
    verified_fact: true, possible_interpretation: false, experimental_hypothesis: false,
  });
  const land = await ask(Q_271, { mode: "landscape", modelResult: modelText("עוגן: 271.\nעובדות חישוביות מאומתות: עובדה מתמטית: הריון = 271.\nשאלות ונתיבי מחקר פתוחים: מה עוד?") });
  assert.deepEqual(land.result.raziel.plan_meta.view_mode.structure, { anchor: true, layers: 2 });
});

// ── 6: no memory / corpus / research writes ───────────────────────────────────────────────────────────────────
test("6) neither new mode writes memory, research or corpus state, and calls no new kind of endpoint", async () => {
  const general = await ask(Q_271, { run: { bearer: USER_JWT, verifiedUid: UID } });
  for (const mode of NON_GENERAL) {
    const run = await runAiAnalyze({
      answer: F.noMatchAnswer(), allowed: true, bearer: USER_JWT, verifiedUid: UID,
      body: bodyFor(Q_271, { mode }), ...bundles(), legacyContext: { memories: [{ content: "LEGACY-MEMORY-SENTINEL" }] },
    });
    const names = callNames(run);
    for (const forbidden of ["fn_raziel_remember", "fn_raziel_context", "research_state_snapshot_v1", "fn_research_path_resume_v1"]) {
      assert.equal(names.includes(forbidden), false, `${mode}: ${forbidden}`);
    }
    assert.equal(JSON.stringify(run.models.map((m) => [m.system, m.user])).includes("LEGACY-MEMORY-SENTINEL"), false);
    assert.equal(run.calls.some((call) => /\/rest\/v1\/(?!rpc\/|ai_token_log|users)/.test(call.url)), false, "no direct table access");
    assert.deepEqual(names.filter((n) => !callNames(general).includes(n)), [], `${mode}: no new call kind vs general`);
  }
});

// ── 9: no valid Bundle ⇒ grounded fallback ───────────────────────────────────────────────────────────────────
test("9) no valid Bundle (research-run failure): both modes return the grounded fallback — no model, no guess, no quota use", async () => {
  for (const mode of NON_GENERAL) {
    const run = await ask(Q_271, { mode, run: { researchRunFailure: "fixture_outage" } });
    assert.equal(run.models.length, 0);
    assert.equal(run.result.engine, "deterministic");
    assert.equal(run.result.model, "none");
    assert.equal(run.result.raziel.deterministic, true);
    assert.equal(run.result.raziel.plan_meta.view_mode.applied, false);
    assert.equal(run.result.raziel.plan_meta.view_mode.reason, "no_canonical_bundle");
    assert.match(run.result.raziel.answer, /חבילת מחקר מאומתת/);
    assert.doesNotMatch(run.result.raziel.answer, /271|הריון/);
  }
  const general = await ask(Q_271, { run: { researchRunFailure: "fixture_outage" } });
  assert.equal(general.result.raziel?.plan_meta?.view_mode, undefined, "general keeps its existing fallback path");
});

test("9b) a question with no researchable subject gets the same grounded fallback in the new modes", async () => {
  for (const mode of NON_GENERAL) {
    const run = await ask("ספר לי משהו מעניין", { mode });
    assert.equal(run.models.length, 0);
    assert.equal(run.result.raziel.plan_meta.view_mode.reason, "no_canonical_bundle");
  }
});

test("one model call only: the optional semantic-classifier attempt is skipped in the new modes (general keeps it)", async () => {
  const question = "בוא נביט פנימה אל 776 ונראה מה נמצא";
  const classifier = {
    text: JSON.stringify({ version: "raziel-semantic-intent-v1", status: "resolved", action: "research", confidence: "high", ambiguous: false,
      text_computation_requested: false, candidates: [{ type: "number", value: 776, evidence_text: "776", role: "subject" }], reason: "numeric research subject" }),
    usage: { input_tokens: 41, output_tokens: 29 }, attempts: 1, degraded: false,
  };
  const run = (mode) => runAiAnalyze({
    answer: F.noMatchAnswer(), allowed: true, bearer: USER_JWT, verifiedUid: UID,
    body: { subject: question, visitor_id: "vsemanticviewmode1", intelligence_level: "fast", research_contract: F.CONTRACT, ...(mode ? { view_mode: mode } : {}) },
    researchBundleByNumber: { 776: F.numberBundle(776) },
    modelResults: [classifier, modelText("ממצאים מאומתים עבור 776")],
  });
  const general = await run(null);
  assert.equal(general.models.length, 2, "general keeps classifier + synthesis exactly as today");
  for (const mode of NON_GENERAL) {
    const r = await run(mode);
    assert.equal(r.models.length, 0, `${mode}: no classifier, no synthesis without a deterministic subject`);
    assert.equal(r.result.raziel.plan_meta.view_mode.reason, "no_canonical_bundle");
  }
});

// ── 10: quota / access ───────────────────────────────────────────────────────────────────────────────────────
test("10) AI quota exhausted: a mode never hides evidence — the zero-cost direct answer is returned; no new gate or quota rule", async () => {
  const general = await ask(Q_PAIR, { allowed: false });
  for (const mode of NON_GENERAL) {
    const run = await ask(Q_PAIR, { mode, allowed: false });
    assert.equal(run.models.length, 0);
    assert.equal(run.result.raziel.answer, general.result.raziel.answer);
    assert.deepEqual(run.result.raziel.plan_meta.view_mode, { requested: mode, applied: false, reason: "quota" });
  }
  // without a direct answer the existing quota response is unchanged, in every mode
  for (const mode of MODES) {
    const run = await ask(Q_271, { mode: mode === "general" ? null : mode, allowed: false });
    assert.equal(run.result.error, "quota");
    assert.equal(run.models.length, 0);
  }
});

// ── axis separation + telemetry ──────────────────────────────────────────────────────────────────────────────
test("axes: view_mode never changes provider/model selection — intelligence_level alone decides fast vs deep", async () => {
  for (const level of ["fast", "deep"]) {
    const general = await ask(Q_271, { level });
    for (const mode of NON_GENERAL) {
      const run = await ask(Q_271, { level, mode });
      assert.equal(run.models[0].model, general.models[0].model, `${level}/${mode}`);
      assert.equal(run.result.model, general.result.model);
      assert.equal(run.result.intelligence_level, general.result.intelligence_level);
      assert.deepEqual(run.result.intelligence_selection, general.result.intelligence_selection);
    }
  }
  const deep = await ask(Q_271, { level: "deep", mode: "landscape" });
  assert.equal(deep.models[0].maxTokens, 4000);
  const fast = await ask(Q_271, { level: "fast", mode: "landscape" });
  assert.equal(fast.models[0].maxTokens, 2400);
});

test("telemetry: view_mode is recorded on the model span and replay ref without any private content", async () => {
  for (const mode of NON_GENERAL) {
    const run = await ask(Q_PAIR, { mode });
    const span = run.spans.find((s) => s.p_name === "ai-analyze:raziel:model");
    assert.equal(span.p_detail.view_mode, mode);
    assert.match(span.p_detail.replay.parametersRef, new RegExp(`;view_mode:${mode};view_max_tokens:2400$`));
    assert.equal(span.p_detail.privacy.rawPrivatePayloadLogged, false);
    const traces = JSON.stringify(run.traces);
    for (const sentinel of ["חכמה", "בינה", Q_PAIR]) assert.equal(traces.includes(sentinel), false, sentinel);
  }
});

test("server and client agree on the closed set of modes", () => {
  assert.deepEqual([...RAZIEL_VIEW_MODES], MODES);
  const source = readFileSync(new URL("../supabase/functions/ai-analyze/index.ts", import.meta.url), "utf8");
  assert.match(source, /type RazielViewMode = "general" \| "landscape" \| "exploratory";/);
  assert.match(source, /return v === "landscape" \|\| v === "exploratory" \? v : "general";/);
  assert.match(source, /body\?\.view_mode/);
  assert.doesNotMatch(source, /body\?\.mode\b[^\n]*view_mode/, "view_mode must not reuse the legacy `mode` field");
});
