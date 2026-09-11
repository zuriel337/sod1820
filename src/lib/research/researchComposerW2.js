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
    // W2.2b: the RAW authorization context travels to the executor on this private channel only.
    // It is deliberately absent from `plan` (which is returned to the caller inside the Bundle);
    // `plan.access` carries the output-safe descriptor instead.
    const out = await executor({ plan, identityResolution, capability, signal, authorizationContext, access: plan?.access || null });
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
    // Continuation is first-class: a bounded capability tells the caller exactly how to ask for the
    // rest of the source population instead of leaving a window to look source-exhaustive.
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
    // Output-safe BY-VALUE access descriptor — never the raw authorization context, which used to be
    // copied verbatim into this snapshot and therefore straight into the returned Bundle.
    access: plan.access,
    resolved_identities: identityResolution.identities.map(x => ({
      key: x.key,
      type: x.type,
      id: x.id,
      ref: x.ref,
      identity_key: x.identity_key,
      source: x.source,
      confidence: x.confidence,
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
