\set ON_ERROR_STOP on
-- Run only in a disposable PostgreSQL database. No live project or user data.
begin;
create role anon nologin;
create role authenticated nologin;
create role ungranted_reader nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

create table public.research_contributions (
  id uuid primary key,
  status text,
  parent_id uuid,
  author_user_id uuid,
  reactions jsonb,
  last_activity_at timestamptz default '2020-01-01 00:00:00+00'
);
alter table public.research_contributions enable row level security;
create policy rc_public_read on public.research_contributions for select
  using (status = 'approved' or author_user_id = auth.uid());
grant select on public.research_contributions to anon, authenticated;

insert into public.research_contributions (id, status, parent_id, reactions) values
  ('00000000-0000-0000-0000-000000000001', 'approved', null, '{"likes":27,"🔥":["v:seed"]}'),
  ('00000000-0000-0000-0000-000000000002', 'pending', null, '{"👍":["private-pending-identity"]}'),
  ('00000000-0000-0000-0000-000000000003', 'hidden', null, '{"👍":["private-hidden-identity"]}'),
  ('00000000-0000-0000-0000-000000000004', 'rejected', null, '{"likes":73}'),
  ('00000000-0000-0000-0000-000000000005', 'published', null, '{"likes":81}'),
  ('00000000-0000-0000-0000-000000000006', null, null, '{"likes":99}'),
  ('00000000-0000-0000-0000-000000000010', 'approved', null, null),
  ('00000000-0000-0000-0000-000000000011', 'approved', '00000000-0000-0000-0000-000000000010', '{"likes":8}'),
  ('00000000-0000-0000-0000-000000000012', 'approved', '00000000-0000-0000-0000-000000000002', '{"👍":["private-parent-identity"]}'),
  ('00000000-0000-0000-0000-000000000013', 'approved', '00000000-0000-0000-0000-000000000003', '{"likes":44}'),
  ('00000000-0000-0000-0000-000000000014', 'approved', '00000000-0000-0000-0000-000000000099', '{"likes":55}'),
  ('00000000-0000-0000-0000-000000000015', 'approved', '00000000-0000-0000-0000-000000000015', '{"likes":66}'),
  ('00000000-0000-0000-0000-000000000016', 'pending', '00000000-0000-0000-0000-000000000010', '{"likes":77}'),
  ('00000000-0000-0000-0000-000000000020', 'approved', '00000000-0000-0000-0000-000000000013', '{"likes":88}'),
  ('00000000-0000-0000-0000-000000000021', 'approved', '00000000-0000-0000-0000-000000000012', '{"likes":89}'),
  ('00000000-0000-0000-0000-000000000022', 'approved', '00000000-0000-0000-0000-000000000014', '{"likes":90}'),
  ('00000000-0000-0000-0000-000000000030', 'approved', '00000000-0000-0000-0000-000000000011', '{"likes":9}'),
  ('00000000-0000-0000-0000-000000000040', 'approved', '00000000-0000-0000-0000-000000000041', '{"likes":91}'),
  ('00000000-0000-0000-0000-000000000041', 'approved', '00000000-0000-0000-0000-000000000040', '{"likes":92}');
insert into public.research_contributions (id, status, parent_id, reactions)
select md5('depth-bound:' || depth)::uuid, 'approved',
       case when depth > 1 then md5('depth-bound:' || (depth-1))::uuid end, '{"likes":1}'
from generate_series(1,129) depth;
update public.research_contributions set author_user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
where id = '00000000-0000-0000-0000-000000000002';
create table baseline as select * from public.research_contributions;

\ir ../../supabase/migrations/20261013062404_community_reaction_public_visibility_gate_v1.sql
-- CREATE OR REPLACE must also remain safe when applied again.
\ir ../../supabase/migrations/20261013062404_community_reaction_public_visibility_gate_v1.sql

create function public.expect_reaction_denial(p_id uuid, p_emoji text default '👍', p_visitor text default 'guest', p_message text default 'not found')
returns void language plpgsql security invoker as $$
declare v_denied boolean := false;
begin
  begin
    perform public.toggle_contribution_reaction(p_id, p_emoji, p_visitor);
  exception when raise_exception then
    if sqlerrm <> p_message then raise exception 'wrong denial: %', sqlerrm; end if;
    v_denied := true;
  end;
  if not v_denied then raise exception 'reaction returned data for a denied call'; end if;
end;
$$;
grant execute on function public.expect_reaction_denial(uuid, text, text, text) to anon, authenticated;

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$
declare v_id uuid;
begin
  foreach v_id in array array[
    '00000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000003'::uuid,
    '00000000-0000-0000-0000-000000000004'::uuid,
    '00000000-0000-0000-0000-000000000005'::uuid,
    '00000000-0000-0000-0000-000000000006'::uuid,
    '00000000-0000-0000-0000-000000000012'::uuid,
    '00000000-0000-0000-0000-000000000013'::uuid,
    '00000000-0000-0000-0000-000000000014'::uuid,
    '00000000-0000-0000-0000-000000000015'::uuid,
    '00000000-0000-0000-0000-000000000016'::uuid,
    '00000000-0000-0000-0000-000000000020'::uuid,
    '00000000-0000-0000-0000-000000000021'::uuid,
    '00000000-0000-0000-0000-000000000022'::uuid,
    '00000000-0000-0000-0000-000000000040'::uuid,
    '00000000-0000-0000-0000-000000000041'::uuid,
    md5('depth-bound:129')::uuid,
    '00000000-0000-0000-0000-000000000099'::uuid
  ] loop
    perform public.expect_reaction_denial(v_id);
  end loop;
  perform public.expect_reaction_denial(null);
  perform public.expect_reaction_denial('00000000-0000-0000-0000-000000000001', '👍', null, 'no identity');
  perform public.expect_reaction_denial('00000000-0000-0000-0000-000000000001', '👍', '   ', 'no identity');
  perform public.expect_reaction_denial('00000000-0000-0000-0000-000000000001', '💀', 'guest', 'bad emoji');
  perform public.expect_reaction_denial('00000000-0000-0000-0000-000000000001', null, 'guest', 'bad emoji');
end;
$$;
reset role;
do $$
begin
  if exists ((select * from baseline) except (select * from public.research_contributions))
    or exists ((select * from public.research_contributions) except (select * from baseline)) then
    raise exception 'denied guest call changed contribution data or activity';
  end if;
end;
$$;

-- Own-row read access must not grant a public reaction on an unpublished row.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
do $$
begin
  if not exists (select 1 from public.research_contributions where id = '00000000-0000-0000-0000-000000000002') then
    raise exception 'fixture did not exercise own pending row access';
  end if;
  perform public.expect_reaction_denial('00000000-0000-0000-0000-000000000002');
  perform public.expect_reaction_denial('00000000-0000-0000-0000-000000000012');
  perform public.expect_reaction_denial('00000000-0000-0000-0000-000000000003');
  perform public.expect_reaction_denial('00000000-0000-0000-0000-000000000020');
  perform public.expect_reaction_denial('00000000-0000-0000-0000-000000000040');
end;
$$;
reset role;
do $$
begin
  if exists ((select * from baseline) except (select * from public.research_contributions)) then
    raise exception 'denied authenticated call changed contribution data';
  end if;
end;
$$;

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$
declare v_rx jsonb; v_emoji text;
begin
  v_rx := public.toggle_contribution_reaction('00000000-0000-0000-0000-000000000001', '👍', ' guest ');
  if v_rx <> '{"likes":27,"🔥":["v:seed"],"👍":["v:guest"]}'::jsonb then
    raise exception 'approved guest addition changed historical counts or identity: %', v_rx;
  end if;
  v_rx := public.toggle_contribution_reaction('00000000-0000-0000-0000-000000000001', '👍', 'guest');
  if v_rx <> '{"likes":27,"🔥":["v:seed"],"👍":[]}'::jsonb then raise exception 'guest removal failed'; end if;
  foreach v_emoji in array array['💡','🔥','🙏','✨'] loop
    v_rx := public.toggle_contribution_reaction('00000000-0000-0000-0000-000000000001', v_emoji, 'emoji-guest');
    if not (v_rx -> v_emoji ? 'v:emoji-guest') then raise exception 'supported emoji failed: %', v_emoji; end if;
  end loop;
  v_rx := public.toggle_contribution_reaction('00000000-0000-0000-0000-000000000011', '👍', 'reply-guest');
  if v_rx <> '{"likes":8,"👍":["v:reply-guest"]}'::jsonb then raise exception 'approved reply failed'; end if;
  v_rx := public.toggle_contribution_reaction('00000000-0000-0000-0000-000000000010', '✨', 'null-json-guest');
  if v_rx <> '{"✨":["v:null-json-guest"]}'::jsonb then raise exception 'null reactions compatibility failed'; end if;
  v_rx := public.toggle_contribution_reaction('00000000-0000-0000-0000-000000000030', '👍', 'nested-reply-guest');
  if v_rx <> '{"likes":9,"👍":["v:nested-reply-guest"]}'::jsonb then raise exception 'approved nested reply failed'; end if;
end;
$$;
reset role;
do $$
begin
  if exists (select 1 from public.research_contributions where id in (
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000030'
  ) and last_activity_at <> now()) then raise exception 'approved addition did not bump target/parent activity'; end if;
  if exists (
    (select * from public.research_contributions where id not in ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000030'))
    except (select * from baseline)
  ) then raise exception 'successful toggles changed a denied contribution'; end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
do $$
declare v_rx jsonb;
begin
  v_rx := public.toggle_contribution_reaction('00000000-0000-0000-0000-000000000011', '👍', 'ignored-visitor');
  if v_rx -> '👍' <> '["v:reply-guest","aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"]'::jsonb then
    raise exception 'authenticated identity was not server-derived: %', v_rx;
  end if;
  v_rx := public.toggle_contribution_reaction('00000000-0000-0000-0000-000000000011', '👍');
  if v_rx -> '👍' <> '["v:reply-guest"]'::jsonb then raise exception 'authenticated removal failed'; end if;
end;
$$;
reset role;

-- Removal retains the previous activity timestamp, unlike an addition.
update public.research_contributions set last_activity_at = '2020-01-01 00:00:00+00'
where id in ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000011');
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select public.toggle_contribution_reaction('00000000-0000-0000-0000-000000000011', '👍', 'reply-guest');
reset role;
do $$
begin
  if exists (select 1 from public.research_contributions where id in (
    '00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000011'
  ) and last_activity_at <> '2020-01-01 00:00:00+00') then raise exception 'removal bumped activity'; end if;
  if not has_function_privilege('anon','public.toggle_contribution_reaction(uuid,text,text)','execute')
    or not has_function_privilege('authenticated','public.toggle_contribution_reaction(uuid,text,text)','execute')
    or has_function_privilege('ungranted_reader','public.toggle_contribution_reaction(uuid,text,text)','execute') then
    raise exception 'RPC execute grant changed public guest/authenticated contract';
  end if;
  if not exists (select 1 from pg_proc where oid = 'public.toggle_contribution_reaction(uuid,text,text)'::regprocedure
    and prosecdef and proconfig = array['search_path=""']) then raise exception 'definer search_path is unsafe'; end if;
end;
$$;
set local role anon;
do $$
declare v_rx jsonb;
begin
  v_rx := public.toggle_contribution_reaction(md5('depth-bound:128')::uuid, '👍', 'bounded-chain-guest');
  if v_rx <> '{"likes":1,"👍":["v:bounded-chain-guest"]}'::jsonb then
    raise exception 'approved chain within the depth bound failed';
  end if;
end;
$$;
reset role;
select 'PASS: contribution reaction approved ancestry, denial atomicity and guest/auth compatibility' as result;
rollback;
