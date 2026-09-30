import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql=readFileSync('supabase/migrations/20260930150000_g3_telemetry_retention_120d_v1.sql','utf8');
const admin=readFileSync('src/pages/AdminPage.jsx','utf8');

test('120-day policy is explicit, scoped and low-load',()=>{
  assert.match(sql,/BOUNDED_RUNTIME_120D/);
  assert.match(sql,/interval '120 days'/);
  assert.match(sql,/limit 10000/);
  assert.match(sql,/g3-telemetry-retention-120d-daily/);
  assert.match(sql,/at most one monthly events partition|limit 1/i);
  assert.match(sql,/visitor_events_created_at_brin/i);
});

test('long-term Traffic Intelligence history survives raw retirement',()=>{
  assert.match(sql,/create or replace function public\.traffic_history_combined/i);
  assert.match(sql,/from public\.traffic_daily/i);
  assert.match(sql,/from public\.traffic_history/i);
  assert.doesNotMatch(
    sql.match(/create or replace function public\.traffic_history_combined[\s\S]*?\$function\$;/i)?.[0]||'',
    /from\s+(public\.)?site_visits/i
  );
  assert.match(sql,/refresh_traffic_daily_range_v1/i);
  assert.match(sql,/traffic_daily coverage missing for partition/i);
});

test('legacy raw-detail readers are capped at 120 days',()=>{
  assert.match(sql,/least\(coalesce\(p_days,90\),120\)/i);
  assert.match(sql,/least\(coalesce\(p_days,30\),120\)/i);
  assert.match(sql,/raw_retention_days',120/);
  assert.doesNotMatch(admin,/\["365",\s*"שנה"\]/);
  assert.doesNotMatch(admin,/\["all",\s*"הכל"\]/);
  assert.match(admin,/\["120",\s*"120 יום · raw"\]/);
});

test('retention guard is runtime-bound and scoped away from source/research data',()=>{
  assert.match(sql,/fn_telemetry_retention_guard_v1/i);
  assert.match(sql,/perform public\.fn_telemetry_retention_guard_v1\(\)/i);
  assert.match(sql,/retention_heartbeat:telemetry_120d/i);
  assert.match(sql,/interval '30 hours'/);
  assert.match(sql,/interval '122 days'/);
  assert.match(sql,/🚨 ניטור Telemetry Retention/i);
  const deletes=[...sql.matchAll(/delete\s+from\s+public\.([a-zA-Z0-9_]+)/gi)].map(m=>m[1]);
  assert.deepEqual([...new Set(deletes)].sort(),['site_visits','visitor_events']);
  assert.doesNotMatch(sql,/delete\s+from\s+public\.(wa_|channel_updates|research_objects)/i);
  assert.doesNotMatch(sql,/drop\s+table\s+public\.(wa_|channel_updates|research_objects)/i);
});
