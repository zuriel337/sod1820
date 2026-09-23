import { stableIdentityDigest } from "./researchRepresentations.js";

// F4 — Historical AI Output / Resonance Benchmark.
//
// This module intentionally does NOT claim exact historical input replay.
// Live ai_analysis_log stores subject/output/provider/style/engagement, but not
// the original facts/prompt/evidence pack or trace/span identifiers.
//
// Historical content stays private. Benchmark manifests contain only non-content
// metadata + internal analysis refs. Current re-research of the same subject is
// a NEW research run against current owners and must never masquerade as the
// original historical input/evidence pack.

export const HISTORICAL_AI_BENCHMARK_VERSION = "historical-ai-benchmark-v1";

export const HISTORICAL_INPUT_REPLAY_STATUS = Object.freeze({
  NOT_LOGGED: "original_input_pack_not_logged",
  EXTERNAL_LINKAGE_DECLARED: "external_linkage_declared_owner_verification_required",
});

export const HISTORICAL_OUTPUT_SNAPSHOT_STATUS = Object.freeze({
  STORED_BOUNDED_SNAPSHOT: "stored_bounded_snapshot",
  POSSIBLY_TRUNCATED_AT_LOG_LIMIT: "possibly_truncated_at_log_limit",
  MISSING: "missing",
});

export const CURRENT_RERESEARCH_STATUS = Object.freeze({
  ELIGIBLE: "eligible_current_reresearch_only",
  NO_SUBJECT: "no_subject_for_current_reresearch",
});

export const RESONANCE_BUCKET = Object.freeze({
  NEGATIVE: "negative",
  DEEP_ACTION: "deep_action",
  CONTINUED: "continued",
  LIKED: "liked",
  PASSIVE: "passive",
});

const MAX_HISTORICAL_CONTENT_LOG_LENGTH = 4000;

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function nonNegativeInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : 0;
}

function requiredAnalysisId(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new TypeError("historicalAiBenchmark: positive ai_analysis_log id required");
  }
  return n;
}

function safeTimestamp(value) {
  const text = clean(value);
  if (!text || !Number.isFinite(Date.parse(text))) {
    throw new TypeError("historicalAiBenchmark: valid created_at required");
  }
  return text;
}

function contentSnapshotStatus(content) {
  if (typeof content !== "string" || !content.length) {
    return {
      status: HISTORICAL_OUTPUT_SNAPSHOT_STATUS.MISSING,
      stored_length: 0,
      completeness: "unknown",
    };
  }
  const length = content.length;
  if (length >= MAX_HISTORICAL_CONTENT_LOG_LENGTH) {
    return {
      status: HISTORICAL_OUTPUT_SNAPSHOT_STATUS.POSSIBLY_TRUNCATED_AT_LOG_LIMIT,
      stored_length: length,
      completeness: "unknown",
      log_limit: MAX_HISTORICAL_CONTENT_LOG_LENGTH,
    };
  }
  return {
    status: HISTORICAL_OUTPUT_SNAPSHOT_STATUS.STORED_BOUNDED_SNAPSHOT,
    stored_length: length,
    // The logger was never a replay contract, so below-limit does not prove complete output.
    completeness: "unknown",
    log_limit: MAX_HISTORICAL_CONTENT_LOG_LENGTH,
  };
}

export function classifyHistoricalResonance(row = {}) {
  const up = nonNegativeInt(row.up_votes ?? row.upVotes);
  const down = nonNegativeInt(row.down_votes ?? row.downVotes);
  const continued = nonNegativeInt(row.continue_ct ?? row.continueCt);
  const research = nonNegativeInt(row.research_ct ?? row.researchCt);
  const share = nonNegativeInt(row.share_ct ?? row.shareCt);

  let bucket = RESONANCE_BUCKET.PASSIVE;
  if (down > 0) bucket = RESONANCE_BUCKET.NEGATIVE;
  else if (research > 0 || share > 0) bucket = RESONANCE_BUCKET.DEEP_ACTION;
  else if (continued > 0) bucket = RESONANCE_BUCKET.CONTINUED;
  else if (up > 0) bucket = RESONANCE_BUCKET.LIKED;

  return Object.freeze({
    bucket,
    up_votes: up,
    down_votes: down,
    continue_actions: continued,
    research_actions: research,
    shares: share,
    included_in_research_strength: false,
    included_in_person_fit: false,
    included_in_verification: false,
    role: "historical_usefulness_resonance_only",
  });
}

function declaredExternalLinkage(linkage = null) {
  if (!linkage || typeof linkage !== "object") {
    return {
      status: HISTORICAL_INPUT_REPLAY_STATUS.NOT_LOGGED,
      trace_ref_declared: false,
      input_pack_ref_declared: false,
      owner_verification_required: true,
      exact_historical_input_replay_ready: false,
    };
  }

  const traceRef = clean(linkage.trace_ref || linkage.traceRef || linkage.trace_id || linkage.traceId);
  const inputPackRef = clean(
    linkage.input_pack_ref
    || linkage.inputPackRef
    || linkage.source_bundle_ref
    || linkage.sourceBundleRef
    || linkage.input_ref
    || linkage.inputRef
  );

  if (!traceRef && !inputPackRef) {
    return {
      status: HISTORICAL_INPUT_REPLAY_STATUS.NOT_LOGGED,
      trace_ref_declared: false,
      input_pack_ref_declared: false,
      owner_verification_required: true,
      exact_historical_input_replay_ready: false,
    };
  }

  return {
    status: HISTORICAL_INPUT_REPLAY_STATUS.EXTERNAL_LINKAGE_DECLARED,
    trace_ref_declared: Boolean(traceRef),
    input_pack_ref_declared: Boolean(inputPackRef),
    // Pure adapter does not verify that refs exist or belong to this historical row.
    owner_verification_required: true,
    exact_historical_input_replay_ready: false,
  };
}

/**
 * Convert one private ai_analysis_log row into a privacy-safe benchmark record.
 *
 * Deliberately excluded from returned record:
 * - subject text
 * - content text
 * - user_id
 * - visitor id
 * - any free-text admin_reason
 */
export function historicalAnalysisToBenchmarkRecord(row = {}, {
  externalLinkage = null,
} = {}) {
  const id = requiredAnalysisId(row.id);
  const createdAt = safeTimestamp(row.created_at ?? row.createdAt);
  const subject = clean(row.subject);
  const content = typeof row.content === "string" ? row.content : "";
  const replay = declaredExternalLinkage(externalLinkage);
  const storedOutput = contentSnapshotStatus(content);

  return Object.freeze({
    record_version: 1,
    benchmark_version: HISTORICAL_AI_BENCHMARK_VERSION,
    analysis_ref: `ai_analysis_log:${id}`,
    occurred_at: createdAt,
    kind: clean(row.kind) || "unknown",
    style_key: clean(row.style_key ?? row.styleKey) || "unknown",
    engine: clean(row.engine) || "unknown",
    model: clean(row.model) || "unknown",
    stored_output: storedOutput,
    resonance: classifyHistoricalResonance(row),
    privacy: {
      user_linked: Boolean(row.user_id ?? row.userId),
      visitor_linked: Boolean(row.visitor),
      subject_present: Boolean(subject),
      content_present: Boolean(content),
      raw_subject_exported: false,
      raw_content_exported: false,
      raw_user_id_exported: false,
      raw_visitor_exported: false,
    },
    historical_input_replay: replay,
    current_reresearch: {
      status: subject
        ? CURRENT_RERESEARCH_STATUS.ELIGIBLE
        : CURRENT_RERESEARCH_STATUS.NO_SUBJECT,
      eligible: Boolean(subject),
      // Current research can resolve the subject privately at execution time,
      // but benchmark manifest never exports the subject itself.
      subject_lookup_ref: subject ? `ai_analysis_log:${id}:subject` : null,
      is_historical_input_replay: false,
      truth_boundary: "current owner-native re-research uses current engines/corpus/rules and cannot reconstruct missing historical inputs",
    },
    invariants: {
      resonance_is_not_accuracy: true,
      stored_output_is_not_original_input_pack: true,
      timestamp_proximity_is_not_trace_linkage: true,
      current_reresearch_is_not_historical_replay: true,
      exact_replay_requires_owner_verified_direct_lineage: true,
    },
  });
}

function stratumKey(record) {
  return [
    record.kind,
    record.engine,
    record.model,
    record.style_key,
    record.resonance.bucket,
  ].join("|");
}

function deterministicOrderKey(seed, record) {
  return stableIdentityDigest(`${seed}|${stratumKey(record)}|${record.analysis_ref}`);
}

export function buildHistoricalAiBenchmarkManifest(rows = [], {
  seed,
  perStratum = 4,
  externalLinkages = {},
} = {}) {
  const stableSeed = clean(seed);
  if (!stableSeed) throw new TypeError("historicalAiBenchmark: deterministic sample seed required");
  const cap = Number(perStratum);
  if (!Number.isInteger(cap) || cap < 1 || cap > 100) {
    throw new TypeError("historicalAiBenchmark: perStratum must be an integer 1..100");
  }

  const seen = new Set();
  const records = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const id = requiredAnalysisId(row?.id);
    if (seen.has(id)) throw new TypeError(`historicalAiBenchmark: duplicate analysis id ${id}`);
    seen.add(id);
    const linkage = externalLinkages?.[String(id)] ?? externalLinkages?.[id] ?? null;
    records.push(historicalAnalysisToBenchmarkRecord(row, { externalLinkage: linkage }));
  }

  const groups = new Map();
  for (const record of records) {
    const key = stratumKey(record);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }

  const selected = [];
  const strata = [];
  for (const key of [...groups.keys()].sort()) {
    const population = groups.get(key);
    const ordered = [...population].sort((a, b) => {
      const ak = deterministicOrderKey(stableSeed, a);
      const bk = deterministicOrderKey(stableSeed, b);
      return ak.localeCompare(bk) || a.analysis_ref.localeCompare(b.analysis_ref);
    });
    const sample = ordered.slice(0, cap);
    selected.push(...sample);
    strata.push({
      stratum_key: key,
      population_count: population.length,
      selected_count: sample.length,
    });
  }

  return Object.freeze({
    manifest_version: 1,
    benchmark_version: HISTORICAL_AI_BENCHMARK_VERSION,
    generated_from_rows: records.length,
    seed_fingerprint: stableIdentityDigest(stableSeed),
    per_stratum_cap: cap,
    strata,
    selected_records: selected,
    privacy_boundary: {
      contains_raw_subjects: false,
      contains_raw_outputs: false,
      contains_user_ids: false,
      contains_visitor_ids: false,
      private_row_fetch_required_for_claim_extraction: true,
    },
    replay_boundary: {
      historical_input_pack_available_from_ai_analysis_log: false,
      timestamp_join_forbidden: true,
      current_reresearch_must_be_labeled_current: true,
    },
    learning_boundary: {
      resonance_may_inform_style_usefulness: true,
      resonance_may_inform_truth: false,
      resonance_may_inform_person_fit: false,
      automatic_policy_promotion: false,
    },
  });
}

function aggregateKey(record) {
  return [record.kind, record.engine, record.model, record.resonance.bucket].join("|");
}

export function summarizeHistoricalAiBenchmark(records = []) {
  const groups = new Map();
  let possiblyTruncated = 0;
  let userLinked = 0;
  let replayReady = 0;

  for (const record of Array.isArray(records) ? records : []) {
    if (!record?.analysis_ref || !record?.resonance) {
      throw new TypeError("historicalAiBenchmark: benchmark record required");
    }
    if (record.stored_output?.status === HISTORICAL_OUTPUT_SNAPSHOT_STATUS.POSSIBLY_TRUNCATED_AT_LOG_LIMIT) {
      possiblyTruncated += 1;
    }
    if (record.privacy?.user_linked) userLinked += 1;
    if (record.historical_input_replay?.exact_historical_input_replay_ready) replayReady += 1;

    const key = aggregateKey(record);
    if (!groups.has(key)) {
      groups.set(key, {
        group_key: key,
        rows: 0,
        up_votes: 0,
        down_votes: 0,
        continue_actions: 0,
        research_actions: 0,
        shares: 0,
      });
    }
    const g = groups.get(key);
    g.rows += 1;
    g.up_votes += record.resonance.up_votes;
    g.down_votes += record.resonance.down_votes;
    g.continue_actions += record.resonance.continue_actions;
    g.research_actions += record.resonance.research_actions;
    g.shares += record.resonance.shares;
  }

  return Object.freeze({
    summary_version: 1,
    benchmark_version: HISTORICAL_AI_BENCHMARK_VERSION,
    rows: Array.isArray(records) ? records.length : 0,
    user_linked_rows: userLinked,
    possibly_truncated_output_rows: possiblyTruncated,
    exact_historical_input_replay_ready_rows: replayReady,
    groups: [...groups.values()].sort((a, b) => a.group_key.localeCompare(b.group_key)),
    conclusions_allowed: [
      "historical resonance/usefulness distribution",
      "provider/model/style/kind interaction patterns",
      "sampling candidates for private claim extraction",
    ],
    conclusions_forbidden: [
      "historical factual accuracy from engagement",
      "person fit from likes or research clicks",
      "exact original-input replay without owner-verified direct lineage",
      "historical engine state reconstructed from current re-research",
    ],
  });
}

export function classifyCurrentReresearchComparison({
  historicalRecord,
  currentRunRef,
  currentBundleVersion = null,
  currentEngineVersions = [],
  currentCorpusVersion = null,
} = {}) {
  if (!historicalRecord?.analysis_ref) {
    throw new TypeError("historicalAiBenchmark: historicalRecord required");
  }
  const runRef = clean(currentRunRef);
  if (!runRef) throw new TypeError("historicalAiBenchmark: currentRunRef required");

  return Object.freeze({
    comparison_version: 1,
    historical_analysis_ref: historicalRecord.analysis_ref,
    current_run_ref: runRef,
    current_bundle_version: currentBundleVersion,
    current_engine_versions: [...new Set((Array.isArray(currentEngineVersions) ? currentEngineVersions : []).map(clean).filter(Boolean))],
    current_corpus_version: clean(currentCorpusVersion),
    comparison_class: "current_reresearch_vs_historical_output",
    historical_input_reconstructed: false,
    may_compare: [
      "claim grounding under current owners",
      "current dependency normalization",
      "current corpus controls",
      "wording/resonance versus current synthesis",
    ],
    may_not_claim: [
      "the historical model saw the current evidence pack",
      "the historical output is replayed from original inputs",
      "current findings existed or were available at historical generation time",
    ],
  });
}
