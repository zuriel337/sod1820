import { RESEARCH_CAPABILITY } from "./researchPlanV2.js";

export const RESEARCH_PROFILE_VERSION = "research-profile-v1";

export const RESEARCH_PROFILE = Object.freeze({
  QUICK: "quick",
  DEEP: "deep",
  RESEARCH: "research",
  CUSTOM: "custom",
});

// Contract-only capabilities must not silently become available to every Deep/Research/custom run
// merely because their key is registered in Research Plan. They are admitted only by their own
// validated transport until the canonical owner explicitly widens the general profiles.
const CONTRACT_ONLY = new Set([
  RESEARCH_CAPABILITY.CROSSINGS,
  RESEARCH_CAPABILITY.GEMATRIA_RELATIONS,
]);
const ALL = Object.freeze(Object.values(RESEARCH_CAPABILITY).filter(capability => !CONTRACT_ONLY.has(capability)));

const BASE = Object.freeze({
  [RESEARCH_PROFILE.QUICK]: Object.freeze({
    depth: "quick",
    capabilities: Object.freeze([
      RESEARCH_CAPABILITY.GRAPH,
      RESEARCH_CAPABILITY.NUMERIC,
      RESEARCH_CAPABILITY.GEMATRIA,
      RESEARCH_CAPABILITY.SOURCES,
      RESEARCH_CAPABILITY.NAME,
      RESEARCH_CAPABILITY.TIME,
      RESEARCH_CAPABILITY.PERSON,
      RESEARCH_CAPABILITY.FAMILY,
    ]),
    secondary_hints: false,
    els: "context_only",
    ai_synthesis: "optional_short",
    reflection: false,
  }),
  [RESEARCH_PROFILE.DEEP]: Object.freeze({
    depth: "deep",
    capabilities: Object.freeze(ALL),
    secondary_hints: true,
    els: "plan_gated",
    ai_synthesis: "deep_bounded",
    reflection: false,
  }),
  [RESEARCH_PROFILE.RESEARCH]: Object.freeze({
    depth: "research",
    capabilities: Object.freeze(ALL),
    secondary_hints: true,
    els: "plan_gated_with_controls",
    ai_synthesis: "evidence_pack_first",
    reflection: false,
  }),
});

const clean = (value) => value == null ? "" : String(value).trim().toLowerCase();

function uniq(values) {
  return [...new Set((Array.isArray(values) ? values : []).filter((x) => ALL.includes(x)))];
}

export function resolveResearchProfile(profile = RESEARCH_PROFILE.QUICK, custom = null) {
  const key = clean(profile) || RESEARCH_PROFILE.QUICK;
  if (key !== RESEARCH_PROFILE.CUSTOM) {
    const base = BASE[key] || BASE[RESEARCH_PROFILE.QUICK];
    return Object.freeze({
      version: RESEARCH_PROFILE_VERSION,
      key: BASE[key] ? key : RESEARCH_PROFILE.QUICK,
      ...base,
      capabilities: Object.freeze([...base.capabilities]),
      invariants: Object.freeze({
        profile_changes_retrieval_not_truth: true,
        profile_cannot_canonicalize_or_publish: true,
        entitlement_is_external_to_profile: true,
        canonical_owners_decide_execution: true,
      }),
    });
  }

  const requested = uniq(custom?.capabilities);
  const depth = ["quick", "deep", "research"].includes(clean(custom?.depth))
    ? clean(custom.depth)
    : "research";
  return Object.freeze({
    version: RESEARCH_PROFILE_VERSION,
    key: RESEARCH_PROFILE.CUSTOM,
    depth,
    capabilities: Object.freeze(requested),
    secondary_hints: custom?.secondary_hints === true,
    els: clean(custom?.els) || "plan_gated",
    ai_synthesis: clean(custom?.ai_synthesis) || "evidence_pack_first",
    reflection: custom?.reflection === true,
    invariants: Object.freeze({
      profile_changes_retrieval_not_truth: true,
      profile_cannot_canonicalize_or_publish: true,
      entitlement_is_external_to_profile: true,
      canonical_owners_decide_execution: true,
    }),
  });
}

export default resolveResearchProfile;
