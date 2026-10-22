import { makeUniversalFinding } from "./universalFinding.js";
import { ACCESS_CLASS, CAPABILITY_STATUS, SEMANTIC_CLASS } from "./researchResultBundle.js";
import { expandResearchTextRepresentations } from "./researchRepresentations.js";

// Canonical W2 adapter over the same fn_method_profile used by the 2029 calculator. It is an
// adapter, not a calculator or registry: values, method identity and versions all come from the
// existing canonical RPC. One expression is intentionally bounded to a finite method window.

export const GEMATRIA_METHOD_PROFILE_ADAPTER_VERSION = "fn-method-profile-w2-v1";
export const GEMATRIA_METHOD_PROFILE_MAX_METHODS = 32;

const clean = (value) => value == null ? "" : String(value).trim();
const finiteNumber = (value) => {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

// Edge-safe allowlist projection of the RPC row. Keep this adapter independent of browser data
// clients; it mirrors fields only and never owns calculation, ordering or method definitions.
function methodProfileRow(row) {
  return {
    methodKey: clean(row?.method_key),
    displayLabel: clean(row?.display_label || row?.method_key) || "שיטה",
    category: clean(row?.category) || null,
    mathematicalFamily: clean(row?.mathematical_family) || null,
    atomicOrComposite: clean(row?.atomic_or_composite) || null,
    computedValue: finiteNumber(row?.computed_value),
    definitionVersion: finiteNumber(row?.definition_version),
  };
}

function profileFinding(expression, row, createdAt) {
  const method = methodProfileRow(row);
  if (!method.methodKey || !Number.isFinite(method.computedValue)) return null;
  const value = Number(method.computedValue);
  return makeUniversalFinding({
    kind: "gematria-method-value",
    subject: { type: "phrase", key: expression, label: expression, value, lang: "he" },
    source: {
      engine: "gematria",
      adapter: GEMATRIA_METHOD_PROFILE_ADAPTER_VERSION,
      sourceRef: null,
      method: method.methodKey,
      corpus: null,
      lang: "he",
    },
    identity: {
      sourceIdentity: { methodKey: method.methodKey, expression, value },
      occurrence: null,
      entityRef: null,
      relationRef: null,
    },
    verification: {
      claimed_expression: null,
      claimed_method: null,
      claimed_value: null,
      engine_method_tested: method.methodKey,
      engine_result: value,
      verification_state: "not_tested",
    },
    evidence: {
      refs: [],
      facts: [{
        type: "gematria-method-profile-value",
        method: method.methodKey,
        label: method.displayLabel,
        value,
        category: method.category,
        mathematical_family: method.mathematicalFamily,
        atomic_or_composite: method.atomicOrComposite,
        method_version: method.definitionVersion,
      }],
      score: null,
      confidence: null,
    },
    access: { tier: "public", reason: "ephemeral caller-scoped canonical method profile" },
    provenance: {
      createdBy: "ENGINE:fn_method_profile",
      createdAt,
      inputRef: null,
    },
    projection: {
      anchors: [],
      relations: [],
      dimensions: { numeric: { methodKey: method.methodKey, value } },
    },
    view: { rendererHints: { role: "method-result" } },
  });
}

export function createGematriaMethodProfileW2Executor({
  supabase,
  maxMethods = GEMATRIA_METHOD_PROFILE_MAX_METHODS,
} = {}) {
  if (typeof supabase?.rpc !== "function") throw new Error("canonical Supabase RPC client required");
  const limit = Math.max(1, Math.min(Number(maxMethods) || GEMATRIA_METHOD_PROFILE_MAX_METHODS, GEMATRIA_METHOD_PROFILE_MAX_METHODS));

  return async ({ identityResolution }) => {
    const representations = expandResearchTextRepresentations(identityResolution, { maxRepresentations: 1 });
    const representation = representations[0];
    if (!representation?.text) {
      return {
        owner: "research_strategy_layer_law",
        status: CAPABILITY_STATUS.SKIPPED,
        reason: "no eligible expression resolved for canonical method-profile execution",
        findings: [],
        accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
        semanticClass: SEMANTIC_CLASS.EVIDENCE,
        versionRefs: [GEMATRIA_METHOD_PROFILE_ADAPTER_VERSION],
        cost: { certainty: "not_billable", ai_calls: 0, rpc_calls: 0, retry_count: 0 },
      };
    }

    try {
      const response = await supabase.rpc("fn_method_profile", {
        p_phrase: representation.text,
        p_depth: "value",
      });
      if (response?.error) throw response.error;
      const rawRows = Array.isArray(response?.data ?? response) ? (response?.data ?? response) : [];
      const createdAt = new Date().toISOString();
      const findings = rawRows.slice(0, limit)
        .map((row) => profileFinding(clean(representation.text), row, createdAt))
        .filter(Boolean);
      const status = findings.length ? CAPABILITY_STATUS.EXECUTED : CAPABILITY_STATUS.NEGATIVE_RESULT;
      return {
        owner: "research_strategy_layer_law",
        status,
        reason: findings.length ? null : "fn_method_profile returned no reportable method values",
        findings,
        accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
        semanticClass: SEMANTIC_CLASS.EVIDENCE,
        sourceRefs: [],
        versionRefs: [GEMATRIA_METHOD_PROFILE_ADAPTER_VERSION, "fn_method_profile:canonical", "canonical_methods_registry_law:v6"],
        cost: { certainty: "not_billable", ai_calls: 0, rpc_calls: 1, retry_count: 0 },
        bounded: {
          total_count: rawRows.length,
          returned_count: findings.length,
          truncated: rawRows.length > limit,
          ordering: "fn_method_profile_registry_order",
          continuation: null,
        },
        trace: {
          representation_count: 1,
          method_count: findings.length,
          profile_source: "fn_method_profile",
          registry_source: "public.gematria_methods",
        },
      };
    } catch (error) {
      return {
        owner: "research_strategy_layer_law",
        status: CAPABILITY_STATUS.FAILED,
        reason: error instanceof Error ? error.message : String(error),
        findings: [],
        accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
        semanticClass: SEMANTIC_CLASS.EVIDENCE,
        versionRefs: [GEMATRIA_METHOD_PROFILE_ADAPTER_VERSION],
        cost: { certainty: "not_billable", ai_calls: 0, rpc_calls: 1, retry_count: 0 },
      };
    }
  };
}

export default createGematriaMethodProfileW2Executor;
