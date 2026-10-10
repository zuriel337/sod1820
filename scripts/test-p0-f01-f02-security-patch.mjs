// Run: node --test scripts/test-p0-f01-f02-security-patch.mjs
// Static scope/contract checks. Does NOT execute SQL or substitute for role/API tests.
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const f01=readFileSync(new URL('../supabase/migrations/20261008161500_p0_f01_work_log_history_admin_guard.sql', import.meta.url),'utf8');
const f02=readFileSync(new URL('../supabase/migrations/20261008161600_p0_f02_remove_exact_temporary_storage_write_policies.sql', import.meta.url),'utf8');

test('F01 keeps historical response shape/order/limit and admin JWT body gate',()=>{
  assert.match(f01,/returns setof public\.work_log/i);
  assert.match(f01,/select \* from public\.work_log\s+order by created_at desc\s+limit 1000/is);
  assert.match(f01,/where id = auth\.uid\(\) and role = 'admin'/);
  assert.match(f01,/raise exception 'not authorized'/);
  assert.match(f01,/revoke execute on function public\.get_work_log\(\) from public, anon/i);
  assert.match(f01,/grant execute on function public\.get_work_log\(\) to authenticated/i);
  assert.doesNotMatch(f01,/auth\.role\(\)|current_user\s*=|session_user\s*=|p_actor\b/i);
  assert.doesNotMatch(f01,/create\s+policy|alter\s+table|insert\s+into\s+public\.work_log/i);
});
test('F01 fails closed on schema/policy or sibling drift',()=>{
  assert.match(f01,/F01 preflight drift:/);
  assert.match(f01,/work_log_admin_all/);
  assert.match(f01,/get_work_log_current\(\)/);
  assert.doesNotMatch(f01,/grant execute.*\bto (?:public|anon)\b/i);
});
test('F02 exact 14 reviewed policies, not prefix-driven drop',()=>{
  const expected=['tmp_ctxt_i','tmp_ctxt_u','tmp_eg_c_i','tmp_eg_c_u','tmp_eg_en_i','tmp_eg_en_u','tmp_eg_he_i','tmp_eg_he_u','tmp_eg_p_i','tmp_eg_p_u','tmp_eg_v_i','tmp_eg_v_u','tmp_metro_ins','tmp_metro_upd'];
  const dropped=[...f02.matchAll(/^drop policy if exists "([^"]+)" on storage\.objects;$/gm)].map(m=>m[1]);
  assert.deepEqual(dropped,expected);
  assert.equal(new Set(dropped).size,14);
  for (const name of expected) assert.match(f02,new RegExp('\\('+ "'"+name+"'"+','));
  assert.match(f02,/v_actual is distinct from v_expected/);
  assert.match(f02,/v_expected_count <> 14 or v_actual_count <> 14/);
  assert.match(f02,/policyname,cmd,roles,qual,with_check/);
  assert.doesNotMatch(f02,/execute\s+format|for\s+.+in\s+select/i);
});
test('F02 includes both singleton names and broader former prefix-family guards',()=>{
  assert.match(f02,/name ~~ ''sod1820\/updates\/metro-gush-dan%''::text/);
  assert.match(f02,/name = ''posts\/tmp-content-5074\.txt''::text/);
  assert.match(f02,/community_anon_upload/);
  assert.match(f02,/public_read/);
  assert.match(f02,/public_upload/);
  assert.doesNotMatch(f02,/delete\s+from\s+storage\.objects|update\s+storage\.objects|alter\s+bucket|file_size_limit|allowed_mime_types/i);
});
test('F01 and F02 are separate forward-only migration candidates',()=>{
  assert.match(f01,/NOT APPLIED/);
  assert.match(f02,/NOT APPLIED/);
  assert.doesNotMatch(f01+f02,/create\s+table|drop\s+table|grant execute[^;]*\bto\s+(?:public|anon)\b|create policy/i);
});
