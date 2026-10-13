// Real isolated PostgreSQL (PGlite), never the live project. Provide the module
// path after installing @electric-sql/pglite in a temporary test runtime.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE_PATH || '@electric-sql/pglite');
const db = new PGlite();
const authorA='11111111-1111-4111-8111-111111111111';
const authorB='22222222-2222-4222-8222-222222222222';
await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create table public.site_flags(key text primary key,enabled boolean not null,mode text,message text);
  create table public.users(id uuid primary key,email text);
  create table public.contributors(id uuid primary key,slug text,display_name text,email text,
    active boolean,merged_into text,page_config jsonb,user_id uuid,kind text,
    source text,building boolean,engaged boolean,trusted boolean,dossier_settings jsonb,
    updated_at timestamptz);
  create table public.inbound_emails(id bigint primary key,from_email text,meta jsonb);
  create table public.channel_updates(id uuid primary key default gen_random_uuid(),source text,status text,
    page_only boolean,expires_at timestamptz,channel text,text text,credit text,contributor_id uuid,
    created_at timestamptz,ext_msg_id text unique);
  alter table public.channel_updates enable row level security;
  alter table public.inbound_emails enable row level security;
  grant select on public.channel_updates to anon,authenticated;
  create policy cu_public_read on public.channel_updates for select using(status='live');
`);
await db.exec(await readFile('supabase/migrations/20261013193000_legacy_email_source_bridge.sql','utf8'));
await db.exec(await readFile('supabase/migrations/20261013203500_provision_email_source_authors.sql','utf8'));
assert.equal((await db.query("select enabled from site_flags where key='mail_source_publication'")).rows[0].enabled,false);
await db.exec("update site_flags set enabled=true where key='mail_source_publication'");
await db.query(`insert into contributors(id,slug,display_name,email,active,merged_into,page_config) values
  ($1,'demo-a','כותב א','a@example.invalid',true,null,'{"email_source_public":true}'),
  ($2,'demo-b','כותב ב','b@example.invalid',true,null,'{"email_source_public":true}')`,[authorA,authorB]);
async function seed(id, overrides={}) {
  const contributor = overrides.contributor || authorA;
  const source = { id:`source-${id}`,parent_id:null,storage_key:`provider-${id}`,full_text:`טקסט ${id}`,
    arrival_at:`2026-10-13T${String(id%20).padStart(2,'0')}:00:00Z`,technical_test:false,
    text_state:'available',sanitizer_version:'mail-source-v2',admission:'approved_source_candidate',
    publication_state:'private',author:{contributor_id:contributor},
    identity_proof:{provider:'resend',provider_id:`provider-${id}`,dmarc:'pass',dkim:'pass',basis:'resend_receiving_api_v1',from_aligned:true},
    ...overrides.source };
  await db.query('insert into inbound_emails values($1,$2,$3)',[id,
    contributor===authorA?'a@example.invalid':'b@example.invalid',
    JSON.stringify({provider:'resend',provider_id:`provider-${id}`,verified_webhook:true,source_email_v1:source})]);
  return source;
}
async function admit(id) { return (await db.query('select admit_email_source_v1($1) as result',[id])).rows[0].result; }
async function anon(sql) {
  await db.exec('set role anon');
  try { return (await db.query(sql)).rows; } finally { await db.exec('reset role'); }
}
test.after(()=>db.close());
test('migration applies to real PostgreSQL and private inbox remains inaccessible', async()=>{
  await assert.rejects(()=>anon('select * from inbound_emails'),/permission denied/);
  await assert.rejects(()=>anon('select admit_email_source_v1(1)'),/permission denied/);
});
test('root and reply reach existing public carrier; conversation pagination includes old parent', async()=>{
  await seed(1); assert.equal((await admit(1)).state,'public');
  await seed(2,{contributor:authorB,source:{parent_id:'source-1'}});
  assert.equal((await admit(2)).state,'public');
  const rows=await anon('select * from email_source_threads_v1(1)');
  assert.equal(rows.length,2); assert.deepEqual(rows.map(r=>r.id),['source-1','source-2']);
  assert.equal(rows[1].parent_id,'source-1');
  assert.equal(JSON.stringify(rows).includes('@example.invalid'),false);
});
test('known tests, missing proof, holds and quote-only sources never become public', async()=>{
  await seed(56); assert.equal((await admit(56)).state,'private');
  await seed(3,{source:{identity_proof:null}}); assert.equal((await admit(3)).state,'private');
  await seed(4,{source:{held:true}}); assert.equal((await admit(4)).state,'private');
  await seed(5,{source:{text_state:'cleaned_empty',full_text:''}}); assert.equal((await admit(5)).state,'private');
  assert.equal((await anon('select * from channel_updates')).length,2);
});
test('revocation immediately removes old sources from both RPC and direct anonymous SELECT', async()=>{
  await db.query(`update contributors set page_config='{}' where id=$1`,[authorA]);
  const direct=await anon('select text from channel_updates');
  assert.deepEqual(direct.map(r=>r.text),['טקסט 2']);
  const rows=await anon('select * from email_source_threads_v1(1)');
  assert.equal(rows.length,1); assert.equal(rows[0].parent_id,'source-1');
  await db.query(`update contributors set page_config='{"email_source_public":true}' where id=$1`,[authorA]);
});
test('RFC collision stays private and replay dedup leaves one public identity', async()=>{
  await seed(6,{source:{id:'source-1'}});
  assert.equal((await admit(6)).state,'lineage_collision');
  assert.equal((await admit(1)).state,'public');
  assert.equal((await anon('select * from channel_updates')).length,2);
});
test('public reader excludes cyclic lineage instead of inventing a chronology', async()=>{
  await seed(7,{source:{parent_id:'source-8'}}); await admit(7);
  await seed(8,{source:{parent_id:'source-7'}}); await admit(8);
  const rows=await anon('select * from email_source_threads_v1(15)');
  assert.ok(rows.every(row=>!['source-7','source-8'].includes(row.id)));
});
test('old unproved email rows stay hidden; unrelated legacy sources keep their existing public visibility', async()=>{
  await db.exec(`insert into channel_updates(source,status,page_only,text) values
    ('email','live',false,'unproved email'),('auto','live',false,'existing Zvi update')`);
  const rows=await anon('select text from channel_updates');
  assert.ok(!rows.some(row=>row.text==='unproved email'));
  assert.ok(rows.some(row=>row.text==='existing Zvi update'));
});
test('a newly ambiguous canonical mailbox immediately revokes existing mail read eligibility', async()=>{
  await db.query(`insert into contributors(id,slug,display_name,email,active,merged_into,page_config) values($1,'duplicate','duplicate','a@example.invalid',true,null,'{}')`,['33333333-3333-4333-8333-333333333333']);
  const rows=await anon('select * from email_source_threads_v1(15)');
  assert.ok(rows.every(row=>row.author_key!=='demo-a'));
});
test('account-linked canonical authors resolve privately without copying mailbox into contributor fields',async()=>{
  const id='44444444-4444-4444-8444-444444444444';
  await db.query('insert into users values($1,$2)',[id,'linked@example.invalid']);
  await db.query(`insert into contributors(id,slug,display_name,active,page_config,user_id) values($1,'linked','Linked',true,'{"email_source_public":true}',$1)`,[id]);
  const rows=(await db.query(`select * from email_source_author_v1('linked@example.invalid')`)).rows;
  assert.equal(rows.length,1);assert.equal(rows[0].contributor_id,id);
  await assert.rejects(()=>anon(`select * from email_source_author_v1('linked@example.invalid')`),/permission denied/);
  await assert.rejects(()=>anon(`select email_source_mailbox_v1('${id}')`),/permission denied/);
});
test('exact thirteen provisioning is operator-only and creates private source identities, without account claims',async()=>{
  const approved=Array.from({length:13},(_,index)=>({email:`source-${index}@example.invalid`,display:`Source ${index}`}));
  await assert.rejects(()=>anon(`select provision_email_source_authors_v1('[]')`),/permission denied/);
  const first=(await db.query('select provision_email_source_authors_v1($1) as result',[JSON.stringify(approved)])).rows[0].result;
  assert.equal(first.created_private_sources,13);assert.equal(first.approved,13);
  const second=(await db.query('select provision_email_source_authors_v1($1) as result',[JSON.stringify(approved)])).rows[0].result;
  assert.equal(second.created_private_sources,0);assert.equal(second.reused,13);
  const rows=(await db.query("select * from contributors where source='email-approved-20261013'")).rows;
  assert.equal(rows.length,13);
  assert.ok(rows.every(row=>row.dossier_settings.visibility==='private'&&row.user_id===null&&row.trusted===false&&row.building===true));
});
test('duplicate or wrong-sized source approval batches fail atomically',async()=>{
  await assert.rejects(()=>db.query('select provision_email_source_authors_v1($1)',[JSON.stringify([])]),/thirteen/);
  await assert.rejects(()=>db.query('select provision_email_source_authors_v1($1)',[JSON.stringify(Array.from({length:13},()=>({email:'duplicate@example.invalid',display:'Duplicate'})))]),/duplicate/);
});
test('publication hold keeps all admitted mails hidden and blocks admission, independently of author approval',async()=>{
  await db.exec("update site_flags set enabled=false where key='mail_source_publication'");
  assert.deepEqual(await anon('select * from email_source_threads_v1(15)'),[]);
  assert.deepEqual(await anon("select * from channel_updates where source='email'"),[]);
  assert.equal((await admit(2)).state,'standby');
});
