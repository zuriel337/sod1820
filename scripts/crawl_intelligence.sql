-- ============================================================================
-- Crawl Intelligence — מדידת בוטים (מגמות) — 2026-07-12
-- ----------------------------------------------------------------------------
-- דשבורד «מי סורק אותך» בטאב-התנועה (CrawlIntel ב-AdminPage). מקורות:
--   • edge_geo_log (יש היסטוריה) → מוגש/חסום + מגמה יומית.
--   • crawl_daily (חדש, מצטבר מעכשיו) → מגמה לפי בוט ספציפי + Top דליי-תוכן.
--   • edge_ua_seen → «מי סורק» מזוהה (מיידי).
-- ה-middleware מתעד לבוטים בלבד (fire-and-forget) שם-בוט + דלי-נתיב + נחסם.
-- ============================================================================

create table if not exists public.crawl_daily (
  day date not null default (now() at time zone 'Asia/Jerusalem')::date,
  bot text not null, bucket text not null, blocked boolean not null default false,
  hits int not null default 0,
  primary key (day, bot, bucket, blocked)
);
alter table public.crawl_daily enable row level security;  -- server-only (בלי policy)

create or replace function public.log_crawl(p_bot text, p_bucket text, p_blocked boolean default false)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  insert into crawl_daily (day, bot, bucket, blocked, hits)
  values ((now() at time zone 'Asia/Jerusalem')::date,
          coalesce(nullif(p_bot,''),'other'), coalesce(nullif(p_bucket,''),'other'),
          coalesce(p_blocked,false), 1)
  on conflict (day, bot, bucket, blocked) do update set hits = crawl_daily.hits + 1;
end $$;
grant execute on function public.log_crawl(text,text,boolean) to anon, authenticated;

-- admin_crawl_intel(p_days) → jsonb {kind_daily, totals, by_bot[series], by_bucket, bot_seen}
-- (ההגדרה המלאה הוחלה ב-DB — ראה pg_get_functiondef('admin_crawl_intel').)
