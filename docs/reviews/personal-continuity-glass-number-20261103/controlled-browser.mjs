// Actual compiled UI + worker, isolated synthetic account transport; NEVER real account acceptance.
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {applyResearchOps} from '../../../src/lib/research/researchSyncState.js';
const root=process.cwd(),dist=resolve(root,'public-reading-deploy/dist');
const output=process.argv[2]||'/tmp/personal-controlled-browser';await mkdir(output,{recursive:true});
const template=await readFile(resolve(root,'public-reading-deploy/.generated/2029.html'),'utf8');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
const closing=process.env.PERSONAL_ONLY==='whatsapp';
const model={users:{},notes:{},research:{},batches:{},calls:[],denied:[],delay:0,bindingMode:'ready',bindingDelayA:0};
for(const [id,name,role,email]of [[A,'משתמש א','admin','a@example.invalid'],[B,'משתמש ב','user','b@example.invalid']]){
 model.users[id]={id,display_name:name,username:id===A?'account_a':'account_b',avatar_url:'',role,tier:'member',email};
 model.notes[id]=id===A?'פנקס א קיים':'פנקס ב קיים';
 model.research[id]={revision:0,cart:[],saved:[{id:'post:old-'+(id===A?'a':'b'),type:'post',ref:'old-'+(id===A?'a':'b'),title:id===A?'שמירה א קיימת':'שמירה ב קיימת',link:'/post/old-local-fixture'}],pinned:[],history:[],collections:[],journeys:[],context:null};
 model.batches[id]=new Map();
}
const user=id=>({id,email:model.users[id].email,aud:'authenticated',role:'authenticated',app_metadata:{provider:'email',providers:['email']},user_metadata:{},identities:[],created_at:'2020-01-01T00:00:00Z'});
const token=id=>Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,role:'authenticated',aud:'authenticated',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.synthetic';
const session=id=>({access_token:token(id),refresh_token:'local-fixture-refresh-'+id,expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:user(id)});
const principal=req=>{try{return JSON.parse(Buffer.from((req.headers.authorization||'').split('.')[1],'base64url')).sub;}catch{return null;}};
const server=createServer(async(req,res)=>{
 const u=new URL(req.url,'http://localhost');res.setHeader('Cache-Control','no-store');
 const send=(value,status=200)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));};
 try{
 if(u.pathname.startsWith('/__fixture/')){
  const path=u.pathname.slice('/__fixture'.length),uid=principal(req);let text='';for await(const chunk of req)text+=chunk;const body=text?JSON.parse(text):{};model.calls.push({path,method:req.method,actor:uid});
  if(path==='/auth/v1/settings')return send({external:{email:true,google:true,facebook:true},disable_signup:false});
  if(path==='/auth/v1/token'){const id=Object.keys(model.users).find(id=>model.users[id].email===body.email);return id&&body.password==='fixture-password'?send(session(id)):send({error:'invalid_credentials'},400);}
  if(path==='/auth/v1/user')return uid&&model.users[uid]?send(user(uid)):send({error:'invalid_token'},401);
  if(path==='/auth/v1/logout'){res.statusCode=204;return res.end();}
  if(path==='/api/contributor-self')return uid?send({state:'ready',writer:{state:'unlinked'},stats:{}}):send({state:'login_required'},401);
  if(path==='/rest/v1/users'){
   const id=u.searchParams.get('id')?.replace(/^eq\./,'');if(!id||!model.users[id])return send([]);
   if(req.method==='PATCH'){assert.equal(uid,id);assert.ok(Object.keys(body).every(k=>['display_name','username','avatar_url'].includes(k)));model.users[id]={...model.users[id],...body};return send(model.users[id]);}
   return send([model.users[id]]);
  }
  if(path==='/rest/v1/posts')return send(u.searchParams.has('slug')?[{id:777777,slug:'controlled-personal-post',title:'פוסט בדיקה מבוקר',content:'<p>תוכן מלאכותי לבדיקת שמירה בלבד.</p>',tags:[],categories:[],source:'wordpress',date:'2026-01-01T00:00:00Z',author:'synthetic'}]:[]);
  if(path==='/rest/v1/user_notes'){
   if(req.method==='GET'){assert.equal(u.searchParams.get('user_id'),'eq.'+uid);return send([{content:model.notes[uid]}]);}
   if(model.failNotesSave)return send({error:'controlled_write_failure'},503);
   assert.equal(body.user_id,uid);model.notes[uid]=body.content;return send({...body});
  }
  if(path==='/rest/v1/rpc/research_state_snapshot_v1'){assert.equal(body.p_expected_user_id,uid);return send(model.research[uid]);}
  if(path==='/rest/v1/rpc/research_state_apply_ops_v1'){
   assert.equal(body.p_expected_user_id,uid);if(model.batches[uid].has(body.p_batch_id))return send(model.batches[uid].get(body.p_batch_id));
   assert.equal(body.p_expected_revision,model.research[uid].revision);const revision=model.research[uid].revision+1;model.research[uid]={...applyResearchOps(model.research[uid],body.p_ops),revision};
   const receipt={ok:true,batch_id:body.p_batch_id,applied_revision:revision,snapshot:model.research[uid]};model.batches[uid].set(body.p_batch_id,receipt);return send(receipt);
  }
  if(path==='/rest/v1/profiles')return send([{user_id:uid,credits:12,xp:0,level:0,streak:0}]);
  if(path==='/rest/v1/user_notifications'){res.setHeader('Content-Range','*/0');return send([]);}
  if(path==='/rest/v1/notification_prefs')return send([{user_id:uid,topics:closing?['number:1820']:[],channels:closing?['whatsapp']:[]}]);
  if(path==='/rest/v1/wa_account_links'){
   assert.equal(u.searchParams.get('select'),'verified_at');assert.equal(u.searchParams.get('user_id'),'eq.'+uid);assert.equal(u.searchParams.get('verified_at'),'not.is.null');assert.equal(u.searchParams.get('limit'),'1');
   if(uid===A&&model.bindingDelayA)await new Promise(resolve=>setTimeout(resolve,model.bindingDelayA));
   if(model.bindingMode==='denied')return send({code:'42501',message:'synthetic denied'},403);
   if(model.bindingMode==='failed')return send({code:'synthetic_source_failure'},503);
   return send(uid===A?[{verified_at:'2026-10-01T12:00:00Z'}]:[]);
  }
  if(path==='/rest/v1/rpc/rd_is_admin')return send(model.users[uid]?.role==='admin');
  if(path==='/rest/v1/site_flags')return send(['lock_els','lock_raziel_site','lock_life_journey','lock_heichal'].map(key=>({key,enabled:true,mode:'all'})));
  if(path.startsWith('/functions/')||/credit_|membership_|founding|record_referral|stitch|ingest|claim_|subscribe/.test(path)){model.denied.push({path,method:req.method});return send({error:'synthetic_forbidden'},403);}
  return send([]);
 }
 if(u.pathname==='/sw.js'){
  // Keep the compiled worker admission unchanged; replace only its outbound
  // network with the isolated fixture server. Window-level rewriting would
  // incorrectly turn Auth requests into denied same-origin application POSTs.
  const boundary=`const fixtureNetwork=self.fetch.bind(self);self.fetch=async(input,init)=>{const req=new Request(input instanceof Request?input:new URL(input,self.location.href),init),u=new URL(req.url);if(u.origin==='https://linswmnnkjxvweumprav.supabase.co'||u.origin===self.location.origin&&u.pathname==='/api/contributor-self')return fixtureNetwork(self.location.origin+'/__fixture'+u.pathname+u.search,{method:req.method,headers:req.headers,signal:req.signal,credentials:'omit',...(!['GET','HEAD'].includes(req.method)?{body:await req.arrayBuffer()}:{})});if(u.origin!==self.location.origin)throw new Error('synthetic_external_denied');return fixtureNetwork(req);};\n`;
  res.setHeader('Content-Type','application/javascript');res.setHeader('Service-Worker-Allowed','/');return res.end(boundary+await readFile(resolve(dist,'sw.js'),'utf8'));
 }
 if(u.pathname.startsWith('/assets/')||u.pathname.startsWith('/fonts/')||u.pathname.startsWith('/brand/')||u.pathname.endsWith('.png')||u.pathname.endsWith('.webp')){
  const file=resolve(dist,'.'+u.pathname);if(!file.startsWith(dist+'/'))throw Error('path');res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css','.ttf':'font/ttf','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp'})[extname(file)]||'application/octet-stream');return res.end(await readFile(file));
 }
 res.setHeader('Content-Type','text/html');res.end(template);
 }catch(error){send({error:String(error.message)},500);}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
const report={kind:'controlled-owned-account-browser',synthetic:true,realAccounts:false,liveWrites:0,origin,cases:[],errors:[],authNetwork:[]};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
for(const width of (process.env.PERSONAL_WIDTH?[Number(process.env.PERSONAL_WIDTH)]:[390,1440])){
 const context=await browser.newContext({viewport:{width,height:900},locale:'he-IL'});
 await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort('blockedbyclient'));
 await context.addInitScript(()=>{
  navigator.sendBeacon=()=>false;window.WebSocket=class{constructor(){throw Error('synthetic_socket_denied');}};
 });
 const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(20000);page.on('pageerror',e=>report.errors.push({width,message:e.message}));
 context.on('requestfailed',request=>{if(request.url().includes('/auth/v1/'))report.authNetwork.push({event:'failed',path:new URL(request.url()).pathname,error:request.failure()?.errorText});});
 context.on('request',request=>{if(request.url().includes('/auth/v1/token')){let body={};try{body=request.postDataJSON()||{};}catch{}report.authNetwork.push({event:'request',path:new URL(request.url()).pathname,queryKeys:[...new URL(request.url()).searchParams.keys()],method:request.method(),bodyKeys:Object.keys(body),securityKeys:Object.keys(body.gotrue_meta_security||{})});}});
 context.on('response',async response=>{if(response.url().includes('/auth/v1/token'))report.authNetwork.push({event:'response',path:new URL(response.url()).pathname,status:response.status(),...(response.status()>=400?{error:await response.text().catch(()=>null)}:{})});});
 async function check(name,fn){if(closing&&!name.startsWith('WhatsApp'))return;const row={name,width,passed:false};report.cases.push(row);try{await fn(row);row.passed=true;}catch(e){row.error=String(e.message).slice(0,1800);row.body=(await page.locator('body').innerText()).slice(0,700);await page.screenshot({path:output+'/failure-'+width+'-'+report.cases.length+'.png'});throw e;}finally{await writeFile(output+'/receipt.json',JSON.stringify(report,null,2));console.log(JSON.stringify(row));}}
 async function login(id,target){await page.goto(origin+'/login?returnTo='+encodeURIComponent(target));await page.getByRole('button',{name:'כניסה עם סיסמה',exact:true}).click();await page.locator('input[type=email]').fill(model.users[id].email);await page.locator('input[type=password]').fill('fixture-password');await page.getByRole('button',{name:'כניסה לחשבון ←',exact:true}).click();await page.waitForURL(origin+target);}
 if(closing)await login(A,'/2029/me/notifications');
 await check('existing A login and owned Legacy library',async()=>{await login(A,'/2029/me/research');await expect(page.locator('[data-research-bucket="saved"]').getByText(model.research[A].saved[0].title,{exact:true})).toBeVisible();await expect(page.getByText('שמירה ב קיימת',{exact:true})).toHaveCount(0);});
 await check('owned notebook save/edit and refresh',async()=>{await page.goto(origin+'/2029/me/notes');const input=page.getByLabel('ההערות שלי');await expect(input).toHaveValue(model.notes[A]);await input.fill('עריכת פנקס א '+width);await page.getByRole('button',{name:'שמירת הפנקס',exact:true}).click();await expect(page.getByText('הפנקס נשמר בחשבון ✓',{exact:true})).toBeVisible();assert.equal(model.notes[A],'עריכת פנקס א '+width);assert.equal(model.notes[B],'פנקס ב קיים');await page.reload();await expect(page.getByLabel('ההערות שלי')).toHaveValue('עריכת פנקס א '+width);});
 await check('failed notebook write keeps text and never reports success; explicit retry',async()=>{model.failNotesSave=true;const before=model.notes[A];await page.getByLabel('ההערות שלי').fill('טיוטה אחרי כשל '+width);await page.getByRole('button',{name:'שמירת הפנקס',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'לא התקבל אישור שמירה'})).toBeVisible();await expect(page.getByText('הפנקס נשמר בחשבון ✓',{exact:true})).toHaveCount(0);assert.equal(model.notes[A],before);await expect(page.getByLabel('ההערות שלי')).toHaveValue('טיוטה אחרי כשל '+width);model.failNotesSave=false;await page.getByRole('button',{name:'שמירת הפנקס',exact:true}).click();await expect(page.getByText('הפנקס נשמר בחשבון ✓',{exact:true})).toBeVisible();});
 await check('saved item edit reuses one identity',async()=>{await page.goto(origin+'/2029/me/research');await page.getByRole('button',{name:'עריכת פריט שמור',exact:true}).first().click();await page.getByLabel('כותרת אישית').fill('שמירה א ערוכה '+width);await page.getByLabel('הערה פרטית').fill('הערה פרטית א');await page.getByRole('button',{name:'שמירת העריכה',exact:true}).click();await expect(page.getByText('העריכה נשמרה בחשבון ✓',{exact:true})).toBeVisible();assert.equal(model.research[A].saved.length,1);assert.equal(model.research[A].saved[0].title,'שמירה א ערוכה '+width);});
 await check('new explicit post save preserves source and exact URL after refresh',async()=>{const target='/post/controlled-personal-post?from=personal-fixture#return-place';await page.goto(origin+target);await page.locator('.sod29-post-details > summary').click();await page.getByRole('button',{name:'שמירה לאזור האישי',exact:true}).click();await expect(page.getByText('נשמר באזור האישי בחשבון ✓',{exact:true})).toBeVisible();const row=model.research[A].saved.find(x=>x.ref==='controlled-personal-post');assert.ok(row);assert.equal(row.link,target);assert.equal(model.research[B].saved.length,1);await page.reload();await page.locator('.sod29-post-details > summary').click();await expect(page.getByRole('button',{name:'✓ ברשימת השמורים',exact:true})).toHaveAttribute('aria-pressed','true');});
 await check('profile edit and explicit logout',async()=>{await page.goto(origin+'/2029/me/profile');await page.getByLabel('שם תצוגה').fill('חשבון א ערוך');await page.getByRole('button',{name:'שמירה',exact:true}).click();await expect(page.getByText(/נשמר/).first()).toBeVisible();assert.equal(model.users[A].display_name,'חשבון א ערוך');assert.equal(model.users[A].role,'admin');await page.getByRole('button',{name:'התנתקות',exact:true}).click();await page.waitForTimeout(300);});
 await check('regular B account never inherits A data',async()=>{await login(B,'/2029/me/research');await expect(page.getByText('שמירה ב קיימת',{exact:true})).toBeVisible();await expect(page.getByText('שמירה א ערוכה '+width,{exact:true})).toHaveCount(0);await page.goto(origin+'/2029/me/notes');await expect(page.getByLabel('ההערות שלי')).toHaveValue('פנקס ב קיים');assert.equal(model.users[B].role,'user');await page.screenshot({path:output+'/personal-notes-'+width+'.png'});});
 await check('regular B can save without admin role',async()=>{await page.goto(origin+'/post/controlled-personal-post?from=account-b');await page.locator('.sod29-post-details > summary').click();await page.getByRole('button',{name:'שמירה לאזור האישי',exact:true}).click();await expect(page.getByText('נשמר באזור האישי בחשבון ✓',{exact:true})).toBeVisible();assert.equal(model.research[B].saved.length,2);assert.equal(model.users[B].role,'user');await page.goto(origin+'/2029/me/notes');await expect(page.getByLabel('ההערות שלי')).toHaveValue('פנקס ב קיים');});
 await check('mobile/desktop private layout remains contained',async row=>{row.geometry=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth,sw:!!navigator.serviceWorker.controller}));assert.ok(row.geometry.width<=width+1);assert.equal(row.geometry.sw,true);});
 if(closing){
  await check('WhatsApp verified association is separate from stored preference and unknown delivery',async()=>{
   await expect(page.getByText(/קיים חיבור מספר מאומת בחשבון/)).toBeVisible();await expect(page.getByText('בחירה שמורה',{exact:true})).toBeVisible();await expect(page.getByText('מצב המשלוח לא נבדק',{exact:true})).toBeVisible();
   assert.ok(model.calls.filter(c=>c.path==='/rest/v1/wa_account_links').every(c=>c.method==='GET'));
  });
  await check('WhatsApp permission denial is not measured empty; explicit read retry restores binding',async()=>{
   model.bindingMode='denied';await page.reload();await expect(page.getByText(/לא ניתן לקרוא את חיבור המספר בהרשאה הנוכחית/)).toBeVisible();await expect(page.getByText(/לא נמצא חיבור מספר מאומת/)).toHaveCount(0);await expect(page.locator('.fc-follow-row')).toHaveCount(1);
   model.bindingMode='ready';await page.getByRole('button',{name:'בדיקה חוזרת של חיבור המספר',exact:true}).click();await expect(page.getByText(/קיים חיבור מספר מאומת בחשבון/)).toBeVisible();
  });
  await check('WhatsApp failed source remains unknown and does not erase existing follow',async()=>{
   model.bindingMode='failed';await page.reload();await expect(page.getByText(/בדיקת חיבור המספר לא הושלמה/)).toBeVisible();await expect(page.locator('.fc-follow-row')).toHaveCount(1);model.bindingMode='ready';
  });
  await check('WhatsApp delayed account A completion cannot display after logout and existing B login',async()=>{
   const before=model.calls.filter(c=>c.path==='/rest/v1/wa_account_links').length;model.bindingDelayA=3000;await page.reload({waitUntil:'domcontentloaded'});await expect.poll(()=>model.calls.filter(c=>c.path==='/rest/v1/wa_account_links').length).toBeGreaterThan(before);
   await page.goto(origin+'/2029/me/profile');await page.getByRole('button',{name:'התנתקות',exact:true}).click();await login(B,'/2029/me/notifications');
   await expect(page.getByText(/לא נמצא חיבור מספר מאומת בחשבון/)).toBeVisible();await page.waitForTimeout(3100);await expect(page.getByText(/לא נמצא חיבור מספר מאומת בחשבון/)).toBeVisible();await expect(page.getByText(/קיים חיבור מספר מאומת בחשבון/)).toHaveCount(0);
   await expect(page.locator('.fc-follow-row')).toHaveCount(1);assert.equal(model.users[B].role,'user');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:output+'/whatsapp-status-'+width+'.png'});model.bindingDelayA=0;
  });
 }
 await context.close();
 // Each viewport is an independent scenario with one existing saved item.
 model.research[A].saved=model.research[A].saved.filter(x=>x.ref!=='controlled-personal-post');
 model.research[B].saved=model.research[B].saved.filter(x=>x.ref!=='controlled-personal-post');
}
assert.equal(model.denied.length,0,JSON.stringify(model.denied));report.passed=report.cases.length;report.finishedAt=new Date().toISOString();report.fixtureCalls=model.calls.length;report.accountRows=Object.keys(model.users).length;
}finally{report.fixtureCalls=model.calls;await browser.close();server.close();await writeFile(output+'/receipt.json',JSON.stringify(report,null,2));}
