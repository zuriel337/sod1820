import {
  ELS_RAZIEL_PLANNING_ACTION,
  normalizeElsRazielPlanningAction,
  normalizeElsRazielSearchPlan,
} from "./elsRazielPlanning.js";
import { prepareElsCipherDiscoveryPlan } from "./elsAutomaticResearchPlan.js";

export function prepareElsGuidedPlanFromRaziel({ story, scope = "torah", response } = {}) {
  const action = normalizeElsRazielPlanningAction({
    id: ELS_RAZIEL_PLANNING_ACTION,
    surface: "els",
    story,
    scope,
  });
  if (!action) return { error: "בקשת החיפוש אינה תקינה. נסו לנסח אותה מחדש." };
  const searchPlan = normalizeElsRazielSearchPlan(
    response?.elsSearchPlan ?? response?.els_search_plan ?? response,
    action,
  );
  if (!searchPlan) return { error: "רזיאל לא החזיר תוכנית חיפוש בטוחה. שום חיפוש לא הופעל." };
  const axes = searchPlan.axes.map((axis) => axis.term);
  const requiredTerms = [
    ...(["crossed_pair", "crossed_three"].includes(searchPlan.mode) ? [] : axes.slice(1)),
    ...searchPlan.context_terms,
  ];
  const base = prepareElsCipherDiscoveryPlan({
    text: "",
    anchorTerm: axes[0],
    requiredTerms: requiredTerms.join("\n"),
    scope: searchPlan.scope,
    minimumAnchorLetters: 2,
  });
  if (base.error) return base;
  const primary = base.anchorCandidates[0];
  const anchorCandidates = Object.freeze(primary ? [Object.freeze({
    ...primary,
    kind: searchPlan.axes[0].source,
    reason: searchPlan.rationale,
    explicit: true,
    selected: true,
  })] : []);
  if (!anchorCandidates.length) return { error: "רזיאל הציע ציר שהמנוע אינו יכול לקבל." };
  const contextCandidates = Object.freeze(base.contextCandidates.map((candidate) => Object.freeze({
    ...candidate,
    kind: "raziel-proposal",
    reason: "מונח הקשר שהוצע בתוכנית רזיאל — טרם אומת",
    required: true,
    selected: true,
  })));
  const strategy = base.strategy ? Object.freeze({
    ...base.strategy,
    modelCallsBeforeSearch: 1,
    modelCallsTriggered: 1,
  }) : null;
  return Object.freeze({
    ...base,
    mode: "raziel-guided-plan",
    searchMode: searchPlan.mode,
    axes: Object.freeze(axes),
    lockedPhrases: searchPlan.locked_phrases,
    anchorCandidates,
    recommendedAnchorId: anchorCandidates[0].id,
    contextCandidates,
    candidates: Object.freeze([...anchorCandidates, ...contextCandidates]),
    strategy,
    plannerContract: searchPlan.contract,
    plannerConfidence: searchPlan.confidence,
    plannerRationale: searchPlan.rationale,
    planningModelCalls: 1,
    aiUsed: true,
    persisted: false,
    truthPromotion: false,
    raziel: Object.freeze({
      role: "SEARCH_PLAN_PROPOSER_ONLY",
      connected: true,
      maySuggestVocabulary: true,
      maySearchOrVerify: false,
      mayComputePositionsOrSkips: false,
      mayPromoteTruth: false,
      maxCallsBeforeSearch: 1,
    }),
  });
}
