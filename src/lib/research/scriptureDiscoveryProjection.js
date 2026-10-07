import { fetchVersesByGematria } from "./verseGematriaSources.js";

export const SCRIPTURE_DISCOVERY_DEFAULT_MAX_SEEDS = 3;
export const SCRIPTURE_DISCOVERY_MAX_SEEDS = 8;
export const SCRIPTURE_DISCOVERY_DEFAULT_VERSE_LIMIT = 6;
export const SCRIPTURE_DISCOVERY_MAX_VERSE_LIMIT = 12;

function boundedInt(value, fallback, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(Math.trunc(n), max));
}

function safeInteger(value) {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!/^[0-9]+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function findingEvidenceRef(finding) {
  return clean(finding?.id)
    || clean(finding?.subject?.key)
    || clean(finding?.identity?.sourceIdentity?.researchObjectId)
    || null;
}

/**
 * Pure, fail-closed seed selection for Scripture discovery.
 *
 * A Research Finding may seed numeric verse discovery only when:
 * - its explicit Universal Finding verification state is "match";
 * - the canonical engine returned a safe integer;
 * - if the Finding also carries a numeric subject value, it agrees with the engine result.
 *
 * No statement parsing and no engine inference happen here. A mismatch, method_unknown,
 * not_tested or absent verification never becomes a discovery seed.
 */
export function scriptureDiscoverySeedsFromFindings(findings = [], {
  maxSeeds = SCRIPTURE_DISCOVERY_DEFAULT_MAX_SEEDS,
} = {}) {
  const cap = boundedInt(maxSeeds, SCRIPTURE_DISCOVERY_DEFAULT_MAX_SEEDS, SCRIPTURE_DISCOVERY_MAX_SEEDS);
  const byValue = new Map();

  for (const finding of Array.isArray(findings) ? findings : []) {
    const verification = finding?.verification && typeof finding.verification === "object"
      ? finding.verification
      : {};
    if (verification.verification_state !== "match") continue;

    const engineValue = safeInteger(verification.engine_result);
    if (engineValue == null) continue;

    const subjectValue = safeInteger(finding?.subject?.value);
    if (subjectValue != null && subjectValue !== engineValue) continue;

    const ref = findingEvidenceRef(finding);
    const sourceRef = clean(finding?.source?.sourceRef);
    const method = clean(verification.engine_method_tested) || clean(verification.claimed_method);
    const expression = clean(verification.claimed_expression) || clean(finding?.subject?.label);

    const current = byValue.get(engineValue) || {
      value: engineValue,
      sourceFindingRefs: [],
      sourceRefs: [],
      methods: [],
      expressions: [],
      verificationState: "match",
      basis: "explicit_engine_match",
    };
    if (ref && !current.sourceFindingRefs.includes(ref)) current.sourceFindingRefs.push(ref);
    if (sourceRef && !current.sourceRefs.includes(sourceRef)) current.sourceRefs.push(sourceRef);
    if (method && !current.methods.includes(method)) current.methods.push(method);
    if (expression && !current.expressions.includes(expression)) current.expressions.push(expression);
    byValue.set(engineValue, current);
  }

  return [...byValue.values()].slice(0, cap);
}

/**
 * Bounded read-only projection over the existing canonical Tanakh verse-gematria reader.
 *
 * The returned verses are discovery candidates only. Same numeric value is not semantic
 * evidence by itself and this adapter never writes Research Objects, graph relations,
 * canonical state or publication state.
 */
export async function fetchScriptureDiscoveryForFindings(findings = [], {
  maxSeeds = SCRIPTURE_DISCOVERY_DEFAULT_MAX_SEEDS,
  verseLimit = SCRIPTURE_DISCOVERY_DEFAULT_VERSE_LIMIT,
  fetchVerses = fetchVersesByGematria,
} = {}) {
  const seeds = scriptureDiscoverySeedsFromFindings(findings, { maxSeeds });
  const limit = boundedInt(
    verseLimit,
    SCRIPTURE_DISCOVERY_DEFAULT_VERSE_LIMIT,
    SCRIPTURE_DISCOVERY_MAX_VERSE_LIMIT,
  );

  const results = await Promise.all(seeds.map(async (seed) => {
    try {
      const found = await fetchVerses(seed.value, { limit });
      const verses = Array.isArray(found?.verses) ? found.verses : [];
      return {
        value: seed.value,
        count: Number.isFinite(Number(found?.count)) ? Number(found.count) : verses.length,
        verses,
        sourceFindingRefs: seed.sourceFindingRefs,
        sourceRefs: seed.sourceRefs,
        methods: seed.methods,
        expressions: seed.expressions,
        status: "ready",
        matchKind: "verse_gematria",
        verseMethod: "רגיל",
      };
    } catch {
      return {
        value: seed.value,
        count: null,
        verses: [],
        sourceFindingRefs: seed.sourceFindingRefs,
        sourceRefs: seed.sourceRefs,
        methods: seed.methods,
        expressions: seed.expressions,
        status: "unavailable",
        matchKind: "verse_gematria",
        verseMethod: "רגיל",
      };
    }
  }));

  return {
    kind: "scripture-discovery-projection",
    version: 1,
    seeds,
    results,
    candidates: results.flatMap((result) => result.verses.map((verse) => ({
      ...verse,
      discoveryValue: result.value,
      discoveryBasis: "seed_numeric_value_to_verse_ragil_value",
      seedMethods: result.methods,
      verseMethod: "רגיל",
      sourceFindingRefs: result.sourceFindingRefs,
      sourceRefs: result.sourceRefs,
      truthPromotion: false,
    }))),
    coverage: {
      inputFindings: Array.isArray(findings) ? findings.length : 0,
      eligibleSeeds: seeds.length,
      queriedSeeds: results.length,
      unavailableSeeds: results.filter((item) => item.status === "unavailable").length,
      candidateVerses: results.reduce((sum, item) => sum + item.verses.length, 0),
    },
    governance: {
      readOnly: true,
      automaticCanonicalPromotion: false,
      automaticPublication: false,
      semanticProof: false,
      humanGateRequiredForClaim: true,
      note: "Verse values are always canonical רגיל. A seed may originate in another method; that cross-method equality is a discovery lead only, never semantic proof.",
    },
  };
}

export default fetchScriptureDiscoveryForFindings;
