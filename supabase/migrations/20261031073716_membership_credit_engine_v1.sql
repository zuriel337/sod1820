-- Membership Credit Engine V1
--
-- Internal foundation only. All commercial plans and action prices are seeded
-- disabled. Applying this migration does not publish a plan, grant credits or
-- connect a product action to charging.

create table public.membership_plans (
  plan_code text primary key,
  display_name text not null,
  monthly_price_ils numeric(10,2) not null check (monthly_price_ils > 0),
  annual_price_ils numeric(10,2) not null check (annual_price_ils > 0),
  monthly_allowance integer not null check (monthly_allowance > 0),
  rollover_cap integer not null check (rollover_cap >= monthly_allowance),
  required_entitlement text not null default 'subscriber'
    check (required_entitlement in ('subscriber', 'admin')),
  active boolean not null default false,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not published or active)
);

create table public.credit_action_prices (
  action_key text primary key,
  display_name text not null,
  credit_cost integer not null check (credit_cost > 0),
  reservation_ttl_seconds integer not null default 900
    check (reservation_ttl_seconds between 60 and 86400),
  launch_state text not null default 'draft'
    check (launch_state in ('draft', 'preview', 'live')),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (active or launch_state = 'draft')
);

create table public.membership_credit_cycles (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_code text not null references public.membership_plans(plan_code),
  period_ref text not null check (length(period_ref) between 8 and 160),
  period_start timestamptz not null,
  period_end timestamptz not null,
  expires_at timestamptz not null,
  allowance_granted integer not null check (allowance_granted > 0),
  remaining_credits integer not null check (remaining_credits >= 0),
  used_credits integer not null default 0 check (used_credits >= 0),
  status text not null default 'active'
    check (status in ('active', 'expired', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period_ref),
  check (period_end > period_start),
  check (expires_at >= period_end),
  check (remaining_credits <= allowance_granted),
  check (used_credits <= allowance_granted)
);

create index membership_credit_cycles_owner_active_idx
  on public.membership_credit_cycles (user_id, expires_at, created_at)
  where status = 'active' and remaining_credits > 0;

create table public.credit_reservations (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action_key text not null references public.credit_action_prices(action_key),
  operation_ref text not null check (length(operation_ref) between 8 and 160),
  cost integer not null check (cost > 0),
  status text not null default 'reserved'
    check (status in ('reserved', 'settled', 'returned')),
  result_ref text,
  error_code text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  settled_at timestamptz,
  returned_at timestamptz,
  unique (user_id, action_key, operation_ref)
);

create index credit_reservations_expiry_idx
  on public.credit_reservations (expires_at, created_at)
  where status = 'reserved';

create table public.credit_reservation_allocations (
  reservation_id uuid not null references public.credit_reservations(id) on delete cascade,
  cycle_id uuid not null references public.membership_credit_cycles(id) on delete restrict,
  amount integer not null check (amount > 0),
  restored_amount integer not null default 0 check (restored_amount >= 0 and restored_amount <= amount),
  primary key (reservation_id, cycle_id)
);

alter table public.membership_plans enable row level security;
alter table public.credit_action_prices enable row level security;
alter table public.membership_credit_cycles enable row level security;
alter table public.credit_reservations enable row level security;
alter table public.credit_reservation_allocations enable row level security;

revoke all on table public.membership_plans from public, anon, authenticated;
revoke all on table public.credit_action_prices from public, anon, authenticated;
revoke all on table public.membership_credit_cycles from public, anon, authenticated;
revoke all on table public.credit_reservations from public, anon, authenticated;
revoke all on table public.credit_reservation_allocations from public, anon, authenticated;

grant select on table public.membership_credit_cycles to authenticated;
grant select on table public.credit_reservations to authenticated;

create policy membership_credit_cycles_owner_read_v1
  on public.membership_credit_cycles
  for select
  to authenticated
  using (user_id = auth.uid());

create policy credit_reservations_owner_read_v1
  on public.credit_reservations
  for select
  to authenticated
  using (user_id = auth.uid());

insert into public.membership_plans (
  plan_code, display_name, monthly_price_ils, annual_price_ils,
  monthly_allowance, rollover_cap
) values
  ('sod_personal', 'SOD אישי', 30.00, 300.00, 600, 1200),
  ('sod_research', 'SOD מחקר', 79.00, 790.00, 3000, 6000)
on conflict (plan_code) do nothing;

insert into public.credit_action_prices (
  action_key, display_name, credit_cost, reservation_ttl_seconds
) values
  ('ai_short', 'תשובת AI קצרה', 5, 900),
  ('raziel_fast', 'רזיאל מהיר', 15, 900),
  ('raziel_deep', 'רזיאל עמוק', 60, 1800),
  ('bounded_deep_module', 'מודול עומק תחום', 60, 1800),
  ('extended_report', 'דוח מורחב', 120, 3600),
  ('els_matrix_ai_reading', 'קריאת מטריצת צופן', 500, 7200)
on conflict (action_key) do nothing;

create or replace function public._membership_credit_require_service_v1()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
end;
$$;

create or replace function public._membership_credit_expire_for_user_v1(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_cycle record;
  v_balance integer;
  v_deduct integer;
  v_total integer := 0;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':membership-credit', 0));

  for v_cycle in
    select id, remaining_credits
    from public.membership_credit_cycles
    where user_id = p_user_id
      and status = 'active'
      and expires_at <= now()
    order by expires_at, created_at
    for update
  loop
    select credits into v_balance
    from public.profiles
    where user_id = p_user_id
    for update;

    if v_balance is null then
      raise exception 'credit_profile_missing' using errcode = 'P0001';
    end if;

    v_deduct := least(v_cycle.remaining_credits, greatest(v_balance, 0));

    update public.membership_credit_cycles
    set remaining_credits = 0,
        status = 'expired',
        updated_at = now()
    where id = v_cycle.id;

    if v_deduct > 0 then
      perform public.credit_grant(
        p_user_id,
        -v_deduct,
        'membership_expiry',
        jsonb_build_object('cycle_id', v_cycle.id, 'engine', 'membership_credit_v1')
      );
      v_total := v_total + v_deduct;
    end if;
  end loop;

  return v_total;
end;
$$;

create or replace function public.membership_credit_cycle_grant_v1(
  p_user_id uuid,
  p_plan_code text,
  p_period_ref text,
  p_period_start timestamptz,
  p_period_end timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_plan public.membership_plans%rowtype;
  v_existing public.membership_credit_cycles%rowtype;
  v_cycle public.membership_credit_cycles%rowtype;
  v_old record;
  v_overflow integer;
  v_trim integer;
  v_trimmed integer := 0;
begin
  perform public._membership_credit_require_service_v1();

  if p_user_id is null or p_period_ref is null
     or length(p_period_ref) not between 8 and 160 then
    raise exception 'invalid_grant_request' using errcode = '22023';
  end if;
  if p_period_end <= p_period_start
     or p_period_end - p_period_start not between interval '20 days' and interval '35 days' then
    raise exception 'monthly_cycle_required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':membership-credit', 0));

  select * into v_existing
  from public.membership_credit_cycles
  where user_id = p_user_id and period_ref = p_period_ref
  for update;

  if found then
    if v_existing.plan_code <> p_plan_code
       or v_existing.period_start <> p_period_start
       or v_existing.period_end <> p_period_end then
      raise exception 'period_ref_conflict' using errcode = '23505';
    end if;
    return jsonb_build_object(
      'cycle_id', v_existing.id,
      'already', true,
      'allowance', v_existing.allowance_granted
    );
  end if;

  select * into v_plan
  from public.membership_plans
  where plan_code = p_plan_code and active = true
  for share;

  if not found then
    raise exception 'plan_not_active' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.profiles where user_id = p_user_id) then
    raise exception 'credit_profile_missing' using errcode = 'P0001';
  end if;

  perform public._membership_credit_expire_for_user_v1(p_user_id);

  select greatest(
    coalesce(sum(remaining_credits), 0) + v_plan.monthly_allowance - v_plan.rollover_cap,
    0
  )::integer
  into v_overflow
  from public.membership_credit_cycles
  where user_id = p_user_id and status = 'active' and expires_at > now();

  for v_old in
    select id, remaining_credits
    from public.membership_credit_cycles
    where user_id = p_user_id
      and status = 'active'
      and expires_at > now()
      and remaining_credits > 0
    order by expires_at, created_at
    for update
  loop
    exit when v_overflow <= 0;
    v_trim := least(v_old.remaining_credits, v_overflow);
    update public.membership_credit_cycles
    set remaining_credits = remaining_credits - v_trim,
        status = case when remaining_credits - v_trim = 0 then 'expired' else status end,
        updated_at = now()
    where id = v_old.id;
    v_overflow := v_overflow - v_trim;
    v_trimmed := v_trimmed + v_trim;
  end loop;

  if v_trimmed > 0 then
    perform public.credit_grant(
      p_user_id,
      -v_trimmed,
      'membership_rollover_cap',
      jsonb_build_object('plan_code', p_plan_code, 'engine', 'membership_credit_v1')
    );
  end if;

  insert into public.membership_credit_cycles (
    user_id, plan_code, period_ref, period_start, period_end, expires_at,
    allowance_granted, remaining_credits
  ) values (
    p_user_id, p_plan_code, p_period_ref, p_period_start, p_period_end,
    p_period_end + interval '1 month',
    v_plan.monthly_allowance, v_plan.monthly_allowance
  )
  returning * into v_cycle;

  perform public.credit_grant(
    p_user_id,
    v_plan.monthly_allowance,
    'membership_allowance',
    jsonb_build_object(
      'cycle_id', v_cycle.id,
      'plan_code', p_plan_code,
      'period_ref', p_period_ref,
      'engine', 'membership_credit_v1'
    )
  );

  return jsonb_build_object(
    'cycle_id', v_cycle.id,
    'already', false,
    'allowance', v_cycle.allowance_granted,
    'trimmed_for_cap', v_trimmed
  );
end;
$$;

create or replace function public.credit_reserve_v1(
  p_action_key text,
  p_operation_ref text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_action public.credit_action_prices%rowtype;
  v_existing public.credit_reservations%rowtype;
  v_reservation public.credit_reservations%rowtype;
  v_cycle record;
  v_balance integer;
  v_to_allocate integer;
  v_part integer;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_operation_ref is null or length(p_operation_ref) not between 8 and 160 then
    raise exception 'invalid_operation_ref' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_user_id::text || ':' || coalesce(p_action_key, '') || ':' || p_operation_ref, 0)
  );

  select * into v_existing
  from public.credit_reservations
  where user_id = v_user_id
    and action_key = p_action_key
    and operation_ref = p_operation_ref
  for update;

  if found then
    return jsonb_build_object(
      'reservation_id', v_existing.id,
      'status', v_existing.status,
      'cost', v_existing.cost,
      'already', true,
      'balance', (select credits from public.profiles where user_id = v_user_id)
    );
  end if;

  select * into v_action
  from public.credit_action_prices
  where action_key = p_action_key
    and active = true
    and launch_state in ('preview', 'live')
  for share;

  if not found then
    raise exception 'action_not_active' using errcode = 'P0001';
  end if;

  perform public._membership_credit_expire_for_user_v1(v_user_id);

  select credits into v_balance
  from public.profiles
  where user_id = v_user_id
  for update;

  if v_balance is null then
    raise exception 'credit_profile_missing' using errcode = 'P0001';
  end if;
  if v_balance < v_action.credit_cost then
    raise exception 'insufficient_credits' using errcode = 'P0001';
  end if;

  insert into public.credit_reservations (
    user_id, action_key, operation_ref, cost, expires_at
  ) values (
    v_user_id, v_action.action_key, p_operation_ref, v_action.credit_cost,
    now() + make_interval(secs => v_action.reservation_ttl_seconds)
  )
  returning * into v_reservation;

  v_to_allocate := v_action.credit_cost;
  for v_cycle in
    select id, remaining_credits
    from public.membership_credit_cycles
    where user_id = v_user_id
      and status = 'active'
      and expires_at > now()
      and remaining_credits > 0
    order by expires_at, created_at
    for update
  loop
    exit when v_to_allocate <= 0;
    v_part := least(v_cycle.remaining_credits, v_to_allocate);
    update public.membership_credit_cycles
    set remaining_credits = remaining_credits - v_part,
        used_credits = used_credits + v_part,
        updated_at = now()
    where id = v_cycle.id;
    insert into public.credit_reservation_allocations (reservation_id, cycle_id, amount)
    values (v_reservation.id, v_cycle.id, v_part);
    v_to_allocate := v_to_allocate - v_part;
  end loop;

  perform public.credit_grant(
    v_user_id,
    -v_action.credit_cost,
    'credit_reserve',
    jsonb_build_object(
      'reservation_id', v_reservation.id,
      'action_key', v_action.action_key,
      'operation_ref', p_operation_ref,
      'engine', 'membership_credit_v1'
    )
  );

  return jsonb_build_object(
    'reservation_id', v_reservation.id,
    'status', 'reserved',
    'cost', v_action.credit_cost,
    'already', false,
    'balance', v_balance - v_action.credit_cost
  );
end;
$$;

create or replace function public.credit_settle_v1(
  p_reservation_id uuid,
  p_result_ref text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_reservation public.credit_reservations%rowtype;
begin
  perform public._membership_credit_require_service_v1();

  select * into v_reservation
  from public.credit_reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'reservation_not_found' using errcode = 'P0001';
  end if;
  if v_reservation.status = 'settled' then
    return jsonb_build_object('reservation_id', v_reservation.id, 'status', 'settled', 'already', true);
  end if;
  if v_reservation.status <> 'reserved' then
    raise exception 'reservation_not_settleable' using errcode = 'P0001';
  end if;

  update public.credit_reservations
  set status = 'settled',
      result_ref = nullif(p_result_ref, ''),
      settled_at = now(),
      updated_at = now()
  where id = v_reservation.id;

  return jsonb_build_object('reservation_id', v_reservation.id, 'status', 'settled', 'already', false);
end;
$$;

create or replace function public.credit_return_v1(
  p_reservation_id uuid,
  p_error_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_reservation public.credit_reservations%rowtype;
  v_allocation record;
  v_allocated integer;
  v_refund integer;
begin
  perform public._membership_credit_require_service_v1();

  select * into v_reservation
  from public.credit_reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'reservation_not_found' using errcode = 'P0001';
  end if;
  if v_reservation.status = 'returned' then
    return jsonb_build_object('reservation_id', v_reservation.id, 'status', 'returned', 'already', true);
  end if;
  if v_reservation.status <> 'reserved' then
    raise exception 'reservation_not_returnable' using errcode = 'P0001';
  end if;

  -- Keep profile and cycle mutations in the same per-user lock order used by
  -- grant, reserve and expiry paths. This avoids profile/cycle lock inversion
  -- when a return races another operation for the same member.
  perform pg_advisory_xact_lock(
    hashtextextended(v_reservation.user_id::text || ':membership-credit', 0)
  );

  select coalesce(sum(amount), 0)::integer
  into v_allocated
  from public.credit_reservation_allocations
  where reservation_id = v_reservation.id;

  -- Credits not backed by a membership cycle are general balance and remain
  -- refundable. Cycle-backed credits are refundable only while that source
  -- cycle is still valid; otherwise a late failure could revive expired
  -- membership allowance as permanent general credit.
  v_refund := greatest(v_reservation.cost - v_allocated, 0);

  for v_allocation in
    select a.cycle_id, a.amount, c.status, c.expires_at
    from public.credit_reservation_allocations a
    join public.membership_credit_cycles c on c.id = a.cycle_id
    where a.reservation_id = v_reservation.id
    order by c.expires_at, c.created_at
    for update of a, c
  loop
    if v_allocation.status = 'active' and v_allocation.expires_at > now() then
      update public.membership_credit_cycles
      set remaining_credits = remaining_credits + v_allocation.amount,
          used_credits = greatest(used_credits - v_allocation.amount, 0),
          updated_at = now()
      where id = v_allocation.cycle_id;
      update public.credit_reservation_allocations
      set restored_amount = v_allocation.amount
      where reservation_id = v_reservation.id and cycle_id = v_allocation.cycle_id;
      v_refund := v_refund + v_allocation.amount;
    end if;
  end loop;

  if v_refund > 0 then
    perform public.credit_grant(
      v_reservation.user_id,
      v_refund,
      'credit_return',
      jsonb_build_object(
        'reservation_id', v_reservation.id,
        'action_key', v_reservation.action_key,
        'error_code', nullif(p_error_code, ''),
        'engine', 'membership_credit_v1'
      )
    );
  end if;

  update public.credit_reservations
  set status = 'returned',
      error_code = nullif(p_error_code, ''),
      returned_at = now(),
      updated_at = now()
  where id = v_reservation.id;

  return jsonb_build_object(
    'reservation_id', v_reservation.id,
    'status', 'returned',
    'already', false,
    'refunded', v_refund
  );
end;
$$;

create or replace function public.credit_release_expired_v1(p_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_reservation record;
  v_count integer := 0;
begin
  perform public._membership_credit_require_service_v1();
  if p_limit not between 1 and 1000 then
    raise exception 'invalid_limit' using errcode = '22023';
  end if;

  for v_reservation in
    select id
    from public.credit_reservations
    where status = 'reserved' and expires_at <= now()
    order by expires_at, created_at
    limit p_limit
    for update skip locked
  loop
    perform public.credit_return_v1(v_reservation.id, 'reservation_expired');
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('returned', v_count);
end;
$$;

create or replace function public.membership_credit_summary_v1()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_balance integer;
  v_cycle record;
  v_included_remaining integer;
  v_reserved integer;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  perform public._membership_credit_expire_for_user_v1(v_user_id);

  select credits into v_balance from public.profiles where user_id = v_user_id;
  if v_balance is null then
    raise exception 'credit_profile_missing' using errcode = 'P0001';
  end if;

  select c.plan_code, p.display_name, c.allowance_granted, c.used_credits,
         c.period_start, c.period_end
  into v_cycle
  from public.membership_credit_cycles c
  join public.membership_plans p on p.plan_code = c.plan_code
  where c.user_id = v_user_id
    and c.status = 'active'
    and c.period_start <= now()
    and c.period_end > now()
  order by c.period_start desc
  limit 1;

  select coalesce(sum(remaining_credits), 0)::integer
  into v_included_remaining
  from public.membership_credit_cycles
  where user_id = v_user_id and status = 'active' and expires_at > now();

  select coalesce(sum(cost), 0)::integer
  into v_reserved
  from public.credit_reservations
  where user_id = v_user_id and status = 'reserved' and expires_at > now();

  return jsonb_build_object(
    'balance', v_balance,
    'included_remaining', v_included_remaining,
    'reserved', v_reserved,
    'plan_code', v_cycle.plan_code,
    'plan_name', v_cycle.display_name,
    'monthly_allowance', v_cycle.allowance_granted,
    'used_this_cycle', v_cycle.used_credits,
    'period_start', v_cycle.period_start,
    'period_end', v_cycle.period_end
  );
end;
$$;

revoke all on function public._membership_credit_require_service_v1() from public, anon, authenticated;
revoke all on function public._membership_credit_expire_for_user_v1(uuid) from public, anon, authenticated;
revoke all on function public.membership_credit_cycle_grant_v1(uuid,text,text,timestamptz,timestamptz) from public, anon, authenticated;
revoke all on function public.credit_reserve_v1(text,text) from public, anon, authenticated;
revoke all on function public.credit_settle_v1(uuid,text) from public, anon, authenticated;
revoke all on function public.credit_return_v1(uuid,text) from public, anon, authenticated;
revoke all on function public.credit_release_expired_v1(integer) from public, anon, authenticated;
revoke all on function public.membership_credit_summary_v1() from public, anon, authenticated;

grant execute on function public.membership_credit_cycle_grant_v1(uuid,text,text,timestamptz,timestamptz) to service_role;
grant execute on function public.credit_settle_v1(uuid,text) to service_role;
grant execute on function public.credit_return_v1(uuid,text) to service_role;
grant execute on function public.credit_release_expired_v1(integer) to service_role;
grant execute on function public.credit_reserve_v1(text,text) to authenticated;
grant execute on function public.membership_credit_summary_v1() to authenticated;
