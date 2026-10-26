import test from "node:test";
import assert from "node:assert/strict";
import {
  diagnoseElsGuidedFailure,
  prepareElsAutomaticResearchPlan,
  prepareElsCipherDiscoveryPlan,
  prepareElsRelationshipResearchPlan,
  prepareElsResearchBrief,
  projectElsAutomaticResearchTargets,
  projectElsGuidedOccurrenceCoverage,
  runElsAutomaticResearchSlice,
  summarizeElsAutomaticPlan,
} from "./elsAutomaticResearchPlan.js";

const base = { expressions: "סוד החשמל\nאמת", scope: "torah", skipMin: "2", skipMax: "80", pageSize: "2" };

test("relationship research builds only bounded primary-to-explicit-target pairs", () => {
  const plan = prepareElsRelationshipResearchPlan({
    primaryTerm: "ראובן",
    secondTerm: "כהן",
    additionalTerms: "דוד\nמרים\nכהן\nראובן",
    scope: "tanakh",
  });
  assert.equal(plan.contract, "els_relationship_research_plan_v1");
  assert.equal(plan.mode, "primary-to-explicit-targets");
  assert.equal(plan.scope, "tanakh");
  assert.equal(plan.radius, 18);
  assert.deepEqual(plan.pairs.map(row => [row.axis, row.term]), [["ראובן", "כהן"], ["ראובן", "דוד"], ["ראובן", "מרים"]]);
  assert.ok(plan.pairs.every(row => row.searchKind === "cross"));
  assert.equal(plan.pairs.filter(row => row.selected).length, 1);
  assert.equal(plan.allPairsGenerated, false);
  assert.equal(plan.explicitExecutionRequired, true);
  assert.equal(plan.identityMerged, false);
  assert.equal(plan.persisted, false);
  assert.equal(plan.aiUsed, false);
  assert.equal(plan.truthPromotion, false);
  assert.ok(Object.isFrozen(plan));
  assert.ok(Object.isFrozen(plan.pairs));
});

test("relationship research rejects missing, duplicate-only, oversized and unbounded targets", () => {
  assert.match(prepareElsRelationshipResearchPlan({ primaryTerm: "דוד" }).error, /הוסיפו/);
  assert.match(prepareElsRelationshipResearchPlan({ primaryTerm: "דוד", secondTerm: "דוד" }).error, /זהים/);
  assert.match(prepareElsRelationshipResearchPlan({ primaryTerm: "דוד", secondTerm: "מילהעבריתארוכהמאוד" }).error, /ארוך מדי/);
  assert.match(prepareElsRelationshipResearchPlan({ primaryTerm: "דוד", additionalTerms: "אחד\nשתים\nשלש\nארבע\nחמש\nשש\nשבע" }).error, /עד שישה/);
  assert.equal(prepareElsRelationshipResearchPlan({ primaryTerm: "דוד", secondTerm: "כהן", radius: 200 }).radius, 20);
});

test("research brief separates one primary axis from exact local context without persistence or AI", () => {
  const brief = prepareElsResearchBrief({
    text: "הספינה קולומביה עלתה באש. האש אכלה חלק מן הספינה בשנת תשעו. \"יום קולומביה\" הוזכר פעמיים. יום קולומביה חזר.",
    anchorTerm: "קולומביה",
    requiredTerms: "יכל אש\nיוסף כהן",
    scope: "tanakh",
  });
  assert.equal(brief.contract, "els_research_brief_v1");
  assert.equal(brief.mode, "anchor-context");
  assert.equal(brief.scope, "tanakh");
  assert.equal(brief.persisted, false);
  assert.equal(brief.aiUsed, false);
  assert.equal(brief.truthPromotion, false);
  assert.equal(brief.storyIsContextOnly, true);
  assert.equal(brief.anchorCandidates.find(row => row.id === brief.recommendedAnchorId)?.canonicalTerm, "קולומביה");
  const terms = new Map(brief.contextCandidates.map(row => [row.canonicalTerm, row]));
  assert.equal(terms.get("יכלאש").required, true);
  assert.equal(terms.get("יכלאש").mode, "exact_phrase");
  assert.equal(terms.get("יכלאש").splitAllowed, true);
  assert.ok(terms.has("יוספכהנ"));
  assert.ok(!terms.has("יכל"), "a required phrase is not silently split into an independent search term");
  assert.ok(!terms.has("אש"), "a required phrase keeps its exact identity until the user opts into splitting");
  assert.ok(!terms.has("כהניוספ"), "reverse word order is an Advanced choice, not an automatic basic target");
  assert.ok(terms.has("האשאכלה"), "local story phrases remain editable context without becoming an axis search");
  assert.ok(terms.has("תשעו"), "Hebrew year-shaped vocabulary stays explicit");
  assert.ok(brief.candidates.length <= 24);
  assert.equal(new Set(brief.candidates.map(row => row.canonicalTerm)).size, brief.candidates.length);
});

test("research brief fails visibly on empty, oversized or non-Hebrew context", () => {
  assert.ok(prepareElsResearchBrief({ text: "" }).error);
  assert.ok(prepareElsResearchBrief({ text: "x".repeat(6001) }).error);
  assert.ok(prepareElsResearchBrief({ text: "only latin words and 2026" }).error);
  assert.match(prepareElsResearchBrief({ anchorTerm: "זהו ביטוי ארוך מאוד שאינו מתאים לציר בסיסי" }).error, /מתקדמות/);
});

test("a story can suggest an axis but never becomes a full-sentence search target", () => {
  const brief = prepareElsResearchBrief({ text: "הספינה קולומביה עלתה באש ונשארה בלב ים" });
  assert.ok(brief.anchorCandidates.some(row => row.canonicalTerm === "קולומביה"));
  assert.ok(brief.anchorCandidates.every(row => row.canonicalTerm.length <= 12));
  assert.ok(brief.candidates.every(row => row.canonicalTerm !== "הספינהקולומביהעלתהבאשונשארהבלבימ"));
});

test("cipher discovery compiles one story into one axis and a bounded pair-first goal", () => {
  const plan = prepareElsCipherDiscoveryPlan({
    text: "מעבורת החלל קולומביה התפרקה בחזרה לכדור הארץ ועלתה באש",
    anchorTerm: "קולומביה",
    requiredTerms: "ספינת\nיכל אש\nאש אכלה",
  });
  assert.equal(plan.contract, "els_cipher_discovery_plan_v1");
  assert.equal(plan.mode, "story-first-pair");
  assert.equal(plan.goal.primaryAxes, 1);
  assert.equal(plan.goal.connectedSupports, 2);
  assert.equal(plan.goal.resultPolicy, "ONE_BEST_STRUCTURE");
  assert.equal(plan.limits.targetTerms, 12);
  assert.equal(plan.limits.fullAxisOccurrences, 4);
  assert.equal(plan.limits.continuationAxisOccurrences, 4);
  assert.equal(plan.limits.maximumOccurrenceBatches, 2);
  assert.equal(plan.limits.verificationAttemptsPerOccurrence, 12);
  assert.equal(plan.raziel.role, "OPTIONAL_PRE_SEARCH_PLANNER");
  assert.equal(plan.raziel.connected, false);
  assert.equal(plan.raziel.maySearchOrVerify, false);
  assert.equal(plan.aiUsed, false);
  assert.equal(plan.truthPromotion, false);
  assert.ok(plan.contextCandidates.length <= 12);
  assert.deepEqual(new Set(plan.contextCandidates.slice(0, 3).map(row => row.canonicalTerm)), new Set(["ספינת", "יכלאש", "אשאכלה"]));
  assert.deepEqual(plan.candidates.filter(row => row.role === "axis").map(row => row.canonicalTerm), ["קולומביה"]);
  assert.ok(Object.isFrozen(plan));
  assert.ok(Object.isFrozen(plan.goal));
  assert.ok(Object.isFrozen(plan.limits));
});

const guidedPlan = () => prepareElsCipherDiscoveryPlan({
  text: "מעבורת החלל קולומביה התפרקה ועלתה באש",
  anchorTerm: "קולומביה",
  requiredTerms: "ספינת\nיכל אש",
});
const guidedOccurrences = count => Array.from({ length: count }, (_, index) => ({
  hitId: `hit-${index + 1}`,
  ordinal: index + 1,
  skip: index === 1 ? 4545 : 31 + index,
  dir: index % 2 ? -1 : 1,
  start: 1000 + index * 100,
  ref: `מקור ${index + 1}`,
  setId: "set-current",
}));
const guidedInspection = (hitId, {
  status = "VERIFIED_PAIR",
  relation = { code: "EXACT_INTERSECTION", label: "חצייה", priority: 600, stage: "A" },
  terms = ["ממצאא", "ממצאבח"],
  storyMatches = 0,
  occurrenceCounts = [1, 1],
  failureCause = null,
  setId = "set-current",
} = {}) => ({
  lens: "matrix-discovery",
  ok: true,
  contract: "els_matrix_discovery_v1",
  target: { hitId, setId },
  discoveryBundle: {
    contract: "els_cipher_discovery_plan_v1",
    status,
    failureCause,
    selected: status === "VERIFIED_PAIR" ? {
      relation,
      storyMatches,
      reasons: ["זוג שעבר אימות קנוני"],
      supports: terms.map((term, index) => ({
        term,
        label: term,
        status: "VERIFIED",
        skip: 17 + index,
        direction: index ? "back" : "fwd",
        occurrenceCount: occurrenceCounts[index] || 1,
        matrixStage: relation.stage,
        ref: `מקור ${index + 1}`,
        book: "בראשית",
      })),
    } : null,
  },
});

test("guided occurrence coverage starts with exactly four canonical occurrences and leaves the rest unknown", () => {
  const occurrences = guidedOccurrences(9);
  const triageItems = occurrences.map((occurrence, index) => ({
    key: occurrence.hitId,
    rank: index + 1,
    inspectionPriority: index === 5 ? 900 : 100 - index,
    compactEvidence: index === 5,
  }));
  const coverage = projectElsGuidedOccurrenceCoverage({ plan: guidedPlan(), occurrences, triageItems });
  assert.equal(coverage.contract, "els_guided_occurrence_coverage_v1");
  assert.equal(coverage.status, "INSPECTING");
  assert.equal(coverage.coverage.batchSize, 4);
  assert.equal(coverage.coverage.scheduledCount, 4);
  assert.equal(coverage.coverage.remainingUnscheduledCount, 5);
  assert.equal(coverage.coverage.uninspectedAreNotNegativeEvidence, true);
  assert.equal(coverage.schedule[0].hitId, "hit-6", "result triage evidence may bring a later occurrence into the bounded first wave");
  assert.equal(coverage.selectionLaw.numericSkipPromoted, false);
  assert.equal(coverage.aiUsed, false);
  assert.equal(coverage.findingMutation, false);
  assert.equal(coverage.persisted, false);
});

test("a patterned skip never outranks stronger verified geometry", () => {
  const occurrences = guidedOccurrences(4);
  const pretty = guidedInspection("hit-2", {
    relation: { code: "SAME_OR_NEAR_SKIP", label: "דילוג סמוך", priority: 380, stage: "B" },
    storyMatches: 2,
    occurrenceCounts: [8, 8],
  });
  const geometric = guidedInspection("hit-1", {
    relation: { code: "EXACT_INTERSECTION", label: "חצייה", priority: 600, stage: "A" },
    storyMatches: 0,
  });
  const coverage = projectElsGuidedOccurrenceCoverage({ plan: guidedPlan(), occurrences, inspections: [pretty, geometric] });
  assert.equal(occurrences[1].skip, 4545);
  assert.equal(coverage.recommendation.hitId, "hit-1");
  assert.equal(coverage.stopReason, "STRONG_VERIFIED_PAIR");
  assert.equal(coverage.selectionLaw.numericSkipPromoted, false);
});

test("the Colombia holdout wins for its verified supports and geometry even when its skip changes", () => {
  const run = skip => {
    const occurrences = guidedOccurrences(4).map(row => row.hitId === "hit-2" ? { ...row, skip } : row);
    return projectElsGuidedOccurrenceCoverage({
      plan: guidedPlan(),
      occurrences,
      inspections: [
        guidedInspection("hit-1", { relation: { code: "SAME_OR_NEAR_SKIP", label: "דילוג סמוך", priority: 380, stage: "B" }, storyMatches: 2 }),
        guidedInspection("hit-2", {
          relation: { code: "SHARED_PARALLEL", label: "מקבילים לציר", priority: 550, stage: "A" },
          terms: ["ספינת", "יכלאש"],
          storyMatches: 2,
        }),
      ],
    });
  };
  const familiarSkip = run(4545), ordinarySkip = run(37);
  assert.equal(familiarSkip.recommendation.hitId, "hit-2");
  assert.deepEqual(familiarSkip.recommendation.supports.map(row => row.term), ["ספינת", "יכלאש"]);
  assert.equal(ordinarySkip.recommendation.hitId, "hit-2", "changing only the axis skip must not change the decision");
});

test("guided coverage waits after one exhausted batch and adds only the next four after continuation", () => {
  const occurrences = guidedOccurrences(10);
  const exhausted = occurrences.slice(0, 4).map(row => guidedInspection(row.hitId, {
    status: "NO_CANDIDATE_PAIR",
    failureCause: "MATRIX_BOUNDS",
  }));
  const first = projectElsGuidedOccurrenceCoverage({ plan: guidedPlan(), occurrences, inspections: exhausted });
  assert.equal(first.status, "AWAITING_CONTINUATION");
  assert.equal(first.stopReason, "APPROVED_BATCH_EXHAUSTED");
  assert.equal(first.nextOccurrence, null);
  assert.equal(first.coverage.scheduledCount, 4);
  assert.equal(first.coverage.remainingUnscheduledCount, 6);
  assert.ok(first.inspections.every(row => row.failure.category === "matrix_bounds"));

  const second = projectElsGuidedOccurrenceCoverage({ plan: guidedPlan(), occurrences, inspections: exhausted, approvedBatches: 2 });
  assert.equal(second.status, "INSPECTING");
  assert.equal(second.coverage.scheduledCount, 8);
  assert.equal(second.coverage.remainingUnscheduledCount, 2);
  assert.deepEqual(second.schedule.slice(4).map(row => row.hitId), ["hit-5", "hit-6", "hit-7", "hit-8"]);
  assert.equal(second.nextOccurrence.hitId, "hit-5");
});

test("stale, unknown, out-of-batch and duplicate reports cannot enter a recommendation", () => {
  const occurrences = guidedOccurrences(6);
  const validWeak = guidedInspection("hit-1", {
    relation: { code: "BOUNDED_LOCAL_GAP", label: "פער מקומי", priority: 100, stage: "B" },
  });
  const coverage = projectElsGuidedOccurrenceCoverage({
    plan: guidedPlan(),
    occurrences,
    resultSetId: "set-current",
    inspections: [
      { ...guidedInspection("hit-2"), target: { hitId: "hit-2", setId: "set-old" } },
      guidedInspection("not-a-result"),
      guidedInspection("hit-5"),
      validWeak,
      guidedInspection("hit-1"),
    ],
  });
  assert.equal(coverage.recommendation, null);
  assert.equal(coverage.inspections.length, 1);
  assert.deepEqual(coverage.rejectedInspections.map(row => row.reason), [
    "STALE_RESULT_SET",
    "UNKNOWN_OCCURRENCE",
    "OUTSIDE_APPROVED_BATCH",
    "DUPLICATE_REPORT",
  ]);
  assert.equal(coverage.nextOccurrence.hitId, "hit-2", "a stale report leaves that exact occurrence pending");
});

test("guided coverage exposes one recommendation and no more than two verified alternatives", () => {
  const occurrences = guidedOccurrences(4);
  const inspections = occurrences.map((row, index) => guidedInspection(row.hitId, {
    relation: index === 3
      ? { code: "EXACT_INTERSECTION", label: "חצייה", priority: 600, stage: "A" }
      : { code: "SAME_OR_NEAR_SKIP", label: "דילוג סמוך", priority: 380, stage: "B" },
    storyMatches: index,
  }));
  const coverage = projectElsGuidedOccurrenceCoverage({ plan: guidedPlan(), occurrences, inspections });
  assert.equal(coverage.status, "RECOMMENDED");
  assert.equal(coverage.recommendation.hitId, "hit-4");
  assert.equal(coverage.alternatives.length, 2);
  assert.equal(new Set([coverage.recommendation, ...coverage.alternatives].map(row => row.hitId)).size, 3);
});

test("guided failure diagnosis is explicit and fails closed on unsupported causes", () => {
  assert.deepEqual(diagnoseElsGuidedFailure("VOCABULARY_MISS"), {
    code: "VOCABULARY_MISS", category: "vocabulary", diagnosisRequired: false,
  });
  assert.equal(diagnoseElsGuidedFailure("NORMALIZATION").category, "recognition_normalization");
  assert.equal(diagnoseElsGuidedFailure("NO_STRONG_GEOMETRY").category, "geometry");
  assert.equal(diagnoseElsGuidedFailure("RANKING").category, "ranking");
  assert.equal(diagnoseElsGuidedFailure("MATRIX_BOUNDS").category, "matrix_bounds");
  assert.equal(diagnoseElsGuidedFailure("UI_PROJECTION").category, "ui_projection");
  assert.deepEqual(diagnoseElsGuidedFailure("CANONICAL_VERIFICATION"), {
    code: "CANONICAL_VERIFICATION", category: "UNRESOLVED", diagnosisRequired: true,
  });
  assert.equal(diagnoseElsGuidedFailure(null).diagnosisRequired, true);
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

test("automatic research targets prefer found original expressions in plan order without a meaning score", () => {
  const plan = prepareElsAutomaticResearchPlan({ ...base, expressions: "יום משיח בא\nקולומביה\nשבת" });
  const bySource = source => plan.candidates.find(row => row.derivations.some(item => item.source === source && item.ruleId === "original"));
  const found = (candidate, count = 1) => ({ ...candidate, state: "OK", count, projection: { occurrences: [{ occurrenceId: `${candidate.canonicalTerm}:1` }] } });
  const derived = plan.candidates.find(row => row.derivations.some(item => item.source === "יום משיח בא" && item.ruleId !== "original"));
  const targets = projectElsAutomaticResearchTargets(plan, [
    found(bySource("קולומביה"), 20), found(derived, 30), found(bySource("שבת"), 4), found(bySource("יום משיח בא"), 1),
    { ...plan.candidates[0], state: "EXECUTED_EMPTY", count: 0, projection: { occurrences: [] } },
  ]);
  assert.deepEqual(targets.map(row => row.derivations.find(item => item.ruleId === "original")?.source), ["יום משיח בא", "קולומביה", "שבת"]);
  assert.deepEqual(targets.map(row => row.researchRank), [1, 2, 3]);
  assert.ok(targets.every(row => row.primaryOccurrence && !Object.hasOwn(row, "meaningScore")));
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
