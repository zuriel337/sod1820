-- Phase 2d — personal tree from searches + contribution rewards (identity side of the שמעון loop).
-- דלי 'searched' — חיפושים של משתמש מחובר בונים את העץ האישי שלו (research_items).
alter table public.research_items drop constraint if exists research_items_bucket_check;
alter table public.research_items add constraint research_items_bucket_check
  check (bucket in ('cart','library','draft','favorite','pinned','searched'));

-- צבירת תרומה: סוכן-2 קורא לזה מפונקציית-האישור שלו (submitted_by) → xp/credits/level.
-- חוזה = users.id. חסום מהציבור (למנוע self-award); service_role / definer-owner בלבד.
create or replace function public.award_contribution(p_user_id uuid, p_xp integer default 10, p_credits integer default 5)
returns table(xp integer, credits integer, level integer)
language plpgsql security definer set search_path to 'public'
as $$
declare v_xp int; v_credits int; v_level int;
begin
  update public.users u
    set xp = u.xp + greatest(p_xp, 0),
        credits = u.credits + greatest(p_credits, 0),
        level = greatest(1, floor((u.xp + greatest(p_xp, 0)) / 100.0)::int + 1)
    where u.id = p_user_id
    returning u.xp, u.credits, u.level into v_xp, v_credits, v_level;
  return query select v_xp, v_credits, v_level;
end $$;

revoke all on function public.award_contribution(uuid,integer,integer) from public;
grant execute on function public.award_contribution(uuid,integer,integer) to service_role;
