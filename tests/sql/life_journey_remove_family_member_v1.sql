\set ON_ERROR_STOP on

begin;

create role anon nologin;
create role authenticated nologin;

create schema auth;
create or replace function auth.uid()
returns uuid language sql stable as $$
  select nullif(current_setting('test.uid', true), '')::uuid
$$;

create table public.users (id uuid primary key, role text not null);
create table public.persons (person_id uuid primary key, account_user_id uuid unique);
create table public.research_objects (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  statement text,
  terms text[],
  relates text[],
  source text,
  source_ref text,
  contributor text,
  owner_person_id uuid references public.persons(person_id),
  privacy_scope text,
  status text,
  engine_verified boolean,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table public.family_claims (
  id uuid primary key default gen_random_uuid(),
  flow text not null,
  status text not null,
  target_ref text not null,
  issuer_owner_id uuid references public.persons(person_id),
  claimant_person_id uuid references public.persons(person_id),
  token_hash text,
  token_expires_at timestamptz,
  attempts integer not null default 0,
  reviewed_by uuid references public.persons(person_id),
  reviewed_at timestamptz,
  consumed_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.rd_is_admin()
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.users where id = auth.uid() and role = 'admin')
$$;

create or replace function public.test_assert(p_condition boolean, p_message text)
returns void language plpgsql as $$
begin
  if coalesce(p_condition, false) is not true then raise exception 'ASSERTION FAILED: %', p_message; end if;
end;
$$;

\i supabase/migrations/20261025035531_life_journey_remove_family_member_v1.sql

select public.test_assert(
  has_function_privilege('authenticated', 'public.fn_remove_family_member(uuid,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.fn_remove_family_member(uuid,text)', 'EXECUTE'),
  'only authenticated receives execute privilege'
);

insert into public.persons(person_id, account_user_id) values
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  ('33333333-3333-4333-8333-333333333333', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
insert into public.users(id, role) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'user'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'user');

insert into public.research_objects(kind, statement, source, source_ref, owner_person_id, privacy_scope, status, engine_verified, meta)
values
  ('observation', 'משפחה א', 'family_input', 'person:11111111-1111-4111-8111-111111111111:p:member-a', '11111111-1111-4111-8111-111111111111', 'private', 'candidate', false, '{}'),
  ('observation', 'משפחה ב', 'family_input', 'person:11111111-1111-4111-8111-111111111111:p:member-b', '11111111-1111-4111-8111-111111111111', 'private', 'candidate', false, '{}'),
  ('observation', 'משפחה זרה', 'family_input', 'person:22222222-2222-4222-8222-222222222222:p:member-c', '22222222-2222-4222-8222-222222222222', 'private', 'candidate', false, '{}'),
  ('relation', 'parent_of', 'family_input', 'family_relation:parent_of:self:member-a', '11111111-1111-4111-8111-111111111111', 'private', 'candidate', false,
   '{"relation_type":"parent_of","parent_ref":"person:11111111-1111-4111-8111-111111111111:self","child_ref":"person:11111111-1111-4111-8111-111111111111:p:member-a"}');
update public.research_objects
   set relates = array['person:11111111-1111-4111-8111-111111111111:self','person:11111111-1111-4111-8111-111111111111:p:member-a']
 where kind = 'relation';
insert into public.family_claims(flow, status, target_ref, issuer_owner_id, token_hash, token_expires_at)
values ('invitation', 'pending', 'person:11111111-1111-4111-8111-111111111111:p:member-a', '11111111-1111-4111-8111-111111111111', 'pending-token', now() + interval '7 days');

set local test.uid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
set local role authenticated;

do $$
begin
  perform public.fn_remove_family_member('11111111-1111-4111-8111-111111111111', 'person:11111111-1111-4111-8111-111111111111:self');
  raise exception 'self removal unexpectedly succeeded';
exception when others then
  if sqlerrm not like '%self profile cannot be removed%' then raise; end if;
end;
$$;

do $$
begin
  perform public.fn_remove_family_member('22222222-2222-4222-8222-222222222222', 'person:22222222-2222-4222-8222-222222222222:p:member-c');
  raise exception 'cross-owner removal unexpectedly succeeded';
exception when others then
  if sqlerrm not like '%not authorized%' then raise; end if;
end;
$$;

select public.fn_remove_family_member(
  '11111111-1111-4111-8111-111111111111',
  'person:11111111-1111-4111-8111-111111111111:p:member-a'
);

reset role;
select public.test_assert(
  not exists (select 1 from public.research_objects where source_ref = 'person:11111111-1111-4111-8111-111111111111:p:member-a'),
  'target family observation must be removed'
);
select public.test_assert(
  not exists (select 1 from public.research_objects where kind = 'relation' and 'person:11111111-1111-4111-8111-111111111111:p:member-a' = any(relates)),
  'target family relations must be removed'
);
select public.test_assert(
  (select status = 'revoked' and reviewed_at is not null from public.family_claims where token_hash = 'pending-token'),
  'pending invitation must be revoked'
);
select public.test_assert(
  exists (select 1 from public.research_objects where source_ref = 'person:11111111-1111-4111-8111-111111111111:p:member-b')
  and exists (select 1 from public.research_objects where source_ref = 'person:22222222-2222-4222-8222-222222222222:p:member-c'),
  'unrelated owner and family rows must remain'
);

insert into public.family_claims(flow, status, target_ref, issuer_owner_id, claimant_person_id, token_hash, token_expires_at)
values ('invitation', 'approved', 'person:11111111-1111-4111-8111-111111111111:p:member-b', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', 'approved-token', now() + interval '7 days');
set local role authenticated;
do $$
begin
  perform public.fn_remove_family_member('11111111-1111-4111-8111-111111111111', 'person:11111111-1111-4111-8111-111111111111:p:member-b');
  raise exception 'approved-claim removal unexpectedly succeeded';
exception when others then
  if sqlerrm not like '%approved family claim must be reversed%' then raise; end if;
end;
$$;
reset role;
select public.test_assert(
  exists (select 1 from public.research_objects where source_ref = 'person:11111111-1111-4111-8111-111111111111:p:member-b'),
  'approved-claim member must remain intact'
);

rollback;
