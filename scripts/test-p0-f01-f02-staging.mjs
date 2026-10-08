// Genuine GoTrue JWT + PostgREST + Storage API acceptance, never production.
// node --use-env-proxy scripts/test-p0-f01-f02-staging.mjs /private/status.json /private/output
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomBytes, createHash } from 'node:crypto';

const [statusFile,outDir] = process.argv.slice(2);
if (!statusFile || !outDir) throw new Error('Private status and evidence paths required');
const status=JSON.parse(readFileSync(statusFile,'utf8'));
const url=status.API_URL;
assert.ok(url==='http://127.0.0.1:54321' || url==='https://krnaxxndgtrdnaddlzws.supabase.co','Only this disposable test environment is permitted');
assert.equal(Boolean(status.SQL_BRIDGE),url==='https://krnaxxndgtrdnaddlzws.supabase.co','SQL and HTTP must address the same isolated environment');
if(status.SQL_BRIDGE)assert.equal(status.BRANCH_REF,'krnaxxndgtrdnaddlzws');
const base=new URL('../supabase/migrations/',import.meta.url);
const f01=readFileSync(new URL('20261008161500_p0_f01_work_log_history_admin_guard.sql',base),'utf8');
const f02=readFileSync(new URL('20261008161600_p0_f02_remove_exact_temporary_storage_write_policies.sql',base),'utf8');
assert.equal(createHash('sha256').update(f01).digest('hex'),'0c05f1c2afb718275a0cf97a0517116b2a3c56f907b76df9500397fc4578155a');
assert.equal(createHash('sha256').update(f02).digest('hex'),'997e4fef2b18d1295f39a048cafc890a6612d1ac37bc34b6da14da329cfeafbd');
const anon=status.ANON_KEY, service=status.SERVICE_ROLE_KEY;
assert.ok(anon,'Public test-environment key required');
const container='supabase_db_sod1820-p0-local';
mkdirSync(outDir,{recursive:true,mode:0o700});
const checks=[];
const q=v=>"'"+v.replaceAll("'","''")+"'";
let sqlSequence=0;
const sql=statement=>{
 if(!status.SQL_BRIDGE) return execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:statement,encoding:'utf8'}).trim();
 const id=++sqlSequence,request=outDir+'/sql-'+id+'.request.json',response=outDir+'/sql-'+id+'.response.json';
 writeFileSync(request,JSON.stringify({id,branch:status.BRANCH_REF,query:statement}),{mode:0o600});
 const end=Date.now()+180000;
 while(!existsSync(response)){if(Date.now()>end)throw new Error('Authorized SQL bridge timed out');Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,50);}
 const r=JSON.parse(readFileSync(response,'utf8'));if(r.error)throw new Error(r.error);return r.value??'';
};
async function api(path,{token=anon,method='GET',body,contentType='application/json',headers={}}={}) {
 const r=await fetch(url+path,{method,headers:{apikey:anon,Authorization:'Bearer '+token,'Content-Type':contentType,...headers},body:body==null?undefined:typeof body==='string'||body instanceof Uint8Array?body:JSON.stringify(body)});
 const bytes=Buffer.from(await r.arrayBuffer());
 let data; try {data=JSON.parse(bytes.toString());} catch {data=null;}
 return {status:r.status,ok:r.ok,data,bytes,etag:r.headers.get('etag')};
}
async function check(name,fn){await fn(); checks.push({name,result:'PASS'}); console.log('PASS '+name);}
const password=randomBytes(24).toString('base64url')+'aA!5';
const sessions={};
for(const role of ['admin','user']) {
 const email=`p0-${role}-${Date.now()}@example.invalid`;
 // Fixture identities are confined to the disposable branch. GoTrue, rather
 // than test code, issues and verifies the actual password-login JWT.
 if(status.SQL_BRIDGE) sql(`insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change)
 values('00000000-0000-0000-0000-000000000000',gen_random_uuid(),'authenticated','authenticated',${q(email)},extensions.crypt(${q(password)},extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');
 insert into auth.identities(id,provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
 select gen_random_uuid(),id::text,id,jsonb_build_object('sub',id::text,'email',email),'email',now(),now(),now() from auth.users where email=${q(email)};`);
 const r=status.SQL_BRIDGE?await api('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}}):await api('/auth/v1/signup',{method:'POST',body:{email,password}});
 assert.equal(r.status,200,'Native GoTrue login/signup failed');
 assert.ok(r.data.access_token && r.data.user?.id,'GoTrue must issue a real token');
 sessions[role]=r.data;
 sql(`update public.users set role=${q(role==='admin'?'admin':'user')} where id=${q(r.data.user.id)};`);
 const claims=JSON.parse(Buffer.from(r.data.access_token.split('.')[1],'base64url'));
 assert.equal(claims.sub,r.data.user.id); assert.equal(claims.role,'authenticated');
}
writeFileSync(outDir+'/sessions.json',JSON.stringify(sessions),{mode:0o600});
sql(`insert into public.work_log(session_date,topic,what_we_did,status,created_at,archived)
 select current_date,'P0 local entry '||lpad(i::text,4,'0'),'Synthetic acceptance fixture','done',now()-i*interval '1 second',false
 from generate_series(1,1005) i;
 insert into storage.buckets(id,name,public) values('gallery','gallery',true) on conflict(id) do nothing;`);

await check('Baseline uses the real insecure history function',async()=>{
 const r=await api('/rest/v1/rpc/get_work_log',{method:'POST',body:{}});
 assert.equal(r.status,200);assert.equal(r.data.length,1000);
});
const paths=['posts/tmp-content-5074.txt','sod1820/cards/ego-confession.png',
 'sod1820/videos/ego-confession.en.vtt','sod1820/videos/ego-confession.he.vtt',
 'sod1820/videos/ego-confession.jpg','sod1820/videos/ego-confession.mp4',
 'sod1820/updates/metro-gush-dan-fixture-a.png','sod1820/updates/metro-gush-dan-fixture-b.png'];
const content=Buffer.from('Disposable local F02 fixture; no production content');
const upload=(path,token=anon,method='POST',upsert=false)=>api('/storage/v1/object/gallery/'+path,{method,token,body:content,contentType:'application/octet-stream',headers:{'x-upsert':String(upsert)}});
for(const path of paths) await check('Baseline anonymous exception '+path,async()=>{
 const r=await upload(path);assert.ok(r.ok,'Existing reviewed exception must reproduce');
 const u=await upload(path,anon,'PUT');assert.ok(u.ok,'Existing temporary UPDATE must reproduce');
});
const before=await api('/storage/v1/object/public/gallery/'+paths[1]);assert.ok(before.ok);
const hash=createHash('sha256').update(before.bytes).digest('hex');

// Exact candidates are applied only on the allowlisted disposable environment. SQL transaction
// preserves the original baseline if a drift preflight fails.
sql('begin;'+f01+f02+"notify pgrst,'reload schema';commit;");
await new Promise(resolve=>setTimeout(resolve,500));

for(const [role,token] of [['anon',anon],['user',sessions.user.access_token],...(service?[['service_no_admin_JWT',service]]:[])])
 await check('F01 denies '+role,async()=>{
  const r=await api('/rest/v1/rpc/get_work_log',{method:'POST',token,body:{}});
  assert.ok(!r.ok);assert.ok(/permission denied|not authorized/.test(r.data?.message||''));
 });
await check('F02 existing public object bytes unchanged immediately after the patch',async()=>{
 const r=await api('/storage/v1/object/public/gallery/'+paths[1]);assert.ok(r.ok);
 assert.equal(createHash('sha256').update(r.bytes).digest('hex'),hash);
});
await check('F01 genuine admin JWT preserves response/order/1000-row bound',async()=>{
 const r=await api('/rest/v1/rpc/get_work_log',{method:'POST',token:sessions.admin.access_token,body:{}});
 assert.equal(r.status,200);assert.equal(r.data.length,1000);
 assert.equal(r.data[0].topic,'P0 local entry 0001');assert.equal(r.data.at(-1).topic,'P0 local entry 1000');
 assert.equal(Object.keys(r.data[0]).length,32);
 for(let i=1;i<r.data.length;i++)assert.ok(Date.parse(r.data[i-1].created_at)>=Date.parse(r.data[i].created_at));
});
await check('F01 current operator reader preserves authenticated-admin access',async()=>{
 const r=await api('/rest/v1/rpc/get_work_log_current',{method:'POST',token:sessions.admin.access_token,body:{}});
 assert.equal(r.status,200);assert.ok(r.data.some(x=>x.topic==='P0 local entry 0001'));
});
await check('F01 authorized direct SQL retains full history',async()=>assert.equal(Number(sql('select count(*) from public.work_log;')),1005));
for(const path of paths) {
 await check('F02 anonymous overwrite denied '+path,async()=>{
  const r=await upload(path,anon,'PUT');assert.ok(!r.ok);
  const u=await upload(path,anon,'POST',true);assert.ok(!u.ok);
 });
 // Remove only synthetic fixture metadata through the isolated SQL bridge, then
 // prove INSERT is denied independently of object-name collisions.
 if(service){const d=await api('/storage/v1/object/gallery',{method:'DELETE',token:service,body:{prefixes:[path]}});assert.ok(d.ok);}
 else sql(`begin;set local storage.allow_delete_query='true';delete from storage.objects where bucket_id='gallery' and name=${q(path)};commit;`);
 await check('F02 anonymous fresh INSERT denied '+path,async()=>assert.ok(!(await upload(path)).ok));
}
await check('F02 unrelated unauthorized target denied',async()=>assert.ok(!(await upload('not-authorized/p0-fixture.png')).ok));
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=','base64');
const communityPath='community/p0-local-'+Date.now()+'.png';
await check('F02 intentional anonymous community image insertion preserved',async()=>{
 const r=await api('/storage/v1/object/gallery/'+communityPath,{method:'POST',body:png,contentType:'image/png'});assert.ok(r.ok);
 const u=await api('/storage/v1/object/gallery/'+communityPath,{method:'PUT',body:png,contentType:'image/png'});assert.ok(!u.ok);
});
for(const [role,token] of [['user',sessions.user.access_token],['admin',sessions.admin.access_token],...(service?[['service',service]]:[])])
 await check('F02 existing '+role+' insertion preserved',async()=>assert.ok((await upload('p0-local/'+role+'.png',token)).ok));
await check('F02 public bytes remain unchanged after policy removal',async()=>{
 // Use a surviving intentional-community object; native Storage round trip is
 // checked against the exact input, independently of JSON catalog assertions.
 const r=await api('/storage/v1/object/public/gallery/'+communityPath);assert.ok(r.ok);
 assert.equal(createHash('sha256').update(r.bytes).digest('hex'),createHash('sha256').update(png).digest('hex'));
});
await check('F02 exact temporary policy set removed; intended policies kept',async()=>{
 assert.equal(Number(sql("select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'tmp_%';")),0);
 assert.equal(Number(sql("select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname in ('community_anon_upload','public_read','public_upload');")),3);
});
const report={checks,isolated_test_environment:true,real_auth_issued_JWT:true,real_storage_HTTP:true,
 source_schema_without_data:true,original_private_media_copied:false,
 f01_sha256:createHash('sha256').update(f01).digest('hex'),f02_sha256:createHash('sha256').update(f02).digest('hex'),
 baseline_public_fixture_sha256:hash,production_applied:false,independent_main_GO:false,browser_acceptance:'PENDING',
 service_role_HTTP:service?'TESTED':'NOT_TESTED_NO_SERVICE_CREDENTIAL_INSTALLED'};
writeFileSync(outDir+'/api-report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({passed:checks.length,production_applied:false}));
