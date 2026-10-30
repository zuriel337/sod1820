import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

// Real Topic reader/projection/page, expression resolver, NumberDrawer and NumberCore.
// Only backend results, the shared shell interface and unrelated capabilities are fixtures.
const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url);
let playwright, vite, reactPlugin;
try {
  playwright = require("playwright");
  vite = await import(pathToFileURL(require.resolve("vite")).href);
  reactPlugin = (await import(pathToFileURL(require.resolve("@vitejs/plugin-react")).href)).default;
} catch { /* Optional local browser dependencies. */ }
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH
  || (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : playwright?.chromium.executablePath());
const available = Boolean(playwright && vite && reactPlugin && executablePath && existsSync(executablePath));

function fixturePlugin() {
  const aliases = new Map([
    ["/lib/supabase.js", "backend"],
    ["/lib/research/ResearchProvider.jsx", "context"],
    ["/experience2029/Sod2029Shell.jsx", "shell"],
    ["/research/entityHubProjection.js", "hub"],
    ["/research/worldProminenceInputs.js", "prominence"],
    ["/research/worldSourceConnections.js", "discovery"],
    ["/research/WorldSourceStory.jsx", "noop"],
    ["/experience2029/CanonicalMediaFigure2029.jsx", "noop"],
    ["/experience2029/ConvergenceRatings2029.jsx", "noop"],
    ["/components/ShareActions.jsx", "noop"],
    ["/number2029/NumberAiAnalysis2029.jsx", "noop"],
    ["/gematria2029/MethodLens2029.jsx", "noop"],
    ["/lib/seo.js", "seo"],
  ]);
  const modules = {
    noop: "export default function Noop(){return null;}",
    seo: "export const applySeo=()=>{},clearConvergenceJsonLd=()=>{},setConvergenceJsonLd=()=>{};",
    hub: `import {buildGallerySourceContext} from '/src/lib/research/topicSourceContext.js';
      export async function fetchEntityHubProjection({nodeId}){
        if(!nodeId)return null;
        const slug=nodeId.endsWith('1')?'source-alpha':'source-beta';
        if(window.__holdHubFor===slug)await new Promise(resolve=>{window.__releaseHub=resolve;});
        return {identity:{nodeId},sources:[{ref:'book:'+slug,label:'SOURCE_'+slug}],
          sourceContext:{topicSlug:slug,access:{scope:'public',available:true},items:[],
            links:{topics:[{slug:'linked-'+slug,title:'ציר קשור '+slug}],posts:[]}}};
      }
      export async function fetchTopicSourceContext(){return null;}
      export async function fetchGallerySourceContext({imageIds}){
        window.__galleryRequests.push(imageIds);
        if(window.__failNextGallery){window.__failNextGallery=false;throw Error('gallery offline');}
        if(window.__nativeGallery){
          const images=imageIds.filter(id=>!window.__galleryWithdrawn).map(id=>window.__nativeGalleryRow(id));
          return {items:buildGallerySourceContext({images}),occurrencesTruncated:window.__partialGallery||false};
        }
        return {items:imageIds.filter(id=>Number(id.split('-')[1])%2&&!window.__galleryWithdrawn).map(galleryImageId=>({
          galleryImageId,label:'מקור בדיקה '+galleryImageId,createdAt:'2026-10-28',
          imageUrl:'https://example.test/'+galleryImageId+'.png',sourceRef:'gallery_images:'+galleryImageId,
          access:{scope:'public'},sourceIdentity:{ref:'gallery:'+galleryImageId},occurrences:[],
          legacyPlacement:{galleryImageId,imageType:'gematria',occurredAt:'2020-06-01',createdAt:'2026-10-28',
            dateProvenance:{occurredAt:{derivedFrom:'path'}}},dateUse:'provenance_only',
          storedNumbers:{primary:1237,all:[844,1237,3137]},
          intrinsic:{extraction:{text:galleryImageId==='81-5'?(window.__sourceChanged?'טקסט השתנה':'טקסט שמור התגלות'):null}}
        }))};
      }`,
    prominence: "export async function fetchWorldProminenceInputs(){return {};}",
    discovery: "export const DISCOVERY_TOPIC_SLUGS=[];",
    context: `
      import React,{createContext,useContext,useState} from 'react';
      import {normalizeResearchContext,mergeResearchContext} from '/src/lib/research/researchContext.js';
      const Context=createContext(null);
      export const useResearch=()=>useContext(Context);
      export function Provider({children}){
        const [context,set]=useState(null);
        const replace=patch=>set(normalizeResearchContext(patch));
        const update=patch=>set(current=>mergeResearchContext(current,typeof patch==='function'?patch(current):patch));
        window.__researchContext=context;
        return <Context.Provider value={{context,setResearchContext:replace,updateResearchContext:update}}>{children}</Context.Provider>;
      }
    `,
    backend: `
      import traceFixture from '/test/fixtures/spatial/mistater-1237-trace.json';
      function card(slug){return {id:'fixture-'+slug,slug,title:'מחקר בחירות',status:'approved',
        node_id:slug.startsWith('source-')?'10000000-0000-4000-8000-00000000000'+(slug==='source-alpha'?1:2):null,
        numbers:[878],highlight_numbers:[878],image_ids:[],created_by:slug.startsWith('source-')?'':'מקור הבדיקה',
        findings:slug==='hidden'?{_do_not_publish:true,phrases:['משיח']}:[
          {type:'gematria',phrase:'משיח',n:878,method:'מילוי'},
          {type:'gematria',phrase:'משיח',n:358,method:'רגיל'},
          {type:'gematria',phrase:'בן דוד',n:66,method:'רגיל'},
          {type:'gematria',phrase:'תמי',n:450},
          {type:'gematria',phrase:'משיח',n:359,method:'רגיל'},
          {type:'gematria',phrase:'משיח',n:878,method:'רגיל/מילוי'},
          {type:'gematria',phrase:'א',n:0,method:'מסתתר'},
          {type:'gematria',phrase:'ערך חסר',n:null,method:'רגיל'},
        ]};}
      export const getAllValuePhrases=async()=>[],langLinksList=async()=>[];
      export const getImagesByGallery=async(id)=>Array.from({length:window.__nativeGallery?14:8},(_,ordering)=>({
        id:window.__nativeGallery?'10000000-0000-4000-8000-'+String(id*100+ordering).padStart(12,'0'):id+'-'+ordering,ordering}));
      export const supabase={
        from(table){
          let slugs=[];
          const query={select(){return this;},in(key,values){if(key==='slug')slugs=values;return this;},
            eq(){return this;},limit(){return this;},maybeSingle:async()=>({data:null,error:null}),
            then(resolve){window.__reads.push({table,slugs});return Promise.resolve({
              data:table==='topic_cards_public'?(slugs[0]==='missing'?[]:[card(slugs[0])]):[],error:null
            }).then(resolve);}};
          return query;
        },
        async rpc(name,args){
          window.__reads.push({rpc:name,args});
          if(name==='gematria_method_trace'){
            window.__traceReads.push(args);
            if(window.__traceMode==='offline')throw Error('trace offline');
            if(args.p_phrase==='התגלות'&&args.p_method_key==='מסתתר')return {error:null,
              data:window.__traceMode==='wrong'?{...traceFixture,input:'ביטוי אחר'}:traceFixture};
            return {error:null,data:null};
          }
          if(name!=='fn_method_profile')throw Error('Unexpected RPC '+name);
          if(window.__offline)return {data:null,error:{message:'offline'}};
          if(window.__holdProfile)await new Promise(resolve=>{window.__releaseProfile=resolve;});
          if(args.p_phrase==='התגלות')return {error:null,data:[{method_key:'רגיל',computed_value:844,definition_version:1,required_entitlement:'public'},
            {method_key:'מסתתר',computed_value:window.__changedValue?1580:1237,definition_version:window.__changedVersion?2:1,mathematical_family:'adjacent_difference',required_entitlement:'public'},
            {method_key:'קדמי',display_label:'משולש',computed_value:3137,definition_version:1,required_entitlement:window.__methodPrivate?'private':'public'},
            {method_key:'גדול',computed_value:844,definition_version:1,required_entitlement:'public'},
            {method_key:'צניע',computed_value:999,definition_version:1,required_entitlement:'private'}]};
          if(args.p_phrase==='וראית את אחרי')return {error:null,data:[{method_key:'רגיל',computed_value:1237,definition_version:1,mathematical_family:'base_additive'}]};
          const value=args.p_phrase==='בן דוד'?66:args.p_phrase==='א'?1:358;
          return {error:null,data:[{method_key:'רגיל',computed_value:value,definition_version:1},
            {method_key:'מילוי',computed_value:878,definition_version:2},
            {method_key:'מסתתר',computed_value:0,definition_version:3}]};
        }
      };
    `,
    shell: `
      import React,{createContext,useContext,useState} from 'react';
      import {useNavigate} from 'react-router-dom';
      import {useResearch} from '/src/lib/research/ResearchProvider.jsx';
      import NumberDrawer from '/src/components/number2029/NumberDrawer2029.jsx';
      import {buildExactReturnPatch} from '/src/lib/research/researchContext.js';
      const Context=createContext(null);
      export const use2029Shell=()=>useContext(Context);
      export function FrameState({title,children}){return <section><h2>{title}</h2>{children}</section>;}
      export default function Shell({children}){
        const [target,setTarget]=useState(null);const research=useResearch();const navigate=useNavigate();
        const go=href=>{setTarget(null);navigate(href);};
        const openNumber=value=>{
          window.__sheetTargets.push(value);
          // Same contextual selection handoff as the existing SystemFrame openNumber API.
          research.updateResearchContext({subject:{id:String(value.resultValue),type:'number',label:String(value.resultValue),href:'/2029/number/'+value.resultValue},
            selection:{entityId:value.id,entityType:'gematria_expression',locator:value.locator,expression:value.expression,method:value.method,resultValue:value.resultValue},lens:'gematria'});
          setTarget(value);
        };
        return <Context.Provider value={{openNumber,go,razielLocked:true,openRaziel:()=>{throw Error('Unexpected model action');}}}>
          <div className="sod29-root surface-topic">{children}</div>
          {target?<div role="dialog" aria-label="מספר בהקשר">
            <button onClick={()=>setTarget(null)}>סגור חלונית</button>
            <button onClick={()=>{const back=research.context.returnTo;research.updateResearchContext(buildExactReturnPatch(research.context));go(back.href);}}>חזור למקור</button>
            <NumberDrawer target={target} context={research.context} research={research} go={go}/>
          </div>:null}
        </Context.Provider>;
      }
    `,
    entry: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import {BrowserRouter,Routes,Route,Link} from 'react-router-dom';
      import {Provider} from '/src/lib/research/ResearchProvider.jsx';
      import Topic from '/src/pages/Topic2029Page.jsx';
      import Gallery from '/src/pages/Gallery2029Page.jsx';
      import {useResearch} from '/src/lib/research/ResearchProvider.jsx';
      import {useNavigate} from 'react-router-dom';
      import '/src/components/experience2029/sod2029.css';
      window.__reads=[];window.__sheetTargets=[];window.__galleryRequests=[];window.__traceReads=[];
      window.__nativeGalleryRow=id=>({id,wp_gallery_id:Math.floor(Number(id.slice(-12))/100),ordering:Number(id.slice(-12))%100,
        published:1,min_tier:0,image_type:'gematria',description:'כיתוב מדויק '+id,
        image_url:'https://example.test/storage/v1/object/public/media/'+id+'.png',
        all_values:[844,1237,3137],ocr_text:window.__sourceChanged?'טקסט השתנה':'טקסט שמור התגלות'});
      function Target(){const research=useResearch(),navigate=useNavigate();return <><p>יעד המשך</p>
        <button onClick={()=>navigate(research.context.returnTo.href)}>חזרה לתמונה</button></>;}
      createRoot(document.getElementById('root')).render(<BrowserRouter><Provider>
        <Link to="/topic/other">טופיק אחר</Link>
        <Link to="/topic/source-beta">מקור בטופיק שני</Link>
        <Routes><Route path="/topic/:slug" element={<Topic/>}/><Route path="/world" element={<Gallery/>}/><Route path="*" element={<Target/>}/></Routes>
      </Provider></BrowserRouter>);
    `,
  };
  return {
    name: "topic-number-sheet-acceptance", enforce: "pre",
    resolveId(source) {
      if (source === "/__topic-sheet-entry.jsx") return "\0topic-sheet:entry.jsx";
      for (const [suffix, name] of aliases) {
        if (source.endsWith(suffix) || source.endsWith(suffix.slice(suffix.lastIndexOf("/")))) return "\0topic-sheet:" + name + ".jsx";
      }
      return null;
    },
    async load(id) {
      if (!id.startsWith("\0topic-sheet:")) return null;
      const code = modules[id.slice(13).replace(/\.jsx$/, "")];
      return code == null ? null : vite.transformWithOxc(code, "fixture.jsx", { lang: "jsx", jsx: { runtime: "automatic" } });
    },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (!request.url?.startsWith("/topic/") && !request.url?.startsWith("/2029/number/") && !request.url?.startsWith("/world")) return next();
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        response.end(await server.transformIndexHtml(request.url, '<!doctype html><html lang="he" dir="rtl"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/__topic-sheet-entry.jsx"></script></body></html>'));
      });
    },
  };
}

test("native gallery uses exact public occurrences and canonical method navigation with return", { skip: !available, timeout: 120000 }, async () => {
  const cacheDir=mkdtempSync(join(tmpdir(),"gallery-native-"));
  const server=await vite.createServer({root,configFile:false,cacheDir,plugins:[fixturePlugin(),reactPlugin()],
    server:{host:"127.0.0.1",port:0},logLevel:"error"});
  let browser;
  try{
    await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
    browser=await playwright.chromium.launch({headless:true,executablePath,args:["--no-sandbox","--disable-dev-shm-usage"]});
    for(const width of [320,1440]){
      const context=await browser.newContext({viewport:{width,height:900}});
      await context.addInitScript(()=>{window.__nativeGallery=true;});
      const errors=[];const page=await context.newPage();page.setDefaultTimeout(10000);
      page.on("pageerror",error=>errors.push(error.message));
      await page.route("https://example.test/**",route=>route.fulfill({contentType:"image/svg+xml",
        body:'<svg xmlns="http://www.w3.org/2000/svg" width="240" height="120"><rect width="240" height="120" fill="gold"/></svg>'}));
      const id="10000000-0000-4000-8000-000000008107";
      const href=`/world?view=gallery&gallery=81&image=${id}#gallery-source-${id}`;
      await page.goto(origin+href);
      const exhibit=page.locator(`[data-gallery-selected="${id}"]`);await exhibit.waitFor();
      assert.match(await exhibit.innerText(),new RegExp("כיתוב מדויק "+id));
      const reads=await page.evaluate(()=>window.__galleryRequests);
      assert.equal(reads.length,1);assert.equal(reads[0].length,6);assert.equal(reads[0][0].endsWith("8106"),true);
      assert.equal(await page.locator(".g29-thumbnails a").count(),6);
      assert.equal(await exhibit.locator(".g29-canvas img").getAttribute("data-media-fit"),"preserve-whole-image");
      await exhibit.getByText("מספרים שסומנו במקור · 3",{exact:true}).click();
      await exhibit.locator('a[href="/2029/number/3137"]').click();
      await page.waitForURL(origin+"/2029/number/3137");
      assert.equal(await page.evaluate(()=>window.__researchContext.returnTo.selection.sourceRef),`gallery_images:${id}`);
      await page.goBack();await exhibit.waitFor();
      assert.equal(new URL(page.url()).hash,`#gallery-source-${id}`);
      const choose=async()=>{
        const research=exhibit.locator(".rv-source-research");
        if(await research.getAttribute("open")===null)await research.locator("summary").click();
        const text=research.getByRole("textbox");await text.evaluate(el=>{const start=el.value.indexOf('התגלות');el.focus();el.setSelectionRange(start,start+6);
          document.dispatchEvent(new Event('selectionchange'));el.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));});
        await research.getByRole("button",{name:"פתיחת שיטות לביטוי שנבחר",exact:true}).click();
        return research.getByRole("button",{name:"פתח התגלות בשיטת משולש: 3137",exact:true});
      };
      await (await choose()).click();await page.waitForURL(/\/2029\/number\/3137\?focus=/);
      const selected=await page.evaluate(()=>window.__researchContext);
      assert.equal(selected.selection.expression,"התגלות");assert.equal(selected.selection.method,"קדמי");
      assert.equal(selected.selection.methodVersion,"1");assert.equal(selected.dimensions.sourceMethodPairing,"not_asserted");
      assert.equal(selected.returnTo.href,href);
      await page.getByRole("button",{name:"חזרה לתמונה",exact:true}).click();await exhibit.waitFor();
      for(const flag of ["__methodPrivate","__sourceChanged"]){
        const method=await choose();await method.waitFor();
        await page.evaluate(name=>{window[name]=true;},flag);await method.click();
        await exhibit.getByText(flag==="__methodPrivate"?/השיטה, הערך או גרסת החישוב/:/המקור אינו זמין/).waitFor();
        assert.equal(new URL(page.url()).searchParams.get("gallery"),"81");
        await page.evaluate(name=>{window[name]=false;},flag);
      }
      const method=await choose();await method.waitFor();
      await page.evaluate(()=>{window.__galleryWithdrawn=true;});await method.click();
      await page.getByText(/התמונה המבוקשת אינה זמינה כאן/).waitFor();
      assert.equal(await page.locator(".g29-exhibit,.g29-thumbnails img").count(),0,"withdrawn source content is removed");
      await page.evaluate(()=>{window.__galleryWithdrawn=false;});
      await page.getByRole("button",{name:"בדיקה מחדש",exact:true}).click();await exhibit.waitFor();
      await page.getByRole("link",{name:"החלון הבא ←",exact:true}).click();
      await page.locator('[data-gallery-selected="10000000-0000-4000-8000-000000008112"]').waitFor();
      assert.equal(await page.locator(".g29-thumbnails a").count(),2);
      await page.goto(origin+"/world?view=gallery&gallery=81&image=10000000-0000-4000-8000-000000002901");
      await page.getByText(/התמונה המבוקשת אינה זמינה כאן/).waitFor();
      assert.equal(await page.locator(".g29-exhibit").count(),0,"wrong-gallery locator cannot select another gallery row");
      assert.deepEqual(errors,[]);await context.close();
    }
  }finally{await browser?.close();await server.close();rmSync(cacheDir,{recursive:true,force:true});}
});

test("Topic opens the existing Number sheet with method/value/source and exact return", { skip: !available, timeout: 120000 }, async () => {
  const cacheDir = mkdtempSync(join(tmpdir(), "topic-sheet-"));
  const server = await vite.createServer({ root, configFile: false, cacheDir,
    plugins: [fixturePlugin(), reactPlugin()], server: { host: "127.0.0.1", port: 0 }, logLevel: "error" });
  let browser;
  try {
    await server.listen();
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    browser = await playwright.chromium.launch({ headless: true, executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    for (const width of [320, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      page.setDefaultTimeout(10000);
      const errors = [], external = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.route("**/*", route => {
        if (route.request().url().startsWith(origin + "/")) return route.continue();
        external.push(route.request().url()); return route.abort();
      });
      const openTopic = async (slug = "pilot") => {
        await page.goto(origin + "/topic/" + slug);
        if (!["hidden", "missing"].includes(slug)) {
          try { await page.locator(".sod29-topic-equation").first().waitFor(); }
          catch (error) { throw new Error(`${error.message}\nPage: ${await page.locator('body').innerText()}\nErrors: ${JSON.stringify(errors)}`); }
        }
      };
      await openTopic();
      const rows = page.locator(".sod29-topic-equation");
      const milui = rows.filter({ hasText: "משיח" }).filter({ hasText: "מילוי" }).filter({ has: page.locator('a[href="/2029/number/878"]') }).first();
      await milui.getByRole("button", { name: "משיח", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "מספר בהקשר" });
      await dialog.locator('[data-number-core-root="878"]').waitFor();
      assert.equal(new URL(page.url()).pathname, "/topic/pilot");
      const focus = await page.evaluate(() => ({ target: window.__sheetTargets.at(-1), context: window.__researchContext }));
      assert.equal(focus.target.method, "מילוי"); assert.equal(focus.target.expression, "משיח");
      assert.equal(focus.target.resultValue, 878);
      assert.equal(focus.context.dimensions.topicAuthoredSourcePath, "findings[0]");
      assert.equal(focus.context.returnTo.selection.sourceRef.startsWith("topic_cards:"), true);
      assert.equal(focus.context.returnTo.selection.locator, focus.target.locator);
      await dialog.getByRole("button", { name: "חזור למקור", exact: true }).click();
      assert.equal(new URL(page.url()).hash, focus.target.locator);
      const returnAnchorExists = await page.evaluate(() => Boolean(document.getElementById(decodeURIComponent(location.hash.slice(1)))));
      assert.equal(returnAnchorExists, true);
      await milui.locator("a").click();
      await dialog.locator('[data-number-core-root="878"]').waitFor();
      await dialog.getByRole("button", { name: "סגור חלונית", exact: true }).click();
      const shoes = rows.filter({ hasText: "בן דוד" });
      await shoes.getByRole("button", { name: "בן דוד", exact: true }).click();
      await dialog.locator('[data-number-core-root="66"]').waitFor();
      assert.equal((await page.evaluate(() => window.__sheetTargets.at(-1))).method, "רגיל");
      await dialog.getByRole("button", { name: "סגור חלונית", exact: true }).click();
      const count = await page.evaluate(() => window.__sheetTargets.length);
      for (const row of [rows.filter({ hasText: "תמי" }), rows.filter({ hasText: "359" }), rows.filter({ hasText: "רגיל/מילוי" })]) {
        await row.locator("button").click();
        await page.locator(".sod29-topic-focus-error").waitFor();
        assert.equal(await page.evaluate(() => window.__sheetTargets.length), count);
      }
      assert.equal(await rows.filter({ hasText: "ערך חסר" }).locator("a").count(), 0);
      await rows.filter({ hasText: "א" }).filter({ hasText: "מסתתר" }).locator("button").click();
      await dialog.locator('[data-number-core-root="0"]').waitFor();
      await dialog.getByRole("button", { name: "סגור חלונית", exact: true }).click();
      await openTopic();
      await page.evaluate(() => { window.__offline = true; });
      await milui.locator("button").click();
      await page.locator(".sod29-topic-focus-error").getByText("לא ניתן לטעון", { exact: false }).waitFor();
      assert.equal(await page.getByRole("dialog").count(), 0);
      await openTopic();
      await page.evaluate(() => { window.__holdProfile = true; });
      await milui.locator("button").click();
      await page.waitForFunction(() => typeof window.__releaseProfile === "function");
      await page.getByRole("link", { name: "טופיק אחר", exact: true }).click();
      await page.waitForURL("**/topic/other");
      await page.evaluate(() => { window.__holdProfile = false; window.__releaseProfile(); });
      await page.locator('.sod29-topic2029[data-canonical-slug="other"]').waitFor();
      assert.equal(await page.getByRole("dialog").count(), 0, "a late previous-topic result cannot open a sheet");
      await openTopic("1237");
      await page.locator(".rv [data-rv-hero]").waitFor();
      assert.equal(await page.locator(".sod29-topic-hero").count(), 0, "Claude gate replaces rather than duplicates the generic hero");
      await page.locator('.rv-method[data-status="confirmed"]').nth(1).waitFor();
      const center = page.locator("#rv-center");
      assert.doesNotMatch(await center.innerText(), /adjacent_difference|base_additive|fn_method_profile|אומת מול מנוע/);
      assert.equal(await page.evaluate(()=>window.__traceReads.length), 0, "the gate does not eagerly load method traces");
      const hitgalut = page.locator("#rv-method-hitgalut");
      const openHitgalut = hitgalut.getByRole("button", { name: "פירוט החישוב של התגלות בשיטת מסתתר", exact: true });
      await hitgalut.locator("summary").click();
      assert.match(await hitgalut.innerText(), /adjacent_difference/);
      await hitgalut.locator("summary").click();
      await openHitgalut.click();
      await dialog.locator('[data-number-core-root="1237"]').waitFor();
      const methodFocus = await page.evaluate(()=>({target:window.__sheetTargets.at(-1),context:window.__researchContext}));
      assert.equal(methodFocus.target.method, "מסתתר");
      assert.equal(methodFocus.target.resultValue, 1237);
      assert.equal(methodFocus.context.selection.methodVersion, "1");
      assert.equal(methodFocus.context.dimensions.topicExpressionOrigin, "method_profile");
      assert.equal(methodFocus.context.dimensions.topicAuthoredSourcePath, null);
      assert.equal(methodFocus.context.returnTo.href, "/topic/1237#rv-method-hitgalut");
      await dialog.locator(".sod29-number-v10-calculation-card").click();
      await dialog.locator('[data-method-inspector="מסתתר"]').waitFor();
      try { await dialog.locator('[data-method-visual="adjacent-letter-tension"]').waitFor(); }
      catch (error) { throw new Error(`${error.message}\nDepth: ${await dialog.innerText()}\nTrace reads: ${JSON.stringify(await page.evaluate(()=>window.__traceReads))}\nErrors: ${JSON.stringify(errors)}`); }
      await dialog.getByRole("tab", { name: "למד", exact: true }).click();
      await dialog.getByRole("heading", { name: "מה השיטה עושה", exact: true }).waitFor();
      assert.match(await dialog.innerText(), /ה \(5\) ↔ ת \(400\): הפרש 395/);
      await dialog.getByRole("button", { name: "חזור למקור", exact: true }).click();
      assert.equal(new URL(page.url()).hash, "#rv-method-hitgalut");
      await page.locator("#rv-method-vraita").getByRole("button", { name: "פירוט התוצאה 1237 עבור וראית את אחרי בשיטת רגיל", exact: true }).click();
      await dialog.locator('[data-number-core-root="1237"]').waitFor();
      assert.equal(await page.evaluate(()=>window.__sheetTargets.at(-1).method), "רגיל");
      await dialog.getByRole("button", { name: "חזור למקור", exact: true }).click();
      assert.equal(new URL(page.url()).hash, "#rv-method-vraita");
      for (const flag of ["__changedVersion", "__changedValue", "__offline"]) {
        await page.evaluate(name=>{window[name]=true;}, flag);
        await openHitgalut.click();
        await hitgalut.locator('[role="status"]').waitFor();
        assert.equal(await page.getByRole("dialog").count(), 0);
        await page.evaluate(name=>{window[name]=false;}, flag);
      }
      await page.evaluate(()=>{window.__traceMode='wrong';});
      await openHitgalut.click();
      await dialog.locator('[data-number-core-root="1237"]').waitFor();
      await dialog.locator(".sod29-number-v10-calculation-card").click();
      await dialog.getByRole("tab", { name: "למד", exact: true }).click();
      await dialog.getByText("פירוט מאומת אינו זמין כרגע.", { exact: false }).waitFor();
      assert.equal(await dialog.locator('[data-method-visual="adjacent-letter-tension"]').count(), 0);
      await dialog.getByRole("button", { name: "חזור למקור", exact: true }).click();
      await page.evaluate(()=>{window.__traceMode=null;});
      const map = await page.evaluate(()=>window.__researchContext.dimensions.surfaceSections.map(item=>({id:item.id,exists:Boolean(document.getElementById(item.targetId))})));
      assert.ok(map.length >= 6 && map.every(item=>item.exists), "every shared context-map entry targets a real gate section");
      assert.equal(await page.evaluate(()=>window.__researchContext.dimensions.activeSectionId), "rv-center");
      await page.getByRole("navigation", { name: "פרקי השער", exact: true }).getByRole("link", { name: "גלריות", exact: true }).click();
      await page.waitForFunction(()=>window.__researchContext.dimensions.activeSectionId==='rv-galleries');
      await page.getByRole("region", { name: "ממצאים דרך המספר", exact: true }).waitFor();
      const gallery = page.locator('.rv-gallery[aria-labelledby="rv-gal-29"]');
      await page.waitForFunction(()=>document.querySelectorAll('[aria-labelledby="rv-gal-29"] .rv-source').length===3);
      assert.match(await gallery.innerText(), /3 פריטים לא הוצגו/);
      assert.doesNotMatch(await gallery.innerText(), /זמן האירוע|תוצאה סופית/);
      await gallery.locator('.rv-source-history summary').first().click();
      assert.match(await gallery.innerText(), /2020-06/);
      assert.doesNotMatch(await gallery.innerText(), /01\.06\.2020/);
      assert.match(await gallery.innerText(), /28\.10\.2026/);
      assert.match(await gallery.innerText(), /חשוון/);
      await page.evaluate(()=>{window.__failNextGallery=true;});
      await gallery.getByRole("button", { name: "עוד מהגלריה", exact: true }).click();
      await gallery.getByRole("button", { name: "נסה שוב את הגלריה", exact: true }).click();
      await page.waitForFunction(()=>document.querySelectorAll('[aria-labelledby="rv-gal-29"] .rv-source').length===4);
      assert.equal(await gallery.getByRole("button", { name: "עוד מהגלריה", exact: true }).count(), 0, "withheld rows do not cause an endless More loop");
      assert.deepEqual(await page.evaluate(()=>window.__galleryRequests.filter(ids=>ids[0]?.startsWith('29-'))), [
        ["29-0","29-1","29-2","29-3","29-4","29-5"],["29-6","29-7"],["29-6","29-7"]
      ]);
      const source = page.locator('#rv-source-gallery-81-81-5');
      await source.locator('.rv-source-research summary').click();
      const sourceText = source.getByRole('textbox', {name:'טקסט שמור לבחירת ביטוי',exact:true});
      const beforeSelection = await page.evaluate(()=>window.__reads.filter(r=>r.rpc==='fn_method_profile').length);
      await sourceText.evaluate(el=>{el.focus();const start=el.value.indexOf('התגלות');el.setSelectionRange(start,start+'התגלות'.length);document.dispatchEvent(new Event('selectionchange'));el.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));});
      await source.getByRole('button',{name:'פתיחת שיטות לביטוי שנבחר',exact:true}).click();
      const triangular = source.getByRole('button',{name:'פתח התגלות בשיטת משולש: 3137',exact:true});
      await triangular.waitFor();
      assert.equal(await page.evaluate(()=>window.__reads.filter(r=>r.rpc==='fn_method_profile').length), beforeSelection+1);
      assert.doesNotMatch(await source.innerText(), /צניע/);
      await triangular.click();
      await dialog.locator('[data-number-core-root="3137"]').waitFor();
      const sourceFocus = await page.evaluate(()=>window.__researchContext);
      assert.equal(sourceFocus.selection.method,'קדמי');
      assert.equal(sourceFocus.selection.sourceRef,'gallery_images:81-5');
      assert.equal(sourceFocus.dimensions.topicAuthoredSourcePath,null);
      assert.equal(sourceFocus.dimensions.sourceMethodPairing,'not_asserted');
      assert.equal(sourceFocus.dimensions.storedTextSelectionKind,'stored_ocr');
      assert.equal(sourceFocus.dimensions.storedTextSelectionSourceRef,'gallery_images:81-5');
      assert.equal(sourceFocus.returnTo.href,'/topic/1237#rv-source-gallery-81-81-5');
      await dialog.getByRole('button',{name:'חזור למקור',exact:true}).click();
      assert.equal(new URL(page.url()).hash,'#rv-source-gallery-81-81-5');
      for(const flag of ['__methodPrivate','__sourceChanged','__galleryWithdrawn']){
        await source.getByRole('button',{name:'פתיחת שיטות לביטוי שנבחר',exact:true}).click();
        await triangular.waitFor();
        await page.evaluate(name=>{window[name]=true;},flag);
        await triangular.click();
        await source.getByText(flag==='__methodPrivate'?/השיטה אינה זמינה/:/המקור אינו זמין/).waitFor();
        assert.equal(await page.getByRole('dialog').count(),0);
        await page.evaluate(name=>{window[name]=false;},flag);
      }
      assert.equal(await source.getByRole('textbox').count(),0,'known-withdrawn source text and derived choices are removed, not merely disabled');
      assert.equal(await source.locator('a').count(),0,'known-withdrawn tags do not remain as navigation leaks');
      await milui.getByRole("button", { name: "משיח", exact: true }).click();
      await dialog.locator('[data-number-core-root="878"]').waitFor();
      assert.equal(new URL(page.url()).pathname, "/topic/1237");
      await dialog.getByRole("button", { name: "חזור למקור", exact: true }).click();
      assert.equal(await page.evaluate(()=>Boolean(document.getElementById(decodeURIComponent(location.hash.slice(1))))), true);
      await openTopic("hidden");
      await page.getByText("גוף ההתכנסות אינו מוצג לציבור", { exact: true }).waitFor();
      assert.equal(await page.locator(".sod29-topic-equation,.sod29-topic-phrase").count(), 0);
      await openTopic("missing");
      await page.getByText("הציר לא נמצא", { exact: true }).waitFor();
      await openTopic("source-alpha");
      await page.locator("#topic-sources").getByText("SOURCE_source-alpha", { exact: true }).waitFor();
      await page.waitForFunction(()=>window.__researchContext.dimensions.surfaceSections.some(item=>item.id==='topic-sources'));
      await page.waitForFunction(()=>window.__researchContext.dimensions.surfaceSections.some(item=>item.id==='topic-related'));
      await page.evaluate(()=>{window.__holdHubFor='source-beta';window.__staleTopicFrames=[];
        window.__topicObserver=new MutationObserver(()=>{
          const topic=document.querySelector('[data-canonical-slug="source-beta"]');
          if(topic?.textContent.includes('SOURCE_source-alpha'))window.__staleTopicFrames.push('alpha in beta');
        });window.__topicObserver.observe(document.body,{childList:true,subtree:true});});
      await page.getByRole("link", { name: "מקור בטופיק שני", exact: true }).click();
      await page.locator('[data-canonical-slug="source-beta"]').waitFor();
      await page.waitForFunction(()=>typeof window.__releaseHub==='function');
      assert.equal(await page.getByText("SOURCE_source-alpha", { exact: true }).count(), 0);
      await page.evaluate(()=>{window.__holdHubFor=null;window.__releaseHub();});
      await page.locator("#topic-sources").getByText("SOURCE_source-beta", { exact: true }).waitFor();
      assert.deepEqual(await page.evaluate(()=>window.__staleTopicFrames), []);
      await page.evaluate(()=>window.__topicObserver.disconnect());
      assert.deepEqual(external, []); assert.deepEqual(errors, []);
      await context.close();
    }
  } finally {
    await browser?.close(); await server.close(); rmSync(cacheDir, { recursive: true, force: true });
  }
});
