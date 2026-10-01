import assert from "node:assert/strict";
import fs from "node:fs";

const dir = "supabase/migrations/";
assert.ok(!fs.existsSync(dir + "20261001060000_g3_wa_db_held_http_cutover_v4_net_acl.sql"), "impossible net ACL migration removed");
assert.ok(!fs.existsSync(dir + "20261001050000_g3_wa_db_held_http_cutover_v3.sql"), "pg_net job55 migration removed");
const raw = fs.readFileSync(dir + "20261001073825_g3_wa_db_held_http_cutover_v4_internal_acl.sql", "utf8");
const lc = raw.replace(/^--.*$/gm, "");
for (const sig of ["wa_vip_backfill_sql\\(text, integer\\)", "fn_michael_execute\\(uuid\\)"]) {
  assert.match(lc, new RegExp(`revoke all on function public\\.${sig} from public, anon, authenticated`));
  assert.match(lc, new RegExp(`grant execute on function public\\.${sig} to service_role`));
}
assert.doesNotMatch(lc, /net\.|request_wa_link_code|green/i);
for (const k of ["wa_admin_reply(send)", "wa_groups", "wa_state", "wa_distribute", "fn_wa_backfill_from_green", "detect_suggestions", "removal condition"]) {
  assert.ok(raw.includes(k), `matrix: ${k}`);
}
const ui = fs.readFileSync("src/components/userCenter/UserCenter.jsx", "utf8");
assert.doesNotMatch(ui, /שלחנו קוד/);
assert.match(ui, /נשלח לתור השליחה/);
assert.match(ui, /r\.sent/);
console.log("PASS wa db-held http cutover v4 (internal ACL) contract");
