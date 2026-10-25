\set ON_ERROR_STOP on

begin;

create role anon nologin;
create role authenticated nologin;
create role service_role nologin;

create schema auth;
create schema extensions;
create extension pgcrypto with schema extensions;

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('test.uid', true), '')::uuid
$$;

create or replace function public.test_assert(p_condition boolean, p_message text)
returns void
language plpgsql
as $$
begin
  if coalesce(p_condition, false) is not true then
    raise exception 'ASSERTION FAILED: %', p_message;
  end if;
end;
$$;

create table public.users (
  id uuid primary key,
  role text not null
);

create table public.persons (
  person_id uuid primary key,
  account_user_id uuid unique
);

create table public.research_objects (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  statement text,
  source text,
  source_ref text,
  owner_person_id uuid references public.persons(person_id),
  privacy_scope text,
  status text,
  engine_verified boolean,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

\i docs/planning/sql/fn_family_claims_phase1.sql
\i docs/planning/sql/fn_family_claims_phase2.sql

create temp table baseline_redeemer as
select regexp_replace(prosrc, '[[:space:]]+', '', 'g') as normalized_source
  from pg_proc
 where oid = 'public.fn_redeem_family_invitation(text)'::regprocedure;

\i supabase/migrations/20261025010603_family_claim_self_redeem_owner_reader_v1.sql

select public.test_assert(
  (select relrowsecurity from pg_class where oid = 'public.family_claims'::regclass),
  'family_claims RLS must remain enabled'
);

select public.test_assert(
  not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'family_claims'),
  'family_claims must remain policy-free'
);

select public.test_assert(
  not has_table_privilege('anon', 'public.family_claims', 'SELECT')
  and not has_table_privilege('anon', 'public.family_claims', 'INSERT')
  and not has_table_privilege('anon', 'public.family_claims', 'UPDATE')
  and not has_table_privilege('anon', 'public.family_claims', 'DELETE')
  and not has_table_privilege('anon', 'public.family_claims', 'TRUNCATE')
  and not has_table_privilege('anon', 'public.family_claims', 'REFERENCES')
  and not has_table_privilege('anon', 'public.family_claims', 'TRIGGER')
  and not has_table_privilege('authenticated', 'public.family_claims', 'SELECT')
  and not has_table_privilege('authenticated', 'public.family_claims', 'INSERT')
  and not has_table_privilege('authenticated', 'public.family_claims', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.family_claims', 'DELETE')
  and not has_table_privilege('authenticated', 'public.family_claims', 'TRUNCATE')
  and not has_table_privilege('authenticated', 'public.family_claims', 'REFERENCES')
  and not has_table_privilege('authenticated', 'public.family_claims', 'TRIGGER'),
  'anon/authenticated must have no family_claims table privileges'
);

select public.test_assert(
  exists (
    select 1
      from pg_proc
     where oid = 'public.fn_list_my_family_claims()'::regprocedure
       and pronargs = 0
       and prorettype = 'jsonb'::regtype
       and prosecdef
       and proconfig = array['search_path=public']
  ),
  'owner reader must have the approved input-free SECURITY DEFINER signature and fixed search_path'
);

select public.test_assert(
  not has_function_privilege('public', 'public.fn_list_my_family_claims()', 'EXECUTE')
  and not has_function_privilege('anon', 'public.fn_list_my_family_claims()', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.fn_list_my_family_claims()', 'EXECUTE')
  and not has_function_privilege('public', 'public.fn_redeem_family_invitation(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.fn_redeem_family_invitation(text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.fn_redeem_family_invitation(text)', 'EXECUTE'),
  'reader and redeemer must be authenticated-only RPCs'
);

set role anon;
do $$
begin
  begin
    perform public.fn_list_my_family_claims();
    raise exception 'expected anon reader denial';
  exception
    when insufficient_privilege then null;
  end;
  begin
    perform public.fn_redeem_family_invitation('not-a-token');
    raise exception 'expected anon redeemer denial';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;
reset role;

select set_config('test.uid', '', false);
set role authenticated;
do $$
begin
  begin
    perform public.fn_list_my_family_claims();
    raise exception 'expected unauthenticated reader denial';
  exception
    when others then
      if sqlerrm <> 'not authorized: authenticated journey owner required' then
        raise;
      end if;
  end;
end;
$$;
reset role;

insert into public.users (id, role) values
  ('10000000-0000-0000-0000-000000000001', 'user'),
  ('10000000-0000-0000-0000-000000000002', 'user'),
  ('10000000-0000-0000-0000-000000000003', 'user'),
  ('10000000-0000-0000-0000-000000000004', 'user');

insert into public.persons (person_id, account_user_id) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003'),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004');

insert into public.research_objects
  (kind, statement, source, source_ref, owner_person_id, privacy_scope, status, engine_verified)
values
  ('observation', 'VERY_PRIVATE_FAMILY_CONTENT_A1', 'test', 'person:20000000-0000-0000-0000-000000000001:p:30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'private', 'active', false),
  ('observation', 'VERY_PRIVATE_FAMILY_CONTENT_A2', 'test', 'person:20000000-0000-0000-0000-000000000001:p:30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'private', 'active', false),
  ('observation', 'VERY_PRIVATE_FAMILY_CONTENT_A3', 'test', 'person:20000000-0000-0000-0000-000000000001:p:30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'private', 'active', false),
  ('observation', 'VERY_PRIVATE_FAMILY_CONTENT_D1', 'test', 'person:20000000-0000-0000-0000-000000000004:p:30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', 'private', 'active', false);

create temp table test_values (
  key text primary key,
  value jsonb not null
);

select set_config('test.uid', '10000000-0000-0000-0000-000000000001', false);
insert into test_values (key, value)
values (
  'owner_a_primary',
  public.fn_create_family_invitation(
    '20000000-0000-0000-0000-000000000001',
    'person:20000000-0000-0000-0000-000000000001:p:30000000-0000-0000-0000-000000000001',
    7
  )
);

create temp table before_self_redeem as
select to_jsonb(fc) as claim_row
  from public.family_claims fc
 where fc.id = (select (value->>'id')::uuid from test_values where key = 'owner_a_primary');

do $$
declare
  v_token text := (select value->>'token' from test_values where key = 'owner_a_primary');
begin
  begin
    perform public.fn_redeem_family_invitation(v_token);
    raise exception 'expected issuer self-redeem denial';
  exception
    when others then
      if sqlerrm <> 'invitation issuer cannot redeem own family invitation' then
        raise;
      end if;
  end;
end;
$$;

select public.test_assert(
  (select claim_row from before_self_redeem) =
  (select to_jsonb(fc) from public.family_claims fc
    where fc.id = (select (value->>'id')::uuid from test_values where key = 'owner_a_primary')),
  'self-redeem must leave the complete claim row unchanged'
);

select set_config('test.uid', '10000000-0000-0000-0000-000000000002', false);
insert into test_values (key, value)
select 'owner_a_primary_redeemed', public.fn_redeem_family_invitation(value->>'token')
  from test_values
 where key = 'owner_a_primary';

select public.test_assert(
  exists (
    select 1 from public.family_claims
     where id = (select (value->>'id')::uuid from test_values where key = 'owner_a_primary')
       and status = 'approved'
       and claimant_person_id = '20000000-0000-0000-0000-000000000002'
       and consumed_at is not null
       and attempts = 1
  ),
  'a distinct linked person must still redeem a valid invitation'
);

do $$
declare
  v_token text := (select value->>'token' from test_values where key = 'owner_a_primary');
begin
  begin
    perform public.fn_redeem_family_invitation(v_token);
    raise exception 'expected already-used token denial';
  exception
    when others then
      if sqlerrm <> 'token already used' then
        raise;
      end if;
  end;
end;
$$;

select set_config('test.uid', '10000000-0000-0000-0000-000000000001', false);
insert into test_values (key, value)
values (
  'owner_a_revoked',
  public.fn_create_family_invitation(
    '20000000-0000-0000-0000-000000000001',
    'person:20000000-0000-0000-0000-000000000001:p:30000000-0000-0000-0000-000000000002',
    7
  )
);
select public.fn_revoke_family_claim((select (value->>'id')::uuid from test_values where key = 'owner_a_revoked'));

select set_config('test.uid', '10000000-0000-0000-0000-000000000002', false);
do $$
declare
  v_token text := (select value->>'token' from test_values where key = 'owner_a_revoked');
begin
  begin
    perform public.fn_redeem_family_invitation(v_token);
    raise exception 'expected revoked token denial';
  exception
    when others then
      if sqlerrm <> 'token has been revoked' then
        raise;
      end if;
  end;
end;
$$;

select set_config('test.uid', '10000000-0000-0000-0000-000000000001', false);
insert into test_values (key, value)
values (
  'owner_a_expired',
  public.fn_create_family_invitation(
    '20000000-0000-0000-0000-000000000001',
    'person:20000000-0000-0000-0000-000000000001:p:30000000-0000-0000-0000-000000000003',
    7
  )
);
update public.family_claims
   set token_expires_at = now() - interval '1 minute'
 where id = (select (value->>'id')::uuid from test_values where key = 'owner_a_expired');

select set_config('test.uid', '10000000-0000-0000-0000-000000000002', false);
do $$
declare
  v_token text := (select value->>'token' from test_values where key = 'owner_a_expired');
begin
  begin
    perform public.fn_redeem_family_invitation(v_token);
    raise exception 'expected expired token denial';
  exception
    when others then
      if sqlerrm <> 'token has expired' then
        raise;
      end if;
  end;
end;
$$;

select set_config('test.uid', '10000000-0000-0000-0000-000000000004', false);
insert into test_values (key, value)
values (
  'owner_d_pending',
  public.fn_create_family_invitation(
    '20000000-0000-0000-0000-000000000004',
    'person:20000000-0000-0000-0000-000000000004:p:30000000-0000-0000-0000-000000000004',
    7
  )
);

create temp table reader_results (
  owner_key text primary key,
  value jsonb not null
);

select set_config('test.uid', '10000000-0000-0000-0000-000000000001', false);
insert into reader_results values ('owner_a', public.fn_list_my_family_claims());

select set_config('test.uid', '10000000-0000-0000-0000-000000000002', false);
insert into reader_results values ('claimant_b', public.fn_list_my_family_claims());

select set_config('test.uid', '10000000-0000-0000-0000-000000000003', false);
insert into reader_results values ('unrelated_c', public.fn_list_my_family_claims());

select set_config('test.uid', '10000000-0000-0000-0000-000000000004', false);
insert into reader_results values ('owner_d', public.fn_list_my_family_claims());

select public.test_assert(
  jsonb_array_length((select value from reader_results where owner_key = 'owner_a')) = 3,
  'owner A must see all and only claims on owner A family refs'
);

select public.test_assert(
  jsonb_array_length((select value from reader_results where owner_key = 'owner_d')) = 1,
  'owner D must see all and only claims on owner D family refs'
);

select public.test_assert(
  (select value from reader_results where owner_key = 'claimant_b') = '[]'::jsonb
  and (select value from reader_results where owner_key = 'unrelated_c') = '[]'::jsonb,
  'claimant and unrelated users must not obtain another owner claims through the owner reader'
);

select public.test_assert(
  not exists (
    select 1
      from reader_results rr
      cross join lateral jsonb_array_elements(rr.value) item
      cross join lateral jsonb_object_keys(item) output_key
     where output_key not in (
       'id', 'flow', 'status', 'target_ref', 'created_at', 'reviewed_at',
       'consumed_at', 'token_expires_at', 'has_claimant'
     )
  ),
  'reader output must contain only the approved metadata keys'
);

select public.test_assert(
  (select value::text from reader_results where owner_key = 'owner_a') not like '%VERY_PRIVATE_FAMILY_CONTENT%'
  and (select value::text from reader_results where owner_key = 'owner_a') not like '%token_hash%'
  and (select value::text from reader_results where owner_key = 'owner_a') not like '%attempts%'
  and (select value::text from reader_results where owner_key = 'owner_a') not like '%claimant_person_id%'
  and position(
    (select value->>'token' from test_values where key = 'owner_a_primary')
    in (select value::text from reader_results where owner_key = 'owner_a')
  ) = 0,
  'reader must not leak research content, token material, attempts, meta, or claimant identity'
);

select public.test_assert(
  pg_get_functiondef('public.fn_redeem_family_invitation(text)'::regprocedure) ilike '%for update%'
  and pg_get_functiondef('public.fn_redeem_family_invitation(text)'::regprocedure) ilike '%v_claimant = v_row.issuer_owner_id%',
  'redeemer must retain its row lock and contain the self-redeem guard'
);

\i tests/sql/fixtures/rollback_family_claim_self_redeem_owner_reader_v1.sql

select public.test_assert(
  to_regprocedure('public.fn_list_my_family_claims()') is null,
  'rollback must remove the new owner reader'
);

select public.test_assert(
  regexp_replace(
    (select prosrc from pg_proc where oid = 'public.fn_redeem_family_invitation(text)'::regprocedure),
    '[[:space:]]+', '', 'g'
  ) = (select normalized_source from baseline_redeemer),
  'rollback must restore the pre-patch redeemer body'
);

select public.test_assert(
  not has_function_privilege('public', 'public.fn_redeem_family_invitation(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.fn_redeem_family_invitation(text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.fn_redeem_family_invitation(text)', 'EXECUTE'),
  'rollback must preserve authenticated-only redeemer execution'
);

rollback;

\echo ALL FAMILY CLAIM SQL ASSERTIONS PASSED
