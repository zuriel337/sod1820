-- מעגל הסוד v1
-- Referral attribution is recorded at signup, but rewards are created only from a
-- verified paid-subscription event. Subscription checkout will call the service-only
-- process_referral_payment RPC once its canonical payment webhook is connected.

alter table public.referrals
  add column if not exists status text not null default 'pending',
  add column if not exists qualified_at timestamptz,
  add column if not exists billing_cycle text,
  add column if not exists first_payment_ref text,
  add column if not exists inviter_reward_ils numeric(10,2) not null default 0,
  add column if not exists invitee_bonus_points integer not null default 0,
  add column if not exists cancelled_at timestamptz;

alter table public.referrals drop constraint if exists referrals_status_check;
alter table public.referrals
  add constraint referrals_status_check
  check (status in ('pending','qualified','cancelled'));

alter table public.referrals drop constraint if exists referrals_billing_cycle_check;
alter table public.referrals
  add constraint referrals_billing_cycle_check
  check (billing_cycle is null or billing_cycle in ('monthly','annual'));

create unique index if not exists referrals_first_payment_ref_uidx
  on public.referrals(first_payment_ref)
  where first_payment_ref is not null;

create table if not exists public.referral_payment_events (
  id uuid primary key default gen_random_uuid(),
  referral_id bigint references public.referrals(id) on delete set null,
  invitee_id uuid references public.users(id) on delete set null,
  payment_ref text not null unique,
  net_amount_ils numeric(10,2) not null check (net_amount_ils > 0),
  billing_cycle text not null check (billing_cycle in ('monthly','annual')),
  paid_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referral_id bigint references public.referrals(id) on delete set null,
  beneficiary_id uuid references public.users(id) on delete set null,
  reward_type text not null check (reward_type in ('invitee_points','site_credit','affiliate_commission')),
  amount numeric(10,2) not null check (amount > 0),
  unit text not null check (unit in ('points','ils')),
  status text not null default 'pending' check (status in ('pending','available','redeemed','paid','void')),
  source_payment_ref text not null,
  available_at timestamptz not null,
  settled_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (beneficiary_id, reward_type, source_payment_ref)
);

create table if not exists public.affiliate_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','suspended','rejected')),
  rate_bps integer not null default 2000 check (rate_bps between 0 and 3000),
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  reviewed_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists referral_rewards_beneficiary_created_idx
  on public.referral_rewards(beneficiary_id, created_at desc);
create index if not exists referral_rewards_referral_idx
  on public.referral_rewards(referral_id);
create index if not exists referral_payment_events_referral_paid_idx
  on public.referral_payment_events(referral_id, paid_at desc);
create index if not exists referral_payment_events_invitee_idx
  on public.referral_payment_events(invitee_id);
create index if not exists affiliate_profiles_reviewed_by_idx
  on public.affiliate_profiles(reviewed_by)
  where reviewed_by is not null;
create index if not exists referrals_inviter_status_idx
  on public.referrals(inviter_id, status);

alter table public.referrals enable row level security;
alter table public.referral_payment_events enable row level security;
alter table public.referral_rewards enable row level security;
alter table public.affiliate_profiles enable row level security;

revoke all on table public.referrals from anon, authenticated;
revoke all on table public.referral_payment_events from anon, authenticated;
revoke all on table public.referral_rewards from anon, authenticated;
revoke all on table public.affiliate_profiles from anon, authenticated;

comment on table public.referral_rewards is
  'מעגל הסוד: הטבות הפניה נפרדות מספר הקרדיטים הקנוני. points מוזרמים ל-credit_ledger; ILS נשאר זיכוי/עמלה עד סליקה.';
comment on function public.award_referral(uuid,text) is
  'DEPRECATED by referral_circle_v1: newsletter signup alone must never award a paid-member referral benefit.';

-- Capture first-touch account attribution. No economic reward is granted here.
create or replace function public.record_referral(p_ref uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_created timestamptz;
  v_referral public.referrals%rowtype;
begin
  if v_uid is null or p_ref is null or p_ref = v_uid then
    return jsonb_build_object('ok',false,'error','invalid_ref');
  end if;

  select * into v_referral
  from public.referrals
  where invitee_id = v_uid;

  if found then
    return jsonb_build_object('ok',true,'already',true,'status',v_referral.status);
  end if;

  select created_at into v_created from auth.users where id = v_uid;
  if v_created is null or v_created < now() - interval '3 days' then
    return jsonb_build_object('ok',false,'error','not_new');
  end if;
  if not exists (select 1 from public.users where id = p_ref) then
    return jsonb_build_object('ok',false,'error','bad_ref');
  end if;

  insert into public.referrals(inviter_id, invitee_id, status)
  values (p_ref, v_uid, 'pending')
  on conflict (invitee_id) do nothing;

  return jsonb_build_object('ok',true,'recorded',true,'status','pending');
end;
$$;

-- Called only by the verified subscription-payment webhook/backend.
-- One payment_ref can be processed once. System retries never duplicate rewards.
create or replace function public.process_referral_payment(
  p_invitee uuid,
  p_payment_ref text,
  p_net_amount_ils numeric,
  p_billing_cycle text,
  p_paid_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ref public.referrals%rowtype;
  v_event_id uuid;
  v_first_payment boolean;
  v_affiliate public.affiliate_profiles%rowtype;
  v_reward numeric(10,2);
  v_commission numeric(10,2);
begin
  if p_invitee is null
     or nullif(btrim(coalesce(p_payment_ref,'')),'') is null
     or p_net_amount_ils is null or p_net_amount_ils <= 0
     or p_billing_cycle not in ('monthly','annual') then
    return jsonb_build_object('ok',false,'error','invalid_payment');
  end if;

  select * into v_ref
  from public.referrals
  where invitee_id = p_invitee
  for update;

  if not found or v_ref.status = 'cancelled' then
    return jsonb_build_object('ok',true,'referral',false);
  end if;

  insert into public.referral_payment_events(
    referral_id, invitee_id, payment_ref, net_amount_ils, billing_cycle, paid_at
  ) values (
    v_ref.id, p_invitee, btrim(p_payment_ref), round(p_net_amount_ils,2), p_billing_cycle, p_paid_at
  )
  on conflict (payment_ref) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    return jsonb_build_object('ok',true,'already',true);
  end if;

  v_first_payment := v_ref.status = 'pending';

  select * into v_affiliate
  from public.affiliate_profiles
  where user_id = v_ref.inviter_id and status = 'approved';

  if v_first_payment then
    perform public.grant_credits(
      p_invitee,
      20,
      'referral_welcome_paid',
      jsonb_build_object('referral_id',v_ref.id,'payment_ref',btrim(p_payment_ref))
    );

    insert into public.referral_rewards(
      referral_id, beneficiary_id, reward_type, amount, unit, status,
      source_payment_ref, available_at, meta
    ) values (
      v_ref.id, p_invitee, 'invitee_points', 20, 'points', 'available',
      btrim(p_payment_ref), p_paid_at,
      jsonb_build_object('billing_cycle',p_billing_cycle)
    );

    if v_affiliate.user_id is null then
      v_reward := case when p_billing_cycle = 'annual' then 50 else 15 end;
      insert into public.referral_rewards(
        referral_id, beneficiary_id, reward_type, amount, unit, status,
        source_payment_ref, available_at, meta
      ) values (
        v_ref.id, v_ref.inviter_id, 'site_credit', v_reward, 'ils', 'pending',
        btrim(p_payment_ref), p_paid_at + interval '30 days',
        jsonb_build_object('billing_cycle',p_billing_cycle)
      );
    end if;

    update public.referrals
    set status = 'qualified', qualified_at = p_paid_at,
        billing_cycle = p_billing_cycle, first_payment_ref = btrim(p_payment_ref),
        inviter_reward_ils = coalesce(v_reward,0), invitee_bonus_points = 20
    where id = v_ref.id;
  end if;

  if v_affiliate.user_id is not null
     and p_paid_at < v_ref.created_at + interval '12 months' then
    v_commission := round(p_net_amount_ils * v_affiliate.rate_bps / 10000.0, 2);
    if v_commission > 0 then
      insert into public.referral_rewards(
        referral_id, beneficiary_id, reward_type, amount, unit, status,
        source_payment_ref, available_at, meta
      ) values (
        v_ref.id, v_ref.inviter_id, 'affiliate_commission', v_commission, 'ils', 'pending',
        btrim(p_payment_ref), p_paid_at + interval '30 days',
        jsonb_build_object('rate_bps',v_affiliate.rate_bps,'net_amount_ils',round(p_net_amount_ils,2))
      );
    end if;
  end if;

  return jsonb_build_object(
    'ok',true,
    'qualified',v_first_payment,
    'invitee_points',case when v_first_payment then 20 else 0 end,
    'site_credit_ils',coalesce(v_reward,0),
    'affiliate_commission_ils',coalesce(v_commission,0)
  );
end;
$$;

create or replace function public.my_referral_stats()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with mine as (
    select * from public.referrals where inviter_id = auth.uid()
  ), rewards as (
    select rr.*
    from public.referral_rewards rr
    where rr.beneficiary_id = auth.uid()
  ), affiliate as (
    select status from public.affiliate_profiles where user_id = auth.uid()
  )
  select jsonb_build_object(
    'invited', (select count(*) from mine),
    'pending', (select count(*) from mine where status = 'pending'),
    'paid', (select count(*) from mine where status = 'qualified'),
    'wallet_available_ils', coalesce((select sum(amount) from rewards where reward_type='site_credit' and status not in ('redeemed','paid','void') and available_at <= now()),0),
    'wallet_pending_ils', coalesce((select sum(amount) from rewards where reward_type='site_credit' and status='pending' and available_at > now()),0),
    'affiliate_available_ils', coalesce((select sum(amount) from rewards where reward_type='affiliate_commission' and status not in ('redeemed','paid','void') and available_at <= now()),0),
    'affiliate_pending_ils', coalesce((select sum(amount) from rewards where reward_type='affiliate_commission' and status='pending' and available_at > now()),0),
    'affiliate_status', (select status from affiliate),
    'affiliate_eligible', (select count(*) from mine where status='qualified') >= 3
  );
$$;

create or replace function public.request_affiliate_enrollment()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_paid bigint;
  v_status text;
begin
  if v_uid is null then return jsonb_build_object('ok',false,'error','auth_required'); end if;
  select count(*) into v_paid from public.referrals where inviter_id=v_uid and status='qualified';
  if v_paid < 3 then return jsonb_build_object('ok',false,'error','not_eligible','paid',v_paid,'required',3); end if;

  insert into public.affiliate_profiles(user_id,status)
  values (v_uid,'pending')
  on conflict (user_id) do nothing;
  select status into v_status from public.affiliate_profiles where user_id=v_uid;
  return jsonb_build_object('ok',true,'status',v_status);
end;
$$;

revoke all on function public.record_referral(uuid) from public, anon;
grant execute on function public.record_referral(uuid) to authenticated;

revoke all on function public.my_referral_stats() from public, anon;
grant execute on function public.my_referral_stats() to authenticated;

revoke all on function public.request_affiliate_enrollment() from public, anon;
grant execute on function public.request_affiliate_enrollment() to authenticated;

revoke all on function public.process_referral_payment(uuid,text,numeric,text,timestamptz) from public, anon, authenticated;
grant execute on function public.process_referral_payment(uuid,text,numeric,text,timestamptz) to service_role;

revoke all on function public.award_referral(uuid,text) from public, anon, authenticated;
