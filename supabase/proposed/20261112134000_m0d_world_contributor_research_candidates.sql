-- M0-D · public research candidates on contributor source pages - PROPOSED (production DB change, explicit ZURIEL approval).
-- Owner decision 12.11.2026 (permissions map §6 item 9): every PUBLIC research finding is viewable; an unverified one is shown with
-- «טרם אומת» and keeps its status. The table RLS (ro_public_read) already admits public candidates; the view
-- world_contributor_research_v1 adds its own status filter (approved, canonical), so contributor source pages still hide them.
--
-- Round 3 (12.11.2026): a NEW view, world_contributor_research_v2. v1 is NOT changed, byte for byte.
-- Why: a browser tab opened before the site deploy keeps the old reader, which renders every row of v1 as a plain public finding,
-- with no status label. Changing v1 in place would show unverified candidates in such a tab without «טרם אומת» for as long as it
-- stays open, and the site's telemetry carries no build id that could tell when the last one closed. With a separate v2, old code
-- only ever reads v1 (unchanged), the new site reads v2 and falls back to v1 while v2 does not exist. Apply order relative to the
-- site deploy no longer matters, and so does the rollback order (it stays fixed in the plan anyway: drop v2 first, then the site).
--
-- v2 = the live v1 definition with exactly one token added ('candidate' in the status array). Same security_invoker and
-- security_barrier, same owner, and the same privileges as v1 (copied from v1's ACL, then compared). Everything else - privacy_scope
-- = 'public', the person_only exclusion, the live-source check and the postgres/service_role/admin branches - is v1's text.
-- Guards: v1 must be exactly the definition reviewed on 12.11.2026 (md5 of pg_get_viewdef(v1, true) = 81581396c9167206a67a117bdd406f70,
-- enforced below) and the status anchor occurs exactly once in it. An existing v2 is never replaced and never accepted on its text
-- alone: it goes through the same postconditions as a new one (round 5). After the block: v1 unchanged, v2 minus the token equals
-- v1, and v2's owner, options and privileges equal v1's. No row and no status changes anywhere.
-- Rollback: ROLLBACK_20261112134000_m0d_world_contributor_research_candidates.sql (drops v2 only). Test: tests/sql/m0d_world_contributor_research_candidates_v1.sql.
do $$
declare
  d text; n text; r record; v1 oid; v2 oid;
  v_from constant text := $a$(ro.status = ANY (ARRAY['approved'::text, 'canonical'::text]))$a$;
  v_to   constant text := $a$(ro.status = ANY (ARRAY['approved'::text, 'canonical'::text, 'candidate'::text]))$a$;
  v_tok  constant text := $a$, 'candidate'::text]$a$;
begin
  v1 := 'public.world_contributor_research_v1'::regclass;
  d := pg_get_viewdef(v1, true);
  if md5(d) <> '81581396c9167206a67a117bdd406f70' then
    raise exception 'M0-D drift: world_contributor_research_v1 differs from the definition reviewed on 12.11.2026; stop';
  end if;
  -- Round 5 (independent review): an existing v2 is NOT accepted on its text alone. It is never replaced; it must pass every
  -- postcondition below (definition, owner, options, privileges) exactly like a freshly created one, or the script stops.
  if to_regclass('public.world_contributor_research_v2') is not null then
    raise notice 'M0-D: world_contributor_research_v2 already present; verifying it instead of creating it';
  else
  if (length(d) - length(replace(d, v_from, ''))) <> length(v_from) then
    raise exception 'M0-D drift: the reviewed status filter is not present exactly once in world_contributor_research_v1';
  end if;
  if position($a$ro.privacy_scope = 'public'::text$a$ in d) = 0 or position('person_only' in d) = 0 then
    raise exception 'M0-D drift: the public scope or the person_only exclusion is missing; stop';
  end if;
  n := rtrim(btrim(replace(d, v_from, v_to)), ';');
  execute 'create view public.world_contributor_research_v2 with (security_invoker = true, security_barrier = true) as ' || n;
  v2 := 'public.world_contributor_research_v2'::regclass;
  -- Exactly v1's privileges: drop whatever default privileges gave the new view, then copy v1's grants one by one.
  execute 'revoke all on public.world_contributor_research_v2 from public, anon, authenticated, service_role';
  for r in select a.grantee, a.privilege_type from pg_class c, aclexplode(c.relacl) a where c.oid = v1 and a.grantee <> c.relowner loop
    execute format('grant %s on public.world_contributor_research_v2 to %s', r.privilege_type,
      case when r.grantee = 0 then 'public' else quote_ident(r.grantee::regrole::text) end);
  end loop;
  comment on view public.world_contributor_research_v2 is
    'world_contributor_research_v1 plus PUBLIC research candidates (status kept; the 2029 site labels them «טרם אומת»). Read by the 2029 site from M0-D on; v1 stays unchanged for older clients.';
  end if;
  v2 := 'public.world_contributor_research_v2'::regclass;
  if pg_get_viewdef(v1, true) <> d then raise exception 'M0-D: world_contributor_research_v1 changed; stop'; end if;
  if replace(pg_get_viewdef(v2, true), v_tok, ']') <> d then
    raise exception 'M0-D: world_contributor_research_v2 differs from v1 beyond the candidate token';
  end if;
  if (select relowner from pg_class where oid = v2) <> (select relowner from pg_class where oid = v1) then
    raise exception 'M0-D: v2 owner differs from v1 owner; stop';
  end if;
  if (select array_agg(o order by o) from pg_class c, unnest(coalesce(c.reloptions, '{}')) o where c.oid = v2)
     is distinct from (select array_agg(o order by o) from pg_class c, unnest(coalesce(c.reloptions, '{}')) o where c.oid = v1) then
    raise exception 'M0-D: v2 options differ from v1';
  end if;
  -- Sorted by the entry itself (an aggregate's "order by 1" would sort by the constant 1).
  if (select array_agg(e order by e) from (select a.grantee::text || ':' || a.privilege_type as e from pg_class c, aclexplode(c.relacl) a
        where c.oid = v2 and a.grantee <> c.relowner) s)
     is distinct from
     (select array_agg(e order by e) from (select a.grantee::text || ':' || a.privilege_type as e from pg_class c, aclexplode(c.relacl) a
        where c.oid = v1 and a.grantee <> c.relowner) s) then
    raise exception 'M0-D: v2 privileges differ from v1';
  end if;
end $$;
