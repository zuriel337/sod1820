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
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
declare v_def text;
begin
  select pg_get_functiondef('public.ai_quota_check(text,text,integer)'::regprocedure) into v_def;
  if v_def is null then raise exception 'M0B precondition: public.ai_quota_check(text,text,integer) not found'; end if;
  if position($q$return jsonb_build_object('allowed', true, 'used', 0, 'limit', null, 'tier', 'unknown');$q$ in v_def) = 0 then
    raise exception 'M0B precondition: live ai_quota_check drifted from the body read on 12.11.2026 (empty-identity branch not found)';
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
declare v_def text;
begin
  select pg_get_functiondef('public.ai_quota_check(text,text,integer)'::regprocedure) into v_def;
  if position($q$'reason', 'missing_identity'$q$ in v_def) = 0 then raise exception 'M0B postcondition: fail-closed branch missing'; end if;
  if (select prosecdef from pg_proc where oid = 'public.ai_quota_check(text,text,integer)'::regprocedure) is not true then
    raise exception 'M0B postcondition: SECURITY DEFINER lost';
  end if;
end $$;

commit;
