-- Read-only live function preimages, 2026-10-26. Definitions only; no product data.
-- Used by the disposable local database tests and optimistic migration guard.

CREATE OR REPLACE FUNCTION public.follow_subject_state(p_entity_type text, p_stable_id text, p_visitor text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

CREATE OR REPLACE FUNCTION public.follow_subject_toggle(p_entity_type text, p_stable_id text, p_source text DEFAULT NULL::text, p_on boolean DEFAULT true, p_visitor text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_topic text := public.canonical_follow_subject(p_entity_type, p_stable_id);
begin
  if v_topic = '' then raise exception 'unsupported follow subject'; end if;
  return public.watch_toggle(v_topic, p_source, p_on, p_visitor);
end
$function$;


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

CREATE OR REPLACE FUNCTION public.canonical_follow_topic(p_topic text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
declare
  v_topic text := btrim(coalesce(p_topic, ''));
  v_label text;
begin
  if v_topic = '' then return ''; end if;

  if v_topic like 'category:%' then
    v_topic := 'cat:' || substr(v_topic, 10);
  elsif v_topic ~ '^num_[0-9]+$' then
    v_topic := 'number:' || substr(v_topic, 5);
  elsif v_topic = 'els' then
    v_topic := 'codes:new';
  elsif v_topic in ('orgeula:new', 'or-geula', 'channel:orgeula') then
    v_topic := 'channel:or-geula';
  end if;

  if v_topic like 'cat:%' then
    v_label := substr(v_topic, 5);
    v_label := replace(replace(replace(v_label, '"', '״'), '“', '״'), '”', '״');
    return 'cat:' || v_label;
  end if;

  return v_topic;
end
$function$;

CREATE OR REPLACE FUNCTION public.dispatch(p_entity_type text, p_stable_id text, p_kind text, p_source_ref text, p_title text, p_body text, p_link text, p_exclude uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_topics text[]; v_n integer;
begin
  v_topics := public.resolve_topics(p_entity_type, p_stable_id);
  if v_topics is null or array_length(v_topics, 1) is null then return 0; end if;

  insert into public.user_notifications
    (user_id, email, kind, title, body, link, source_topic, source_ref, channels_sent, dedupe_key)
  select np.user_id, lower(u.email), p_kind, p_title, p_body, p_link,
         (select t from unnest(v_topics) t where t = any(np.topics) limit 1),
         p_source_ref, array['in_app'],
         np.user_id::text || '|' || p_kind || '|' || coalesce(p_source_ref, '')
  from public.notification_prefs np
  join public.users u on u.id = np.user_id
  where np.user_id is not null
    and np.topics && v_topics
    and np.user_id is distinct from p_exclude
    and (np.muted_until is null or np.muted_until < now())
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
  get diagnostics v_n = row_count;

  insert into public.notification_events(entity_type, stable_id, kind, source_ref, topics, recipients)
    values (p_entity_type, p_stable_id, p_kind, p_source_ref, v_topics, v_n);
  return v_n;
end $function$;

CREATE OR REPLACE FUNCTION public.follow_topic_aliases(p_topic text)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
declare
  v_topic text := public.canonical_follow_topic(p_topic);
  v_label text;
  v_straight text;
begin
  if v_topic = '' then return array[]::text[]; end if;

  if v_topic like 'cat:%' then
    v_label := substr(v_topic, 5);
    v_straight := replace(v_label, '״', '"');
    return array(
      select distinct x
      from unnest(array[
        v_topic,
        'cat:' || v_straight,
        'category:' || v_label,
        'category:' || v_straight
      ]) as x
      where x <> ''
    );
  end if;

  if v_topic like 'number:%' then
    v_label := substr(v_topic, 8);
    return array[v_topic, 'num_' || v_label];
  end if;

  if v_topic = 'codes:new' then
    return array['codes:new', 'els'];
  end if;

  if v_topic = 'channel:or-geula' then
    return array['channel:or-geula', 'orgeula:new', 'or-geula', 'channel:orgeula'];
  end if;

  return array[v_topic];
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

CREATE OR REPLACE FUNCTION public.resolve_topics(p_entity_type text, p_stable_id text)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
declare
  v_topic text := public.canonical_follow_subject(p_entity_type, p_stable_id);
begin
  if v_topic = '' then return array[]::text[]; end if;
  return public.follow_topic_aliases(v_topic);
end
$function$;

CREATE OR REPLACE FUNCTION public.watch_toggle(p_topic text, p_source text DEFAULT NULL::text, p_on boolean DEFAULT true, p_visitor text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_auth_uid uuid := auth.uid();
  v_uid uuid := v_auth_uid;
  v_topics text[];
  v_has boolean;
  v_vis text;
  v_changed boolean := false;
  v_topic text := public.canonical_follow_topic(p_topic);
  v_equivs text[];
begin
  if v_topic = '' then raise exception 'bad topic'; end if;
  v_equivs := public.follow_topic_aliases(v_topic);

  if v_auth_uid is not null then
    -- Authenticated caller: account identity is authoritative; p_visitor is ignored.
    perform pg_advisory_xact_lock(
      hashtextextended('user:' || v_auth_uid::text || '|follow-identity', 0)
    );
  else
    v_vis := nullif(btrim(coalesce(p_visitor, '')), '');
    if v_vis is null then raise exception 'no identity'; end if;

    -- Guest capability lock first. If a concurrent claim currently owns it we wait; after it
    -- commits, the re-check below sees the new identity edge and routes into the account row.
    perform pg_advisory_xact_lock(
      hashtextextended('visitor:' || v_vis || '|follow-identity', 0)
    );

    select p.account_user_id into v_uid
    from public.identity_edges ie
    join public.persons p on p.person_id = ie.person_id
    where ie.kind = 'legacy_seed'
      and ie.legacy_id = v_vis
      and p.account_user_id is not null
    limit 1;

    if v_uid is not null then
      -- Same order as claim_follow_prefs_from_identity(): visitor -> account.
      perform pg_advisory_xact_lock(
        hashtextextended('user:' || v_uid::text || '|follow-identity', 0)
      );
    end if;
  end if;

  if v_uid is not null then
    select topics into v_topics
    from public.notification_prefs
    where user_id = v_uid
    for update;
  else
    select topics into v_topics
    from public.notification_prefs
    where visitor_id = v_vis
    for update;
  end if;

  v_topics := coalesce(v_topics, '{}');
  v_has := v_topics && v_equivs;

  if p_on then
    if not v_has then
      v_topics := array_append(v_topics, v_topic);
      v_changed := true;
      -- For a linked guest, keep both account and browser provenance. For authenticated calls
      -- visitor_id is NULL; for an unlinked guest user_id is NULL.
      insert into public.subscribe_events(user_id, visitor_id, topic, source, action)
        values (v_uid, v_vis, v_topic, p_source, 'follow');
    elsif not (v_topic = any(v_topics)) or (
      select count(*) from unnest(v_topics) x where x = any(v_equivs)
    ) > 1 then
      -- Representation reconciliation only; never a second Follow event.
      v_topics := array(
        select distinct x
        from unnest(v_topics) x
        where not (x = any(v_equivs))
      );
      v_topics := array_append(v_topics, v_topic);
      v_changed := true;
    end if;
  elsif v_has then
    v_topics := array(
      select distinct x
      from unnest(v_topics) x
      where not (x = any(v_equivs))
    );
    v_changed := true;
    insert into public.subscribe_events(user_id, visitor_id, topic, source, action)
      values (v_uid, v_vis, v_topic, p_source, 'unfollow');
  end if;

  if v_changed then
    if v_uid is not null then
      insert into public.notification_prefs(user_id, topics, channels)
        values (v_uid, v_topics, '{}'::text[])
        on conflict (user_id) do update
          set topics = excluded.topics, updated_at = now();
    else
      insert into public.notification_prefs(visitor_id, topics, channels)
        values (v_vis, v_topics, '{}'::text[])
        on conflict (visitor_id) do update
          set topics = excluded.topics, updated_at = now();
    end if;
  end if;

  return jsonb_build_object(
    'following', p_on and (v_has or v_changed),
    'topic', v_topic,
    'aliases', v_equivs,
    'claimed_account', v_auth_uid is null and v_uid is not null
  );
end
$function$;
