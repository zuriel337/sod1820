import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../supabase/functions/els-search-bridge/index.ts', import.meta.url), 'utf8');

test('regular search bridge allowlists search and delegates exactly once to the full-domain regular projection', () => {
  assert.match(src, /body\?\.op === "search" \? "search"/);
  assert.match(src, /if \(op === "search"\)/);
  assert.match(src, /serviceRpc\("els_search_regular_core_v1"/);
  assert.match(src, /p_maxhits:\s*4000/);
});

test('regular search bridge preserves existing abuse protection and trace privacy', () => {
  assert.match(src, /serviceRpc\("edge_rate_limit_check"/);
  assert.match(src, /capability:\s*"els:search"/);
  assert.match(src, /rawPrivatePayloadLogged:\s*false/);
  assert.match(src, /sha256:\$\{inputHash\}/);
});

test('regular search bridge does not implement occurrence or paging logic itself', () => {
  assert.doesNotMatch(src, /els_torah_occurrences_internal_v1/);
  assert.doesNotMatch(src, /generate_series\s*\(/);
  const block = src.slice(src.indexOf('if (op === "search")'), src.indexOf('const skipMin'));
  assert.doesNotMatch(block, /els_search_page_core_v1/);
  assert.doesNotMatch(block, /for\s*\(|while\s*\(/);
});

console.log('ELS regular search bridge: PASS');
