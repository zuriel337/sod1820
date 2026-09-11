import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { englishAll } from '../src/lib/englishGematria.js';

const migration = readFileSync('supabase/migrations/20260911_english_golden_engine_v1.sql', 'utf8');

function value(word, key) {
  return englishAll(word).find(m => m.key === key)?.value;
}

test('Golden English capability fixtures match the canonical SQL reconstruction', () => {
  assert.equal(value('Secret', 'ordinal'), 70);
  assert.equal(value('throne', 'ordinal'), 80);
  assert.equal(value('glory', 'reduction'), 32);
  assert.equal(value('priest', 'reverse'), 75);
  assert.equal(value('slave', 'reverse'), 76);
});

test('Reverse Reduction conflict is preserved rather than target-fit', () => {
  assert.equal(value('good', 'reverse_reduction'), 13);
  assert.equal(value('promise', 'reverse_reduction'), 40);
  assert.match(migration, /reconstructed_conflict_open/);
  assert.match(migration, /good=17\/promise=29/);
  assert.match(migration, /dependency_verified_at = null/);
});

test('canonical English execution extends the one registry and stays fail-closed', () => {
  for (const fn of ['fn_en_ordinal', 'fn_en_full_reduction', 'fn_en_reverse_ordinal', 'fn_en_reverse_reduction']) {
    assert.match(migration, new RegExp(`create or replace function public\\.${fn}\\(`, 'i'));
  }
  assert.match(migration, /execution_kind = 'sql_function'/);
  assert.match(migration, /active = false/);
  assert.match(migration, /scannable = false/);
  assert.match(migration, /fn_method_is_executable\('en_ordinal'\)/);
  assert.match(migration, /fn_method_is_engine_verified\('en_reverse_reduction'\)/);
  assert.match(migration, /fn_method_value\('en_ordinal','Secret'\) is not null/);
});
