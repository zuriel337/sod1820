import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ELS_GOLDENS, ELS_GOLDEN_CORPUS_ID, goldenReplayInvoke } from './fixtures/els-runtime-goldens.mjs';
import { verifyEls2029Selection } from '../src/lib/research/els2029ReplayClient.js';
import { runElsAdaptiveScan, normalizeElsScannerBudget, ELS_SCANNER_STOP } from '../src/lib/research/els2029AdaptiveScanner.js';
import {
  createSeededPrng, runSeededControls, benjaminiHochberg, applySignificanceLabels,
} from '../src/lib/research/els2029StatisticalControls.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const SCANNER = 'src/lib/research/els2029AdaptiveScanner.js';
const CONTROLS = 'src/lib/research/els2029StatisticalControls.js';

// ── A1 goldens ─────────────────────────────────────────────────────────────
test('goldens: exact corpus id, zero-based coordinates, replay via canonical verify interface', async () => {
  assert.equal(ELS_GOLDEN_CORPUS_ID, '0b022e8eef6f9c16');
  assert.equal(ELS_GOLDENS.length, 4);
  for (const g of ELS_GOLDENS) {
    assert.equal(g.corpus_id, ELS_GOLDEN_CORPUS_ID);
    assert.equal(g.positions[0], g.start);
    const out = await verifyEls2029Selection({ entityType: 'els', term: g.term, corpus: g.scope, skip: g.skip, dir: g.dir, start: g.start }, goldenReplayInvoke());
    assert.equal(out.ok, true, g.id);
    assert.deepEqual(out.result.occurrence.positions, [...g.positions]);
    assert.equal(out.result.occurrence.coordinate_convention, 'zero_based_character_index');
  }
  const miss = await verifyEls2029Selection({ entityType: 'els', term: 'תורה', corpus: 'torah', skip: 50, dir: 1, start: 6 }, goldenReplayInvoke());
  assert.equal(miss.ok, false);
  assert.equal(miss.state, 'REPLAY_MISMATCH');
});

test('goldens: fixture positions are an arithmetic progression skip*dir (fixture self-consistency)', () => {
  for (const g of ELS_GOLDENS) {
    g.positions.forEach((p, k) => assert.equal(p, g.start + g.dir * g.skip * k, g.id));
    assert.equal(g.positions.length, [...g.term].length);
  }
});

// ── A2 scanner ─────────────────────────────────────────────────────────────
const budget = { skipMin: 2, skipMax: 100, maxTrials: 10, maxCandidates: 5, maxDepth: 1, maxWallMs: 1000, pageSize: 10, maxPagesPerCandidate: 2 };
const hit = (skip, start, dir = 1) => ({ occurrence_id: `o:${skip}:${start}`, skip, start, dir, positions: [start, start + dir * skip] });

test('scanner: refuses to run without explicit hard budgets or with skipMax over the bridge ceiling', async () => {
  for (const bad of [{}, { ...budget, skipMax: undefined }, { ...budget, skipMax: 501 }, { ...budget, maxTrials: 0 }, { ...budget, maxWallMs: undefined }]) {
    const out = await runElsAdaptiveScan({ candidates: [{ term: 'אליהו' }], invokePage: async () => { throw new Error('must not be called'); }, budget: bad });
    assert.equal(out.stop, ELS_SCANNER_STOP.CONTEXT_REQUIRED);
    assert.equal(out.trials, 0);
  }
  assert.equal(normalizeElsScannerBudget(budget).ok, true);
});

test('scanner: every page call carries explicit bounded skip/stage/page limits; negatives + truncation preserved', async () => {
  const calls = [];
  const invokePage = async (req) => {
    calls.push(req);
    if (req.term === 'אליהו') {
      return req.after_skip == null
        ? { status: 'OK', hits: [hit(3, 10)], completion: { truncated: true, continuation: { after: { skip: 3, start: 10, dir: 1 } } } }
        : { status: 'OK', hits: [hit(4, 20)], completion: { truncated: true, continuation: { after: { skip: 4, start: 20, dir: 1 } } } };
    }
    return { status: 'EXECUTED_EMPTY', hits: [], completion: { truncated: false } };
  };
  const out = await runElsAdaptiveScan({ candidates: [{ term: 'אליהו' }, { term: 'תורהקדשה' }], invokePage, budget, stage: 'SEED' });
  for (const c of calls) {
    assert.equal(c.op, 'page'); assert.equal(c.stage, 'SEED');
    assert.equal(c.skip_min, 2); assert.equal(c.skip_max, 100); assert.equal(c.page_size, 10);
  }
  assert.equal(calls.length, 3);
  const [a, n] = out.outcomes;
  assert.equal(a.truncated, true); assert.equal(a.partial, true); assert.equal(a.hit_count, 2);
  assert.equal(n.negative, true); assert.equal(n.truncated, false);
  assert.equal(out.truthPromotion, false);
  assert.equal(out.occurrenceAuthority, 'canonical_engine_only');
});

test('scanner: hard trial budget stops with explicit state', async () => {
  const invokePage = async () => ({ status: 'OK', hits: [hit(2, 1)], completion: { truncated: true, continuation: { after: { skip: 2, start: 1, dir: 1 } } } });
  const out = await runElsAdaptiveScan({ candidates: [{ term: 'אליהו' }, { term: 'משיחא' }], invokePage, budget: { ...budget, maxTrials: 1 } });
  assert.equal(out.stop, ELS_SCANNER_STOP.BUDGET_MAX_TRIALS);
  assert.equal(out.complete, false);
  assert.equal(out.trials, 1);
});

test('scanner: candidate, depth, and wall-time budgets are enforced', async () => {
  const empty = async () => ({ status: 'EXECUTED_EMPTY', hits: [], completion: {} });
  const many = ['אליהו', 'משיחא', 'תורהה', 'קדושהה'].map((term) => ({ term }));
  const c = await runElsAdaptiveScan({ candidates: many, invokePage: empty, budget: { ...budget, maxCandidates: 2 } });
  assert.equal(c.stop, ELS_SCANNER_STOP.BUDGET_MAX_CANDIDATES);
  assert.equal(c.outcomes.length, 2);

  const expand = ({ candidate }) => [{ term: `${candidate.term}א` }];
  const d = await runElsAdaptiveScan({ candidates: [{ term: 'אליהו' }], invokePage: empty, expand, budget: { ...budget, maxDepth: 1 } });
  assert.equal(d.outcomes.length, 2); // depth 0 + depth 1, depth 2 never planned
  assert.ok(d.outcomes.every((o) => o.depth <= 1));

  let t = 0;
  const w = await runElsAdaptiveScan({ candidates: many, invokePage: empty, budget: { ...budget, maxWallMs: 5 }, now: () => (t += 10) });
  assert.equal(w.stop, ELS_SCANNER_STOP.BUDGET_WALL_TIME);
});

test('scanner: adapter failure is preserved, short terms need hot context, verify goes through injected adapter', async () => {
  const f = await runElsAdaptiveScan({ candidates: [{ term: 'אליהו' }], invokePage: async () => { throw new Error('boom'); }, budget });
  assert.equal(f.outcomes[0].state, 'FAILED');
  const s = await runElsAdaptiveScan({ candidates: [{ term: 'תור' }, { term: 'תורה' }], invokePage: async () => ({ status: 'EXECUTED_EMPTY', hits: [], completion: {} }), budget });
  assert.equal(s.outcomes.every((o) => o.state === 'SKIPPED'), true); // 3-4 letter terms w/o pre-registration or hot context
  const verifyCalls = [];
  const v = await runElsAdaptiveScan({
    candidates: [{ term: 'אליהו' }],
    invokePage: async () => ({ status: 'OK', hits: [hit(1820, 27914)], completion: { truncated: false } }),
    invokeVerify: async (r) => { verifyCalls.push(r); return { verification_state: 'MATCH' }; }, verifyTop: 1, budget,
  });
  assert.equal(verifyCalls[0].op, 'verify'); assert.equal(v.verifications[0].verification_state, 'MATCH');
});

test('scanner: computes no occurrences, no Engine2, no Math.random, no supabase/network', () => {
  const src = read(SCANNER);
  for (const forbidden of [/Math\.random/, /els_engine2|Engine2|engine2/i, /torah_stream|els_torah_occurrences/, /fetch\(|\.rpc\(|supabase/i, /generate_series/]) {
    assert.doesNotMatch(src, forbidden, String(forbidden));
  }
  assert.match(src, /canonical_engine_only/);
  assert.doesNotMatch(read(CONTROLS), /Math\.random/);
});

// ── A3 controls / FDR ─────────────────────────────────────────────────────
const nullModel = { id: 'test_uniform_null_v1', description: 'declared test null' };
const controlStatistic = ({ prng }) => Math.floor(prng() * 100);

test('controls: same seed → identical schedule + p-value; different seed → different schedule', () => {
  const args = { trials: 50, nullModel, observed: 90, statistic: ({ observed }) => observed, controlStatistic };
  const a = runSeededControls({ seed: 1820, ...args });
  const b = runSeededControls({ seed: 1820, ...args });
  const c = runSeededControls({ seed: 1821, ...args });
  assert.deepEqual(a.controlManifest, b.controlManifest);
  assert.equal(a.pValue, b.pValue);
  assert.notDeepEqual(a.controlManifest, c.controlManifest);
  assert.equal(a.seed, 1820); assert.equal(a.trials, 50); assert.equal(a.controlManifest.length, 50);
  assert.equal(a.pValue, (a.extremeCount + 1) / 51);
  assert.equal(a.significanceLabel, null); assert.equal(a.truthPromotion, false);
  assert.deepEqual([createSeededPrng(7)(), createSeededPrng(7)()], [createSeededPrng(7)(), createSeededPrng(7)()]);
});

test('controls: undeclared null model / seed / trials → CONTEXT_REQUIRED, no p-value', () => {
  for (const bad of [{ trials: 10 }, { seed: 1, trials: 0, nullModel }, { seed: 1, trials: 5 }]) {
    const r = runSeededControls({ statistic: () => 1, controlStatistic, ...bad });
    assert.equal(r.status, 'CONTEXT_REQUIRED'); assert.equal(r.pValue, null);
  }
});

test('BH: known vector, monotonic q-values, input-order preserved', () => {
  const p = [0.01, 0.04, 0.03, 0.005];
  const r = benjaminiHochberg(p, { alpha: 0.05, familyId: 'fam1' });
  // sorted 0.005,0.01,0.03,0.04 → raw q .02,.02,.04,.04 (monotone)
  assert.deepEqual(r.qValues.map((x) => Number(x.toFixed(6))), [0.02, 0.04, 0.04, 0.02]);
  assert.deepEqual(r.rejected, [true, true, true, true]);
  const classic = benjaminiHochberg([0.001, 0.008, 0.039, 0.041, 0.042, 0.06, 0.074, 0.205, 0.212, 0.216], { familyId: 'f' });
  const sorted = [...classic.qValues].sort((a, b) => a - b);
  assert.deepEqual(classic.qValues, sorted); // already ordered input → q non-decreasing
  assert.equal(Number(classic.qValues[0].toFixed(4)), 0.01);
  assert.ok(classic.qValues.every((q) => q <= 1));
  assert.equal(benjaminiHochberg([0.5, 2], { familyId: 'x' }).status, 'CONTEXT_REQUIRED');
  assert.equal(benjaminiHochberg([0.5]).status, 'CONTEXT_REQUIRED'); // undeclared family
});

test('no significance label without controls AND FDR; labels never promote truth', () => {
  const controls = runSeededControls({ seed: 3, trials: 20, nullModel, observed: 1, statistic: () => 99, controlStatistic });
  const fdr = benjaminiHochberg([controls.pValue], { familyId: 'f' });
  assert.equal(applySignificanceLabels({ controls, fdr: null }).significanceLabel, null);
  assert.equal(applySignificanceLabels({ controls: null, fdr }).significanceLabel, null);
  const ok = applySignificanceLabels({ controls, fdr });
  assert.match(ok.significanceLabel, /DECLARED_NULL|DECLARED/);
  assert.equal(ok.truthPromotion, false); assert.equal(ok.nullModelId, nullModel.id);
});

// ── A4 provenance migration ───────────────────────────────────────────────
const LIVE_V3_MD5 = {
  els_search_core_v1: '817c619424f0826f31cb1fc064fffdb1',
  els_search_geometry_core_v1: '3a63b9321c1f8a6ffa5337d360294dfb',
  els_search_page_core_v1: '69c33e052316a427d638d77efa3502d9',
  els_verify_occurrence_v1: 'c0e03e852dd35e64433e0f9718c82694',
};
const MIGRATION = 'supabase/migrations/20260929180000_g3_els_provenance_v3_to_v9_reconciliation_v1.sql';

test('provenance migration: reverting v9→v3 reproduces the live v3 definitions byte-for-byte (md5)', () => {
  const sql = read(MIGRATION);
  const defs = sql.match(/CREATE OR REPLACE FUNCTION [\s\S]*?AS \$function\$[\s\S]*?\n\$function\$/g) || [];
  assert.equal(defs.length, 4);
  const seen = {};
  for (const d of defs) {
    const name = d.match(/public\.(\w+)\(/)[1];
    const reverted = `${d}\n`.replaceAll('els_research_layer_law:v9', 'els_research_layer_law:v3');
    seen[name] = createHash('md5').update(reverted, 'utf8').digest('hex');
    assert.doesNotMatch(d, /els_research_layer_law:v3/);
    assert.match(d, /els_research_layer_law:v9/);
  }
  assert.deepEqual(seen, LIVE_V3_MD5);
});

test('provenance migration: only CREATE OR REPLACE of the four functions; no grants/DDL/data changes', () => {
  const stripped = read(MIGRATION).replace(/--.*$/gm, '');
  assert.doesNotMatch(stripped, /\b(GRANT|REVOKE|DROP|ALTER|INSERT|UPDATE|DELETE|CREATE TABLE)\b/i);
});

test('active code refs: elsW2Executor + bridge carry v9 only', () => {
  const src = read('src/lib/research/elsW2Executor.js');
  assert.doesNotMatch(src, /els_research_layer_law:v3/);
  assert.equal((src.match(/els_research_layer_law:v9/g) || []).length, 2);
  assert.doesNotMatch(read('supabase/functions/els-search-bridge/index.ts'), /els_research_layer_law v3/);
});
