-- Throwaway-Postgres regression for 20261112120000_m0b_ai_quota_fail_closed.sql (never run against a live project).
-- 1) installs the live 12.11.2026 body (the ROLLBACK file) and documents the old empty-identity allowance;
-- 2) applies the proposal and checks: empty/NULL/blank identity refused with no write; counting, the admin bypass,
--    a zero limit and the global-cap identity used by the Edge code behave exactly as before;
-- 3) applies the rollback and checks the original behavior is restored.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create table public.ai_usage(
  day date not null default ((now() at time zone 'Asia/Jerusalem'))::date,
  identity text not null,
  tier text,
  n integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (day, identity)
);

\i supabase/proposed/ROLLBACK_20261112120000_m0b_ai_quota_fail_closed.sql
do $$ begin
  assert (public.ai_quota_check('', 'anon', 5)->>'allowed')::boolean, 'baseline: live body allows an empty identity';
  assert (public.ai_quota_check(null, 'anon', 5)->>'allowed')::boolean, 'baseline: live body allows a NULL identity';
end $$;

\i supabase/proposed/20261112120000_m0b_ai_quota_fail_closed.sql
do $$
declare r jsonb;
begin
  foreach r in array array[public.ai_quota_check('', 'anon', 5), public.ai_quota_check(null, 'user', 5),
                           public.ai_quota_check('   ', 'anon', null), public.ai_quota_check('', 'admin', null)] loop
    assert (r->>'allowed')::boolean = false, 'missing identity must be refused: ' || r::text;
    assert r->>'reason' = 'missing_identity', 'stable reason: ' || r::text;
  end loop;
  assert (select count(*) from public.ai_usage) = 0, 'a refused missing identity writes nothing';

  -- counting is unchanged: limit 2 -> two allowed, third refused, one row with n=2
  assert (public.ai_quota_check('u:aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee:nr', 'user', 2)->>'allowed')::boolean;
  r := public.ai_quota_check('u:aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee:nr', 'user', 2);
  assert (r->>'allowed')::boolean and (r->>'used')::int = 2, 'second unit allowed: ' || r::text;
  r := public.ai_quota_check('u:aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee:nr', 'user', 2);
  assert not (r->>'allowed')::boolean and (r->>'used')::int = 2, 'third unit refused: ' || r::text;
  -- default limit (no override) is still 2
  perform public.ai_quota_check('ip:' || repeat('a', 64), 'anon', null);
  perform public.ai_quota_check('ip:' || repeat('a', 64), 'anon', null);
  assert not (public.ai_quota_check('ip:' || repeat('a', 64), 'anon', null)->>'allowed')::boolean, 'default limit 2';
  -- admin bypass unchanged, writes nothing
  assert (public.ai_quota_check('u:admin', 'admin', 1)->>'allowed')::boolean;
  assert not exists (select 1 from public.ai_usage where identity = 'u:admin'), 'admin is not counted';
  -- zero limit refuses without writing
  assert not (public.ai_quota_check('u:zero', 'user', 0)->>'allowed')::boolean;
  assert not exists (select 1 from public.ai_usage where identity = 'u:zero');
  -- the Edge global daily cap identity (opaque g:<64 hex>, tier global_cap) counts like any identity
  assert (public.ai_quota_check('g:' || repeat('b', 64), 'global_cap', 1)->>'allowed')::boolean;
  assert not (public.ai_quota_check('g:' || repeat('b', 64), 'global_cap', 1)->>'allowed')::boolean, 'global cap of 1 holds';
  assert (select prosecdef from pg_proc where oid = 'public.ai_quota_check(text,text,integer)'::regprocedure), 'SECURITY DEFINER kept';
end $$;

\i supabase/proposed/ROLLBACK_20261112120000_m0b_ai_quota_fail_closed.sql
do $$ begin
  assert (public.ai_quota_check('', 'anon', 5)->>'allowed')::boolean, 'rollback restores the original empty-identity allowance';
  assert position('missing_identity' in pg_get_functiondef('public.ai_quota_check(text,text,integer)'::regprocedure)) = 0, 'rollback body restored';
end $$;

-- Round 5 (Codex review): full-match guards. BEFORE = the live body (md5 7981f2a5...), AFTER = the M0-B body (md5 17e71b6f...).
create function pg_temp.def_md5() returns text language sql as $$
  select md5(pg_get_functiondef('public.ai_quota_check(text,text,integer)'::regprocedure)) $$;
do $$ begin assert pg_temp.def_md5() = '7981f2a5ba9e2b64c2a4b54d82b96bad', 'the fixture is byte-identical to the live body: ' || pg_temp.def_md5(); end $$;

-- G1. Idempotent: apply twice, roll back twice; privileges set before apply survive both directions.
revoke all on function public.ai_quota_check(text,text,integer) from public;
grant execute on function public.ai_quota_check(text,text,integer) to service_role;
create temp table acl_ref as select proacl::text as acl, proowner from pg_proc where oid = 'public.ai_quota_check(text,text,integer)'::regprocedure;
\i supabase/proposed/20261112120000_m0b_ai_quota_fail_closed.sql
\i supabase/proposed/20261112120000_m0b_ai_quota_fail_closed.sql
do $$ begin
  assert pg_temp.def_md5() = '17e71b6f6661f07aca809242c112ad13', 'applied twice: exactly the M0-B body';
  assert (select proacl::text from pg_proc where oid = 'public.ai_quota_check(text,text,integer)'::regprocedure) = (select acl from acl_ref), 'privileges kept on apply';
end $$;
\i supabase/proposed/ROLLBACK_20261112120000_m0b_ai_quota_fail_closed.sql
\i supabase/proposed/ROLLBACK_20261112120000_m0b_ai_quota_fail_closed.sql
do $$ begin
  assert pg_temp.def_md5() = '7981f2a5ba9e2b64c2a4b54d82b96bad', 'rolled back twice: exactly the original body';
  assert (select proacl::text from pg_proc where oid = 'public.ai_quota_check(text,text,integer)'::regprocedure) = (select acl from acl_ref), 'privileges kept on rollback';
end $$;

-- G2. An unexpected change in ANOTHER clause (default limit 2 -> 3), with the old empty-identity text still present: the proposal
--     must stop before replacing anything. (The previous fragment-only guard accepted this body and overwrote the change.)
do $$ begin
  execute replace(pg_get_functiondef('public.ai_quota_check(text,text,integer)'::regprocedure),
    'v_lim := coalesce(p_limit_override, 2);', 'v_lim := coalesce(p_limit_override, 3);');
end $$;
create temp table drift_ref as select pg_temp.def_md5() as md5;
do $$ begin assert (select md5 from drift_ref) not in ('7981f2a5ba9e2b64c2a4b54d82b96bad', '17e71b6f6661f07aca809242c112ad13'), 'a drifted body was installed'; end $$;
\set ON_ERROR_STOP off
\i supabase/proposed/20261112120000_m0b_ai_quota_fail_closed.sql
\set ON_ERROR_STOP on
do $$ begin
  assert pg_temp.def_md5() = (select md5 from drift_ref), 'NEGATIVE: the proposal replaced a body that changed in another clause';
  assert position('coalesce(p_limit_override, 3)' in pg_get_functiondef('public.ai_quota_check(text,text,integer)'::regprocedure)) > 0, 'the drift is intact';
end $$;

-- G3. The same drift seen by the rollback (it is neither the M0-B body nor the original): the rollback must not overwrite it.
\set ON_ERROR_STOP off
\i supabase/proposed/ROLLBACK_20261112120000_m0b_ai_quota_fail_closed.sql
\set ON_ERROR_STOP on
do $$ begin assert pg_temp.def_md5() = (select md5 from drift_ref), 'NEGATIVE: the rollback overwrote an unexpected body'; end $$;

-- G4. After M0-B, someone changes another clause (the admin bypass): the rollback must stop and keep that change.
do $$ begin
  execute replace(pg_get_functiondef('public.ai_quota_check(text,text,integer)'::regprocedure),
    'v_lim := coalesce(p_limit_override, 3);', 'v_lim := coalesce(p_limit_override, 2);');
end $$;
do $$ begin assert pg_temp.def_md5() = '7981f2a5ba9e2b64c2a4b54d82b96bad', 'back to the original body'; end $$;
\i supabase/proposed/20261112120000_m0b_ai_quota_fail_closed.sql
do $$ begin
  execute replace(pg_get_functiondef('public.ai_quota_check(text,text,integer)'::regprocedure),
    $q$if p_tier = 'admin' then$q$, $q$if p_tier in ('admin', 'owner') then$q$);
end $$;
create temp table drift2_ref as select pg_temp.def_md5() as md5;
\set ON_ERROR_STOP off
\i supabase/proposed/ROLLBACK_20261112120000_m0b_ai_quota_fail_closed.sql
\set ON_ERROR_STOP on
do $$ begin
  assert pg_temp.def_md5() = (select md5 from drift2_ref), 'NEGATIVE: the rollback overwrote a post-M0-B change';
  assert position('missing_identity' in pg_get_functiondef('public.ai_quota_check(text,text,integer)'::regprocedure)) > 0, 'still the M0-B fail-closed branch';
end $$;

select 'm0b_ai_quota_fail_closed_v1: PASS' as result;
