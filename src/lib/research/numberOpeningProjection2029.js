import { supabase } from "../supabase.js";

export const NUMBER_OPENING_PROJECTION_RPC = "fn_number_opening_projection_2029";
export const NUMBER_OPENING_PER_METHOD_DEFAULT = 12;
export const NUMBER_OPENING_PER_METHOD_MAX = 20;

const integer = (value, fallback = null) => {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : fallback;
};

const boundedPerMethod = (value) => Math.max(1, Math.min(
  integer(value, NUMBER_OPENING_PER_METHOD_DEFAULT),
  NUMBER_OPENING_PER_METHOD_MAX,
));

const array = (value) => Array.isArray(value) ? value : [];
const object = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};

function openingError(code, detail = null) {
  const error = new Error(code);
  error.code = code;
  if (detail != null) error.detail = detail;
  return error;
}

function normalizePhrase(row) {
  const source = object(row);
  return {
    phrase: source.phrase ?? null,
    world: source.world ?? null,
    ragil: integer(source.ragil),
    tags: Array.isArray(source.tags) ? source.tags : null,
    componentValues: Array.isArray(source.component_values) ? source.component_values.map((value) => integer(value, value)) : null,
    // Stable source identity for diagnostics/checkpointing. It is not a depth cursor by itself.
    bidId: source.bid_id == null ? null : String(source.bid_id),
  };
}

function normalizeFamily(row, perMethod) {
  const source = object(row);
  const registry = object(source.registry);
  const phrases = array(source.phrases).map(normalizePhrase);
  const count = Math.max(0, integer(source.count, 0));
  const sampleSource = object(source.sample);
  const returnedCount = Math.max(0, integer(sampleSource.returned_count, phrases.length));
  const totalCount = Math.max(0, integer(sampleSource.total_count, count));
  const sampleLimit = Math.max(1, integer(sampleSource.limit, perMethod));
  const cursor = sampleSource.cursor ?? null;
  const complete = sampleSource.complete === true;
  const hasMore = sampleSource.has_more === true;

  if (returnedCount !== phrases.length || totalCount !== count) {
    throw openingError("NUMBER_OPENING_SAMPLE_COUNT_MISMATCH", { method: source.method ?? null });
  }
  if (
    phrases.length > perMethod
    || sampleLimit !== perMethod
    || complete === hasMore
    || complete !== (returnedCount === totalCount)
    || (returnedCount === 0) !== (cursor == null)
  ) {
    throw openingError("NUMBER_OPENING_SAMPLE_COMPLETENESS_MISMATCH", { method: source.method ?? null });
  }

  return {
    // This is intentionally the same family shape consumed by the current Number core.
    method: source.method ?? null,
    priority: integer(source.priority, 4),
    count,
    composite: source.composite === true,
    componentMethods: Array.isArray(source.component_methods) ? source.component_methods : null,
    operator: source.operator ?? null,
    governed: source.governed === true,
    evidenceClass: source.evidence_class ?? null,
    methodActive: source.method_active ?? null,
    methodScannable: source.method_scannable ?? null,
    methodExecutable: source.method_executable ?? null,
    methodEngineVerified: source.method_engine_verified ?? null,
    phrases,
    registry,
    openingSample: {
      limit: sampleLimit,
      returnedCount,
      totalCount,
      cursor,
      hasMore,
      complete,
      cursorScope: sampleSource.cursor_scope ?? null,
    },
  };
}

/**
 * Convert the compact RPC envelope into the existing Number family/Registry vocabulary.
 * Pure and strict: completeness contradictions fail closed instead of silently becoming a full
 * Number result. No Universal Finding is constructed from compact rows.
 */
export function normalizeNumberOpeningProjection(payload, { expectedValue = null } = {}) {
  const source = object(payload);
  if (source.v !== 1) throw openingError("NUMBER_OPENING_VERSION_UNSUPPORTED", source.v ?? null);

  const value = integer(source.value);
  if (source.value != null && value == null) throw openingError("NUMBER_OPENING_VALUE_UNSAFE", source.value);
  if (expectedValue != null && value !== integer(expectedValue)) {
    throw openingError("NUMBER_OPENING_VALUE_MISMATCH", { expected: expectedValue, received: source.value });
  }

  const perMethod = boundedPerMethod(source.per_method_limit);
  const families = array(source.families).map((family) => normalizeFamily(family, perMethod));
  const familyCount = Math.max(0, integer(source.family_count, 0));
  const sourceRowCount = Math.max(0, integer(source.source_row_count, 0));
  const distinctMethodPhraseCount = Math.max(0, integer(source.distinct_method_phrase_count, 0));
  const openingPhraseCount = Math.max(0, integer(source.opening_phrase_count, 0));
  const familyPhraseTotal = families.reduce((sum, family) => sum + family.count, 0);
  const openingPhraseTotal = families.reduce((sum, family) => sum + family.phrases.length, 0);
  if (
    familyCount !== families.length
    || familyPhraseTotal !== distinctMethodPhraseCount
    || openingPhraseTotal !== openingPhraseCount
    || distinctMethodPhraseCount > sourceRowCount
  ) {
    throw openingError("NUMBER_OPENING_TOTALS_MISMATCH");
  }

  const rawCompleteness = object(source.completeness);
  const rawDepth = object(source.depth);
  if (rawCompleteness.opening !== true || rawCompleteness.families !== true || rawCompleteness.counts !== true) {
    throw openingError("NUMBER_OPENING_NOT_COMPLETE");
  }
  const depthComplete = rawDepth.complete === true;
  const depthHasMore = rawDepth.has_more === true;
  const allSamplesComplete = families.every((family) => family.openingSample.complete);
  if (
    rawCompleteness.samples !== allSamplesComplete
    || rawCompleteness.full_row_population !== (sourceRowCount === 0)
    || rawCompleteness.universal_findings !== (sourceRowCount === 0)
    || depthComplete === depthHasMore
    || depthComplete !== (sourceRowCount === 0)
    || (rawDepth.deferred === true) !== depthHasMore
  ) {
    throw openingError("NUMBER_OPENING_DEPTH_COMPLETENESS_MISMATCH");
  }

  const registry = [];
  const registrySeen = new Set();
  for (const family of families) {
    const key = family.registry?.method_key;
    if (key != null && !registrySeen.has(String(key))) {
      registrySeen.add(String(key));
      registry.push(family.registry);
    }
  }

  return {
    v: 1,
    value,
    perMethodLimit: perMethod,
    ordering: source.ordering ?? null,
    sourceOrdering: source.source_ordering ?? null,
    familyCount,
    sourceRowCount,
    distinctMethodPhraseCount,
    openingPhraseCount,
    families,
    registry,
    completeness: {
      opening: true,
      families: true,
      counts: true,
      samples: rawCompleteness.samples === true,
      fullRowPopulation: rawCompleteness.full_row_population === true,
      universalFindings: rawCompleteness.universal_findings === true,
    },
    depth: {
      rpc: rawDepth.rpc ?? "fn_number_lookup",
      fieldCount: integer(rawDepth.field_count, 37),
      cursor: rawDepth.cursor ?? null,
      cursorField: rawDepth.cursor_field ?? "bid_id",
      hasMore: depthHasMore,
      complete: depthComplete,
      deferred: rawDepth.deferred === true,
    },
  };
}

/**
 * One RPC, one bounded opening envelope. A missing/unreleased migration is surfaced; falling back
 * to fn_number_lookup here would silently restore the full payload on the critical path.
 */
export async function fetchNumberOpeningProjection(value, {
  perMethod = NUMBER_OPENING_PER_METHOD_DEFAULT,
  rpc = (name, args) => supabase.rpc(name, args),
} = {}) {
  const number = integer(value);
  if (number == null) throw openingError("NUMBER_OPENING_VALUE_UNSAFE", value);
  if (typeof rpc !== "function") throw openingError("NUMBER_OPENING_RPC_UNAVAILABLE");
  const limit = boundedPerMethod(perMethod);
  const result = await rpc(NUMBER_OPENING_PROJECTION_RPC, {
    p_value: number,
    p_per_method: limit,
  });
  if (result?.error) {
    const error = openingError("NUMBER_OPENING_RPC_FAILED", result.error);
    error.cause = result.error;
    throw error;
  }
  return normalizeNumberOpeningProjection(result?.data ?? result, { expectedValue: number });
}

/**
 * Nonvisual handoff seam for the future Claude surface adoption. The returned shape can replace
 * the current getValueFamilies + fetchMethodRegistry opening pair without claiming depth is done.
 */
export function projectNumberOpeningCore(opening, { identity = null, anchorProfile = null } = {}) {
  const source = opening?.perMethodLimit != null && Array.isArray(opening?.families)
    ? opening
    : normalizeNumberOpeningProjection(opening);
  return {
    identity,
    gematria: {
      families: source.families,
      registry: source.registry,
      completeness: source.completeness,
    },
    anchorProfile,
    numberPagePending: source.depth.hasMore,
    numberOpening: {
      value: source.value,
      depth: source.depth,
      sourceRowCount: source.sourceRowCount,
      distinctMethodPhraseCount: source.distinctMethodPhraseCount,
    },
  };
}
