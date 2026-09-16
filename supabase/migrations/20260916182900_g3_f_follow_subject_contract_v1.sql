-- SOD1820 — G3-F Follow subject contract seam
-- Future World/System Frame consumes entity_type + stable_id, never language/URL/display labels.
-- This is an adapter over the existing resolver/watch engine, not a second Follow engine.
-- Author/category stable IDs are NOT migrated here; today's labels remain compatibility inputs.

create or replace function public.canonical_follow_subject(
  p_entity_type text,
  p_stable_id text
)
returns text
language plpgsql
immutable
set search_path to 'public'
as $function$
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

-- Same Dispatcher resolver signature, now explicitly derived from the opaque subject contract.
create or replace function public.resolve_topics(p_entity_type text, p_stable_id text)
returns text[]
language plpgsql
immutable
set search_path to 'public'
as $function$
declare
  v_topic text := public.canonical_follow_subject(p_entity_type, p_stable_id);
begin
  if v_topic = '' then return array[]::text[]; end if;
  return public.follow_topic_aliases(v_topic);
end
$function$;

create or replace function public.follow_subject_state(
  p_entity_type text,
  p_stable_id text,
  p_visitor text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_vis text;
  v_topic text := public.canonical_follow_subject(p_entity_type, p_stable_id);
  v_equivs text[];
  v_topics text[] := '{}'::text[];
begin
  if v_topic = '' then raise exception 'unsupported follow subject'; end if;
  v_equivs := public.follow_topic_aliases(v_topic);

  if v_uid is not null then
    select coalesce(np.topics, '{}'::text[]) into v_topics
    from public.notification_prefs np
    where np.user_id = v_uid;
  else
    v_vis := nullif(btrim(coalesce(p_visitor, '')), '');
    if v_vis is null then raise exception 'no identity'; end if;
    select coalesce(np.topics, '{}'::text[]) into v_topics
    from public.notification_prefs np
    where np.user_id is null and np.visitor_id = v_vis;
  end if;

  v_topics := coalesce(v_topics, '{}'::text[]);
  return jsonb_build_object(
    'following', v_topics && v_equivs,
    'topic', v_topic
  );
end
$function$;

create or replace function public.follow_subject_toggle(
  p_entity_type text,
  p_stable_id text,
  p_source text default null,
  p_on boolean default true,
  p_visitor text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_topic text := public.canonical_follow_subject(p_entity_type, p_stable_id);
begin
  if v_topic = '' then raise exception 'unsupported follow subject'; end if;
  return public.watch_toggle(v_topic, p_source, p_on, p_visitor);
end
$function$;

revoke all on function public.follow_subject_state(text,text,text) from public;
revoke all on function public.follow_subject_toggle(text,text,text,boolean,text) from public;
grant execute on function public.follow_subject_state(text,text,text) to anon, authenticated;
grant execute on function public.follow_subject_toggle(text,text,text,boolean,text) to anon, authenticated;
