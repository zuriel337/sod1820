-- 16.7.2026 — Single source of truth for "what each research agent has learned"
-- (agent_research_team_law). Read by BOTH the WhatsApp bots (continuity phrasing)
-- and the user control-center card. Long format: one row per (agent, metric).
-- Real counts only — no invented numbers.
create or replace view public.agent_research_stats as
select 'gabriel'::text as agent, 'bridges_en'::text as metric_key,
       'גשרים מאומתים עברית↔אנגלית'::text as label,
       (select count(*)::int from public.language_links where lang='en' and status in ('approved','verified'))::int as value,
       null::text as detail, 1 as sort
union all
select 'gabriel','bridges_pending','גשרים ממתינים לאישור',
       (select count(*)::int from public.language_links where status='pending'), null, 2
union all
select 'gabriel','bridges_other_lang','גשרים בשפות נוספות (רוסית/אחר)',
       (select count(*)::int from public.language_links where lang is distinct from 'en'), null, 3
union all
select 'gabriel','axes_with_amit','צירי-גימטריה שנלמדו עם עמית',
       (select count(*)::int from public.amit_method_notes where exposure='general'), null, 4
union all
select 'gabriel','open_questions','שאלות מחקר פתוחות',
       (select count(*)::int from public.amit_research_questions where open_thread), null, 5
union all
select 'gabriel','last_bridge','הגשר האחרון שנמצא',
       null::int,
       (select hebrew || ' ↔ ' || foreign_word || coalesce(' ('||method||')','')
          from public.language_links order by created_at desc limit 1), 6;

grant select on public.agent_research_stats to anon, authenticated;
