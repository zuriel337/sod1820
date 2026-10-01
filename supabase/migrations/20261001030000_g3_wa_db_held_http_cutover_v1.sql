-- G3_WA_DB_HELD_HTTP_CUTOVER_V1 — Implementation Compaction invariant #15.
-- BRANCH-ONLY CANDIDATE: not applied to live DB. EXTEND_EXISTING: no new table/queue/bot.
--
-- 1) wa_green_config(): service_role-ONLY seam over the existing Vault Green secrets, so the existing
--    wa-* Edge functions do the provider fetch themselves (supabase/functions/_shared/waGreen.ts)
--    instead of holding a Postgres connection inside extensions.http() (wa_admin, ~1.45s mean).
-- 2) fn_health_watch(): drop the in-DB wa_admin('getStateInstance') probe. WhatsApp health now derives from
--    owner-native local freshness (channel_ingest_sources.last_run_at, which wa-channel-ingest only advances
--    after its own authorized-state check). Fails closed: no enabled/fresh source => not-authorized alert.
--
-- wa_admin()/wa_send() are intentionally KEPT as TEMPORARY_COMPATIBILITY (see disposition matrix in
-- the work_log AFTER): remaining DB callers are manual/low-frequency, owner=WhatsApp channel owner,
-- removal condition = each caller migrated to an Edge path.

create or replace function public.wa_green_config()
returns jsonb
language sql
security definer
set search_path = public, vault
as $$
  select jsonb_build_object(
    'id',    (select decrypted_secret from vault.decrypted_secrets where name = 'GREEN_API_ID'    limit 1),
    'token', (select decrypted_secret from vault.decrypted_secrets where name = 'GREEN_API_TOKEN' limit 1),
    'base',  (select decrypted_secret from vault.decrypted_secrets where name = 'GREEN_API_URL'   limit 1)
  );
$$;

revoke all on function public.wa_green_config() from public, anon, authenticated;
grant execute on function public.wa_green_config() to service_role;

do $$
declare
  v_def text := pg_get_functiondef('public.fn_health_watch()'::regprocedure);
  v_new text;
  v_probe text := $p$    begin
      v_wa := public.wa_admin('getStateInstance', '{}'::jsonb, 'GET');
      v_wa_state := coalesce(v_wa #>> '{result,stateInstance}', 'unknown');
    exception when others then
      v_wa_state := 'probe_error';
    end;$p$;
  v_local text := $l$    -- No provider HTTP from Postgres: heartbeat = a recent successful wa-channel-ingest poll.
    -- Fail closed: zero enabled sources, or none fresh, is reported as not-authorized.
    begin
      select case when exists (
        select 1 from public.channel_ingest_sources
        where enabled
          and last_run_at is not null
          and last_run_at >= now() - make_interval(mins => greatest(20, coalesce(poll_every_min,5) * 3))
      ) then 'authorized' else 'no_fresh_ingest' end
      into v_wa_state;
    exception when others then
      v_wa_state := 'probe_error';
    end;$l$;
begin
  if position(v_probe in v_def) = 0 then
    raise exception 'fn_health_watch probe block not found; refusing blind rewrite';
  end if;
  v_new := replace(v_def, v_probe, v_local);
  v_new := replace(v_new, 'Green API אינו מחובר: stateInstance=%s. channel ingest cron לבדו אינו הוכחת זרימה.',
                          'WhatsApp ingest ללא heartbeat תקין (מצב=%s). חיבור Green API נבדק רק ע"י wa-channel-ingest.');
  if position('wa_admin' in v_new) > 0 then
    raise exception 'fn_health_watch still references wa_admin';
  end if;
  execute v_new;
end $$;
