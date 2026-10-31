// Real activity view, ELS page, Provider and request adapter. Model, auth, engine and
// database are declared fixtures; no remote requests or paid scans are permitted.
import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { libraryFixturePlugin, libraryDatabase } from "./fixtures/els-library-browser-fixture.mjs";
const root=fileURLToPath(new URL("..",import.meta.url));
const require=createRequire(import.meta.url);
const {chromium}=require("playwright");
const {createServer}=await import("vite");
const react=(await import("@vitejs/plugin-react")).default;
const complete=JSON.parse(readFileSync(join(root,"test/fixtures/els-matrix-reading/card-examples/complete.json"),"utf8")).response;
const entry=`import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import {BrowserRouter,Link,useLocation} from 'react-router-dom';
import Activity from '/src/components/experience2029/ElsMatrixReadingActivity2029.jsx';
import Page from '/src/pages/Els2029Page.jsx';
import {RazielSessionProvider2029,useRazielSession2029} from '/src/lib/research/RazielSessionProvider2029.jsx';
import {resolve2029Palette} from '/src/lib/palette.js';
import '/src/components/experience2029/systemFrame2029.css';
import '/src/components/experience2029/sod2029.css';
const axis={term:'קולומביה',scope:'torah',corpusId:'0b022e8eef6f9c16',skip:4545,dir:1,start:248765,hitId:'4545_1_248765'};
const context={contract:'els_matrix_presentation_context_v1',axis,matrix:{width:4545,rowStart:54,colStart:3300,rows:['אבגד']}};
window.__requests=[];window.__cancels=0;
const transport=request=>{window.__requests.push(request);
if(!request.elsMatrixReadingAction)return Promise.resolve({v:1,answer:'תשובת המשך מדומה — ללא מודל חי'});
request.__razielProgress({kind:'els_matrix_reading',phase:'running',elapsedMs:125000,polls:1});
return new Promise(resolve=>{window.__finish=result=>resolve({v:1,answer:'תשובת בדיקה',els_matrix_reading:result});
request.__razielCancelSignal.addEventListener('abort',()=>{window.__cancels++;request.__razielProgress({kind:'els_matrix_reading',phase:'cancelling',elapsedMs:125000,cancelling:true});});});};
function Body(){const session=useRazielSession2029();window.__session=session;const location=useLocation();window.__route=location;
const [theme,setTheme]=useState('light');window.__theme=setTheme;
const p=resolve2029Palette(theme,'research_lab');
return React.createElement('div',{className:'sod29-root',style:{padding:12,background:p.pageBg,color:p.ink,minHeight:'100vh','--s29-panel':p.card,'--s29-panel-soft':p.cardSoft,'--s29-line':p.border,'--s29-ink':p.ink,'--s29-accent':p.accent}},
React.createElement('button',{onClick:()=>session.submitElsMatrixReading({context})},'התחל סריקת בדיקה'),
React.createElement('button',{onClick:()=>session.submit({question:'הסבר את המופע הנבחר',view:{surface:'els',elsFocus:{...axis,grounding:'canonical_replay_v1'}}})},'שאל על המופע'),
React.createElement(Link,{to:'/world'},'לעמוד אחר'),React.createElement(Activity),
location.pathname==='/code'?React.createElement(Page):React.createElement('p',null,'דף אחר באותו אתר'));}
createRoot(document.getElementById('root')).render(React.createElement(BrowserRouter,null,React.createElement(RazielSessionProvider2029,{transport},React.createElement(Body))));`;

test("global reading: navigate while running, exact return through real ELS page, cancel, completion and reload",{timeout:120000},async()=>{
  const overrides={name:"global-reading-fixture",enforce:"pre",resolveId(id){
    const name=id.split('/').at(-1);
    if(name==='library-entry')return '\0global-entry';
    if(name==='RazielSessionMount2029.jsx')return '\0global-mount';
    if(name==='supabase.js')return '\0global-supabase';
  },load(id){
    if(id==='\0global-entry')return entry;
    if(id==='\0global-mount')return "export {useOptionalRazielSession2029} from '/src/lib/research/RazielSessionProvider2029.jsx';";
    if(id==='\0global-supabase')return libraryDatabase+"\nexport const askRaziel=()=>{throw new Error('Live transport forbidden')};";
  }};
  const server=await createServer({root,configFile:false,plugins:[overrides,libraryFixturePlugin(),react()],server:{host:"127.0.0.1",port:0}});
  await server.listen();
  const browser=await chromium.launch({headless:true,executablePath:existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath(),args:['--no-sandbox']});
  const page=await browser.newPage();const errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));
  const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
  await page.route('**/*',route=>{if(!route.request().url().startsWith(origin)){external.push(route.request().url());return route.abort();}return route.continue();});
  try{
    await page.goto(origin+'/fixture');await page.getByRole('button',{name:'התחל סריקת בדיקה'}).waitFor();
    assert.equal(await page.getByLabel('מעקב סריקת מטריצה').count(),0);assert.equal(await page.evaluate(()=>window.__requests.length),0);
    await page.getByRole('button',{name:'התחל סריקת בדיקה'}).click();
    await page.getByText('חלפו 2 דקות',{exact:true}).waitFor();
    await page.getByRole('link',{name:'לעמוד אחר'}).click();
    assert.equal(await page.getByLabel('מעקב סריקת מטריצה').isVisible(),true);
    assert.equal(await page.evaluate(()=>window.__requests.length),1);
    await page.getByRole('button',{name:'חזור למטריצה של הסריקה'}).click();
    await page.waitForFunction(()=>window.__advancedLoad?.hitId==='4545_1_248765');
    assert.equal(new URL(page.url()).search,'?mode=classic');
    assert.deepEqual(await page.evaluate(()=>Object.keys(window.__route.state)),['elsReadingReturnTurnId']);
    assert.equal(await page.evaluate(()=>window.__advancedLoad.corpusId),'0b022e8eef6f9c16');
    assert.equal(await page.evaluate(()=>window.__requests.length),1,'return/replay never submits another model request');
    assert.equal(await page.getByLabel('הסיפור לגילוי מודרך').isVisible(),false,'return does not activate guided research');
    const firstNonce=await page.evaluate(()=>window.__advancedLoad.researchNonce);
    await page.getByRole('button',{name:'חזור למטריצה של הסריקה'}).click();
    await page.waitForFunction(n=>window.__advancedLoad?.researchNonce!==n,firstNonce);
    await page.getByRole('link',{name:'לעמוד אחר'}).click();
    for(const theme of ['light','parchment','dark'])for(const width of [320,390,1440]){
      await page.evaluate(t=>window.__theme(t),theme);await page.setViewportSize({width,height:900});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${theme}/${width}`);
      if(process.env.ELS_SCREENSHOT_DIR){mkdirSync(process.env.ELS_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:join(process.env.ELS_SCREENSHOT_DIR,`activity-${theme}-${width}.png`)});}
    }
    await page.getByRole('button',{name:'בקש ביטול סריקה'}).click();
    await page.getByText('ממתין לביטול הסריקה',{exact:true}).waitFor();
    assert.equal(await page.getByRole('button',{name:'בקש ביטול סריקה'}).isDisabled(),true);
    assert.equal(await page.evaluate(()=>window.__cancels),1);
    // The provider may complete before cancellation wins: report the actual terminal response.
    await page.evaluate(r=>window.__finish(r),complete);
    await page.getByText('תוצאות הסריקה מוכנות',{exact:true}).waitFor();
    await page.getByText('דוגמת בדיקה — לא קריאת AI חיה',{exact:true}).waitFor();
    assert.equal(await page.getByRole('button',{name:'בקש ביטול סריקה'}).count(),0);
    await page.getByRole('button',{name:'חזור למטריצה של הסריקה'}).click();
    await page.waitForFunction(()=>window.__advancedLoad?.hitId==='4545_1_248765');
    assert.equal(await page.evaluate(()=>window.__requests.length),1);
    await page.getByRole('button',{name:'שאל על המופע'}).click();
    await page.waitForFunction(()=>window.__session.thread?.at(-1)?.text?.includes('תשובת המשך מדומה'));
    assert.equal(await page.evaluate(()=>window.__requests.length),2,'one explicit follow-up, one request');
    const occurrence=await page.evaluate(()=>window.__requests.at(-1).surfaceSemantic.els);
    assert.equal(occurrence.start,248765);assert.equal(occurrence.term,'קולומביה');
    assert.equal(occurrence.grounding,'canonical_replay_v1');
    assert.equal(occurrence.readingJobId,undefined,'a declared test fixture is not promoted to a live reading');
    await page.getByRole('link',{name:'לעמוד אחר'}).click();
    assert.equal(await page.evaluate(()=>window.__requests.length),2,'page navigation does not submit');
    assert.ok(await page.evaluate(()=>window.__session.thread.some(m=>m.elsMatrixReading?.state==='COMPLETE')),'same conversation survives navigation');
    await page.getByRole('button',{name:'שאל על המופע'}).click();
    await page.waitForFunction(()=>window.__requests.length===3&&!window.__session.busy);
    assert.equal(await page.evaluate(()=>window.__requests.filter(r=>r.elsMatrixReadingAction).length),1,'follow-ups never restart the scan');
    await page.goto(origin+'/fixture');await page.getByRole('button',{name:'התחל סריקת בדיקה'}).waitFor();
    assert.equal(await page.getByLabel('מעקב סריקת מטריצה').count(),0,'new principal/session retains no scan presence');
    assert.equal(await page.evaluate(()=>window.__requests.length),0,'opening never starts or resumes AI');
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  }finally{await browser.close();await server.close();}
});
