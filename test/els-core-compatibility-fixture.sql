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
  book_idx smallint default 0
);
create index torah_stream_ch on public.torah_stream(ch,idx);

create or replace function public.fn_els_corpus_id(p_scope text)
returns text
language sql
immutable
set search_path to 'public'
as $$
  select case coalesce(nullif(p_scope,''),'torah')
    when 'torah' then 'fixture-torah'
    when 'tanakh' then 'fixture-tanakh'
    else null
  end
$$;

-- Synthetic Torah stream: repeated 7-letter block. אבג occurs at skip=3 from offsets 0 and 7.
with chars as (
  select row_number() over ()::int idx, ch
  from regexp_split_to_table('אדדבדדגאדדבדדגאדדבדדג', '') ch
  where ch <> ''
)
insert into public.torah_stream(idx,ch,book_idx)
select idx,ch,0 from chars;
