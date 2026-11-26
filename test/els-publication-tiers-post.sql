-- AFTER apply.sql. Roles: guest (anon), member A (…01), member B (…02), admin C (…03).
create or replace function pg_temp.as_role(r text, uid text) returns void language plpgsql as $$begin
  execute format('set local role %I', r); perform set_config('request.jwt.claim.sub', coalesce(uid,''), true); end$$;
create or replace function pg_temp.ok(j jsonb) returns boolean language sql as $$ select coalesce((j->>'ok')::boolean,false) $$;

-- T1 tier 1: private is private for guests and foreign members, even with the flag
begin; select pg_temp.as_role('anon', null);
select test_expect((select count(*)=0 from els_records where visibility='private'),'T1 guest reads no private row');
select test_expect((select count(*)=4 from els_records where visibility='public' and (status='published' or self_published)),'T1 guest reads public rows only (2 approved + 3 page-level... see next)') where false;
select test_expect((select count(*)=5 from els_records),'T1 guest reads exactly the public rows: 2 approved + 3 page-level');
commit;
begin; select pg_temp.as_role('authenticated','00000000-0000-0000-0000-000000000002');
select test_expect((select count(*)=0 from els_records where visibility='private'),'T1 foreign member reads no private row');
commit;
begin; select pg_temp.as_role('authenticated','00000000-0000-0000-0000-000000000003');
select test_expect((select count(*)=9 from els_records),'T1 admin reads everything');
commit;

-- T2 tier 2: a member public save is public on their page, open to everyone, and NOT in the central library
begin; select pg_temp.as_role('authenticated','00000000-0000-0000-0000-000000000001');
select test_expect(save_els_matrix('דף שלי',p_skip=>12,p_direction=>'fwd',p_start_index=>5,p_public=>true,p_title=>'my page',p_note=>'n',p_positions=>'{"findings":[]}') is not null,'T2 member saves public');
select test_expect((select status='draft' and visibility='public' and self_published and source='community' from els_records where search_term='דף שלי'),'T2 member public save = draft + public + flagged (not published)');
select test_expect(save_els_matrix('דף שלי',p_skip=>12,p_direction=>'fwd',p_start_index=>5,p_public=>true,p_title=>'my page',p_note=>'n',p_positions=>'{"findings":[]}')=(select id from els_records where search_term='דף שלי'),'T2 identical re-save returns the same record');
select test_expect(save_els_matrix('דף שלי',p_skip=>12,p_direction=>'fwd',p_start_index=>5,p_public=>true,p_title=>'my page',p_note=>'changed',p_positions=>'{"findings":[]}')<>(select id from els_records where search_term='דף שלי' order by created_at limit 1),'T2 changed content gets its own record');
select test_expect(save_els_matrix('פרטי חדש',p_skip=>13,p_direction=>'fwd',p_start_index=>5,p_public=>false) is not null,'T2 private save');
select test_expect((select status='draft' and visibility='private' and not self_published from els_records where search_term='פרטי חדש'),'T2 private save stays private');
commit;
begin; select pg_temp.as_role('anon', null);
select test_expect((select count(*)>=1 from els_records where search_term='דף שלי'),'T2 guest can open the page-level cipher');
select test_expect((select count(*)=0 from els_records where search_term='פרטי חדש'),'T2 guest cannot read the private save');
select test_expect((select count(*)=2 from els_records where status='published' and visibility='public'),'T2 the central library (published+public) is unchanged: 2 ciphers');
commit;
-- administrator publication keeps working as before
begin; select pg_temp.as_role('authenticated','00000000-0000-0000-0000-000000000003');
select test_expect(save_els_matrix('מנהל פומבי',p_skip=>14,p_direction=>'fwd',p_start_index=>5,p_public=>true) is not null,'T2 admin public save');
select test_expect((select status='published' and visibility='public' and self_published and source='admin' from els_records where search_term='מנהל פומבי'),'T2 admin public save is published (unchanged behaviour)');
commit;

-- T3 explicit page publication / withdrawal through the existing action
begin; select pg_temp.as_role('authenticated','00000000-0000-0000-0000-000000000001');
select test_expect(pg_temp.ok(self_publish_matrix('a0000000-0000-0000-0000-000000000005',true)),'T3 owner shows a private cipher on their page');
select test_expect((select visibility='public' and self_published and status='draft' from els_records where id='a0000000-0000-0000-0000-000000000005'),'T3 public + flagged, status NOT changed');
select test_expect(pg_temp.ok(self_publish_matrix('a0000000-0000-0000-0000-000000000005',false)),'T3 owner withdraws');
select test_expect((select visibility='private' and not self_published and status='draft' from els_records where id='a0000000-0000-0000-0000-000000000005'),'T3 back to private');
commit;
begin; select pg_temp.as_role('authenticated','00000000-0000-0000-0000-000000000002');
select test_expect((self_publish_matrix('a0000000-0000-0000-0000-000000000005',true)->>'error')='not_owner','T3 foreign member cannot publish');
commit;
begin; select pg_temp.as_role('anon', null); select set_config('request.jwt.claim.sub','',true);
select test_expect((self_publish_matrix('a0000000-0000-0000-0000-000000000005',true)->>'error')='not_authenticated','T3 guest cannot publish');
commit;
begin; select pg_temp.as_role('authenticated','00000000-0000-0000-0000-000000000001');
select test_expect((self_publish_matrix('a0000000-0000-0000-0000-000000000007',true)->>'error')='withheld','T3 withheld record is not republished by its owner');
do $$begin begin perform self_publish_matrix('a0000000-0000-0000-0000-000000000006',true); raise exception 'gate bypassed'; exception when check_violation then null; end; end$$;
select test_expect((select visibility='private' and not self_published from els_records where id='a0000000-0000-0000-0000-000000000006'),'T3 replay mismatch refuses publication');
commit;

-- T4 tier 3: the owner can only REQUEST the library; a private cipher cannot be requested
begin; select pg_temp.as_role('authenticated','00000000-0000-0000-0000-000000000001');
select test_expect((request_els_library_review('a0000000-0000-0000-0000-000000000005',true)->>'error')='not_public','T4 a private cipher cannot be requested');
select test_expect(pg_temp.ok(self_publish_matrix('a0000000-0000-0000-0000-000000000005',true)),'T4 publish to my page first');
select test_expect(pg_temp.ok(request_els_library_review('a0000000-0000-0000-0000-000000000005',true)),'T4 owner requests the central library');
select test_expect((select status='pending' and visibility='public' from els_records where id='a0000000-0000-0000-0000-000000000005'),'T4 request = pending, still not published');
select test_expect(pg_temp.ok(request_els_library_review('a0000000-0000-0000-0000-000000000005',true)),'T4 repeating the request is accepted');
commit;
reset role;
select test_expect((select count(*)=1 from system_suggestions where dedupe_key='els_library_request:a0000000-0000-0000-0000-000000000005' and detector='els_library_request'),'T4 exactly ONE suggestion row (deduped) through the existing suggestions engine');
select test_expect((select (observed->>'owner_user_id')='00000000-0000-0000-0000-000000000001' and observed->>'source'='owner_request' from system_suggestions where detector='els_library_request'),'T4 the request keeps the researcher attribution');
begin; select pg_temp.as_role('authenticated','00000000-0000-0000-0000-000000000002');
select test_expect((request_els_library_review('a0000000-0000-0000-0000-000000000005',false)->>'error')='not_owner','T4 foreign member cannot withdraw');
commit;
begin; select pg_temp.as_role('anon', null);
select test_expect((select count(*)=3 from els_records where status='published' and visibility='public'),'T4 a request does not enter the library (2 original + the administrator publication)');
commit;

-- T5 administrator approval: the single gate
begin; select pg_temp.as_role('authenticated','00000000-0000-0000-0000-000000000002');
do $$begin begin perform moderate_els_matrix('a0000000-0000-0000-0000-000000000005','published'); raise exception 'member approved'; exception when others then if sqlerrm <> 'not authorized' then raise; end if; end; end$$;
commit;
begin; select pg_temp.as_role('authenticated','00000000-0000-0000-0000-000000000003');
do $$begin begin perform moderate_els_matrix('a0000000-0000-0000-0000-000000000006','published'); raise exception 'private row approved'; exception when check_violation then null; end; end$$;
select test_expect((select visibility='private' from els_records where id='a0000000-0000-0000-0000-000000000006'),'T5 a private row is never admitted to the library');
select moderate_els_matrix('a0000000-0000-0000-0000-000000000005','draft');
select test_expect((select status='draft' and visibility='public' and self_published from els_records where id='a0000000-0000-0000-0000-000000000005'),'T5 decline keeps the owner page-level state');
select pg_temp.ok(jsonb_build_object('ok',true));
commit;
begin; select pg_temp.as_role('authenticated','00000000-0000-0000-0000-000000000001');
select test_expect(pg_temp.ok(request_els_library_review('a0000000-0000-0000-0000-000000000005',true)),'T5 owner asks again');
commit;
begin; select pg_temp.as_role('authenticated','00000000-0000-0000-0000-000000000003');
select moderate_els_matrix('a0000000-0000-0000-0000-000000000005','published');
select test_expect((select status='published' and visibility='public' and owner_user_id='00000000-0000-0000-0000-000000000001' from els_records where id='a0000000-0000-0000-0000-000000000005'),'T5 approval publishes; the owner stays the attributed researcher');
commit;
reset role;
select test_expect((select count(*)=1 from user_notifications where kind='matrix_approved'),'T5 one approval notification to the owner');
begin; select pg_temp.as_role('anon', null);
select test_expect((select count(*)=4 from els_records where status='published' and visibility='public'),'T5 the library now holds the 2 original + the administrator publication + the approved one');
commit;

-- T6 existing ciphers are untouched; withdrawing the flag on an approved cipher keeps its library access
begin; select pg_temp.as_role('authenticated','00000000-0000-0000-0000-000000000001');
select test_expect(pg_temp.ok(self_publish_matrix('a0000000-0000-0000-0000-000000000003',false)),'T6 owner clears the flag on an approved cipher');
select test_expect((select status='published' and visibility='public' and not self_published from els_records where id='a0000000-0000-0000-0000-000000000003'),'T6 approved cipher stays published and public');
commit;

-- T7 strong ciphers: one shared assessment, public non-sensitive candidates only, deduped, attributed, private rows only to their owner
reset role;
select test_expect((detect_els_strong_ciphers()->>'raised')::int=1,'T7 exactly one strong public page-level candidate: not the weak one, not the one with contact details');
select test_expect((select count(*)=1 from system_suggestions where detector='els_strong_cipher' and dedupe_key='els_strong_cipher:a0000000-0000-0000-0000-000000000008'),'T7 the candidate is the strong, verified, non-sensitive public cipher');
select test_expect((select count(*)=0 from system_suggestions where detector='els_strong_cipher' and dedupe_key like '%000000000009' or dedupe_key like '%00000000000a'),'T7 sensitive and weak ciphers are not candidates');
select test_expect((select (observed->>'owner_user_id')='00000000-0000-0000-0000-000000000002' and (observed->'assessment'->>'calibrated')='false' and reason like '%אומת במנוע הקנוני%' and reason like '%מנהל בלבד%' from system_suggestions where detector='els_strong_cipher'),'T7 the suggestion explains why, what was verified, that it is uncalibrated, and keeps attribution');
select test_expect((detect_els_strong_ciphers()->>'raised')::int=0,'T7 a second run raises nothing (no duplicate recommendation)');
select test_expect((select count(*)=0 from system_suggestions where observed->>'els_record_id'='a0000000-0000-0000-0000-000000000006' or observed->>'els_record_id'='a0000000-0000-0000-0000-000000000001'),'T7 private rows never become automatic candidates');
begin; select pg_temp.as_role('authenticated','00000000-0000-0000-0000-000000000001');
select pg_temp.ok(self_publish_matrix('a0000000-0000-0000-0000-000000000005',false));
commit;
begin; select pg_temp.as_role('authenticated','00000000-0000-0000-0000-000000000002');
select test_expect(jsonb_array_length(els_my_strong_ciphers())=1 and (els_my_strong_ciphers()->0->>'id')='a0000000-0000-0000-0000-000000000008','T7 a member sees only their own strong ciphers (the sensitive and weak ones are excluded)');
commit;
begin; select pg_temp.as_role('anon', null); select set_config('request.jwt.claim.sub','',true);
select test_expect(els_my_strong_ciphers()='[]'::jsonb,'T7 a guest gets nothing');
commit;

-- T8 the state itself: private can never be flagged
begin; select pg_temp.as_role('authenticated','00000000-0000-0000-0000-000000000001'); commit;
reset role;
do $$begin begin insert into els_records(search_term,visibility,self_published,status) values ('x','private',true,'draft'); raise exception 'constraint missing'; exception when check_violation then null; end; end$$;
