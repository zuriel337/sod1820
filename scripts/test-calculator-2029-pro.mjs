import assert from "node:assert/strict";
import fs from "node:fs";
import { englishAll } from "../src/lib/englishGematria.js";
import {
  CALCULATOR_INPUT_KIND as KIND,
  classifyCalculatorInput,
  filterProfileRowsForInput,
  isReportableValue,
} from "../src/lib/research/calculator2029Input.js";
import { buildEnglishLaneRows, ENGLISH_LANE_METHOD_KEYS } from "../src/lib/research/calculator2029English.js";
import { ledgerFromFinding } from "../src/lib/research/calculator2029Ledger.js";
import { buildCalculationSelection, normalizeCalculatorMethods } from "../src/lib/research/calculator2029Model.js";
import { buildCalculatorShareUrl, parseCalculatorShareState } from "../src/lib/research/calculator2029Viral.js";
import { buildCalculator2029FastPreview } from "../src/lib/research/calculator2029FastPreview.js";

// ── input classification ──
const kind = (text) => classifyCalculatorInput(text).kind;
assert.equal(kind(""), KIND.EMPTY);
assert.equal(kind("   "), KIND.EMPTY);
assert.equal(kind("צוריאל"), KIND.HEBREW);
assert.equal(kind("ABC"), KIND.LATIN);
assert.equal(kind("David Cohen"), KIND.LATIN);
assert.equal(kind("abc צוריאל"), KIND.MIXED);
assert.equal(kind("123"), KIND.NUMERIC);
assert.equal(kind("שלום 123"), KIND.HEBREW);
assert.equal(kind("Привет"), KIND.UNSUPPORTED);
assert.equal(classifyCalculatorInput("abc").hebrewApplicable, false);
assert.equal(classifyCalculatorInput("abc").englishApplicable, true);
assert.equal(classifyCalculatorInput("abc צוריאל").hebrewApplicable, true);
assert.equal(classifyCalculatorInput("abc צוריאל").englishApplicable, true);
assert.match(classifyCalculatorInput("Müller").notice || "", /סימנים/);
assert.equal(isReportableValue(0), false);
assert.equal(isReportableValue(null), false);
assert.equal(isReportableValue(337), true);

// ── ABC=0 regression: no Hebrew value, no selection, no share link ──
const abcPreview = buildCalculator2029FastPreview("ABC");
assert.ok(abcPreview.methods.every((row) => row.computedValue === null));
const hebrewZeroRows = normalizeCalculatorMethods([{ methodKey: "רגיל", displayLabel: "רגיל", computedValue: 0 }]);
assert.equal(hebrewZeroRows[0].computedValue, null);
assert.equal(buildCalculationSelection("ABC", { methodKey: "רגיל", computedValue: 0, label: "רגיל" }).resultValue, null);
assert.equal(buildCalculatorShareUrl({ expression: "ABC", methodKey: "רגיל", resultValue: 0 }, { shareId: "x" }), null);
assert.equal(parseCalculatorShareState("?q=ABC&m=%D7%A8%D7%92%D7%99%D7%9C&v=0&s=x").isShared, false);
const zeroRows = [
  { methodKey: "רגיל", computedValue: 0 },
  { methodKey: "en_ordinal", computedValue: 0 },
];
assert.deepEqual(filterProfileRowsForInput(zeroRows, classifyCalculatorInput("ABC")), []);
assert.deepEqual(
  filterProfileRowsForInput(zeroRows, classifyCalculatorInput("צוריאל")).map((row) => row.methodKey),
  ["רגיל"],
);
const canonicalEnglish = [{ methodKey: "en_ordinal", computedValue: 6 }, { methodKey: "רגיל", computedValue: 0 }];
assert.deepEqual(
  filterProfileRowsForInput(canonicalEnglish, classifyCalculatorInput("ABC")).map((row) => row.methodKey),
  ["en_ordinal"],
);

// ── English lane: parity with the live canonical SQL golden values (checked 2026-10-12, fn_en_*) ──
const GOLDEN = {
  good: { en_ordinal: 41, en_full_reduction: 23, en_reverse_ordinal: 67, en_reverse_reduction: 13 },
  promise: { en_ordinal: 95, en_full_reduction: 41, en_reverse_ordinal: 94, en_reverse_reduction: 40 },
  ABC: { en_ordinal: 6, en_full_reduction: 6, en_reverse_ordinal: 75, en_reverse_reduction: 21 },
  Zuriel: { en_ordinal: 91, en_full_reduction: 37, en_reverse_ordinal: 71, en_reverse_reduction: 35 },
  "Hello World": { en_ordinal: 124, en_full_reduction: 52, en_reverse_ordinal: 146, en_reverse_reduction: 47 },
  "abc צוריאל": { en_ordinal: 6, en_full_reduction: 6, en_reverse_ordinal: 75, en_reverse_reduction: 21 },
  "Müller-Straße 7": { en_ordinal: 123, en_full_reduction: 42, en_reverse_ordinal: 147, en_reverse_reduction: 66 },
};
for (const [text, expected] of Object.entries(GOLDEN)) {
  const rows = buildEnglishLaneRows(text);
  assert.equal(rows.length, 5, text);
  for (const [methodKey, value] of Object.entries(expected)) {
    const row = rows.find((candidate) => candidate.methodKey === methodKey);
    assert.equal(row?.computedValue, value, `${text} · ${methodKey}`);
    assert.equal(row.previewOnly, true);
    assert.equal(row.canonical, false);
    assert.equal(row.language, "en");
  }
}
assert.deepEqual(ENGLISH_LANE_METHOD_KEYS, ["en_ordinal", "en_full_reduction", "en_reverse_ordinal", "en_reverse_reduction", "en_agrippa"]);
assert.deepEqual(englishAll("good").map((row) => row.key), ["ordinal", "reduction", "reverse", "reverse_reduction", "agrippa"]);
assert.deepEqual(buildEnglishLaneRows("צוריאל"), []);
assert.deepEqual(buildEnglishLaneRows(""), []);

// Agrippa has no registry row yet: it stays a labelled preview even if the Registry later returns other rows.
const withCanonical = buildEnglishLaneRows("good", [{ methodKey: "en_ordinal", computedValue: 41, definitionVersion: 1 }]);
assert.equal(withCanonical.find((row) => row.methodKey === "en_ordinal").previewOnly, false);
assert.equal(withCanonical.find((row) => row.methodKey === "en_ordinal").canonical, true);
assert.equal(withCanonical.find((row) => row.methodKey === "en_agrippa").previewOnly, true);
assert.match(withCanonical.find((row) => row.methodKey === "en_agrippa").pendingNote, /לא רשום/);

// ── letter ledger comes only from canonical trace steps ──
const ledger = ledgerFromFinding({
  projection: { dimensions: { trace: {
    trace_kind: "LETTER_LEDGER",
    result: 337,
    verification: { parity: true },
    steps: [
      { token: "צ", contribution: 90, running_subtotal: 90, scope: "letter" },
      { token: "ו", contribution: 6, running_subtotal: 96, scope: "letter" },
    ],
  } } },
});
assert.equal(ledger.kind, "LETTER_LEDGER");
assert.equal(ledger.steps.length, 2);
assert.equal(ledger.steps[1].running, 96);
assert.equal(ledger.parity, true);
assert.equal(ledgerFromFinding(null).steps.length, 0);
assert.equal(ledgerFromFinding({ projection: { dimensions: { trace: { steps: ["צ", "ו"] } } } }).steps.length, 0);

// ── static contract: professional page and route ──
const pro = fs.readFileSync("src/pages/CalculatorPro2029Page.jsx", "utf8");
assert.match(pro, /data-experience-surface="calculator-pro-2029"/);
assert.match(pro, /<Sod2029Shell[\s\S]*?surface="number"/);
assert.match(pro, /path:\s*"\/2029\/calculator"/);
assert.match(pro, /noindex:\s*true/);
assert.match(pro, /fetchNumberMethodProfile/);
assert.match(pro, /fetchGematriaMethodTrace/);
assert.match(pro, /buildGematriaPresentationModel/);
assert.match(pro, /CalculatorCompare2029/);
assert.match(pro, /CalculatorOpening2029/);
assert.match(pro, /MethodLens2029/);
assert.match(pro, /buildCalculatorShareUrl/);
assert.doesNotMatch(pro, /GematriaCalculatorLegacy|CanonicalGematriaCalculator/);
assert.doesNotMatch(pro, /from\s+["'][^"']*\/gematria\.js["']/);
assert.doesNotMatch(pro, /getAiAnalysis|ai-analyze|functions\.invoke/);
// previews are never selectable as a canonical selection or shareable
assert.match(pro, /selectedMethod && !selectedMethod\.previewOnly && row\.canonicalSettled/);
const app = fs.readFileSync("src/App2029.jsx", "utf8");
assert.match(app, /path="\/2029\/calculator" element=\{<CalculatorPro2029Page \/>\}/);
const vercel = fs.readFileSync("vercel.json", "utf8");
assert.match(vercel, /"source": "\/2029\/calculator",\s*"destination": "\/2029\.html"/);
assert.match(vercel, /"source": "\/2029\/calculator",\s*"headers"/);

// ── community page: ABC guard and handoff to the professional calculator ──
const community = fs.readFileSync("src/pages/Calculator2029Page.jsx", "utf8");
assert.match(community, /classifyCalculatorInput/);
assert.match(community, /filterProfileRowsForInput/);
assert.match(community, /\/2029\/calculator\?q=/);
assert.match(community, /המשך במחשבון המקצועי/);

console.log("calculator 2029 professional + input/English lane contract: PASS");
