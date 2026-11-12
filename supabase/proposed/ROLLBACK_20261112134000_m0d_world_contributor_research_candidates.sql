-- Rollback of 20261112134000_m0d_world_contributor_research_candidates.sql: drops world_contributor_research_v2. v1 is not touched.
-- Mandatory order when rolling back M0-D (README §3): this file FIRST, then the site. With v2 the reverse order is also safe
-- (an old site reads only v1), but the plan keeps one fixed order.
do $$
declare v1def text;
begin
  if to_regclass('public.world_contributor_research_v2') is null then raise notice 'M0-D rollback: v2 already absent'; return; end if;
  if exists (select 1 from pg_depend d join pg_rewrite w on w.oid = d.objid
             where d.refobjid = 'public.world_contributor_research_v2'::regclass and w.ev_class <> 'public.world_contributor_research_v2'::regclass) then
    raise exception 'M0-D rollback: another view depends on world_contributor_research_v2; stop';
  end if;
  v1def := pg_get_viewdef('public.world_contributor_research_v1'::regclass, true);
  drop view public.world_contributor_research_v2;
  if pg_get_viewdef('public.world_contributor_research_v1'::regclass, true) <> v1def then raise exception 'M0-D rollback: v1 changed'; end if;
end $$;
