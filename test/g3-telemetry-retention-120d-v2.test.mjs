import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql=readFileSync('supabase/migrations/20260930153000_g3_telemetry_retention_120d_v2.sql','utf8');
const admin=readFileSync('src/pages/AdminPage.jsx','utf8');

test('V2 preserves legacy first-party daily history without raw retention',()=>{
  assert.match(sql,/refresh_site_visits_history_v1/i);
  assert.match(sql,/site_visits_legacy/i);
  assert.match(sql,/on conflict\(period,granularity,source\) do update/i);
  const hist=sql.match(/create or replace function public\.traffic_history_combined[\s\S]*?\$function\$;/i)?.[0]||'';
  assert.match(hist,/coalesce\(jp\.v,lv\.v,ga\.v,0\)/i);
  assert.match(hist,/case when jp\.v is not null then 0 else coalesce\(lv\.v,ga\.v,0\) end/i);
  assert.doesNotMatch(hist,/from\s+(public\.)?site_visits/i);
});

test('V2 retention is bounded and partition failure does not roll back B2',()=>{
  assert.match(sql,/limit 10000/i);
  assert.match(sql,/order by v_to[\s\S]*limit 1/i);
  assert.match(sql,/exception when others then[\s\S]*v_partition_error:=sqlerrm/i);
  assert.match(sql,/set_config\('lock_timeout','2s',true\)/i);
  assert.match(sql,/set_config\('statement_timeout','45s',true\)/i);
  assert.match(sql,/partition_error/i);
});

test('V2 refresh protects month-edge session semantics',()=>{
  const fn=sql.match(/create or replace function public\.refresh_traffic_daily_range_v1[\s\S]*?\$function\$;/i)?.[0]||'';
  assert.match(fn,/fn_human_entrances\(p_from-1,p_to\+1\)/i);
  assert.match(fn,/where h\.day between p_from and p_to/i);
});

test('V2 guard uses age-existence checks and existing health tree',()=>{
  assert.match(sql,/exists\(select 1 from public\.visitor_events where created_at<now\(\)-interval '122 days' limit 1\)/i);
  assert.match(sql,/exists\(select 1 from public\.site_visits where ts<now\(\)-interval '122 days' limit 1\)/i);
  assert.match(sql,/perform public\.fn_telemetry_retention_guard_v1\(\)/i);
  assert.match(sql,/retention_heartbeat:telemetry_120d/i);
});

test('raw admin detail is capped at 120 days',()=>{
  const ranges=admin.match(/const RANGES = \[[^;]+\];/)?.[0]||'';
  assert.match(ranges,/\["120",\s*"120 יום · raw"\]/);
  assert.doesNotMatch(ranges,/\["365",\s*"שנה"\]|\["all",\s*"הכל"\]/);
  assert.match(sql,/least\(coalesce\(p_days,90\),120\)/i);
  assert.match(sql,/least\(coalesce\(p_days,30\),120\)/i);
});

test('scope remains telemetry only',()=>{
  const deletes=[...sql.matchAll(/delete\s+from\s+public\.([a-zA-Z0-9_]+)/gi)].map(m=>m[1]);
  assert.deepEqual([...new Set(deletes)].sort(),['site_visits','visitor_events']);
  assert.doesNotMatch(sql,/delete\s+from\s+public\.(wa_|channel_updates|research_objects)/i);
});
