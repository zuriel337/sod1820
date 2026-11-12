-- M0-D · public research candidates on contributor source pages - PROPOSED (production DB change, explicit ZURIEL approval).
-- Owner decision 12.11.2026 (permissions map §6 item 9): every PUBLIC research finding is viewable; an unverified one is shown with
-- «טרם אומת» and keeps its status. The table RLS (ro_public_read) already admits public candidates; the view
-- world_contributor_research_v1 adds its own status filter (approved, canonical), so contributor source pages still hide them.
-- Change: exactly one token - 'candidate' joins that status array. Everything else stays byte for byte: security_invoker and
-- security_barrier, the anon/authenticated SELECT grants (CREATE OR REPLACE VIEW keeps them), privacy_scope = 'public', the
-- person_only exclusion, the live-source check and the postgres/service_role/admin branches. No status is changed anywhere.
-- Guard: the anchor must occur exactly once (live 12.11.2026: md5 of pg_get_viewdef = 81581396c9167206a67a117bdd406f70), and after
-- re-creation the new definition with the token removed must equal the old one. Re-running is a no-op.
-- Rollback: ROLLBACK_20261112134000_m0d_world_contributor_research_candidates.sql. Test: tests/sql/m0d_world_contributor_research_candidates_v1.sql.
do $$
declare
  d text; n text;
  v_from constant text := $a$(ro.status = ANY (ARRAY['approved'::text, 'canonical'::text]))$a$;
  v_to   constant text := $a$(ro.status = ANY (ARRAY['approved'::text, 'canonical'::text, 'candidate'::text]))$a$;
begin
  d := pg_get_viewdef('public.world_contributor_research_v1'::regclass, true);
  if position(v_to in d) > 0 then raise notice 'M0-D: candidates already admitted'; return; end if;
  if (length(d) - length(replace(d, v_from, ''))) <> length(v_from) then
    raise exception 'M0-D drift: the reviewed status filter is not present exactly once in world_contributor_research_v1';
  end if;
  if position($a$ro.privacy_scope = 'public'::text$a$ in d) = 0 or position('person_only' in d) = 0 then
    raise exception 'M0-D drift: the public scope or the person_only exclusion is missing; stop';
  end if;
  n := rtrim(btrim(replace(d, v_from, v_to)), ';');
  execute 'create or replace view public.world_contributor_research_v1 with (security_invoker = true, security_barrier = true) as ' || n;
  if replace(pg_get_viewdef('public.world_contributor_research_v1'::regclass, true), $a$, 'candidate'::text]$a$, ']') <> d then
    raise exception 'M0-D: the re-created view differs from the reviewed one beyond the candidate token';
  end if;
end $$;
