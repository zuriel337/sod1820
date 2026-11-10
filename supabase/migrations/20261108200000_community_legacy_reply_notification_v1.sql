-- Community legacy reply notification fix (ZURIEL, 8.11.2026 — approved for this exact file).
--
-- notify_on_contribution() writes the saved in-app notification row (user_notifications,
-- the bell/badge) only when the replied-to message's own author_user_id is set. A legacy
-- message (origin='openweb'/'community_2029', author_contributor_id set, author_user_id
-- still null) never gets a saved notification for its owner when it already has a
-- human-gated link (contributors.user_id), even though replies_to_me() and the
-- edit/delete ownership check (_community_message_owned_by_caller_v1) already honor that
-- same link. This closes that one gap: resolve the parent message's owner as
-- coalesce(author_user_id, the linked contributor's user_id) before deciding whether to
-- notify. No other behavior changes — same dedupe key, same mute check, same recipients
-- for every message that already had author_user_id set.
create or replace function public.notify_on_contribution()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_parent public.research_contributions;
  v_parent_owner uuid;
  v_path uuid[]; v_visible boolean; v_root uuid; v_source text; v_link text;
begin

  -- Emit only a newly approved native reply. Import/backfill and ordinary edits
  -- do not send thread notifications; existing non-Community INSERTs follow below.
  if NEW.origin='community_2029' and NEW.parent_id is not null then
    -- Stamped to migration time below; approving/importing an older message
    -- must not replay historical thread notifications.
    if NEW.created_at < '2026-11-04 13:52:37.850713+00'::timestamptz then return NEW; end if;
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
    if found then
      v_parent_owner := coalesce(v_parent.author_user_id,
        (select c.user_id from public.contributors c where c.id = v_parent.author_contributor_id));
    else
      v_parent_owner := null;
    end if;
    if v_parent_owner is not null and v_parent_owner is distinct from NEW.author_user_id then
      insert into public.user_notifications
        (user_id,email,kind,title,body,link,source_topic,source_ref,channels_sent,dedupe_key)
      select u.id,lower(u.email),'reply','תגובה חדשה לתרומה שלך',
        coalesce(nullif(NEW.author_name,''),'חבר הקהילה')||' הגיב להודעה שלך',
        v_link,'thread:'||v_root::text,v_source,array['in_app'],u.id::text||'|reply|'||v_source
      from public.users u where u.id=v_parent_owner
        and not exists(select 1 from public.notification_prefs np where np.user_id=u.id and np.muted_until>now())
      on conflict(dedupe_key) where dedupe_key is not null do nothing;
    end if;
    return NEW;
  end if;
  if TG_OP <> 'INSERT' then return NEW; end if;
  -- 💬 תגובה: מודיעים למחבר-האב (לא לעצמו), רק לתגובה חיה
  if NEW.parent_id is not null and coalesce(NEW.status,'') not in ('hidden','rejected') then
    select * into v_parent from public.research_contributions where id = NEW.parent_id;
    if found then
      v_parent_owner := coalesce(v_parent.author_user_id,
        (select c.user_id from public.contributors c where c.id = v_parent.author_contributor_id));
    else
      v_parent_owner := null;
    end if;
    if v_parent_owner is not null and v_parent_owner is distinct from NEW.author_user_id then
      insert into public.user_notifications (user_id, email, kind, title, body, link)
      select v_parent_owner, lower(u.email), 'reply',
             'תגובה חדשה לתרומה שלך 💬',
             format('%s הגיב: %s', coalesce(nullif(NEW.author_name,''),'חבר הקהילה'), left(coalesce(NEW.body,''),70)),
             case when NEW.origin = 'community_2029' then '/community/chat?message=' || NEW.id::text
                  else '/forum/' || v_parent.id::text end
      from public.users u where u.id = v_parent_owner;
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
end $function$;
