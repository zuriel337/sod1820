-- SOD1820 — G3-F explicit Follow side-effect gate
-- Owner: subscription_funnel_law v19
-- Representation reconciliation and guest->account projection must NOT look like a new Follow.
-- notify_on_new_follower is therefore allowed to emit only when watch_toggle inserted an
-- explicit subscribe_events(action='follow') row in the same transaction.

create or replace function public.notify_on_new_follower()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_new text[];
  v_topic text;
  v_name text;
  v_writer uuid;
  v_follower_name text;
  v_body text;
begin
  if TG_OP = 'INSERT' then
    v_new := coalesce(NEW.topics, '{}');
  else
    select array(
      select t from unnest(coalesce(NEW.topics,'{}')) t
      except
      select o from unnest(coalesce(OLD.topics,'{}')) o
    ) into v_new;
  end if;

  if v_new is null or array_length(v_new,1) is null then return NEW; end if;

  select coalesce(nullif(display_name,''), nullif(username,'')) into v_follower_name
    from public.users where id = NEW.user_id;
  v_follower_name := coalesce(v_follower_name, 'חבר קהילה');

  foreach v_topic in array v_new loop
    -- A topic appearing in notification_prefs is not by itself proof of a new Follow.
    -- Alias reconciliation and identity claim update the projection without inserting a
    -- subscribe_event. now() is transaction-stable, and watch_toggle inserts the event
    -- immediately before the preference mutation.
    if not exists (
      select 1
      from public.subscribe_events se
      where se.action = 'follow'
        and se.topic = public.canonical_follow_topic(v_topic)
        and se.created_at = now()
        and (
          (NEW.user_id is not null and se.user_id = NEW.user_id)
          or
          (NEW.user_id is null and NEW.visitor_id is not null and se.visitor_id = NEW.visitor_id)
        )
    ) then
      continue;
    end if;

    if v_topic like 'author:%' then
      v_name := substring(v_topic from 8);
      v_writer := null;
      select id into v_writer from public.users where display_name = v_name limit 1;
      if v_writer is null then
        select user_id into v_writer from public.contributors
          where user_id is not null and display_name = v_name limit 1;
      end if;

      if v_writer is not null and v_writer is distinct from NEW.user_id then
        v_body := v_follower_name || ' התחיל לעקוב אחריך';
        if not exists (
          select 1 from public.user_notifications
          where user_id = v_writer and kind = 'new_follower' and body = v_body
        ) then
          insert into public.user_notifications (user_id, email, kind, title, body, link)
          select v_writer, lower(u.email), 'new_follower', 'עוקב חדש 👀', v_body, null
          from public.users u where u.id = v_writer;
        end if;
      end if;
    end if;
  end loop;
  return NEW;
end
$function$;

-- Trigger functions are server-internal; do not expose them as callable client RPCs.
revoke all on function public.notify_on_new_follower() from public;
revoke all on function public.claim_follow_prefs_from_identity() from public;
revoke all on function public.notify_on_or_geula_update() from public;
