-- SOD1820 — G3-F Follow provenance idempotency
-- Claude READ_ONLY challenge A: two concurrent first-follow calls can both append
-- subscribe_events before notification_prefs ON CONFLICT serializes the projection.
-- Preserve append-only re-follow history while serializing only the current transition.

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
  v_lock_identity text;
begin
  if v_topic = '' then raise exception 'bad topic'; end if;
  v_equivs := public.follow_topic_aliases(v_topic);

  if v_uid is not null then
    v_lock_identity := 'user:' || v_uid::text;
  else
    v_vis := nullif(btrim(coalesce(p_visitor, '')), '');
    if v_vis is null then raise exception 'no identity'; end if;
    v_lock_identity := 'visitor:' || v_vis;
  end if;

  -- Transaction-scoped lock prevents duplicate provenance rows for simultaneous transitions
  -- without imposing a permanent UNIQUE constraint that would erase legitimate re-follow cycles.
  perform pg_advisory_xact_lock(
    hashtextextended(v_lock_identity || '|follow|' || v_topic, 0)
  );

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
    'aliases', v_equivs
  );
end
$function$;

revoke all on function public.watch_toggle(text,text,boolean,text) from public;
grant execute on function public.watch_toggle(text,text,boolean,text) to anon, authenticated;
