import { onlyHeb, normalizeForCalc } from "../gematria.js";
import { fetchNumberMethodProfile } from "./numberCoreProjection.js";
import { canonicalMethodPublicLabel, sortMethodsByCanonicalOrder } from "../presentation/canonicalPresentation.js";

// per_word_prefix_opening -- reusable research adapter (HEICHAL_GEMATRIA_CAPABILITY_HOOK_V1).
//
// This module owns NO Gematria formula. For each Hebrew word in the input it walks the word's
// own letters into cumulative prefixes (the same segmentation rule already locked in gematria.js
// ribuaWord/ribua -- onlyHeb() letters, word-by-word), then asks the canonical engine
// (fn_method_profile via numberCoreProjection.fetchNumberMethodProfile) for every governed
// method's value of each prefix fragment. Per-method totals are the SUM of those canonical
// fragment values -- never a second calculation. The identity is proven live: the REGULAR-method
// total this adapter produces for a phrase is definitionally the same number the Registry already
// returns for the locked method "ריבוע" on that phrase, because ריבוע IS the per-word
// cumulative-prefix regular sum. Every other method's opening total is therefore a
// DERIVED_OPERATION projection, not an independent Gematria method identity, and must never be
// presented or persisted as one.
export const GEMATRIA_OPENING_OPERATION_CONTRACT = "gematria_opening_operation_v1";
export const PER_WORD_PREFIX_OPENING = "per_word_prefix_opening";
const DERIVED_OPERATION_ROLE = "DERIVED_OPERATION";

// Per-fragment coverage semantics (GPT review 5802943162 on PR #639). A fragment's value is null
// for structurally different reasons, and collapsing them all to `null` hides which one happened:
//  - EXECUTED: the canonical engine returned a computed value for this fragment.
//  - CONTEXT_REQUIRED: the method's registry execution_kind is "context_activated" -- it needs
//    runtime context beyond a bare phrase (fn_method_profile never dispatches it), not a failure.
//  - UNAVAILABLE: the method has no live engine implementation (execution_kind "unimplemented" or
//    unset) -- also not a failure, just nothing to call yet.
//  - ACCESS_FILTERED: the method declares a non-public required_entitlement yet came back valueless
//    from an otherwise-computable execution_kind. fn_method_profile does not gate by entitlement
//    today (Registry exposes required_entitlement as metadata only -- see gematriaCalculationContract
//    access.accessible=null precedent), so this only fires if/when that gate is added upstream; kept
//    so this adapter never silently mislabels a future entitlement gate as an engine failure.
//  - ENGINE_ERROR: the fragment's whole fn_method_profile call threw (live RPC/network failure).
export const OPENING_COVERAGE_STATUS = Object.freeze({
  EXECUTED: "executed",
  CONTEXT_REQUIRED: "context_required",
  UNAVAILABLE: "unavailable",
  ACCESS_FILTERED: "access_filtered",
  ENGINE_ERROR: "engine_error",
});

// Per-method total/coverage state (GPT review 5803098801 on PR #639, final contract correction).
// `total: 0` for a method with zero executed fragments is a fabricated numeric result -- a
// context_activated/unavailable/access_filtered/all-errored method never actually computed
// anything, so its total must be null, not a coincidental sum-of-nothing zero. `totalStatus`
// carries the honest reason so a consumer never has to reverse-engineer it from coverageBreakdown.
export const OPENING_TOTAL_STATUS = Object.freeze({
  COMPLETE: "complete",
  PARTIAL: "partial",
  CONTEXT_REQUIRED: "context_required",
  UNAVAILABLE: "unavailable",
  ACCESS_FILTERED: "access_filtered",
  ERROR_PARTIAL: "error_partial",
});

const clean = (value) => (value == null ? "" : String(value).trim());
// Number(null) === 0 and Number.isFinite(0) === true, so a naive `Number.isFinite(Number(value))`
// silently turns a genuinely-null computed_value (context_required/unavailable/access_filtered) into
// a fabricated 0. Reject null/undefined explicitly first so those stay null, never 0.
const finite = (value) => (value == null ? null : (Number.isFinite(Number(value)) ? Number(value) : null));
const COMPUTABLE_EXECUTION_KINDS = new Set(["sql_function", "composite_engine"]);

/** Classifies WHY a single (fragment, method) pair has -- or lacks -- a computed value. */
function fragmentCoverageStatus(row) {
  if (finite(row?.computedValue) != null) return OPENING_COVERAGE_STATUS.EXECUTED;
  const executionKind = clean(row?.executionKind);
  if (executionKind === "context_activated") return OPENING_COVERAGE_STATUS.CONTEXT_REQUIRED;
  const requiredEntitlement = clean(row?.requiredEntitlement);
  if (requiredEntitlement && requiredEntitlement !== "public" && COMPUTABLE_EXECUTION_KINDS.has(executionKind)) {
    return OPENING_COVERAGE_STATUS.ACCESS_FILTERED;
  }
  return OPENING_COVERAGE_STATUS.UNAVAILABLE;
}

/**
 * Classifies a method row's total/coverage state (GPT review 5803098801). `knownFragmentCount` is
 * the number of fragments this row actually has an entry for -- the honest denominator, since a
 * method absent from a fragment's profile response carries no information about that fragment.
 */
function classifyTotalStatus(coveredFragmentCount, coverageBreakdown, knownFragmentCount) {
  if (coveredFragmentCount > 0) {
    return coveredFragmentCount === knownFragmentCount
      ? OPENING_TOTAL_STATUS.COMPLETE
      : OPENING_TOTAL_STATUS.PARTIAL;
  }
  if (coverageBreakdown[OPENING_COVERAGE_STATUS.ENGINE_ERROR] > 0) return OPENING_TOTAL_STATUS.ERROR_PARTIAL;
  if (knownFragmentCount > 0 && coverageBreakdown[OPENING_COVERAGE_STATUS.CONTEXT_REQUIRED] === knownFragmentCount) {
    return OPENING_TOTAL_STATUS.CONTEXT_REQUIRED;
  }
  if (knownFragmentCount > 0 && coverageBreakdown[OPENING_COVERAGE_STATUS.ACCESS_FILTERED] === knownFragmentCount) {
    return OPENING_TOTAL_STATUS.ACCESS_FILTERED;
  }
  return OPENING_TOTAL_STATUS.UNAVAILABLE;
}

function openingProvenance() {
  return Object.freeze({
    engine: "fn_method_profile",
    adapter: "gematriaOpeningOperation-v1",
    source: "numberCoreProjection.fetchNumberMethodProfile",
    segmentation: "gematria.js normalizeForCalc + onlyHeb (same rule as locked method ריבוע)",
    isDerivedOperation: true,
    isIndependentEvidence: false,
    note: "per_word_prefix_opening totals aggregate canonical per-fragment method values; they are "
      + "not a new Gematria method identity and must not be treated as independent evidence.",
  });
}

/**
 * Splits raw input into words using the same normalization the canonical ריבוע method uses
 * (gematria.js normalizeForCalc), then walks each word's Hebrew letters (onlyHeb) into cumulative
 * prefixes. Fragment `text` is always a real, in-order, contiguous run of the word's own Hebrew
 * letters -- never fabricated or reordered. Words with no Hebrew letters contribute no fragments.
 */
export function buildOpeningFragments(rawInput, { maxWords = 24, maxFragmentsPerWord = 24 } = {}) {
  const words = normalizeForCalc(rawInput).split(/\s+/).filter(Boolean).slice(0, Math.max(1, maxWords));
  const fragments = [];
  words.forEach((word, wordIndex) => {
    const letters = onlyHeb(word).slice(0, Math.max(1, maxFragmentsPerWord));
    letters.forEach((_, prefixIndex) => {
      fragments.push(Object.freeze({
        wordIndex,
        prefixIndex,
        word,
        text: letters.slice(0, prefixIndex + 1).join(""),
      }));
    });
  });
  return { words: Object.freeze(words), fragments: Object.freeze(fragments) };
}

async function resolveFragmentProfiles(fragments, fetchMethodProfile, concurrency) {
  const profiles = new Array(fragments.length).fill(null);
  const failed = new Array(fragments.length).fill(false);
  const errors = [];
  let cursor = 0;

  async function worker() {
    while (cursor < fragments.length) {
      const index = cursor;
      cursor += 1;
      const fragment = fragments[index];
      try {
        profiles[index] = await fetchMethodProfile(fragment.text);
      } catch (error) {
        profiles[index] = [];
        failed[index] = true;
        errors.push(Object.freeze({
          wordIndex: fragment.wordIndex,
          prefixIndex: fragment.prefixIndex,
          text: fragment.text,
          message: clean(error?.message || error) || "fragment_profile_failed",
        }));
      }
    }
  }

  const workerCount = Math.max(1, Math.min(Number(concurrency) || 1, fragments.length || 1));
  await Promise.all(Array.from({ length: workerCount }, worker));
  return { profiles, failed: Object.freeze(failed), errors: Object.freeze(errors) };
}

function newCoverageBreakdown() {
  return {
    [OPENING_COVERAGE_STATUS.EXECUTED]: 0,
    [OPENING_COVERAGE_STATUS.CONTEXT_REQUIRED]: 0,
    [OPENING_COVERAGE_STATUS.UNAVAILABLE]: 0,
    [OPENING_COVERAGE_STATUS.ACCESS_FILTERED]: 0,
    [OPENING_COVERAGE_STATUS.ENGINE_ERROR]: 0,
  };
}

function aggregateMethodRows(fragments, profiles, failed) {
  const byKey = new Map();
  const methodKeysInOrder = [];

  function ensureAgg(methodKey, sourceRow = {}) {
    if (byKey.has(methodKey)) return byKey.get(methodKey);
    methodKeysInOrder.push(methodKey);
    const agg = {
      methodKey,
      label: canonicalMethodPublicLabel(sourceRow),
      category: clean(sourceRow?.category) || null,
      family: clean(sourceRow?.mathematicalFamily) || null,
      version: finite(sourceRow?.definitionVersion),
      sortOrder: finite(sourceRow?.sortOrder),
      role: DERIVED_OPERATION_ROLE,
      isIndependentEvidence: false,
      // Registry/access metadata this method's identity carries regardless of any one fragment's
      // result (GPT review 5802943162): needed by a consumer to reason about a row BEFORE wiring UI.
      registry: Object.freeze({
        executionKind: clean(sourceRow?.executionKind) || null,
        requiredEntitlement: clean(sourceRow?.requiredEntitlement) || null,
        lifecycleActive: sourceRow?.lifecycleActive !== false,
        atomicOrComposite: clean(sourceRow?.atomicOrComposite) || null,
        derivedFrom: Object.freeze(Array.isArray(sourceRow?.derivedFrom) ? [...sourceRow.derivedFrom].map(clean).filter(Boolean) : []),
        sourceOfTruth: clean(sourceRow?.sourceOfTruth) || null,
        dependencyVersion: finite(sourceRow?.dependencyVersion),
      }),
      total: 0,
      coveredFragmentCount: 0,
      fragmentValues: [],
      coverageBreakdown: newCoverageBreakdown(),
    };
    byKey.set(methodKey, agg);
    return agg;
  }

  fragments.forEach((fragment, index) => {
    if (failed[index]) return; // engine_error entries are appended below, once every method key is known
    const rows = Array.isArray(profiles[index]) ? profiles[index] : [];
    for (const row of rows) {
      const methodKey = clean(row?.methodKey);
      if (!methodKey) continue;
      const agg = ensureAgg(methodKey, row);
      const value = finite(row?.computedValue);
      const status = fragmentCoverageStatus(row);
      agg.fragmentValues.push(Object.freeze({
        wordIndex: fragment.wordIndex,
        prefixIndex: fragment.prefixIndex,
        text: fragment.text,
        value,
        coverageStatus: status,
      }));
      agg.coverageBreakdown[status] += 1;
      if (value != null) {
        agg.total += value;
        agg.coveredFragmentCount += 1;
      }
    }
  });

  // A fragment whose ENTIRE fn_method_profile call failed must still show up, honestly, against
  // every method already known from other fragments -- not vanish from their fragmentValues, which
  // would silently undercount coverage instead of reporting the RPC/engine failure that caused it.
  fragments.forEach((fragment, index) => {
    if (!failed[index]) return;
    for (const methodKey of methodKeysInOrder) {
      const agg = byKey.get(methodKey);
      agg.fragmentValues.push(Object.freeze({
        wordIndex: fragment.wordIndex,
        prefixIndex: fragment.prefixIndex,
        text: fragment.text,
        value: null,
        coverageStatus: OPENING_COVERAGE_STATUS.ENGINE_ERROR,
      }));
      agg.coverageBreakdown[OPENING_COVERAGE_STATUS.ENGINE_ERROR] += 1;
    }
  });

  const rows = [...byKey.values()].map((agg) => {
    // The two passes above append engine_error entries after successful ones; restore fragment
    // (word, prefix) order so fragmentValues always reads left-to-right regardless of which
    // fragments failed.
    const orderedFragmentValues = [...agg.fragmentValues].sort((a, b) => (
      a.wordIndex - b.wordIndex || a.prefixIndex - b.prefixIndex
    ));
    // total=0 for a method with zero executed fragments is a fabricated result (GPT review
    // 5803098801) -- null it out and carry the honest reason in totalStatus instead.
    const totalStatus = classifyTotalStatus(agg.coveredFragmentCount, agg.coverageBreakdown, orderedFragmentValues.length);
    return Object.freeze({
      ...agg,
      total: agg.coveredFragmentCount === 0 ? null : agg.total,
      totalStatus,
      fragmentValues: Object.freeze(orderedFragmentValues),
      coverageBreakdown: Object.freeze(agg.coverageBreakdown),
      coverage: fragments.length ? agg.coveredFragmentCount / fragments.length : 0,
      complete: fragments.length > 0 && agg.coveredFragmentCount === fragments.length,
    });
  });

  // Registry order is the only method-order authority (sortMethodsByCanonicalOrder reads
  // sortOrder off each row) -- this adapter invents no priority list of its own.
  return Object.freeze(sortMethodsByCanonicalOrder(rows).map((row) => Object.freeze(row)));
}

function emptyResult(raw, operation, words, fragments) {
  return Object.freeze({
    contract: GEMATRIA_OPENING_OPERATION_CONTRACT,
    version: 1,
    rawInput: raw,
    normalizedInput: words.join(" "),
    operation,
    words,
    fragments,
    methodRows: Object.freeze([]),
    verification: Object.freeze({
      wordCount: words.length,
      fragmentCount: 0,
      errorCount: 0,
      errors: Object.freeze([]),
      complete: false,
    }),
    provenance: openingProvenance(),
  });
}

/**
 * Generic reusable opening-operation adapter. Not Heichal-specific: any consumer (2029 Heichal,
 * research workspace, a future capability hook) resolves fragments/method totals through this
 * single module rather than re-implementing prefix segmentation or fan-out.
 *
 * `fetchMethodProfile` defaults to the canonical numberCoreProjection.fetchNumberMethodProfile
 * (fn_method_profile RPC) and is injectable only so tests can supply a deterministic stub --
 * production callers must never override it with a local formula.
 */
export async function fetchGematriaOpeningOperation(rawInput, {
  operation = PER_WORD_PREFIX_OPENING,
  maxWords = 24,
  maxFragmentsPerWord = 24,
  concurrency = 6,
  fetchMethodProfile = fetchNumberMethodProfile,
} = {}) {
  if (operation !== PER_WORD_PREFIX_OPENING) {
    throw new Error(`gematriaOpeningOperation: unsupported operation "${operation}"`);
  }

  const raw = clean(rawInput);
  const { words, fragments } = buildOpeningFragments(raw, { maxWords, maxFragmentsPerWord });
  if (!raw || !fragments.length) return emptyResult(raw, operation, words, fragments);

  const { profiles, failed, errors } = await resolveFragmentProfiles(fragments, fetchMethodProfile, concurrency);
  const methodRows = aggregateMethodRows(fragments, profiles, failed);

  return Object.freeze({
    contract: GEMATRIA_OPENING_OPERATION_CONTRACT,
    version: 1,
    rawInput: raw,
    normalizedInput: words.join(" "),
    operation,
    words,
    fragments,
    methodRows,
    verification: Object.freeze({
      wordCount: words.length,
      fragmentCount: fragments.length,
      errorCount: errors.length,
      errors,
      complete: errors.length === 0,
    }),
    provenance: openingProvenance(),
  });
}

export function openingMethodTotal(result, methodKey) {
  const key = clean(methodKey);
  if (!key) return null;
  const row = (result?.methodRows || []).find((entry) => entry.methodKey === key);
  return row ? row.total : null;
}