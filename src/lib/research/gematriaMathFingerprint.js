import { buildNumberMathFingerprint } from './numberMathFingerprint.js';

export const GEMATRIA_MATH_FINGERPRINT_VERSION = 'gematria-math-fingerprint-v1';

const clean = value => value == null ? '' : String(value).trim();

function normalizeMethod(row) {
  const value = Number(row?.computedValue ?? row?.computed_value);
  if (!Number.isSafeInteger(value) || value < 0) return null;
  return {
    method_key: clean(row?.methodKey || row?.method_key || row?.method),
    method_label: clean(row?.displayLabel || row?.display_label || row?.label || row?.methodKey || row?.method_key),
    value,
    atomic_or_composite: clean(row?.atomicOrComposite || row?.atomic_or_composite) || null,
    mathematical_family: clean(row?.mathematicalFamily || row?.mathematical_family) || null,
    definition_version: Number.isFinite(Number(row?.definitionVersion ?? row?.definition_version))
      ? Number(row?.definitionVersion ?? row?.definition_version)
      : null,
    derived_from: Array.isArray(row?.derivedFrom) ? row.derivedFrom.map(clean).filter(Boolean)
      : Array.isArray(row?.derived_from) ? row.derived_from.map(clean).filter(Boolean)
      : [],
    dependency_rules: Array.isArray(row?.dependencyRules) ? row.dependencyRules
      : Array.isArray(row?.dependency_rules) ? row.dependency_rules
      : [],
  };
}

function factorsOf(entry) {
  return (entry?.fingerprint?.profile?.arithmetic?.factorization?.complete
    ? entry.fingerprint.profile.arithmetic.factorization.factors
    : []) || [];
}

function factorSet(entry) {
  return new Set(factorsOf(entry).map(x => Number(x.prime)).filter(Number.isSafeInteger));
}

function memberSummary(entry) {
  return {
    value: entry.value,
    methods: entry.methods.map(m => ({
      method_key: m.method_key,
      method_label: m.method_label,
      definition_version: m.definition_version,
      atomic_or_composite: m.atomic_or_composite,
    })),
  };
}

function relationBase(type, relationClass) {
  return {
    type,
    relation_class: relationClass,
    deterministic: true,
    counts_as_independent_evidence: false,
    research_convergence: false,
    canonical: false,
    published: false,
  };
}

function exactMultipleRelations(entries) {
  const out = [];
  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const a = entries[i];
      const b = entries[j];
      const low = a.value < b.value ? a : b;
      const high = low === a ? b : a;
      if (low.value <= 1 || high.value % low.value !== 0) continue;
      const multiplier = high.value / low.value;
      if (!Number.isSafeInteger(multiplier) || multiplier < 2) continue;
      const lowFactors = factorSet(low);
      const highFactors = factorSet(high);
      const retained = [...lowFactors].filter(p => highFactors.has(p)).sort((x, y) => x - y);
      out.push({
        ...relationBase('exact_multiple', 'deterministic_arithmetic_relation'),
        operator: 'multiply',
        multiplier,
        from: memberSummary(low),
        to: memberSummary(high),
        equation: String(high.value) + ' = ' + multiplier + ' × ' + low.value,
        retained_prime_factors: retained,
      });
    }
  }
  return out;
}

function sharedPrimeFactorRelations(entries, minFactor) {
  const byFactor = new Map();
  for (const entry of entries) {
    for (const factor of factorsOf(entry)) {
      const p = Number(factor.prime);
      if (!Number.isSafeInteger(p) || p < minFactor) continue;
      if (!byFactor.has(p)) byFactor.set(p, []);
      byFactor.get(p).push(entry);
    }
  }
  return [...byFactor.entries()]
    .filter(([, members]) => members.length >= 2)
    .map(([factor, members]) => ({
      ...relationBase('shared_prime_factor', 'deterministic_factor_structure'),
      prime_factor: factor,
      members: members.map(memberSummary),
      member_count: members.length,
    }))
    .sort((a, b) => b.member_count - a.member_count || b.prime_factor - a.prime_factor);
}

function twinPrimeRelations(entries) {
  const primes = entries.filter(x => x.fingerprint?.profile?.arithmetic?.prime === true);
  const out = [];
  for (let i = 0; i < primes.length; i += 1) {
    for (let j = i + 1; j < primes.length; j += 1) {
      if (Math.abs(primes[i].value - primes[j].value) !== 2) continue;
      const members = [primes[i], primes[j]].sort((a, b) => a.value - b.value);
      out.push({
        ...relationBase('twin_prime_pair', 'deterministic_prime_relation'),
        gap: 2,
        members: members.map(memberSummary),
      });
    }
  }
  return out;
}

function sharedLucasRelations(entries) {
  const members = entries.filter(x => x.fingerprint?.forms?.lucas);
  if (members.length < 2) return [];
  return [{
    ...relationBase('shared_sequence_family', 'deterministic_sequence_membership'),
    sequence_id: 'lucas',
    position_convention: 'zero_based_terms_L0_2_L1_1',
    members: members.map(entry => ({
      ...memberSummary(entry),
      index: entry.fingerprint.forms.lucas.index,
      notation: entry.fingerprint.forms.lucas.notation,
    })),
  }];
}

function sameValueRelations(entries) {
  return entries
    .filter(entry => entry.methods.length >= 2)
    .map(entry => ({
      ...relationBase('same_numeric_result_across_methods', 'numeric_equality_across_method_outputs'),
      value: entry.value,
      methods: entry.methods,
      note: 'Same expression produced the same numeric value through multiple method identities. This is a deterministic collision, not proof of method independence or research convergence.',
    }));
}

function highlightRelations(relations, limit) {
  const exact = relations.filter(x => x.type === 'exact_multiple');
  const exactPairs = exact.map(x => new Set([x.from.value, x.to.value]));
  const factor = relations.filter(x => x.type === 'shared_prime_factor').filter(rel => {
    const values = new Set(rel.members.map(x => x.value));
    return !exactPairs.some(pair => values.size === pair.size && [...values].every(v => pair.has(v)));
  });
  const twin = relations.filter(x => x.type === 'twin_prime_pair');
  const lucas = relations.filter(x => x.type === 'shared_sequence_family');
  const same = relations.filter(x => x.type === 'same_numeric_result_across_methods');
  return [...exact, ...factor, ...twin, ...lucas, ...same].slice(0, Math.max(1, Math.min(Number(limit) || 8, 20)));
}

export function buildGematriaMathFingerprint({
  expression = '',
  methodProfile = [],
  options = {},
} = {}) {
  const methods = (Array.isArray(methodProfile) ? methodProfile : []).map(normalizeMethod).filter(Boolean);
  const byValue = new Map();
  for (const method of methods) {
    if (!byValue.has(method.value)) byValue.set(method.value, []);
    byValue.get(method.value).push(method);
  }

  const values = [...byValue.entries()]
    .map(([value, groupedMethods]) => ({
      value,
      methods: groupedMethods,
      fingerprint: buildNumberMathFingerprint(value, {
        budget: options.numberBudget,
        provenance: options.provenance,
      }),
    }))
    .sort((a, b) => a.value - b.value);

  const minSharedPrimeFactor = Number.isSafeInteger(Number(options.minSharedPrimeFactor))
    ? Math.max(2, Number(options.minSharedPrimeFactor))
    : 11;

  const relations = [
    ...exactMultipleRelations(values),
    ...sharedPrimeFactorRelations(values, minSharedPrimeFactor),
    ...twinPrimeRelations(values),
    ...sharedLucasRelations(values),
    ...sameValueRelations(values),
  ];

  return {
    status: 'ok',
    capability: 'number_math_profile',
    adapter: GEMATRIA_MATH_FINGERPRINT_VERSION,
    expression: clean(expression) || null,
    source: {
      calculation_owner: 'project_codex.gematria_engine',
      method_registry: 'public.gematria_methods',
      expected_profile_source: 'fn_method_profile',
      math_owner: 'number_math_profile',
    },
    method_count: methods.length,
    distinct_value_count: values.length,
    values,
    relations,
    highlights: highlightRelations(relations, options.highlightLimit),
    policy: {
      min_shared_prime_factor: minSharedPrimeFactor,
      equal_value_methods_collapsed_for_cross_value_math: true,
      relationship_order_is_presentation_priority_not_truth_score: true,
    },
    truth_boundary: {
      numeric_results_must_arrive_from_canonical_gematria_engine: true,
      math_relations_are_deterministic_structure: true,
      relation_is_not_research_convergence: true,
      derived_or_duplicate_structure_does_not_inflate_independent_evidence: true,
      automatic_canonical_promotion: false,
      automatic_publication: false,
      human_gate_required_for_interpretation_or_promotion: true,
    },
  };
}

export async function fetchCanonicalGematriaMathFingerprint(expression, options = {}) {
  const phrase = clean(expression);
  if (!phrase || /^\d+$/.test(phrase)) {
    return buildGematriaMathFingerprint({ expression: phrase, methodProfile: [], options });
  }
  const { fetchNumberMethodProfile } = await import('./numberCoreProjection.js');
  const methodProfile = await fetchNumberMethodProfile(phrase);
  return buildGematriaMathFingerprint({ expression: phrase, methodProfile, options });
}
