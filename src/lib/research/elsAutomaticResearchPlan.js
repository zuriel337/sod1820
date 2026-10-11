import { buildElsAdvancedPageRequest, elsSearchSpelling, projectElsAdvancedPage } from "./elsAdvancedPage.js";
import { runElsAdaptiveScan } from "./els2029AdaptiveScanner.js";

export const ELS_AUTOMATIC_PLAN_CONTRACT = "els_automatic_research_plan_v1";
export const ELS_AUTOMATIC_SLICE_SIZE = 8;
const MAX_INPUT_LENGTH = 4000;
const MAX_EXPRESSIONS = 40;
const RULES = Object.freeze([
  ["original", "הביטוי שהוזן", "regular"],
  ["reverse_all", "היפוך כל הביטוי", "reverse_all"],
  ["reverse_words", "היפוך האותיות בכל מילה", "reverse_words"],
  ["reverse_last", "היפוך האותיות במילה האחרונה", "reverse_last"],
]);

const canonicalKey = value => String(value || "").replace(/[^א-ת]/g, "").replace(/[ךםןףץ]/g, letter => ({ ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" })[letter]);

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
