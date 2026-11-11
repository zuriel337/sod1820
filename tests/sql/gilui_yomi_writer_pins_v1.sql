-- Throwaway local Postgres test for GILUI_YOMI_WRITER_PINS_V1 (schema), the ACTIVATION, STOP and UNPUBLISH files.
-- Never run against a live project. Minimal stand-ins for the live tables, function and triggers they touch; fake numbers only.
\set ON_ERROR_STOP on
\set QUIET on
create role anon nologin;
create function public.fn_wa_phone_digits(p text) returns text language sql immutable set search_path to 'pg_catalog' as $$
  select case when d is null or d = '' then null when d like '0%' then '972' || substr(d, 2) else d end
  from (select regexp_replace(coalesce(split_part(p, '@', 1), ''), '\D', '', 'g') as d) t $$;
create table public.channel_ingest_sources (id uuid primary key default gen_random_uuid(), channel text not null, chat_id text not null,
  admin_only boolean not null default true, admin_ids text[] not null default '{}', priority int not null default 50,
  intake_mode text not null default 'off', use_sender_name boolean default false, enabled boolean not null default true);
create table public.channel_updates (id uuid primary key default gen_random_uuid(), text text not null, status text default 'live',
  channel text default 'main', source text default 'admin', created_at timestamptz default now(), credit text, speaker text,
  expires_at timestamptz, group_source_intake_public boolean not null default false, contributor_id uuid);
grant select on public.channel_updates to anon;
-- live copies of the two existing triggers the files interact with
create function public.tg_gilui_shachar_24h() returns trigger language plpgsql as $$
begin
  if new.channel = 'gilui-yomi' and (coalesce(new.credit,'') ilike '%קנדרו%' or coalesce(new.speaker,'') ilike '%קנדרו%') and new.expires_at is null
  then new.expires_at := coalesce(new.created_at, now()) + interval '24 hours'; end if;
  return new;
end $$;
create trigger trg_gilui_shachar_24h before insert on public.channel_updates for each row execute function public.tg_gilui_shachar_24h();
create function public.guard_group_source_status_hold_v1() returns trigger language plpgsql set search_path to 'pg_catalog' as $$
begin if new.status is distinct from 'live' then new.group_source_intake_public := false; end if; return new; end $$;
create trigger trg_group_source_status_hold_v1 before update of status on public.channel_updates for each row execute function public.guard_group_source_status_hold_v1();
create table public.wa_vip_senders (id bigserial primary key, sender text, name_match text, active boolean default true);
create table public.contributors (id uuid primary key default gen_random_uuid(), slug text, display_name text, user_id uuid, active boolean default true);
create table public.wa_account_links (id bigserial primary key, user_id uuid, phone text, verified_at timestamptz);

insert into public.channel_ingest_sources (channel, chat_id, admin_only, admin_ids, priority, intake_mode, use_sender_name) values
  ('gilui-yomi', '1203@g.us', true, array['972500000001@c.us', '972500000002@c.us', '972500000003@c.us'], 55, 'research_first', true),
  ('or-geula', '9725-1@g.us', true, array['972500000009@c.us'], 50, 'story_first_selective', false);
insert into public.wa_vip_senders (sender, name_match, active) values ('972500000001@c.us', 'יצחק שחר קנדרו', true), ('972500000007@c.us', 'צבי', true);
insert into public.contributors (slug, display_name, user_id) values
  ('shachar-kandro', 'יצחק שחר קנדרו', null),
  ('yaniv-levi', 'יניב לוי', '00000000-0000-4000-8000-000000000002');
insert into public.wa_account_links (user_id, phone, verified_at) values
  ('00000000-0000-4000-8000-000000000002', '050-0000002', now()),
  ('00000000-0000-4000-8000-000000000002', '050-0000099', null);   -- an unverified link never counts
-- The historical private rows (stand-in for the 105) and one manual admin post that is already live.
insert into public.channel_updates (text, status, channel, source, created_at, credit, group_source_intake_public)
  select 'היסטורי ' || g, 'private', 'gilui-yomi', 'auto', now() - (g || ' hours')::interval, 'יוסף בלו', true from generate_series(1, 105) g;
insert into public.channel_updates (text, status, channel, source, credit) values ('פרסום ידני', 'live', 'gilui-yomi', 'admin', 'ציון סיבוני');
create temp table before_rows as select id, status, credit, expires_at, group_source_intake_public from public.channel_updates;

-- 1. Schema: idempotent, and by itself opens nothing.
\i supabase/proposed/20261111170000_gilui_yomi_writer_pins_v1_PROPOSAL.sql
\i supabase/proposed/20261111170000_gilui_yomi_writer_pins_v1_PROPOSAL.sql
do $$ declare r record; begin
  for r in select * from public.channel_ingest_sources loop
    if r.live_from is not null or r.pin_writers <> '[]'::jsonb or r.pin_hours <> 24 then raise exception 'schema changed a policy: %', r.channel; end if;
  end loop;
  if not has_column_privilege('anon', 'public.channel_updates', 'pinned_until', 'select') then raise exception 'anon cannot read pinned_until'; end if;
  begin update public.channel_ingest_sources set pin_hours = 0 where channel = 'or-geula'; raise exception 'pin_hours check missing';
  exception when check_violation then null; end;
  begin update public.channel_ingest_sources set pin_writers = '{}'::jsonb where channel = 'or-geula'; raise exception 'pin_writers check missing';
  exception when check_violation then null; end;
end $$;

-- 2. Fail closed: a writer number that is not a known admin of the group stops the block; nothing is written.
update public.wa_vip_senders set sender = '972500000055@c.us' where name_match = 'יצחק שחר קנדרו';
\set ON_ERROR_STOP off
\i supabase/proposed/20261111170500_gilui_yomi_live_all_members_activation_PROPOSAL.sql
\set ON_ERROR_STOP on
do $$ begin if (select live_from from public.channel_ingest_sources where channel = 'gilui-yomi') is not null then raise exception 'a failed check still wrote'; end if; end $$;
-- Two numbers for one writer also stop it.
update public.wa_vip_senders set sender = '972500000001@c.us' where name_match = 'יצחק שחר קנדרו';
insert into public.wa_vip_senders (sender, name_match, active) values ('972500000003@c.us', 'יצחק שחר קנדרו', true);
\set ON_ERROR_STOP off
\i supabase/proposed/20261111170500_gilui_yomi_live_all_members_activation_PROPOSAL.sql
\set ON_ERROR_STOP on
do $$ begin if (select live_from from public.channel_ingest_sources where channel = 'gilui-yomi') is not null then raise exception 'an ambiguous writer still activated'; end if; end $$;
delete from public.wa_vip_senders where sender = '972500000003@c.us';

-- 3. Activation: exactly the registry of gilui-yomi changes; no channel_updates row changes (the 105 stay private).
\i supabase/proposed/20261111170500_gilui_yomi_live_all_members_activation_PROPOSAL.sql
do $$ declare s record; o record; begin
  select * into s from public.channel_ingest_sources where channel = 'gilui-yomi';
  select * into o from public.channel_ingest_sources where channel = 'or-geula';
  if s.live_from is null or abs(extract(epoch from (s.live_from - now()))) > 60 then raise exception 'live_from must be the moment of applying'; end if;
  if s.admin_only is not false or cardinality(s.admin_ids) <> 3 then raise exception 'admin_only/admin_ids'; end if;
  if s.pin_writers <> '[{"jid":"972500000001@c.us","name":"יצחק שחר קנדרו"},{"jid":"972500000002@c.us","name":"יניב לוי"}]'::jsonb then raise exception 'pin_writers %', s.pin_writers; end if;
  if s.pin_hours <> 24 or s.intake_mode <> 'research_first' or s.use_sender_name is not true or s.enabled is not true then raise exception 'other settings changed'; end if;
  if o.live_from is not null or o.pin_writers <> '[]'::jsonb or o.admin_only is not true then raise exception 'another source changed'; end if;
  if exists (select 1 from public.channel_updates c join before_rows b using (id)
             where (c.status, c.credit, c.expires_at, c.group_source_intake_public) is distinct from (b.status, b.credit, b.expires_at, b.group_source_intake_public))
  then raise exception 'activation touched existing rows'; end if;
  if (select count(*) from public.channel_updates where channel = 'gilui-yomi' and status = 'private') <> 105 then raise exception 'the 105 must stay private'; end if;
end $$;
-- The moment is never moved silently: a second activation stops and leaves the first moment.
select live_from as activated_at from public.channel_ingest_sources where channel = 'gilui-yomi' \gset
set sod.test_first = :'activated_at';
\set ON_ERROR_STOP off
\i supabase/proposed/20261111170500_gilui_yomi_live_all_members_activation_PROPOSAL.sql
\set ON_ERROR_STOP on
do $$ begin
  if (select live_from from public.channel_ingest_sources where channel = 'gilui-yomi') <> current_setting('sod.test_first')::timestamptz then raise exception 'moment moved'; end if;
end $$;

-- 4. Rows as the ingest writes them after activation; the existing 24-hour rule keeps keying on Kandro's (registry) name.
insert into public.channel_updates (text, status, channel, source, credit, pinned_until, created_at) values
  ('גילוי של שחר', 'live', 'gilui-yomi', 'auto', 'יצחק שחר קנדרו', now() + interval '24 hours', now()),
  ('גילוי של יניב', 'live', 'gilui-yomi', 'auto', 'יניב לוי', now() + interval '24 hours', now()),
  ('הודעת חבר', 'live', 'gilui-yomi', 'auto', 'הגילוי היומי', null, now());
do $$ begin
  if (select expires_at - created_at from public.channel_updates where text = 'גילוי של שחר') <> interval '24 hours' then raise exception 'Kandro 24h rule no longer applies'; end if;
  if (select expires_at from public.channel_updates where text = 'גילוי של יניב') is not null then raise exception 'Levi must not expire'; end if;
  if (select expires_at from public.channel_updates where text = 'הודעת חבר') is not null then raise exception 'member must not expire'; end if;
end $$;

-- 5. STOP: back to the previous policy for what is not yet processed; what was published stays published.
\i supabase/proposed/STOP_20261111170500_gilui_yomi_live_all_members.sql
do $$ declare s record; begin
  select * into s from public.channel_ingest_sources where channel = 'gilui-yomi';
  if s.live_from is not null or s.admin_only is not true or s.pin_writers <> '[]'::jsonb or s.enabled is not true then raise exception 'stop'; end if;
  if (select count(*) from public.channel_updates where channel = 'gilui-yomi' and status = 'live' and source = 'auto') <> 3 then raise exception 'stop must not unpublish'; end if;
end $$;

-- 6. UNPUBLISH: without the recorded moment it stops; with it, exactly the post-activation ingest rows are hidden.
\set ON_ERROR_STOP off
\i supabase/proposed/UNPUBLISH_20261111170500_gilui_yomi_published_rows.sql
\set ON_ERROR_STOP on
do $$ begin if (select count(*) from public.channel_updates where status = 'hidden') <> 0 then raise exception 'unpublish ran without a moment'; end if; end $$;
set sod.gilui_activated_at = :'activated_at';
\i supabase/proposed/UNPUBLISH_20261111170500_gilui_yomi_published_rows.sql
do $$ begin
  if (select count(*) from public.channel_updates where status = 'hidden') <> 3 then raise exception 'unpublish scope'; end if;
  if exists (select 1 from public.channel_updates where status = 'hidden' and pinned_until is not null) then raise exception 'pins not cleared'; end if;
  if (select status from public.channel_updates where text = 'פרסום ידני') <> 'live' then raise exception 'manual admin post must stay'; end if;
  if (select count(*) from public.channel_updates where channel = 'gilui-yomi' and status = 'private') <> 105 then raise exception 'the 105 changed'; end if;
end $$;

-- 7. Schema rollback.
\i supabase/proposed/ROLLBACK_20261111170000_gilui_yomi_writer_pins_v1.sql
do $$ begin
  if exists (select 1 from information_schema.columns where table_name = 'channel_updates' and column_name = 'pinned_until') then raise exception 'schema rollback'; end if;
  if exists (select 1 from information_schema.columns where table_name = 'channel_ingest_sources' and column_name in ('live_from', 'pin_writers', 'pin_hours')) then raise exception 'schema rollback registry'; end if;
end $$;
\set QUIET off
select 'PASS gilui_yomi_writer_pins_v1';
