import { analyzeNumberMath } from './numberMathProfile.js';
import { createSequenceRegistry, runSequenceLens, SEQUENCE_OPERATION } from './sequenceLens.js';
import { piSequenceAdapter } from './piSequence.js';
import { fibonacciSequenceAdapter } from './fibonacciSequence.js';

export const NUMERIC_PATTERN_WORKBENCH_VERSION = 'numeric-pattern-workbench-v1';
export const DEFAULT_PATTERN_BUDGET = Object.freeze({
  maxValues: 16,
  piSearchDepth: 5000,
  sequenceWindowRadius: 8,
});

const sequenceRegistry = createSequenceRegistry([piSequenceAdapter, fibonacciSequenceAdapter]);

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

function normalizeValues(input, maxValues = DEFAULT_PATTERN_BUDGET.maxValues) {
  const raw = Array.isArray(input) ? input : String(input ?? '').split(/[\s,;|]+/);
  const values = [];
  for (const item of raw) {
    const n = Number(item);
    if (!Number.isSafeInteger(n) || n < 0) continue;
    if (!values.includes(n)) values.push(n);
    if (values.length >= maxValues) break;
  }
  return values;
}

function relationKey(kind, payload) {
  return `${kind}:${JSON.stringify(payload)}`;
}

export function analyzeNumericRelations(input, options = {}) {
  const maxValues = Number.isInteger(options.maxValues) && options.maxValues > 0
    ? Math.min(options.maxValues, 32)
    : DEFAULT_PATTERN_BUDGET.maxValues;
  const values = normalizeValues(input, maxValues);
  const sorted = [...values].sort((a, b) => a - b);
  const set = new Set(values);
  const relations = [];
  const seen = new Set();
  const add = (kind, payload, strength = 'deterministic_relation') => {
    const key = relationKey(kind, payload);
    if (seen.has(key)) return;
    seen.add(key);
    relations.push({ kind, strength, ...payload });
  };

  // Additive identities among observed values only. i<=j deliberately permits x+x=y
  // (e.g. 2116+2116=4232) without inventing an unseen operand.
  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i; j < sorted.length; j += 1) {
      const a = sorted[i];
      const b = sorted[j];
      const c = a + b;
      if (Number.isSafeInteger(c) && set.has(c)) add('additive_identity', { operands: [a, b], result: c });
    }
  }

  // Equal-step triples / midpoint symmetry.
  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      const step = sorted[j] - sorted[i];
      if (step <= 0) continue;
      const c = sorted[j] + step;
      if (set.has(c)) add('arithmetic_progression', {
        values: [sorted[i], sorted[j], c],
        step,
        midpoint: sorted[j],
      });
    }
  }

  // Exact Pythagorean triples among observed positive values. BigInt avoids square overflow.
  for (let i = 0; i < sorted.length; i += 1) {
    const a = sorted[i];
    if (a <= 0) continue;
    for (let j = i + 1; j < sorted.length; j += 1) {
      const b = sorted[j];
      for (let k = j + 1; k < sorted.length; k += 1) {
        const c = sorted[k];
        if (BigInt(a) * BigInt(a) + BigInt(b) * BigInt(b) !== BigInt(c) * BigInt(c)) continue;
        const scale = Number(gcdMany([a, b, c]));
        add('pythagorean_triple', {
          values: [a, b, c],
          scale,
          primitive: scale > 0 ? [a / scale, b / scale, c / scale] : null,
        });
      }
    }
  }

  // Common-factor projection across the whole supplied set. This is a relation over observed
  // values, not a new Gematria method. It is useful for patterns such as 888/1480/2368 -> 296*(3,5,8).
  if (sorted.length >= 2 && sorted.every(n => n > 0)) {
    const common = gcdMany(sorted);
    if (common > 1n) {
      const commonNumber = Number(common);
      add('common_factor_projection', {
        values: sorted,
        common_factor: commonNumber,
        coefficients: sorted.map(n => n / commonNumber),
      });
    }
  }

  // Elementary symmetric degree-2 signature: find three observed bases whose three pair-products
  // are also observed. If their product-sum is present, surface that exact observed convergence too.
  for (let i = 0; i < sorted.length; i += 1) {
    const a = sorted[i];
    if (a <= 0) continue;
    for (let j = i + 1; j < sorted.length; j += 1) {
      const b = sorted[j];
      for (let k = j + 1; k < sorted.length; k += 1) {
        const c = sorted[k];
        const products = [a * b, a * c, b * c];
        if (products.some(v => !Number.isSafeInteger(v)) || !products.every(v => set.has(v))) continue;
        const e2 = products.reduce((x, y) => x + y, 0);
        add('symmetric_pair_products', {
          bases: [a, b, c],
          pair_products: products.sort((x, y) => x - y),
          e2,
          e2_present: set.has(e2),
        });
      }
    }
  }

  return {
    status: 'ok',
    capability: 'numeric_relation_operators',
    version: NUMERIC_PATTERN_WORKBENCH_VERSION,
    input: values,
    relations,
    provenance: {
      owner: 'research_strategy_layer_law',
      semantic_class: 'derivation',
      truth_boundary: 'deterministic relation over supplied/verified numeric inputs; never Gematria truth or canonicality by itself',
    },
  };
}

function findPiOverlaps(piHits) {
  const spans = piHits
    .filter(x => x.found && Number.isInteger(x.first_position))
    .map(x => ({ value: x.value, start: x.first_position, end: x.first_position + String(x.value).length - 1 }))
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const overlaps = [];
  for (let i = 0; i < spans.length; i += 1) {
    for (let j = i + 1; j < spans.length; j += 1) {
      if (spans[j].start > spans[i].end) break;
      overlaps.push({
        values: [spans[i].value, spans[j].value],
        overlap_start: Math.max(spans[i].start, spans[j].start),
        overlap_end: Math.min(spans[i].end, spans[j].end),
        spans: [spans[i], spans[j]],
      });
    }
  }
  return overlaps;
}

function consecutiveFibonacciGroups(fibHits) {
  const hits = fibHits
    .filter(x => x.found && Number.isInteger(x.first_position))
    .sort((a, b) => a.first_position - b.first_position);
  const groups = [];
  let current = [];
  for (const hit of hits) {
    if (!current.length || hit.first_position === current[current.length - 1].first_position + 1) current.push(hit);
    else {
      if (current.length >= 2) groups.push(current);
      current = [hit];
    }
  }
  if (current.length >= 2) groups.push(current);
  return groups.map(group => ({
    values: group.map(x => x.value),
    positions: group.map(x => x.first_position),
  }));
}

export async function runNumericPatternWorkbench(input, options = {}) {
  const budget = {
    maxValues: Number.isInteger(options.maxValues) ? Math.min(Math.max(options.maxValues, 1), 32) : DEFAULT_PATTERN_BUDGET.maxValues,
    piSearchDepth: Number.isInteger(options.piSearchDepth) ? Math.min(Math.max(options.piSearchDepth, 100), piSequenceAdapter.maxSearchDepth) : DEFAULT_PATTERN_BUDGET.piSearchDepth,
    sequenceWindowRadius: Number.isInteger(options.sequenceWindowRadius) ? Math.min(Math.max(options.sequenceWindowRadius, 1), 25) : DEFAULT_PATTERN_BUDGET.sequenceWindowRadius,
  };
  const values = normalizeValues(input, budget.maxValues);
  const relations = analyzeNumericRelations(values, budget);
  const piHits = [];
  const fibonacciHits = [];
  const zeckendorf = [];
  const mathProfiles = [];

  for (const value of values) {
    const provenance = { requestSource: 'heichal-2029-pattern-workbench', inputRef: `number:${value}` };
    const pi = await runSequenceLens(sequenceRegistry, {
      sequenceId: 'pi',
      query: String(value),
      operation: SEQUENCE_OPERATION.FIRST,
      budget: { maxSearchDepth: budget.piSearchDepth, windowRadius: budget.sequenceWindowRadius, maxOccurrences: 10 },
      provenance,
    });
    piHits.push({
      value,
      found: pi?.result?.found === true,
      first_position: pi?.result?.first_position ?? null,
      search_depth: pi?.search_depth ?? budget.piSearchDepth,
      window: pi?.result?.surrounding_window ?? null,
      sequence_version: pi?.sequence_version ?? null,
    });

    const fib = await runSequenceLens(sequenceRegistry, {
      sequenceId: 'fibonacci',
      query: String(value),
      operation: SEQUENCE_OPERATION.TERM_FIRST,
      budget: { maxSearchDepth: 10000, windowRadius: budget.sequenceWindowRadius, maxOccurrences: 10 },
      provenance,
    });
    fibonacciHits.push({
      value,
      found: fib?.result?.found === true,
      first_position: fib?.result?.first_position ?? null,
      sequence_version: fib?.sequence_version ?? null,
    });

    const z = await runSequenceLens(sequenceRegistry, {
      sequenceId: 'fibonacci',
      query: String(value),
      operation: SEQUENCE_OPERATION.ZECKENDORF,
      budget: { maxSearchDepth: 10000, windowRadius: budget.sequenceWindowRadius, maxOccurrences: 10 },
      provenance,
    });
    zeckendorf.push({ value, decomposition: z?.result?.decomposition ?? null, sequence_version: z?.sequence_version ?? null });

    mathProfiles.push(analyzeNumberMath(value, {
      budget: options.mathBudget || {},
      provenance,
    }));
  }

  return {
    status: 'ok',
    capability: 'numeric_pattern_workbench',
    version: NUMERIC_PATTERN_WORKBENCH_VERSION,
    input: values,
    relations: relations.relations,
    sequences: {
      pi: piHits,
      pi_overlaps: findPiOverlaps(piHits),
      fibonacci: fibonacciHits,
      fibonacci_consecutive_groups: consecutiveFibonacciGroups(fibonacciHits),
      zeckendorf,
    },
    math_profiles: mathProfiles,
    provenance: {
      reused: [
        'numberMathProfile',
        'sequenceLens',
        'piSequenceAdapter',
        'fibonacciSequenceAdapter',
      ],
      added: ['bounded cross-value relation operators'],
      truth_boundary: 'workbench output is deterministic research derivation/context; it does not auto-create a Finding, convergence, canonical fact, edge or publication',
    },
  };
}
