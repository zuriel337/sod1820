-- GILUI_YOMI_KANDRO_IDENTITY_BINDING_V1 + GILUI_YOMI_KANDRO_SOURCE_ROWS_STAY_V1 — throwaway local PostgreSQL only (never a live project).
-- Run: bash scripts/run-gilui-yomi-kandro-sql-test.sh
-- The proof function, the phone-digits function and the 24-hour trigger are the LIVE ones, byte for byte (md5 asserted below against the
-- values read on 11.11.2026). Tables carry the columns these functions read. Every sender id here is invented.
\set ON_ERROR_STOP 1
set client_min_messages = warning;

create function expect(p_ok boolean, p_what text) returns void language plpgsql as $f$
  begin if p_ok is not true then raise exception 'FAIL: %', p_what; end if; end $f$;

create table public.contributors(id uuid primary key default gen_random_uuid(), slug text unique, display_name text, phone text, user_id uuid,
  active boolean default true, dossier_settings jsonb default '{}'::jsonb);
create table public.wa_account_links(id bigserial primary key, user_id uuid not null, phone text not null, verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(), credited_msgs integer not null default 0, welcomed_at timestamptz);
create table public.channel_ingest_sources(id uuid primary key default gen_random_uuid(), channel text not null, chat_id text not null,
  admin_only boolean not null default true, admin_ids text[] not null default '{}'::text[], enabled boolean not null default true,
  intake_mode text not null default 'off');
create table public.channel_updates(id uuid primary key default gen_random_uuid(), channel text, text text, credit text, speaker text,
  created_at timestamptz default now(), expires_at timestamptz, group_source_intake_public boolean default false, contributor_id uuid,
  ext_msg_id text, source text default 'auto', status text default 'private', image_url text, thumb_url text);
create table public.channel_update_group_proof(update_id uuid primary key, source_id uuid, channel text, ext_msg_id text unique, group_chat_id text,
  sender_jid text, identity_contributor_id uuid, identity_basis text, incoming boolean, text_only boolean, proven_at timestamptz default now(),
  held_at timestamptz, held_by uuid);

\ir fixtures/gilui_yomi_live_base_20261111/fn_wa_phone_digits.sql
\ir fixtures/gilui_yomi_live_base_20261111/tg_gilui_shachar_24h.sql
\ir fixtures/gilui_yomi_live_base_20261111/record_channel_update_group_proof_v1.sql
create trigger trg_gilui_shachar_24h before insert on public.channel_updates for each row execute function public.tg_gilui_shachar_24h();
select expect(md5(pg_get_functiondef('public.fn_wa_phone_digits(text)'::regprocedure)) = '4cf0ae5f7ad240a7cef4e533e0437528', 'fn_wa_phone_digits is the live one');
select expect(md5(pg_get_functiondef('public.tg_gilui_shachar_24h()'::regprocedure)) = 'bca6a8fbd895c5983a0d801173d909cd', 'tg_gilui_shachar_24h is the live one');
select expect(md5(pg_get_functiondef('public.record_channel_update_group_proof_v1(uuid,uuid,text,text,text,boolean,text)'::regprocedure))
  = 'eb6551cf1f71dbb5943c6e249b3c978b', 'record_channel_update_group_proof_v1 is the live one');

insert into public.contributors(slug, display_name, phone, user_id) values
  ('shachar-kandro', 'שחר יצחק קנדרו', null, null),
  ('yaniv-levi', 'יניב לוי', null, '00000000-0000-4000-8000-0000000000a2'),
  ('tzvi-opoc', 'צבי', null, '00000000-0000-4000-8000-0000000000a3');
insert into public.wa_account_links(user_id, phone) values
  ('00000000-0000-4000-8000-0000000000a2', '000000000201'), ('00000000-0000-4000-8000-0000000000a3', '000000000301');
insert into public.channel_ingest_sources(id, channel, chat_id, admin_only, admin_ids, intake_mode) values
  ('00000000-0000-4000-8000-0000000000b1', 'gilui-yomi', '100000000000000002@g.us', true,
   array['000000000101@c.us', '000000000201@c.us', '000000000501@c.us'], 'research_first');

-- What the ingest does for one group message: insert the row (status private), then record the group proof for incoming text.
create function ingest(p_sender text, p_credit text, p_intake boolean default true) returns uuid language plpgsql as $f$
declare v_id uuid; v_msg text := 'm-' || gen_random_uuid();
begin
  insert into public.channel_updates(channel, text, credit, created_at, group_source_intake_public, ext_msg_id)
  values ('gilui-yomi', 'גילוי', p_credit, now(), p_intake, v_msg) returning id into v_id;
  if p_intake then
    perform public.record_channel_update_group_proof_v1(v_id, '00000000-0000-4000-8000-0000000000b1', v_msg, '100000000000000002@g.us',
      p_sender, true, 'textMessage');
  end if;
  return v_id;
end $f$;
create function basis(p_id uuid) returns text language sql as $f$ select identity_basis from public.channel_update_group_proof where update_id = p_id $f$;
create function kandro() returns uuid language sql as $f$ select id from public.contributors where slug = 'shachar-kandro' $f$;

-- 0. Today: Kandro's messages are unverified (no phone, no account) and expire after 24 hours; Levi is verified through his link.
create table old_kandro as select ingest('000000000101@c.us', 'שחר יצחק קנדרו') as id union all select ingest('000000000101@c.us', 'שחר יצחק קנדרו');
select expect((select bool_and(basis(id) = 'unverified') from old_kandro), 'old Kandro messages are unverified');
select expect((select bool_and(cu.expires_at = cu.created_at + interval '24 hours') from old_kandro o join public.channel_updates cu on cu.id = o.id),
  'the live trigger gives Kandro rows 24 hours');
select expect(basis(ingest('000000000201@c.us', 'יניב לוי')) = 'verified_phone_unique', 'Levi is verified through his WhatsApp link');
select 'PASS 0 baseline: Kandro unverified with a 24-hour expiry; Levi verified (live functions)' as result;

-- 1. Refusals while unbound (each leaves the database as it was).
create table before_contributors as select * from public.contributors;
\set ON_ERROR_STOP 0
update public.channel_ingest_sources set admin_ids = array['000000000201@c.us'] where channel = 'gilui-yomi';
\ir ../../supabase/proposed/20261111231000_gilui_yomi_kandro_identity_binding_v1_PROPOSAL.sql
update public.channel_ingest_sources set admin_ids = array['000000000101@c.us', '000000000201@c.us', '000000000501@c.us'] where channel = 'gilui-yomi';
\set ON_ERROR_STOP 1
select expect((select phone from public.contributors where slug = 'shachar-kandro') is null, 'refuses when the sender is not an admin');
\set ON_ERROR_STOP 0
insert into public.wa_account_links(user_id, phone) values ('00000000-0000-4000-8000-0000000000a9', '000000000101');
\ir ../../supabase/proposed/20261111231000_gilui_yomi_kandro_identity_binding_v1_PROPOSAL.sql
delete from public.wa_account_links where user_id = '00000000-0000-4000-8000-0000000000a9';
\set ON_ERROR_STOP 1
select expect((select phone from public.contributors where slug = 'shachar-kandro') is null, 'refuses when the number belongs to a linked account');
\set ON_ERROR_STOP 0
create temp table tmp_other as select ingest('000000000101@c.us', 'מישהו אחר') as id;
\ir ../../supabase/proposed/20261111231000_gilui_yomi_kandro_identity_binding_v1_PROPOSAL.sql
\set ON_ERROR_STOP 1
select expect((select phone from public.contributors where slug = 'shachar-kandro') is null, 'refuses when the sender also wrote under another name');
delete from public.channel_update_group_proof where update_id in (select id from tmp_other);
delete from public.channel_updates where id in (select id from tmp_other);
\set ON_ERROR_STOP 0
create temp table tmp_second as select ingest('000000000501@c.us', 'קנדרו המקורי') as id;
\ir ../../supabase/proposed/20261111231000_gilui_yomi_kandro_identity_binding_v1_PROPOSAL.sql
\set ON_ERROR_STOP 1
select expect((select phone from public.contributors where slug = 'shachar-kandro') is null, 'refuses with two senders signed קנדרו');
delete from public.channel_update_group_proof where update_id in (select id from tmp_second);
delete from public.channel_updates where id in (select id from tmp_second);
select expect(not exists (select * from public.contributors except select * from before_contributors), 'refusals changed no contributor');
select 'PASS 1 binding refuses (nothing changed): sender not an admin, number already linked, sender wrote under another name, two senders signed קנדרו' as result;

-- 2. Apply: only Kandro's phone changes; old messages stay unverified; his next message is verified like Zvi's.
\ir ../../supabase/proposed/20261111231000_gilui_yomi_kandro_identity_binding_v1_PROPOSAL.sql
select expect((select phone from public.contributors where slug = 'shachar-kandro') = public.fn_wa_phone_digits('000000000101@c.us'), 'Kandro is bound to the sender');
select expect(not exists (select c.slug from public.contributors c join before_contributors b using (id)
  where c.slug <> 'shachar-kandro' and (to_jsonb(c) is distinct from to_jsonb(b))), 'no other contributor changed');
select expect((select (to_jsonb(c) - 'phone') = (to_jsonb(b) - 'phone') from public.contributors c join before_contributors b using (id)
  where c.slug = 'shachar-kandro'), 'only the phone of shachar-kandro changed');
select expect((select bool_and(basis(id) = 'unverified') from old_kandro), 'old messages keep their first proof (unverified, private)');
create table new_kandro as select ingest('000000000101@c.us', 'שחר יצחק קנדרו') as id;
select expect((select basis(id) = 'verified_phone_unique' from new_kandro), 'the next Kandro message is verified');
select expect((select g.identity_contributor_id = kandro() and cu.contributor_id = kandro()
  from new_kandro n join public.channel_update_group_proof g on g.update_id = n.id join public.channel_updates cu on cu.id = n.id), 'proved as shachar-kandro');
\set ON_ERROR_STOP 0
\ir ../../supabase/proposed/20261111231000_gilui_yomi_kandro_identity_binding_v1_PROPOSAL.sql
\set ON_ERROR_STOP 1
select expect((select phone from public.contributors where slug = 'shachar-kandro') = public.fn_wa_phone_digits('000000000101@c.us'), 'a second apply refuses and keeps the binding');
select 'PASS 2 binding: only shachar-kandro.phone changes; old messages stay unverified; the next one is verified_phone_unique as shachar-kandro; a second run refuses' as result;

-- 3. Rollback: new messages are unverified again; proofs already made stay as they are; a second rollback refuses.
\ir ../../supabase/proposed/ROLLBACK_20261111231000_gilui_yomi_kandro_identity_binding_v1.sql
select expect((select phone from public.contributors where slug = 'shachar-kandro') is null, 'rollback removes the number');
select expect(basis(ingest('000000000101@c.us', 'שחר יצחק קנדרו')) = 'unverified', 'after rollback a new message is unverified');
select expect((select basis(id) = 'verified_phone_unique' from new_kandro), 'the proof made while bound stands');
\set ON_ERROR_STOP 0
\ir ../../supabase/proposed/ROLLBACK_20261111231000_gilui_yomi_kandro_identity_binding_v1.sql
\set ON_ERROR_STOP 1
select 'PASS 3 binding rollback: the number is removed, new messages are unverified, earlier proofs stand, a second rollback refuses' as result;

-- 4. Source rows stay: a new incoming text row of Kandro gets no expiry; every other row signed קנדרו keeps 24 hours; old rows unchanged.
create table expiries_before as select id, expires_at from public.channel_updates;
\ir ../../supabase/proposed/20261111231500_gilui_yomi_kandro_source_rows_stay_v1_PROPOSAL.sql
select expect(md5(pg_get_functiondef('public.tg_gilui_shachar_24h()'::regprocedure)) = 'a7d0e58c3c59c548a98c694911064899', 'new trigger definition');
select expect(not exists (select 1 from expiries_before b join public.channel_updates cu using (id) where cu.expires_at is distinct from b.expires_at), 'existing rows keep their expiry');
create temp table t_intake as select ingest('000000000101@c.us', 'שחר יצחק קנדרו') as id;
select expect((select cu.expires_at is null from public.channel_updates cu join t_intake using (id)), 'an intake row of Kandro gets no expiry');
create temp table t_plain as select ingest('000000000101@c.us', 'שחר יצחק קנדרו', false) as id;
select expect((select cu.expires_at = cu.created_at + interval '24 hours' from public.channel_updates cu join t_plain using (id)), 'a non-intake row of Kandro keeps 24 hours');
create temp table t_levi as select ingest('000000000201@c.us', 'יניב לוי') as id;
select expect((select cu.expires_at is null from public.channel_updates cu join t_levi using (id)), 'other writers are untouched');
\set ON_ERROR_STOP 0
\ir ../../supabase/proposed/20261111231500_gilui_yomi_kandro_source_rows_stay_v1_PROPOSAL.sql
\set ON_ERROR_STOP 1
select expect(md5(pg_get_functiondef('public.tg_gilui_shachar_24h()'::regprocedure)) = 'a7d0e58c3c59c548a98c694911064899', 'a second apply refuses');
\ir ../../supabase/proposed/ROLLBACK_20261111231500_gilui_yomi_kandro_source_rows_stay_v1.sql
select expect(md5(pg_get_functiondef('public.tg_gilui_shachar_24h()'::regprocedure)) = 'bca6a8fbd895c5983a0d801173d909cd', 'rollback restores the live definition');
create temp table t_again as select ingest('000000000101@c.us', 'שחר יצחק קנדרו') as id;
select expect((select cu.expires_at = cu.created_at + interval '24 hours' from public.channel_updates cu join t_again using (id)), 'after rollback an intake row of Kandro expires again');
\set ON_ERROR_STOP 0
\ir ../../supabase/proposed/ROLLBACK_20261111231500_gilui_yomi_kandro_source_rows_stay_v1.sql
\set ON_ERROR_STOP 1
select expect(md5(pg_get_functiondef('public.tg_gilui_shachar_24h()'::regprocedure)) = 'bca6a8fbd895c5983a0d801173d909cd', 'a second rollback refuses');
select 'PASS 4 source rows stay: an incoming text row of Kandro has no expiry, other rows signed קנדרו keep 24 hours, existing rows unchanged; second run and rollback refuse; rollback restores the live trigger' as result;
