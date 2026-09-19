#!/usr/bin/env node
import {
  canonicalMethodPublicLabel,
  canonicalResearchPublicLabel,
  sortMethodsByCanonicalOrder,
  formatTanakhRef,
  formatVerseGematriaSuffix,
} from "../src/lib/presentation/canonicalPresentation.js";
import {
  buildGematriaPresentationModel,
  GEMATRIA_PRESENTATION_CONTRACT,
} from "../src/lib/presentation/gematriaPresentation.js";

let pass = 0;

eq("convergence public singular", canonicalResearchPublicLabel("convergence"), "התכנסות");
eq("convergence public plural", canonicalResearchPublicLabel("convergence", { plural: true }), "התכנסויות");
eq("unknown research label remains source identity", canonicalResearchPublicLabel("unknown_type"), "unknown_type");
let fail = 0;
const failures = [];

function eq(label, actual, expected) {
  if (actual === expected) pass++;
  else {
    fail++;
    failures.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

eq("קדמי public label", canonicalMethodPublicLabel({ method_key: "קדמי", display_label: "קדמי · משולש" }), "משולש");
eq("משולש גדול public label", canonicalMethodPublicLabel({ method_key: "משולש גדול", display_label: "קדמי גדול · משולש גדול" }), "משולש גדול");
eq("legacy alias fallback", canonicalMethodPublicLabel("קדמי · משולש"), "משולש");

const ordered = sortMethodsByCanonicalOrder([
  { method_key: "אתבש", display_label: "אתבש", sort_order: 8 },
  { method_key: "רגיל", display_label: "רגיל", sort_order: 1 },
  { method_key: "קדמי", display_label: "קדמי · משולש", sort_order: 4 },
]).map((row) => row.method_key);
eq("method order follows Registry sort_order", ordered.join("|"), "רגיל|קדמי|אתבש");

eq("structured Tanakh ref", formatTanakhRef({ book: "ישעיהו", chapter: 53, verse: 5 }), "ישעיהו נ״ג, ה׳");
eq("raw Tanakh ref", formatTanakhRef("ישעיהו 60:1"), "ישעיהו ס׳, א׳");
eq("chapter-only ref", formatTanakhRef("תהלים 23"), "תהלים כ״ג");
eq("unparseable source preserved", formatTanakhRef("book:hebrewbooks:5635#p62"), "book:hebrewbooks:5635#p62");
eq("verse gematria suffix", formatVerseGematriaSuffix(358), " = 358");

const p1Profile = [
  { methodKey: "רגיל", displayLabel: "רגיל", category: "base", sortOrder: 1, computedValue: 520, definitionVersion: 1 },
  { methodKey: "מילוי", displayLabel: "מילוי", category: "base", sortOrder: 2, computedValue: 646, definitionVersion: 1 },
  { methodKey: "גדול", displayLabel: "גדול", category: "base", sortOrder: 6, computedValue: 520, definitionVersion: 1 },
  {
    methodKey: "מילוי בלבד",
    displayLabel: "מילוי בלבד",
    category: "composite",
    sortOrder: 13,
    executionKind: "composite_engine",
    derivedFrom: ["מילוי", "רגיל"],
    computedValue: 126,
    definitionVersion: 2,
  },
  {
    methodKey: "אות רבתי",
    displayLabel: "אות רבתי · אלפים",
    category: "base",
    sortOrder: 30,
    executionKind: "context_activated",
    derivedFrom: ["רגיל", "גדול"],
    computedValue: 2520,
    definitionVersion: 1,
  },
];

const p1States = [
  { method_key: "רגיל", sort_order: 1, registered: true, active: true, executable: true, engine_verified: true, scannable: true, execution_kind: "sql_function", method_version: 1, required_entitlement: "public", in_engine_drift: false },
  { method_key: "מילוי", sort_order: 2, registered: true, active: true, executable: true, engine_verified: true, scannable: true, execution_kind: "sql_function", method_version: 1, required_entitlement: "public", in_engine_drift: false },
  { method_key: "גדול", sort_order: 6, registered: true, active: true, executable: true, engine_verified: true, scannable: true, execution_kind: "sql_function", method_version: 1, required_entitlement: "public", in_engine_drift: false },
  { method_key: "מילוי בלבד", sort_order: 13, registered: true, active: true, executable: true, engine_verified: true, scannable: true, execution_kind: "composite_engine", derived_from: ["מילוי", "רגיל"], method_version: 2, required_entitlement: "public", in_engine_drift: false },
  { method_key: "אות רבתי", sort_order: 30, registered: true, active: true, executable: true, engine_verified: true, scannable: false, execution_kind: "context_activated", derived_from: ["רגיל", "גדול"], method_version: 1, required_entitlement: "public", in_engine_drift: false },
  { method_key: "אח״ס–בט״ע", sort_order: 36, registered: true, active: false, executable: false, engine_verified: false, scannable: false, execution_kind: "unimplemented", method_version: 1, required_entitlement: "public", in_engine_drift: false },
];

const p1Baseline = buildGematriaPresentationModel({
  expression: "עמית",
  methodProfile: p1Profile,
  methodStates: p1States,
});
eq("P1 contract identity", p1Baseline.contract, GEMATRIA_PRESENTATION_CONTRACT);
eq("P1 regular fallback", p1Baseline.activeMethod?.methodKey, "רגיל");
eq("P1 expression-first focus", p1Baseline.focal.primaryType, "expression");
eq("P1 ordinary verified state stays quiet", p1Baseline.activeMethod?.exceptionalState, null);
eq("P1 context method hidden by default", p1Baseline.methods.some((row) => row.methodKey === "אות רבתי"), false);
eq("P1 does not invent independent evidence", p1Baseline.evidence.independentMethodCount, 0);
eq("P1 unknown evidence remains explicit", p1Baseline.evidence.unknownMethodCount, p1Baseline.methodCount);
eq(
  "P1 same-value grouping preserves method identities",
  p1Baseline.valueGroups.find((group) => group.value === 520)?.methodKeys.join("|"),
  "רגיל|גדול",
);

const p1Context = buildGematriaPresentationModel({
  expression: "עמית",
  focusKind: "number",
  numberRoot: 646,
  activeMethodKey: "מילוי",
  methodProfile: p1Profile,
  methodStates: p1States,
  evidenceByMethodKey: {
    "רגיל": "independent",
    "מילוי": "independent",
    "גדול": "dependent",
    "מילוי בלבד": "dependent",
  },
  appliedEquivalences: [{
    representativeMethodKey: "רגיל",
    methodKeys: ["רגיל", "גדול"],
    reason: "resolved-upstream",
  }],
  relationsSummary: {
    count: 7,
    leadingRelation: { from: 520, to: 888 },
    journeyAvailable: true,
    edges: new Array(20).fill({}),
  },
  trace: { available: true, steps: new Array(20).fill({}) },
});
eq("P1 context method is active-first", p1Context.previewMethods[0]?.methodKey, "מילוי");
eq("P1 number-first focus", p1Context.focal.primary, 646);
eq("P1 governed independent evidence carried", p1Context.evidence.independentMethodCount, 2);
eq("P1 governed dependent evidence carried", p1Context.evidence.dependentMethodCount, 2);
eq("P1 applied equivalence stays presentation-only", p1Context.methods.find((row) => row.methodKey === "גדול")?.primaryRole, "equivalent");
eq("P1 relation summary drops eager edges", "edges" in p1Context.relationsSummary, false);
eq("P1 trace remains lazy summary", "steps" in p1Context.trace, false);

const p1Contextual = buildGematriaPresentationModel({
  expression: "עמית",
  activeMethodKey: "אות רבתי",
  contextualMethodKeys: ["אות רבתי"],
  methodProfile: p1Profile,
  methodStates: p1States,
});
eq("P1 contextual method appears only when activated", p1Contextual.activeMethod?.methodKey, "אות רבתי");
eq("P1 contextual state is explicit", p1Contextual.activeMethod?.exceptionalState, "contextual");

const p1Restricted = buildGematriaPresentationModel({
  expression: "עמית",
  activeMethodKey: "מילוי",
  methodProfile: p1Profile,
  methodStates: p1States,
  accessByMethodKey: {
    "מילוי": { allowed: false, reason: "premium" },
  },
});
eq("P1 restricted result is redacted", p1Restricted.activeMethod?.value, null);
eq("P1 restricted result is unavailable", p1Restricted.activeMethod?.exceptionalState, "unavailable");

const p1Unavailable = buildGematriaPresentationModel({
  expression: "עמית",
  activeMethodKey: "אח״ס–בט״ע",
  methodProfile: p1Profile,
  methodStates: p1States,
  includeUnavailableKeys: ["אח״ס–בט״ע"],
});
eq("P1 unavailable identity remains addressable", p1Unavailable.activeMethod?.methodKey, "אח״ס–בט״ע");
eq("P1 unavailable identity never fabricates zero", p1Unavailable.activeMethod?.value, null);

console.log(`\n${pass} passed, ${fail} failed.`);
if (fail) {
  for (const item of failures) console.log("  - " + item);
  process.exit(1);
}
console.log("Canonical presentation checks passed.");
