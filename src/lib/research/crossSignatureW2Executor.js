import { makeUniversalFinding } from "./universalFinding.js";
import {
  ACCESS_CLASS,
  CAPABILITY_STATUS,
  EVIDENCE_RELATION,
  SEMANTIC_CLASS,
} from "./researchResultBundle.js";

export const CROSS_SIGNATURE_ADAPTER_VERSION = "cross-signature-w2-v1";
export const CROSS_SIGNATURE_CAPABILITY = "gematria_cross_signature";

const CROSS_METHOD_FIELDS = [
  "value",
  "phrase_count",
  "independent_phrase_count",
  "dependent_expression_phrase_count",
  "p1_hits",
  "independent_p1_method_count",
  "methods",
  "in_ragil",
  "in_misratar",
  "in_kadmi",
  "signal",
  "dependent_methods",
  "dependent_phrase_count",
  "unregistered_methods",
].join(",");

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function numberFromIdentity(identityResolution) {
  for (const identity of Array.isArray(identityResolution?.identities) ? identityResolution.identities : []) {
    if (identity?.type !== "number") continue;
    const raw = identity?.value ?? identity?.ref ?? identity?.key ?? identity?.label;
    if (typeof raw === "number" && Number.isSafeInteger(raw) && raw >= 0) return raw;
    if (typeof raw === "string" && /^\d+$/.test(raw.trim())) {
      const value = Number(raw.trim());
      if (Number.isSafeInteger(value) && value >= 0) return value;
    }
  }
  return null;
}

function arrayOf(value) {
  return Array.isArray(value) ? value.map(String) : [];
}

function integerOrNull(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : null;
}

function safeLookupRows(rows, limit) {
  const out = [];
  const seen = new Set();
  for (const row of Array.isArray(rows) ? rows : []) {
    const phrase = clean(row?.phrase);
    const method = clean(row?.method);
    if (!phrase || !method) continue;
    const key = method + "::" + phrase;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      phrase,
      method,
      value: integerOrNull(row?.value),
      atomic_or_composite: clean(row?.atomic_or_composite),
      bid_id: clean(row?.bid_id),
      word_id: clean(row?.word_id),
      method_version: integerOrNull(row?.method_version),
    });
    if (out.length >= limit) break;
  }
  return out;
}

export function normalizeCrossMethodStrengthRow(row) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const value = integerOrNull(row.value);
  if (value == null) return null;
  return Object.freeze({
    value,
    phrase_count: integerOrNull(row.phrase_count),
    independent_phrase_count: integerOrNull(row.independent_phrase_count),
    dependent_expression_phrase_count: integerOrNull(row.dependent_expression_phrase_count),
    p1_hits: integerOrNull(row.p1_hits),
    independent_p1_method_count: integerOrNull(row.independent_p1_method_count),
    methods: Object.freeze(arrayOf(row.methods)),
    dependent_methods: Object.freeze(arrayOf(row.dependent_methods)),
    dependent_phrase_count: integerOrNull(row.dependent_phrase_count),
    unregistered_methods: Object.freeze(arrayOf(row.unregistered_methods)),
    signal: clean(row.signal),
    core_presence: Object.freeze({
      regular: row.in_ragil === true,
      hidden: row.in_misratar === true,
      triangle: row.in_kadmi === true,
    }),
    independence_source: "public.cross_method_strength",
    truth_boundary: "derived contextual/research-strength signal; never Truth, Canonical or independent evidence by itself",
  });
}

export function crossSignatureToUniversalFinding(signature, {
  sampleRows = [],
  sampleTotalCount = null,
  sampleLimit = 24,
} = {}) {
  if (!signature) return null;
  const value = integerOrNull(signature.value);
  if (value == null) return null;
  const samples = safeLookupRows(sampleRows, Math.max(1, Math.min(Number(sampleLimit) || 24, 64)));
  const sourceIdentity = `cross-signature:${value}:v1`;

  return makeUniversalFinding({
    kind: "cross-signature",
    subject: {
      type: "number",
      key: String(value),
      label: String(value),
      value,
    },
    source: {
      engine: "relation-engine",
      adapter: CROSS_SIGNATURE_ADAPTER_VERSION,
      sourceRef: "view:cross_method_strength",
      method: "cross_method_strength",
    },
    identity: {
      sourceIdentity,
      relationRef: sourceIdentity,
    },
    verification: {
      claimed_expression: null,
      claimed_method: null,
      claimed_value: null,
      engine_method_tested: "cross_method_strength",
      engine_result: {
        value,
        independent_p1_method_count: signature.independent_p1_method_count,
        independent_phrase_count: signature.independent_phrase_count,
        signal: signature.signal,
      },
      verification_state: "not_tested",
    },
    evidence: {
      refs: [
        `number:${value}`,
        "view:cross_method_strength",
        "rpc:fn_number_lookup",
      ],
      facts: [{
        type: "cross-signature",
        ...signature,
        sample_rows: samples,
        sample_window: {
          returned_count: samples.length,
          total_count: integerOrNull(sampleTotalCount),
          truncated: integerOrNull(sampleTotalCount) != null
            ? samples.length < integerOrNull(sampleTotalCount)
            : null,
          ordering: "fn_number_lookup canonical order",
          role: "examples/provenance only; never source-exhaustive unless truncated=false",
        },
      }],
    },
    access: {
      tier: "public",
      reason: "cross_method_strength + fn_number_lookup are canonical public read surfaces",
    },
    provenance: {
      createdBy: "ENGINE:relation-engine",
      inputRef: `number:${value}`,
      parentFindingIds: [],
    },
    projection: {
      dimensions: {
        cross_signature: {
          ...signature,
          sample_rows: samples,
          sample_window: {
            returned_count: samples.length,
            total_count: integerOrNull(sampleTotalCount),
            truncated: integerOrNull(sampleTotalCount) != null
              ? samples.length < integerOrNull(sampleTotalCount)
              : null,
          },
        },
      },
    },
  });
}

export function createCrossSignatureW2Executor({
  supabase,
  sampleLimit = 24,
} = {}) {
  const cap = Math.max(1, Math.min(Number(sampleLimit) || 24, 64));

  return async ({ identityResolution } = {}) => {
    const value = numberFromIdentity(identityResolution);
    if (!supabase || typeof supabase.from !== "function" || typeof supabase.rpc !== "function") {
      return {
        owner: "research_strategy_layer_law",
        status: CAPABILITY_STATUS.MISSING_ADAPTER,
        reason: "cross signature requires canonical Supabase from()+rpc() read capabilities",
        findings: [],
        accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
        semanticClass: SEMANTIC_CLASS.DERIVATION,
        sourceRefs: value == null ? [] : [`number:${value}`],
        versionRefs: [CROSS_SIGNATURE_ADAPTER_VERSION],
        trace: { value, adapter_available: false },
      };
    }
    if (value == null) {
      return {
        owner: "research_strategy_layer_law",
        status: CAPABILITY_STATUS.SKIPPED,
        reason: "cross signature requires one canonical number identity",
        findings: [],
        accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
        semanticClass: SEMANTIC_CLASS.DERIVATION,
        versionRefs: [CROSS_SIGNATURE_ADAPTER_VERSION],
        trace: { value: null },
      };
    }

    const strengthQuery = supabase
      .from("cross_method_strength")
      .select(CROSS_METHOD_FIELDS)
      .eq("value", value);

    const [{ data: strengthRow, error: strengthError }, lookupResult] = await Promise.all([
      typeof strengthQuery.maybeSingle === "function"
        ? strengthQuery.maybeSingle()
        : Promise.resolve({ data: null, error: new Error("maybeSingle unavailable") }),
      supabase.rpc("fn_number_lookup", {
        p_value: value,
        p_limit: cap,
        p_after_bid_id: null,
      }),
    ]);

    if (strengthError) {
      return {
        owner: "research_strategy_layer_law",
        status: CAPABILITY_STATUS.FAILED,
        reason: "canonical cross_method_strength read failed",
        findings: [],
        accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
        semanticClass: SEMANTIC_CLASS.DERIVATION,
        sourceRefs: [`number:${value}`],
        versionRefs: [CROSS_SIGNATURE_ADAPTER_VERSION, "view:cross_method_strength"],
        trace: { value, error_class: strengthError?.name || "Error" },
      };
    }

    const signature = normalizeCrossMethodStrengthRow(strengthRow);
    if (!signature) {
      return {
        owner: "research_strategy_layer_law",
        status: CAPABILITY_STATUS.NEGATIVE_RESULT,
        reason: "canonical cross_method_strength has no row for this number",
        findings: [],
        negativeScope: {
          value,
          source: "public.cross_method_strength",
        },
        accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
        semanticClass: SEMANTIC_CLASS.DERIVATION,
        sourceRefs: [`number:${value}`, "view:cross_method_strength"],
        versionRefs: [CROSS_SIGNATURE_ADAPTER_VERSION, "view:cross_method_strength"],
        trace: { value, strength_row: false },
      };
    }

    const lookupRows = lookupResult?.error
      ? []
      : Array.isArray(lookupResult?.data) ? lookupResult.data : [];
    const totalCount = lookupRows.length
      ? integerOrNull(lookupRows[0]?.total_count)
      : null;
    const finding = crossSignatureToUniversalFinding(signature, {
      sampleRows: lookupRows,
      sampleTotalCount: totalCount,
      sampleLimit: cap,
    });

    return {
      owner: "research_strategy_layer_law",
      status: CAPABILITY_STATUS.EXECUTED,
      findings: finding ? [finding] : [],
      findingOutcomes: finding ? [{
        findingId: finding.id,
        evidenceRelation: EVIDENCE_RELATION.CONVERGENCE,
        convergenceKey: `cross-signature:number:${value}`,
        reason: "dependency-normalized Cross signature is synthesis fuel, but remains a convergence/derivation rather than independent corroboration",
      }] : [],
      accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
      semanticClass: SEMANTIC_CLASS.DERIVATION,
      sourceRefs: [
        `number:${value}`,
        "view:cross_method_strength",
        "rpc:fn_number_lookup",
      ],
      versionRefs: [
        CROSS_SIGNATURE_ADAPTER_VERSION,
        "cross_method_strength:live",
        "fn_number_lookup:live",
      ],
      bounded: {
        total_count: totalCount,
        returned_count: lookupRows.length,
        truncated: totalCount != null ? lookupRows.length < totalCount : null,
        ordering: "fn_number_lookup canonical order",
        continuation: totalCount != null && lookupRows.length < totalCount
          ? { kind: "increase_cross_signature_sample_window", current_limit: cap }
          : null,
      },
      trace: {
        adapter: CROSS_SIGNATURE_ADAPTER_VERSION,
        value,
        independent_p1_method_count: signature.independent_p1_method_count,
        independent_phrase_count: signature.independent_phrase_count,
        dependent_method_count: signature.dependent_methods.length,
        unregistered_method_count: signature.unregistered_methods.length,
        lookup_sample_count: lookupRows.length,
        lookup_error: lookupResult?.error ? (lookupResult.error?.name || "Error") : null,
        truth_boundary: signature.truth_boundary,
      },
    };
  };
}

export default createCrossSignatureW2Executor;
