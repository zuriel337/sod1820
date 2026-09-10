import { resolveResearchIdentities } from "./researchIdentityResolver.js";
import { buildResearchPlanV2 } from "./researchPlanV2.js";
import {
  CAPABILITY_STATUS,
  capabilityResult,
  composeResearchResultBundle,
} from "./researchResultBundle.js";

// W2.1 — Cross-capability Research Composer.
//
// The composer is deliberately dependency-injected. It does not own a capability registry and it
// never calls a specific engine by name. Canonical owners/adapters are supplied by the caller as
// executors. This keeps one Research OS while making new engines plug-compatible.
//
// Executor contract:
//   async ({ plan, identityResolution, capability, signal }) => ({
//     findings: UniversalFinding[], owner?, status?, reason?, sourceRefs?, versionRefs?, cost?, trace?
//   })
//
// Executors MUST enforce their own canonical access/domain gates and MUST return source-native
// results adapted to Universal Finding. The composer never substitutes AI/local arithmetic for a
// missing or failed deterministic owner.

function executorMap(executors) {
  if (executors instanceof Map) return executors;
  return new Map(Object.entries(executors && typeof executors === "object" ? executors : {}));
}

function failureReason(error) {
  if (!error) return "capability execution failed";
  return error?.message ? String(error.message) : String(error);
}

async function executeCapability({ capability, executor, plan, identityResolution, signal }) {
  if (typeof executor !== "function") {
    return capabilityResult({
      key: capability,
      status: CAPABILITY_STATUS.MISSING,
      reason: "no canonical capability executor supplied",
      findings: [],
    });
  }

  try {
    const out = await executor({ plan, identityResolution, capability, signal });
    const status = out?.status || CAPABILITY_STATUS.EXECUTED;
    return capabilityResult({
      key: capability,
      owner: out?.owner || null,
      status,
      findings: Array.isArray(out?.findings) ? out.findings : [],
      reason: out?.reason || null,
      sourceRefs: out?.sourceRefs || out?.source_refs || [],
      versionRefs: out?.versionRefs || out?.version_refs || [],
      cost: out?.cost ?? null,
      trace: out?.trace ?? null,
      requested: true,
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

/**
 * Execute the first generic W2 composition slice.
 *
 * Identity candidates are resolved before Research Plan construction. Then only the plan's
 * requested capabilities are invoked, in its declared check order first, followed by any remaining
 * requested capabilities. Results are composed into the single existing Universal Finding socket.
 */
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
    capabilityResults.push(await executeCapability({
      capability,
      executor: byCapability.get(capability),
      plan,
      identityResolution,
      signal,
    }));
  }

  const snapshot = resolvedRunSnapshot || {
    generated_at: new Date().toISOString(),
    context_type: contextType,
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
    // This is a run snapshot by value. It deliberately carries the authorization class/context
    // reference supplied to the run, never a mutable pointer to a future profile definition.
    authorization_context: authorizationContext,
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
    nextActions,
    synthesis: null,
  });
}

export default composeResearchW2;
