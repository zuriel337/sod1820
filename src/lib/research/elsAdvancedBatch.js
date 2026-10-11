import { buildElsAdvancedPageRequest, projectElsAdvancedPage } from "./elsAdvancedPage.js";
import { runElsAdaptiveScan } from "./els2029AdaptiveScanner.js";

export function prepareElsAdvancedBatch({ axis, related, scope, skipMin, skipMax, pageSize }) {
  const rawTerms = [axis, ...String(related || "").split(/[,;\n]+/)]
    .map(term => String(term || "").trim()).filter(Boolean);
  const terms = [...new Map(rawTerms.map(term => [term.replace(/\s+/g, ""), term])).values()];
  if (terms.length < 2 || terms.length > 4) return { error: "בחרו מונח ראשי ועוד מילה אחת עד שלוש מילים להשוואה." };
  for (const term of terms) {
    const built = buildElsAdvancedPageRequest({ term, scope, skipMin, skipMax, pageSize });
    if (built.error) return { error: `״${term}״: ${built.error}` };
  }
  return { terms, scope: scope === "tanakh" ? "tanakh" : "torah", skipMin: Number(skipMin), skipMax: Number(skipMax), pageSize: Number(pageSize) };
}

export async function runElsAdvancedBatch({ plan, invokePage, now = () => Date.now() }) {
  if (!plan?.terms?.length || typeof invokePage !== "function") return { error: "נדרש חיפוש תקין ומנוע זמין." };
  const projections = new Map();
  const scan = await runElsAdaptiveScan({
    candidates: plan.terms.map(term => ({ term, userRequested: true, preRegistered: true })),
    scope: plan.scope,
    stage: "SEED",
    selectionProtocol: "POST_HOC_EXPLORATORY",
    budget: {
      skipMin: plan.skipMin, skipMax: plan.skipMax, pageSize: plan.pageSize,
      maxCandidates: plan.terms.length, maxTrials: plan.terms.length,
      maxDepth: 0, maxWallMs: 15000, maxPagesPerCandidate: 1,
    },
    now,
    invokePage: async request => {
      const response = await invokePage(request);
      const page = projectElsAdvancedPage(response);
      if (page.error) throw new Error(page.error);
      projections.set(request.term, page.projection);
      return response?.data?.result ?? response?.result;
    },
  });
  return {
    scan,
    rows: scan.outcomes.map(outcome => ({
      term: outcome.term,
      state: outcome.state,
      count: outcome.hit_count,
      truncated: outcome.truncated,
      projection: projections.get(outcome.term) || null,
      error: outcome.pages?.find(page => page.error)?.error || null,
    })),
  };
}
