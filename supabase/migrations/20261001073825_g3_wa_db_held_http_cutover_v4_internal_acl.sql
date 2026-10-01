-- G3_WA_DB_HELD_HTTP_CUTOVER_V4 (internal ACL) — remaining DB-held Green HTTP residuals.
-- V5 SUPERSEDES the V4 pg_net queue-ACL migration (impossible: net.* tables are supabase_admin-owned) and the
-- V4 async request_wa_link_code (put the Green token into the pg_net queue). Only the internal ACL hardening stays.
-- BRANCH-ONLY CANDIDATE: not applied to live DB. EXTEND_EXISTING: no new table/queue/bot/transport.
--
-- (2) Internal RPCs: wa_vip_backfill_sql(text,int) and fn_michael_execute(uuid) were callable by PUBLIC
--     (acl NULL). Now service_role only (wa-michael / wa-vip-backfill Edge use the service role).
-- (3) request_wa_link_code: moved to V5 (bot_outbox enqueue; no provider/pg_net path).
--
-- COMPATIBILITY MATRIX (TEMPORARY_COMPATIBILITY; owner = WhatsApp channel owner;
-- removal condition = each caller migrated to an Edge path; full V5 matrix lives in the V5 migration):
--   wa_admin_reply(send)           admin-manual, acceptable (blocking provider call, human-triggered)
--   wa_groups / wa_state           manual service/postgres only
--   wa_distribute                  manual service/postgres only
--   fn_wa_backfill_from_green      manual service/postgres only (cron 33 replaced by Edge msg_ext in V2)
--   weekly detect_suggestions      non-Green HTTP: background debt, outside this Green transport scope

revoke all on function public.wa_vip_backfill_sql(text, integer) from public, anon, authenticated;
grant execute on function public.wa_vip_backfill_sql(text, integer) to service_role;
revoke all on function public.fn_michael_execute(uuid) from public, anon, authenticated;
grant execute on function public.fn_michael_execute(uuid) to service_role;
