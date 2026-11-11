-- Throwaway local Postgres test for GILUI_YOMI_WRITER_PINS_V1 (schema) and GILUI_YOMI_LIVE_ALL_MEMBERS_CONFIG (data).
-- Never run against a live project. Minimal stand-ins for the live tables/function the two files touch; fake numbers only.
\set ON_ERROR_STOP on
create role anon nologin;
create function public.fn_wa_phone_digits(p text) returns text language sql immutable set search_path to 'pg_catalog' as $$
  select case when d is null or d = '' then null when d like '0%' then '972' || substr(d, 2) else d end
  from (select regexp_replace(coalesce(split_part(p, '@', 1), ''), '\D', '', 'g') as d) t $$;
create table public.channel_ingest_sources (id uuid primary key default gen_random_uuid(), channel text not null, chat_id text not null,
  admin_only boolean not null default true, admin_ids text[] not null default '{}', priority int not null default 50, intake_mode text not null default 'off');
create table public.channel_updates (id uuid primary key default gen_random_uuid(), text text not null, status text default 'live',
  channel text default 'main', created_at timestamptz default now(), credit text);
grant select on public.channel_updates to anon;
create table public.wa_vip_senders (id bigserial primary key, sender text, name_match text, active boolean default true);
create table public.contributors (id uuid primary key default gen_random_uuid(), slug text, user_id uuid);
create table public.wa_account_links (id bigserial primary key, user_id uuid, phone text, verified_at timestamptz);

insert into public.channel_ingest_sources (channel, chat_id, admin_only, admin_ids, priority, intake_mode) values
  ('gilui-yomi', '1203@g.us', true, array['972500000001@c.us', '972500000002@c.us', '972500000003@c.us'], 55, 'research_first'),
  ('or-geula', '9725-1@g.us', true, array['972500000009@c.us'], 50, 'story_first_selective');
insert into public.wa_vip_senders (sender, name_match, active) values ('972500000001@c.us', 'יצחק שחר קנדרו', true), ('972500000007@c.us', 'צבי', true);
insert into public.contributors (slug, user_id) values ('yaniv-levi', '00000000-0000-4000-8000-000000000002'), ('other', '00000000-0000-4000-8000-000000000003');
insert into public.wa_account_links (user_id, phone, verified_at) values
  ('00000000-0000-4000-8000-000000000002', '050-0000002', now()),
  ('00000000-0000-4000-8000-000000000002', '050-0000099', null);   -- an unverified link never counts

\i supabase/proposed/20261111170000_gilui_yomi_writer_pins_v1_PROPOSAL.sql
-- idempotent
\i supabase/proposed/20261111170000_gilui_yomi_writer_pins_v1_PROPOSAL.sql

do $$ begin
  if (select pin_hours from public.channel_ingest_sources where channel = 'or-geula') <> 24 then raise exception 'pin_hours default'; end if;
  if (select cardinality(pin_ids) from public.channel_ingest_sources where channel = 'or-geula') <> 0 then raise exception 'pin_ids default'; end if;
  if not has_column_privilege('anon', 'public.channel_updates', 'pinned_until', 'select') then raise exception 'anon cannot read pinned_until'; end if;
  begin
    update public.channel_ingest_sources set pin_hours = 0 where channel = 'or-geula';
    raise exception 'pin_hours check missing';
  exception when check_violation then null; end;
end $$;

\i supabase/proposed/20261111170500_gilui_yomi_live_all_members_config_PROPOSAL.sql

do $$ declare s record; o record; begin
  select * into s from public.channel_ingest_sources where channel = 'gilui-yomi';
  select * into o from public.channel_ingest_sources where channel = 'or-geula';
  if s.admin_only is not false then raise exception 'admin_only not opened'; end if;
  if s.pin_ids <> array['972500000001@c.us', '972500000002@c.us'] then raise exception 'pin_ids %', s.pin_ids; end if;
  if s.pin_hours <> 24 then raise exception 'pin_hours'; end if;
  if cardinality(s.admin_ids) <> 3 then raise exception 'admin_ids must be kept for rollback'; end if;
  if s.intake_mode <> 'research_first' then raise exception 'research intake must not change'; end if;
  if o.admin_only is not true or cardinality(o.pin_ids) <> 0 then raise exception 'another channel changed'; end if;
end $$;

-- Fails closed: a writer whose number is not a known admin of the group stops the whole block (nothing is written).
update public.channel_ingest_sources set admin_only = true, pin_ids = '{}' where channel = 'gilui-yomi';
update public.wa_vip_senders set sender = '972500000055@c.us' where name_match = 'יצחק שחר קנדרו';
\set ON_ERROR_STOP off
\i supabase/proposed/20261111170500_gilui_yomi_live_all_members_config_PROPOSAL.sql
\set ON_ERROR_STOP on
do $$ begin
  if (select admin_only from public.channel_ingest_sources where channel = 'gilui-yomi') is not true then raise exception 'a failed check still wrote'; end if;
end $$;

-- Two numbers for one writer also stop it.
update public.wa_vip_senders set sender = '972500000001@c.us' where name_match = 'יצחק שחר קנדרו';
insert into public.wa_vip_senders (sender, name_match, active) values ('972500000003@c.us', 'יצחק שחר קנדרו', true);
\set ON_ERROR_STOP off
\i supabase/proposed/20261111170500_gilui_yomi_live_all_members_config_PROPOSAL.sql
\set ON_ERROR_STOP on
do $$ begin
  if cardinality((select pin_ids from public.channel_ingest_sources where channel = 'gilui-yomi')) <> 0 then raise exception 'ambiguous writer still pinned'; end if;
end $$;
delete from public.wa_vip_senders where sender = '972500000003@c.us';

-- Rollbacks.
\i supabase/proposed/20261111170500_gilui_yomi_live_all_members_config_PROPOSAL.sql
\i supabase/proposed/ROLLBACK_20261111170500_gilui_yomi_live_all_members_config.sql
do $$ begin
  if (select admin_only from public.channel_ingest_sources where channel = 'gilui-yomi') is not true then raise exception 'config rollback'; end if;
  if cardinality((select pin_ids from public.channel_ingest_sources where channel = 'gilui-yomi')) <> 0 then raise exception 'config rollback pins'; end if;
end $$;
\i supabase/proposed/ROLLBACK_20261111170000_gilui_yomi_writer_pins_v1.sql
do $$ begin
  if exists (select 1 from information_schema.columns where table_name = 'channel_updates' and column_name = 'pinned_until') then raise exception 'schema rollback'; end if;
  if exists (select 1 from information_schema.columns where table_name = 'channel_ingest_sources' and column_name in ('pin_ids', 'pin_hours')) then raise exception 'schema rollback registry'; end if;
end $$;
select 'PASS gilui_yomi_writer_pins_v1';
