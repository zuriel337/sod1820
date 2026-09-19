import { makeUniversalFinding } from './universalFinding.js';

export const NUMERIC_RELATION_ENGINE_VERSION = 'numeric-relations-v1';

export const NUMERIC_RELATION_OPERATION = Object.freeze({
  ADDITIVE_IDENTITY: 'additive_identity_v1',
  ARITHMETIC_PROGRESSION: 'arithmetic_progression_v1',
  COMMON_FACTOR_PROJECTION: 'common_factor_projection_v1',
  PYTHAGOREAN_TRIPLE: 'pythagorean_triple_v1',
  SYMMETRIC_PAIR_PRODUCTS: 'symmetric_pair_products_v1',
  FIBONACCI_ZECKENDORF: 'fibonacci_zeckendorf_v1',
});

const operation = (operationKey, displayLabel, executorRef, inputKind) => Object.freeze({
  operation_key: operationKey,
  version: 1,
  display_label: displayLabel,
  owner: 'research_strategy_layer_law',
  contract_owner: 'research_intake_foundation_contract_law',
  semantic_class: 'derivation',
  deterministic: true,
  executor_ref: executorRef,
  input_kind: inputKind,
  truth_boundary: 'deterministic mathematical derivation; never a Gematria method, independent evidence, canonical claim or publication by itself',
});

export const NUMERIC_RELATION_OPERATION_CATALOG = Object.freeze([
  operation(NUMERIC_RELATION_OPERATION.ADDITIVE_IDENTITY, 'חיבור זהויות', 'numeric-relations:additive', 'number_set'),
  operation(NUMERIC_RELATION_OPERATION.ARITHMETIC_PROGRESSION, 'סדרה שוות־הפרש / נקודת אמצע', 'numeric-relations:equal-step', 'number_set'),
  operation(NUMERIC_RELATION_OPERATION.COMMON_FACTOR_PROJECTION, 'גורם משותף ומקדמים', 'numeric-relations:common-factor', 'number_set'),
  operation(NUMERIC_RELATION_OPERATION.PYTHAGOREAN_TRIPLE, 'שלשה פיתגורית', 'numeric-relations:pythagorean', 'number_set'),
  operation(NUMERIC_RELATION_OPERATION.SYMMETRIC_PAIR_PRODUCTS, 'מכפלות זוגיות סימטריות', 'numeric-relations:symmetric-pair-products', 'number_set'),
  operation(NUMERIC_RELATION_OPERATION.FIBONACCI_ZECKENDORF, 'פירוק זקנדורף', 'fibonacciSequenceAdapter:zeckendorf_decomposition', 'number'),
]);

const OPERATION_BY_KEY = new Map(NUMERIC_RELATION_OPERATION_CATALOG.map(row => [row.operation_key, row]));

export function numericRelationOperation(operationKey) {
  return OPERATION_BY_KEY.get(operationKey) || null;
}

export function listNumericRelationOperations() {
  return [...NUMERIC_RELATION_OPERATION_CATALOG];
}

function gcd2(a, b) {
  let x = BigInt(a);
  let y = BigInt(b);
  while (y !== 0n) [x, y] = [y, x % y];
  return x < 0n ? -x : x;
}

function gcdMany(values) {
  if (!values.length) return 0n;
  return values.reduce((g, n) => gcd2(g, n), 0n);
}

function normalizeValues(input, maxValues) {
  const raw = Array.isArray(input) ? input : String(input ?? '').split(/[\s,;|]+/).filter(Boolean);
  const values = [];
  for (const item of raw) {
    if (item == null || String(item).trim() === '') continue;
    const n = Number(item);
    if (!Number.isSafeInteger(n) || n < 0) continue;
    if (!values.includes(n)) values.push(n);
    if (values.length >= maxValues) break;
  }
  return values;
}

function relationKey(operationKey, payload) {
  return `${operationKey}:${JSON.stringify(payload)}`;
}

export function analyzeNumericRelations(input, options = {}) {
  const maxValues = Number.isInteger(options.maxValues) && options.maxValues > 0
    ? Math.min(options.maxValues, 32)
    : 16;
  const values = normalizeValues(input, maxValues);
  const sorted = [...values].sort((a, b) => a - b);
  const set = new Set(values);
  const relations = [];
  const seen = new Set();

  const add = (kind, operationKey, payload) => {
    const key = relationKey(operationKey, payload);
    if (seen.has(key)) return;
    seen.add(key);
    relations.push({
      kind,
      operation_key: operationKey,
      operation_version: numericRelationOperation(operationKey)?.version ?? 1,
      strength: 'deterministic_relation',
      ...payload,
    });
  };

  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i; j < sorted.length; j += 1) {
      const a = sorted[i];
      const b = sorted[j];
      const c = a + b;
      if (Number.isSafeInteger(c) && set.has(c)) {
        add('additive_identity', NUMERIC_RELATION_OPERATION.ADDITIVE_IDENTITY, { operands: [a, b], result: c });
      }
    }
  }

  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      const step = sorted[j] - sorted[i];
      if (step <= 0) continue;
      const c = sorted[j] + step;
      if (set.has(c)) {
        add('arithmetic_progression', NUMERIC_RELATION_OPERATION.ARITHMETIC_PROGRESSION, {
          values: [sorted[i], sorted[j], c],
          step,
          midpoint: sorted[j],
        });
      }
    }
  }

  for (let i = 0; i < sorted.length; i += 1) {
    const a = sorted[i];
    if (a <= 0) continue;
    for (let j = i + 1; j < sorted.length; j += 1) {
      const b = sorted[j];
      for (let k = j + 1; k < sorted.length; k += 1) {
        const c = sorted[k];
        if (BigInt(a) * BigInt(a) + BigInt(b) * BigInt(b) !== BigInt(c) * BigInt(c)) continue;
        const scale = Number(gcdMany([a, b, c]));
        add('pythagorean_triple', NUMERIC_RELATION_OPERATION.PYTHAGOREAN_TRIPLE, {
          values: [a, b, c],
          scale,
          primitive: scale > 0 ? [a / scale, b / scale, c / scale] : null,
        });
      }
    }
  }

  if (sorted.length >= 2 && sorted.every(n => n > 0)) {
    const common = gcdMany(sorted);
    if (common > 1n) {
      const commonNumber = Number(common);
      add('common_factor_projection', NUMERIC_RELATION_OPERATION.COMMON_FACTOR_PROJECTION, {
        values: sorted,
        common_factor: commonNumber,
        coefficients: sorted.map(n => n / commonNumber),
      });
    }
  }

  for (let i = 0; i < sorted.length; i += 1) {
    const a = sorted[i];
    if (a <= 0) continue;
    for (let j = i + 1; j < sorted.length; j += 1) {
      const b = sorted[j];
      for (let k = j + 1; k < sorted.length; k += 1) {
        const c = sorted[k];
        const products = [a * b, a * c, b * c];
        if (products.some(v => !Number.isSafeInteger(v)) || !products.every(v => set.has(v))) continue;
        const orderedProducts = [...products].sort((x, y) => x - y);
        const e2 = orderedProducts.reduce((x, y) => x + y, 0);
        add('symmetric_pair_products', NUMERIC_RELATION_OPERATION.SYMMETRIC_PAIR_PRODUCTS, {
          bases: [a, b, c],
          pair_products: orderedProducts,
          e2,
          e2_present: set.has(e2),
        });
      }
    }
  }

  return {
    status: 'ok',
    capability: 'numeric_relations',
    version: NUMERIC_RELATION_ENGINE_VERSION,
    input: values,
    relations,
    operation_catalog_version: 1,
    provenance: {
      owner: 'research_strategy_layer_law',
      contract: 'research_intake_foundation_contract_law §6.10/§6.11',
      semantic_class: 'derivation',
      truth_boundary: 'deterministic relation over supplied/verified numeric inputs; never Gematria truth or canonicality by itself',
    },
  };
}

function relationNumbers(relation) {
  const values = [
    ...(relation.operands || []),
    ...(relation.values || []),
    ...(relation.bases || []),
    ...(relation.pair_products || []),
    relation.result,
    relation.midpoint,
    relation.common_factor,
    relation.e2,
  ].filter(Number.isSafeInteger);
  return [...new Set(values)].sort((a, b) => a - b);
}

function relationLabel(relation) {
  switch (relation.kind) {
    case 'additive_identity':
      return `${relation.operands[0]} + ${relation.operands[1]} = ${relation.result}`;
    case 'arithmetic_progression':
      return `${relation.values.join(' → ')} · Δ=${relation.step}`;
    case 'common_factor_projection':
      return `${relation.values.join(', ')} = ${relation.common_factor} × [${relation.coefficients.join(', ')}]`;
    case 'pythagorean_triple':
      return `${relation.values[0]}² + ${relation.values[1]}² = ${relation.values[2]}²`;
    case 'symmetric_pair_products':
      return `[${relation.bases.join(', ')}] → [${relation.pair_products.join(', ')}] · e₂=${relation.e2}`;
    default:
      return relation.operation_key;
  }
}

export function numericRelationsToUniversalFindings(analysis, options = {}) {
  if (!analysis || analysis.status !== 'ok') return [];
  const accessTier = options.accessTier ?? 'public';
  const createdBy = `ENGINE:numeric-relations@${NUMERIC_RELATION_ENGINE_VERSION}`;

  return analysis.relations.map(relation => {
    const numbers = relationNumbers(relation);
    const catalog = numericRelationOperation(relation.operation_key);
    const sourceIdentity = {
      operation_key: relation.operation_key,
      operation_version: relation.operation_version,
      input_numbers: analysis.input,
      relation,
    };
    return makeUniversalFinding({
      kind: 'numeric-relation',
      stage: null,
      status: null,
      subject: {
        type: 'numeric-relation',
        key: relationKey(relation.operation_key, relation),
        label: relationLabel(relation),
        value: relation.result ?? relation.midpoint ?? relation.e2 ?? null,
      },
      source: {
        engine: 'numeric-relations',
        adapter: NUMERIC_RELATION_ENGINE_VERSION,
        sourceRef: `operation:${relation.operation_key}`,
        method: relation.operation_key,
        corpus: null,
        lang: null,
      },
      identity: {
        sourceIdentity,
        occurrence: null,
        entityRef: null,
        relationRef: null,
      },
      verification: {
        claimed_expression: null,
        claimed_method: null,
        claimed_value: null,
        engine_method_tested: `numeric-relations:${relation.operation_key}`,
        engine_result: relation,
        verification_state: 'not_tested',
      },
      evidence: {
        refs: numbers.map(n => `number:${n}`),
        facts: [{
          type: 'numeric-relation',
          operation_key: relation.operation_key,
          operation_version: relation.operation_version,
          deterministic: true,
          relation,
          boundary: catalog?.truth_boundary || null,
        }],
        score: null,
        confidence: null,
      },
      access: {
        tier: accessTier,
        reason: 'derived only from the supplied canonical number identities; inherits the most restrictive declared input tier',
      },
      provenance: {
        createdBy,
        inputRef: options.inputRef || `numbers:${analysis.input.join(',')}`,
      },
      projection: {
        anchors: numbers.map(value => ({ space: 'number', value })),
        relations: [],
        dimensions: {
          operation_key: relation.operation_key,
          operation_version: relation.operation_version,
          semantic_class: 'derivation',
        },
      },
      view: { rendererHints: { role: 'numeric-relation' } },
    });
  });
}


export function zeckendorfToUniversalFinding(value, decomposition, options = {}) {
  if (!decomposition?.complete) return null;
  const catalog = numericRelationOperation(NUMERIC_RELATION_OPERATION.FIBONACCI_ZECKENDORF);
  const terms = Array.isArray(decomposition.terms) ? decomposition.terms : [];
  const numericTerms = terms.map(part => Number(part.term)).filter(Number.isSafeInteger);
  const label = `${value} = ${numericTerms.join(' + ')}`;

  return makeUniversalFinding({
    kind: 'numeric-relation',
    stage: null,
    status: null,
    subject: {
      type: 'numeric-relation',
      key: `${NUMERIC_RELATION_OPERATION.FIBONACCI_ZECKENDORF}:${value}`,
      label,
      value,
    },
    source: {
      engine: 'sequence:fibonacci',
      adapter: options.sequenceVersion || null,
      sourceRef: `operation:${NUMERIC_RELATION_OPERATION.FIBONACCI_ZECKENDORF}`,
      method: NUMERIC_RELATION_OPERATION.FIBONACCI_ZECKENDORF,
      corpus: null,
      lang: null,
    },
    identity: {
      sourceIdentity: {
        operation_key: NUMERIC_RELATION_OPERATION.FIBONACCI_ZECKENDORF,
        operation_version: catalog?.version || 1,
        input: value,
        decomposition,
      },
      occurrence: null,
      entityRef: `number:${value}`,
      relationRef: null,
    },
    verification: {
      claimed_expression: null,
      claimed_method: null,
      claimed_value: null,
      engine_method_tested: 'fibonacciSequenceAdapter:zeckendorf_decomposition',
      engine_result: decomposition,
      verification_state: 'not_tested',
    },
    evidence: {
      refs: [`number:${value}`, ...numericTerms.map(term => `number:${term}`)],
      facts: [{
        type: 'numeric-relation',
        operation_key: NUMERIC_RELATION_OPERATION.FIBONACCI_ZECKENDORF,
        operation_version: catalog?.version || 1,
        deterministic: true,
        input: value,
        decomposition,
        boundary: catalog?.truth_boundary || null,
      }],
      score: null,
      confidence: null,
    },
    access: {
      tier: options.accessTier ?? 'public',
      reason: 'deterministic Fibonacci decomposition of the supplied canonical number identity',
    },
    provenance: {
      createdBy: `ENGINE:fibonacci@${options.sequenceVersion || 'unknown'}`,
      inputRef: options.inputRef || `number:${value}`,
    },
    projection: {
      anchors: [value, ...numericTerms].map(anchorValue => ({ space: 'number', value: anchorValue })),
      relations: [],
      dimensions: {
        operation_key: NUMERIC_RELATION_OPERATION.FIBONACCI_ZECKENDORF,
        operation_version: catalog?.version || 1,
        semantic_class: 'derivation',
        position_convention: decomposition.position_convention || null,
      },
    },
    view: { rendererHints: { role: 'numeric-relation' } },
  });
}
