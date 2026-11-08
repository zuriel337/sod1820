// All external traffic is blocked. This proves actual Home/Frame UI behavior with controlled
// identity/read adapters; it does not prove a real login, subscription or server operation.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, statSync, readFileSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const { chromium } = createRequire(import.meta.url)('playwright');
const out = resolve(process.env.SEARCH_BROWSER_OUT || 'docs/reviews/site-search-gematria-20261103/controlled');
await mkdir(out, { recursive: true });

const exportNames = async file => [...(await readFile(file, 'utf8')).matchAll(/^export (?:async )?(?:function|const|let|class)\s+(\w+)/gm)].map(x => x[1]);
const supabaseExports = await exportNames('src/lib/supabase.js');
const authExports = await exportNames('src/lib/auth.js');
const fixtureAuth = `import React,{createContext,useContext,useState,useEffect} from 'react';
const Context=createContext(null); export const useAuth=()=>useContext(Context);
export function AuthFixture({children}) {const [role,setRole]=useState('public');
 useEffect(()=>{window.fixtureRole=setRole;},[]);
 const user=role==='public'?null:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',user_metadata:{role:'admin'}};
 const value={user,isAdmin:role==='admin',loading:role==='pending',verified:role==='admin'||role==='member',profile:user?{id:user.id,role:role==='admin'?'admin':'user',display_name:'חשבון בדיקה'}:null};
 return React.createElement(Context.Provider,{value},children); }`;
const stubSupabase = `
const f=()=>window.__fixture;
const denied=name=>(...args)=>{f().unexpected.push(name);throw new Error('Unexpected isolated IO: '+name);};
export const SUPABASE_URL='https://fixture.invalid',SUPABASE_ANON='fixture-anon';
export const supabase={rpc:async(name)=>{f().reads.push(name);if(name==='fn_research_path_resume_v1')return {data:{ok:false,error:'not_found'},error:null};return denied('rpc:'+name)();},
 from:table=>{f().unexpected.push('from:'+table);throw new Error('Unexpected table '+table);},functions:{invoke:denied('model')}};
export const getSiteFlags=async()=>Object.fromEntries(['world','number','gematria','els','heichal','raziel_site','life_journey','books','forum','galleries'].map(name=>['lock_'+name,{enabled:!['world','number','gematria'].includes(name),mode:'all',message:'בדיקת נעילה'}]));
export const getTzofonStories=async()=>[],getHomeVideos=async()=>[],getLatestPostCards=async()=>f().posts;
${supabaseExports.filter(n => !['SUPABASE_URL','SUPABASE_ANON','supabase','getSiteFlags','getTzofonStories','getHomeVideos','getLatestPostCards'].includes(n)).map(n=>`export const ${n}=denied(${JSON.stringify(n)});`).join('\n')}
`;
const stubAuth = `const denied=name=>(...args)=>{window.__fixture.unexpected.push(name);throw new Error('Unexpected isolated IO '+name);};
export const getCloudResearch=async()=>({cart:[],saved:[],pinned:[],history:[],collections:[],journeys:[],context:null,revision:0});
export const applyCloudResearchOps=denied('research-write');
${authExports.filter(n=>!['getCloudResearch','applyCloudResearchOps'].includes(n)).map(n=>`export const ${n}=denied(${JSON.stringify(n)});`).join('\n')}`;
const readers = {
 'siteSearch2029.js': `import { fetchSiteSearch2029 as actual } from 'actual-site-search'; export * from 'actual-site-search'; export const fetchSiteSearch2029=(q,options)=>actual(q,{...options,readers:window.__searchReaders});`,
  'contentSeries2029Projection.js': `export const fetchContentSeriesCatalog2029=async()=>({series:[{key:'dimension-five',label:'מימד חמש',items:[{title:'פרסום ציבורי לדוגמה',href:'/post/fixture-series',author:'מקור בדיקה',publishedAt:'2026-11-02T12:00:00Z'}]}]});`,
  'worldDiscoveryStream.js': `export const watchWorldDiscoveryStream=({onResult})=>{onResult({items:[],unavailableSources:[]});return()=>{};};`,
  'systemFeedPublicSources2029.js': `export const fetchSystemFeedPublicSources2029=async()=>({items:[],sourceStates:[],error:false});`,
};
const { outputFiles } = await build({ entryPoints: ['docs/reviews/admin-full-access-auth-20261103/browser-fixture.jsx'],
  bundle:true,write:false,outfile:'/tmp/admin-home-controlled-fixture.js',format:'esm',platform:'browser',
  define:{'process.env.NODE_ENV':'"production"','__SOD_2029_BUILD__':'true','import.meta.env':'{"DEV":false,"VITE_PUBLIC_READING_RELEASE":"public-reading-20261101","VITE_INTEGRATED_PREVIEW":"false"}'},
  loader:{'.woff2':'dataurl','.png':'dataurl','.jpg':'dataurl','.svg':'dataurl'},
  plugins:[{name:'isolated-identity-and-readers',setup(b){
    b.onResolve({filter:/^actual-site-search$/},()=>({path:resolve('src/lib/research/siteSearch2029.js')}));
    b.onResolve({filter:/(?:siteSearch2029\.js$|^fixture-auth$|AuthContext\.jsx$|\/supabase\.js$|\/auth\.js$|contentSeries2029Projection\.js$|worldDiscoveryStream\.js$|systemFeedPublicSources2029\.js$)/},args=>({path:/AuthContext\.jsx$|^fixture-auth$/.test(args.path)?'fixture-auth':args.path.split('/').at(-1),namespace:'fixture'}));
    b.onResolve({filter:/^\//},args=>args.kind==='url-token'?{path:args.path,external:true}:null);
    b.onLoad({filter:/.*/,namespace:'fixture'},args=>({resolveDir:process.cwd(),loader:'jsx',contents:args.path==='fixture-auth'||args.path==='AuthContext.jsx'?fixtureAuth:args.path==='supabase.js'?stubSupabase:args.path==='auth.js'?stubAuth:readers[args.path]}));
  }}]
});
const js=outputFiles.find(f=>f.path.endsWith('.js')).contents,css=outputFiles.find(f=>f.path.endsWith('.css')).contents;
const html='<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><style>html,body{margin:0}</style></head><body><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>';
const publicRoot=resolve('public');
const types={'.woff2':'font/woff2','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png'};
const server=createServer((req,res)=>{
  const path=new URL(req.url,'http://fixture.invalid').pathname;
  if(path==='/fixture.js'){res.writeHead(200,{'content-type':'application/javascript'}).end(js);return;}
  if(path==='/fixture.css'){res.writeHead(200,{'content-type':'text/css'}).end(css);return;}
  const asset=resolve(publicRoot,'.'+path);
  if(asset.startsWith(publicRoot+sep)&&existsSync(asset)&&statSync(asset).isFile()){res.writeHead(200,{'content-type':types[extname(asset)]||'application/octet-stream'}).end(readFileSync(asset));return;}
  if(extname(path)){res.writeHead(404).end();return;}
  res.writeHead(200,{'content-type':'text/html; charset=utf-8'}).end(html);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const cases=[],errors=[];
try {
 for(const width of [320,390,1440]) {
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',serviceWorkers:'block'});
  const blocked=[];
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():(blocked.push(route.request().url()),route.abort()));
  await context.addInitScript(()=>{
   localStorage.setItem('sod-theme','dark');
   window.__fixture={reads:[],unexpected:[],posts:[{id:1,slug:'fixture-event',title:'תיעוד אירועים מבוקר',source:'site',publishedAt:'2026-11-02T12:00:00Z',sourcePost:{id:1,slug:'fixture-event',source:'site',date:'2026-11-02T12:00:00Z',modified:'2026-11-02T12:00:00Z',categories:['תיעוד אירועים'],tags:[]}}]};
   window.__searchCalls=[];
   window.__searchReaders=Object.fromEntries(['posts','topics','sources'].map(kind=>[kind,(term,{signal,limit})=>new Promise((resolve,reject)=>{
    const call={kind,term,limit,aborted:false};window.__searchCalls.push(call);signal.addEventListener('abort',()=>call.aborted=true,{once:true});
    const delay=term==='צב'&&kind==='posts'?1500:term==='ישן'?900:20;
    setTimeout(()=>{
     if(term==='כשל'&&kind!=='posts')return reject(Error('controlled failure'));
     if(term==='אין')return resolve({items:[]});
     const title=kind==='topics'?`${term} נושא מבוקר`:kind==='sources'?`${term} כותב מבוקר`:`${term} פוסט מבוקר`;
     resolve({items:[{id:`${kind}:${term}`,kind,title,href:kind==='topics'?'/topic/fixture-topic':kind==='sources'?'/world?view=sources&source=fixture-writer#world-contributor-material':'/old-fixture-post',detail:'נתוני בדיקה בלבד'}]});
    },delay);
   })]));
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const back='/?keep=one&keep=two#search-return';
  await page.goto(origin+back);await page.locator('[data-home-newsletter="end"]').waitFor();
  const header=page.getByRole('button',{name:'חיפוש באתר',exact:true});
  assert.equal(await page.evaluate(()=>window.__searchCalls.length),0);
  await header.click();const search=page.getByRole('dialog',{name:'חיפוש באתר',exact:true});await search.waitFor();
  const input=search.getByRole('combobox');await input.waitFor();
  await input.fill('צ');await page.waitForTimeout(400);
  await input.fill('**');await page.waitForTimeout(400);
  assert.equal(await page.evaluate(()=>window.__searchCalls.length),0);
  await input.fill('סוד');await search.getByRole('option',{name:/סוד החשמל/}).waitFor();
  await search.getByRole('option',{name:/פוסט מבוקר/}).waitFor();
  assert.equal(await search.getByRole('option').count(),4);
  assert.ok(await search.locator('mark').count()>=4);
  await page.screenshot({path:`${out}/search-${width}.png`});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const overflow=await search.evaluate(el=>el.scrollWidth>el.clientWidth+1);assert.equal(overflow,false);
  await input.focus();for(let i=0;i<8;i++){await page.keyboard.press('Tab');assert.notEqual(await page.evaluate(()=>document.activeElement?.getAttribute('role')),'option');}
  await input.fill('צב');await search.getByRole('option',{name:/צב נושא מבוקר/}).waitFor();
  await input.press('ArrowDown');
  let selected=await input.getAttribute('aria-activedescendant');assert.match(await page.locator(`[id="${selected}"]`).innerText(),/צב נושא/);
  await search.getByRole('option',{name:/צב פוסט מבוקר/}).waitFor();
  selected=await input.getAttribute('aria-activedescendant');assert.match(await page.locator(`[id="${selected}"]`).innerText(),/צב נושא/);
  await input.press('Enter');await page.waitForURL('**/topic/fixture-topic');
  if(width<800){await page.getByRole('button',{name:'פתח ניווט',exact:true}).click();await page.locator('#sod29-mobile-navigation').getByRole('button',{name:'חזרה מדויקת',exact:true}).click();}
  else await page.locator('button[aria-label="חזרה מדויקת"]:visible').first().click();
  await page.waitForURL(origin+back);
  await header.click();await input.waitFor();
  await input.fill('ישן');await page.waitForFunction(()=>window.__searchCalls.some(c=>c.term==='ישן'));
  await input.fill('חדש');await search.getByRole('option',{name:/חדש פוסט/}).waitFor();await page.waitForTimeout(1000);
  assert.equal(await search.getByRole('option',{name:/ישן/}).count(),0);
  assert.ok(await page.evaluate(()=>window.__searchCalls.filter(c=>c.term==='ישן').every(c=>c.aborted)));
  await input.fill('כשל');await search.getByRole('alert').waitFor();assert.equal(await search.getByRole('option').count(),1);
  assert.match(await search.getByRole('alert').innerText(),/לא ניתן כרגע לקרוא/);
  assert.ok(!(await search.innerText()).includes('לא נמצאו תוצאות'));
  await input.fill('אין');await page.waitForFunction(()=>document.querySelector('.sod29-site-search-status')?.textContent.includes('לא נמצאו תוצאות'));
  assert.equal(await search.getByRole('option').count(),0);
  await search.getByRole('button',{name:'ניקוי החיפוש'}).click();assert.equal(await input.inputValue(),'');
  await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
  await page.getByRole('button',{name:'גימטריה · מספר, ביטוי ושיטות חישוב',exact:true}).click();
  await page.getByRole('dialog',{name:'מספר / ביטוי',exact:true}).waitFor();assert.equal(await page.getByRole('combobox').count(),0);
  await page.keyboard.press('Escape');await page.keyboard.press('Control+k');await input.waitFor();
  await input.fill('ישן');await page.waitForTimeout(350);await page.keyboard.press('Escape');await page.waitForTimeout(1000);
  assert.equal(await page.getByRole('dialog').count(),0);
  assert.equal(blocked.length,0);assert.deepEqual(await page.evaluate(()=>window.__fixture.unexpected),[]);
  cases.push({width,ok:true,partialKeyboardIdentity:true,staleDiscard:true,failureNotEmpty:true,exactReturn:back,topBottomDistinct:true,noInitialReads:true,requests:await page.evaluate(()=>window.__searchCalls)});
  await context.close();console.log(JSON.stringify({width,ok:true}));
 }
 assert.deepEqual(errors,[]);
} finally {
 await writeFile(`${out}/receipt.json`,JSON.stringify({synthetic:true,liveWrites:false,liveLogin:false,sw:'blocked in controlled fixture; hosted checked separately',cases,errors},null,2)+'\n');
 await browser.close();await new Promise(resolve=>server.close(resolve));
}
