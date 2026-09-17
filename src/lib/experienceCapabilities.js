// SOD1820 — Experience Capability Contract 2029
// EXTEND_EXISTING only. This is a semantic vocabulary/projection contract, not
// a new entitlement engine, pricing system, credit store or capability registry.
// Availability remains owned by site_flags_lock_law; entitlement remains owned
// by platform_tiers_law; pricing/allocation remains Human-Gate product policy.

export const EXPERIENCE_CAPABILITY = Object.freeze({
  POST_LISTEN: "post_listen",
  RAZIEL_VOICE: "raziel_voice",
  RAZIEL_LIVE_RESEARCH: "raziel_live_research",
  RESEARCH_AUDIO_BRIEF: "research_audio_brief",
  DEEP_RESEARCH: "deep_research",
  PRIVATE_RESEARCH_CORPUS: "private_research_corpus",
  RESEARCH_TO_MEDIA: "research_to_media",
  GUIDED_SPATIAL: "guided_spatial",
  PROACTIVE_RESEARCH_PULSE: "proactive_research_pulse",
  CROSS_CHANNEL_COMPANION: "cross_channel_companion",
});

export const USAGE_RESOURCE = Object.freeze({
  CACHED_MEDIA_DELIVERY: "cached_media_delivery",
  TEXT_REASONING_TOKENS: "text_reasoning_tokens",
  AUDIO_SESSION_SECONDS: "audio_session_seconds",
  SPEECH_GENERATION: "speech_generation",
  TRANSCRIPTION: "transcription",
  TOOL_CALLS: "tool_calls",
  BACKGROUND_RUNS: "background_runs",
  MEDIA_GENERATION: "media_generation",
  STORAGE_INDEXING_BYTES: "storage_indexing_bytes",
  CLIENT_GPU: "client_gpu",
});

const C = EXPERIENCE_CAPABILITY;
const R = USAGE_RESOURCE;

// Exact tier names, prices and allowances are deliberately absent.
const CAPABILITY_CONTRACTS = Object.freeze({
  [C.POST_LISTEN]: Object.freeze({
    availabilityFlag: "lock_post_listen",
    actionLabelHe: "האזן לפוסט",
    entitlement: "resolve_server_side",
    meters: Object.freeze([R.SPEECH_GENERATION, R.CACHED_MEDIA_DELIVERY]),
    costPolicy: "generate_once_cache_when_stable",
    fallback: "read_text",
  }),
  [C.RAZIEL_VOICE]: Object.freeze({
    availabilityFlag: "lock_raziel_voice",
    actionLabelHe: "דבר עם רזיאל",
    entitlement: "resolve_server_side",
    meters: Object.freeze([R.AUDIO_SESSION_SECONDS, R.TEXT_REASONING_TOKENS, R.TOOL_CALLS]),
    costPolicy: "live_session_metered",
    fallback: "raziel_text",
  }),
  [C.RAZIEL_LIVE_RESEARCH]: Object.freeze({
    availabilityFlag: "lock_raziel_voice",
    actionLabelHe: "חקור עם רזיאל בקול",
    entitlement: "resolve_server_side",
    meters: Object.freeze([R.AUDIO_SESSION_SECONDS, R.TEXT_REASONING_TOKENS, R.TOOL_CALLS]),
    costPolicy: "live_voice_plus_adaptive_research",
    fallback: "raziel_text_research",
  }),
  [C.RESEARCH_AUDIO_BRIEF]: Object.freeze({
    availabilityFlag: "lock_research_audio_brief",
    actionLabelHe: "צור תדריך קולי",
    entitlement: "resolve_server_side",
    meters: Object.freeze([R.TEXT_REASONING_TOKENS, R.SPEECH_GENERATION, R.CACHED_MEDIA_DELIVERY]),
    costPolicy: "generate_then_cache_when_reusable",
    fallback: "text_brief",
  }),
  [C.DEEP_RESEARCH]: Object.freeze({
    availabilityFlag: null,
    actionLabelHe: "מחקר עמוק",
    entitlement: "resolve_server_side",
    meters: Object.freeze([R.TEXT_REASONING_TOKENS, R.TOOL_CALLS]),
    costPolicy: "bounded_research_budget",
    fallback: "deterministic_or_standard_research",
  }),
  [C.PRIVATE_RESEARCH_CORPUS]: Object.freeze({
    availabilityFlag: "lock_private_research_corpus",
    actionLabelHe: "הוסף למרחב המחקר הפרטי",
    entitlement: "resolve_server_side",
    meters: Object.freeze([R.STORAGE_INDEXING_BYTES, R.TEXT_REASONING_TOKENS]),
    costPolicy: "storage_plus_indexing_plus_query",
    fallback: "public_canonical_sources_only",
  }),
  [C.RESEARCH_TO_MEDIA]: Object.freeze({
    availabilityFlag: "lock_research_to_media",
    actionLabelHe: "הפוך את המחקר למדיה",
    entitlement: "resolve_server_side",
    meters: Object.freeze([R.TEXT_REASONING_TOKENS, R.MEDIA_GENERATION, R.SPEECH_GENERATION]),
    costPolicy: "generation_metered",
    fallback: "canonical_share_card",
  }),
  [C.GUIDED_SPATIAL]: Object.freeze({
    availabilityFlag: "lock_guided_spatial",
    actionLabelHe: "פתח חוויה מרחבית",
    entitlement: "resolve_server_side",
    meters: Object.freeze([R.CLIENT_GPU]),
    costPolicy: "client_render_first_server_ai_only_when_needed",
    fallback: "layered_2d",
  }),
  [C.PROACTIVE_RESEARCH_PULSE]: Object.freeze({
    availabilityFlag: "lock_proactive_research_pulse",
    actionLabelHe: "הפעל Research Pulse",
    entitlement: "resolve_server_side",
    meters: Object.freeze([R.BACKGROUND_RUNS, R.TEXT_REASONING_TOKENS, R.TOOL_CALLS]),
    costPolicy: "bounded_background_budget_silence_gate",
    fallback: "manual_resume",
  }),
  [C.CROSS_CHANNEL_COMPANION]: Object.freeze({
    availabilityFlag: "lock_cross_channel_companion",
    actionLabelHe: "המשך עם רזיאל בערוץ אחר",
    entitlement: "resolve_server_side",
    meters: Object.freeze([R.TEXT_REASONING_TOKENS, R.TOOL_CALLS]),
    costPolicy: "channel_adapter_plus_ai_usage",
    fallback: "website_only",
  }),
});

export function getExperienceCapabilityContract(capability) {
  const contract = CAPABILITY_CONTRACTS[capability];
  if (!contract) throw new Error(`Unknown SOD1820 experience capability: ${capability}`);
  return contract;
}

// Composer only: caller supplies already-resolved canonical states.
// This function MUST NOT query subscriptions, balances or site_flags itself.
export function composeCapabilityProjection(capability, {
  availability = "unresolved",
  entitlement = "unresolved",
  budget = "unresolved",
} = {}) {
  const contract = getExperienceCapabilityContract(capability);
  return Object.freeze({
    capability,
    ...contract,
    availability,
    entitlement,
    budget,
    serverGateRequiredBeforeExpensiveIO: true,
    pricingCanonicalHere: false,
  });
}
