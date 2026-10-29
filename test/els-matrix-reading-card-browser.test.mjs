// Real card + real global session + real request builder. Transport responses are explicitly marked fixtures.
// No live model, Supabase request or paid operation is permitted by this test.
import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("..", import.meta.url));
const { chromium } = require("playwright");
const { createServer } = await import("vite");
const react = (await import("@vitejs/plugin-react")).default;
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : chromium.executablePath());
const samples = Object.fromEntries(["complete", "preview", "incomplete-max-tokens", "refused-admin-only", "running-start"].map(name =>
  [name, JSON.parse(readFileSync(join(root, `test/fixtures/els-matrix-reading/card-examples/${name}.json`), "utf8")).response]));

const entry = `import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import Card from '/src/components/experience2029/ElsMatrixReadingCard2029.jsx';
import {RazielSessionProvider2029,useRazielSession2029} from '/src/lib/research/RazielSessionProvider2029.jsx';
import {buildElsRazielMatrixContext} from '/src/lib/research/elsRazielMatrixContext.js';
import {resolve2029Palette} from '/src/lib/palette.js';
import '/src/components/experience2029/elsNativeClassic2029.css';
const context=buildElsRazielMatrixContext({status:'ok',scope:'torah',termRaw:'קולומביה',verification:{state:'MATCH',corpus_id:'0b022e8eef6f9c16'},axis:{hitId:'4545_1_248765',skip:4545,direction:'fwd',start:248765,length:8},geometry:{S:4545},matrix:{S:4545,r0:40,c0:3300,cw:60,rows:Array(30).fill('א'.repeat(60))}});
window.__requests=[];window.__cancels=0;
const transport=request=>{window.__requests.push(request);request.__razielProgress({kind:'els_matrix_reading',phase:'running',elapsedMs:60000,polls:1});
 return new Promise(resolve=>{window.__finish=result=>resolve({v:1,answer:'תוצאת בדיקה',els_matrix_reading:result});
 request.__razielCancelSignal.addEventListener('abort',()=>{window.__cancels++;request.__razielProgress({kind:'els_matrix_reading',phase:'cancelling',elapsedMs:60000,polls:1,cancelling:true});});});};
function Fixture(){const session=useRazielSession2029();window.__session=session;
 const [ctx,setCtx]=useState(context),[mode,setMode]=useState('on'),[admin,setAdmin]=useState(true),[visible,setVisible]=useState(true),[theme,setTheme]=useState('light');
 window.__selectOther=()=>setCtx({...context,axis:{...context.axis,start:248766,hitId:'4545_1_248766'}});window.__selectOriginal=()=>setCtx(context);
 window.__setMode=setMode;window.__setAdmin=setAdmin;window.__setVisible=setVisible;window.__setTheme=setTheme;
 const p=resolve2029Palette(theme,'research_lab'); const style={'--s29-panel':p.card,'--s29-panel-soft':p.cardSoft,'--s29-line':p.border,'--s29-ink':p.ink,'--s29-accent':p.accent,'--s29-type-small':'15px',background:p.pageBg,color:p.ink,minHeight:'100vh',padding:12,fontFamily:'Arial',fontSize:18};
 return React.createElement('main',{style,'data-theme':theme},visible?React.createElement(Card,{context:ctx,reading:{mode,isAdmin:admin,session,onCancel:session.cancelActiveTurn},onSubmit:(context,options)=>session.submitElsMatrixReading({...options,context})}):React.createElement('p',null,'דף אחר באותו אתר'));}
createRoot(document.getElementById('root')).render(React.createElement(RazielSessionProvider2029,{transport},React.createElement(Fixture)));`;

function plugin() {
  return { name: "matrix-reading-card-fixture", enforce: "pre",
    resolveId(id) {
      if (id === "/reading-fixture.jsx") return "\0reading-fixture.jsx";
      if (id.endsWith("/ResearchProvider.jsx") || id === "./ResearchProvider.jsx") return "\0reading-research";
      if (id.endsWith("/supabase.js")) return "\0reading-supabase";
    },
    load(id) {
      if (id === "\0reading-fixture.jsx") return entry;
      if (id === "\0reading-research") return "const research={context:null,saved:[]};export const useResearch=()=>research;";
      if (id === "\0reading-supabase") return "export const askRaziel=()=>{throw new Error('Live transport forbidden');};";
    },
    configureServer(server) { server.middlewares.use(async (req,res,next) => {
      if (req.url !== "/fixture") return next();
      res.setHeader("content-type", "text/html");
      res.end(await server.transformIndexHtml("/fixture", '<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0}button{font:inherit}</style><div id="root"></div><script type="module" src="/reading-fixture.jsx"></script></html>'));
    }); },
  };
}

test("matrix reading card: one explicit session turn, cancellation, occurrence isolation, fixtures and 320/390/1440px", { timeout: 120000 }, async () => {
  const server=await createServer({root,configFile:false,plugins:[plugin(),react()],server:{host:"127.0.0.1",port:0}});
  await server.listen();
  const browser=await chromium.launch({headless:true,executablePath,args:["--no-sandbox"]});
  const page=await browser.newPage(); const errors=[]; page.on("pageerror",error=>errors.push(error.message));
  const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
  const external=[]; await page.route("**/*",route=> { if(!route.request().url().startsWith(origin)) { external.push(route.request().url());return route.abort(); }return route.continue(); });
  try {
    await page.goto(`${origin}/fixture`);const start=page.getByRole("button",{name:"סרוק את המטריצה עם Fable"});await start.waitFor();
    assert.equal(await page.evaluate(()=>window.__requests.length),0);
    await page.evaluate(()=>window.__setMode("off"));assert.equal(await start.isDisabled(),true);
    await page.evaluate(()=>{window.__setMode("on");window.__setAdmin(false);});assert.equal(await start.isDisabled(),true);
    await page.evaluate(()=>window.__setAdmin(true));await start.click();
    await page.waitForFunction(()=>window.__requests.length===1);
    const action=await page.evaluate(()=>window.__requests[0].elsMatrixReadingAction);
    assert.deepEqual(action.window,{rows:33,cols:41});assert.equal(action.cap,25);assert.equal(action.op,"start");
    await page.getByText("קריאת המטריצה מתבצעת…",{exact:false}).waitFor();
    assert.equal(await start.isDisabled(),true);
    await page.evaluate(()=>window.__selectOther());await page.getByText("רזיאל קורא כעת מופע אחר.",{exact:false}).waitFor();
    await page.evaluate(()=>window.__setVisible(false));await page.getByText("דף אחר באותו אתר").waitFor();
    await page.evaluate(()=>window.__setVisible(true));assert.equal(await page.evaluate(()=>window.__requests.length),1,"navigation does not start a second reading");
    await page.evaluate(result=>window.__finish(result),samples.complete);
    await page.waitForFunction(()=>!window.__session.busy);
    assert.equal(await page.getByLabel("תוצאת סריקת המטריצה").count(),0,"old result never attaches to new occurrence");
    await page.evaluate(()=>window.__selectOriginal());await page.getByText("דוגמת בדיקה — לא קריאת AI חיה").waitFor();
    assert.equal(await page.evaluate(()=>window.__session.thread.filter(m=>m.role==='raziel').length),1);
    const backgrounds=new Set();
    for(const width of [320,390,1440]) for(const theme of ["light","parchment","dark"]){
      await page.setViewportSize({width,height:900});await page.evaluate(theme=>window.__setTheme(theme),theme);
      await page.waitForFunction(theme=>document.querySelector('main')?.dataset.theme===theme,theme);
      backgrounds.add(await page.locator('main').evaluate(el=>getComputedStyle(el).backgroundColor));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${width} ${theme}`);
      if(process.env.ELS_SCREENSHOT_DIR){mkdirSync(process.env.ELS_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:join(process.env.ELS_SCREENSHOT_DIR,`fable-card-${width}-${theme}.png`)});}
    }
    assert.equal(backgrounds.size,3,'the three actual theme palettes must be distinct');
    await start.click();await page.waitForFunction(()=>window.__requests.length===2);
    await page.getByRole("button",{name:"בקש ביטול סריקה"}).click();
    assert.equal(await page.evaluate(()=>window.__cancels),1);
    await page.evaluate(result=>window.__finish({...result,findings:[{text:'אסורלהציג',verification:{state:'ENGINE_VERIFIED'}}]}),samples["incomplete-max-tokens"]);
    await page.getByText("הסריקה לא הושלמה",{exact:true}).waitFor();
    assert.equal(await page.getByText("אסורלהציג").count(),0,"incomplete output never displays findings");
    await page.evaluate(()=>window.__setMode("preview"));await page.getByRole("button",{name:"בדוק כיסוי ועלות"}).click();
    await page.waitForFunction(()=>window.__requests.length===3);assert.equal(await page.evaluate(()=>window.__requests[2].elsMatrixReadingAction.op),"preview");
    await page.evaluate(result=>window.__finish(result),samples.preview);await page.getByText("כיסוי ועלות לפני סריקה",{exact:true}).waitFor();
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  } finally {await browser.close();await server.close();}
});
