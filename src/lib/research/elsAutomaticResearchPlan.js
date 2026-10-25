import { buildElsAdvancedPageRequest, elsSearchSpelling, projectElsAdvancedPage } from "./elsAdvancedPage.js";
import { runElsAdaptiveScan } from "./els2029AdaptiveScanner.js";

export const ELS_AUTOMATIC_PLAN_CONTRACT = "els_automatic_research_plan_v1";
export const ELS_RESEARCH_BRIEF_CONTRACT = "els_research_brief_v1";
export const ELS_AUTOMATIC_SLICE_SIZE = 8;
const MAX_INPUT_LENGTH = 4000;
const MAX_EXPRESSIONS = 40;
const MAX_BRIEF_LENGTH = 6000;
const MAX_BRIEF_TARGETS = 24;
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
 * Deterministic, local-only compiler from free research context to editable ELS targets.
 * It proposes vocabulary; it never scans, persists, calls AI or promotes evidence.
 */
export function prepareElsResearchBrief({ text, requiredTerms = "", scope = "torah" } = {}) {
  const input = String(text || "");
  if (input.length > MAX_BRIEF_LENGTH) return { error: "הסיפור ארוך מדי. חלקו אותו לשני הקשרים קצרים יותר." };
  const requiredInput = String(requiredTerms || "");
  if (requiredInput.length > 1000) return { error: "רשימת המונחים המחייבים ארוכה מדי." };
  if (!input.trim() && !requiredInput.trim()) return { error: "כתבו סיפור, הדביקו קטע או הוסיפו מונחים שחייבים לבדוק." };

  const rows = new Map();
  const add = (term, kind, reason, priority, required = false) => {
    const label = briefPhrase(term), key = canonicalKey(label);
    if (key.length < 3 || key.length > 40) return;
    const prior = rows.get(key);
    const next = { id: key, term: label, canonicalTerm: key, kind, reason, priority, required };
    if (!prior || required && !prior.required || priority > prior.priority) rows.set(key, next);
  };

  const requiredRows = [...new Set(requiredInput.split(/[,;\n]+/).map(briefPhrase).filter(Boolean))];
  for (const term of requiredRows) {
    add(term, "required", "מונח שסומן במפורש", 140, true);
    const words = briefWords(term).filter(meaningfulBriefWord);
    for (const word of words) add(word, "required-part", "חלק ממונח שסומן במפורש", 125, true);
    if (words.length >= 2 && words.length <= 4) add([...words].reverse().join(" "), "reverse-order", "סדר המילים ההפוך של מונח מפורש", 120, true);
  }

  for (const match of input.matchAll(/["״]([^"״\n]{3,80})["״]/g)) add(match[1], "quote", "ביטוי שצוטט במפורש", 115);
  const sentenceTexts = input.normalize("NFKD").replace(HEBREW_MARKS, "").split(/[.!?։;:\n]+/).map(value => value.trim()).filter(Boolean);
  const tokenFrequency = new Map(), phraseFrequency = new Map();
  for (const sentence of sentenceTexts) {
    const words = briefWords(sentence);
    const content = words.filter(meaningfulBriefWord);
    for (const word of content) tokenFrequency.set(word, (tokenFrequency.get(word) || 0) + 1);
    if (content.length >= 2 && content.length <= 5) add(content.join(" "), "sentence", "משפט קצר מתוך ההקשר", 82 + content.length);
    for (let size = 2; size <= 3; size += 1) for (let index = 0; index + size <= words.length; index += 1) {
      const parts = words.slice(index, index + size), meaningful = parts.filter(meaningfulBriefWord);
      if (meaningful.length < 2 || canonicalKey(parts.join(" ")).length > 32) continue;
      const phrase = parts.join(" ");
      phraseFrequency.set(phrase, (phraseFrequency.get(phrase) || 0) + 1);
    }
  }
  for (const [phrase, count] of phraseFrequency) {
    const compactPairBonus = briefWords(phrase).length === 2 ? 6 : 0;
    add(phrase, count > 1 ? "repeated-phrase" : "local-phrase",
      count > 1 ? `ביטוי שחוזר ${count} פעמים בהקשר` : "צירוף מקומי מתוך ההקשר", 58 + Math.min(24, count * 12) + compactPairBonus);
  }
  for (const [word, count] of tokenFrequency) {
    const length = canonicalKey(word).length;
    if (length < 4 && count < 2) continue;
    add(word, count > 1 ? "repeated-term" : "context-term", count > 1 ? `מונח שחוזר ${count} פעמים` : "מונח מרכזי מתוך ההקשר",
      50 + Math.min(25, count * 8) + Math.min(12, length));
  }
  for (const word of briefWords(input)) if (/^(?:ה)?(?:תש|תר)[א-ת]{1,4}$/.test(word)) add(word, "hebrew-year", "תבנית אפשרית של שנה עברית", 92);

  const references = [...new Set(input.match(/\b(?:\d{1,2}[./-]){1,2}\d{2,4}\b|\b(?:19|20)\d{2}\b/g) || [])].slice(0, 12);
  const candidates = [...rows.values()].sort((a, b) => Number(b.required) - Number(a.required) || b.priority - a.priority || b.canonicalTerm.length - a.canonicalTerm.length || a.term.localeCompare(b.term, "he")).slice(0, MAX_BRIEF_TARGETS)
    .map((row, index) => Object.freeze({ ...row, rank: index + 1, selected: true }));
  if (!candidates.length) return { error: "לא זוהו עדיין מונחים עבריים שאפשר להפוך לתוכנית. הוסיפו מונח מחייב אחד לפחות." };
  return Object.freeze({
    contract: ELS_RESEARCH_BRIEF_CONTRACT,
    status: "READY",
    scope: scope === "tanakh" ? "tanakh" : "torah",
    candidates: Object.freeze(candidates),
    references: Object.freeze(references),
    inputLength: input.length,
    persisted: false,
    aiUsed: false,
    truthPromotion: false,
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
