import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { projectHeichalEntryInput, projectHeichalFirstDecoding } from "../src/lib/research/heichalFirstDecodingPlan.js";
import {
  FREE_QUESTION_MAX, boundFreeQuestion, detectEntryCue, projectHeichalEntryDirections, projectFreeQuestionPlan,
  buildFreeQuestionContext, isFreeQuestionContext, questionWordChoices,
} from "../src/lib/research/heichalEntryDirections.js";
import { resolveContextTools, CONTEXT_ACTION_KIND } from "../src/lib/research/contextualCapabilities.js";

const read = (file) => readFileSync(new URL("../" + file, import.meta.url), "utf8");
const page = read("src/pages/Heichal2029Page.jsx");
const view = read("src/components/heichal/HeichalIntentUnderstanding.jsx");
const helper = read("src/lib/research/heichalEntryDirections.js");
const PEH = "איפה מופיע פה אל פה במקרא?";

test("Golden B · 'פה אל פה': intent first, sources first, no gematria, nothing executed", () => {
  const entry = projectHeichalEntryInput(PEH);
  assert.equal(entry.inputKind, "unresolved_text");
  assert.equal(entry.autoCalculate, false);
  assert.equal(entry.canResolveExpression, false);
  assert.equal(entry.reason, "intent_first");

  const view = projectHeichalEntryDirections(PEH);
  assert.equal(view.cue, "where_appears");
  assert.equal(view.question, PEH);
  assert.equal(view.executed, false);
  assert.equal(view.directions[0].key, "sources");
  assert.equal(view.directions[0].recommended, true);
  const gematria = view.directions.find((d) => d.key === "gematria");
  assert.ok(gematria && gematria.action === "exact" && !gematria.recommended, "gematria only as an explicit exact-expression option");
  for (const d of view.directions) {
    assert.doesNotMatch(d.status, /נמצאו|בוצע|הושלם|0 תוצאות|אפס תוצאות/, d.key);
    assert.ok(d.action !== "plan" || /לא הופעל|טרם חובר/.test(d.status), d.key);
  }
  assert.match(view.directions[0].status, /טרם חובר/);
  assert.match(view.directions[0].status, /אין תוצאה שלילית/);
});

test("Golden A · 363: a literal number keeps the existing numeric path, no free-question card", () => {
  const entry = projectHeichalEntryInput("363");
  assert.equal(entry.inputKind, "number_literal");
  assert.equal(entry.candidateSubject.id, "363");
  assert.equal(entry.autoCalculate, false);
  const plan = projectHeichalFirstDecoding({ subject: { type: "number", id: "363", label: "363" }, direction: "overview" });
  const keys = plan.steps.map((s) => s.key);
  for (const key of ["graph", "numeric", "numeric_operators"]) assert.ok(keys.includes(key), key);
  assert.ok(!keys.includes("gematria") && !keys.includes("els"), "no automatic Gematria/ELS step for a number");
  assert.equal(plan.canRunBoundedNumber, true);
  assert.ok(plan.steps.every((s) => s.status === "proposed"));
  // a mixed sentence that merely contains 363 is still a free question, never the number
  assert.equal(projectHeichalEntryInput("מצאתי תמונה עם 363").inputKind, "unresolved_text");
  assert.equal(projectHeichalEntryDirections("מצאתי תמונה עם 363 על מדרגות מטוס").cue, "image_source");
  assert.equal(projectHeichalEntryDirections("מצאתי תמונה עם 363 על מדרגות מטוס").directions[0].key, "clarify");
});

test("the plan follows the question: different questions lead with different directions", () => {
  const lead = (q) => projectHeichalEntryDirections(q).directions[0].key;
  assert.equal(lead(PEH), "sources");
  assert.equal(lead("מה הקשר בין אהבה לאחד"), "relations");
  assert.equal(lead("כמה שווה ביאת המשיח בגימטריה"), "gematria");
  assert.equal(lead("חפש דילוגי אותיות בשם משה"), "els");
  const neutral = projectHeichalEntryDirections("אהבה");
  assert.equal(neutral.cue, "neutral");
  assert.ok(neutral.directions.every((d) => d.recommended === false), "no recommendation without a recognised intent");
  assert.ok(projectHeichalEntryDirections(PEH).directions.length <= 4);
  assert.equal(detectEntryCue(""), "neutral");
});

test("free question is a temporary, bounded, non-canonical Research Context representation", () => {
  const ctx = buildFreeQuestionContext(PEH, "sources");
  assert.equal(ctx.subject.type, "phrase");
  assert.equal(ctx.dimensions.entryIntent, "free_question");
  assert.equal(ctx.dimensions.entryDirection, "sources");
  assert.equal(ctx.subject.href, "/heichal", "no question text in the URL");
  assert.equal(ctx.selection.expression, undefined);
  assert.equal(ctx.selection.method, undefined);
  assert.equal(ctx.selection.resultValue, undefined);
  assert.equal(ctx.dimensions.surfaceFocus.type, "question");
  assert.equal(isFreeQuestionContext(ctx), true);
  assert.equal(isFreeQuestionContext({ ...ctx, dimensions: { ...ctx.dimensions, entryExactExpression: true } }), false);
  assert.equal(isFreeQuestionContext({ ...ctx, subject: { ...ctx.subject, id: "פה אל פה" } }), false);
  const long = buildFreeQuestionContext("א".repeat(FREE_QUESTION_MAX * 3), null);
  assert.equal(long.subject.id.length, FREE_QUESTION_MAX);
  assert.equal(boundFreeQuestion("  שורה\n  אחת   כאן "), "שורה אחת כאן");
  assert.equal(buildFreeQuestionContext("   ", "sources"), null);
});

test("proposed plans are never shown as executed; the canonical planner is only reported", () => {
  const plan = projectFreeQuestionPlan(PEH, "sources");
  assert.equal(plan.executed, false);
  assert.equal(plan.strategy, "discovery");
  assert.deepEqual(plan.autoSelectedTools, []);
  assert.ok(plan.steps.length >= 1 && plan.steps.every((s) => s.status === "proposed"));
  assert.match(plan.message, /תוכנית מוצעת בלבד/);
  assert.doesNotMatch(JSON.stringify(plan), /נמצאו|0 תוצאות|בוצע/);
  assert.equal(projectFreeQuestionPlan("", "sources").ready, false);
});

test("exact-expression picker offers the person's own words and chooses nothing for them", () => {
  assert.deepEqual(questionWordChoices(PEH), ["איפה", "מופיע", "פה", "אל", "במקרא"]);
  assert.match(view, /disabled=\{!exactText \|\| busy\}/);
  assert.match(view, /onClick=\{\(\) => onExact\?\.\(exactText, exactFor\)\}/);
  assert.doesNotMatch(view, /useEffect/); // nothing runs on render
});

test("Heichal entry: the whole question is never resolved as an expression; Gematria only after an explicit exact choice", () => {
  assert.match(page, /import \{ projectHeichalEntryInput \} from "..\/lib\/research\/heichalFirstDecodingPlan\.js"/);
  const start = page.slice(page.indexOf("const start = (e) =>"), page.indexOf("return <>\n    <section className=\"sod29-focus-stage\">"));
  assert.match(start, /projectHeichalEntryInput\(query\)/);
  assert.doesNotMatch(start, /resolveExpressionFocus/);
  const confirm = page.slice(page.indexOf("const confirmExact"), page.indexOf("return { choose, confirmExact, exact }"));
  assert.match(confirm, /projectHeichalEntryInput\(expression, \{ explicitlyChoseGematria: true, exactExpressionSelected: true \}\)/);
  assert.ok(confirm.indexOf("canResolveExpression") < confirm.indexOf("resolveExpressionFocus(expression)"));
  assert.equal((page.match(/resolveExpressionFocus\(/g) || []).length, 1, "single explicit call site");
});

test("free question stays local and unexposed: no entity read, no telemetry, no library item, no number capability", () => {
  assert.match(page, /if \(freeQuestion\) \{ setState\(\{ loading: false, data: null, error: null \}\)/);
  assert.doesNotMatch(page + view + helper, /trackResearch|navigator\.share|ShareActions|signalAiBehavior/);
  assert.match(page, /\{freeQuestion \? null : <button className="sod29-action" onClick=\{addSubject\}>/);
  assert.match(page, /target: focusTarget \}\)/);
  const tools = resolveContextTools({ surface: "heichal", target: { type: "question", id: "x", label: PEH } });
  assert.ok(!tools.some((t) => t.kind === CONTEXT_ACTION_KIND.CAPABILITY), "no Gematria/number capability for a question");
  assert.ok(tools.some((t) => t.kind === CONTEXT_ACTION_KIND.ROUTE && t.href === "/books"));
});

test("no new engine, route, store, Raziel, share or navigation was added", () => {
  assert.doesNotMatch(helper, /fetch\(|supabase|invoke\(|localStorage|sessionStorage|createContext|useState/);
  assert.match(helper, /buildResearchPlanV2/); // the canonical planner stays the only planner
  assert.doesNotMatch(page, /<Route|createBrowserRouter|new Raziel|RazielChat/);
  assert.equal((page.match(/shell\.openRaziel\(/g) || []).length >= 1, true);
});
