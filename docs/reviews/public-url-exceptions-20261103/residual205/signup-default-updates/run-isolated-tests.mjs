import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,realpathSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('.',import.meta.url)).replace(/\/$/,'');
const psql=process.env.SIGNUP_FIXTURE_PSQL || '/tmp/continuity-postgres/root/usr/lib/postgresql/17/bin/psql';
const socket=process.env.SIGNUP_FIXTURE_SOCKET || '/tmp/continuity-postgres/socket';
const database='signup_default_fixture';
assert.ok(realpathSync(socket).startsWith('/tmp/continuity-postgres/'));
const args=['-X','-q','-h',socket,'-p','55437','-U','agent','-d',database,'-v','ON_ERROR_STOP=1','-At'];
const read=n=>readFileSync(`${root}/${n}`,'utf8');
const apply=read('handle-new-user-default-updates.proposal.sql');
const rollback=read('handle-new-user-default-updates.rollback.sql');
const before=read('handle-new-user.before.sql');
const prereq=read('site-updates-purpose.prerequisite.sql');
const body=read('handle-new-user.proposed-body.txt');
const quote=v=>`'${String(v).replaceAll("'","''")}'`;
const uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function sql(source,{fails}={}) {
 const r=spawnSync(psql,args,{input:source,encoding:'utf8',timeout:15000});
 if(fails){assert.notEqual(r.status,0);assert.match(r.stderr,fails);return r.stderr;}
 if(r.status!==0)throw new Error(`Synthetic SQL failure: ${r.stderr}`);
 return r.stdout.trim();
}
function rows(query){return JSON.parse(sql(`SELECT coalesce(json_agg(row_to_json(x)), '[]'::json) FROM (${query}) x;`));}
const row=query=>rows(query)[0];
const count=table=>Number(sql(`select count(*) from ${table}`));
const sub=email=>row(`select * from subscribers where lower(email)=${quote(email.toLowerCase())}`);
const authInsert=(n,email,{confirmed=true,created='clock_timestamp()',confirmation='clock_timestamp()',anonymous=false,meta={},app={}}={})=>`INSERT INTO auth.users(id,email,created_at,email_confirmed_at,is_anonymous,raw_user_meta_data,raw_app_meta_data) VALUES (${quote(uuid(n))},${email===null?'NULL':quote(email)},${created},${confirmed?confirmation:'NULL'},${anonymous===null?'NULL':anonymous},${quote(JSON.stringify(meta))}::jsonb,${quote(JSON.stringify(app))}::jsonb);`;
const trigger=()=>row("select pg_get_triggerdef(oid) as definition, convert_from(substring(tgargs from 1 for octet_length(tgargs)-1),'UTF8') as cutoff from pg_trigger where tgrelid='auth.users'::regclass and tgname='on_auth_user_created'");
const snapshot=()=>rows('select * from subscribers order by id');
const report={kind:'isolated-native-postgresql-default-signup-proposal',baseSha:'94fd851a5bed844e36886edf48e42ec3ce33a1ff',liveConnection:false,liveWrites:0,externalMailOrAuthCalls:0,sharedApplied:false,database,serverVersion:sql('show server_version;'),proposalSha256:createHash('sha256').update(apply).digest('hex'),cases:[],limitations:['Synthetic Auth rows verify database behavior, not actual Google/Facebook/password/OTP delivery or dashboard callback settings','Native PostgreSQL 17 fixture is not a full Supabase Auth deployment','Default signup depends on separately approved purpose schema B, signup wording, and effective signed unsubscribe D','Rollback restores prior Legacy implicit-general enrollment only for future signup; subscriber data/history are retained']};
assert.equal(sql(`select current_setting('listen_addresses')='' and current_database()='${database}' and current_user='agent';`),'t');
function save(){writeFileSync(`${root}/isolated-test-receipt.json`,JSON.stringify({...report,finishedAt:new Date().toISOString(),passed:report.cases.filter(c=>c.passed).length,failed:report.cases.filter(c=>!c.passed).length},null,2)+'\n');}
async function check(name,fn){try{await fn();report.cases.push({name,passed:true});console.log(`PASS ${name}`);}catch(e){report.cases.push({name,passed:false,error:String(e)});save();throw e;}}
// Only this explicitly authorized synthetic DB may be reset, never another DB.
assert.equal(sql("select count(*) from information_schema.tables where table_schema not in ('pg_catalog','information_schema','public','auth')"),'0');
sql(`DROP SCHEMA IF EXISTS auth CASCADE; DROP SCHEMA public CASCADE; CREATE SCHEMA public; CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,created_at timestamptz,email_confirmed_at timestamptz,is_anonymous boolean DEFAULT false,raw_user_meta_data jsonb DEFAULT '{}'::jsonb,raw_app_meta_data jsonb DEFAULT '{}'::jsonb,last_sign_in_at timestamptz);
CREATE UNIQUE INDEX auth_email_unique ON auth.users(lower(email));
CREATE TABLE public.users(id uuid PRIMARY KEY,email text,username text,display_name text,avatar_url text,role text,tier text);
CREATE TABLE public.profiles(user_id uuid PRIMARY KEY,credits integer NOT NULL DEFAULT 0);
CREATE TABLE public.subscribers(id bigserial PRIMARY KEY,email text,name text,source text DEFAULT 'site',active boolean DEFAULT true,created_at timestamptz DEFAULT now(),acquisition jsonb,unsubscribed_at timestamptz,email_purposes text[] NOT NULL DEFAULT ARRAY['general']::text[],opening_updates_consented_at timestamptz,token uuid DEFAULT gen_random_uuid());
CREATE UNIQUE INDEX subscribers_email_uniq ON subscribers(lower(email));
ALTER TABLE subscribers ADD CONSTRAINT subscribers_email_purposes_valid CHECK(cardinality(email_purposes)>0 AND email_purposes <@ ARRAY['general','site-openings']::text[] AND (NOT(email_purposes @> ARRAY['site-openings']::text[]) OR opening_updates_consented_at IS NOT NULL));
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY subscribers_public_insert ON subscribers FOR INSERT WITH CHECK(email_purposes=ARRAY['general']::text[] AND opening_updates_consented_at IS NULL);
CREATE TABLE public.subscribe_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,visitor_id text,topic text NOT NULL,source text,action text NOT NULL DEFAULT 'follow',created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.notification_prefs(id integer);
CREATE TABLE public.user_notifications(id integer);
CREATE TABLE public.credit_ledger(id integer);
CREATE TABLE public.newsletter_campaigns(id integer);
CREATE TABLE public.newsletter_sends(id integer);
CREATE TABLE public.email_events(id integer);
CREATE TABLE public.events(id integer);
CREATE TABLE public.visitor_events(id integer);
${before}
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
${authInsert(1,'old-admin@example.invalid',{confirmed:false,created:"clock_timestamp()-interval '2 days'"})}
UPDATE public.users SET role='admin' WHERE id=${quote(uuid(1))}; UPDATE profiles SET credits=35 WHERE user_id=${quote(uuid(1))};
INSERT INTO subscribers(email,source,active,created_at,acquisition,email_purposes,opening_updates_consented_at,unsubscribed_at) VALUES
('existing-general@example.invalid','legacy-explicit',true,'2026-01-01','{"legacy":"keep"}',ARRAY['general'],NULL,NULL),
('existing-opening@example.invalid','opening-explicit',true,'2026-02-01','{"opening":"keep"}',ARRAY['site-openings'],'2026-02-01',NULL),
('removed@example.invalid','historical-removal',false,'2026-03-01',NULL,ARRAY['general'],NULL,'2026-03-02'),
('suppressed-active@example.invalid','historical-removal',true,'2026-03-01',NULL,ARRAY['general'],NULL,'2026-03-02'),
('inactive-null@example.invalid','legacy-inactive',false,'2026-03-01',NULL,ARRAY['general'],NULL,NULL);
`);
await check('missing purpose schema B fails closed and leaves old trigger/source',()=>{
 const t=sql("select pg_get_triggerdef(oid) from pg_trigger where tgname='on_auth_user_created'");
 sql(apply,{fails:/site_updates_schema_B_not_ready/});
 assert.equal(sql("select md5(prosrc) from pg_proc where oid='handle_new_user()'::regprocedure"),'8cbc40e56e8d8ce9869f70e09535a7e5');
 assert.equal(sql("select pg_get_triggerdef(oid) from pg_trigger where tgname='on_auth_user_created'"),t);
});
sql(prereq);
sql("INSERT INTO subscribers(email,source,active,created_at,email_purposes,site_updates_consented_at) VALUES ('already-updates@example.invalid','earlier-explicit',true,'2026-03-01',ARRAY['site-updates'],'2026-03-01'),('historic-time@example.invalid','earlier-general',true,'2026-03-01',ARRAY['general'],'2026-02-02')");
const initial=snapshot();
const oldIdentity=rows('select * from public.users order by id');
const oldProfile=rows('select * from public.profiles order by user_id');
await check('migration changes no historical data and repeated apply preserves immutable cutoff',()=>{
 sql(apply);const first=trigger();sql(apply);assert.deepEqual(trigger(),first);assert.deepEqual(snapshot(),initial);
 assert.deepEqual(rows('select * from public.users order by id'),oldIdentity);assert.deepEqual(rows('select * from public.profiles order by user_id'),oldProfile);assert.equal(count('subscribe_events'),0);
 report.resolvedSyntheticActivationUtc=first.cutoff;
});
await check('verified Google and Facebook new signup enroll only site-updates with factual audit',()=>{
 sql(authInsert(2,'new-google@example.invalid',{meta:{full_name:'Synthetic Google',role:'admin',acquisition:{visitor_id:'ignore'}},app:{provider:'google'}})+authInsert(3,'new-facebook@example.invalid',{meta:{name:'Synthetic Facebook',picture:'https://example.invalid/avatar'},app:{provider:'facebook'}}));
 for(const [n,email]of[[2,'new-google@example.invalid'],[3,'new-facebook@example.invalid']]){
  const s=sub(email);assert.deepEqual(s.email_purposes,['site-updates']);assert.equal(s.active,true);assert.equal(s.source,'site-signup-default-updates-v1');assert.equal(s.acquisition,null);assert.equal(s.opening_updates_consented_at,null);
  const a=row(`select * from auth.users where id=${quote(uuid(n))}`);assert.equal(s.site_updates_consented_at,a.email_confirmed_at);
  const event=row(`select * from subscribe_events where user_id=${quote(uuid(n))}`);assert.equal(event.source,'site-signup-default-updates-v1');assert.equal(event.action,'signup');assert.equal(event.topic,'newsletter');assert.equal(event.visitor_id,null);assert.equal(event.created_at,a.email_confirmed_at);
 }
});
await check('password and OTP pending verification create users/profiles but no newsletter; first confirmation enrolls once',()=>{
 for(const n of[4,5]){
  const email=`pending-${n}@example.invalid`;
  sql(authInsert(n,email,{confirmed:false,meta:{provider:n===4?'email':'otp',email_verified:true,role:'admin',visitor_id:'ignore'}}));
  assert.equal(sub(email),undefined);assert.equal(Number(sql(`select count(*) from users where id=${quote(uuid(n))}`)),1);assert.equal(Number(sql(`select count(*) from profiles where user_id=${quote(uuid(n))}`)),1);
  sql(`update auth.users set email_confirmed_at=clock_timestamp() where id=${quote(uuid(n))}`);
  const s=sub(email);assert.deepEqual(s.email_purposes,['site-updates']);
  const events=count('subscribe_events');
  sql(`update auth.users set email_confirmed_at=email_confirmed_at, last_sign_in_at=clock_timestamp(), raw_user_meta_data=raw_user_meta_data||'{"login":true}' where id=${quote(uuid(n))}`);
  assert.deepEqual(sub(email),s);assert.equal(count('subscribe_events'),events);
 }
});
await check('active existing general/opening subscribers add only new authorized purpose and retain every old field',()=>{
 for(const [n,email]of[[6,'existing-general@example.invalid'],[7,'existing-opening@example.invalid'],[8,'historic-time@example.invalid']]){
  const old=sub(email);sql(authInsert(n,email));const fresh=sub(email);
  assert.deepEqual(fresh.email_purposes,[...old.email_purposes,'site-updates']);
  for(const key of Object.keys(old).filter(k=>!['email_purposes','site_updates_consented_at'].includes(k)))assert.deepEqual(fresh[key],old[key],key);
  if(old.site_updates_consented_at!==null)assert.equal(fresh.site_updates_consented_at,old.site_updates_consented_at);
  else assert.ok(fresh.site_updates_consented_at);
  assert.equal(Number(sql(`select count(*) from subscribe_events where user_id=${quote(uuid(n))} and source='site-signup-default-updates-v1'`)),1);
 }
});
await check('inactive, previously unsubscribed and already-updates rows are byte-for-byte preserved with no fake enrollment event',()=>{
 for(const [n,email]of[[9,'removed@example.invalid'],[10,'suppressed-active@example.invalid'],[11,'inactive-null@example.invalid'],[12,'already-updates@example.invalid']]){
  const old=sub(email);const events=count('subscribe_events');sql(authInsert(n,email));assert.deepEqual(sub(email),old);assert.equal(count('subscribe_events'),events);
 }
});
await check('ordinary historical login and first confirmation do not backfill',()=>{
 const old=sub('old-admin@example.invalid');const events=count('subscribe_events');
 sql(`update auth.users set last_sign_in_at=clock_timestamp(),raw_user_meta_data='{"email_verified":true}' where id=${quote(uuid(1))}; update auth.users set email_confirmed_at=clock_timestamp() where id=${quote(uuid(1))};`);
 assert.deepEqual(sub('old-admin@example.invalid'),old);assert.equal(count('subscribe_events'),events);
});
await check('cutoff boundary accepts exactly cutoff; older creation and anonymous identities are excluded',()=>{
 const c=quote(trigger().cutoff);
 sql(authInsert(13,'before-cutoff@example.invalid',{created:`${c}::timestamptz-interval '1 microsecond'`})+authInsert(14,'at-cutoff@example.invalid',{created:`${c}::timestamptz`})+authInsert(15,'anonymous@example.invalid',{anonymous:true})+authInsert(16,'unknown-anonymous@example.invalid',{anonymous:null}));
 assert.equal(sub('before-cutoff@example.invalid'),undefined);assert.deepEqual(sub('at-cutoff@example.invalid').email_purposes,['site-updates']);assert.equal(sub('anonymous@example.invalid'),undefined);assert.equal(sub('unknown-anonymous@example.invalid'),undefined);
});
await check('email change, anonymous conversion and created_at rewriting cannot enroll through confirmation update',()=>{
 sql(authInsert(17,'pending-old-email@example.invalid',{confirmed:false})+authInsert(18,'anon-pending@example.invalid',{confirmed:false,anonymous:true})+authInsert(19,'retimed@example.invalid',{confirmed:false}));
 const events=count('subscribe_events');
 sql(`update auth.users set email='changed-email@example.invalid',email_confirmed_at=clock_timestamp() where id=${quote(uuid(17))}; update auth.users set is_anonymous=false,email_confirmed_at=clock_timestamp() where id=${quote(uuid(18))}; update auth.users set created_at=clock_timestamp(),email_confirmed_at=clock_timestamp() where id=${quote(uuid(19))};`);
 assert.equal(sub('pending-old-email@example.invalid'),undefined);assert.equal(sub('changed-email@example.invalid'),undefined);assert.equal(sub('anon-pending@example.invalid'),undefined);assert.equal(sub('retimed@example.invalid'),undefined);assert.equal(count('subscribe_events'),events);
});
await check('case-normalized same email works; malformed/no email remains identity-only',()=>{
 sql(authInsert(20,'Case.Email@Example.Invalid')+authInsert(21,'malformed')+authInsert(22,null));
 assert.equal(sub('case.email@example.invalid').email,'case.email@example.invalid');assert.equal(sub('malformed'),undefined);
 assert.equal(Number(sql(`select count(*) from users where id in (${quote(uuid(21))},${quote(uuid(22))})`)),2);
});
await check('shared Legacy-shaped new signup follows same new policy without acquisition, visitor or general enrollment',()=>{
 sql(authInsert(23,'new-legacy@example.invalid',{meta:{full_name:'Synthetic Legacy',acquisition:{visitor_id:'old-visitor'},visitor_id:'old-visitor'}}));
 const s=sub('new-legacy@example.invalid');assert.deepEqual(s.email_purposes,['site-updates']);assert.equal(s.acquisition,null);
 assert.equal(Number(sql(`select count(*) from subscribe_events where user_id=${quote(uuid(23))} and visitor_id is null`)),1);
});
await check('admin role and 35 existing credits remain; malicious metadata cannot elevate new users or credit profiles',()=>{
 assert.equal(sql(`select role from users where id=${quote(uuid(1))}`),'admin');assert.equal(sql(`select credits from profiles where user_id=${quote(uuid(1))}`),'35');
 assert.equal(Number(sql(`select count(*) from users where id<>${quote(uuid(1))} and (role<>'user' or tier<>'free')`)),0);
 assert.equal(Number(sql(`select count(*) from profiles where user_id<>${quote(uuid(1))} and credits<>0`)),0);
 assert.equal(count('users'),count('auth.users'));assert.equal(count('profiles'),count('auth.users'));
});
await check('B public insert policy cannot forge new typed default signup consent',()=>{
 assert.equal(sql("select count(*) from pg_roles where rolname='anon'"),'1');
 sql('GRANT USAGE ON SCHEMA public TO anon; GRANT INSERT ON subscribers TO anon; GRANT USAGE ON SEQUENCE subscribers_id_seq TO anon;');
 sql("SET ROLE anon; INSERT INTO subscribers(email,email_purposes,site_updates_consented_at) VALUES('forged@example.invalid',ARRAY['site-updates'],now())",{fails:/row-level security/});
 sql("SET ROLE anon; INSERT INTO auth.users(id,email) VALUES('ffffffff-ffff-4fff-8fff-ffffffffffff','forged-auth@example.invalid')",{fails:/permission denied/});
 assert.equal(sub('forged@example.invalid'),undefined);
});
// Real two-connection row-lock checks; there are no TCP connections.
function startSession(app){let output='',error='';const p=spawn(psql,args,{env:{...process.env,PGAPPNAME:app},stdio:['pipe','pipe','pipe']});p.stdout.on('data',d=>{output+=d;});p.stderr.on('data',d=>{error+=d;});const done=new Promise((resolve,reject)=>p.on('close',code=>code===0?resolve(output):reject(new Error(error))));return{p,done,get output(){return output;}};}
async function until(fn,label){const deadline=Date.now()+6000;while(Date.now()<deadline){if(fn())return;await new Promise(r=>setTimeout(r,25));}throw new Error(`Timed out: ${label}`);}
async function race(holderSql,contenderSql,assertFinal){const h=startSession('signup-default-holder');h.p.stdin.write(`BEGIN; ${holderSql}\n\\echo LOCKED\n`);await until(()=>h.output.includes('LOCKED'),'holder row lock');const c=startSession('signup-default-contender');c.p.stdin.end(`${contenderSql}\n`);try{await until(()=>sql("select count(*) from pg_stat_activity where application_name='signup-default-contender' and wait_event_type='Lock'")==='1','contender blocked by real row lock');h.p.stdin.end('COMMIT;\n');await Promise.all([h.done,c.done]);assertFinal();}finally{if(!h.p.stdin.destroyed)h.p.stdin.end('ROLLBACK;\n');}}
await check('concurrent opt-out wins before new signup: no reactivation or enrollment event',async()=>{
 sql("insert into subscribers(email,source,active,email_purposes) values('race-optout-first@example.invalid','fixture',true,ARRAY['general']);");
 await race("update subscribers set active=false,unsubscribed_at='2026-11-03T12:00:00Z' where email='race-optout-first@example.invalid';",authInsert(24,'race-optout-first@example.invalid'),()=>{const s=sub('race-optout-first@example.invalid');assert.equal(s.active,false);assert.deepEqual(s.email_purposes,['general']);assert.equal(Number(sql(`select count(*) from subscribe_events where user_id=${quote(uuid(24))}`)),0);});
});
await check('new signup locks first; concurrent opt-out still wins final state and preserves the one historical enrollment event',async()=>{
 sql("insert into subscribers(email,source,active,email_purposes) values('race-signup-first@example.invalid','fixture',true,ARRAY['general']);");
 await race(authInsert(25,'race-signup-first@example.invalid'),"update subscribers set active=false,unsubscribed_at='2026-11-03T12:00:01Z' where email='race-signup-first@example.invalid';",()=>{const s=sub('race-signup-first@example.invalid');assert.equal(s.active,false);assert.deepEqual(s.email_purposes,['general','site-updates']);assert.equal(Number(sql(`select count(*) from subscribe_events where user_id=${quote(uuid(25))}`)),1);});
});
await check('audit failure atomically rolls back signup/provisioning/enrollment instead of reporting a partial success',()=>{
 sql("ALTER TABLE subscribe_events ADD CONSTRAINT fixture_reject_signup CHECK(user_id<>'00000000-0000-4000-8000-000000000026') NOT VALID;");
 sql(authInsert(26,'audit-failure@example.invalid'),{fails:/fixture_reject_signup/});
 assert.equal(sub('audit-failure@example.invalid'),undefined);assert.equal(Number(sql(`select count(*) from auth.users where id=${quote(uuid(26))}`)),0);assert.equal(Number(sql(`select count(*) from users where id=${quote(uuid(26))}`)),0);assert.equal(Number(sql(`select count(*) from profiles where user_id=${quote(uuid(26))}`)),0);
 sql('ALTER TABLE subscribe_events DROP CONSTRAINT fixture_reject_signup;');
});
await check('reapply after traffic preserves cutoff, rows and audit history exactly',()=>{
 const t=trigger(),s=snapshot(),events=rows('select * from subscribe_events order by id');sql(apply);assert.deepEqual(trigger(),t);assert.deepEqual(snapshot(),s);assert.deepEqual(rows('select * from subscribe_events order by id'),events);
});
await check('no Follow, notification, ledger, campaign, delivery, general analytics or visitor writes',()=>{
 for(const table of['notification_prefs','user_notifications','credit_ledger','newsletter_campaigns','newsletter_sends','email_events','events','visitor_events'])assert.equal(count(table),0,table);
 assert.equal(Number(sql("select count(*) from subscribe_events where action<>'signup' or topic<>'newsletter' or visitor_id is not null or source<>'site-signup-default-updates-v1'")),0);
 assert.doesNotMatch(body,/\b(?:net\.|http_|dblink|cron\.|send_newsletter|credit_reserve|notification_prefs|user_notifications|visitor_events)\b/i);
});
await check('guard rejects changed source, trigger shape, missing cutoff and additional side-effect triggers',()=>{
 const currentFunc=`CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS ${quote(body)};`;
 sql("CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$BEGIN RETURN NEW; END$$;");
 sql(apply,{fails:/source_changed_review_required/});sql(rollback,{fails:/source_changed_review_required/});sql(currentFunc);
 const canonical=trigger().definition.replace('CREATE TRIGGER','CREATE OR REPLACE TRIGGER')+';';
 sql("CREATE OR REPLACE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();");sql(apply,{fails:/on_auth_user_created_changed_review_required/});sql(canonical);
 const t=trigger();sql(`CREATE OR REPLACE TRIGGER on_auth_user_created AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user('infinity');`);sql(apply,{fails:/cutoff_invalid/});sql(canonical);
 sql("CREATE FUNCTION fixture_side_effect() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RETURN NEW; END$$; CREATE TRIGGER fixture_side_effect AFTER INSERT ON subscribers FOR EACH ROW EXECUTE FUNCTION fixture_side_effect();");sql(apply,{fails:/subscriber_side_effect_triggers_review_required/});sql('DROP TRIGGER fixture_side_effect ON subscribers; DROP FUNCTION fixture_side_effect();');assert.deepEqual(trigger(),t);
 sql("CREATE TRIGGER fixture_side_effect AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();");sql(apply,{fails:/auth_triggers_changed_review_required/});sql('DROP TRIGGER fixture_side_effect ON auth.users;');
});
await check('guard rejects weakened purpose validation or direct public typed-consent insert',()=>{
 sql("ALTER TABLE subscribers DROP CONSTRAINT subscribers_email_purposes_valid; ALTER TABLE subscribers ADD CONSTRAINT subscribers_email_purposes_valid CHECK (site_updates_consented_at IS NOT NULL OR email_purposes @> ARRAY['site-updates'] OR true);");
 sql(apply,{fails:/site_updates_schema_B_not_ready/});sql(prereq);
 sql('ALTER POLICY subscribers_public_insert ON subscribers WITH CHECK (true);');sql(apply,{fails:/site_updates_schema_B_not_ready/});sql(prereq);
 sql('ALTER TABLE subscribers DISABLE ROW LEVEL SECURITY;');sql(apply,{fails:/site_updates_schema_B_not_ready/});sql('ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;');
});
await check('function fixed search_path, SECURITY DEFINER, owner and ACL are retained',()=>{
 const a=row("select prosecdef,proconfig,pg_get_userbyid(proowner) as owner,proacl from pg_proc where oid='handle_new_user()'::regprocedure");assert.equal(a.prosecdef,true);assert.deepEqual(a.proconfig,['search_path=public']);assert.equal(a.owner,'agent');assert.equal(a.proacl,null);
});
await check('rollback twice restores exact old objects only, preserving subscriber/event/profile data',()=>{
 const s=snapshot(),events=rows('select * from subscribe_events order by id'),profiles=rows('select * from profiles order by user_id');sql(rollback);sql(rollback);assert.deepEqual(snapshot(),s);assert.deepEqual(rows('select * from subscribe_events order by id'),events);assert.deepEqual(rows('select * from profiles order by user_id'),profiles);
 assert.equal(sql("select md5(prosrc) from pg_proc where oid='handle_new_user()'::regprocedure"),'8cbc40e56e8d8ce9869f70e09535a7e5');
 assert.equal(sql("select tgtype||':'||tgnargs from pg_trigger where tgname='on_auth_user_created'"),'5:0');
 sql(authInsert(27,'rollback-future@example.invalid',{confirmed:false}));assert.deepEqual(sub('rollback-future@example.invalid').email_purposes,['general']);assert.equal(sub('rollback-future@example.invalid').site_updates_consented_at,null);
});
report.note='Fixture left in exact old-object rollback state; no private data or real account created.';save();console.log(JSON.stringify({passed:report.cases.length,failed:0,sharedApplied:false,receipt:`${root}/isolated-test-receipt.json`}));
