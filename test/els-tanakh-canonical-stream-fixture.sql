-- Local executable fixture for G3_ELS_TANAKH_CANONICAL_STREAM_BUILD_V1.
-- Recreates only the live shapes the migration depends on (real corpus ids, torah_stream, tanach_verses).
-- Data rows are loaded by the test runner via \copy from the canonical tk-letters blob.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role; end if;
end $$;

create table public.torah_stream (
  idx integer primary key,
  ch text not null,
  book_idx smallint
);
create index torah_stream_ch on public.torah_stream(ch,idx);

create table public.tanach_verses (
  book_idx smallint not null,
  book text,
  chapter smallint not null,
  verse smallint not null,
  text text not null
);

create or replace function public.fn_els_corpus_id(p_scope text)
returns text
language sql
immutable
set search_path to 'public'
as $$
  select case coalesce(nullif(p_scope,''),'torah')
    when 'torah'  then '0b022e8eef6f9c16'
    when 'tanakh' then '0b022e8eef6f9c16a20c3836c11e652e5cac45469016766f7f4fc670c9f84e1b'
    else null
  end
$$;
