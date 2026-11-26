// The QA definitions read from production (qa/extract/prod-definitions.sql): definitions only, never data or secrets, scoped, and the
// parity query stays in step with the extraction query (ZURIEL 26.11.2026). Drift against production is detected by
// `node scripts/qa-prod-parity.mjs --query` run as a read (see docs/site-check-2029.md); this file keeps the repository side honest.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseDefinitions, KIND_ORDER, md5 } from '../scripts/qa-prod-definitions-lib.mjs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const objects = parseDefinitions(read('qa/extract/prod-definitions.sql'));

test('only definition kinds, unique names, md5 of the text as the extraction computes it', () => {
  assert.ok(objects.length > 50);
  assert.ok(objects.every((o) => KIND_ORDER.includes(o.kind)), 'no row kind such as data or dependency');
  assert.equal(new Set(objects.map((o) => `${o.kind}|${o.name}`)).size, objects.length);
  assert.equal(objects[0].md5, md5(objects[0].ddl));
});

test('no data and no secret in the definitions', () => {
  const text = read('qa/extract/prod-definitions.sql');
  assert.ok(!/^\s*insert\s+into\s+public\./im.test(text.replace(/\$function\$[\s\S]*?\$function\$/g, '')), 'no top-level insert: definitions only');
  assert.ok(!/eyJ[A-Za-z0-9_-]{20,}|sk_(live|test)_|service_role_key|-----BEGIN|password\s*=|https?:\/\/[a-z0-9-]+\.supabase\.co/i.test(text), 'no key, token, password or production URL');
  assert.ok(!/@gmail\.com|@(?!x\.test)[a-z0-9-]+\.(co\.il|com)\b.*(insert|values)/i.test(text), 'no personal address');
});

test('scope: tables and functions of the extracted families only (messages, notifications, counters and the ELS verification path), triggers whose function is outside the scope are excluded by the generator', () => {
  const fns = objects.filter((o) => o.kind === 'function').map((o) => /^public\.(\w+)\(/.exec(o.name)[1]).sort();
  assert.deepEqual(fns, ['dm_inbox', 'dm_send', 'dm_thread', 'edge_rate_limit_check', 'els_stream_letters_v1', 'els_stream_relation_v1', 'els_verify_batch_core_v1', 'els_verify_batch_v1', 'els_verify_occurrence_v1', 'fn_els_corpus_id', 'notify_on_dm', 'push_subscription_delete_v1', 'push_subscription_upsert_v1', 'view_count']);
  const tables = objects.filter((o) => o.kind === 'table').map((o) => o.name).sort();
  assert.deepEqual(tables, ['private.edge_rate_limit_buckets', 'public.direct_messages', 'public.notification_prefs', 'public.page_views', 'public.push_subscriptions', 'public.tanakh_stream', 'public.torah_stream', 'public.user_activity', 'public.user_notifications', 'public.users']);
});

test('the parity query uses the same extraction text, and the generator output is reproducible', () => {
  const extraction = read('qa/extract/extract-definitions.sql'), cheap = read('qa/extract/parity-fingerprints.sql');
  const body = (text) => text.split('\n').filter((line) => !line.startsWith('--')).join('\n').replace(/select kind, nm as name, md5\(ddl\) as md5(, ddl)? from rows order by[\s\S]*$/, '').trim();
  assert.equal(body(cheap), body(extraction));
  const lines = read('qa/extract/extract-definitions.sql').split('\n').filter((line) => /^select kind, nm as name, md5\(ddl\) as md5, ddl from rows/.test(line));
  assert.equal(lines.length, 1);
});
