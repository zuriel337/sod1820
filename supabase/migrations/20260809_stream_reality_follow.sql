-- 🌊 מעקב אחרי «זרם המציאות» — subscription_funnel_law (topic=stream:reality). In-App בלבד, אידמפוטנטי.
-- מי שעוקב אחרי הזרם מקבל התראה כשעולה תמונה/רמז חדש (gallery_images source→'update').
-- fan-out יחיד דרך אותו מנוע (notify_topic-style dedupe: recipient|kind|source_ref).
create or replace function public.notify_on_stream_image()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare v_new boolean;
begin
  -- נכנס לזרם: INSERT עם source='update', או UPDATE ש-source הפך ל-'update'.
  v_new := coalesce(NEW.source,'') = 'update'
       and (TG_OP = 'INSERT' or coalesce(OLD.source,'') <> 'update');
  if not v_new then return NEW; end if;
  insert into public.user_notifications
    (user_id, email, kind, title, body, link, source_topic, source_ref, channels_sent, dedupe_key)
  select np.user_id, lower(u.email), 'stream_new', 'רמז חדש בזרם המציאות 🌊',
         coalesce(nullif(NEW.name,''), case when NEW.primary_value is not null then 'מספר ' || NEW.primary_value else 'תמונה חדשה' end),
         case when NEW.primary_value is not null then '/archive?q=' || NEW.primary_value else '/archive' end,
         'stream:reality', NEW.id::text, array['in_app'], np.user_id::text || '|stream_new|' || NEW.id::text
  from public.notification_prefs np
  join public.users u on u.id = np.user_id
  where np.user_id is not null and np.topics @> array['stream:reality']
    and (np.muted_until is null or np.muted_until < now())
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
  return NEW;
end $function$;
drop trigger if exists trg_stream_image_notify on public.gallery_images;
create trigger trg_stream_image_notify after insert or update of source on public.gallery_images
  for each row execute function public.notify_on_stream_image();
