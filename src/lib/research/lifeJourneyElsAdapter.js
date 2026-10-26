import {
  buildElsAdvancedLoadItem,
  buildElsAdvancedSelection,
} from "./elsAdvancedPage.js";
import {
  prepareElsAutomaticResearchPlan,
  runElsAutomaticResearchSlice,
} from "./elsAutomaticResearchPlan.js";
import { verifyEls2029Selection } from "./els2029ReplayClient.js";
import { projectEls2029Result } from "./els2029Projection.js";
import { buildElsRazielSurfaceContext } from "./elsRazielContext.js";

export const LIFE_JOURNEY_ELS_ADAPTER_CONTRACT = "life_journey_els_adapter_v1";
export const LIFE_JOURNEY_ELS_HANDOFF_CONTRACT = "life_journey_els_verified_handoff_v1";
export const LIFE_JOURNEY_ELS_VERIFIED_RETURN_HREF = "/code?els_return=verified-v1";

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

/**
 * Builds the bounded cross-surface handoff only after canonical replay returned MATCH.
 * The exact term stays in authorized Research Context; it is never copied to the URL,
 * telemetry, a second ELS engine, or a separate Raziel memory.
 */
export function buildLifeJourneyElsVerifiedHandoff({
  verified,
  researchContext = null,
  layers = null,
  planSummary = null,
} = {}) {
  const canonicalMatch = verified?.ok === true
    && verified?.state === "MATCH"
    && verified?.result?.contract === "els_occurrence_replay_v1"
    && verified?.result?.status === "OK"
    && verified?.result?.verification_state === "MATCH";
  if (!canonicalMatch) return Object.freeze({
    contract: LIFE_JOURNEY_ELS_HANDOFF_CONTRACT,
    ok: false,
    state: "VERIFIED_OCCURRENCE_REQUIRED",
    href: null,
    elsSurfaceContext: null,
  });

  const projection = projectEls2029Result(verified.result);
  const elsSurfaceContext = buildElsRazielSurfaceContext({
    researchContext,
    projection,
    layers,
    planSummary,
    includeText: false,
  });
  const contextReady = elsSurfaceContext?.surface === "els"
    && Boolean(elsSurfaceContext?.occurrence?.occurrenceRef)
    && elsSurfaceContext?.result?.contract === "els_2029_projection_v1"
    && elsSurfaceContext?.result?.status === "OK"
    && elsSurfaceContext?.result?.presentationPolicy === "exact_replay_v1";
  if (!contextReady) return Object.freeze({
    contract: LIFE_JOURNEY_ELS_HANDOFF_CONTRACT,
    ok: false,
    state: "VERIFIED_CONTEXT_REQUIRED",
    href: null,
    elsSurfaceContext: null,
  });

  return Object.freeze({
    contract: LIFE_JOURNEY_ELS_HANDOFF_CONTRACT,
    ok: true,
    state: "MATCH",
    href: LIFE_JOURNEY_ELS_VERIFIED_RETURN_HREF,
    elsSurfaceContext,
    boundaries: Object.freeze({
      canonical_verified_occurrence_only: true,
      existing_els_surface_context_only: true,
      private_input_in_url: false,
      new_els_engine: false,
      new_raziel_memory: false,
    }),
  });
}
