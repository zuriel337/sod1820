import { makeUniversalFinding } from "./universalFinding.js";
import { normKey } from "../nameNormalize.js";
import { ACCESS_CLASS, SEMANTIC_CLASS, capabilityResult, composeResearchResultBundle } from "./researchResultBundle.js";
import { nameLabTrackCoverageCapabilities } from "./nameLabTrackClassification.js";
import { normalizeNameLabDependencies } from "./nameLabDependency.js";

// NameLab -> Universal Finding adapter (docs/research-universal-finding-contract.md §11).
//
// This module never researches/computes anything itself. It only projects the raw track
// output NameMultiSearch/getNameMulti already received from the live NameLab RPCs
// (fn_name_research_graded and friends) into the existing Universal Finding envelope.
//
// It is deliberately NOT the same operation as src/lib/nameNormalize.js#aggregateFindings.
// aggregateFindings is a DISPLAY layer: it merges every raw hit that shares one conservative
// normalized_key across engines/parts into a single collapsed row (Raw -> Normalize -> Dedupe
// -> Rank -> Render), and that merge is correct for its purpose but throws away per-hit source
// identity. A Universal Finding must do the opposite: ONE Finding per source-native hit/
// provenance item, never one merged Finding per normalized display row (§2 identity law — two
// visually identical labels are not automatically the same Finding). Two different-but-
// normKey-equal hits (e.g. two distinct milui matches) therefore stay two distinct Findings
// here even though aggregateFindings would fold them into one display row.
//
// Bounded name-as-word lane only: this adapter accepts a researched name string plus the raw
// trackLists NameLab already returned for it. It does not accept/consume surname, birthdate,
// question or any other personal context, and it never attaches a person-ref (contract §11 —
// NameLab researches a name as a word/string, not a specific identified person).
//
// Families covered, matching exactly what nameNormalize.js#collect() already reads off the
// same live track shapes (status==="ok" only):
//   milui       — t.data[].matches[]      (phrase sharing a part's milui value)
//   combo_gem   — t.words[]               (word sharing the combo's gematria value)
//   anagrams    — t.data[].anagrams[]     (an existing word, same letters)
//   variants    — t.data[]                (an existing spelling variant)
//   transforms  — t.data[] with in_tanach>0 (a cipher-transformed word attested in Tanach)

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

// One yield per source-native hit. Never merges/dedupes across parts or engines — that is
// exactly the display-layer behavior this adapter must not reproduce (see module header).
function* iterateNameLabHits(tracks) {
  for (const t of Array.isArray(tracks) ? tracks : []) {
    if (!t || t.status !== "ok") continue;

    if (t.id === "milui" && Array.isArray(t.data)) {
      for (const pt of t.data) {
        for (const m of Array.isArray(pt?.matches) ? pt.matches : []) {
          if (!m?.phrase) continue;
          yield {
            family: "milui",
            method: "milui",
            qualityLevel: "value_match",
            word: m.phrase,
            sourceIdentity: {
              trackId: "milui",
              part: clean(pt.part),
              milui: pt.milui ?? null,
              ragil: pt.ragil ?? null,
              phrase: String(m.phrase),
              source: clean(m.source),
            },
          };
        }
      }
    } else if (t.id === "combo_gem" && Array.isArray(t.words)) {
      for (const w of t.words) {
        if (!w) continue;
        yield {
          family: "combo_gem",
          method: "combo_gem",
          qualityLevel: "value_match",
          word: w,
          sourceIdentity: { trackId: "combo_gem", value: t.value ?? null, word: String(w) },
        };
      }
    } else if (t.id === "anagrams" && Array.isArray(t.data)) {
      for (const pt of t.data) {
        for (const a of Array.isArray(pt?.anagrams) ? pt.anagrams : []) {
          if (!a?.word) continue;
          yield {
            family: "anagrams",
            method: "anagram",
            qualityLevel: "direct",
            word: a.word,
            sourceIdentity: {
              trackId: "anagrams",
              part: clean(pt.part),
              word: String(a.word),
              type: clean(a.type),
            },
          };
        }
      }
    } else if (t.id === "variants" && Array.isArray(t.data)) {
      for (const v of t.data) {
        if (!v?.form) continue;
        yield {
          family: "variants",
          method: "variant",
          qualityLevel: "direct",
          word: v.form,
          sourceIdentity: { trackId: "variants", form: String(v.form), note: clean(v.note) },
        };
      }
    } else if (t.id === "transforms" && Array.isArray(t.data)) {
      for (const tr of t.data) {
        if (!tr?.word || !((tr.in_tanach || 0) > 0)) continue;
        yield {
          family: "transforms",
          method: clean(tr.method) || "transform",
          qualityLevel: "direct",
          word: tr.word,
          sourceIdentity: {
            trackId: "transforms",
            method: clean(tr.method),
            word: String(tr.word),
            value: tr.value ?? null,
            in_tanach: tr.in_tanach,
            verses: Array.isArray(tr.verses) ? tr.verses.map(String) : [],
          },
        };
      }
    }
  }
}

/**
 * Project raw NameLab trackLists (the exact `tracks[]` arrays already produced by
 * getNameMulti/fn_name_research_graded, as consumed by aggregateFindings) into Universal
 * Findings — one per source-native hit, never one per normalized display row.
 *
 * @param {string} name researched name-as-word (subject.label for every emitted Finding)
 * @param {Array<Array<object>>} trackLists array-of-track-arrays, same shape aggregateFindings takes
 * @param {{ createdAt?: string, inputRef?: string|null }} [options]
 * @returns {Array<object>} Universal Findings, kind="name", access.tier="public"
 */
export function nameLabTrackListsToUniversalFindings(name, trackLists, options = {}) {
  const label = clean(name);
  if (!label) return [];
  const subjectKey = normKey(label) || label;
  const createdAt = options.createdAt || new Date().toISOString();
  const inputRef = options.inputRef ?? null;

  const out = [];
  for (const tracks of Array.isArray(trackLists) ? trackLists : []) {
    for (const hit of iterateNameLabHits(tracks)) {
      out.push(makeUniversalFinding({
        kind: "name",
        subject: { type: "name", key: subjectKey, label, lang: "he" },
        source: {
          engine: "name_lab",
          adapter: "name-lab-universal-finding-v1",
          sourceRef: null,
          method: hit.method,
          corpus: hit.family === "transforms" ? "tanakh" : null,
          lang: "he",
        },
        identity: {
          // Engine-native tuple, never collapsed through nameNormalize's normKey/merge — see
          // module header. Stable across calls so an identical hit always yields the same id.
          sourceIdentity: hit.sourceIdentity,
          occurrence: null,
          entityRef: null,
          relationRef: null,
        },
        // NameLab returns its own direct engine output here (a milui value-match, an existing
        // anagram/variant, a corpus-attested transform) — no externally submitted claim was ever
        // tested against it, exactly the reasoning canonicalGematria.js and universalFinding.js's
        // ELS adapter already use for their own engine-native output. "not_tested" is therefore
        // an explicit, source-hit-justified declaration, not an inferred default (contract §5:
        // this is a DIFFERENT axis from the NameLab evidence-level below, never collapsed into it).
        verification: {
          claimed_expression: null,
          claimed_method: null,
          claimed_value: null,
          engine_method_tested: hit.method,
          engine_result: hit.sourceIdentity,
          verification_state: "not_tested",
        },
        evidence: {
          refs: [],
          facts: [{ type: `name_lab-${hit.family}`, ...hit.sourceIdentity }],
          score: null,
          confidence: null,
        },
        // Bounded name-as-word public lane only (contract §11) — never a restricted/personal tier.
        access: { tier: "public", reason: "name_lab_name_as_word_public_lane" },
        provenance: { createdBy: "ENGINE:name_lab", createdAt, inputRef },
        projection: {
          anchors: [],
          relations: [],
          // NameLab's own Evidence Law (direct|value_match|interpretive) placed in the Quality
          // dimension slot per contract §5's mapping decision — never written into
          // verification_state/stage/status.
          dimensions: { quality: hit.qualityLevel, name_lab_family: hit.family },
        },
        view: { rendererHints: { role: "name-lab-hit", family: hit.family } },
      }));
    }
  }
  return out;
}

/**
 * Optional bounded Result Bundle helper over the existing composeResearchResultBundle socket.
 * Adds no new store/engine/registry: it is the same capabilityResult() shape every other W2
 * executor already produces, scoped to the name_lab capability.
 */
export function composeNameLabNormalizedEvidenceBundle({ name, trackLists, accessDescriptor = null } = {}) {
  const label = clean(name);
  const findings = label ? nameLabTrackListsToUniversalFindings(label, trackLists) : [];
  const dependency = normalizeNameLabDependencies(findings);
  const coverageCapabilities = nameLabTrackCoverageCapabilities(trackLists);

  const bundle = composeResearchResultBundle({
    query: { raw_input: label },
    capabilities: [
      capabilityResult({
        key: "name_lab",
        owner: "research_strategy_layer_law",
        findings,
        accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
        semanticClass: SEMANTIC_CLASS.EVIDENCE,
        sourceRefs: ["name_lab"],
        versionRefs: ["name-lab-universal-finding-v1"],
      }),
      ...coverageCapabilities,
    ],
    resolvedRunSnapshot: {
      name_lab_dependency_normalization: dependency,
    },
    accessDescriptor,
  });

  return Object.freeze({
    ...bundle,
    dependency_normalization: dependency,
  });
}

export default nameLabTrackListsToUniversalFindings;
