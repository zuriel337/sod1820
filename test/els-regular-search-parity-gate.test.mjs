import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const template = readFileSync(new URL('../tools/els/els-code.template.html', import.meta.url), 'utf8');
const core = readFileSync(new URL('../supabase/migrations/20260916150900_g3_els_core_compatibility_extension_v1.sql', import.meta.url), 'utf8');
const hardening = readFileSync(new URL('../supabase/migrations/20260916151000_g3_els_core_compatibility_truth_hardening_v1.sql', import.meta.url), 'utf8');
const bridge = readFileSync(new URL('../supabase/functions/els-search-bridge/index.ts', import.meta.url), 'utf8');

test('legacy embedded regular Torah search is full-domain and capped at 4000 with explicit dispersal', () => {
  assert.match(template, /st\.res=_slow\?await findAllAdaptive\(w,4000\):findAll\(w,4000\)/);
  assert.match(template, /const TORAH_N=304805/);
  assert.match(template, /function scopeRange\(setup\)/);
  assert.match(template, /function fwdDisperseTopUp\(hits,dirs\)/);
  assert.match(template, /if\(capped\)[\s\S]{0,300}fwdDisperseTopUp/);
});

test('canonical page core can execute the full Torah skip domain exhaustively', () => {
  assert.match(core, /v_full_max := greatest\(1,floor\(\(v_hi-1\)::numeric\/greatest\(1,v_len-1\)\)::integer\)/);
  assert.match(core, /v_smax := least\(v_full_max,greatest\(v_smin,coalesce\(p_skip_max,v_full_max\)\)\)/);
  assert.match(core, /exhaustive_with_continuation',true/);
  assert.match(core, /ordering','skip,start,forward-before-back-on-exact-tie'/);
});

test('public page wrapper still has a 500 skip ceiling and must not be used as regular-search cutover authority', () => {
  assert.match(core, /least\(greatest\(coalesce\(p_skip_max,40\),2\),500\)/);
  assert.match(bridge, /serviceRpc\("els_search_page_core_v1"/);
  assert.doesNotMatch(bridge, /serviceRpc\("els_search_page_v1"/);
});

test('server occurrence truth is single-generator and selection remains a separate projection concern', () => {
  assert.match(core + hardening, /els_torah_occurrences_internal_v1/);
  assert.match(core, /order by o\.skip,o\.start0,o\.dir desc/);
  assert.doesNotMatch(core + hardening, /scopeRange|fwdDisperseTopUp|DISPERSE_SEG/);
});

function orderedPrefix(hits, cap) {
  return [...hits].sort((a,b)=>a.skip-b.skip || a.start-b.start || b.dir-a.dir).slice(0, cap);
}

function corpusDispersed(hits, cap, segments=4) {
  const sorted=[...hits].sort((a,b)=>a.start-b.start || a.skip-b.skip || b.dir-a.dir);
  if(sorted.length<=cap) return sorted;
  const out=[];
  const segmentSize=Math.ceil(sorted.length/segments);
  for(let i=0;i<segments && out.length<cap;i++) {
    const seg=sorted.slice(i*segmentSize, Math.min(sorted.length,(i+1)*segmentSize));
    const take=Math.max(1,Math.ceil((cap-out.length)/(segments-i)));
    out.push(...seg.slice(0,take));
  }
  return out.slice(0,cap);
}

test('capped ordered-prefix and corpus-dispersed presentation are observably different policies', () => {
  const hits=[];
  for(let i=0;i<40;i++) hits.push({skip:2 + (i%4), start:i*1000, dir:i%2?1:-1});
  const prefix=orderedPrefix(hits,8).map(x=>x.start);
  const dispersed=corpusDispersed(hits,8).map(x=>x.start);
  assert.notDeepEqual(prefix, dispersed);
  assert.ok(Math.max(...dispersed) > Math.max(...prefix), 'dispersed selection reaches later corpus regions');
});

test('cutover acceptance: truth parity is ready and both capped selection policies are explicit but different', () => {
  assert.match(core, /ordered_prefix_v1/);
  assert.match(core, /representative',false/);
  assert.match(core, /shorter_skip_then_earlier_corpus_position/);
  assert.match(core, /exhaustive_contracts/);
  assert.match(template, /scopeRange\/fwdDisperseTopUp|scopeRange\+fwdDisperseTopUp/);
});

console.log('ELS regular-search parity gate: OCCURRENCE_TRUTH_READY / SELECTION_PARITY_OPEN');
