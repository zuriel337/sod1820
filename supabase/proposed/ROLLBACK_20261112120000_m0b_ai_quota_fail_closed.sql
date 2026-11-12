-- ROLLBACK for 20261112120000_m0b_ai_quota_fail_closed.sql — PROPOSAL, NOT APPLIED. ZURIEL approval required (CLAUDE.md 0.4).
-- Restores the exact public.ai_quota_check body read live with pg_get_functiondef on 12.11.2026
-- (an empty identity is allowed again). Signature, SECURITY DEFINER, search_path and grants are unchanged.
-- Full-match guards (round 5): the live body must be exactly the M0-B body (md5 17e71b6f6661f07aca809242c112ad13, then it is
-- restored) or exactly the original (md5 7981f2a5ba9e2b64c2a4b54d82b96bad, already rolled back: the same body is re-created, a
-- no-op). Any other body - someone changed the function after M0-B - stops the rollback without overwriting that change. After the
-- restore the body must be exactly the original, with the same owner, privileges, volatility and settings as before this file ran.
-- A MISSING function is not "already rolled back": it stops the rollback and nothing is created (round 5, Codex). The test fixture of the
-- live body is a separate file, tests/sql/fixtures/m0b_ai_quota_live_base_20261112/ai_quota_check.sql.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create temp table m0b_rb_before on commit drop as
  select md5(pg_get_functiondef(p.oid)) as def_md5, p.proowner, p.proacl::text as acl, p.prosecdef, p.proconfig, p.provolatile
    from pg_proc p where p.oid = to_regprocedure('public.ai_quota_check(text,text,integer)');

do $$
declare v_md5 text;
begin
  select def_md5 into v_md5 from m0b_rb_before;
  if v_md5 is null then
    raise exception 'M0B rollback: public.ai_quota_check(text,text,integer) not found; stop, nothing created';
  elsif v_md5 = '7981f2a5ba9e2b64c2a4b54d82b96bad' then
    raise notice 'M0B rollback: ai_quota_check already has the original body; re-creating the same body (no-op)';
  elsif v_md5 <> '17e71b6f6661f07aca809242c112ad13' then
    raise exception 'M0B rollback drift: ai_quota_check is neither the M0-B body nor the original (md5 %); stop, nothing overwritten', v_md5;
  end if;
end $$;

CREATE OR REPLACE FUNCTION public.ai_quota_check(p_identity text, p_tier text, p_limit_override integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_day date := (now() at time zone 'Asia/Jerusalem')::date;
  v_used integer;
  v_lim integer;
begin
  if p_identity is null or length(p_identity) = 0 then
    return jsonb_build_object('allowed', true, 'used', 0, 'limit', null, 'tier', 'unknown');
  end if;

  if p_tier = 'admin' then
    return jsonb_build_object('allowed', true, 'used', 0, 'limit', null, 'tier', 'admin');
  end if;

  v_lim := coalesce(p_limit_override, 2);

  if v_lim <= 0 then
    select n into v_used from public.ai_usage where day = v_day and identity = p_identity;
    return jsonb_build_object('allowed', false, 'used', coalesce(v_used,0), 'limit', v_lim, 'tier', p_tier);
  end if;

  -- Single atomic insert/update gate: two concurrent requests cannot both pass
  -- the same last remaining unit. The WHERE is evaluated while the conflict row
  -- is locked by PostgreSQL.
  insert into public.ai_usage(day, identity, tier, n)
  values (v_day, p_identity, p_tier, 1)
  on conflict (day, identity) do update
    set n = public.ai_usage.n + 1,
        tier = excluded.tier,
        updated_at = now()
    where public.ai_usage.n < v_lim
  returning n into v_used;

  if v_used is null then
    select n into v_used from public.ai_usage where day = v_day and identity = p_identity;
    return jsonb_build_object('allowed', false, 'used', coalesce(v_used,0), 'limit', v_lim, 'tier', p_tier);
  end if;

  return jsonb_build_object('allowed', true, 'used', v_used, 'limit', v_lim, 'tier', p_tier);
end;
$function$;

do $$
declare b m0b_rb_before; a record;
begin
  select * into b from m0b_rb_before;
  select md5(pg_get_functiondef(p.oid)) as def_md5, p.proowner, p.proacl::text as acl, p.prosecdef, p.proconfig, p.provolatile into a
    from pg_proc p where p.oid = 'public.ai_quota_check(text,text,integer)'::regprocedure;
  if a.def_md5 <> '7981f2a5ba9e2b64c2a4b54d82b96bad' then
    raise exception 'M0B rollback: ai_quota_check not restored exactly (md5 %)', a.def_md5;
  end if;
  if a.prosecdef is not true or a.proconfig is distinct from array['search_path=public'] then
    raise exception 'M0B rollback: SECURITY DEFINER or search_path not as original';
  end if;
  if a.proowner <> b.proowner or a.acl is distinct from b.acl or a.provolatile <> b.provolatile then
    raise exception 'M0B rollback: owner, privileges or volatility changed';
  end if;
end $$;

commit;
