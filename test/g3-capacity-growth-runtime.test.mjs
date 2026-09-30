import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql=readFileSync('supabase/migrations/20260930170000_g3_capacity_growth_runtime_v1.sql','utf8');

test('capacity runtime extends existing owners without new store or cron',()=>{
  const code=sql.replace(/^--.*$/gm,'');
  assert.doesNotMatch(code,/create\s+table|cron\.schedule/i);
  assert.match(sql,/public\.analytics_cache/i);
  assert.match(sql,/perform public\.fn_capacity_growth_guard_v1\(\)/i);
  assert.match(sql,/create or replace function public\.fn_reliability_watch\(\)/i);
});

test('capacity thresholds exactly match the Human-Gated policy',()=>{
  assert.match(sql,/1400::bigint\*1024\*1024/i);
  assert.match(sql,/75::bigint\*1024\*1024/i);
  assert.match(sql,/150::bigint\*1024\*1024/i);
  assert.match(sql,/coalesce\(v_pct,0\)>=10/i);
  assert.match(sql,/coalesce\(v_pct,0\)>=5/i);
  assert.match(sql,/CAPACITY_WARNING/i);
  assert.match(sql,/Size alone is not an incident/i);
});

test('relation census is daily-cached and top growers are derived from snapshots',()=>{
  assert.match(sql,/capacity_snapshot:/i);
  assert.match(sql,/computed_at>=date_trunc\('day',now\(\)\)/i);
  assert.match(sql,/pg_total_relation_size/i);
  assert.match(sql,/top_growers_7d/i);
  assert.match(sql,/limit 12/i);
});

test('projection and enforcement are guarded and non-destructive',()=>{
  assert.match(sql,/admin_capacity_growth_v1/i);
  assert.match(sql,/rd_is_admin/i);
  assert.match(sql,/capacity_guard:latest/i);
  assert.doesNotMatch(sql,/delete\s+from|drop\s+table|truncate\s+table/i);
  assert.match(sql,/notify_admin/i);
  assert.match(sql,/suggest_add/i);
});
