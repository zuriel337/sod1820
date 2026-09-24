// Canonical W2 executor entrypoint.
//
// W2.2d keeps the previously released W2.2b executor implementation byte-for-byte in the internal
// researchW2ExecutorsBase module and extends THIS canonical entrypoint with:
//   1) canonical Gematria over bounded text/name representations;
//   2) bounded multi-number dispatch over the existing numeric/sequence/research-object/operator
//      executors.
// This remains one executor tree, not a second composer/engine. Existing imports keep this path.

import { createCanonicalNumberW2Executors as createBaseW2Executors } from './researchW2ExecutorsBase.js';
import { createGematriaW2Executor } from './gematriaW2Executor.js';
import { createElsW2Executor } from './elsW2Executor.js';
import { analyzeNumericRelations, numericRelationsToUniversalFindings, zeckendorfToUniversalFinding, NUMERIC_RELATION_ENGINE_VERSION } from './numericRelationOperations.js';
import { createSequenceRegistry, runSequenceLens, SEQUENCE_OPERATION } from './sequenceLens.js';
import { fibonacciSequenceAdapter } from './fibonacciSequence.js';
import { ACCESS_CLASS, CAPABILITY_STATUS, EVIDENCE_RELATION, SEMANTIC_CLASS } from './researchResultBundle.js';

export { SAFE_W2_NUMERIC_LENSES, NUMERIC_SYSTEM_METHOD_RULE_IDS } from './researchW2ExecutorsBase.js';
export {
  NUMERIC_RELATION_ENGINE_VERSION,
  NUMERIC_RELATION_OPERATION,
  NUMERIC_RELATION_OPERATION_CATALOG,
  listNumericRelationOperations,
} from './numericRelationOperations.js';

const numericSequenceRegistry = createSequenceRegistry([fibonacciSequenceAdapter]);

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function parseCanonicalNumber(raw) {
  if (typeof raw === 'number') return Number.isSafeInteger(raw) && raw >= 0 ? raw : null;
  if (typeof raw !== 'string') return null;
  const text = raw.trim();
  if (!/^\d+$/.test(text)) return null;
  const number = Number(text);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function numberAnchors(identityResolution, maxAnchors = 4) {
  const max = Math.max(1, Math.min(Number(maxAnchors) || 4, 8));
  const seen = new Set();
  const out = [];
  for (const identity of Array.isArray(identityResolution?.identities) ? identityResolution.identities : []) {
    if (identity?.type !== 'number') continue;
    const number = parseCanonicalNumber(identity?.value ?? identity?.ref ?? identity?.key ?? identity?.label);
    if (number == null || seen.has(number)) continue;
    seen.add(number);
    out.push({ identity, number });
    if (out.length >= max) break;
  }
  return out;
}

function numericRelationAnchors(identityResolution, maxAnchors = 16) {
  const max = Math.max(2, Math.min(Number(maxAnchors) || 16, 32));
  const seen = new Set();
  const out = [];
  for (const identity of Array.isArray(identityResolution?.identities) ? identityResolution.identities : []) {
    if (identity?.type !== 'number') continue;
    const number = parseCanonicalNumber(identity?.value ?? identity?.ref ?? identity?.key ?? identity?.label);
    if (number == null || seen.has(number)) continue;
    seen.add(number);
    out.push({ identity, number });
    if (out.length >= max) break;
  }
  return out;
}

function relationInputsArePublic(anchors) {
  return anchors.every(anchor => {
    const tier = clean(anchor.identity?.access?.tier);
    return !tier || tier === 'public';
  });
}

function narrowToAnchor(identityResolution, anchor) {
  return {
    ...(identityResolution || {}),
    identities: [anchor.identity],
    primary: anchor.identity,
    semantic: [anchor.identity],
    text_representations: [],
  };
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

// MOST-RESTRICTIVE WINS. The aggregate access class drives the composition-boundary filter, so it
// may never be inherited from whichever anchor happened to run first: one access-controlled anchor
// among several public ones must keep the whole aggregate access-controlled, otherwise a Finding
// with no explicit tier would pass the boundary instead of being refused.
const ACCESS_CLASS_RESTRICTION_ORDER = Object.freeze([
  ACCESS_CLASS.PUBLIC_SOURCE,
  ACCESS_CLASS.UNCLASSIFIED,
  ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED,
  ACCESS_CLASS.PERSONAL,
]);

function mostRestrictiveAccessClass(runs) {
  let best = null;
  let bestRank = -1;
  for (const run of runs) {
    const value = run.result?.accessClass || run.result?.access_class;
    if (!value) continue;
    const rank = ACCESS_CLASS_RESTRICTION_ORDER.indexOf(value);
    // An unknown class is treated as at least as restrictive as anything known — fail closed.
    const effectiveRank = rank === -1 ? ACCESS_CLASS_RESTRICTION_ORDER.length : rank;
    if (effectiveRank > bestRank) { bestRank = effectiveRank; best = value; }
  }
  return best;
}

function aggregateBounded(runs) {
  const boundedRuns = runs.filter(x => x.result?.bounded);
  if (!boundedRuns.length) return null;
  const totals = boundedRuns.map(x => Number(x.result.bounded?.total_count)).filter(Number.isFinite);
  const returned = boundedRuns.reduce((sum, x) => sum + (Number(x.result.bounded?.returned_count) || 0), 0);
  const continuations = boundedRuns
    .filter(x => x.result.bounded?.truncated && x.result.bounded?.continuation)
    .map(x => ({ number: x.number, continuation: x.result.bounded.continuation }));
  return {
    total_count: totals.length === boundedRuns.length ? totals.reduce((a, b) => a + b, 0) : null,
    returned_count: returned,
    truncated: continuations.length > 0,
    window: { kind: 'multi_anchor', anchor_count: runs.length },
    ordering: 'per_anchor_canonical_order__anchor_input_order',
    continuation: continuations.length ? { kind: 'multi_anchor_keyset', anchors: continuations } : null,
  };
}

function aggregateStatus(runs) {
  const statuses = runs.map(x => x.result?.status).filter(Boolean);
  if (!statuses.length || statuses.every(x => x === CAPABILITY_STATUS.SKIPPED)) return CAPABILITY_STATUS.SKIPPED;
  if (statuses.every(x => x === CAPABILITY_STATUS.NEGATIVE_RESULT)) return CAPABILITY_STATUS.NEGATIVE_RESULT;
  if (statuses.some(x => x === CAPABILITY_STATUS.EXECUTED || x === CAPABILITY_STATUS.NEGATIVE_RESULT)) return CAPABILITY_STATUS.EXECUTED;
  if (statuses.some(x => x === CAPABILITY_STATUS.FAILED)) return CAPABILITY_STATUS.FAILED;
  if (statuses.some(x => x === CAPABILITY_STATUS.CONTEXT_REQUIRED)) return CAPABILITY_STATUS.CONTEXT_REQUIRED;
  if (statuses.some(x => x === CAPABILITY_STATUS.MISSING_ADAPTER)) return CAPABILITY_STATUS.MISSING_ADAPTER;
  if (statuses.some(x => x === CAPABILITY_STATUS.UNVERIFIED)) return CAPABILITY_STATUS.UNVERIFIED;
  return statuses[0] || CAPABILITY_STATUS.SKIPPED;
}

function wrapMultiNumberExecutor(executor, { maxAnchors = 4, capability }) {
  if (typeof executor !== 'function') return executor;
  return async context => {
    const anchors = numberAnchors(context?.identityResolution, maxAnchors);
    if (anchors.length <= 1) return executor(context);

    const runs = [];
    for (const anchor of anchors) {
      const result = await executor({
        ...context,
        identityResolution: narrowToAnchor(context.identityResolution, anchor),
      });
      runs.push({ number: anchor.number, result });
    }

    const findings = runs.flatMap(x => Array.isArray(x.result?.findings) ? x.result.findings : []);
    const findingOutcomes = runs.flatMap(x => Array.isArray(x.result?.findingOutcomes)
      ? x.result.findingOutcomes
      : Array.isArray(x.result?.finding_outcomes) ? x.result.finding_outcomes : []);
    const status = aggregateStatus(runs);
    const partial = new Set(runs.map(x => x.result?.status)).size > 1;
    const first = runs.find(x => x.result) ?.result || {};

    return {
      owner: first.owner || 'research_strategy_layer_law',
      status,
      reason: partial
        ? `${capability} per-anchor outcomes differ (${runs.map(x => `${x.number}:${x.result?.status || 'unknown'}`).join(', ')})`
        : first.reason || null,
      findings,
      findingOutcomes,
      negativeScope: status === CAPABILITY_STATUS.NEGATIVE_RESULT
        ? { anchors: runs.map(x => ({ number: x.number, scope: x.result?.negativeScope ?? x.result?.negative_scope ?? null })) }
        : null,
      sourceRefs: uniq(runs.flatMap(x => x.result?.sourceRefs || x.result?.source_refs || [`number:${x.number}`])),
      versionRefs: uniq(runs.flatMap(x => x.result?.versionRefs || x.result?.version_refs || [])),
      accessClass: mostRestrictiveAccessClass(runs) || first.accessClass || first.access_class,
      semanticClass: first.semanticClass || first.semantic_class,
      bounded: aggregateBounded(runs),
      trace: {
        multi_anchor: true,
        anchor_count: anchors.length,
        max_anchor_budget: Math.max(1, Math.min(Number(maxAnchors) || 4, 8)),
        anchors: runs.map(x => ({
          number: x.number,
          status: x.result?.status || null,
          reason: clean(x.result?.reason),
          bounded: x.result?.bounded ?? null,
          trace: x.result?.trace ?? null,
        })),
      },
    };
  };
}

export function createCanonicalNumberW2Executors(options = {}) {
  const base = createBaseW2Executors(options);
  const maxNumberAnchors = options.maxNumberAnchors ?? 4;
  const gematria = createGematriaW2Executor({
    supabase: options.supabase,
    maxRepresentations: options.gematriaMaxRepresentations ?? 16,
    controls: options.gematriaControls !== false,
  });

  const els = createElsW2Executor({
    supabase: options.supabase,
    scope: options.elsScope ?? 'torah',
    maxSkip: options.elsMaxSkip ?? 40,
    maxHits: options.elsMaxHits ?? 16,
    maxRepresentations: options.elsMaxRepresentations ?? 4,
    selectionProtocol: options.elsSelectionProtocol ?? null,
  });

  const fibonacciZeckendorf = async ({ identityResolution }) => {
    const anchors = numericRelationAnchors(identityResolution, 2);
    if (anchors.length !== 1) {
      return {
        owner: 'research_strategy_layer_law',
        status: CAPABILITY_STATUS.SKIPPED,
        reason: 'sequence:fibonacci:zeckendorf requires exactly one canonical number identity',
        findings: [],
        accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
        semanticClass: SEMANTIC_CLASS.DERIVATION,
        versionRefs: [NUMERIC_RELATION_ENGINE_VERSION, 'operation:fibonacci_zeckendorf_v1'],
        trace: { operation_key: 'fibonacci_zeckendorf_v1', anchor_count: anchors.length },
      };
    }
    if (!relationInputsArePublic(anchors)) {
      return {
        owner: 'research_strategy_layer_law',
        status: CAPABILITY_STATUS.CONTEXT_REQUIRED,
        reason: 'Zeckendorf v1 refuses restricted/personal number identities until a privacy-safe relation identity projection is available',
        findings: [],
        accessClass: ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED,
        semanticClass: SEMANTIC_CLASS.DERIVATION,
        versionRefs: [NUMERIC_RELATION_ENGINE_VERSION, 'operation:fibonacci_zeckendorf_v1'],
        trace: { operation_key: 'fibonacci_zeckendorf_v1', restricted_inputs: true },
      };
    }

    const value = anchors[0].number;
    const result = await runSequenceLens(numericSequenceRegistry, {
      sequenceId: 'fibonacci',
      query: String(value),
      operation: SEQUENCE_OPERATION.ZECKENDORF,
      budget: { maxSearchDepth: 100, maxOccurrences: 10, windowRadius: 8 },
      provenance: { requestSource: 'research-composer-w2', inputRef: `number:${value}` },
    });
    const decomposition = result?.result?.decomposition || null;
    const finding = zeckendorfToUniversalFinding(value, decomposition, {
      sequenceVersion: result?.sequence_version || null,
      accessTier: 'public',
      inputRef: `number:${value}`,
    });
    if (!finding) {
      return {
        owner: 'research_strategy_layer_law',
        status: CAPABILITY_STATUS.FAILED,
        reason: result?.error || 'Zeckendorf decomposition did not complete',
        findings: [],
        accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
        semanticClass: SEMANTIC_CLASS.DERIVATION,
        versionRefs: [NUMERIC_RELATION_ENGINE_VERSION, result?.sequence_version || 'fibonacci:unknown-version'],
        trace: { operation_key: 'fibonacci_zeckendorf_v1', value, result_status: result?.status || null },
      };
    }
    return {
      owner: 'research_strategy_layer_law',
      status: CAPABILITY_STATUS.EXECUTED,
      findings: [finding],
      findingOutcomes: [{
        findingId: finding.id,
        evidenceRelation: EVIDENCE_RELATION.DERIVATION,
        reason: 'Zeckendorf is a deterministic decomposition of one value, never independent corroboration',
      }],
      accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
      semanticClass: SEMANTIC_CLASS.DERIVATION,
      sourceRefs: [`number:${value}`],
      versionRefs: [
        NUMERIC_RELATION_ENGINE_VERSION,
        'operation:fibonacci_zeckendorf_v1',
        result?.sequence_version || 'fibonacci:unknown-version',
      ],
      trace: {
        operation_key: 'fibonacci_zeckendorf_v1',
        value,
        decomposition,
        sequence_version: result?.sequence_version || null,
        truth_boundary: 'deterministic mathematical derivation; never independent evidence or canonicality by itself',
      },
    };
  };

  const numericRelations = async ({ identityResolution }) => {
    const anchors = numericRelationAnchors(identityResolution, options.maxNumericRelationAnchors ?? 16);
    if (anchors.length < 2) {
      return {
        owner: 'research_strategy_layer_law',
        status: CAPABILITY_STATUS.SKIPPED,
        reason: 'numeric_relations requires at least two distinct canonical number identities',
        findings: [],
        accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
        semanticClass: SEMANTIC_CLASS.DERIVATION,
        versionRefs: [NUMERIC_RELATION_ENGINE_VERSION],
        trace: { relation_engine: NUMERIC_RELATION_ENGINE_VERSION, anchor_count: anchors.length },
      };
    }

    // V1 fail-closed privacy boundary. Cross-value relation identities currently encode their
    // numeric operands; until the identity projector has a redacted relation-id contract, never let
    // restricted/personal inputs leak through a capability trace or Finding id.
    if (!relationInputsArePublic(anchors)) {
      return {
        owner: 'research_strategy_layer_law',
        status: CAPABILITY_STATUS.CONTEXT_REQUIRED,
        reason: 'numeric_relations v1 refuses restricted/personal number identities until a privacy-safe relation identity projection is available',
        findings: [],
        accessClass: ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED,
        semanticClass: SEMANTIC_CLASS.DERIVATION,
        versionRefs: [NUMERIC_RELATION_ENGINE_VERSION],
        trace: { relation_engine: NUMERIC_RELATION_ENGINE_VERSION, anchor_count: anchors.length, restricted_inputs: true },
      };
    }

    const values = anchors.map(anchor => anchor.number);
    const analysis = analyzeNumericRelations(values, { maxValues: options.maxNumericRelationAnchors ?? 16 });
    const findings = numericRelationsToUniversalFindings(analysis, {
      accessTier: 'public',
      inputRef: `numbers:${values.join(',')}`,
    });
    const operations = [...new Set(analysis.relations.map(relation => relation.operation_key))];

    return {
      owner: 'research_strategy_layer_law',
      status: findings.length ? CAPABILITY_STATUS.EXECUTED : CAPABILITY_STATUS.NEGATIVE_RESULT,
      reason: findings.length ? null : 'no registered numeric relation matched the supplied number set',
      findings,
      findingOutcomes: findings.map(finding => ({
        findingId: finding.id,
        evidenceRelation: EVIDENCE_RELATION.DERIVATION,
        reason: 'deterministic cross-number operation; derivation only, never independent corroboration',
      })),
      accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
      semanticClass: SEMANTIC_CLASS.DERIVATION,
      negativeScope: findings.length ? null : {
        values,
        operation_catalog: operations,
        bounded_max_values: Math.min(Number(options.maxNumericRelationAnchors) || 16, 32),
      },
      sourceRefs: values.map(value => `number:${value}`),
      versionRefs: [NUMERIC_RELATION_ENGINE_VERSION, ...operations.map(key => `operation:${key}`)],
      trace: {
        relation_engine: NUMERIC_RELATION_ENGINE_VERSION,
        input: values,
        relation_count: analysis.relations.length,
        operation_keys: operations,
        truth_boundary: analysis.provenance.truth_boundary,
      },
    };
  };

  return {
    ...base,
    numeric: wrapMultiNumberExecutor(base.numeric, { maxAnchors: maxNumberAnchors, capability: 'numeric' }),
    numeric_operators: wrapMultiNumberExecutor(base.numeric_operators, { maxAnchors: maxNumberAnchors, capability: 'numeric_operators' }),
    numeric_relations: numericRelations,
    'sequence:fibonacci:zeckendorf': fibonacciZeckendorf,
    research_objects: wrapMultiNumberExecutor(base.research_objects, { maxAnchors: maxNumberAnchors, capability: 'research_objects' }),
    'sequence:pi': wrapMultiNumberExecutor(base['sequence:pi'], { maxAnchors: maxNumberAnchors, capability: 'sequence:pi' }),
    'sequence:fibonacci': wrapMultiNumberExecutor(base['sequence:fibonacci'], { maxAnchors: maxNumberAnchors, capability: 'sequence:fibonacci' }),
    gematria,
    els,
  };
}

export const createCanonicalW2Executors = createCanonicalNumberW2Executors;
export default createCanonicalNumberW2Executors;
