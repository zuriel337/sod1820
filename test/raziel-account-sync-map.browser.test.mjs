// Real built Auth/Research/Raziel providers and UI. All external IO is intercepted.
// The server below is a fixture, NOT proof of a live account or model invocation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { applyResearchOps, emptyResearchState } from '../src/lib/research/researchSyncState.js';
const { chromium } = createRequire(import.meta.url)('playwright');
const dist=fileURLToPath(new URL('../dist',import.meta.url));
const uid='11111111-1111-4111-8111-111111111111';
const uidB='22222222-2222-4222-8222-222222222222';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
test('account save → ACK → fresh browser → restore; map explicit only; 320/390/1440 and 3 presets', {timeout:240000}, async()=>{
  assert.ok(existsSync(join(dist,'2029.html')),'run build:2029 first');
  const server=createServer((req,res)=>{
    const path=normalize(decodeURIComponent(new URL(req.url,'http://test').pathname));
    const file=join(dist,path);
    const asset=file.startsWith(dist+'/')&&existsSync(file)&&statSync(file).isFile()?file:join(dist,'2029.html');
    res.writeHead(200,{'content-type':mime[extname(asset)]||'application/octet-stream'});res.end(readFileSync(asset));
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  const errors=[];
  try {
    for(const [width,theme] of [[320,'light'],[390,'parchment'],[1440,'dark']]){
      const cloud=new Map();let ai=0,saves=0,failSave=true;
      const state=id=>cloud.get(id)||{...emptyResearchState(),revision:0};
      async function open(id=uid){
        const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
        const jwt=[{alg:'HS256',typ:'JWT'},{sub:id,role:'authenticated',exp:2200000000},'test-only'].map((x,i)=>i===2?x:Buffer.from(JSON.stringify(x)).toString('base64url')).join('.');
        const user={id,email:'fixture@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{}};
        await context.addInitScript(({jwt,user,theme})=>{
          localStorage.setItem('sod-theme',theme);
          localStorage.setItem('sb-linswmnnkjxvweumprav-auth-token',JSON.stringify({access_token:jwt,refresh_token:'test-only',expires_at:2200000000,expires_in:3600,token_type:'bearer',user}));
        },{jwt,user,theme});
        const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
        await page.route('**/*',async route=>{
          const req=route.request(),url=new URL(req.url());
          if(url.origin===origin)return route.continue();
          if(url.hostname!=='linswmnnkjxvweumprav.supabase.co')return route.abort();
          const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*'};
          if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
          let body=[],status=200;
          if(url.pathname==='/auth/v1/user')body=user;
          else if(url.pathname.endsWith('/users'))body={id,display_name:'משתמש בדיקה',role:'user'};
          else if(url.pathname.endsWith('/site_flags'))body=['lock_world','lock_heichal','lock_raziel_site','lock_books','lock_number'].map(key=>({key,enabled:false,mode:'all'}));
          else if(url.pathname.endsWith('/research_state_snapshot_v1')){
            assert.equal(req.postDataJSON().p_expected_user_id,id);body=state(id);
          }else if(url.pathname.endsWith('/research_state_apply_ops_v1')){
            const b=req.postDataJSON();assert.equal(b.p_expected_user_id,id);
            const hasSave=b.p_ops.some(o=>o.kind==='item_upsert'&&o.entity?.type==='raziel_session');
            if(hasSave&&failSave){status=503;body={message:'fixture unavailable'};}
            else if(b.p_expected_revision!==state(id).revision){status=409;body={message:'RESEARCH_SYNC_CONFLICT'};}
            else {
              const snapshot={...applyResearchOps(state(id),b.p_ops),revision:state(id).revision+1};cloud.set(id,snapshot);
              if(hasSave)saves++;
              body={ok:true,batch_id:b.p_batch_id,applied_revision:snapshot.revision,snapshot};
            }
          }else if(url.pathname.endsWith('/ai-analyze')){
            ai++; const b=req.postDataJSON();
            if(ai===2)assert.equal(b.view_mode,'landscape');
            body={raziel:{answer:b.view_mode==='landscape'?'מפת קשרים לבדיקה — אינה מפה גרפית':'תשובת בדיקה לשיחה English ועברית'},intelligence_level:'fast',
              plan_meta:{canonical_result_bundle:{contract:'public-number-research-run-v1',status:'ready',numbers:[337]},view_mode:b.view_mode||'general'}};
          }else if(!['GET','HEAD'].includes(req.method()))body={};
          return route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(body)});
        });
        await page.goto(origin+'/2029');
        await page.locator('.sod29-command-island .sod29-raziel-orb').click();
        const chat=page.locator(width>=1000?'[data-raziel-companion-view="open"] [data-raziel-native-chat="true"]':'.sod29-frame-panel [data-raziel-native-chat="true"]');
        await chat.waitFor();
        return {context,page,chat};
      }
      const first=await open();let {page,chat}=first;
      await chat.locator('[data-raziel-saved-sessions]').click();
      await chat.locator('[data-raziel-saved-sync="synced"]').waitFor();
      assert.equal(ai,0);assert.equal(saves,0);
      await chat.getByRole('textbox',{name:'שאלה לרזיאל',exact:true}).fill('הסבר לי על בדיקת הקשר');
      await chat.getByRole('button',{name:'שלח',exact:true}).click();
      await chat.getByText('תשובת בדיקה לשיחה English ועברית',{exact:true}).waitFor();
      assert.equal(ai,1);assert.equal(saves,0,'answer never autosaves');
      await chat.getByRole('button',{name:'🗺️ פתח מפת מחקר',exact:true}).click();
      await chat.locator('[data-raziel-oneshot-offer="map:ready"]').waitFor();assert.equal(ai,1,'explanation does not call AI');
      await chat.locator('[data-raziel-oneshot-run="map"]').click();
      await chat.getByText('מפת קשרים לבדיקה — אינה מפה גרפית',{exact:true}).waitFor();assert.equal(ai,2);assert.equal(saves,0);
      await chat.locator('[data-raziel-save-session]').click();
      await chat.locator('[data-raziel-saved-sync="error"]').waitFor();
      assert.equal(state(uid).saved.length,0);assert.doesNotMatch(await chat.locator('.sod29-raziel-save-notice').innerText(),/באופן פרטי בחשבון/);
      failSave=false;await chat.getByRole('button',{name:'נסה לסנכרן שוב',exact:true}).click();
      await chat.locator('[data-raziel-saved-sync="synced"]').waitFor();assert.equal(saves,1);assert.equal(state(uid).saved.length,1);
      const ref=state(uid).saved[0].ref;const thread=state(uid).saved[0].thread;
      assert.equal(thread.filter(m=>m.role==='raziel').length,2);
      await first.context.close();
      const second=await open();({page,chat}=second);
      await chat.locator('[data-raziel-saved-sessions]').click();
      await chat.locator('[data-raziel-saved-sync="synced"]').waitFor();
      await chat.locator('.sod29-raziel-saved-open').click();
      await chat.getByText('תשובת בדיקה לשיחה English ועברית',{exact:true}).waitFor();
      assert.equal(ai,2,'restore on a fresh browser does not run a model');assert.equal(state(uid).saved[0].ref,ref);
      await chat.getByRole('button',{name:'🗺️ פתח מפת מחקר',exact:true}).click();
      await chat.locator('[data-raziel-oneshot-offer="map:no_material"]').waitFor();assert.equal(ai,2,'saved text is not fabricated live Bundle');
      const geo=await chat.evaluate(el=>({pageOverflow:document.documentElement.scrollWidth>innerWidth,chatOverflow:el.scrollWidth>el.clientWidth+1,controls:[...el.querySelectorAll('button')].filter(n=>n.getClientRects().length).filter(n=>{const r=n.getBoundingClientRect();return r.width<43.5||r.height<43.5;}).map(n=>n.textContent)}));
      assert.deepEqual(geo,{pageOverflow:false,chatOverflow:false,controls:[]},`${width}/${theme}`);
      if(width<1000)await page.keyboard.press('Escape');
      await page.locator('.sod29-sidebar-workspace:visible, .sod29-header-workspace:visible').first().click();
      await page.locator('[data-workspace-card="raziel"]').click();
      const center=page.locator('[data-raziel-center="true"]');await center.waitFor();
      assert.equal(await center.locator('[data-raziel-center-session]').count(),1,'same cloud conversation appears inside the actual account');
      assert.equal(await center.locator('[data-raziel-center-sync]').getAttribute('data-raziel-center-sync'),'synced');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      assert.equal(ai,2,'opening account history never runs AI');
      mkdirSync('/tmp/raziel-account-acceptance',{recursive:true});
      await page.screenshot({path:`/tmp/raziel-account-acceptance/account-${width}.png`});
      await second.context.close();
      const other=await open(uidB);await other.chat.locator('[data-raziel-saved-sessions]').click();
      await other.chat.locator('[data-raziel-saved-sync="synced"]').waitFor();
      assert.equal(await other.chat.locator('.sod29-raziel-saved-open').count(),0,'another account cannot see the saved fixture');
      assert.equal(ai,2);await other.context.close();
    }
    assert.deepEqual(errors,[]);
  }finally{await browser.close();await new Promise(r=>server.close(r));}
});
