-- READ-ONLY checks for the database step 20261112134000_m0d_world_contributor_research_candidates.sql.
-- Catalogue queries only: nothing is written, no function is executed. Taken from the D rows of #1321's
-- tests/live/m0_post_apply_verification.sql (4a406fed2) and checked here on a throwaway PostgreSQL (see README).
-- Run on the canonical project with execute_sql (read-only) BEFORE the step (rows 1 and 3 read false, row 2 true) and right AFTER it
-- (every row reads true). Nothing else is needed to roll back: ROLLBACK_20261112134000_m0d_world_contributor_research_candidates.sql
-- drops v2 only, and the same query then reads false / true / false again.
select 'D1 v2 exists, admits public candidates (status kept); anon may read it and may not write it' as check,
  coalesce(to_regclass('public.world_contributor_research_v2') is not null
    and position($a$'candidate'::text$a$ in pg_get_viewdef(to_regclass('public.world_contributor_research_v2'), true)) > 0
    and has_table_privilege('anon', to_regclass('public.world_contributor_research_v2'), 'SELECT')
    and not has_table_privilege('anon', to_regclass('public.world_contributor_research_v2'), 'INSERT'), false) as ok
union all select 'D2 v1 unchanged for older clients (definition md5 as reviewed 12.11.2026)',
  md5(pg_get_viewdef('public.world_contributor_research_v1'::regclass, true)) = '81581396c9167206a67a117bdd406f70'
union all select 'D3 v2 owner, options (security_invoker, security_barrier) and privileges equal v1', coalesce(
  (select relowner from pg_class where oid = to_regclass('public.world_contributor_research_v2'))
    = (select relowner from pg_class where oid = 'public.world_contributor_research_v1'::regclass)
  and (select array_agg(o order by o) from pg_class c, unnest(coalesce(c.reloptions, '{}')) o where c.oid = to_regclass('public.world_contributor_research_v2'))
    is not distinct from (select array_agg(o order by o) from pg_class c, unnest(coalesce(c.reloptions, '{}')) o where c.oid = 'public.world_contributor_research_v1'::regclass)
  and (select array_agg(e order by e) from (select a.grantee::text || ':' || a.privilege_type as e from pg_class c, aclexplode(c.relacl) a
        where c.oid = to_regclass('public.world_contributor_research_v2') and a.grantee <> c.relowner) x)
    is not distinct from (select array_agg(e order by e) from (select a.grantee::text || ':' || a.privilege_type as e from pg_class c, aclexplode(c.relacl) a
        where c.oid = 'public.world_contributor_research_v1'::regclass and a.grantee <> c.relowner) y), false)
order by 1;
