import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {dirname,resolve} from 'node:path';
const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'../../..');
const modulePath=process.env.PGLITE_MODULE;
if(!modulePath) throw new Error('Set PGLITE_MODULE to an externally installed @electric-sql/pglite/dist/index.js; no project dependency is needed.');
const {PGlite}=await import(pathToFileURL(resolve(modulePath)).href);
const db=new PGlite();
const result={started:new Date().toISOString(),environment:'isolated PGlite; synthetic rows; not production timing',cases:[],checks:[]};
const read=name=>readFile(resolve(here,name),'utf8');
const execFile=async name=>db.exec((await read(name)).replace(/^\\.*$/gm,''));
const query=async(sql,params=[])=> (await db.query(sql,params)).rows;
try {
 result.version=(await query('select version() version'))[0].version;
 await db.exec('create role anon; create role authenticated; create role service_role bypassrls; create role lab_admin; create role lab_denied; grant authenticated to lab_admin;');
 await execFile('00_registry_fixture.sql');
 await execFile('01_composite_engine.sql');
 await execFile('02_schema_fixture.sql');
 const baselineSource=await readFile(resolve(root,'supabase/migrations/20261014180000_number_lookup_method_flags.sql'),'utf8');
 const baseline=baselineSource.match(/create or replace function public\.fn_number_lookup\([\s\S]*?\$function\$;/)[0];
 await db.exec(baseline);
 await db.exec(await readFile(resolve(root,'supabase/migrations/20261014190000_number_core_exclude_encrypted.sql'),'utf8'));
 const baselineHash=(await query("select md5(prosrc) hash from pg_proc where oid='public.fn_number_lookup(bigint,integer,text)'::regprocedure"))[0].hash;
 assert.equal(baselineHash,'5fe4585944f7d5ce4eb44ac54b362cc4');
 result.checks.push({baselineBodyMd5:baselineHash,liveReadOnlyFingerprintMatch:true});
 const before=await query("select oid::regprocedure::text signature,md5(prosrc) hash from pg_proc where proname in ('fn_number_lookup','fn_number_lookup_core') order by proname");
 const migration=await readFile(resolve(root,'supabase/migrations/20261014220024_number_lookup_2029_page.sql'),'utf8');
 await db.exec(migration);
 assert.deepEqual(await query("select oid::regprocedure::text signature,md5(prosrc) hash from pg_proc where proname in ('fn_number_lookup','fn_number_lookup_core') order by proname"),before);
 const schema=await query("select proargnames,proallargtypes,proargmodes,prosecdef,provolatile from pg_proc where oid=any(array['public.fn_number_lookup(bigint,integer,text)'::regprocedure,'public.fn_number_lookup_2029_page(bigint,integer,text)'::regprocedure]) order by proname");
 assert.deepEqual(schema[0],schema[1]);
 assert.equal(schema[1].prosecdef,false);
 assert.equal(schema[1].proargnames.length-3,37);
 result.checks.push({unchangedBaselineAndSecureCore:true,outputColumns:37,signatureParity:true,securityInvoker:true});
 assert.deepEqual(await query("select * from site_flags order by key"),[
  {key:'fx_existing_sentinel',enabled:true,mode:'all',message:'must not change'},
  {key:'fx_number_lookup_page',enabled:false,mode:'all',message:''}
 ]);
 await db.exec("update site_flags set enabled=true where key='fx_number_lookup_page'");
 await db.exec(migration);
 assert.equal((await query("select enabled from site_flags where key='fx_number_lookup_page'"))[0].enabled,true);
 result.checks.push({seedDefaultOff:true,reapplyPreservesOwnerChoice:true,otherFlagsUnchanged:true});
 await execFile('03_parity_helpers.sql');
 for(const role of ['anon','authenticated','lab_admin']) {
  await query("select set_config('request.jwt.claim.sub',$1,false)",[role==='lab_admin'?'00000000-0000-0000-0000-000000000001':role==='authenticated'?'00000000-0000-0000-0000-000000000002':'']);
  await db.exec(`set role ${role}`);
  const cases=[
   ...[null,-1,0,1,2,20,500,501,2147483647].map(limit=>[0,limit,null]),
   ...[null,1,20,500].map(limit=>[787,limit,null]),
   ...[null,20,500,501].map(limit=>[7871,limit,null]),
   ...[null,-1,'-9223372036854775808','9223372036854775807',999999].map(v=>[v,20,null]),
   ...['unknown','edge-1','edge-2','edge-null-method','edge-null-phrase','edge-unknown-method','edge-encrypted','edge-draft'].map(c=>[0,20,c])
  ];
  const page=await query('select bid_id from public.fn_number_lookup(787,20,null)');
  cases.push([787,20,page.at(-1)?.bid_id]);
  for(const [v,limit,cursor] of cases) {
   const r=(await query('select public.lab_parity($1::bigint,$2::integer,$3::text) result',[v,limit,cursor]))[0].result;
   result.cases.push({role,value:v,limit,cursor,...r});
  }
  const edge=await query('select bid_id,total_count from public.fn_number_lookup_2029_page(0,null,null)');
  assert.equal(edge.length,role==='lab_admin'?6:5);
  assert(edge.every(r=>Number(r.total_count)===edge.length));
  assert(!edge.some(r=>['edge-draft','edge-unverified'].includes(r.bid_id)));
  assert.equal(edge.some(r=>r.bid_id==='edge-encrypted'),role==='lab_admin');
  for(const args of ["'invalid'::bigint,20,null","9223372036854775808::bigint,20,null","0,2147483648::integer,null"]) {
   const old=(await query('select public.lab_error($1) error',[`select * from public.fn_number_lookup(${args})`]))[0].error;
   const candidate=(await query('select public.lab_error($1) error',[`select * from public.fn_number_lookup_2029_page(${args})`]))[0].error;
   assert.deepEqual(candidate,old);assert.notEqual(old.state,null);
   result.checks.push({role,args,errorParity:old});
  }
  await db.exec('reset role');
 }
 await query("select set_config('request.jwt.claim.sub','',false)");
 result.checks.push({adminPolicyParity:true,adminBypassRls:false,authUid:'synthetic JWT subject; live admin encrypted-read predicate'});
 // Public execution is intentionally limited to the API roles, not every database role.
 await db.exec('set role lab_denied');
 const denied=(await query("select public.lab_error('select * from public.fn_number_lookup_2029_page(0,20,null)') error"))[0].error;
 assert.equal(denied.state,'42501');
 await db.exec('reset role');
 await db.exec('revoke select on public.bidim from authenticated; set role authenticated');
 const permissionOld=(await query("select public.lab_error('select * from public.fn_number_lookup(0,20,null)') error"))[0].error;
 const permissionNew=(await query("select public.lab_error('select * from public.fn_number_lookup_2029_page(0,20,null)') error"))[0].error;
 assert.deepEqual(permissionNew,permissionOld);assert.equal(permissionNew.state,'42501');
 await db.exec('reset role; grant select on public.bidim to authenticated');
 result.checks.push({unauthorizedRoleDenied:true,underlyingPermissionErrorParity:permissionNew});
 // Test-only STABLE wrapper counts actual composite calls via a session GUC.
 // The canonical component implementation is called unchanged after the counter.
 await db.exec(`alter function public.fn_composite_calc(text,text) rename to lab_original_composite_calc;
 create function public.fn_composite_calc(p_composite_key text,p_phrase text)
 returns table(composite_key text,component_methods text[],component_values bigint[],operator text,result numeric,definition_version integer,provenance text)
 language plpgsql stable security invoker set search_path='public' as $$ begin
 perform set_config('lab.composite_calls',(coalesce(nullif(current_setting('lab.composite_calls',true),''),'0')::int+1)::text,false);
 if p_phrase='LAB_SELECTED_ERROR' then raise exception 'lab selected composite error' using errcode='22000'; end if;
 return query select * from public.lab_original_composite_calc(p_composite_key,p_phrase); end $$;
 grant execute on function public.fn_composite_calc(text,text) to anon,authenticated,lab_admin;`);
 await db.exec('set role anon');
 const cursor=(await query("select bid_id from public.fn_number_lookup(7871,null,null) where method_governed and atomic_or_composite='atomic' and phrase is not null order by method desc,phrase desc,bid_id desc limit 1"))[0].bid_id;
 await query("select set_config('lab.composite_calls','0',false)");
 const old=await query('select * from public.fn_number_lookup(7871,20,$1)',[cursor]);
 const oldCalls=Number((await query("select current_setting('lab.composite_calls') calls"))[0].calls);
 await query("select set_config('lab.composite_calls','0',false)");
 const candidate=await query('select * from public.fn_number_lookup_2029_page(7871,20,$1)',[cursor]);
 const pageCalls=Number((await query("select current_setting('lab.composite_calls') calls"))[0].calls);
 assert.deepEqual(candidate,old);
 assert.equal(pageCalls,candidate.filter(r=>r.atomic_or_composite==='composite').length);
 assert(oldCalls>pageCalls);
 result.checks.push({actualCompositeInvocationBound:{value:7871,limit:20,cursor,baseline:oldCalls,candidate:pageCalls,returnedRows:candidate.length},instrumentation:'test-only STABLE wrapper, unchanged canonical composite body; not a latency benchmark'});
 await db.exec('reset role');
 await db.exec("insert into bidim(word_id,phrase,method,value,bid_id) values (md5('edge-public')::uuid,'LAB_SELECTED_ERROR','רגיל+מילוי',4242,'selected-error')");
 await db.exec('set role anon');
 const errorOld=(await query("select public.lab_error('select * from public.fn_number_lookup(4242,20,null)') error"))[0].error;
 const errorNew=(await query("select public.lab_error('select * from public.fn_number_lookup_2029_page(4242,20,null)') error"))[0].error;
 assert.deepEqual(errorNew,errorOld);assert.equal(errorNew.state,'22000');
 result.checks.push({selectedCompositeErrorParity:errorNew});
 await db.exec('reset role');
 // An unavoidable evaluation difference: invalid rows outside the requested page
 // are not computed by the candidate. Record it explicitly, never claim universal
 // error equivalence. This is an activation-review item, not hidden by fallback.
 await db.exec("insert into bidim(word_id,phrase,method,value,bid_id) values (md5('edge-public')::uuid,'valid atomic','רגיל',4243,'offpage-atomic'),(md5('edge-public')::uuid,'LAB_SELECTED_ERROR','רגיל+מילוי',4243,'offpage-composite')");
 await db.exec('set role anon');
 const outsideOld=(await query("select public.lab_error('select * from public.fn_number_lookup(4243,1,null)') error"))[0].error;
 const outsideNew=(await query("select public.lab_error('select * from public.fn_number_lookup_2029_page(4243,1,null)') error"))[0].error;
 assert.equal(outsideOld.state,'22000'); assert.equal(outsideNew.state,null);
 result.checks.push({knownEvaluationDifference:{baseline:outsideOld,candidate:outsideNew,reason:'An invalid composite outside the selected page is intentionally not evaluated. Must be accepted before activation.'}});
 await db.exec('reset role');
 result.status='PASS';result.finished=new Date().toISOString();
 await writeFile(resolve(here,'sql-parity-results.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({status:result.status,version:result.version,parityCases:result.cases.length,checks:result.checks},null,2));
} catch(error) {
 console.error({message:error.message,code:error.code,detail:error.detail,where:error.where});
 process.exitCode=1;
} finally { await db.close(); }
