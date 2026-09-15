// Provider/model selection seam for SOD1820.
// Semantics are owned by raziel_routing_law v2 + ai_analyze_contract v2.
// This module does NOT decide domain truth, capability ownership, entitlements, or Human-Gate transitions.
// It consumes an already-resolved Research/Action Plan and a caller-supplied set of eligible candidates.

export const INTELLIGENCE_LEVELS = Object.freeze({
  L0_DETERMINISTIC: 0,
  L1_MICRO: 1,
  L2_FAST: 2,
  L3_DEEP: 3,
  L4_TOOL_RESEARCH: 4,
  L5_SPECIALIST: 5,
});

export const PROVIDER_LABELS = Object.freeze({
  anthropic: "Claude / Anthropic",
  google: "Gemini / Google",
  openai: "GPT / OpenAI",
  unknown: "Unknown provider",
});

export function providerForModel(model = "") {
  const m = String(model || "").toLowerCase();
  if (m.startsWith("claude-")) return "anthropic";
  if (m.startsWith("gemini-")) return "google";
  if (m.startsWith("gpt-")) return "openai";
  return "unknown";
}

function levelValue(level) {
  if (typeof level === "number") return level;
  return INTELLIGENCE_LEVELS[level] ?? -1;
}

function normalizedCost(candidate) {
  if (candidate.freeQuota === true) return 0;
  return Number.isFinite(candidate.estimatedCostUsd) ? candidate.estimatedCostUsd : Number.POSITIVE_INFINITY;
}

function candidateIsEligible(candidate, requiredLevel) {
  if (!candidate || candidate.available !== true || candidate.eligible === false) return false;
  if (candidate.capabilityFit === false) return false;
  return levelValue(candidate.maxIntelligence) >= requiredLevel;
}

// Cheapest-sufficient selection.
// The caller owns capability resolution, access, quality requirements, current quota/balance and cost estimates.
// Unknown cost is allowed only as a fallback after every known-cost sufficient candidate.
export function chooseProviderRoute({
  intelligence = "L2_FAST",
  candidates = [],
  needsChallenge = false,
  preferredProvider = null,
} = {}) {
  const requiredLevel = levelValue(intelligence);
  if (requiredLevel < 0) {
    return { state: "INVALID_INTELLIGENCE_LEVEL", primary: null, challenger: null, fallbacks: [] };
  }

  const eligible = candidates
    .filter((c) => candidateIsEligible(c, requiredLevel))
    .map((c) => ({ ...c, provider: c.provider || providerForModel(c.model), _cost: normalizedCost(c) }))
    .sort((a, b) => {
      const costDelta = a._cost - b._cost;
      if (Number.isFinite(costDelta) && costDelta !== 0) return costDelta;
      if (a._cost !== b._cost) return a._cost < b._cost ? -1 : 1;
      if (preferredProvider) {
        if (a.provider === preferredProvider && b.provider !== preferredProvider) return -1;
        if (b.provider === preferredProvider && a.provider !== preferredProvider) return 1;
      }
      return (a.preferenceRank ?? 100) - (b.preferenceRank ?? 100);
    });

  if (!eligible.length) {
    return { state: "NO_ELIGIBLE_PROVIDER", primary: null, challenger: null, fallbacks: [] };
  }

  const [primary, ...rest] = eligible;
  const challenger = needsChallenge
    ? rest.find((c) => c.provider !== primary.provider && c.challengeEligible !== false) || null
    : null;

  return {
    state: "ROUTED",
    primary: stripInternal(primary),
    challenger: challenger ? stripInternal(challenger) : null,
    fallbacks: rest.map(stripInternal),
    rationale: {
      policy: "MINIMUM_SUFFICIENT_INTELLIGENCE_THEN_LOWEST_KNOWN_COST",
      required_intelligence: intelligence,
      challenge_requested: needsChallenge,
      unknown_cost_is_last_resort: true,
    },
  };
}

function stripInternal(candidate) {
  const { _cost, ...rest } = candidate;
  return rest;
}
