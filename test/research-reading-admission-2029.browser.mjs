import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {startFixture} from './helpers/authBrowserFixture.mjs';
import {emptyResearchState,applyResearchOps} from '../src/lib/research/researchSyncState.js';
const {chromium}=createRequire(import.meta.url)('playwright');
function installProbe(){window.researchProbe=()=>{const el=document.querySelector('.sod29-root');let f=el?.[Object.keys(el).find(k=>k.startsWith('__reactFiber$'))];for(;f;f=f.return){const v=f.memoizedProps?.value;if(v&&typeof v.saveItem==='function'&&typeof v.setResearchContext==='function')return v;}return null;};}
test('reading has no research cloud work; workspace admission preserves return context; personal save starts only on action',{timeout:60000},async()=>{
 let snapshots=0,writes=0,state=emptyResearchState(),revision=0;
 const fx=await startFixture({supabase:async({url,body})=>{
  if(url.pathname==='/rest/v1/users')return {body:{id:url.searchParams.get('id')?.slice(3),role:'admin',tier:'member'}};
  if(url.pathname.endsWith('/research_state_snapshot_v1')){snapshots++;return {body:{...state,revision}};}
  if(url.pathname.endsWith('/research_state_apply_ops_v1')){writes++;const q=JSON.parse(body);state=applyResearchOps(state,q.p_ops);revision++;return {body:{ok:true,batch_id:q.p_batch_id,applied_revision:revision,snapshot:{...state,revision}}};}
  return null;
 }});
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:fx.chromiumArgs,env:fx.browserEnv});
 try{const c=await browser.newContext({ignoreHTTPSErrors:true});await c.addInitScript(installProbe);const p=await c.newPage();const email='research.lazy@example.invalid';fx.auth.newUser(email,true);
 await p.goto(fx.origin+'/login?returnTo=%2F');await p.getByRole('textbox',{name:'כתובת מייל'}).fill(email);await p.getByRole('button',{name:'שלחו לי קוד כניסה'}).click();await p.getByRole('textbox',{name:'קוד כניסה מהמייל'}).fill(fx.auth.lastCode(email));await p.getByRole('button',{name:/כניסה לחשבון/}).click();await p.waitForURL(u=>u.pathname==='/');await p.waitForFunction(()=>researchProbe()?.syncStatus==='local_only');await p.waitForTimeout(400);assert.equal(snapshots,0);assert.equal(writes,0);
 const nav=async path=>{await p.evaluate(path=>{history.pushState({},'',path);dispatchEvent(new PopStateEvent('popstate'));},path);await p.waitForFunction(()=>!!researchProbe());};
 const workspaceSnapshot=p.waitForResponse(r=>r.url().includes('/research_state_snapshot_v1')&&r.status()===200);
 await nav('/world');await workspaceSnapshot;await p.waitForFunction(()=>researchProbe()?.researchWorkspaceActive===true&&['synced','pending'].includes(researchProbe()?.syncStatus),null,{timeout:7000}).catch(async e=>{console.log('workspace',snapshots,await p.evaluate(()=>({status:researchProbe()?.syncStatus,active:researchProbe()?.researchWorkspaceActive,available:researchProbe()?.researchActionsAvailable})));throw e;});assert.ok(snapshots>0);
 await p.evaluate(()=>researchProbe().setResearchContext({subject:{id:'26',type:'number',label:'26',href:'/number/26'},returnTo:{href:'/world?focus=26',label:'העולם'}}));
 await nav('/post/fixture-absent');await p.waitForFunction(()=>researchProbe()?.researchWorkspaceActive===false&&researchProbe()?.syncStatus==='local_only');
 assert.equal(await p.evaluate(()=>researchProbe().context?.returnTo?.href),'/world?focus=26');const before=snapshots;await p.waitForTimeout(500);assert.equal(snapshots,before);assert.equal(writes,0);
 assert.equal(await p.evaluate(()=>researchProbe().addToResearch({id:'26',type:'number'})),false);
 assert.equal(await p.evaluate(()=>researchProbe().saveItem({id:'26',type:'number',title:'26',href:'/number/26'})),true);
 await p.waitForFunction(()=>researchProbe()?.syncStatus==='synced'&&researchProbe()?.syncPending===0);assert.ok(writes>0);assert.equal(await p.evaluate(()=>researchProbe().saved.length),1);
 }finally{await browser.close();await fx.close();}
});
