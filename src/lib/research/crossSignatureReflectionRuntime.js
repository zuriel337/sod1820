import { composeResearchW2 } from "./researchComposerW2.js";
import {
  RESEARCH_IDENTITY_CONFIDENCE,
  RESEARCH_IDENTITY_SOURCE,
} from "./researchIdentityResolver.js";
import { RESEARCH_CAPABILITY } from "./researchPlanV2.js";
import {
  buildNormalizedMessageContext,
  composeNormalizedMessageReflection,
} from "./normalizedMessageReflection.js";
import { toRazielMessageReflectionPayload } from "./normalizedMessageReflectionProjection.js";
import {
  buildCrossSignatureBoundedFacts,
  buildCrossSignatureSynthesisStructure,
  composeCrossSignatureEvidenceBackedSynthesisDraft,
} from "./crossSignatureSynthesis.js";

export const CROSS_SIGNATURE_REFLECTION_RUNTIME_VERSION = "cross-signature-reflection-runtime-v1";

export const CROSS_SIGNATURE_REFLECTION_FAILURE_REASON = Object.freeze({
  INVALID_NUMBER: "invalid_number",
  ZERO_FINDINGS: "zero_findings",
  AI_UNAVAILABLE: "ai_unavailable",
});

const clean = (value) => {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
};

function parseNumber(value) {
  if (typeof value === "number") return Number.isSafeInteger(value) && value >= 0 ? value : null;
  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value.trim());
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function failedClosed(reason) {
  return Object.freeze({
    version: CROSS_SIGNATURE_REFLECTION_RUNTIME_VERSION,
    status: "failed_closed",
    reason,
    payload: null,
    cross_signature: null,
  });
}

export async function composeCrossSignatureBundle({
  number,
  crossSignatureExecutor,
} = {}) {
  if (typeof crossSignatureExecutor !== "function") {
    throw new TypeError("crossSignatureReflectionRuntime: crossSignatureExecutor function is required");
  }
  const value = parseNumber(number);
  if (value == null) return null;

  return composeResearchW2({
    question: `חתימת שיטות ${value}`,
    intent: RESEARCH_CAPABILITY.CROSS_SIGNATURE,
    identityCandidates: [{
      type: "number",
      value,
      label: String(value),
      source: RESEARCH_IDENTITY_SOURCE.NUMERIC_LITERAL,
      confidence: RESEARCH_IDENTITY_CONFIDENCE.EXACT,
    }],
    requestedCapabilities: [RESEARCH_CAPABILITY.CROSS_SIGNATURE],
    capabilityAllowlist: [RESEARCH_CAPABILITY.CROSS_SIGNATURE],
    executors: {
      [RESEARCH_CAPABILITY.CROSS_SIGNATURE]: crossSignatureExecutor,
    },
    synthesizer: null,
  });
}

/**
 * Cross Signature -> Result Bundle -> normalization -> AI message -> evidence-backed explicit freeze
 * -> exact three-card reflection.
 *
 * Every capability is injected. This runtime owns no engine, provider, DB table, score or UI.
 * The AI authors message prose only; atomic claims are built deterministically from the normalized
 * Cross Signature and must point to real Bundle Finding IDs.
 */
export async function runCrossSignatureReflectionRuntime({
  number,
  crossSignatureExecutor,
  aiAnalysisProvider,
  tarotProvider,
  now = () => new Date().toISOString(),
} = {}) {
  if (typeof crossSignatureExecutor !== "function") {
    throw new TypeError("crossSignatureReflectionRuntime: crossSignatureExecutor function is required");
  }
  if (typeof aiAnalysisProvider !== "function") {
    throw new TypeError("crossSignatureReflectionRuntime: aiAnalysisProvider function is required");
  }
  if (typeof tarotProvider !== "function") {
    throw new TypeError("crossSignatureReflectionRuntime: tarotProvider function is required");
  }

  const value = parseNumber(number);
  if (value == null) return failedClosed(CROSS_SIGNATURE_REFLECTION_FAILURE_REASON.INVALID_NUMBER);

  // 1) Result Bundle first, with only the existing Cross Signature capability allowed.
  const bundle = await composeCrossSignatureBundle({
    number: value,
    crossSignatureExecutor,
  });
  const findings = Array.isArray(bundle?.findings)
    ? bundle.findings.filter((finding) => finding?.kind === "cross-signature")
    : [];
  if (!findings.length) return failedClosed(CROSS_SIGNATURE_REFLECTION_FAILURE_REASON.ZERO_FINDINGS);

  // 2) Normalize dependency-aware Cross Signature BEFORE any message prose exists.
  const normalized = buildNormalizedMessageContext([], { bundle });
  const signatures = Array.isArray(normalized?.cross_signatures) ? normalized.cross_signatures : [];
  if (!signatures.length) return failedClosed(CROSS_SIGNATURE_REFLECTION_FAILURE_REASON.ZERO_FINDINGS);

  // 3) Atomic structural claims/motifs are built BEFORE prose. AI can never author or reshape them.
  const structure = buildCrossSignatureSynthesisStructure(normalized);
  if (!structure.claims.length) return failedClosed(CROSS_SIGNATURE_REFLECTION_FAILURE_REASON.ZERO_FINDINGS);

  // 4) AI sees bounded normalized facts + the already-built structural claims. It is not asked to calculate or promote truth.
  const facts = buildCrossSignatureBoundedFacts(normalized, { structuralClaims: structure.claims });
  const aiMessage = clean(await aiAnalysisProvider({
    kind: "cross_signature",
    subject: String(value),
    facts,
    operation: "cross_signature_message",
  }));
  if (!aiMessage) return failedClosed(CROSS_SIGNATURE_REFLECTION_FAILURE_REASON.AI_UNAVAILABLE);

  const frozenAt = now();
  const synthesizer = async ({ normalized: normalizedAtSynthesis }) =>
    composeCrossSignatureEvidenceBackedSynthesisDraft({
      normalized: normalizedAtSynthesis,
      structure,
      aiMessage,
      frozenAt,
    });

  // 5) Existing shared seam enforces explicit freeze BEFORE tarotProvider is ever called.
  const result = await composeNormalizedMessageReflection({
    trackLists: [],
    bundle,
    synthesizer,
    tarotProvider,
    frozenAt,
  });
  const payload = toRazielMessageReflectionPayload(result);

  return Object.freeze({
    version: CROSS_SIGNATURE_REFLECTION_RUNTIME_VERSION,
    status: "ok",
    reason: null,
    payload,
    cross_signature: signatures[0],
    bundle_contract_version: bundle?.contract_version ?? null,
  });
}

export default runCrossSignatureReflectionRuntime;
