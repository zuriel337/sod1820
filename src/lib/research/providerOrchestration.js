// F7 — Provider Orchestration / Minimum Sufficient Intelligence V1.
//
// Pure planning layer. It does not call a provider, does not mutate runtime/model
// config, and does not create a second AI router.
//
// Canonical owners consumed:
// - ai_analyze_contract v2: Minimum Sufficient Intelligence / completion rules;
// - research_strategy_layer_law v15: Research Plan;
// - system_suggestions_law v3: trace/cost/routing observability + suggestions;
// - existing provider/runtime + pricing state.
//
// Provider/model is an implementation choice, never Truth identity.
// This planner remains execution-neutral until live owner/runtime verification authorizes the selected catalog state.
// Cost can choose among sufficient options; it can never downgrade required
// intelligence, privacy eligibility, verification, or safety.

export const PROVIDER_ORCHESTRATION_VERSION = "provider-orchestration-v1";

export const INTELLIGENCE_LEVEL = Object.freeze({
  FAST: "fast",
  DEEP: "deep",
});

export const RUNTIME_STATUS = Object.freeze({
  WIRED: "wired",
  NOT_WIRED: "not_wired",
  UNAVAILABLE: "unavailable",
  DISABLED: "disabled",
});

export const PRIVACY_CLASS = Object.freeze({
  PUBLIC: "public",
  AUTHENTICATED: "authenticated",
  PERSONAL: "personal",
  PRIVATE: "private",
});

export const DECISION_IMPACT = Object.freeze({
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
});

export const UNCERTAINTY_LEVEL = Object.freeze({
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
});

export const PLAN_STATUS = Object.freeze({
  DETERMINISTIC_ONLY: "deterministic_only",
  READY_PRIMARY_ONLY: "ready_primary_only",
  READY_WITH_CHALLENGER: "ready_with_challenger",
  BLOCKED_NO_ELIGIBLE_PROVIDER: "blocked_no_eligible_provider",
  BLOCKED_BUDGET: "blocked_budget_for_required_intelligence",
});

export const PROVIDER_ROLE = Object.freeze({
  PRIMARY: "primary",
  CHALLENGER: "challenger",
  FALLBACK: "fallback",
});

const VALID_INTELLIGENCE = new Set(Object.values(INTELLIGENCE_LEVEL));
const VALID_RUNTIME = new Set(Object.values(RUNTIME_STATUS));
const VALID_PRIVACY = new Set(Object.values(PRIVACY_CLASS));
const VALID_IMPACT = new Set(Object.values(DECISION_IMPACT));
const VALID_UNCERTAINTY = new Set(Object.values(UNCERTAINTY_LEVEL));

const CHALLENGE_TRIGGERS = Object.freeze({
  HIGH_DECISION_IMPACT: "high_decision_impact",
  HIGH_UNCERTAINTY: "high_uncertainty",
  CONFLICTING_FINDINGS: "conflicting_findings",
  HUMAN_REQUESTED_CHALLENGE: "human_requested_challenge",
});

const VALID_CHALLENGE_TRIGGERS = new Set(Object.values(CHALLENGE_TRIGGERS));

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function bool(value) {
  return value === true;
}

function uniqueText(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(clean).filter(Boolean))];
}

function nonNegativeInt(value, label) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {
    throw new TypeError(`providerOrchestration: ${label} must be a non-negative integer`);
  }
  return n;
}

function finiteNonNegative(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new TypeError(`providerOrchestration: ${label} must be a non-negative number`);
  }
  return n;
}

function requiredEnum(value, valid, label) {
  const v = clean(value);
  if (!valid.has(v)) {
    throw new TypeError(`providerOrchestration: invalid ${label} "${v}"`);
  }
  return v;
}

function optionalEnum(value, valid, fallback, label) {
  if (value == null || value === "") return fallback;
  return requiredEnum(value, valid, label);
}

function normalizePricing(input = null) {
  if (!input) {
    return {
      available: false,
      usd_per_m_input: null,
      usd_per_m_output: null,
      usd_to_ils: null,
      pricing_ref: null,
      effective_at: null,
    };
  }

  const inPrice = finiteNonNegative(
    input.usd_per_m_input ?? input.usdPerMInput,
    "pricing.usd_per_m_input"
  );
  const outPrice = finiteNonNegative(
    input.usd_per_m_output ?? input.usdPerMOutput,
    "pricing.usd_per_m_output"
  );
  const fx = finiteNonNegative(
    input.usd_to_ils ?? input.usdToIls,
    "pricing.usd_to_ils"
  );

  return {
    available: true,
    usd_per_m_input: inPrice,
    usd_per_m_output: outPrice,
    usd_to_ils: fx,
    pricing_ref: clean(input.pricing_ref || input.pricingRef),
    effective_at: clean(input.effective_at || input.effectiveAt),
  };
}

function normalizeCatalogEntry(input = {}, index = 0) {
  const provider = clean(input.provider);
  const model = clean(input.model);
  if (!provider || !model) {
    throw new TypeError("providerOrchestration: provider catalog entry requires provider + model");
  }

  const runtimeStatus = requiredEnum(
    input.runtime_status ?? input.runtimeStatus,
    VALID_RUNTIME,
    "runtime_status"
  );

  const intelligenceLevels = uniqueText(
    input.intelligence_levels || input.intelligenceLevels
  );
  if (!intelligenceLevels.length) {
    throw new TypeError("providerOrchestration: catalog entry requires intelligence_levels");
  }
  for (const level of intelligenceLevels) {
    if (!VALID_INTELLIGENCE.has(level)) {
      throw new TypeError(`providerOrchestration: unsupported intelligence level "${level}"`);
    }
  }

  const privacyClasses = uniqueText(
    input.privacy_classes || input.privacyClasses
  );
  if (!privacyClasses.length) {
    throw new TypeError("providerOrchestration: catalog entry requires privacy_classes");
  }
  for (const privacy of privacyClasses) {
    if (!VALID_PRIVACY.has(privacy)) {
      throw new TypeError(`providerOrchestration: unsupported privacy class "${privacy}"`);
    }
  }

  const runtimeRef = clean(input.runtime_ref || input.runtimeRef);
  if (runtimeStatus === RUNTIME_STATUS.WIRED && !runtimeRef) {
    throw new TypeError("providerOrchestration: wired catalog entry requires runtime_ref provenance");
  }

  return Object.freeze({
    catalog_index: index,
    provider,
    model,
    runtime_status: runtimeStatus,
    enabled: input.enabled !== false,
    intelligence_levels: intelligenceLevels,
    privacy_classes: privacyClasses,
    catalog_priority: nonNegativeInt(
      input.catalog_priority ?? input.catalogPriority ?? index,
      "catalog_priority"
    ),
    pricing: normalizePricing(input.pricing),
    runtime_ref: runtimeRef,
    model_version: clean(input.model_version || input.modelVersion),
    provider_version: clean(input.provider_version || input.providerVersion),
    notes: uniqueText(input.notes),
  });
}

export function normalizeProviderCatalog(input = []) {
  const rows = Array.isArray(input) ? input : input?.models;
  const catalogRef = Array.isArray(input) ? null : clean(input?.catalog_ref || input?.catalogRef);
  const ownerAttestationRef = Array.isArray(input)
    ? null
    : clean(input?.owner_attestation_ref || input?.ownerAttestationRef);
  if (!Array.isArray(rows)) {
    throw new TypeError("providerOrchestration: provider catalog array required");
  }

  const seen = new Set();
  const models = rows.map((row, index) => {
    const normalized = normalizeCatalogEntry(row, index);
    const key = `${normalized.provider}|${normalized.model}`;
    if (seen.has(key)) {
      throw new TypeError(`providerOrchestration: duplicate provider/model "${key}"`);
    }
    seen.add(key);
    return normalized;
  });

  return Object.freeze({
    catalog_version: 1,
    catalog_ref: catalogRef,
    owner_attestation_ref: ownerAttestationRef,
    owner_verified_by_this_module: false,
    execution_authorized: false,
    models,
    invariants: {
      catalog_is_runtime_input_not_truth: true,
      not_wired_provider_cannot_be_selected: true,
      unknown_cost_is_not_zero: true,
      provider_identity_is_not_research_truth_identity: true,
    },
  });
}

function requiredPolicyBool(input, snake, camel) {
  if (!(snake in input) && !(camel in input)) {
    throw new TypeError(`providerOrchestration: explicit policy field ${snake} is required`);
  }
  return bool(input[snake] ?? input[camel]);
}

function requiredPolicyInt(input, snake, camel, min, max) {
  if (!(snake in input) && !(camel in input)) {
    throw new TypeError(`providerOrchestration: explicit policy field ${snake} is required`);
  }
  const n = Number(input[snake] ?? input[camel]);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new TypeError(
      `providerOrchestration: policy.${snake} must be integer ${min}..${max}`
    );
  }
  return n;
}

export function normalizeProviderPolicy(input = {}) {
  if (!input || typeof input !== "object") {
    throw new TypeError("providerOrchestration: explicit provider policy required");
  }

  const challengeTriggers = uniqueText(
    input.challenge_triggers || input.challengeTriggers
  );
  for (const trigger of challengeTriggers) {
    if (!VALID_CHALLENGE_TRIGGERS.has(trigger)) {
      throw new TypeError(`providerOrchestration: unsupported challenge trigger "${trigger}"`);
    }
  }

  const callerPreferenceMode = clean(
    input.caller_preference_mode || input.callerPreferenceMode
  );
  if (!["ignore", "tie_break_only", "explicit_compare_only"].includes(callerPreferenceMode)) {
    throw new TypeError(
      "providerOrchestration: caller_preference_mode must be ignore|tie_break_only|explicit_compare_only"
    );
  }

  const policy = {
    policy_ref: clean(input.policy_ref || input.policyRef),
    max_initial_provider_calls: requiredPolicyInt(
      input,
      "max_initial_provider_calls",
      "maxInitialProviderCalls",
      1,
      2
    ),
    max_fallbacks: requiredPolicyInt(
      input,
      "max_fallbacks",
      "maxFallbacks",
      0,
      2
    ),
    challenge_triggers: challengeTriggers,
    cross_provider_challenger_preferred: requiredPolicyBool(
      input,
      "cross_provider_challenger_preferred",
      "crossProviderChallengerPreferred"
    ),
    require_information_gain_for_challenge: requiredPolicyBool(
      input,
      "require_information_gain_for_challenge",
      "requireInformationGainForChallenge"
    ),
    prefer_lower_estimated_cost_among_sufficient: requiredPolicyBool(
      input,
      "prefer_lower_estimated_cost_among_sufficient",
      "preferLowerEstimatedCostAmongSufficient"
    ),
    caller_preference_mode: callerPreferenceMode,
    allow_unknown_cost: requiredPolicyBool(
      input,
      "allow_unknown_cost",
      "allowUnknownCost"
    ),
    fallback_on_provider_error: requiredPolicyBool(
      input,
      "fallback_on_provider_error",
      "fallbackOnProviderError"
    ),
  };

  if (!policy.policy_ref) {
    throw new TypeError("providerOrchestration: policy_ref is required");
  }
  if (policy.require_information_gain_for_challenge !== true) {
    throw new TypeError(
      "providerOrchestration: require_information_gain_for_challenge must be explicitly true"
    );
  }

  return Object.freeze(policy);
}

function estimateCost(entry, expected) {
  const inputTokens = expected?.input_tokens ?? expected?.inputTokens;
  const outputTokens = expected?.output_tokens ?? expected?.outputTokens;

  if (
    !entry.pricing.available
    || inputTokens == null
    || outputTokens == null
  ) {
    return {
      estimated: false,
      cost_usd: null,
      cost_ils: null,
      certainty: "unknown",
      pricing_ref: entry.pricing.pricing_ref,
    };
  }

  const inTok = nonNegativeInt(inputTokens, "expected_tokens.input_tokens");
  const outTok = nonNegativeInt(outputTokens, "expected_tokens.output_tokens");

  const usd =
    (inTok * entry.pricing.usd_per_m_input) / 1_000_000
    + (outTok * entry.pricing.usd_per_m_output) / 1_000_000;
  const ils = usd * entry.pricing.usd_to_ils;

  return {
    estimated: true,
    cost_usd: Math.round(usd * 1e8) / 1e8,
    cost_ils: Math.round(ils * 1e8) / 1e8,
    certainty: "estimated_from_token_budget",
    pricing_ref: entry.pricing.pricing_ref,
    pricing_effective_at: entry.pricing.effective_at,
    expected_input_tokens: inTok,
    expected_output_tokens: outTok,
  };
}

function challengeSignals(request, policy) {
  const active = [];
  if (
    request.decision_impact === DECISION_IMPACT.HIGH
    && policy.challenge_triggers.includes(CHALLENGE_TRIGGERS.HIGH_DECISION_IMPACT)
  ) active.push(CHALLENGE_TRIGGERS.HIGH_DECISION_IMPACT);

  if (
    request.uncertainty === UNCERTAINTY_LEVEL.HIGH
    && policy.challenge_triggers.includes(CHALLENGE_TRIGGERS.HIGH_UNCERTAINTY)
  ) active.push(CHALLENGE_TRIGGERS.HIGH_UNCERTAINTY);

  if (
    request.conflicting_findings === true
    && policy.challenge_triggers.includes(CHALLENGE_TRIGGERS.CONFLICTING_FINDINGS)
  ) active.push(CHALLENGE_TRIGGERS.CONFLICTING_FINDINGS);

  if (
    request.human_requested_challenge === true
    && policy.challenge_triggers.includes(CHALLENGE_TRIGGERS.HUMAN_REQUESTED_CHALLENGE)
  ) active.push(CHALLENGE_TRIGGERS.HUMAN_REQUESTED_CHALLENGE);

  return active;
}

function eligibleEntries(catalog, request) {
  return catalog.models.filter(entry =>
    entry.enabled
    && entry.runtime_status === RUNTIME_STATUS.WIRED
    && entry.intelligence_levels.includes(request.required_intelligence)
    && entry.privacy_classes.includes(request.privacy_class)
  );
}

function withCost(entries, expectedTokens) {
  return entries.map(entry => ({
    entry,
    cost: estimateCost(entry, expectedTokens),
  }));
}

function sortCandidates(candidates, policy, callerPreference) {
  const preference = clean(callerPreference);
  return [...candidates].sort((a, b) => {
    if (policy.prefer_lower_estimated_cost_among_sufficient) {
      const aKnown = a.cost.estimated;
      const bKnown = b.cost.estimated;
      if (aKnown && bKnown && a.cost.cost_ils !== b.cost.cost_ils) {
        return a.cost.cost_ils - b.cost.cost_ils;
      }
      // Unknown cost is never treated as cheaper than known cost.
      if (aKnown !== bKnown) return aKnown ? -1 : 1;
    }

    if (policy.caller_preference_mode === "tie_break_only" && preference) {
      const aPref = a.entry.provider === preference || a.entry.model === preference;
      const bPref = b.entry.provider === preference || b.entry.model === preference;
      if (aPref !== bPref) return aPref ? -1 : 1;
    }

    return (
      a.entry.catalog_priority - b.entry.catalog_priority
      || a.entry.catalog_index - b.entry.catalog_index
    );
  });
}

function budgetEligible(candidates, maxEstimatedIls, policy) {
  const costPolicyEligible = candidates.filter(candidate =>
    candidate.cost.estimated || policy.allow_unknown_cost
  );

  if (maxEstimatedIls == null) {
    return {
      candidates: costPolicyEligible,
      blocked_by_budget: false,
      blocked_by_unknown_cost_policy:
        candidates.length > 0 && costPolicyEligible.length === 0,
    };
  }

  const max = finiteNonNegative(maxEstimatedIls, "max_estimated_cost_ils");
  const accepted = costPolicyEligible.filter(candidate =>
    !candidate.cost.estimated || candidate.cost.cost_ils <= max
  );
  return {
    candidates: accepted,
    blocked_by_budget:
      costPolicyEligible.length > 0 && accepted.length === 0,
    blocked_by_unknown_cost_policy:
      candidates.length > 0 && costPolicyEligible.length === 0,
  };
}

function plannedCall(candidate, role, routingReason) {
  if (!candidate) return null;
  return Object.freeze({
    role,
    provider: candidate.entry.provider,
    model: candidate.entry.model,
    intelligence_level: null,
    routing_reason: routingReason,
    runtime_ref: candidate.entry.runtime_ref,
    model_version: candidate.entry.model_version,
    provider_version: candidate.entry.provider_version,
    cost_estimate: candidate.cost,
  });
}

function pickChallenger(candidates, primary, policy, {
  compareMode = false,
  callerPreference = null,
} = {}) {
  const rest = candidates.filter(x =>
    x.entry.provider !== primary.entry.provider
    || x.entry.model !== primary.entry.model
  );
  if (!rest.length) return null;

  const preference = clean(callerPreference);
  if (compareMode && preference) {
    const preferred = rest.find(
      x => x.entry.provider === preference || x.entry.model === preference
    );
    if (preferred) return preferred;
  }

  if (policy.cross_provider_challenger_preferred) {
    const crossProvider = rest.find(
      x => x.entry.provider !== primary.entry.provider
    );
    if (crossProvider) return crossProvider;
  }
  return rest[0];
}

function pickFallbacks(candidates, used, policy) {
  if (!policy.fallback_on_provider_error || policy.max_fallbacks === 0) return [];
  const usedKeys = new Set(
    used.filter(Boolean).map(x => `${x.entry.provider}|${x.entry.model}`)
  );
  return candidates
    .filter(x => !usedKeys.has(`${x.entry.provider}|${x.entry.model}`))
    .slice(0, policy.max_fallbacks);
}

export function buildProviderOrchestrationPlan({
  llmRequired = true,
  taskClass = "research",
  requiredIntelligence,
  privacyClass = PRIVACY_CLASS.PUBLIC,
  decisionImpact = DECISION_IMPACT.LOW,
  uncertainty = UNCERTAINTY_LEVEL.LOW,
  conflictingFindings = false,
  humanRequestedChallenge = false,
  challengeCanChangeDecision = false,
  callerProviderPreference = null,
  explicitProviderCompare = false,
  expectedTokens = null,
  maxEstimatedCostIls = null,
  catalog,
  policy,
  planRef = null,
} = {}) {
  const normalizedPolicy = policy?.policy_ref
    ? policy
    : normalizeProviderPolicy(policy);
  const normalizedCatalog = catalog?.catalog_version
    ? catalog
    : normalizeProviderCatalog(catalog);

  if (llmRequired !== true) {
    return Object.freeze({
      plan_version: 1,
      orchestration_version: PROVIDER_ORCHESTRATION_VERSION,
      status: PLAN_STATUS.DETERMINISTIC_ONLY,
      task_class: clean(taskClass) || "research",
      calls: [],
      fallbacks: [],
      initial_call_count: 0,
      max_possible_provider_calls: 0,
      reason: "Research Plan determined no LLM is required",
      synthesis_authority: "Research Result Bundle / canonical Synthesis",
      invariants: {
        deterministic_before_llm: true,
        provider_is_not_truth_owner: true,
      },
    });
  }

  const request = {
    required_intelligence: requiredEnum(
      requiredIntelligence,
      VALID_INTELLIGENCE,
      "requiredIntelligence"
    ),
    privacy_class: requiredEnum(privacyClass, VALID_PRIVACY, "privacyClass"),
    decision_impact: optionalEnum(
      decisionImpact,
      VALID_IMPACT,
      DECISION_IMPACT.LOW,
      "decisionImpact"
    ),
    uncertainty: optionalEnum(
      uncertainty,
      VALID_UNCERTAINTY,
      UNCERTAINTY_LEVEL.LOW,
      "uncertainty"
    ),
    conflicting_findings: conflictingFindings === true,
    human_requested_challenge: humanRequestedChallenge === true,
    challenge_can_change_decision: challengeCanChangeDecision === true,
  };

  const eligible = eligibleEntries(normalizedCatalog, request);
  if (!eligible.length) {
    return Object.freeze({
      plan_version: 1,
      orchestration_version: PROVIDER_ORCHESTRATION_VERSION,
      status: PLAN_STATUS.BLOCKED_NO_ELIGIBLE_PROVIDER,
      task_class: clean(taskClass) || "research",
      request,
      calls: [],
      fallbacks: [],
      initial_call_count: 0,
      max_possible_provider_calls: 0,
      reason: "No wired provider/model satisfies required intelligence + privacy eligibility",
      caller_preference: clean(callerProviderPreference),
      caller_preference_honored: false,
      synthesis_authority: "Research Result Bundle / canonical Synthesis",
    });
  }

  const costed = withCost(eligible, expectedTokens);
  const sorted = sortCandidates(
    costed,
    normalizedPolicy,
    callerProviderPreference
  );
  const budgeted = budgetEligible(
    sorted,
    maxEstimatedCostIls,
    normalizedPolicy
  );

  if (
    !budgeted.candidates.length
    && (budgeted.blocked_by_budget || budgeted.blocked_by_unknown_cost_policy)
  ) {
    return Object.freeze({
      plan_version: 1,
      orchestration_version: PROVIDER_ORCHESTRATION_VERSION,
      status: PLAN_STATUS.BLOCKED_BUDGET,
      task_class: clean(taskClass) || "research",
      request,
      calls: [],
      fallbacks: [],
      initial_call_count: 0,
      max_possible_provider_calls: 0,
      reason: budgeted.blocked_by_unknown_cost_policy
        ? "No eligible provider has acceptable known-cost provenance under policy; no unknown-cost assumption authorized"
        : "Budget cannot satisfy required intelligence/privacy constraints; no downgrade authorized",
      caller_preference: clean(callerProviderPreference),
      caller_preference_honored: false,
      synthesis_authority: "Research Result Bundle / canonical Synthesis",
    });
  }

  const primary = budgeted.candidates[0];
  const activeChallengeSignals = challengeSignals(request, normalizedPolicy);
  const informationGainQualified =
    request.challenge_can_change_decision === true;
  const compareMode =
    explicitProviderCompare === true
    && normalizedPolicy.caller_preference_mode === "explicit_compare_only";

  const challengeWanted =
    normalizedPolicy.max_initial_provider_calls > 1
    && (
      (activeChallengeSignals.length > 0 && informationGainQualified)
      || compareMode
    );

  const challenger = challengeWanted
    ? pickChallenger(budgeted.candidates, primary, normalizedPolicy, {
        compareMode,
        callerPreference: callerProviderPreference,
      })
    : null;

  const calls = [
    {
      ...plannedCall(
        primary,
        PROVIDER_ROLE.PRIMARY,
        "minimum_sufficient_intelligence_primary"
      ),
      intelligence_level: request.required_intelligence,
    },
  ];

  if (challenger) {
    calls.push({
      ...plannedCall(
        challenger,
        PROVIDER_ROLE.CHALLENGER,
        compareMode
          ? "explicit_provider_compare"
          : "decision_changing_challenge"
      ),
      intelligence_level: request.required_intelligence,
      challenge_signals: activeChallengeSignals,
      information_gain_qualified: informationGainQualified,
    });
  }

  const fallbacks = pickFallbacks(
    budgeted.candidates,
    [primary, challenger],
    normalizedPolicy
  ).map(candidate => ({
    ...plannedCall(
      candidate,
      PROVIDER_ROLE.FALLBACK,
      "provider_error_or_unavailability_only"
    ),
    intelligence_level: request.required_intelligence,
    executed_initially: false,
  }));

  const preference = clean(callerProviderPreference);
  const primaryMatchesPreference =
    Boolean(preference)
    && (
      primary.entry.provider === preference
      || primary.entry.model === preference
    );
  const challengerMatchesPreference =
    Boolean(preference)
    && Boolean(challenger)
    && (
      challenger.entry.provider === preference
      || challenger.entry.model === preference
    );
  const plannedCallMatchesPreference =
    primaryMatchesPreference || challengerMatchesPreference;

  const status = challenger
    ? PLAN_STATUS.READY_WITH_CHALLENGER
    : PLAN_STATUS.READY_PRIMARY_ONLY;

  return Object.freeze({
    plan_version: 1,
    orchestration_version: PROVIDER_ORCHESTRATION_VERSION,
    status,
    task_class: clean(taskClass) || "research",
    plan_ref: clean(planRef),
    request,
    policy_ref: normalizedPolicy.policy_ref,
    calls,
    fallbacks,
    initial_call_count: calls.length,
    max_possible_provider_calls: calls.length + fallbacks.length,
    challenge: {
      triggers: activeChallengeSignals,
      can_change_decision: informationGainQualified,
      compare_mode: compareMode,
      requested: challengeWanted,
      planned: Boolean(challenger),
      unavailable:
        challengeWanted && !challenger,
      reason:
        challengeWanted && !challenger
          ? "No second eligible provider/model available"
          : null,
    },
    caller_preference: preference,
    caller_preference_mode: normalizedPolicy.caller_preference_mode,
    caller_preference_honored:
      normalizedPolicy.caller_preference_mode === "ignore"
        ? false
        : plannedCallMatchesPreference,
    caller_preference_role:
      primaryMatchesPreference
        ? PROVIDER_ROLE.PRIMARY
        : challengerMatchesPreference
          ? PROVIDER_ROLE.CHALLENGER
          : null,
    caller_preference_is_truth_authority: false,
    cost_boundary: {
      max_estimated_cost_ils:
        maxEstimatedCostIls == null ? null : Number(maxEstimatedCostIls),
      cost_used_only_after_sufficiency_filter: true,
      unknown_cost_treated_as_zero: false,
      budget_never_authorizes_intelligence_downgrade: true,
    },
    trace_requirements: {
      one_root_trace: true,
      provider_call_is_span: true,
      provider_fanout_calls_are_sibling_spans: true,
      final_merge_or_render_is_own_span: true,
      required_span_fields: [
        "capability",
        "plan_ref",
        "intelligence_level",
        "provider",
        "model",
        "routing_reason",
        "escalation_reason",
        "fallback_reason",
        "output_use",
        "resources",
        "cost_ils",
        "cost_certainty",
        "replay",
      ],
      discarded_provider_output_remains_visible: true,
    },
    catalog_verification: {
      catalog_ref: normalizedCatalog.catalog_ref,
      owner_attestation_ref: normalizedCatalog.owner_attestation_ref,
      verified_by_planner: false,
      owner_verification_required: true,
      execution_authorized: false,
    },
    synthesis_authority: "Research Result Bundle / canonical Synthesis",
    invariants: {
      deterministic_before_llm: true,
      minimum_sufficient_intelligence: true,
      provider_is_implementation_choice_not_truth_identity: true,
      cost_never_overrides_required_intelligence: true,
      privacy_eligibility_precedes_cost: true,
      caller_provider_preference_is_non_authoritative: true,
      challenge_requires_information_gain_unless_explicit_compare_mode: true,
      challenger_agreement_is_robustness_not_independent_evidence: true,
      no_three_provider_default_fanout: normalizedPolicy.max_initial_provider_calls <= 2,
      fallback_is_not_initial_call: true,
      no_auto_truth_promotion_from_provider_output: true,
    },
  });
}

export const PROVIDER_CHALLENGE_TRIGGERS = CHALLENGE_TRIGGERS;
