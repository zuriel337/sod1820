import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/components/TzofenEmbed.jsx', import.meta.url), 'utf8');

test('Tzofen host bridge allowlists only canonical ELS page and verify operations', () => {
  assert.match(src, /d\.type === "engine-request"/);
  assert.match(src, /d\.op === "page" \|\| d\.op === "verify"/);
  assert.match(src, /supabase\.functions\.invoke\("els-search-bridge"/);
  assert.match(src, /type: "engine-result"/);
  assert.match(src, /requestId/);
});

test('Tzofen host bridge preserves browser trust boundary', () => {
  assert.match(src, /if \(e\.origin !== window\.location\.origin\) return/);
  assert.doesNotMatch(src, /SUPABASE_SERVICE_ROLE_KEY|service_role/i);
  assert.doesNotMatch(src, /els_search_page_core_v1|els_verify_occurrence_v1/);
});

test('host bridge does not replace local ELS execution in this slice', () => {
  assert.match(src, /src=\{src\}/);
  assert.doesNotMatch(src, /findAll\s*=|function\s+findAll/);
});

console.log('els-host-bridge contract: PASS');
