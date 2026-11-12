-- Throwaway-Postgres regression for 20261112120000_m0b_ai_quota_fail_closed.sql (never run against a live project).
-- 1) installs the live 12.11.2026 body (the ROLLBACK file) and documents the old empty-identity allowance;
-- 2) applies the proposal and checks: empty/NULL/blank identity refused with no write; counting, the admin bypass,
--    a zero limit and the global-cap identity used by the Edge code behave exactly as before;
-- 3) applies the rollback and checks the original behavior is restored.
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

select 'm0b_ai_quota_fail_closed_v1: PASS' as result;
