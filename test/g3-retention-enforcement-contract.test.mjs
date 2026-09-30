import fs from 'node:fs';
import assert from 'node:assert/strict';

const p = 'supabase/migrations/20260930133000_g3_retention_enforcement_preview_and_worklog_v1.sql';
const sql = fs.readFileSync(p, 'utf8');

assert.match(sql, /create or replace function public\.admin_retention_preview\(\)/i);
assert.match(sql, /'visitor_events'[\s\S]*'HUMAN_REVIEW'/i);
assert.match(sql, /'site_visits'[\s\S]*'HUMAN_REVIEW'/i);
assert.match(sql, /KEEP_LONG_TERM/i);
assert.match(sql, /'delete_authorized',\s*false/i);
assert.match(sql, /0::bigint as purge_candidates/i);

assert.match(sql, /create or replace function public\.fn_work_log_archive_maintenance\(\)/i);
assert.match(sql, /created_at < now\(\) - interval '14 days'/i);
assert.match(sql, /set archived = true/i);
assert.doesNotMatch(sql, /delete\s+from\s+public\.work_log/i);
assert.doesNotMatch(sql, /truncate\s+(table\s+)?public\.work_log/i);
assert.match(sql, /dispatch_state[\s\S]*QUEUED[\s\S]*FIRE_REQUESTED[\s\S]*SESSION_STARTED[\s\S]*CLAIMED[\s\S]*RETRY_WAIT[\s\S]*DEFERRED/i);
assert.match(sql, /child\.parent_assignment_id = w\.id/i);
assert.match(sql, /admin_worklog_archive_done\(\)[\s\S]*fn_work_log_archive_maintenance\(\)/i);
assert.match(sql, /g3-work-log-archive-daily/i);
assert.match(sql, /revoke all on function public\.fn_work_log_archive_maintenance\(\) from public, anon, authenticated/i);
assert.match(sql, /grant execute on function public\.fn_work_log_archive_maintenance\(\) to service_role/i);

const destructiveTelemetry = /delete\s+from\s+public\.(visitor_events|site_visits|events)|drop\s+table\s+(if\s+exists\s+)?public\.events_/i;
assert.doesNotMatch(sql, destructiveTelemetry, 'B1/B2 preview phase must stay non-destructive before Human Gate');


for (const token of ['NOT_', 'PENDING', 'BLOCKER', 'OPEN', 'IN_PROGRESS', 'BRANCH_ONLY']) {
  assert.match(sql, new RegExp(token, 'i'), `archive predicate must fail closed on unresolved status token: ${token}`);
}
assert.match(sql, /revoke all on function public\.admin_worklog_archive_done\(\) from public, anon/i);
assert.match(sql, /grant execute on function public\.admin_worklog_archive_done\(\) to authenticated, service_role/i);


for (const token of ['PAUSED', 'STOPPED_AT_GATE', 'DECISION_READY', 'HUMAN_GATE']) {
  assert.match(sql, new RegExp(token, 'i'), `archive predicate must preserve unresolved gate token: ${token}`);
}
assert.match(sql, /NOT\[ _-\]\*\(MERGED\|DEPLOYED\|LIVE\|CANONICAL/i);
assert.match(sql, /HUMAN_GATE_REJECTED\|REJECTED_BY_HUMAN_GATE/i);


assert.doesNotMatch(sql, /RESOLVED\|FIXED\|LIVE_VERIFIED/i, 'FIXED must not be a standalone terminal token');
assert.doesNotMatch(sql, /ARCHIVED\|PASS\)/i, 'PASS must not be a standalone terminal token');
assert.match(sql, /BRANCH\[ _-\]\*ONLY/i);
assert.match(sql, /IN\[ _-\]\*PROGRESS/i);
assert.match(sql, /UNRESOLVED\|ACK_/i);

console.log('g3-retention-enforcement-contract: PASS');
