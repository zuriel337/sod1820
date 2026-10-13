import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE_PATH || '@electric-sql/pglite');
const db=new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role;
create table users(id uuid primary key,email text);
create table contributors(id uuid primary key,slug text,display_name text,email text,
active boolean,merged_into text,page_config jsonb,user_id uuid,kind text,source text,
building boolean,engaged boolean,trusted boolean,dossier_settings jsonb,updated_at timestamptz);`);
await db.exec(await readFile('supabase/migrations/20261013203500_provision_email_source_authors.sql','utf8'));
const batch=Array.from({length:13},(_,i)=>({email:`approved-${i}@example.invalid`,display:`Source ${i}`}));
const call=async(name,input=batch)=>(await db.query(`select ${name}($1::jsonb) result`,[JSON.stringify(input)])).rows[0].result;
test.after(()=>db.close());
test('private stage installs independently without public tables, policies or grants',async()=>{
  assert.equal((await db.query("select count(*) n from pg_tables where schemaname='public'")).rows[0].n,2);
  for(const role of ['anon','authenticated']) {
    await db.exec(`set role ${role}`);
    try {
      await assert.rejects(()=>call('preview_email_source_authors_v1'),/permission denied/);
      await assert.rejects(()=>call('provision_email_source_authors_v1'),/permission denied/);
      await assert.rejects(()=>db.query("select * from email_source_author_v1('approved-0@example.invalid')"),/permission denied/);
    } finally {await db.exec('reset role');}
  }
});
test('preflight is a dry run; private source approval never enables public publication',async()=>{
  const plan=await call('preview_email_source_authors_v1');
  assert.equal(plan.blocked,0);assert.ok(plan.entries.every(x=>x.state==='would_create_private'));
  assert.equal((await db.query('select count(*) n from contributors')).rows[0].n,0);
  const created=await call('provision_email_source_authors_v1');assert.equal(created.created_private_sources,13);
  const rows=(await db.query('select * from contributors')).rows;
  assert.ok(rows.every(x=>x.kind==='private'&&!x.building&&!x.trusted&&x.user_id===null&&x.dossier_settings.visibility==='private'));
  assert.ok(rows.every(x=>x.page_config.email_source_approved===true && x.page_config.email_source_public!==true));
  const author=(await db.query("select * from email_source_author_v1('approved-0@example.invalid')")).rows;
  assert.equal(author.length,1,'private canonical approval is usable without public authorization');
  assert.equal((await call('provision_email_source_authors_v1')).created_private_sources,0,'replay reuses source identity');
});
test('revoked private approval immediately removes canonical sender resolution',async()=>{
  await db.exec("update contributors set page_config='{}' where email='approved-0@example.invalid'");
  assert.deepEqual((await db.query("select * from email_source_author_v1('approved-0@example.invalid')")).rows,[]);
});
test('two profiles for one mailbox are reported and the entire provisioning batch stays unchanged',async()=>{
  await db.exec("insert into contributors(id,email,active) values(gen_random_uuid(),'approved-12@example.invalid',true)");
  const before=(await db.query('select id,page_config from contributors order by id')).rows;
  const plan=await call('preview_email_source_authors_v1');
  assert.equal(plan.blocked,1);assert.equal(plan.entries[12].state,'ambiguous');assert.equal(plan.entries[12].contributor_ids.length,2);
  assert.equal(JSON.stringify(plan).includes('@'),false,'preflight receipt omits private mailboxes');
  await assert.rejects(()=>call('provision_email_source_authors_v1'),/reconciliation required/);
  assert.deepEqual((await db.query('select id,page_config from contributors order by id')).rows,before);
  assert.deepEqual((await db.query("select * from email_source_author_v1('approved-12@example.invalid')")).rows,[]);
});
test('an existing unlinked account is held instead of minting a second unlinked Person identity',async()=>{
  const fresh=batch.map((x,i)=>({...x,email:`fresh-${i}@example.invalid`}));
  await db.exec("insert into users values(gen_random_uuid(),'fresh-4@example.invalid')");
  const plan=await call('preview_email_source_authors_v1',fresh);
  assert.equal(plan.blocked,1);assert.equal(plan.entries[4].state,'account_link_required');
  await assert.rejects(()=>call('provision_email_source_authors_v1',fresh),/reconciliation required/);
  assert.equal((await db.query("select count(*) n from contributors where email like 'fresh-%'")).rows[0].n,0);
});
test('wrong batch, duplicate mailbox and malformed input cannot reach provisioning',async()=>{
  await assert.rejects(()=>call('preview_email_source_authors_v1',[]),/thirteen/);
  await assert.rejects(()=>call('preview_email_source_authors_v1',batch.map(()=>batch[0])),/duplicate/);
  await assert.rejects(()=>call('preview_email_source_authors_v1',batch.map((x,i)=>i===0?{...x,display:''}:x)),/invalid/);
});
