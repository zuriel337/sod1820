import { makeUniversalFinding } from "./universalFinding.js";
import {
  ACCESS_CLASS,
  CAPABILITY_STATUS,
  EVIDENCE_RELATION,
  SEMANTIC_CLASS,
} from "./researchResultBundle.js";

export const CROSS_SIGNATURE_ADAPTER_VERSION = "cross-signature-w2-v1";
export const CROSS_SIGNATURE_CAPABILITY = "gematria_cross_signature";

const VALID_ACCESS_TIERS = new Set(["public", "public_candidate", "personal", "private"]);

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function numberAnchor(identityResolution) {
  for (const identity of Array.isArray(identityResolution?.identities) ? identityResolution.identities : []) {
    if (identity?.type !== "number") continue;
    const raw = identity?.value ?? identity?.ref ?? identity?.key ?? identity?.label;
    let value = null;
    if (typeof raw === "number" && Number.isSafeInteger(raw) && raw >= 0) value = raw;
    else if (typeof raw === "string" && /^\d+$/.test(raw.trim())) {
      const parsed = Number(raw.trim());
      if (Number.isSafeInteger(parsed) && parsed >= 0) value = parsed;
    }
    if (value == null) continue;
    return {
      value,
      accessTier: clean(identity?.access?.tier),
    };
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

function accessClassForTier(accessTier) {
  return accessTier === "public"
    ? ACCESS_CLASS.PUBLIC_SOURCE
    : ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED;
}

function normalizeStrengthRead(read) {
  if (!read || typeof read !== "object" || Array.isArray(read)) return null;
  const status = clean(read.status);
  const accessTier = clean(read.accessTier ?? read.access_tier);
  if (!["ok", "not_found", "denied", "failed"].includes(status)) return null;
  if (!accessTier || !VALID_ACCESS_TIERS.has(accessTier)) return null;
  return Object.freeze({
    status,
    accessTier,
    row: read.row ?? read.data ?? null,
    sourceRef: clean(read.sourceRef ?? read.source_ref) || "view:cross_method_strength",
    versionRef: clean(read.versionRef ?? read.version_ref) || "cross_method_strength:live",
    reason: clean(read.reason),
  });
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
  accessTier,
  strengthSourceRef,
} = {}) {
  if (!signature) return null;
  const value = integerOrNull(signature.value);
  const tier = clean(accessTier);
  if (value == null || !tier || !VALID_ACCESS_TIERS.has(tier)) return null;
  const samples = safeLookupRows(sampleRows, Math.max(1, Math.min(Number(sampleLimit) || 24, 64)));
  const sourceIdentity = `cross-signature:${value}:v1`;
  const crossSourceRef = clean(strengthSourceRef) || "view:cross_method_strength";

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
      sourceRef: crossSourceRef,
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
        crossSourceRef,
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
      tier,
      reason: tier === "public"
        ? "governed reader explicitly projected this Cross Signature as public"
        : "inherits the governed reader access tier; composition boundary decides whether it may leave",
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

/**
 * Governed-reader seam.
 *
 * cross_method_strength is canonical computation but is NOT directly SELECT-able by browser
 * anon/authenticated roles. This W2 adapter therefore never opens a grant and never reads the view
 * directly. A caller must inject fetchCrossMethodStrength(value), returning:
 *   {status:"ok"|"not_found"|"denied"|"failed", row, accessTier, sourceRef?, versionRef?, reason?}
 * The explicit accessTier is load-bearing; an unclassified reader result fails closed.
 */
export function createCrossSignatureW2Executor({
  supabase,
  fetchCrossMethodStrength = null,
  sampleLimit = 24,
} = {}) {
  const cap = Math.max(1, Math.min(Number(sampleLimit) || 24, 64));

  return async ({ identityResolution } = {}) => {
    const anchor = numberAnchor(identityResolution);
    if (!anchor) {
      return {
        owner: "research_strategy_layer_law",
        status: CAPABILITY_STATUS.SKIPPED,
        reason: "cross signature requires one canonical number identity",
        findings: [],
        accessClass: ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED,
        semanticClass: SEMANTIC_CLASS.DERIVATION,
        versionRefs: [CROSS_SIGNATURE_ADAPTER_VERSION],
        trace: { anchor_present: false },
      };
    }

    // V1 privacy guard: a restricted numeric identity must first gain a privacy-safe relation
    // identity projection. Never echo its raw value through this generic capability trace.
    if (anchor.accessTier && anchor.accessTier !== "public") {
      return {
        owner: "research_strategy_layer_law",
        status: CAPABILITY_STATUS.CONTEXT_REQUIRED,
        reason: "cross signature v1 refuses restricted/personal number identities until a privacy-safe relation identity projection is available",
        findings: [],
        accessClass: ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED,
        semanticClass: SEMANTIC_CLASS.DERIVATION,
        versionRefs: [CROSS_SIGNATURE_ADAPTER_VERSION],
        trace: { restricted_input: true },
      };
    }

    if (typeof fetchCrossMethodStrength !== "function") {
      return {
        owner: "research_strategy_layer_law",
        status: CAPABILITY_STATUS.MISSING_ADAPTER,
        reason: "cross_method_strength requires an injected governed reader; direct browser SELECT is intentionally not granted",
        findings: [],
        accessClass: ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED,
        semanticClass: SEMANTIC_CLASS.DERIVATION,
        sourceRefs: [`number:${anchor.value}`],
        versionRefs: [CROSS_SIGNATURE_ADAPTER_VERSION, "view:cross_method_strength"],
        trace: { reader_available: false, value: anchor.value },
      };
    }
    if (!supabase || typeof supabase.rpc !== "function") {
      return {
        owner: "research_strategy_layer_law",
        status: CAPABILITY_STATUS.MISSING_ADAPTER,
        reason: "cross signature examples require canonical fn_number_lookup RPC transport",
        findings: [],
        accessClass: ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED,
        semanticClass: SEMANTIC_CLASS.DERIVATION,
        sourceRefs: [`number:${anchor.value}`],
        versionRefs: [CROSS_SIGNATURE_ADAPTER_VERSION],
        trace: { reader_available: true, lookup_transport_available: false, value: anchor.value },
      };
    }

    let read;
    try {
      read = normalizeStrengthRead(await fetchCrossMethodStrength(anchor.value));
    } catch (error) {
      return {
        owner: "research_strategy_layer_law",
        status: CAPABILITY_STATUS.CONTEXT_REQUIRED,
        reason: "governed cross_method_strength reader refused or failed before a classified result was returned",
        findings: [],
        accessClass: ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED,
        semanticClass: SEMANTIC_CLASS.DERIVATION,
        versionRefs: [CROSS_SIGNATURE_ADAPTER_VERSION],
        trace: { reader_available: true, error_class: error?.name || "Error" },
      };
    }

    if (!read) {
      return {
        owner: "research_strategy_layer_law",
        status: CAPABILITY_STATUS.CONTEXT_REQUIRED,
        reason: "governed cross_method_strength reader must return explicit status + accessTier",
        findings: [],
        accessClass: ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED,
        semanticClass: SEMANTIC_CLASS.DERIVATION,
        versionRefs: [CROSS_SIGNATURE_ADAPTER_VERSION],
        trace: { reader_available: true, classified_result: false },
      };
    }

    const accessClass = accessClassForTier(read.accessTier);
    if (read.status === "denied") {
      return {
        owner: "research_strategy_layer_law",
        status: CAPABILITY_STATUS.CONTEXT_REQUIRED,
        reason: read.reason || "governed cross_method_strength reader denied this access context",
        findings: [],
        accessClass,
        semanticClass: SEMANTIC_CLASS.DERIVATION,
        versionRefs: [CROSS_SIGNATURE_ADAPTER_VERSION, read.versionRef],
        trace: { reader_status: "denied", access_tier: read.accessTier },
      };
    }
    if (read.status === "failed") {
      return {
        owner: "research_strategy_layer_law",
        status: CAPABILITY_STATUS.FAILED,
        reason: read.reason || "governed cross_method_strength reader failed",
        findings: [],
        accessClass,
        semanticClass: SEMANTIC_CLASS.DERIVATION,
        versionRefs: [CROSS_SIGNATURE_ADAPTER_VERSION, read.versionRef],
        trace: { reader_status: "failed", access_tier: read.accessTier },
      };
    }
    if (read.status === "not_found") {
      return {
        owner: "research_strategy_layer_law",
        status: CAPABILITY_STATUS.NEGATIVE_RESULT,
        reason: "governed cross_method_strength reader completed and found no row for this number",
        findings: [],
        negativeScope: {
          value: anchor.value,
          source: read.sourceRef,
        },
        accessClass,
        semanticClass: SEMANTIC_CLASS.DERIVATION,
        sourceRefs: [`number:${anchor.value}`, read.sourceRef],
        versionRefs: [CROSS_SIGNATURE_ADAPTER_VERSION, read.versionRef],
        trace: { reader_status: "not_found", access_tier: read.accessTier },
      };
    }

    const signature = normalizeCrossMethodStrengthRow(read.row);
    if (!signature || signature.value !== anchor.value) {
      return {
        owner: "research_strategy_layer_law",
        status: CAPABILITY_STATUS.FAILED,
        reason: "governed cross_method_strength reader returned an invalid or mismatched row",
        findings: [],
        accessClass,
        semanticClass: SEMANTIC_CLASS.DERIVATION,
        versionRefs: [CROSS_SIGNATURE_ADAPTER_VERSION, read.versionRef],
        trace: { reader_status: "ok", access_tier: read.accessTier, row_valid: false },
      };
    }

    const lookupResult = await supabase.rpc("fn_number_lookup", {
      p_value: anchor.value,
      p_limit: cap,
      p_after_bid_id: null,
    });
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
      accessTier: read.accessTier,
      strengthSourceRef: read.sourceRef,
    });

    return {
      owner: "research_strategy_layer_law",
      status: CAPABILITY_STATUS.EXECUTED,
      findings: finding ? [finding] : [],
      findingOutcomes: finding ? [{
        findingId: finding.id,
        evidenceRelation: EVIDENCE_RELATION.CONVERGENCE,
        convergenceKey: `cross-signature:number:${anchor.value}`,
        reason: "dependency-normalized Cross signature is synthesis fuel, but remains a convergence/derivation rather than independent corroboration",
      }] : [],
      accessClass,
      semanticClass: SEMANTIC_CLASS.DERIVATION,
      sourceRefs: [
        `number:${anchor.value}`,
        read.sourceRef,
        "rpc:fn_number_lookup",
      ],
      versionRefs: [
        CROSS_SIGNATURE_ADAPTER_VERSION,
        read.versionRef,
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
        reader_status: "ok",
        access_tier: read.accessTier,
        value: anchor.value,
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
