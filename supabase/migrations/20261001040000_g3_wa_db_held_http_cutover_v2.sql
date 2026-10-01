-- G3_WA_DB_HELD_HTTP_CUTOVER_V2 — closes invariant #15 for the remaining hot/background paths.
-- BRANCH-ONLY CANDIDATE: not applied to live DB. EXTEND_EXISTING: no new table/queue/bot/transport.
--
-- 1) notify_admin(): WITHDRAWN here (a pg_net Green URL leaks the token via net.http_request_queue);
--    replaced by the bot_outbox enqueue in V5.
-- 2) wa-green-backfill-daily cron: Edge execution under the existing wa-vip-backfill owner (mode=msg_ext)
--    using the existing FB_ADMIN_KEY header pattern. The DB keeps only the exact dedup/insert semantics
--    (fn_wa_backfill_apply) and the group listing (fn_wa_backfill_groups); both service_role-only.
-- 3) fn_wa_backfill_from_green()/wa_admin()/wa_send() KEPT as TEMPORARY_COMPATIBILITY, manual only.

create or replace function public.fn_wa_backfill_groups()
returns setof text
language sql
security definer
set search_path = public
as $$ select distinct group_id from public.wa_bot_log where group_id like '%@g.us' $$;

-- Exact legacy semantics of fn_wa_backfill_from_green's per-group step: non-array => skip,
-- only linked phones, on conflict (phone,msg_id) do nothing, errors never propagate.
create or replace function public.fn_wa_backfill_apply(p_group_id text, p_history jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_ins int := 0;
begin
  if p_history is null or jsonb_typeof(p_history) is distinct from 'array' then return 0; end if;
  begin
    insert into public.wa_msg_ext(phone, msg_id, ts, group_id)
    select regexp_replace(m->>'senderId','@.*$',''), m->>'idMessage',
           to_timestamp((m->>'timestamp')::bigint), p_group_id
    from jsonb_array_elements(p_history) m
    where m->>'idMessage' is not null and m->>'senderId' is not null
      and regexp_replace(m->>'senderId','@.*$','') in (select phone from public.wa_account_links)
    on conflict (phone, msg_id) do nothing;
    get diagnostics v_ins = row_count;
  exception when others then
    return 0;
  end;
  return v_ins;
end $$;

revoke all on function public.fn_wa_backfill_groups() from public, anon, authenticated;
revoke all on function public.fn_wa_backfill_apply(text, jsonb) from public, anon, authenticated;
grant execute on function public.fn_wa_backfill_groups() to service_role;
grant execute on function public.fn_wa_backfill_apply(text, jsonb) to service_role;

-- notify_admin(): rewritten in V5 (bot_outbox enqueue; the V2 pg_net/Green-token variant was withdrawn).

-- Cron cutover: same job name/schedule, Edge-executed.
select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'wa-green-backfill-daily'),
  command := $c$
    with s as (select decrypted_secret as key from vault.decrypted_secrets where name='FB_ADMIN_KEY' order by created_at desc limit 1)
    select net.http_get(
      url:='https://linswmnnkjxvweumprav.supabase.co/functions/v1/wa-vip-backfill?mode=msg_ext&count=1000',
      headers:=jsonb_build_object('x-fb-admin-key', s.key),
      timeout_milliseconds:=55000
    ) from s;
  $c$
);
