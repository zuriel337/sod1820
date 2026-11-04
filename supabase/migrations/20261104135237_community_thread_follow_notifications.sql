-- Extend the canonical Follow/notification engine for explicit public Community roots.
-- No new stores, channels, recipients, grants or historical notification replay.
do $guard$
begin
  if md5(pg_get_functiondef('public.watch_toggle(text,text,boolean,text)'::regprocedure)) <> 'fa41495b802bbd75155fc1ab74c5cb39'
     or md5(pg_get_functiondef('public.notify_on_contribution()'::regprocedure)) <> 'db48839f179602fa58f8e50b03f053bc' then
    raise exception 'Community follow baseline changed; inspect current canonical functions';
  end if;
end
$guard$;
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
  -- Only the explicit Community source gains this public-root capability.
  if p_source = 'community_thread' then
    if v_auth_uid is null then raise exception 'account required' using errcode='42501'; end if;
    if v_topic !~ '^thread:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      raise exception 'invalid community thread' using errcode='22023';
    end if;
    if p_on and not exists (
      select 1 from public.community_message_context(substr(v_topic,8)::uuid) c
      where c.id=substr(v_topic,8)::uuid and c.parent_id is null and not c.is_deleted
    ) then raise exception 'public thread unavailable' using errcode='42501'; end if;
  end if;
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
$function$
;
CREATE OR REPLACE FUNCTION public.notify_on_contribution()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_parent public.research_contributions;
  v_path uuid[]; v_visible boolean; v_root uuid; v_source text; v_link text;
begin

  -- Emit only a newly approved native reply. Import/backfill and ordinary edits
  -- do not send thread notifications; existing non-Community INSERTs follow below.
  if NEW.origin='community_2029' and NEW.parent_id is not null then
    -- Stamped to migration time below; approving/importing an older message
    -- must not replay historical thread notifications.
    if NEW.created_at < '2000-01-01T00:00:00Z'::timestamptz then return NEW; end if;
    if coalesce(NEW.status,'') <> 'approved' or NEW.deleted_at is not null or NEW.thread_hidden_at is not null then return NEW; end if;
    if TG_OP='UPDATE' and OLD.status='approved' then return NEW; end if;
    select array_agg(c.id order by c.ordinality), bool_and(not c.is_deleted)
      into v_path,v_visible from public.community_message_context(NEW.id) with ordinality c;
    if not coalesce(v_visible,false) or coalesce(array_length(v_path,1),0)<2 then return NEW; end if;
    -- Coordinate the public ancestry with moderation before disclosing even the
    -- existence of a reply. Locks have a fixed order across simultaneous replies.
    perform 1 from public.research_contributions r where r.id=any(v_path) order by r.id for share;
    select array_agg(c.id order by c.ordinality), bool_and(not c.is_deleted)
      into v_path,v_visible from public.community_message_context(NEW.id) with ordinality c;
    if not coalesce(v_visible,false) or coalesce(array_length(v_path,1),0)<2 then return NEW; end if;
    v_root:=v_path[1];
    v_source:='community:'||NEW.id::text;
    v_link:='/community/chat?thread='||v_root::text||'&reply='||NEW.id::text||'&path='||array_to_string(v_path,',');
    -- Canonical fan-out: explicit subscriptions, mute, actor exclusion,
    -- in-app channel and the existing recipient/event UNIQUE dedupe key.
    perform public.notify_topic('thread:'||v_root::text, 'תגובה חדשה בשרשור',
      coalesce(nullif(NEW.author_name,''),'חבר הקהילה')||' הוסיף תגובה לשרשור',
      v_link,'reply',v_source,NEW.author_user_id);
    select * into v_parent from public.research_contributions where id=NEW.parent_id;
    if found and v_parent.author_user_id is not null and v_parent.author_user_id is distinct from NEW.author_user_id then
      insert into public.user_notifications
        (user_id,email,kind,title,body,link,source_topic,source_ref,channels_sent,dedupe_key)
      select u.id,lower(u.email),'reply','תגובה חדשה לתרומה שלך',
        coalesce(nullif(NEW.author_name,''),'חבר הקהילה')||' הגיב להודעה שלך',
        v_link,'thread:'||v_root::text,v_source,array['in_app'],u.id::text||'|reply|'||v_source
      from public.users u where u.id=v_parent.author_user_id
        and not exists(select 1 from public.notification_prefs np where np.user_id=u.id and np.muted_until>now())
      on conflict(dedupe_key) where dedupe_key is not null do nothing;
    end if;
    return NEW;
  end if;
  if TG_OP <> 'INSERT' then return NEW; end if;
  -- 💬 תגובה: מודיעים למחבר-האב (לא לעצמו), רק לתגובה חיה
  if NEW.parent_id is not null and coalesce(NEW.status,'') not in ('hidden','rejected') then
    select * into v_parent from public.research_contributions where id = NEW.parent_id;
    if found and v_parent.author_user_id is not null
       and v_parent.author_user_id is distinct from NEW.author_user_id then
      insert into public.user_notifications (user_id, email, kind, title, body, link)
      select v_parent.author_user_id, lower(u.email), 'reply',
             'תגובה חדשה לתרומה שלך 💬',
             format('%s הגיב: %s', coalesce(nullif(NEW.author_name,''),'חבר הקהילה'), left(coalesce(NEW.body,''),70)),
             case when NEW.origin = 'community_2029' then '/community/chat?message=' || NEW.id::text
                  else '/forum/' || v_parent.id::text end
      from public.users u where u.id = v_parent.author_user_id;
    end if;
  end if;

  -- ✍️ מעקב-כתב: תרומת-שורש אמיתית של כותב מחובר (לא תגובה, לא ייבוא-משודר) → לעוקבים author:<שם>
  if NEW.parent_id is null and NEW.author_user_id is not null
     and coalesce(NEW.status,'') = 'approved'
     and coalesce(NEW.intent,'') <> 'תגובה'
     and coalesce(NEW.origin,'') <> 'broadcast' then
    insert into public.user_notifications (user_id, email, kind, title, body, link)
    select np.user_id, lower(u.email), 'writer_post',
           'כתב שאתה עוקב פרסם ✍️',
           format('%s פרסם: «%s»', coalesce(nullif(NEW.author_name,''),'כתב'),
                  coalesce(nullif(NEW.title,''), left(coalesce(NEW.body,''),50))),
           '/forum/' || NEW.id::text
    from public.notification_prefs np
    join public.users u on u.id = np.user_id
    where np.user_id is not null
      and np.user_id is distinct from NEW.author_user_id
      and ('author:' || NEW.author_name) = any(np.topics);
  end if;

  return NEW;
end $function$
;
drop trigger trg_rc_notify on public.research_contributions;
create trigger trg_rc_notify after insert or update of status on public.research_contributions
  for each row execute function public.notify_on_contribution();

do $activation$
declare definition text;
begin
  definition:=pg_get_functiondef('public.notify_on_contribution()'::regprocedure);
  definition:=replace(definition,'''2000-01-01T00:00:00Z''::timestamptz',format('%L::timestamptz',statement_timestamp()));
  execute definition;
end
$activation$;
