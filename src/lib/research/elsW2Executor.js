import { isUniversalFinding } from './universalFinding.js';
import { ACCESS_CLASS, CAPABILITY_STATUS, SEMANTIC_CLASS } from './researchResultBundle.js';
import { normalizeOperatorRef, normalizeResearchEvaluation } from './researchEvaluation.js';

// G2 foundation seam only. The injected callable is the ONE canonical ELS core owned by
// els_research_layer_law; this module deliberately implements zero search/corpus/geometry logic.
export const ELS_CALLABLE_CONTRACT_VERSION = 1;

const RESTRICTED_TIERS = new Set(['personal', 'user_private', 'private', 'public_candidate', 'draft', 'internal', 'pending']);

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function requestTier(request) {
  return clean(request?.access?.tier) || 'public';
}

function isRestrictedRequest(request) {
  return RESTRICTED_TIERS.has(requestTier(request));
}

function accessClassForRequest(request) {
  const tier = requestTier(request);
  if (tier === 'personal' || tier === 'user_private') return ACCESS_CLASS.PERSONAL;
  if (RESTRICTED_TIERS.has(tier)) return ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED;
  return ACCESS_CLASS.PUBLIC_SOURCE;
}

function fail(status, reason, trace = null) {
  return {
    owner: 'els_research_layer_law',
    status,
    reason,
    findings: [],
    accessClass: ACCESS_CLASS.UNCLASSIFIED,
    semanticClass: SEMANTIC_CLASS.EVIDENCE,
    versionRefs: ['els:callable-core:unresolved'],
    trace,
  };
}

function inheritRequestAccess(finding, request) {
  if (!isRestrictedRequest(request)) return finding;
  return {
    ...finding,
    access: {
      ...(finding.access || {}),
      tier: requestTier(request),
      reason: 'inherited from the authorized access-controlled ELS subject request',
    },
  };
}

function safeNegativeScope(request) {
  return {
    capability: 'els',
    language: clean(request?.language),
    budget: request?.budget && typeof request.budget === 'object' ? { ...request.budget } : null,
    access_controlled_subject_withheld: isRestrictedRequest(request),
  };
}

function sanitizeFindingOutcomes(result, request) {
  const raw = Array.isArray(result?.findingOutcomes)
    ? result.findingOutcomes
    : Array.isArray(result?.finding_outcomes) ? result.finding_outcomes : [];
  if (!isRestrictedRequest(request) || result?.finding_outcomes_output_safe === true) return raw;

  // The capability trace/Bundle outcome plane is not an unrestricted private channel. Preserve only
  // non-identifying research semantics and the already-governed request lineage (representation refs
  // are hashed by researchRepresentations for restricted identities). Exact core window/source refs
  // require an explicit output-safe attestation before they can leave.
  return raw.map(outcome => ({
    findingId: outcome?.findingId ?? outcome?.finding_id ?? null,
    evidenceRelation: outcome?.evidenceRelation ?? outcome?.evidence_relation ?? null,
    evidenceLineage: request?.evidence_lineage ?? null,
    reason: 'access-controlled ELS outcome; detailed core lineage withheld at composition boundary',
    expectedness: outcome?.expectedness ?? null,
    expectednessModel: outcome?.expectednessModel ?? outcome?.expectedness_model ?? null,
    baseRate: outcome?.baseRate ?? outcome?.base_rate ?? null,
  }));
}

/**
 * Create the Research-OS ELS executor without creating an ELS engine.
 *
 * executeCanonicalEls(request, context) is dependency-injected only after live engine-parity proves
 * it is the ONE callable core shared by all ELS consumers. resolveRequest is a PRIVATE execution
 * seam so exact personal/source expressions do not have to ride in the public Research Plan.
 */
export function createCanonicalElsW2Executor({ executeCanonicalEls = null, resolveRequest = null } = {}) {
  return async function elsW2Executor(context = {}) {
    if (typeof executeCanonicalEls !== 'function') {
      return fail(
        CAPABILITY_STATUS.MISSING_ADAPTER,
        'one canonical callable ELS core has not been resolved; legacy iframe/SQL scans are not accepted as parallel authority',
        { contract_version: ELS_CALLABLE_CONTRACT_VERSION, core: 'missing' },
      );
    }
    if (typeof resolveRequest !== 'function') {
      return fail(
        CAPABILITY_STATUS.CONTEXT_REQUIRED,
        'ELS requires an authorized bounded subject request resolved on the private execution path',
        { contract_version: ELS_CALLABLE_CONTRACT_VERSION, request: 'missing_resolver' },
      );
    }

    const request = await resolveRequest(context);
    if (!request || typeof request !== 'object') {
      return fail(CAPABILITY_STATUS.CONTEXT_REQUIRED, 'ELS request was not resolved', { request: 'missing' });
    }
    if (request.canonical_engine_required !== true || request.execution_authorized !== true) {
      return fail(CAPABILITY_STATUS.CONTEXT_REQUIRED, 'ELS request has not passed canonical-engine/access execution gates', {
        request: 'not_authorized',
        access_tier: requestTier(request),
      });
    }
    const subjectRef = clean(request.subject_ref), expression = clean(request.expression);
    if (!subjectRef || !expression) {
      return fail(CAPABILITY_STATUS.CONTEXT_REQUIRED, 'ELS request requires exact subject_ref and expression', { request: 'invalid_subject' });
    }

    let result;
    try {
      result = await executeCanonicalEls(request, context);
    } catch (error) {
      return fail(CAPABILITY_STATUS.FAILED, 'canonical ELS core execution failed', { error_class: error?.name || 'Error' });
    }
    if (!result || typeof result !== 'object') return fail(CAPABILITY_STATUS.FAILED, 'canonical ELS core returned invalid result');

    const status = result.status || CAPABILITY_STATUS.EXECUTED;
    if (!Object.values(CAPABILITY_STATUS).includes(status)) return fail(CAPABILITY_STATUS.FAILED, 'canonical ELS core returned invalid capability status');
    const rawFindings = Array.isArray(result.findings) ? result.findings : [];
    if (rawFindings.some(x => !isUniversalFinding(x))) return fail(CAPABILITY_STATUS.FAILED, 'canonical ELS core must return Universal Findings only');
    if (status === CAPABILITY_STATUS.NEGATIVE_RESULT && rawFindings.length) return fail(CAPABILITY_STATUS.FAILED, 'ELS negative result cannot carry positive findings');

    let operatorRef = null, researchEvaluation = null;
    try {
      operatorRef = normalizeOperatorRef(result.operatorRef ?? result.operator_ref);
      researchEvaluation = normalizeResearchEvaluation(result.researchEvaluation ?? result.research_evaluation, { operatorRef });
    } catch (error) {
      return fail(CAPABILITY_STATUS.FAILED, 'canonical ELS result violated operator/evaluation contract', { error_class: error?.name || 'Error' });
    }
    if (!operatorRef || operatorRef.capability_key !== 'els' || operatorRef.owner !== 'els_research_layer_law') {
      return fail(CAPABILITY_STATUS.FAILED, 'canonical ELS core must return owner-qualified els operator_ref');
    }

    const restricted = isRestrictedRequest(request);
    const findings = rawFindings.map(finding => inheritRequestAccess(finding, request));
    if (restricted && researchEvaluation) {
      researchEvaluation = {
        ...researchEvaluation,
        access: {
          tier: requestTier(request),
          reason: 'inherited from the authorized access-controlled ELS subject request',
        },
      };
    }

    const rawTraceAllowed = !restricted || result.trace_output_safe === true;
    const rawRefsAllowed = !restricted || result.source_refs_output_safe === true;
    const rawNegativeScopeAllowed = !restricted || result.negative_scope_output_safe === true;
    const rawReasonAllowed = !restricted || result.reason_output_safe === true;

    return {
      owner: 'els_research_layer_law',
      status,
      reason: rawReasonAllowed ? clean(result.reason) : (status === CAPABILITY_STATUS.NEGATIVE_RESULT ? 'access-controlled bounded ELS search returned no positive finding' : null),
      findings,
      findingOutcomes: sanitizeFindingOutcomes(result, request),
      negativeScope: rawNegativeScopeAllowed
        ? (result.negativeScope ?? result.negative_scope ?? null)
        : (status === CAPABILITY_STATUS.NEGATIVE_RESULT ? safeNegativeScope(request) : null),
      operatorRef,
      researchEvaluation,
      accessClass: accessClassForRequest(request),
      semanticClass: SEMANTIC_CLASS.EVIDENCE,
      sourceRefs: rawRefsAllowed ? (result.sourceRefs ?? result.source_refs ?? []) : [],
      versionRefs: result.versionRefs ?? result.version_refs ?? [operatorRef.version],
      bounded: result.bounded ?? null,
      cost: result.cost ?? null,
      trace: {
        contract_version: ELS_CALLABLE_CONTRACT_VERSION,
        access_tier: requestTier(request),
        restricted_provenance_withheld: restricted && (!rawTraceAllowed || !rawRefsAllowed),
        ...(rawTraceAllowed && result.trace && typeof result.trace === 'object' ? result.trace : {}),
        ...(!restricted ? { subject_ref: subjectRef } : {}),
      },
    };
  };
}

export default createCanonicalElsW2Executor;
