import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const edge = readFileSync(new URL('../supabase/functions/els-search-bridge/index.ts', import.meta.url), 'utf8');
const host = readFileSync(new URL('../src/components/TzofenEmbed.jsx', import.meta.url), 'utf8');
const template = readFileSync(new URL('../tools/els/els-code.template.html', import.meta.url), 'utf8');
const built = readFileSync(new URL('../public/tzofen.html', import.meta.url), 'utf8');

test('server bridge exposes one bounded regular-search orchestration request', () => {
  assert.match(edge, /body\?\.op === "search" \? "search"/);
  assert.match(edge, /const cap = Math\.max\(1, Math\.min\([^\n]*4000, 4000\)\)/);
  assert.match(edge, /const maxPages = Math\.ceil\(cap \/ pageSize\)/);
  assert.match(edge, /serviceRpc\("els_search_page_core_v1"/);
  assert.match(edge, /p_skip_max:\s*null/);
  assert.match(edge, /policy: "ordered_prefix_v1"/);
  assert.match(edge, /representative: false/);
  assert.match(edge, /legacy_dispersal_preserved: false/);
});

test('host bridge allowlists regular search without exposing core RPCs', () => {
  assert.match(host, /d\.op === "page" \|\| d\.op === "verify" \|\| d\.op === "search"/);
  assert.match(host, /supabase\.functions\.invoke\("els-search-bridge"/);
  assert.doesNotMatch(host, /els_search_page_core_v1|SUPABASE_SERVICE_ROLE_KEY/);
});

for (const [name, src] of [['template', template], ['built', built]]) {
  test(name + ' routes embedded Torah regular search to canonical bridge', () => {
    assert.match(src, /async function canonicalEmbeddedTorahSearch\(raw,cap=4000\)/);
    assert.match(src, /engineRequest\("search"/);
    assert.match(src, /if\(EMBED&&st\.scope==="torah"\)/);
    assert.match(src, /st\.res=await canonicalEmbeddedTorahSearch\(w,4000\)/);
  });

  test(name + ' fails closed instead of silently falling back to local search', () => {
    const cut = src.slice(src.indexOf('if(EMBED&&st.scope==="torah"){'), src.indexOf('const g2=st.res.hits.findIndex', src.indexOf('if(EMBED&&st.scope==="torah"){')));
    assert.match(cut, /canonicalEmbeddedTorahSearch/);
    assert.match(cut, /toast\("החיפוש הקנוני אינו זמין כרגע/);
    assert.match(cut, /return;/);
    assert.match(cut, /}else\{[\s\S]*findAllAdaptive\(w,4000\):findAll\(w,4000\)/);
  });

  test(name + ' keeps standalone/Tanakh temporary compatibility outside embedded Torah branch', () => {
    assert.match(src, /}else\{[\s\S]{0,200}st\.res=_slow\?await findAllAdaptive\(w,4000\):findAll\(w,4000\)/);
  });
}

console.log('ELS embedded Torah regular-search cutover contract: PASS');
