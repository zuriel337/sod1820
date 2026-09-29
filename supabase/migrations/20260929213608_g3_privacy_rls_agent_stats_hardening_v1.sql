-- G3 privacy/RLS acceptance for the existing agent_research_stats read model.
-- Keep one read model; do not grant client SELECT on the protected source tables.

create or replace function public.agent_research_stats_projection_v1()
returns table(agent text,metric_key text,label text,value integer,detail text,sort integer)
language plpgsql
stable
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_role text := coalesce(auth.jwt()->>'role','');
begin
  if auth.uid() is null and v_role <> 'service_role' then
    raise exception 'not authorized';
  end if;

  return query
  select 'gabriel'::text,'bridges_en'::text,'גשרים מאומתים עברית↔אנגלית'::text,
         (select count(*)::int from public.language_links where lang='en' and status in ('approved','verified')),
         null::text,1
  union all
  select 'gabriel','bridges_pending','גשרים ממתינים לאישור',
         (select count(*)::int from public.language_links where status='pending'),null,2
  union all
  select 'gabriel','bridges_other_lang','גשרים בשפות נוספות (רוסית/אחר)',
         (select count(*)::int from public.language_links where lang is distinct from 'en'),null,3
  union all
  select 'gabriel','axes_with_amit','צירי-גימטריה שנלמדו עם עמית',
         (select count(*)::int from public.amit_method_notes where exposure='general'),null,4
  union all
  select 'gabriel','open_questions','שאלות מחקר פתוחות',
         (select count(*)::int from public.amit_research_questions where open_thread),null,5
  union all
  select 'gabriel','last_bridge','הגשר האחרון שנמצא',null::int,
         (select (hebrew||' ↔ '||foreign_word)||coalesce(' ('||method||')','')
            from public.language_links
           where status in ('approved','verified')
           order by created_at desc limit 1),6;
end
$$;

revoke all on function public.agent_research_stats_projection_v1() from public,anon;
grant execute on function public.agent_research_stats_projection_v1() to authenticated,service_role;

create or replace view public.agent_research_stats
with (security_invoker=true)
as
select * from public.agent_research_stats_projection_v1();

revoke all on public.agent_research_stats from public,anon;
grant select on public.agent_research_stats to authenticated,service_role;
