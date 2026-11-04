-- REVIEW ARTIFACT ONLY. Not a migration and never auto-applied.
-- Series-only rollback; Legacy category functions are not replaced.
-- Restore only if every candidate postimage still matches.
-- Does not delete preferences/history/receipts or undo already delivered notifications.
begin;
do $guard$
begin
  if md5(pg_get_functiondef('public.canonical_follow_topic(text)'::regprocedure)) <> '536e29febf235d1bc9f4157b337ac51a' then
    raise exception 'Follow rollback base changed: canonical_follow_topic; refuse overwrite';
  end if;
  if md5(pg_get_functiondef('public.follow_topic_aliases(text)'::regprocedure)) <> '3b207f3b0a2e9e1049ce7487275c76f0' then
    raise exception 'Follow rollback base changed: follow_topic_aliases; refuse overwrite';
  end if;
  if md5(pg_get_functiondef('public.canonical_follow_subject(text,text)'::regprocedure)) <> 'd312134379229850c78d45a59846d112' then
    raise exception 'Follow rollback base changed: canonical_follow_subject; refuse overwrite';
  end if;
  if md5(pg_get_functiondef('public.notify_on_post_publish()'::regprocedure)) <> 'a89b9c85758f234aa80449377169bd8d' then
    raise exception 'Follow rollback base changed: notify_on_post_publish; refuse overwrite';
  end if;
  if md5(pg_get_functiondef('public.post_content_series_keys_v1(text[],text[],text)'::regprocedure)) <> '37c54532d9b38bf90475cdcf490a07da' then
    raise exception 'Follow rollback base changed: post_content_series_keys_v1; refuse overwrite';
  end if;
  if not exists(select 1 from pg_trigger where tgrelid='public.posts'::regclass and tgname='trg_posts_notify' and pg_get_triggerdef(oid)='CREATE TRIGGER trg_posts_notify AFTER INSERT OR UPDATE OF tags ON public.posts FOR EACH ROW EXECUTE FUNCTION notify_on_post_publish()') then
    raise exception 'Follow rollback base changed: post trigger; refuse overwrite';
  end if;
end
$guard$;

CREATE OR REPLACE FUNCTION public.canonical_follow_subject(p_entity_type text, p_stable_id text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
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
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

drop trigger trg_posts_notify on public.posts;
create trigger trg_posts_notify after insert on public.posts
for each row execute function public.notify_on_post_publish();
drop function public.post_content_series_keys_v1(text[],text[],text);
commit;
