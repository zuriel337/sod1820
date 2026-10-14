// Synthetic rehearsal of the pending Person-owner decision, NOT a production
// repair runner. Same thirteen-entry shape/footprint as the bounded live read;
// no real addresses, names, bodies or identity IDs. Native merge is slug-based.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite }=await import(process.env.PGLITE_MODULE_PATH || '@electric-sql/pglite');
const db=new PGlite();
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const approved=Array.from({length:13},(_,i)=>({email:`source-${i+1}@example.invalid`,display:`Source ${i+1}`}));
const account4=id(104),account13=id(113),imported=id(213),canonical=id(313),linked4=id(204);
await db.exec(`
create role anon; create role authenticated; create role service_role;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('test.uid',true),'')::uuid $$;
create table users(id uuid primary key,email text,role text);
create table persons(person_id uuid primary key,account_user_id uuid unique);
create table contributors(id uuid primary key,slug text,display_name text,email text,
 active boolean,merged_into text,page_config jsonb,user_id uuid,kind text,source text,
 building boolean,engaged boolean,trusted boolean,dossier_settings jsonb,updated_at timestamptz);
create table research_contributions(id uuid primary key,author_contributor_id uuid,
 author_user_id uuid,status text,body text);
create table contributor_content(id uuid primary key,contributor_id uuid,is_public boolean,is_personal boolean,body text);
alter table contributors enable row level security;
alter table research_contributions enable row level security;
alter table contributor_content enable row level security;
grant usage on schema auth to anon,authenticated;
grant select on users,contributors,research_contributions,contributor_content to anon,authenticated;
-- Exact relevant live SELECT policy predicates, captured 2026-10-14.
create policy contributors_read on contributors for select using(
 coalesce(dossier_settings->>'visibility','public')<>'private' or user_id=auth.uid()
 or exists(select 1 from users u where u.id=auth.uid() and u.role='admin'));
create policy rc_public_read on research_contributions for select using(status='approved' or author_user_id=auth.uid());
create policy cc_public_read on contributor_content for select using(is_public=true and is_personal=false);
`);
await db.exec(await readFile('supabase/migrations/20261013203500_provision_email_source_authors.sql','utf8'));
for(const index of [3,4,6,13]) {
 await db.query('insert into users values($1,$2,$3)',[id(100+index),approved[index-1].email,'user']);
 await db.query('insert into persons values($1,$2)',[id(400+index),id(100+index)]);
}
for(const index of [3,6]) await db.query(`insert into contributors
 (id,slug,email,user_id,active,kind,page_config) values($1,$2,$3,$4,true,'community','{}')`,
 [id(200+index),`existing-${index}`,index===3?approved[index-1].email:null,id(100+index)]);
await db.query(`insert into contributors(id,slug,display_name,email,user_id,active,kind,source,dossier_settings,page_config)
 values($1,'imported-13','Imported Source',$2,null,true,'external','openweb_import','{"visibility":"private"}','{}'),
 ($3,'r-existing-account-13','Account Source',null,$4,true,'community','self-dossier','{}','{}')`,
 [imported,approved[12].email,canonical,account13]);
for(let i=0;i<26;i++) await db.query('insert into research_contributions values($1,$2,$3,$4,$5)',
 [id(500+i),i<3?imported:canonical,i<3?null:account13,i<2||(i>=3&&i<12)?'approved':'hidden',`Synthetic material ${i}`]);
await db.query('insert into contributor_content values($1,$2,false,true,$3)',[id(600),canonical,'Synthetic private page content']);
const call=async name=>(await db.query(`select ${name}($1::jsonb) result`,[JSON.stringify(approved)])).rows[0].result;
const asRole=async(role,sql,uid='')=>{
 await db.query("select set_config('test.uid',$1,false)",[uid]);
 await db.exec(`set role ${role}`);
 try{return(await db.query(sql)).rows;}finally{await db.exec('reset role');await db.exec("select set_config('test.uid','',false)");}
};
const material=async()=>({research:(await db.query('select * from research_contributions order by id')).rows,
 content:(await db.query('select * from contributor_content order by id')).rows,
 persons:(await db.query('select * from persons order by person_id')).rows});
test.after(()=>db.close());
test('rehearsal starts with two resolved, nine missing, account-link and ambiguity blockers',async()=>{
 const plan=await call('preview_email_source_authors_v1');
 assert.equal(plan.blocked,2);
 assert.equal(plan.entries.filter(x=>x.state==='resolved').length,2);
 assert.equal(plan.entries.filter(x=>x.state==='would_create_private').length,9);
 assert.equal(plan.entries[3].state,'account_link_required');
 assert.equal(plan.entries[12].state,'ambiguous');
 assert.equal((await asRole('anon','select count(*) n from research_contributions'))[0].n,11,
  'private dossier does not make already-approved contributions private');
 const before=await material();
 await assert.rejects(()=>call('provision_email_source_authors_v1'),/reconciliation required/);
 assert.deepEqual(await material(),before);
});
test('explicit owner account-link rehearsal reuses existing Person and creates only a private contributor',async()=>{
 const before=await material();
 // Test-only simulation of a future separately approved operator transaction.
 // No production helper/automatic account claim is introduced by this test.
 await db.query(`insert into contributors(id,slug,display_name,email,user_id,active,kind,source,
 building,engaged,trusted,dossier_settings,page_config)
 values($1,'mail-source-linked-4',$2,$3,$4,true,'private','email-approved-20261013',
 false,false,false,'{"visibility":"private","identity_basis":"human_gate_account_link"}','{}')`,
 [linked4,approved[3].display,approved[3].email,account4]);
 assert.deepEqual(await material(),before,'no new Person or moved material');
 const plan=await call('preview_email_source_authors_v1');
 assert.equal(plan.blocked,1);assert.equal(plan.entries[3].state,'resolved');
 assert.equal((await asRole('anon',`select id from contributors where id='${linked4}'`)).length,0);
 assert.equal((await asRole('authenticated',`select id from contributors where id='${linked4}'`,account4)).length,1);
 await assert.rejects(()=>call('provision_email_source_authors_v1'),/reconciliation required/);
});
test('explicit native slug-alias rehearsal preserves attribution, visibility, content and Person rows',async()=>{
 const before=await material();
 const oldImport=(await db.query('select * from contributors where id=$1',[imported])).rows[0];
 const oldTarget=(await db.query('select * from contributors where id=$1',[canonical])).rows[0];
 const publicBefore=await asRole('anon','select id from research_contributions order by id');
 await db.query('update contributors set merged_into=$1 where id=$2',[oldTarget.slug,imported]);
 const afterImport=(await db.query('select * from contributors where id=$1',[imported])).rows[0];
 assert.deepEqual(afterImport,{...oldImport,merged_into:oldTarget.slug});
 assert.deepEqual((await db.query('select * from contributors where id=$1',[canonical])).rows[0],oldTarget);
 assert.deepEqual(await material(),before);
 assert.deepEqual(await asRole('anon','select id from research_contributions order by id'),publicBefore);
 assert.deepEqual(await asRole('anon',`select id from contributors where id='${imported}'`),[]);
 assert.deepEqual(await asRole('anon','select * from contributor_content'),[]);
 const plan=await call('preview_email_source_authors_v1');
 assert.equal(plan.blocked,0);assert.deepEqual(plan.entries[12].contributor_ids,[canonical]);
 assert.equal((await db.query('select count(*) n from contributors')).rows[0].n,5,'no deleted alias or extra duplicate');
});
test('after the simulated decisions, exact batch privately provisions nine and replay preserves all material',async()=>{
 const before=await material();
 const result=await call('provision_email_source_authors_v1');
 assert.deepEqual(result,{approved:13,reused:4,created_private_sources:9});
 assert.deepEqual(await material(),before);
 const rows=(await db.query('select * from contributors')).rows;
 assert.equal(rows.filter(x=>x.page_config?.email_source_public===true).length,0);
 assert.equal(rows.filter(x=>x.page_config?.email_source_approved===true).length,13);
 const resolved=(await db.query('select contributor_id from email_source_author_v1($1)',[approved[12].email])).rows;
 assert.deepEqual(resolved,[{contributor_id:canonical}]);
 assert.equal((await call('provision_email_source_authors_v1')).created_private_sources,0);
 assert.equal((await db.query('select count(*) n from contributors')).rows[0].n,14,'thirteen senders plus retained alias');
 assert.equal((await asRole('anon','select count(*) n from research_contributions'))[0].n,11);
 assert.deepEqual(await material(),before);
});
