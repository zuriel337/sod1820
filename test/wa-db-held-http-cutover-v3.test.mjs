import assert from "node:assert/strict";
import fs from "node:fs";

const m = fs.readFileSync("supabase/migrations/20261001050000_g3_wa_db_held_http_cutover_v3.sql", "utf8");
const code = m.replace(/^--.*$/gm, "");

// Extract each replace(v_new, $r$from$r$, $r$to$r$) pair, in order
const rep = [...code.matchAll(/replace\(v_new,\s*\$r\$([\s\S]*?)\$r\$,\s*\$r\$([\s\S]*?)\$r\$\)/g)].map((x) => [x[1], x[2]]);
assert.equal(rep.length, 5);

// Fixture = the exact send tail of live job 55 (jobid 55, 2026-10-01)
let cmd = `DECLARE
  v_send jsonb;
  v_accepted boolean := false;
BEGIN
  IF v_target IS NOT NULL THEN
    v_send:=public.wa_send(v_target,v_body);
    v_accepted:=coalesce((v_send->>'http_status')::integer between 200 and 299,false);
    IF v_accepted THEN update public.user_notifications set channels_sent=array['in_app','whatsapp'] where id=v_notice; END IF;
  END IF;
  update public.analytics_cache set payload=payload||jsonb_build_object('notification_id',v_notice,'delivery',jsonb_build_object('in_app_created',true,'whatsapp_target_configured',v_target is not null,'provider_accepted',v_accepted,'http_status',v_send->'http_status','delivery_receipt_confirmed',false)) where cache_key=v_key;
END;`;
for (const [from, to] of rep) {
  assert.ok(cmd.includes(from), `fixture lacks: ${from}`);
  cmd = cmd.replace(from, () => to);
}

// job 55 command: no DB-held provider calls
assert.doesNotMatch(cmd, /wa_send|wa_admin|fn_wa_backfill_from_green|extensions\.http/);
// async enqueue via existing seam
assert.match(cmd, /public\.wa_green_config\(\)/);
assert.match(cmd, /net\.http_post\(/);
// honest receipt: enqueue never claimed as acceptance / http status / delivery
assert.match(cmd, /'provider_accepted',false,'http_status',null/);
assert.match(cmd, /'delivery_receipt_confirmed',false/);
assert.match(cmd, /'whatsapp_enqueued',v_enqueued,'net_request_id',v_req/);
assert.doesNotMatch(cmd, /channels_sent=array\['in_app','whatsapp'\]/);
// target selection / in-app / dedupe untouched by migration
assert.doesNotMatch(code, /dedupe_key|admin_notify|user_notifications\(/);
// guard + idempotency + no secrets
assert.match(code, /if v_cmd !~ 'wa_send' then return; end if;/);
assert.match(code, /job 55 still references a DB-held Green HTTP path/);
assert.doesNotMatch(m, /Bearer\s+[A-Za-z0-9]{20,}/);

// Cumulative census: V1+V2+V3 leave no active cron command referencing the three DB-held paths
const v2 = fs.readFileSync("supabase/migrations/20261001040000_g3_wa_db_held_http_cutover_v2.sql", "utf8").replace(/^--.*$/gm, "");
const v2cron = v2.slice(v2.indexOf("select cron.alter_job"));
assert.doesNotMatch(v2cron, /wa_admin|wa_send|fn_wa_backfill_from_green/);
console.log("PASS wa db-held http cutover v3 contract (expected active DB-held Green HTTP cron census = 0)");
