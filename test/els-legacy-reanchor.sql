\set ON_ERROR_STOP on

create role anon;
create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable
as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
grant usage on schema auth to public;

create table public.users(id uuid primary key, role text);
create table public.els_records(
  id uuid primary key,
  owner_user_id uuid,
  search_term text,
  scope text,
  skip_distance integer,
  direction text,
  start_index integer,
  corpus_id text,
  term_norm text,
  positions jsonb,
  image_url text,
  description text,
  engine_detail jsonb,
  status text,
  visibility text
);
create function public.fn_els_term_norm(value text) returns text language sql immutable
as $$ select translate(regexp_replace(coalesce(value, ''), '[^א-ת]', '', 'g'), 'ךםןףץ', 'כמנפצ') $$;
create function public.fn_els_corpus_id(value text) returns text language sql immutable
as $$ select case value when 'torah' then 'fixture-torah' when 'tanakh' then 'fixture-tanakh' end $$;
create function public.els_publish_truth_gate_v1(
  p_term text, p_scope text, p_skip integer, p_direction text, p_start integer,
  p_corpus text default null, p_check_corpus boolean default false
) returns text language sql stable
as $$ select case
  when p_term = 'תורת הרמז' and p_scope = 'tanakh' and p_skip = 21940
    and p_direction = 'fwd' and p_start = 43250 and p_corpus = 'fixture-tanakh'
    then 'MATCH'
  else 'REPLAY_MISMATCH'
end $$;

\ir ../supabase/migrations/20261022131735_els_legacy_saved_matrix_in_place_reanchor_v1.sql

insert into public.users values
  ('00000000-0000-0000-0000-00000000000a', 'admin'),
  ('00000000-0000-0000-0000-00000000000b', 'member'),
  ('00000000-0000-0000-0000-00000000000c', 'member');
insert into public.els_records values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-00000000000a', 'תורת הרמז', 'torah', 21940, 'down', null, null, null, '{"findings":[]}', null, 'old', null, 'published', 'public'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-00000000000b', 'תורת הרמז', 'torah', 21940, 'down', null, null, null, '{"findings":[]}', null, 'owner old', null, 'published', 'public');

select set_config('test.uid', '00000000-0000-0000-0000-00000000000a', false);
select public.reanchor_els_matrix_v1(
  '11111111-1111-1111-1111-111111111111', 'tanakh', 21940, 'fwd', 43250,
  '{"findings":[{"t":"נשמהללוט"}]}'::jsonb, null, 'updated same row', '{"engineVersion":"fixture"}'::jsonb
);
do $$ begin
  if not exists (
    select 1 from public.els_records
    where id = '11111111-1111-1111-1111-111111111111'
      and scope = 'tanakh' and direction = 'fwd' and start_index = 43250
      and corpus_id = 'fixture-tanakh' and status = 'published'
      and description = 'updated same row'
      and positions #>> '{findings,0,t}' = 'נשמהללוט'
  ) then raise exception 'admin legacy row was not repaired in place'; end if;
end $$;

do $$ begin
  begin
    perform public.reanchor_els_matrix_v1(
      '22222222-2222-2222-2222-222222222222', 'tanakh', 21940, 'fwd', 43251,
      null, null, 'must not persist', null
    );
    raise exception 'mismatch unexpectedly accepted';
  exception when check_violation then null;
  end;
  if exists (select 1 from public.els_records where id = '22222222-2222-2222-2222-222222222222' and description = 'must not persist')
    then raise exception 'failed repair was not atomic'; end if;
end $$;

select set_config('test.uid', '00000000-0000-0000-0000-00000000000b', false);
select public.reanchor_els_matrix_v1(
  '22222222-2222-2222-2222-222222222222', 'tanakh', 21940, 'fwd', 43250,
  null, null, 'owner same row', null
);
do $$ begin
  if not exists (
    select 1 from public.els_records
    where id = '22222222-2222-2222-2222-222222222222'
      and start_index = 43250 and status = 'pending' and visibility = 'private'
  ) then raise exception 'owner repair did not preserve id and moderation'; end if;
end $$;

select set_config('test.uid', '00000000-0000-0000-0000-00000000000c', false);
do $$ begin
  begin
    perform public.reanchor_els_matrix_v1(
      '11111111-1111-1111-1111-111111111111', 'tanakh', 21940, 'fwd', 43250,
      null, null, null, null
    );
    raise exception 'non-owner unexpectedly accepted';
  exception when others then
    if sqlerrm <> 'not authorized' then raise; end if;
  end;
end $$;

do $$ begin
  if has_function_privilege('anon', 'public.reanchor_els_matrix_v1(uuid,text,integer,text,integer,jsonb,text,text,jsonb)', 'execute')
    then raise exception 'anon execute must be revoked'; end if;
  if not has_function_privilege('authenticated', 'public.reanchor_els_matrix_v1(uuid,text,integer,text,integer,jsonb,text,text,jsonb)', 'execute')
    then raise exception 'authenticated execute is required'; end if;
end $$;

select 'ELS legacy same-row re-anchor: PASS';
