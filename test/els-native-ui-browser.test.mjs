// The actual native React surface and canonical tool run together. Only the host adapter and
// server verification are test doubles; the oracle checks every candidate against the real corpus.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ELS_GOLDENS, ELS_GOLDEN_CORPUS_ID } from './fixtures/els-runtime-goldens.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const req = createRequire(import.meta.url);
const golden = ELS_GOLDENS.find((item) => item.id === 'torah-kedosha-10065-fwd');
const letters = readFileSync(join(root, 'tools/els/data/tk-letters.txt'), 'utf8');
const TORAH_LEN = 304805;
let pw, vite, react;
try {
  pw = req('playwright');
  vite = await import(pathToFileURL(req.resolve('vite')).href);
  react = (await import(pathToFileURL(req.resolve('@vitejs/plugin-react')).href)).default;
} catch { /* Optional local browser tooling; CI can require it explicitly. */ }
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH ||
  (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : pw?.chromium.executablePath());
const canRun = Boolean(pw && vite && react && executablePath && existsSync(executablePath));

test('CI: native UI browser regression must not be skipped when required', () => {
  if (process.env.ELS_REQUIRE_EXECUTABLE) {
    assert.ok(canRun, 'ELS_REQUIRE_EXECUTABLE=1 requires Playwright, Vite/plugin-react and Chromium');
  }
});

const host = `import React,{useRef,useEffect} from 'react';
export default function Host(props){
 const frame=useRef(null),latest=useRef(props),ready=useRef(false);latest.current=props;
 const send=message=>{window.__hostLog.push(message);frame.current?.contentWindow?.postMessage({source:'sod-host',...message},location.origin);};
 useEffect(()=>{
  window.__mounts=(window.__mounts||0)+1;
  const receive=async event=>{
   const message=event.data;
   if(event.source!==frame.current?.contentWindow||message?.source!=='tzofen')return;
   window.__log.push(message);
   if(message.type==='ready'){ready.current=true;send({type:'tier',tier:'admin'});if(window.__fixtureLoadGolden)send({type:'load-matrix',item:${JSON.stringify(golden)}});}
   if(message.type==='engine-request'){
    const result=await fetch('/oracle',{method:'POST',body:JSON.stringify({op:message.op,payload:message.payload})}).then(response=>response.json());
    send({type:'engine-result',requestId:message.requestId,...result});
   }
   if(message.type==='state'){window.__state=message;latest.current.onState?.(message);}
   if(message.type==='lens'){window.__lens=message;latest.current.onLens?.(message);}
   if(message.type==='gate')latest.current.onGate?.(message);
   if(message.type==='onboarding-required')latest.current.onOnboardingRequired?.(message);
  };
  addEventListener('message',receive);return()=>removeEventListener('message',receive);
 },[]);
 useEffect(()=>{if(ready.current&&props.lensRequest)send({type:'request-lens',...props.lensRequest});},[props.lensRequest]);
 useEffect(()=>{if(ready.current&&props.findingsRequest)send({type:'update-findings',findings:props.findingsRequest.findings});},[props.findingsRequest]);
 useEffect(()=>{if(ready.current&&props.controlRequest)send({type:'native-control',...props.controlRequest});},[props.controlRequest]);
 useEffect(()=>{if(ready.current&&props.findingControlRequest)send({type:'native-finding-control',...props.findingControlRequest});},[props.findingControlRequest]);
 useEffect(()=>{if(ready.current&&props.searchRequest)send({type:'native-search',request:props.searchRequest});},[props.searchRequest]);
 return React.createElement('iframe',{ref:frame,src:'/tzofen.html?embed=1&bridge=hidden',title:'canonical engine fixture',style:{position:'absolute',width:1,height:1,clipPath:'inset(100%)'}});
}`;

const entry = `import React from 'react';import {createRoot} from 'react-dom/client';
import Native from '/src/components/experience2029/ElsNativeClassic2029.jsx';
import {resolve2029Palette} from '/src/lib/palette.js';
import '/src/components/experience2029/sod2029.css';
import '/src/components/experience2029/sod2029-closed.css';
import '/src/components/experience2029/systemFrame2029.css';
window.__log=[];window.__hostLog=[];
const palette=resolve2029Palette('dark','research_lab');
const fields={page:'pageBg',panel:'card','panel-soft':'cardSoft',line:'border','line-strong':'borderStrong',accent:'accent','accent-text':'accentText','accent-secondary':'accentSecondary',ink:'ink',muted:'inkSoft','focus-ring':'focusRing','on-accent':'onAccent','accent-btn':'accentBtn','warm-accent':'warmAccent'};
const style={fontFamily:'Arial',color:palette.ink,background:palette.pageBg,minHeight:'100vh',padding:12};
for(const [key,value] of Object.entries(fields))style['--s29-'+key]=palette[value];
for(const [key,value] of Object.entries({micro:14,small:15,body:16,ui:15,lead:20,title:24}))style['--s29-type-'+key]=value+'px';
for(const key of ['body','ui','display','numeric'])style['--s29-font-'+key]='Arial';
createRoot(document.getElementById('root')).render(React.createElement('div',{style,className:'sod29-root closed-shell native-frame surface-els'},
 React.createElement('aside',{className:'sod29-sidebar','aria-label':'fixture sidebar'}),
 React.createElement('div',{className:'sod29-main'},
  React.createElement('div',{className:'sod29-main-stage'},
   React.createElement('main',{className:'sod29-content wide'},
    React.createElement('section',{className:'sod29-focus-stage','data-els-2029-surface':'v1'},
     React.createElement('section',{className:'sod29-section','data-els-classic-2029':'native-v1'},React.createElement(Native))))))));
`;

function verify({ op, payload }) {
  if (op !== 'verify_batch') return { ok: false, error: 'unsupported_test_operation' };
  const hi = payload.scope === 'tanakh' ? letters.length : TORAH_LEN;
  const corpusId = payload.scope === 'tanakh'
    ? '0b022e8eef6f9c16a20c3836c11e652e5cac45469016766f7f4fc670c9f84e1b'
    : ELS_GOLDEN_CORPUS_ID;
  if (payload.corpus_id !== corpusId) return { ok: true, result: { status: 'CORPUS_MISMATCH' } };
  const term = payload.term.replace(/[^א-ת]/g, '');
  if (payload.candidates.length > 4000 || payload.candidates.length * term.length > 64000) {
    return { ok: false, error: 'budget_exceeded' };
  }
  const verified = [];
  const seen = new Set();
  payload.candidates.forEach((candidate, ordinal) => {
    const id = `${candidate.skip}/${candidate.dir}/${candidate.start}`;
    if (seen.has(id)) return;
    seen.add(id);
    let matches = Number.isInteger(candidate.skip) && candidate.skip >= 2 &&
      [1, -1].includes(candidate.dir) && Number.isInteger(candidate.start);
    for (let offset = 0; matches && offset < term.length; offset++) {
      const index = candidate.start + candidate.dir * candidate.skip * offset;
      matches = index >= 0 && index < hi && letters[index] === term[offset];
    }
    if (matches) verified.push({ ...candidate, input_ordinal: ordinal });
  });
  return { ok: true, result: { status: 'OK', corpus_id: corpusId, verified }, trace_id: 'native-ui-oracle' };
}

// These read-only stubs let first-search acceptance exercise the real TzofenEmbed adapter and
// its gate portal, while keeping auth, saved matrices, tracking and workspace writes out of tests.
const realHostStubs = {
  '../lib/AuthContext.jsx': `export const useAuth=()=>({isAdmin:window.__fixtureTier==='admin',verified:window.__fixtureTier!=='anon',user:null});`,
  '../lib/tracking.js': `export const track=()=>{};export const getVisitorId=()=>'native-ui-fixture';`,
  '../lib/elsMatrices.js': `export const getSavedMatrices=async()=>[];export const saveMatrix=async()=>{};export const saveMatrixAnon=async()=>{};export const moderateMatrix=async()=>{};`,
  '../lib/contributions.js': `export const addContribution=async()=>{};`,
  '../lib/supabase.js': `export const supabase={functions:{invoke:async(name,{body})=>{const {op,...payload}=body;const response=await fetch('/oracle',{method:'POST',body:JSON.stringify({op,payload})}).then(result=>result.json());return response.ok?{data:response,error:null}:{data:null,error:{message:response.error}};}}};`,
  '../lib/img.js': `export const thumb=(value)=>value;`,
  '../lib/research/useUniversalWorkspace.js': `const workspace={upsertFinding:()=>{}};export const useUniversalWorkspace=()=>workspace;`,
  './SubscribeGate.jsx': `import React from 'react';export default function Gate(){return React.createElement('div',{'data-fixture-subscribe-gate':'true'},'Test registration gate');}`,
  'react-router-dom': `export const useNavigate=()=>()=>{};`,
};

async function withNative(viewport, run, options = {}) {
  const { realHost = false, loadGolden = true, onboarded = true, tier = 'admin' } = options;
  const fixture = {
    name: 'els-native-browser-fixture', enforce: 'pre',
    resolveId(id, importer) {
      if (id === 'els-native-fixture') return '\0els-native-fixture';
      if (!realHost && id === '../TzofenEmbed.jsx' && importer?.endsWith('/ElsNativeClassic2029.jsx')) return '\0els-native-host';
      if (realHost && importer?.endsWith('/TzofenEmbed.jsx') && Object.hasOwn(realHostStubs, id)) return '\0els-host-stub:' + id;
    },
    load(id) {
      if (id === '\0els-native-fixture') return entry;
      if (id === '\0els-native-host') return host;
      if (id.startsWith('\0els-host-stub:')) return realHostStubs[id.slice('\0els-host-stub:'.length)];
    },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.url === '/oracle' && request.method === 'POST') {
          let body = '';
          for await (const part of request) body += part;
          response.setHeader('content-type', 'application/json');
          response.end(JSON.stringify(verify(JSON.parse(body))));
          return;
        }
        if (request.url === '/fixture') {
          response.setHeader('content-type', 'text/html; charset=utf-8');
          response.end(await server.transformIndexHtml('/fixture', '<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0}</style><div id="root"></div><script type="module" src="/@id/els-native-fixture"></script></html>'));
          return;
        }
        next();
      });
    },
  };
  const server = await vite.createServer({ root, configFile: false, plugins: [fixture, react()], server: { host: '127.0.0.1', port: 0 } });
  let browser;
  try {
    await server.listen();
    browser = await pw.chromium.launch({ headless: true, executablePath });
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(({ realHost, loadGolden, onboarded, tier }) => {
      if (onboarded) localStorage.setItem('tzofen_onboarded_v1', '1');
      window.__fixtureLoadGolden = loadGolden;
      window.__fixtureTier = tier;
      if (!realHost) return;
      if (window === window.parent) {
        window.__mounts = 0;
        const observer = new MutationObserver((records) => {
          for (const record of records) for (const node of record.addedNodes) {
            if (node instanceof Element) window.__mounts += node.matches('iframe') ? 1 : node.querySelectorAll('iframe').length;
          }
        });
        observer.observe(document, { childList: true, subtree: true });
        addEventListener('message', (event) => {
          const frame = document.querySelector('iframe');
          const message = event.data;
          if (event.source !== frame?.contentWindow || message?.source !== 'tzofen') return;
          (window.__log ||= []).push(message);
          if (message.type === 'state') window.__state = message;
          if (message.type === 'lens') window.__lens = message;
          if (message.type === 'ready' && loadGolden) frame.contentWindow.postMessage({ source: 'sod-host', type: 'load-matrix', item: window.__fixtureGolden }, location.origin);
        });
      }
      if (window !== window.parent) addEventListener('message', (event) => {
        if (event.source === window.parent && event.data?.source === 'sod-host') (window.parent.__hostLog ||= []).push(event.data);
      });
    }, { realHost, loadGolden, onboarded, tier });
    if (realHost && loadGolden) await page.addInitScript((item) => { window.__fixtureGolden = item; }, golden);
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/fixture`);
    if (loadGolden) {
      await page.waitForFunction((id) => window.__state?.provenance?.editId === id, golden.id, { timeout: 60000 });
      await page.waitForFunction(() => document.querySelector('.els29-native-cell.is-axis'));
    } else {
      await page.waitForFunction(() => window.__log?.some((message) => message.type === 'ready'), null, { timeout: 60000 });
    }
    await run(page);
    assert.equal(await page.locator('iframe').count(), 1, 'one canonical engine iframe');
    assert.equal(await page.evaluate(() => window.__mounts), 1, 'panel actions never remount the engine');
    assert.deepEqual(errors, [], 'no uncaught React/tool errors');
  } finally {
    await browser?.close();
    await server.close();
  }
}

const button = (page, name) => page.getByRole('button', { name, exact: true }).filter({ visible: true });
// Dispatch actions directly so Playwright does not scroll an offscreen inspector button into view.
async function activate(page, name) {
  await button(page, name).dispatchEvent('click');
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
const capture = (page) => page.evaluate(() => {
  const matrix = document.querySelector('.els29-native-matrix-scroll');
  const rect = matrix.getBoundingClientRect();
  return { x: rect.x, width: rect.width, left: matrix.scrollLeft, top: matrix.scrollTop, pageX: scrollX, pageY: scrollY };
});
async function expectStable(page, before, label) {
  const after = await capture(page);
  for (const key of Object.keys(before)) assert.ok(Math.abs(after[key] - before[key]) <= 1, `${label}: ${key} changed ${before[key]} → ${after[key]}`);
}
async function pan(page) {
  await page.locator('.els29-native-matrix-scroll').evaluate((matrix) => { matrix.scrollLeft = 120; matrix.scrollTop = 90; });
  return capture(page);
}
async function changeRange(page, label, value) {
  await page.getByRole('slider', { name: label, exact: true }).evaluate((input, number) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(number));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}
async function inspectAndScanPrimary(page, before) {
  if (await button(page, 'מקור').getAttribute('aria-expanded') !== 'true') await activate(page, 'מקור');
  await activate(page, 'רצף ומילים לאורך הציר');
  await page.waitForFunction(() => window.__lens?.lens === 'line-context');
  await expectStable(page, before, 'open primary line');
  await activate(page, 'סרוק שורה · מילים לאורך הציר');
  await button(page, 'סמן את תורה ברצף').waitFor();
  await expectStable(page, before, 'scan primary line');
  await activate(page, 'סמן את תורה ברצף');
  assert.equal(await page.locator('[data-experience-capability="els-line-inspection"] .is-word').count(), 4);
  await expectStable(page, before, 'highlight line word');
}

const stageHeight = (page) => page.locator('.els29-native-stage').evaluate((stage) => stage.getBoundingClientRect().height);
const identity = (page) => page.evaluate(() => {
  const state = window.__state;
  return { term: state.term, scope: state.scope, axis: state.axis, geometry: state.geometry, occurrence: state.occurrence, findings: state.findings, verification: state.verification };
});
async function expectNative(page, url, label) {
  assert.equal(page.url(), url, `${label}: stays at the same URL`);
  assert.equal(await page.locator('.els29-native-stage').isVisible(), true, `${label}: native matrix is visible`);
  assert.equal(await page.locator('.els29-classic-fallback.is-open').count(), 0, `${label}: classic iframe does not cover the result`);
  assert.equal(await page.locator('iframe').count(), 1, `${label}: retains one canonical iframe`);
  assert.equal(await page.evaluate(() => window.__mounts), 1, `${label}: retains the same engine mount`);
}
async function expectHeightControl(page) {
  const baseline = await stageHeight(page);
  const engine = await identity(page);
  const footer = page.locator('.els29-native-bottom-controls');
  assert.equal(await footer.locator('.els29-native-stage').count(), 0, 'bottom controls are outside the fixed matrix stage');
  const bounds = await page.locator('.els29-native-stage').boundingBox();
  const footerBounds = await footer.boundingBox();
  assert.ok(footerBounds.y >= bounds.y + bounds.height - 1, 'controls sit below the matrix');
  await activate(page, 'הגדל גובה ב־50%');
  assert.ok(Math.abs(await stageHeight(page) - baseline * 1.5) <= 1, 'height toggle adds 50% of the regular stage height');
  await button(page, 'חזור לגובה הרגיל').scrollIntoViewIfNeeded();
  const control = await button(page, 'חזור לגובה הרגיל').boundingBox();
  const viewport = page.viewportSize();
  assert.ok(control.y >= 0 && control.y + control.height <= viewport.height + 1, 'height control remains reachable below the expanded matrix');
  await activate(page, 'חזור לגובה הרגיל');
  assert.ok(Math.abs(await stageHeight(page) - baseline) <= 1, 'height restores the regular stage');
  assert.deepEqual(await identity(page), engine, 'height changes presentation only');
}

test('native UI: source/findings panels, line scans and proximity retain matrix geometry, pan and page position',
  { skip: !canRun && 'Native browser tooling unavailable', timeout: 180000 }, async () => {
    await withNative({ width: 1440, height: 1000 }, async (page) => {
      const stageHeight = await page.locator('.els29-native-stage').evaluate((stage) => stage.getBoundingClientRect().height);
      assert.ok(Math.abs(stageHeight - 750) <= 1, 'desktop matrix stage is 25% taller than the previous 600px');
      const initial = await page.evaluate(() => window.__state);
      const before = await pan(page);
      await activate(page, 'מקור');
      await expectStable(page, before, 'open source');
      await activate(page, 'סגור כלי מטריצה');
      await expectStable(page, before, 'close source');
      await activate(page, 'מקור');
      await expectStable(page, before, 'reopen source');
      await activate(page, 'ממצאים');
      await expectStable(page, before, 'switch to findings');
      await inspectAndScanPrimary(page, before);
      const readOnly = await page.evaluate(() => window.__state);
      assert.deepEqual(readOnly.axis, initial.axis);
      assert.deepEqual(readOnly.geometry, initial.geometry);
      assert.deepEqual(readOnly.findings, initial.findings);

      await activate(page, 'הוסף את תורה לממצאים');
      await page.waitForFunction(() => window.__state?.findings?.some((finding) => finding.t === 'תורה' && finding.hits?.some((hit) => hit.shown && hit.verified)));
      await activate(page, 'ממצאים');
      const state = await page.evaluate(() => window.__state);
      const firstShown = state.findings.find((finding) => finding.t === 'תורה').hits.find((hit) => hit.shown && hit.verified);
      const findingPan = await pan(page);
      await activate(page, 'סרוק מילים לאורך הציר של תורה');
      await page.waitForFunction((id) => window.__lens?.lens === 'line-context' && window.__lens?.hitId === id && window.__lens?.target?.term === 'תורה' && window.__lens?.scan, firstShown.hitId);
      const scanned = await page.evaluate(() => window.__state);
      assert.deepEqual(scanned.axis, state.axis, 'secondary scan retains the main axis');
      assert.deepEqual(scanned.geometry, state.geometry, 'secondary scan retains canonical geometry');
      await expectStable(page, findingPan, 'direct secondary-axis scan');

      await activate(page, 'הצלבה');
      const radius = page.getByRole('slider', { name: 'מרחק מרבי מהציר בהצלבה', exact: true });
      assert.equal(await radius.inputValue(), '18');
      assert.equal(await radius.getAttribute('min'), '2');
      assert.equal(await radius.getAttribute('max'), '20');
      await changeRange(page, 'מרחק מרבי מהציר בהצלבה', 7);
      await activate(page, 'ממצאים');
      const countPan = await pan(page);
      await changeRange(page, 'מופעים לכל ממצא', 3);
      await page.waitForFunction(() => window.__state?.ui?.showN === 3);
      await expectStable(page, countPan, 'legacy proximity count');
      assert.equal(await radius.inputValue(), '7', 'unrelated canonical state preserves the cross-distance draft');
      const sent = await page.evaluate(() => window.__hostLog.findLast((message) => message.type === 'native-control' && message.action === 'finding-count'));
      assert.equal(sent.value, 3, 'count reaches the real canonical bridge with its numeric value');
      await page.getByPlaceholder('למשל: דוד', { exact: true }).fill('גאולה');
      await activate(page, 'מצא מפגש');
      await page.waitForFunction(() => window.__hostLog.some((message) => message.type === 'native-search' && message.request?.kind === 'cross' && message.request?.radius === 7));
    });
  });

test('native UI: 390px matrix stays taller, side tools become bounded sheets without moving the matrix',
  { skip: !canRun && 'Native browser tooling unavailable', timeout: 180000 }, async () => {
    await withNative({ width: 390, height: 844 }, async (page) => {
      const stageHeight = await page.locator('.els29-native-stage').evaluate((stage) => stage.getBoundingClientRect().height);
      assert.ok(Math.abs(stageHeight - 844 * 0.775) <= 1, 'mobile stage grows by 25% from 62dvh');
      const mobileRatio = await page.evaluate(() => document.querySelector('.sod29-content').getBoundingClientRect().width / document.querySelector('.sod29-main').getBoundingClientRect().width);
      assert.ok(Math.abs(mobileRatio - 1) <= 0.001, 'desktop 90% margins do not narrow the mobile frame');
      const before = await pan(page);
      await activate(page, 'מקור');
      await expectStable(page, before, 'mobile source');
      const sheet = page.getByRole('complementary', { name: 'כלי ELS והקשר המטריצה', exact: true });
      const compact = await sheet.boundingBox();
      assert.ok(compact.height <= 844 * 0.36 + 1, 'compact source sheet respects 36dvh');
      assert.ok(compact.x >= 0 && compact.x + compact.width <= 390, 'sheet fits the screen width');
      await activate(page, 'סגור כלי מטריצה');
      await expectStable(page, before, 'mobile close');
      await activate(page, 'ממצאים');
      await expectStable(page, before, 'mobile findings');
      await inspectAndScanPrimary(page, before);
      await activate(page, 'הרחב');
      const expanded = await sheet.boundingBox();
      assert.ok(expanded.height <= 844 * 0.7 + 1, 'expanded sheet respects 70dvh');
      await expectStable(page, before, 'expanded source');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal page overflow');
      const strip = page.locator('.els29-native-line-scroll');
      assert.equal(await strip.getAttribute('tabindex'), '0', 'axis sequence remains keyboard reachable');
      await activate(page, 'ממצאים');
      const proximityHeight = await page.getByRole('slider', { name: 'מופעים לכל ממצא', exact: true }).evaluate((input) => input.getBoundingClientRect().height);
      assert.ok(proximityHeight >= 44, 'proximity slider remains touch accessible');
      await expectStable(page, before, 'mobile tools preserve panning');
      await activate(page, 'סגור כלי מטריצה');
      await expectHeightControl(page);
    });
  });

test('native UI: large displays use the available width, and pinned/overlay inspectors retain their matrix space',
  { skip: !canRun && 'Native browser tooling unavailable', timeout: 180000 }, async () => {
    await withNative({ width: 2560, height: 1000 }, async (page) => {
      const contentWidth = await page.locator('.sod29-content').evaluate((content) => content.getBoundingClientRect().width);
      assert.ok(contentWidth > 1450, 'ELS content exceeds the old 1450px shell cap');
      assert.ok((await capture(page)).width > 1450, 'large displays gain actual matrix width');
      const margins = await page.evaluate(() => {
        // The real frame intentionally uses display:contents for main-stage without a context rail.
        const frame = document.querySelector('.sod29-main').getBoundingClientRect();
        const content = document.querySelector('.sod29-content').getBoundingClientRect();
        return { ratio: content.width / frame.width, left: content.left - frame.left, right: frame.right - content.right };
      });
      assert.ok(Math.abs(margins.ratio - 0.9) <= 0.001, 'desktop ELS uses 90% of the available frame');
      assert.ok(margins.left > 0 && Math.abs(margins.left - margins.right) <= 1, 'desktop keeps balanced side margins');
      assert.equal(await page.locator('.els29-native-layout.is-panel-pinned').count(), 1, 'inspector starts pinned');
      const pinned = await pan(page);
      await activate(page, 'מקור');
      await expectStable(page, pinned, 'large pinned source');
      await activate(page, 'סגור כלי מטריצה');
      await expectStable(page, pinned, 'large pinned close');
      await activate(page, 'מקור');
      await activate(page, 'בטל הצמדה');
      const overlay = await pan(page);
      assert.ok(overlay.width > pinned.width, 'explicit unpin frees the reserved inspector column');
      await activate(page, 'סגור כלי מטריצה');
      await expectStable(page, overlay, 'overlay close');
      await activate(page, 'מקור');
      await expectStable(page, overlay, 'overlay reopen');
      await activate(page, 'הצמד');
      const repinned = await pan(page);
      assert.ok(Math.abs(repinned.width - pinned.width) <= 1, 'repinning restores the original matrix width');
      await activate(page, 'סגור כלי מטריצה');
      await expectStable(page, repinned, 'repinned close');
      await activate(page, 'ממצאים');
      await expectStable(page, repinned, 'repinned findings');
      await activate(page, 'סגור כלי מטריצה');
      await expectHeightControl(page);
      await button(page, 'התאם מטריצה למסך').scrollIntoViewIfNeeded();
      const fit = Boolean(await page.evaluate(() => window.__state.ui.fit));
      const fitIdentity = await identity(page);
      await activate(page, 'התאם מטריצה למסך');
      await page.waitForFunction((previous) => window.__state?.ui?.fit !== previous, fit);
      assert.deepEqual(await identity(page), fitIdentity, 'bottom fit control preserves research identity');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'wide ELS has no horizontal page overflow');
    });
  });

test('native UI: every scan entry stays native through classic fallback; heat changes only unmarked presentation',
  { skip: !canRun && 'Native browser tooling unavailable', timeout: 180000 }, async () => {
    await withNative({ width: 1440, height: 1000 }, async (page) => {
      const url = page.url();
      const before = await pan(page);
      const engine = await identity(page);
      await activate(page, 'סריקה');
      await page.waitForFunction(() => window.__lens?.lens === 'line-context' && window.__lens?.scan);
      await expectNative(page, url, 'scan tool');
      await expectStable(page, before, 'scan tool');
      await activate(page, 'סרוק מילים לאורך הציר הראשי');
      await button(page, 'סמן את תורה ברצף').waitFor();
      await expectNative(page, url, 'main-axis scan');
      await expectStable(page, before, 'main-axis scan');
      await activate(page, 'סמן את תורה ברצף');
      await expectNative(page, url, 'scan result highlight');
      assert.deepEqual(await identity(page), engine, 'main-axis scans are read-only');
      await activate(page, 'הוסף את תורה לממצאים');
      await page.waitForFunction(() => window.__state?.findings?.some((finding) => finding.t === 'תורה' && finding.hits?.some((hit) => hit.shown && hit.verified)));
      await activate(page, 'ממצאים');
      await activate(page, 'סרוק מילים לאורך הציר של תורה');
      await page.waitForFunction(() => window.__lens?.target?.term === 'תורה' && window.__lens?.scan);
      await expectNative(page, url, 'secondary-axis scan');
      assert.equal(await page.locator('.els29-native-bottom-controls').getByRole('button', { name: 'סרוק ציר ראשי', exact: true }).count(), 0, 'scanning stays in the scan rail');

      await activate(page, 'כל הכלים');
      assert.equal(await page.locator('.els29-classic-fallback.is-open').count(), 1, 'classic fallback was explicitly opened');
      await page.locator('.els29-native-toolstrip [aria-label="סריקה"]').dispatchEvent('click');
      await button(page, 'סמן את תורה ברצף').waitFor();
      await expectNative(page, url, 'scan after classic fallback');
      await activate(page, 'כל הכלים');
      await page.locator('.els29-native-cell.is-axis').first().dispatchEvent('click');
      await page.waitForFunction(() => window.__lens?.lens === 'letter-context');
      await expectNative(page, url, 'letter inspection after classic fallback');

      await activate(page, 'סגור כלי מטריצה');
      await button(page, 'מפת חום').scrollIntoViewIfNeeded();
      const heatIdentity = await identity(page);
      const heatPan = await pan(page);
      const marked = () => page.locator('.els29-native-cell.is-axis,.els29-native-cell.is-finding').evaluateAll((cells) => cells.map((cell) => ({ index: cell.dataset.elsIndex, background: getComputedStyle(cell).backgroundColor, color: getComputedStyle(cell).color })));
      const backgrounds = () => page.locator('.els29-native-cell:not(.is-axis):not(.is-finding)').evaluateAll((cells) => cells.map((cell) => getComputedStyle(cell).backgroundColor));
      const initialMarks = await marked();
      const initialBackgrounds = await backgrounds();
      await activate(page, 'מפת חום');
      await page.waitForFunction(() => window.__state?.ui?.heat === true);
      assert.deepEqual(await identity(page), heatIdentity, 'heat preserves the verified research identity');
      assert.deepEqual(await marked(), initialMarks, 'heat does not repaint axis or finding marks');
      assert.notDeepEqual(await backgrounds(), initialBackgrounds, 'heat paints density on unmarked matrix cells');
      await expectStable(page, heatPan, 'heat on');
      await expectNative(page, url, 'heat on');
      await activate(page, 'מפת חום');
      await page.waitForFunction(() => window.__state?.ui?.heat === false);
      assert.deepEqual(await backgrounds(), initialBackgrounds, 'heat off restores the original unmarked cells');
      assert.deepEqual(await marked(), initialMarks);
      await expectStable(page, heatPan, 'heat off');
      await expectNative(page, url, 'heat off');
    });
  });

test('native UI: fresh storage first and second searches remain native; the real host gate stays visible outside the hidden engine',
  { skip: !canRun && 'Native browser tooling unavailable', timeout: 180000 }, async () => {
    await withNative({ width: 1440, height: 1000 }, async (page) => {
      const url = page.url();
      assert.equal(await page.evaluate(() => localStorage.getItem('tzofen_onboarded_v1')), null, 'first search starts without an onboarding preset');
      for (const term of ['תורה', 'אליהו']) {
        await page.getByRole('textbox', { name: 'מונח', exact: true }).fill(term);
        await activate(page, 'חפש');
        await page.waitForFunction((searched) => window.__state?.term === searched && window.__state?.status === 'ok' && window.__state?.verification?.state === 'MATCH', term, { timeout: 60000 });
        await expectNative(page, url, `fresh regular search ${term}`);
        assert.equal(await page.evaluate(() => localStorage.getItem('tzofen_onboarded_v1')), null, 'hidden bridge does not persist onboarding acceptance');
        assert.equal(await page.locator('.els29-native-cell.is-axis').count(), term.length, 'new search displays its verified native matrix');
      }
      assert.equal(await page.evaluate(() => window.__log.some((message) => message.type === 'onboarding-required')), false, 'native search follows the existing hidden-bridge onboarding policy');
      const mounted = await page.locator('iframe').getAttribute('src');
      await activate(page, 'הצלבה');
      await page.getByPlaceholder('למשל: דוד', { exact: true }).fill('גאולה');
      await activate(page, 'מצא מפגש');
      await page.waitForFunction(() => window.__log.some((message) => message.type === 'gate' && message.reason === 'cross'));
      const gate = page.locator('[data-fixture-subscribe-gate]');
      await gate.waitFor({ state: 'visible' });
      assert.equal(await gate.evaluate((element) => element.closest('[aria-hidden="true"]') === null), true, 'registration gate is outside aria-hidden engine ancestors');
      const bounds = await gate.boundingBox();
      assert.ok(bounds.width > 100 && bounds.height > 10, 'gate is visible at a usable size');
      assert.equal(await page.locator('iframe').getAttribute('src'), mounted, 'gate keeps the existing engine');
      await expectNative(page, url, 'cross registration gate');
    }, { realHost: true, loadGolden: false, onboarded: false, tier: 'anon' });
  });

test('native UI: compact findings, vowels, classic letters and depth retain exact base letters and source indices',
  { skip: !canRun && 'Native browser tooling unavailable', timeout: 180000 }, async () => {
    await withNative({ width: 1440, height: 1000 }, async (page) => {
      await activate(page, 'סריקה');
      await button(page, 'הוסף את תורה לממצאים').waitFor();
      await activate(page, 'הוסף את תורה לממצאים');
      await page.waitForFunction(() => window.__state?.findings?.some((finding) => finding.t === 'תורה' && finding.hits?.some((hit) => hit.shown && hit.verified)));
      await activate(page, 'ממצאים');
      const finding = page.locator('.els29-native-finding-group').filter({ has: page.getByRole('button', { name: 'סרוק מילים לאורך הציר של תורה', exact: true }) });
      assert.equal(await finding.count(), 1);
      for (const name of ['סרוק מילים לאורך הציר של תורה', 'מקור הממצא תורה', 'העלה את תורה', 'הורד את תורה']) {
        const target = finding.getByRole('button', { name, exact: true });
        const bounds = await target.boundingBox();
        assert.ok(bounds.width >= 44 && bounds.height >= 44, `${name}: compact action retains a usable hit target`);
      }
      const disclosure = finding.getByRole('button', { name: 'מופעים וצבע של תורה', exact: true });
      assert.equal(await disclosure.getAttribute('aria-expanded'), 'false', 'extra controls start collapsed');
      const extraId = await disclosure.getAttribute('aria-controls');
      const extra = page.locator(`[id="${extraId}"]`);
      assert.equal(await extra.isVisible(), false, 'occurrence and color controls stay out of the compact row');
      const row = await finding.boundingBox();
      assert.ok(row.height < 200, 'finding uses two compact rows at rest');
      await disclosure.dispatchEvent('click');
      assert.equal(await disclosure.getAttribute('aria-expanded'), 'true');
      assert.equal(await extra.isVisible(), true, 'one disclosure reveals the occurrence and color controls');
      await disclosure.dispatchEvent('click');
      await activate(page, 'סגור כלי מטריצה');
      const url = page.url();
      const baseline = await identity(page);
      const baseCells = () => page.locator('.els29-native-cell').evaluateAll((cells) => cells.map((cell) => ({ index: cell.dataset.elsIndex, text: cell.textContent.replace(/[\u0591-\u05C7]/g, '') })));
      const original = await baseCells();
      const engineRows = await page.evaluate(() => window.__state.matrix.rows);
      const mainIndex = baseline.axis.start;
      const showSource = async (label) => {
        // A real pointer click also checks that the transformed/vowel cell remains reachable.
        await page.locator(`[data-els-index="${mainIndex}"]`).click();
        await page.waitForFunction((index) => window.__lens?.lens === 'letter-context' && window.__lens?.index === index, mainIndex);
        assert.equal(await page.evaluate(() => window.__lens.letter), original.find((cell) => Number(cell.index) === mainIndex).text, `${label}: exact base letter source`);
        await expectNative(page, url, label);
        await activate(page, 'סגור כלי מטריצה');
      };

      await activate(page, 'ניקוד');
      await page.waitForFunction(() => window.__state?.ui?.niqqud === true && window.__state?.matrix?.niqqud?.cells?.length > 0);
      assert.ok(await page.locator('.els29-native-cell').evaluateAll((cells) => cells.some((cell) => /[\u0591-\u05C7]/.test(cell.textContent))), 'canonical Torah vowels appear on the same cells');
      assert.deepEqual(await baseCells(), original, 'vowels keep every base letter and index');
      assert.deepEqual(await page.evaluate(() => window.__state.matrix.rows), engineRows, 'vowels do not alter canonical matrix rows');
      assert.deepEqual(await identity(page), baseline);
      await showSource('vowel cell inspection');
      await activate(page, 'ניקוד');
      await page.waitForFunction(() => window.__state?.ui?.niqqud === false);
      assert.equal(await page.locator('.els29-native-cell').evaluateAll((cells) => cells.some((cell) => /[\u0591-\u05C7]/.test(cell.textContent))), false, 'vowels off restores the original text');

      for (const [label, className] of [['אותיות קלאסיות', 'is-classic-glyphs'], ['תצוגת עומק', 'is-depth']]) {
        const originalFont = await page.locator('.els29-native-cell').first().evaluate((cell) => getComputedStyle(cell).fontFamily);
        const markPaint = () => page.locator(`[data-els-index="${mainIndex}"]`).evaluate((cell) => {
          const style = getComputedStyle(cell);
          return { boxShadow: style.boxShadow, textShadow: style.textShadow, filter: style.filter };
        });
        const originalPaint = await markPaint();
        await activate(page, label);
        assert.equal(await button(page, label).getAttribute('aria-pressed'), 'true');
        assert.equal(await page.locator(`.els29-native-matrix.${className}`).count(), 1);
        assert.deepEqual(await baseCells(), original, `${label}: unchanged letters and indices`);
        assert.deepEqual(await identity(page), baseline, `${label}: unchanged verified identity`);
        if (label === 'אותיות קלאסיות') {
          assert.notEqual(await page.locator('.els29-native-cell').first().evaluate((cell) => getComputedStyle(cell).fontFamily), originalFont, 'classic mode changes the displayed letter font');
        } else {
          assert.notDeepEqual(await markPaint(), originalPaint, 'depth adds visible relief to verified marks');
          assert.equal(await page.locator('.els29-native-matrix').evaluate((matrix) => getComputedStyle(matrix).transform), 'none', 'relief keeps the matrix coordinate plane flat');
        }
        await showSource(`${label} cell inspection`);
        await activate(page, label);
        assert.equal(await button(page, label).getAttribute('aria-pressed'), 'false');
        assert.equal(await page.locator(`.els29-native-matrix.${className}`).count(), 0);
        assert.deepEqual(await baseCells(), original, `${label}: reversible presentation`);
      }
      await page.setViewportSize({ width: 390, height: 844 });
      for (const label of ['אותיות קלאסיות', 'תצוגת עומק']) {
        const target = await button(page, label).boundingBox();
        assert.ok(target.width >= 44 && target.height >= 44, `${label}: mobile touch control stays usable`);
        await activate(page, label);
        assert.deepEqual(await baseCells(), original, `${label}: mobile preserves letters and indices`);
        await showSource(`mobile ${label}`);
        await activate(page, label);
      }
      await activate(page, 'ניקוד');
      await page.waitForFunction(() => window.__state?.ui?.niqqud === true);
      assert.deepEqual(await baseCells(), original, 'mobile vowels preserve base letters');
      await showSource('mobile vowel source');
      await activate(page, 'ניקוד');
      await page.waitForFunction(() => window.__state?.ui?.niqqud === false);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'presentation modes do not create mobile page overflow');
    });
  });
