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

const clean = (value) => (value == null ? "" : String(value).trim());
const finite = (value) => (Number.isFinite(Number(value)) ? Number(value) : null);

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
  return { profiles, errors: Object.freeze(errors) };
}

function aggregateMethodRows(fragments, profiles) {
  const byKey = new Map();

  fragments.forEach((fragment, index) => {
    const rows = Array.isArray(profiles[index]) ? profiles[index] : [];
    for (const row of rows) {
      const methodKey = clean(row?.methodKey);
      if (!methodKey) continue;
      if (!byKey.has(methodKey)) {
        byKey.set(methodKey, {
          methodKey,
          label: canonicalMethodPublicLabel(row),
          category: clean(row?.category) || null,
          family: clean(row?.mathematicalFamily) || null,
          version: finite(row?.definitionVersion),
          sortOrder: finite(row?.sortOrder),
          role: DERIVED_OPERATION_ROLE,
          isIndependentEvidence: false,
          total: 0,
          coveredFragmentCount: 0,
          fragmentValues: [],
        });
      }
      const agg = byKey.get(methodKey);
      const value = finite(row?.computedValue);
      agg.fragmentValues.push(Object.freeze({
        wordIndex: fragment.wordIndex,
        prefixIndex: fragment.prefixIndex,
        text: fragment.text,
        value,
      }));
      if (value != null) {
        agg.total += value;
        agg.coveredFragmentCount += 1;
      }
    }
  });

  const rows = [...byKey.values()].map((agg) => Object.freeze({
    ...agg,
    fragmentValues: Object.freeze(agg.fragmentValues),
    coverage: fragments.length ? agg.coveredFragmentCount / fragments.length : 0,
    complete: fragments.length > 0 && agg.coveredFragmentCount === fragments.length,
  }));

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

  const { profiles, errors } = await resolveFragmentProfiles(fragments, fetchMethodProfile, concurrency);
  const methodRows = aggregateMethodRows(fragments, profiles);

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
