-- ============================================================================
-- שני מונים אחידים לתנועה — «כולל בוטים» מול «אנשים בלבד» — 2026-07-11
-- ----------------------------------------------------------------------------
-- רקע: קומיט a1b470c הוסיף שער isBotUA() ש*דילג* על track_visit לבוטים →
-- site_visits צנח ~85% ב-7-11 (מדרגה מלאכותית). צוריאל רצה לראות את *שני*
-- המונים — הישן (כולל בוטים) והחדש (מסונן) — ואחידים ל-3 שבועות בלי קפיצה.
--
-- הפתרון (2 שכבות):
--  A) visits.js: במקום לדלג — **מסמנים** is_bot ורושמים בכל זאת. site_visits
--     נושא כעת את שני המונים ביחידות-ביקורים (total · humans=is_bot=false · bots).
--  B) edge_geo_log (ה-middleware מתעד כל בקשה עם kind) = מקור אחיד לכל 3 השבועות,
--     בלי מדרגה: total(כל ה-kinds) · humans(browser) · bots(bot+goodbot).
--
-- הנתונים חיים מיד; הפרונט (פאנל TwoMeterPanel בטאב-התנועה) ממתין לפריסת-main.
-- ============================================================================

-- 1) דגל is_bot על site_visits (metadata-only default → מהיר)
alter table site_visits add column if not exists is_bot boolean not null default false;

-- 2) track_visit: רושם הכל + דגל. drop+create כדי להוסיף פרמטר עם ברירת-מחדל
--    (קריאות 4-ארגומנטים מהפרונט הקיים עדיין נפתרות → p_is_bot=false).
drop function if exists public.track_visit(text,text,text,text);
create or replace function public.track_visit(
  p_path text, p_referrer text default null, p_visitor text default null,
  p_device text default null, p_is_bot boolean default false)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if p_path is null or p_path = '' or length(p_path) > 512 then return; end if;
  insert into site_visits (path, referrer, visitor, device, is_bot)
  values (left(p_path,512), left(nullif(p_referrer,''),256),
          left(nullif(p_visitor,''),64), left(nullif(p_device,''),16), coalesce(p_is_bot,false));
end $$;

-- 3) מונה-כפול ביחידות-ביקורים (site_visits). אדמין בלבד.
create or replace function public.visits_two_meter(p_days int default 21)
returns table(day date, total bigint, humans bigint, bots bigint)
language plpgsql security definer set search_path to 'public' as $$
begin
  if not exists (select 1 from users where id = auth.uid() and role = 'admin') then return; end if;
  return query
  select (sv.ts at time zone 'Asia/Jerusalem')::date as day,
         count(*)::bigint,
         count(*) filter (where not sv.is_bot)::bigint,
         count(*) filter (where sv.is_bot)::bigint
  from site_visits sv
  where sv.ts >= (current_date - make_interval(days => p_days))
  group by 1 order by 1;
end $$;

-- 4) הרכב-תנועה אחיד ל-3 שבועות (edge_geo_log, יחידות-בקשות). אדמין בלבד.
create or replace function public.traffic_composition(p_days int default 21)
returns table(day date, total bigint, humans bigint, bots bigint)
language plpgsql security definer set search_path to 'public' as $$
begin
  if not exists (select 1 from users where id = auth.uid() and role = 'admin') then return; end if;
  return query
  select eg.day,
         sum(eg.hits)::bigint,
         sum(eg.hits) filter (where eg.kind = 'browser')::bigint,
         sum(eg.hits) filter (where eg.kind in ('bot','goodbot'))::bigint
  from edge_geo_log eg
  where eg.day >= current_date - p_days
  group by eg.day order by eg.day;
end $$;

grant execute on function public.visits_two_meter(int) to authenticated, anon;
grant execute on function public.traffic_composition(int) to authenticated, anon;
