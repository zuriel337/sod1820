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
    ["/research/gematriaTrace.js", "trace"],
    ["/research/WorldSourceStory.jsx", "noop"],
    ["/experience2029/CanonicalMediaFigure2029.jsx", "noop"],
    ["/experience2029/ConvergenceRatings2029.jsx", "noop"],
    ["/components/ShareActions.jsx", "noop"],
    ["/number2029/NumberAiAnalysis2029.jsx", "noop"],
    ["/gematria2029/MethodLens2029.jsx", "noop"],
    ["/gematria2029/SpatialMethodStage2029.jsx", "noop"],
    ["/lib/seo.js", "seo"],
  ]);
  const modules = {
    noop: "export default function Noop(){return null;}",
    seo: "export const applySeo=()=>{},clearConvergenceJsonLd=()=>{},setConvergenceJsonLd=()=>{};",
    hub: `export async function fetchEntityHubProjection(){return null;}
      export async function fetchTopicSourceContext(){return null;}
      export async function fetchGallerySourceContext({imageIds}){
        window.__galleryRequests.push(imageIds);
        if(window.__failNextGallery){window.__failNextGallery=false;throw Error('gallery offline');}
        return {items:imageIds.filter(id=>Number(id.split('-')[1])%2).map(galleryImageId=>({
          galleryImageId,label:'מקור בדיקה '+galleryImageId,createdAt:'2026-10-28',
          sourceIdentity:{ref:'gallery:'+galleryImageId},occurrences:[]
        }))};
      }`,
    prominence: "export async function fetchWorldProminenceInputs(){return {};}",
    discovery: "export const DISCOVERY_TOPIC_SLUGS=[];",
    trace: "export async function fetchGematriaMethodTrace(){return null;}",
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
      function card(slug){return {id:'fixture-'+slug,slug,title:'מחקר בחירות',status:'approved',node_id:null,
        numbers:[878],highlight_numbers:[878],image_ids:[],created_by:'מקור הבדיקה',
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
      export const getImagesByGallery=async(id)=>Array.from({length:8},(_,ordering)=>({id:id+'-'+ordering,ordering}));
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
          if(name!=='fn_method_profile')throw Error('Unexpected RPC '+name);
          if(window.__offline)return {data:null,error:{message:'offline'}};
          if(window.__holdProfile)await new Promise(resolve=>{window.__releaseProfile=resolve;});
          if(args.p_phrase==='התגלות')return {error:null,data:[{method_key:'רגיל',computed_value:844},{method_key:'מסתתר',computed_value:1237}]};
          if(args.p_phrase==='וראית את אחרי')return {error:null,data:[{method_key:'רגיל',computed_value:1237}]};
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
      import '/src/components/experience2029/sod2029.css';
      window.__reads=[];window.__sheetTargets=[];window.__galleryRequests=[];
      createRoot(document.getElementById('root')).render(<BrowserRouter><Provider>
        <Link to="/topic/other">טופיק אחר</Link>
        <Routes><Route path="/topic/:slug" element={<Topic/>}/><Route path="*" element={<p>יעד המשך</p>}/></Routes>
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
        if (!request.url?.startsWith("/topic/") && !request.url?.startsWith("/2029/number/")) return next();
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        response.end(await server.transformIndexHtml(request.url, '<!doctype html><html lang="he" dir="rtl"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/__topic-sheet-entry.jsx"></script></body></html>'));
      });
    },
  };
}

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
      await page.getByRole("region", { name: "ממצאים דרך המספר", exact: true }).waitFor();
      const gallery = page.locator('.rv-gallery[aria-labelledby="rv-gal-29"]');
      await page.waitForFunction(()=>document.querySelectorAll('[aria-labelledby="rv-gal-29"] .rv-source').length===3);
      assert.match(await gallery.innerText(), /3 פריטים לא הוצגו/);
      assert.match(await gallery.innerText(), /28\.10\.2026/);
      assert.match(await gallery.innerText(), /חשוון/);
      await page.evaluate(()=>{window.__failNextGallery=true;});
      await gallery.getByRole("button", { name: "עוד מהגלריה", exact: true }).click();
      await gallery.getByRole("button", { name: "נסה שוב את הגלריה", exact: true }).click();
      await page.waitForFunction(()=>document.querySelectorAll('[aria-labelledby="rv-gal-29"] .rv-source').length===4);
      assert.equal(await gallery.getByRole("button").count(), 0, "withheld rows do not cause an endless More loop");
      assert.deepEqual(await page.evaluate(()=>window.__galleryRequests.filter(ids=>ids[0]?.startsWith('29-'))), [
        ["29-0","29-1","29-2","29-3","29-4","29-5"],["29-6","29-7"],["29-6","29-7"]
      ]);
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
      assert.deepEqual(external, []); assert.deepEqual(errors, []);
      await context.close();
    }
  } finally {
    await browser?.close(); await server.close(); rmSync(cacheDir, { recursive: true, force: true });
  }
});
