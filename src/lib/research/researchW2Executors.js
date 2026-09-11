import { researchNumber, numericLensMap, NUMERIC_LENS_STATUS } from './numericResearch.js';
import { CAPABILITY_STATUS } from './researchResultBundle.js';

function numberFromIdentity(identityResolution) {
  const identities = identityResolution?.identities || [];
  for (const identity of identities) {
    const raw = identity?.value ?? identity?.ref ?? identity?.key ?? identity?.label;
    const n = Number(raw);
    if (Number.isSafeInteger(n) && n >= 0) return n;
  }
  return null;
}

function rpcExecutor(supabase) {
  return async (name, args) => supabase.rpc(name, args);
}

function researchObjectFetcher(supabase) {
  return async (number, { limit = 25 } = {}) => {
    const { data, error } = await supabase
      .from('research_objects')
      .select('*')
      .or(`value.eq.${number},terms.cs.{${number}},relates.cs.{${number}}`)
      .limit(limit);
    if (error) return { status: 'error', error: error.message || String(error) };
    return { status: 'ok', data: data || [] };
  };
}

function numericLensStatusToCapability(perLens, requested) {
  const missing = requested.filter(id => perLens?.[id]?.status === 'adapter_needed');
  const failed = requested.filter(id => perLens?.[id]?.status === 'error');
  if (failed.length) return { status: CAPABILITY_STATUS.FAILED, reason: `numeric lenses failed: ${failed.join(', ')}` };
  if (missing.length && missing.length === requested.length) return { status: CAPABILITY_STATUS.MISSING_ADAPTER, reason: `numeric adapters missing: ${missing.join(', ')}` };
  return { status: CAPABILITY_STATUS.EXECUTED, reason: missing.length ? `partial numeric coverage; missing: ${missing.join(', ')}` : null };
}

export function createCanonicalW2Executors({ supabase, numericLenses = null } = {}) {
  if (!supabase?.rpc || !supabase?.from) throw new Error('canonical Supabase client required');

  const numberExecutor = async ({ identityResolution }) => {
    const number = numberFromIdentity(identityResolution);
    if (number == null) return { owner: 'Numeric Research Router', status: CAPABILITY_STATUS.SKIPPED, reason: 'no canonical number identity resolved', findings: [] };

    const lenses = numericLenses || [
      'number_lookup',
      'number_dossier',
      'number_journey',
      'neighbors',
      'research_objects',
      'gematria_reverse',
      'sequence:pi',
      'sequence:fibonacci',
    ];
    const result = await researchNumber(number, {
      lenses,
      rpc: rpcExecutor(supabase),
      fetchResearchObjects: researchObjectFetcher(supabase),
      provenance: { requestSource: 'research-composer-w2', inputRef: `number:${number}` },
    });
    const capabilityState = numericLensStatusToCapability(result.per_lens, lenses);
    return {
      owner: 'Numeric Research Router',
      ...capabilityState,
      findings: result.universal_findings || [],
      sourceRefs: [`number:${number}`],
      versionRefs: ['numericResearch:v1'],
      trace: {
        root: result.root,
        requested_lenses: result.requested_lenses,
        per_lens: result.per_lens,
        priority: result.priority,
        relation_candidates: result.relation_candidates,
        derived_numeric_roots: result.derived_numeric_roots,
      },
    };
  };

  const elsExecutor = async () => ({
    owner: 'ELS',
    status: CAPABILITY_STATUS.MISSING_ADAPTER,
    reason: numericLensMap.els?.reason || 'no safe number-only ELS dispatch contract',
    findings: [],
    versionRefs: ['numericResearch:els:ADAPTER_NEEDED'],
  });

  return {
    number: numberExecutor,
    numeric: numberExecutor,
    gematria: numberExecutor,
    els: elsExecutor,
  };
}

export default createCanonicalW2Executors;
