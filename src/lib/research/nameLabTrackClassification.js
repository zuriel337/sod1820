import {
  ACCESS_CLASS,
  CAPABILITY_STATUS,
  SEMANTIC_CLASS,
  capabilityResult,
} from "./researchResultBundle.js";

// Explicit semantic classification for every track emitted by live fn_name_multi.
// This is routing metadata, not a new engine/registry/truth owner.
export const NAME_LAB_TRACK_CLASSIFICATION_VERSION = "name-lab-track-classification-v1";

export const NAME_LAB_TRACK_CLASSIFICATION = Object.freeze({
  name_verse: Object.freeze({ semantic_class: SEMANTIC_CLASS.EVIDENCE, adapter: "missing", owner: "research_strategy_layer_law" }),
  literal: Object.freeze({ semantic_class: SEMANTIC_CLASS.EVIDENCE, adapter: "missing", owner: "research_strategy_layer_law" }),
  words: Object.freeze({ semantic_class: SEMANTIC_CLASS.EVIDENCE, adapter: "missing", owner: "research_strategy_layer_law" }),
  graded_prox: Object.freeze({ semantic_class: SEMANTIC_CLASS.EVIDENCE, adapter: "missing", owner: "research_strategy_layer_law" }),
  chapter: Object.freeze({ semantic_class: SEMANTIC_CLASS.EVIDENCE, adapter: "missing", owner: "research_strategy_layer_law" }),
  proximity: Object.freeze({ semantic_class: SEMANTIC_CLASS.EVIDENCE, adapter: "missing", owner: "research_strategy_layer_law" }),
  in_verse: Object.freeze({ semantic_class: SEMANTIC_CLASS.EVIDENCE, adapter: "missing", owner: "research_strategy_layer_law" }),

  anagrams: Object.freeze({ semantic_class: SEMANTIC_CLASS.EVIDENCE, adapter: "name_lab", owner: "research_strategy_layer_law" }),
  combo_gem: Object.freeze({ semantic_class: SEMANTIC_CLASS.EVIDENCE, adapter: "name_lab", owner: "research_strategy_layer_law" }),
  milui: Object.freeze({ semantic_class: SEMANTIC_CLASS.EVIDENCE, adapter: "name_lab", owner: "research_strategy_layer_law" }),
  transforms: Object.freeze({ semantic_class: SEMANTIC_CLASS.EVIDENCE, adapter: "name_lab", owner: "research_strategy_layer_law" }),
  variants: Object.freeze({ semantic_class: SEMANTIC_CLASS.EVIDENCE, adapter: "name_lab", owner: "research_strategy_layer_law" }),

  split_gem: Object.freeze({ semantic_class: SEMANTIC_CLASS.DERIVATION, adapter: "trace_only", owner: "research_strategy_layer_law" }),
  shared_num: Object.freeze({ semantic_class: SEMANTIC_CLASS.DERIVATION, adapter: "trace_only", owner: "research_strategy_layer_law" }),
  initials: Object.freeze({ semantic_class: SEMANTIC_CLASS.DERIVATION, adapter: "trace_only", owner: "research_strategy_layer_law" }),
  roots: Object.freeze({ semantic_class: SEMANTIC_CLASS.DERIVATION, adapter: "trace_only", owner: "research_strategy_layer_law" }),

  // Legacy NameLab ELS track is never promoted to canonical ELS evidence here. Canonical ELS
  // requires its own replay/coordinate Result contract under els_research_layer_law.
  els: Object.freeze({ semantic_class: SEMANTIC_CLASS.CONTEXT, adapter: "els_owner_required", owner: "els_research_layer_law" }),
});

const clean = (value) => {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
};

function statusForTrack(track, cfg) {
  const raw = clean(track?.status) || "unknown";
  if (raw === "skipped") return CAPABILITY_STATUS.SKIPPED;
  if (raw === "empty") {
    return cfg.semantic_class === SEMANTIC_CLASS.EVIDENCE
      ? CAPABILITY_STATUS.NEGATIVE_RESULT
      : CAPABILITY_STATUS.EXECUTED;
  }
  if (raw !== "ok") return CAPABILITY_STATUS.FAILED;
  if (cfg.adapter === "missing") return CAPABILITY_STATUS.MISSING_ADAPTER;
  if (cfg.adapter === "els_owner_required") return CAPABILITY_STATUS.UNVERIFIED;
  return CAPABILITY_STATUS.EXECUTED;
}

export function collectNameLabTrackCoverage(trackLists = []) {
  const byId = new Map();
  for (const list of Array.isArray(trackLists) ? trackLists : []) {
    for (const track of Array.isArray(list) ? list : []) {
      const id = clean(track?.id);
      if (!id) continue;
      const previous = byId.get(id);
      // Prefer a real executed/ok row over a repeated empty/skipped row from another source doc.
      if (!previous || previous.status !== "ok" || track?.status === "ok") byId.set(id, track);
    }
  }

  return [...byId.entries()].map(([id, track]) => {
    const cfg = NAME_LAB_TRACK_CLASSIFICATION[id];
    if (!cfg) {
      return Object.freeze({
        id,
        classification: "unclassified",
        status: CAPABILITY_STATUS.MISSING_ADAPTER,
        semantic_class: null,
        owner: "research_strategy_layer_law",
        reason: "track_not_classified",
      });
    }
    const status = statusForTrack(track, cfg);
    return Object.freeze({
      id,
      classification: cfg.adapter,
      status,
      semantic_class: cfg.semantic_class,
      owner: cfg.owner,
      reason: cfg.adapter === "missing"
        ? "source_track_has_no_universal_finding_adapter"
        : cfg.adapter === "els_owner_required"
          ? "legacy_namelab_els_is_not_canonical_els_result"
          : cfg.adapter === "trace_only"
            ? "derivation_preserved_in_capability_trace_not_counted_as_independent_evidence"
            : null,
    });
  });
}

export function nameLabTrackCoverageCapabilities(trackLists = []) {
  return collectNameLabTrackCoverage(trackLists).map((row) => capabilityResult({
    key: `name_lab:${row.id}`,
    owner: row.owner,
    status: row.status,
    findings: [],
    reason: row.reason,
    requested: true,
    accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
    semanticClass: row.semantic_class,
    versionRefs: [NAME_LAB_TRACK_CLASSIFICATION_VERSION],
  }));
}

export default NAME_LAB_TRACK_CLASSIFICATION;
