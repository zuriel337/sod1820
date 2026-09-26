import {
  NORMALIZED_MESSAGE_REFLECTION_VERSION,
  THREE_CARD_POSITIONS,
} from "./normalizedMessageReflection.js";
import { SYNTHESIS_STATUS } from "./researchSynthesis.js";

export const NORMALIZED_MESSAGE_REFLECTION_PROJECTION_VERSION =
  "normalized-message-reflection-projection-v1";
export const RAZIEL_REFLECTION_INTENT = "reflect_on_frozen_message";

const clean = (value) => {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
};

function freezeList(items) {
  return Object.freeze(items.map((item) => Object.freeze(item)));
}

function validateEnvelope(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("normalizedMessageReflectionProjection: result object is required");
  }
  if (input.version !== NORMALIZED_MESSAGE_REFLECTION_VERSION) {
    throw new TypeError("normalizedMessageReflectionProjection: unsupported source version");
  }
  if (input.synthesis?.status !== SYNTHESIS_STATUS.COMPOSED) {
    throw new TypeError("normalizedMessageReflectionProjection: synthesis must be composed");
  }
  if (!input.synthesis?.freeze?.frozen) {
    throw new TypeError("normalizedMessageReflectionProjection: synthesis must already be frozen");
  }
  if (clean(input.message) !== clean(input.synthesis?.message)) {
    throw new TypeError("normalizedMessageReflectionProjection: projected message must equal frozen synthesis message");
  }

  const reflection = input.reflection;
  if (!reflection || typeof reflection !== "object" || Array.isArray(reflection)) {
    throw new TypeError("normalizedMessageReflectionProjection: reflection is required");
  }
  if (reflection.evidence_weight !== 0
      || reflection.included_in_research_strength !== false
      || reflection.included_in_empirical_fit !== false
      || reflection.can_modify_frozen_message !== false) {
    throw new TypeError("normalizedMessageReflectionProjection: reflection crossed the evidence boundary");
  }

  const cards = Array.isArray(reflection.cards) ? reflection.cards : [];
  if (cards.length !== THREE_CARD_POSITIONS.length) {
    throw new TypeError("normalizedMessageReflectionProjection: exactly three cards are required");
  }
  const positions = cards.map((card) => clean(card?.position));
  if (positions.some((position, index) => position !== THREE_CARD_POSITIONS[index])) {
    throw new TypeError("normalizedMessageReflectionProjection: card order must be מצב/אתגר/עצה");
  }

  return { reflection, cards };
}

function safeCard(card) {
  return {
    position: clean(card.position),
    n: Number.isInteger(Number(card.n)) ? Number(card.n) : null,
    arcana: clean(card.arcana),
    theme: clean(card.theme),
    meaning: clean(card.meaning),
    letter: clean(card.letter),
    orientation: clean(card.orientation),
  };
}

export function projectNormalizedMessageReflection(input) {
  const { reflection, cards } = validateEnvelope(input);
  const synthesis = input.synthesis;
  const claims = Array.isArray(synthesis.claims) ? synthesis.claims : [];
  const motifs = Array.isArray(synthesis.motifs) ? synthesis.motifs : [];
  const sourceFindingIds = Array.isArray(synthesis.freeze?.source_finding_ids)
    ? synthesis.freeze.source_finding_ids.map(clean).filter(Boolean)
    : [];

  return Object.freeze({
    version: NORMALIZED_MESSAGE_REFLECTION_PROJECTION_VERSION,
    status: clean(synthesis.status) || "unknown",
    message: clean(input.message),
    claims: freezeList(claims.map((claim) => ({
      id: clean(claim?.id),
      text: clean(claim?.text),
      role: clean(claim?.role),
      motif_key: clean(claim?.motif_key),
    }))),
    motifs: freezeList(motifs.map((motif) => ({
      key: clean(motif?.key),
      label: clean(motif?.label),
      summary: clean(motif?.summary),
    }))),
    cards: freezeList(cards.map(safeCard)),
    reflection_framework: clean(reflection.framework),
    trace: Object.freeze({
      source_version: input.version,
      synthesis_contract_version: synthesis.contract_version ?? null,
      frozen_at: clean(synthesis.freeze?.frozen_at),
      synthesis_policy_version: clean(synthesis.freeze?.policy_version),
      source_bundle_contract_version: synthesis.freeze?.source_bundle_contract_version ?? null,
      source_finding_ids: Object.freeze([...sourceFindingIds]),
    }),
    boundaries: Object.freeze({
      message_is_frozen_synthesis: true,
      reflection_only: true,
      tarot_evidence_weight: 0,
      can_modify_frozen_message: false,
      no_local_synthesis: true,
      no_local_truth_promotion: true,
      no_personal_message_engine: true,
    }),
  });
}

export function toRazielMessageReflectionPayload(input) {
  const messageReflection = projectNormalizedMessageReflection(input);
  return Object.freeze({
    razielMicroIntent: RAZIEL_REFLECTION_INTENT,
    messageReflection,
  });
}

export default projectNormalizedMessageReflection;
