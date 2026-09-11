import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sql = readFileSync('supabase/migrations/20260911_register_english_method_identities_v1.sql', 'utf8');

const expected = [
  ['en_ordinal', 'English Ordinal', 901],
  ['en_full_reduction', 'Full Reduction', 902],
  ['en_reverse_ordinal', 'Reverse Ordinal', 903],
  ['en_reverse_reduction', 'Reverse Reduction', 904],
];

test('registers exactly the four source-attested English method identities with required sort_order', () => {
  for (const [key, label, order] of expected) {
    assert.match(sql, new RegExp(`${order}, '${key}', '${label}'`));
  }
  assert.doesNotMatch(sql, /latin_agrippa|'Agrippa \/ Latin'/i);
});

test('identity registration remains fail-closed', () => {
  assert.equal((sql.match(/registered_unimplemented/g) || []).length, 4);
  assert.equal((sql.match(/capability_evidence_not_engine_verified/g) || []).length, 4);
  assert.equal((sql.match(/'unimplemented'/g) || []).length, 4);
  assert.match(sql, /in_engine, function, active, deterministic/);
  assert.match(sql, /false, null, false, true/);
});

test('Postgres array literals are valid and not JSON-style array syntax', () => {
  assert.doesNotMatch(sql, /'\[\]'::text\[\]/);
  assert.equal((sql.match(/'\{\}'::text\[\]/g) || []).length, 4);
});

test('migration is additive and will not overwrite a future canonical row', () => {
  assert.match(sql, /on conflict \(method_key\) do nothing/i);
  assert.doesNotMatch(sql, /update\s+public\.gematria_methods/i);
  assert.doesNotMatch(sql, /delete\s+from\s+public\.gematria_methods/i);
});
