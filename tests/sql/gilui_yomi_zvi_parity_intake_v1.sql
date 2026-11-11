-- GILUI_YOMI_ZVI_PARITY_INTAKE_V1 — runs on a throwaway local PostgreSQL only (never a live project).
-- Run: bash scripts/run-gilui-yomi-zvi-parity-sql-test.sh
-- public.channel_ingest_sources below has the live column definitions (read 11.11.2026); the three rows copy the live intake settings of
-- «תורת הרמז», «הגילוי היומי» and one untouched sentinel source, with invented chat and sender ids.
\set ON_ERROR_STOP 1
set client_min_messages = warning;

create table public.channel_ingest_sources(
  id uuid not null default gen_random_uuid() primary key, channel text not null, chat_id text not null, label text,
  admin_only boolean not null default true, admin_ids text[] not null default '{}'::text[], priority integer not null default 50,
  enabled boolean not null default true, min_ts bigint, created_at timestamptz default now(), display_name text, logo_url text,
  use_sender_name boolean default false, capture_outgoing boolean default false, block_ids text[] default '{}'::text[],
  block_names text[] default '{}'::text[], poll_every_min integer default 3, last_run_at timestamptz,
  block_text text[] not null default '{}'::text[], intake_mode text not null default 'off', outgoing_contributor text);

insert into public.channel_ingest_sources(channel, chat_id, label, admin_only, admin_ids, enabled, min_ts, use_sender_name, capture_outgoing,
  poll_every_min, intake_mode, block_names) values
  ('torat-haremez', '100000000000000001@g.us', 'תורת הרמז', false, '{}', true, 1762891000, true, true, 5, 'research_first', '{}'),
  ('gilui-yomi', '100000000000000002@g.us', 'הגילוי היומי', true,
     array['000000000001@c.us','000000000002@c.us','000000000003@c.us','000000000004@c.us','000000000005@c.us','000000000006@c.us','000000000007@c.us'],
     true, 1762892000, true, true, 5, 'research_first', array['spam-name']),
  ('blaze-888', '100000000000000003@g.us', 'blaze', false, '{}', true, 1762893000, false, false, 5, 'research_first', '{}');

create table before_rows as select channel, to_jsonb(s) as row from public.channel_ingest_sources s;
create function changed_keys(p_channel text) returns text[] language sql as $f$
  select coalesce(array_agg(k order by k), '{}') from before_rows b, public.channel_ingest_sources s, jsonb_each(b.row) e(k, v)
   where b.channel = p_channel and s.channel = p_channel and (to_jsonb(s) -> k) is distinct from v $f$;
create function expect(p_ok boolean, p_what text) returns void language plpgsql as $f$
  begin if p_ok is not true then raise exception 'FAIL: %', p_what; end if; end $f$;

-- 1. Apply: exactly one field of exactly one row changes.
\ir ../../supabase/proposed/20261111230000_gilui_yomi_zvi_parity_intake_v1_PROPOSAL.sql
select expect(changed_keys('gilui-yomi') = array['admin_only'], 'apply changes only gilui-yomi.admin_only');
select expect((select admin_only from public.channel_ingest_sources where channel = 'gilui-yomi') is false, 'gilui-yomi admin_only=false');
select expect(changed_keys('torat-haremez') = '{}' and changed_keys('blaze-888') = '{}', 'other sources untouched');
select expect((select array_length(admin_ids, 1) from public.channel_ingest_sources where channel = 'gilui-yomi') = 7, 'admin_ids kept');
select expect((select (g.enabled, g.intake_mode, g.admin_only, g.use_sender_name, g.capture_outgoing, g.poll_every_min)
   is not distinct from (t.enabled, t.intake_mode, t.admin_only, t.use_sender_name, t.capture_outgoing, t.poll_every_min)
   from public.channel_ingest_sources g, public.channel_ingest_sources t where g.channel = 'gilui-yomi' and t.channel = 'torat-haremez'),
  'gilui-yomi intake settings equal torat-haremez');
select 'PASS 1 apply: only gilui-yomi.admin_only changed (true -> false); admin list kept; torat-haremez and the sentinel untouched' as result;

-- 2. A second run refuses and changes nothing (the precondition requires admin_only=true).
create table after_apply as select channel, to_jsonb(s) as row from public.channel_ingest_sources s;
\set ON_ERROR_STOP 0
\ir ../../supabase/proposed/20261111230000_gilui_yomi_zvi_parity_intake_v1_PROPOSAL.sql
\set ON_ERROR_STOP 1
select expect(not exists(select 1 from after_apply a join public.channel_ingest_sources s on s.channel = a.channel where to_jsonb(s) is distinct from a.row),
  'second apply changes nothing');
select 'PASS 2 a second apply refuses (precondition) and leaves every row as it was' as result;

-- 3. Rollback restores the exact previous row; a second rollback refuses.
\ir ../../supabase/proposed/ROLLBACK_20261111230000_gilui_yomi_zvi_parity_intake_v1.sql
select expect(changed_keys('gilui-yomi') = '{}' and changed_keys('torat-haremez') = '{}' and changed_keys('blaze-888') = '{}',
  'rollback restores every row exactly');
\set ON_ERROR_STOP 0
\ir ../../supabase/proposed/ROLLBACK_20261111230000_gilui_yomi_zvi_parity_intake_v1.sql
\set ON_ERROR_STOP 1
select expect(changed_keys('gilui-yomi') = '{}', 'second rollback changes nothing');
select 'PASS 3 rollback restores the exact previous row (admin_only=true with the same admin list); a second rollback refuses' as result;

-- 4. Refusals when the live state is not the one read on 11.11.2026.
update public.channel_ingest_sources set admin_only = true where channel = 'torat-haremez';
\set ON_ERROR_STOP 0
\ir ../../supabase/proposed/20261111230000_gilui_yomi_zvi_parity_intake_v1_PROPOSAL.sql
\set ON_ERROR_STOP 1
select expect((select admin_only from public.channel_ingest_sources where channel = 'gilui-yomi') is true, 'refuses when the model changed');
update public.channel_ingest_sources set admin_only = false where channel = 'torat-haremez';
update public.channel_ingest_sources set intake_mode = 'live' where channel = 'gilui-yomi';
\set ON_ERROR_STOP 0
\ir ../../supabase/proposed/20261111230000_gilui_yomi_zvi_parity_intake_v1_PROPOSAL.sql
\set ON_ERROR_STOP 1
select expect((select admin_only from public.channel_ingest_sources where channel = 'gilui-yomi') is true, 'refuses when gilui-yomi is not research_first');
update public.channel_ingest_sources set intake_mode = 'research_first', admin_ids = '{}' where channel = 'gilui-yomi';
\set ON_ERROR_STOP 0
\ir ../../supabase/proposed/20261111230000_gilui_yomi_zvi_parity_intake_v1_PROPOSAL.sql
\set ON_ERROR_STOP 1
select expect((select admin_only from public.channel_ingest_sources where channel = 'gilui-yomi') is true, 'refuses without an admin list to restore');
insert into public.channel_ingest_sources(channel, chat_id, admin_only, admin_ids, intake_mode, use_sender_name, capture_outgoing, poll_every_min)
  values ('gilui-yomi', '100000000000000009@g.us', true, array['x@c.us'], 'research_first', true, true, 5);
update public.channel_ingest_sources set admin_ids = array['000000000001@c.us'] where channel = 'gilui-yomi' and chat_id = '100000000000000002@g.us';
\set ON_ERROR_STOP 0
\ir ../../supabase/proposed/20261111230000_gilui_yomi_zvi_parity_intake_v1_PROPOSAL.sql
\set ON_ERROR_STOP 1
select expect((select bool_and(admin_only) from public.channel_ingest_sources where channel = 'gilui-yomi'), 'refuses with two gilui-yomi sources');
select 'PASS 4 refuses (nothing changed) when torat-haremez changed, when gilui-yomi is not research_first, without an admin list, or with two gilui-yomi sources' as result;
