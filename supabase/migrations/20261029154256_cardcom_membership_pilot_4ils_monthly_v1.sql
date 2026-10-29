-- Admin-only Cardcom monthly membership pilot: ILS 4 now and every month.
-- This upgrade intentionally refuses to change economics while any pilot row exists.

begin;

lock table public.membership_subscription_pilots in access exclusive mode;
lock table public.membership_subscription_pilot_charges in access exclusive mode;

do $$
begin
  if exists (select 1 from public.membership_subscription_pilots) then
    raise exception 'cardcom 4 ILS pilot upgrade requires an empty pilot table';
  end if;
  if exists (select 1 from public.membership_subscription_pilot_charges) then
    raise exception 'cardcom 4 ILS pilot upgrade requires an empty charge table';
  end if;
end
$$;

alter table public.membership_subscription_pilots
  drop constraint membership_subscription_pilots_amount_ils_check,
  alter column amount_ils set default 4.00,
  add constraint membership_subscription_pilots_amount_ils_check check (amount_ils = 4.00);

alter table public.membership_subscription_pilot_charges
  drop constraint membership_subscription_pilot_charges_amount_ils_check,
  add constraint membership_subscription_pilot_charges_amount_ils_check check (amount_ils = 4.00);

comment on table public.membership_subscription_pilots is
  'Admin-only ILS 4 monthly Cardcom token-billing pilot. Not a public membership product.';

create or replace function public.membership_pilot_register(
  p_bridge_secret text,
  p_user_id uuid,
  p_provider_ref text,
  p_low_profile_id text,
  p_billing_name text,
  p_billing_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','private','extensions'
as $$
declare
  v_hash constant text := 'b9b2b927e7c1337b8cc9ef33693eb1d9f58da14cd9ac21bc8ab8ad70dc1264ea';
  v_id uuid;
begin
  if encode(extensions.digest(convert_to(coalesce(p_bridge_secret,''), 'UTF8'), 'sha256'), 'hex') <> v_hash then
    raise exception 'forbidden';
  end if;
  if not exists (select 1 from public.users where id = p_user_id and role = 'admin') then
    raise exception 'admin_only';
  end if;
  if p_provider_ref !~ '^SODM-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'bad_provider_ref';
  end if;
  if p_low_profile_id is null or btrim(p_low_profile_id) = '' or length(p_low_profile_id) > 120 then
    raise exception 'bad_low_profile_id';
  end if;

  insert into public.membership_subscription_pilots(
    user_id, provider_ref, cardcom_low_profile_id
  ) values (
    p_user_id, p_provider_ref, btrim(p_low_profile_id)
  ) returning id into v_id;

  insert into private.cardcom_subscription_credentials(
    subscription_id, billing_name, billing_email
  ) values (
    v_id,
    left(coalesce(nullif(btrim(p_billing_name),''), 'SOD1820 member'), 120),
    nullif(left(btrim(coalesce(p_billing_email,'')), 254), '')
  );

  insert into public.membership_subscription_pilot_charges(
    subscription_id, external_uniq_tran_id, kind, amount_ils, status
  ) values (v_id, p_provider_ref, 'initial', 4.00, 'pending');

  return jsonb_build_object('subscription_id', v_id, 'provider_ref', p_provider_ref, 'status', 'pending');
end
$$;

create or replace function public.membership_pilot_claim_due(
  p_bridge_secret text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','private','extensions'
as $$
declare
  v_hash constant text := 'b9b2b927e7c1337b8cc9ef33693eb1d9f58da14cd9ac21bc8ab8ad70dc1264ea';
  v_row public.membership_subscription_pilots%rowtype;
  v_creds private.cardcom_subscription_credentials%rowtype;
  v_external text;
begin
  if encode(extensions.digest(convert_to(coalesce(p_bridge_secret,''), 'UTF8'), 'sha256'), 'hex') <> v_hash then
    raise exception 'forbidden';
  end if;

  update public.membership_subscription_pilots
  set status = 'cancelled', next_charge_at = null, updated_at = now()
  where status in ('active','past_due') and cancel_at_period_end and next_charge_at <= now();

  select * into v_row
  from public.membership_subscription_pilots
  where (
      (status = 'active' and not cancel_at_period_end and next_charge_at <= now())
      or (status = 'renewing' and updated_at < now() - interval '30 minutes')
    )
  order by next_charge_at, created_at
  for update skip locked
  limit 1;
  if not found then return jsonb_build_object('found', false); end if;

  v_external := 'M' || substr(replace(v_row.id::text,'-',''),1,12)
    || to_char(v_row.next_charge_at at time zone 'UTC','YYMMDDHH24MI');

  insert into public.membership_subscription_pilot_charges(
    subscription_id, external_uniq_tran_id, kind, amount_ils, status
  ) values (v_row.id, v_external, 'renewal', 4.00, 'pending')
  on conflict (external_uniq_tran_id) do nothing;

  update public.membership_subscription_pilots
  set status = 'renewing', updated_at = now()
  where id = v_row.id;

  select * into v_creds from private.cardcom_subscription_credentials
  where subscription_id = v_row.id;
  if v_creds.token_ciphertext is null then raise exception 'missing_token'; end if;

  return jsonb_build_object(
    'found', true,
    'subscription_id', v_row.id,
    'external_uniq_tran_id', v_external,
    'amount_ils', v_row.amount_ils,
    'token_ciphertext', v_creds.token_ciphertext,
    'token_iv', v_creds.token_iv,
    'token_tag', v_creds.token_tag,
    'expiration_mmyy', v_creds.expiration_mmyy,
    'billing_name', v_creds.billing_name,
    'billing_email', v_creds.billing_email
  );
end
$$;

commit;
