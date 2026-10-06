-- CardCom production bridge hardening v2
-- Add bounded lookup/rate/alert primitives around the already-applied v1 bridge.
-- No pricing, package, entitlement or credit-ledger semantics change.

begin;

create or replace function public.cardcom_purchase_webhook_lookup(
  p_bridge_secret text,
  p_low_profile_id text
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','extensions'
as $$
declare
  v_pr public.payment_requests%rowtype;
  v_hash constant text := 'b9b2b927e7c1337b8cc9ef33693eb1d9f58da14cd9ac21bc8ab8ad70dc1264ea';
begin
  if encode(extensions.digest(convert_to(coalesce(p_bridge_secret,''), 'UTF8'), 'sha256'), 'hex') <> v_hash then
    raise exception 'forbidden';
  end if;
  if p_low_profile_id is null or btrim(p_low_profile_id) = '' or length(p_low_profile_id) > 120 then
    return jsonb_build_object('known', false);
  end if;

  select * into v_pr
  from public.payment_requests
  where method='cardcom'
    and cardcom_low_profile_id=btrim(p_low_profile_id)
  limit 1;

  if not found then
    return jsonb_build_object('known', false);
  end if;

  return jsonb_build_object(
    'known', true,
    'request_id', v_pr.id,
    'provider_ref', v_pr.provider_ref,
    'status', v_pr.status
  );
end
$$;

revoke all on function public.cardcom_purchase_webhook_lookup(text,text) from public, authenticated;
grant execute on function public.cardcom_purchase_webhook_lookup(text,text) to anon, service_role;

create or replace function public.cardcom_purchase_start_guard(
  p_bridge_secret text,
  p_user_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','extensions'
as $$
declare
  v_recent integer;
  v_hash constant text := 'b9b2b927e7c1337b8cc9ef33693eb1d9f58da14cd9ac21bc8ab8ad70dc1264ea';
begin
  if encode(extensions.digest(convert_to(coalesce(p_bridge_secret,''), 'UTF8'), 'sha256'), 'hex') <> v_hash then
    raise exception 'forbidden';
  end if;
  if p_user_id is null then raise exception 'bad_user'; end if;

  select count(*)::integer into v_recent
  from public.payment_requests
  where user_id=p_user_id
    and method='cardcom'
    and created_at > now() - interval '10 minutes';

  return jsonb_build_object(
    'allowed', v_recent < 8,
    'recent_count', v_recent,
    'window_minutes', 10
  );
end
$$;

revoke all on function public.cardcom_purchase_start_guard(text,uuid) from public, authenticated;
grant execute on function public.cardcom_purchase_start_guard(text,uuid) to anon, service_role;

create or replace function public.cardcom_purchase_alert(
  p_bridge_secret text,
  p_low_profile_id text,
  p_provider_ref text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','extensions'
as $$
declare
  v_reason text := left(regexp_replace(coalesce(p_reason,'unknown'), '[[:cntrl:]]', ' ', 'g'), 160);
  v_ref text := left(coalesce(p_provider_ref,'—'), 80);
  v_lp text := left(coalesce(p_low_profile_id,'—'), 120);
  v_hash constant text := 'b9b2b927e7c1337b8cc9ef33693eb1d9f58da14cd9ac21bc8ab8ad70dc1264ea';
begin
  if encode(extensions.digest(convert_to(coalesce(p_bridge_secret,''), 'UTF8'), 'sha256'), 'hex') <> v_hash then
    raise exception 'forbidden';
  end if;

  begin
    perform public.notify_admin(
      concat_ws(E'\n',
        '⚠️ CardCom — נדרש אימות עסקה ידני',
        'סיבה: ' || v_reason,
        'Reference: ' || v_ref,
        'LowProfile: ' || v_lp,
        'לא לזכות קרדיטים ידנית לפני בדיקת העסקה בקארדקום.'
      ),
      null
    );
  exception when others then
    null;
  end;

  return jsonb_build_object('alerted', true);
end
$$;

revoke all on function public.cardcom_purchase_alert(text,text,text,text) from public, authenticated;
grant execute on function public.cardcom_purchase_alert(text,text,text,text) to anon, service_role;

commit;
