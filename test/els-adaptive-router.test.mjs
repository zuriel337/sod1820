// ADAPTIVE_CAPPED_V1 router: extracted verbatim from the tzofen template and run against the canonical tk-letters.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('..', import.meta.url).pathname;
const tpl = readFileSync(root + 'tools/els/els-code.template.html', 'utf8');
const letters = readFileSync(root + 'tools/els/data/tk-letters.txt', 'utf8');

function fnSrc(name) {
  const i = tpl.indexOf(`function ${name}(`);
  assert.ok(i > 0, name);
  let d = 0, j = tpl.indexOf('{', i);
  for (let k = j; k < tpl.length; k++) { if (tpl[k] === '{') d++; else if (tpl[k] === '}' && --d === 0) return tpl.slice(i, k + 1); }
  throw new Error('unbalanced ' + name);
}
const consts = tpl.match(/const AD_POLICY="[^"]+",AD_BANDS=\d+,AD_PROBE_PAIRS=\d+,AD_PROBE_PAIRS_EXT=\d+;/)[0];
const ctx = vm.createContext({ T: letters.split('') });
vm.runInContext([
  'const scopeN=()=>T.length;const hitKey=h=>h.skip+"_"+h.dir+"_"+h.start;', consts,
  ...['lb', 'fwdSetup', 'vdc', 'fwdLaneScan', 'stratProbeInit', 'stratProbeRun', 'adChoose'].map(fnSrc),
  'this.api={stratProbeInit,stratProbeRun,adChoose,AD_PROBE_PAIRS,AD_PROBE_PAIRS_EXT,AD_BANDS};',
].join('\n'), ctx);
const A = ctx.api;

function probe(term, pairs) { const ps = A.stratProbeInit(term); A.stratProbeRun(ps, pairs); return ps; }
function exact(term, h) {
  for (let k = 0; k < term.length; k++) if (letters[h.start + h.dir * h.skip * k] !== term[k]) return false;
  return true;
}

test('spec constants: 8 bands, 500k then 2M candidate-pair budget', () => {
  assert.equal(A.AD_BANDS, 8); assert.equal(A.AD_PROBE_PAIRS, 500000); assert.equal(A.AD_PROBE_PAIRS_EXT, 2000000);
});

test('adChoose: 0 -> ANCHOR_FAST, >=2 -> HYBRID_COVERAGE, exactly 1 -> extend then Hybrid only if signal strengthens', () => {
  assert.deepEqual({ ...A.adChoose(0, null) }, { strategy: 'ANCHOR_FAST_V1', extended: false });
  assert.deepEqual({ ...A.adChoose(2, null) }, { strategy: 'HYBRID_COVERAGE_V1', extended: false });
  assert.deepEqual({ ...A.adChoose(57, null) }, { strategy: 'HYBRID_COVERAGE_V1', extended: false });
  assert.deepEqual({ ...A.adChoose(1, 1) }, { strategy: 'ANCHOR_FAST_V1', extended: true });
  assert.deepEqual({ ...A.adChoose(1, 3) }, { strategy: 'HYBRID_COVERAGE_V1', extended: true });
});

test('stratified probe: every reported hit is exact; budget is respected; probe work is resumable (reuse on extension)', () => {
  for (const term of ['ירושלימ', 'משיח', 'שדי']) {
    const ps = probe(term, A.AD_PROBE_PAIRS);
    assert.ok(ps.pairs <= A.AD_PROBE_PAIRS, `${term} pairs ${ps.pairs}`);
    for (const h of ps.hits.values()) assert.ok(exact(term, h), `${term} ${h.skip}/${h.dir}/${h.start}`);
    const before = ps.hits.size, pairsBefore = ps.pairs;
    A.stratProbeRun(ps, A.AD_PROBE_PAIRS_EXT);
    assert.ok(ps.pairs >= pairsBefore && ps.hits.size >= before, 'extension only adds work/hits (no restart)');
    assert.ok(ps.pairs <= A.AD_PROBE_PAIRS_EXT);
  }
});

test('independent-challenge cases: ירושלים detected by the stratified probe (prefix-only probes miss it); זזזזז stays zero -> ANCHOR', () => {
  const j = probe('ירושלימ', A.AD_PROBE_PAIRS);
  assert.ok(j.hits.size >= 1, 'stratified probe detects ירושלים');
  const z = probe('זזזזז', A.AD_PROBE_PAIRS);
  assert.equal(z.hits.size, 0);
  assert.equal(A.adChoose(z.hits.size, null).strategy, 'ANCHOR_FAST_V1');
  // probe covers both directions and several bands for a common word
  const m = probe('משיח', A.AD_PROBE_PAIRS);
  const dirs = new Set([...m.hits.values()].map((h) => h.dir)), bands = new Set([...m.hits.values()].map((h) => Math.floor((h.start * 8) / letters.length)));
  assert.ok(dirs.size === 2 && bands.size >= 4, `dirs ${dirs.size} bands ${bands.size}`);
  assert.equal(A.adChoose(m.hits.size, null).strategy, 'HYBRID_COVERAGE_V1');
});
