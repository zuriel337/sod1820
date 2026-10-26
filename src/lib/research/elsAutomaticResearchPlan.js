import { buildElsAdvancedPageRequest, elsSearchSpelling, projectElsAdvancedPage } from "./elsAdvancedPage.js";
import { runElsAdaptiveScan } from "./els2029AdaptiveScanner.js";

export const ELS_AUTOMATIC_PLAN_CONTRACT = "els_automatic_research_plan_v1";
export const ELS_RESEARCH_BRIEF_CONTRACT = "els_research_brief_v1";
export const ELS_CIPHER_DISCOVERY_PLAN_CONTRACT = "els_cipher_discovery_plan_v1";
export const ELS_GUIDED_PLAN_SUMMARY_CONTRACT = "els_guided_discovery_plan_summary_v1";
export const ELS_GUIDED_OCCURRENCE_COVERAGE_CONTRACT = "els_guided_occurrence_coverage_v1";
export const ELS_AUTOMATIC_SLICE_SIZE = 8;
export const ELS_GUIDED_OCCURRENCE_BATCH_SIZE = 4;
export const ELS_GUIDED_OCCURRENCE_MAX_BATCHES = 2;
const MAX_INPUT_LENGTH = 4000;
const MAX_EXPRESSIONS = 40;
const MAX_BRIEF_LENGTH = 6000;
const MAX_BRIEF_TARGETS = 24;
const MAX_BASIC_AXIS_LENGTH = 12;
const MAX_BRIEF_CONTEXTS = 18;
const MAX_DISCOVERY_TARGETS = 12;
const DEFAULT_DISCOVERY_SUPPORTS = 2;
const HEBREW_MARKS = /[\u0591-\u05C7]/g;
const BRIEF_STOP_WORDS = new Set(["אבל", "אשר", "את", "בין", "גם", "הוא", "היא", "היו", "היה", "הזה", "הזאת", "וכל", "זה", "זאת", "כי", "כל", "לא", "לו", "מה", "מי", "מן", "עם", "על", "של", "שם", "או", "אם", "אל", "בו", "בה", "הם", "הן", "יש", "עוד", "כמו", "כדי", "אחרי", "לפני", "מתוך", "בתוך"]);
const RULES = Object.freeze([
  ["original", "הביטוי שהוזן", "regular"],
  ["reverse_all", "היפוך כל הביטוי", "reverse_all"],
  ["reverse_words", "היפוך האותיות בכל מילה", "reverse_words"],
  ["reverse_last", "היפוך האותיות במילה האחרונה", "reverse_last"],
]);

const canonicalKey = value => String(value || "").replace(/[^א-ת]/g, "").replace(/[ךםןףץ]/g, letter => ({ ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" })[letter]);
const briefPhrase = value => String(value || "").normalize("NFKD").replace(HEBREW_MARKS, "").replace(/[^א-ת\s]/g, " ").trim().replace(/\s+/g, " ");
const briefWords = value => briefPhrase(value).split(" ").filter(Boolean);
const meaningfulBriefWord = word => canonicalKey(word).length >= 3 && !BRIEF_STOP_WORDS.has(word);

/**
 * A deterministic, local-only compiler from free context to bounded proposed terms.
 * It neither scans nor persists and it never promotes vocabulary into evidence.
 */
export function prepareElsResearchBrief({ text, anchorTerm = "", requiredTerms = "", scope = "torah" } = {}) {
  const input = String(text || "");
  if (input.length > MAX_BRIEF_LENGTH) return { error: "הסיפור ארוך מדי. חלקו אותו לשני הקשרים קצרים יותר." };
  const explicitAnchor = briefPhrase(anchorTerm);
  if (String(anchorTerm || "").length > 200) return { error: "הציר הראשי ארוך מדי. במצב הבסיסי בוחרים מילה או ביטוי קצר." };
  if (explicitAnchor && canonicalKey(explicitAnchor).length < 3) return { error: "במצב הבסיסי הציר הראשי צריך לכלול לפחות שלוש אותיות." };
  if (canonicalKey(explicitAnchor).length > MAX_BASIC_AXIS_LENGTH) return { error: "הציר הראשי ארוך מ־12 אותיות. חיפוש ביטוי ארוך ומדויק זמין בהגדרות המתקדמות." };
  const requiredInput = String(requiredTerms || "");
  if (requiredInput.length > 1000) return { error: "רשימת המונחים המחייבים ארוכה מדי." };
  if (!input.trim() && !explicitAnchor && !requiredInput.trim()) return { error: "כתבו סיפור קצר שממנו אפשר להציע ציר." };

  const anchorRows = new Map(), contextRows = new Map();
  const addAnchor = (term, kind, reason, priority, explicit = false) => {
    const label = briefPhrase(term), key = canonicalKey(label);
    if (key.length < 3 || key.length > MAX_BASIC_AXIS_LENGTH) return;
    const prior = anchorRows.get(key);
    const next = { id: `axis:${key}`, term: label, canonicalTerm: key, role: "axis", kind, reason, priority, explicit };
    if (!prior || explicit && !prior.explicit || priority > prior.priority) anchorRows.set(key, next);
  };
  const addContext = (term, kind, reason, priority, required = false) => {
    const label = briefPhrase(term), key = canonicalKey(label), words = briefWords(label);
    if (key.length < 2 || key.length > 24) return;
    const prior = contextRows.get(key);
    const next = { id: `context:${key}`, term: label, canonicalTerm: key, role: "context", kind, reason, priority, required,
      mode: words.length > 1 ? "exact_phrase" : "term", splitAllowed: words.length > 1 };
    if (!prior || required && !prior.required || priority > prior.priority) contextRows.set(key, next);
  };

  if (explicitAnchor) addAnchor(explicitAnchor, "explicit-axis", "הציר הראשי שנבחר במפורש", 1000, true);
  for (const term of [...new Set(requiredInput.split(/[,;\n]+/).map(briefPhrase).filter(Boolean))]) {
    addContext(term, "required", "מונח הקשר שסומן במפורש", 140, true);
  }
  for (const match of input.matchAll(/["״]([^"״\n]{3,80})["״]/g)) {
    addAnchor(match[1], "quote", "ביטוי קצר שצוטט במפורש", 130);
    addContext(match[1], "quote", "ביטוי שצוטט במפורש בתוך ההקשר", 115);
  }

  const sentenceTexts = input.normalize("NFKD").replace(HEBREW_MARKS, "").split(/[.!?։;:\n]+/).map(value => value.trim()).filter(Boolean);
  const tokenFrequency = new Map(), phraseFrequency = new Map();
  for (const sentence of sentenceTexts) {
    const words = briefWords(sentence);
    const content = words.filter(meaningfulBriefWord);
    for (const word of content) tokenFrequency.set(word, (tokenFrequency.get(word) || 0) + 1);
    for (let size = 2; size <= 3; size += 1) for (let index = 0; index + size <= words.length; index += 1) {
      const parts = words.slice(index, index + size), meaningful = parts.filter(meaningfulBriefWord);
      if (meaningful.length < 2 || canonicalKey(parts.join(" ")).length > 32) continue;
      const phrase = parts.join(" ");
      phraseFrequency.set(phrase, (phraseFrequency.get(phrase) || 0) + 1);
    }
  }
  for (const [phrase, count] of phraseFrequency) {
    const compactPairBonus = briefWords(phrase).length === 2 ? 6 : 0;
    addAnchor(phrase, count > 1 ? "repeated-phrase" : "local-phrase", count > 1 ? `ביטוי קצר שחוזר ${count} פעמים בהקשר` : "צירוף קצר מתוך ההקשר", 44 + Math.min(22, count * 10) + compactPairBonus);
    addContext(phrase, count > 1 ? "repeated-phrase" : "local-phrase", count > 1 ? `ביטוי שחוזר ${count} פעמים בהקשר` : "צירוף מקומי מתוך ההקשר", 58 + Math.min(24, count * 12) + compactPairBonus);
  }
  for (const [word, count] of tokenFrequency) {
    const length = canonicalKey(word).length;
    if (length < 4 && count < 2) continue;
    addAnchor(word, count > 1 ? "repeated-term" : "context-term", count > 1 ? `מונח שחוזר ${count} פעמים` : "מילה קצרה ומובחנת מתוך ההקשר", 48 + Math.min(25, count * 8) + Math.min(18, length * 2));
    addContext(word, count > 1 ? "repeated-term" : "context-term", count > 1 ? `מונח שחוזר ${count} פעמים` : "מונח מתוך ההקשר", 50 + Math.min(25, count * 8) + Math.min(12, length));
  }

  const anchorCandidates = [...anchorRows.values()].sort((a, b) => Number(b.explicit) - Number(a.explicit) || b.priority - a.priority || b.canonicalTerm.length - a.canonicalTerm.length || a.term.localeCompare(b.term, "he")).slice(0, 6)
    .map((row, index) => Object.freeze({ ...row, rank: index + 1, selected: index === 0 }));
  if (!anchorCandidates.length) return { error: "לא זוהה ציר ראשי קצר. נסו לציין שם או מילה עברית מובחנת." };
  const recommendedAnchorId = anchorCandidates[0].id;
  const recommendedAnchorKey = anchorCandidates[0].canonicalTerm;
  const contextCandidates = [...contextRows.values()].filter(row => row.canonicalTerm !== recommendedAnchorKey)
    .sort((a, b) => Number(b.required) - Number(a.required) || b.priority - a.priority || b.canonicalTerm.length - a.canonicalTerm.length || a.term.localeCompare(b.term, "he"))
    .slice(0, MAX_BRIEF_CONTEXTS).map((row, index) => Object.freeze({ ...row, rank: index + 1, selected: row.required || index < 6 }));
  return Object.freeze({
    contract: ELS_RESEARCH_BRIEF_CONTRACT,
    status: "READY",
    mode: "anchor-context",
    scope: scope === "tanakh" ? "tanakh" : "torah",
    anchorCandidates: Object.freeze(anchorCandidates),
    recommendedAnchorId,
    contextCandidates: Object.freeze(contextCandidates),
    candidates: Object.freeze([...new Map([...anchorCandidates, ...contextCandidates].map(row => [row.canonicalTerm, row])).values()].slice(0, MAX_BRIEF_TARGETS)),
    inputLength: input.length,
    storyIsContextOnly: true,
    persisted: false,
    aiUsed: false,
    truthPromotion: false,
  });
}

export function prepareElsCipherDiscoveryPlan({ text, anchorTerm = "", requiredTerms = "", scope = "torah" } = {}) {
  const brief = prepareElsResearchBrief({ text, anchorTerm, requiredTerms, scope });
  if (brief.error) return brief;
  const selectedAxis = brief.anchorCandidates.find(candidate => candidate.id === brief.recommendedAnchorId);
  const axisKey = selectedAxis?.canonicalTerm || "";
  const orderedTargets = [...brief.contextCandidates]
    .filter(candidate => candidate.required || (candidate.canonicalTerm !== axisKey && !candidate.canonicalTerm.includes(axisKey) && !axisKey.includes(candidate.canonicalTerm)))
    .sort((a, b) => Number(b.required) - Number(a.required) || Number(a.mode !== "term") - Number(b.mode !== "term") || b.priority - a.priority || a.term.localeCompare(b.term, "he"))
    .slice(0, MAX_DISCOVERY_TARGETS)
    .map((candidate, index) => Object.freeze({ ...candidate, selected: candidate.required || index < 6, supportPriority: index + 1 }));
  return Object.freeze({
    ...brief,
    contract: ELS_CIPHER_DISCOVERY_PLAN_CONTRACT,
    mode: "story-first-pair",
    contextCandidates: Object.freeze(orderedTargets),
    candidates: Object.freeze([...(selectedAxis ? [selectedAxis] : []), ...orderedTargets]),
    goal: Object.freeze({ primaryAxes: 1, connectedSupports: DEFAULT_DISCOVERY_SUPPORTS, sourceSequence: "WHEN_AVAILABLE", resultPolicy: "ONE_BEST_STRUCTURE" }),
    limits: Object.freeze({ targetTerms: MAX_DISCOVERY_TARGETS, fullAxisOccurrences: ELS_GUIDED_OCCURRENCE_BATCH_SIZE, maximumOccurrenceBatches: ELS_GUIDED_OCCURRENCE_MAX_BATCHES }),
    raziel: Object.freeze({ role: "VERIFIED_OCCURRENCE_CONSUMER", connected: false, maySuggestVocabulary: false, maySearchOrVerify: false, mayPromoteTruth: false, maxCallsBeforeSearch: 0 }),
    aiUsed: false,
    persisted: false,
    truthPromotion: false,
  });
}

/** Bounded proposed terms for the existing Raziel seam; never the raw story. */
export function summarizeElsGuidedDiscoveryPlan(plan, selectedAnchorId = null) {
  if (plan?.contract !== ELS_CIPHER_DISCOVERY_PLAN_CONTRACT) return null;
  const anchor = plan.anchorCandidates.find(candidate => candidate.id === selectedAnchorId)
    || plan.anchorCandidates.find(candidate => candidate.id === plan.recommendedAnchorId) || null;
  if (!anchor) return null;
  return Object.freeze({
    contract: ELS_GUIDED_PLAN_SUMMARY_CONTRACT,
    status: "PROPOSED_SEARCH_PLAN",
    scope: plan.scope,
    anchorTerm: anchor.term,
    targetTerms: Object.freeze(plan.contextCandidates.filter(candidate => candidate.selected).map(candidate => candidate.term).filter(Boolean).slice(0, 8)),
    occurrenceBatchSize: plan.limits.fullAxisOccurrences,
    maximumOccurrenceBatches: plan.limits.maximumOccurrenceBatches,
    modelCallsTriggered: 0,
    rawStoryIncluded: false,
    evidencePromotion: false,
  });
}

const MATRIX_DISCOVERY_CONTRACT = "els_matrix_discovery_v1";
const GUIDED_FAILURE_CATEGORIES = Object.freeze({
  VOCABULARY: "vocabulary",
  VOCABULARY_MISS: "vocabulary",
  LEXICON: "vocabulary",
  RECOGNITION: "recognition_normalization",
  NORMALIZATION: "recognition_normalization",
  RECOGNITION_NORMALIZATION: "recognition_normalization",
  GEOMETRY: "geometry",
  NO_STRONG_GEOMETRY: "geometry",
  RANKING: "ranking",
  NO_RANKED_PAIR: "ranking",
  MATRIX_BOUNDS: "matrix_bounds",
  UI: "ui_projection",
  UI_PROJECTION: "ui_projection",
  CANONICAL_VERIFICATION: "recognition_normalization",
});
const occurrenceIdentity = row => {
  const value = row?.hitId ?? row?.key ?? row?.occurrenceId;
  return value == null ? "" : String(value);
};
const finiteNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const finiteRank = value => Number.isFinite(Number(value)) ? Number(value) : Number.MAX_SAFE_INTEGER;

/** Maps only an explicit engine failure to the research taxonomy. */
export function diagnoseElsGuidedFailure(failureCause) {
  const code = String(failureCause || "").trim().toUpperCase();
  const category = GUIDED_FAILURE_CATEGORIES[code] || "UNRESOLVED";
  return Object.freeze({ code: code || null, category, diagnosisRequired: category === "UNRESOLVED" });
}

const projectOccurrence = (row, inputOrder, triage) => Object.freeze({
  hitId: occurrenceIdentity(row),
  index: Number.isSafeInteger(Number(row?.index)) ? Number(row.index) : null,
  ordinal: Number.isSafeInteger(Number(row?.ordinal)) ? Number(row.ordinal) : inputOrder + 1,
  skip: Number.isFinite(Number(row?.skip)) ? Number(row.skip) : null,
  direction: row?.direction ?? row?.dir ?? null,
  start: Number.isSafeInteger(Number(row?.start)) ? Number(row.start) : null,
  ref: String(row?.ref || ""),
  resultSetId: String(row?.resultSetId || row?.setId || ""),
  inputOrder,
  triage: triage ? Object.freeze({
    rank: finiteRank(triage.rank),
    globalRank: finiteRank(triage.globalRank),
    inspectionPriority: finiteNumber(triage.inspectionPriority),
    compactEvidence: triage.compactEvidence === true,
  }) : null,
});
const compareOccurrencesForInspection = (first, second) =>
  Number(second.triage?.compactEvidence === true) - Number(first.triage?.compactEvidence === true)
  || finiteNumber(second.triage?.inspectionPriority) - finiteNumber(first.triage?.inspectionPriority)
  || finiteRank(first.triage?.rank) - finiteRank(second.triage?.rank)
  || finiteRank(first.triage?.globalRank) - finiteRank(second.triage?.globalRank)
  || first.ordinal - second.ordinal || first.inputOrder - second.inputOrder;
const projectVerifiedSupport = support => Object.freeze({
  term: String(support?.term || ""), label: String(support?.label || support?.term || ""),
  readingLabel: support?.readingLabel ? String(support.readingLabel) : null,
  readingRelation: support?.readingRelation ? String(support.readingRelation) : null,
  status: String(support?.status || ""), skip: Number.isFinite(Number(support?.skip)) ? Number(support.skip) : null,
  direction: support?.direction ?? null, occurrenceCount: Math.max(0, finiteNumber(support?.occurrenceCount)),
  matrixStage: String(support?.matrixStage || ""), distance: Math.max(0, finiteNumber(support?.distance)),
  source: String(support?.source || ""), ref: String(support?.ref || ""), book: String(support?.book || ""),
});
const projectInspection = (inspection, occurrence, inputOrder) => {
  const bundle = inspection.discoveryBundle || (inspection?.ok === false ? {
    status: "LENS_FAILED", failureCause: "UI_PROJECTION", selected: null,
  } : null);
  const selected = bundle?.selected;
  const supports = (Array.isArray(selected?.supports) ? selected.supports : []).map(projectVerifiedSupport);
  const verifiedFindings = (Array.isArray(bundle?.verifiedFindings) ? bundle.verifiedFindings : []).map(projectVerifiedSupport)
    .filter(support => support.status === "VERIFIED").slice(0, 4);
  const pairVerified = bundle?.status === "VERIFIED_PAIR" && supports.length === DEFAULT_DISCOVERY_SUPPORTS
    && supports.every(support => support.status === "VERIFIED") && selected?.independentSupport !== false;
  const relation = Object.freeze({
    code: String(selected?.relation?.code || ""), label: String(selected?.relation?.label || ""),
    priority: finiteNumber(selected?.relation?.priority), stage: String(selected?.relation?.stage || ""),
  });
  const strongGeometry = pairVerified && relation.stage === "A" && relation.priority >= 400;
  return Object.freeze({
    hitId: occurrence.hitId, occurrence, status: String(bundle?.status || ""), pairVerified, strongGeometry, relation,
    storyMatches: Math.max(0, finiteNumber(selected?.storyMatches)),
    recurrence: supports.reduce((sum, support) => sum + support.occurrenceCount, 0),
    sourceCount: new Set(supports.map(support => `${support.book}:${support.ref}`).filter(value => value !== ":")).size,
    supports: Object.freeze(supports),
    verifiedFindings: Object.freeze(verifiedFindings),
    rawPatterns: Object.freeze((Array.isArray(inspection?.rawPatterns) ? inspection.rawPatterns : []).map(pattern => Object.freeze({
      term: String(pattern?.term || ""), occurrenceCount: Math.max(0, finiteNumber(pattern?.occurrenceCount)),
      matrixStage: String(pattern?.matrixStage || ""), status: String(pattern?.status || "UNVERIFIED_PATTERN"),
    })).filter(pattern => pattern.term).slice(0, 24)),
    reasons: Object.freeze((Array.isArray(selected?.reasons) ? selected.reasons : []).map(String).slice(0, 8)),
    failure: pairVerified || verifiedFindings.length ? null : diagnoseElsGuidedFailure(bundle?.failureCause), inputOrder,
  });
};
const compareInspections = (first, second) => Number(second.pairVerified) - Number(first.pairVerified)
  || Number(second.strongGeometry) - Number(first.strongGeometry) || second.storyMatches - first.storyMatches
  || second.relation.priority - first.relation.priority || second.recurrence - first.recurrence
  || second.sourceCount - first.sourceCount
  || finiteNumber(second.occurrence.triage?.inspectionPriority) - finiteNumber(first.occurrence.triage?.inspectionPriority)
  || first.occurrence.ordinal - second.occurrence.ordinal || first.inputOrder - second.inputOrder;

/**
 * Breadth-before-depth projection over canonical reports. It schedules exact occurrence identities;
 * it does not search, verify, persist, mutate findings or call AI. Numeric skip patterns never rank.
 */
export function projectElsGuidedOccurrenceCoverage({
  plan, occurrences = [], triageItems = [], inspections = [], approvedBatches = 1, resultSetId = "",
} = {}) {
  if (plan?.contract !== ELS_CIPHER_DISCOVERY_PLAN_CONTRACT || !Array.isArray(occurrences)
    || !Array.isArray(triageItems) || !Array.isArray(inspections)) {
    return Object.freeze({ error: "תוכנית הגילוי או תוצאות המנוע אינן תקינות." });
  }
  const approved = Math.max(1, Math.min(ELS_GUIDED_OCCURRENCE_MAX_BATCHES, Math.trunc(Number(approvedBatches)) || 1));
  const triageById = new Map();
  for (const item of triageItems) {
    const hitId = occurrenceIdentity(item), prior = triageById.get(hitId);
    if (hitId && (!prior || finiteNumber(item.inspectionPriority) > finiteNumber(prior.inspectionPriority)
      || finiteNumber(item.inspectionPriority) === finiteNumber(prior.inspectionPriority) && finiteRank(item.rank) < finiteRank(prior.rank))) triageById.set(hitId, item);
  }
  const seenOccurrences = new Set(), uniqueOccurrences = [];
  for (const [inputOrder, occurrence] of occurrences.entries()) {
    const hitId = occurrenceIdentity(occurrence);
    if (!hitId || seenOccurrences.has(hitId)) continue;
    seenOccurrences.add(hitId);uniqueOccurrences.push(projectOccurrence(occurrence, inputOrder, triageById.get(hitId)));
  }
  uniqueOccurrences.sort(compareOccurrencesForInspection);
  const schedule = Object.freeze(uniqueOccurrences.slice(0, approved * ELS_GUIDED_OCCURRENCE_BATCH_SIZE));
  const scheduledById = new Map(schedule.map(occurrence => [occurrence.hitId, occurrence]));
  const expectedResultSetId = String(resultSetId || ""), acceptedById = new Map(), rejectedInspections = [];
  for (const [inputOrder, inspection] of inspections.entries()) {
    const targetHitId = inspection?.target?.hitId == null ? "" : String(inspection.target.hitId);
    const occurrence = scheduledById.get(targetHitId);
    const targetSetId = String(inspection?.target?.resultSetId || inspection?.target?.setId || "");
    let reason = null;
    if (!targetHitId) reason = "MISSING_EXACT_OCCURRENCE_ID";
    else if (!seenOccurrences.has(targetHitId)) reason = "UNKNOWN_OCCURRENCE";
    else if (!occurrence) reason = "OUTSIDE_APPROVED_BATCH";
    else if (expectedResultSetId && targetSetId && targetSetId !== expectedResultSetId) reason = "STALE_RESULT_SET";
    else if (inspection?.lens !== "matrix-discovery"
      || inspection?.ok === true && (inspection?.contract !== MATRIX_DISCOVERY_CONTRACT
        || inspection?.discoveryBundle?.contract !== ELS_CIPHER_DISCOVERY_PLAN_CONTRACT)
      || inspection?.ok !== true && inspection?.ok !== false) reason = "INVALID_CANONICAL_REPORT";
    else if (acceptedById.has(targetHitId)) reason = "DUPLICATE_REPORT";
    if (reason) { rejectedInspections.push(Object.freeze({ hitId: targetHitId || null, reason }));continue; }
    acceptedById.set(targetHitId, projectInspection(inspection, occurrence, inputOrder));
  }
  const rankedInspections = [...acceptedById.values()].sort(compareInspections);
  const recommendation = rankedInspections.find(inspection => inspection.pairVerified && inspection.strongGeometry) || null;
  const alternatives = Object.freeze(rankedInspections.filter(inspection => inspection !== recommendation && inspection.pairVerified).slice(0, 2));
  const nextOccurrence = schedule.find(occurrence => !acceptedById.has(occurrence.hitId)) || null;
  const remainingUnscheduledCount = Math.max(0, uniqueOccurrences.length - schedule.length);
  let status, stopReason;
  if (nextOccurrence) { status = "INSPECTING";stopReason = "NEXT_APPROVED_OCCURRENCE"; }
  else if (recommendation) { status = "RECOMMENDED";stopReason = "STRONG_VERIFIED_PAIR"; }
  else if (remainingUnscheduledCount > 0 && approved < ELS_GUIDED_OCCURRENCE_MAX_BATCHES) { status = "AWAITING_CONTINUATION";stopReason = "APPROVED_BATCH_EXHAUSTED"; }
  else { status = "BOUNDED_EMPTY";stopReason = remainingUnscheduledCount > 0 ? "OCCURRENCE_LIMIT_REACHED" : "NO_STRONG_VERIFIED_PAIR"; }
  return Object.freeze({
    contract: ELS_GUIDED_OCCURRENCE_COVERAGE_CONTRACT, sourceContract: plan.contract, status, stopReason,
    schedule, nextOccurrence, recommendation, alternatives, inspections: Object.freeze(rankedInspections),
    rejectedInspections: Object.freeze(rejectedInspections),
    coverage: Object.freeze({
      batchSize: ELS_GUIDED_OCCURRENCE_BATCH_SIZE, maximumBatches: ELS_GUIDED_OCCURRENCE_MAX_BATCHES,
      approvedBatches: approved, totalOccurrences: uniqueOccurrences.length, scheduledCount: schedule.length,
      inspectedCount: acceptedById.size, uninspectedScheduledCount: schedule.length - acceptedById.size,
      remainingUnscheduledCount, complete: schedule.length === uniqueOccurrences.length && acceptedById.size === schedule.length,
      uninspectedAreNotNegativeEvidence: true,
    }),
    selectionLaw: Object.freeze({
      order: Object.freeze(["canonical-verification", "strong-geometry", "story-relevance", "recurrence-and-source", "triage-evidence", "stable-ordinal"]),
      numericSkipPromoted: false,
    }),
    aiUsed: false, findingMutation: false, persisted: false, truthPromotion: false,
  });
}

/** A read-only plan. FORMS rows must come from the already mounted canonical engine. */
export function prepareElsAutomaticResearchPlan({ expressions, scope = "torah", skipMin = "2", skipMax = "", pageSize = "20", canonicalForms = [] } = {}) {
  const input = String(expressions || "");
  if (input.length > MAX_INPUT_LENGTH) return { error: "רשימת הביטויים ארוכה מדי. חלקו אותה למספר תוכניות מחקר." };
  const sources = [...new Set(input.split(/[,;\n]+/).map(value => value.trim().replace(/\s+/g, " ")).filter(Boolean))];
  if (!sources.length) return { error: "הזינו לפחות ביטוי או מילה אחת." };
  if (sources.length > MAX_EXPRESSIONS) return { error: "אפשר להכין עד 40 ביטויים בתוכנית אחת. המשיכו בתוכנית נוספת." };
  const firstRequest = buildElsAdvancedPageRequest({ term: sources[0], scope, skipMin, skipMax, pageSize });
  if (firstRequest.error) return { error: firstRequest.error };

  const byTerm = new Map();
  const formsSources = new Set();
  const add = (source, term, ruleId, ruleLabel) => {
    const key = canonicalKey(term);
    if (key.length < 2) return;
    const derivation = { source, ruleId, ruleLabel };
    const row = byTerm.get(key);
    if (row) {
      if (!row.derivations.some(item => item.source === source && item.ruleId === ruleId)) row.derivations.push(derivation);
    } else byTerm.set(key, { term, canonicalTerm: key, derivations: [derivation] });
  };

  for (const source of sources) {
    if (canonicalKey(source).length < 2) return { error: `״${source}״: הזינו מונח עברי של שתי אותיות לפחות.` };
    const checked = buildElsAdvancedPageRequest({ term: source, scope, skipMin, skipMax, pageSize });
    if (checked.error) return { error: `״${source}״: ${checked.error}` };
  }
  // Broad first pass: each submitted expression gets its original searched before deeper forms.
  for (const [id, label, mode] of RULES) for (const source of sources) add(source, elsSearchSpelling(source, mode), id, label);
  // The native FORMS generator owns Split/Join. Only its returned rows may enter this plan;
  // generating its eight-form rules here would create a second transformation authority.
  for (const row of Array.isArray(canonicalForms) ? canonicalForms : []) {
    const source = String(row?.source || "").trim().replace(/\s+/g, " ");
    if (!sources.includes(source) || !/^[א-ת\s]+$/.test(String(row?.term || ""))) continue;
    add(source, String(row.term), "canonical_forms_splitjoin", String(row.derivation || "פיצול/איחוד במנוע הקנוני").slice(0, 100));
    formsSources.add(source);
  }
  const candidates = [...byTerm.values()].map(row => Object.freeze({ ...row, derivations: Object.freeze(row.derivations) }));
  return Object.freeze({
    contract: ELS_AUTOMATIC_PLAN_CONTRACT,
    status: "READY",
    scope: firstRequest.request.scope,
    skipMin: firstRequest.request.skip_min,
    skipMax: firstRequest.request.skip_max,
    pageSize: firstRequest.request.page_size,
    sources: Object.freeze(sources),
    candidates: Object.freeze(candidates),
    canonicalFormsIncluded: formsSources.size > 0,
    canonicalFormsPending: sources.some(source => source.split(/\s+/).length > 1 && !formsSources.has(source)),
    sliceSize: ELS_AUTOMATIC_SLICE_SIZE,
    truthPromotion: false,
  });
}

/** One bounded slice over the existing scanner and canonical page bridge. Offset is replayable. */
export async function runElsAutomaticResearchSlice({ plan, offset = 0, invokePage, onProgress, now = () => Date.now() } = {}) {
  if (plan?.contract !== ELS_AUTOMATIC_PLAN_CONTRACT || !Number.isSafeInteger(offset) || offset < 0 || offset > plan.candidates.length || typeof invokePage !== "function")
    return { error: "תוכנית המחקר או נקודת ההמשך אינן תקינות." };
  const candidates = plan.candidates.slice(offset, offset + ELS_AUTOMATIC_SLICE_SIZE);
  if (!candidates.length) return Object.freeze({ contract: "els_automatic_research_slice_v1", offset, nextOffset: offset, hasMoreCandidates: false, scan: null, rows: Object.freeze([]) });
  const projections = new Map();
  const candidateByTerm = new Map(candidates.map(candidate => [candidate.term, candidate]));
  const scan = await runElsAdaptiveScan({
    candidates: candidates.map(row => ({ term: row.term, userRequested: true, preRegistered: true })),
    scope: plan.scope, stage: "SEED", selectionProtocol: "POST_HOC_EXPLORATORY", now,
    budget: {
      skipMin: plan.skipMin, skipMax: plan.skipMax, pageSize: plan.pageSize,
      maxCandidates: candidates.length, maxTrials: candidates.length, maxDepth: 0,
      maxWallMs: 15_000, maxPagesPerCandidate: 1,
    },
    invokePage: async request => {
      onProgress?.({ phase: "searching", term: request.term });
      try {
        const response = await invokePage(request);
        const page = projectElsAdvancedPage(response);
        if (page.error) throw new Error(page.error);
        projections.set(request.term, page);
        const count = page.projection.occurrences.length;
        onProgress?.({ phase: "done", term: request.term, row: {
          ...candidateByTerm.get(request.term), state: count ? "OK" : "EXECUTED_EMPTY", count,
          partial: page.cursor != null, error: null, projection: page.projection, cursor: page.cursor,
        } });
        return response?.data?.result ?? response?.result;
      } catch (error) {
        onProgress?.({ phase: "done", term: request.term, row: {
          ...candidateByTerm.get(request.term), state: "FAILED", count: 0, partial: true,
          error: String(error?.message || error), projection: null, cursor: null,
        } });
        throw error;
      }
    },
  });
  const outcomes = new Map(scan.outcomes.map(row => [row.term, row]));
  const completedCount = candidates.findIndex(candidate => {
    const outcome = outcomes.get(candidate.term);
    return !outcome || outcome.state === "BUDGET_STOPPED";
  });
  const nextOffset = offset + (completedCount < 0 ? candidates.length : completedCount);
  return Object.freeze({
    contract: "els_automatic_research_slice_v1",
    offset, nextOffset,
    hasMoreCandidates: nextOffset < plan.candidates.length,
    scan,
    rows: Object.freeze(candidates.map(candidate => {
      const outcome = outcomes.get(candidate.term);
      const page = projections.get(candidate.term);
      return Object.freeze({
        ...candidate,
        state: outcome?.state || "NOT_SCANNED",
        count: outcome?.hit_count || 0,
        partial: outcome?.partial === true || outcome?.truncated === true || outcome?.state === "FAILED",
        error: outcome?.pages?.find(item => item.error)?.error || null,
        projection: page?.projection || null,
        cursor: page?.cursor || null,
      });
    })),
  });
}

/** Safe summary for the existing Raziel/context route; no private raw input or occurrence claim. */
export function summarizeElsAutomaticPlan(plan, slices = [], extraPages = {}) {
  if (plan?.contract !== ELS_AUTOMATIC_PLAN_CONTRACT) return null;
  const rows = [...new Map(slices.flatMap(slice => slice?.rows || []).map(row => [row.canonicalTerm, row])).values()];
  const pending = row => {
    if (row.state === "BUDGET_STOPPED" || row.state === "NOT_SCANNED") return true;
    if (Object.hasOwn(extraPages, row.canonicalTerm)) return extraPages[row.canonicalTerm]?.cursor != null;
    return row.partial;
  };
  return Object.freeze({
    contract: "els_automatic_plan_summary_v1",
    sourceCount: plan.sources.length,
    variantCount: plan.candidates.length,
    scannedCount: rows.filter(row => row.state !== "NOT_SCANNED" && row.state !== "BUDGET_STOPPED").length,
    failedCount: rows.filter(row => row.state === "FAILED").length,
    partialCount: rows.filter(pending).length,
    hasPending: rows.length < plan.candidates.length || rows.some(pending),
    scope: plan.scope,
    canonicalFormsPending: plan.canonicalFormsPending,
    evidencePromotion: false,
  });
}
