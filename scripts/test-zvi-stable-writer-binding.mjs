import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildWriterIndex, resolveWriterContributorId, isTrustedAuthor } from '../supabase/functions/_shared/waWriterIdentity.js';

const ZVI = 'c66f0464-0928-490e-be9b-66d8a87e7fc8';
const idx = buildWriterIndex([
  { id: ZVI, display_name: 'צבי (OPOC)', wa_names: ['OPOC1 OPOC1', 'צבי (OPOC1)', 'צבי'] },
  { id: 'A', display_name: 'Dup', wa_names: ['shared'] },
  { id: 'B', display_name: 'Dup2', wa_names: ['shared'] },
]);

test('unambiguous human alias / display_name hit resolves to stable id', () => {
  assert.equal(resolveWriterContributorId('OPOC1 OPOC1', idx), ZVI);
  assert.equal(resolveWriterContributorId(' צבי (OPOC) ', idx), ZVI);
});
test('bot/API, ambiguous and unmatched stay null', () => {
  assert.equal(resolveWriterContributorId('OPOC1 OPOC1', idx, { isBotApi: true }), null);
  assert.equal(resolveWriterContributorId('shared', idx), null);
  assert.equal(resolveWriterContributorId('nobody', idx), null);
  assert.equal(resolveWriterContributorId('', idx), null);
});
test('trusted author: stable id wins, legacy credit/vip/outgoing/admin fallback preserved', () => {
  const ctx = { trustedContributorIds: new Set([ZVI]), vips: [{ name_match: 'שמעון' }], policy: {} };
  assert.equal(isTrustedAuthor({ contributorId: ZVI, credit: 'whatever' }, ctx), true);
  assert.equal(isTrustedAuthor({ contributorId: 'X', credit: 'nobody' }, ctx), false);
  assert.equal(isTrustedAuthor({ contributorId: null, credit: 'שמעון חיימוב' }, ctx), true);
  assert.equal(isTrustedAuthor({ contributorId: null, credit: 'ZURIEL' }, { ...ctx, policy: { outgoing_contributor: 'ZURIEL' } }), true);
  assert.equal(isTrustedAuthor({ contributorId: null, credit: 'x' }, { ...ctx, policy: { admin_only: true, admin_ids: ['1'] } }), true);
  assert.equal(isTrustedAuthor({ contributorId: null, credit: '' }, ctx), false);
});
test('edge functions are wired to the shared helper and carry contributor_id', () => {
  const ing = readFileSync('supabase/functions/wa-channel-ingest/index.ts', 'utf8');
  const itk = readFileSync('supabase/functions/wa-channel-research-intake/index.ts', 'utf8');
  assert.match(ing, /resolveWriterContributorId\(rawCredit, writerIndex, \{ isBotApi \}\)/);
  assert.match(ing, /contributor_id: contributorId/);
  assert.match(itk, /isTrustedAuthor\(/);
  assert.match(itk, /credit,contributor_id,channel/);
  assert.equal((itk.match(/contributor_id: row\.contributor_id \|\| null/g) || []).length, 2);
});
test('binding migration scope: additive column, exact backfill, no research_objects write', () => {
  const sql = readFileSync('supabase/migrations/20261004064040_zvi_stable_writer_binding_v1.sql', 'utf8').replace(/--.*$/gm, '');
  assert.match(sql, /add column if not exists contributor_id uuid null references public\.contributors\(id\)/);
  assert.match(sql, /where channel = 'torat-haremez'\s+and credit = 'צבי \(OPOC\)'\s+and contributor_id is null/);
  assert.doesNotMatch(sql, /update\s+public\.research_objects/i);
  assert.match(sql, /revoke all on function public\.fn_zvi_standing_approve_research_object\(\) from anon/);
});
test('fallback retirement migration: stable id only, no credit text, no data writes', () => {
  const sql = readFileSync('supabase/migrations/20261004111500_zvi_stable_writer_fallback_retirement_v1.sql', 'utf8').replace(/--.*$/gm, '');
  assert.match(sql, /cu\.contributor_id = 'c66f0464-0928-490e-be9b-66d8a87e7fc8'::uuid/);
  assert.doesNotMatch(sql, /cu\.credit/);
  assert.doesNotMatch(sql, /contributor_id is null/i);
  assert.doesNotMatch(sql, /\b(update|insert|delete)\s+(into\s+|from\s+)?public\./i);
  assert.match(sql, /rc\.author_contributor_id = 'c66f0464-0928-490e-be9b-66d8a87e7fc8'::uuid/);
  assert.match(sql, /'canonicalized', false/);
  assert.match(sql, /'published', false/);
  assert.match(sql, /revoke all on function public\.fn_zvi_standing_approve_research_object\(\) from anon/);
});
