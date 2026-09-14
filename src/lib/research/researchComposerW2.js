import { resolveResearchIdentities } from "./researchIdentityResolver.js";
import { buildResearchPlanV2 } from "./researchPlanV2.js";
import {
  CAPABILITY_STATUS,
  capabilityResult,
  composeResearchResultBundle,
} from "./researchResultBundle.js";

// W2.1 — Cross-capability Research Composer.
// Canonical owners/adapters are dependency-injected; this layer owns no engine truth or registry.

function executorMap(executors) {
  if (executors instanceof Map) return executors;
  return new Map(Object.entries(executors && typeof executors === "object" ? executors : {}));
}

function failureReason(error) {
  if (!error) return "capability execution failed";
  return error?.message ? String(error.message) : String(error);
}

async function executeCapability({ capability, executor, plan, identityResolution, signal, authorizationContext }) {
  if (typeof executor !== "function") {
    return capabilityResult({
      key: capability,
      status: CAPABILITY_STATUS.MISSING_ADAPTER,
      reason: "no canonical capability executor supplied",
      findings: [],
    });
  }

  try {
    // Raw authorization context remains private execution input. The output-safe Research Plan carries
    // only the access descriptor and non-identifying selection_protocol classification.
    const out = await executor({
      plan,
      identityResolution,
      capability,
      signal,
      authorizationContext,
      access: plan?.access || null,
      selectionProtocol: plan?.selection_protocol || null,
    });
    const status = out?.status || CAPABILITY_STATUS.EXECUTED;
    return capabilityResult({
      key: capability,
      owner: out?.owner || null,
      status,
      findings: Array.isArray(out?.findings) ? out.findings : [],
      findingOutcomes: out?.findingOutcomes || out?.finding_outcomes || [],
      reason: out?.reason || null,
      negativeScope: out?.negativeScope ?? out?.negative_scope ?? null,
      sourceRefs: out?.sourceRefs || out?.source_refs || [],
      versionRefs: out?.versionRefs || out?.version_refs || [],
      operatorRef: out?.operatorRef || out?.operator_ref || null,
      researchEvaluation: out?.researchEvaluation || out?.research_evaluation || null,
      cost: out?.cost ?? null,
      trace: out?.trace ?? null,
      requested: true,
      accessClass: out?.accessClass || out?.access_class || undefined,
      semanticClass: out?.semanticClass || out?.semantic_class || null,
      bounded: out?.bounded ?? null,
    });
  } catch (error) {
    return capabilityResult({
      key: capability,
      status: CAPABILITY_STATUS.FAILED,
      reason: failureReason(error),
      findings: [],
      trace: { error_class: error?.name || "Error" },
    });
  }
}

export async function composeResearchW2({
  question = "",
  intent = "research",
  identityCandidates = [],
  rawInput = null,
  explicitTextComputation = false,
  authorizationContext = null,
  contextType = "public_user",
  surfaceContext = null,
  requestedCapabilities = [],
  requestedDepth = null,
  selectionProtocol = null,
  executors = {},
  ranking = [],
  resolvedRunSnapshot = null,
  nextActions = [],
  signal = null,
} = {}) {
  const identityResolution = resolveResearchIdentities({
    candidates: identityCandidates,
    rawInput: rawInput ?? question,
    explicitTextComputation,
  });

  const plan = buildResearchPlanV2({
    question,
    intent,
    identityResolution,
    authorizationContext,
    contextType,
    surfaceContext,
    requestedCapabilities,
    requestedDepth,
    selectionProtocol,
  });

  const requested = [...new Set([
    ...(plan.check_order || []),
    ...(plan.requested_capabilities || []),
  ])];
  const byCapability = executorMap(executors);
  const capabilityResults = [];
  const executorNextActions = [];

  for (const capability of requested) {
    if (signal?.aborted) {
      capabilityResults.push(capabilityResult({
        key: capability,
        status: CAPABILITY_STATUS.SKIPPED,
        reason: "composition aborted",
        findings: [],
      }));
      continue;
    }
    const executed = await executeCapability({
      capability,
      executor: byCapability.get(capability),
      plan,
      identityResolution,
      signal,
      authorizationContext,
    });
    capabilityResults.push(executed);
    if (executed.bounded?.truncated && executed.bounded?.continuation) {
      executorNextActions.push({
        action: "continue_bounded_capability",
        capability,
        reason: `bounded window returned ${executed.bounded.returned_count} of ${executed.bounded.total_count}`,
        continuation: executed.bounded.continuation,
      });
    }
  }

  const snapshot = resolvedRunSnapshot || {
    generated_at: new Date().toISOString(),
    context_type: contextType,
    access: plan.access,
    selection_protocol: plan.selection_protocol,
    resolved_identities: identityResolution.identities.map(x => ({
      key: x.key,
      type: x.type,
      id: x.id,
      ref: x.ref,
      identity_key: x.identity_key,
      source: x.source,
      confidence: x.confidence,
      access: x.access ? { tier: x.access.tier ?? null } : null,
    })),
    requested_capabilities: requested,
    requested_depth: requestedDepth,
  };

  return composeResearchResultBundle({
    query: {
      raw_input: rawInput ?? question,
      question,
      intent,
      identities: identityResolution.identities,
    },
    plan,
    capabilities: capabilityResults,
    ranking,
    resolvedRunSnapshot: snapshot,
    nextActions: [...(Array.isArray(nextActions) ? nextActions : []), ...executorNextActions],
    synthesis: null,
    accessDescriptor: plan.access,
  });
}

export default composeResearchW2;
