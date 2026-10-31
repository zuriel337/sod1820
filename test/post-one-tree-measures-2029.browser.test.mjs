import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, transformWithOxc } from 'vite';
import react from '@vitejs/plugin-react';
import {POST_BACKGROUND_ASSETS_2029} from '../src/lib/research/postBackground2029.js';

const require=createRequire(import.meta.url);
let playwright;try{playwright=require('playwright');}catch{}
const executablePath=process.env.CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium';
const root=fileURLToPath(new URL('..',import.meta.url));

async function openResearch(page){
  const entry=page.locator('#post-research');
  if(!await entry.evaluate(node=>node.open))await entry.locator(':scope > summary').click();
  await page.getByRole('button',{name:'רשימת ההתכנסויות הרלוונטיות'}).waitFor();
}

function fixturePlugin(){
  const aliases=new Map([
    ['Sod2029Shell.jsx','shell'],['ResearchProvider.jsx','context'],['AuthContext.jsx','auth'],
    ['supabase.js','backend'],['entityHubProjection.js','hub'],['worldProminenceInputs.js','prominence'],
    ['worldSourceConnections.js','discovery'],['CanonicalMediaFigure2029.jsx','noop'],
    ['PostComments2029.jsx','noop'],['NumberAiAnalysis2029.jsx','noop'],['ShareActions.jsx','noop'],
    ['SpatialMethodStage2029.jsx','noop'],['WorldSourceStory.jsx','noop'],
  ]);
  const modules={
    noop:`export default function Noop(){return null;}`,
    auth:`export const useAuth=()=>({user:null,isAdmin:false,loading:false});`,
    hub:`export async function fetchEntityHubProjection(){return null;}export async function fetchGallerySourceContext(){return {items:[]};}`,
    prominence:`export async function fetchWorldProminenceInputs(){return {};}`,
    discovery:`export const DISCOVERY_TOPIC_SLUGS=[];`,
    context:`
      import React,{createContext,useContext,useState} from 'react';
      import {normalizeResearchContext,mergeResearchContext} from '/src/lib/research/researchContext.js';
      const Context=createContext(null);export const useResearch=()=>useContext(Context);
      export function Provider({children}){const [context,set]=useState(null);window.__researchContext=context;
        return <Context.Provider value={{context,setResearchContext:value=>set(normalizeResearchContext(value)),
          updateResearchContext:patch=>set(current=>mergeResearchContext(current,typeof patch==='function'?patch(current):patch))}}>{children}</Context.Provider>;}
    `,
    backend:`
      import trace from '/test/fixtures/spatial/mistater-1237-trace.json';
      export const logView=()=>{},logActivity=()=>{};
      export const getAllValuePhrases=async()=>[],langLinksList=async()=>[];
      export const getNumberLookup=async()=>null,getRelationCandidate=async()=>null;
      export async function getPostBySlug(slug){return window.__post.slug===slug?structuredClone(window.__post):null;}
      export const supabase={from(table){const filters=[];let range=null,limit=null;
        const q={select(){return q;},eq(k,v){filters.push([k,v]);return q;},in(k,values){filters.push([k,values]);return q;},
          overlaps(){return q;},order(k){if(k==='meter_score')throw Error('forbidden score order');return q;},
          limit(n){limit=n;return q;},range(a,b){range=[a,b];return q;},
          then(done,fail){window.__reads.push(table);
            let data=table==='posts'?[structuredClone(window.__post)]:table==='topic_cards_public'?structuredClone(window.__cards):table==='gematria_methods'?(window.__registry||['רגיל','מסתתר','מילוי'].map(method_key=>({method_key,display_label:method_key}))):[];
            data=data.filter(row=>filters.every(([k,v])=>Array.isArray(v)?v.includes(row[k]):String(row[k])===String(v)));
            if(range)data=data.slice(range[0],range[1]+1);if(limit!=null)data=data.slice(0,limit);
            return Promise.resolve({data,error:window.__failTable===table?{message:'offline'}:null}).then(done,fail);}
        };return q;},
        async rpc(name,args){window.__rpcs.push(name);if(name==='fn_method_profile'){if(window.__holdProfile)await new Promise(resolve=>{window.__releaseProfile=resolve;});return {error:null,data:window.__profiles?.[args.p_phrase]||[
          {method_key:'רגיל',computed_value:args.p_phrase==='בן דוד'?66:844,definition_version:1},
          {method_key:'מסתתר',computed_value:1237,definition_version:window.__versionChanged?2:1},
          {method_key:'מילוי',computed_value:1026,definition_version:1}]};}
          if(name==='gematria_method_trace')return {error:null,data:window.__traceMissing?null:window.__wrongTrace?{...trace,input:'אחר'}:trace};
          throw Error('Unexpected RPC '+name);}
      };
    `,
    shell:`
      import React,{createContext,useContext,useState} from 'react';import {useNavigate} from 'react-router-dom';
      import {createPortal} from 'react-dom';import LearnMark from '/src/components/experience2029/LearnMark2029.jsx';
      import {useResearch} from '/src/lib/research/ResearchProvider.jsx';
      import NumberDrawer from '/src/components/number2029/NumberDrawer2029.jsx';
      import {buildExactReturnPatch} from '/src/lib/research/researchContext.js';
      import {resolve2029Palette} from '/src/lib/palette.js';
      const Context=createContext(null);export const use2029Shell=()=>useContext(Context);
      export function FrameState({title,children}){return <section><h2>{title}</h2>{children}</section>;}
      export default function Shell({children}){const [target,setTarget]=useState(null),[orientationHost,setOrientationHost]=useState(null);const research=useResearch(),navigate=useNavigate();
        const preset=new URLSearchParams(location.search).get('theme')||sessionStorage.getItem('fixture-theme')||'dark';sessionStorage.setItem('fixture-theme',preset);window.__fixturePreset=preset;
        document.documentElement.dataset.themePreset=preset;
        const p=resolve2029Palette(preset);
        const go=href=>{setTarget(null);navigate(href);};
        const openNumber=value=>{window.__targets.push(value);research.updateResearchContext({subject:{id:String(value.resultValue),type:'number',label:String(value.resultValue)},selection:{entityId:value.id,entityType:'gematria_expression',expression:value.expression,method:value.method,resultValue:value.resultValue,locator:value.locator},lens:'gematria'});setTarget(value);};
        const close=()=>{const back=research.context.returnTo;research.updateResearchContext(buildExactReturnPatch(research.context));go(back.href);};
        return <Context.Provider value={{openNumber,go,razielLocked:true,registerOrientationHost:setOrientationHost}}><div className='sod29-root surface-post' style={{'--s29-page':p.pageBg,'--s29-panel':p.card,'--s29-panel-soft':p.cardSoft,'--s29-ink':p.ink,'--s29-muted':p.inkSoft,'--s29-line':p.border,'--s29-line-strong':p.borderStrong,'--s29-accent':p.accent,'--s29-accent-text':p.accentText,'--s29-focus-ring':p.focusRing,'--s29-font-ui':'Arial,sans-serif','--s29-type-ui':'16px','--s29-type-body':'18px'}}>{children}
          {orientationHost?createPortal(<span className='sod29-entry-orientation-slot is-in-header'><LearnMark scope='surface' compact label='איך קוראים את הפוסט?'><p>הסבר קריאה שנפתח לפי בחירה.</p></LearnMark></span>,orientationHost):null}
          {target?<div role='dialog' aria-label='מספר בהקשר' className='fixture-sheet'><button onClick={close}>סגירה וחזרה למקור</button><NumberDrawer target={target} context={research.context} research={research} go={go}/></div>:null}</div></Context.Provider>;
      }
    `,
    entry:`
      import React from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter,Routes,Route,useNavigate} from 'react-router-dom';
      import {Provider,useResearch} from '/src/lib/research/ResearchProvider.jsx';import {buildExactReturnPatch} from '/src/lib/research/researchContext.js';
      import Post from '/src/pages/Post2029Page.jsx';import '/src/components/experience2029/sod2029.css';
      import '/src/components/experience2029/systemFrame2029.css';
      import Shell from '/src/components/experience2029/Sod2029Shell.jsx';import LearnMark from '/src/components/experience2029/LearnMark2029.jsx';
      import * as postReaders from '/src/lib/research/post2029ReadingProjection.js';window.__postReaders=postReaders;
      window.__reads=[];window.__rpcs=[];window.__targets=[];
      window.__post={id:9001,slug:'future-source',title:'מקור בדיקה חי',source:'ai',home_hidden:false,date:'2026-10-20',modified:'2026-10-30T14:00:00Z',tags:['1237'],categories:[],
        content:'<h2 id="native-heading" data-source-heading="true">ממצא ראשון</h2><p>הטענה כפי שנשמרה במקור</p><button id="claim-one" type="button" data-expression="התגלות" data-method="מסתתר" data-method-version="1" data-result="1237">התגלות = 1237</button><p>הפרשנות נשארת נפרדת.</p>'};
      Object.assign(window.__post,JSON.parse(sessionStorage.getItem('fixture-post-overrides')||'{}'));
      window.__cards=Array.from({length:10},(_,i)=>({id:String(i),slug:'card-'+i,title:'התכנסות '+i,numbers:[1237],status:'approved',quality:i===0?null:10,meter_score:i===0?10:99,findings:[]}));
      function NumberPage(){const research=useResearch(),navigate=useNavigate();return <main><h1>דף המספר</h1><button onClick={()=>{const back=research.context.returnTo;research.updateResearchContext(buildExactReturnPatch(research.context));navigate(back.href);}}>חזרה מדף המספר למקור</button></main>;}
      function TopicDestination(){const research=useResearch(),navigate=useNavigate();return <main><h1>כרטיס התכנסות</h1><button onClick={()=>{const back=research.context.returnTo;research.updateResearchContext(buildExactReturnPatch(research.context));navigate(back.href);}}>חזרה מההתכנסות לפוסט</button></main>;}
      function LearningDestination(){const research=useResearch(),navigate=useNavigate();return <main><h1>לימוד שיטות בבית המדרש</h1><button onClick={()=>{const back=research.context.returnTo;research.updateResearchContext(buildExactReturnPatch(research.context));navigate(back.href,{state:{sodEntryArrival:'exact_return'}});}}>חזרה מהלימוד למקור</button></main>;}
      function Navigation(){window.__goFixture=useNavigate();return null;}
      const style=document.createElement('style');style.textContent='html,body{margin:0;padding:0}body{font-family:Arial,sans-serif}.sod29-root{display:block!important;padding:12px;box-sizing:border-box;min-height:100vh;background:var(--s29-page);color:var(--s29-ink)}.sod29-reading-post{max-width:100%;margin:auto}.fixture-sheet{position:fixed;inset:0;z-index:1000;overflow:auto;background:var(--s29-panel);padding:12px}button{min-height:44px}';document.head.append(style);
      createRoot(document.getElementById('root')).render(<BrowserRouter><Provider><Navigation/><Routes><Route path='/post/:slug' element={<Post/>}/><Route path='/learn-control' element={<Shell><LearnMark compact label='הסבר מושג'><p>הסבר מושג נגיש</p></LearnMark><LearnMark scope='surface' prominent label='הסבר ארוך על המסך ועל האפשרויות שעומדות לרשות הקורא'><p>הסבר על המסך</p></LearnMark></Shell>}/><Route path='/beit-midrash' element={<LearningDestination/>}/><Route path='/2029/number/:value' element={<NumberPage/>}/><Route path='/topic/:slug' element={<TopicDestination/>}/><Route path='*' element={<p>יעד המשך</p>}/></Routes></Provider></BrowserRouter>);
    `,
  };
  return {name:'posts-one-tree-fixture',enforce:'pre',resolveId(source){
    if(source==='virtual:post-one-tree-entry.jsx')return '\0posts:entry.jsx';
    for(const [suffix,name]of aliases)if(source.endsWith('/'+suffix))return '\0posts:'+name+'.jsx';return null;
  },async load(id){if(!id.startsWith('\0posts:'))return null;const code=modules[id.slice(7).replace(/\.jsx$/,'')];return code==null?null:transformWithOxc(code,'fixture.jsx',{lang:'jsx',jsx:{runtime:'automatic'}});}};
}

test('built Post: adopted design, bounded backgrounds, lazy research, exact return and future findings', {skip:!playwright||!existsSync(executablePath),timeout:180000},async()=>{
  const output=mkdtempSync(join(tmpdir(),'post-one-tree-'));let server,browser;
  const artifacts=process.env.POST_MEASURES_ARTIFACT_DIR || '/workspace/scratch/post-one-tree-browser';mkdirSync(artifacts,{recursive:true});
  try{
    const result=await build({root,configFile:false,publicDir:false,logLevel:'error',plugins:[fixturePlugin(),react()],build:{outDir:output,emptyOutDir:true,rollupOptions:{input:'virtual:post-one-tree-entry.jsx'}}});
    const chunks=result.output,entry=chunks.find(chunk=>chunk.isEntry),css=chunks.filter(chunk=>chunk.fileName.endsWith('.css'));
    const html=`<!doctype html><html lang="he" dir="rtl"><head><meta name="viewport" content="width=device-width,initial-scale=1">${css.map(c=>`<link rel="stylesheet" href="/${c.fileName}">`).join('')}</head><body><div id="root"></div><script type="module" src="/${entry.fileName}"></script></body></html>`;
    const backgroundPaths=new Set(Object.values(POST_BACKGROUND_ASSETS_2029).flatMap(item=>[item.mobile,item.desktop]));
    const backgroundRequests=[];let failBackground=false;
    server=createServer((req,res)=>{
      const pathname=new URL(req.url,'http://test').pathname;
      if(backgroundPaths.has(pathname)){
        const data=readFileSync(resolve(root,'public','.'+pathname));
        backgroundRequests.push({path:pathname,bytes:failBackground?0:data.length,status:failBackground?404:200});
        if(failBackground){res.writeHead(404);res.end();return;}
        res.setHeader('Content-Type','image/webp');res.setHeader('Cache-Control','public, max-age=604800, stale-while-revalidate=86400');res.end(data);return;
      }
      const path=resolve(output,'.'+pathname);if(path.startsWith(output+'/')&&existsSync(path)&&extname(path)){res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'application/octet-stream');res.end(readFileSync(path));}else{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);}
    });
    await new Promise(done=>server.listen(0,'127.0.0.1',done));const origin=`http://127.0.0.1:${server.address().port}`;
    browser=await playwright.chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
    const layoutResults=[];
    for(const width of [320,390,1440])for(const theme of ['light','parchment','dark']){
      const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage();
      const errors=[];page.on('pageerror',error=>errors.push(error.message));
      await context.addInitScript(()=>sessionStorage.setItem('fixture-post-overrides',JSON.stringify({slug:'readability-dim5',author:'בדרך לנצח',content:'<h2>קריאה נוחה בעברית</h2><p id="reading-prose" style="text-align:center;color:#cbb25e">'+('פסקה ארוכה נשארת מיושרת לתחילת השורה בתוך טור קריאה ממורכז. '.repeat(5))+'</p><blockquote><p id="reading-quote">ציטוט קצר במרכז</p></blockquote><p class="sod29-gematria-line" id="reading-equation">12 + 3 = 15</p><div class="sod-gematria-box"><div class="gb-title">🔢 גימטריה — עובדה מאומתת במנוע</div><div class="gb-rows"><div><b>216</b> = גבורה = ראיה</div><div><b>32</b> = כבוד = לב</div></div><div class="gb-note">שני השוויונות בגימטריה רגילה אומתו במנוע הרשמי. <b>זהו חישוב, לא הוכחת משמעות.</b> הקריאה נשארת רמז ופרשנות למחקר.</div></div>'})));
      await page.goto(origin+'/post/readability-dim5?theme='+theme);await page.locator('#reading-prose').waitFor();
      const help=page.getByRole('button',{name:'איך זה עובד? — איך קוראים את הפוסט?',exact:true});await help.waitFor();
      assert.equal(await help.locator('.sod29-learn-mark-label').innerText(),'איך זה עובד?');
      const typography=await help.evaluate(node=>{const s=getComputedStyle(node);return {font:s.fontSize,line:s.lineHeight,weight:s.fontWeight};});
      assert.deepEqual(typography,{font:'16px',line:'22.4px',weight:'500'},'Shared help must override the generic button font inheritance');
      assert.ok((await help.getAttribute('aria-label')).includes(await help.locator('.sod29-learn-mark-label').innerText()),'Visible label is included in the accessible name');
      const geometry=await page.evaluate(()=>{
        const rect=selector=>{const b=document.querySelector(selector).getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,center:b.x+b.width/2};};
        const symbol=getComputedStyle(document.querySelector('.sod29-learn-mark-symbol'));
        return {article:rect('article'),source:rect('.sod29-reading-source'),nav:rect('nav[aria-label="בתוך הפוסט"]'),help:rect('.sod29-learn-mark-trigger'),details:rect('.sod29-post-details'),
          prose:getComputedStyle(document.querySelector('#reading-prose')).textAlign,quote:getComputedStyle(document.querySelector('#reading-quote')).textAlign,equation:getComputedStyle(document.querySelector('#reading-equation')).textAlign,
          symbolBorder:parseFloat(symbol.borderTopWidth),overflow:document.documentElement.scrollWidth>innerWidth};
      });
      assert.ok(Math.abs(geometry.source.center-geometry.article.center)<1,'The removed spine leaves no empty grid column');
      assert.ok(Math.abs(geometry.nav.center-geometry.source.center)<1,'Section menu and source share the same centered axis');
      assert.ok(['start','right'].includes(geometry.prose));assert.equal(geometry.quote,'center');assert.equal(geometry.equation,'center');
      const claimBox=await page.locator('.sod-gematria-box').evaluate(box=>{
        const title=box.querySelector('.gb-title'),rows=box.querySelector('.gb-rows'),note=box.querySelector('.gb-note');
        const bounds=rows.getBoundingClientRect(),chips=[...rows.children].map(node=>node.getBoundingClientRect());
        const left=Math.min(...chips.map(b=>b.left)),right=Math.max(...chips.map(b=>b.right));
        return {titleAlign:getComputedStyle(title).textAlign,titleSize:parseFloat(getComputedStyle(title).fontSize),
          noteAlign:getComputedStyle(note).textAlign,noteSize:parseFloat(getComputedStyle(note).fontSize),
          labelSize:parseFloat(getComputedStyle(box,'::before').fontSize),label:getComputedStyle(box,'::before').content,
          rowsOffset:Math.abs((left+right)/2-(bounds.left+bounds.right)/2),
          within:chips.every(b=>b.left>=bounds.left-1&&b.right<=bounds.right+1),text:title.textContent};
      });
      assert.equal(claimBox.titleAlign,'center');assert.ok(claimBox.titleSize>=16);
      assert.ok(['start','right'].includes(claimBox.noteAlign));assert.ok(claimBox.noteSize>=15);assert.ok(claimBox.labelSize>=14);
      assert.ok(claimBox.rowsOffset<1,'Equation group shares the centered title axis');assert.equal(claimBox.within,true);
      assert.match(claimBox.label,/טענת הפוסט/);assert.equal(claimBox.text,'🔢 גימטריה — עובדה מאומתת במנוע','Authored caption and emoji stay source wording, not a new verification badge');
      assert.equal(geometry.symbolBorder,0);assert.ok(geometry.help.width>=44&&geometry.help.height>=44);assert.equal(geometry.overflow,false);
      if(width===390)assert.ok(Math.min(geometry.help.y+geometry.help.height,geometry.details.y+geometry.details.height)>Math.max(geometry.help.y,geometry.details.y),'Compact help shares the metadata row when space allows');
      for(const button of await page.locator('nav[aria-label="בתוך הפוסט"] button').all()){const b=await button.boundingBox();assert.ok(b.width>=44&&b.height>=44);}
      if(width===320){
        const boxes=await page.locator('nav[aria-label="בתוך הפוסט"] button').evaluateAll(nodes=>nodes.map(node=>{const b=node.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width};}));
        assert.equal(boxes[0].y,boxes[1].y);assert.ok(Math.abs(boxes[0].width-boxes[1].width)<1);
        for(let i=2;i+1<boxes.length;i+=2)assert.equal(boxes[i].y,boxes[i+1].y);
        if(boxes.length%2){const last=boxes.at(-1);assert.ok(Math.abs(last.x+last.width/2-geometry.nav.center)<1);assert.ok(last.width>boxes[0].width);}
      }
      await page.screenshot({path:join(artifacts,`reading-alignment-${width}-${theme}.png`),fullPage:true});
      await help.focus();assert.equal(await help.evaluate(node=>getComputedStyle(node).outlineStyle),'solid');await page.keyboard.press('Enter');
      assert.equal(await help.getAttribute('aria-expanded'),'true');
      const panel=page.locator('[id="'+await help.getAttribute('aria-controls')+'"]');await panel.waitFor();const box=await panel.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width&&box.width<=520);
      const openedHelp=await help.boundingBox();assert.ok(Math.abs(openedHelp.x-geometry.help.x)<1&&Math.abs(openedHelp.y-geometry.help.y)<1,'Opening help leaves its trigger in place');
      const studyLink=panel.getByRole('link',{name:'לימוד שיטות בבית המדרש',exact:true});assert.equal(await studyLink.getAttribute('href'),'/beit-midrash?section=methods');
      const studyBox=await studyLink.boundingBox();assert.ok(studyBox.height>=44&&studyBox.x>=0&&studyBox.x+studyBox.width<=width);
      await page.screenshot({path:join(artifacts,`reading-help-open-${width}-${theme}.png`)});
      await page.keyboard.press('Enter');assert.equal(await help.getAttribute('aria-expanded'),'false');
      assert.equal(await page.evaluate(()=>window.__rpcs.length),0,'Reading/help do not trigger calculations');assert.deepEqual(errors,[]);
      if(width===390&&theme==='dark'){
        await help.click();await panel.getByRole('link',{name:'לימוד שיטות בבית המדרש',exact:true}).click();
        await page.getByRole('heading',{name:'לימוד שיטות בבית המדרש',exact:true}).waitFor();
        const back=await page.evaluate(()=>window.__researchContext.returnTo);assert.ok(back.href.startsWith('/post/readability-dim5?theme=dark#'));assert.equal(back.subject.type,'post');
        await page.getByRole('button',{name:'חזרה מהלימוד למקור',exact:true}).click();
        await page.waitForFunction(id=>document.activeElement?.id===id,back.selection.locator.slice(1));
      }
      layoutResults.push({width,theme,...geometry});await context.close();
    }
    for(const theme of ['light','parchment','dark']){
      const context=await browser.newContext({viewport:{width:320,height:900}}),page=await context.newPage();
      await page.goto(origin+'/learn-control?theme='+theme);
      const concept=page.getByRole('button',{name:'הסבר מושג',exact:true});await concept.waitFor();assert.equal(await concept.locator('.sod29-learn-mark-label').count(),0);
      assert.equal(await concept.evaluate(node=>getComputedStyle(node).fontSize),'16px');
      const b=await concept.boundingBox();assert.equal(b.width,44);assert.ok(b.height>=44);await concept.click();await page.getByText('הסבר מושג נגיש',{exact:true}).waitFor();
      assert.equal(await page.locator('.scope-surface .sod29-learn-mark-label').innerText(),'איך זה עובד?');
      assert.match(await page.locator('.scope-surface .sod29-learn-mark-trigger').getAttribute('aria-label'),/הסבר ארוך על המסך/);
      const surfaceHelp=page.locator('.scope-surface .sod29-learn-mark-trigger');await surfaceHelp.click();
      assert.equal(await surfaceHelp.evaluate(node=>getComputedStyle(node).fontSize),'16px');
      assert.equal(await page.locator('.scope-surface a').getAttribute('href'),'/beit-midrash?section=methods');
      assert.equal(await page.locator('.scope-concept a').count(),0);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await context.close();
    }
    writeFileSync(join(artifacts,'reading-alignment.json'),JSON.stringify(layoutResults,null,2));
    if(process.env.POST_LEGACY_AUDIT_SOURCE){
      const source=JSON.parse(readFileSync(process.env.POST_LEGACY_AUDIT_SOURCE,'utf8'));
      const context=await browser.newContext(),page=await context.newPage();
      await page.goto(origin+'/post/future-source');
      const rows=await page.evaluate(async source=>{
        const root=document.createElement('div');root.innerHTML=source.content;
        return window.__postReaders.collectPostLegacyOccurrences2029(source,root);
      },source);
      writeFileSync(join(artifacts,'legacy-source-occurrences.json'),JSON.stringify({sourceId:source.id,sourceModified:source.modified,occurrences:rows},null,2));
      await context.close();
    }
    for(const width of [320,390,1440])for(const theme of ['light','parchment','dark']){
      const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(8000);
      const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));
      await page.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():(external.push(route.request().url()),route.abort()));
      await page.goto(origin+'/post/future-source?theme='+theme);
      await page.locator('#claim-one').waitFor();
      assert.equal(await page.locator('#post-research').evaluate(node=>node.open),false);
      assert.equal(await page.locator('[data-post-measures]').count(),0);
      assert.equal(await page.evaluate(()=>window.__reads.filter(table=>table==='topic_cards_public').length),0);
      await openResearch(page);
      assert.equal(await page.evaluate(()=>window.__fixturePreset),theme);
      assert.equal(await page.locator('[data-convergence-strength]').count(),0);
      await page.getByRole('button',{name:'רשימת ההתכנסויות הרלוונטיות'}).click();
      await page.getByRole('button',{name:'בחירה: התכנסות 0',exact:true}).click();
      await page.locator('[data-convergence-strength]').waitFor();assert.match(await page.locator('[data-convergence-strength]').innerText(),/10 מתוך 100/);
      assert.equal(await page.locator('#native-heading').count(),1);
      assert.equal(await page.locator('[data-card-quality]').innerText(),'לא דורג');
      const readsBeforeCollapse=await page.evaluate(()=>window.__reads.length);
      await page.locator('#post-research > summary').click();
      await page.waitForFunction(()=>!document.getElementById('post-research').open);
      await openResearch(page);
      assert.match(await page.locator('[data-convergence-strength]').innerText(),/10 מתוך 100/);
      assert.equal(await page.evaluate(()=>window.__reads.length),readsBeforeCollapse,'Closing research retains the chosen card without another read');
      if(width===390&&theme==='light'){
        await page.getByRole('link',{name:'לכרטיס, למקור המדד ולהסבר'}).click();
        await page.getByRole('heading',{name:'כרטיס התכנסות',exact:true}).waitFor();
        await page.getByRole('button',{name:'חזרה מההתכנסות לפוסט'}).click();
        await page.locator('[data-convergence-strength]').waitFor();assert.match(await page.locator('[data-convergence-strength]').innerText(),/10 מתוך 100/);
      }
      await page.locator('#claim-one').focus();await page.keyboard.press('Enter');
      await page.getByRole('dialog',{name:'מספר בהקשר'}).waitFor();
      const selected=await page.evaluate(()=>window.__researchContext);assert.equal(selected.selection.expression,'התגלות');assert.equal(selected.selection.method,'מסתתר');assert.equal(selected.selection.methodVersion,'1');assert.equal(selected.selection.sourceRef,'posts:9001');assert.equal(selected.returnTo.selection.locator,'#claim-one');
      await page.getByRole('button',{name:'סגירה וחזרה למקור'}).click();await page.waitForURL('**/post/future-source#claim-one');
      await page.waitForFunction(()=>document.activeElement?.id==='claim-one');
      await page.reload();await page.waitForFunction(()=>document.activeElement?.id==='claim-one');
      await openResearch(page);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await page.screenshot({path:join(artifacts,`${width}-${theme}.png`),fullPage:true});
      if(width===390&&theme==='light'){
        const summary=page.getByText('טענות חישוב ממופות (1)',{exact:true});await summary.click();
        await page.evaluate(()=>{window.__traceMissing=true;});
        await page.getByRole('button',{name:'בדיקת תוצאה וצעדים'}).click();await page.getByText('תוצאת המנוע תואמת לטענה הזאת',{exact:true}).waitFor();await page.getByText('צעדי חישוב לא התקבלו',{exact:true}).waitFor();
        await page.evaluate(()=>{window.__traceMissing=false;});await page.getByRole('button',{name:'בדיקת תוצאה וצעדים'}).click();await page.getByText('צעדי החישוב נבדקו ותואמים',{exact:true}).waitFor();
        await page.getByRole('button',{name:'פתיחה בחלונית המספר'}).click();await page.getByRole('dialog').waitFor();
        await page.getByRole('button',{name:'פתח דף מלא ↗',exact:true}).click();await page.getByRole('heading',{name:'דף המספר',exact:true}).waitFor();
        assert.equal((await page.evaluate(()=>window.__researchContext.returnTo.selection)).sourceRef,'posts:9001');
        await page.getByRole('button',{name:'חזרה מדף המספר למקור'}).click();await page.waitForFunction(()=>document.activeElement?.id==='claim-one');
        await openResearch(page);
        // Data changes after this exact fixture was built: no source ID list or rebuild.
        await page.evaluate(()=>{window.__post.content+='<button id="claim-new" data-expression="בן דוד" data-method="רגיל" data-method-version="1" data-result="66">ממצא חדש בן דוד = 66</button>';window.__post.modified='2026-10-30T15:00:00Z';window.__cards.push({id:'future',slug:'future',title:'התכנסות עתידית',numbers:[1237],status:'approved',quality:null,meter_score:0,findings:[]});});
        await page.getByRole('button',{name:'רענון מהמקור'}).click();await page.locator('#claim-new').waitFor();
        await page.locator('#claim-new').click();await page.getByRole('dialog').waitFor();assert.equal(await page.evaluate(()=>window.__researchContext.selection.resultValue),66);
        await page.getByRole('button',{name:'סגירה וחזרה למקור'}).click();await page.waitForFunction(()=>document.activeElement?.id==='claim-new');
        await openResearch(page);
        await page.getByRole('button',{name:'רשימת ההתכנסויות הרלוונטיות'}).click();await page.getByRole('button',{name:'לעמוד הבא'}).click();await page.getByRole('button',{name:'בחירה: התכנסות עתידית',exact:true}).waitFor();
        await page.evaluate(()=>{window.__holdProfile=true;});await page.locator('#claim-one').click();await page.waitForFunction(()=>typeof window.__releaseProfile==='function');
        const targetCount=await page.evaluate(()=>window.__targets.length);
        await page.evaluate(()=>{window.__goFixture('/topic/cancelled');});await page.getByRole('heading',{name:'כרטיס התכנסות',exact:true}).waitFor();
        await page.evaluate(()=>{window.__holdProfile=false;window.__releaseProfile();});
        // A source read is the final boundary after the held method profile.
        await page.waitForFunction(()=>window.__reads.at(-1)==='posts');
        assert.equal(await page.evaluate(()=>window.__targets.length),targetCount);
        await page.evaluate(()=>window.__goFixture('/post/future-source'));await openResearch(page);
        await page.evaluate(()=>{window.__failTable='topic_cards_public';});await page.getByRole('button',{name:'רשימת ההתכנסויות הרלוונטיות'}).click();await page.getByText('קריאת ההתכנסויות נכשלה. לא מוצגים מדדים קודמים.',{exact:true}).waitFor();assert.equal(await page.locator('[data-convergence-strength]').count(),0);
        await page.evaluate(()=>{window.__failTable=null;window.__post.home_hidden=true;});await page.getByRole('button',{name:'רשימת ההתכנסויות הרלוונטיות'}).click();await page.getByRole('heading',{name:'לא הצלחתי לפתוח את הפוסט',exact:true}).waitFor();assert.match(await page.locator('body').innerText(),/המקור אינו זמין להצגה כעת/);assert.equal(await page.locator('[data-post-measures]').count(),0);assert.equal(await page.locator('#claim-new').count(),0);
      }
      assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.ok((await page.evaluate(()=>window.__rpcs)).every(name=>['fn_method_profile','gematria_method_trace'].includes(name)));
      await context.close();
    }
    // Authored legacy method labels must reach the SAME real Number drawer.
    // No per-post ID list, regular-method fallback or value-based method search.
    for(const width of [390,1440]){
      const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
      const content='<h2 id="legacy-heading">מקור עם שיטות שונות</h2><p>רגיל = 506</p>'
        +'<div><strong id="regular" data-gem="כבוד יהוה יתגלה">כבוד יהוה יתגלה</strong> = 506 (רגיל) · <strong id="fill" data-gem="אני גואלך">אני גואלך</strong> = 506 (מילוי בלבד)</div>'
        +'<div><p>«משולש» (קדמי): הסבר השיטה</p><div><strong data-gem="מטריקס">מטריקס</strong> = 1890</div></div>'
        +'<div><div>מילוי בלבד (מילוי − רגיל) = 506</div><div><strong id="group" data-gem="סוד">סוד</strong> · <strong data-gem="כוח">כוח</strong></div></div>'
        +'<div><strong id="mismatch" data-gem="אני גואלך">אני גואלך</strong> = 507 (מילוי בלבד)</div>'
        +'<p><strong id="missing" data-gem="עולם המחשבה">עולם המחשבה</strong> = 506</p>'
        +'<p>מספר כללי <strong data-gem="506">506</strong></p><a href="/number/506">מספר מקושר</a>';
      const profiles={
        'אני גואלך':[{method_key:'רגיל',computed_value:121,definition_version:1},{method_key:'מילוי בלבד',computed_value:506,definition_version:2}],
        'כבוד יהוה יתגלה':[{method_key:'רגיל',computed_value:506,definition_version:1}],
        'מטריקס':[{method_key:'רגיל',computed_value:419,definition_version:1},{method_key:'קדמי',display_label:'משולש',computed_value:1890,definition_version:1},{method_key:'משולש מילה',computed_value:1890,definition_version:1}],
        'סוד':[{method_key:'רגיל',computed_value:70,definition_version:1},{method_key:'מילוי בלבד',computed_value:506,definition_version:2}],
      };
      await context.addInitScript(({content,profiles})=>{
        sessionStorage.setItem('fixture-post-overrides',JSON.stringify({content}));window.__profiles=profiles;
        window.__registry=[{method_key:'רגיל',display_label:'רגיל'},{method_key:'מילוי בלבד',display_label:'מילוי בלבד'},{method_key:'קדמי',display_label:'משולש'},{method_key:'משולש מילה',display_label:'משולש מילה'}];
      },{content,profiles});
      const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
      await page.goto(origin+'/post/future-source');
      const triangle=page.locator('strong[data-gem="מטריקס"]');
      await page.waitForFunction(()=>document.querySelector('[data-gem="מטריקס"]')?.id.startsWith('post-legacy-'));
      const anchor=await triangle.getAttribute('id');
      await openResearch(page);
      await page.getByText('טענות חישוב ממופות (6)',{exact:true}).waitFor();
      await page.locator('#post-research > summary').click();
      for(const [selector,method,value,version]of [['#fill','מילוי בלבד',506,'2'],['#regular','רגיל',506,'1'],['#'+anchor,'קדמי',1890,'1'],['#group','מילוי בלבד',506,'2']]){
        await page.locator(selector).focus();await page.keyboard.press('Enter');await page.getByRole('dialog').waitFor();
        const selected=await page.evaluate(()=>window.__researchContext);
        assert.equal(selected.selection.method,method);assert.equal(selected.selection.resultValue,value);assert.equal(selected.selection.methodVersion,version);
        assert.equal(selected.dimensions.postClaimBinding,'saved_legacy_marking');assert.equal(selected.dimensions.postClaimSteps,'not_tested');
        await page.getByRole('button',{name:'סגירה וחזרה למקור'}).click();await page.waitForFunction(id=>document.activeElement?.id===id,selector.slice(1));
        const returned=await page.locator(selector).boundingBox();assert.ok(returned.y>=0&&returned.y+returned.height<=900,'Returned source focus stays visible');
      }
      await page.locator('#'+anchor).click();await page.getByRole('dialog').waitFor();
      await page.getByRole('button',{name:'פתח דף מלא ↗',exact:true}).click();await page.getByRole('heading',{name:'דף המספר',exact:true}).waitFor();
      await page.goBack();await page.waitForFunction(id=>document.activeElement?.id===id,anchor);
      await page.reload();await page.waitForFunction(id=>document.activeElement?.id===id,anchor);
      const view=await page.locator('#'+anchor).boundingBox();assert.ok(view.y>=0&&view.y<900,'Return lands on the visible occurrence, not only its focus');
      await page.locator('#mismatch').click();await page.getByRole('status').filter({hasText:'התוצאה במקור אינה תואמת'}).waitFor();assert.equal(await page.getByRole('dialog').count(),0);
      const before=await page.evaluate(()=>window.__rpcs.length);
      await page.locator('#missing').click();await page.getByRole('status').filter({hasText:'לא נבחרה שיטה אוטומטית'}).waitFor();assert.equal(await page.getByRole('dialog').count(),0);
      assert.equal(await page.evaluate(()=>window.__rpcs.length),before,'Missing method never starts an automatic calculation');
      await page.evaluate(()=>{
        window.__post.content+='<div><strong id="future-method" data-gem="אני גואלך">אני גואלך</strong> = 2000 (שיטה שהתווספה)</div>';
        window.__post.modified='2026-10-31T02:00:00Z';
        window.__profiles['אני גואלך'].push({method_key:'שיטה שהתווספה',computed_value:2000,definition_version:3});
        window.__registry.push({method_key:'שיטה שהתווספה',display_label:'שיטה שהתווספה'});
        window.__goFixture('/topic/new-source');
      });
      await page.getByRole('heading',{name:'כרטיס התכנסות',exact:true}).waitFor();
      await page.evaluate(()=>window.__goFixture('/post/future-source'));await page.locator('#future-method').click();
      await page.getByRole('dialog').waitFor();assert.equal(await page.evaluate(()=>window.__researchContext.selection.method),'שיטה שהתווספה');
      await page.getByRole('button',{name:'סגירה וחזרה למקור'}).click();await page.waitForFunction(()=>document.activeElement?.id==='future-method');
      const privacy=await page.evaluate(async()=>{
        const source={...window.__post},root=document.createElement('div');root.innerHTML=source.content;
        const rows=await window.__postReaders.collectPostLegacyOccurrences2029(source,root);
        const claim=rows.find(row=>row.locator==='#fill');
        const invented=await window.__postReaders.checkPostCalculation2029(source,{...claim,method:'רגיל'},{sourceDocument:document});
        const forgedValue=await window.__postReaders.checkPostCalculation2029(source,{...claim,value:121},{sourceDocument:document});
        const altered={...source,content:source.content.replace('אני גואלך','אני גואלך אחר')};
        const alteredRoot=document.createElement('div');alteredRoot.innerHTML=altered.content;
        const changed=await window.__postReaders.collectPostLegacyOccurrences2029(altered,alteredRoot);
        const oldPresentation=rows.find(row=>row.expression==='מטריקס').locator;
        const newPresentation=changed.find(row=>row.expression==='מטריקס').locator;
        window.__post.home_hidden=true;
        const revoked=await window.__postReaders.checkPostCalculation2029(source,claim,{sourceDocument:document});
        return {invented:invented.status,forgedValue:forgedValue.status,revoked:revoked.status,oldAnchorInvalidated:oldPresentation!==newPresentation};
      });
      assert.deepEqual(privacy,{invented:'incomplete_claim',forgedValue:'incomplete_claim',revoked:'source_unavailable',oldAnchorInvalidated:true});
      assert.deepEqual(errors,[]);await context.close();
    }
    const backgroundCases={
      general:{categories:['כללי'],author:null},
      'dimension-five':{categories:['מימד חמש'],author:'בדרך לנצח'},
      'sod-hashmal':{categories:['סוד החשמל'],author:null},
      'mah-kore-habora':{categories:[],tags:['1237','מה קורה הבורא'],author:'אלון לוי'},
    };
    const backgroundResults=[];
    for(const width of [320,390,1440])for(const theme of ['light','parchment','dark'])for(const [key,source]of Object.entries(backgroundCases)){
      const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:2,reducedMotion:'reduce'});
      await context.addInitScript(overrides=>sessionStorage.setItem('fixture-post-overrides',JSON.stringify(overrides)),source);
      const page=await context.newPage();const errors=[],external=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('request',req=>{if(!req.url().startsWith(origin+'/'))external.push(req.url());});
      const before=backgroundRequests.length;
      await page.goto(origin+'/post/future-source?theme='+theme,{waitUntil:'networkidle'});
      assert.equal(await page.locator('article').getAttribute('data-post-background'),key);
      assert.equal(await page.locator('#post-research').evaluate(node=>node.open),false);
      assert.equal(await page.evaluate(()=>window.__reads.filter(table=>table==='topic_cards_public').length),0);
      const requests=backgroundRequests.slice(before);
      const expected=POST_BACKGROUND_ASSETS_2029[key][width<=760?'mobile':'desktop'];
      assert.deepEqual(requests.map(row=>row.path),theme==='dark'?[expected]:[]);
      assert.ok(requests.every(row=>row.bytes<=(width<=760?30_000:60_000)));
      const warmStart=backgroundRequests.length;
      await page.reload({waitUntil:'networkidle'});
      assert.equal(backgroundRequests.length,warmStart,'Warm reload must reuse the single selected background');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
      backgroundResults.push({width,deviceScaleFactor:2,theme,key,requests,warmRequests:0});
      if(theme==='dark'&&width===390)await page.screenshot({path:join(artifacts,'background-'+key+'-mobile.png'),fullPage:true});
      await context.close();
    }
    failBackground=true;
    const fallbackContext=await browser.newContext({viewport:{width:390,height:900}}),fallbackPage=await fallbackContext.newPage();
    await fallbackPage.goto(origin+'/post/future-source?theme=dark',{waitUntil:'networkidle'});
    await fallbackPage.locator('#claim-one').waitFor();
    assert.equal(await fallbackPage.locator('article').getAttribute('data-post-background'),'general');
    await openResearch(fallbackPage);
    await fallbackContext.close();
    writeFileSync(join(artifacts,'background-network.json'),JSON.stringify({cases:backgroundResults,unavailableImageKeepsPostReadable:true},null,2));
  }finally{await browser?.close();if(server)await new Promise(done=>server.close(done));rmSync(output,{recursive:true,force:true});}
});
