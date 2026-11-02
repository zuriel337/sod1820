-- Exact schema definition obtained by root through canonical read-only
-- pg_get_functiondef(fn_user_entitlement(text,text)), 2026-11-02. No row data.
CREATE OR REPLACE FUNCTION public.fn_user_entitlement(p_user_ref text, p_visitor text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_uid uuid; v_role text; v_tier int; v_ct text; v_ent text;
begin
  begin v_uid := p_user_ref::uuid; exception when others then v_uid := null; end;
  if v_uid is not null then
    select u.role, coalesce(p.tier,0) into v_role,v_tier from public.users u
    left join public.profiles p on p.user_id=u.id where u.id=v_uid;
  end if;
  v_ct:=case when v_role='admin' then 'admin' when coalesce(v_tier,0)>=3 then 'subscriber'
    when v_uid is not null then 'authenticated_user' else 'public_user' end;
  v_ent:=case when v_role='admin' then 'admin' when coalesce(v_tier,0)>=3 then 'subscriber' else 'public' end;
  return jsonb_build_object('context_type',v_ct,'entitlement',v_ent,'tier',coalesce(v_tier,0),
    'role',coalesce(v_role,'anon'),'is_admin',v_role='admin','is_subscriber',v_ct in('subscriber','admin'),
    'entitlements',case v_ent when 'admin' then '["public","subscriber","premium","admin"]'::jsonb
      when 'subscriber' then '["public","subscriber"]'::jsonb else '["public"]'::jsonb end,
    'source_of_truth','users.role + profiles.tier (paid_subscribers עתידי)',
    'note','read-layer; אין מנויים מקבילים');
end
$function$;
