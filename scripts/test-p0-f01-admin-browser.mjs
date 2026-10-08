// Legacy compatibility only: real AdminPage/AuthProvider and staging RPC.
// This test does not certify 2029 management acceptance.
// No API mocks. The only app override is the test-only Supabase transport.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const [playwrightPath,evidenceDir]=process.argv.slice(2);
const {chromium}=await import(pathToFileURL(playwrightPath).href);
const sessions=JSON.parse(readFileSync(evidenceDir+'/sessions.json','utf8'));
const app='http://127.0.0.1:5179',stage='krnaxxndgtrdnaddlzws.supabase.co';
const proxy=process.env.HTTPS_PROXY||process.env.HTTP_PROXY;
// Playwright otherwise appends <-loopback>, which sends the local app to the
// cloud egress proxy and receives HTTP 403 instead of reaching Vite.
process.env.PLAYWRIGHT_DISABLE_FORCED_CHROMIUM_PROXIED_LOOPBACK='1';
const browser=await chromium.launch({headless:true,proxy:proxy?{server:proxy,bypass:'localhost,127.0.0.1'}:undefined});
const results=[],blocked=[];
let activePage;
try{
 for(const role of ['admin','user','anon']){
  const context=await browser.newContext({viewport:{width:1440,height:1080},ignoreHTTPSErrors:true});
  await context.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.origin===app||u.hostname===stage)return route.continue();
   blocked.push({role,host:u.hostname});return route.abort('blockedbyclient');
  });
  if(role!=='anon')await context.addInitScript(session=>{
   localStorage.setItem('sb-krnaxxndgtrdnaddlzws-auth-token',JSON.stringify(session));
  },sessions[role]);
  const page=await context.newPage();
  page.setDefaultTimeout(15000);
  activePage=page;
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const documentResponse=await page.goto(app+'/admin',{waitUntil:'domcontentloaded'});
  if(documentResponse.status()!==200){console.log((await page.locator('body').innerText()).slice(0,1500));throw new Error('Local app document HTTP '+documentResponse.status());}
  if(role==='admin'){
   await page.getByRole('heading',{name:'⚙️ ניהול סוד 1820',exact:true}).waitFor({timeout:45000});
   // Dismiss the real desktop video overlay using its own UI control.
   const collapse=page.getByRole('button',{name:'מזער את סרטוני המטוס',exact:true});
   if(await collapse.isVisible())await collapse.click();
   console.log('ACTION open tools');
   await page.getByRole('button',{name:'🔧 כלים ומחקר',exact:true}).click();
   console.log('ACTION open work log');
   const rpc=page.waitForResponse(r=>r.url().includes('/rest/v1/rpc/get_work_log'),{timeout:45000});
   await page.getByRole('button',{name:'📝 יומן עבודה',exact:true}).click();
   const response=await rpc;assert.equal(response.status(),200);
   const rows=await response.json();assert.equal(rows.length,1000);
   await page.getByText('P0 local entry 0001',{exact:true}).waitFor();
   assert.equal(await page.getByText('P0 local entry 1000',{exact:true}).count(),1);
   assert.equal(await page.getByText('P0 local entry 1001',{exact:true}).count(),0);
   const search=page.getByPlaceholder('🔍 חיפוש ביומן…');
   await search.fill('P0 local entry 0042');
   await page.getByText('P0 local entry 0042',{exact:true}).waitFor();
   assert.equal(await page.getByText('P0 local entry 0001',{exact:true}).count(),0);
   await page.screenshot({path:evidenceDir+'/admin-worklog.png'});
   results.push({role,result:'PASS',real_rpc_status:response.status(),rows:rows.length,search:true});
  }else{
   await page.getByText(role==='user'?'אין לך הרשאת ניהול.':'נדרשת התחברות.',{exact:false}).waitFor({timeout:45000});
   assert.equal(await page.getByText('P0 local entry 0001',{exact:true}).count(),0);
   results.push({role,result:'PASS',admin_history_visible:false});
  }
  assert.equal(errors.length,0,'Actual app must not crash: '+errors.join('; '));
  await context.close();
 }
 writeFileSync(evidenceDir+'/browser-report.json',JSON.stringify({runtime:'legacy',purpose:'compatibility_only_not_2029_acceptance',results,no_API_mocks:true,external_requests_blocked:true,blocked_hosts:[...new Set(blocked.map(x=>x.host))],production_applied:false},null,2));
 console.log(JSON.stringify({browser_checks:results.length,all_passed:true}));
}catch(error){
 if(activePage&&!activePage.isClosed()){
  await activePage.screenshot({path:evidenceDir+'/browser-failure.png'});
  writeFileSync(evidenceDir+'/browser-failure.txt',await activePage.locator('body').innerText());
 }
 throw error;
}finally{await browser.close();}
