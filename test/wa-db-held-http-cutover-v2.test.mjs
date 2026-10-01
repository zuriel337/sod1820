import assert from "node:assert/strict";
import fs from "node:fs";

const m = fs.readFileSync("supabase/migrations/20261001040000_g3_wa_db_held_http_cutover_v2.sql", "utf8");
const code = m.replace(/--.*$/gm, "");
const edge = fs.readFileSync("supabase/functions/wa-vip-backfill/index.ts", "utf8");

// notify_admin withdrawn from V2 (pg_net Green URL leaks token); rewritten in V5
assert.doesNotMatch(code, /notify_admin|net\.http_post|wa_green_config/);

// cron: Edge, not DB-held
const cron = code.slice(code.indexOf("select cron.alter_job"));
assert.match(cron, /wa-green-backfill-daily/);
assert.match(cron, /wa-vip-backfill\?mode=msg_ext/);
assert.match(cron, /x-fb-admin-key/);
assert.doesNotMatch(cron, /fn_wa_backfill_from_green|wa_admin|wa_send|extensions\.http\(/);
assert.doesNotMatch(m, /Bearer\s+[A-Za-z0-9]{20,}/);

// dedup + ACL parity
assert.match(code, /on conflict \(phone, msg_id\) do nothing/);
assert.match(code, /in \(select phone from public\.wa_account_links\)/);
for (const f of ["fn_wa_backfill_groups()", "fn_wa_backfill_apply(text, jsonb)"]) {
  assert.ok(code.includes(`revoke all on function public.${f} from public, anon, authenticated`));
  assert.ok(code.includes(`grant execute on function public.${f} to service_role`));
}
// Edge mode uses shared helper + admin-key gate already in place
assert.match(edge, /mode"\) === "msg_ext"/);
assert.match(edge, /fn_wa_backfill_apply/);
assert.ok(edge.indexOf("x-fb-admin-key") < edge.indexOf("msg_ext"));
console.log("PASS wa db-held http cutover v2 contract");
