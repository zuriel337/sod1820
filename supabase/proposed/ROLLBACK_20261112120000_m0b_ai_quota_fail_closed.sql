-- ROLLBACK for 20261112120000_m0b_ai_quota_fail_closed.sql — PROPOSAL, NOT APPLIED. ZURIEL approval required (CLAUDE.md 0.4).
-- Restores the exact public.ai_quota_check body read live with pg_get_functiondef on 12.11.2026
-- (an empty identity is allowed again). Signature, SECURITY DEFINER, search_path and grants are unchanged.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

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

commit;
