-- Owner-only credit pilot. Offline acceptance prerequisite, NOT activation.
-- Extend the existing private price catalogue; no wallet, new grant or public flag.
-- NULL/FALSE denies every reservation, including direct authenticated RPC calls.
-- Keep return/settle/expiry available to the existing service for prior obligations.
-- Rollback: set pilot_enabled=false for raziel_fast; do NOT drop financial records.
begin;
alter table public.credit_action_prices
  add column if not exists pilot_user_id uuid,
  add column if not exists pilot_enabled boolean not null default false;

do $$ begin
  if not exists (select 1 from pg_constraint where conrelid='public.credit_action_prices'::regclass
    and conname='credit_action_owner_pilot_scope_v1') then
    alter table public.credit_action_prices add constraint credit_action_owner_pilot_scope_v1
      check ((pilot_user_id is null and not pilot_enabled) or
        (action_key='raziel_fast' and pilot_user_id='36f5cb84-71c3-4977-a2c7-d6413e973443'::uuid));
  end if;
end $$;

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

  -- Hold the catalogue row until commit. Turning the pilot off serializes
  -- with in-flight reservations; after that change commits, no new debit starts.
  select * into v_action
  from public.credit_action_prices
  where action_key = p_action_key
  for share;

  if not found or not v_action.active
     or v_action.launch_state not in ('preview', 'live')
     or v_action.pilot_enabled is distinct from true
     or v_action.pilot_user_id is distinct from v_user_id
     or not exists (select 1 from public.users u where u.id = v_user_id and u.role = 'admin') then
    raise exception 'credit_pilot_not_authorized' using errcode = '42501';
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

revoke all on function public.credit_reserve_v1(text,text) from public, anon, authenticated;
grant execute on function public.credit_reserve_v1(text,text) to authenticated;
commit;
