import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url);
let playwright, vite, reactPlugin;
try {
  playwright = require("playwright");
  vite = await import(pathToFileURL(require.resolve("vite")).href);
  reactPlugin = (await import(pathToFileURL(require.resolve("@vitejs/plugin-react")).href)).default;
} catch { /* Optional local browser tooling. */ }
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH
  || (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : playwright?.chromium.executablePath());
const available = Boolean(playwright && vite && reactPlugin && executablePath && existsSync(executablePath));

function fixturePlugin() {
  const modules = {
    context: `export const useResearch=()=>({context:{journey:{id:'fixture-path'}},
      updateResearchContext:patch=>{window.__returnContext=patch;}});`,
    client: `
      const source='10000000-0000-4000-8000-000000000101';
      const unavailable='10000000-0000-4000-8000-000000000102';
      function row(index,value=1118){return {id:'00000000-0000-4000-8000-'+String(index+1).padStart(12,'0'),
        created_at:'2026-10-29T10:00:00.000Z',kind:'observation',statement:'ממצא בדיקה '+index,
        contributor:'צבי',source_ref:'channel_updates:'+source,source_contributor_id:'c66f0464-0928-490e-be9b-66d8a87e7fc8',
        privacy_scope:'public',status:'approved',value,engine_verified:false,
        meta:{ext:{presentation:{statement_role:'research_statement'}}}};}
      function records(value,cursor){
        if(cursor)return [row(999,value),row(0,value)];
        if(value===0)return [{...row(100,0),statement:'אפס מפורש'}];
        if(value!==1118)return [row(value+200,value)];
        const rows=Array.from({length:26},(_,index)=>row(index));
        rows[1]={...rows[1],statement:'PRIVATE_MARKER',privacy_scope:'private'};
        rows[2]={...rows[2],statement:'UNAVAILABLE_SOURCE_MARKER',source_ref:'channel_updates:'+unavailable};
        rows[3]={...rows[3],statement:'UNREVIEWED_MARKER',meta:{}};
        rows[4]={...rows[4],statement:'WRONG_VALUE_MARKER',value:9};
        rows[5]={...rows[5],statement:'ABSENT_VALUE_MARKER',value:null};
        rows[6]={...rows[6],statement:'PERSON_ONLY_MARKER',meta:{...rows[6].meta,personal_scope:'person_only'}};
        if(window.__includeNew)rows.unshift({...row(999),statement:'ממצא חדש לאחר הבנייה'});
        return rows.slice(0,26);
      }
      const client={from(table){
        const filters=[];let limit=0;
        const query={select(){return this;},eq(k,v){filters.push([k,v]);return this;},
          in(k,v){filters.push([k,v]);return this;},order(){return this;},or(v){filters.push(['or',v]);return this;},
          limit(v){limit=v;return this;},
          async then(resolve,reject){
            window.__reads.push({role:'anon',table,filters,limit});
            if(window.__fail&&table==='world_contributor_research_v1')return resolve({error:{message:'offline'},data:null});
            const value=filters.find(([key])=>key==='value')?.[1];
            const cursor=filters.some(([key])=>key==='or');
            if(value===1&&window.__hold)await new Promise(done=>{window.__release=done;});
            const data=table==='world_contributor_research_v1'?records(value,cursor):
              (filters.find(([key])=>key==='id')?.[1]||[]).filter(id=>id!==unavailable).map(id=>({id,status:'live',channel:'tzvi'}));
            return resolve({error:null,data});
          }};return query;}};
      export const getPublicResearchClient=()=>client;
    `,
    entry: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import {BrowserRouter,Routes,Route,Link,useParams} from 'react-router-dom';
      import TopicResearch from '/src/components/research/TopicNumberResearch2029.jsx';
      import '/src/components/experience2029/sod2029.css';import '/src/pages/topic2029.css';
      window.__reads=[];window.__returnContext=null;
      function Topic(){const {slug}=useParams();return <main className="sod29-root surface-topic" style={{padding:12,maxWidth:1100,margin:'auto'}}>
        <h1>טופיק בדיקה</h1><TopicResearch key={slug} projection={{slug,title:'טופיק בדיקה',canonicalPath:'/topic/'+slug,
          sourceRef:'topic_cards:fixture',numbers:slug==='empty'?[]:[1118,0,1,2,3,4,5,6],highlightNumbers:slug==='empty'?[]:[1118],withheld:slug==='hidden'}}/>
        <Link to="/topic/second">טופיק אחר</Link></main>;}
      createRoot(document.getElementById('root')).render(<BrowserRouter><Routes>
        <Route path="/topic/:slug" element={<Topic/>}/><Route path="/world" element={<h1>מקור או ממצא</h1>}/>
      </Routes></BrowserRouter>);
    `,
  };
  return {
    name: "topic-public-findings-fixture", enforce: "pre",
    resolveId(source) {
      if (source === "/__topic-findings-entry.jsx") return "\0topic-findings:entry.jsx";
      if (source.endsWith("/ResearchProvider.jsx")) return "\0topic-findings:context.jsx";
      if (source.endsWith("/researchViewMode.js")) return "\0topic-findings:client.jsx";
      return null;
    },
    async load(id) {
      const prefix = "\0topic-findings:";
      if (!id.startsWith(prefix)) return null;
      const code = modules[id.slice(prefix.length).replace(/\.jsx$/, "")];
      return code == null ? null : vite.transformWithOxc(code, "fixture.jsx", { lang: "jsx", jsx: { runtime: "automatic" } });
    },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (!request.url?.startsWith("/topic/") && !request.url?.startsWith("/world")) return next();
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        response.end(await server.transformIndexHtml(request.url, '<!doctype html><html lang="he" dir="rtl"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="root"></div><script type="module" src="/__topic-findings-entry.jsx"></script></body></html>'));
      });
    },
  };
}

test("Topic mounts the same public number lens only in its public body", () => {
  const page = readFileSync(join(root, "src/pages/Topic2029Page.jsx"), "utf8");
  assert.match(page, /projection\.withheld \? <FrameState[\s\S]*<TopicNumberResearch2029/);
  assert.match(page, /<TopicNumberResearch2029 key=\{projection\.slug\} projection=\{projection\}/);
  assert.doesNotMatch(page, /fetchZviNumberFindingsPage|ZVI_REVIEWED_FINDINGS/);
});

test("Topic number lens preserves public gates, pagination, new findings and exact source return", { skip: !available, timeout: 120000 }, async () => {
  const cacheDir = mkdtempSync(join(tmpdir(), "topic-public-findings-"));
  const server = await vite.createServer({ root, configFile: false, cacheDir, plugins: [fixturePlugin(), reactPlugin()],
    server: { host: "127.0.0.1", port: 0 }, logLevel: "error" });
  let browser;
  try {
    await server.listen();
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    browser = await playwright.chromium.launch({ headless: true, executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    for (const width of [320, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage(); page.setDefaultTimeout(10000);
      const errors = [], external = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.route("**/*", route => {
        if (route.request().url().startsWith(origin + "/")) return route.continue();
        external.push(route.request().url()); return route.abort();
      });
      await page.goto(origin + "/topic/pilot");
      const section = page.getByRole("region", { name: "ממצאים דרך המספר", exact: true });
      await section.waitFor();
      assert.equal(await page.evaluate(() => window.__reads.length), 0);
      await section.getByRole("button", { name: "עוד מספרים בטופיק (2)", exact: true }).click();
      assert.equal(await section.locator("details").count(), 8);
      const panel = page.locator("#topic-number-research-1118");
      await panel.locator("summary").click();
      const load = panel.getByRole("button", { name: "הצגת ממצאי צבי למספר", exact: true });
      await load.waitFor(); assert.equal(await page.evaluate(() => window.__reads.length), 0);
      await load.click();
      await panel.getByRole("link", { name: "ממצא בדיקה 0", exact: true }).waitFor();
      const text = await panel.innerText();
      for (const marker of ["PRIVATE_MARKER", "UNAVAILABLE_SOURCE_MARKER", "UNREVIEWED_MARKER", "WRONG_VALUE_MARKER", "ABSENT_VALUE_MARKER", "PERSON_ONLY_MARKER"]) assert.equal(text.includes(marker), false, marker);
      assert.match(await section.innerText(), /ולא קשר ישיר מתועד/);
      await panel.getByRole("button", { name: "עוד ממצאים", exact: true }).click();
      await panel.getByRole("link", { name: "ממצא בדיקה 999", exact: true }).waitFor();
      const hrefs = await panel.locator('a[href^="/world?finding="]').evaluateAll(nodes => nodes.map(node => node.getAttribute("href")));
      assert.equal(hrefs.length, new Set(hrefs).size);
      const exactOrigin = "/topic/pilot#topic-number-research-1118";
      await panel.getByRole("link", { name: "ממצא בדיקה 0", exact: true }).click();
      await page.waitForURL("**/world?finding=*");
      assert.equal(await page.evaluate(() => history.state.usr.returnTo), exactOrigin);
      const back = await page.evaluate(() => window.__returnContext.returnTo);
      assert.equal(back.href, exactOrigin); assert.equal(back.selection.sourceRef, "topic_cards:fixture");
      assert.equal(back.dimensions.topicFindingPath, "shared-number-not-direct-topic-relation");
      await page.goBack(); await load.waitFor();
      await page.evaluate(() => { window.__includeNew = true; });
      await load.click();
      await panel.getByRole("link", { name: "ממצא חדש לאחר הבנייה", exact: true }).waitFor();
      await panel.getByRole("link", { name: "פתיחת המקור", exact: true }).first().click();
      await page.waitForURL("**/world?view=sources*");
      assert.match(new URL(page.url()).hash, /^#source-occurrence-/);
      await page.goBack(); await load.waitFor();
      const zero = page.locator("#topic-number-research-0");
      await zero.locator("summary").click();
      await zero.getByRole("button", { name: "הצגת ממצאי צבי למספר", exact: true }).click();
      await zero.getByRole("link", { name: "אפס מפורש", exact: true }).waitFor();
      await page.goto(origin + "/topic/pilot#topic-number-research-6");
      const deep = page.locator("#topic-number-research-6");
      await deep.getByRole("button", { name: "הצגת ממצאי צבי למספר", exact: true }).waitFor();
      await page.evaluate(() => { window.__fail = true; });
      await deep.getByRole("button", { name: "הצגת ממצאי צבי למספר", exact: true }).click();
      await deep.getByRole("button", { name: "נסה שוב", exact: true }).waitFor();
      await page.evaluate(() => { window.__fail = false; });
      await deep.getByRole("button", { name: "נסה שוב", exact: true }).click();
      await deep.getByRole("link", { name: "ממצא בדיקה 206", exact: true }).waitFor();
      const reads = await page.evaluate(() => window.__reads);
      assert.ok(reads.length > 0 && reads.every(read => read.role === "anon"));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      await page.goto(origin + "/topic/pilot#topic-number-research-1");
      const slow = page.locator("#topic-number-research-1");
      await slow.getByRole("button", { name: "הצגת ממצאי צבי למספר", exact: true }).waitFor();
      await page.evaluate(() => { window.__hold = true; });
      await slow.getByRole("button", { name: "הצגת ממצאי צבי למספר", exact: true }).click();
      await page.waitForFunction(() => typeof window.__release === "function");
      await page.getByRole("link", { name: "טופיק אחר", exact: true }).click();
      await page.waitForURL("**/topic/second");
      await page.evaluate(() => { window.__hold = false; window.__release(); });
      await panel.locator("summary").click(); await load.click();
      await panel.getByRole("link", { name: "ממצא בדיקה 0", exact: true }).waitFor();
      assert.equal((await section.innerText()).includes("ממצא בדיקה 201"), false, "a previous-topic response stays discarded");
      await page.goto(origin + "/topic/empty");
      await page.getByRole("heading", { name: "טופיק בדיקה", exact: true }).waitFor();
      assert.equal(await page.getByRole("region", { name: "ממצאים דרך המספר", exact: true }).count(), 0);
      await page.goto(origin + "/topic/hidden");
      await page.getByRole("heading", { name: "טופיק בדיקה", exact: true }).waitFor();
      assert.equal(await page.getByRole("region", { name: "ממצאים דרך המספר", exact: true }).count(), 0);
      assert.equal(await page.evaluate(() => window.__reads.length), 0);
      assert.deepEqual(external, []); assert.deepEqual(errors, []);
      await context.close();
    }
  } finally {
    await browser?.close(); await server.close(); rmSync(cacheDir, { recursive: true, force: true });
  }
});
