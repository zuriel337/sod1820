-- Rollback of 20261112134000_m0d_world_contributor_research_candidates.sql: removes exactly the 'candidate' token again.
do $$
declare
  d text; n text;
  v_from constant text := $a$(ro.status = ANY (ARRAY['approved'::text, 'canonical'::text, 'candidate'::text]))$a$;
  v_to   constant text := $a$(ro.status = ANY (ARRAY['approved'::text, 'canonical'::text]))$a$;
begin
  d := pg_get_viewdef('public.world_contributor_research_v1'::regclass, true);
  if position(v_from in d) = 0 then raise notice 'M0-D rollback: nothing to restore'; return; end if;
  n := rtrim(btrim(replace(d, v_from, v_to)), ';');
  execute 'create or replace view public.world_contributor_research_v1 with (security_invoker = true, security_barrier = true) as ' || n;
  if position($a$'candidate'::text$a$ in pg_get_viewdef('public.world_contributor_research_v1'::regclass, true)) > 0 then
    raise exception 'M0-D rollback: candidate token still present';
  end if;
end $$;
