import fs from 'node:fs';
import assert from 'node:assert/strict';

const sql = fs.readFileSync(new URL('../supabase/migrations/20260901010000_corpus_intake_truth_axis_separation_v1.sql', import.meta.url), 'utf8');

assert.match(sql, /CREATE OR REPLACE FUNCTION public\.fn_verify_gematria_word_engine\(p_word_id uuid\)/);
assert.match(sql, /FROM public\.gematria_integrity gi WHERE gi\.id = p_word_id/);
assert.match(sql, /v_engine_verified := public\.fn_verify_gematria_word_engine\(v_word_id\)/);
assert.match(sql, /visibility_reason = 'approved_by_admin'/);
assert.doesNotMatch(sql, /SET\s+is_verified\s*=\s*true\s*,\s*is_published\s*=\s*true/i);

const resolveStart = sql.indexOf('CREATE OR REPLACE FUNCTION public.resolve_word_review');
const resolveSql = sql.slice(resolveStart);
assert.doesNotMatch(resolveSql, /is_published\s*=/i);
assert.doesNotMatch(resolveSql, /is_verified\s*=\s*(true|false)/i);
assert.match(resolveSql, /status='approved'/);
assert.match(resolveSql, /visibility_reason = 'approved_by_admin'/);

console.log('corpus-intake-truth-axis-separation: 9 checks passed');
