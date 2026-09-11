import { researchNumber, numericLensMap } from './numericResearch.js';
import { CAPABILITY_STATUS, EVIDENCE_RELATION } from './researchResultBundle.js';

const SAFE_W2_NUMERIC_LENSES = Object.freeze([
  'number_lookup',
  'number_dossier',
  'number_journey',
  'neighbors',
  'hot_context',
  'gematria_reverse',
]);
const SAFE_W2_NUMERIC_LENS_SET = new Set(SAFE_W2_NUMERIC_LENSES);
const DEFAULT_W2_NUMERIC_LENSES = Object.freeze([
  'number_lookup',
  'number_dossier',
  'number_journey',
  'neighbors',
]);

function parseCanonicalNumber(raw) {
  if (typeof raw === 'number') return Number.isSafeInteger(raw) && raw >= 0 ? raw : null;
  if (typeof raw !== 'string') return null;
  const text = raw.trim();
  if (!/^\d+$/.test(text)) return null;
  const number = Number(text);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function numberFromIdentity(identityResolution) {
  const identities = identityResolution?.identities || [];
  for (const identity of identities) {
    if (identity?.type !== 'number') continue;
    const raw = identity?.value ?? identity?.ref ?? identity?.key ?? identity?.label;
    const number = parseCanonicalNumber(raw);
    if (number != null) return number;
  }
  return null;
}

function rpcExecutor(supabase) {
  return async (name, args) => supabase.rpc(name, args);
}

function validateNumericLenses(input) {
  const lenses = Array.isArray(input) && input.length ? [...new Set(input)] : [...DEFAULT_W2_NUMERIC_LENSES];
  const unsafe = lenses.filter(id => !SAFE_W2_NUMERIC_LENS_SET.has(id));
  if (unsafe.length) throw new TypeError(`W2 numeric bridge cannot bypass capability adapters: ${unsafe.join(', ')}`);
  return lenses;
}

function numericLensStatusToCapability(perLens, requested) {
  const missing = requested.filter(id => perLens?.[id]?.status === 'adapter_needed');
  const failed = requested.filter(id => perLens?.[id]?.status === 'error');
  if (failed.length) return { status: CAPABILITY_STATUS.FAILED, reason: `numeric lenses failed: ${failed.join(', ')}` };
  if (missing.length && missing.length === requested.length) return { status: CAPABILITY_STATUS.MISSING_ADAPTER, reason: `numeric adapters missing: ${missing.join(', ')}` };
  return { status: CAPABILITY_STATUS.EXECUTED, reason: missing.length ? `partial numeric coverage; missing: ${missing.join(', ')}` : null };
}

function summarizeLens(value) {
  if (!value || typeof value !== 'object') return { status: 'unknown' };
  const summary = { status: value.status || 'unknown' };
  if (value.rpc) summary.rpc = value.rpc;
  if (value.error) summary.error = String(value.error);
  if (Array.isArray(value.data)) summary.row_count = value.data.length;
  else if (value.data != null) summary.has_data = true;
  return summary;
}

function sequenceExpectedness(number, lensId, sequence) {
  if (lensId !== 'sequence:pi') {
    return { expectedness: 'sequence_specific_not_estimated', expectednessModel: null, baseRate: null };
  }
  const depth = Number(sequence?.search_depth);
  const digits = String(number).length;
  if (!Number.isSafeInteger(depth) || depth <= 0 || digits <= 0) {
    return { expectedness: 'unknown', expectednessModel: 'uniform_digit_stream_heuristic_v1', baseRate: null };
  }
  const windows = Math.max(0, depth - digits + 1);
  const singleWindowRate = 10 ** (-digits);
  const baseRate = windows === 0 ? 0 : 1 - Math.pow(1 - singleWindowRate, windows);
  const expectedness = baseRate >= 0.95
    ? 'near_certain_under_uniform_digit_heuristic'
    : baseRate >= 0.5
      ? 'high_under_uniform_digit_heuristic'
      : baseRate >= 0.05
        ? 'moderate_under_uniform_digit_heuristic'
        : 'low_under_uniform_digit_heuristic';
  return { expectedness, expectednessModel: 'uniform_digit_stream_heuristic_v1', baseRate };
}

function sequenceCapabilityFromResearch(number, lensId, result) {
  const sequence = result?.per_lens?.[lensId];
  if (!sequence) return { owner: 'research_strategy_layer_law', status: CAPABILITY_STATUS.FAILED, reason: `${lensId} returned no result`, findings: [] };
  if (sequence.status === 'error') return { owner: 'research_strategy_layer_law', status: CAPABILITY_STATUS.FAILED, reason: sequence.error || `${lensId} failed`, findings: [], trace: { lens: lensId, status: 'error' } };
  if (sequence.status === 'adapter_needed') return { owner: 'research_strategy_layer_law', status: CAPABILITY_STATUS.MISSING_ADAPTER, reason: sequence.error || `${lensId} adapter missing`, findings: [], trace: { lens: lensId, status: 'adapter_needed' } };

  const foundState = sequence?.result?.found;
  if (foundState === false) {
    return {
      owner: 'research_strategy_layer_law',
      status: CAPABILITY_STATUS.NEGATIVE_RESULT,
      reason: `${number} not found in bounded ${sequence.sequence_id || lensId} search`,
      negativeScope: {
        sequence_id: sequence.sequence_id || lensId.replace('sequence:', ''),
        operation: sequence.operation || null,
        search_depth: sequence.search_depth ?? null,
        position_convention: sequence.position_convention || null,
      },
      findings: [],
      sourceRefs: [result?.provenance?.input_ref || `number:${number}`],
      versionRefs: [sequence.sequence_version || `${lensId}:unknown-version`],
      trace: { lens: lensId, status: 'ok', found: false },
    };
  }
  if (foundState !== true) {
    return {
      owner: 'research_strategy_layer_law',
      status: CAPABILITY_STATUS.UNVERIFIED,
      reason: `${lensId} did not return an explicit found=true/false outcome`,
      findings: [],
      trace: { lens: lensId, status: sequence.status || 'unknown', found: null },
    };
  }

  const findings = result.universal_findings || [];
  const expectedness = sequenceExpectedness(number, lensId, sequence);
  const isHighBaseRatePi = lensId === 'sequence:pi' && expectedness.baseRate != null && expectedness.baseRate >= 0.95;
  return {
    owner: 'research_strategy_layer_law',
    status: CAPABILITY_STATUS.EXECUTED,
    findings,
    findingOutcomes: findings.map(finding => ({
      findingId: finding.id,
      evidenceRelation: EVIDENCE_RELATION.INDEPENDENT_EVIDENCE,
      reason: isHighBaseRatePi
        ? 'independent sequence-engine lineage; occurrence is high-base-rate under a uniform-digit heuristic and is not corroboration by itself'
        : 'independent sequence-engine computation lineage; semantic relevance is not implied',
      expectedness: expectedness.expectedness,
      expectednessModel: expectedness.expectednessModel,
      baseRate: expectedness.baseRate,
    })),
    sourceRefs: [`number:${number}`],
    versionRefs: [sequence.sequence_version || `${lensId}:unknown-version`],
    trace: {
      lens: lensId,
      status: 'ok',
      found: true,
      first_position: sequence?.result?.first_position ?? null,
      search_depth: sequence.search_depth ?? null,
      expectedness: expectedness.expectedness,
      expectedness_model: expectedness.expectednessModel,
      base_rate: expectedness.baseRate,
    },
  };
}

export function createCanonicalNumberW2Executors({ supabase, numericLenses = null } = {}) {
  if (typeof supabase?.rpc !== 'function') throw new Error('canonical Supabase RPC client required');
  const lenses = validateNumericLenses(numericLenses);

  const numericExecutor = async ({ identityResolution }) => {
    const number = numberFromIdentity(identityResolution);
    if (number == null) return { owner: 'research_strategy_layer_law', status: CAPABILITY_STATUS.SKIPPED, reason: 'no canonical number identity resolved', findings: [] };
    const result = await researchNumber(number, {
      lenses,
      rpc: rpcExecutor(supabase),
      provenance: { requestSource: 'research-composer-w2', inputRef: `number:${number}` },
    });
    const capabilityState = numericLensStatusToCapability(result.per_lens, lenses);
    const perLens = Object.fromEntries(Object.entries(result.per_lens || {}).map(([key, value]) => [key, summarizeLens(value)]));
    return {
      owner: 'research_strategy_layer_law',
      ...capabilityState,
      findings: result.universal_findings || [],
      sourceRefs: [`number:${number}`],
      versionRefs: ['numericResearch:v1'],
      trace: { root: result.root, requested_lenses: result.requested_lenses, per_lens: perLens, priority: result.priority },
    };
  };

  const makeSequenceExecutor = lensId => async ({ identityResolution }) => {
    const number = numberFromIdentity(identityResolution);
    if (number == null) return { owner: 'research_strategy_layer_law', status: CAPABILITY_STATUS.SKIPPED, reason: 'no canonical number identity resolved', findings: [] };
    const result = await researchNumber(number, {
      lenses: [lensId],
      rpc: rpcExecutor(supabase),
      budget: { depth: 1 },
      provenance: { requestSource: 'research-composer-w2', inputRef: `number:${number}` },
    });
    return sequenceCapabilityFromResearch(number, lensId, result);
  };

  const researchObjectsExecutor = async ({ identityResolution }) => {
    const number = numberFromIdentity(identityResolution);
    if (number == null) {
      return {
        owner: 'research_strategy_layer_law',
        status: CAPABILITY_STATUS.SKIPPED,
        reason: 'no canonical number identity resolved',
        findings: [],
      };
    }
    return {
      owner: 'research_strategy_layer_law',
      status: CAPABILITY_STATUS.CONTEXT_REQUIRED,
      reason: 'research_objects are deliberately refused until a canonical access-filtered W2 adapter resolves authorization/privacy context',
      findings: [],
      sourceRefs: [`number:${number}`],
      versionRefs: ['research_objects:canonical-access-filter-required'],
      trace: { access: 'refused_fail_closed', reason: 'canonical_access_filter_required' },
    };
  };

  const elsExecutor = async ({ identityResolution }) => {
    const number = numberFromIdentity(identityResolution);
    if (number == null) {
      return {
        owner: 'els_single_engine_law',
        status: CAPABILITY_STATUS.SKIPPED,
        reason: 'number-only W2 bridge does not own text/phrase ELS execution',
        findings: [],
      };
    }
    return {
      owner: 'els_single_engine_law',
      status: CAPABILITY_STATUS.MISSING_ADAPTER,
      reason: numericLensMap.els?.reason || 'no safe number-only ELS dispatch contract',
      findings: [],
      versionRefs: ['numericResearch:els:ADAPTER_NEEDED'],
    };
  };

  return {
    numeric: numericExecutor,
    research_objects: researchObjectsExecutor,
    els: elsExecutor,
    'sequence:pi': makeSequenceExecutor('sequence:pi'),
    'sequence:fibonacci': makeSequenceExecutor('sequence:fibonacci'),
  };
}

export const createCanonicalW2Executors = createCanonicalNumberW2Executors;
export { SAFE_W2_NUMERIC_LENSES };
export default createCanonicalNumberW2Executors;
