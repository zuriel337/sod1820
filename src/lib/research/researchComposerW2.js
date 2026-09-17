import { resolveResearchIdentities } from "./researchIdentityResolver.js";
import { buildResearchPlanV2 } from "./researchPlanV2.js";
import {
  ensureResearchIntakeTransport,
  projectResearchIntakeLineage,
  questionForIntakeOutput,
  rawInputForIntakeOutput,
  researchIntakeAccessDecision,
} from "./researchIntakeTransport.js";
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

async function executeCapability({
  capability,
  executor,
  plan,
  identityResolution,
  intakeTransport,
  signal,
  authorizationContext,
}) {
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
    // G3 Intake: the RAW intake transport follows the same discipline. It may contain personal
    // source/extraction/representation content and is deliberately absent from the returned Bundle.
    // Only projectResearchIntakeLineage() is allowed to cross the composition boundary.
    const out = await executor({
      plan,
      identityResolution,
      intake: intakeTransport,
      capability,
      signal,
      authorizationContext,
      access: plan?.access || null,
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
  intake = null,
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
  // G3 Universal Intake is an ephemeral carrier only. It does not replace legacy callers that pass
  // rawInput/identityCandidates directly, and it does not own persistence or semantic identities.
  const intakeTransport = ensureResearchIntakeTransport(intake);
  const effectiveRawInput = intakeTransport?.raw_input?.value ?? rawInput ?? question;
  const effectiveIdentityCandidates = [
    ...(Array.isArray(intakeTransport?.identity_candidates) ? intakeTransport.identity_candidates : []),
    ...(Array.isArray(identityCandidates) ? identityCandidates : []),
  ];

  const identityResolution = resolveResearchIdentities({
    candidates: effectiveIdentityCandidates,
    rawInput: effectiveRawInput,
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

  // Authorization/privacy is checked BEFORE any capability receives a private Source/Representation.
  // Unknown/unclassified intake fails closed. The transport does not grant access; it only consumes
  // the already-resolved canonical access descriptor produced by Research Plan.
  const intakeAccess = researchIntakeAccessDecision(intakeTransport, plan.access);
  const safeIntakeLineage = projectResearchIntakeLineage(intakeTransport, plan.access);
  const safeRawInput = intakeTransport
    ? rawInputForIntakeOutput(intakeTransport, plan.access)
    : (rawInput ?? question);
  const safeQuestion = intakeTransport
    ? questionForIntakeOutput(question, intakeTransport, plan.access)
    : question;
  const outputPlan = intakeTransport ? {
    ...plan,
    question: safeQuestion,
    intake_access: {
      allowed_for_execution: intakeAccess.allowed,
      reasons: intakeAccess.reasons,
    },
  } : plan;

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
    if (intakeTransport && !intakeAccess.allowed) {
      capabilityResults.push(capabilityResult({
        key: capability,
        status: CAPABILITY_STATUS.SKIPPED,
        reason: "intake access denied before capability execution",
        findings: [],
        trace: {
          intake_access_denied: true,
          reasons: intakeAccess.reasons,
        },
      }));
      continue;
    }
    const executed = await executeCapability({
      capability,
      executor: byCapability.get(capability),
      plan,
      identityResolution,
      intakeTransport,
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
      // Carried so the composition boundary redacts this reduced shape on exactly the same facts it
      // uses for query.identities/plan.identities — otherwise the same identity could be redacted
      // for two different stated reasons in one Bundle.
      access: x.access ? { tier: x.access.tier ?? null } : null,
    })),
    requested_capabilities: requested,
    requested_depth: requestedDepth,
    intake_lineage: safeIntakeLineage,
  };

  return composeResearchResultBundle({
    query: {
      raw_input: safeRawInput,
      raw_input_redacted: Boolean(intakeTransport?.raw_input && safeRawInput == null),
      question: safeQuestion,
      intent,
      identities: identityResolution.identities,
      intake_lineage: safeIntakeLineage,
    },
    plan: outputPlan,
    capabilities: capabilityResults,
    ranking,
    resolvedRunSnapshot: snapshot,
    nextActions: [...(Array.isArray(nextActions) ? nextActions : []), ...executorNextActions],
    synthesis: null,
    accessDescriptor: plan.access,
  });
}

export default composeResearchW2;
