import { elsSearchOutcome, elsSearchResultToFindings } from './canonicalEls.js';
import { ACCESS_CLASS, CAPABILITY_STATUS, SEMANTIC_CLASS } from './researchResultBundle.js';
import { expandResearchTextRepresentations } from './researchRepresentations.js';

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function accessTier(rep) {
  return clean(rep?.access_tier) || 'public';
}

function boundedPrimaryRepresentations(identityResolution, maxRepresentations) {
  // ELS is an expensive search-space capability. The exact/full representation is the bounded
  // default. Word/name-part fanout is deliberately NOT part of this plan, so it must not be
  // reported as "truncation". Only overflow among eligible primary representations counts.
  const expanded = expandResearchTextRepresentations(identityResolution, { maxRepresentations: 32 });
  const primary = expanded.filter(x => x?.primary_for_identity === true);
  return {
    representations: primary.slice(0, maxRepresentations),
    available: primary.length,
    truncated: primary.length > maxRepresentations,
  };
}

async function runEls(supabase, representation, options) {
  const out = await supabase.rpc('els_search_v1', {
    p_term: representation.text,
    p_scope: options.scope,
    p_maxskip: options.maxSkip,
    p_maxhits: options.maxHits,
    p_selection_protocol: options.selectionProtocol,
  });
  if (out?.error) throw out.error;
  return out?.data ?? out;
}

/**
 * Canonical W2 ELS executor.
 *
 * This executor owns no ELS arithmetic/search. It invokes ONLY public.els_search_v1, the bounded
 * projection over the single server core. A number-only request remains CONTEXT_REQUIRED until an
 * exact text/expression representation exists; a numeric identity is never converted to letters.
 */
export function createElsW2Executor({
  supabase,
  scope = 'torah',
  maxSkip = 40,
  maxHits = 16,
  maxRepresentations = 4,
  selectionProtocol = null,
} = {}) {
  if (typeof supabase?.rpc !== 'function') throw new Error('canonical Supabase RPC client required');
  const repLimit = Math.max(1, Math.min(Number(maxRepresentations) || 4, 8));
  const boundedSkip = Math.max(2, Math.min(Number(maxSkip) || 40, 500));
  const boundedHits = Math.max(1, Math.min(Number(maxHits) || 16, 100));

  return async ({ identityResolution }) => {
    const primaryPlan = boundedPrimaryRepresentations(identityResolution, repLimit);
    const representations = primaryPlan.representations;
    if (!representations.length) {
      return {
        owner: 'els_research_layer_law',
        status: CAPABILITY_STATUS.CONTEXT_REQUIRED,
        reason: 'canonical ELS requires an exact Hebrew text/name/expression representation; no text is inferred from a bare Number identity',
        findings: [],
        accessClass: ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED,
        semanticClass: SEMANTIC_CLASS.EVIDENCE,
        versionRefs: ['els_search_v1:canonical-callable', 'els_research_layer_law:v3'],
        trace: { representation_count: 0, scope, max_skip: boundedSkip, max_hits: boundedHits },
      };
    }

    const findings = [];
    const perRepresentation = [];
    const negativeScopes = [];
    let executed = 0;
    let failed = 0;
    let missingAdapter = 0;
    let contextRequired = 0;
    let anyTruncated = false;
    let totalHits = 0;
    let returnedHits = 0;

    for (const representation of representations) {
      try {
        const result = await runEls(supabase, representation, {
          scope,
          maxSkip: boundedSkip,
          maxHits: boundedHits,
          selectionProtocol,
        });
        const outcome = elsSearchOutcome(result);
        const projected = elsSearchResultToFindings(result, {
          inputRef: representation.ref,
          accessTier: accessTier(representation),
        });

        if (outcome === CAPABILITY_STATUS.EXECUTED) {
          executed++;
          findings.push(...projected);
        } else if (outcome === CAPABILITY_STATUS.NEGATIVE_RESULT) {
          executed++;
          negativeScopes.push({
            representation_ref: representation.ref,
            corpus_id: result?.corpus_id ?? null,
            scope: result?.scope ?? scope,
            searched_skip_min: result?.search?.skip_min ?? 2,
            searched_skip_max: result?.search?.skip_max_executed ?? boundedSkip,
            coverage: result?.completion?.coverage ?? null,
            state: result?.status ?? 'EXECUTED_EMPTY',
          });
        } else if (outcome === CAPABILITY_STATUS.MISSING_ADAPTER) {
          missingAdapter++;
        } else if (outcome === CAPABILITY_STATUS.CONTEXT_REQUIRED) {
          contextRequired++;
        } else {
          failed++;
        }

        const nTotal = Number(result?.completion?.total_hits ?? result?.els_count);
        if (Number.isFinite(nTotal)) totalHits += nTotal;
        const nReturned = Number(result?.completion?.returned_hits ?? projected.length);
        if (Number.isFinite(nReturned)) returnedHits += nReturned;
        anyTruncated ||= result?.completion?.truncated === true;

        perRepresentation.push({
          ref: representation.ref,
          kind: representation.kind,
          role: representation.role,
          parent_identity_type: representation.parent_identity_type,
          access_tier: accessTier(representation),
          status: outcome,
          result_state: result?.status ?? null,
          corpus_id: result?.corpus_id ?? null,
          scope: result?.scope ?? scope,
          finding_count: projected.length,
          total_hits: Number.isFinite(nTotal) ? nTotal : null,
          returned_hits: Number.isFinite(nReturned) ? nReturned : projected.length,
          truncated: result?.completion?.truncated === true,
          coverage: result?.completion?.coverage ?? null,
          engine_version: result?.engine?.version ?? null,
        });
      } catch (error) {
        failed++;
        perRepresentation.push({
          ref: representation.ref,
          kind: representation.kind,
          role: representation.role,
          parent_identity_type: representation.parent_identity_type,
          access_tier: accessTier(representation),
          status: CAPABILITY_STATUS.FAILED,
          finding_count: 0,
          error_class: error?.name || 'Error',
        });
      }
    }

    let status;
    let reason = null;
    if (findings.length) {
      status = CAPABILITY_STATUS.EXECUTED;
    } else if (executed > 0 && negativeScopes.length === executed) {
      status = CAPABILITY_STATUS.NEGATIVE_RESULT;
      reason = 'canonical ELS executed with no occurrences inside the declared bounded search space';
    } else if (missingAdapter > 0 && failed === 0) {
      status = CAPABILITY_STATUS.MISSING_ADAPTER;
      reason = scope === 'tanakh'
        ? 'canonical Tanakh corpus identity exists but no server-callable canonical Tanakh stream is live'
        : 'canonical ELS adapter unavailable for the requested scope';
    } else if (contextRequired > 0 && failed === 0) {
      status = CAPABILITY_STATUS.CONTEXT_REQUIRED;
      reason = 'ELS execution requires additional valid bounded search context';
    } else {
      status = CAPABILITY_STATUS.FAILED;
      reason = `ELS executed successfully for ${executed}/${representations.length} bounded representations; ${failed} failed`;
    }

    const restricted = representations.some(x => accessTier(x) !== 'public');
    return {
      owner: 'els_research_layer_law',
      status,
      reason,
      findings,
      accessClass: restricted ? ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED : ACCESS_CLASS.PUBLIC_SOURCE,
      semanticClass: SEMANTIC_CLASS.EVIDENCE,
      negativeScope: status === CAPABILITY_STATUS.NEGATIVE_RESULT
        ? { kind: 'bounded_els_searches', searches: negativeScopes }
        : null,
      sourceRefs: representations.map(x => x.ref),
      versionRefs: ['els_search_v1:canonical-callable', 'els-sql-core:v1', 'els_research_layer_law:v3', 'els_single_engine_law:v2'],
      bounded: {
        total_count: totalHits || (status === CAPABILITY_STATUS.NEGATIVE_RESULT ? 0 : null),
        returned_count: returnedHits,
        truncated: anyTruncated || primaryPlan.truncated,
        ordering: 'representation_identity_order__per_representation_skip_start',
        // No fake continuation. A deeper search is a new bounded Research Plan with explicit budget.
        continuation: null,
      },
      trace: {
        representation_count: representations.length,
        eligible_primary_representation_count: primaryPlan.available,
        representation_budget: repLimit,
        representation_overflow: primaryPlan.truncated,
        derived_part_fanout: false,
        scope,
        max_skip: boundedSkip,
        max_hits_per_representation: boundedHits,
        selection_protocol: selectionProtocol,
        executed_representation_count: executed,
        failed_representation_count: failed,
        missing_adapter_count: missingAdapter,
        context_required_count: contextRequired,
        representations: perRepresentation,
        engine_boundary: 'public.els_search_v1 -> public.els_search_core_v1',
        legacy_browser_engine_authority: false,
      },
    };
  };
}

export default createElsW2Executor;
