import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateReplay, compareReplay, checkReplayBudget, checkMatchedRegressionBudget } from '../scripts/perf-execution-2029/replay-gate.mjs';
import { MEASUREMENT_PROFILE } from '../scripts/perf-execution-2029/measurement-profile.mjs';
const load = () => JSON.parse(readFileSync(new URL('../docs/perf-evidence-20261014/execution/world-primary-before-enrichment.json', import.meta.url)));
test('recorded complete replay passes; missing responses and failed primary reads fail closed', () => {
  const data = load(); assert.equal(validateReplay(data).valid, true);
  data.routes['/world'].samples[0].misses.push('missing'); assert.equal(validateReplay(data).valid, false);
  const failed = load(); failed.routes['/world'].samples[0].reads.find(r => r.primary).status = 403;
  assert.equal(validateReplay(failed).valid, false);
});
test('fixtures/browser differences prevent comparison and isolated savings are not added', () => {
  const before = load(), after = load(); after.fixturesSha256 = 'different';
  assert.equal(compareReplay(before, after).comparable, false);
  assert.deepEqual(compareReplay(before, after).deltas, {});
});
test('a replay budget rejects request or readiness regression', () => {
  const data = load(); const ready = data.routes['/world'].median.ready;
  assert.equal(checkReplayBudget(data, { routes: { '/world': { ready: ready + 1, restCount: 55 } } }).valid, true);
  assert.equal(checkReplayBudget(data, { routes: { '/world': { ready: ready - 1 } } }).valid, false);
});
test('matched budgets reject slower timing and extra reads on the same runner', () => {
  const before = load(), after = load();
  const budget = { maxTimingRatio: 1.1, timingNoiseMs: 100, maxAdditionalRestReads: 0, maxCls: 0.1 };
  assert.equal(checkMatchedRegressionBudget(before, after, budget).valid, true);
  after.routes['/world'].median.ready *= 1.3;
  assert.equal(checkMatchedRegressionBudget(before, after, budget).valid, false);
});
test('intentional extension failures are functional evidence only; primary still becomes ready first', () => {
  const data = JSON.parse(readFileSync(new URL('../docs/perf-evidence-20261014/execution/world-extension-failure.json', import.meta.url)));
  assert.equal(validateReplay(data, { functional: true }).valid, true);
  assert.equal(validateReplay(data).valid, false);
  const s = data.routes['/world'].samples[0];
  assert.ok(s.ready < s.lastRestEnd - 2000);
  assert.equal(s.reads.filter(r => r.intentionalFailure).length, 6);
});

// Saved PR1110 v2 evidence remains unchanged and cannot pass the current gate.
// Adapt an in-memory copy for this validator unit test only, not new evidence.
// Malformed bounds must never turn timestamp comparisons into comparisons with NaN.
test('current replay rejects missing, nonnumeric and nonfinite observation bounds', () => {
  const historical=()=>JSON.parse(readFileSync(new URL('../docs/perf-evidence-20261015/cold-measurement/raw/replay-mobile.json',import.meta.url)));
  assert.equal(validateReplay(historical()).valid,false);
  const valid=()=>({...historical(),measurementProfile:MEASUREMENT_PROFILE});
  assert.equal(validateReplay(valid()).valid,true);
  for(const field of ['observationEnd','readsObservationEnd'])for(const value of [undefined,null,'bad','123',NaN,Infinity,-1]){
    const data=valid();data.routes['/'].samples[0][field]=value;
    assert.equal(validateReplay(data).valid,false,`${field}=${value}`);
  }
});

test('isolated and historical network conditions cannot silently compare',()=>{
  const before=load(),after=load();after.networkIsolation='local-fixture-only-v1';
  const out=compareReplay(before,after);assert.equal(out.comparable,false);assert.deepEqual(out.deltas,{});
});
