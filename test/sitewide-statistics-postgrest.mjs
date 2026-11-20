// Local disposable PG17/PostgREST only. No production credentials or URL accepted.
import { spawn, execFileSync } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
const socket = process.env.PG_SOCKET;
assert.ok(socket?.startsWith('/tmp/'), 'only the disposable fixture socket');
const sql = query => execFileSync(`${process.env.PG_BIN}/psql`, ['-h',socket,'-p','54391','-U','postgres','-d','review','-v','ON_ERROR_STOP=1','-qtAX','-c',query], {encoding:'utf8'}).trim();
const secret = 'isolated-fixture-only-never-a-production-secret';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
sql(`create role fixture_authenticator login noinherit; grant anon,authenticated to fixture_authenticator;
 create or replace function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claims',true)::jsonb->>'sub','')::uuid$$;
 create or replace function rd_is_admin() returns boolean language sql stable as $$select coalesce(current_setting('request.jwt.claims',true)::jsonb->>'fixture_admin','false')='true'$$;`);
const server=spawn(process.env.POSTGREST_BIN,[],{env:{...process.env,PGRST_DB_URI:`postgresql://fixture_authenticator@/review?host=${socket}&port=54391`,PGRST_DB_SCHEMAS:'public',PGRST_DB_ANON_ROLE:'anon',PGRST_JWT_SECRET:secret,PGRST_SERVER_HOST:'127.0.0.1',PGRST_SERVER_PORT:'54394'},stdio:['ignore','ignore','pipe']});
let log='';server.stderr.on('data',x=>{log+=x;});
const origin='http://127.0.0.1:54394';
const jwt = claims => {const unsigned=[{alg:'HS256',typ:'JWT'}, {role:'authenticated',sub:uid,exp:Math.floor(Date.now()/1000)+300,...claims}].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url')).join('.');return unsigned+'.'+createHmac('sha256',secret).update(unsigned).digest('base64url');};
const call = (name, body={}, headers={}) => fetch(origin+'/rpc/'+name,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});
try {
  let ready=false;
  for(let i=0;i<100;i++){try {if((await fetch(origin)).ok){ready=true;break;}}catch{} await new Promise(r=>setTimeout(r,50));}
  assert.ok(ready,log);
  assert.equal((await call('research_pulse_2029',{p_hours:24})).status,200);
  assert.ok(!(await call('fn_ti_activity_pulse2029',{p_hours:24})).ok);
  assert.ok(!(await call('admin_2029_analytics')).ok);
  assert.ok(!(await call('admin_2029_analytics',{}, {Authorization:'Bearer '+jwt({})})).ok);
  assert.equal((await call('admin_2029_analytics',{}, {Authorization:'Bearer '+jwt({fixture_admin:true})})).status,200);
  assert.equal((await call('research_pulse_2029',{}, {Authorization:'Bearer '+jwt({}).slice(0,-4)+'oops'})).status,401);
  const id=randomUUID();
  const body={p_sod_id:'sod-http-001',p_surface:'activity_2029',p_event_type:'compute',p_path:'/gematria',p_app_context:'chrome',p_session_id:'http-session-0001',p_props:{action_version:1,operation_id:id,_measurement_account:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',measurement:{version:2,visitor_id:'browser-http-001',page_path:'/gematria'}}};
  assert.ok((await call('ingest_event',body)).ok);
  assert.equal(sql(`select count(*) from events where event_id='${id}'`),'0','missing trusted-address header fails closed');
  const headers={Authorization:'Bearer '+jwt({}),'cf-connecting-ip':'192.0.2.10'};
  const results=await Promise.all(Array.from({length:16},()=>call('ingest_event',body,headers)));
  assert.ok(results.every(r=>r.ok));
  assert.equal(sql(`select count(*) from events where event_id='${id}'`),'1','concurrent HTTP replay counts once');
  assert.equal(sql(`select props->>'_measurement_account' from events where event_id='${id}'`),uid,'signed JWT wins over forged client identity');
  const denied=await fetch(origin+'/visitor_events',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:1,section:'old-client'})});
  assert.ok(!denied.ok);
  assert.deepEqual(await (await fetch(origin+'/search_log?select=*')).json(),[]);
  console.log('PASS PostgREST: anon/JWT/admin ACL, forged identity, private history, header fail-closed, 16 concurrent replays');
  console.log('LIMIT: local headers do not prove Supabase edge header authenticity; classifier/rate limiter remain fixtures');
} finally {server.kill('SIGTERM'); await new Promise(r=>server.once('exit',r));}
