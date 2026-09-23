import { stableIdentityDigest } from "./researchRepresentations.js";

// F5 — Corpus Baseline + Semantic Expansion candidate contract.
// Expansion changes expectedness; semantic volume never substitutes for provenance or controls.
//
// This module owns no corpus row, dictionary, graph edge, ontology, admission
// decision, or semantic truth. It composes metrics and candidate envelopes over
// existing owners:
//
// - corpus_admission_* + Gematria owners: exact Expression/corpus admission;
// - maftech_lexicon / source owners: lexical coverage inputs;
// - Research OS: candidate semantic relations/evidence;
// - Reality Graph: durable typed relation only after its normal qualification;
// - Human Gate: promotion/canonical/public decisions.
//
// Important:
// - adding words increases the search space, so rarity/base-rates can become stale;
// - semantic similarity != identity != alias != equal Gematria value;
// - model-proposed semantics are candidates, never automatic graph/corpus truth.

export const CORPUS_BASELINE_CONTRACT_VERSION = 1;
export const SEMANTIC_EXPANSION_CONTRACT_VERSION = 1;

export const SEMANTIC_RESEARCH_ROLE = Object.freeze({
  SYNONYM_CANDIDATE: "synonym_candidate",
  ANTONYM_CANDIDATE: "antonym_candidate",
  CONTRAST_CANDIDATE: "contrast_candidate",
  SAME_ROOT_FAMILY_CANDIDATE: "same_root_family_candidate",
  DERIVED_FROM_ROOT_CANDIDATE: "derived_from_root_candidate",
  WHOLE_PART_CANDIDATE: "whole_part_candidate",
  AGENT_ACTION_CANDIDATE: "agent_action_candidate",
  CAUSE_EFFECT_CANDIDATE: "cause_effect_candidate",
  CONCEPT_EXPRESSION_CANDIDATE: "concept_expression_candidate",
  TRANSLATION_CANDIDATE: "translation_candidate",
});

const VALID_SEMANTIC_ROLES = new Set(Object.values(SEMANTIC_RESEARCH_ROLE));

const SYMMETRIC_SEMANTIC_ROLES = new Set([
  SEMANTIC_RESEARCH_ROLE.SYNONYM_CANDIDATE,
  SEMANTIC_RESEARCH_ROLE.ANTONYM_CANDIDATE,
  SEMANTIC_RESEARCH_ROLE.CONTRAST_CANDIDATE,
  SEMANTIC_RESEARCH_ROLE.SAME_ROOT_FAMILY_CANDIDATE,
]);

export const SEMANTIC_EVIDENCE_CLASS = Object.freeze({
  SOURCE_ATTESTED: "source_attested",
  HUMAN_CURATED: "human_curated",
  ENGINE_DERIVED: "engine_derived",
  MODEL_PROPOSED: "model_proposed",
  CORPUS_STATISTICAL: "corpus_statistical",
  NEGATIVE_CONTROL: "negative_control",
});

export const SEMANTIC_SELECTION_MODE = Object.freeze({
  PRE_NUMERIC_SOURCE: "pre_numeric_source",
  PRE_NUMERIC_HUMAN: "pre_numeric_human",
  NUMERIC_BLINDED_CORPUS: "numeric_blinded_corpus",
  POST_NUMERIC_INTERPRETATION: "post_numeric_interpretation",
  UNKNOWN: "unknown",
});

const VALID_EVIDENCE_CLASSES = new Set(Object.values(SEMANTIC_EVIDENCE_CLASS));
const VALID_SELECTION_MODES = new Set(Object.values(SEMANTIC_SELECTION_MODE));
const NUMERIC_INDEPENDENT_SELECTION_MODES = new Set([
  SEMANTIC_SELECTION_MODE.PRE_NUMERIC_SOURCE,
  SEMANTIC_SELECTION_MODE.PRE_NUMERIC_HUMAN,
  SEMANTIC_SELECTION_MODE.NUMERIC_BLINDED_CORPUS,
]);

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function nonNegativeInt(value, label) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {
    throw new TypeError(`corpusBaseline: ${label} must be a non-negative integer`);
  }
  return n;
}

function finiteNonNegative(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new TypeError(`corpusBaseline: ${label} must be a non-negative number`);
  }
  return n;
}

function uniqueText(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(clean).filter(Boolean))];
}

function pct(numerator, denominator) {
  if (!denominator) return null;
  return Math.round((10000 * numerator) / denominator) / 100;
}

function canonical(value) {
  if (value === undefined) return null;
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonical);
  const out = {};
  for (const key of Object.keys(value).sort()) {
    const child = value[key];
    if (child !== undefined) out[key] = canonical(child);
  }
  return out;
}

function fingerprint(value) {
  return `cb1:${stableIdentityDigest(JSON.stringify(canonical(value)))}`;
}

function countMap(input) {
  if (!input) return {};
  if (Array.isArray(input)) {
    const out = {};
    for (const row of input) {
      const key = clean(row?.key ?? row?.type ?? row?.relation_type ?? row?.category);
      if (!key) continue;
      out[key] = nonNegativeInt(row?.count ?? row?.rows ?? 0, `count for ${key}`);
    }
    return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
  }
  if (typeof input === "object") {
    const out = {};
    for (const [key, value] of Object.entries(input)) {
      out[key] = nonNegativeInt(value, `count for ${key}`);
    }
    return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
  }
  throw new TypeError("corpusBaseline: count map must be object or array");
}

function assertSubset(child, parent, label) {
  if (child > parent) {
    throw new TypeError(`corpusBaseline: ${label} cannot exceed parent population`);
  }
}

export function normalizeCorpusBaseline(input = {}) {
  const gematria = input.gematria_words || input.gematriaWords || {};
  const lexicon = input.maftech_lexicon || input.maftechLexicon || {};
  const aliases = input.word_aliases || input.wordAliases || {};
  const graph = input.graph || {};
  const relationEvidence = input.relation_evidence || input.relationEvidence || {};

  const gTotal = nonNegativeInt(gematria.total ?? 0, "gematria_words.total");
  const gVerified = nonNegativeInt(gematria.verified ?? 0, "gematria_words.verified");
  const gPublished = nonNegativeInt(gematria.published ?? 0, "gematria_words.published");
  const gGraph = nonNegativeInt(gematria.graph_linked ?? gematria.graphLinked ?? 0, "gematria_words.graph_linked");
  const gTagged = nonNegativeInt(gematria.tagged ?? 0, "gematria_words.tagged");
  const gHebrew = nonNegativeInt(gematria.hebrew_like ?? gematria.hebrewLike ?? 0, "gematria_words.hebrew_like");
  const gSources = nonNegativeInt(gematria.sources ?? 0, "gematria_words.sources");

  for (const [value, label] of [
    [gVerified, "verified"],
    [gPublished, "published"],
    [gGraph, "graph_linked"],
    [gTagged, "tagged"],
    [gHebrew, "hebrew_like"],
  ]) assertSubset(value, gTotal, `gematria_words.${label}`);

  const lTotal = nonNegativeInt(lexicon.total ?? 0, "maftech_lexicon.total");
  const lTanach = nonNegativeInt(lexicon.tanach ?? 0, "maftech_lexicon.tanach");
  const lCore = nonNegativeInt(lexicon.core ?? 0, "maftech_lexicon.core");
  const lBoth = nonNegativeInt(lexicon.tanach_and_core ?? lexicon.tanachAndCore ?? 0, "maftech_lexicon.tanach_and_core");
  assertSubset(lTanach, lTotal, "maftech_lexicon.tanach");
  assertSubset(lCore, lTotal, "maftech_lexicon.core");
  assertSubset(lBoth, lTanach, "maftech_lexicon.tanach_and_core/tanach");
  assertSubset(lBoth, lCore, "maftech_lexicon.tanach_and_core/core");

  const aliasTotal = nonNegativeInt(aliases.total ?? 0, "word_aliases.total");
  const aliasVerified = nonNegativeInt(aliases.verified ?? 0, "word_aliases.verified");
  assertSubset(aliasVerified, aliasTotal, "word_aliases.verified");

  const edgeTotal = nonNegativeInt(graph.total_edges ?? graph.totalEdges ?? graph.total ?? 0, "graph.total_edges");
  const relationEvidenceTotal = nonNegativeInt(
    relationEvidence.total ?? 0,
    "relation_evidence.total"
  );

  const normalized = {
    contract_version: CORPUS_BASELINE_CONTRACT_VERSION,
    snapshot_ref: clean(input.snapshot_ref || input.snapshotRef),
    generated_at: clean(input.generated_at || input.generatedAt),
    corpus_versions: {
      gematria: clean(input.corpus_versions?.gematria || input.corpusVersions?.gematria),
      lexicon: clean(input.corpus_versions?.lexicon || input.corpusVersions?.lexicon),
      graph: clean(input.corpus_versions?.graph || input.corpusVersions?.graph),
      semantic_relations: clean(
        input.corpus_versions?.semantic_relations
        || input.corpusVersions?.semanticRelations
      ),
    },
    gematria_words: {
      total: gTotal,
      verified: gVerified,
      published: gPublished,
      graph_linked: gGraph,
      tagged: gTagged,
      hebrew_like: gHebrew,
      sources: gSources,
      category_counts: countMap(gematria.category_counts || gematria.categoryCounts),
      coverage_percent: {
        verified: pct(gVerified, gTotal),
        published: pct(gPublished, gTotal),
        graph_linked: pct(gGraph, gTotal),
        tagged: pct(gTagged, gTotal),
        hebrew_like: pct(gHebrew, gTotal),
      },
    },
    maftech_lexicon: {
      total: lTotal,
      tanach: lTanach,
      core: lCore,
      tanach_and_core: lBoth,
      coverage_percent: {
        tanach: pct(lTanach, lTotal),
        core: pct(lCore, lTotal),
        tanach_and_core: pct(lBoth, lTotal),
      },
    },
    word_aliases: {
      total: aliasTotal,
      verified: aliasVerified,
      type_counts: countMap(aliases.type_counts || aliases.typeCounts),
    },
    graph: {
      total_edges: edgeTotal,
      relation_type_counts: countMap(
        graph.relation_type_counts || graph.relationTypeCounts
      ),
    },
    relation_evidence: {
      total: relationEvidenceTotal,
      relation_type_counts: countMap(
        relationEvidence.relation_type_counts || relationEvidence.relationTypeCounts
      ),
      status_counts: countMap(
        relationEvidence.status_counts || relationEvidence.statusCounts
      ),
    },
    invariants: {
      lexical_volume_is_not_semantic_coverage: true,
      tags_are_not_canonical_relations: true,
      aliases_are_identity_variants_not_general_synonyms: true,
      semantic_relation_count_is_not_relation_truth: true,
      corpus_growth_changes_search_space: true,
      stale_rarity_labels_must_not_survive_material_baseline_change: true,
    },
  };

  return Object.freeze({
    ...normalized,
    baseline_fingerprint: fingerprint(normalized),
    fingerprint_kind: "deterministic_change_detection_not_cryptographic_signature",
  });
}

function explicitPolicy(policy = {}) {
  const populationThreshold = finiteNonNegative(
    policy.population_delta_percent_threshold,
    "policy.population_delta_percent_threshold"
  );
  const verifiedThreshold = finiteNonNegative(
    policy.verified_population_delta_percent_threshold,
    "policy.verified_population_delta_percent_threshold"
  );
  return {
    policy_ref: clean(policy.policy_ref || policy.policyRef),
    population_delta_percent_threshold: populationThreshold,
    verified_population_delta_percent_threshold: verifiedThreshold,
    recalibrate_on_relation_inventory_change:
      policy.recalibrate_on_relation_inventory_change === true
      || policy.recalibrateOnRelationInventoryChange === true,
    recalibrate_on_version_change:
      policy.recalibrate_on_version_change === true
      || policy.recalibrateOnVersionChange === true,
  };
}

function relativeDeltaPercent(before, after) {
  if (before === after) return 0;
  if (before === 0) return after > 0 ? 100 : 0;
  return Math.round((10000 * Math.abs(after - before)) / before) / 100;
}

function mapsDiffer(a = {}, b = {}) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if ((a[key] ?? 0) !== (b[key] ?? 0)) return true;
  }
  return false;
}

function versionsDiffer(a = {}, b = {}) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if ((a[key] ?? null) !== (b[key] ?? null)) return true;
  }
  return false;
}

export function assessCorpusBaselineChange(previous, current, policy) {
  if (!previous?.baseline_fingerprint || !current?.baseline_fingerprint) {
    throw new TypeError("corpusBaseline: normalized previous/current baselines required");
  }
  if (!policy || typeof policy !== "object") {
    throw new TypeError("corpusBaseline: explicit recalibration policy required");
  }
  const p = explicitPolicy(policy);

  const totalDelta = relativeDeltaPercent(
    previous.gematria_words.total,
    current.gematria_words.total
  );
  const verifiedDelta = relativeDeltaPercent(
    previous.gematria_words.verified,
    current.gematria_words.verified
  );
  const relationInventoryChanged =
    mapsDiffer(
      previous.graph.relation_type_counts,
      current.graph.relation_type_counts
    )
    || mapsDiffer(
      previous.relation_evidence.relation_type_counts,
      current.relation_evidence.relation_type_counts
    );
  const versionChanged = versionsDiffer(
    previous.corpus_versions,
    current.corpus_versions
  );

  const reasons = [];
  if (totalDelta >= p.population_delta_percent_threshold && totalDelta > 0) {
    reasons.push("gematria_population_delta");
  }
  if (
    verifiedDelta >= p.verified_population_delta_percent_threshold
    && verifiedDelta > 0
  ) {
    reasons.push("verified_population_delta");
  }
  if (p.recalibrate_on_relation_inventory_change && relationInventoryChanged) {
    reasons.push("semantic_relation_inventory_change");
  }
  if (p.recalibrate_on_version_change && versionChanged) {
    reasons.push("corpus_or_relation_version_change");
  }

  return Object.freeze({
    contract_version: 1,
    policy: p,
    previous_fingerprint: previous.baseline_fingerprint,
    current_fingerprint: current.baseline_fingerprint,
    gematria_population_delta_percent: totalDelta,
    verified_population_delta_percent: verifiedDelta,
    relation_inventory_changed: relationInventoryChanged,
    version_changed: versionChanged,
    requires_base_rate_recalibration: reasons.length > 0,
    reasons,
    invariants: {
      no_hidden_threshold: true,
      old_rarity_must_not_be_carried_across_required_recalibration: true,
      relation_inventory_change_can_change_cross_expectedness: true,
    },
  });
}

function role(value) {
  const normalized = clean(value);
  if (!VALID_SEMANTIC_ROLES.has(normalized)) {
    throw new TypeError(`corpusBaseline: unsupported semantic research role "${normalized}"`);
  }
  return normalized;
}

function evidenceClasses(values) {
  const out = uniqueText(values);
  for (const value of out) {
    if (!VALID_EVIDENCE_CLASSES.has(value)) {
      throw new TypeError(`corpusBaseline: unsupported semantic evidence class "${value}"`);
    }
  }
  return out;
}

function selectionMode(value) {
  const mode = clean(value) || SEMANTIC_SELECTION_MODE.UNKNOWN;
  if (!VALID_SELECTION_MODES.has(mode)) {
    throw new TypeError(`corpusBaseline: unsupported semantic selection mode "${mode}"`);
  }
  return mode;
}

function pairIdentity(a, b, relationRole) {
  const symmetric = SYMMETRIC_SEMANTIC_ROLES.has(relationRole);
  const ordered = symmetric ? [a, b].sort((x, y) => x.localeCompare(y)) : [a, b];
  return {
    symmetric,
    source_expression: ordered[0],
    target_expression: ordered[1],
    candidate_key: `sem:${stableIdentityDigest(`${relationRole}|${ordered[0]}|${ordered[1]}`)}`,
  };
}

export function createSemanticExpansionCandidate(input = {}) {
  const sourceExpression = clean(input.source_expression || input.sourceExpression);
  const targetExpression = clean(input.target_expression || input.targetExpression);
  if (!sourceExpression || !targetExpression) {
    throw new TypeError("corpusBaseline: source_expression and target_expression are required");
  }

  const relationRole = role(input.semantic_role || input.semanticRole);
  const identity = pairIdentity(sourceExpression, targetExpression, relationRole);
  const sources = uniqueText(input.source_refs || input.sourceRefs);
  if (!sources.length) {
    throw new TypeError("corpusBaseline: semantic candidate requires provenance-bearing source_refs");
  }

  const classes = evidenceClasses(input.evidence_classes || input.evidenceClasses);
  if (!classes.length) {
    throw new TypeError("corpusBaseline: semantic candidate requires at least one evidence_class");
  }

  const relationBasis = clean(input.relation_basis || input.relationBasis);
  if (!relationBasis) {
    throw new TypeError("corpusBaseline: semantic candidate requires relation_basis");
  }

  const selection = selectionMode(input.selection_mode || input.selectionMode);
  const numericSelectionIndependent = NUMERIC_INDEPENDENT_SELECTION_MODES.has(selection);

  return Object.freeze({
    contract_version: SEMANTIC_EXPANSION_CONTRACT_VERSION,
    candidate_key: identity.candidate_key,
    semantic_role: relationRole,
    symmetric: identity.symmetric,
    source_expression: identity.source_expression,
    target_expression: identity.target_expression,
    source_refs: sources,
    evidence_classes: classes,
    relation_basis: relationBasis,
    selection_mode: selection,
    numeric_selection_independent: numericSelectionIndependent,
    source_scope_ref: clean(input.source_scope_ref || input.sourceScopeRef),
    language: clean(input.language) || "he",
    status: "candidate",
    storage_route: "research_os_candidate",
    identity_route: "exact_expression_first",
    graph_edge_authorized: false,
    corpus_admission_authorized: false,
    word_alias_authorized: false,
    auto_promotion_authorized: false,
    model_proposal_only:
      classes.includes(SEMANTIC_EVIDENCE_CLASS.MODEL_PROPOSED)
      && !classes.includes(SEMANTIC_EVIDENCE_CLASS.SOURCE_ATTESTED)
      && !classes.includes(SEMANTIC_EVIDENCE_CLASS.HUMAN_CURATED),
    invariants: {
      semantic_similarity_is_not_identity: true,
      semantic_similarity_is_not_equal_value: true,
      candidate_is_not_graph_edge: true,
      candidate_is_not_corpus_admission: true,
      synonym_or_antonym_is_not_word_alias_by_default: true,
      exact_orthography_is_preserved: true,
      human_or_owner_review_required_for_durable_promotion: true,
      post_numeric_semantic_interpretation_cannot_validate_numeric_discovery: true,
    },
  });
}

function mergeCandidate(a, b) {
  return Object.freeze({
    ...a,
    source_refs: uniqueText([...a.source_refs, ...b.source_refs]),
    evidence_classes: uniqueText([...a.evidence_classes, ...b.evidence_classes]),
    relation_basis_refs: uniqueText([
      ...(a.relation_basis_refs || [a.relation_basis]),
      ...(b.relation_basis_refs || [b.relation_basis]),
    ]),
    source_scope_refs: uniqueText([
      a.source_scope_ref,
      b.source_scope_ref,
      ...(a.source_scope_refs || []),
      ...(b.source_scope_refs || []),
    ]),
    corroborating_candidate_count:
      (a.corroborating_candidate_count || 1)
      + (b.corroborating_candidate_count || 1),
    auto_promotion_authorized: false,
  });
}

export function consolidateSemanticExpansionCandidates(candidates = [], {
  maxCandidates,
} = {}) {
  const cap = Number(maxCandidates);
  if (!Number.isInteger(cap) || cap < 1 || cap > 10000) {
    throw new TypeError("corpusBaseline: explicit maxCandidates integer 1..10000 required");
  }
  const list = Array.isArray(candidates) ? candidates : [];
  if (list.length > cap) {
    throw new TypeError("corpusBaseline: candidate batch exceeds declared maxCandidates");
  }

  const byKey = new Map();
  for (const raw of list) {
    const candidate = raw?.candidate_key
      ? raw
      : createSemanticExpansionCandidate(raw);
    const prior = byKey.get(candidate.candidate_key);
    byKey.set(
      candidate.candidate_key,
      prior ? mergeCandidate(prior, candidate) : candidate
    );
  }

  return Object.freeze({
    batch_version: 1,
    input_count: list.length,
    consolidated_count: byKey.size,
    candidates: [...byKey.values()].sort((a, b) =>
      a.candidate_key.localeCompare(b.candidate_key)
    ),
    invariants: {
      consolidate_before_fragmenting: true,
      duplicate_sources_do_not_create_duplicate_semantic_truth: true,
      no_mass_graph_write: true,
      no_mass_corpus_admission: true,
    },
  });
}

export function buildSemanticControlPlan(candidate, {
  decoyCount,
  requireSameLanguage = true,
  matchLengthBucket = true,
  matchFrequencyBucket = true,
  includeSameRootControl = true,
  includeSameValueControl = true,
} = {}) {
  if (!candidate?.candidate_key) {
    throw new TypeError("corpusBaseline: semantic candidate required");
  }
  const count = Number(decoyCount);
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    throw new TypeError("corpusBaseline: decoyCount must be integer 1..100");
  }

  return Object.freeze({
    control_plan_version: 1,
    candidate_key: candidate.candidate_key,
    decoy_count: count,
    matching: {
      same_language: requireSameLanguage === true,
      length_bucket: matchLengthBucket === true,
      corpus_frequency_bucket: matchFrequencyBucket === true,
    },
    negative_controls: {
      unrelated_expression_decoys: true,
      same_root_control: includeSameRootControl === true,
      same_numeric_value_control: includeSameValueControl === true,
    },
    validation_eligibility: {
      numeric_discrimination_validation:
        candidate.numeric_selection_independent === true,
      reason:
        candidate.numeric_selection_independent === true
          ? "semantic pair selected independently of numeric discovery"
          : "semantic pair was not proven independent of numeric discovery",
    },
    evaluation_questions: [
      "Does the research/Cross signal distinguish the semantic pair from matched unrelated decoys?",
      "Is any lift explained only by same-root morphology?",
      "Is any lift explained only by same numeric value?",
      "Does the relation survive corpus/version change and held-out pairs?",
    ],
    invariants: {
      decoy_control_is_not_semantic_truth: true,
      same_root_is_not_synonymy: true,
      same_value_is_not_semantic_relation: true,
      holdout_required_before_claiming_learned_discrimination: true,
    },
  });
}
