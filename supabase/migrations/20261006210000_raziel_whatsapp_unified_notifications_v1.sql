-- RAZIEL_WHATSAPP_UNIFIED_NOTIFICATIONS_V1 — BRANCH-ONLY CANDIDATE: NOT applied to the live DB.
-- EXTEND_EXISTING: notification_prefs -> user_notifications -> bot_outbox(bot=system) -> wa-system-outbox.
-- No new table / queue / store / sender / cron. WhatsApp is an optional delivery projection of user_notifications.
-- Link safety: the WhatsApp text is built from title+body ONLY. user_notifications.link (legacy paths) is never forwarded.

-- (1) Projection: one bot_outbox(system) row per NEW user_notifications row, gated by the user's own consent state.
create or replace function public.fn_user_notification_wa_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefs public.notification_prefs%rowtype;
  v_phone text;
  v_text text;
begin
  if new.user_id is null then return new; end if;
  begin
    select * into v_prefs from public.notification_prefs where user_id = new.user_id;
    if not found then return new; end if;
    if not ('whatsapp' = any(coalesce(v_prefs.channels, '{}'::text[]))) then return new; end if;
    if v_prefs.muted_until is not null and v_prefs.muted_until > now() then return new; end if;
    -- event-specific preference gate: admin:* notifications need the matching admin:* topic opt-in
    if coalesce(new.source_topic, '') like 'admin:%'
       and not (new.source_topic = any(coalesce(v_prefs.topics, '{}'::text[]))) then
      return new;
    end if;
    select l.phone into v_phone from public.wa_account_links l
     where l.user_id = new.user_id and l.verified_at is not null and coalesce(l.phone, '') ~ '^[0-9]{8,15}$'
     order by l.verified_at desc limit 1;
    if v_phone is null then return new; end if;
    v_text := left(trim(both E' \n' from concat_ws(E'\n', nullif(trim(new.title), ''), nullif(trim(new.body), ''))), 600);
    if v_text = '' then return new; end if;
    insert into public.bot_outbox(done_key, bot, chat_id, reply, payload)
    values ('un-wa:' || new.id::text, 'system', v_phone || '@c.us', v_text,
            jsonb_build_object('notification_id', new.id))
    on conflict (done_key) do nothing;
  exception when others then
    null; -- delivery projection must never block the in-app notification insert
  end;
  return new;
end $$;

revoke all on function public.fn_user_notification_wa_project() from public, anon, authenticated;

drop trigger if exists trg_user_notification_wa_project on public.user_notifications;
create trigger trg_user_notification_wa_project
  after insert on public.user_notifications
  for each row execute function public.fn_user_notification_wa_project();

-- (2) Receipt: identical to the live outbox_mark_system, plus an idempotent channels_sent append ONLY on proven 'sent'.
create or replace function public.outbox_mark_system(p_key text, p_outcome text, p_sent_msg_id text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.bot_outbox%rowtype;
  v_new text;
  v_nid uuid;
begin
  select * into v_row from public.bot_outbox
   where done_key = p_key and bot in ('system','link-code') and status = 'sending' for update;
  if not found then return 'ignored'; end if;
  if p_outcome = 'sent' then
    v_new := 'sent';
  elsif p_outcome = 'retry' then
    v_new := case when v_row.attempts >= 5 then 'failed' else 'pending' end;
  else
    v_new := 'failed';
  end if;
  update public.bot_outbox set status = v_new, last_at = now(),
         sent_msg_id = case when v_new = 'sent' then left(p_sent_msg_id, 200) else sent_msg_id end,
         -- OTP text is scrubbed on EVERY terminal state (sent/failed); pending (retry) keeps it for delivery
         reply = case when bot = 'link-code' and v_new = 'sent' then '[delivered]'
                      when bot = 'link-code' and v_new = 'failed' then '[failed]' else reply end,
         payload = case when bot = 'link-code' and v_new in ('sent','failed') then '{}'::jsonb else payload end
   where done_key = p_key;
  if v_new = 'sent' and v_row.bot = 'system' and v_row.done_key like 'un-wa:%'
     and (v_row.payload->>'notification_id') ~ '^[0-9a-fA-F-]{36}$' then
    begin
      v_nid := (v_row.payload->>'notification_id')::uuid;
      update public.user_notifications
         set channels_sent = array_append(coalesce(channels_sent, '{}'::text[]), 'whatsapp')
       where id = v_nid and not ('whatsapp' = any(coalesce(channels_sent, '{}'::text[])));
    exception when others then null; end;
  end if;
  return v_new;
end $$;

revoke all on function public.outbox_mark_system(text, text, text) from public, anon, authenticated;
grant execute on function public.outbox_mark_system(text, text, text) to service_role;

-- (3) Raziel activity producer (replaces the direct Metatron WhatsApp alert).
-- Opt-in only: creates a user_notifications row for an ADMIN user whose notification_prefs.topics contains
-- 'admin:raziel_activity' (absent by default => OFF). Privacy-minimal: coarse channel label only, no prompt, no phone,
-- no link. One per admin per sender per day (dedupe_key). Delivery is then handled by the unified pipeline above.
create or replace function public.fn_raziel_activity_notify(p_sender text, p_channel text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record; v_n integer := 0; v_day text := to_char((now() at time zone 'utc'), 'YYYYMMDD');
  v_sender text := regexp_replace(coalesce(p_sender, ''), '[^0-9]', '', 'g');
  v_chan text := left(regexp_replace(coalesce(p_channel, ''), '[\r\n]+', ' ', 'g'), 40);
begin
  if v_sender = '' then return 0; end if;
  for r in
    select p.user_id from public.notification_prefs p
      join public.users u on u.id = p.user_id and u.role = 'admin'
     where p.user_id is not null and 'admin:raziel_activity' = any(coalesce(p.topics, '{}'::text[]))
       and not exists (select 1 from public.wa_account_links l where l.user_id = p.user_id and l.phone = v_sender)
  loop
    insert into public.user_notifications(user_id, kind, title, body, source_topic, source_ref, dedupe_key)
    values (r.user_id, 'admin_raziel_activity', 'רזיאל ענה', 'פעילות רזיאל · ' || coalesce(nullif(v_chan, ''), 'ערוץ'),
            'admin:raziel_activity', 'raziel:' || v_day,
            'raziel_activity:' || r.user_id::text || ':' || md5(v_sender) || ':' || v_day)
    on conflict do nothing;
    if found then v_n := v_n + 1; end if;
  end loop;
  return v_n;
end $$;

revoke all on function public.fn_raziel_activity_notify(text, text) from public, anon, authenticated;
grant execute on function public.fn_raziel_activity_notify(text, text) to service_role;
