-- 👑 פורום: לייקים מרובים לאדמין (reaction_boosts) + לייק/תגובה לחיצים על כל שורה.
-- מודל: reactions מחזיק מפתח-משתמש ייחודי (לייק אחד למשתמש); reaction_boosts מחזיק מונה
-- נוסף לכל אימוג'י שרק אדמין יכול להעלות. סך-התצוגה = אורך-המערך + הבוסט → «רק אני כמנהל
-- יכול לתת יותר מלייק אחד». האכיפה בשרת (users.role='admin').

alter table public.research_contributions
  add column if not exists reaction_boosts jsonb not null default '{}'::jsonb;

-- חשיפת reaction_boosts בפיד-הפורום (שינוי טיפוס-חזרה → drop+create, ואז שחזור grants)
drop function if exists public.forum_feed_contributions(integer);
create function public.forum_feed_contributions(p_limit integer default 200)
returns table(id uuid, author_name text, author_user_id uuid, intent text, research_state text,
  status text, target_type text, target_id text, title text, body text, gematria_claim jsonb,
  reactions jsonb, reaction_boosts jsonb, pinned_at timestamptz, created_at timestamptz,
  last_activity_at timestamptz, trusted boolean)
language sql stable security definer set search_path to 'public' as $function$
  with t as (
    select coalesce(array_agg(user_id) filter (where user_id is not null), '{}') as uids,
           coalesce(array_agg(display_name) filter (where display_name is not null), '{}') as names
    from public.contributors where trusted = true
  ),
  active as (
    select distinct parent_id as id
    from public.research_contributions
    where parent_id is not null and status = 'approved'
  )
  select rc.id, rc.author_name, rc.author_user_id, rc.intent, rc.research_state,
         rc.status, rc.target_type, rc.target_id, rc.title, rc.body,
         rc.gematria_claim, rc.reactions, coalesce(rc.reaction_boosts,'{}'::jsonb) as reaction_boosts,
         rc.pinned_at, rc.created_at,
         coalesce(rc.last_activity_at, rc.created_at) as last_activity_at,
         ( (rc.author_user_id is not null and rc.author_user_id = any(t.uids))
           or (rc.author_name is not null and rc.author_name = any(t.names)) ) as trusted
  from public.research_contributions rc, t
  where rc.parent_id is null
    and (
      rc.status = 'approved'
      or (rc.status = 'published' and rc.id in (select id from active))
    )
  order by coalesce(rc.last_activity_at, rc.created_at) desc
  limit greatest(1, coalesce(p_limit, 200));
$function$;
grant execute on function public.forum_feed_contributions(integer) to public, anon, authenticated;

-- 👑 RPC אדמין-בלבד: הוספת/הפחתת לייק-בוסט. האכיפה בשרת (users.role='admin') = «רק אני כמנהל».
create or replace function public.admin_boost_reaction(p_id uuid, p_emoji text, p_delta int)
returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare v_boosts jsonb; v_cur int; v_new int; v_parent uuid;
begin
  if not exists (select 1 from public.users where id = auth.uid() and role = 'admin') then
    raise exception 'not admin';
  end if;
  if p_emoji not in ('👍','💡','🔥','🙏','✨') then raise exception 'bad emoji'; end if;
  if p_delta not in (-1, 1) then raise exception 'bad delta'; end if;
  select coalesce(reaction_boosts,'{}'::jsonb), parent_id into v_boosts, v_parent
    from public.research_contributions where id = p_id for update;
  if not found then raise exception 'not found'; end if;
  v_cur := coalesce((v_boosts->>p_emoji)::int, 0);
  v_new := greatest(0, v_cur + p_delta);
  if v_new = 0 then v_boosts := v_boosts - p_emoji;
  else v_boosts := jsonb_set(v_boosts, array[p_emoji], to_jsonb(v_new)); end if;
  update public.research_contributions
    set reaction_boosts = v_boosts,
        last_activity_at = case when p_delta > 0 then now() else last_activity_at end
    where id = p_id;
  if v_parent is not null and p_delta > 0 then
    update public.research_contributions set last_activity_at = now() where id = v_parent;
  end if;
  return v_boosts;
end $function$;
revoke all on function public.admin_boost_reaction(uuid, text, int) from public, anon;
grant execute on function public.admin_boost_reaction(uuid, text, int) to authenticated;
