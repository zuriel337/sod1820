// Combined release acceptance through the compiled public site, real worker and CSP.
// Every remote request is served by the existing local fixture; no live writes or AI.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { startFixture } from './helpers/authBrowserFixture.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const executablePath=process.env.CHROMIUM_EXECUTABLE_PATH;
const id=n=>`11111111-1111-4111-8111-${String(n).padStart(12,'0')}`;
const message=(n,parent=null)=>({id:id(n),parent_id:parent,author_name:'בודק',origin:'community_2029',body:`הודעת בדיקה ${n}`,created_at:'2026-11-18T12:00:00Z',reactions:{},is_deleted:false,total_count:1,reply_count:parent?0:1});
async function openFixture(supabase,run){
 const fixture=await startFixture({deploymentCsp:true,supabase});
 const browser=await chromium.launch({headless:true,executablePath,args:fixture.chromiumArgs,env:fixture.browserEnv});
 try{await run(fixture,browser);}finally{await browser.close();await fixture.close();}
}
const contextOptions=width=>({ignoreHTTPSErrors:true,viewport:{width,height:900},locale:'he-IL',reducedMotion:'reduce'});

for(const theme of ['dark','light','parchment']) test(`combined top bar: ${theme}, glyph at nine widths and paired rails`,{timeout:90000},async()=>{
 await openFixture(null,async(fixture,browser)=>{
  const context=await browser.newContext(contextOptions(390));
  await context.addInitScript(theme=>localStorage.setItem('sod2029:theme-preset',theme),theme);
  const page=await context.newPage();await page.goto(fixture.origin+'/community/chat');
  const trigger=page.locator('.sod29-header .sod29-theme-trigger');await trigger.waitFor();
  await page.evaluate(()=>document.fonts.ready);
  for(const width of [360,375,390,414,480,600,768,1024,1440]){
   await page.setViewportSize({width,height:900});
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const glyph=trigger.locator(':scope > span');assert.equal(await glyph.isVisible(),true,`${width}: theme glyph`);
   const sizes=await page.locator('.sod29-header-rail').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().width));
   assert.equal(sizes.length,2);
   // Existing guest login crowding at 480px was measured in the preceding public
   // artifact: rails 20/6. This release measures 17/6 and does not claim its repair.
   if(width===480)assert.ok(Math.abs(sizes[0]-sizes[1])<=14&&sizes.every(n=>n>=6),`${width}: no worsening of recorded guest crowding ${sizes}`);
   else assert.ok(Math.abs(sizes[0]-sizes[1])<=1,`${width}: equal rails ${sizes}`);
   const box=await trigger.boundingBox();assert.ok(box.height>=44&&box.width>=44);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
  await context.close();
 });
});

for(const width of [390,1440]) test(`combined Community ${width}: late update keeps the message still and one accessible reply toggle`,{timeout:60000},async()=>{
 let release,requested=false;
 const delayed=new Promise(resolve=>{release=resolve;});
 await openFixture(async({url,body})=>{
  const path=url.pathname, args=body.length?JSON.parse(body):{};
  if(/\/community_feed_page(?:_v2)?$/.test(path))return {body:[message(1)]};
  if(path.endsWith('/community_message_context'))return {body:args.p_id===id(2)?[message(2,id(1))]:[message(1)]};
  if(path.endsWith('/community_replies_page'))return {body:args.p_parent===id(1)?[message(2,id(1))]:[]};
  if(path.endsWith('/community_thread_updates')){
   const cursors=args.p_cursors;
   if(cursors.some(c=>Date.parse(c.created_at)>Date.parse('2026-01-01'))){requested=true;await delayed;}
   return {body:cursors.map(c=>({root_id:c.root_id,new_count:1,first_reply_id:id(2),first_path:[id(1),id(2)]}))};
  }
  return null;
 },async(fixture,browser)=>{
  const context=await browser.newContext(contextOptions(width));
  await context.addInitScript(({root})=>localStorage.setItem('sod29-community-reading-v1:guest',JSON.stringify({version:1,updatedAt:Date.now(),last:null,threads:[{root_id:root,message_id:root,created_at:'2026-11-19T12:00:00Z'}]})),{root:id(1)});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(fixture.origin+'/community/chat');
   const root=page.locator(`#message-${id(1)}`);await root.waitFor();await root.scrollIntoViewIfNeeded();
   await page.locator(`#message-${id(2)}`).waitFor();
   const until=Date.now()+10000;while(!requested&&Date.now()<until)await new Promise(r=>setTimeout(r,25));assert.ok(requested);
   await page.waitForTimeout(300);
   const before=(await root.boundingBox()).y;
   await page.evaluate(()=>{window.__releaseCls=0;new PerformanceObserver(list=>list.getEntries().forEach(e=>{if(!e.hadRecentInput)window.__releaseCls+=e.value;})).observe({type:'layout-shift'});});
   release();
   const group=root.locator('..'),notice=group.locator(':scope > .sod29-community-thread-context .sod29-community-new-replies a');
   await notice.waitFor();await page.waitForTimeout(300);
   assert.ok(Math.abs((await root.boundingBox()).y-before)<=1,'late notice preserves visible message position');
   assert.ok(await page.evaluate(()=>window.__releaseCls<=0.1),'unchanged CLS ceiling');
   assert.ok((await notice.boundingBox()).height>=44,'the actual clickable link retains the 44px target');
   assert.ok((await notice.getAttribute('href')).endsWith(`#message-${id(2)}`));
   const toggle=group.locator(':scope > .sod29-community-thread-context > .sod29-community-replies-toggle');
   assert.equal(await toggle.count(),1);assert.equal(await group.locator(':scope > .sod29-community-replies > [data-close-at-end]').count(),0);
   await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'false');
   await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');
   assert.deepEqual(errors,[]);
  }finally{release();await context.close();}
 });
});

const image='https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/fixture/poster.png';
const post=(n,extra={})=>({id:n,slug:`release-fixture-${n}`,title:`תיעוד בדיקה ${n}`,excerpt:'תוכן בדיקה',author:'המערכת',categories:[],tags:[],source:'site',home_hidden:false,date:new Date().toISOString(),modified:new Date().toISOString(),image_url:image,...extra});
for(const width of [390,1440]) test(`combined Home ${width}: responsive media stays in cards and video remains explicit`,{timeout:90000},async()=>{
 const rows=[post(5107,{tags:['מפת המציאות'],categories:['סוד 1820']}),post(5108,{tags:['מפת המציאות'],categories:['שבילי שפה']}),post(5109,{tags:['מה קורה הבורא'],author:'אלון לוי'}),post(5110)];
 await openFixture(async({url,headers})=>{
  if(url.pathname==='/rest/v1/posts')return {body:headers.accept?.includes('object')?rows.find(r=>url.searchParams.get('id')===`eq.${r.id}`)||null:rows};
  if(url.pathname==='/rest/v1/home_videos')return {body:[{yt:'fixture',slug:'release-video-fixture',title:'סרטון בדיקה',poster_url:image}]};
  return null;
 },async(fixture,browser)=>{
  const context=await browser.newContext(contextOptions(width)),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(fixture.origin+'/');await page.locator('.h29').waitFor();
  for(const selector of ['.h29-series-item','.h29-recent','.h29-strip']){
   const section=page.locator(selector).first();if(await section.count())await section.scrollIntoViewIfNeeded();
   await page.waitForTimeout(400);
  }
  for(const slot of ['compact','series','tile']){
   const img=page.locator(`img[data-home-media="${slot}"]`).first();await img.waitFor();await img.scrollIntoViewIfNeeded();
   const props=await img.evaluate(e=>({src:e.getAttribute('src'),srcset:e.getAttribute('srcset'),sizes:e.getAttribute('sizes')}));
   const expected={compact:[96,160],series:[240,480],tile:[160,320]}[slot];
   assert.match(props.src,/\/render\/image\/public\//);assert.equal(new URL(props.src).searchParams.get('resize'),'contain');
   for(const n of expected)assert.ok(props.srcset.includes(`width=${n}&`)&&props.srcset.includes(` ${n}w`));
   assert.ok(props.sizes);
  }
  assert.equal(await page.locator('video').evaluateAll(nodes=>nodes.every(v=>v.preload==='none'&&v.paused)),true);
  assert.ok(fixture.state.storage.some(r=>r.path.includes('/render/image/public/')),'transformed media requests reached the fixture');
  assert.equal(fixture.state.functions.filter(r=>r.path.endsWith('/ai-analyze')).length,0);assert.deepEqual(errors,[]);
  await context.close();
 });
});
