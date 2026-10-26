import test from "node:test";
import assert from "node:assert/strict";
import {
  diagnoseElsGuidedFailure,
  prepareElsAutomaticResearchPlan,
  prepareElsCipherDiscoveryPlan,
  projectElsGuidedOccurrenceCoverage,
  runElsAutomaticResearchSlice,
  summarizeElsAutomaticPlan,
  summarizeElsGuidedDiscoveryPlan,
} from "./elsAutomaticResearchPlan.js";

const base = { expressions: "סוד החשמל\nאמת", scope: "torah", skipMin: "2", skipMax: "80", pageSize: "2" };

test("guided story compiles locally into one bounded axis plus context proposals", () => {
  const story = "מעבורת החלל קולומביה התפרקה בחזרה לכדור הארץ ועלתה באש";
  const plan = prepareElsCipherDiscoveryPlan({ text: story, scope: "torah" });
  assert.equal(plan.contract, "els_cipher_discovery_plan_v1");
  assert.equal(plan.anchorCandidates[0].term, "קולומביה");
  assert.equal(plan.goal.primaryAxes, 1);
  assert.equal(plan.goal.connectedSupports, 2);
  assert.equal(plan.limits.fullAxisOccurrences, 4);
  assert.equal(plan.limits.maximumOccurrenceBatches, 2);
  assert.ok(plan.contextCandidates.filter(row => row.selected).length <= 6);
  assert.equal(plan.aiUsed, false);
  assert.equal(plan.persisted, false);
  assert.equal(plan.truthPromotion, false);
  assert.equal("text" in plan, false);

  const summary = summarizeElsGuidedDiscoveryPlan(plan);
  assert.equal(summary.status, "PROPOSED_SEARCH_PLAN");
  assert.equal(summary.modelCallsTriggered, 0);
  assert.equal(summary.rawStoryIncluded, false);
  assert.equal(summary.targetTerms.length <= 8, true);
  assert.equal(JSON.stringify(summary).includes(story), false);
});

test("a quoted or explicit axis wins without a cipher-specific rule", () => {
  const quoted = prepareElsCipherDiscoveryPlan({ text: "בדקו את ״ד טראמפ״ ליד באש אטמין" });
  assert.equal(quoted.anchorCandidates[0].term, "ד טראמפ");
  const explicit = prepareElsCipherDiscoveryPlan({ text: "הקשר ארוך", anchorTerm: "אורניום", requiredTerms: "איראן; ארהב" });
  assert.equal(explicit.anchorCandidates[0].term, "אורניום");
  assert.deepEqual(explicit.contextCandidates.filter(row => row.required).map(row => row.term), ["איראן", "ארהב"]);
});

const guidedPlan = () => prepareElsCipherDiscoveryPlan({
  text: "מעבורת החלל קולומביה התפרקה ועלתה באש",
  anchorTerm: "קולומביה",
  requiredTerms: "ספינת\nיכל אש",
});
const guidedOccurrences = count => Array.from({ length: count }, (_, index) => ({
  hitId: `hit-${index + 1}`, ordinal: index + 1, skip: index === 1 ? 4545 : 31 + index,
  dir: index % 2 ? -1 : 1, start: 1000 + index * 100, ref: `מקור ${index + 1}`, setId: "set-current",
}));
const guidedInspection = (hitId, {
  status = "VERIFIED_PAIR",
  relation = { code: "EXACT_INTERSECTION", label: "חצייה", priority: 600, stage: "A" },
  terms = ["ממצאא", "ממצאבח"], storyMatches = 0, failureCause = null, setId = "set-current", languageInspection = null,
} = {}) => ({
  lens: "matrix-discovery", ok: true, contract: "els_matrix_discovery_v1", target: { hitId, setId },
  discoveryBundle: {
    contract: "els_cipher_discovery_plan_v1", status, failureCause,
    selected: status === "VERIFIED_PAIR" ? {
      relation, storyMatches, reasons: ["זוג שעבר אימות קנוני"],
      supports: terms.map((term, index) => ({
        term, label: term, status: "VERIFIED", skip: 17 + index, direction: index ? "back" : "fwd",
        occurrenceCount: 1, matrixStage: relation.stage, ref: `מקור ${index + 1}`, book: "בראשית",
      })),
    } : null,
  },
  ...(languageInspection ? { languageInspection } : {}),
});

const guidedLanguageInspection = ({ hitId = "hit-1", skip = 31, dir = 1, axisStart = 1000 } = {}) => ({
  contract: "els_matrix_language_inspection_v1", status: "CANDIDATE_INPUT", source: "canonical_matrix_letters",
  stage: "S3_OPEN_SEQUENCE_SEGMENTATION", axis: { term: "ציר", scope: "torah", skip, dir, start: axisStart, hitId },
  authority: { letters: "CANONICAL", segmentation: "DETERMINISTIC_CANDIDATE", meaning: "UNVERIFIED", canonicalReplayRequired: true },
  coverage: { candidatesExamined: 160, truncated: false }, modelCallsTriggered: 0, findingMutation: false, truthPromotion: false,
  rays: [{ id: "horizontal:500:1:11", orientation: "horizontal", text: "אבמלכימדודא", reverseText: "אדודמיכלמבא", start: 500, step: 1, length: 11, distance: 0, intersectsAxis: true }],
  readings: [{
    contract: "els_torah_language_reading_v1", status: "UNVERIFIED_READING", exactLetters: "במלכים", canonicalLetters: "במלכימ",
    baseTerm: "מלכ", label: "מלך", relation: "prefixed-suffixed-form", prefix: "ב", suffix: "ים", source: "bounded-dictionary",
    selectionProtocol: "GOVERNED_CORE", rayId: "horizontal:500:1:11", orientation: "horizontal", readingDirection: "forward",
    offset: 1, start: 501, step: 1, length: 6, distance: 0, canonicalReplayRequired: true, truthPromotion: false,
  }, {
    contract: "els_torah_language_reading_v1", status: "UNVERIFIED_READING", exactLetters: "דוד", canonicalLetters: "דוד",
    baseTerm: "דוד", label: "דוד", relation: "exact-lexicon-match", prefix: null, suffix: null, source: "story",
    selectionProtocol: "CONTEXT_PRE_REGISTERED", rayId: "horizontal:500:1:11", orientation: "horizontal", readingDirection: "forward",
    offset: 7, start: 507, step: 1, length: 3, distance: 0, canonicalReplayRequired: true, truthPromotion: false,
  }],
  segmentations: [],
  relations: [{
    contract: "els_torah_language_relation_v1", status: "UNVERIFIED_RELATION", geometry: "AXIS_INTERSECTING_RAY",
    rayId: "horizontal:500:1:11", orientation: "horizontal", readingDirection: "forward", gap: 0, distance: 0,
    contextMatches: 1, exactMatches: 1, candidateScore: 164, rank: 1, canonicalReplayRequired: true, truthPromotion: false,
    tokens: [
      { exactLetters: "במלכים", canonicalLetters: "במלכימ", baseTerm: "מלכ", label: "מלך", relation: "prefixed-suffixed-form", source: "bounded-dictionary", start: 501, step: 1, length: 6, offset: 1 },
      { exactLetters: "דוד", canonicalLetters: "דוד", baseTerm: "דוד", label: "דוד", relation: "exact-lexicon-match", source: "story", start: 507, step: 1, length: 3, offset: 7 },
    ],
  }],
});

test("guided coverage inspects exactly four canonical occurrences before explicit continuation", () => {
  const occurrences = guidedOccurrences(9);
  const coverage = projectElsGuidedOccurrenceCoverage({ plan: guidedPlan(), occurrences });
  assert.equal(coverage.contract, "els_guided_occurrence_coverage_v1");
  assert.equal(coverage.status, "INSPECTING");
  assert.equal(coverage.coverage.scheduledCount, 4);
  assert.equal(coverage.coverage.remainingUnscheduledCount, 5);
  assert.equal(coverage.coverage.uninspectedAreNotNegativeEvidence, true);
  assert.equal(coverage.selectionLaw.numericSkipPromoted, false);
  assert.equal(coverage.aiUsed, false);
  assert.equal(coverage.findingMutation, false);
});

test("strong verified geometry outranks a memorable numeric skip", () => {
  const occurrences = guidedOccurrences(4);
  const numeric = guidedInspection("hit-2", {
    relation: { code: "SAME_OR_NEAR_SKIP", label: "דילוג סמוך", priority: 380, stage: "B" }, storyMatches: 2,
  });
  const geometric = guidedInspection("hit-1");
  const misses = ["hit-3", "hit-4"].map(hitId => guidedInspection(hitId, { status: "NO_CANDIDATE_PAIR", failureCause: "MATRIX_BOUNDS" }));
  const coverage = projectElsGuidedOccurrenceCoverage({ plan: guidedPlan(), occurrences, inspections: [numeric, geometric, ...misses] });
  assert.equal(occurrences[1].skip, 4545);
  assert.equal(coverage.recommendation.hitId, "hit-1");
  assert.equal(coverage.stopReason, "STRONG_VERIFIED_PAIR");
});

test("guided coverage waits after four misses and admits only four more after continuation", () => {
  const occurrences = guidedOccurrences(10);
  const misses = occurrences.slice(0, 4).map(row => guidedInspection(row.hitId, { status: "NO_CANDIDATE_PAIR", failureCause: "MATRIX_BOUNDS" }));
  const first = projectElsGuidedOccurrenceCoverage({ plan: guidedPlan(), occurrences, inspections: misses });
  assert.equal(first.status, "AWAITING_CONTINUATION");
  assert.equal(first.coverage.scheduledCount, 4);
  assert.ok(first.inspections.every(row => row.failure.category === "matrix_bounds"));
  const second = projectElsGuidedOccurrenceCoverage({ plan: guidedPlan(), occurrences, inspections: misses, approvedBatches: 2 });
  assert.equal(second.status, "INSPECTING");
  assert.equal(second.coverage.scheduledCount, 8);
  assert.equal(second.nextOccurrence.hitId, "hit-5");
});

test("stale and out-of-batch reports never become guided evidence", () => {
  const occurrences = guidedOccurrences(6);
  const coverage = projectElsGuidedOccurrenceCoverage({
    plan: guidedPlan(), occurrences, resultSetId: "set-current",
    inspections: [
      { ...guidedInspection("hit-2"), target: { hitId: "hit-2", setId: "set-old" } },
      guidedInspection("hit-5"), guidedInspection("hit-1"), guidedInspection("hit-1"),
    ],
  });
  assert.equal(coverage.recommendation.hitId, "hit-1");
  assert.deepEqual(coverage.rejectedInspections.map(row => row.reason), ["STALE_RESULT_SET", "OUTSIDE_APPROVED_BATCH", "DUPLICATE_REPORT"]);
});

test("guided failure categories stay explicit and unknown causes fail closed", () => {
  assert.equal(diagnoseElsGuidedFailure("VOCABULARY_MISS").category, "vocabulary");
  assert.equal(diagnoseElsGuidedFailure("NORMALIZATION").category, "recognition_normalization");
  assert.equal(diagnoseElsGuidedFailure("NO_STRONG_GEOMETRY").category, "geometry");
  assert.equal(diagnoseElsGuidedFailure("RANKING").category, "ranking");
  assert.equal(diagnoseElsGuidedFailure("MATRIX_BOUNDS").category, "matrix_bounds");
  assert.equal(diagnoseElsGuidedFailure("UI_PROJECTION").category, "ui_projection");
  assert.equal(diagnoseElsGuidedFailure("unexpected").diagnosisRequired, true);
});

test("bounded Torah-language readings preserve exact letters and never become findings", () => {
  const occurrences = guidedOccurrences(1);
  const inspection = guidedInspection("hit-1", { languageInspection: guidedLanguageInspection() });
  const coverage = projectElsGuidedOccurrenceCoverage({ plan: guidedPlan(), occurrences, inspections: [inspection] });
  const language = coverage.inspections[0].languageInspection;
  assert.equal(language.contract, "els_matrix_language_inspection_v1");
  assert.equal(language.authority.letters, "CANONICAL");
  assert.equal(language.authority.meaning, "UNVERIFIED");
  assert.equal(language.readings[0].exactLetters, "במלכימ");
  assert.equal(language.readings[0].label, "מלך");
  assert.equal(language.readings[0].relation, "prefixed-suffixed-form");
  assert.equal(language.readings[0].canonicalReplayRequired, true);
  assert.equal(language.relations[0].contract, "els_torah_language_relation_v1");
  assert.equal(language.relations[0].geometry, "AXIS_INTERSECTING_RAY");
  assert.deepEqual(language.relations[0].tokens.map(token => token.baseTerm), ["מלכ", "דוד"]);
  assert.equal(language.relations[0].status, "UNVERIFIED_RELATION");
  assert.equal(language.relations[0].truthPromotion, false);
  assert.equal(language.truthPromotion, false);
  assert.equal(language.findingMutation, false);
  assert.equal(language.modelCallsTriggered, 0);
  assert.equal(coverage.recommendation.supports.some(support => support.term === "במלכימ"), false);
});

test("language input with a foreign occurrence identity fails closed", () => {
  const occurrences = guidedOccurrences(1);
  const inspection = guidedInspection("hit-1", { languageInspection: guidedLanguageInspection({ hitId: "hit-other" }) });
  const coverage = projectElsGuidedOccurrenceCoverage({ plan: guidedPlan(), occurrences, inspections: [inspection] });
  assert.equal(coverage.inspections[0].languageInspection, null);
});

test("language input cannot substitute different letters at a valid ray locus", () => {
  const occurrences = guidedOccurrences(1);
  const languageInspection = guidedLanguageInspection();
  languageInspection.readings[0].canonicalLetters = "במלחימ";
  languageInspection.readings[0].exactLetters = "במלחים";
  const inspection = guidedInspection("hit-1", { languageInspection });
  const coverage = projectElsGuidedOccurrenceCoverage({ plan: guidedPlan(), occurrences, inspections: [inspection] });
  assert.deepEqual(coverage.inspections[0].languageInspection.readings.map(reading => reading.baseTerm), ["דוד"]);
  assert.equal(coverage.inspections[0].languageInspection.relations.length, 0);
});

test("language relation geometry is rechecked instead of trusting its reported gap", () => {
  const occurrences = guidedOccurrences(1);
  const languageInspection = guidedLanguageInspection();
  languageInspection.relations[0].gap = 4;
  const inspection = guidedInspection("hit-1", { languageInspection });
  const coverage = projectElsGuidedOccurrenceCoverage({ plan: guidedPlan(), occurrences, inspections: [inspection] });
  assert.equal(coverage.inspections[0].languageInspection.readings.length, 2);
  assert.equal(coverage.inspections[0].languageInspection.relations.length, 0);
});

test("automatic plan derives each expression once, explains every form and deduplicates canonical terms", () => {
  const plan = prepareElsAutomaticResearchPlan(base);
  assert.equal(plan.contract, "els_automatic_research_plan_v1");
  assert.deepEqual(plan.sources, ["סוד החשמל", "אמת"]);
  const words = plan.candidates.map(row => row.canonicalTerm);
  assert.ok(words.includes("סודהחשמל"));
  assert.ok(words.includes("למשחהדוס"));
  assert.ok(words.includes("דוסלמשחה"));
  assert.ok(words.includes("סודלמשחה"));
  assert.equal(new Set(words).size, words.length);
  assert.ok(plan.candidates.every(row => row.derivations.every(d => d.source && d.ruleId && d.ruleLabel)));
  assert.equal(plan.canonicalFormsPending, true);
  assert.equal(plan.skipMax, 80);
});

test("canonical FORMS are incorporated as evidence of one generator, without recreating its rules", () => {
  const plan = prepareElsAutomaticResearchPlan({ ...base, canonicalForms: [
    { source: "סוד החשמל", term: "סודהחשמל", derivation: "A + B" },
    { source: "סוד החשמל", term: "החשמלסוד", derivation: "B + A" },
  ] });
  assert.equal(plan.canonicalFormsIncluded, true);
  assert.equal(plan.canonicalFormsPending, false);
  assert.ok(plan.candidates.some(row => row.canonicalTerm === "החשמלסוד" && row.derivations.some(d => d.ruleId === "canonical_forms_splitjoin")));
  const duplicate = plan.candidates.find(row => row.canonicalTerm === "סודהחשמל");
  assert.ok(duplicate.derivations.some(d => d.ruleId === "original"));
  assert.ok(duplicate.derivations.some(d => d.ruleId === "canonical_forms_splitjoin"));
});

test("open-ended bounds and invalid input remain explicit", () => {
  assert.equal(prepareElsAutomaticResearchPlan({ ...base, skipMax: "" }).skipMax, 2_147_483_647);
  assert.ok(prepareElsAutomaticResearchPlan({ ...base, expressions: "" }).error);
  assert.ok(prepareElsAutomaticResearchPlan({ ...base, expressions: "abc" }).error);
  assert.ok(prepareElsAutomaticResearchPlan({ ...base, skipMax: "1" }).error);
});

test("automatic slices use only canonical page calls, preserve source and make no truth claim", async () => {
  const plan = prepareElsAutomaticResearchPlan(base);
  const calls = [];
  const result = await runElsAutomaticResearchSlice({ plan, invokePage: async request => {
    calls.push(request);
    return { data: { result: {
      contract: "els_search_page_v1", status: "OK", corpus_id: "torah-corpus", input: { normalized: request.term.replace(/\s/g, "") },
      hits: [{ occurrence_id: `els:torah-corpus:${request.term}:7:1:10`, skip: 7, dir: 1, start: 10, end: 17, positions: [10, 17] }],
      completion: { executed: true, returned_hits: 1, truncated: false, continuation: null },
    } } };
  } });
  assert.equal(calls.length, result.rows.length);
  assert.ok(calls.every(call => call.op === "page" && call.skip_min === 2 && call.skip_max === 80 && call.selection_protocol === "POST_HOC_EXPLORATORY"));
  assert.equal(result.rows[0].derivations[0].source, "סוד החשמל");
  assert.equal(result.rows[0].projection.occurrences.length, 1);
  assert.equal(result.scan.truthPromotion, false);
  assert.equal(summarizeElsAutomaticPlan(plan, [result]).evidencePromotion, false);
  assert.equal(summarizeElsAutomaticPlan(plan, [result]).hasPending, result.hasMoreCandidates);
});

test("a time-stopped slice never advances past candidates it did not scan", async () => {
  const plan = prepareElsAutomaticResearchPlan({ ...base, expressions: "סוד החשמל, תורת אמת, אור אמת" });
  let clock = 0;
  const result = await runElsAutomaticResearchSlice({ plan, now: () => clock, invokePage: async request => {
    clock += 16_000;
    return { data: { result: { contract: "els_search_page_v1", status: "EXECUTED_EMPTY", corpus_id: "torah-corpus",
      input: { normalized: request.term.replace(/\s/g, "") }, hits: [], completion: { executed: true, returned_hits: 0, truncated: false } } } };
  } });
  assert.equal(result.nextOffset, 1);
  assert.equal(result.hasMoreCandidates, true);
  assert.equal(result.rows[1].state, "BUDGET_STOPPED");
});

test("a series longer than one slice continues through the same plan without a second search path", async () => {
  const plan = prepareElsAutomaticResearchPlan({ ...base, expressions: "סוד החשמל, תורת אמת, אור אמת" });
  assert.ok(plan.candidates.length > 8);
  const calls = [];
  const invokePage = async request => {
    calls.push(request.term);
    return { data: { result: { contract: "els_search_page_v1", status: "EXECUTED_EMPTY", corpus_id: "torah-corpus",
      input: { normalized: request.term.replace(/\s/g, "") }, hits: [], completion: { executed: true, returned_hits: 0, truncated: false } } } };
  };
  const first = await runElsAutomaticResearchSlice({ plan, invokePage });
  const second = await runElsAutomaticResearchSlice({ plan, offset: first.nextOffset, invokePage });
  assert.equal(first.rows.length, 8);
  assert.equal(first.hasMoreCandidates, true);
  assert.equal(second.offset, 8);
  assert.equal(first.rows.length + second.rows.length, plan.candidates.length);
  assert.equal(new Set(calls).size, plan.candidates.length);
  assert.equal(summarizeElsAutomaticPlan(plan, [first, second]).hasPending, false);
});

test("automatic scan reports each active form and keeps a failed form distinct from no matches", async () => {
  const plan = prepareElsAutomaticResearchPlan({ ...base, expressions: "חשפד" });
  const progress = [];
  const result = await runElsAutomaticResearchSlice({ plan, onProgress: event => progress.push(event), invokePage: async () => ({
    data: { error: "backend_error" }, error: { message: "Edge Function returned a non-2xx status code", context: { status: 503 } },
  }) });
  assert.equal(progress[0].phase, "searching");
  assert.equal(progress[1].phase, "done");
  assert.equal(progress[1].row.state, "FAILED");
  assert.match(progress[1].row.error, /לא.*נמצא/);
  assert.equal(result.rows[0].state, "FAILED");
  assert.equal(result.rows[0].partial, true);
  assert.equal(summarizeElsAutomaticPlan(plan, [result]).failedCount > 0, true);
});

test("Raziel coverage stops calling a variant partial after its keyset continuation finishes", () => {
  const plan = prepareElsAutomaticResearchPlan({ ...base, expressions: "אמת" });
  const row = { canonicalTerm: "אמת", state: "OK", count: 2, partial: true, cursor: { skip: 8, start: 10, dir: 1 } };
  const slice = { rows: [row, ...plan.candidates.filter(candidate => candidate.canonicalTerm !== "אמת").map(candidate => ({ ...candidate, state: "EXECUTED_EMPTY", count: 0, partial: false, cursor: null }))] };
  assert.equal(summarizeElsAutomaticPlan(plan, [slice]).hasPending, true);
  assert.equal(summarizeElsAutomaticPlan(plan, [slice], { אמת: { pages: [{}], cursor: null } }).hasPending, false);
});
