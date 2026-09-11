import { gematriaApiResultToFindings } from './canonicalGematria.js';
import { ACCESS_CLASS, CAPABILITY_STATUS, SEMANTIC_CLASS } from './researchResultBundle.js';
import { expandResearchTextRepresentations, hebrewUnitSuffixControlSet } from './researchRepresentations.js';

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
    const perRepresentation = [];
    let failed = 0;

    for (const representation of representations) {
      try {
        const apiResult = await runGematria(supabase, representation.text);
        const projected = gematriaApiResultToFindings(apiResult, { inputText: representation.text })
          .map(finding => enrichFinding(finding, representation));
        findings.push(...projected);
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

    return {
      owner: 'research_strategy_layer_law',
      status,
      reason,
      findings,
      accessClass: hasRestricted ? ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED : ACCESS_CLASS.PUBLIC_SOURCE,
      semanticClass: SEMANTIC_CLASS.EVIDENCE,
      sourceRefs: representations.map(x => x.ref),
      versionRefs: ['gematria_api:canonical', 'gematria-api-v1', 'researchRepresentations:v1', ...(controlEvaluation ? ['gematria-pair-invariance-control:v1'] : [])],
      bounded: {
        total_count: representations.length,
        returned_count: representations.length,
        truncated: representations.length >= Math.max(1, Math.min(Number(maxRepresentations) || 16, 32)),
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
