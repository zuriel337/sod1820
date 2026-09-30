// ADAPTIVE_CAPPED_V1 router: extracted verbatim from the tzofen template and run against the canonical tk-letters.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { loadRouter, letters } from '../tools/els/router-harness.mjs';

const root = new URL('..', import.meta.url).pathname;
const tpl = readFileSync(root + 'tools/els/els-code.template.html', 'utf8');
const A = loadRouter();

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
  assert.ok(j.sig >= 1, 'stratified probe detects ירושלים');
  const z = probe('זזזזז', A.AD_PROBE_PAIRS);
  assert.equal(z.sig, 0);
  assert.equal(A.adChoose(z.sig, null).strategy, 'ANCHOR_FAST_V1');
  // probe covers both directions and several bands for a common word
  const m = probe('משיח', A.AD_PROBE_PAIRS);
  const dirs = new Set([...m.hits.values()].map((h) => h.dir)), bands = new Set([...m.hits.values()].map((h) => Math.floor((h.start * 8) / letters.length)));
  assert.ok(dirs.size === 2 && bands.size >= 4, `dirs ${dirs.size} bands ${bands.size}`);
  assert.equal(A.adChoose(m.sig, null).strategy, 'HYBRID_COVERAGE_V1');
});

const key = (h) => `${h.skip}_${h.dir}_${h.start}`;
const sameSet = (a, b) => { const x = new Set(a.map(key)), y = new Set(b.map(key)); return x.size === y.size && [...x].every((k) => y.has(k)); };

test('skip=1 (plain text) is never a router signal and never a governed-eligible probe hit', () => {
  // לא is a very common plain-text run: skip-1 hits exist in the corpus but must not count toward the strategy signal
  for (const term of ['בראשית', 'ויאמר', 'אלהימ']) {
    const ps = probe(term, A.AD_PROBE_PAIRS);
    const s1 = [...ps.hits.values()].filter((h) => Math.abs(h.skip) < 2).length;
    const s2 = [...ps.hits.values()].filter((h) => Math.abs(h.skip) >= 2).length;
    assert.equal(ps.sig, s2, `${term}: signal counts skip>=2 only`);
    assert.ok(s1 + s2 === ps.hits.size);
  }
  const b = probe('בראשית', A.AD_PROBE_PAIRS);
  assert.ok([...b.hits.values()].some((h) => Math.abs(h.skip) === 1), 'fixture: plain-text occurrence exists and is collected as candidate only');
  assert.ok(b.sig < b.hits.size, 'skip-1 excluded from signal');
});

test('HYBRID primary path: complete enumeration == exact anchor set (no loss), every hit exact', async () => {
  for (const term of ['ירושלימ', 'שמעונ', 'אברהמ']) {
    const ps = probe(term, A.AD_PROBE_PAIRS);
    const r = A.stratCollect(ps, 1e9);   // uncapped: lanes run to exhaustion
    assert.equal(r.capped, 0);
    const anchor = A.findAll(term, 1e9);
    assert.ok(sameSet(r.hits, anchor.hits), `${term}: hybrid ${r.hits.length} vs anchor ${anchor.hits.length}`);
    for (const h of r.hits) assert.ok(exact(term, h));
  }
});

test('HYBRID primary path: capped result is band- and direction-spread, exact, and exactly cap governed-eligible candidates', () => {
  const term = 'משיח', cap = 400;
  const ps = probe(term, A.AD_PROBE_PAIRS);
  const r = A.stratCollect(ps, cap);
  assert.equal(r.capped, 1);
  assert.equal(r.hits.filter((h) => Math.abs(h.skip) >= 2).length, cap);
  for (const h of r.hits) assert.ok(exact(term, h));
  const bands = new Set(r.hits.map((h) => Math.floor((h.start * 8) / letters.length)));
  assert.ok(bands.size >= 6 && new Set(r.hits.map((h) => h.dir)).size === 2, `bands ${bands.size}`);
});

test('routedDiscover HYBRID branch never invokes the full anchor collector (findAll / findAllAdaptive)', () => {
  const body = tpl.slice(tpl.indexOf('async function routedDiscover('), tpl.indexOf('// ── canonical batch verification'));
  const hyb = body.slice(body.indexOf('if(ch.strategy==="HYBRID_COVERAGE_V1")'), body.indexOf('}else{'));
  assert.match(hyb, /stratCollect\(ps,cap\)/);
  assert.doesNotMatch(hyb, /findAll/);
  const anchor = body.slice(body.indexOf('}else{'));
  assert.match(anchor, /findAllAdaptive\(raw,cap\):findAll\(raw,cap\)/);
  assert.doesNotMatch(body.slice(0, body.indexOf('if(ch.strategy')), /findAll/, 'no anchor scan before strategy choice');
});

test('routedDiscover end-to-end: common -> HYBRID (capped, exact); sparse/no-hit -> ANCHOR_FAST', async () => {
  const r = await A.routedDiscover('משיח', 4000);
  assert.equal(r.strategy.strategy, 'HYBRID_COVERAGE_V1');
  assert.ok(r.capped === 1 || r.hits.length > 0);
  for (const h of r.hits.slice(0, 50)) assert.ok(exact('משיח', h));
  const z = await A.routedDiscover('זזזזז', 4000);
  assert.equal(z.strategy.strategy, 'ANCHOR_FAST_V1');
  assert.equal(z.hits.length, 0);
});
