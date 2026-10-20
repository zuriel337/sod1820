import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveContextTools, CONTEXT_ACTION_KIND } from "../src/lib/research/contextualCapabilities.js";
import {
  HEICHAL_DECODING_DIRECTIONS,
  projectHeichalEntryInput,
  projectHeichalFirstDecoding,
} from "../src/lib/research/heichalFirstDecodingPlan.js";

test("numeric 363 offers the canonical numeric plan but no automatic run", () => {
  const output = projectHeichalFirstDecoding({
    subject: { type: "number", id: "363", label: "363" },
  });
  assert.equal(output.ready, true);
  assert.equal(output.strategy, "number_research");
  assert.equal(output.canRunBoundedNumber, true);
  assert.ok(output.steps.some((step) => step.key === "numeric"));
  assert.ok(output.steps.some((step) => step.key === "numeric_operators"));
  assert.equal(output.steps.some((step) => step.key === "els"), false);
  assert.ok(output.steps.every((step) => step.status === "proposed"));
});

test("phrase without numeric intent does not silently compute Gematria", () => {
  const raw = { type: "phrase", id: "פה אל פה", label: "פה אל פה" };
  const general = projectHeichalFirstDecoding({ subject: raw });
  assert.equal(general.ready, true);
  assert.equal(general.strategy, "discovery");
  assert.ok(!general.steps.some((step) => step.key === "gematria"));
  assert.equal(general.canRunBoundedNumber, false);
  const sources = projectHeichalFirstDecoding({ subject: raw, direction: "sources" });
  assert.ok(sources.steps.some((step) => step.key === "sources"));
  assert.ok(!sources.steps.some((step) => step.key === "gematria"));
  assert.match(sources.steps.find((step) => step.key === "sources").explanation, /רב־מילים/);
});

test("only an explicit direction requests Gematria or ELS", () => {
  const subject = { type: "phrase", id: "פה אל פה", label: "פה אל פה" };
  assert.ok(projectHeichalFirstDecoding({ subject, direction: "gematria" }).steps.some((step) => step.key === "gematria"));
  assert.ok(projectHeichalFirstDecoding({ subject, direction: "els" }).steps.some((step) => step.key === "els"));
  assert.equal(HEICHAL_DECODING_DIRECTIONS.phrase.length, 4);
});

test("no fabricated execution, verified status, source or sensitive context", () => {
  const out = projectHeichalFirstDecoding({
    subject: { type: "number", id: "363", label: "363", privateSource: "SECRET" },
    projection: {
      research: { findings: [{ id: "a" }, { id: "b" }] },
      graph: { relations: [{ id: "c" }] },
      sources: [{ ref: "d" }],
    },
  });
  assert.deepEqual(out.counts, { findings: 2, relations: 1, sources: 1 });
  assert.doesNotMatch(JSON.stringify(out), /SECRET|verified_result|completed|published/);
  assert.ok(out.steps.every((step) => step.status === "proposed"));
});

test("unknown identity fails closed; component belongs to the existing Heichal page", () => {
  const out = projectHeichalFirstDecoding({ subject: { type: "media", id: "unverified-picture" } });
  assert.equal(out.ready, false);
  assert.equal(out.steps.length, 0);
  const invalidNumber = projectHeichalFirstDecoding({ subject: { type: "number", id: "NaN" } });
  assert.equal(invalidNumber.ready, false);
  const unavailable = projectHeichalFirstDecoding({ subject: { type: "number", id: "363" } });
  assert.deepEqual(unavailable.counts, { findings: null, relations: null, sources: null });
  assert.ok(unavailable.steps.some((step) => /אינם זמינים/.test(step.explanation)));
  const page = readFileSync(new URL("../src/pages/Heichal2029Page.jsx", import.meta.url), "utf8");
  const view = readFileSync(new URL("../src/components/heichal/HeichalGuidedFirstStep.jsx", import.meta.url), "utf8");
  assert.match(page, /<HeichalGuidedFirstStep/);
  assert.match(view, /onRunNumber/);
  assert.doesNotMatch(view, /useEffect|localStorage|supabase\.from|functions\.invoke/);
});


test("Heichal uses the same Number/World/ELS/Books actions as the shared System Frame", () => {
  const tools = resolveContextTools({ surface: "heichal", target: { type: "number", id: "363", label: "363" } });
  assert.ok(tools.some((action) => action.kind === CONTEXT_ACTION_KIND.CAPABILITY && action.capability === "number"));
  assert.ok(tools.some((action) => action.kind === CONTEXT_ACTION_KIND.ROUTE && action.href === "/world"));
  assert.ok(tools.some((action) => action.kind === CONTEXT_ACTION_KIND.ROUTE && action.href === "/els"));
  assert.ok(tools.some((action) => action.kind === CONTEXT_ACTION_KIND.ROUTE && action.href === "/books"));
  const page = readFileSync(new URL("../src/pages/Heichal2029Page.jsx", import.meta.url), "utf8");
  assert.match(page, /resolveContextTools\(\{ surface: "heichal", target: focusTarget \}\)/);
  assert.match(page, /shell\.openCapability\(tool\.capability, focusTarget\)/);
  assert.match(page, /shell\.go\(tool\.href\)/);
  assert.match(page, /shell\.go\(numberHref\)/);
  assert.match(page, /shell\.returnExact\(\)/);
  assert.match(page, /to: "\/2029\/calculator"/);
  assert.doesNotMatch(page, /\/research\?tool=gematria/);
  assert.doesNotMatch(page, /<Link className="sod29-action" to="\/els">ELS<\/Link>/);
  assert.doesNotMatch(page, /<Link className="sod29-action" to="\/world">פתח בעולם<\/Link>/);
});

test("exact Number href is reused only as a 2029 Number owner route, never a generated graph link", () => {
  const page = readFileSync(new URL("../src/pages/Heichal2029Page.jsx", import.meta.url), "utf8");
  assert.match(page, /subject\?\.type === "number"/);
  assert.match(page, /String\(subject\.href\)\.split\(\/\[\?#\]\/\)\[0\]/);
  assert.doesNotMatch(page, /new URLSearchParams\(\{[^}]*number/);
  assert.doesNotMatch(page, /\/community\/chat\?/);
});


test("free-language entry preserves the exact source/question and does not select Gematria by default", () => {
  const query = projectHeichalEntryInput("  איפה כתוב פה אל פה במקרא?  ");
  assert.equal(query.ready, true);
  assert.equal(query.inputKind, "unresolved_text");
  assert.equal(query.input, "איפה כתוב פה אל פה במקרא?");
  assert.equal(query.candidateSubject.type, "phrase");
  assert.equal(query.candidateSubject.label, query.input);
  assert.equal(query.autoCalculate, false);
  assert.equal(query.canResolveExpression, false);
  assert.equal(query.sourceTextIsExactExpression, false);
  assert.equal(query.reason, "intent_first");
  const plain = projectHeichalEntryInput("פה אל פה");
  assert.equal(plain.canResolveExpression, false);
});

test("Gematria may be considered only after explicit user choice AND selection of an exact expression", () => {
  const raw = "מה זה הביטוי פה אל פה?";
  const optInOnly = projectHeichalEntryInput(raw, { explicitlyChoseGematria: true });
  assert.equal(optInOnly.canResolveExpression, false);
  assert.equal(optInOnly.reason, "exact_expression_required");
  const exact = projectHeichalEntryInput("אהבה", {
    explicitlyChoseGematria: true,
    exactExpressionSelected: true,
  });
  assert.equal(exact.canResolveExpression, true);
  assert.equal(exact.autoCalculate, false);
  assert.equal(exact.reason, "exact_expression_selected");
  const noChoice = projectHeichalEntryInput("אהבה", { exactExpressionSelected: true });
  assert.equal(noChoice.canResolveExpression, false);
  const direct = projectHeichalEntryInput("00363");
  assert.equal(direct.inputKind, "number_literal");
  assert.equal(direct.candidateSubject.id, "363");
  assert.equal(direct.canResolveExpression, false);
  assert.equal(projectHeichalEntryInput("9007199254740993").reason, "invalid_number");
  assert.equal(projectHeichalEntryInput(" ").ready, false);
});

test("relation intent cannot dispatch the numeric-only research-run transport", () => {
  const relations = projectHeichalFirstDecoding({
    subject: { type: "number", id: "363", label: "363" },
    direction: "relations",
  });
  assert.ok(relations.steps.some((step) => step.key === "numeric_relations"));
  assert.equal(relations.canRunBoundedNumber, false);
  assert.ok(relations.steps.filter((x) => x.key === "numeric" || x.key === "numeric_operators")
    .every((x) => /אינו מבצע בדיקת קשרים|אין כאן ריצת קשרים/.test(x.explanation)));
});

test("scripture search with no loaded sources is not an empty search result", () => {
  const subject = { type: "phrase", id: "פה אל פה", label: "פה אל פה" };
  const missing = projectHeichalFirstDecoding({ subject, direction: "sources" });
  const sources = missing.steps.find((step) => step.key === "sources");
  assert.match(sources.explanation, /אינם זמינים/);
  assert.match(sources.explanation, /רב־מילים/);
  const projected = projectHeichalFirstDecoding({
    subject, direction: "sources", projection: { sources: [{ ref: "תנך:במדבר:12:8" }] },
  });
  const description = projected.steps.find((step) => step.key === "sources").explanation;
  assert.match(description, /לא תוצאות חיפוש/);
  assert.match(description, /רב־מילים/);
});

// The separate Claude visual lane must wire projectHeichalEntryInput into NoContextEntry
// before calling resolveExpressionFocus. Until that happens, the full UX is NOT accepted.
test.todo("Visual owner: enforce intent-first gate in Heichal NoContextEntry and replay Hebrew/RTL Golden");
