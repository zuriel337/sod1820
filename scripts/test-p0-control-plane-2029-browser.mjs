// Native App2029 + ControlPlane2029Page, real GoTrue sessions and real admin RPCs.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const [playwrightPath,evidenceDir]=process.argv.slice(2);
const {chromium}=await import(pathToFileURL(playwrightPath).href);
const sessions=JSON.parse(readFileSync(evidenceDir+'/sessions.json','utf8'));
const app='http://127.0.0.1:5179',stage='krnaxxndgtrdnaddlzws.supabase.co';
const proxy=process.env.HTTPS_PROXY||process.env.HTTP_PROXY;
process.env.PLAYWRIGHT_DISABLE_FORCED_CHROMIUM_PROXIED_LOOPBACK='1';
const browser=await chromium.launch({headless:true,proxy:proxy?{server:proxy,bypass:'localhost,127.0.0.1'}:undefined});
const results=[],blocked=[];
const rpcNames=['admin_system_health','admin_op_trace_list_v1','admin_video_map_health'];
let activePage;
let activeRole,appErrors=[];
try{
 for(const role of ['admin','user','anon']){
  activeRole=role;appErrors=[];
  const context=await browser.newContext({viewport:{width:1440,height:1080},ignoreHTTPSErrors:true});
  await context.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.origin===app||u.hostname===stage)return route.continue();
   blocked.push(u.hostname);return route.abort('blockedbyclient');
  });
  if(role!=='anon')await context.addInitScript(session=>localStorage.setItem('sb-krnaxxndgtrdnaddlzws-auth-token',JSON.stringify(session)),sessions[role]);
  const page=await context.newPage();activePage=page;page.setDefaultTimeout(20000);
  const errors=appErrors,requested=[];page.on('pageerror',e=>errors.push(e.message));
  const appFailure=new Promise((resolve,reject)=>page.once('pageerror',e=>reject(new Error('Native 2029 runtime failed: '+e.message))));
  appFailure.catch(()=>{});
  page.on('request',r=>{const path=new URL(r.url()).pathname;for(const name of rpcNames)if(path==='/rest/v1/rpc/'+name)requested.push(name);});
  const responses=role==='admin'?rpcNames.map(name=>page.waitForResponse(r=>new URL(r.url()).pathname==='/rest/v1/rpc/'+name,{timeout:45000})):[];
  const responsePromise=Promise.all(responses);responsePromise.catch(()=>{});
  const documentResponse=await page.goto(app+'/2029/control',{waitUntil:'domcontentloaded'});
  assert.equal(documentResponse.status(),200);
  assert.ok((await documentResponse.text()).includes('/src/main2029.jsx'),'Must load the 2029 document');
  if(role==='admin'){
   await Promise.race([page.getByRole('heading',{name:'Control Plane',exact:true}).waitFor({timeout:45000}),appFailure]);
   const data=await responsePromise;
   for(const r of data){assert.equal(r.status(),200,'Native 2029 RPC must succeed');await r.json();}
   await page.waitForFunction(()=>!document.body.innerText.includes('מרענן…'));
   assert.equal(await page.getByText('לא ניתן לקרוא את מצב המערכת',{exact:true}).count(),0);
   await page.getByText('ADMIN · READ ONLY',{exact:true}).waitFor();
   await page.screenshot({path:evidenceDir+'/control-plane-2029.png'});
   results.push({role,result:'PASS',runtime:'2029',real_rpc_statuses:data.map((r,i)=>({rpc:rpcNames[i],status:r.status()})),scope:'existing_read_only_control_plane'});
  }else{
   await page.waitForURL(app+'/2029',{timeout:45000});
   assert.equal(await page.getByRole('heading',{name:'Control Plane',exact:true}).count(),0);
   assert.equal(requested.length,0,'Unauthorized roles must never request admin operational RPCs');
   results.push({role,result:'PASS',redirect:'/2029',admin_operational_requests:0});
  }
  assert.equal(errors.length,0,errors.join('; '));
  await context.close();
 }
 writeFileSync(evidenceDir+'/2029-browser-report.json',JSON.stringify({runtime:'2029',results,no_API_mocks:true,production_applied:false,blocked_hosts:[...new Set(blocked)],scope:'existing_ControlPlane2029_not_full_admin_replacement',work_log_UI_in_2029:'NOT_IMPLEMENTED_IN_CURRENT_CONTROL_PLANE'},null,2));
 console.log(JSON.stringify({runtime:'2029',browser_checks:results.length,all_passed:true}));
}catch(error){
 writeFileSync(evidenceDir+'/2029-browser-report.json',JSON.stringify({runtime:'2029',result:'FAIL',role:activeRole,completed_results:results,app_errors:appErrors,error:String(error.message).slice(0,500),no_API_mocks:true,production_applied:false,scope:'existing_ControlPlane2029_not_full_admin_replacement',work_log_UI_in_2029:'NOT_IMPLEMENTED_IN_CURRENT_CONTROL_PLANE'},null,2));
 if(activePage&&!activePage.isClosed()){
  await activePage.screenshot({path:evidenceDir+'/2029-browser-failure.png'});
  writeFileSync(evidenceDir+'/2029-browser-failure.txt',(await activePage.locator('body').innerText()).slice(0,3000));
 }
 throw error;
}finally{await browser.close();}
