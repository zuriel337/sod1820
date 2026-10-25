import { normalizeForCalc, onlyHeb } from '../gematria.js';
import { stableIdentityDigest } from './researchRepresentations.js';
import { ACCESS_CLASS, CAPABILITY_STATUS, EVIDENCE_RELATION, SEMANTIC_CLASS } from './researchResultBundle.js';
import { makeUniversalFinding } from './universalFinding.js';
import { projectGematriaRelationCandidateSummary } from './gematriaRelationW2Executor.js';

export const GEMATRIA_CORPUS_CROSSING_ADAPTER_VERSION = 'gematria-corpus-crossing-w2-v3';
export const GEMATRIA_CORPUS_CROSSING_RPC = 'strongest_crossings';
export const GEMATRIA_CONFIRMED_RELATION_SOURCE = 'public:relation_evidence';
export const GEMATRIA_METHOD_SEMANTICS_SOURCE = 'public:method_semantics';

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 12;
const MIN_METHODS = 2;
const MAX_TEXT_CODEPOINTS = 160;
const MAX_RELATION_NOTE_CODEPOINTS = 640;

function clean(value) {
  if (value == null) return '';
  return String(value).trim();
}

function boundedHebrewText(value) {
  const text = clean(value);
  if (!text || Array.from(text).length > MAX_TEXT_CODEPOINTS) return null;
  return onlyHeb(normalizeForCalc(text)).length > 0 ? text : null;
}

function boundedText(value, max = MAX_RELATION_NOTE_CODEPOINTS) {
  const text = clean(value).replace(/\s+/gu, ' ');
  if (!text) return null;
  return Array.from(text).slice(0, max).join('');
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
    relation_normalization: row.relation_normalization || null,
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

function projectConfirmedRelation(expression, raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (raw.status !== 'confirmed' || raw.engine_verified !== true) return null;
  const aPhrase = boundedHebrewText(raw.a_phrase);
  const bPhrase = boundedHebrewText(raw.b_phrase);
  const method = boundedText(raw.method, 80);
  const relationType = boundedText(raw.relation_type, 80);
  const value = Number(raw.value);
  if (!aPhrase || !bPhrase || !method || !relationType || !Number.isSafeInteger(value)) return null;

  const normalizedExpression = normalizeForCalc(expression);
  const expressionIsA = normalizeForCalc(aPhrase) === normalizedExpression;
  const expressionIsB = normalizeForCalc(bPhrase) === normalizedExpression;
  if (expressionIsA === expressionIsB) return null;
  const partner = expressionIsA ? bPhrase : aPhrase;
  const expressionMethod = expressionIsA ? method : 'רגיל';
  const partnerMethod = expressionIsA ? 'רגיל' : method;
  const semantic = raw.semantic && typeof raw.semantic === 'object' ? Object.freeze({
    profile: boundedText(raw.semantic.profile, 40),
    relation_type: boundedText(raw.semantic.relation_type, 80),
    label_he: boundedText(raw.semantic.label_he, 120),
    calculation_description: boundedText(raw.semantic.calculation_description),
    semantic_description: boundedText(raw.semantic.semantic_description),
    confidence_source: boundedText(raw.semantic.confidence_source, 60),
    review_version: boundedText(raw.semantic.review_version, 60),
  }) : null;

  return Object.freeze({
    expression,
    partner,
    method_phrase: aPhrase,
    regular_phrase: bPhrase,
    method,
    relation_type: relationType,
    value,
    expression_method: expressionMethod,
    partner_method: partnerMethod,
    note: boundedText(raw.note),
    semantic,
  });
}

function confirmedRelationFindings(expression, row) {
  const pairDigest = stableIdentityDigest([
    normalizeForCalc(row.method_phrase),
    normalizeForCalc(row.regular_phrase),
    row.method,
    row.value,
  ].join('|'));
  const inputRef = `expression:${stableIdentityDigest(normalizeForCalc(expression))}`;
  const partnerRef = `public-corpus-expression:${stableIdentityDigest(normalizeForCalc(row.partner))}`;
  const relationRef = `confirmed-gematria-relation:${pairDigest}`;
  const engineResult = {
    relation_kind: 'confirmed_cross_method_relation',
    relation_type: row.relation_type,
    expression: row.expression,
    partner: row.partner,
    value: row.value,
    expression_method: row.expression_method,
    partner_method: row.partner_method,
    engine_verified: true,
    dependency_independence_claimed: false,
  };
  const relation = makeUniversalFinding({
    kind: 'gematria-confirmed-relation',
    stage: 'evidence',
    status: 'confirmed',
    subject: {
      type: 'relation',
      key: relationRef,
      label: `${expression} (${row.expression_method}) ↔ ${row.partner} (${row.partner_method})`,
      lang: 'he',
      value: row.value,
    },
    source: {
      engine: 'relation_evidence',
      adapter: GEMATRIA_CORPUS_CROSSING_ADAPTER_VERSION,
      name: 'ממצאי המחקר המאושרים של SOD1820',
      sourceRef: `${GEMATRIA_CONFIRMED_RELATION_SOURCE}:${pairDigest}`,
      method: row.method,
      corpus: 'relation_evidence',
      lang: 'he',
    },
    identity: {
      sourceIdentity: `relation_evidence:${pairDigest}`,
      relationRef,
    },
    verification: {
      claimed_expression: `${expression} (${row.expression_method}) = ${row.partner} (${row.partner_method})`,
      claimed_method: row.method,
      claimed_value: row.value,
      engine_method_tested: `${row.expression_method}↔${row.partner_method}`,
      engine_result: engineResult,
      verification_state: 'match',
    },
    evidence: {
      refs: [inputRef, partnerRef, `${GEMATRIA_CONFIRMED_RELATION_SOURCE}:${pairDigest}`],
      facts: [{
        type: 'gematria-confirmed-cross-method-relation',
        ...engineResult,
      }],
    },
    access: {
      tier: 'public',
      reason: 'confirmed engine-verified relation whose other endpoint passed the verified published public-corpus boundary',
    },
    provenance: {
      createdBy: 'SOURCE:relation_evidence',
      inputRef,
      parentFindingIds: [],
    },
    projection: {
      dimensions: {
        endpoints: [expression, row.partner],
        expression_method: row.expression_method,
        partner_method: row.partner_method,
        relation_type: row.relation_type,
        independence: 'not_claimed',
      },
    },
  });

  const semanticFields = row.semantic && Object.values(row.semantic).some(Boolean);
  if (!semanticFields) return Object.freeze([relation]);
  const semanticDigest = stableIdentityDigest(`${pairDigest}|${row.semantic?.review_version || ''}|${row.note || ''}`);
  const interpretation = makeUniversalFinding({
    kind: 'gematria-method-semantic',
    stage: 'interpretation',
    status: 'approved',
    subject: {
      type: 'relation',
      key: `gematria-method-semantic:${semanticDigest}`,
      label: `${row.method}${row.semantic?.label_he ? ` — ${row.semantic.label_he}` : ''}`,
      lang: 'he',
    },
    source: {
      engine: 'method_semantics',
      adapter: GEMATRIA_CORPUS_CROSSING_ADAPTER_VERSION,
      name: 'מודל המשמעות המאושר של SOD1820',
      sourceRef: `${GEMATRIA_METHOD_SEMANTICS_SOURCE}:${semanticDigest}`,
      method: row.method,
      corpus: 'method_semantics/relation_evidence',
      lang: 'he',
    },
    identity: {
      sourceIdentity: `method_semantics:${semanticDigest}`,
      relationRef,
    },
    verification: {
      claimed_expression: null,
      claimed_method: row.method,
      claimed_value: null,
      engine_method_tested: null,
      engine_result: null,
      verification_state: 'not_tested',
    },
    evidence: {
      refs: [
        `${GEMATRIA_METHOD_SEMANTICS_SOURCE}:${semanticDigest}`,
        relation.source.sourceRef,
        relation.id,
      ],
      facts: [{
        type: 'gematria-method-semantic-interpretation',
        method: row.method,
        relation_type: row.semantic?.relation_type || row.relation_type,
        label_he: row.semantic?.label_he || null,
        calculation_description: row.semantic?.calculation_description || null,
        semantic_description: row.semantic?.semantic_description || null,
        relation_note: row.note || null,
        confidence_source: row.semantic?.confidence_source || null,
        review_version: row.semantic?.review_version || null,
        profile: row.semantic?.profile || 'sod1820',
        relation: relation.id,
      }],
    },
    access: {
      tier: 'public',
      reason: 'approved public SOD1820 method-semantic interpretation attached to admitted public relation evidence',
    },
    provenance: {
      createdBy: 'SOURCE:method_semantics',
      inputRef,
      parentFindingIds: [relation.id],
    },
  });
  return Object.freeze([relation, interpretation]);
}

/**
 * Adapter over the existing public strongest_crossings RPC.
 *
 * It performs no Gematria calculation and no model call. One exact expression enters one bounded
 * corpus query; returned rows become Universal Findings and are explicitly classified as
 * convergence rather than independent evidence.
 */
export function createGematriaCorpusCrossingW2Executor({
  supabase,
  limit = DEFAULT_LIMIT,
  readConfirmedRelations = null,
  normalizeRelations = false,
} = {}) {
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

    const crossingPromise = supabase.rpc(GEMATRIA_CORPUS_CROSSING_RPC, {
        p_self: expression,
        p_min: MIN_METHODS,
        p_limit: boundedLimit,
      }).then(output => ({ output, error: null }))
        .catch(error => ({ output: null, error }));
    const relationPromise = typeof readConfirmedRelations === 'function'
      ? Promise.resolve().then(() => readConfirmedRelations({ expression }))
        .then(output => ({ output, error: null }))
        .catch(error => ({ output: null, error }))
      : Promise.resolve({ output: { status: 'not_configured', rows: [], rest_calls: 0 }, error: null });
    const [crossingRead, relationRead] = await Promise.all([crossingPromise, relationPromise]);

    const crossingOutput = crossingRead.output;
    const crossingComplete = !crossingRead.error && !crossingOutput?.error && Array.isArray(crossingOutput?.data);
    const projectedCrossings = crossingComplete ? crossingOutput.data
      .slice(0, boundedLimit)
      .map(row => projectRow(expression, row))
      .filter(Boolean) : [];

    // Pair normalization is an optional, bounded enrichment over the SAME canonical RPC already
    // owned by the Relation Engine. It never replaces or deletes the raw crossing, and a failed
    // enrichment leaves the crossing visible while marking the capability partial.
    const normalizationReads = normalizeRelations ? await Promise.all(projectedCrossings.map(async (row) => {
      try {
        const response = await supabase.rpc('fn_relation_candidate', { p_a: expression, p_b: row.partner });
        if (response?.error) throw response.error;
        const candidate = response && typeof response === 'object' && Object.prototype.hasOwnProperty.call(response, 'data')
          ? response.data
          : response;
        if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
          return { status: 'executed_empty', summary: null };
        }
        return {
          status: 'available',
          summary: {
            source: 'rpc:fn_relation_candidate',
            ...projectGematriaRelationCandidateSummary(candidate),
          },
        };
      } catch (error) {
        return { status: 'failed', error_class: error?.name || 'Error', summary: null };
      }
    })) : [];
    const crossingFindings = projectedCrossings.map((row, index) => crossingFinding(expression, {
      ...row,
      relation_normalization: normalizationReads[index]?.summary || null,
    }));

    const relationOutput = relationRead.output;
    const relationConfigured = typeof readConfirmedRelations === 'function';
    const relationUsable = relationConfigured
      && !relationRead.error
      && ['available', 'partial'].includes(relationOutput?.status)
      && Array.isArray(relationOutput?.rows);
    const relationComplete = !relationConfigured
      || (relationUsable && relationOutput?.status === 'available');
    const projectedRelations = relationUsable
      ? relationOutput.rows.map(row => projectConfirmedRelation(expression, row)).filter(Boolean)
      : [];
    const relationFindings = projectedRelations.flatMap(row => confirmedRelationFindings(expression, row));
    const findings = [...relationFindings, ...crossingFindings];
    const normalizationComplete = !normalizeRelations
      || normalizationReads.every((read) => ['available', 'executed_empty'].includes(read?.status));
    const allSourcesComplete = crossingComplete && relationComplete && normalizationComplete;
    const status = findings.length
      ? CAPABILITY_STATUS.EXECUTED
      : allSourcesComplete ? CAPABILITY_STATUS.NEGATIVE_RESULT : CAPABILITY_STATUS.FAILED;
    const relationFindingIds = new Set(relationFindings.map(finding => finding.id));
    const confirmedRelationIds = new Set(relationFindings
      .filter(finding => finding.kind === 'gematria-confirmed-relation')
      .map(finding => finding.id));

    return {
      owner: 'research_strategy_layer_law',
      status,
      reason: findings.length
        ? allSourcesComplete ? null : 'completed with partial canonical crossing-source coverage'
        : allSourcesComplete
          ? 'the completed public crossing sources found no valid relation'
          : 'one or more canonical crossing sources were unavailable',
      findings,
      findingOutcomes: findings.map(finding => ({
        findingId: finding.id,
        evidenceRelation: finding.kind === 'gematria-method-semantic'
          ? EVIDENCE_RELATION.DERIVATION
          : EVIDENCE_RELATION.CONVERGENCE,
        dependsOn: finding.kind === 'gematria-method-semantic'
          ? finding.provenance.parentFindingIds.filter(id => confirmedRelationIds.has(id))
          : [],
        reason: finding.kind === 'gematria-method-semantic'
          ? 'approved SOD1820 method meaning interprets the attached confirmed numerical relation'
          : relationFindingIds.has(finding.id)
            ? 'confirmed engine-verified cross-method equality; formula independence is not claimed'
            : 'multiple method matches form a corpus convergence; formula independence is not claimed',
      })),
      accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
      semanticClass: SEMANTIC_CLASS.DERIVATION,
      negativeScope: status === CAPABILITY_STATUS.NEGATIVE_RESULT ? {
        operation: relationConfigured ? 'expression_crossing_sources' : 'strongest_crossings',
        minimum_methods: MIN_METHODS,
        result_limit: boundedLimit,
        completed: true,
      } : undefined,
      sourceRefs: [
        `rpc:${GEMATRIA_CORPUS_CROSSING_RPC}`,
        ...(normalizeRelations ? ['rpc:fn_relation_candidate'] : []),
        'public:gematria_words',
        'public:bidim',
        ...(relationConfigured ? [GEMATRIA_CONFIRMED_RELATION_SOURCE, GEMATRIA_METHOD_SEMANTICS_SOURCE] : []),
      ],
      versionRefs: [
        GEMATRIA_CORPUS_CROSSING_ADAPTER_VERSION,
        `rpc:${GEMATRIA_CORPUS_CROSSING_RPC}`,
        ...(normalizeRelations ? ['rpc:fn_relation_candidate'] : []),
      ],
      cost: {
        certainty: 'not_billable',
        ai_calls: 0,
        rpc_calls: 1 + (normalizeRelations ? projectedCrossings.length : 0),
        rest_calls: Number(relationOutput?.rest_calls) || 0,
        retry_count: 0,
      },
      bounded: {
        total_count: null,
        returned_count: findings.length,
        truncated: false,
        ordering: relationConfigured
          ? 'confirmed_relation_evidence_first__then_engine_n_methods_desc'
          : 'engine_n_methods_desc__engine_phrase_length_asc',
        continuation: null,
      },
      trace: {
        minimum_methods: MIN_METHODS,
        result_limit: boundedLimit,
        same_method_source: {
          source: `rpc:${GEMATRIA_CORPUS_CROSSING_RPC}`,
          status: crossingComplete ? 'available' : 'unavailable',
          returned_count: crossingComplete ? crossingOutput.data.length : 0,
        },
        relation_normalization: {
          source: 'rpc:fn_relation_candidate',
          requested: normalizeRelations === true,
          status: !normalizeRelations ? 'not_requested' : normalizationComplete ? 'available' : 'partial',
          requested_pair_count: normalizeRelations ? projectedCrossings.length : 0,
          normalized_pair_count: normalizationReads.filter((read) => read?.status === 'available').length,
          empty_pair_count: normalizationReads.filter((read) => read?.status === 'executed_empty').length,
          failed_pair_count: normalizationReads.filter((read) => read?.status === 'failed').length,
        },
        confirmed_relation_source: {
          source: GEMATRIA_CONFIRMED_RELATION_SOURCE,
          status: relationConfigured ? (relationOutput?.status || 'unavailable') : 'not_configured',
          returned_count: projectedRelations.length,
          semantic_status: relationOutput?.semantic_status || null,
          public_endpoint_status: relationOutput?.public_endpoint_status || null,
        },
        raw_row_count: crossingComplete ? crossingOutput.data.length : 0,
        admitted_finding_count: findings.length,
        source_total_known: false,
        may_have_more: crossingComplete && crossingOutput.data.length >= boundedLimit,
        error_class: crossingRead.error?.name
          || (crossingOutput?.error ? 'RpcError' : null)
          || relationRead.error?.name
          || normalizationReads.find((read) => read?.status === 'failed')?.error_class
          || (relationConfigured && !relationUsable ? 'RelationReadError' : null)
          || (relationOutput?.status === 'partial' ? 'PartialRelationRead' : null),
      },
    };
  };
}

export default createGematriaCorpusCrossingW2Executor;
