-- Role + provenance tests for world_group_source_arrivals_v1 / admin_set_contributor_general_feed_v1.
-- Runs on a THROWAWAY local Postgres only (scripts/run-world-group-source-sql-test.sh). Never a live project.
-- Stub tables carry only the columns the migration reads; messages are synthetic.
\set ON_ERROR_STOP on
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
create table public.users (id uuid primary key, role text);
create table public.contributors (id uuid primary key, slug text unique, display_name text, dossier_settings jsonb);
create table public.channel_ingest_sources (id uuid primary key default gen_random_uuid(), channel text, chat_id text, enabled boolean, intake_mode text);
create table public.wa_msg_ext (msg_id text, group_id text, created_at timestamptz default now());
create table public.channel_updates (id uuid primary key default gen_random_uuid(), text text, image_url text, thumb_url text,
  source text, status text, expires_at timestamptz, created_at timestamptz default now(), channel text, ext_msg_id text, contributor_id uuid);

\i supabase/migrations/20261008170000_world_group_source_arrivals_v1.sql

insert into public.contributors values
 ('00000000-0000-0000-0000-0000000000a1','tzvi-opoc','צבי','{"general_feed_enabled":true}'),
 ('00000000-0000-0000-0000-0000000000a2','other-person','אחר','{"general_feed_enabled":false}'),
 ('00000000-0000-0000-0000-0000000000a3','no-flag','בלי','{}');
insert into public.users values ('00000000-0000-0000-0000-0000000000f1','admin'),('00000000-0000-0000-0000-0000000000f2','user');
insert into public.channel_ingest_sources(channel,chat_id,enabled,intake_mode) values
 ('torat-haremez','120363409557354268@g.us',true,'research_first'),
 ('gilui-yomi','120363397037220315@g.us',true,'research_first'),
 ('or-geula','972508718767-1574679718@g.us',true,'story_first_selective'),   -- real group, NOT a World group
 ('sfot-vheker','120363428474144923@g.us',true,'research_first'),           -- real group, NOT a World group
 ('dm-chan','972500000000@c.us',true,'research_first');                      -- DM-shaped source
create temp table _ids(k text primary key, id uuid default gen_random_uuid());
create function pg_temp.add(k text, txt text, ch text, src text, st text, ext text, contrib text default '00000000-0000-0000-0000-0000000000a1',
  img text default null, exp timestamptz default null, ts timestamptz default now()) returns void language sql as $$
  with i as (insert into _ids(k) values (k) returning id)
  insert into public.channel_updates(id,text,image_url,source,status,expires_at,created_at,channel,ext_msg_id,contributor_id)
  select i.id, txt, img, src, st, exp, ts, ch, ext, contrib::uuid from i; $$;
create function pg_temp.got() returns text[] language sql as $$
  select coalesce(array_agg(k order by k), '{}') from _ids i join public.world_group_source_arrivals_v1(40) r on r.id = i.id $$;
create function pg_temp.ok(c boolean, msg text) returns void language plpgsql as $$ begin if not c then raise exception 'FAIL: %', msg; end if; end $$;

-- ---- positives (both source classes) ----
select pg_temp.add('pos_torat_modern','שלום 358','torat-haremez','auto','live','MODERN1');                  -- NO wa_msg_ext row (post Oct-3 shape)
select pg_temp.add('pos_gilui_sidecar','גילוי','gilui-yomi','auto','live','SIDE1');
insert into public.wa_msg_ext(msg_id,group_id) values ('SIDE1','120363397037220315@g.us');
-- ---- negatives ----
select pg_temp.add('neg_sidecar_other_group','x','torat-haremez','auto','live','SIDE2');
insert into public.wa_msg_ext(msg_id,group_id) values ('SIDE2','999999999@g.us');
select pg_temp.add('neg_sidecar_dm','x','torat-haremez','auto','live','SIDE3');
insert into public.wa_msg_ext(msg_id,group_id) values ('SIDE3','972500000000@c.us');
select pg_temp.add('neg_orgeula_group','x','or-geula','auto','live','OG1');
select pg_temp.add('neg_sfot_group','x','sfot-vheker','auto','live','SF1');
select pg_temp.add('neg_dm_source_channel','x','dm-chan','auto','live','DM1');
select pg_temp.add('neg_unknown_channel','x','main','auto','live','UK1');
select pg_temp.add('neg_src_ai','x','torat-haremez','ai','live','AI1');
select pg_temp.add('neg_src_wavip','x','torat-haremez','wa-vip','live',null);
select pg_temp.add('neg_src_admin','x','torat-haremez','admin','live',null);
select pg_temp.add('neg_no_ext','x','torat-haremez','auto','live',null);
select pg_temp.add('neg_mail_ext','x','torat-haremez','auto','live','mail_abc123');
select pg_temp.add('neg_private','x','torat-haremez','auto','private','PR1');       -- research_first default: NOT exposed (blocker)
select pg_temp.add('neg_off','x','torat-haremez','auto','off','OFF1');
select pg_temp.add('neg_hidden','x','torat-haremez','auto','hidden','HID1');
select pg_temp.add('neg_blocked','x','torat-haremez','auto','blocked','BLK1');
select pg_temp.add('neg_flag_false','x','torat-haremez','auto','live','FF1','00000000-0000-0000-0000-0000000000a2');
select pg_temp.add('neg_flag_absent','x','torat-haremez','auto','live','FA1','00000000-0000-0000-0000-0000000000a3');
select pg_temp.add('neg_no_contributor','x','torat-haremez','auto','live','NC1',null);   -- no name inference
select pg_temp.add('neg_media','x','torat-haremez','auto','live','MED1',img=>'https://x/y.jpg');
select pg_temp.add('neg_expired','x','torat-haremez','auto','live','EXP1',exp=>now()-interval '1 day');
select pg_temp.add('neg_vcard','BEGIN:VCARD name','torat-haremez','auto','live','VC1');
select pg_temp.add('neg_invite','join chat.whatsapp.com/abc','torat-haremez','auto','live','INV1');
select pg_temp.add('neg_empty','   ','torat-haremez','auto','live','EMP1');
-- replay/dedup: same provider id inserted twice -> one result
select pg_temp.add('dup_a','dup','torat-haremez','auto','live','DUP1', ts=>now()-interval '2 hours');
select pg_temp.add('dup_b','dup','torat-haremez','auto','live','DUP1', ts=>now()-interval '1 hours');
-- PII
select pg_temp.add('pii','call 050-123-4567 or a@b.com or https://x.co/y www.z.com','torat-haremez','auto','live','PII1');

select pg_temp.ok(pg_temp.got() = array['dup_b','pii','pos_gilui_sidecar','pos_torat_modern'], 'eligible set exactly: '||pg_temp.got()::text);
select pg_temp.ok((select proof_basis from public.world_group_source_arrivals_v1(40) r join _ids i on i.id=r.id and i.k='pos_torat_modern')='ingest_chain', 'modern basis');
select pg_temp.ok((select proof_basis from public.world_group_source_arrivals_v1(40) r join _ids i on i.id=r.id and i.k='pos_gilui_sidecar')='sidecar_match', 'sidecar basis');
select pg_temp.ok((select body !~ '050-123|@|http|www' and body like '%[מספר]%' and body like '%[קישור]%' and body like '%[דוא״ל]%'
                     from public.world_group_source_arrivals_v1(40) r join _ids i on i.id=r.id and i.k='pii'), 'PII redacted');
-- replay: identical on second call; dedup keeps newest
select pg_temp.ok(pg_temp.got() = pg_temp.got(), 'replay stable');
select pg_temp.ok((select count(*) from public.world_group_source_arrivals_v1(40) r join _ids i on i.id=r.id and i.k like 'dup_%')=1, 'dedup one row');
-- limit clamp
select pg_temp.ok((select count(*) from public.world_group_source_arrivals_v1(1))=1, 'limit 1');
select pg_temp.ok((select count(*) from public.world_group_source_arrivals_v1(null))=4, 'null limit default');
-- date honesty: nothing is fabricated for "today"; newest returned equals newest stored eligible
select pg_temp.ok((select max(created_at) from public.world_group_source_arrivals_v1(40)) <= now(), 'no future/fabricated timestamps');
-- disabled source / source flips to off fail closed
update public.channel_ingest_sources set enabled=false where channel='torat-haremez';
select pg_temp.ok(pg_temp.got() = array['pos_gilui_sidecar'], 'disabled torat source -> only gilui');
update public.channel_ingest_sources set enabled=true, chat_id='972500000000@c.us' where channel='torat-haremez';
select pg_temp.ok(pg_temp.got() = array['pos_gilui_sidecar'], 'torat source JID not a group -> excluded');
update public.channel_ingest_sources set chat_id='120363409557354268@g.us', intake_mode='off' where channel='torat-haremez';
select pg_temp.ok(pg_temp.got() = array['pos_gilui_sidecar'], 'intake off -> excluded');
update public.channel_ingest_sources set intake_mode='research_first' where channel='torat-haremez';
-- contributor flag toggled off removes the writer
update public.contributors set dossier_settings='{"general_feed_enabled":false}' where slug='tzvi-opoc';
select pg_temp.ok(pg_temp.got() = '{}', 'flag off -> none');
update public.contributors set dossier_settings='{"general_feed_enabled":true}' where slug='tzvi-opoc';

-- ---- role grants ----
select pg_temp.ok(has_function_privilege('anon','public.world_group_source_arrivals_v1(integer)','execute'), 'anon can read RPC');
select pg_temp.ok(not has_function_privilege('anon','public.admin_set_contributor_general_feed_v1(text,boolean)','execute'), 'anon cannot run editor');
select pg_temp.ok(has_function_privilege('authenticated','public.admin_set_contributor_general_feed_v1(text,boolean)','execute'), 'authenticated may call editor (admin-gated inside)');
-- non-admin / anonymous caller rejected by editor
set test.uid = '00000000-0000-0000-0000-0000000000f2';
do $$ begin perform public.admin_set_contributor_general_feed_v1('tzvi-opoc', false); raise exception 'FAIL: non-admin allowed'; exception when others then if sqlerrm <> 'admin only' then raise; end if; end $$;
set test.uid = '';
do $$ begin perform public.admin_set_contributor_general_feed_v1('tzvi-opoc', false); raise exception 'FAIL: anonymous allowed'; exception when others then if sqlerrm <> 'admin only' then raise; end if; end $$;
set test.uid = '00000000-0000-0000-0000-0000000000f1';
select pg_temp.ok((public.admin_set_contributor_general_feed_v1('tzvi-opoc', true)->>'ok')='true', 'admin ok');
select pg_temp.ok((public.admin_set_contributor_general_feed_v1('nobody', true)->>'error')='not_found', 'not_found');
select pg_temp.ok((public.admin_set_contributor_general_feed_v1('', true)->>'error')='invalid_arguments', 'invalid args');
\echo ALL WORLD GROUP SOURCE SQL TESTS PASSED
