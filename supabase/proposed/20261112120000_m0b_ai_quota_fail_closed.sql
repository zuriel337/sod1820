-- M0B_AI_QUOTA_FAIL_CLOSED — PROPOSAL, NOT APPLIED. Runs only with ZURIEL's explicit approval for this exact file (CLAUDE.md 0.4).
-- Rollback: supabase/proposed/ROLLBACK_20261112120000_m0b_ai_quota_fail_closed.sql
-- Test (throwaway local PostgreSQL only): bash scripts/run-m0b-ai-quota-sql-test.sh
--
-- ZURIEL 12.11.2026 (M0): paid AI fails CLOSED. Read live on 12.11.2026 (pg_get_functiondef), public.ai_quota_check
-- returns allowed=true for a NULL or empty identity — a caller with no identity is never counted.
-- What this changes: ONLY that first branch. A NULL / empty / whitespace-only identity now returns
-- {"allowed": false, "used": 0, "limit": null, "tier": "unknown", "reason": "missing_identity"} and writes nothing.
-- What this does NOT change: the signature, SECURITY DEFINER, search_path, the admin bypass, the default limit (2),
-- the atomic insert-on-conflict counter, the Asia/Jerusalem day, the ai_usage table, RLS or any grant
-- (grants are cluster M0-A). fn_capability_execution_gate_v1 already refuses an empty identity before calling this
-- function ("missing_identity"), and after M0-B no Edge caller sends one, so no legitimate caller changes behavior.
--
-- Full-match guards (round 5, after the Codex review: a text fragment alone was not enough before replacing the whole function):
--   BEFORE = md5(pg_get_functiondef) of the live body read on 12.11.2026 = 7981f2a5ba9e2b64c2a4b54d82b96bad
--            (re-read live, read-only, on 12.11.2026; the ROLLBACK file reproduces it byte for byte on a throwaway PostgreSQL);
--   AFTER  = md5 of the body below as PostgreSQL prints it = 17e71b6f6661f07aca809242c112ad13.
--   The live body must be exactly BEFORE (then it is replaced) or exactly AFTER (already applied: the same body is re-created, a
--   no-op). ANY other body - a change in any other clause, even with the old empty-identity text still present - stops the file
--   before anything is replaced. After the replace the body must be exactly AFTER, and SECURITY DEFINER, search_path, owner,
--   volatility and the privileges (ACL) must equal what they were before this file ran.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create temp table m0b_before on commit drop as
  select md5(pg_get_functiondef(p.oid)) as def_md5, p.proowner, p.proacl::text as acl, p.prosecdef, p.proconfig, p.provolatile
    from pg_proc p where p.oid = to_regprocedure('public.ai_quota_check(text,text,integer)');

do $$
declare v_md5 text;
begin
  select def_md5 into v_md5 from m0b_before;
  if v_md5 is null then raise exception 'M0B precondition: public.ai_quota_check(text,text,integer) not found'; end if;
  if v_md5 = '17e71b6f6661f07aca809242c112ad13' then
    raise notice 'M0B: ai_quota_check already has the reviewed fail-closed body; re-creating the same body (no-op)';
  elsif v_md5 <> '7981f2a5ba9e2b64c2a4b54d82b96bad' then
    raise exception 'M0B drift: live ai_quota_check is neither the body reviewed on 12.11.2026 nor the M0-B body (md5 %); stop', v_md5;
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
  -- M0-B: no identity, no budget. Fails closed and writes nothing.
  if p_identity is null or length(btrim(p_identity)) = 0 then
    return jsonb_build_object('allowed', false, 'used', 0, 'limit', null, 'tier', 'unknown', 'reason', 'missing_identity');
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
declare b m0b_before; a record;
begin
  select * into b from m0b_before;
  select md5(pg_get_functiondef(p.oid)) as def_md5, p.proowner, p.proacl::text as acl, p.prosecdef, p.proconfig, p.provolatile into a
    from pg_proc p where p.oid = 'public.ai_quota_check(text,text,integer)'::regprocedure;
  if a.def_md5 <> '17e71b6f6661f07aca809242c112ad13' then
    raise exception 'M0B postcondition: ai_quota_check re-created with an unexpected body (md5 %)', a.def_md5;
  end if;
  if a.prosecdef is not true then raise exception 'M0B postcondition: SECURITY DEFINER lost'; end if;
  if a.proconfig is distinct from array['search_path=public'] then raise exception 'M0B postcondition: search_path changed'; end if;
  if a.proowner <> b.proowner or a.acl is distinct from b.acl or a.provolatile <> b.provolatile or a.proconfig is distinct from b.proconfig then
    raise exception 'M0B postcondition: owner, privileges, volatility or settings changed';
  end if;
end $$;

commit;
