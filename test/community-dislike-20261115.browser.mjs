// Real built Community, SDK and worker; local data/Auth only, never live reactions.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {startFixture} from './helpers/authBrowserFixture.mjs';
const require=createRequire(import.meta.url);
let pw;for(const name of ['playwright','@playwright/test']){try{pw=require(name);break;}catch{}}
assert.ok(pw,'Browser required; never skip Community acceptance');
const executablePath=process.env.CHROMIUM_PATH||process.env.CHROMIUM_EXECUTABLE_PATH;
const id=n=>`11111111-1111-4111-8111-${String(n).padStart(12,'0')}`;
for(const width of [390,1280])for(const viewer of ['guest','member']){
 test(`${width}px ${viewer}: repeatable dislikes, separate likes, reload and failed-write rollback`,{timeout:90000},async()=>{
  const rows=['openweb','community_2029'].map((origin,i)=>({id:id(i+1),origin,parent_id:null,author_name:'בודק תגובות',title:null,body:'הודעת בדיקה לספירת תגובות',created_at:'2026-11-12T12:00:00Z',is_deleted:false,total_count:2,reactions:{likes:27,dislikes:8,'👍':['v:old'],community_likes:2,community_dislikes:3}}));
  const received=[];let fail=false,viewerId;
  const fixture=await startFixture({supabase:({url,headers,body})=>{
   if(url.pathname==='/rest/v1/users'){const user=viewerId?{id:viewerId,role:'member',display_name:'בודק'}:null;return {body:headers.accept?.includes('application/vnd.pgrst.object+json')?user:user?[user]:[]};}
   if(url.pathname==='/rest/v1/rpc/community_feed_page')return {body:rows};
   if(url.pathname==='/rest/v1/rpc/community_thread_updates')return {body:JSON.parse(body).p_cursors.map(c=>({root_id:c.root_id,new_count:0,first_reply_id:null,first_path:null}))};
   if(url.pathname==='/rest/v1/rpc/community_message_context')return {body:rows.filter(r=>r.id===JSON.parse(body).p_id)};
   if(url.pathname==='/rest/v1/rpc/toggle_contribution_reaction'){
    const args=JSON.parse(body);received.push(args);
    if(fail)return {status:503,body:{message:'synthetic write unavailable'}};
    const row=rows.find(r=>r.id===args.p_id),key=args.p_emoji==='👎'?'community_dislikes':'community_likes';
    assert.equal(args.p_visitor,args.p_emoji==='👎'?'community-repeatable-dislike':'community-repeatable-like');
    row.reactions={...row.reactions,[key]:row.reactions[key]+1};return {body:row.reactions};
   }
   return null;
  }});
  const browser=await pw.chromium.launch({executablePath,headless:true,args:fixture.chromiumArgs,env:fixture.browserEnv});
  try{
   const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width,height:900},locale:'he-IL',serviceWorkers:'allow'});
   // This suite tests reactions; the invitation has its own independent acceptance.
   await context.addInitScript(()=>localStorage.setItem('sod_legacy_newsletter_invite_until',String(Date.now()+86400000)));
   if(viewer==='member'){
    const user=fixture.auth.newUser('reaction.member@example.invalid',true,'fixture-password');viewerId=user.id;
    const response=await fixture.auth.handle(new Request('https://linswmnnkjxvweumprav.supabase.co/auth/v1/token?grant_type=password',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:user.email,password:'fixture-password'})}));
    assert.equal(response.status,200);const session=await response.json();
    await context.addInitScript(session=>localStorage.setItem('sb-linswmnnkjxvweumprav-auth-token',JSON.stringify(session)),session);
   }
   const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto(fixture.origin+'/community/chat',{waitUntil:'domcontentloaded'});
   const dislikes=page.getByRole('button',{name:'הוסף דיסלייק',exact:true});
   const likes=page.getByRole('button',{name:'הוסף לייק',exact:true});
   await dislikes.first().waitFor({timeout:20000});assert.equal(await dislikes.count(),2);
   for(let i=0;i<2;i++){
    assert.equal((await dislikes.nth(i).innerText()).trim(),'11');assert.equal((await likes.nth(i).innerText()).trim(),'30');
    assert.equal(await dislikes.nth(i).getAttribute('aria-pressed'),null,'additive counter has no selected/toggled state');
    const a=await likes.nth(i).boundingBox(),b=await dislikes.nth(i).boundingBox();
    assert.ok(Math.abs(a.y-b.y)<2&&Math.abs(a.x-b.x)<120,'like and dislike are adjacent, on one row');
    for(let j=1;j<=3;j++){
     await dislikes.nth(i).click();
     await page.waitForFunction(({i,n})=>{const b=document.querySelectorAll('button[aria-label="הוסף דיסלייק"]')[i];return b&&!b.disabled&&b.textContent.trim()===String(n);},{i,n:11+j});
    }
    assert.equal((await likes.nth(i).innerText()).trim(),'30','dislikes never subtract likes');
    await likes.nth(i).click();
    await page.waitForFunction(i=>{const b=document.querySelectorAll('button[aria-label="הוסף לייק"]')[i];return b&&!b.disabled&&b.textContent.trim()==='31';},i);
    assert.equal((await dislikes.nth(i).innerText()).trim(),'14');
   }
   assert.equal(received.length,8,'every accepted click reaches the existing RPC');
   for(const row of rows){assert.equal(row.reactions.likes,27);assert.equal(row.reactions.dislikes,8);assert.deepEqual(row.reactions['👍'],['v:old']);}
   await page.reload({waitUntil:'domcontentloaded'});await dislikes.first().waitFor({timeout:20000});
   assert.equal((await dislikes.first().innerText()).trim(),'14');assert.equal((await likes.first().innerText()).trim(),'31');
   fail=true;await dislikes.first().click();await page.getByRole('alert').filter({hasText:'לא נשמרה התגובה'}).waitFor();
   assert.equal((await dislikes.first().innerText()).trim(),'14','failed optimistic increment is undone');
   assert.equal((await likes.first().innerText()).trim(),'31');assert.equal(received.length,9);
   assert.equal(rows[0].reactions.community_dislikes,6,'failed request never persisted');
   fail=false;await dislikes.first().click();
   await page.waitForFunction(()=>{const b=document.querySelector('button[aria-label="הוסף דיסלייק"]');return b&&!b.disabled&&b.textContent.trim()==='15';});
   assert.equal(await page.getByRole('alert').filter({hasText:'לא נשמרה התגובה'}).count(),0,'successful retry clears feedback');
   if(viewer==='member')assert.ok(fixture.auth.log.some(r=>r.path==='/user'&&r.status===200),'member session actually verified');
   assert.deepEqual(errors,[]);await context.close();
  }finally{await browser.close();await fixture.close();}
 });
}
