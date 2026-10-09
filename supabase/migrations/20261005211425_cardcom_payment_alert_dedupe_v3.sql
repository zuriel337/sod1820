-- CardCom bridge alert dedupe v3
-- Prevent repeated provider/webhook anomaly notifications from flooding admin channels.

begin;

alter table public.payment_requests
  add column if not exists cardcom_alerted_at timestamptz;

comment on column public.payment_requests.cardcom_alerted_at is
  'Last bounded CardCom anomaly notification time; operational dedupe only.';

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
  v_pr public.payment_requests%rowtype;
  v_hash constant text := 'b9b2b927e7c1337b8cc9ef33693eb1d9f58da14cd9ac21bc8ab8ad70dc1264ea';
begin
  if encode(extensions.digest(convert_to(coalesce(p_bridge_secret,''), 'UTF8'), 'sha256'), 'hex') <> v_hash then
    raise exception 'forbidden';
  end if;

  select * into v_pr
  from public.payment_requests
  where method='cardcom'
    and cardcom_low_profile_id=btrim(coalesce(p_low_profile_id,''))
  for update;

  if not found then
    return jsonb_build_object('alerted', false, 'reason', 'unknown_low_profile');
  end if;

  if v_pr.cardcom_alerted_at is not null
     and v_pr.cardcom_alerted_at > now() - interval '15 minutes'
  then
    return jsonb_build_object('alerted', false, 'reason', 'deduped');
  end if;

  update public.payment_requests
  set cardcom_alerted_at = now()
  where id = v_pr.id;

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
