import {
  buildElsAdvancedLoadItem,
  buildElsAdvancedSelection,
} from "./elsAdvancedPage.js";
import {
  prepareElsAutomaticResearchPlan,
  runElsAutomaticResearchSlice,
} from "./elsAutomaticResearchPlan.js";
import { verifyEls2029Selection } from "./els2029ReplayClient.js";

export const LIFE_JOURNEY_ELS_ADAPTER_CONTRACT = "life_journey_els_adapter_v1";

export function prepareLifeJourneyElsPlan(expression) {
  return prepareElsAutomaticResearchPlan({
    expressions: String(expression || "").trim(),
    scope: "torah",
    skipMin: "2",
    skipMax: "80",
    pageSize: "20",
  });
}

export function runLifeJourneyElsPlanSlice(plan, invokePage, onProgress) {
  return runElsAutomaticResearchSlice({ plan, offset: 0, invokePage, onProgress });
}

function exactLoadItem(selection, verified) {
  return buildElsAdvancedLoadItem(selection, {
    corpusId: verified?.result?.corpus_id || null,
  });
}

export async function verifyLifeJourneyElsOccurrence({ occurrence, projection, scope, invoke }) {
  const selection = buildElsAdvancedSelection(occurrence, projection, scope);
  if (!selection) return { ok: false, state: "CONTEXT_REQUIRED", selection: null, verified: null, loadItem: null };
  const verified = await verifyEls2029Selection(selection, invoke);
  const loadItem = verified.ok ? exactLoadItem(selection, verified) : null;
  return Object.freeze({
    contract: LIFE_JOURNEY_ELS_ADAPTER_CONTRACT,
    ok: verified.ok && Boolean(loadItem),
    state: verified.ok && !loadItem ? "UNSUPPORTED_CONTRACT" : verified.state,
    selection,
    verified,
    loadItem,
  });
}

export async function replayLifeJourneyElsSelection(selection, invoke) {
  const verified = await verifyEls2029Selection(selection, invoke);
  const loadItem = verified.ok ? exactLoadItem(selection, verified) : null;
  return Object.freeze({
    contract: LIFE_JOURNEY_ELS_ADAPTER_CONTRACT,
    ok: verified.ok && Boolean(loadItem),
    state: verified.ok && !loadItem ? "UNSUPPORTED_CONTRACT" : verified.state,
    selection,
    verified,
    loadItem,
  });
}
