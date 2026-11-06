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
const out = resolve(process.env.ADMIN_HOME_BROWSER_OUT || 'docs/reviews/admin-full-access-auth-20261103');
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
  'contentSeries2029Projection.js': `export const fetchContentSeriesCatalog2029=async()=>({series:[{key:'dimension-five',label:'מימד חמש',items:[{title:'פרסום ציבורי לדוגמה',href:'/post/fixture-series',author:'מקור בדיקה',publishedAt:'2026-11-02T12:00:00Z'}]}]});`,
  'worldDiscoveryStream.js': `export const watchWorldDiscoveryStream=({onResult})=>{onResult({items:[],unavailableSources:[]});return()=>{};};`,
  'systemFeedPublicSources2029.js': `export const fetchSystemFeedPublicSources2029=async()=>({items:[],sourceStates:[],error:false});`,
};
const { outputFiles } = await build({ entryPoints: ['docs/reviews/admin-full-access-auth-20261103/browser-fixture.jsx'],
  bundle:true,write:false,outfile:'/tmp/admin-home-controlled-fixture.js',format:'esm',platform:'browser',
  define:{'process.env.NODE_ENV':'"production"','__SOD_2029_BUILD__':'true','import.meta.env':'{"DEV":false,"VITE_PUBLIC_READING_RELEASE":"public-reading-20261101","VITE_INTEGRATED_PREVIEW":"false"}'},
  loader:{'.woff2':'dataurl','.png':'dataurl','.jpg':'dataurl','.svg':'dataurl'},
  plugins:[{name:'isolated-identity-and-readers',setup(b){
    b.onResolve({filter:/(?:^fixture-auth$|AuthContext\.jsx$|\/supabase\.js$|\/auth\.js$|contentSeries2029Projection\.js$|worldDiscoveryStream\.js$|systemFeedPublicSources2029\.js$)/},args=>({path:/AuthContext\.jsx$|^fixture-auth$/.test(args.path)?'fixture-auth':args.path.split('/').at(-1),namespace:'fixture'}));
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
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const cases=[],errors=[];
try {
  for(const width of [320,390,1440])for(const theme of ['dark','parchment','light']) {
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',serviceWorkers:'block'});
    const blocked=[];
    await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():(blocked.push(route.request().url()),route.abort()));
    await context.addInitScript(theme=>{
      localStorage.setItem('sod-theme',theme);
      window.__fixture={reads:[],unexpected:[],posts:[{id:1,slug:'fixture-event',title:'תיעוד אירועים מבוקר',source:'site',publishedAt:'2026-11-02T12:00:00Z',sourcePost:{id:1,slug:'fixture-event',source:'site',date:'2026-11-02T12:00:00Z',modified:'2026-11-02T12:00:00Z',categories:['תיעוד אירועים'],tags:[]}}]};
    },theme);
    const page=await context.newPage();page.on('pageerror',error=>{errors.push({width,theme,message:error.message});console.error('Fixture browser error:',error.message);});
    await page.goto(origin+'/');await page.locator('[data-home-newsletter="end"]').waitFor();
    await page.waitForFunction(()=>document.querySelector('.h29-hero')?.getAttribute('data-home-primary')==='ready');
    assert.equal(await page.locator('.sod29-root').getAttribute('data-frame-theme-preset'),theme);
    // ZURIEL 6.11.2026: the top updates card is live (shown only when the shared feed has items) and the newsletter closes the page.
    // The build notice remains in the availability map (LAUNCH-03).
    const panel=page.locator('[data-home-newsletter="end"]');
    assert.match(await panel.innerText(),/עדכוני האתר/);assert.doesNotMatch(await panel.innerText(),/הסר|הסרה/);
    assert.match(await page.locator('[data-home-availability-map]').innerText(),/האתר ממשיך להיבנות/);
    const order=await page.locator('.h29').evaluate(el=>[...el.children].map(el=>el.className));
    const at=re=>order.findIndex(name=>re.test(name));
    assert.ok(at(/h29-flagship-section/)<at(/h29-series-section/)&&at(/h29-series-section/)<at(/h29-hero/),'flagship, other series, then the lead');
    assert.ok(at(/h29-newsletter-end/)===order.length-1,'the newsletter is the last Home area');
    const dock=page.locator('.sod29-command-island'),here=dock.locator('.sod29-dock-here'),orb=dock.locator('.sod29-raziel-orb');
    assert.equal(await here.isDisabled(),true);assert.equal(await orb.isDisabled(),true);
    assert.match(await here.innerText(),/בבנייה/);assert.match(await orb.innerText(),/בבנייה/);
    const geometry=await dock.evaluate(el=>{const r=el.getBoundingClientRect();const core=el.querySelector('.sod29-raziel-orb-core');return {x:r.x,width:r.width,height:r.height,viewport:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,purple:getComputedStyle(core).backgroundImage,buttons:[...el.querySelectorAll('button')].map(b=>{const r=b.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};})};});
    assert.equal(geometry.overflow,false,`overflow ${width}/${theme}`);assert.ok(Math.abs(geometry.x+geometry.width/2-width/2)<1);assert.ok(geometry.width<=width-20);if(width===1440)assert.ok(geometry.width<600);
    assert.match(geometry.purple,/gradient/);
    const colors=[...geometry.purple.matchAll(/rgb\((\d+), (\d+), (\d+)\)/g)].map(c=>c.slice(1).map(Number));
    assert.ok(colors.length>=2&&colors.every(([r,g,b])=>b>r&&r>g), 'orb stays purple across themes');
    for(const b of geometry.buttons){assert.ok(b.w>=44&&b.h>=44,`touch size ${width}/${theme}`);assert.ok(b.x>=geometry.x-1&&b.x+b.w<=geometry.x+geometry.width+1);}
    const hereGeometry=await here.evaluate(el=>{const label=el.querySelector('small').getBoundingClientRect(),badge=el.querySelector('.sod29-construction-badge').getBoundingClientRect();return {label:{x:label.x,y:label.y,width:label.width,height:label.height},badge:{x:badge.x,y:badge.y,width:badge.width,height:badge.height},overlap:Math.max(0,Math.min(label.right,badge.right)-Math.max(label.left,badge.left))*Math.max(0,Math.min(label.bottom,badge.bottom)-Math.max(label.top,badge.top))};});
    assert.equal(hereGeometry.overlap,0,'construction badge must not cover the Here label');
    const cardGeometry=await panel.evaluate(el=>{const r=el.getBoundingClientRect();return {width:r.width,height:r.height,top:r.top};});
    assert.equal(await panel.locator('svg').count(),2);
    const motion=await panel.locator('.h29-chain').evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length);assert.equal(motion,0);
    await page.screenshot({path:resolve(out,`browser-fixture-${width}-${theme}.png`)});
    // The actual Frame reads a controlled AuthContext value; this is not a real login.
    await page.evaluate(()=>window.fixtureRole('admin'));await page.waitForFunction(()=>!document.querySelector('.sod29-dock-here')?.disabled);
    assert.equal(await orb.isDisabled(),false);await here.click();await page.getByRole('dialog',{name:'כאן · מפת העמוד וההקשר',exact:true}).waitFor();
    await page.evaluate(()=>window.fixtureRole('member'));await page.waitForFunction(()=>document.querySelector('.sod29-dock-here')?.disabled);
    assert.equal(await page.getByRole('dialog').count(),0,'role loss closes private context');assert.equal(await orb.isDisabled(),true);
    await page.evaluate(()=>window.fixtureRole('admin'));await page.waitForFunction(()=>!document.querySelector('.sod29-raziel-orb')?.disabled);await orb.click();
    await page.locator('[data-panel-kind="raziel"]').waitFor();
    await page.evaluate(()=>window.fixtureRole('member'));await page.waitForFunction(()=>document.querySelector('.sod29-raziel-orb')?.disabled);
    assert.equal(await page.locator('[data-panel-kind="raziel"]').count(),0,'role loss closes Raziel');
    await page.evaluate(()=>window.fixtureNavigate('/world'));await page.locator('.sod29-root.surface-world').waitFor();assert.equal(await here.isDisabled(),true);assert.equal(await orb.isDisabled(),true);
    await page.evaluate(()=>window.fixtureNavigate('/post/fixture-event'));await page.locator('.sod29-root.surface-post').waitFor();assert.equal(await here.isDisabled(),true);assert.equal(await orb.isDisabled(),true);
    await dock.getByRole('button',{name:/^עכשיו/}).click();await page.getByRole('dialog',{name:'עכשיו',exact:true}).waitFor();await page.keyboard.press('Escape');
    const unexpected=await page.evaluate(()=>window.__fixture.unexpected);assert.deepEqual(unexpected,[]);
    cases.push({width,theme,geometry,hereGeometry,cardGeometry,reducedMotionRunningAnimations:motion,publicClosed:true,adminButtonsOpen:true,roleLossClosesPanels:true,nowPublicOpen:true,blockedExternalRequests:blocked.length,unexpectedIO:unexpected});
    await context.close();
  }
  const context=await browser.newContext({viewport:{width:390,height:900},reducedMotion:'no-preference',serviceWorkers:'block'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  await context.addInitScript(()=>{window.__fixture={reads:[],unexpected:[],posts:[]};});
  const page=await context.newPage();page.on('pageerror',error=>errors.push({motion:true,message:error.message}));await page.goto(origin+'/');await page.locator('.h29-chain').waitFor();
  const animations=await page.locator('.h29-chain').evaluate(el=>el.getAnimations({subtree:true}).map(a=>({iterations:a.effect.getTiming().iterations,duration:a.effect.getTiming().duration})));
  assert.ok(animations.length>0);assert.ok(animations.every(a=>a.iterations===1));await page.waitForTimeout(3400);
  assert.equal(await page.locator('.h29-chain').evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0);
  cases.push({normalMotion:true,animations,completedOnce:true});await context.close();
  assert.deepEqual(errors,[]);
  const sourceFiles=['src/components/experience2029/SystemFrame2029.jsx','src/components/experience2029/systemFrame2029-command-island-polish.css','src/components/experience2029/HomeComposition2029.jsx','src/components/experience2029/HomeUpdatesPreview2029.jsx','src/components/experience2029/homeComposition2029.css','src/components/StayUpdatedCTA.jsx','src/components/MaintenanceLock.jsx','src/lib/research/ResearchProvider.jsx'];
  const sourceHashes=Object.fromEntries(await Promise.all(sourceFiles.map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')])));
  await writeFile(resolve(out,'browser-fixture.json'),JSON.stringify({sourceHashes,scope:'Controlled actual Home/Frame components and CSS; no real identity, mail or model acceptance; not a performance run; external network blocked',cases,errors},null,2)+'\n');
  console.log(`PASS ${cases.length} controlled Home/dock cases; evidence ${out}`);
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
