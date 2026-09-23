import test from "node:test";
import assert from "node:assert/strict";
import {
  DECISION_IMPACT,
  INTELLIGENCE_LEVEL,
  PLAN_STATUS,
  PRIVACY_CLASS,
  PROVIDER_CHALLENGE_TRIGGERS,
  PROVIDER_ROLE,
  RUNTIME_STATUS,
  UNCERTAINTY_LEVEL,
  buildProviderOrchestrationPlan,
  normalizeProviderCatalog,
  normalizeProviderPolicy,
} from "./providerOrchestration.js";

function catalog(overrides = []) {
  const base = [
    {
      provider: "anthropic",
      model: "claude-haiku-4-5",
      runtimeStatus: RUNTIME_STATUS.WIRED,
      runtimeRef: "edge:ai-analyze:anthropic",
      intelligenceLevels: [INTELLIGENCE_LEVEL.FAST],
      privacyClasses: [
        PRIVACY_CLASS.PUBLIC,
        PRIVACY_CLASS.AUTHENTICATED,
        PRIVACY_CLASS.PERSONAL,
        PRIVACY_CLASS.PRIVATE,
      ],
      catalogPriority: 20,
      pricing: {
        usdPerMInput: 1,
        usdPerMOutput: 5,
        usdToIls: 3.01,
        pricingRef: "api_pricing:claude-haiku-4-5",
        effectiveAt: "2026-01-01",
      },
    },
    {
      provider: "anthropic",
      model: "claude-sonnet-5",
      runtimeStatus: RUNTIME_STATUS.WIRED,
      runtimeRef: "edge:ai-analyze:anthropic",
      intelligenceLevels: [INTELLIGENCE_LEVEL.FAST, INTELLIGENCE_LEVEL.DEEP],
      privacyClasses: [
        PRIVACY_CLASS.PUBLIC,
        PRIVACY_CLASS.AUTHENTICATED,
        PRIVACY_CLASS.PERSONAL,
        PRIVACY_CLASS.PRIVATE,
      ],
      catalogPriority: 30,
      pricing: {
        usdPerMInput: 3,
        usdPerMOutput: 15,
        usdToIls: 3.01,
        pricingRef: "api_pricing:claude-sonnet-5",
        effectiveAt: "2026-09-01",
      },
    },
    {
      provider: "google",
      model: "gemini-2.5-flash",
      runtimeStatus: RUNTIME_STATUS.WIRED,
      runtimeRef: "edge:ai-analyze:google",
      intelligenceLevels: [INTELLIGENCE_LEVEL.FAST],
      privacyClasses: [
        PRIVACY_CLASS.PUBLIC,
        PRIVACY_CLASS.AUTHENTICATED,
      ],
      catalogPriority: 10,
      pricing: {
        usdPerMInput: 0.3,
        usdPerMOutput: 2.5,
        usdToIls: 3.01,
        pricingRef: "api_pricing:gemini-2.5-flash",
        effectiveAt: "2026-01-01",
      },
    },
    {
      provider: "openai",
      model: "gpt-future",
      runtimeStatus: RUNTIME_STATUS.NOT_WIRED,
      intelligenceLevels: [INTELLIGENCE_LEVEL.FAST, INTELLIGENCE_LEVEL.DEEP],
      privacyClasses: [PRIVACY_CLASS.PUBLIC],
      catalogPriority: 1,
      pricing: {
        usdPerMInput: 0.01,
        usdPerMOutput: 0.01,
        usdToIls: 3.01,
        pricingRef: "synthetic:not-wired",
        effectiveAt: "2026-01-01",
      },
    },
    ...overrides,
  ];

  return normalizeProviderCatalog({
    catalogRef: "runtime-catalog:synthetic:v1",
    ownerAttestationRef: "owner-attestation:synthetic:v1",
    models: base,
  });
}

function policy(overrides = {}) {
  return normalizeProviderPolicy({
    policyRef: "provider-policy:synthetic:v1",
    maxInitialProviderCalls: 2,
    maxFallbacks: 1,
    challengeTriggers: [
      PROVIDER_CHALLENGE_TRIGGERS.HIGH_DECISION_IMPACT,
      PROVIDER_CHALLENGE_TRIGGERS.HIGH_UNCERTAINTY,
      PROVIDER_CHALLENGE_TRIGGERS.CONFLICTING_FINDINGS,
      PROVIDER_CHALLENGE_TRIGGERS.HUMAN_REQUESTED_CHALLENGE,
    ],
    crossProviderChallengerPreferred: true,
    requireInformationGainForChallenge: true,
    preferLowerEstimatedCostAmongSufficient: true,
    callerPreferenceMode: "tie_break_only",
    allowUnknownCost: false,
    fallbackOnProviderError: true,
    ...overrides,
  });
}

function plan(overrides = {}) {
  return buildProviderOrchestrationPlan({
    taskClass: "synthesis_render",
    requiredIntelligence: INTELLIGENCE_LEVEL.FAST,
    privacyClass: PRIVACY_CLASS.PUBLIC,
    decisionImpact: DECISION_IMPACT.LOW,
    uncertainty: UNCERTAINTY_LEVEL.LOW,
    expectedTokens: {
      inputTokens: 5000,
      outputTokens: 800,
    },
    catalog: catalog(),
    policy: policy(),
    planRef: "research-plan:synthetic:1",
    ...overrides,
  });
}

test("deterministic-only plan never calls a provider", () => {
  const result = plan({ llmRequired: false });

  assert.equal(result.status, PLAN_STATUS.DETERMINISTIC_ONLY);
  assert.deepEqual(result.calls, []);
  assert.equal(result.initial_call_count, 0);
  assert.equal(result.max_possible_provider_calls, 0);
  assert.equal(result.invariants.deterministic_before_llm, true);
});

test("not-wired provider cannot be selected even if it is cheapest and highest catalog priority", () => {
  const result = plan();

  assert.equal(result.status, PLAN_STATUS.READY_PRIMARY_ONLY);
  assert.equal(result.calls.length, 1);
  assert.notEqual(result.calls[0].provider, "openai");
  assert.notEqual(result.calls[0].model, "gpt-future");
  assert.equal(result.calls[0].provider, "google");
  assert.equal(result.calls[0].model, "gemini-2.5-flash");
});

test("wired catalog entry requires runtime provenance", () => {
  assert.throws(() => normalizeProviderCatalog([{
    provider: "synthetic",
    model: "m1",
    runtimeStatus: "wired",
    intelligenceLevels: ["fast"],
    privacyClasses: ["public"],
    pricing: {
      usdPerMInput: 1,
      usdPerMOutput: 1,
      usdToIls: 3,
    },
  }]), /wired catalog entry requires runtime_ref/);
});

test("deep requirement cannot downgrade to cheaper fast-only provider", () => {
  const result = plan({
    requiredIntelligence: INTELLIGENCE_LEVEL.DEEP,
  });

  assert.equal(result.status, PLAN_STATUS.READY_PRIMARY_ONLY);
  assert.equal(result.calls[0].model, "claude-sonnet-5");
  assert.equal(result.calls[0].intelligence_level, "deep");
  assert.equal(result.invariants.cost_never_overrides_required_intelligence, true);
});

test("privacy eligibility precedes price: public Gemini is not eligible for private request", () => {
  const result = plan({
    privacyClass: PRIVACY_CLASS.PRIVATE,
  });

  assert.equal(result.status, PLAN_STATUS.READY_PRIMARY_ONLY);
  assert.equal(result.calls[0].provider, "anthropic");
  assert.equal(result.calls[0].model, "claude-haiku-4-5");
  assert.equal(result.invariants.privacy_eligibility_precedes_cost, true);
});

test("budget cannot force intelligence downgrade", () => {
  const result = plan({
    requiredIntelligence: INTELLIGENCE_LEVEL.DEEP,
    maxEstimatedCostIls: 0.01,
  });

  assert.equal(result.status, PLAN_STATUS.BLOCKED_BUDGET);
  assert.deepEqual(result.calls, []);
  assert.match(result.reason, /no downgrade authorized/);
});

test("unknown provider cost is never treated as zero when policy disallows unknown cost", () => {
  const unknownCatalog = normalizeProviderCatalog({
    catalogRef: "runtime-catalog:unknown-cost",
    ownerAttestationRef: "owner:unknown-cost",
    models: [{
      provider: "anthropic",
      model: "unknown-price-model",
      runtimeStatus: "wired",
      runtimeRef: "edge:synthetic",
      intelligenceLevels: ["fast"],
      privacyClasses: ["public"],
    }],
  });

  const result = buildProviderOrchestrationPlan({
    requiredIntelligence: "fast",
    privacyClass: "public",
    expectedTokens: { inputTokens: 1000, outputTokens: 1000 },
    catalog: unknownCatalog,
    policy: policy(),
  });

  assert.equal(result.status, PLAN_STATUS.BLOCKED_BUDGET);
  assert.match(result.reason, /unknown-cost/);
});

test("explicit budget ceiling rejects unknown cost even when unknown cost is otherwise allowed", () => {
  const mixed = normalizeProviderCatalog({
    catalogRef: "runtime-catalog:budget-unknown",
    ownerAttestationRef: "owner:budget-unknown",
    models: [
      {
        provider: "unknown-provider",
        model: "unknown-cost",
        runtimeStatus: "wired",
        runtimeRef: "runtime:unknown",
        intelligenceLevels: ["fast"],
        privacyClasses: ["public"],
        catalogPriority: 0,
      },
      {
        provider: "known-provider",
        model: "known-over-budget",
        runtimeStatus: "wired",
        runtimeRef: "runtime:known",
        intelligenceLevels: ["fast"],
        privacyClasses: ["public"],
        catalogPriority: 1,
        pricing: {
          usdPerMInput: 10,
          usdPerMOutput: 10,
          usdToIls: 3,
        },
      },
    ],
  });

  const result = buildProviderOrchestrationPlan({
    requiredIntelligence: "fast",
    privacyClass: "public",
    expectedTokens: { inputTokens: 1000, outputTokens: 1000 },
    maxEstimatedCostIls: 0.001,
    catalog: mixed,
    policy: policy({ allowUnknownCost: true }),
  });

  assert.equal(result.status, PLAN_STATUS.BLOCKED_BUDGET);
  assert.deepEqual(result.calls, []);
  assert.equal(result.cost_boundary?.unknown_cost_treated_as_zero ?? false, false);
});

test("known cost wins over unknown cost when lower-cost policy is active", () => {
  const mixed = normalizeProviderCatalog({
    catalogRef: "runtime-catalog:mixed",
    ownerAttestationRef: "owner:mixed",
    models: [
      {
        provider: "unknown-provider",
        model: "unknown-cost",
        runtimeStatus: "wired",
        runtimeRef: "runtime:unknown",
        intelligenceLevels: ["fast"],
        privacyClasses: ["public"],
        catalogPriority: 0,
      },
      {
        provider: "known-provider",
        model: "known-cost",
        runtimeStatus: "wired",
        runtimeRef: "runtime:known",
        intelligenceLevels: ["fast"],
        privacyClasses: ["public"],
        catalogPriority: 99,
        pricing: {
          usdPerMInput: 1,
          usdPerMOutput: 1,
          usdToIls: 3,
        },
      },
    ],
  });

  const result = buildProviderOrchestrationPlan({
    requiredIntelligence: "fast",
    privacyClass: "public",
    expectedTokens: { inputTokens: 1000, outputTokens: 1000 },
    catalog: mixed,
    policy: policy({ allowUnknownCost: true }),
  });

  assert.equal(result.calls[0].provider, "known-provider");
  assert.equal(result.cost_boundary.unknown_cost_treated_as_zero, false);
});

test("caller provider preference is only a tie-break and cannot override cheaper sufficient provider", () => {
  const result = plan({
    callerProviderPreference: "anthropic",
  });

  assert.equal(result.calls[0].provider, "google");
  assert.equal(result.caller_preference_honored, false);
  assert.equal(result.caller_preference_is_truth_authority, false);
});

test("caller preference can break a true cost tie but remains non-authoritative", () => {
  const tied = normalizeProviderCatalog({
    catalogRef: "runtime-catalog:tie",
    ownerAttestationRef: "owner:tie",
    models: [
      {
        provider: "alpha",
        model: "a",
        runtimeStatus: "wired",
        runtimeRef: "runtime:a",
        intelligenceLevels: ["fast"],
        privacyClasses: ["public"],
        catalogPriority: 1,
        pricing: {
          usdPerMInput: 1,
          usdPerMOutput: 1,
          usdToIls: 3,
        },
      },
      {
        provider: "beta",
        model: "b",
        runtimeStatus: "wired",
        runtimeRef: "runtime:b",
        intelligenceLevels: ["fast"],
        privacyClasses: ["public"],
        catalogPriority: 2,
        pricing: {
          usdPerMInput: 1,
          usdPerMOutput: 1,
          usdToIls: 3,
        },
      },
    ],
  });

  const result = buildProviderOrchestrationPlan({
    requiredIntelligence: "fast",
    privacyClass: "public",
    callerProviderPreference: "beta",
    expectedTokens: { inputTokens: 1000, outputTokens: 500 },
    catalog: tied,
    policy: policy(),
  });

  assert.equal(result.calls[0].provider, "beta");
  assert.equal(result.caller_preference_honored, true);
  assert.equal(result.caller_preference_role, PROVIDER_ROLE.PRIMARY);
});

test("high decision impact alone does not fan out unless a second eligible provider can change the decision", () => {
  const noGain = plan({
    decisionImpact: DECISION_IMPACT.HIGH,
    challengeCanChangeDecision: false,
  });

  assert.equal(noGain.status, PLAN_STATUS.READY_PRIMARY_ONLY);
  assert.equal(noGain.calls.length, 1);
  assert.equal(noGain.challenge.triggers.includes("high_decision_impact"), true);
  assert.equal(noGain.challenge.requested, false);
  assert.equal(noGain.invariants.challenge_requires_information_gain_unless_explicit_compare_mode, true);
});

test("decision-changing high-impact challenge adds one bounded cross-provider challenger", () => {
  const result = plan({
    decisionImpact: DECISION_IMPACT.HIGH,
    challengeCanChangeDecision: true,
  });

  assert.equal(result.status, PLAN_STATUS.READY_WITH_CHALLENGER);
  assert.equal(result.calls.length, 2);
  assert.equal(result.calls[0].role, PROVIDER_ROLE.PRIMARY);
  assert.equal(result.calls[1].role, PROVIDER_ROLE.CHALLENGER);
  assert.notEqual(result.calls[0].provider, result.calls[1].provider);
  assert.equal(result.calls[1].information_gain_qualified, true);
  assert.equal(result.initial_call_count <= 2, true);
  assert.equal(result.invariants.no_three_provider_default_fanout, true);
});

test("explicit compare can put requested provider in challenger role without making it primary Truth authority", () => {
  const comparePolicy = policy({
    callerPreferenceMode: "explicit_compare_only",
  });
  const result = plan({
    callerProviderPreference: "anthropic",
    explicitProviderCompare: true,
    challengeCanChangeDecision: false,
    policy: comparePolicy,
  });

  assert.equal(result.status, PLAN_STATUS.READY_WITH_CHALLENGER);
  assert.equal(result.calls[0].provider, "google");
  assert.equal(result.calls[1].provider, "anthropic");
  assert.equal(result.calls[1].routing_reason, "explicit_provider_compare");
  assert.equal(result.caller_preference_honored, true);
  assert.equal(result.caller_preference_role, PROVIDER_ROLE.CHALLENGER);
  assert.equal(result.caller_preference_is_truth_authority, false);
});

test("fallback is planned separately and is not executed in initial fan-out", () => {
  const richerCatalog = catalog([{
    provider: "backup",
    model: "backup-fast",
    runtimeStatus: "wired",
    runtimeRef: "runtime:backup",
    intelligenceLevels: ["fast"],
    privacyClasses: ["public"],
    catalogPriority: 50,
    pricing: {
      usdPerMInput: 2,
      usdPerMOutput: 6,
      usdToIls: 3.01,
    },
  }]);

  const result = buildProviderOrchestrationPlan({
    requiredIntelligence: "fast",
    privacyClass: "public",
    expectedTokens: { inputTokens: 5000, outputTokens: 800 },
    catalog: richerCatalog,
    policy: policy(),
  });

  assert.equal(result.initial_call_count, 1);
  assert.equal(result.fallbacks.length, 1);
  assert.equal(result.fallbacks[0].role, PROVIDER_ROLE.FALLBACK);
  assert.equal(result.fallbacks[0].executed_initially, false);
  assert.equal(result.invariants.fallback_is_not_initial_call, true);
});

test("no eligible provider blocks honestly instead of silently changing privacy/intelligence", () => {
  const result = plan({
    requiredIntelligence: INTELLIGENCE_LEVEL.DEEP,
    privacyClass: PRIVACY_CLASS.PRIVATE,
    catalog: normalizeProviderCatalog({
      catalogRef: "runtime:none",
      ownerAttestationRef: "owner:none",
      models: [{
        provider: "google",
        model: "public-fast-only",
        runtimeStatus: "wired",
        runtimeRef: "runtime:public-fast",
        intelligenceLevels: ["fast"],
        privacyClasses: ["public"],
        pricing: {
          usdPerMInput: 0.1,
          usdPerMOutput: 0.2,
          usdToIls: 3,
        },
      }],
    }),
  });

  assert.equal(result.status, PLAN_STATUS.BLOCKED_NO_ELIGIBLE_PROVIDER);
  assert.deepEqual(result.calls, []);
});

test("pure planner never authorizes provider execution from caller-supplied catalog claims", () => {
  const result = plan();

  assert.equal(result.catalog_verification.verified_by_planner, false);
  assert.equal(result.catalog_verification.owner_verification_required, true);
  assert.equal(result.catalog_verification.execution_authorized, false);
});

test("trace contract preserves fan-out/fan-in accountability", () => {
  const result = plan({
    decisionImpact: "high",
    challengeCanChangeDecision: true,
  });

  assert.equal(result.trace_requirements.one_root_trace, true);
  assert.equal(result.trace_requirements.provider_fanout_calls_are_sibling_spans, true);
  assert.equal(result.trace_requirements.final_merge_or_render_is_own_span, true);
  assert.equal(result.trace_requirements.required_span_fields.includes("provider"), true);
  assert.equal(result.trace_requirements.required_span_fields.includes("output_use"), true);
  assert.equal(result.trace_requirements.discarded_provider_output_remains_visible, true);
});

test("policy cannot disable information-gain requirement", () => {
  assert.throws(() => policy({
    requireInformationGainForChallenge: false,
  }), /must be explicitly true/);
});

test("policy limits normal initial fan-out to at most two provider calls", () => {
  assert.throws(() => policy({
    maxInitialProviderCalls: 3,
  }), /1\.\.2/);
});
