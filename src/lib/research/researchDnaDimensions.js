// Research DNA v1 <-> Universal Finding `projection.dimensions` crosswalk registry.
//
// PURPOSE (Depth Dimensions / Research Universe, step 10 scoping — Foundation Closure only):
// Universal Finding adapters each write their own source-native key into
// `projection.dimensions` (see universalFinding.js / canonicalGematria.js / numberAnchorFinding.js /
// researchObjectFinding.js / entityGraphFinding.js / topicConvergence.js). No adapter's native key
// spells any of the ratified Research DNA v1 dimension names, and nothing consumed `dimensions` at
// all before this file (grepped: 0 reads anywhere in src/ prior to this pass). Left alone, a future
// consumer that wants "the canonical dimensions of this Finding" would have to hardcode a switch on
// `finding.kind`, which is exactly the "engine-specific semantic if/else" and "13th competing
// taxonomy" this crosswalk exists to prevent.
//
// This module is a lookup table plus one pure helper. It does not compute, verify, or invent
// anything: it only DECLARES, per (kind, native dimension key), which of the 12 ratified Research
// DNA dimensions (audits/research_dna_v1_foundation_contract/RESEARCH_DNA_V1_FOUNDATION_CONTRACT.md
// §2) that native key expresses — or explicitly that none does yet. Native values are always passed
// through verbatim (INVARIANT PR1: a projection may represent semantic state, never invent it).
//
// ── 11-vs-12 DIMENSION COUNT — RESOLVED, NOT A LIVE DRIFT ──────────────────────────────────────
// The Foundation Contract's own §2 heading ("The eleven dimensions and their live home") is stale
// wording. Its own table row for "Approval" is explicitly annotated "(new dimension, added 22.8)"
// (contract §4/§4.3, fifth pass) — Approval was added to the *table* on 22.8.2026 without the
// section *heading* being updated from "eleven" to "twelve". The live table has always had 12 rows
// since that pass: Identity, Provenance, Verification, Approval, Semantic, Research, Method,
// Numeric, Temporal, Access, Quality, Interpretation. This is VERDICT A from the task's own
// disjunction (stale wording), confirmed directly from the contract's inline provenance note —
// not a sub-axis miscategorization (VERDICT B). No Human-Gate decision is required to close this;
// it is a documentation correction, recorded here so no future pass re-litigates it from scratch.
export const RESEARCH_DNA_DIMENSIONS = Object.freeze([
  "Identity",
  "Provenance",
  "Verification",
  "Approval",
  "Semantic",
  "Research",
  "Method",
  "Numeric",
  "Temporal",
  "Access",
  "Quality",
  "Interpretation",
]);

export const MAPPING_TYPES = Object.freeze({
  // native key is a direct expression of a canonical dimension.
  CANONICAL_DIRECT: "CANONICAL_DIRECT",
  // native value deterministically implies a canonical dimension without inventing meaning.
  CANONICAL_DERIVED: "CANONICAL_DERIVED",
  // important detail worth preserving, but not itself an independent Research DNA dimension.
  ADAPTER_NATIVE_DETAIL: "ADAPTER_NATIVE_DETAIL",
  // no canonical owner exists today. Never forced into a dimension — stays explicit.
  UNMAPPED: "UNMAPPED",
});

// Keyed by Universal Finding `kind`, then by the native `projection.dimensions` key that
// adapter's live code actually writes today (verified against each adapter file, not guessed).
const REGISTRY = Object.freeze({
  els: {
    corpus: {
      canonicalDimension: "Provenance",
      mappingType: MAPPING_TYPES.CANONICAL_DIRECT,
      lossless: true,
      notes:
        "Mirrors finding.source.corpus verbatim (\"torah\"|\"tanakh\") — a source-scope/provenance " +
        "fact already present on the envelope, not new information.",
    },
  },
  gematria: {
    numeric: {
      canonicalDimension: "Method",
      mappingType: MAPPING_TYPES.CANONICAL_DIRECT,
      lossless: true,
      notes:
        "{methodKey,value} is a Method-dimension fact (which method, what result) — mirrors " +
        "finding.source.method + finding.verification.engine_result. NAMING COLLISION WARNING: the " +
        "native key's literal name \"numeric\" is a false friend. It is NOT the DNA \"Numeric\" " +
        "dimension (Numeric Language / number<->word transform, contract §2.3). Never conflate the two.",
    },
  },
  "number-anchor": {
    legacyNumberAnchor: {
      canonicalDimension: null,
      mappingType: MAPPING_TYPES.ADAPTER_NATIVE_DETAIL,
      lossless: true,
      notes:
        "Curated legacy editorial context (category/fact/hint). The adapter itself already labels " +
        "it semanticBoundary:\"curated-context-not-verified-fact\" — preserved verbatim, never " +
        "promoted onto a DNA axis, so a curated hint is never displayed as a verified fact.",
    },
  },
  "research-object": {
    researchObjectKind: {
      canonicalDimension: null,
      mappingType: MAPPING_TYPES.ADAPTER_NATIVE_DETAIL,
      lossless: true,
      notes:
        "research_objects.kind (fact|relation|observation|hypothesis|question) is a domain-owned " +
        "epistemic vocabulary, deliberately not mapped onto the envelope's own `stage` field (see " +
        "researchObjectFinding.js's own comment) or any single DNA axis — Option D " +
        "(truth_axes_foundation_law): shared axis definitions, domain-owned values. Preserve " +
        "verbatim; never coerce into stage or Identity.",
    },
  },
  "graph-entity": {
    graphNodeType: {
      canonicalDimension: "Semantic",
      mappingType: MAPPING_TYPES.CANONICAL_DERIVED,
      lossless: true,
      notes:
        "nodes.type is a deterministic ontological classification of the subject — the same " +
        "character as DNA's Semantic dimension (gematria_words.world / nodes type=theme), though " +
        "not the literal same field, hence derived rather than direct.",
    },
  },
  "graph-relation": {
    relationFamily: {
      canonicalDimension: null,
      mappingType: MAPPING_TYPES.UNMAPPED,
      lossless: null,
      notes:
        "edges.relation_type has no confident owner among the 12 ratified DNA dimensions today. " +
        "It is governed separately by research_intake_foundation_contract §3 (relation-type " +
        "vocabulary) — a real contract, but not a Research DNA axis. Left explicitly unmapped " +
        "rather than forced into Semantic or Research.",
    },
  },
  convergence: {
    graph: {
      canonicalDimension: "Research",
      mappingType: MAPPING_TYPES.CANONICAL_DIRECT,
      lossless: true,
      notes:
        "Exact match to DNA's Research dimension: \"the proven topic_cards -> nodes " +
        "type='convergence' promotion pipeline\" (contract §2). source_status is topic_cards' own " +
        "editorial workflow state — distinct from the envelope's own GOVERNANCE axis " +
        "(finding.status), which this adapter deliberately leaves null.",
    },
  },
});

/**
 * Pure lookup: for a given Universal Finding, return one disposition row per key actually
 * present in `finding.projection.dimensions`. Never mutates `finding`. Never throws on an
 * unregistered kind/key — an unrecognized adapter or a new native key always comes back as an
 * explicit UNMAPPED row (never silently dropped, never guessed into an existing dimension).
 *
 * This is the one place a future consumer (e.g. a read-only "Depth Dimension Inspector") should
 * ask "what are the canonical dimensions of this Finding" — never re-deriving the mapping itself.
 */
export function canonicalDimensionsOf(finding) {
  const dims = finding?.projection?.dimensions;
  if (!dims || typeof dims !== "object" || Array.isArray(dims)) return [];

  const kindEntry = REGISTRY[finding?.kind] || null;

  return Object.entries(dims).map(([nativeKey, nativeValue]) => {
    const reg = kindEntry ? kindEntry[nativeKey] : null;
    if (!reg) {
      return Object.freeze({
        nativeKey,
        nativeValue,
        canonicalDimension: null,
        mappingType: MAPPING_TYPES.UNMAPPED,
        lossless: null,
        notes:
          `No registry entry for kind="${finding?.kind}" nativeKey="${nativeKey}" — unrecognized ` +
          "adapter or key. Left explicit (truth_axes_foundation_law PR2/PR3: never silently " +
          "coerced, never silently dropped).",
      });
    }
    return Object.freeze({ nativeKey, nativeValue, ...reg });
  });
}
