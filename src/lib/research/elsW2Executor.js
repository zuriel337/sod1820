import { isUniversalFinding } from './universalFinding.js';
import { ACCESS_CLASS, CAPABILITY_STATUS, SEMANTIC_CLASS } from './researchResultBundle.js';
import { normalizeOperatorRef, normalizeResearchEvaluation } from './researchEvaluation.js';

// G2 foundation seam only. The injected callable is the ONE canonical ELS core owned by
// els_research_layer_law; this module deliberately implements zero search/corpus/geometry logic.
export const ELS_CALLABLE_CONTRACT_VERSION = 1;

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function accessClassForRequest(request) {
  const tier = clean(request?.access?.tier);
  if (tier === 'personal' || tier === 'user_private' || tier === 'private') return ACCESS_CLASS.PERSONAL;
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
        subject_ref: clean(request.subject_ref),
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
    const findings = Array.isArray(result.findings) ? result.findings : [];
    if (findings.some(x => !isUniversalFinding(x))) return fail(CAPABILITY_STATUS.FAILED, 'canonical ELS core must return Universal Findings only');
    if (status === CAPABILITY_STATUS.NEGATIVE_RESULT && findings.length) return fail(CAPABILITY_STATUS.FAILED, 'ELS negative result cannot carry positive findings');

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

    return {
      owner: 'els_research_layer_law',
      status,
      reason: clean(result.reason),
      findings,
      findingOutcomes: result.findingOutcomes ?? result.finding_outcomes ?? [],
      negativeScope: result.negativeScope ?? result.negative_scope ?? null,
      operatorRef,
      researchEvaluation,
      accessClass: accessClassForRequest(request),
      semanticClass: SEMANTIC_CLASS.EVIDENCE,
      sourceRefs: result.sourceRefs ?? result.source_refs ?? [],
      versionRefs: result.versionRefs ?? result.version_refs ?? [operatorRef.version],
      bounded: result.bounded ?? null,
      cost: result.cost ?? null,
      trace: {
        contract_version: ELS_CALLABLE_CONTRACT_VERSION,
        subject_ref: subjectRef,
        ...(result.trace && typeof result.trace === 'object' ? result.trace : {}),
      },
    };
  };
}

export default createCanonicalElsW2Executor;
