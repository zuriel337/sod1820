import { supabase } from "../supabase.js";

export const NUMBER_OPENING_PROJECTION_RPC = "fn_number_opening_projection_2029";
export const NUMBER_OPENING_PER_METHOD_DEFAULT = 12;
export const NUMBER_OPENING_PER_METHOD_MAX = 20;
export const NUMBER_OPENING_FAMILY_ORDER = "registry_sort_order__then_count_desc__then_regular_governed_priority_method";
export const NUMBER_OPENING_SOURCE_ORDER = "governed_first__then_atomic_before_composite__then_method__phrase__bid_id";
export const NUMBER_OPENING_DEPTH_RPC = "fn_number_lookup";
export const NUMBER_OPENING_DEPTH_FIELD_COUNT = 37;
export const NUMBER_OPENING_DEPTH_CURSOR_FIELD = "bid_id";

const normalizedOpenings = new WeakSet();

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
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

function openingError(code, detail = null) {
  const error = new Error(code);
  error.code = code;
  if (detail != null) error.detail = detail;
  return error;
}

function exactInteger(value, code, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) {
    throw openingError(code, value);
  }
  return value;
}

function exactNullableBoolean(value, code) {
  if (value == null || typeof value === "boolean") return value ?? null;
  throw openingError(code, value);
}

function exactRootInteger(value, code, detail) {
  if (typeof value === "number") {
    if (Number.isSafeInteger(value)) return Object.is(value, -0) ? 0 : value;
    throw openingError(code, detail);
  }
  if (
    typeof value === "string"
    && /^(?:0|[1-9]\d*|-[1-9]\d*)$/.test(value)
  ) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed)) return parsed;
  }
  throw openingError(code, detail);
}

function sameCheckpointValue(left, right) {
  if (left == null || right == null) return left == null && right == null;
  return String(left) === String(right);
}

function familyPriority(method) {
  if (method === "רגיל" || method === "מסתתר" || method === "קדמי") return 1;
  if (method === "מילוי") return 2;
  if (method === "אתבש") return 3;
  return 4;
}

function compareText(left, right) {
  const a = String(left);
  const b = String(right);
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function compareFamilyOrder(left, right) {
  const leftOrder = left.registry?.sort_order ?? Number.POSITIVE_INFINITY;
  const rightOrder = right.registry?.sort_order ?? Number.POSITIVE_INFINITY;
  if (leftOrder !== rightOrder) return leftOrder - rightOrder;
  if (left.count !== right.count) return right.count - left.count;
  if ((left.method === "רגיל") !== (right.method === "רגיל")) return left.method === "רגיל" ? -1 : 1;
  if (left.governed !== right.governed) return left.governed ? -1 : 1;
  if (left.priority !== right.priority) return left.priority - right.priority;
  return compareText(left.method, right.method);
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
  const method = typeof source.method === "string" && source.method.trim() ? source.method : null;
  if (!method) throw openingError("NUMBER_OPENING_FAMILY_METHOD_INVALID", source.method ?? null);

  const rawRegistry = source.registry == null ? null : object(source.registry);
  if (source.registry != null && !Object.keys(rawRegistry).length) {
    throw openingError("NUMBER_OPENING_REGISTRY_INVALID", { method });
  }
  const registryMethod = rawRegistry?.method_key ?? null;
  if (registryMethod != null && registryMethod !== method) {
    throw openingError("NUMBER_OPENING_REGISTRY_METHOD_MISMATCH", { method, registryMethod });
  }
  // The SQL envelope emits an all-null Registry object for an unregistered method. Preserve the
  // existing Number family shape: an unregistered family has registry=null, never a truthy shell.
  const registry = registryMethod == null ? null : rawRegistry;
  if (registry) {
    exactInteger(registry.sort_order, "NUMBER_OPENING_REGISTRY_ORDER_INVALID");
  }

  const phrases = array(source.phrases).map(normalizePhrase);
  if (!Array.isArray(source.phrases)) {
    throw openingError("NUMBER_OPENING_PHRASES_INVALID", { method });
  }
  const phraseKeys = phrases.map((phrase) => JSON.stringify(phrase.phrase));
  if (new Set(phraseKeys).size !== phraseKeys.length) {
    throw openingError("NUMBER_OPENING_SAMPLE_DUPLICATE_PHRASE", { method });
  }

  const count = exactInteger(source.count, "NUMBER_OPENING_FAMILY_COUNT_INVALID", { min: 1 });
  const sampleSource = object(source.sample);
  if (!Object.keys(sampleSource).length) {
    throw openingError("NUMBER_OPENING_SAMPLE_INVALID", { method });
  }
  const returnedCount = exactInteger(sampleSource.returned_count, "NUMBER_OPENING_SAMPLE_RETURNED_INVALID", { min: 0 });
  const totalCount = exactInteger(sampleSource.total_count, "NUMBER_OPENING_SAMPLE_TOTAL_INVALID", { min: 1 });
  const sampleLimit = exactInteger(sampleSource.limit, "NUMBER_OPENING_SAMPLE_LIMIT_INVALID", {
    min: 1,
    max: NUMBER_OPENING_PER_METHOD_MAX,
  });
  const cursor = sampleSource.cursor ?? null;
  if (typeof sampleSource.complete !== "boolean" || typeof sampleSource.has_more !== "boolean") {
    throw openingError("NUMBER_OPENING_SAMPLE_COMPLETENESS_INVALID", { method });
  }
  const complete = sampleSource.complete;
  const hasMore = sampleSource.has_more;

  if (returnedCount !== phrases.length || totalCount !== count) {
    throw openingError("NUMBER_OPENING_SAMPLE_COUNT_MISMATCH", { method });
  }
  if (
    returnedCount < 1
    || returnedCount > totalCount
    || phrases.length > perMethod
    || sampleLimit !== perMethod
    || hasMore !== (returnedCount < totalCount)
    || complete !== (returnedCount === totalCount)
    || sampleSource.cursor_scope !== "opening_sample_checkpoint"
  ) {
    throw openingError("NUMBER_OPENING_SAMPLE_COMPLETENESS_MISMATCH", { method });
  }

  const checkpoint = object(cursor);
  const last = phrases[phrases.length - 1];
  if (
    !Object.keys(checkpoint).length
    || checkpoint.method !== method
    || !sameCheckpointValue(checkpoint.phrase, last.phrase)
    || !sameCheckpointValue(checkpoint.bid_id, last.bidId)
  ) {
    throw openingError("NUMBER_OPENING_SAMPLE_CURSOR_MISMATCH", { method });
  }

  const priority = exactInteger(source.priority, "NUMBER_OPENING_FAMILY_PRIORITY_INVALID", { min: 1, max: 4 });
  if (priority !== familyPriority(method)) {
    throw openingError("NUMBER_OPENING_FAMILY_PRIORITY_MISMATCH", { method, priority });
  }
  if (typeof source.governed !== "boolean" || typeof source.composite !== "boolean") {
    throw openingError("NUMBER_OPENING_FAMILY_STATE_INVALID", { method });
  }

  return {
    // This is intentionally the same family shape consumed by the current Number core.
    method,
    priority,
    count,
    composite: source.composite,
    componentMethods: Array.isArray(source.component_methods) ? source.component_methods : null,
    operator: source.operator ?? null,
    governed: source.governed,
    evidenceClass: source.evidence_class ?? null,
    methodActive: exactNullableBoolean(source.method_active, "NUMBER_OPENING_METHOD_STATE_INVALID"),
    methodScannable: exactNullableBoolean(source.method_scannable, "NUMBER_OPENING_METHOD_STATE_INVALID"),
    methodExecutable: exactNullableBoolean(source.method_executable, "NUMBER_OPENING_METHOD_STATE_INVALID"),
    methodEngineVerified: exactNullableBoolean(source.method_engine_verified, "NUMBER_OPENING_METHOD_STATE_INVALID"),
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
export function normalizeNumberOpeningProjection(payload, {
  expectedValue = null,
  expectedPerMethod = null,
} = {}) {
  const source = object(payload);
  if (source.v !== 1) throw openingError("NUMBER_OPENING_VERSION_UNSUPPORTED", source.v ?? null);

  const value = exactInteger(source.value, "NUMBER_OPENING_VALUE_UNSAFE");
  if (expectedValue != null && value !== exactInteger(expectedValue, "NUMBER_OPENING_EXPECTED_VALUE_UNSAFE")) {
    throw openingError("NUMBER_OPENING_VALUE_MISMATCH", { expected: expectedValue, received: source.value });
  }

  const perMethod = exactInteger(source.per_method_limit, "NUMBER_OPENING_PER_METHOD_INVALID", {
    min: 1,
    max: NUMBER_OPENING_PER_METHOD_MAX,
  });
  if (expectedPerMethod != null && perMethod !== exactInteger(
    expectedPerMethod,
    "NUMBER_OPENING_EXPECTED_PER_METHOD_INVALID",
    { min: 1, max: NUMBER_OPENING_PER_METHOD_MAX },
  )) {
    throw openingError("NUMBER_OPENING_PER_METHOD_MISMATCH", {
      expected: expectedPerMethod,
      received: source.per_method_limit,
    });
  }
  if (source.ordering !== NUMBER_OPENING_FAMILY_ORDER || source.source_ordering !== NUMBER_OPENING_SOURCE_ORDER) {
    throw openingError("NUMBER_OPENING_ORDER_CONTRACT_MISMATCH");
  }
  if (!Array.isArray(source.families)) throw openingError("NUMBER_OPENING_FAMILIES_INVALID");
  const families = array(source.families).map((family) => normalizeFamily(family, perMethod));
  const methodKeys = families.map((family) => family.method);
  if (new Set(methodKeys).size !== methodKeys.length) {
    throw openingError("NUMBER_OPENING_DUPLICATE_FAMILY_METHOD");
  }
  for (let index = 1; index < families.length; index += 1) {
    const previous = families[index - 1];
    const current = families[index];
    if (compareFamilyOrder(previous, current) > 0) {
      throw openingError("NUMBER_OPENING_FAMILY_ORDER_MISMATCH", {
        previous: previous.method,
        current: current.method,
      });
    }
  }

  const familyCount = exactInteger(source.family_count, "NUMBER_OPENING_FAMILY_TOTAL_INVALID", { min: 0 });
  const sourceRowCount = exactInteger(source.source_row_count, "NUMBER_OPENING_SOURCE_TOTAL_INVALID", { min: 0 });
  const distinctMethodPhraseCount = exactInteger(
    source.distinct_method_phrase_count,
    "NUMBER_OPENING_DISTINCT_TOTAL_INVALID",
    { min: 0 },
  );
  const openingPhraseCount = exactInteger(source.opening_phrase_count, "NUMBER_OPENING_SAMPLE_TOTAL_INVALID", { min: 0 });
  const familyPhraseTotal = families.reduce((sum, family) => sum + family.count, 0);
  const openingPhraseTotal = families.reduce((sum, family) => sum + family.phrases.length, 0);
  if (
    familyCount !== families.length
    || familyPhraseTotal !== distinctMethodPhraseCount
    || openingPhraseTotal !== openingPhraseCount
    || openingPhraseCount > distinctMethodPhraseCount
    || distinctMethodPhraseCount > sourceRowCount
    || (sourceRowCount === 0) !== (familyCount === 0)
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
    rawDepth.rpc !== NUMBER_OPENING_DEPTH_RPC
    || rawDepth.field_count !== NUMBER_OPENING_DEPTH_FIELD_COUNT
    || rawDepth.cursor !== null
    || rawDepth.cursor_field !== NUMBER_OPENING_DEPTH_CURSOR_FIELD
    || typeof rawDepth.complete !== "boolean"
    || typeof rawDepth.has_more !== "boolean"
    || typeof rawDepth.deferred !== "boolean"
    || rawCompleteness.samples !== allSamplesComplete
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

  const normalized = {
    v: 1,
    value,
    perMethodLimit: perMethod,
    ordering: source.ordering,
    sourceOrdering: source.source_ordering,
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
      rpc: rawDepth.rpc,
      fieldCount: rawDepth.field_count,
      cursor: rawDepth.cursor,
      cursorField: rawDepth.cursor_field,
      hasMore: depthHasMore,
      complete: depthComplete,
      deferred: rawDepth.deferred === true,
    },
  };
  normalizedOpenings.add(normalized);
  return normalized;
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
  return normalizeNumberOpeningProjection(result?.data ?? result, {
    expectedValue: number,
    expectedPerMethod: limit,
  });
}

/**
 * Nonvisual handoff seam for the future Claude surface adoption. The returned shape can replace
 * the current getValueFamilies + fetchMethodRegistry opening pair without claiming depth is done.
 */
export function projectNumberOpeningCore(opening, { identity = null, anchorProfile = null } = {}) {
  const source = normalizedOpenings.has(opening)
    ? opening
    : normalizeNumberOpeningProjection(opening);
  if (identity != null) {
    const mismatch = {
      opening: source.value,
      identity: identity?.label ?? null,
    };
    const identityValue = exactRootInteger(
      identity?.label,
      "NUMBER_OPENING_IDENTITY_VALUE_MISMATCH",
      mismatch,
    );
    if (identityValue !== source.value) {
      throw openingError("NUMBER_OPENING_IDENTITY_VALUE_MISMATCH", {
        opening: source.value,
        identity: identity?.label ?? null,
      });
    }
  }
  const anchorRow = anchorProfile?.row;
  if (anchorRow && own(anchorRow, "value")) {
    const mismatch = {
      opening: source.value,
      anchor: anchorRow.value,
    };
    const anchorValue = exactRootInteger(
      anchorRow.value,
      "NUMBER_OPENING_ANCHOR_VALUE_MISMATCH",
      mismatch,
    );
    if (anchorValue !== source.value) {
      throw openingError("NUMBER_OPENING_ANCHOR_VALUE_MISMATCH", {
        opening: source.value,
        anchor: anchorRow.value,
      });
    }
  }
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
      familyCount: source.familyCount,
      openingPhraseCount: source.openingPhraseCount,
      depth: source.depth,
      sourceRowCount: source.sourceRowCount,
      distinctMethodPhraseCount: source.distinctMethodPhraseCount,
      completeness: source.completeness,
    },
  };
}
