// Isolated PostgreSQL fixture; no live DB calls. PGLITE_MODULE may select an external install.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {PGlite}=await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db=new PGlite();
const owner='11111111-1111-4111-8111-111111111111', other='22222222-2222-4222-8222-222222222222';
const user='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', foreign='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const event='33333333-3333-4333-8333-333333333333';
const request='44444444-4444-4444-8444-444444444444';
const person=`person:${owner}:self`;
await db.exec(`
 create role anon;create role authenticated;
 create schema auth;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated,anon;
 create table persons(person_id uuid primary key,account_user_id uuid);
 create table research_objects(id uuid primary key default gen_random_uuid(),created_at timestamptz not null default now(),
 kind text not null,statement text not null,source text,source_ref text,contributor text,owner_person_id uuid,
 privacy_scope text not null default 'private',status text not null default 'candidate',engine_verified boolean,parent_id uuid references research_objects(id),meta jsonb);
 alter table research_objects enable row level security;
 create function fn_research_source_uid(t text) returns text language sql immutable as $$select lower(btrim(regexp_replace(coalesce(t,''),'#(batch|a)[0-9]+$','')))$$;
 create function fn_research_claim_uid(t text) returns text language sql immutable as $$select regexp_replace(lower(coalesce(t,'')),'\\s+','','g')$$;
 create unique index research_objects_identity_uidx on research_objects(fn_research_source_uid(source_ref),fn_research_claim_uid(statement));
 create table research_paths(id uuid primary key,created_by_user_id uuid,created_at timestamptz default now());
 create table research_path_revisions(id uuid primary key default gen_random_uuid(),path_id uuid,created_by_user_id uuid,created_at timestamptz default now(),revision_no integer,representation jsonb);
 insert into persons values('${owner}','${user}'),('${other}','${foreign}');
 insert into research_objects(kind,statement,source_ref,owner_person_id,privacy_scope,status) values
 ('observation','אור בדיקה','${person}','${owner}','private','candidate'),
 ('observation','שם זר','person:${other}:self','${other}','private','candidate');
`);
await db.exec(await fs.readFile(new URL('../supabase/migrations/20261011214651_life_journey_private_continuation_v1.sql',import.meta.url),'utf8'));
async function as(id,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec(`set role ${role}`);}
const record=async(overrides={})=>{
 const p={owner,event,request,revision:0,title:'אירוע בדיקה',date:'2000-01-01',person,notes:'תיאור פרטי',...overrides};
 return (await db.query('select fn_person_life_event_record_v1($1,$2,$3,$4,$5,$6,$7,$8) as result',[p.owner,p.event,p.request,p.revision,p.title,p.date,p.person,p.notes])).rows[0].result;
};
const list=async(o=owner,e=null,limit=20,cursor=null)=>(await db.query('select fn_person_life_events_v1($1,$2,$3,$4,$5) as result',[o,e,limit,cursor?.at||null,cursor?.id||null])).rows[0].result;

test('anonymous and cross-owner calls fail at server boundary; direct table reads stay unavailable',async()=>{
 await as(null,'anon');await assert.rejects(record());await assert.rejects(list());
 await as(foreign);await assert.rejects(record(),/LIFE_OWNER_REQUIRED/);await assert.rejects(list(),/LIFE_OWNER_REQUIRED/);
 await as(user);await assert.rejects(db.query('select * from research_objects'),/permission denied/);
 await assert.rejects(record({person:`person:${other}:self`}),/LIFE_PERSON_UNAVAILABLE/);
});
test('private declaration constants, role, date precision and family namespace are preserved',async()=>{
 await as(user);const saved=await record();assert.equal(saved.ok,true);assert.equal(saved.revision,1);
 const result=await list();assert.equal(result.items.length,1);assert.equal(result.items[0].input.role,'subject');assert.equal(result.items[0].input.date_precision,'day');
 await db.exec('reset role');const row=(await db.query("select * from research_objects where source='person_life_event_input'")).rows[0];
 assert.equal(row.privacy_scope,'private');assert.equal(row.status,'candidate');assert.equal(row.engine_verified,false);
 assert.equal(row.meta.ext.life_event.canonical_event_id,null);assert.equal(row.meta.ext.life_event.recorded_by,user);
 assert.equal((await db.query("select count(*)::int as n from research_objects where source_ref like $1",[`person:${owner}:%`])).rows[0].n,1);
});
test('same request replays; altered payload under same request conflicts',async()=>{
 await as(user);const a=await record(),b=await record();assert.equal(a.record_id,b.record_id);assert.equal(b.replayed,true);
 await assert.rejects(record({date:'2000-01-02'}),/LIFE_EVENT_REQUEST_CONFLICT/);
});
test('date-only correction creates immutable successor; competing expected revision loses',async()=>{
 await as(user);
 const corrections=await Promise.all([
  record({request:'55555555-5555-4555-8555-555555555555',revision:1,date:'2000-01-02'}),
  record({request:'66666666-6666-4666-8666-666666666666',revision:1,date:'2000-01-03'})]);
 assert.equal(corrections.filter(r=>r.ok).length,1);assert.equal(corrections.filter(r=>r.error==='revision_conflict').length,1);
 assert.equal((await list()).items[0].revision,2);
 await db.exec('reset role');const rows=(await db.query("select * from research_objects where source='person_life_event_input' order by created_at,id")).rows;
 assert.equal(rows.length,2);assert.equal(rows[1].parent_id,rows[0].id);assert.equal(rows[0].meta.ext.life_event.input.occurred_on,'2000-01-01');
});
test('invalid dates and unavailable person cannot create records',async()=>{
 await as(user);await assert.rejects(record({date:'2025-02-30'}));await assert.rejects(record({title:''}));
 await assert.rejects(record({person:`person:${owner}:p:77777777-7777-4777-8777-777777777777`}),/LIFE_PERSON_UNAVAILABLE/);
});
test('governed observations require the existing governed successor path and do not fall back to old revisions',async()=>{
 await db.exec('reset role');await db.query("update research_objects set status='approved' where source='person_life_event_input' and meta#>>'{ext,life_event,revision}'='2'");
 await as(user);assert.equal((await list()).items.length,0);
 await assert.rejects(record({request:'88888888-8888-4888-8888-888888888888',revision:2}),/GOVERNED_SUCCESSOR_REQUIRED/);
});
test('saved-path list returns only owned Life Journey refs and generic labels, with bounded pages',async()=>{
 await db.exec('reset role');
 for(let i=1;i<=4;i++){
  const id=`99999999-9999-4999-8999-99999999999${i}`;
  await db.query('insert into research_paths(id,created_by_user_id) values($1,$2)',[id,i===4?foreign:user]);
  await db.query('insert into research_path_revisions(path_id,created_by_user_id,revision_no,representation) values($1,$2,1,$3)',[id,i===4?foreign:user,{context:{subject:{label:'PRIVATE RAW NAME'},dimensions:{lifePersonRef:i===3?`person:${other}:self`:person}}}]);
 }
 await as(user);const result=(await db.query('select fn_person_life_paths_v1($1,1) as result',[owner])).rows[0].result;
 assert.equal(result.has_more,true);assert.equal(result.items.length,2);assert.equal(JSON.stringify(result).includes('PRIVATE RAW NAME'),false);
 const c=result.items[0];const next=(await db.query('select fn_person_life_paths_v1($1,1,$2,$3) as result',[owner,c.updated_at,c.path_id])).rows[0].result;
 assert.equal(next.items.length,1);assert.notEqual(next.items[0].path_id,c.path_id);
 await as(foreign);await assert.rejects(db.query('select fn_person_life_paths_v1($1)',[owner]),/LIFE_OWNER_REQUIRED/);
});
test('analysis input enforces ownership, private candidate status, self scope and minimal payload',async()=>{
 const read=async(ref=person,purpose='research')=>(await db.query('select fn_person_life_input_v1($1,$2,$3) as result',[owner,ref,purpose])).rows[0].result;
 await as(null,'anon');await assert.rejects(read());await as(foreign);await assert.rejects(read(),/LIFE_OWNER_REQUIRED/);
 await as(user);assert.equal((await read()).person.name,'אור בדיקה');
 assert.deepEqual((await read(person,'word_reflection')).person,{ref:person,first:'אור'});
 assert.equal(Object.hasOwn((await read(person,'date_cross')).person,'birthdate'),false);
 await assert.rejects(read(`person:${owner}:p:relative`,'word_reflection'),/LIFE_ANALYSIS_SCOPE_INVALID/);
 await db.exec('reset role');
 await db.query("insert into research_objects(kind,statement,source_ref,owner_person_id,privacy_scope,status,created_at) values('observation','new hidden', $1,$2,'public','candidate',now()+interval '1 day')",[person,owner]);
 await as(user);await assert.rejects(read(),/LIFE_PERSON_UNAVAILABLE/);
 await assert.rejects(record({request:'77777777-7777-4777-8777-777777777777'}),/LIFE_PERSON_UNAVAILABLE/);
 await db.exec('reset role');await db.query("update research_objects set privacy_scope='private',status='approved' where statement='new hidden'");
 await as(user);await assert.rejects(read(),/LIFE_PERSON_UNAVAILABLE/);
});
test.after(()=>db.close());
