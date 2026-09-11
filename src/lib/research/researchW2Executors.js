import { researchNumber, numericLensMap } from './numericResearch.js';
import { researchObjectsToUniversalFindings } from './researchObjectFinding.js';
import { makeUniversalFinding } from './universalFinding.js';
import { ACCESS_CLASS, CAPABILITY_STATUS, EVIDENCE_RELATION, SEMANTIC_CLASS } from './researchResultBundle.js';

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

// Canonical NODE IDENTITY HANDOFF. The identity resolver is the only thing allowed to say which
// canonical graph node an identity refers to; this reads that handoff and never derives a node id
// from a label or a value.
function graphNodeRefFromIdentity(identityResolution) {
  const identities = identityResolution?.identities || [];
  for (const identity of identities) {
    const candidates = [identity?.node_id, identity?.nodeId, identity?.ref, identity?.identity_key, identity?.key];
    for (const candidate of candidates) {
      if (typeof candidate !== 'string') continue;
      const text = candidate.trim();
      if (text.startsWith('node:')) {
        const id = text.slice('node:'.length).trim();
        if (id) return id;
      }
      // A bare uuid is accepted only from the explicit node_id fields, never from a free-form key.
      if ((candidate === identity?.node_id || candidate === identity?.nodeId)
        && /^[0-9a-fA-F-]{36}$/.test(text)) return text;
    }
  }
  return null;
}

/**
 * Read live rule_id -> rule_version attestations from the canonical nodes rule registry.
 * Accepts either a reader function or an already-resolved map/object; anything else yields an EMPTY
 * map, which makes the numeric_operators adapter refuse to emit rather than invent a version.
 */
async function resolveNumericRuleVersions(source) {
  const out = new Map();
  try {
    const resolved = typeof source === 'function' ? await source(NUMERIC_SYSTEM_METHOD_RULE_IDS) : source;
    if (!resolved) return out;
    const entries = resolved instanceof Map
      ? [...resolved.entries()]
      : Array.isArray(resolved)
        ? resolved.map(row => [row?.rule_id, row?.rule_version])
        : Object.entries(resolved);
    for (const [ruleId, version] of entries) {
      const id = typeof ruleId === 'string' ? ruleId.trim() : '';
      const v = Number(version);
      if (id && Number.isFinite(v)) out.set(id, v);
    }
  } catch {
    return new Map();
  }
  return out;
}

// Branch B of numeric_rule_family_index — the System Methods. This list is a REQUEST key for the
// live registry read, not a registry: every version still has to come back from nodes.
export const NUMERIC_SYSTEM_METHOD_RULE_IDS = Object.freeze([
  'zero_scale_law',
  'shitat_haechad_alef_law',
  'zero_navigation',
  'moment_clock_law',
]);

/**
 * One Rule Application -> Universal Finding, carrying full Rule Application Provenance.
 * stage is left unset (INVARIANT PR1) and verification is "not_tested": a transform defined by a
 * rule is deterministic, but no CLAIM was submitted for an engine to agree or disagree with.
 */
function ruleApplicationFinding(number, app) {
  return makeUniversalFinding({
    kind: 'numeric-operator',
    stage: null,
    status: null,
    subject: { type: 'number', key: String(number), label: String(number), value: number },
    source: {
      engine: app.engineRef,
      adapter: 'numeric-rule-application-v1',
      sourceRef: `${app.ruleId}:v${app.ruleVersion}`,
      method: app.ruleId,
      corpus: null,
      lang: null,
    },
    identity: {
      // Source-native, stable and reproducible: rule + version + operation + exact input.
      sourceIdentity: { ruleId: app.ruleId, ruleVersion: app.ruleVersion, operation: app.operation, input: app.input },
      occurrence: null,
      entityRef: `number:${number}`,
      relationRef: null,
    },
    verification: {
      claimed_expression: null,
      claimed_method: null,
      claimed_value: null,
      engine_method_tested: app.engineRef,
      engine_result: app.output,
      statement_lang: null,
      verification_state: 'not_tested',
    },
    evidence: {
      refs: [`${app.ruleId}:v${app.ruleVersion}`],
      facts: [{
        type: 'rule-application',
        rule_id: app.ruleId,
        rule_version: app.ruleVersion,
        rule_version_source: app.versionSource,
        operation: app.operation,
        input: app.input,
        output: app.output,
        engine_ref: app.engineRef,
        family: 'zuriel_numeric_research_laws',
        public_family_name: 'שיטות המערכת',
        boundary: 'rule application never changes raw engine truth, canonical status or publication status',
      }],
      score: null,
      confidence: null,
    },
    access: { tier: 'public', reason: 'System Method rules are public canonical rules in nodes' },
    provenance: { createdBy: `RULE:${app.ruleId}@v${app.ruleVersion}`, inputRef: `number:${number}` },
    projection: {
      anchors: [{ space: 'number', value: number }],
      relations: [],
      dimensions: { ruleApplication: { ruleId: app.ruleId, ruleVersion: app.ruleVersion, operation: app.operation } },
    },
    view: { rendererHints: { role: 'rule-application' } },
  });
}

function validateNumericLenses(input, { serverContext = false } = {}) {
  const lenses = Array.isArray(input) && input.length ? [...new Set(input)] : [...DEFAULT_W2_NUMERIC_LENSES];
  const unsafe = lenses.filter(id => !SAFE_W2_NUMERIC_LENS_SET.has(id));
  if (unsafe.length) throw new TypeError(`W2 numeric bridge cannot bypass capability adapters: ${unsafe.join(', ')}`);
  // W2.2b: a lens whose live source is not client-executable must not be dispatched from a client
  // context. fn_hot_context is SECURITY DEFINER with anon_exec=false AND auth_exec=false, so
  // requesting it from the browser produced a permission error dressed up as a lens failure.
  if (!serverContext) {
    const serverOnly = lenses.filter(id => numericLensMap[id]?.client_executable === false);
    if (serverOnly.length) {
      throw new TypeError(`W2 numeric bridge cannot dispatch server-only lenses from a client context: ${serverOnly.join(', ')} (pass serverContext:true only when the caller genuinely holds a service-role/server path)`);
    }
  }
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
    accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
    semanticClass: SEMANTIC_CLASS.EVIDENCE,
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

export function createCanonicalNumberW2Executors({
  supabase,
  numericLenses = null,
  serverContext = false,
  // W2.2b seams. All THREE are dependency-injected on purpose: this bridge must not grow its own
  // research-object reader, its own graph resolver or its own rule registry.
  //   fetchResearchObjects   — an ACCESS-FILTERED reader for research_objects (see below).
  //   graph                  — { fetchEntityFindings } = the EXISTING canonical adapter
  //                            src/lib/research/entityGraphFinding.js. No second graph/resolver.
  //   numericRuleVersions    — live rule_id -> rule_version attestation read from the canonical
  //                            nodes rule registry. Without it, no rule application is emitted.
  fetchResearchObjects = null,
  graph = null,
  numericRuleVersions = null,
} = {}) {
  if (typeof supabase?.rpc !== 'function') throw new Error('canonical Supabase RPC client required');
  const lenses = validateNumericLenses(numericLenses, { serverContext });

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
      // number_lookup rows come from a public, anon-executable contract over is_verified rows.
      accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
      semanticClass: SEMANTIC_CLASS.EVIDENCE,
      bounded: result.bounds?.number_lookup || null,
      sourceRefs: [`number:${number}`],
      versionRefs: ['numericResearch:v1'],
      trace: {
        root: result.root,
        requested_lenses: result.requested_lenses,
        per_lens: perLens,
        priority: result.priority,
        // Honest per-lens classification travels with the trace so a consumer can see WHY only
        // number_lookup produced Findings and the other lenses stayed context/ranking.
        lens_classes: Object.fromEntries(result.requested_lenses.map(id => [id, {
          access_class: numericLensMap[id]?.access_class ?? null,
          semantic_class: numericLensMap[id]?.semantic_class ?? null,
          emits_findings: numericLensMap[id]?.emits_findings ?? null,
        }])),
      },
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

  // ── research_objects · ACCESS-FILTERED SEAM ─────────────────────────────────────────────
  // Live facts (reverified 11.9.2026): public.research_objects grants SELECT to postgres and
  // service_role ONLY — anon/authenticated hold no table privilege at all, so under
  // rls_client_read_protocol the policies never even get a chance to matter for a browser client.
  // The 358 scope is 5 private + 4 public_candidate + 0 public.
  //
  // The missing piece was never the Universal Finding model — researchObjectFinding.js already
  // projects a row correctly and carries privacy_scope through as access.tier. What was missing is
  // the SEAM: somebody must decide which rows this caller may see, and raw rows must never reach a
  // public Bundle. So the reader is injected, its rows go through the existing canonical adapter,
  // and the composition boundary then filters on access.tier with this capability declared
  // SOURCE_ACCESS_CONTROLLED — which means a Finding with no explicit tier is DROPPED, not passed.
  // With no reader injected the behaviour is unchanged: fail-closed CONTEXT_REQUIRED.
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

    if (typeof fetchResearchObjects !== 'function') {
      return {
        owner: 'research_strategy_layer_law',
        status: CAPABILITY_STATUS.CONTEXT_REQUIRED,
        reason: 'research_objects are deliberately refused until a canonical access-filtered W2 adapter resolves authorization/privacy context',
        findings: [],
        accessClass: ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED,
        semanticClass: SEMANTIC_CLASS.EVIDENCE,
        sourceRefs: [`number:${number}`],
        versionRefs: ['research_objects:canonical-access-filter-required'],
        trace: { access: 'refused_fail_closed', reason: 'canonical_access_filter_required' },
      };
    }

    let rows;
    try {
      rows = await fetchResearchObjects(number, { limit: 25 });
    } catch (error) {
      // A permission denial is NOT a negative research result: nothing was searched and found
      // absent — the caller was not allowed to look.
      return {
        owner: 'research_strategy_layer_law',
        status: CAPABILITY_STATUS.CONTEXT_REQUIRED,
        reason: 'access-filtered research_objects reader refused the request',
        findings: [],
        accessClass: ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED,
        semanticClass: SEMANTIC_CLASS.EVIDENCE,
        sourceRefs: [`number:${number}`],
        versionRefs: ['research_objects:access-filtered-reader-v1'],
        trace: { access: 'refused_by_reader', error_class: error?.name || 'Error' },
      };
    }

    const list = Array.isArray(rows) ? rows : Array.isArray(rows?.data) ? rows.data : [];
    const findings = researchObjectsToUniversalFindings(list);
    return {
      owner: 'research_strategy_layer_law',
      status: findings.length ? CAPABILITY_STATUS.EXECUTED : CAPABILITY_STATUS.EXECUTED,
      findings,
      accessClass: ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED,
      semanticClass: SEMANTIC_CLASS.EVIDENCE,
      sourceRefs: [`number:${number}`],
      versionRefs: ['research_objects:access-filtered-reader-v1'],
      // Counts only. Raw rows, statements, contributor names and privacy scopes never enter the
      // trace — the trace is returned to the caller exactly like the Bundle is.
      trace: { access: 'access_filtered_reader', row_count: list.length, projected_findings: findings.length },
    };
  };

  // ── graph · CANONICAL ADAPTER ONLY ──────────────────────────────────────────────────────
  // entityGraphFinding.js already turns a canonical node + its edges into Universal Findings and
  // already honours the nodes/edges public RLS filters. W2 therefore needs NO graph engine and NO
  // second resolver — only the canonical NODE IDENTITY HANDOFF plus that one adapter, both injected.
  // resolveEntityHubNode is deliberately NOT imported here: pulling the Entity Hub projection back
  // into the composer would create a projection-layer cycle (preflight de9969d1 item 7).
  const graphExecutor = async ({ identityResolution }) => {
    const number = numberFromIdentity(identityResolution);
    const nodeRef = graphNodeRefFromIdentity(identityResolution);

    if (typeof graph?.fetchEntityFindings !== 'function') {
      return {
        owner: 'unified_graph_law',
        status: CAPABILITY_STATUS.MISSING_ADAPTER,
        reason: 'inject graph.fetchEntityFindings = fetchCanonicalGraphEntityFindings from src/lib/research/entityGraphFinding.js — W2 owns no graph engine and must not build a second resolver',
        findings: [],
        accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
        semanticClass: SEMANTIC_CLASS.CONTEXT,
        versionRefs: ['entityGraphFinding:canonical-adapter-required'],
      };
    }
    if (!nodeRef) {
      // Identity-first: without a canonical node identity there is nothing to read. Inventing one
      // from a label/value would be exactly the label-keyed identity the contract forbids.
      return {
        owner: 'unified_graph_law',
        status: CAPABILITY_STATUS.CONTEXT_REQUIRED,
        reason: 'no canonical graph node identity was handed off by the identity resolver',
        findings: [],
        accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
        semanticClass: SEMANTIC_CLASS.CONTEXT,
        sourceRefs: number == null ? [] : [`number:${number}`],
        trace: { identity_handoff: 'absent' },
      };
    }

    try {
      const findings = await graph.fetchEntityFindings(nodeRef);
      const list = Array.isArray(findings) ? findings : [];
      return {
        owner: 'unified_graph_law',
        status: CAPABILITY_STATUS.EXECUTED,
        findings: list,
        accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
        // Graph existence is identity/structure — it is not verification or governance.
        semanticClass: SEMANTIC_CLASS.CONTEXT,
        sourceRefs: [`node:${nodeRef}`],
        versionRefs: ['entityGraphFinding:entity-graph-v1'],
        trace: { node_id: nodeRef, finding_count: list.length },
      };
    } catch (error) {
      return {
        owner: 'unified_graph_law',
        status: CAPABILITY_STATUS.FAILED,
        reason: error?.message ? String(error.message) : 'canonical graph adapter failed',
        findings: [],
        accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
        semanticClass: SEMANTIC_CLASS.CONTEXT,
        trace: { node_id: nodeRef, error_class: error?.name || 'Error' },
      };
    }
  };

  // ── numeric_operators · GOVERNED RULE APPLICATION ───────────────────────────────────────
  // numeric_rule_family_index (live codex) is explicit: a Gematria Method, a System Method
  // (Branch B, publicly "שיטות המערכת") and a Rule Application are three different things, and every
  // application must record rule_id/version/input/operation/output as Rule Application Provenance.
  // Implementing this from the local zeroScales() helper alone would produce untraceable arithmetic
  // wearing a law's name, so that is explicitly NOT what happens here:
  //   * zero_scale_law runs through the canonical public RPC fn_zero_scale, which returns its own
  //     method_id + version. That version is the attestation.
  //   * every other System Method is emitted ONLY if an injected live registry read attests its
  //     rule_version. No attestation -> no Finding, and the capability says UNVERIFIED. A rule
  //     version is never guessed, defaulted or hardcoded.
  //   * moment_clock_law needs a temporal input and cannot apply to a bare number at all.
  // A rule application is a DERIVATION, never independent evidence — that is stated per Finding.
  const numericOperatorsExecutor = async ({ identityResolution }) => {
    const number = numberFromIdentity(identityResolution);
    if (number == null) {
      return {
        owner: 'numeric_rule_family_index',
        status: CAPABILITY_STATUS.SKIPPED,
        reason: 'no canonical number identity resolved',
        findings: [],
      };
    }

    const attested = await resolveNumericRuleVersions(numericRuleVersions);
    const applications = [];
    const skipped = [];

    const zero = await rpcExecutor(supabase)('fn_zero_scale', { p_value: number });
    const zeroData = zero?.error ? null : (zero?.data ?? zero);
    if (zeroData?.applicable === true && zeroData?.method_id && zeroData?.version != null) {
      const chain = Array.isArray(zeroData.scale_chain) ? zeroData.scale_chain : [];
      applications.push({
        ruleId: 'zero_scale_law',
        ruleVersion: zeroData.version,
        versionSource: 'fn_zero_scale.version',
        operation: 'zero_scale_chain',
        input: number,
        output: { core_root: zeroData.core_root ?? null, scale_chain: chain },
        engineRef: 'fn_zero_scale',
      });
    } else {
      skipped.push({ rule_id: 'zero_scale_law', reason: zero?.error ? 'fn_zero_scale failed' : 'not applicable to this value' });
    }

    // שיטת-האחד / האלף המוביל: 4-digit value starting with 1 reads as 1000 + remainder.
    const digits = String(number);
    if (digits.length === 4 && digits.startsWith('1')) {
      const version = attested.get('shitat_haechad_alef_law');
      if (version == null) skipped.push({ rule_id: 'shitat_haechad_alef_law', reason: 'rule_version not attested by the live rule registry — refusing to fabricate a version' });
      else applications.push({
        ruleId: 'shitat_haechad_alef_law',
        ruleVersion: version,
        versionSource: 'nodes.rule_version',
        operation: 'leading_one_split',
        input: number,
        output: { leading_unit: 1000, remainder: number - 1000 },
        engineRef: null,
      });
    } else {
      skipped.push({ rule_id: 'shitat_haechad_alef_law', reason: 'value is not a 4-digit value beginning with 1' });
    }

    // האפס הנע: a value ending in 0 reveals a core when the final zero is removed.
    if (number % 10 === 0 && number >= 10) {
      const version = attested.get('zero_navigation');
      if (version == null) skipped.push({ rule_id: 'zero_navigation', reason: 'rule_version not attested by the live rule registry — refusing to fabricate a version' });
      else applications.push({
        ruleId: 'zero_navigation',
        ruleVersion: version,
        versionSource: 'nodes.rule_version',
        operation: 'strip_trailing_zero',
        input: number,
        output: { core: number / 10 },
        engineRef: null,
      });
    } else {
      skipped.push({ rule_id: 'zero_navigation', reason: 'value does not end in 0' });
    }

    skipped.push({ rule_id: 'moment_clock_law', reason: 'requires an original temporal input (timezone + representation); a bare number carries none' });

    const findings = applications.map(app => ruleApplicationFinding(number, app));
    if (!findings.length) {
      return {
        owner: 'numeric_rule_family_index',
        status: CAPABILITY_STATUS.UNVERIFIED,
        reason: 'no System Method rule application could be attested for this value',
        findings: [],
        accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
        semanticClass: SEMANTIC_CLASS.DERIVATION,
        sourceRefs: [`number:${number}`],
        trace: { applied: [], skipped },
      };
    }

    return {
      owner: 'numeric_rule_family_index',
      status: CAPABILITY_STATUS.EXECUTED,
      findings,
      accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
      semanticClass: SEMANTIC_CLASS.DERIVATION,
      findingOutcomes: findings.map((finding, i) => ({
        findingId: finding.id,
        evidenceRelation: EVIDENCE_RELATION.DERIVATION,
        reason: `rule application of ${applications[i].ruleId} v${applications[i].ruleVersion} — a transform of an existing value, never independent corroboration of it`,
      })),
      sourceRefs: [`number:${number}`],
      versionRefs: applications.map(app => `${app.ruleId}:v${app.ruleVersion}`),
      trace: { applied: applications.map(a => ({ rule_id: a.ruleId, rule_version: a.ruleVersion, operation: a.operation, version_source: a.versionSource })), skipped },
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
    numeric_operators: numericOperatorsExecutor,
    graph: graphExecutor,
    research_objects: researchObjectsExecutor,
    els: elsExecutor,
    'sequence:pi': makeSequenceExecutor('sequence:pi'),
    'sequence:fibonacci': makeSequenceExecutor('sequence:fibonacci'),
  };
}

export const createCanonicalW2Executors = createCanonicalNumberW2Executors;
export { SAFE_W2_NUMERIC_LENSES };
export default createCanonicalNumberW2Executors;
