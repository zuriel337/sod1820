-- Fixture of tests/sql/run-els-search-page-work-budget.sh (throwaway database only): the two canonical letter streams with the live
-- shape, indexes and privileges. The letters are loaded by the runner from tools/els/data/tk-letters.txt and checked against the md5 of
-- the live streams, so the gate reads the same text the live engine reads. fn_els_corpus_id is the live definition (md5 checked).
\set ON_ERROR_STOP on
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
end $$;
create table public.tanakh_stream (idx integer primary key, ch text not null, book_idx smallint);
create index tanakh_stream_ch on public.tanakh_stream (ch, idx);
create table public.torah_stream (idx integer primary key, ch text not null, book_idx smallint);
create index torah_stream_ch on public.torah_stream (ch, idx);
revoke all on table public.tanakh_stream, public.torah_stream from public, anon, authenticated;
grant select on table public.tanakh_stream, public.torah_stream to service_role;
create or replace function public.fn_els_corpus_id(p_scope text)
 returns text
 language sql
 immutable
 set search_path to 'public'
as $function$
  select case coalesce(nullif(p_scope,''),'torah')
    when 'torah'  then '0b022e8eef6f9c16'
    when 'tanakh' then '0b022e8eef6f9c16a20c3836c11e652e5cac45469016766f7f4fc670c9f84e1b'
    else null
  end
$function$;
