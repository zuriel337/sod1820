-- SOD1820 — G3-F Follow Identity / One-Tree Pass v1
-- Human Gate: ZURIEL 2026-09-16
-- Owner: subscription_funnel_law v19
-- Direct identity contracts: identity_architecture_law v1, person_foundation_contract_law v6
-- EXTEND_EXISTING ONLY: notification_prefs + subscribe_events + user_notifications + WatchButton + Dispatcher.
-- No Notification Center build, no world:mine, no new Follow engine/store.

-- -----------------------------------------------------------------------------
-- 1. FOLLOW_INTENT != CHANNEL CONSENT
-- -----------------------------------------------------------------------------
-- New Follow rows start with no external delivery consent. Historical channels values
-- are deliberately not rewritten: old {email} rows are legacy state, not proof of consent.
alter table public.notification_prefs
  alter column channels set default '{}'::text[];

-- -----------------------------------------------------------------------------
-- 2. ONE TOPIC NORMALIZATION SEAM
-- -----------------------------------------------------------------------------
-- This is representation normalization, not a premature author/category stable-ID migration.
-- number:<n> is stable now. cat:<label> and author:<label> remain compatibility forms until
-- the approved stable-ID/i18n migration gate. URLs and display labels must not be treated as
-- identity by future World callers; they must enter through resolve_topics(entity_type, stable_id).
create or replace function public.canonical_follow_topic(p_topic text)
returns text
language plpgsql
immutable
set search_path to 'public'
as $function$
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

create or replace function public.follow_topic_aliases(p_topic text)
returns text[]
language plpgsql
immutable
set search_path to 'public'
as $function$
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

-- Existing Dispatcher contract remains the single server resolver. Future stable IDs can be
-- admitted behind this signature without changing World/System Frame consumers.
create or replace function public.resolve_topics(p_entity_type text, p_stable_id text)
returns text[]
language plpgsql
immutable
set search_path to 'public'
as $function$
declare
  v_id text := btrim(coalesce(p_stable_id, ''));
begin
  if v_id = '' then return array[]::text[]; end if;

  return case p_entity_type
    when 'number'         then public.follow_topic_aliases('number:' || v_id)
    when 'author'         then public.follow_topic_aliases('author:' || v_id)
    when 'category'       then public.follow_topic_aliases('cat:' || v_id)
    when 'cipher_feed'    then public.follow_topic_aliases('codes:new')
    when 'reality_stream' then public.follow_topic_aliases('stream:reality')
    when 'media_channel'  then case
      when lower(replace(v_id, '_', '-')) in ('or-geula', 'orgeula')
        then public.follow_topic_aliases('channel:or-geula')
      else public.follow_topic_aliases('channel:' || v_id)
    end
    when 'channel'        then case
      when lower(replace(v_id, '_', '-')) in ('or-geula', 'orgeula')
        then public.follow_topic_aliases('channel:or-geula')
      else public.follow_topic_aliases('channel:' || v_id)
    end
    else array[]::text[]
  end;
end
$function$;

-- -----------------------------------------------------------------------------
-- 3. WATCH TOGGLE: CANONICAL WRITE + LEGACY READ/UNFOLLOW COMPATIBILITY
-- -----------------------------------------------------------------------------
create or replace function public.watch_toggle(
  p_topic text,
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
  v_uid uuid := auth.uid();
  v_topics text[];
  v_has boolean;
  v_vis text;
  v_changed boolean := false;
  v_topic text := public.canonical_follow_topic(p_topic);
  v_equivs text[];
begin
  if v_topic = '' then raise exception 'bad topic'; end if;
  v_equivs := public.follow_topic_aliases(v_topic);

  if v_uid is not null then
    select topics into v_topics
    from public.notification_prefs
    where user_id = v_uid
    for update;
  else
    v_vis := nullif(btrim(coalesce(p_visitor, '')), '');
    if v_vis is null then raise exception 'no identity'; end if;
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
      insert into public.subscribe_events(user_id, visitor_id, topic, source, action)
        values (v_uid, v_vis, v_topic, p_source, 'follow');
    elsif not (v_topic = any(v_topics)) or (
      select count(*) from unnest(v_topics) x where x = any(v_equivs)
    ) > 1 then
      -- Existing alias/duplicate represents the same Follow. Collapse representation only;
      -- do not create a fake second subscribe_event.
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
    'aliases', v_equivs
  );
end
$function$;

revoke all on function public.watch_toggle(text,text,boolean,text) from public;
grant execute on function public.watch_toggle(text,text,boolean,text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. GUEST -> VERIFIED ACCOUNT HANDOFF THROUGH THE EXISTING IDENTITY SPINE
-- -----------------------------------------------------------------------------
-- Do not claim by visitor_id alone. A guest preference is claimable only when that visitor_id
-- is already a legacy_seed edge on the same canonical person that is bound to account_user_id.
-- Triggering from identity_edges makes the handoff order-independent: login edge first or
-- legacy_seed first both converge when the second proof arrives.
create or replace function public.claim_follow_prefs_from_identity()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid;
  v_topics text[] := '{}'::text[];
  v_guest_mute timestamptz;
  v_guest_intensity text;
begin
  if NEW.kind not in ('login', 'legacy_seed') then return NEW; end if;

  select p.account_user_id into v_uid
  from public.persons p
  where p.person_id = NEW.person_id;

  if v_uid is null then return NEW; end if;

  -- Only rows whose visitor_id is proven by an identity edge on this exact person participate.
  with raw_topics as (
    select unnest(coalesce(np.topics, '{}'::text[])) as topic
    from public.notification_prefs np
    where np.user_id = v_uid
    union all
    select unnest(coalesce(np.topics, '{}'::text[])) as topic
    from public.notification_prefs np
    join public.identity_edges ie
      on ie.kind = 'legacy_seed'
     and ie.legacy_id = np.visitor_id
     and ie.person_id = NEW.person_id
    where np.user_id is null
  ), normalized as (
    select public.canonical_follow_topic(topic) as topic
    from raw_topics
  )
  select coalesce(array_agg(distinct topic order by topic) filter (where topic <> ''), '{}'::text[])
    into v_topics
  from normalized;

  -- Preserve guest mute/intensity only when a new account preference row must be created.
  -- Never transfer guest channels: historical guest {email} is not channel consent.
  select max(np.muted_until),
         (array_agg(np.intensity order by np.updated_at desc))[1]
    into v_guest_mute, v_guest_intensity
  from public.notification_prefs np
  join public.identity_edges ie
    on ie.kind = 'legacy_seed'
   and ie.legacy_id = np.visitor_id
   and ie.person_id = NEW.person_id
  where np.user_id is null;

  if exists (select 1 from public.notification_prefs where user_id = v_uid) then
    update public.notification_prefs
       set topics = v_topics,
           updated_at = now()
     where user_id = v_uid;
  elsif coalesce(array_length(v_topics, 1), 0) > 0 then
    insert into public.notification_prefs(user_id, topics, channels, intensity, muted_until)
      values (v_uid, v_topics, '{}'::text[], coalesce(v_guest_intensity, 'normal'), v_guest_mute);
  end if;

  -- The explicit Follow history remains append-only in subscribe_events. Only the duplicated
  -- guest preference projection is retired after verified identity binding.
  delete from public.notification_prefs np
   where np.user_id is null
     and exists (
       select 1
       from public.identity_edges ie
       where ie.kind = 'legacy_seed'
         and ie.legacy_id = np.visitor_id
         and ie.person_id = NEW.person_id
     );

  return NEW;
end
$function$;

drop trigger if exists trg_identity_edges_claim_follow_prefs on public.identity_edges;
create trigger trg_identity_edges_claim_follow_prefs
after insert or update on public.identity_edges
for each row
when (NEW.kind in ('login', 'legacy_seed'))
execute function public.claim_follow_prefs_from_identity();

-- -----------------------------------------------------------------------------
-- 5. OR GEULA: EXISTING DISPATCHER, NO PARALLEL FOLLOW ENGINE
-- -----------------------------------------------------------------------------
-- Current UI already exposes Follow for this durable channel. New live inserts enter the same
-- dispatch(entity_type, stable_id, ...) path. No historical replay.
create or replace function public.notify_on_or_geula_update()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if coalesce(NEW.channel, '') <> 'or-geula' then return NEW; end if;
  if coalesce(NEW.status, 'live') <> 'live' then return NEW; end if;
  if coalesce(NEW.created_at, now()) < now() - interval '2 hours' then return NEW; end if;

  perform public.dispatch(
    'media_channel',
    'or-geula',
    'or_geula_new',
    NEW.id::text,
    'חדש באור הגאולה 🎬',
    left(coalesce(nullif(NEW.text, ''), 'עדכון חדש באור הגאולה'), 180),
    '/or-geula',
    null
  );
  return NEW;
end
$function$;

drop trigger if exists trg_or_geula_notify on public.channel_updates;
create trigger trg_or_geula_notify
after insert on public.channel_updates
for each row execute function public.notify_on_or_geula_update();
