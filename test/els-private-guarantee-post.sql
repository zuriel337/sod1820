-- AFTER apply.sql. Roles: anon (guest), member A (…01), member B (…02), admin C (…03).
create or replace function pg_temp.as_role(r text, uid text) returns void language plpgsql as $$begin
  execute format('set local role %I', r); perform set_config('request.jwt.claim.sub', coalesce(uid,''), true); end$$;

-- T1 private is private: guest, foreign member
begin; select pg_temp.as_role('anon', null);
select test_expect((select count(*)=0 from els_records where visibility='private'),'T1 guest reads no private row, even with self_published=true');
select test_expect((select count(*)=2 from els_records),'T1 guest still reads exactly the public rows (published/public, with and without the flag)');
select test_expect((select count(*)=1 from els_records where id='a0000000-0000-0000-0000-000000000004' and not self_published),'T1 approved public row without the flag stays readable');
select test_expect((select count(*)=1 from els_records where id='a0000000-0000-0000-0000-000000000003' and self_published),'T1 public self-published row stays readable');
commit;
begin; select pg_temp.as_role('authenticated','00000000-0000-0000-0000-000000000002');
select test_expect((select count(*)=0 from els_records where visibility='private'),'T1 foreign member reads no private row');
commit;
begin; select pg_temp.as_role('authenticated','00000000-0000-0000-0000-000000000001');
select test_expect((select count(*)=3 from els_records where visibility='private'),'T1 owner reads own private rows');
commit;
begin; select pg_temp.as_role('authenticated','00000000-0000-0000-0000-000000000003');
select test_expect((select count(*)=7 from els_records),'T1 admin reads everything');
commit;

-- T2 explicit publication moves the access state, never to approval
begin; select pg_temp.as_role('authenticated','00000000-0000-0000-0000-000000000001');
select test_expect((select (self_publish_matrix('a0000000-0000-0000-0000-000000000005',true)->>'ok')::boolean),'T2 owner publishes own verified private draft');
select test_expect((select visibility='public' and status='pending' and self_published from els_records where id='a0000000-0000-0000-0000-000000000005'),'T2 row is public + pending + flagged, not published');
select test_expect((select status<>'published' from els_records where id='a0000000-0000-0000-0000-000000000005'),'T2 publication never sets the moderation-approved status');
commit;
begin; select pg_temp.as_role('anon', null);
select test_expect((select count(*)=1 from els_records where id='a0000000-0000-0000-0000-000000000005'),'T2 guest can now open the explicitly published cipher');
select test_expect((select count(*)=2 from els_records where status='published' and visibility='public'),'T2 the library filter (published+public) is unchanged: 2 rows');
commit;

-- T3 withdrawal returns to private
begin; select pg_temp.as_role('authenticated','00000000-0000-0000-0000-000000000001');
select test_expect((select (self_publish_matrix('a0000000-0000-0000-0000-000000000005',false)->>'ok')::boolean),'T3 owner withdraws');
select test_expect((select visibility='private' and status='draft' and not self_published from els_records where id='a0000000-0000-0000-0000-000000000005'),'T3 back to private draft');
commit;
begin; select pg_temp.as_role('anon', null);
select test_expect((select count(*)=0 from els_records where id='a0000000-0000-0000-0000-000000000005'),'T3 guest can no longer read it');
commit;

-- T4 refusals leave the row byte-identical
begin; select pg_temp.as_role('authenticated','00000000-0000-0000-0000-000000000002');
select test_expect((select self_publish_matrix('a0000000-0000-0000-0000-000000000005',true)->>'error')='not_owner','T4 foreign member cannot publish');
select test_expect((select self_publish_matrix('a0000000-0000-0000-0000-000000000003',false)->>'error')='not_owner','T4 foreign member cannot withdraw');
commit;
begin; select pg_temp.as_role('anon', null); select set_config('request.jwt.claim.sub','',true);
select test_expect((select self_publish_matrix('a0000000-0000-0000-0000-000000000005',true)->>'error')='not_authenticated','T4 guest cannot publish');
commit;
begin; select pg_temp.as_role('authenticated','00000000-0000-0000-0000-000000000001');
select test_expect((select self_publish_matrix('a0000000-0000-0000-0000-000000000007',true)->>'error')='withheld','T4 withheld record is not republished by its owner');
select test_expect((select visibility='private' and status='hidden' from els_records where id='a0000000-0000-0000-0000-000000000007'),'T4 withheld row unchanged');
do $$begin
  begin perform self_publish_matrix('a0000000-0000-0000-0000-000000000006',true); raise exception 'gate bypassed';
  exception when check_violation then null; end;
end$$;
select test_expect((select visibility='private' and status='draft' and not self_published from els_records where id='a0000000-0000-0000-0000-000000000006'),'T4 replay mismatch refuses publication, row unchanged');
commit;

-- T5 the existing public ciphers are not harmed: withdrawing the flag keeps approved library access
begin; select pg_temp.as_role('authenticated','00000000-0000-0000-0000-000000000001');
select test_expect((select (self_publish_matrix('a0000000-0000-0000-0000-000000000003',false)->>'ok')::boolean),'T5 owner clears the flag on an approved public cipher');
select test_expect((select status='published' and visibility='public' and not self_published from els_records where id='a0000000-0000-0000-0000-000000000003'),'T5 approved cipher stays published and public');
select test_expect((select (self_publish_matrix('a0000000-0000-0000-0000-000000000003',true)->>'ok')::boolean),'T5 re-flagging an approved cipher is accepted');
select test_expect((select status='published' and visibility='public' and self_published from els_records where id='a0000000-0000-0000-0000-000000000003'),'T5 approved cipher unchanged otherwise');
commit;
begin; select pg_temp.as_role('anon', null);
select test_expect((select count(*)=2 from els_records where status='published' and visibility='public'),'T5 guest still reads both approved ciphers');
commit;

-- T6 admin goes through the same rule
begin; select pg_temp.as_role('authenticated','00000000-0000-0000-0000-000000000003');
select test_expect((select (self_publish_matrix('a0000000-0000-0000-0000-000000000002',true)->>'ok')::boolean),'T6 admin publishes own private draft the same way');
select test_expect((select status='pending' and visibility='public' from els_records where id='a0000000-0000-0000-0000-000000000002'),'T6 admin publication is also public + pending, not approved');
commit;
