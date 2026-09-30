import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const fix=readFileSync('supabase/migrations/20260930154500_g3_telemetry_retention_120d_v2_monotonic_history_fix.sql','utf8');

test('preserved site_visits daily snapshot can never decrease',()=>{
  assert.match(fix,/having count\(\*\) filter\(where not sv\.is_bot\)>0/i);
  assert.match(fix,/views=greatest\(public\.traffic_history\.views,excluded\.views\)/i);
  assert.match(fix,/visitors=greatest\(coalesce\(public\.traffic_history\.visitors,0\),coalesce\(excluded\.visitors,0\)\)/i);
});

test('retention snapshots exactly the cutoff local day before partial deletion',()=>{
  assert.match(fix,/v_cutoff at time zone 'Asia\/Jerusalem'/i);
  assert.doesNotMatch(fix,/v_cutoff-interval '2 days'/i);
  assert.doesNotMatch(fix,/v_cutoff\+interval '1 day'/i);
});

test('corrective remains scoped',()=>{
  assert.doesNotMatch(fix,/create\s+table/i);
  const deletes=[...fix.matchAll(/delete\s+from\s+public\.([a-zA-Z0-9_]+)/gi)].map(m=>m[1]);
  assert.deepEqual([...new Set(deletes)].sort(),['site_visits','visitor_events']);
});
