-- G3 Server Capability / Entitlement / Budget Gate v1
-- EXTEND_EXISTING only:
--   availability -> site_flags_lock_law v3 / public.site_flags
--   entitlement  -> platform_tiers_law v4 / fn_user_entitlement
--   budget       -> ai_quota_law v3 / ai_quota_check
-- No capability registry, entitlement store, quota store or pricing allocation is created here.
-- Server callers supply bounded policy inputs from their existing capability contract.

begin;

-- Harden the existing AI budget owner in place so the execution gate has an
-- atomic budget-consumption primitive. Signature and policy numbers are unchanged.
create or replace function public.ai_quota_check(
  p_identity text,
  p_tier text,
  p_limit_override integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
$$;

create or replace function public.fn_capability_execution_gate_v1(
  p_capability text,
  p_flag_key text default null,
  p_required_entitlement text default null,
  p_user_ref text default null,
  p_visitor text default null,
  p_identity text default null,
  p_budget_kind text default 'none',
  p_budget_tier text default null,
  p_budget_limit_override integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capability text := nullif(btrim(coalesce(p_capability,'')), '');
  v_flag_key text := nullif(btrim(coalesce(p_flag_key,'')), '');
  v_required text := lower(nullif(btrim(coalesce(p_required_entitlement,'')), ''));
  v_budget_kind text := lower(coalesce(nullif(btrim(coalesce(p_budget_kind,'')), ''), 'none'));

  v_ent jsonb;
  v_context_type text;
  v_is_admin boolean := false;
  v_is_authenticated boolean := false;
  v_entitlement_allowed boolean := false;
  v_entitlement_state text := 'unresolved';

  v_flag_found boolean := false;
  v_flag_enabled boolean := false;
  v_flag_mode text := null;
  v_flag_message text := null;
  v_availability_state text := 'open';
  v_availability_allowed boolean := true;

  v_budget jsonb := jsonb_build_object(
    'kind','none','state','not_metered','allowed',true,
    'used',0,'limit',null,'tier',null,'consumed',false
  );
  v_budget_allowed boolean := true;
  v_budget_tier text;

  v_allowed boolean;
begin
  if v_capability is null then
    raise exception 'capability is required';
  end if;

  -- Entitlement identity comes from the existing canonical read-layer.
  v_ent := public.fn_user_entitlement(p_user_ref, p_visitor);
  v_context_type := coalesce(v_ent->>'context_type','public_user');
  v_is_admin := coalesce((v_ent->>'is_admin')::boolean, false);
  v_is_authenticated := v_context_type <> 'public_user';

  -- Availability: explicit no-flag means this capability currently has no
  -- site_flags availability gate. If a server contract names a flag and the
  -- flag is missing/invalid, fail closed instead of silently opening expensive I/O.
  if v_flag_key is not null then
    select true, coalesce(f.enabled,false), coalesce(f.mode,'all'), f.message
      into v_flag_found, v_flag_enabled, v_flag_mode, v_flag_message
    from public.site_flags f
    where f.key = v_flag_key
    limit 1;

    if not coalesce(v_flag_found,false) then
      v_availability_state := 'unknown_flag';
      v_availability_allowed := false;
    elsif not v_flag_enabled then
      v_availability_state := 'open';
      v_availability_allowed := true;
    elsif v_flag_mode = 'all' then
      v_availability_state := case when v_is_admin then 'admin_bypass' else 'closed' end;
      v_availability_allowed := v_is_admin;
    elsif v_flag_mode = 'anon' then
      v_availability_state := case
        when v_is_admin then 'admin_bypass'
        when v_is_authenticated then 'registered_bypass'
        else 'registered_only'
      end;
      v_availability_allowed := v_is_admin or v_is_authenticated;
    else
      v_availability_state := 'invalid_mode';
      v_availability_allowed := false;
    end if;
  end if;

  -- Entitlement allocation remains a server-supplied policy input. G3 does not
  -- invent final G5 product allocation. The function only resolves that input
  -- against the existing entitlement owner.
  if v_required is null or v_required = 'public' then
    v_required := 'public';
    v_entitlement_allowed := true;
    v_entitlement_state := 'public';
  elsif v_required in ('subscriber','admin') then
    v_entitlement_allowed := coalesce(v_ent->'entitlements','[]'::jsonb) ? v_required;
    v_entitlement_state := case when v_entitlement_allowed then 'allowed' else 'denied' end;
  else
    -- G3 intentionally refuses premium/credits or invented tier names. Final
    -- Free/Registered/Premium/Credits allocation belongs to G5.
    v_entitlement_allowed := false;
    v_entitlement_state := 'unsupported_requirement';
  end if;

  -- Budget is consumed only after availability+entitlement pass.
  if v_budget_kind = 'none' then
    v_budget_allowed := true;
  elsif v_budget_kind = 'ai_quota' then
    if not v_availability_allowed or not v_entitlement_allowed then
      v_budget_allowed := false;
      v_budget := jsonb_build_object(
        'kind','ai_quota','state','not_consumed_upstream_denied','allowed',false,
        'used',null,'limit',null,'tier',null,'consumed',false
      );
    elsif nullif(btrim(coalesce(p_identity,'')), '') is null then
      v_budget_allowed := false;
      v_budget := jsonb_build_object(
        'kind','ai_quota','state','missing_identity','allowed',false,
        'used',null,'limit',null,'tier',null,'consumed',false
      );
    else
      v_budget_tier := coalesce(
        nullif(btrim(coalesce(p_budget_tier,'')), ''),
        case when v_is_admin then 'admin' when v_is_authenticated then 'user' else 'anon' end
      );
      v_budget := public.ai_quota_check(p_identity, v_budget_tier, p_budget_limit_override);
      v_budget_allowed := coalesce((v_budget->>'allowed')::boolean, false);
      v_budget := coalesce(v_budget,'{}'::jsonb) || jsonb_build_object(
        'kind','ai_quota',
        'state',case when v_budget_allowed then 'allowed' else 'exhausted' end,
        'consumed',case
          when v_budget_allowed and (v_budget->>'limit') is not null then true
          else false
        end
      );
    end if;
  else
    v_budget_allowed := false;
    v_budget := jsonb_build_object(
      'kind',v_budget_kind,'state','unknown_budget_kind','allowed',false,
      'used',null,'limit',null,'tier',null,'consumed',false
    );
  end if;

  v_allowed := v_availability_allowed and v_entitlement_allowed and v_budget_allowed;

  return jsonb_build_object(
    'v',1,
    'capability',v_capability,
    'allowed',v_allowed,
    'availability',jsonb_build_object(
      'owner','site_flags_lock_law v3',
      'flag_key',v_flag_key,
      'flag_found',case when v_flag_key is null then null else coalesce(v_flag_found,false) end,
      'enabled',case when v_flag_key is null then null else v_flag_enabled end,
      'mode',case when v_flag_key is null then null else v_flag_mode end,
      'state',v_availability_state,
      'allowed',v_availability_allowed,
      'message',v_flag_message
    ),
    'entitlement',jsonb_build_object(
      'owner','platform_tiers_law v4',
      'required',coalesce(v_required,'public'),
      'state',v_entitlement_state,
      'allowed',v_entitlement_allowed,
      'context_type',v_context_type,
      'entitlement',v_ent->>'entitlement',
      'tier',v_ent->'tier',
      'role',v_ent->>'role',
      'is_admin',v_is_admin,
      'is_subscriber',coalesce((v_ent->>'is_subscriber')::boolean,false),
      'entitlements',coalesce(v_ent->'entitlements','[]'::jsonb)
    ),
    'budget',coalesce(v_budget,'{}'::jsonb) || jsonb_build_object(
      'owner','ai_quota_law v3',
      'allowed',v_budget_allowed
    ),
    'policy',jsonb_build_object(
      'server_authoritative',true,
      'final_product_allocation_defined_here',false,
      'pricing_defined_here',false,
      'supported_entitlement_requirements',jsonb_build_array('public','subscriber','admin'),
      'named_availability_flag_must_exist',true
    )
  );
end;
$$;

revoke all on function public.fn_capability_execution_gate_v1(text,text,text,text,text,text,text,text,integer)
  from public, anon, authenticated;
grant execute on function public.fn_capability_execution_gate_v1(text,text,text,text,text,text,text,text,integer)
  to service_role;

comment on function public.fn_capability_execution_gate_v1(text,text,text,text,text,text,text,text,integer) is
  'G3 server execution preflight. Composes existing availability, entitlement and budget owners before expensive I/O; does not own final G5 allocation/pricing.';

commit;
