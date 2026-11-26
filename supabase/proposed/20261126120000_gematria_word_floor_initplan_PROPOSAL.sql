-- PROPOSAL ONLY - NOT APPLIED. Stage 3 of S-62 (speed map unified-performance-consolidation-20261031.json). Needs ZURIEL's explicit approval for the exact file.
-- Scope: ONE policy, public.gematria_words / ti_public_word_floor. Same command, same RESTRICTIVE kind, same roles.
-- Change: rd_is_admin() -> (select rd_is_admin()). rd_is_admin() is STABLE and depends only on auth.uid(), constant within a statement,
--   so the planner evaluates it once per statement (InitPlan) instead of once per row. The admin test, the eligibility function, the blocklist and
--   every grant stay exactly as they are: no new function, no new privilege, no text oracle over the blocklist, RLS is not bypassed.
-- Not changed (and why): gematria_public_word_eligible(id) per row. Its cost is the primary-key re-read per row. Removing it needs the blocklist check
--   to run in the row's own predicate, which needs a SECURITY DEFINER helper that anon can call with arbitrary text = a new oracle over the blocklist
--   patterns. That is a privilege widening and is NOT proposed here; see the HANDOFF note (decision for ZURIEL).
begin;
  set local lock_timeout = '5s';
  lock table public.gematria_words in share row exclusive mode;   -- no concurrent writer between the before/after comparison and the change
  -- guards: exact old state, otherwise stop
  do $g$
  declare v_exp text; v_kind boolean; v_cmd "char"; v_roles text;
  begin
    select pg_get_expr(polqual, polrelid), polpermissive, polcmd, array_to_string(polroles::oid[]::regrole[], ',')
      into v_exp, v_kind, v_cmd, v_roles from pg_policy where polrelid = 'public.gematria_words'::regclass and polname = 'ti_public_word_floor';
    if v_exp is distinct from '(rd_is_admin() OR gematria_public_word_eligible(id))' or v_kind or v_cmd <> 'r' or v_roles not in ('anon,authenticated','authenticated,anon') then
      raise exception 'ti_public_word_floor is not the expected policy (%, permissive=%, cmd=%, roles=%)', v_exp, v_kind, v_cmd, v_roles;
    end if;
    if md5(pg_get_functiondef('public.gematria_public_word_eligible(uuid)'::regprocedure)) <> '37daef8c3d317d509cdfd1afad87d12f'
       or md5(pg_get_functiondef('public.rd_is_admin()'::regprocedure)) <> '3005d3f9ef5e4e58203452a42899fc9c' then
      raise exception 'eligible()/rd_is_admin() differ from the version this proposal was written against';
    end if;
  end $g$;
  -- before: visible ids per subject (anon, a non-admin member, an admin) as one md5 each
  create temp table _gw_before(subject text primary key, n bigint, h text) on commit drop;
  do $b$
  declare s record; r record; v_admin uuid; v_member uuid := gen_random_uuid();
  begin
    select id into v_admin from public.users where role = 'admin' order by id limit 1;
    for s in select * from (values ('anon','anon',''), ('member','authenticated',v_member::text), ('admin','authenticated',coalesce(v_admin::text,''))) t(subject, rolname, sub) loop
      execute format('set local role %I', s.rolname);
      perform set_config('request.jwt.claim.sub', s.sub, true);
      execute 'select count(*), coalesce(md5(string_agg(id::text, '','' order by id)), '''') from public.gematria_words' into r;
      reset role;
      insert into _gw_before values (s.subject, r.count, r.coalesce);
    end loop;
  end $b$;
  grant select on _gw_before to public;
  alter policy ti_public_word_floor on public.gematria_words
    using ((select public.rd_is_admin()) or public.gematria_public_word_eligible(id));
  -- after: identical or abort the whole transaction
  do $a$
  declare s record; r record; v_admin uuid; v_member uuid; v_before record;
  begin
    select id into v_admin from public.users where role = 'admin' order by id limit 1;
    for s in select * from (values ('anon','anon',''), ('member','authenticated',gen_random_uuid()::text), ('admin','authenticated',coalesce(v_admin::text,''))) t(subject, rolname, sub) loop
      execute format('set local role %I', s.rolname);
      perform set_config('request.jwt.claim.sub', s.sub, true);
      execute 'select count(*), coalesce(md5(string_agg(id::text, '','' order by id)), '''') from public.gematria_words' into r;
      reset role;
      select * into v_before from _gw_before where subject = s.subject;
      if v_before.n <> r.count or v_before.h <> r.coalesce then
        raise exception 'visible rows changed for % (before %/%, after %/%) - aborting', s.subject, v_before.n, v_before.h, r.count, r.coalesce;
      end if;
    end loop;
  end $a$;
commit;
