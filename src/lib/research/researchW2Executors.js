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
import { CAPABILITY_STATUS } from './researchResultBundle.js';

export { SAFE_W2_NUMERIC_LENSES, NUMERIC_SYSTEM_METHOD_RULE_IDS } from './researchW2ExecutorsBase.js';

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
      reason: partial ? `${capability} executed with per-anchor mixed outcomes; inspect trace.anchors` : first.reason || null,
      findings,
      findingOutcomes,
      negativeScope: status === CAPABILITY_STATUS.NEGATIVE_RESULT
        ? { anchors: runs.map(x => ({ number: x.number, scope: x.result?.negativeScope ?? x.result?.negative_scope ?? null })) }
        : null,
      sourceRefs: uniq(runs.flatMap(x => x.result?.sourceRefs || x.result?.source_refs || [`number:${x.number}`])),
      versionRefs: uniq(runs.flatMap(x => x.result?.versionRefs || x.result?.version_refs || [])),
      accessClass: first.accessClass || first.access_class,
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

  return {
    ...base,
    numeric: wrapMultiNumberExecutor(base.numeric, { maxAnchors: maxNumberAnchors, capability: 'numeric' }),
    numeric_operators: wrapMultiNumberExecutor(base.numeric_operators, { maxAnchors: maxNumberAnchors, capability: 'numeric_operators' }),
    research_objects: wrapMultiNumberExecutor(base.research_objects, { maxAnchors: maxNumberAnchors, capability: 'research_objects' }),
    'sequence:pi': wrapMultiNumberExecutor(base['sequence:pi'], { maxAnchors: maxNumberAnchors, capability: 'sequence:pi' }),
    'sequence:fibonacci': wrapMultiNumberExecutor(base['sequence:fibonacci'], { maxAnchors: maxNumberAnchors, capability: 'sequence:fibonacci' }),
    gematria,
  };
}

export const createCanonicalW2Executors = createCanonicalNumberW2Executors;
export default createCanonicalNumberW2Executors;
