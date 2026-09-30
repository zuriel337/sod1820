import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const enforcement = readFileSync('supabase/migrations/20260930133000_g3_retention_enforcement_preview_and_worklog_v1.sql','utf8');
const guard = readFileSync('supabase/migrations/20260930134500_g3_worklog_archive_runtime_guard_v1.sql','utf8');

test('B3 enforcement is owner-native and non-destructive', () => {
  assert.match(enforcement,/create or replace function public\.fn_work_log_archive_maintenance\(\)/i);
  assert.match(enforcement,/g3-work-log-archive-daily/i);
  assert.match(enforcement,/set archived = true/i);
  assert.doesNotMatch(enforcement,/delete\s+from\s+public\.work_log|truncate\s+(table\s+)?public\.work_log/i);
});

test('B3 runtime guard detects missing, inactive, stale and failed execution', () => {
  assert.match(guard,/retention_heartbeat:work_log_archive/i);
  assert.match(guard,/fn_retention_enforcement_guard_v1\(\)/i);
  assert.match(guard,/jobname='g3-work-log-archive-daily'/i);
  assert.match(guard,/not coalesce\(v_active,false\)/i);
  assert.match(guard,/interval '30 hours'/i);
  assert.match(guard,/v_last_status[\s\S]*failed/i);
  assert.match(guard,/perform public\.fn_retention_enforcement_guard_v1\(\)/i);
  assert.match(guard,/🚨 ניטור Work Log Retention/i);
  assert.match(guard,/perform public\.notify_admin/i);
});

test('B3 guard remains non-destructive and uses existing health/cache tree', () => {
  const code=guard.replace(/^--.*$/gm,'');
  assert.doesNotMatch(code,/delete\s+from\s+public\.(work_log|events|visitor_events|site_visits)/i);
  assert.doesNotMatch(code,/drop\s+table|truncate\s+table/i);
  assert.doesNotMatch(code,/create\s+table/i);
  assert.match(guard,/public\.analytics_cache/i);
  assert.match(guard,/create or replace function public\.fn_reliability_watch\(\)/i);
});
