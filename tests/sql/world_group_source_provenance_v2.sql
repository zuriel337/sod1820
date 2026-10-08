-- Role + provenance tests for world_group_source_arrivals_v2 / record_channel_update_group_proof_v1 / admin_hold_group_source_v1.
-- THROWAWAY local Postgres only (scripts/run-world-group-source-sql-test.sh). Synthetic data. Never a live project.
\set ON_ERROR_STOP on
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
create table public.users (id uuid primary key, role text);
create table public.contributors (id uuid primary key, slug text unique, display_name text, phone text, dossier_settings jsonb);
create table public.channel_ingest_sources (id uuid primary key default gen_random_uuid(), channel text, chat_id text, enabled boolean, intake_mode text);
create table public.wa_msg_ext (msg_id text, group_id text);
create table public.channel_updates (id uuid primary key default gen_random_uuid(), text text, image_url text, thumb_url text,
  source text, status text, expires_at timestamptz, created_at timestamptz default now(), channel text, ext_msg_id text, contributor_id uuid);
-- mimic live: broad anon SELECT on channel_updates must NOT matter for the proof table
grant select on public.channel_updates to anon;

\i supabase/migrations/20261008170000_world_group_source_arrivals_v1.sql
\i supabase/migrations/20261008190000_world_group_source_provenance_v2.sql

insert into public.contributors values
 ('00000000-0000-0000-0000-0000000000a1','tzvi-opoc','צבי','0501111111','{"general_feed_enabled":true}'),
 ('00000000-0000-0000-0000-0000000000a2','yaniv-levi','יניב','972502222222','{"general_feed_enabled":true}'),
 ('00000000-0000-0000-0000-0000000000a3','flag-off','כבוי','0503333333','{"general_feed_enabled":false}'),
 ('00000000-0000-0000-0000-0000000000a4','dup-a','כפול א','0504444444','{"general_feed_enabled":true}'),
 ('00000000-0000-0000-0000-0000000000a5','dup-b','כפול ב','+972-50-4444444','{"general_feed_enabled":true}'),
 ('00000000-0000-0000-0000-0000000000a6','lookalike','צבי','0509999999','{"general_feed_enabled":true}');
insert into public.users values ('00000000-0000-0000-0000-0000000000f1','admin'),('00000000-0000-0000-0000-0000000000f2','user');
insert into public.channel_ingest_sources(id,channel,chat_id,enabled,intake_mode) values
 ('00000000-0000-0000-0000-00000000c001','torat-haremez','120363409557354268@g.us',true,'research_first'),
 ('00000000-0000-0000-0000-00000000c002','gilui-yomi','120363397037220315@g.us',true,'research_first'),
 ('00000000-0000-0000-0000-00000000c003','or-geula','972508718767-1574679718@g.us',true,'story_first_selective'),
 ('00000000-0000-0000-0000-00000000c004','dm-chan','972500000000@c.us',true,'research_first');
create temp table _ids(k text primary key, id uuid default gen_random_uuid());
-- add(key, text, channel, status, ext, contributor(default tzvi), image)
create function pg_temp.add(k text, txt text, ch text, st text, ext text, contrib text default '00000000-0000-0000-0000-0000000000a1',
  img text default null, exp timestamptz default null, ts timestamptz default now(), src text default 'auto') returns void language sql as $$
  with i as (insert into _ids(k) values (k) returning id)
  insert into public.channel_updates(id,text,image_url,source,status,expires_at,created_at,channel,ext_msg_id,contributor_id)
  select i.id, txt, img, src, st, exp, ts, ch, ext, contrib::uuid from i; $$;
create function pg_temp.uid(k text) returns uuid language sql as $$ select id from _ids where _ids.k = $1 $$;
create function pg_temp.proof(k text, src text, ext text, chat text, jid text, incoming boolean default true, typ text default 'textMessage') returns jsonb language sql as $$
  select public.record_channel_update_group_proof_v1(pg_temp.uid(k), src::uuid, ext, chat, jid, incoming, typ) $$;
create function pg_temp.got() returns text[] language sql as $$
  select coalesce(array_agg(k order by k), '{}') from _ids i join public.world_group_source_arrivals_v2(40) r on r.id = i.id $$;
create function pg_temp.ok(c boolean, msg text) returns void language plpgsql as $$ begin if not c then raise exception 'FAIL: %', msg; end if; end $$;
create function pg_temp.err(j jsonb) returns text language sql as $$ select j->>'error' $$;

\set T '00000000-0000-0000-0000-00000000c001'
\set G '00000000-0000-0000-0000-00000000c002'
\set TC '120363409557354268@g.us'
\set GC '120363397037220315@g.us'

-- rows (messages) ------------------------------------------------------------------------------------------------
select pg_temp.add('pos_private_tzvi','שלום 358','torat-haremez','private','M1');                                  -- research_first default status
select pg_temp.add('pos_live_yaniv','גילוי','gilui-yomi','live','M2','00000000-0000-0000-0000-0000000000a2');
select pg_temp.add('lookalike_pushname','x','torat-haremez','private','M3');                                        -- credited to tzvi by pushname, JID is someone else
select pg_temp.add('unknown_jid','x','torat-haremez','private','M4');
select pg_temp.add('dm_msg','x','torat-haremez','private','M5');
select pg_temp.add('other_group_src','x','or-geula','private','M6');
select pg_temp.add('outgoing','x','torat-haremez','private','M7');
select pg_temp.add('media','x','torat-haremez','private','M8',img=>'https://x/y.jpg');
select pg_temp.add('held','x','torat-haremez','private','M9');
select pg_temp.add('hidden','x','torat-haremez','hidden','M10');
select pg_temp.add('off','x','torat-haremez','off','M11');
select pg_temp.add('blocked','x','torat-haremez','blocked','M12');
select pg_temp.add('flag_off','x','torat-haremez','private','M13','00000000-0000-0000-0000-0000000000a3');
select pg_temp.add('dup_phone','x','torat-haremez','private','M14','00000000-0000-0000-0000-0000000000a4');
select pg_temp.add('no_contributor','x','torat-haremez','private','M15',null);
select pg_temp.add('contrib_mismatch','x','torat-haremez','private','M16','00000000-0000-0000-0000-0000000000a2');  -- row says yaniv, JID says tzvi
select pg_temp.add('expired','x','torat-haremez','private','M17',exp=>now()-interval '1 day');
select pg_temp.add('unproved_legacy_live','legacy','torat-haremez','live','LEG1');                                 -- v1-era row, no proof row
select pg_temp.add('src_ai','x','torat-haremez','private','M18',src=>'ai');
select pg_temp.add('vcard','BEGIN:VCARD','torat-haremez','private','M19');
select pg_temp.add('pii','call 050-123-4567 or a@b.com or https://x.co/y www.z.com','torat-haremez','private','M20');
select pg_temp.add('mail','x','torat-haremez','private','mail_1');
select pg_temp.add('wrong_ext','x','torat-haremez','private','M21');

-- proof writer: negatives return errors and write nothing ---------------------------------------------------------
select pg_temp.ok(pg_temp.err(pg_temp.proof('dm_msg',:'T','M5','972500000000@c.us','972501111111@c.us'))='source_mismatch', 'DM chat id rejected');
select pg_temp.ok(pg_temp.err(pg_temp.proof('other_group_src',:'T','M6','972508718767-1574679718@g.us','972501111111@c.us'))='source_mismatch', 'non-world group / channel mismatch rejected');
select pg_temp.ok(pg_temp.err(pg_temp.proof('outgoing',:'T','M7',:'TC','972501111111@c.us',false))='not_incoming', 'outgoing rejected');
select pg_temp.ok(pg_temp.err(pg_temp.proof('media',:'T','M8',:'TC','972501111111@c.us'))='update_mismatch', 'media row rejected');
select pg_temp.ok(pg_temp.err(pg_temp.proof('media',:'T','M8',:'TC','972501111111@c.us',true,'imageMessage'))='not_text', 'image type rejected');
select pg_temp.ok(pg_temp.err(pg_temp.proof('src_ai',:'T','M18',:'TC','972501111111@c.us'))='update_mismatch', 'source ai rejected');
select pg_temp.ok(pg_temp.err(pg_temp.proof('wrong_ext',:'T','OTHER',:'TC','972501111111@c.us'))='update_mismatch', 'ext_msg_id mismatch rejected');
select pg_temp.ok(pg_temp.err(pg_temp.proof('wrong_ext',:'G','M21',:'GC','972501111111@c.us'))='source_mismatch', 'source/channel mismatch rejected');
select pg_temp.ok(pg_temp.err(pg_temp.proof('wrong_ext',:'T','M21',:'GC','972501111111@c.us'))='source_mismatch', 'group id not equal to configured chat_id rejected');
select pg_temp.ok(pg_temp.err(pg_temp.proof('wrong_ext',:'T','M21',:'TC','972501111111@g.us'))='bad_sender', 'non-@c.us sender rejected');
select pg_temp.ok(pg_temp.err(pg_temp.proof('wrong_ext',:'T','M21',:'TC',''))='bad_sender', 'empty sender rejected');
select pg_temp.ok((select count(*) from public.channel_update_group_proof)=0, 'rejected calls wrote nothing');

-- positives + unverified identities --------------------------------------------------------------------------------
select pg_temp.ok((pg_temp.proof('pos_private_tzvi',:'T','M1',:'TC','972501111111@c.us')->>'identity_basis')='jid_phone_unique', 'tzvi 05x -> 9725x unique');
select pg_temp.ok((pg_temp.proof('pos_live_yaniv',:'G','M2',:'GC','972502222222@c.us')->>'identity_basis')='jid_phone_unique', 'yaniv unique');
select pg_temp.ok((pg_temp.proof('lookalike_pushname',:'T','M3',:'TC','972509999999@c.us')->>'identity_basis')='jid_phone_unique', 'JID resolves to the REAL owner (lookalike contributor), not tzvi');
select pg_temp.ok((pg_temp.proof('unknown_jid',:'T','M4',:'TC','972508888888@c.us')->>'identity_basis')='unverified', 'unknown JID -> unverified');
select pg_temp.ok((pg_temp.proof('dup_phone',:'T','M14',:'TC','972504444444@c.us')->>'identity_basis')='unverified', 'non-unique phone -> unverified');
select pg_temp.ok((pg_temp.proof('no_contributor',:'T','M15',:'TC','972501111111@c.us')->>'identity_basis')='jid_phone_unique', 'proof ok but row has no contributor');
select pg_temp.ok((pg_temp.proof('contrib_mismatch',:'T','M16',:'TC','972501111111@c.us')->>'identity_basis')='jid_phone_unique', 'proof ok, row credit disagrees');
select pg_temp.proof('held',:'T','M9',:'TC','972501111111@c.us');
select pg_temp.proof('hidden',:'T','M10',:'TC','972501111111@c.us');
select pg_temp.proof('off',:'T','M11',:'TC','972501111111@c.us');
select pg_temp.proof('blocked',:'T','M12',:'TC','972501111111@c.us');
select pg_temp.proof('flag_off',:'T','M13',:'TC','972503333333@c.us');
select pg_temp.proof('expired',:'T','M17',:'TC','972501111111@c.us');
select pg_temp.proof('vcard',:'T','M19',:'TC','972501111111@c.us');
select pg_temp.proof('pii',:'T','M20',:'TC','972501111111@c.us');
-- (mail_ and unproved legacy rows get no proof row)

select pg_temp.ok(pg_temp.got() = array['held','pii','pos_live_yaniv','pos_private_tzvi'],
   'pre-hold set: '||pg_temp.got()::text);
-- the lookalike case: row credited to tzvi but JID belongs to 'lookalike' => contributor id mismatch => excluded
select pg_temp.ok(not ('lookalike_pushname' = any(pg_temp.got())), 'lookalike pushname with different JID is NOT exposed');
select pg_temp.ok(not ('contrib_mismatch' = any(pg_temp.got())), 'row contributor != JID-proven contributor -> excluded');
select pg_temp.ok(not ('unproved_legacy_live' = any(pg_temp.got())), 'legacy live row without proof stays out');
select pg_temp.ok(not ('unknown_jid' = any(pg_temp.got())) and not ('dup_phone' = any(pg_temp.got())) and not ('no_contributor' = any(pg_temp.got())), 'unverified/no-contributor excluded');
select pg_temp.ok(not (pg_temp.got() && array['hidden','off','blocked','flag_off','expired','vcard','mail','src_ai','media']), 'hidden/off/blocked/flag/expiry/vcard/media excluded');
select pg_temp.ok((select body !~ '050-123|@|http|www' and body like '%[מספר]%' and body like '%[קישור]%' and body like '%[דוא״ל]%'
                     from public.world_group_source_arrivals_v2(40) r join _ids i on i.id=r.id and i.k='pii'), 'PII redacted');
-- human hold overrides (admin)
set test.uid = '00000000-0000-0000-0000-0000000000f1';
select public.admin_hold_group_source_v1(pg_temp.uid('held'), true);
select public.admin_hold_group_source_v1(pg_temp.uid('pos_private_tzvi'), true);
select pg_temp.ok(not ('held' = any(pg_temp.got())) and not ('pos_private_tzvi' = any(pg_temp.got())), 'held excluded');
-- replay of proof must NOT clear a hold and must not duplicate
select pg_temp.proof('pos_private_tzvi',:'T','M1',:'TC','972501111111@c.us');
select pg_temp.ok(not ('pos_private_tzvi' = any(pg_temp.got())), 'replay does not clear hold');
select pg_temp.ok((select count(*) from public.channel_update_group_proof where ext_msg_id='M1')=1, 'replay: one proof row');
select pg_temp.ok((public.admin_hold_group_source_v1(pg_temp.uid('pos_private_tzvi'), false)->>'held')='false', 'explicit unhold');
select pg_temp.ok('pos_private_tzvi' = any(pg_temp.got()), 'unheld visible again');
select pg_temp.ok((public.admin_hold_group_source_v1(gen_random_uuid(), true)->>'error')='no_proof', 'hold without proof -> no_proof');
set test.uid = '00000000-0000-0000-0000-0000000000f2';
do $$ begin perform public.admin_hold_group_source_v1(pg_temp.uid('held'), false); raise exception 'FAIL: non-admin hold'; exception when others then if sqlerrm <> 'admin only' then raise; end if; end $$;
set test.uid = '';
do $$ begin perform public.admin_hold_group_source_v1(pg_temp.uid('held'), false); raise exception 'FAIL: anon hold'; exception when others then if sqlerrm <> 'admin only' then raise; end if; end $$;

-- source drift fails closed ------------------------------------------------------------------------------------------
update public.channel_ingest_sources set enabled=false where id=:'T';
select pg_temp.ok(pg_temp.got() = array['pos_live_yaniv'], 'disabled source -> only gilui');
update public.channel_ingest_sources set enabled=true, chat_id='972500000000@c.us' where id=:'T';
select pg_temp.ok(pg_temp.got() = array['pos_live_yaniv'], 'source chat_id changed (no longer equals proof group) -> excluded');
update public.channel_ingest_sources set chat_id=:'TC', intake_mode='off' where id=:'T';
select pg_temp.ok(pg_temp.got() = array['pos_live_yaniv'], 'intake off -> excluded');
update public.channel_ingest_sources set intake_mode='research_first' where id=:'T';
update public.contributors set dossier_settings='{"general_feed_enabled":false}' where slug='yaniv-levi';
select pg_temp.ok(not ('pos_live_yaniv' = any(pg_temp.got())), 'flag off -> writer removed');
update public.contributors set dossier_settings='{"general_feed_enabled":true}' where slug='yaniv-levi';
update public.channel_updates set status='blocked' where id=pg_temp.uid('pos_live_yaniv');
select pg_temp.ok(not ('pos_live_yaniv' = any(pg_temp.got())), 'status blocked -> excluded');
update public.channel_updates set status='live' where id=pg_temp.uid('pos_live_yaniv');

-- limit / cursor -----------------------------------------------------------------------------------------------------
select pg_temp.ok((select count(*) from public.world_group_source_arrivals_v2(1))=1, 'limit 1');
select pg_temp.ok((select count(*) from public.world_group_source_arrivals_v2(null))>=1, 'null limit default');
select pg_temp.ok((select count(*) from public.world_group_source_arrivals_v2(40, now()-interval '10 years'))=0, 'cursor before everything -> none');
select pg_temp.ok((select count(*) from public.world_group_source_arrivals_v2(40, now()+interval '1 minute'))>=1, 'cursor future -> all');
select pg_temp.ok((select max(created_at) from public.world_group_source_arrivals_v2(40)) <= now(), 'no fabricated timestamps');

-- role / ACL ---------------------------------------------------------------------------------------------------------
select pg_temp.ok(not has_table_privilege('anon','public.channel_update_group_proof','select'), 'anon: no proof select');
select pg_temp.ok(not has_table_privilege('authenticated','public.channel_update_group_proof','select'), 'authenticated: no proof select');
select pg_temp.ok(not has_table_privilege('anon','public.channel_update_group_proof','insert,update,delete'), 'anon: no proof write');
select pg_temp.ok(not has_table_privilege('authenticated','public.channel_update_group_proof','insert,update,delete'), 'authenticated: no proof write');
select pg_temp.ok(has_table_privilege('service_role','public.channel_update_group_proof','insert'), 'service_role: proof write');
select pg_temp.ok((select relrowsecurity from pg_class where oid='public.channel_update_group_proof'::regclass), 'RLS on');
select pg_temp.ok(not has_function_privilege('anon','public.record_channel_update_group_proof_v1(uuid,uuid,text,text,text,boolean,text)','execute'), 'anon: no proof writer');
select pg_temp.ok(not has_function_privilege('authenticated','public.record_channel_update_group_proof_v1(uuid,uuid,text,text,text,boolean,text)','execute'), 'authenticated: no proof writer');
select pg_temp.ok(has_function_privilege('service_role','public.record_channel_update_group_proof_v1(uuid,uuid,text,text,text,boolean,text)','execute'), 'service_role: proof writer');
select pg_temp.ok(not has_function_privilege('anon','public.admin_hold_group_source_v1(uuid,boolean)','execute'), 'anon: no hold');
select pg_temp.ok(not has_function_privilege('anon','public.fn_wa_phone_digits(text)','execute'), 'anon: no phone normaliser');
select pg_temp.ok(has_function_privilege('anon','public.world_group_source_arrivals_v2(integer,timestamptz)','execute'), 'anon reads sanitized RPC');
select pg_temp.ok(not exists (select 1 from pg_proc where proname='world_group_source_arrivals_v1'), 'v1 reader dropped');
-- actual role behaviour
set role anon;
do $$ begin perform 1 from public.channel_update_group_proof; raise exception 'FAIL: anon read proof'; exception when insufficient_privilege then null; end $$;
do $$ begin perform public.record_channel_update_group_proof_v1(null,null,null,null,null,true,'textMessage'); raise exception 'FAIL: anon wrote'; exception when insufficient_privilege then null; end $$;
select pg_temp.ok((select count(*) from public.world_group_source_arrivals_v2(40))>=1, 'anon can call reader');
reset role;
set role authenticated;
do $$ begin perform 1 from public.channel_update_group_proof; raise exception 'FAIL: authenticated read proof'; exception when insufficient_privilege then null; end $$;
reset role;
-- reader output exposes no JID/phone columns
select pg_temp.ok(not exists (select 1 from pg_proc p where p.proname='world_group_source_arrivals_v2' and (pg_get_function_result(p.oid) ~* 'jid|phone|ext_msg|chat_id|email')), 'reader columns carry no identifiers');
\echo ALL WORLD GROUP SOURCE PROVENANCE SQL TESTS PASSED
