import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const {PGlite}=await import(process.env.PGLITE_MODULE_PATH || '@electric-sql/pglite');
const sql=await readFile('scripts/sql/stage-private-email-archive-v1.sql','utf8');
async function fixture(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;
 create table inbound_emails(id bigint generated always as identity primary key,from_email text,from_name text,
 to_email text,subject text,body_text text,body_html text,message_id text unique,in_reply_to text,
 received_at timestamptz not null default now(),read boolean not null default false,replied_at timestamptz,
 reply_count integer not null default 0,meta jsonb);
 create table decision_ledger(id uuid primary key default gen_random_uuid(),decision_type text,
 subject_type text,subject_ref text,domain text,created_by_agent text,human_decision text,human_reason text,
 decided_by text,status text,evidence jsonb,result_ref jsonb,provenance jsonb);
 create table channel_updates(id uuid primary key,text text,source text);
 alter table inbound_emails enable row level security;
 grant select on inbound_emails to authenticated;
 create policy authenticated_none on inbound_emails for select to authenticated using(false);`);
 const counts=[3,5,1,4];let counter=0;const records=[];
 for(let t=0;t<counts.length;t++)for(let n=0;n<counts[t];n++){
  counter++;const gmail=`archive-${counter}`,message=`source-${counter}@example.invalid`;
  records.push({gmail_id:gmail,thread_id:`thread-${t}`,from_email:'sender@example.invalid',from_name:'Synthetic Author',
   message_id:message,in_reply_to:n?`source-${counter-1}@example.invalid`:null,
   subject:'Synthetic source',body_text:`Private source ${counter}`,received_at:'2026-10-10T00:00:00Z',
   payload_sha256:'a'.repeat(64),normalized:{id:`mail_${counter}`,provider:'gmail',provider_id:gmail,
    message_id:message,source_state:'unverified',admission:'archive_unverified',held:true,author:null,identity_proof:null,
    images:counter===9?[{id:'private-image-reference',state:'provider_reference'}]:[]}});
 }
 for(const index of [1,2]){
  const r=records[index];
  const existing=(await db.query(`insert into inbound_emails(from_email,body_text,message_id,read,reply_count,meta)
   values($1,'Original Resend source', $2,true,2,'{"provider":"resend","verified_webhook":true}')
   returning id`,[r.from_email,r.message_id])).rows[0];
  r.expected_id=Number(existing.id);
  r.expected_revision=(await db.query('select md5(to_jsonb(e)::text) revision from inbound_emails e where id=$1',[existing.id])).rows[0].revision;
 }
 const ctx={decision_ref:'ZURIEL:synthetic:approved-four',human_decision:'approve_private_staging',expected_inbox_count:2,records};
 ctx.expected_input_revision=(await db.query('select md5($1::jsonb::text) revision',[JSON.stringify(records)])).rows[0].revision;
 return{db,ctx};
}
async function run(db,ctx){await db.exec('begin');try{
 await db.query("select set_config('sod1820.email_archive_v1',$1,true)",[JSON.stringify(ctx)]);
 await db.exec(sql);await db.exec('commit');
 }catch(e){await db.exec('rollback');throw e;}}
const dump=async db=>({inbox:(await db.query('select * from inbound_emails order by id')).rows,
 audit:(await db.query('select * from decision_ledger order by subject_ref')).rows,
 public:(await db.query('select * from channel_updates')).rows});
test('actual native-schema DML stages 11 sources, preserves both Resend originals, creates 4 private receipts without public admission',async()=>{
 const{db,ctx}=await fixture();try{
  const before=await dump(db);await run(db,ctx);const after=await dump(db);
  assert.deepEqual(after.inbox.slice(0,2),before.inbox);assert.equal(after.inbox.length,13);
  assert.equal(after.audit.length,4);assert.deepEqual(after.public,before.public);
  for(const row of after.inbox.slice(2)){
   assert.equal(row.meta.source_held,true);assert.equal(row.meta.source_email_v1.held,true);
   assert.equal(row.meta.source_email_v1.author,null);assert.equal(row.meta.source_email_v1.identity_proof,null);
   assert.equal(row.meta.intake_projection_v1.state,'draft');assert.equal(row.meta.intake_projection_v1.publication_ready,false);
   assert.equal(row.meta.archive_curated_v1.sender_authenticated,false);
  }
  const audit=JSON.stringify(after.audit);assert.equal(audit.includes('sender@example.invalid'),false);
  assert.equal(audit.includes('Private source'),false);assert.equal(audit.includes('Synthetic Author'),false);
  assert.equal(after.inbox.find(r=>r.message_id==='source-9@example.invalid').meta.source_email_v1.images[0].state,'provider_reference');
  await db.exec('set role authenticated');assert.deepEqual((await db.query('select * from inbound_emails')).rows,[]);
  await db.exec('reset role;set role anon');await assert.rejects(()=>db.query('select * from inbound_emails'),/permission denied/);
  await db.exec('reset role');
 }finally{await db.close();}
});
test('exact replay is a no-op, while changed archived content refuses replay without rewriting it',async()=>{
 const{db,ctx}=await fixture();try{
  await run(db,ctx);const before=await dump(db);await run(db,ctx);assert.deepEqual(await dump(db),before);
  await db.exec("update inbound_emails set body_text='changed' where id=3");const changed=await dump(db);
  await assert.rejects(()=>run(db,ctx),/staged archive changed/);assert.deepEqual(await dump(db),changed);
 }finally{await db.close();}
});
test('ordinary and anonymous roles cannot spoof approval',async()=>{
 const{db,ctx}=await fixture();try{
  const before=await dump(db);for(const role of ['anon','authenticated']){
   await db.exec(`set role ${role}`);await assert.rejects(()=>run(db,ctx),/trusted database operator/);await db.exec('reset role');
  }assert.deepEqual(await dump(db),before);
 }finally{await db.close();}
});
test('source proof, sender attribution and released holds are never accepted in archive input',async()=>{
 for(const field of ['author','identity_proof','admission','held','source_state','provider']){
  const{db,ctx}=await fixture();try{
   ctx.records[0].normalized[field]=field==='held'?false:field==='author'?{author_key:'impersonated'}:'forged';
   const before=await dump(db);await assert.rejects(()=>run(db,ctx),/must not assert/);assert.deepEqual(await dump(db),before);
  }finally{await db.close();}
 }
});
test('stale existing receipt or concurrent new receipt cancels the batch before any staging',async()=>{
 for(const change of ['original','count','duplicate']){
  const{db,ctx}=await fixture();try{
   if(change==='original')await db.exec("update inbound_emails set reply_count=3 where id=1");
   if(change==='count')await db.exec("insert into inbound_emails(message_id) values('another-source')");
   if(change==='duplicate')await db.exec("update inbound_emails set message_id='source-1@example.invalid' where id=1");
   const before=await dump(db);await assert.rejects(()=>run(db,ctx),/changed|already present/);assert.deepEqual(await dump(db),before);
  }finally{await db.close();}
 }
});
test('missing mandatory audit rolls back the entire staging transaction',async()=>{
 const{db,ctx}=await fixture();try{
  await db.exec('alter table decision_ledger add constraint reject_audit check(false)');const before=await dump(db);
  await assert.rejects(()=>run(db,ctx),/reject_audit/);assert.deepEqual(await dump(db),before);
 }finally{await db.close();}
});
test('input revision and original private RLS/ACL are enforced before writes',async()=>{
 for(const change of ['input','rls','grant']){
  const{db,ctx}=await fixture();try{
   if(change==='input')ctx.records[0].body_text='unreviewed replacement';
   if(change==='rls')await db.exec('alter table inbound_emails disable row level security');
   if(change==='grant')await db.exec('grant select on inbound_emails to anon');
   const before=await dump(db);await assert.rejects(()=>run(db,ctx),/boundary changed|reviewed input changed/);assert.deepEqual(await dump(db),before);
  }finally{await db.close();}
 }
});
