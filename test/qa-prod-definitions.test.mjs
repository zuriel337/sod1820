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

test('scope: tables and functions of the extracted families only (messages, notifications, counters, the ELS verification path and comments, reactions and follow; the graph projection approve_contribution / project_contribution_to_graph is deliberately outside), triggers whose function is outside the scope are excluded by the generator', () => {
  const fns = objects.filter((o) => o.kind === 'function').map((o) => /^public\.(\w+)\(/.exec(o.name)[1]).sort();
  assert.deepEqual(fns, ['_community_message_owned_by_caller_v1', 'add_contribution', 'ai_quota_check', 'canonical_follow_subject', 'canonical_follow_topic', 'claim_follow_prefs_from_identity', 'community_delete_message', 'community_edit_message', 'community_has_live_descendant', 'community_message_context', 'community_net_blocked_v1', 'community_net_ref_v1', 'community_reply_counts', 'community_trusted_client_ip_v1', 'community_write_scope_v1', 'contribution_weight', 'dm_inbox', 'dm_send', 'dm_thread', 'edge_rate_limit_check', 'edit_contribution', 'els_publish_truth_gate_v1', 'els_slugify', 'els_stream_letters_v1', 'els_stream_relation_v1', 'els_verify_batch_core_v1', 'els_verify_batch_v1', 'els_verify_occurrence_v1', 'fn_capability_execution_gate_v1', 'fn_els_corpus_id', 'fn_els_term_norm', 'fn_user_entitlement', 'follow_subject_state', 'follow_topic_aliases', 'forum_feed_contributions', 'moderate_contribution', 'notify_on_dm', 'op_trace_begin_v1', 'op_trace_finish_v1', 'op_trace_record_span_v1', 'push_subscription_delete_v1', 'push_subscription_upsert_v1', 'rc_unique_contributor_for_user_v1', 'rd_is_admin', 'remove_contribution', 'toggle_contribution_reaction', 'view_count', 'watch_toggle']);
  const tables = objects.filter((o) => o.kind === 'table').map((o) => o.name).sort();
  assert.deepEqual(tables, ['private.edge_rate_limit_buckets', 'public.ai_usage', 'public.anon_contrib_log', 'public.beit_midrash', 'public.community_net_blocks', 'public.community_net_key', 'public.contribution_events', 'public.contributors', 'public.direct_messages', 'public.els_records', 'public.identity_edges', 'public.notification_prefs', 'public.op_trace_roots', 'public.op_trace_spans', 'public.page_views', 'public.persons', 'public.profiles', 'public.push_subscriptions', 'public.research_contribution_deletions', 'public.research_contribution_edits', 'public.research_contributions', 'public.site_flags', 'public.subscribe_events', 'public.tanakh_stream', 'public.torah_stream', 'public.user_activity', 'public.user_notifications', 'public.users']);
});

test('the parity query uses the same extraction text, and the generator output is reproducible', () => {
  const extraction = read('qa/extract/extract-definitions.sql'), cheap = read('qa/extract/parity-fingerprints.sql');
  const body = (text) => text.split('\n').filter((line) => !line.startsWith('--')).join('\n').replace(/select kind, nm as name, md5\(ddl\) as md5(, ddl)? from rows order by[\s\S]*$/, '').trim();
  assert.equal(body(cheap), body(extraction));
  const lines = read('qa/extract/extract-definitions.sql').split('\n').filter((line) => /^select kind, nm as name, md5\(ddl\) as md5, ddl from rows/.test(line));
  assert.equal(lines.length, 1);
});
