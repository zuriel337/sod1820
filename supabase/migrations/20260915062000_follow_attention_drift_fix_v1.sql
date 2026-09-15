-- SOD1820 — Follow / Attention drift repair v1
-- Human Gate: ZURIEL 2026-09-15
-- Owner: subscription_funnel_law v19 (EXTEND_EXISTING)
-- Scope: compatibility aliases, honest channel consent defaults, Or Geula producer.
-- No new Follow/Notification/Audience system.

-- 1) FOLLOW_INTENT != EMAIL CONSENT.
-- New preference rows must not imply any external delivery channel.
-- Existing historical channels[] values are intentionally NOT rewritten here: v18/v19
-- explicitly says historical channels=['email'] is not proof of consent.
alter table public.notification_prefs
  alter column channels set default '{}'::text[];

-- 2) One resolver, compatibility-first.
-- Canonical outward topics:
--   cat:<label> · number:<n> · codes:new · stream:reality · channel:or-geula
-- Legacy aliases remain readable so nobody loses an existing Follow.
create or replace function public.resolve_topics(p_entity_type text, p_stable_id text)
returns text[]
language plpgsql
immutable
set search_path to 'public'
as $function$
declare
  v_id text := btrim(coalesce(p_stable_id, ''));
  v_norm text;
  v_straight text;
begin
  if v_id = '' then return array[]::text[]; end if;

  if p_entity_type = 'number' then
    return array['number:' || v_id, 'num_' || v_id];
  end if;

  if p_entity_type = 'category' then
    -- Normalize only representation punctuation; Category identity is still legacy label-based
    -- until the approved stable-id migration. Both representations remain aliases meanwhile.
    v_norm := replace(replace(replace(v_id, '"', '״'), '“', '״'), '”', '״');
    v_straight := replace(v_norm, '״', '"');
    return array(
      select distinct x
      from unnest(array[
        'cat:' || v_norm,
        'cat:' || v_id,
        'cat:' || v_straight,
        'category:' || v_norm,
        'category:' || v_id,
        'category:' || v_straight
      ]) as x
      where x is not null and x <> ''
    );
  end if;

  if p_entity_type = 'author' then
    return array['author:' || v_id];
  end if;

  if p_entity_type = 'cipher_feed' then
    return array['codes:new', 'els'];
  end if;

  if p_entity_type = 'reality_stream' then
    return array['stream:reality'];
  end if;

  if p_entity_type in ('media_channel', 'channel')
     and lower(replace(v_id, '_', '-')) in ('or-geula', 'orgeula') then
    return array['channel:or-geula', 'orgeula:new', 'or-geula'];
  end if;

  return array[]::text[];
end
$function$;

-- 3) Canonicalize new Follow intent without destroying old saved intent.
-- If a legacy alias already exists, treat it as following; on the next interaction it is
-- reconciled to the canonical key without generating a fake new subscribe_event.
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
  v_topic text := btrim(coalesce(p_topic, ''));
  v_equivs text[];
  v_label text;
  v_norm text;
  v_straight text;
begin
  if v_topic = '' then raise exception 'bad topic'; end if;

  -- Legacy -> canonical input normalization.
  if v_topic like 'category:%' then
    v_topic := 'cat:' || substr(v_topic, 10);
  elsif v_topic ~ '^num_[0-9]+$' then
    v_topic := 'number:' || substr(v_topic, 5);
  elsif v_topic in ('orgeula:new', 'or-geula', 'channel:orgeula') then
    v_topic := 'channel:or-geula';
  elsif v_topic = 'els' then
    v_topic := 'codes:new';
  end if;

  -- Category punctuation aliases collapse to one canonical representation.
  if v_topic like 'cat:%' then
    v_label := substr(v_topic, 5);
    v_norm := replace(replace(replace(v_label, '"', '״'), '“', '״'), '”', '״');
    v_straight := replace(v_norm, '״', '"');
    v_topic := 'cat:' || v_norm;
    v_equivs := array[
      v_topic,
      'cat:' || v_label,
      'cat:' || v_straight,
      'category:' || v_norm,
      'category:' || v_label,
      'category:' || v_straight
    ];
  elsif v_topic like 'number:%' then
    v_label := substr(v_topic, 8);
    v_equivs := array[v_topic, 'num_' || v_label];
  elsif v_topic = 'codes:new' then
    v_equivs := array['codes:new', 'els'];
  elsif v_topic = 'channel:or-geula' then
    v_equivs := array['channel:or-geula', 'orgeula:new', 'or-geula'];
  else
    v_equivs := array[v_topic];
  end if;

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
    elsif not (v_topic = any(v_topics)) then
      -- Existing legacy alias: reconcile representation only, no fake follow event.
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
    'topic', v_topic
  );
end
$function$;

revoke all on function public.watch_toggle(text,text,boolean,text) from public;
grant execute on function public.watch_toggle(text,text,boolean,text) to anon, authenticated;

-- 4) Or Geula was followable in UI but had no fan-out producer.
-- New LIVE items now enter the same canonical Dispatcher. No historical replay.
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
