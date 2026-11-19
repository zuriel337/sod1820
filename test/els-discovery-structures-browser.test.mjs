import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
const { chromium } = createRequire(import.meta.url)("playwright");
const { createServer } = await import("vite");
const react = (await import("@vitejs/plugin-react")).default;
const root = fileURLToPath(new URL("..", import.meta.url));

const entry = `import React,{useState}from'react';import{createRoot}from'react-dom/client';
import Panel from '/src/components/experience2029/ElsLexiconResearch2029.jsx';
import{state,fixtures}from'/test/fixtures/els-discovery-structures.mjs';
window.__requests=[];window.__adds=[];window.__shows=[];
function Fixture(){const[s,setState]=useState(state()),[response,setResponse]=useState(null),[view,setView]=useState('discovery'),[operation,setOperation]=useState(null);
window.__finish=(mode,onlyB=false)=>{const data=fixtures()[mode].data;setResponse({...data,plan:window.__requests.filter(r=>!r.cancel).at(-1).plan,items:onlyB?data.items.slice(1):data.items,target:window.__requests.filter(r=>!r.cancel).at(-1)})};
window.__other=()=>setState({...state(),verification:{state:'MATCH',corpus_id:'other'}});
window.__verify=()=>{const last=window.__adds.at(-1);setState({...state(),findings:last.map(f=>({...f,hits:(f.addShown||[]).map(hitId=>({hitId,selected:true,verified:true}))}))});setOperation({requestId:window.__adds.length,status:'done'})};
return React.createElement(Panel,{state:s,visible:true,view,busy:false,response,onProgress:()=>{},color:()=> 'blue',
onRequest:r=>window.__requests.push(r),onOpenDiscovery:()=>setView('discovery'),onRestore:()=>{},
onAdd:rows=>{window.__adds.push(rows);return window.__adds.length},onShowStructure:r=>window.__shows.push(r),findingsOperation:operation,
viewNavigation:React.createElement('nav',null,...[['discovery','ממצאים'],['structures','מבנים וקבוצות']].map(([id,label])=>React.createElement('button',{key:id,onClick:()=>setView(id)},label)))});}
createRoot(document.getElementById('root')).render(React.createElement(Fixture));`;

function plugin() {
  return { name: "discovery-structures-fixture", enforce: "pre",
    resolveId(id) { if (id === "/fixture.jsx") return "\0structures-entry"; if (id.endsWith("/ResearchProvider.jsx")) return "\0structures-library"; },
    load(id) {
      if (id === "\0structures-entry") return entry;
      if (id === "\0structures-library") return `import{useSyncExternalStore}from'react';
        import{applyResearchOps,emptyResearchState}from'/src/lib/research/researchSyncState.js';
        let state=emptyResearchState();const listeners=new Set();
        export const useResearch=()=>({...useSyncExternalStore(f=>{listeners.add(f);return()=>listeners.delete(f)},()=>state),syncStatus:'local_only',
          saveItem:entity=>{state=applyResearchOps(state,[{kind:'item_upsert',bucket:'library',entity}]);listeners.forEach(f=>f());return true;}});`;
    },
    configureServer(server) { server.middlewares.use(async (req, res, next) => {
      if (req.url !== "/fixture") return next();
      res.setHeader("content-type", "text/html");
      res.end(await server.transformIndexHtml("/fixture", '<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/fixture.jsx"></script></html>'));
    }); },
  };
}

test("combined groups: explicit sources, saved runs, deduplication and one atomic canonical admission", { timeout: 120000 }, async () => {
  const server = await createServer({ root, configFile: false, plugins: [plugin(), react()], server: { host: "127.0.0.1", port: 0 } });
  await server.listen();
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH
    || (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : chromium.executablePath()), args: ["--no-sandbox"] });
  const page = await browser.newPage(), errors = [], external = [];
  page.on("pageerror", error => errors.push(error.message));
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  await page.route("**/*", route => { if (!route.request().url().startsWith(origin)) { external.push(route.request().url()); return route.abort(); } return route.continue(); });
  try {
    await page.goto(`${origin}/fixture`);
    const start = page.getByRole("button", { name: "התחל גילוי", exact: true }); await start.waitFor();
    assert.equal(await page.evaluate(()=>{
      const panel=document.querySelector('.els29-lexicon-research');
      const settings=panel.querySelector('.els29-discovery-settings'), launch=panel.querySelector('.els29-start-discovery');
      const results=panel.querySelector('#els29-discovery-view'), storage=panel.querySelector('.els29-research-storage');
      return !!(settings.compareDocumentPosition(launch)&Node.DOCUMENT_POSITION_FOLLOWING)
        && !!(results.compareDocumentPosition(storage)&Node.DOCUMENT_POSITION_FOLLOWING);
    }),true,'configure first, launch together, saved scans after the research content');
    await page.getByText(/שמירת סריקות · בבנייה/).waitFor();
    await page.getByLabel("תמונת מצב המחקר").getByText(/מסלול שטרם נבדק/).waitFor();
    await page.getByRole("button", { name: "בחר את המסלול המוצע — ללא הפעלה" }).click();
    assert.equal(await page.evaluate(() => window.__requests.length), 0, 'recommendation selection never starts work');
    await page.getByLabel("מסלול הגילוי").selectOption("words"); await start.click(); await page.evaluate(() => window.__finish("words"));
    await page.getByLabel("מסלול הגילוי").selectOption("language"); await start.click(); await page.evaluate(() => window.__finish("language"));
    await page.getByLabel("תמונת מצב המחקר").getByText(/שני מסלולי הגילוי נוסו/).waitFor();
    await page.getByLabel("לפני הפעלת גילוי").getByText(/מדגם הביטויים כבר נבדק/).waitFor();
    await page.getByRole("button", { name: "מבנים וקבוצות", exact: true }).click();
    const group = page.locator('[data-structure-card]').filter({ has: page.locator('.els29-structure-members', { hasText: 'להבה' }) })
      .filter({ has: page.locator('.els29-structure-members', { hasText: 'חללנהל' }) });
    await group.waitFor();
    await page.getByLabel("כיסוי המבנים המשולבים").getByText(/2 מועמדים ייחודיים מתוך 3/).waitFor();
    await page.getByText("מקורות לניתוח המבנים · 2/2", { exact: true }).click();
    const language = page.locator('.els29-structure-sources').getByRole('checkbox', { name: /^ביטויים/ });
    await language.uncheck(); await group.waitFor({ state: "detached" });
    assert.equal(await page.evaluate(() => window.__requests.length), 2, 'selecting sources does not scan');
    await page.getByRole("button", { name: "ממצאים", exact: true }).click();
    assert.equal(await page.locator('[data-joint-row]').count(), 2, 'a grouping filter does not delete the joint findings');
    await page.getByLabel('אורך מינימלי להצגה').selectOption('7');
    assert.equal(await page.locator('[data-joint-row]').count(), 1);
    await page.getByLabel('מצב אימות הממצאים').selectOption('verified');
    assert.equal(await page.locator('[data-joint-row]').count(), 0);
    await page.getByRole('button', { name: 'נקה סינון', exact: true }).click();
    assert.equal(await page.locator('[data-joint-row]').count(), 2);
    assert.equal(await page.evaluate(() => window.__requests.length), 2, 'filters never launch a scan');
    await page.getByRole("button", { name: "מבנים וקבוצות", exact: true }).click(); await language.check(); await group.waitFor();
    await group.getByRole("button", { name: "אמת והצג קבוצה", exact: true }).click();
    const adds = await page.evaluate(() => window.__adds); assert.equal(adds.length, 1); assert.equal(adds[0].length, 2);
    assert.deepEqual(adds[0].flatMap(row => row.addShown).sort(), ['100_1_512', '101_1_511']);
    assert.equal(await page.evaluate(() => window.__shows.length), 0, 'wait for canonical verification before opening a relationship');
    await page.evaluate(() => window.__verify()); await page.waitForFunction(() => window.__shows.length === 1);
    await group.getByText("מקורות הקבוצה · 2 סריקות", { exact: true }).waitFor();
    // Saving and opening the same run is one source; a later run of that mode can coexist with its explicitly attached predecessor.
    await page.locator('.els29-discovery-saved > summary').click();
    await page.getByRole('button', { name: 'שמור ביטויים · התורה', exact: true }).click();
    const attach = page.getByRole('button', { name: 'צרף לכלי הגילוי ללא סריקה', exact: true }); await attach.click();
    await page.getByRole("button", { name: "מבנים וקבוצות", exact: true }).click();
    await page.getByText("מקורות לניתוח המבנים · 2/2", { exact: true }).waitFor();
    await start.click(); await page.evaluate(() => window.__finish("language", true));
    await page.getByText("מקורות לניתוח המבנים · 3/3", { exact: true }).waitFor();
    await group.getByText("מקורות הקבוצה · 3 סריקות", { exact: true }).waitFor();
    await attach.click(); await page.getByRole("button", { name: "מבנים וקבוצות", exact: true }).click();
    await page.getByText("מקורות לניתוח המבנים · 3/3", { exact: true }).waitFor();
    for (const width of [320, 390, 1440]) { await page.setViewportSize({ width, height: 900 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true); }
    assert.equal(await page.evaluate(() => window.__requests.length), 3);
    await page.evaluate(() => window.__other()); await page.getByText("מקורות לניתוח המבנים · 0/0", { exact: true }).waitFor();
    assert.equal(await page.locator('[data-structure-card]').count(), 0);
    assert.deepEqual(errors, []); assert.deepEqual(external, []);
  } finally { await browser.close(); await server.close(); }
});
