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

delete from public.notification_prefs
where visitor_id in (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222'
);
