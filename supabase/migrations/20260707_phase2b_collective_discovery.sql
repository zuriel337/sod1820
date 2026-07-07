-- Phase 2b — Collective Discovery foundation over research_items.
-- עיקרון: לא מזהמים את גרף-הידע (nodes/edges) בקשרי-משתמש. Collective Discovery = שכבת-שאילתה
-- אגרגטיבית מעל research_items (ספירות בלבד, בלי זהויות). אות חזק יוכל בעתיד להתקדם ל-node התכנסות.

-- כמה חוקרים שונים אוספים ישות (ספירה בלבד). לדף-המספר: "N חוקרים אוספים את זה".
create or replace function public.entity_collective_count(p_type text, p_ref text)
returns integer
language sql stable security definer set search_path to 'public'
as $$
  select count(distinct user_id)::int
  from public.research_items
  where entity_type = p_type and entity_ref = p_ref;
$$;

-- מה שהקהילה חוקרת עכשיו — ישויות שנאספו ע"י >= min_users חוקרים (אגרגט, בלי זהויות).
create or replace function public.top_collective(min_users integer default 2, lim integer default 12)
returns table(entity_type text, entity_ref text, title text, researchers integer)
language sql stable security definer set search_path to 'public'
as $$
  select entity_type, entity_ref, max(title) as title, count(distinct user_id)::int as researchers
  from public.research_items
  group by entity_type, entity_ref
  having count(distinct user_id) >= min_users
  order by count(distinct user_id) desc, max(created_at) desc
  limit lim;
$$;

revoke all on function public.entity_collective_count(text,text) from public;
revoke all on function public.top_collective(integer,integer) from public;
grant execute on function public.entity_collective_count(text,text) to anon, authenticated;
grant execute on function public.top_collective(integer,integer) to anon, authenticated;
