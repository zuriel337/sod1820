// Offline, bounded review adapter. No connection, write, runtime projection or new parser.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { extractCandidates } from '../src/lib/analysisFlow.js';
import { extractCompoundClaims, verifyCandidate } from '../src/lib/triage.js';
import { normalizeForCalc } from '../src/lib/gematria.js';
import { assertReadOnly } from './audit-world-corpus-residual.mjs';

const evidenceUrl = new URL('../docs/reviews/world-claim-coverage-evidence-20261026.json', import.meta.url);
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/u;
const md5 = text => createHash('md5').update(text).digest('hex');
const check = (ok, reason) => { if (!ok) throw new Error(reason); };
export const readEvidence = () => JSON.parse(readFileSync(evidenceUrl, 'utf8'));

export function validateEvidence(evidence) {
  const { original, rows, sources, reviewPlan } = evidence;
  for (const items of [original, rows, sources, reviewPlan]) {
    check(Array.isArray(items) && items.length > 0, 'Missing bounded input');
    check(items.every(r => uuid.test(r.id)), 'Invalid ID');
    check(new Set(items.map(r => r.id)).size === items.length, 'Duplicate input ID');
  }
  check(reviewPlan.length === original.length, 'Incomplete review coverage');
  const rowMap = new Map(rows.map(r => [r.id, r]));
  const sourceMap = new Map(sources.map(r => [r.id, r]));
  for (const s of sources) {
    check(md5(s.text) === s.md5, 'Source fingerprint drift');
    check(s.status === 'live' && s.page_only === false && s.channel === 'torat-haremez'
      && s.contributor_id === 'c66f0464-0928-490e-be9b-66d8a87e7fc8', 'Source admission drift');
  }
  for (const row of rows) {
    check(row.privacy_scope === 'public' && ['approved', 'canonical'].includes(row.status), 'Nonpublic input');
    check(row.source_ref.split('#')[0] === `channel_updates:${row.source_id}`, 'Wrong exact source');
    check(sourceMap.has(row.source_id), 'Missing source');
  }
  for (const plan of reviewPlan) {
    check(['coverage_gap', 'composite', 'letter_decomposition', 'atomic_extraction',
      'atomic_punctuation', 'symbol_unresolved'].includes(plan.kind), 'Unknown review kind');
    const previous = original.find(r => r.id === plan.id), live = rowMap.get(plan.id);
    check(previous && live, 'Missing finding');
    check(previous.value === live.value && previous.source_ref === live.source_ref
      && previous.phrase === live.verification?.phrase && previous.method === live.verification?.method,
    'Finding drift since residual audit');
    check(previous.method === 'רגיל' && Number.isSafeInteger(previous.value), 'Unsupported audit input');
    if (plan.kind === 'coverage_gap') check(/^[א-ת]+(?: [א-ת]+)*$/u.test(previous.phrase), 'Mixed coverage input');
    const { start, end, excerpt } = plan.sourceSpan;
    check(Number.isInteger(start) && Number.isInteger(end) && start >= 0 && end > start,
      'Invalid source span');
    check(sourceMap.get(live.source_id).text.slice(start, end) === excerpt, 'Source span mismatch');
    if (plan.operand) check(excerpt.includes(plan.operand), 'Operand is not an exact source substring');
    if (plan.kind === 'letter_decomposition') {
      check(Array.isArray(plan.letterValues) && plan.letterValues.length === normalizeForCalc(plan.operand).length
        && plan.letterValues.every(Number.isSafeInteger), 'Missing positional letter claims');
      check(excerpt.includes(plan.letterValues.join(' + ')), 'Letter claims not found in source');
    }
    for (const id of previous.same_source_value_ids) {
      const retained = rowMap.get(id);
      check(retained && retained.source_id === live.source_id && retained.value === live.value,
        'Retained row missing or cross-source/value');
    }
    for (const span of plan.representativeSpans || []) {
      check(previous.same_source_value_ids.includes(span.id)
        && rowMap.get(span.id).statement.includes(span.text), 'Unbound representative span');
    }
  }
  return evidence;
}

// Calculation-normalized operand coverage != canonical claim identity.
// All normalization comes from the existing shared extractor. Operators and word order
// are never discarded here; a covered operand still does not justify hiding a record.
export function compareCoverage(finding, representatives, explicitSpans = []) {
  const covering = representatives.filter(row => row.source_id === finding.source_id
    && row.value === finding.value).flatMap(row => {
    const texts = [row.statement, ...(row.terms || []).map(t => `«${t}»`),
      ...explicitSpans.filter(s => s.id === row.id).map(s => `«${s.text}»`)];
    return extractCandidates(texts.join('\n')).filter(c => c.norm === finding.phrase)
      .map(c => ({ id: row.id, text: c.text, norm: c.norm }));
  });
  const coveredIds = [...new Set(covering.map(r => r.id))].sort();
  return { coverage: coveredIds.length ? 'operand_covered_format_variant' : 'additional_operand_required',
    coveredIds, evidence: covering, suppress: false };
}

export function replayPlan(plan, finding) {
  if (['composite', 'letter_decomposition'].includes(plan.kind)) {
    const claims = extractCompoundClaims(plan.sourceSpan.excerpt);
    // Never select an unrelated matching result from the full source or skip failed operands.
    const claim = claims.length === 1 ? claims[0] : null;
    const ok = claim?.status === 'ENGINE_VERIFIED_COMPOSITE' && claim.skipUsed === 0
      && claim.linkCount >= 2 && claim.linkValues.every(n => n === finding.value)
      && claim.operands.every(o => o.ok && o.method === finding.method);
    const atomic = plan.operand ? verifyCandidate({ type: 'explicit-claim',
      text: plan.operand, method: finding.method, value: finding.value }) : null;
    return { calculation: ok && (!atomic || atomic.engine_verified === true) ? 'match' : 'not_tested',
      type: 'derivation', claim, atomic, automaticPromotion: false };
  }
  const operand = plan.operand || finding.phrase;
  const atomic = verifyCandidate({ type: 'explicit-claim', text: operand,
    method: finding.method, value: finding.value });
  return { calculation: plan.kind === 'symbol_unresolved' ? 'not_tested'
    : atomic.engine_verified === true ? 'match' : 'mismatch',
  type: 'atomic', operand, atomic, automaticPromotion: false };
}

export function collectReplayInputs(evidence) {
  validateEvidence(evidence);
  const inputs = [];
  for (const plan of evidence.reviewPlan) {
    const finding = evidence.original.find(r => r.id === plan.id);
    const replay = replayPlan(plan, finding);
    if (replay.atomic) inputs.push({ id: plan.id, role: 'atomic', method: finding.method,
      phrase: plan.operand || finding.phrase, expected: finding.value });
    for (const [index, op] of (replay.claim?.operands || []).entries()) {
      inputs.push({ id: plan.id, role: `operand_${index}`, method: op.method,
        phrase: op.phrase, expected: op.value });
    }
    if (plan.kind === 'letter_decomposition') {
      // Leaves only. Arithmetic remains the canonical shared chain, not a new evaluator.
      for (const [index, letter] of [...normalizeForCalc(plan.operand)].entries()) {
        inputs.push({ id: plan.id, role: `letter_${index}`, method: finding.method,
          phrase: letter, expected: plan.letterValues[index] });
      }
    }
  }
  return inputs;
}

export function buildReplaySql(evidence) {
  const quote = text => `'${String(text).replaceAll("'", "''")}'`;
  const values = collectReplayInputs(evidence).map(r => `(${quote(r.id)}::uuid,${quote(r.role)},`
    + `${quote(r.method)},${quote(r.phrase)},${r.expected == null ? 'NULL' : r.expected}::integer)`).join(',\n');
  return assertReadOnly(`WITH inputs(id,role,method,phrase,expected) AS (VALUES ${values})
    SELECT i.*,public.fn_method_value(i.method,i.phrase) computed,
      now() checked_at,
      md5(pg_get_functiondef('public.fn_method_value(text,text)'::regprocedure)) engine_definition_md5
    FROM inputs i ORDER BY id,role`);
}

export function buildReview(evidence) {
  validateEvidence(evidence);
  const rowMap = new Map(evidence.rows.map(r => [r.id, r]));
  const allExpectedChecks = collectReplayInputs(evidence);
  return evidence.reviewPlan.map(plan => {
    const finding = evidence.original.find(r => r.id === plan.id);
    const live = rowMap.get(plan.id);
    const retained = finding.same_source_value_ids.map(id => rowMap.get(id));
    const coverage = plan.kind === 'coverage_gap'
      ? compareCoverage(finding, retained, plan.representativeSpans) : null;
    const replay = replayPlan(plan, finding);
    const dbChecks = (evidence.engineReplays || []).filter(r => r.id === plan.id);
    const expectedChecks = allExpectedChecks.filter(r => r.id === plan.id);
    const databaseConfirmed = expectedChecks.length > 0 && dbChecks.length === expectedChecks.length
      && expectedChecks.every(expected => dbChecks.some(r => r.role === expected.role
        && r.phrase === expected.phrase && r.method === expected.method
        && r.expected === expected.expected
        && typeof r.computed === 'number' && Number.isFinite(r.computed)
        && (expected.expected == null || r.computed === expected.expected)));
    const target = (evidence.targets || []).filter(t => t.value === finding.value);
    const targetId = target.length === 1 ? target[0].id : null;
    const ready = replay.calculation === 'match' && databaseConfirmed && !!targetId;
    const canonicalDuplicateIds = retained.filter(r => r.source_uid === live.source_uid
      && r.claim_uid === live.claim_uid).map(r => r.id);
    const covered = coverage?.coveredIds || [];
    const displayCandidates = [live, ...retained.filter(r => covered.includes(r.id))];
    displayCandidates.sort((a,b) => b.statement.length-a.statement.length || a.id.localeCompare(b.id));
    return { id: plan.id, sourceRef: live.source_ref, sourceId: live.source_id,
      sourceSpan: plan.sourceSpan, phrase: finding.phrase, value: finding.value,
      kind: plan.kind, replay, databaseConfirmed, targetId,
      recommendation: !ready ? 'requires_review' : coverage ? coverage.coverage : 'typed_calculation_ready',
      coverage, canonicalDuplicateIds, retainedIds: retained.map(r => r.id),
      preferredDisplayId: displayCandidates[0].id,
      keepAllRecords: true, suppress: false, independentSourcesAdded: 0,
      strength: null, evidenceQuality: null, publicationChanged: false, promoted: false,
      interpretationVerified: false, note: plan.note };
  });
}

export function summarizeReview(rows) {
  const counts = {};
  for (const r of rows) counts[r.recommendation] = (counts[r.recommendation] || 0) + 1;
  return { rows: rows.length, sources: new Set(rows.map(r => r.sourceId)).size, counts,
    canonicalDuplicatePairs: rows.reduce((n,r) => n+r.canonicalDuplicateIds.length, 0),
    livePromotions: 0, hiddenRecords: 0 };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const evidence = readEvidence();
  if (process.argv[2] === 'sql') process.stdout.write(buildReplaySql(evidence) + '\n');
  else if (process.argv[2] === 'inputs') process.stdout.write(JSON.stringify(collectReplayInputs(evidence)) + '\n');
  else {
    const rows = buildReview(evidence);
    process.stdout.write(JSON.stringify(process.argv[2] === 'rows' ? rows : summarizeReview(rows), null, 2) + '\n');
  }
}
