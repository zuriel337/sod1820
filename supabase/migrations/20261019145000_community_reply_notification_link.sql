-- Community 2029: reply notifications for community_2029 messages link to the message itself.
-- BRANCH-ONLY. Not applied to any live database. Optional and independent of the other migrations.
-- Re-creates the shared trigger function notify_on_contribution with the SAME body as the live one
-- (verified md5 d9e068d87124a28b7205ef7e6ea8bb03 on 2026-10-19), except the link of a community_2029 reply.

create or replace function public.notify_on_contribution()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
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
end $$;

