// Offline diagnostic against an existing exact-code public build. No product edits.
// All browser origins are locally replayed or refused. record:false forbids upstream fetches.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { startLabServer } from './labserver.mjs';
const root = process.env.CLS_BUILD_ROOT;
const cacheDir = process.env.CLS_FIXTURE_CACHE;
const out = process.env.CLS_RESULTS;
if (!root || !cacheDir || !out) throw Error('CLS_BUILD_ROOT, CLS_FIXTURE_CACHE and CLS_RESULTS are required');
mkdirSync(out, { recursive: true });
const require = createRequire(root + '/package.json');
const { chromium } = require('playwright');
const expected = process.env.CLS_EXPECTED_SHA || 'd1f1e3252100afe14719a4eeb96c791dd29b7d51';
const artifact = JSON.parse(readFileSync(root+'/public-reading-deploy/dist/public-reading-artifact.json'));
if(artifact.sourceSha !== expected || artifact.sourceDirty || artifact.applicationSourceDirty)
 throw Error('Build identity does not equal the clean pinned source; rebuild before measuring');
if(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()!==expected)
 throw Error('Source checkout differs from pinned build');
const anon = readFileSync(root+'/src/lib/supabase.js','utf8').match(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)?.[0];
const readRpc = ['community_feed_page','community_thread_updates','community_message_context','community_reply_counts','community_claimed_contributors','community_presence_online','community_staff_user_ids_v1','community_tree_hints_list','community_tree_hints_by_number','fn_method_value','fn_method_values','fn_method_profile','fn_methods_list','fn_reliability_heartbeat_status','community_author_summary','public_post_comments','canonical_follow_subject','world_group_source_arrivals_v2','convergence_meter','community_replies_page'];
const recordPublicReads = process.env.CLS_RECORD === 'public-reads';
const lab = await startLabServer({root,cacheDir,anon,readRpc,record:recordPublicReads,trustCert:true,docDelayFor:()=>500,supabaseExtraMs:100});
const browser = await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:lab.chromiumArgs,env:lab.browserEnv});
const paths = {tag:'/tag/אריק-נווה',post:'/תפילה-לרפואה-של-רבי-שלמה-יהודה-הינוקא',community:'/community/chat',home:'/'};
const scenarios = [
 ...Object.entries(paths).map(([key,path])=>({id:key+'-human-scroll',key,path,human:true})),
 {id:'tag-delayed-data',key:'tag',path:paths.tag,human:true,dataDelay:4000},
 {id:'tag-delayed-data-footer-control',key:'tag',path:paths.tag,human:true,dataDelay:4000,footerControl:true},
 {id:'community-delayed-replies',key:'community',path:paths.community,human:true,replyDelay:1800},
 {id:'post-late-images',key:'post',path:paths.post,human:true,imageDelay:6000},
 {id:'home-newsletter',key:'home',path:'/',human:true,newsletter:true},
 {id:'home-newsletter-fixed-geometry',key:'home',path:'/',human:true,newsletter:true,newsletterControl:true},
 {id:'tag-ad-600',key:'tag',path:paths.tag,human:true,adHeight:600},
 {id:'post-ad-600',key:'post',path:paths.post,human:true,adHeight:600},
 {id:'home-spa-post',key:'home',path:'/',human:true,spa:true},
 {id:'community-long',key:'community',path:paths.community,human:true,long:true},
 {id:'home-footer-forward',key:'home',path:'/',human:true,footerNavigate:'/community/chat'},
 {id:'community-footer-forward',key:'community',path:paths.community,human:true,footerNavigate:'/contact'},
 {id:'tag-footer-forward',key:'tag',path:paths.tag,human:true,footerNavigate:'/contact'},
];
const only = process.env.CLS_SCENARIOS?.split(',');
const report = {baseline:expected,sourceBuild:artifact.sourceSha,mode:recordPublicReads?'LOCAL_BUILD_PUBLIC_READ_WARMUP':'OFFLINE_FIXTURE_ONLY',rows:[]};
const save = ()=>writeFileSync(out+'/report.json',JSON.stringify(report,null,2));
try {
 for (const s of scenarios.filter(s=>!only||only.includes(s.id))) {
  const started=Date.now(),miss0=lab.state.misses.length,sup0=lab.state.supabase.length;
  const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,locale:'he-IL',timezoneId:'Asia/Jerusalem',serviceWorkers:'allow'});
  // Local fixture input exercises the real human branch, without spoofing any live request.
  if(s.human) await ctx.addCookies([{name:'vb',value:'browser',url:lab.origin}]);
  const denied=[],errors=[],responses=[];
  await ctx.route('**/*',async r=>{
   const u=new URL(r.request().url());
   if(!['sod1820.co.il','www.sod1820.co.il','linswmnnkjxvweumprav.supabase.co'].includes(u.hostname)) {denied.push(u.hostname+u.pathname);return r.abort();}
   const delay=(s.dataDelay && u.pathname.startsWith('/rest/v1/')?s.dataDelay:0)
     +(s.replyDelay&&u.pathname.endsWith('/community_replies_page')?s.replyDelay:0)
     +(s.imageDelay&&r.request().resourceType()==='image'?s.imageDelay:0);
   if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
   return r.continue();
  });
  await ctx.addInitScript(({newsletter,clock})=>{
   // Freeze wall-clock only for reproducible time-window fixture keys; performance.now stays real.
   if(clock){const NativeDate=Date;class FixtureDate extends NativeDate{constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}}globalThis.Date=FixtureDate;}
   if(!newsletter)localStorage.setItem('sod_legacy_newsletter_invite_until',String(Date.now()+86400000));
   const label=n=>n?.tagName?.toLowerCase()+'.'+String(n?.className||'').split(/\s+/).filter(Boolean).slice(0,3).join('.');
   window.__diag={shifts:[],resizes:[],steps:[],phase:'load'};
   new PerformanceObserver(list=>{for(const e of list.getEntries())window.__diag.shifts.push({at:e.startTime,value:e.value,recentInput:e.hadRecentInput,path:location.pathname,phase:window.__diag.phase,y:scrollY,sources:(e.sources||[]).map(x=>({node:label(x.node),parent:label(x.node?.parentElement),before:x.previousRect,after:x.currentRect}))});}).observe({type:'layout-shift',buffered:true});
   const seen=new WeakSet();
   const ro=new ResizeObserver(es=>{for(const e of es)window.__diag.resizes.push({at:performance.now(),node:label(e.target),height:e.contentRect.height,phase:window.__diag.phase,y:scrollY});});
   const watch=()=>{for(const n of document.querySelectorAll('.sod29-ad-slot,.adsbygoogle,.f29,.sod29-community-feed,.sod29-posts-library-stage,[data-newsletter-invite]'))if(!seen.has(n)){seen.add(n);ro.observe(n);}};
   new MutationObserver(watch).observe(document,{childList:true,subtree:true});
  },{newsletter:!!s.newsletter,clock:process.env.CLS_FIXED_CLOCK ? Number(process.env.CLS_FIXED_CLOCK) : null});
  if(s.footerControl) await ctx.addInitScript(()=>{
   // A laboratory-only counterfactual. Keep space, withhold the footer paint while taxonomy data is loading.
   const apply=()=>{const style=document.createElement('style');style.textContent='.sod29-root:has(.sod29-posts-library[data-taxonomy-state="loading"]) .f29 {visibility:hidden !important}';document.head.appendChild(style);};
   if(document.head)apply();else document.addEventListener('DOMContentLoaded',apply,{once:true});
  });
  if(s.newsletterControl) await ctx.addInitScript(()=>{
   const apply=()=>{const style=document.createElement('style');style.textContent='@media(max-width:620px){.sod29-root.native-frame .sod29-frame-backdrop:has([data-panel-kind="newsletter"]){align-items:center!important;justify-content:center!important;padding:10px!important}.sod29-root.native-frame .sod29-frame-panel[data-panel-kind="newsletter"]{margin:0!important;height:85dvh!important;max-height:85dvh!important;width:100%!important}}';document.head.appendChild(style);};
   if(document.head)apply();else document.addEventListener('DOMContentLoaded',apply,{once:true});
  });
  const page=await ctx.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',async r=>{if(r.status()>=400){let error=null;try{const b=await r.json();error=String(b.error||b.message||'').slice(0,200);}catch{}responses.push({status:r.status(),path:new URL(r.url()).pathname,error,requestBody:r.request().postData()});}});
  const cdp=await ctx.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  const step=async(name,fn,wait=1200)=>{await page.evaluate(n=>window.__diag.phase=n,name);await fn();await page.waitForTimeout(wait);await page.evaluate(n=>window.__diag.steps.push({name:n,at:performance.now(),y:scrollY,height:document.body.scrollHeight,path:location.pathname}),name);};
  let failure=null,ad=null,spa=null;
  try {
   await page.goto(lab.origin+s.path,{waitUntil:'domcontentloaded',timeout:45000});
   await page.locator('.sod29-root').waitFor({timeout:30000});
   await page.waitForTimeout(s.dataDelay?1000:10000);
   await step('first-scroll',()=>page.evaluate(()=>scrollTo(0,600)),s.dataDelay?8500:2200);
   await step('deeper-scroll',()=>page.evaluate(()=>scrollTo(0,Math.min(1600,document.body.scrollHeight-844))),1800);
   if(s.key==='community'){
    const toggle=page.getByRole('button',{name:'פתיחת תגובות',exact:true}).first();
    if(await toggle.count()) {await step('open-replies',()=>toggle.click(),s.replyDelay?5000:2500);await step('close-replies',()=>page.getByRole('button',{name:'סגירת תגובות',exact:true}).first().click(),1500);}
   }
   if(s.adHeight){
    const slot=page.locator('.sod29-ad-slot').first();
    if(!await slot.count()) throw Error('No real AdSlot in built human fixture');
    await step('ad-in-view',()=>slot.evaluate(n=>scrollTo(0,n.getBoundingClientRect().top+scrollY-240)),1400);
    ad=await slot.evaluate(n=>({before:n.getBoundingClientRect().toJSON(),ins:n.querySelector('ins')?.getBoundingClientRect().toJSON()}));
    // Synthetic third-party resize, deliberately labelled; no ad impression/network call.
    await step('synthetic-ad-resize',()=>slot.evaluate((n,height)=>{const ins=n.querySelector('ins');ins.style.height=height+'px';ins.setAttribute('data-lab-ad-resize','true');},s.adHeight),1800);
    ad.after=await slot.evaluate(n=>n.getBoundingClientRect().toJSON());
   }
   if(s.newsletter){await step('newsletter-wait',async()=>{},12000);await page.screenshot({path:out+'/'+s.id+'.png'});const dismiss=page.getByRole('button',{name:'אולי אחר כך',exact:true});if(await dismiss.count())await step('newsletter-dismiss',()=>dismiss.click(),1500);}
   if(s.spa){
    await step('home-top',()=>page.evaluate(()=>scrollTo(0,0)));
    const link=page.locator('.h29-card-open').first();
    spa={found:await link.count(),href:await link.getAttribute('href')};
    if(spa.found){await step('spa-home-post',()=>link.click(),10000);spa.path=await page.evaluate(()=>location.pathname);await step('spa-post-scroll',()=>page.evaluate(()=>scrollTo(0,700)),2500);await step('spa-back',()=>page.goBack(),3500);}
   }
   if(s.long)await step('long-read',async()=>{},45000);
   await step('near-footer',()=>page.evaluate(()=>scrollTo(0,document.body.scrollHeight-1100)),1800);
   if(s.footerNavigate){
    const link=page.locator('.f29 a[href="'+s.footerNavigate+'"]').first();
    const links=await page.locator('.f29 a').evaluateAll(ns=>ns.map(n=>({href:n.getAttribute('href'),text:n.textContent}))); // local only
    spa={footerLinks:links.map(x=>x.href),expected:s.footerNavigate,found:await link.count()};
    if(!spa.found)throw Error('Requested footer link absent: '+s.footerNavigate);
    await step('footer-forward-navigation',()=>link.click(),8000);
    spa.path=await page.evaluate(()=>location.pathname);
    spa.after=await page.evaluate(()=>({y:scrollY,height:document.body.scrollHeight,viewport:innerHeight,footerY:document.querySelector('.f29')?.getBoundingClientRect().top,headingY:document.querySelector('h1')?.getBoundingClientRect().top}));
   }
   await page.screenshot({path:out+'/'+s.id+'.png'});
  } catch(e) {failure=String(e.message||e);}
  const result=await page.evaluate(()=>{
   function cls(es){let max=0,sum=0,last=0,start=0;for(const e of es.filter(e=>!e.recentInput)){if(e.at-last>=1000||e.at-start>=5000){sum=0;start=e.at;}sum+=e.value;last=e.at;max=Math.max(max,sum);}return max;}
   const d=window.__diag;return{...d,cls:cls(d.shifts),clsByPhase:Object.fromEntries([...new Set(d.shifts.map(e=>e.phase))].map(p=>[p,cls(d.shifts.filter(e=>e.phase===p))])),adSlots:document.querySelectorAll('.sod29-ad-slot').length,newsletter:!!document.querySelector('[data-newsletter-invite]'),article:!!document.querySelector('article[data-experience-surface="post-reading"]'),postCards:document.querySelectorAll('.sod29-library-post-card').length,threads:document.querySelectorAll('.sod29-community-thread').length,href:location.pathname};
  }).catch(()=>null);
  const misses=lab.state.misses.slice(miss0);
  report.rows.push({scenario:s,elapsedMs:Date.now()-started,failure,errors,badResponses:responses,cacheMisses:misses,deniedThirdParty:[...new Set(denied)],localSuppressed:lab.state.supabase.slice(sup0).filter(x=>!x.ok).map(x=>x.p),network:lab.state.supabase.slice(sup0).map(x=>({method:x.m,path:x.p,readable:x.ok})),ad,spa,result});save();
  console.log(JSON.stringify({id:s.id,cls:result?.cls,byPhase:result?.clsByPhase,ads:result?.adSlots,misses:misses.length,errors:errors.length,failure}));
  await ctx.close();
 }
} finally {await browser.close();await lab.close();save();}
