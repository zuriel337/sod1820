import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql=readFileSync('supabase/migrations/20260930154500_g3_telemetry_retention_120d_v2_snapshot_fix.sql','utf8');

test('cutoff snapshot is exact-day and retry-safe',()=>{
  assert.match(sql,/v_cutoff at time zone 'Asia\/Jerusalem'/i);
  assert.doesNotMatch(sql,/v_cutoff-interval '2 days'/i);
  assert.match(sql,/where excluded\.views>=public\.traffic_history\.views/i);
});

test('bot-only days do not shadow GA with zero',()=>{
  assert.match(sql,/having count\(\*\) filter\(where not sv\.is_bot\)>0/i);
});

test('corrective migration changes only existing retention functions',()=>{
  assert.doesNotMatch(sql,/create\s+table/i);
  assert.doesNotMatch(sql,/delete\s+from\s+public\.(wa_|channel_updates|research_objects)/i);
});
