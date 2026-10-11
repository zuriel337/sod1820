// Synthetic component integration; never connects to a live account or database.
// PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node test/life-journey-browser.mjs
import { createServer, transformWithOxc } from 'vite';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const mock = `
import React from 'react';
const ref='person:synthetic-owner:self';
const fixture=window.__life={user:{id:'synthetic-user'},members:[{source_ref:ref,name:'אור שלום',meta:{first_name:'אור',surname:'שלום',birthdate_iso:'2000-01-01'}}],relations:[],calls:[],saved:[],failName:false,failList:false,failRelation:false,delay:0,context:null};
let rerender=()=>{};
export function useAuth(){return {user:fixture.user,loading:false};}
export function useResearch(){return {context:fixture.context,pathResume:{latest:fixture.latest},setResearchContext(ctx){fixture.context=ctx;rerender(v=>v+1);},async saveCurrentResearchPath(){fixture.saved.push(fixture.context);fixture.latest={path_id:'synthetic-path',representation:{context:fixture.context}};rerender(v=>v+1);return {ok:true};},async resumeResearchPath(){return {ok:true,context:fixture.latest.representation.context};}};}
export function Watch({children}){const [,set]=React.useState(0);rerender=set;fixture.update=()=>set(v=>v+1);return children;}
export async function getOrCreateMyPersonId(){return 'synthetic-owner';}
export async function listFamily(){if(fixture.failList)throw Error('list failed');return {members:structuredClone(fixture.members),relations:fixture.relations};}
export async function upsertSelfProfile(owner,name,meta){const row={source_ref:ref,name,meta};fixture.members=fixture.members.filter(m=>m.source_ref!==ref).concat(row);return row;}
export async function upsertFamilyMember(owner,suffix,name,meta){fixture.calls.push(['member',suffix]);const row={source_ref:'person:'+owner+':p:'+suffix,name,meta};fixture.members=fixture.members.filter(m=>m.source_ref!==row.source_ref).concat(row);return row;}
export async function upsertFamilyRelation(owner,parent,child){if(fixture.failRelation)throw Error('relation failed');fixture.relations.push({source_ref:'relation:'+parent+child,parent_ref:parent,child_ref:child});return {};}
export function track(){}
export const supabase={rpc:async(fn,args)=>{fixture.calls.push([fn,args]);if(fixture.delay)await new Promise(r=>setTimeout(r,fixture.delay));if(fn==='fn_name_research_graded')return fixture.failName?{data:null,error:{message:'synthetic'}}:{data:{graded:true,combo:{tracks:[{id:'literal',label:'ביטוי במקור',status:'ok',sample:{ref:'בראשית א:ג',text:'יהי אור'}}]},sources:[]}};if(fn==='fn_all_methods')return {data:{רגיל:583,סידורי:79,מהמאגר:false}};return {data:{meeting_points:[]}};},functions:{invoke:async(fn,{body})=>{fixture.calls.push([fn,body]);return {data:{result:{contract:'els_search_page_v1',status:'EXECUTED_EMPTY',input:{normalized:'אורשלום'},corpus_id:'torah',completion:{executed:true,returned_hits:0},hits:[]}}};}}};
`;
const entry = `
import React from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter,Routes,Route,Link} from 'react-router-dom';
import PersonJourney from '/src/components/PersonJourney.jsx';import {Watch} from '__life_mock';
function App(){const [,tick]=React.useState(0);window.__life.remount=()=>tick(v=>v+1);return <Watch><MemoryRouter initialEntries={['/2029/journey']}><Routes><Route path='/2029/journey' element={<PersonJourney variant='2029'/>}/><Route path='/2029/number/:value' element={<div><h1>מספר לבדיקה</h1><Link to='/2029/journey'>חזרה למסע החיים</Link></div>}/></Routes></MemoryRouter></Watch>}
createRoot(document.getElementById('root')).render(<App/>);
`;
const server=await createServer({configFile:false,root:process.cwd(),server:{port:0,host:'127.0.0.1'},plugins:[{
 name:'synthetic-life-only',enforce:'pre',
 resolveId(id){if(id==='__life_entry')return '\0life-entry.jsx';if(id==='__life_mock'||/(?:AuthContext\.jsx|ResearchProvider\.jsx|supabase\.js|tracking\.js)$/.test(id))return '\0life-mock.jsx';},
 async load(id){if(id==='\0life-entry.jsx'||id==='\0life-mock.jsx')return (await transformWithOxc(id==='\0life-entry.jsx'?entry:mock,'fixture.jsx',{lang:'jsx',jsx:{runtime:'automatic'}})).code;},
 configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url!=='/__life_test')return next();res.setHeader('Content-Type','text/html');res.end(`<html lang="he" dir="rtl"><style>:root{--ink:#f1f4ff;--muted:#c5cee5;--bg:#142243;--line:#536381;--accent:#a4b5ff}body{margin:16px;background:var(--bg);font-family:Arial}*{box-sizing:border-box}</style><div id="root"></div><script type="module" src="/@id/__life_entry"></script></html>`);});}
}]});
await server.listen();
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__life_test`);
 await page.getByRole('button',{name:'המשך למחקר על עצמי',exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>window.__life.calls.length),0,'mount must not run engines');
 await page.getByRole('button',{name:'הוסף בן משפחה',exact:true}).click();
 await page.getByRole('button',{name:'סגור את הטופס',exact:true}).click();
 await page.getByRole('button',{name:'המשך למחקר על עצמי',exact:true}).click();
 await page.getByRole('heading',{name:'תוצאות המחקר על אור שלום',exact:true}).waitFor();
 await page.getByRole('button',{name:'שמור מסלול פרטי להמשך',exact:true}).click();
 await page.getByText('המסלול נשמר בחשבון שלך.',{exact:false}).waitFor();
 const saved=await page.evaluate(()=>JSON.stringify(window.__life.saved));
 assert.ok(!saved.includes('אור')&&!saved.includes('2000-01-01'));
 await page.getByRole('button',{name:'רגיל 583 המשך למספר',exact:true}).click();
 await page.getByRole('heading',{name:'מספר לבדיקה'}).waitFor();
 await page.getByRole('link',{name:'חזרה למסע החיים'}).click();
 await page.getByRole('button',{name:'חדש את המסלול השמור'}).click();
 await page.getByRole('heading',{name:'תוצאות המחקר על אור שלום',exact:true}).waitFor();
 // A failed name engine must leave numeric research usable.
 await page.evaluate(()=>window.__life.failName=true);
 await page.getByRole('button',{name:'המשך למחקר על עצמי',exact:true}).click();
 await page.locator('[data-engine=name] [role=alert]').waitFor();
 assert.equal(await page.locator('[data-engine=methods]').getByRole('button').count(),2);
 await page.evaluate(()=>window.__life.failName=false);
 // Add three relatives; optional form closes and self remains available.
 for(const name of ['טל בדיקה','שחר בדיקה','גל בדיקה']){
  await page.getByRole('button',{name:'הוסף בן משפחה',exact:true}).click();
  await page.getByLabel('שם בן/בת משפחה',{exact:true}).fill(name);
  await page.getByRole('button',{name:'שמור בן משפחה',exact:true}).click();
  await page.getByText('הפרטים נשמרו.',{exact:false}).waitFor();
 }
 assert.equal(await page.locator('.person-journey-family-list article').count(),3);
 await page.locator('.person-journey-family-list article').first().getByRole('button').click();
 await page.getByLabel('שם בן/בת משפחה',{exact:true}).fill('טל ערוך');
 await page.getByRole('button',{name:'שמור את השינויים'}).click();
 await page.locator('.person-journey-family-list').getByText('טל ערוך',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>window.__life.members.length),4,'edit must not duplicate');
 // Retry the relation failure using the same member suffix.
 await page.getByRole('button',{name:'הוסף בן משפחה',exact:true}).click();
 await page.getByLabel('שם בן/בת משפחה',{exact:true}).fill('ניסוי קשר');
 await page.getByLabel('הוסף קשר אליי (רשות)',{exact:true}).selectOption('parent_of_me');
 await page.evaluate(()=>window.__life.failRelation=true);
 await page.getByRole('button',{name:'שמור בן משפחה',exact:true}).click();
 await page.getByText('האדם נשמר, אך',{exact:false}).waitFor();
 await page.evaluate(()=>window.__life.failRelation=false);
 await page.getByRole('button',{name:'שמור את השינויים'}).click();
 await page.getByText('הפרטים נשמרו.',{exact:false}).waitFor();
 assert.equal(await page.evaluate(()=>window.__life.members.length),5,'retry must not duplicate');
 // Refresh failure also retains the draft's stable identity for a retry.
 await page.getByRole('button',{name:'הוסף בן משפחה',exact:true}).click();
 await page.getByLabel('שם בן/בת משפחה',{exact:true}).fill('בדיקת רענון');
 await page.evaluate(()=>window.__life.failList=true);
 await page.getByRole('button',{name:'שמור בן משפחה',exact:true}).click();
 await page.getByText('האדם נשמר, אך',{exact:false}).waitFor();
 await page.evaluate(()=>window.__life.failList=false);
 await page.getByRole('button',{name:'שמור את השינויים'}).click();
 await page.getByText('הפרטים נשמרו.',{exact:false}).waitFor();
 assert.equal(await page.evaluate(()=>window.__life.members.length),6);
 // A duplicate name requires an explicit choice and cannot silently add another person.
 await page.getByRole('button',{name:'הוסף בן משפחה',exact:true}).click();
 await page.getByLabel('שם בן/בת משפחה',{exact:true}).fill('טל ערוך');
 await page.getByRole('button',{name:'שמור בן משפחה',exact:true}).click();
 await page.getByText('השם כבר מופיע ברשימה.',{exact:false}).waitFor();
 assert.equal(await page.evaluate(()=>window.__life.members.length),6);
 await page.getByRole('button',{name:'ביטול',exact:true}).click();
 // All five engines, including bridge gating contract; mobile containment.
 await page.getByRole('checkbox',{name:'הצלבה עם המשפחה',exact:false}).check();
 await page.getByRole('checkbox',{name:'טל ערוך',exact:true}).check();
 await page.getByRole('checkbox',{name:'דילוגי אותיות',exact:false}).check();
 await page.getByRole('button',{name:'המשך למחקר על עצמי',exact:true}).click();
 await page.locator('[data-engine=els]').getByText('0 מופעים מוצגים',{exact:false}).waitFor();
 assert.equal(await page.locator('.life-engine-result').count(),5);
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile overflow');
 await page.screenshot({path:'/tmp/life-journey-mobile.png',fullPage:true});
 // Cancel a pending run; late results cannot return.
 await page.evaluate(()=>window.__life.delay=400);
 await page.getByRole('button',{name:'המשך למחקר על עצמי',exact:true}).click();
 await page.getByRole('button',{name:'עצור בדיקה',exact:true}).click();
 await page.waitForTimeout(500);
 assert.equal(await page.locator('[data-engine=methods] button').count(),0);
 // Account change must remove private content even when an old request completes late.
 await page.getByRole('button',{name:'המשך למחקר על עצמי',exact:true}).click();
 await page.evaluate(()=>{window.__life.user=null;window.__life.remount();});
 await page.getByRole('heading',{name:'מסע החיים הוא מרחב פרטי'}).waitFor();
 await page.waitForTimeout(500);
 assert.equal(await page.getByText('אור שלום',{exact:false}).count(),0);
 assert.deepEqual(errors,[]);
 console.log('PASS: optional family, five engines, private save/resume, numeric return, failure, edit/retry, cancellation, mobile');
}finally{await browser.close();await server.close();}
