CREATE OR REPLACE FUNCTION public.fn_system_suggestion_notify_high()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  r record;
  v_sev text := lower(coalesce(new.observed->>'severity', ''));
  v_title text := left(regexp_replace(coalesce(new.title, ''), '[\r\n\t]+', ' ', 'g'), 80);
  v_cat text := left(regexp_replace(coalesce(new.category, ''), '[\r\n\t]+', ' ', 'g'), 40);
begin
  if v_sev not in ('high', 'critical') or coalesce(new.status, '') <> 'pending' then return new; end if;
  begin
    for r in
      select p.user_id from public.notification_prefs p
        join public.users u on u.id = p.user_id and u.role = 'admin'
       where p.user_id is not null and 'admin:system_high' = any(coalesce(p.topics, '{}'::text[]))
    loop
      insert into public.user_notifications(user_id, kind, title, body, source_topic, source_ref, dedupe_key)
      values (r.user_id, 'admin_system_high', 'תקלת מערכת ' || case v_sev when 'critical' then 'קריטית' else 'חמורה' end,
              concat_ws(' · ', nullif(v_title, ''), nullif(v_cat, ''), v_sev),
              'admin:system_high', 'system_suggestion:' || new.id::text,
              'system_high:' || r.user_id::text || ':' || new.id::text)
      on conflict do nothing;
    end loop;
  exception when others then
    null; -- must never block the system_suggestions write
  end;
  return new;
end $function$
