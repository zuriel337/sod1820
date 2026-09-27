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

function freezeStringList(values) {
  return Object.freeze((Array.isArray(values) ? values : []).map((value) => String(value)));
}

function freezeSampleRows(values) {
  return freezeList((Array.isArray(values) ? values : []).map((row) => ({
    phrase: clean(row?.phrase),
    method: clean(row?.method),
    value: Number.isSafeInteger(Number(row?.value)) ? Number(row.value) : null,
    atomic_or_composite: clean(row?.atomic_or_composite),
    bid_id: clean(row?.bid_id),
    word_id: clean(row?.word_id),
    method_version: Number.isSafeInteger(Number(row?.method_version)) ? Number(row.method_version) : null,
  })));
}

export function normalizedCrossSignaturesFromBundle(bundle) {
  const findings = Array.isArray(bundle?.findings) ? bundle.findings : [];
  return freezeList(findings
    .filter((finding) => finding?.kind === "cross-signature")
    .map((finding) => {
      const signature = finding?.projection?.dimensions?.cross_signature;
      if (!signature || typeof signature !== "object" || Array.isArray(signature)) return null;
      const value = Number(signature.value ?? finding?.subject?.value ?? finding?.subject?.label);
      if (!Number.isSafeInteger(value)) return null;
      return {
        source_finding_id: clean(finding.id),
        value,
        phrase_count: Number.isSafeInteger(Number(signature.phrase_count)) ? Number(signature.phrase_count) : null,
        independent_phrase_count: Number.isSafeInteger(Number(signature.independent_phrase_count)) ? Number(signature.independent_phrase_count) : null,
        dependent_expression_phrase_count: Number.isSafeInteger(Number(signature.dependent_expression_phrase_count)) ? Number(signature.dependent_expression_phrase_count) : null,
        p1_hits: Number.isSafeInteger(Number(signature.p1_hits)) ? Number(signature.p1_hits) : null,
        independent_p1_method_count: Number.isSafeInteger(Number(signature.independent_p1_method_count)) ? Number(signature.independent_p1_method_count) : null,
        methods: freezeStringList(signature.methods),
        dependent_methods: freezeStringList(signature.dependent_methods),
        dependent_phrase_count: Number.isSafeInteger(Number(signature.dependent_phrase_count)) ? Number(signature.dependent_phrase_count) : null,
        unregistered_methods: freezeStringList(signature.unregistered_methods),
        signal: clean(signature.signal),
        core_presence: Object.freeze({
          regular: signature?.core_presence?.regular === true,
          hidden: signature?.core_presence?.hidden === true,
          triangle: signature?.core_presence?.triangle === true,
        }),
        sample_rows: freezeSampleRows(signature.sample_rows),
        sample_window: Object.freeze({
          returned_count: Number.isSafeInteger(Number(signature?.sample_window?.returned_count))
            ? Number(signature.sample_window.returned_count) : null,
          total_count: Number.isSafeInteger(Number(signature?.sample_window?.total_count))
            ? Number(signature.sample_window.total_count) : null,
          truncated: typeof signature?.sample_window?.truncated === "boolean"
            ? signature.sample_window.truncated : null,
        }),
        independence_source: clean(signature.independence_source) || "public.cross_method_strength",
        truth_boundary: clean(signature.truth_boundary)
          || "Cross signature is synthesis fuel; convergence/derivation only, never independent truth by itself",
      };
    })
    .filter(Boolean));
}

export function buildNormalizedMessageContext(trackLists = [], { bundle = null } = {}) {
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

  const crossSignatures = normalizedCrossSignaturesFromBundle(bundle);

  return Object.freeze({
    version: NORMALIZED_MESSAGE_REFLECTION_VERSION,
    findings: Object.freeze(findings),
    cross_signatures: crossSignatures,
    numeric_basis_groups: freezeList([...valueGroups.values()].map((group) => ({
      value: group.value,
      normalized_keys: Object.freeze([...new Set(group.normalized_keys)]),
      source_engines: Object.freeze([...group.source_engines]),
      member_count: new Set(group.normalized_keys).size,
      independence: "unresolved_until_dependency_normalization",
    }))),
    ranking_boundary: "normalized presentation order only; engine/method count is not independent evidence until canonical dependency normalization says so",
    cross_signature_boundary: "cross_method_strength owns dependency normalization; this layer only projects supplied independent/dependent counts",
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

// Explicit-freeze guard (load-bearing): researchSynthesis.normalizeResearchSynthesis defaults
// freeze.frozen to true whenever the synthesizer's draft omits `freeze` entirely. This seam must
// never inherit that default — only a synthesizer draft that itself affirmatively sets
// freeze.frozen === true may unlock a Tarot draw. Checked against the RAW draft, before
// normalization, so a defaulted-true value can never be mistaken for an affirmative one.
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
  const safeBundle = bundle && typeof bundle === "object" && !Array.isArray(bundle) ? bundle : null;
  const normalized = buildNormalizedMessageContext(trackLists, { bundle: safeBundle });
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

  return Object.freeze({
    version: NORMALIZED_MESSAGE_REFLECTION_VERSION,
    message: synthesis.message,
    normalized,
    synthesis,
    reflection,
    invariants: Object.freeze({
      one_message_authority: true,
      normalize_before_synthesis: true,
      synthesis_freeze_before_tarot: true,
      synthesis_freeze_must_be_explicit: true,
      tarot_exactly_three_cards: true,
      tarot_is_reflection_only: true,
      tarot_never_changes_claims: true,
      legacy_number_message_is_not_authority: true,
      legacy_random_reading_is_not_authority: true,
      no_personal_message_engine: true,
      no_auto_canonicalization: true,
      no_auto_publication: true,
    }),
  });
}

export default composeNormalizedMessageReflection;
