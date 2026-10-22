-- Throwaway-Postgres test for BOOKS_2029_PUBLIC_RESEARCH_PROJECTION_V1.
-- Synthetic fixtures only. Never run against the live project.

create schema if not exists auth;
create or replace function auth.uid() returns uuid
language sql stable
as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;

do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin; exception when duplicate_object then null; end $$;

create or replace function public.t_assert(ok boolean, msg text)
returns void language plpgsql as $$
begin
  if not ok then raise exception 'FAIL: %', msg; end if;
end
$$;

create table public.nodes (
  id uuid primary key,
  type text,
  is_active boolean,
  metadata jsonb
);

create table public.research_objects (
  id uuid primary key
);
alter table public.research_objects enable row level security;

create table public.decision_ledger (
  id uuid primary key
);

create table public.users (
  id uuid primary key,
  role text not null
);

\i supabase/migrations/20261022001111_books_2029_public_research_projection_v1.sql

select public.t_assert(
  not has_table_privilege('anon', 'public.research_objects', 'select')
  and not has_table_privilege('authenticated', 'public.research_objects', 'select'),
  'base research_objects remains inaccessible'
);
select public.t_assert(
  has_column_privilege('anon', 'public.book_research_public_v1', 'statement', 'select')
  and not has_column_privilege('anon', 'public.book_research_public_v1', 'decision_ledger_id', 'select')
  and not has_column_privilege('anon', 'public.book_research_public_v1', 'source_snapshot_md5', 'select')
  and not has_column_privilege('anon', 'public.book_research_public_v1', 'publication_state', 'select'),
  'anon receives only the explicit safe-column contract'
);
select public.t_assert(
  not has_table_privilege('anon', 'public.book_research_public_v1', 'insert')
  and not has_table_privilege('anon', 'public.book_research_public_v1', 'update')
  and not has_table_privilege('anon', 'public.book_research_public_v1', 'delete'),
  'browser roles cannot mutate the projection'
);

insert into public.nodes (id, type, is_active, metadata) values
  ('20000000-0000-0000-0000-000000000001', 'book', true, '{}'),
  ('20000000-0000-0000-0000-000000000002', 'book', true, '{}');
insert into public.research_objects (id) values
  ('10000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000003');
insert into public.decision_ledger (id) values
  ('30000000-0000-0000-0000-000000000001');
insert into public.users (id, role) values
  ('40000000-0000-0000-0000-000000000001', 'admin');

insert into public.book_research_public_v1 (
  id, book_node_id, decision_ledger_id, created_at, kind, statement, terms,
  source, source_ref, engine_verified, engine_detail, status,
  publication_state, source_snapshot_md5, published_at
) values
  (
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '2026-10-22T00:00:00Z', 'observation', 'SYNTHETIC PUBLIC A', array['alpha'],
    'synthetic', 'book:synthetic-a#p1', false, '{"verification_state":"not_applicable"}', 'candidate',
    'published', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', '2026-10-22T01:00:00Z'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '2026-10-22T00:01:00Z', 'hypothesis', 'SYNTHETIC REVIEW SECRET', array['beta'],
    'synthetic', 'book:synthetic-a#p2', false, '{}', 'candidate',
    'review', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', null
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001',
    '2026-10-22T00:02:00Z', 'fact', 'SYNTHETIC PUBLIC B', array['gamma'],
    'synthetic', 'book:synthetic-b#p1', true, '{"verification_state":"match"}', 'approved',
    'published', 'cccccccccccccccccccccccccccccccc', '2026-10-22T01:02:00Z'
  );

set role anon;
select public.t_assert(
  (select count(id) from public.book_research_public_v1) = 2,
  'anon sees published rows only'
);
select public.t_assert(
  (select count(id) from public.book_research_public_v1
   where book_node_id = '20000000-0000-0000-0000-000000000001') = 1,
  'exact Book filter excludes a different Book cohort'
);
select public.t_assert(
  (select bool_and(privacy_scope = 'public' and meta = '{}'::jsonb)
   from public.book_research_public_v1) is true,
  'public shape carries explicit public access and no raw meta'
);
do $$
begin
  perform decision_ledger_id from public.book_research_public_v1 limit 1;
  raise exception 'FAIL: internal decision id was readable';
exception when insufficient_privilege then null;
end
$$;
reset role;

set role authenticated;
set test.uid = '40000000-0000-0000-0000-000000000001';
select public.t_assert(
  (select count(id) from public.book_research_public_v1
   where statement = 'SYNTHETIC REVIEW SECRET') = 0,
  'an authenticated admin session still sees only the public projection on this reader'
);
reset role;

do $$
begin
  update public.book_research_public_v1
     set engine_detail = '{"verification_state":"match","raw":"must-not-publish"}'
   where id = '10000000-0000-0000-0000-000000000001';
  raise exception 'FAIL: non-allowlisted engine_detail key accepted';
exception when check_violation then null;
end
$$;

do $$
begin
  update public.book_research_public_v1
     set meta = '{"private":"must-not-publish"}'
   where id = '10000000-0000-0000-0000-000000000001';
  raise exception 'FAIL: non-empty meta accepted';
exception when check_violation then null;
end
$$;

select public.t_assert(
  (select count(*) from public.book_research_public_v1 where publication_state = 'review') = 1,
  'review row remains stored but non-public'
);

\echo ALL BOOKS 2029 PUBLIC RESEARCH SQL ASSERTIONS PASSED
