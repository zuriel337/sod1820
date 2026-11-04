create schema auth;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table public.users(id uuid primary key,email text);
create table public.contributors(id uuid,user_id uuid,display_name text,avatar_url text);
create table public.research_contributions(id uuid primary key,parent_id uuid,author_name text,author_user_id uuid,author_contributor_id uuid,title text,body text,reactions jsonb default '{}',origin text,created_at timestamptz default now(),edited_at timestamptz,deleted_at timestamptz,thread_hidden_at timestamptz,status text,intent text);
create table public.notification_prefs(id uuid primary key default gen_random_uuid(),user_id uuid unique,visitor_id text unique,topics text[] default '{}',channels text[] default '{}',muted_until timestamptz,updated_at timestamptz default now());
create table public.user_notifications(id uuid primary key default gen_random_uuid(),user_id uuid,email text,kind text,title text,body text,link text,source_topic text,source_ref text,channels_sent text[],dedupe_key text);
create unique index notifications_dedupe on public.user_notifications(dedupe_key) where dedupe_key is not null;
create table public.subscribe_events(user_id uuid,visitor_id text,topic text,source text,action text);
create table public.persons(person_id uuid,account_user_id uuid);
create table public.identity_edges(person_id uuid,kind text,legacy_id text);
create function public.canonical_follow_topic(t text) returns text language sql immutable as $$select btrim(t)$$;
create function public.follow_topic_aliases(t text) returns text[] language sql immutable as $$select array[t]$$;
CREATE OR REPLACE FUNCTION public.community_message_context(p_id uuid)
 RETURNS TABLE(id uuid, parent_id uuid, author_name text, author_user_id uuid, author_contributor_id uuid, title text, body text, reactions jsonb, origin text, created_at timestamp with time zone, edited_at timestamp with time zone, is_deleted boolean, contributor_id uuid, contributor_user_id uuid, contributor_display_name text, contributor_avatar_url text, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  return query
  with recursive up(rid, pid, depth, tomb) as (
    select r.id, r.parent_id, 1,
           case when r.status = 'approved' and r.deleted_at is null and r.thread_hidden_at is null
                     and r.origin in ('openweb','community_2029') and nullif(btrim(r.body), '') is not null then false
                when r.deleted_at is not null and r.thread_hidden_at is null and r.origin in ('openweb','community_2029') then true
                else null end
    from public.research_contributions r where r.id = p_id
    union all
    select r.id, r.parent_id, up.depth + 1,
           case when r.status = 'approved' and r.deleted_at is null and r.thread_hidden_at is null
                     and r.origin in ('openweb','community_2029') and nullif(btrim(r.body), '') is not null then false
                when r.deleted_at is not null and r.thread_hidden_at is null and r.origin in ('openweb','community_2029') then true
                else null end
    from public.research_contributions r join up on r.id = up.pid
    where up.tomb is not null and up.depth < 30
  ), chain as (
    select * from up where tomb is not null
  )
  select r.id, r.parent_id,
         case when c.tomb then null else r.author_name end,
         case when c.tomb then null else r.author_user_id end,
         case when c.tomb then null else r.author_contributor_id end,
         case when c.tomb then null else r.title end,
         case when c.tomb then null else r.body end,
         case when c.tomb then '{}'::jsonb else r.reactions end,
         r.origin, r.created_at,
         case when c.tomb then null else r.edited_at end,
         c.tomb,
         case when c.tomb then null else ct.id end,
         case when c.tomb then null else ct.user_id end,
         case when c.tomb then null else ct.display_name end,
         case when c.tomb then null else ct.avatar_url end,
         null::bigint
  from chain c
  join public.research_contributions r on r.id = c.rid
  left join public.contributors ct on ct.id = r.author_contributor_id
  -- the target itself must be visible; ancestors stop at the first invisible one
  where exists (select 1 from chain t where t.rid = p_id)
    and exists (select 1 from chain t where t.pid is null)
  order by c.depth desc;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.notify_on_contribution()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_parent public.research_contributions;
begin
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
CREATE OR REPLACE FUNCTION public.notify_topic(p_topic text, p_title text, p_body text, p_link text, p_kind text DEFAULT 'topic_update'::text, p_source_ref text DEFAULT NULL::text, p_exclude_user uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_n int;
begin
  insert into public.user_notifications
    (user_id, email, kind, title, body, link, source_topic, source_ref, channels_sent, dedupe_key)
  select np.user_id, lower(u.email), p_kind, p_title, p_body, p_link, p_topic, p_source_ref,
         array['in_app'],
         np.user_id::text || '|' || p_kind || '|' || coalesce(p_source_ref,'')
  from public.notification_prefs np
  join public.users u on u.id = np.user_id
  where np.user_id is not null
    and np.topics @> array[p_topic]
    and np.user_id is distinct from p_exclude_user
    and (np.muted_until is null or np.muted_until < now())
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end $function$
;
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
$function$
;
create trigger trg_rc_notify after insert on public.research_contributions for each row execute function public.notify_on_contribution();
