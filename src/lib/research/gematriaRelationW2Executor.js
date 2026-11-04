import { makeUniversalFinding } from './universalFinding.js';
import { expandResearchTextRepresentations, stableIdentityDigest } from './researchRepresentations.js';
import { ACCESS_CLASS, CAPABILITY_STATUS, EVIDENCE_RELATION, SEMANTIC_CLASS } from './researchResultBundle.js';

const ADAPTER_VERSION = 'gematria-relation-w2-v1';
export const GEMATRIA_RELATION_PAIR_MODE = Object.freeze({
  REPRESENTATION_PAIRS: 'representation_pairs',
  INTAKE_DIRECT_PAIR: 'intake_direct_pair',
});

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

const ACCESS_ORDER = Object.freeze(['public', 'public_candidate', 'personal', 'private']);

function moreRestrictiveTier(a, b) {
  const aa = clean(a) || 'public';
  const bb = clean(b) || 'public';
  const ar = ACCESS_ORDER.indexOf(aa);
  const br = ACCESS_ORDER.indexOf(bb);
  const aRank = ar === -1 ? ACCESS_ORDER.length : ar;
  const bRank = br === -1 ? ACCESS_ORDER.length : br;
  return aRank >= bRank ? aa : bb;
}

function independentEvidenceCounts(candidate = {}) {
  const evidence = candidate?.independent_evidence && typeof candidate.independent_evidence === 'object'
    ? candidate.independent_evidence
    : {};
  return {
    edges: Array.isArray(evidence.edges) ? evidence.edges.length : 0,
    topic_cards: Array.isArray(evidence.topic_cards) ? evidence.topic_cards.length : 0,
    research_objects: Array.isArray(evidence.research_objects) ? evidence.research_objects.length : 0,
  };
}

function hasSubstantiveEvidence(candidate = {}) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return false;
  if (Array.isArray(candidate.engine_evidence) && candidate.engine_evidence.length > 0) return true;
  if (Array.isArray(candidate.composite_evidence) && candidate.composite_evidence.length > 0) return true;
  const independent = independentEvidenceCounts(candidate);
  if (Object.values(independent).some(count => count > 0)) return true;
  const signal = Number(candidate.engine_signal);
  return Number.isFinite(signal) && signal > 0;
}

// Shared, allowlisted projection of the canonical relation candidate. Public crossing adapters use
// the same projector so pair normalization has one representation at every Result-Bundle edge.
// Independent source payloads remain excluded here; only their bounded counts may cross.
export function projectGematriaRelationCandidateSummary(candidate = {}) {
  const components = candidate?.engine_signal_components && typeof candidate.engine_signal_components === 'object'
    ? candidate.engine_signal_components
    : {};
  return {
    relation_kind: clean(candidate.relation_kind) || 'gematria_convergence',
    engine_signal: Number.isFinite(Number(candidate.engine_signal)) ? Number(candidate.engine_signal) : null,
    confidence: clean(candidate.confidence),
    research_priority: clean(candidate.research_priority),
    noise_flags: Array.isArray(candidate.noise_flags) ? candidate.noise_flags.map(String) : [],
    effective_independent_group_count: Number.isFinite(Number(components.effective_independent_group_count))
      ? Number(components.effective_independent_group_count)
      : null,
    raw_independent_group_count: Number.isFinite(Number(components.raw_independent_group_count))
      ? Number(components.raw_independent_group_count)
      : null,
    effective_structure_sensitive_group_count: Number.isFinite(Number(components.effective_structure_sensitive_group_count))
      ? Number(components.effective_structure_sensitive_group_count)
      : null,
    expression_dependency: candidate?.expression_dependency && typeof candidate.expression_dependency === 'object'
      ? { ...candidate.expression_dependency }
      : null,
    engine_evidence: Array.isArray(candidate.engine_evidence) ? candidate.engine_evidence : [],
    composite_evidence: Array.isArray(candidate.composite_evidence) ? candidate.composite_evidence : [],
    // independent_evidence may include access-controlled source objects. V1 intentionally does not
    // transport that payload through this generic adapter; source-native adapters remain owners.
    independent_evidence_transport: 'excluded_v1_access_boundary',
    independent_evidence_counts: independentEvidenceCounts(candidate),
  };
}

function directPairRepresentations(intake) {
  const source = Array.isArray(intake?.representations) ? intake.representations : [];
  if (source.length !== 2) return [];
  const out = source.map((representation, index) => {
    const text = clean(representation?.content);
    if (!text) return null;
    const accessTier = clean(representation?.access?.tier) || 'unclassified';
    const sourceRef = clean(representation?.ref) || `intake-representation:${index + 1}:${stableIdentityDigest(text)}`;
    // A personal/private intake ref may itself have been caller supplied. Hash it once more before
    // it reaches source_refs/Finding identity; this is a stable correlation token, never a secret.
    const safeRef = accessTier === 'public'
      ? sourceRef
      : `repr:anon:${stableIdentityDigest(sourceRef)}`;
    return {
      ref: safeRef,
      parent_identity_key: safeRef,
      parent_identity_type: 'expression',
      kind: clean(representation?.kind) || 'expression',
      role: clean(representation?.role) || (index === 0 ? 'pair_left' : 'pair_right'),
      text,
      access_tier: accessTier,
      primary_for_identity: true,
    };
  });
  if (out.some(value => !value) || out[0].text === out[1].text) return [];
  return out;
}

function pairRepresentations(representations, maxPairs) {
  const unique = [];
  const seen = new Set();
  for (const rep of representations) {
    const text = clean(rep?.text);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    unique.push(rep);
  }
  const available = (unique.length * (unique.length - 1)) / 2;
  const pairs = [];
  for (let i = 0; i < unique.length && pairs.length < maxPairs; i += 1) {
    for (let j = i + 1; j < unique.length && pairs.length < maxPairs; j += 1) {
      pairs.push([unique[i], unique[j]]);
    }
  }
  return {
    pairs,
    available,
    truncated: available > pairs.length,
  };
}

function relationFinding(a, b, candidate) {
  const pairTier = moreRestrictiveTier(a.access_tier, b.access_tier);
  const summary = projectGematriaRelationCandidateSummary(candidate);
  const aRef = clean(a.ref) || `text:${stableIdentityDigest(a.text)}`;
  const bRef = clean(b.ref) || `text:${stableIdentityDigest(b.text)}`;
  const pairKey = [aRef, bRef].sort().join('|');
  const label = `${a.text} ↔ ${b.text}`;

  return makeUniversalFinding({
    kind: 'gematria-relation',
    // Relation Engine returns a candidate composition. The adapter does not promote it to an
    // epistemic stage; candidate remains source payload/context, not a fabricated Truth-axis value.
    subject: {
      type: 'relation',
      key: `gematria-relation:${stableIdentityDigest(pairKey)}`,
      label,
    },
    source: {
      engine: 'relation-engine',
      adapter: ADAPTER_VERSION,
      sourceRef: 'rpc:fn_relation_candidate',
      method: 'fn_relation_candidate',
    },
    identity: {
      sourceIdentity: `fn_relation_candidate:${stableIdentityDigest(pairKey)}`,
      relationRef: `relation-candidate:${stableIdentityDigest(pairKey)}`,
    },
    verification: {
      claimed_expression: null,
      claimed_method: null,
      claimed_value: null,
      engine_method_tested: 'fn_relation_candidate',
      engine_result: summary,
      verification_state: 'not_tested',
    },
    evidence: {
      refs: [aRef, bRef],
      facts: [{
        type: 'gematria-relation-candidate',
        endpoint_refs: [aRef, bRef],
        ...summary,
      }],
    },
    access: {
      tier: pairTier,
      reason: pairTier === 'public'
        ? 'both endpoint representations are public/input-safe'
        : 'inherits the most restrictive endpoint representation tier',
    },
    provenance: {
      createdBy: 'ENGINE:relation-engine',
      inputRef: `pair:${stableIdentityDigest(pairKey)}`,
      parentFindingIds: [],
    },
    projection: {
      dimensions: {
        relation_candidate: summary,
        endpoints: [
          { ref: aRef, role: a.role || null, parent_identity_key: a.parent_identity_key || null },
          { ref: bRef, role: b.role || null, parent_identity_key: b.parent_identity_key || null },
        ],
      },
    },
  });
}

/**
 * Adapter over the EXISTING canonical fn_relation_candidate.
 *
 * It performs no local Gematria/Cross calculation. It only:
 * - selects a bounded set of already-resolved text/name representations;
 * - calls the canonical Relation Engine for bounded pairs;
 * - projects the candidate into Universal Finding envelopes;
 * - marks every relation outcome as CONVERGENCE, never independent evidence.
 */
export function createGematriaRelationW2Executor({
  supabase,
  maxRepresentations = 8,
  maxPairs = 12,
  pairMode = GEMATRIA_RELATION_PAIR_MODE.REPRESENTATION_PAIRS,
} = {}) {
  if (typeof supabase?.rpc !== 'function') throw new Error('canonical Supabase RPC client required');
  const pairBudget = Math.max(1, Math.min(Number(maxPairs) || 12, 32));
  const directPair = pairMode === GEMATRIA_RELATION_PAIR_MODE.INTAKE_DIRECT_PAIR;

  return async ({ identityResolution, intake }) => {
    const representations = directPair
      ? directPairRepresentations(intake)
      : expandResearchTextRepresentations(identityResolution, {
          maxRepresentations: Math.max(2, Math.min(Number(maxRepresentations) || 8, 16)),
        });
    const pairSet = directPair
      ? {
          pairs: representations.length === 2 ? [[representations[0], representations[1]]] : [],
          available: representations.length === 2 ? 1 : 0,
          truncated: false,
        }
      : pairRepresentations(representations, pairBudget);
    const pairs = pairSet.pairs;

    if (!pairs.length) {
      return {
        owner: 'research_strategy_layer_law',
        status: CAPABILITY_STATUS.SKIPPED,
        reason: directPair
          ? 'gematria_relations direct pair requires exactly two distinct personal intake representations'
          : 'gematria_relations requires at least two distinct bounded text/name representations',
        findings: [],
        accessClass: ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED,
        semanticClass: SEMANTIC_CLASS.DERIVATION,
        versionRefs: [ADAPTER_VERSION, 'rpc:fn_relation_candidate'],
        cost: { certainty: 'not_billable', ai_calls: 0, rpc_calls: 0, retry_count: 0 },
        trace: { pair_mode: pairMode, pair_count: 0, pair_budget: directPair ? 1 : pairBudget },
      };
    }

    const findings = [];
    const outcomes = [];
    let failed = 0;
    const statuses = [];

    for (const [a, b] of pairs) {
      try {
        const out = await supabase.rpc('fn_relation_candidate', { p_a: a.text, p_b: b.text });
        if (out?.error) throw out.error;
        // Supabase RPC wrappers return {data:null,error:null} for an honest empty result.
        // Null must stay null; nullish-coalescing back to the wrapper would fabricate a candidate.
        const candidate = out && typeof out === 'object' && Object.prototype.hasOwnProperty.call(out, 'data')
          ? out.data
          : out;
        if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
          statuses.push({ status: 'executed_empty' });
          continue;
        }
        // fn_relation_candidate always returns a candidate-shaped JSON object, including for a pair
        // with zero engine/composite/independent evidence. Shape alone is not a positive Finding.
        if (!hasSubstantiveEvidence(candidate)) {
          statuses.push({ status: 'executed_empty', reason: 'no_substantive_evidence' });
          continue;
        }
        const finding = relationFinding(a, b, candidate);
        findings.push(finding);
        outcomes.push({
          findingId: finding.id,
          evidenceRelation: EVIDENCE_RELATION.CONVERGENCE,
          reason: 'cross-method relation candidate is a composed convergence; it is never independent corroboration by itself',
        });
        statuses.push({
          status: clean(candidate?.status) || 'candidate',
          effective_independent_group_count: Number(candidate?.engine_signal_components?.effective_independent_group_count) || 0,
          noise_flag_count: Array.isArray(candidate?.noise_flags) ? candidate.noise_flags.length : 0,
        });
      } catch (error) {
        failed += 1;
        statuses.push({ status: 'failed', error_class: error?.name || 'Error' });
      }
    }

    const restricted = representations.some(rep => clean(rep?.access_tier) && clean(rep.access_tier) !== 'public');
    const executed = pairs.length - failed;
    const status = findings.length > 0
      ? CAPABILITY_STATUS.EXECUTED
      : failed === 0 && executed === pairs.length
        ? CAPABILITY_STATUS.NEGATIVE_RESULT
        : CAPABILITY_STATUS.FAILED;
    const reason = findings.length > 0
      ? failed > 0
        ? `relation engine returned findings for ${executed}/${pairs.length} bounded pairs; ${failed} failed`
        : null
      : status === CAPABILITY_STATUS.NEGATIVE_RESULT
        ? 'canonical relation engine found no substantive evidence in the completed bounded pair search'
        : `relation engine completed ${executed}/${pairs.length} bounded pairs; ${failed} failed, so absence was not established`;
    return {
      owner: 'research_strategy_layer_law',
      status,
      reason,
      findings,
      findingOutcomes: outcomes,
      accessClass: restricted ? ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED : ACCESS_CLASS.PUBLIC_SOURCE,
      semanticClass: SEMANTIC_CLASS.DERIVATION,
      negativeScope: status === CAPABILITY_STATUS.NEGATIVE_RESULT ? {
        operation: directPair ? 'direct_pair' : 'bounded_representation_pairs',
        searched_pair_count: executed,
        requested_pair_count: pairs.length,
        pair_budget: directPair ? 1 : pairBudget,
        truncated: pairSet.truncated,
      } : null,
      sourceRefs: uniq(representations.map(rep => rep.ref)),
      versionRefs: [ADAPTER_VERSION, 'rpc:fn_relation_candidate'],
      cost: {
        certainty: 'not_billable',
        ai_calls: 0,
        rpc_calls: pairs.length,
        retry_count: 0,
      },
      bounded: {
        total_count: pairSet.available,
        returned_count: pairs.length,
        truncated: pairSet.truncated,
        ordering: 'bounded_representation_input_order__unique_pairs',
        continuation: pairSet.truncated
          ? {
              kind: 'increase_pair_budget',
              current_max_pairs: directPair ? 1 : pairBudget,
              next_max_pairs: Math.min(32, pairSet.available),
            }
          : null,
      },
      trace: {
        adapter: ADAPTER_VERSION,
        pair_mode: pairMode,
        pair_count: pairs.length,
        available_pair_count: pairSet.available,
        pair_budget: directPair ? 1 : pairBudget,
        pair_budget_truncated: pairSet.truncated,
        failed_pair_count: failed,
        // No raw endpoint text in capability trace: private text remains only inside access-filtered Findings.
        pair_statuses: statuses,
        independent_evidence_transport: 'excluded_v1_access_boundary',
        truth_boundary: 'canonical fn_relation_candidate output; candidate/convergence only; no graph promotion and no independent-evidence upgrade',
      },
    };
  };
}

export default createGematriaRelationW2Executor;
