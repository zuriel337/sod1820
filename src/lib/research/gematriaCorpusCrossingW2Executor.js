import { normalizeForCalc, onlyHeb } from '../gematria.js';
import { stableIdentityDigest } from './researchRepresentations.js';
import { ACCESS_CLASS, CAPABILITY_STATUS, EVIDENCE_RELATION, SEMANTIC_CLASS } from './researchResultBundle.js';
import { makeUniversalFinding } from './universalFinding.js';

export const GEMATRIA_CORPUS_CROSSING_ADAPTER_VERSION = 'gematria-corpus-crossing-w2-v1';
export const GEMATRIA_CORPUS_CROSSING_RPC = 'strongest_crossings';

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 12;
const MIN_METHODS = 2;
const MAX_TEXT_CODEPOINTS = 160;

function clean(value) {
  if (value == null) return '';
  return String(value).trim();
}

function boundedHebrewText(value) {
  const text = clean(value);
  if (!text || Array.from(text).length > MAX_TEXT_CODEPOINTS) return null;
  return onlyHeb(normalizeForCalc(text)).length > 0 ? text : null;
}

function anagramKey(value) {
  return Array.from(onlyHeb(normalizeForCalc(value))).sort().join('');
}

function parseMethodsDetail(value) {
  const methods = [];
  const seen = new Set();
  for (const part of clean(value).split(/\s*·\s*/u)) {
    const match = part.match(/^(.{1,40}?)\s*=\s*(-?\d{1,15})$/u);
    if (!match) continue;
    const method = clean(match[1]);
    const number = Number(match[2]);
    if (!method || !Number.isSafeInteger(number) || seen.has(method)) continue;
    seen.add(method);
    methods.push(Object.freeze({ method, value: number }));
  }
  return Object.freeze(methods);
}

function projectRow(expression, raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const partner = boundedHebrewText(raw.partner);
  const declaredMethodCount = Number(raw.n_methods);
  const methods = parseMethodsDetail(raw.methods_detail);
  if (!partner || !Number.isSafeInteger(declaredMethodCount) || declaredMethodCount < MIN_METHODS) return null;
  if (methods.length < MIN_METHODS) return null;

  const normalizedExpression = normalizeForCalc(expression);
  const normalizedPartner = normalizeForCalc(partner);
  if (!normalizedPartner || normalizedPartner === normalizedExpression) return null;
  if (anagramKey(partner) === anagramKey(expression)) return null;

  return Object.freeze({
    partner,
    method_count: Math.min(declaredMethodCount, methods.length),
    methods,
  });
}

function crossingFinding(expression, row) {
  const pairDigest = stableIdentityDigest(`${normalizeForCalc(expression)}|${normalizeForCalc(row.partner)}`);
  const inputRef = `expression:${stableIdentityDigest(normalizeForCalc(expression))}`;
  const partnerRef = `public-corpus-expression:${stableIdentityDigest(normalizeForCalc(row.partner))}`;
  const engineResult = {
    relation_kind: 'multi_method_corpus_convergence',
    method_count: row.method_count,
    methods: row.methods,
    minimum_required_methods: MIN_METHODS,
    dependency_independence_claimed: false,
  };

  return makeUniversalFinding({
    kind: 'gematria-crossing',
    subject: {
      type: 'relation',
      key: `gematria-crossing:${pairDigest}`,
      label: `${expression} ↔ ${row.partner}`,
      lang: 'he',
    },
    source: {
      engine: GEMATRIA_CORPUS_CROSSING_RPC,
      adapter: GEMATRIA_CORPUS_CROSSING_ADAPTER_VERSION,
      sourceRef: `rpc:${GEMATRIA_CORPUS_CROSSING_RPC}`,
      method: GEMATRIA_CORPUS_CROSSING_RPC,
      corpus: 'gematria_words/bidim',
      lang: 'he',
    },
    identity: {
      sourceIdentity: `${GEMATRIA_CORPUS_CROSSING_RPC}:${pairDigest}`,
      relationRef: `gematria-crossing:${pairDigest}`,
    },
    verification: {
      claimed_expression: null,
      claimed_method: null,
      claimed_value: null,
      engine_method_tested: GEMATRIA_CORPUS_CROSSING_RPC,
      engine_result: engineResult,
      verification_state: 'not_tested',
    },
    evidence: {
      refs: [inputRef, partnerRef],
      facts: [{
        type: 'gematria-multi-method-corpus-crossing',
        expression,
        partner: row.partner,
        ...engineResult,
      }],
    },
    access: {
      tier: 'public',
      reason: 'the crossing adapter reads only the verified and published public corpus RPC',
    },
    provenance: {
      createdBy: `ENGINE:${GEMATRIA_CORPUS_CROSSING_RPC}`,
      inputRef,
      parentFindingIds: [],
    },
    projection: {
      dimensions: {
        endpoints: [expression, row.partner],
        methods: row.methods,
        method_count: row.method_count,
        independence: 'not_claimed',
      },
    },
  });
}

/**
 * Adapter over the existing public strongest_crossings RPC.
 *
 * It performs no Gematria calculation and no model call. One exact expression enters one bounded
 * corpus query; returned rows become Universal Findings and are explicitly classified as
 * convergence rather than independent evidence.
 */
export function createGematriaCorpusCrossingW2Executor({ supabase, limit = DEFAULT_LIMIT } = {}) {
  if (typeof supabase?.rpc !== 'function') throw new Error('canonical Supabase RPC client required');
  const boundedLimit = Math.max(1, Math.min(Number(limit) || DEFAULT_LIMIT, MAX_LIMIT));

  return async ({ identityResolution }) => {
    const primary = identityResolution?.primary;
    const expression = primary && ['phrase', 'word'].includes(primary.type)
      ? boundedHebrewText(primary.label ?? primary.value)
      : null;
    if (!expression || identityResolution?.explicit_text_computation !== true) {
      return {
        owner: 'research_strategy_layer_law',
        status: CAPABILITY_STATUS.SKIPPED,
        reason: 'crossings require one exact Hebrew phrase and explicit text computation',
        findings: [],
        accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
        semanticClass: SEMANTIC_CLASS.DERIVATION,
        versionRefs: [GEMATRIA_CORPUS_CROSSING_ADAPTER_VERSION, `rpc:${GEMATRIA_CORPUS_CROSSING_RPC}`],
        cost: { certainty: 'not_billable', ai_calls: 0, rpc_calls: 0, retry_count: 0 },
        trace: { minimum_methods: MIN_METHODS, result_limit: boundedLimit },
      };
    }

    let output;
    try {
      output = await supabase.rpc(GEMATRIA_CORPUS_CROSSING_RPC, {
        p_self: expression,
        p_min: MIN_METHODS,
        p_limit: boundedLimit,
      });
    } catch (error) {
      return {
        owner: 'research_strategy_layer_law',
        status: CAPABILITY_STATUS.FAILED,
        reason: 'canonical corpus crossing RPC failed',
        findings: [],
        accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
        semanticClass: SEMANTIC_CLASS.DERIVATION,
        versionRefs: [GEMATRIA_CORPUS_CROSSING_ADAPTER_VERSION, `rpc:${GEMATRIA_CORPUS_CROSSING_RPC}`],
        cost: { certainty: 'not_billable', ai_calls: 0, rpc_calls: 1, retry_count: 0 },
        trace: { error_class: error?.name || 'Error', minimum_methods: MIN_METHODS, result_limit: boundedLimit },
      };
    }
    if (output?.error || !Array.isArray(output?.data)) {
      return {
        owner: 'research_strategy_layer_law',
        status: CAPABILITY_STATUS.FAILED,
        reason: 'canonical corpus crossing RPC returned an invalid response',
        findings: [],
        accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
        semanticClass: SEMANTIC_CLASS.DERIVATION,
        versionRefs: [GEMATRIA_CORPUS_CROSSING_ADAPTER_VERSION, `rpc:${GEMATRIA_CORPUS_CROSSING_RPC}`],
        cost: { certainty: 'not_billable', ai_calls: 0, rpc_calls: 1, retry_count: 0 },
        trace: { error_class: output?.error ? 'RpcError' : 'InvalidResponse', minimum_methods: MIN_METHODS, result_limit: boundedLimit },
      };
    }

    const findings = output.data
      .slice(0, boundedLimit)
      .map(row => projectRow(expression, row))
      .filter(Boolean)
      .map(row => crossingFinding(expression, row));
    const status = findings.length ? CAPABILITY_STATUS.EXECUTED : CAPABILITY_STATUS.NEGATIVE_RESULT;

    return {
      owner: 'research_strategy_layer_law',
      status,
      reason: findings.length
        ? null
        : 'the completed public corpus query found no valid multi-method crossing',
      findings,
      findingOutcomes: findings.map(finding => ({
        findingId: finding.id,
        evidenceRelation: EVIDENCE_RELATION.CONVERGENCE,
        reason: 'multiple method matches form a corpus convergence; formula independence is not claimed',
      })),
      accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
      semanticClass: SEMANTIC_CLASS.DERIVATION,
      negativeScope: status === CAPABILITY_STATUS.NEGATIVE_RESULT ? {
        operation: 'strongest_crossings',
        minimum_methods: MIN_METHODS,
        result_limit: boundedLimit,
        completed: true,
      } : null,
      sourceRefs: [`rpc:${GEMATRIA_CORPUS_CROSSING_RPC}`, 'public:gematria_words', 'public:bidim'],
      versionRefs: [GEMATRIA_CORPUS_CROSSING_ADAPTER_VERSION, `rpc:${GEMATRIA_CORPUS_CROSSING_RPC}`],
      cost: { certainty: 'not_billable', ai_calls: 0, rpc_calls: 1, retry_count: 0 },
      bounded: {
        total_count: null,
        returned_count: findings.length,
        truncated: false,
        ordering: 'engine_n_methods_desc__engine_phrase_length_asc',
        continuation: null,
      },
      trace: {
        minimum_methods: MIN_METHODS,
        result_limit: boundedLimit,
        raw_row_count: output.data.length,
        admitted_finding_count: findings.length,
        source_total_known: false,
        may_have_more: output.data.length >= boundedLimit,
      },
    };
  };
}

export default createGematriaCorpusCrossingW2Executor;
