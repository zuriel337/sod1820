-- G3 notification_prefs guest RLS hardening acceptance.
-- Proves anon cannot enumerate the table and can only operate an exact opaque visitor row through RPC.

do $$
begin
  if has_table_privilege('anon', 'public.notification_prefs', 'SELECT')
     or has_table_privilege('anon', 'public.notification_prefs', 'INSERT')
     or has_table_privilege('anon', 'public.notification_prefs', 'UPDATE')
     or has_any_column_privilege('anon', 'public.notification_prefs', 'SELECT')
     or has_any_column_privilege('anon', 'public.notification_prefs', 'UPDATE') then
    raise exception 'anon still has direct notification_prefs privileges';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='notification_prefs'
      and 'anon' = any(roles)
  ) then
    raise exception 'anon notification_prefs policy still exists';
  end if;

  if not has_function_privilege('anon', 'public.notification_prefs_guest_get_v1(text)', 'EXECUTE')
     or not has_function_privilege('anon', 'public.notification_prefs_guest_save_v1(text,text[],text[],text,text,boolean,timestamptz,boolean)', 'EXECUTE') then
    raise exception 'guest RPC execute privilege missing';
  end if;
end
$$;

delete from public.notification_prefs
where visitor_id in (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222'
);

insert into public.notification_prefs(visitor_id, topics, channels, email)
values
  ('11111111-1111-4111-8111-111111111111', array['alpha'], '{}'::text[], 'one@example.invalid'),
  ('22222222-2222-4222-8222-222222222222', array['beta'], '{}'::text[], 'two@example.invalid');

set role anon;
select public.notification_prefs_guest_get_v1('11111111-1111-4111-8111-111111111111');
select public.notification_prefs_guest_save_v1(
  '11111111-1111-4111-8111-111111111111',
  array['alpha','gamma'],
  array['email'],
  'one@example.invalid',
  null,
  false,
  null,
  false
);
reset role;

do $$
declare
  v_one text[];
  v_two text[];
begin
  select topics into v_one from public.notification_prefs
   where visitor_id='11111111-1111-4111-8111-111111111111' and user_id is null;
  select topics into v_two from public.notification_prefs
   where visitor_id='22222222-2222-4222-8222-222222222222' and user_id is null;

  if not (v_one @> array['gamma']) then
    raise exception 'target guest row was not updated through bounded RPC';
  end if;
  if v_two <> array['beta']::text[] then
    raise exception 'non-target guest row changed';
  end if;
end
$$;

-- A UUID that has already been claimed by an account must become invisible/immutable
-- to the guest RPC even if the caller possesses that exact old browser UUID.
delete from public.notification_prefs
where user_id='00000000-0000-0000-0000-0000000000a1'
   or visitor_id='33333333-3333-4333-8333-333333333333';

insert into public.notification_prefs(user_id, visitor_id, topics, channels, email)
values (
  '00000000-0000-0000-0000-0000000000a1',
  '33333333-3333-4333-8333-333333333333',
  array['claimed-only'],
  '{}'::text[],
  'claimed@example.invalid'
);

select set_config('request.jwt.claim.sub','',false);
select set_config('request.jwt.claims','{"role":"anon"}',false);
set role anon;
select g3f2_test.assert_true(
  public.notification_prefs_guest_get_v1('33333333-3333-4333-8333-333333333333') is null,
  'guest read must not expose a visitor UUID after the row is claimed by an account'
);
select g3f2_test.assert_raises(
  $$select public.notification_prefs_guest_save_v1(
    '33333333-3333-4333-8333-333333333333',
    array['attacker-change'],
    '{}'::text[],
    null,
    null,
    false,
    null,
    false
  )$$,
  'guest save must reject a visitor UUID after the row is claimed by an account'
);
reset role;

select g3f2_test.assert_true((
  select topics = array['claimed-only']::text[]
     and email = 'claimed@example.invalid'
  from public.notification_prefs
  where user_id='00000000-0000-0000-0000-0000000000a1'
    and visitor_id='33333333-3333-4333-8333-333333333333'
), 'claimed account row must remain unchanged after guest RPC attempts');

delete from public.notification_prefs
where user_id='00000000-0000-0000-0000-0000000000a1'
   or visitor_id='33333333-3333-4333-8333-333333333333';

delete from public.notification_prefs
where visitor_id in (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222'
);
