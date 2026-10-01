import assert from "node:assert/strict";
import fs from "node:fs";

const strip = (f) => fs.readFileSync(f, "utf8").replace(/^--.*$/gm, "");
const acl = strip("supabase/migrations/20261001060000_g3_wa_db_held_http_cutover_v4_net_acl.sql");
const lc = strip("supabase/migrations/20261001061000_g3_wa_db_held_http_cutover_v4_link_code.sql");
const lcRaw = fs.readFileSync("supabase/migrations/20261001061000_g3_wa_db_held_http_cutover_v4_link_code.sql", "utf8");

// (1) pg_net ACL: revoke from PUBLIC/anon/authenticated, verify, never touch net.http_* EXECUTE
assert.match(acl, /net\.http_request_queue/);
assert.match(acl, /net\._http_response/);
assert.match(acl, /revoke all on table %s from public, anon, authenticated/);
assert.match(acl, /grant select on table %s to service_role/);
assert.match(acl, /raise exception 'pg_net ACL still open/);
assert.doesNotMatch(acl, /function\s+net\.|execute on function net/i);

// (2) internal RPCs service_role only
for (const sig of ["wa_vip_backfill_sql\\(text, integer\\)", "fn_michael_execute\\(uuid\\)"]) {
  assert.match(lc, new RegExp(`revoke all on function public\\.${sig} from public, anon, authenticated`));
  assert.match(lc, new RegExp(`grant execute on function public\\.${sig} to service_role`));
}

// (3) request_wa_link_code: async enqueue, honest, no DB-held provider HTTP
const body = lc.slice(lc.indexOf("create or replace function public.request_wa_link_code"), lc.indexOf("end $function$;"));
assert.doesNotMatch(body, /wa_send|wa_admin|extensions\.http/);
assert.match(body, /public\.wa_green_config\(\)/);
assert.match(body, /net\.http_post\(/);
assert.match(body, /'queued',true,'sent',false,'delivery_receipt_confirmed',false/);
assert.doesNotMatch(body, /'sent',true/);
for (const keep of ["auth_required", "bad_phone", "phone_taken", "already_linked", "rate_limited", "interval '10 minutes'", "insert into public.wa_link_codes"]) {
  assert.ok(body.includes(keep), `preserved: ${keep}`);
}
assert.match(body, /enqueue_failed/);
assert.doesNotMatch(lcRaw, /Bearer\s+[A-Za-z0-9]{20,}/);

// (4) compatibility matrix documented
for (const k of ["wa_admin_reply(send)", "wa_groups", "wa_state", "wa_distribute", "fn_wa_backfill_from_green", "detect_suggestions", "removal condition"]) {
  assert.ok(lcRaw.includes(k), `matrix: ${k}`);
}

// UI: no provider-confirmed wording before receipt
const ui = fs.readFileSync("src/components/userCenter/UserCenter.jsx", "utf8");
assert.doesNotMatch(ui, /שלחנו קוד/);
assert.match(ui, /נשלח לתור השליחה/);
console.log("PASS wa db-held http cutover v4 contract");
