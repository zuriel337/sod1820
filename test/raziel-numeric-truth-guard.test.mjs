import test from "node:test";
import assert from "node:assert/strict";
import { runAiAnalyze, toolAnswer } from "./helpers/ai-analyze-handler.mjs";

const noMatch = {
  enabled: true,
  mode: "synthesis",
  needs_synthesis: true,
  availability: "no_match",
  capability_class: "general_synthesis",
  strategy: "raziel_synthesis",
  minimum_intelligence: "L2_FAST",
};

const model = (answer) => ({
  text: JSON.stringify({ v: 1, agent: "raziel", answer, facts: [], suggested_paths: [] }),
  usage: { input_tokens: 20, output_tokens: 10 },
  attempts: 1,
  degraded: false,
});

const numberPlan = (numberContext) => ({
  enabled: true,
  mode: "number_context",
  needs_synthesis: numberContext.mode !== "deterministic",
  availability: "number_context",
  capability_class: "reality_number_context",
  strategy: numberContext.mode === "deterministic" ? "number_context_deterministic" : "number_context_synthesis",
  minimum_intelligence: numberContext.mode === "deterministic" ? "L0_DETERMINISTIC" : "L2_FAST",
  number_context: { contract: "number_context_v1", ...numberContext },
});

const numberData = (number, phrase) => ({
  map: { number, counts: { post: 1, topic: 0, entity: 0, event: 0, convergence: 0, number: 0 },
    neighbors: { post: [{ ref: `post:${number}`, label: `פוסט ${number}` }] } },
  dossier: { posts: [`פוסט ${number}`], topics: [], definitions: [],
    methods: [{ method: "רגיל", phrases: [phrase] }] },
});

test("Raziel numeric truth: screenshot regression rejects decompositions and related values that no engine supplied", async () => {
  const r = await runAiAnalyze({
    answer: noMatch,
    allowed: true,
    body: { subject: "מה זה 1820?", facts: "" },
    modelResult: model("1820 הוא 1000 ועוד 820, ומתחבר גם אל 776 ו-555."),
  });
  assert.equal(r.result.degraded, true);
  assert.match(r.result.raziel.answer, /לא קיבלתי מהמנוע נתונים מאומתים/);
  assert.doesNotMatch(r.result.raziel.answer, /1000|820|776|555/);
  const span = r.spans.find((item) => item.p_name === "ai-analyze:raziel:model");
  assert.equal(span.p_outcome, "failed_with_reason");
  assert.equal(span.p_detail.stop_reason, "numeric_truth_guard_untrusted_literal");
  assert.equal(span.p_detail.output_use, "rejected");
});

test("Raziel numeric truth: the explicit number may be repeated without admitting navigation-history numbers", async () => {
  let r = await runAiAnalyze({
    answer: noMatch,
    allowed: true,
    body: { subject: "ספר לי על 1820", facts: "" },
    modelResult: model("כרגע אפשר לדבר על 1820 רק מתוך החומר שסופק."),
  });
  assert.equal(r.result.degraded, undefined);
  assert.match(r.result.raziel.answer, /1820/);

  r = await runAiAnalyze({
    answer: noMatch,
    allowed: true,
    body: {
      subject: "איזה מידע מעניין יש לך לתת לי",
      facts: "",
      surface_semantic: {
        surface: "number",
        subject: { type: "number", id: "1820", label: "1820" },
        context: { navigation: { journeyVisitedValues: [776] } },
      },
    },
    modelResult: model("המספר הפעיל הוא 1820 והוא קשור אל 776."),
  });
  assert.equal(r.result.degraded, true, "the exact Number identity is admissible; a visited navigation value is not");
});

test("Raziel numeric truth: numbers from a governed deterministic tool pack remain usable", async () => {
  const r = await runAiAnalyze({
    answer: toolAnswer(),
    allowed: true,
    body: { subject: "בדוק גימטריה ודילוגים", facts: "" },
    modelResult: model("המנוע החזיר ערך 358 ומניין דילוגים 292."),
  });
  assert.equal(r.result.degraded, undefined);
  assert.match(r.result.raziel.answer, /358/);
  assert.match(r.result.raziel.answer, /292/);
});

test("Raziel number experience: a requested Gematria list is returned from the canonical dossier with zero model calls", async () => {
  const r = await runAiAnalyze({
    answer: numberPlan({ anchor: "explicit", number: 787, mode: "deterministic", focus: "gematria_phrases" }),
    allowed: true,
    numberContextByNumber: { 787: numberData(787, "מספר סימן רמז") },
    body: { subject: "תן לי רשימת גימטריות 787", facts: "" },
  });
  assert.equal(r.result.engine, "deterministic");
  assert.match(r.result.raziel.answer, /ביטויי הגימטריה המאומתים בתיק המספר 787/);
  assert.match(r.result.raziel.answer, /רגיל: מספר סימן רמז/);
  assert.equal(r.models.length, 0);
  assert.deepEqual(r.calls.filter((call) => ["number_map", "number_dossier_json"].includes(call.name)).map((call) => call.name),
    ["number_map", "number_dossier_json"]);
});

test("Raziel number experience: an explicit pair reads both canonical dossiers once and synthesizes once", async () => {
  const r = await runAiAnalyze({
    answer: numberPlan({ anchor: "explicit_pair", numbers: [787, 1820], number: null, mode: "synthesis", focus: "number_compare" }),
    allowed: true,
    numberContextByNumber: { 787: numberData(787, "מספר סימן רמז"), 1820: numberData(1820, "סוד ה׳") },
    body: { subject: "מה ההבדל בין 787 ל-1820", facts: "" },
    modelResult: model("ההשוואה המאומתת כאן היא בין 787 ובין 1820 בלבד."),
  });
  assert.equal(r.result.degraded, undefined);
  assert.equal(r.models.length, 1);
  assert.match(r.models[0].user, /צד א \(787\)/);
  assert.match(r.models[0].user, /צד ב \(1820\)/);
  assert.deepEqual(r.calls.filter((call) => ["number_map", "number_dossier_json"].includes(call.name)).map((call) => `${call.name}:${call.payload.n}`),
    ["number_map:787", "number_dossier_json:787", "number_map:1820", "number_dossier_json:1820"]);
});
