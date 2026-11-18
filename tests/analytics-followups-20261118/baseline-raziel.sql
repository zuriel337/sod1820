CREATE OR REPLACE FUNCTION public.fn_raziel_activity_notify(p_sender text, p_channel text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    values (r.user_id, 'admin_raziel_activity', 'פעילות רזיאל', 'פעילות ראשונה משולח ביום · ' || coalesce(nullif(v_chan, ''), 'ערוץ'),
            'admin:raziel_activity', 'raziel:' || v_day,
            'raziel_activity:' || r.user_id::text || ':' || md5(v_sender) || ':' || v_day)
    on conflict do nothing;
    if found then v_n := v_n + 1; end if;
  end loop;
  return v_n;
end $function$;
