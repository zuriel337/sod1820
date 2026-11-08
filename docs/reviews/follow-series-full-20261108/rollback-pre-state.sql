-- PRE-STATE captured live 2026-11-08 (read-only) from Supabase linswmnnkjxvweumprav. NOT APPLIED. Restores the objects the series-follow
-- migration (20261031091248) replaces: canonical_follow_subject, notify_on_post_publish, trg_posts_notify; and drops the new helper.
begin;
drop trigger if exists trg_posts_notify on public.posts;
CREATE OR REPLACE FUNCTION public.canonical_follow_subject(p_entity_type text, p_stable_id text)
 RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public'
AS $function$
declare
  v_type text := lower(btrim(coalesce(p_entity_type, '')));
  v_id text := btrim(coalesce(p_stable_id, ''));
begin
  if v_type = '' or v_id = '' then return ''; end if;

  return case v_type
    when 'number'         then public.canonical_follow_topic('number:' || v_id)
    when 'author'         then public.canonical_follow_topic('author:' || v_id)
    when 'category'       then public.canonical_follow_topic('cat:' || v_id)
    when 'cipher_feed'    then 'codes:new'
    when 'reality_stream' then 'stream:reality'
    when 'media_channel'  then case
      when lower(replace(v_id, '_', '-')) in ('or-geula', 'orgeula') then 'channel:or-geula'
      else public.canonical_follow_topic('channel:' || v_id)
    end
    when 'channel'        then case
      when lower(replace(v_id, '_', '-')) in ('or-geula', 'orgeula') then 'channel:or-geula'
      else public.canonical_follow_topic('channel:' || v_id)
    end
    else ''
  end;
end
$function$;
CREATE OR REPLACE FUNCTION public.notify_on_post_publish()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare c text;
begin
  if coalesce(NEW.date, now()) < now() - interval '2 hours' then return NEW; end if;
  if NEW.categories is not null and array_length(NEW.categories,1) is not null then
    foreach c in array NEW.categories loop
      if c is not null and btrim(c) <> '' then
        perform public.dispatch('category', c, 'post_new', NEW.id::text,
          'פוסט חדש ב' || c, NEW.title, '/' || NEW.slug);
      end if;
    end loop;
  end if;
  if NEW.author is not null and btrim(NEW.author) <> '' and NEW.author <> 'המערכת' then
    perform public.dispatch('author', NEW.author, 'post_new', NEW.id::text,
      'פוסט חדש מאת ' || NEW.author, NEW.title, '/' || NEW.slug);
  end if;
  return NEW;
end $function$;
CREATE TRIGGER trg_posts_notify AFTER INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION notify_on_post_publish();
drop function if exists public.post_content_series_keys_v1(text[],text[],text);
commit;
-- Not rolled back by this file: notification_prefs rows / subscribe_events created by series follows made while it was live
-- (they are ordinary follow rows; removing them is a separate, explicit decision).
