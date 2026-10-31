import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
let playwright, vite, react;
try { playwright = require('playwright'); vite = await import(pathToFileURL(require.resolve('vite')).href); react = (await import(pathToFileURL(require.resolve('@vitejs/plugin-react')).href)).default; } catch { /* Explicit skip if optional runtime absent. */ }
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium';
const available = Boolean(playwright && vite && react && existsSync(executablePath));
const root = fileURLToPath(new URL('..', import.meta.url));
const anchor = '3a2804ac-c8c9-4b2f-83c4-b99f47c15c1f';
const other = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const entry = `import React,{useState} from 'react';import{createRoot}from'react-dom/client';
import{BrowserRouter,Link,useLocation}from'react-router-dom';
import Sequence from '/src/components/research/StoryTreeSequence2029.jsx';
import{fetchStoryTreeSequence2029}from'/src/lib/research/worldSourceConnections.js';
window.__reads=[];window.__context=null;window.__fail=false;window.__defer=false;window.__pending=[];
const uuid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function graphReader(id,options){window.__reads.push(['graph',id,options]);if(window.__fail)throw Error('offline');
 if(window.__defer)await new Promise(resolve=>window.__pending.push(resolve));
 const root={kind:'graph-entity',identity:{entityRef:'node:'+id,sourceIdentity:{nodeId:id}},source:{sourceRef:'node:'+id}};
 return [root,...[1,2,...(window.__extra?[3]:[])].map(n=>({kind:'graph-relation',identity:{relationRef:'edge:'+uuid(n)},source:{sourceRef:'edge:'+uuid(n)},projection:{relations:[{id:uuid(n),fromNodeId:id,toNodeId:uuid(n+100),from:{id,type:'number'},to:{id:uuid(n+100),type:'post',href:'/post/story-'+n},relationType:'documents'}]}}))];}
async function postReader(options){window.__reads.push(['post',options]);const n=Number(options.postSlug.slice(6));return {id:n,slug:'story-'+n,title:'סיפור '+n,excerpt:'תקציר ציבורי',source:'uploaded_file',tags:sessionStorage.getItem('withdraw')==='1'&&n===2?['טיוטה']:[],author:'מחבר המקור'};}
const read=options=>fetchStoryTreeSequence2029({...options,graphReader,postReader});
function App(){const location=useLocation();const[id,setId]=useState('${anchor}');
 const research={context:null,updateResearchContext:patch=>{window.__context=patch}};
 if(location.pathname.startsWith('/post/'))return React.createElement(React.Fragment,null,React.createElement('h1',null,'הפוסט הציבורי'),React.createElement(Link,{to:window.__context?.returnTo?.href||'/__story'},'חזרה להקשר'));
 return React.createElement('main',{className:'sod29-root',dir:'rtl'},React.createElement('button',{onClick:()=>setId('${other}')},'שנה הקשר'),React.createElement('button',{onClick:()=>setId(undefined)},'ללא צומת'),React.createElement(Sequence,{anchorNodeId:id,anchorLabel:'העץ המשותף',research,readSequence:read}));
}createRoot(document.getElementById('root')).render(React.createElement(BrowserRouter,null,React.createElement(App)));`;
function fixture() { return { name: 'story-sequence-fixture', enforce: 'pre',
  resolveId(source) { if (source === '/__story-entry.jsx') return '\0story-sequence-entry.jsx'; },
  load(id) { if (id === '\0story-sequence-entry.jsx') return entry; },
  configureServer(server) { server.middlewares.use(async (req, res, next) => {
    if (!['/__story', '/world', '/post/story-1', '/post/story-2'].includes(req.url?.split('?')[0])) return next();
    res.setHeader('Content-Type', 'text/html');
    res.end(await server.transformIndexHtml('/__story', `<html lang="he" dir="rtl"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;background:#110e0b;color:#eee;font-family:Arial}main{max-width:750px;margin:auto;padding:16px}button,a{min-height:44px;display:inline-flex;align-items:center;padding:8px;max-width:100%;overflow-wrap:anywhere}.sod29-card{padding:16px;border:1px solid #bfa565;border-radius:20px}p{overflow-wrap:anywhere}.sod29-actions{display:flex;flex-wrap:wrap;gap:8px}</style><div id="root"></div><script type="module" src="/__story-entry.jsx"></script></html>`));
  }); } }; }

test('Topic and World mount the same runtime; exact World return does not depend on stale subject', () => {
  const topic = readFileSync(join(root, 'src/pages/Topic2029Page.jsx'), 'utf8');
  const world = readFileSync(join(root, 'src/pages/World2029Page.jsx'), 'utf8');
  assert.match(topic, /<StoryTreeSequence2029 anchorNodeId=\{projection.entityRef/);
  assert.match(world, /<StoryTreeSequence2029 anchorNodeId=\{data.identity.nodeId/);
  assert.match(world, /if \(storyReturn\) return <StoryTreeSequence2029/);
});

test('story sequence browser: lazy reads, exact post return/reload, withdrawal, error and stale-anchor guard', { skip: !available }, async t => {
  const evidence = mkdtempSync(join(tmpdir(), 'story-tree-browser-'));
  const server = await vite.createServer({ root, configFile: false, cacheDir: join(evidence, 'cache'), plugins: [fixture(), react()], logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const browser = await playwright.chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
  t.after(async () => { await browser.close(); await server.close(); });
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const page = await browser.newPage();
  const errors = [], writes = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (!['GET', 'HEAD'].includes(request.method())) writes.push(request.url()); });
  await page.route('https://**', route => route.abort());
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(origin + '/__story');
    await page.getByRole('button', { name: 'פתח סיפורים מחוברים' }).waitFor();
    assert.equal(await page.evaluate(() => window.__reads.length), 0);
    await page.getByRole('button', { name: 'פתח סיפורים מחוברים' }).click();
    await page.locator('[data-story-source="posts:1"]').waitFor();
    assert.equal(await page.evaluate(() => window.__reads.length), 3);
    await page.getByRole('button', { name: 'הסיפור הבא' }).click();
    await page.locator('[data-story-source="posts:2"]').waitFor();
    assert.equal(await page.evaluate(() => window.__reads.length), 3, 'selection reuses bounded snapshot');
    await page.getByRole('link', { name: 'לקריאת הפוסט' }).click();
    await page.getByRole('heading', { name: 'הפוסט הציבורי' }).waitFor();
    assert.equal(await page.evaluate(() => window.__context.selection.sourceRef), 'posts:2');
    await page.goBack();
    await page.locator('[data-story-source="posts:2"]').waitFor();
    await page.reload();
    await page.locator('[data-story-source="posts:2"]').waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: join(evidence, `story-${width}.png`), fullPage: true });
  }
  await page.getByRole('link', { name: 'לקריאת הפוסט' }).click();
  await page.getByRole('link', { name: 'חזרה להקשר' }).click();
  await page.locator('[data-story-source="posts:2"]').waitFor();
  await page.evaluate(() => { window.__extra = true; });
  await page.getByRole('button', { name: 'רענן סיפורים' }).click();
  await page.getByRole('button', { name: 'הסיפור הבא' }).click();
  await page.locator('[data-story-source="posts:3"]').waitFor();
  await page.getByRole('button', { name: 'הסיפור הקודם' }).click();
  await page.locator('[data-story-source="posts:2"]').waitFor();
  await page.evaluate(() => sessionStorage.setItem('withdraw', '1'));
  await page.reload();
  await page.getByText('הסיפור שאליו חזרתם אינו זמין ברצף הנוכחי.', { exact: false }).waitFor();
  assert.equal(await page.locator('[data-story-source]').count(), 0);
  await page.getByRole('button', { name: 'לעיון בסיפורים הזמינים' }).click();
  await page.locator('[data-story-source="posts:1"]').waitFor();
  await page.evaluate(() => { window.__fail = true; });
  await page.getByRole('button', { name: 'רענן סיפורים' }).click();
  await page.getByText('לא ניתן לטעון כרגע. אפשר לנסות שוב.').waitFor();
  assert.equal(await page.locator('[data-story-source]').count(), 0);
  await page.evaluate(() => { sessionStorage.removeItem('withdraw'); });
  await page.goto(origin + '/__story');
  await page.getByRole('button', { name: 'פתח סיפורים מחוברים' }).waitFor();
  await page.evaluate(() => { window.__defer = true; });
  await page.getByRole('button', { name: 'פתח סיפורים מחוברים' }).click();
  await page.waitForFunction(() => window.__pending.length === 1);
  await page.getByRole('button', { name: 'שנה הקשר' }).click();
  await page.evaluate(() => { window.__defer = false; window.__pending.shift()(); });
  await page.getByRole('button', { name: 'פתח סיפורים מחוברים' }).waitFor();
  assert.equal(await page.locator('[data-story-source]').count(), 0);
  await page.getByRole('button', { name: 'פתח סיפורים מחוברים' }).click();
  await page.locator('[data-story-source="posts:1"]').waitFor();
  assert.equal(await page.locator('[data-story-tree-sequence]').getAttribute('id'), `story-tree-${other}`);
  await page.getByRole('button', { name: 'ללא צומת' }).click();
  assert.equal(await page.locator('[data-story-tree-sequence]').count(), 0);
  await page.goto(origin + `/world#story-tree-${anchor}--post-1`);
  await page.locator('[data-story-source="posts:1"]').waitFor();
  await page.waitForFunction(id => window.__context?.subject?.id === id, anchor);
  assert.equal(await page.evaluate(() => window.__context.selection.sourceRef), 'posts:1');
  assert.equal(await page.evaluate(() => window.__context.returnTo), null);
  assert.deepEqual(errors, []); assert.deepEqual(writes, []);
  t.diagnostic(`Synthetic browser evidence (real UI and read composition, fixture public/graph readers): ${evidence}`);
});
