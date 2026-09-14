import { gematriaApiResultToFindings } from './canonicalGematria.js';
import { ACCESS_CLASS, CAPABILITY_STATUS, EVIDENCE_RELATION, SEMANTIC_CLASS } from './researchResultBundle.js';
import { CONTROL_STATE, SELECTION_PROTOCOL } from './researchEvaluation.js';
import {
  expandResearchTextRepresentations,
  hebrewUnitSuffixControlSet,
  representationOverflow,
} from './researchRepresentations.js';

const GEMATRIA_OPERATOR_REF = Object.freeze({
  type: 'research_operator',
  owner: 'gematria_engine_law',
  capability_key: 'gematria',
  operator_id: 'canonical-gematria-api',
  version: 'gematria-api-v1',
});

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function controlledAccessTier(tier) {
  return clean(tier) || 'public';
}

function enrichFinding(finding, representation) {
  return {
    ...finding,
    access: {
      ...(finding.access || {}),
      tier: controlledAccessTier(representation.access_tier),
      reason: representation.access_tier && representation.access_tier !== 'public'
        ? 'inherited from the source identity representation'
        : 'ephemeral canonical Gematria computation for a public/input representation',
    },
    provenance: {
      ...(finding.provenance || {}),
      inputRef: representation.ref,
      parentFindingIds: Array.isArray(finding.provenance?.parentFindingIds) ? finding.provenance.parentFindingIds : [],
    },
    projection: {
      ...(finding.projection || {}),
      dimensions: {
        ...(finding.projection?.dimensions || {}),
        representation: {
          ref: representation.ref,
          parent_identity_key: representation.parent_identity_key,
          parent_identity_type: representation.parent_identity_type,
          kind: representation.kind,
          role: representation.role,
          role_source: representation.role_source,
          token_index: representation.token_index,
          component_refs: representation.component_refs,
        },
      },
    },
  };
}

async function runGematria(supabase, text) {
  const out = await supabase.rpc('gematria_api', { p_text: text });
  if (out?.error) throw out.error;
  return out?.data ?? out;
}

async function runControls(supabase, representations) {
  const controlSet = hebrewUnitSuffixControlSet(representations);
  if (!controlSet) return null;
  const out = await supabase.rpc('fn_gematria_pair_invariance_control', {
    p_anchor_texts: controlSet.anchors,
    p_control_texts: controlSet.controls,
  });
  if (out?.error) {
    return {
      status: 'unavailable',
      model: 'gematria_pair_invariance_control_v1',
      reason: out.error.message || String(out.error),
      control_kind: controlSet.kind,
      semantic_identity_claimed: false,
    };
  }
  const data = out?.data ?? out;
  return {
    status: data?.status || 'ok',
    model: data?.model || 'gematria_pair_invariance_control_v1',
    control_kind: controlSet.kind,
    anchor_count: controlSet.anchors.length,
    control_count: controlSet.controls.length,
    semantic_identity_claimed: false,
    // No raw input/control strings in the trace: this trace can cross a composition boundary.
    evaluations: Array.isArray(data?.evaluations) ? data.evaluations : [],
  };
}

function primaryRepresentationByParent(representations) {
  const map = new Map();
  for (const representation of representations) {
    if (representation?.primary_for_identity === true && representation?.parent_identity_key && representation?.ref) {
      map.set(representation.parent_identity_key, representation.ref);
    }
  }
  return map;
}

function findingLineage(representation, primaryByParent) {
  const primaryRef = primaryByParent.get(representation.parent_identity_key);
  return {
    relation: 'derivation',
    root_input_ref: representation.parent_identity_key,
    representation_ref: representation.ref,
    occurrence_ref: null,
    window_ref: null,
    artifact_refs: [],
    source_lineage_refs: [],
    parent_refs: representation.primary_for_identity === true || !primaryRef || primaryRef === representation.ref ? [] : [primaryRef],
  };
}

function gematriaControlsEvaluation(controlEvaluation, controlsEnabled) {
  if (!controlsEnabled) {
    return { controls: [], controlsState: { status: CONTROL_STATE.NOT_REQUIRED, reason: 'controls disabled by caller configuration' } };
  }
  if (!controlEvaluation) {
    return { controls: [], controlsState: { status: CONTROL_STATE.NOT_REQUIRED, reason: 'registered structural control is not applicable to this representation set' } };
  }
  if (controlEvaluation.status === 'unavailable') {
    return {
      controls: [],
      controlsState: { status: CONTROL_STATE.UNAVAILABLE, reason: controlEvaluation.reason || 'control RPC unavailable', model: controlEvaluation.model || null },
    };
  }
  return {
    controls: [{
      control_id: 'gematria_pair_invariance_control_v1',
      type: 'structural',
      model: controlEvaluation.model || 'gematria_pair_invariance_control_v1',
      result: {
        status: controlEvaluation.status,
        anchor_count: controlEvaluation.anchor_count ?? null,
        control_count: controlEvaluation.control_count ?? null,
        evaluations: controlEvaluation.evaluations || [],
        semantic_identity_claimed: false,
      },
      seed: null,
      version: 'v1',
      provenance_ref: 'rpc:fn_gematria_pair_invariance_control',
    }],
    controlsState: {
      status: CONTROL_STATE.EXECUTED,
      reason: 'registered structural Gematria control executed',
      model: controlEvaluation.model || 'gematria_pair_invariance_control_v1',
      coverage: { anchor_count: controlEvaluation.anchor_count ?? null, control_count: controlEvaluation.control_count ?? null },
    },
  };
}

function gematriaResearchEvaluation({ representations, representationBudget, failed, controlsEnabled, controlEvaluation, hasRestricted }) {
  const control = gematriaControlsEvaluation(controlEvaluation, controlsEnabled);
  const truncated = representationBudget.truncated === true;
  const complete = !truncated && failed === 0;
  return {
    operator_ref: GEMATRIA_OPERATOR_REF,
    access: {
      // Capability-level evaluation aggregates several representations. When any restricted input is
      // present, use a strict tier so the composition boundary filters the aggregate from public
      // callers instead of leaking private research shape/counts.
      tier: hasRestricted ? 'private' : 'public',
      reason: hasRestricted ? 'aggregate evaluation includes access-controlled representations' : 'public/input representations only',
    },
    selection: {
      protocol: SELECTION_PROTOCOL.UNKNOWN,
      target_ref: representations.length === 1 ? representations[0].ref : null,
      provenance_ref: null,
      fixed_before_inspection: null,
      reason: 'Research Plan selection provenance has not yet been supplied to this executor',
    },
    search_space: {
      declared: { max_representations: representationBudget.cap },
      effective: { available_representations: representationBudget.available },
      tested: { returned_representations: representations.length, failed_representations: failed },
      dimensions: { representation_kinds: [...new Set(representations.map(x => x.kind).filter(Boolean))] },
      budget: { max_representations: representationBudget.cap },
      multiplicity: {
        targets: representations.length,
        operators: null,
        windows: null,
        languages: null,
        transforms: null,
        cohorts: null,
        total_tests: null,
        known_complete: false,
      },
      unavailable_reason: 'canonical Gematria API method fanout multiplicity is not yet aggregated by this boundary',
    },
    expectedness: null,
    controls: control.controls,
    controls_state: control.controlsState,
    location: null,
    dependency: null,
    robustness: null,
    competing_patterns: [],
    completion: {
      state: truncated ? 'representation_budget_truncated' : failed > 0 ? 'partial_execution_failure' : 'bounded_execution_complete',
      complete,
      truncated,
      continuation: null,
      stop_reason: truncated ? 'representation budget exhausted' : failed > 0 ? 'one or more representation executions failed' : 'all admitted representations executed',
    },
    replay: {
      replayable: false,
      run_id: null,
      input_ref: representations.length === 1 ? representations[0].ref : null,
      source_ref: 'rpc:gematria_api',
      engine_ref: 'gematria_api',
      version_refs: ['gematria-api-v1', 'researchRepresentations:v1'],
      parameters: {
        representation_refs: representations.map(x => x.ref),
        max_representations: representationBudget.cap,
        controls_enabled: Boolean(controlsEnabled),
      },
      random_seed: null,
      generator_version: null,
      unavailable_reason: 'exact source text is intentionally not duplicated in the public evaluation envelope; formal replay resolves it from governed representation provenance',
    },
  };
}

/**
 * Canonical W2 Gematria executor.
 * - calls ONLY public.gematria_api for Gematria truth;
 * - expands bounded representations (full expression + word/name parts);
 * - never roots/adopts input into gematria_words;
 * - keeps personal/private representation access attached to each Finding;
 * - optional controls are diagnostics/expectedness, never a new truth lifecycle.
 */
export function createGematriaW2Executor({
  supabase,
  maxRepresentations = 16,
  controls = true,
} = {}) {
  if (typeof supabase?.rpc !== 'function') throw new Error('canonical Supabase RPC client required');

  return async ({ identityResolution }) => {
    const representations = expandResearchTextRepresentations(identityResolution, { maxRepresentations });
    const representationBudget = representationOverflow(identityResolution, representations, maxRepresentations);
    if (!representations.length) {
      return {
        owner: 'research_strategy_layer_law',
        status: CAPABILITY_STATUS.SKIPPED,
        reason: 'no eligible text/name representation resolved for canonical Gematria execution',
        findings: [],
        accessClass: ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED,
        semanticClass: SEMANTIC_CLASS.EVIDENCE,
        versionRefs: ['gematria-api-v1', 'researchRepresentations:v1'],
        trace: { representation_count: 0 },
      };
    }

    const findings = [];
    const findingOutcomes = [];
    const perRepresentation = [];
    const primaryByParent = primaryRepresentationByParent(representations);
    let failed = 0;

    for (const representation of representations) {
      try {
        const apiResult = await runGematria(supabase, representation.text);
        const projected = gematriaApiResultToFindings(apiResult, { inputText: representation.text })
          .map(finding => enrichFinding(finding, representation));
        findings.push(...projected);
        const lineage = findingLineage(representation, primaryByParent);
        findingOutcomes.push(...projected.map(finding => ({
          findingId: finding.id,
          evidenceRelation: EVIDENCE_RELATION.DERIVATION,
          evidenceLineage: lineage,
          reason: 'canonical Gematria calculation is a deterministic derivation of the exact governed representation; method fanout is not independent corroboration',
        })));
        perRepresentation.push({
          ref: representation.ref,
          kind: representation.kind,
          role: representation.role,
          role_source: representation.role_source,
          parent_identity_key: representation.parent_identity_key,
          access_tier: controlledAccessTier(representation.access_tier),
          finding_count: projected.length,
          status: 'executed',
        });
      } catch (error) {
        failed++;
        perRepresentation.push({
          ref: representation.ref,
          kind: representation.kind,
          role: representation.role,
          role_source: representation.role_source,
          parent_identity_key: representation.parent_identity_key,
          access_tier: controlledAccessTier(representation.access_tier),
          finding_count: 0,
          status: 'failed',
          error_class: error?.name || 'Error',
        });
      }
    }

    const controlEvaluation = controls ? await runControls(supabase, representations) : null;
    const executed = representations.length - failed;
    const status = executed > 0 ? CAPABILITY_STATUS.EXECUTED : CAPABILITY_STATUS.FAILED;
    const reason = failed > 0
      ? `Gematria executed for ${executed}/${representations.length} bounded representations; ${failed} failed`
      : null;
    const hasRestricted = representations.some(x => controlledAccessTier(x.access_tier) !== 'public');
    const researchEvaluation = gematriaResearchEvaluation({
      representations,
      representationBudget,
      failed,
      controlsEnabled: controls,
      controlEvaluation,
      hasRestricted,
    });

    return {
      owner: 'research_strategy_layer_law',
      status,
      reason,
      findings,
      findingOutcomes,
      operatorRef: GEMATRIA_OPERATOR_REF,
      researchEvaluation,
      accessClass: hasRestricted ? ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED : ACCESS_CLASS.PUBLIC_SOURCE,
      semanticClass: SEMANTIC_CLASS.EVIDENCE,
      sourceRefs: representations.map(x => x.ref),
      versionRefs: ['gematria_api:canonical', 'gematria-api-v1', 'researchRepresentations:v1', ...(controlEvaluation ? ['gematria-pair-invariance-control:v1'] : [])],
      bounded: {
        total_count: representationBudget.available,
        returned_count: representations.length,
        truncated: representationBudget.truncated,
        ordering: 'identity_order__full_before_parts__source_declared_roles_before_whitespace_roles',
        continuation: null,
      },
      trace: {
        representation_count: representations.length,
        executed_representation_count: executed,
        failed_representation_count: failed,
        representations: perRepresentation,
        controls: controlEvaluation,
        root_gate: 'ephemeral computation only; persistence/projection of a Gematria research claim must resolve gematria_words word_id through existing Corpus Admission',
      },
    };
  };
}

export default createGematriaW2Executor;
