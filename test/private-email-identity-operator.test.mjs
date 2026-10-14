// Execute the actual one-off DML programs on isolated synthetic PostgreSQL data.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite }=await import(process.env.PGLITE_MODULE_PATH || '@electric-sql/pglite');
const apply=await readFile('scripts/sql/apply-private-email-identity-choice-v1.sql','utf8');
const undo=await readFile('scripts/sql/rollback-private-email-identity-choice-v1.sql','utf8');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const user4=id(104),user13=id(113),aliasId=id(213),targetId=id(313);
const approved=Array.from({length:13},(_,i)=>({email:`source-${i+1}@example.invalid`,display:`Source ${i+1}`}));
async function fixture(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create function auth.uid() returns uuid language sql stable as $$select null::uuid$$;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create table users(id uuid primary key,email text,role text);
 create table persons(person_id uuid primary key,account_user_id uuid unique);
 create table contributors(id uuid primary key,slug text,display_name text,email text,
  active boolean,merged_into text,page_config jsonb,user_id uuid,kind text,source text,
  building boolean,engaged boolean,trusted boolean,dossier_settings jsonb,updated_at timestamptz);
 -- Native live target_id catches PL/pgSQL variable/column shadowing. Keep it
 -- even though this operator never writes or selects the relation target itself.
 create table research_contributions(id uuid primary key,author_contributor_id uuid,author_user_id uuid,status text,body text,target_id text);
 create table contributor_content(id uuid primary key,contributor_id uuid,is_public boolean,is_personal boolean,body text);
 create table channel_updates(id uuid primary key,contributor_id uuid,source text);
 create table channel_update_group_proof(identity_contributor_id uuid);
 create table inbound_emails(id bigint,meta jsonb);
 create table identity_edges(sod_id text,legacy_id text);
 create table decision_ledger(id uuid primary key default gen_random_uuid(),decision_type text not null,
  subject_type text,subject_ref text,candidate jsonb,domain text,created_by_agent text,evidence jsonb,
  rules_version jsonb,human_decision text check(human_decision in('approve','reject','merge','modify')),
  human_reason text,decided_by text,result_ref jsonb,provenance jsonb,
  status text not null check(status in('confirmed','rejected','applied','executed')));
 alter table contributors enable row level security;
 grant usage on schema auth to anon,authenticated;
 grant select on users,contributors to anon,authenticated;
 create policy contributors_read on contributors for select using(coalesce(dossier_settings->>'visibility','public')<>'private'
  or user_id=auth.uid() or exists(select 1 from users u where u.id=auth.uid() and u.role='admin'));
 `);
 for(const index of [3,4,6,13]) {
  await db.query('insert into users values($1,$2,$3)',[id(100+index),approved[index-1].email,'user']);
  await db.query('insert into auth.users values($1,$2,now())',[id(100+index),approved[index-1].email]);
  await db.query('insert into persons values($1,$2)',[id(400+index),id(100+index)]);
 }
 for(const index of [3,6]) await db.query("insert into contributors(id,slug,email,user_id,active,kind,page_config) values($1,$2,$3,$4,true,'community','{}')",
  [id(200+index),`existing-${index}`,index===3?approved[index-1].email:null,id(100+index)]);
 await db.query(`insert into contributors(id,slug,display_name,email,user_id,active,kind,source,dossier_settings,page_config)
 values($1,'imported-13','Imported Source',$2,null,true,'external','openweb_import','{"visibility":"private"}','{}'),
 ($3,'r-existing-account-13','Account Source',null,$4,true,'community','self-dossier','{}','{}')`,[aliasId,approved[12].email,targetId,user13]);
 for(let i=0;i<26;i++) await db.query('insert into research_contributions(id,author_contributor_id,author_user_id,status,body) values($1,$2,$3,$4,$5)',
  [id(500+i),i<3?aliasId:targetId,i<3?null:user13,i<2||(i>=3&&i<12)?'approved':'hidden',`Synthetic ${i}`]);
 await db.query('insert into contributor_content values($1,$2,false,true,$3)',[id(600),targetId,'Synthetic private content']);
 const [source,target]=(await db.query("select id,md5(to_jsonb(c)::text) revision,md5((to_jsonb(c)-'merged_into')::text) without_pointer from contributors c where id in($1,$2) order by id",[aliasId,targetId])).rows;
 const users=(await db.query('select id,md5(to_jsonb(u)::text) revision from users u where id in($1,$2) order by id',[user4,user13])).rows;
 const material=(await db.query(`select md5(jsonb_build_object(
 'research',coalesce((select jsonb_agg(to_jsonb(r) order by r.id) from research_contributions r),'[]'::jsonb),
 'content',coalesce((select jsonb_agg(to_jsonb(r) order by r.id) from contributor_content r),'[]'::jsonb))::text) revision`)).rows[0].revision;
 const ctx={decision_ref:'ZURIEL:synthetic:choice1',human_choice:1,approved,
  link:{user_id:user4,user_revision:users[0].revision,person_id:id(404)},
  alias:{user_id:user13,user_revision:users[1].revision,person_id:id(413),contributor_id:aliasId,target_id:targetId,
   source_revision:source.revision,source_without_pointer_revision:source.without_pointer,target_revision:target.revision,target_slug:'r-existing-account-13'},
  material_revision:material};
 return{db,ctx};
}
async function run(db,ctx,program=apply){
 await db.exec('begin');
 try{
  await db.query("select set_config('sod1820.email_identity_choice_v1',$1,true)",[JSON.stringify(ctx)]);
  await db.exec("set local lock_timeout='2s';set local statement_timeout='10s'");
  await db.exec(program);await db.exec('commit');
 }catch(e){await db.exec('rollback');throw e;}
}
const dump=async db=>{
 const out={};for(const t of ['users','persons','contributors','research_contributions','contributor_content','decision_ledger','channel_updates','inbound_emails'])
  out[t]=(await db.query(`select * from ${t} order by 1`)).rows;
 return out;
};
const rollbackCtx=ctx=>({decision_ref:ctx.decision_ref,rollback_decision_ref:'ZURIEL:synthetic:rollback',human_choice:'rollback'});
test('actual DML creates one private account-linked profile and native alias, preserves original material/Persons and audits without contacts',async()=>{
 const{db,ctx}=await fixture();try{
  const before=await dump(db);await run(db,ctx);const after=await dump(db);
  for(const t of ['users','persons','research_contributions','contributor_content','channel_updates','inbound_emails']) assert.deepEqual(after[t],before[t],t);
  assert.equal(after.contributors.length,before.contributors.length+1);
  assert.deepEqual(after.contributors.find(c=>c.id===aliasId),{...before.contributors.find(c=>c.id===aliasId),merged_into:ctx.alias.target_slug});
  assert.deepEqual(after.contributors.find(c=>c.id===targetId),before.contributors.find(c=>c.id===targetId));
  const added=after.contributors.find(c=>c.user_id===user4);
  assert.equal(added.kind,'private');assert.equal(added.dossier_settings.visibility,'private');
  assert.equal(added.page_config.email_source_approved,undefined);assert.equal(added.page_config.email_source_public,undefined);
  assert.equal(after.decision_ledger.length,1);const audit=JSON.stringify(after.decision_ledger);
  assert.equal(audit.includes('@'),false);assert.equal(audit.includes('Synthetic private content'),false);assert.equal(audit.includes('Source 4'),false);
  await db.exec('set role anon');assert.equal((await db.query(`select id from contributors where id='${added.id}' or id='${aliasId}'`)).rows.length,0);await db.exec('reset role');
 }finally{await db.close();}
});
test('exact replay does not duplicate profile or audit; changed row/reused approval fails closed',async()=>{
 const{db,ctx}=await fixture();try{
  await run(db,ctx);const before=await dump(db);await run(db,ctx);assert.deepEqual(await dump(db),before);
  await assert.rejects(()=>run(db,{...ctx,human_choice:'1'}),/human choice/);
  await db.query('update contributors set page_config=$1::jsonb where user_id=$2',[JSON.stringify({email_source_approved:true}),user4]);
  const changed=await dump(db);await assert.rejects(()=>run(db,ctx),/state changed/);assert.deepEqual(await dump(db),changed);
 }finally{await db.close();}
});
test('untrusted database roles cannot execute a spoofed human choice',async()=>{
 const{db,ctx}=await fixture();try{
  const before=await dump(db);
  for(const role of ['anon','authenticated']){
   await db.exec(`set role ${role}`);await assert.rejects(()=>run(db,ctx),/trusted database operator/);await db.exec('reset role');
  }
  assert.deepEqual(await dump(db),before);
 }finally{await db.close();}
});
test('stale account, unconfirmed email, duplicate candidate, missing Person and stale material each cancel the entire operator action',async()=>{
 for(const fault of ['account','confirmation','candidate','person','material','target','slug']){
  const{db,ctx}=await fixture();try{
   if(fault==='account')await db.query("update users set email='changed@example.invalid' where id=$1",[user4]);
   if(fault==='confirmation')await db.query('update auth.users set email_confirmed_at=null where id=$1',[user13]);
   if(fault==='candidate')await db.query("insert into contributors(id,user_id,active) values(gen_random_uuid(),$1,true)",[user4]);
   if(fault==='person')await db.query('delete from persons where account_user_id=$1',[user4]);
   if(fault==='material')await db.exec("update research_contributions set status='hidden' where id='00000000-0000-4000-8000-000000000500'");
   if(fault==='target')await db.query('update contributors set active=false where id=$1',[targetId]);
   if(fault==='slug')ctx.alias.target_slug='wrong-slug';
   const before=await dump(db);await assert.rejects(()=>run(db,ctx),/state changed/);assert.deepEqual(await dump(db),before,fault);
  }finally{await db.close();}
 }
});
test('failed post-write preservation or failed mandatory audit rolls back both profile writes',async()=>{
 for(const fault of ['preservation','audit']){
  const{db,ctx}=await fixture();try{
   if(fault==='preservation')ctx.alias.source_without_pointer_revision='bad-revision';
   else await db.exec('alter table decision_ledger add constraint reject_audit check(false)');
   const before=await dump(db);await assert.rejects(()=>run(db,ctx),/preservation check failed|reject_audit/);assert.deepEqual(await dump(db),before);
  }finally{await db.close();}
 }
});
test('reviewed rollback preserves all rows/material/Persons, restores alias and retains new source inactive; old approval cannot be replayed',async()=>{
 const{db,ctx}=await fixture();try{
  const before=await dump(db);await run(db,ctx);await run(db,rollbackCtx(ctx),undo);const after=await dump(db);
  for(const t of ['users','persons','research_contributions','contributor_content','channel_updates','inbound_emails'])assert.deepEqual(after[t],before[t],t);
  assert.deepEqual(after.contributors.find(c=>c.id===aliasId),before.contributors.find(c=>c.id===aliasId));
  assert.equal(after.contributors.find(c=>c.user_id===user4).active,false);assert.equal(after.contributors.length,5);
  assert.equal(after.decision_ledger.length,2);assert.equal(after.decision_ledger[0].status,'applied');
  await assert.rejects(()=>run(db,ctx),/rolled back/);await assert.rejects(()=>run(db,rollbackCtx(ctx),undo),/rollback already/);
  assert.deepEqual(await dump(db),after);
 }finally{await db.close();}
});
test('rollback refuses any changed source or newly referenced source without altering alias or audit',async()=>{
 for(const fault of ['changed','reference']){
  const{db,ctx}=await fixture();try{
   await run(db,ctx);const created=(await db.query('select id from contributors where user_id=$1',[user4])).rows[0].id;
   if(fault==='changed')await db.query('update contributors set page_config=$1::jsonb where id=$2',[JSON.stringify({email_source_approved:true}),created]);
   else await db.query('insert into inbound_emails values(1,$1)',[JSON.stringify({source_email_v1:{author:{contributor_id:created}}})]);
   const before=await dump(db);await assert.rejects(()=>run(db,rollbackCtx(ctx),undo),/state changed|has references/);assert.deepEqual(await dump(db),before);
  }finally{await db.close();}
 }
});
