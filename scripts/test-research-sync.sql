-- ISOLATED disposable PostgreSQL fixture ONLY. NEVER execute on production/Supabase.
\set ON_ERROR_STOP on
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema public,auth to anon,authenticated,service_role;
create table public.user_research(user_id uuid primary key references auth.users(id) on delete cascade,data jsonb not null default '{}',updated_at timestamptz not null default now());
create table public.research_items(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 bucket text not null default 'library' check(bucket in ('cart','library','draft','favorite','pinned','searched','hint','handled')),
 entity_type text not null,entity_ref text,title text,link text,metadata jsonb not null default '{}',created_at timestamptz not null default now(),
 unique(user_id,bucket,entity_type,entity_ref));
alter table public.user_research enable row level security;
alter table public.research_items enable row level security;
create policy fixture_ur_owner on public.user_research to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy fixture_ri_owner on public.research_items to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select,insert,update,delete on public.research_items,public.user_research to authenticated;
grant all on public.research_items,public.user_research to service_role;
insert into auth.users values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
\ir ../supabase/migrations/20260916141000_g3_personal_research_sync_hardening_v1.sql
create function pg_temp.ok(condition boolean,label text) returns void language plpgsql as $$begin if condition is distinct from true then raise exception 'FAIL: %',label; end if;raise notice 'PASS: %',label;end$$;
create function pg_temp.fails(statement text,pattern text) returns void language plpgsql as $$declare caught boolean:=false;begin
 begin execute statement; exception when others then if position(pattern in SQLERRM)=0 then raise;end if;caught:=true;end;
 if not caught then raise exception 'EXPECTED FAILURE: %',pattern;end if;raise notice 'PASS expected failure: %',pattern;end$$;
set role anon;
select pg_temp.fails($q$select public.research_state_snapshot_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$q$,'permission denied');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','','false');
select pg_temp.fails($q$select public.research_state_snapshot_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$q$,'RESEARCH_PRINCIPAL_MISMATCH');
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
select pg_temp.fails($q$select public.research_state_snapshot_v1('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')$q$,'RESEARCH_PRINCIPAL_MISMATCH');
select pg_temp.fails($q$insert into public.user_research(user_id) values(auth.uid())$q$,'permission denied');
select pg_temp.fails($q$insert into public.research_items(user_id,bucket,entity_type,entity_ref) values(auth.uid(),'library','number','forbidden')$q$,'row-level security');
select pg_temp.ok((public.research_state_snapshot_v1(auth.uid())->>'revision')='0','new account snapshot does not adopt browser state');
select public.research_state_apply_ops_v1(auth.uid(),'[{"kind":"item_upsert","op_id":"one","bucket":"library","entity":{"type":"number","id":"878","title":"source"}},{"kind":"collection_add","op_id":"two","collection":{"id":"c","name":"old"}},{"kind":"collection_update","op_id":"three","id":"c","patch":{"name":"new"}},{"kind":"collection_assign","op_id":"four","entity_type":"number","entity_ref":"878","coll_id":"c"}]',0,'11111111-1111-4111-8111-111111111111');
select pg_temp.ok(public.research_state_snapshot_v1(auth.uid())#>>'{collections,0,name}'='new','add then update retained in order');
select pg_temp.ok(public.research_state_snapshot_v1(auth.uid())#>>'{saved,0,coll}'='c','explicit assignment persisted');
select pg_temp.fails($q$select public.research_state_apply_ops_v1(auth.uid(),'[]',1,gen_random_uuid())$q$,'RESEARCH_OPS_BATCH_TOO_LARGE');
select pg_temp.fails($q$select public.research_state_apply_ops_v1(auth.uid(),'null',1,gen_random_uuid())$q$,'RESEARCH_OPS_NOT_ARRAY');
select pg_temp.fails($q$select public.research_state_apply_ops_v1(auth.uid(),null,1,gen_random_uuid())$q$,'RESEARCH_OPS_NOT_ARRAY');
select pg_temp.fails($q$select public.research_state_apply_ops_v1(auth.uid(),'[{"op_id":"x","kind":"item_clear_bucket"}]',1,gen_random_uuid())$q$,'RESEARCH_BAD_BUCKET');
select pg_temp.fails($q$select public.research_state_apply_ops_v1(auth.uid(),'[{"op_id":"x","kind":"collection_update","id":"c","patch":{"id":"other"}}]',1,gen_random_uuid())$q$,'RESEARCH_COLLECTION_PATCH_INVALID');
select pg_temp.fails($q$select public.research_state_apply_ops_v1(auth.uid(),'[{"op_id":"x","kind":"unknown"}]',1,gen_random_uuid())$q$,'RESEARCH_UNKNOWN_OP');
select pg_temp.fails($q$select public.research_state_apply_ops_v1(auth.uid(),'[{"op_id":"x","kind":"context_set","context":3}]',1,gen_random_uuid())$q$,'RESEARCH_CONTEXT_INVALID');
select pg_temp.fails($q$select public.research_state_apply_ops_v1(auth.uid(),'[{"op_id":"x","kind":"history_clear"}]',0,gen_random_uuid())$q$,'RESEARCH_SYNC_CONFLICT');
select pg_temp.fails($q$select public.research_state_apply_ops_v1(auth.uid(),'[{"op_id":"different","kind":"history_clear"}]',0,'11111111-1111-4111-8111-111111111111')$q$,'RESEARCH_BATCH_PAYLOAD_MISMATCH');
select pg_temp.ok((public.research_state_snapshot_v1(auth.uid())->>'revision')='1','all invalid batches left version untouched');
-- Every operation is atomic: an error after a valid delete rolls that delete back too.
select pg_temp.fails($q$select public.research_state_apply_ops_v1(auth.uid(),'[{"kind":"item_delete","op_id":"del","bucket":"library","entity_type":"number","entity_ref":"878"},{"kind":"item_upsert","op_id":"bad","bucket":"library","entity":null}]',1,gen_random_uuid())$q$,'RESEARCH_BAD_ENTITY');
select pg_temp.ok(jsonb_array_length(public.research_state_snapshot_v1(auth.uid())->'saved')=1,'failed upsert rolls back preceding delete');
select public.research_state_apply_ops_v1(auth.uid(),'[{"kind":"item_clear_bucket","op_id":"clear","bucket":"library"}]',1,'22222222-2222-4222-8222-222222222222');
select public.research_state_apply_ops_v1(auth.uid(),'[{"kind":"item_upsert","op_id":"later","bucket":"library","entity":{"id":"later","type":"number"}}]',2,'33333333-3333-4333-8333-333333333333');
select pg_temp.ok((public.research_state_apply_ops_v1(auth.uid(),'[{"kind":"item_clear_bucket","op_id":"clear","bucket":"library"}]',1,'22222222-2222-4222-8222-222222222222')->>'replayed')::boolean,'lost clear ACK is recognized');
select pg_temp.ok(public.research_state_snapshot_v1(auth.uid())#>>'{saved,0,id}'='later','replayed clear never deletes subsequent remote item');
select pg_temp.ok((public.research_state_snapshot_v1(auth.uid())->>'revision')='3','duplicate batch does not advance version');
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',false);
select pg_temp.ok(jsonb_array_length(public.research_state_snapshot_v1(auth.uid())->'saved')=0,'B cannot inherit A items');
select pg_temp.fails($q$select public.research_state_apply_ops_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','[{"kind":"history_clear","op_id":"spoof"}]',3,gen_random_uuid())$q$,'RESEARCH_PRINCIPAL_MISMATCH');
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
do $$declare r bigint;i int;begin for i in 1..130 loop
 r:=(public.research_state_snapshot_v1(auth.uid())->>'revision')::bigint;
 perform public.research_state_apply_ops_v1(auth.uid(),jsonb_build_array(jsonb_build_object('kind','history_clear','op_id',i::text)),r,gen_random_uuid());
 end loop;end$$;
select pg_temp.fails($q$select public.research_state_apply_ops_v1(auth.uid(),'[{"kind":"item_clear_bucket","op_id":"clear","bucket":"library"}]',1,'22222222-2222-4222-8222-222222222222')$q$,'RESEARCH_SYNC_CONFLICT');
select pg_temp.ok(public.research_state_snapshot_v1(auth.uid())#>>'{saved,0,id}'='later','receipt expiry fails closed instead of replaying old deletion');
reset role;
select pg_temp.ok((select jsonb_array_length(data#>'{_research_sync_v1,receipts}') from user_research where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')=128,'receipt history is bounded');
select pg_temp.ok((select count(*) from pg_policies where policyname in('fixture_ri_owner','fixture_ur_owner'))=2,'original ownership policies preserved');
set role authenticated;
update public.research_items set title='legacy-corruption' where user_id=auth.uid() and bucket='library';
select pg_temp.ok(not exists(select 1 from public.research_items where title='legacy-corruption'),'old cached client cannot bypass CAS');
insert into public.research_items(user_id,bucket,entity_type,entity_ref) values(auth.uid(),'hint','hint','test-hint');
select pg_temp.ok(exists(select 1 from public.research_items where bucket='hint'),'disjoint hint writer still works');
select pg_temp.fails($q$update public.research_items set bucket='library' where bucket='hint'$q$,'row-level security');
delete from public.research_items where bucket='hint';
select pg_temp.ok(not exists(select 1 from public.research_items where bucket='hint'),'disjoint hint delete still works');
reset role;
select pg_temp.ok(has_table_privilege('authenticated','public.research_items','SELECT'),'read-only projections preserved');
select pg_temp.ok(has_table_privilege('service_role','public.research_items','UPDATE'),'trusted service owner path preserved');
\echo RESEARCH_SYNC_SQL_ACCEPTANCE_PASS
