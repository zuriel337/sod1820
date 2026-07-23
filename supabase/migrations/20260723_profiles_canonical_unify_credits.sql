-- 🌱 profiles = מקור-אמת יחיד לזהות-הכלכלה (user_id·tier 0-5·credits·xp·level·streak).
-- מאחד את award_contribution/ce_award (שכתבו ל-users המקביל) לתוך הספַיְן הקנוני
-- credit_ledger + profiles.credits — «עץ אחד, בלי כלכלה מקבילה» (research/coordination memo 23.7).
-- כבר הוחל חי ב-Supabase (project linswmnnkjxvweumprav) דרך apply_migration; קובץ זה = תיעוד הפיך.

-- ── 1) tier טווח קנוני 0-5 (platform_tiers_law). כל הערכים כרגע 0 → בטוח. ──
alter table public.profiles drop constraint if exists profiles_tier_range;
alter table public.profiles add constraint profiles_tier_range check (tier between 0 and 5) not valid;
alter table public.profiles validate constraint profiles_tier_range;

comment on table public.profiles is
  'מקור-האמת הקנוני היחיד לזהות-הכלכלה: user_id·tier(0-5)·credits·xp·level·streak. '
  'credits = יתרה רצה מ-credit_ledger (grant_credits מתחזק את שניהם). xp/level נגזרים מ-my_research_level/research_level_of. '
  '⛔ users.{credits,xp,level,tier} = עמודות legacy נטושות — לא לכתוב/לקרוא מהן ככלכלה.';

-- ── 2) profiles אוניברסלי 1:1 עם auth.users — מילוי-חוסר לכל המשתמשים הקיימים. ──
insert into public.profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- ── 3) handle_new_user: יצירת שורת-profiles אוטומטית בהרשמה (הרחבה, לא טריגר מקביל). ──
create or replace function public.handle_new_user()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  insert into public.users (id, email, username, display_name, avatar_url, role, tier)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'user_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    'user', 'free'
  )
  on conflict (id) do nothing;

  -- 🌱 שורת-profiles קנונית (מקור-אמת אחד). idempotent.
  insert into public.profiles (user_id) values (new.id) on conflict (user_id) do nothing;

  -- הוספה אוטומטית לרשימת התפוצה (אם המייל עוד לא שם)
  if new.email is not null then
    insert into public.subscribers (email, name, source, active)
    select new.email,
           coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@','1')),
           'site-signup', true
    where not exists (select 1 from public.subscribers s where lower(s.email) = lower(new.email));
  end if;

  return new;
end $function$;

-- ── 4) award_contribution: קרדיטים דרך הספַיְן הקנוני, לא אל users.credits המקביל. ──
--    (נקרא מ-ce_award על כל contribution_event). xp/level נשארים נגזרים מהפורמולה.
create or replace function public.award_contribution(p_user_id uuid, p_xp integer default 10, p_credits integer default 5)
 returns table(xp integer, credits integer, level integer)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_xp int; v_credits int; v_level int;
begin
  if p_user_id is null then
    return query select 0, 0, 1; return;
  end if;
  -- 🌳 עץ אחד: credits → grant_credits (credit_ledger + profiles.credits). profiles = מקור-אמת.
  if greatest(coalesce(p_credits,0),0) > 0 then
    perform public.grant_credits(
      p_user_id, greatest(p_credits,0), 'contribution',
      jsonb_build_object('xp', greatest(coalesce(p_xp,0),0))
    );
  else
    insert into public.profiles(user_id) values (p_user_id) on conflict (user_id) do nothing;
  end if;
  select p.xp, p.credits, p.level into v_xp, v_credits, v_level
    from public.profiles p where p.user_id = p_user_id;
  return query select coalesce(v_xp,0), coalesce(v_credits,0), coalesce(v_level,1);
end $function$;

-- ── 5) Backfill: קרדיטי-תרומות שנחתו רק ב-users.credits (הכלכלה המקבילה) → אל הספַיְן הקנוני. ──
--    idempotent (מתויג meta.event_id + backfill=true) והפיך (ניתן לזהות/להסיר לפי התג).
do $backfill$
declare r record; v_credits int;
begin
  for r in
    select ce.id, ce.user_id, ce.source, ce.metadata
    from public.contribution_events ce
    where ce.user_id is not null
      and not exists (
        select 1 from public.credit_ledger cl
        where cl.reason = 'contribution' and cl.meta->>'event_id' = ce.id::text
      )
  loop
    v_credits := coalesce((r.metadata->>'credits')::int, 10);
    if v_credits > 0 then
      perform public.grant_credits(
        r.user_id, v_credits, 'contribution',
        jsonb_build_object('event_id', r.id, 'backfill', true, 'source', r.source)
      );
    end if;
  end loop;
end $backfill$;
