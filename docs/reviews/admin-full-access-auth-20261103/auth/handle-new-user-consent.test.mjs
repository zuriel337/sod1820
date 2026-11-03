// Isolated real PostgreSQL engine (PGlite), entirely synthetic rows. No network.
// Set SOD_PGLITE_MODULE to an existing @electric-sql/pglite module when needed.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const {PGlite}=await import(process.env.SOD_PGLITE_MODULE || '@electric-sql/pglite');
const db=new PGlite();
const proposal=await readFile(new URL('./handle-new-user-consent.proposal.sql',import.meta.url),'utf8');
const rollback=await readFile(new URL('./handle-new-user-consent.rollback.sql',import.meta.url),'utf8');
const prior=rollback.slice(rollback.indexOf('CREATE OR REPLACE FUNCTION'),rollback.lastIndexOf('COMMIT;'));
await db.exec(`CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}'::jsonb);
CREATE TABLE public.users(id uuid PRIMARY KEY,email text,username text,display_name text,avatar_url text,role text,tier text);
CREATE TABLE public.profiles(user_id uuid PRIMARY KEY,credits integer NOT NULL DEFAULT 0);
CREATE TABLE public.subscribers(email text PRIMARY KEY,name text,source text,active boolean,acquisition jsonb,email_purposes text[] DEFAULT ARRAY['general'],opening_updates_consented_at timestamptz);
CREATE TABLE public.subscribe_events(visitor_id text,source text,action text,topic text);
${prior}
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
INSERT INTO subscribers(email,source,active,email_purposes) VALUES('removed@example.invalid','fixture',false,ARRAY['general']),('opening@example.invalid','fixture',true,ARRAY['site-openings']);
INSERT INTO auth.users(id,email) VALUES('11111111-1111-4111-8111-111111111111','historical@example.invalid');
UPDATE public.profiles SET credits=35;`);
const checks=[];
const q=async sql=>(await db.query(sql)).rows;
assert.equal((await q("select count(*)::int as n from subscribers where email='historical@example.invalid' and active"))[0].n,1);
checks.push('old observed function reproduced implicit active newsletter signup');
const historical=await q('select * from subscribers order by email');
const beforeEvents=await q('select * from subscribe_events');
for(let i=0;i<2;i++)await db.exec(proposal);
checks.push('proposal applied twice idempotently on existing shape');
await db.exec(`INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
('22222222-2222-4222-8222-222222222222','new-google@example.invalid','{"full_name":"Synthetic Google","avatar_url":"https://example.invalid/photo","role":"admin"}'),
('33333333-3333-4333-8333-333333333333','new-facebook@example.invalid','{"name":"Synthetic Facebook","picture":"https://example.invalid/photo"}'),
('44444444-4444-4444-8444-444444444444','new-otp@example.invalid','{}'),
('55555555-5555-4555-8555-555555555555','new-legacy@example.invalid','{"acquisition":{"visitor_id":"fixture"},"visitor_id":"fixture"}'),
('66666666-6666-4666-8666-666666666666','removed@example.invalid','{}'),
('77777777-7777-4777-8777-777777777777','opening@example.invalid','{}');`);
assert.deepEqual(await q('select * from subscribers order by email'),historical);
assert.deepEqual(await q('select * from subscribe_events'),beforeEvents);
assert.equal((await q('select count(*)::int as n from public.users'))[0].n,7);
assert.equal((await q('select count(*)::int as n from public.profiles'))[0].n,7);
assert.equal((await q("select credits from profiles where user_id='11111111-1111-4111-8111-111111111111'"))[0].credits,35);
assert.equal((await q("select count(*)::int as n from public.users where role='user' and tier='free'"))[0].n,7);
checks.push('all new Google/Facebook/email/Legacy fixture accounts get canonical user+profile, no newsletter/event, no privilege from metadata');
checks.push('historical subscribers and opening-only consent unchanged, unsubscribed address not reactivated, existing 35 credits untouched');
const attrs=(await q("select prosecdef,proconfig from pg_proc where oid='public.handle_new_user()'::regprocedure"))[0];
assert.equal(attrs.prosecdef,true);assert.deepEqual(attrs.proconfig,['search_path=public']);
checks.push('existing SECURITY DEFINER and fixed search_path preserved');
await db.exec(rollback);await db.exec(rollback);
await db.exec("INSERT INTO auth.users(id,email) VALUES('88888888-8888-4888-8888-888888888888','rollback-new@example.invalid');");
assert.equal((await q("select count(*)::int as n from subscribers where email='rollback-new@example.invalid' and active"))[0].n,1);
assert.equal((await q("select count(*)::int as n from subscribers where email like 'new-%'"))[0].n,0);
checks.push('rollback twice restores old behavior only for future signup, no retrospective subscription or data deletion');
await db.exec("CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RETURN NEW; END$$;");
await assert.rejects(db.exec(proposal),/source_changed_review_required/);await db.exec('ROLLBACK;');
await assert.rejects(db.exec(rollback),/source_changed_review_required/);await db.exec('ROLLBACK;');
checks.push('proposal and rollback reject independently changed function');
const receipt={task:'PUBLIC_LAUNCH_ADMIN_FULL_ACCESS_AUTH_20261103',run_at:new Date().toISOString(),engine:'PGlite isolated PostgreSQL; synthetic data only',before_prosrc_md5:'8cbc40e56e8d8ce9869f70e09535a7e5',applied_live:false,checks,limitations:['No full live auth signup or email sent','Shared change requires separate approval; affects implicit newsletter behavior for new Legacy accounts too','Existing explicit newsletter forms and delivery/suppression not changed by this proposal']};
await writeFile(new URL('./handle-new-user-consent.test.json',import.meta.url),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({passed:checks.length,engine:receipt.engine,checks},null,2));
await db.close();
