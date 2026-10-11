// Synthetic component integration; never connects to a live account or database.
// PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node test/life-journey-browser.mjs
import { createServer, transformWithOxc } from 'vite';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const mock = `
import React from 'react';
const ref='person:11111111-1111-4111-8111-111111111111:self';
const fixture=window.__life={user:{id:'synthetic-user'},members:[{source_ref:ref,name:'אור שלום',meta:{first_name:'אור',surname:'שלום',birthdate_iso:'2000-01-01'}}],relations:[],calls:[],saved:[],failName:false,failList:false,failRelation:false,delay:0,context:null,events:[],failEvent:false,failAi:false};
let rerender=()=>{};
export function useAuth(){return {user:fixture.user,loading:false};}
export function useResearch(){return {context:fixture.context,pathResume:{latest:fixture.latest},setResearchContext(ctx){fixture.context=ctx;rerender(v=>v+1);},async saveCurrentResearchPath(){fixture.saved.push(fixture.context);fixture.latest={path_id:'synthetic-path',revision_no:fixture.saved.length,representation:{context:fixture.context}};rerender(v=>v+1);return {ok:true};},async resumeResearchPath(){return {ok:true,context:fixture.latest.representation.context};}};}
export function Watch({children}){const [,set]=React.useState(0);rerender=set;fixture.update=()=>set(v=>v+1);return children;}
export async function getOrCreateMyPersonId(){return '11111111-1111-4111-8111-111111111111';}
export async function listFamily(){if(fixture.failList)throw Error('list failed');return {members:structuredClone(fixture.members),relations:fixture.relations};}
export async function upsertSelfProfile(owner,name,meta){const row={source_ref:ref,name,meta};fixture.members=fixture.members.filter(m=>m.source_ref!==ref).concat(row);return row;}
export async function upsertFamilyMember(owner,suffix,name,meta){fixture.calls.push(['member',suffix]);const row={source_ref:'person:'+owner+':p:'+suffix,name,meta};fixture.members=fixture.members.filter(m=>m.source_ref!==row.source_ref).concat(row);return row;}
export async function upsertFamilyRelation(owner,parent,child){if(fixture.failRelation)throw Error('relation failed');fixture.relations.push({source_ref:'relation:'+parent+child,parent_ref:parent,child_ref:child});return {};}
export function track(){}
export const supabase={rpc:async(fn,args)=>{fixture.calls.push([fn,args]);
if(fn==='fn_list_family')return {data:{members:structuredClone(fixture.members)}};
if(fn==='fn_person_life_input_v1'){const m=fixture.members.find(m=>m.source_ref===args.p_person_ref);return m?{data:{ok:true,person:{ref:m.source_ref,first:m.meta?.first_name||m.name.split(' ')[0],surname:m.meta?.surname||m.name.split(' ').slice(1).join(' '),name:m.name,birthdate:m.meta?.birthdate_iso||''}}}:{error:{message:'LIFE_PERSON_UNAVAILABLE'}};}
if(fn==='fn_person_life_paths_v1')return {data:{ok:true,page_size:20,has_more:false,items:fixture.latest?[{path_id:fixture.latest.path_id,updated_at:'2026-10-11T12:00:00Z',person_ref:ref}]:[]}};
if(fn==='fn_person_life_events_v1')return {data:{ok:true,page_size:20,has_more:false,items:fixture.events.filter(e=>!args.p_event_id||e.event_id===args.p_event_id)}};
if(fn==='fn_person_life_event_record_v1'){
 const old=fixture.events.find(e=>e.event_id===args.p_event_id);
 if(old?.request_id===args.p_request_id)return {data:{ok:true,revision:old.revision}};
 if((old?.revision||0)!==args.p_expected_revision)return {data:{ok:false,error:'revision_conflict',revision:old.revision}};
 const item={event_id:args.p_event_id,request_id:args.p_request_id,record_id:args.p_request_id,recorded_at:'2026-10-11T12:00:00Z',revision:args.p_expected_revision+1,input:{title:args.p_title,occurred_on:args.p_occurred_on,person_ref:args.p_person_ref,notes:args.p_notes}};
 fixture.events=fixture.events.filter(e=>e.event_id!==item.event_id).concat(item);
 if(fixture.failEvent){fixture.failEvent=false;return {data:null,error:{message:'lost response'}};}
 return {data:{ok:true,revision:item.revision}};
}
if(fn==='fn_tarot_sos')return {data:{tarot:{cards:['המצב','האתגר','העצה'].map((position,i)=>({position,n:i+1,arcana:'קלף בדיקה',meaning:'השראה בלבד'}))}}};
if(fixture.delay)await new Promise(r=>setTimeout(r,fixture.delay));if(fn==='fn_name_research_graded')return fixture.failName?{data:null,error:{message:'synthetic'}}:{data:{graded:true,combo:{tracks:[{id:'combo_gem',status:'ok',value:583,words:['אור','שלום']},{id:'literal',label:'ביטוי במקור',status:'ok',sample:{ref:'בראשית א:ג',text:'יהי אור'}}]},sources:[]}};if(fn==='fn_all_methods')return {data:{רגיל:583,סידורי:79,מהמאגר:false}};return {data:{meeting_points:[]}};},functions:{invoke:async(fn,{body})=>{fixture.calls.push([fn,body]);if(fn==='ai-analyze')return fixture.failAi?{data:{error:'quota'}}:{data:{reflection_interpretation:{message:'מסר פרשני לבדיקה',motifs:[]}}};return {data:{result:{contract:'els_search_page_v1',status:'EXECUTED_EMPTY',input:{normalized:'אורשלום'},corpus_id:'torah',completion:{executed:true,returned_hits:0},hits:[]}}};}}};
`;
const entry = `
import React from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter,Routes,Route,Link,useNavigate} from 'react-router-dom';
import PersonJourney from '/src/components/PersonJourney.jsx';import {Watch,useResearch,supabase} from '__life_mock';
import {lifeAdvancedElsRequest,readLifePersonInput} from '/src/lib/research/lifeJourneyResearch.js';
function ElsLanding(){const research=useResearch(),navigate=useNavigate(),request=lifeAdvancedElsRequest(research.context);const [term,setTerm]=React.useState('');React.useEffect(()=>{if(request)readLifePersonInput(supabase,request.ownerId,request.personRef,'research').then(person=>setTerm(person.name));},[request?.personRef]);return <div><h1>מחקר צופן מתקדם</h1><p data-life-els-seed={term}>{term}</p><button onClick={()=>{const c=research.context;research.setResearchContext({...c.returnTo,access:{scope:'private',tier:'personal'},returnTo:null});navigate('/2029/journey');}}>חזרה למסע החיים</button></div>}
function App(){const [,tick]=React.useState(0);window.__life.remount=()=>tick(v=>v+1);return <Watch><MemoryRouter initialEntries={['/2029/journey']}><Routes><Route path='/2029/journey' element={<PersonJourney variant='2029'/>}/><Route path='/els' element={<ElsLanding/>}/><Route path='/2029/number/:value' element={<div><h1>מספר לבדיקה</h1><Link to='/2029/journey'>חזרה למסע החיים</Link></div>}/></Routes></MemoryRouter></Watch>}
createRoot(document.getElementById('root')).render(<App/>);
`;
const server=await createServer({configFile:false,root:process.cwd(),server:{port:0,host:'127.0.0.1'},plugins:[{
 name:'synthetic-life-only',enforce:'pre',
 resolveId(id){if(id==='__life_entry')return '\0life-entry.jsx';if(id==='__life_mock'||/(?:AuthContext\.jsx|ResearchProvider\.jsx|supabase\.js|tracking\.js)$/.test(id))return '\0life-mock.jsx';},
 async load(id){if(id==='\0life-entry.jsx'||id==='\0life-mock.jsx')return (await transformWithOxc(id==='\0life-entry.jsx'?entry:mock,'fixture.jsx',{lang:'jsx',jsx:{runtime:'automatic'}})).code;},
 configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url!=='/__life_test')return next();res.setHeader('Content-Type','text/html');res.end(`<html lang="he" dir="rtl"><style>:root{--ink:#f1f4ff;--muted:#c5cee5;--bg:#142243;--line:#536381;--accent:#a4b5ff}body{margin:16px;background:var(--bg);font-family:Arial}*{box-sizing:border-box}</style><div id="root"></div><script type="module" src="/@id/__life_entry"></script></html>`);});}
}]});
await server.listen();
const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__life_test`);
 await page.getByRole('button',{name:'המשך למחקר על עצמי',exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>window.__life.calls.filter(([fn])=>['fn_name_research_graded','fn_all_methods','ai-analyze'].includes(fn)).length),0,'mount must not run engines');
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
 await page.getByRole('button',{name:'פתח מסלול',exact:true}).click();
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
 assert.equal(await page.locator('[data-engine]').count(),5);
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile overflow');
 await page.screenshot({path:'/tmp/life-journey-mobile.png',fullPage:true});
 // Explicit family selection enters advanced ELS with a ref-only Context; the destination rechecks input.
 const familyRef=await page.evaluate(()=>window.__life.members.find(m=>m.source_ref.includes(':p:')).source_ref);
 await page.getByLabel('על מי חוקרים?').selectOption(familyRef);
 await page.getByRole('button',{name:'פתח מחקר צופן מתקדם לאדם שנבחר'}).click();
 await page.getByRole('heading',{name:'מחקר צופן מתקדם'}).waitFor();
 await page.locator('[data-life-els-seed]').getByText(/.+/).waitFor();
 assert.equal(await page.evaluate(()=>window.__life.context.dimensions.lifePersonRef),familyRef);
 assert.equal(await page.evaluate(()=>JSON.stringify(window.__life.context).includes('2000-01-01')),false);
 assert.ok(await page.evaluate(()=>window.__life.calls.some(([fn,args])=>fn==='fn_person_life_input_v1'&&args.p_person_ref===window.__life.context.dimensions.lifePersonRef)));
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'ELS handoff mobile overflow');
 await page.getByRole('button',{name:'חזרה למסע החיים',exact:true}).click();
 await page.getByLabel('על מי חוקרים?').waitFor();
 assert.equal(await page.getByLabel('על מי חוקרים?').inputValue(),familyRef);
 await page.getByLabel('על מי חוקרים?').selectOption('person:11111111-1111-4111-8111-111111111111:self');
 // Explicit reflection consent and failed AI; no logging RPC is allowed.
 await page.getByRole('checkbox',{name:'אני מאשר לשלוח ל־AI',exact:false}).check();
 await page.getByRole('button',{name:'צור מסר והשתקפות',exact:true}).click();
 await page.getByText('מסר פרשני לבדיקה',{exact:true}).waitFor();
 assert.equal(await page.locator('.life-reflection-result article').count(),3);
 await page.locator('.life-reflection-result').screenshot({path:'/tmp/life-reflection-mobile.png'});
 assert.equal(await page.evaluate(()=>window.__life.calls.some(([fn])=>fn==='ai_log_analysis')),false);
 await page.evaluate(()=>window.__life.failAi=true);
 await page.getByRole('button',{name:'צור מסר והשתקפות',exact:true}).click();
 await page.getByText('ההשתקפות לא הושלמה.',{exact:false}).waitFor();
 // Event record retry after committed response loss must not duplicate.
 await page.getByRole('button',{name:'הוסף אירוע אישי',exact:true}).click();
 await page.getByLabel('כותרת האירוע',{exact:true}).fill('אירוע בדיקה אישי');
 await page.getByLabel('תאריך האירוע (רשות)',{exact:true}).fill('2001-01-01');
 await page.getByLabel('מה חשוב לי לזכור (רשות)',{exact:true}).fill('הערה פרטית לבדיקה');
 await page.evaluate(()=>window.__life.failEvent=true);
 await page.getByRole('button',{name:'שמור אירוע פרטי',exact:true}).click();
 await page.getByText('השמירה לא הושלמה.',{exact:false}).waitFor();
 await page.getByRole('button',{name:'שמור אירוע פרטי',exact:true}).click();
 await page.getByRole('heading',{name:'אירוע בדיקה אישי',exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>window.__life.events.length),1);
 await page.getByRole('button',{name:'תקן דיווח',exact:true}).click();
 await page.getByLabel('תאריך האירוע (רשות)',{exact:true}).fill('2001-01-02');
 await page.getByRole('button',{name:'שמור אירוע פרטי',exact:true}).click();
 await page.getByText('דיווח שלך · גרסה 2',{exact:false}).waitFor();
 await page.getByRole('button',{name:'בדוק את השם והתאריך הזה',exact:true}).click();
 await page.getByText('נבדק התאריך המדווח מול השם השמור.',{exact:false}).waitFor();
 assert.equal(await page.evaluate(()=>window.__life.events.length),1);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'continuation mobile overflow');
 await page.screenshot({path:'/tmp/life-journey-continuation-mobile.png',fullPage:true});
 await page.locator('#life-events').screenshot({path:'/tmp/life-events-mobile.png'});
 await page.evaluate(()=>window.__life.delay=400);
 await page.getByRole('button',{name:'בדוק את השם והתאריך הזה',exact:true}).click();
 await page.getByRole('button',{name:'עצור בדיקת אירוע',exact:true}).waitFor();
 await page.evaluate(()=>{window.__life.events[0].revision=3;window.__life.events[0].input.occurred_on='2001-01-03';});
 await page.getByRole('button',{name:'רענן אירועים',exact:true}).click();
 await page.waitForTimeout(500);
 assert.equal(await page.getByText('נבדק התאריך המדווח מול השם השמור. התאמה מספרית אינה הסבר לאירוע.',{exact:true}).count(),0);
 await page.evaluate(()=>window.__life.delay=0);
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
 console.log('PASS: optional family, five engines, private save/resume, numeric return, failure, edit/retry, reflection consent/quota, event retry/correction/stale result, cancellation, mobile');
}finally{await browser.close();await server.close();}
