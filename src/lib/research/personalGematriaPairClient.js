import { supabase } from "../supabase.js";
import { newInteractionId } from "./interactionCorrelation.js";
import {
  PERSONAL_GEMATRIA_PAIR_RESEARCH_RUN_CONTRACT,
  normalizePersonalGematriaPairResearchRunRequest,
} from "./researchRunRequest.js";

const CONTRACT = PERSONAL_GEMATRIA_PAIR_RESEARCH_RUN_CONTRACT;

function requestError(error) {
  const message = String(error?.message || error || "");
  if (/must not be empty|exactly two/i.test(message)) return "expression_required";
  if (/distinct after canonical normalization/i.test(message)) return "expressions_must_differ";
  if (/requires Hebrew text/i.test(message)) return "hebrew_required";
  if (/control characters/i.test(message)) return "control_characters_not_allowed";
  if (/character limit|byte limit/i.test(message)) return "expression_too_long";
  return "invalid_request";
}

async function edgeErrorBody(error) {
  try {
    return await error?.context?.clone?.().json();
  } catch {
    return null;
  }
}

function classifyBundle(bundle) {
  const findings = Array.isArray(bundle?.findings) ? bundle.findings : [];
  const failed = Number(bundle?.coverage?.failed || 0);
  const negative = Number(bundle?.coverage?.negative_result || bundle?.coverage?.negative || 0);
  if (failed > 0) return findings.length ? "partial" : "failed";
  if (findings.length > 0) return bundle?.coverage?.partial === true ? "partial" : "positive";
  if (negative > 0) return "negative";
  return "failed";
}

function pairCost(bundle) {
  const capability = Array.isArray(bundle?.capability_trace)
    ? bundle.capability_trace.find((item) => item?.key === "gematria_relations")
    : null;
  return capability?.cost && typeof capability.cost === "object" ? capability.cost : null;
}

/**
 * One explicit, authenticated personal-pair action.
 *
 * The client owns no auth, persistence, retry, calculation or AI behavior. Supabase's singleton
 * attaches the current session JWT; research-run remains the authorization and trace boundary.
 */
export async function runPersonalGematriaPair({
  left,
  right,
  invoke = (name, options) => supabase.functions.invoke(name, options),
  createInteractionId = newInteractionId,
} = {}) {
  let expressions;
  try {
    const normalized = normalizePersonalGematriaPairResearchRunRequest({
      expressions: [left, right],
      surface: "raziel",
    });
    expressions = normalized.intake.representations.map((item) => item.content);
  } catch (error) {
    return { ok: false, outcome: "error", error: requestError(error), networkCalls: 0 };
  }

  const interactionId = createInteractionId();
  if (!interactionId) {
    return { ok: false, outcome: "error", error: "interaction_unavailable", networkCalls: 0 };
  }

  let response;
  try {
    response = await invoke("research-run", {
      body: {
        contract: CONTRACT,
        expressions,
        interaction_id: interactionId,
        surface: "raziel",
      },
    });
  } catch {
    return { ok: false, outcome: "error", error: "transport_failed", networkCalls: 1 };
  }

  const { data, error } = response || {};
  if (error) {
    const detail = await edgeErrorBody(error);
    return {
      ok: false,
      outcome: "error",
      error: detail?.error || "transport_failed",
      detail: detail?.detail || null,
      networkCalls: 1,
    };
  }
  if (data?.status !== "ok" || data?.contract !== CONTRACT || !data?.bundle) {
    return {
      ok: false,
      outcome: "error",
      error: data?.error || "invalid_response",
      traceId: data?.trace_id || null,
      networkCalls: 1,
    };
  }

  const outcome = classifyBundle(data.bundle);
  return {
    ok: outcome === "positive" || outcome === "negative" || outcome === "partial",
    outcome,
    bundle: data.bundle,
    contract: CONTRACT,
    traceId: data.trace_id || null,
    interactionId,
    cost: pairCost(data.bundle),
    networkCalls: 1,
    previewFixture: data.preview_fixture === true,
  };
}

export { CONTRACT as PERSONAL_GEMATRIA_PAIR_CLIENT_CONTRACT };

export default runPersonalGematriaPair;
