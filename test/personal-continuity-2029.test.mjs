import test from 'node:test';
import assert from 'node:assert/strict';
import { readingPersonalResponse } from '../public-reading-deploy/personal-request.js';
import { verifyReadingPrincipal } from '../public-reading-deploy/admin-request.js';
import { deriveHiddenCrossings, fetchNumberHiddenCrossings } from '../src/lib/research/numberCoreProjection.js';
import { readFileSync } from 'node:fs';
const API='https://linswmnnkjxvweumprav.supabase.co', SITE='https://review.example';
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
const jwt=uid=>'e30.'+Buffer.from(JSON.stringify({sub:uid,role:'authenticated'})).toString('base64url')+'.signature';
const json=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
function harness({uid=a,failAuth=false,offline=false}={}){
 const calls=[];const fetchImpl=async(input,init)=>{const req=input instanceof Request?input:new Request(input,init);calls.push(req);
  if(req.url===API+'/auth/v1/user'){if(offline)throw Error('offline');return failAuth?new Response('',{status:401}):json({id:uid});}
  return json({committed:true});};
 return {calls,async request(path,{method='POST',body={},token=jwt(a),origin=API,headers={}}={}){const req=new Request(origin+path,{method,headers:{Authorization:'Bearer '+token,apikey:'public','Content-Type':'application/json',...headers},...(!['GET','HEAD'].includes(method)?{body:JSON.stringify(body)}:{})});return readingPersonalResponse(req,{apiKey:'public',clientOrigin:SITE,fetchImpl,verify:verifyReadingPrincipal});}};
}
const op={op_id:a,kind:'item_upsert',bucket:'library',entity:{id:'number:1820',type:'number',ref:'1820',title:'שמירה פרטית'}};
test('existing owned snapshot/apply use server-verified caller JWT; operation ID/revision and original token are preserved',async()=>{
 for(const [rpc,body]of [['research_state_snapshot_v1',{p_expected_user_id:a}],['research_state_apply_ops_v1',{p_expected_user_id:a,p_batch_id:b,p_expected_revision:3,p_ops:[op]}]]){
  const h=harness();const r=await h.request('/rest/v1/rpc/'+rpc,{body});assert.equal(r.status,200);assert.equal(h.calls.length,2);assert.equal(h.calls[1].headers.get('authorization'),'Bearer '+jwt(a));assert.deepEqual(await h.calls[1].json(),body);assert.equal(h.calls[1].cache,'no-store');
 }
});
test('wrong account, JWT identity mismatch, revoked token and source failure never reach owned storage',async()=>{
 for(const config of [{uid:b},{failAuth:true},{offline:true}]){const h=harness(config);assert.equal((await h.request('/rest/v1/rpc/research_state_snapshot_v1',{body:{p_expected_user_id:a}})).status,403);assert.equal(h.calls.length,1);}
 const h=harness();assert.equal((await h.request('/rest/v1/rpc/research_state_snapshot_v1',{body:{p_expected_user_id:b}})).status,403);assert.equal(h.calls.length,1);
 for(const token of ['', 'bad.jwt', jwt(a).replace('e30.','e30.')]){if(token===jwt(a))continue;const x=harness();assert.equal((await x.request('/rest/v1/rpc/research_state_snapshot_v1',{token,body:{p_expected_user_id:a}})).status,403);assert.equal(x.calls.length,0);}
});
test('profile updates cannot create users or alter authority; exact own fields and row filter only',async()=>{
 const h=harness();assert.equal((await h.request('/rest/v1/users?id=eq.'+a+'&select=id',{method:'PATCH',body:{display_name:'שם',username:'name'}})).status,200);
 for(const [query,body]of [['id=eq.'+b,{display_name:'spoof'}],['id=eq.'+a,{role:'admin'}],['id=eq.'+a+'&id=eq.'+b,{display_name:'spoof'}],['id=eq.'+a+'&or=(id.eq.'+b+')',{display_name:'spoof'}]]){const x=harness();assert.equal((await x.request('/rest/v1/users?'+query,{method:'PATCH',body})).status,403);assert.equal(x.calls.length,1);}
 assert.equal((await harness().request('/rest/v1/users',{body:{id:a,display_name:'duplicate'}})).status,403);
});
test('private read requires exact own filter; old anonymous cache or another principal cannot supply notebook content',async()=>{
 for(const method of ['GET','HEAD'])assert.equal((await harness().request('/rest/v1/user_notes?select=content&user_id=eq.'+a,{method})).status,200);
 for(const query of ['select=content','user_id=eq.'+b,'user_id=eq.'+a+'&user_id=eq.'+b,'user_id=eq.'+a+'&or=(user_id.eq.'+b+')'])assert.equal((await harness().request('/rest/v1/user_notes?'+query,{method:'GET'})).status,403);
});
test('notebook upsert stays in its existing unique user row, and cannot reassign ownership',async()=>{
 const body={user_id:a,content:'עריכה פרטית',updated_at:new Date().toISOString()};const h=harness();assert.equal((await h.request('/rest/v1/user_notes?on_conflict=user_id&select=user_id%2Ccontent%2Cupdated_at',{body})).status,200);
 for(const bad of [{...body,user_id:b},{...body,role:'admin'},{...body,content:'x'.repeat(30001)}])assert.equal((await harness().request('/rest/v1/user_notes?on_conflict=user_id',{body:bad})).status,403);
});
test('unknown research operation, other bucket and malformed batch are rejected; unrelated systems receive no member exception',async()=>{
 const body={p_expected_user_id:a,p_batch_id:b,p_expected_revision:0,p_ops:[op]};
 for(const bad of [{...body,p_ops:[{...op,kind:'publish'}]},{...body,p_ops:[{...op,bucket:'canonical'}]},{...body,p_expected_revision:-1},{...body,p_ops:[]},{...body,user_id:a}])assert.equal((await harness().request('/rest/v1/rpc/research_state_apply_ops_v1',{body:bad})).status,403);
 for(const path of ['/functions/v1/ai-analyze','/rest/v1/rpc/credit_reserve_v1','/rest/v1/subscribers','/rest/v1/site_flags']){const h=harness();assert.equal(await h.request(path),null);assert.equal(h.calls.length,0);}
});
test('canonical hidden crossings are deterministic under candidate order; count independent methods then use Legacy short-expression preference',async()=>{
 const profile=[{methodKey:'רגיל',dbColumn:'ragil',computedValue:10,sortOrder:1},{methodKey:'מילוי',dbColumn:'miluy',computedValue:20,sortOrder:2}];
 const rows=[{phrase:'ביטוי ארוך',ragil:10,miluy:20,lead_rank:1},{phrase:'דג',ragil:10,miluy:20,lead_rank:99}];
 const project=candidates=>deriveHiddenCrossings({expression:'אב',methodProfile:profile,candidates});
 assert.equal(project(rows)[0].partner,'דג');assert.deepEqual(project(rows),project([...rows].reverse()));
 const calls=[];let q={then:yes=>Promise.resolve({data:rows,error:null}).then(yes)};
 for(const name of ['select','eq','order','limit','abortSignal'])q[name]=(...args)=>{calls.push([name,...args]);return q;};
 const abort=new AbortController();await fetchNumberHiddenCrossings('אב',profile,{client:{from:()=>q},signal:abort.signal});assert.ok(calls.some(x=>x[0]==='order'&&x[1]==='phrase'));assert.ok(calls.some(x=>x[0]==='abortSignal'&&x[1]===abort.signal));abort.abort();await assert.rejects(fetchNumberHiddenCrossings('אב',profile,{client:{from:()=>assert.fail('cancelled')},signal:abort.signal}),{name:'AbortError'});
});
test('mobile glass reuses the adopted token treatment; private drafts never import the unscoped Legacy notebook',()=>{
 const css=readFileSync(new URL('../src/components/experience2029/systemFrame2029-unified-bar.css',import.meta.url),'utf8');assert.ok(css.includes('@media(prefers-reduced-transparency:reduce)'));
 const component=readFileSync(new URL('../src/components/userCenter/PersonalNotes2029.jsx',import.meta.url),'utf8');assert.ok(!component.includes('localStorage'));assert.ok(!component.includes('sod_notes_v1'));assert.ok(component.includes('strict:true'));
});
