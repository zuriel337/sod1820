import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sql = readFileSync('supabase/migrations/20260911_register_english_method_identities_v1.sql', 'utf8');

const expected = [
  ['en_ordinal', 'English Ordinal'],
  ['en_full_reduction', 'Full Reduction'],
  ['en_reverse_ordinal', 'Reverse Ordinal'],
  ['en_reverse_reduction', 'Reverse Reduction'],
];

test('registers exactly the four source-attested live English method identities in scope', () => {
  for (const [key, label] of expected) {
    assert.match(sql, new RegExp(`'${key}'`));
    assert.match(sql, new RegExp(`'${label}'`));
  }
  assert.doesNotMatch(sql, /latin_agrippa|'Agrippa \/ Latin'/i);
});

test('every registration is fail-closed and does not claim canonical execution', () => {
  const rows = sql.split(/\n\),\n\(/).slice(0, 4);
  assert.equal(rows.length, 4);
  for (const row of rows) {
    assert.match(row, /false,\s*\n  null,\s*\n  false,\s*\n  true,/m); // in_engine=false, function=null, active=false, deterministic=true
    assert.match(row, /false,\s*\n  'unimplemented'/m); // scannable=false, execution_kind=unimplemented
    assert.match(row, /capability_evidence_not_engine_verified/);
    assert.match(row, /registered_unimplemented/);
  }
});

test('migration is additive and will not overwrite a future canonical row', () => {
  assert.match(sql, /on conflict \(method_key\) do nothing/i);
  assert.doesNotMatch(sql, /update\s+public\.gematria_methods/i);
  assert.doesNotMatch(sql, /delete\s+from\s+public\.gematria_methods/i);
});
