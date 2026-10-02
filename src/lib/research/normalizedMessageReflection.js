import { aggregateFindings } from "../nameNormalize.js";
import { normalizeResearchSynthesis, SYNTHESIS_STATUS } from "./researchSynthesis.js";

export const NORMALIZED_MESSAGE_REFLECTION_VERSION = "normalized-message-reflection-v1";
export const THREE_CARD_POSITIONS = Object.freeze(["המצב", "האתגר", "העצה"]);

const clean = (value) => {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
};

function freezeList(items) {
  return Object.freeze(items.map((item) => Object.freeze(item)));
}

function freezeNormalizedFinding(finding) {
  return Object.freeze({
    ...finding,
    source_engines: freezeList((finding?.source_engines || []).map((source) => ({ ...source }))),
    provenance: freezeList((finding?.provenance || []).map((item) => ({ ...item }))),
  });
}

export function buildNormalizedMessageContext(trackLists = []) {
  const findings = aggregateFindings(trackLists).map(freezeNormalizedFinding);
  const valueGroups = new Map();
  for (const finding of findings) {
    if (!Number.isSafeInteger(finding?.value)) continue;
    const group = valueGroups.get(finding.value) || {
      value: finding.value,
      normalized_keys: [],
      source_engines: new Set(),
    };
    group.normalized_keys.push(finding.normalized_key);
    for (const source of finding.source_engines || []) group.source_engines.add(source.engine);
    valueGroups.set(finding.value, group);
  }

  return Object.freeze({
    version: NORMALIZED_MESSAGE_REFLECTION_VERSION,
    findings: Object.freeze(findings),
    numeric_basis_groups: freezeList([...valueGroups.values()].map((group) => ({
      value: group.value,
      normalized_keys: Object.freeze([...new Set(group.normalized_keys)]),
      source_engines: Object.freeze([...group.source_engines]),
      member_count: new Set(group.normalized_keys).size,
      independence: "unresolved_until_dependency_normalization",
    }))),
    ranking_boundary: "normalized presentation order only; engine count is not independent evidence",
  });
}

function normalizeCard(card, expectedPosition) {
  if (!card || typeof card !== "object" || Array.isArray(card)) {
    throw new TypeError(`normalizedMessageReflection: invalid card for ${expectedPosition}`);
  }
  const n = Number(card.n);
  const arcana = clean(card.arcana || card.name);
  if (!Number.isInteger(n) || !arcana) {
    throw new TypeError(`normalizedMessageReflection: card ${expectedPosition} requires integer n + arcana`);
  }
  return {
    position: expectedPosition,
    n,
    arcana,
    theme: clean(card.theme),
    meaning: clean(card.meaning),
    letter: clean(card.letter),
    orientation: clean(card.orientation),
  };
}

export function normalizeThreeCardReflection(rawDraw) {
  const draw = rawDraw?.tarot && typeof rawDraw.tarot === "object" ? rawDraw.tarot : rawDraw;
  const cards = Array.isArray(draw?.cards) ? draw.cards : [];
  if (cards.length !== 3) {
    throw new TypeError("normalizedMessageReflection: reflection requires exactly 3 cards");
  }

  const byPosition = new Map();
  for (const card of cards) {
    const position = clean(card?.position);
    if (!THREE_CARD_POSITIONS.includes(position) || byPosition.has(position)) {
      throw new TypeError("normalizedMessageReflection: cards must be unique מצב/אתגר/עצה positions");
    }
    byPosition.set(position, card);
  }

  const normalizedCards = THREE_CARD_POSITIONS.map((position) => normalizeCard(byPosition.get(position), position));
  return Object.freeze({
    kind: "tarot_reflection",
    status: "observed",
    framework: clean(draw?.framework) || "שלושה קלפים להשראה — מסגרת פרשנית בלבד",
    cards: freezeList(normalizedCards),
    replayable_rng: false,
    evidence_weight: 0,
    included_in_research_strength: false,
    included_in_empirical_fit: false,
    can_modify_frozen_message: false,
    truth_boundary: "reflection only; not evidence, verification, canonical truth, publication authority or prediction",
  });
}

export function createSupabaseThreeCardProvider(supabase) {
  if (!supabase || typeof supabase.rpc !== "function") {
    throw new TypeError("normalizedMessageReflection: Supabase client with rpc() is required");
  }
  return async function drawThreeCards() {
    const { data, error } = await supabase.rpc("fn_tarot_sos", { p_cards: 3 });
    if (error) throw error;
    return data;
  };
}

const TOKEN_STOP = new Set(["של", "את", "עם", "על", "אל", "או", "גם", "לא", "הוא", "היא", "זה", "זו"]);

function textTokens(value) {
  const text = clean(value);
  if (!text) return [];
  return [...new Set(
    text
      .toLocaleLowerCase("he")
      .replace(/[^\u0590-\u05ff\p{L}\p{N}]+/gu, " ")
      .split(/\s+/)
      .map((x) => x.trim())
      .filter((x) => x.length > 1 && !TOKEN_STOP.has(x))
  )];
}

function motifVocabulary(motif) {
  const frame = motif?.frame && typeof motif.frame === "object" ? motif.frame : {};
  return textTokens([
    motif?.label,
    motif?.summary,
    frame.essence,
    frame.power,
    frame.shadow,
    frame.balance,
    frame.action,
  ].filter(Boolean).join(" "));
}

function overlap(a, b) {
  const right = new Set(b);
  return a.filter((token) => right.has(token));
}

/**
 * Deterministic post-Tarot comparison. It never changes the frozen message or evidence.
 * It can only report structural echoes already visible in the card fields and frozen motifs:
 * exact Hebrew-letter recurrence and lexical token overlap with motif label/summary/frame.
 */
export function compareReflectionToFrozenSynthesis({ reflection, synthesis, subject = null } = {}) {
  const cards = Array.isArray(reflection?.cards) ? reflection.cards : [];
  const motifs = Array.isArray(synthesis?.motifs) ? synthesis.motifs : [];
  const subjectLetters = new Set([...(clean(subject) || "").replace(/[^\u0590-\u05ff]/g, "")]);

  const compared = cards.map((card) => {
    const cardLetter = clean(card?.letter);
    const letterMatch = Boolean(cardLetter && subjectLetters.has(cardLetter));
    const cardTokens = textTokens([card?.arcana, card?.theme, card?.meaning].filter(Boolean).join(" "));

    const motifMatches = motifs.map((motif) => {
      const shared = overlap(cardTokens, motifVocabulary(motif));
      return shared.length ? {
        motif_key: clean(motif?.key),
        shared_tokens: Object.freeze(shared),
      } : null;
    }).filter(Boolean);

    const relation = letterMatch || motifMatches.length ? "echo" : "no_structural_echo";
    return Object.freeze({
      position: clean(card?.position),
      card_n: Number.isInteger(Number(card?.n)) ? Number(card.n) : null,
      card_letter: cardLetter,
      letter_in_subject: letterMatch,
      motif_matches: Object.freeze(motifMatches),
      relation,
    });
  });

  const echoCount = compared.filter((x) => x.relation === "echo").length;
  return Object.freeze({
    kind: "reflection_coherence",
    status: "observed",
    cards: Object.freeze(compared),
    echo_count: echoCount,
    card_count: compared.length,
    evidence_weight: 0,
    included_in_research_strength: false,
    can_modify_frozen_message: false,
    truth_boundary: "structural reflection only; echo is not confirmation, verification, probability or truth",
  });
}

// Explicit-freeze guard (load-bearing): only an affirmative freeze.frozen===true
// in the RAW synthesis draft may unlock a Tarot draw.
function requireExplicitFreezeIntent(synthesisDraft) {
  const draftFreeze = synthesisDraft && typeof synthesisDraft === "object" && !Array.isArray(synthesisDraft)
    ? synthesisDraft.freeze
    : undefined;
  const explicitlyFrozen = draftFreeze
    && typeof draftFreeze === "object"
    && !Array.isArray(draftFreeze)
    && draftFreeze.frozen === true;
  if (!explicitlyFrozen) {
    throw new TypeError("normalizedMessageReflection: synthesizer must explicitly set freeze.frozen === true before reflection");
  }
}

export async function composeNormalizedMessageReflection({
  trackLists = [],
  bundle = null,
  synthesizer,
  tarotProvider,
  frozenAt = null,
} = {}) {
  if (typeof synthesizer !== "function") {
    throw new TypeError("normalizedMessageReflection: synthesizer function is required");
  }
  if (typeof tarotProvider !== "function") {
    throw new TypeError("normalizedMessageReflection: tarotProvider function is required");
  }

  // Order is load-bearing: normalize first, synthesize/freeze second, draw cards last.
  const normalized = buildNormalizedMessageContext(trackLists);
  const safeBundle = bundle && typeof bundle === "object" && !Array.isArray(bundle) ? bundle : null;
  const allowedFindingIds = Array.isArray(safeBundle?.findings)
    ? safeBundle.findings.map((finding) => clean(finding?.id)).filter(Boolean)
    : [];

  const synthesisDraft = await synthesizer({ bundle: safeBundle, normalized });
  requireExplicitFreezeIntent(synthesisDraft);

  const synthesis = normalizeResearchSynthesis(synthesisDraft, {
    allowedFindingIds,
    frozenAt,
    sourceBundleContractVersion: safeBundle?.contract_version ?? null,
  });
  if (synthesis?.status !== SYNTHESIS_STATUS.COMPOSED) {
    throw new TypeError("normalizedMessageReflection: reflection requires composed synthesis");
  }
  if (!synthesis?.freeze?.frozen) {
    throw new TypeError("normalizedMessageReflection: synthesis must be frozen before reflection");
  }

  const rawDraw = await tarotProvider({ cards: 3 });
  const reflection = normalizeThreeCardReflection(rawDraw);
  const reflectionCheck = compareReflectionToFrozenSynthesis({
    reflection,
    synthesis,
    subject: safeBundle?.query?.raw_input,
  });

  return Object.freeze({
    version: NORMALIZED_MESSAGE_REFLECTION_VERSION,
    message: synthesis.message,
    normalized,
    synthesis,
    reflection,
    reflection_check: reflectionCheck,
    invariants: Object.freeze({
      one_message_authority: true,
      normalize_before_synthesis: true,
      synthesis_freeze_before_tarot: true,
      synthesis_freeze_must_be_explicit: true,
      tarot_exactly_three_cards: true,
      tarot_is_reflection_only: true,
      tarot_never_changes_claims: true,
      reflection_check_is_post_freeze: true,
      reflection_check_is_not_confirmation: true,
      legacy_number_message_is_not_authority: true,
      legacy_random_reading_is_not_authority: true,
      no_personal_message_engine: true,
      no_auto_canonicalization: true,
      no_auto_publication: true,
    }),
  });
}

export default composeNormalizedMessageReflection;
