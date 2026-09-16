import { makeUniversalFinding } from './universalFinding.js';
import { analyzeNumberMath, NUMBER_MATH_PROFILE_VERSION } from './numberMathProfile.js';

export function numberMathProfileToUniversalFinding(profile) {
  if (!profile || profile.status !== 'ok') return null;
  const number = profile.input?.value;
  if (!Number.isSafeInteger(number) || number < 0) return null;
  const sourceIdentity = `number-math-profile:${number}@${profile.profile_version || NUMBER_MATH_PROFILE_VERSION}`;
  const externalReferenceIds = profile.families
    .map(f => f?.reference?.source_ref)
    .filter(Boolean);

  return makeUniversalFinding({
    kind: 'number_math_profile',
    // Truth Axes PR1: deterministic computation does not choose an epistemic stage.
    stage: null,
    // Human governance is not implied by a local calculation.
    status: null,
    subject: { type: 'number', key: String(number), label: String(number), value: number },
    source: {
      engine: 'number-math-profile',
      adapter: 'number-math-profile-v1',
      sourceRef: sourceIdentity,
      method: profile.provenance?.algorithm || 'deterministic-local-integer-classification',
      corpus: null,
      lang: null,
    },
    identity: { sourceIdentity, entityRef: null, occurrence: null, relationRef: null },
    // No claim was submitted for comparison. The engine produced a deterministic result,
    // therefore "not_tested" is explicit and honest rather than a fabricated "match".
    verification: {
      claimed_expression: null,
      claimed_method: null,
      claimed_value: null,
      engine_method_tested: 'number_math_profile',
      engine_result: {
        profile_version: profile.profile_version,
        classification: profile.arithmetic?.classification ?? null,
        family_keys: profile.families.map(f => f.key),
        factorization_complete: profile.coverage?.factorization_complete ?? null,
      },
      verification_state: 'not_tested',
    },
    evidence: {
      // External OEIS IDs are static catalog/definition pointers and were not fetched for this run;
      // they therefore do not masquerade as evidence refs for the individual result.
      refs: [],
      facts: [
        {
          type: 'number-arithmetic-profile',
          classification: profile.arithmetic?.classification ?? null,
          factorization: profile.arithmetic?.factorization ?? null,
          divisor_count: profile.arithmetic?.divisor_count ?? null,
          divisor_sum: profile.arithmetic?.divisor_sum ?? null,
          proper_divisor_sum: profile.arithmetic?.proper_divisor_sum ?? null,
          totient: profile.arithmetic?.totient ?? null,
          abundance_class: profile.arithmetic?.abundance_class ?? null,
        },
        {
          type: 'number-digit-structure',
          ...profile.digit_structure,
        },
        ...profile.families.map(f => ({
          type: 'number-family-membership',
          family_key: f.key,
          family_label: f.label,
          category: f.category,
          details: f.details,
          external_reference: f.reference || null,
          external_reference_role: f.reference?.role || null,
        })),
      ],
      score: null,
      confidence: null,
    },
    provenance: {
      createdBy: 'ENGINE:number-math-profile',
      createdAt: profile.provenance?.generated_at || new Date().toISOString(),
      inputRef: profile.provenance?.input_ref || null,
    },
    projection: {
      anchors: [{ type: 'number', value: number }],
      dimensions: {
        capability: 'number_math_profile',
        profile_version: profile.profile_version,
        family_keys: profile.families.map(f => f.key),
        factorization_complete: profile.coverage?.factorization_complete ?? null,
        external_reference_ids: externalReferenceIds,
        external_reference_lookup: profile.coverage?.external_reference_lookup ?? null,
      },
    },
  });
}

export function runNumberMathProfile(numberInput, options = {}) {
  const profile = analyzeNumberMath(numberInput, options);
  const finding = numberMathProfileToUniversalFinding(profile);
  return {
    v: 1,
    root: { type: 'number', value: profile.input.value },
    capability: 'number_math_profile',
    profile,
    universal_findings: finding ? [finding] : [],
    coverage: profile.coverage,
    truth_lifecycle: {
      automatic_canonical_promotion: false,
      automatic_publication: false,
      human_gate_required_for_interpretation_or_promotion: true,
    },
  };
}
