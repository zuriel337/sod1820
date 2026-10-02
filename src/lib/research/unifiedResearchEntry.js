import {
  RESEARCH_IDENTITY_CONFIDENCE,
  RESEARCH_IDENTITY_SOURCE,
  resolveResearchIdentities,
} from "./researchIdentityResolver.js";
import { buildResearchPlanV2 } from "./researchPlanV2.js";
import { resolveResearchProfile, RESEARCH_PROFILE } from "./researchProfiles.js";

export const UNIFIED_RESEARCH_ENTRY_VERSION = "unified-research-entry-v1";

export const INPUT_KIND = Object.freeze({
  NUMBER: "number",
  EXPRESSION: "expression",
  QUESTION: "question",
  DATE: "date",
  PERSON_REF: "person_ref",
  MEDIA: "media",
  SOURCE_REF: "source_ref",
  EVENT_REF: "event_ref",
  MIXED: "mixed",
  UNKNOWN: "unknown",
});

export const ENTRY_DESTINATION = Object.freeze({
  INSPECT: "inspect",
  FULL: "full",
  RAZIEL: "raziel",
  JOURNEY: "journey",
  HEICHAL: "heichal",
  INTAKE: "intake",
});

const clean = (value) => value == null ? "" : String(value).trim();

function numericLiteral(text) {
  const t = clean(text);
  return /^\d+$/.test(t) ? String(Number(t)) : null;
}

function isoDate(text) {
  const t = clean(text);
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
}

function looksQuestion(text) {
  const t = clean(text);
  return /[?？]$/.test(t) || /^(האם|למה|איך|מה |מי |מתי |איפה |יש קשר)/.test(t);
}

function structuredCandidates(input) {
  const out = [];
  if (input?.personRef) {
    out.push({
      type: "person",
      ref: String(input.personRef),
      label: clean(input.personLabel) || "אדם",
      source: RESEARCH_IDENTITY_SOURCE.EXPLICIT_REF,
      confidence: RESEARCH_IDENTITY_CONFIDENCE.EXACT,
      access: { tier: "personal" },
    });
  }
  if (input?.eventRef) {
    out.push({
      type: "event",
      ref: String(input.eventRef),
      label: clean(input.eventLabel) || "אירוע",
      source: RESEARCH_IDENTITY_SOURCE.EXPLICIT_REF,
      confidence: RESEARCH_IDENTITY_CONFIDENCE.EXACT,
    });
  }
  if (input?.sourceRef) {
    out.push({
      type: input.sourceType || "source",
      ref: String(input.sourceRef),
      label: clean(input.sourceLabel) || "מקור",
      source: RESEARCH_IDENTITY_SOURCE.EXPLICIT_REF,
      confidence: RESEARCH_IDENTITY_CONFIDENCE.EXACT,
    });
  }
  return out;
}

export function classifyUnifiedResearchInput(input = {}) {
  const text = clean(input.text);
  const candidates = structuredCandidates(input);
  const hasMedia = Boolean(input.mediaRef || input.file || input.image || input.assetRef);
  const hasStructured = candidates.length > 0;
  const number = numericLiteral(text);
  const date = isoDate(text);

  if (hasMedia && (text || hasStructured)) return INPUT_KIND.MIXED;
  if (hasMedia) return INPUT_KIND.MEDIA;
  if (hasStructured && text) return INPUT_KIND.MIXED;
  if (input.personRef) return INPUT_KIND.PERSON_REF;
  if (input.eventRef) return INPUT_KIND.EVENT_REF;
  if (input.sourceRef) return INPUT_KIND.SOURCE_REF;
  if (number) return INPUT_KIND.NUMBER;
  if (date) return INPUT_KIND.DATE;
  if (looksQuestion(text)) return INPUT_KIND.QUESTION;
  if (text) return INPUT_KIND.EXPRESSION;
  return INPUT_KIND.UNKNOWN;
}

function candidatesFromInput(input, kind) {
  const out = structuredCandidates(input);
  const text = clean(input.text);

  if (kind === INPUT_KIND.NUMBER) {
    out.push({
      type: "number",
      value: Number(text),
      label: text,
      source: RESEARCH_IDENTITY_SOURCE.NUMERIC_LITERAL,
      confidence: RESEARCH_IDENTITY_CONFIDENCE.EXACT,
    });
  } else if (kind === INPUT_KIND.DATE) {
    out.push({
      type: "entity",
      identity_key: `date:${text}`,
      label: text,
      source: RESEARCH_IDENTITY_SOURCE.TEXT_MATCH,
      confidence: RESEARCH_IDENTITY_CONFIDENCE.EXACT,
      metadata: { input_kind: "date" },
    });
  } else if ([INPUT_KIND.EXPRESSION, INPUT_KIND.QUESTION, INPUT_KIND.MIXED].includes(kind) && text) {
    out.push({
      type: "phrase",
      label: text,
      source: RESEARCH_IDENTITY_SOURCE.TEXT_MATCH,
      confidence: RESEARCH_IDENTITY_CONFIDENCE.CANDIDATE,
    });
  }
  return out;
}

function intentFor(kind) {
  if (kind === INPUT_KIND.NUMBER) return "research";
  if (kind === INPUT_KIND.DATE) return "research";
  if (kind === INPUT_KIND.PERSON_REF) return "research";
  if (kind === INPUT_KIND.QUESTION) return "research";
  if (kind === INPUT_KIND.MEDIA) return "intake";
  if (kind === INPUT_KIND.SOURCE_REF) return "source";
  if (kind === INPUT_KIND.EVENT_REF) return "research";
  return "research";
}

function projectionHints({ kind, resolution, input }) {
  const primary = resolution?.primary || null;
  const numberValue = primary?.type === "number" ? Number(primary.value ?? primary.label) : null;
  const fullHref = Number.isFinite(numberValue) ? `/2029/number/${numberValue}` : null;
  const intakeRequired = [INPUT_KIND.MEDIA, INPUT_KIND.MIXED].includes(kind) && Boolean(input?.mediaRef || input?.file || input?.image || input?.assetRef);

  return Object.freeze({
    default_destination: intakeRequired
      ? ENTRY_DESTINATION.INTAKE
      : primary ? ENTRY_DESTINATION.INSPECT : ENTRY_DESTINATION.RAZIEL,
    destinations: Object.freeze({
      inspect: Boolean(primary),
      full: Boolean(fullHref),
      full_href: fullHref,
      raziel: true,
      journey: Boolean(primary),
      heichal: Boolean(primary),
      intake: intakeRequired,
    }),
    boundaries: Object.freeze({
      inspect_is_contextual_projection: true,
      full_page_is_entity_projection: true,
      raziel_is_optional_consumer_not_engine: true,
      journey_is_path_not_truth_store: true,
      heichal_is_deep_mode_not_tool_owner: true,
      sidebar_is_navigation_not_research_router: true,
      bottom_surface_is_context_path_action_not_second_navigation: true,
    }),
  });
}

export function buildUnifiedResearchEntry({
  input = {},
  profile = RESEARCH_PROFILE.QUICK,
  customProfile = null,
  authorizationContext = null,
  contextType = "public_user",
  surfaceContext = null,
  requestedCapabilities = [],
} = {}) {
  const kind = classifyUnifiedResearchInput(input);
  const profileResolved = resolveResearchProfile(profile, customProfile);
  const rawText = clean(input.text);
  const candidates = candidatesFromInput(input, kind);
  const explicitTextComputation = input.explicitTextComputation === true
    || [INPUT_KIND.EXPRESSION, INPUT_KIND.QUESTION].includes(kind);

  const resolution = resolveResearchIdentities({
    candidates,
    rawInput: rawText || null,
    explicitTextComputation,
  });

  const plan = kind === INPUT_KIND.MEDIA
    ? null
    : buildResearchPlanV2({
        question: kind === INPUT_KIND.QUESTION ? rawText : clean(input.question),
        intent: intentFor(kind),
        identityResolution: resolution,
        authorizationContext,
        contextType,
        surfaceContext,
        requestedCapabilities,
        capabilityAllowlist: profileResolved.capabilities,
        requestedDepth: profileResolved.depth,
      });

  return Object.freeze({
    version: UNIFIED_RESEARCH_ENTRY_VERSION,
    input_kind: kind,
    profile: profileResolved,
    identity_resolution: resolution,
    plan,
    projection: projectionHints({ kind, resolution, input }),
    intake: Object.freeze({
      required: [INPUT_KIND.MEDIA, INPUT_KIND.MIXED].includes(kind)
        && Boolean(input?.mediaRef || input?.file || input?.image || input?.assetRef),
      media_ref: clean(input.mediaRef || input.assetRef) || null,
      source_ref: clean(input.sourceRef) || null,
      boundary: "intake extracts/represents first; extracted material re-enters the same resolver/plan chain",
    }),
    invariants: Object.freeze({
      one_entry_many_capabilities: true,
      no_super_engine: true,
      resolver_does_not_execute_domain_truth: true,
      profile_limits_retrieval_not_truth: true,
      legacy_namelab_is_not_architecture_authority: true,
      canonical_owners_decide_execution: true,
      no_auto_canonicalization: true,
      no_auto_publication: true,
    }),
  });
}

export default buildUnifiedResearchEntry;
