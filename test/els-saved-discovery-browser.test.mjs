import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
const { chromium } = createRequire(import.meta.url)("playwright");
const { createServer } = await import("vite");
const react = (await import("@vitejs/plugin-react")).default;
const root = fileURLToPath(new URL("..", import.meta.url));

const entry = `import React,{useState} from 'react';import{createRoot}from'react-dom/client';
import Panel from '/src/components/experience2029/ElsLexiconResearch2029.jsx';
import{matrix,scanState,projection,discoveryFixture}from'/test/fixtures/els-saved-discovery.mjs';
import{switchPrincipal}from'/src/lib/research/ResearchProvider.jsx';
window.__requests=[];window.__restores=[];
function Fixture(){const[principal,setPrincipal]=useState('A'),[state,setState]=useState(matrix()),[response,setResponse]=useState(null),[visible,setVisible]=useState(true);
window.__switch=p=>{switchPrincipal(p);setPrincipal(p)};window.__setState=setState;window.__matrix=matrix;window.__setVisible=setVisible;
window.__finish=(patch={})=>setResponse({...discoveryFixture().data,target:window.__requests.filter(r=>!r.cancel&&!r.pause).at(-1),...patch});
return React.createElement('main',{dir:'rtl'},React.createElement(Panel,{key:principal,state,scanWindow:{id:'fixture-window',geometry:scanState(state).geometry},returnProjection:projection,
visible,view:'discovery',busy:false,response,onRequest:r=>window.__requests.push(r),onProgress:()=>{},onOpenDiscovery:()=>{},
onRestore:load=>window.__restores.push(load),onAdd:()=>{},color:()=> 'blue',discoveryId:new URLSearchParams(location.search).get('discovery')}));}
createRoot(document.getElementById('root')).render(React.createElement(Fixture));`;

function plugin() {
  return { name: "saved-discovery-fixture", enforce: "pre",
    resolveId(id) {
      if (id === "/discovery-fixture.jsx") return "\0discovery-entry";
      if (id.endsWith("/ResearchProvider.jsx")) return "\0discovery-library";
    },
    load(id) {
      if (id === "\0discovery-entry") return entry;
      if (id === "\0discovery-library") return `import{useSyncExternalStore}from'react';
        import{applyResearchOps,emptyResearchState}from'/src/lib/research/researchSyncState.js';
        const listeners=new Set();let principal='A',state=emptyResearchState();
        const load=()=>{state=JSON.parse(localStorage.getItem('fixture-library-'+principal)||JSON.stringify(emptyResearchState()));listeners.forEach(f=>f())};load();
        export const switchPrincipal=p=>{principal=p;load()};
        export const useResearch=()=>{const current=useSyncExternalStore(f=>{listeners.add(f);return()=>listeners.delete(f)},()=>state);const owner=principal;
          return{...current,syncStatus:'local_only',saveItem:entity=>{if(owner!==principal)return false;state=applyResearchOps(state,[{kind:'item_upsert',bucket:'library',entity}]);localStorage.setItem('fixture-library-'+principal,JSON.stringify(state));listeners.forEach(f=>f());return true;}}};`;
    },
    configureServer(server) { server.middlewares.use(async (req, res, next) => {
      if (!req.url.startsWith("/fixture")) return next();
      res.setHeader("content-type", "text/html");
      res.end(await server.transformIndexHtml("/fixture", '<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/discovery-fixture.jsx"></script></html>'));
    }); },
  };
}

test("saved discovery: A/B, late response, partial, failure, cancel, reload, account switch and passive return", { timeout: 120000 }, async () => {
  const server = await createServer({ root, configFile: false, plugins: [plugin(), react()], server: { host: "127.0.0.1", port: 0 } });
  await server.listen();
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH
    || (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : chromium.executablePath()), args: ["--no-sandbox"] });
  const browserContext = await browser.newContext();
  const page = await browserContext.newPage(), errors = [], external = [];
  page.on("pageerror", e => errors.push(e.message));
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  await page.context().route("**/*", route => { if (!route.request().url().startsWith(origin)) { external.push(route.request().url()); return route.abort(); } return route.continue(); });
  try {
    await page.goto(`${origin}/fixture`);
    const start = page.getByRole("button", { name: "התחל גילוי", exact: true }); await start.waitFor();
    await start.click(); await page.evaluate(() => window.__finish());
    await page.locator(".els29-discovery-saved summary").first().click();
    await page.getByRole("button", { name: "שמור ביטויים · קולומביה", exact: true }).click();
    await page.getByText("סריקת הגילוי נשמרה מקומית בספריית המחקר.", { exact: true }).waitFor();
    const id = await page.evaluate(() => JSON.parse(localStorage.getItem("fixture-library-A")).saved[0].id);
    const saved = page.getByRole("region", { name: "סריקת גילוי שמורה", exact: true });
    await saved.getByText(/כיסוי חלקי — לא כל החלון נבדק/).waitFor();
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `saved result at ${width}px`);
    }
    assert.equal(await page.evaluate(() => window.__requests.length), 1);
    // A new pending scan belongs to A; navigating to B cancels tracking. A late success must not replace the prior result.
    await start.click();
    await page.evaluate(() => window.__setState(window.__matrix("another-corpus", "tanakh")));
    await page.waitForFunction(() => window.__requests.some(r => r.cancel));
    await page.evaluate(() => window.__finish({ items: [] }));
    assert.equal(await saved.getByRole("button", { name: "הצג בכלי הגילוי ללא סריקה" }).isDisabled(), true);
    assert.equal(await page.locator("[data-lexicon-hit]").count(), 0);
    await saved.getByRole("button", { name: "חזור למטריצה של הסריקה · אימות במנוע" }).click();
    const returned = await page.evaluate(() => window.__restores.at(-1));
    assert.equal(returned.corpusId, "0b022e8eef6f9c16"); assert.equal(returned.hitId, "4545_1_248765");
    assert.equal(returned.matrixProjection.rowGap, 2); assert.equal(returned.view.zoom, 1.3);
    // Explicit return sends only a governed load, never a scan.
    assert.equal(await page.evaluate(() => window.__requests.filter(r => !r.cancel).length), 2);
    await page.evaluate(() => window.__setState(window.__matrix()));
    await saved.getByRole("button", { name: "הצג בכלי הגילוי ללא סריקה" }).click();
    await page.locator('[data-lexicon-hit="1514_1_254827"]').waitFor();
    await start.click(); await page.evaluate(() => window.__finish({ ok: false, reason: "scan-failed" }));
    await page.getByText("הסריקה לא הושלמה. אין להסיק מכך שאין מילים באזור.", { exact: true }).waitFor();
    await page.locator('[data-lexicon-hit="1514_1_254827"]').waitFor();
    await start.click(); await page.evaluate(() => window.__finish({ origin: { term: 'קולומביה', corpus: 'tanakh', corpusId: 'wrong', start: 248765, skip: 4545, dir: 1 } }));
    await page.getByText("תשובת הסריקה אינה תואמת למקור הבקשה; היא לא צורפה למטריצה.", { exact: true }).waitFor();
    await page.locator('[data-lexicon-hit="1514_1_254827"]').waitFor();
    await start.click(); await page.evaluate(() => window.__setVisible(false));
    await page.getByText(/המעקב הופסק ונשלחה בקשת ביטול/).waitFor({ state: "attached" });
    await page.evaluate(() => { window.__finish({ items: [] }); window.__setVisible(true); });
    await page.locator('[data-lexicon-hit="1514_1_254827"]').waitFor();
    // Fresh page resolves only the current principal's library pointer.
    await page.goto(`${origin}/fixture?discovery=${encodeURIComponent(id)}`);
    await saved.waitFor(); assert.equal(await page.evaluate(() => window.__requests.length), 0);
    await saved.getByRole("button", { name: "הצג בכלי הגילוי ללא סריקה" }).click();
    await page.locator('[data-lexicon-hit="1514_1_254827"]').waitFor();
    assert.equal(await page.evaluate(() => window.__requests.length), 0);
    await start.click();
    await page.evaluate(() => window.__switch("B")); await saved.waitFor({ state: "detached" });
    await page.evaluate(() => window.__finish());
    assert.equal(await page.locator("[data-lexicon-hit]").count(), 0);
    await page.evaluate(() => window.__switch("A")); await saved.waitFor();
    assert.equal(await page.evaluate(() => window.__requests.filter(r => !r.cancel).length), 1, 'switching principal never reissues the pending request');
    assert.equal(await page.evaluate(() => window.__requests.filter(r => r.cancel).length), 1, 'detaching the prior principal requests cancellation');
    const context = page.context(); await page.close();
    const later = await context.newPage(); later.on("pageerror", e => errors.push(e.message));
    await later.goto(`${origin}/fixture?discovery=${encodeURIComponent(id)}`);
    await later.getByRole("region", { name: "סריקת גילוי שמורה", exact: true }).waitFor();
    assert.equal(await later.evaluate(() => window.__requests.length), 0, 'closing a tab and returning reads the existing library without a new scan');
    assert.deepEqual(errors, []); assert.deepEqual(external, []);
  } finally { await browser.close(); await server.close(); }
});
