import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE_PATH || '@electric-sql/pglite');
const db=new PGlite();
const admin='11111111-1111-4111-8111-111111111111', user='22222222-2222-4222-8222-222222222222';
await db.exec(`create role anon; create role authenticated; create schema auth;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to authenticated;
create table users(id uuid primary key, role text);
create table inbound_emails(id bigint primary key,body_text text,meta jsonb,read boolean,reply_count integer);
alter table inbound_emails enable row level security;
grant select on users to authenticated;
grant select,update on inbound_emails to authenticated;
create policy inbound_admin_read on inbound_emails for select to authenticated using(exists(select 1 from users u where u.id=auth.uid() and u.role='admin'));
create policy inbound_admin_update on inbound_emails for update to authenticated using(exists(select 1 from users u where u.id=auth.uid() and u.role='admin'));
insert into users values('${admin}','admin'),('${user}','user');
insert into inbound_emails values(1,'original untrusted source','{"source_email_v1":{"held":true},"provider_id":"retained"}',false,3);`);
await db.exec(await readFile('supabase/migrations/20261013204540_central_email_intake_destinations.sql','utf8'));
async function as(role,uid,fn){await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid||'']);await db.exec(`set role ${role}`);try{return await fn();}finally{await db.exec('reset role');}}
const route=(destinations,rev,id=1)=>db.query('select admin_email_intake_route_v1($1,$2,$3) result',[id,destinations,rev]);
test.after(()=>db.close());
test('anonymous has no execute/read path, ordinary account cannot route, admin is explicit',async()=>{
  await assert.rejects(()=>as('anon',null,()=>route(['world'],0)),/permission denied/);
  await assert.rejects(()=>as('authenticated',user,()=>route(['world'],0)),/admin required/);
  await assert.rejects(()=>as('authenticated',null,()=>route(['world'],0)),/admin required/);
  const ordinary=await as('authenticated',user,()=>db.query('select admin_email_intake_capabilities_v1() result'));
  assert.equal(ordinary.rows[0].result.routing,false);
  const allowed=await as('authenticated',admin,()=>db.query('select admin_email_intake_capabilities_v1() result'));
  assert.equal(allowed.rows[0].result.routing,true);assert.equal(allowed.rows[0].result.publication,false);
});
test('admin destination intent is private draft and preserves exact source/proof/read/reply',async()=>{
  const r=await as('authenticated',admin,()=>route(['world','writer'],0));
  assert.equal(r.rows[0].result.state,'draft');assert.equal(r.rows[0].result.revision,1);
  assert.deepEqual(r.rows[0].result.destinations,['world','writer']);
  const row=(await db.query('select * from inbound_emails where id=1')).rows[0];
  assert.equal(row.body_text,'original untrusted source');assert.equal(row.meta.provider_id,'retained');
  assert.equal(row.meta.source_email_v1.held,true);assert.equal(row.read,false);assert.equal(row.reply_count,3);
  assert.equal((await db.query("select count(*) n from pg_tables where schemaname='public'")).rows[0].n,2);
});
test('stale second admin window cannot overwrite a prior destination decision',async()=>{
  await assert.rejects(()=>as('authenticated',admin,()=>route(['nowbar'],0)),/source changed/);
  assert.deepEqual((await db.query('select meta from inbound_emails')).rows[0].meta.intake_projection_v1.destinations,['world','writer']);
});
test('invalid destinations, null revision and missing source are rejected',async()=>{
  await assert.rejects(()=>as('authenticated',admin,()=>route(['send-email'],1)),/unsupported destination/);
  await assert.rejects(()=>as('authenticated',admin,()=>route([null],1)),/unsupported destination/);
  await assert.rejects(()=>as('authenticated',admin,()=>route(['world'],null)),/expected revision/);
  await assert.rejects(()=>as('authenticated',admin,()=>route(['world'],0,99)),/source unavailable/);
});
test('clearing destinations remains draft, revision advances, no notification/publication store exists',async()=>{
  const r=await as('authenticated',admin,()=>route([],1));
  assert.deepEqual(r.rows[0].result.destinations,[]);assert.equal(r.rows[0].result.revision,2);
  assert.equal(r.rows[0].result.state,'draft');
});
test('PostgreSQL revision guard rejects a receiving writer snapshot after an admin decision',async()=>{
  const snapshot=(await db.query('select meta from inbound_emails where id=1')).rows[0].meta;
  await as('authenticated',admin,()=>route(['world'],2));
  const attempted={...snapshot,source_email_v1:{admission:'refreshed'}};
  const stale=await db.query("update inbound_emails set meta=$1::jsonb where id=1 and meta->'intake_projection_v1'->>'revision'=$2 returning id",[JSON.stringify(attempted),String(snapshot.intake_projection_v1.revision)]);
  assert.equal(stale.rows.length,0);
  const current=(await db.query('select meta from inbound_emails where id=1')).rows[0].meta;
  assert.deepEqual(current.intake_projection_v1.destinations,['world']);assert.equal(current.source_email_v1.held,true);
});
