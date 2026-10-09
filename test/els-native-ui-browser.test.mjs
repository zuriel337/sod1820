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
    if(window.__fixtureHoldVerification)await new Promise(resolve=>window.__fixtureReleaseVerification=resolve);
    const result=await fetch('/oracle',{method:'POST',body:JSON.stringify({op:message.op,payload:message.payload,denied:window.__fixtureVerificationDenied})}).then(response=>response.json());
    send({type:'engine-result',requestId:message.requestId,...result});
   }
   if(message.type==='state'){window.__state=message;latest.current.onState?.(message);}
   if(message.type==='lens'){window.__lens=message;latest.current.onLens?.(message);}
   if(message.type==='gate')latest.current.onGate?.(message);
   if(message.type==='onboarding-required')latest.current.onOnboardingRequired?.(message);
   if(message.type==='operation'){window.__operation=message;latest.current.onOperation?.(message);}
  };
  addEventListener('message',receive);return()=>removeEventListener('message',receive);
 },[]);
 useEffect(()=>{if(ready.current&&props.lensRequest)send({type:'request-lens',...props.lensRequest});},[props.lensRequest]);
 useEffect(()=>{if(ready.current&&props.findingsRequest)send({type:'update-findings',findings:props.findingsRequest.findings,requestId:props.findingsRequest.seq});},[props.findingsRequest]);
 useEffect(()=>{if(ready.current&&props.controlRequest)send({type:'native-control',...props.controlRequest});},[props.controlRequest]);
 useEffect(()=>{if(ready.current&&props.findingControlRequest)send({type:'native-finding-control',...props.findingControlRequest});},[props.findingControlRequest]);
 useEffect(()=>{if(ready.current&&props.searchRequest)send({type:'native-search',request:props.searchRequest,requestId:props.searchRequest.seq});},[props.searchRequest]);
 return React.createElement('iframe',{ref:frame,src:'/tzofen.html?embed=1&bridge=hidden'+(props.experience2029?'&experience=2029':''),title:'canonical engine fixture',style:{position:'absolute',width:1,height:1,clipPath:'inset(100%)'}});
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

function verify({ op, payload, denied }) {
  if (denied) return { ok: false, error: 'bridge_unavailable' };
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
  '../lib/supabase.js': `export const supabase={functions:{invoke:async(name,{body,signal})=>{const {op,...payload}=body;
    if(window.__fixtureHoldVerification)await new Promise(resolve=>{window.__fixtureReleaseVerification=resolve;signal?.addEventListener('abort',()=>{window.__fixtureAborts=(window.__fixtureAborts||0)+1;resolve();},{once:true});});
    if(signal?.aborted)return {data:null,error:{message:'aborted'}};
    const response=await fetch('/oracle',{method:'POST',body:JSON.stringify({op,payload,denied:window.__fixtureVerificationDenied})}).then(result=>result.json());return response.ok?{data:response,error:null}:{data:null,error:{message:response.error}};}}};`,
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
          if (message.type === 'operation') window.__operation = message;
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
  await openPanel(page);
  await selectAxis(page, golden.term);
  assert.equal(await button(page, 'סרוק לאורך הציר הנבחר').count(), 1, 'one shared scan action');
  const requests = await page.evaluate(() => window.__hostLog.filter((message) => message.type === 'request-lens').length);
  await button(page, 'סרוק לאורך הציר הנבחר').evaluate((element) => { element.click(); element.click(); element.click(); });
  await button(page, 'סמן את תורה ברצף').waitFor();
  assert.equal(await page.evaluate(() => window.__hostLog.filter((message) => message.type === 'request-lens').length), requests + 1, 'scan spam produces one pending lens request');
  await expectStable(page, before, 'scan primary line');
  await activate(page, 'סמן את תורה ברצף');
  assert.equal(await page.locator('[data-experience-capability="els-line-inspection"] .is-word').count(), 4);
  await expectStable(page, before, 'highlight line word');
}

async function openPanel(page) {
  if (await button(page, 'סריקה וממצאים').getAttribute('aria-expanded') !== 'true') await activate(page, 'סריקה וממצאים');
}
async function selectAxis(page, term) {
  await openPanel(page);
  await activate(page, `בחר ציר לסריקה: ${term}`);
}
async function addSecondary(page, term) {
  await openPanel(page);
  await page.getByRole('textbox', { name: 'חיפוש משני במטריצה', exact: true }).fill(term);
  await activate(page, 'חפש במטריצה');
  await page.waitForFunction((word) => window.__state?.findings?.some((finding) => finding.t === word && finding.hits?.some((hit) => hit.shown && hit.verified)), term);
}
async function radius(page, value) {
  const control = page.getByLabel('מרחק מרבי מהציר הראשי', { exact: true });
  if (await control.evaluate((element) => element.tagName) === 'SELECT') await control.selectOption(value === null ? 'all' : String(value));
  else {
    await control.fill(value === null ? '' : String(value));
    await control.dispatchEvent('change');
  }
}
async function alignedPanel(page, label) {
  const stage = await page.locator('.els29-native-stage').boundingBox();
  const panel = await page.locator('.els29-native-context-panel').boundingBox();
  assert.ok(Math.abs(stage.y - panel.y) <= 1, `${label}: panel top matches the matrix`);
  assert.ok(Math.abs(stage.y + stage.height - panel.y - panel.height) <= 1, `${label}: panel bottom matches the matrix`);
}
async function injectToolMessage(page, message) {
  const frame = page.frames().find((item) => item.parentFrame());
  assert.ok(frame, 'canonical iframe exists');
  await frame.evaluate((data) => parent.postMessage(data, location.origin), message);
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


test('native UI: one unified rail scans exact primary and secondary targets without moving the matrix',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
  await withNative({width:1440,height:1000},async page=>{
   const url=page.url(),initial=await identity(page),before=await pan(page);
   await alignedPanel(page,'initial pinned rail');
   await activate(page,'סגור כלי מטריצה');await expectStable(page,before,'close unified rail');
   await openPanel(page);await expectStable(page,before,'reopen unified rail');
   await inspectAndScanPrimary(page,before);
   assert.deepEqual(await identity(page),initial,'primary scan preserves verified identity');
   const primary=await page.evaluate(()=>window.__lens);
   await addSecondary(page,'התורה');
   const state=await page.evaluate(()=>window.__state);
   const hit=state.findings.find(f=>f.t==='התורה').hits.find(h=>h.shown&&h.verified);
   const input=page.getByRole('textbox',{name:'חיפוש משני במטריצה',exact:true});
   await input.fill('דוד');const draft=await input.inputValue(),secondaryPan=await pan(page);
   await selectAxis(page,'התורה');await activate(page,'סרוק לאורך הציר הנבחר');
   await page.waitForFunction(id=>window.__lens?.lens==='line-context'&&window.__lens?.hitId===id&&window.__lens?.target?.term==='התורה'&&window.__lens?.scan,hit.hitId);
   await expectStable(page,secondaryPan,'secondary scan');await expectNative(page,url,'secondary scan');
   assert.equal(await input.inputValue(),draft,'scan retains the secondary input');
   assert.equal(await button(page,'בחר ציר לסריקה: התורה').isVisible(),true,'scan retains the finding list');
   assert.equal(await button(page,'סרוק לאורך הציר הנבחר').count(),1,'still one shared scan action');
   assert.deepEqual(await identity(page),{term:state.term,scope:state.scope,axis:state.axis,geometry:state.geometry,occurrence:state.occurrence,findings:state.findings,verification:state.verification});
   // Append a dictionary candidate from a selected secondary line, without losing that line.
   await activate(page,'סמן את תורה ברצף');
   const retained=await page.locator('.els29-native-line-cells').textContent();
   await page.evaluate(()=>window.__fixtureHoldVerification=true);
   await activate(page,'הוסף את תורה לממצאים');
   await page.waitForFunction(()=>typeof window.__fixtureReleaseVerification==='function');
   assert.equal(await button(page,'בחר ציר לסריקה: התורה').getAttribute('aria-pressed'),'true','secondary target is retained while its candidates are reverified');
   assert.equal(await page.locator('.els29-native-line-cells').textContent(),retained,'secondary scan stays open through verification');
   assert.equal(await page.locator('.els29-native-line-cells .is-word').count(),4,'candidate highlight survives verification');
   assert.equal(await input.inputValue(),draft,'candidate append retains the secondary draft');
   for(const label of ['סרוק לאורך הציר הנבחר','מקור הממצא הנבחר','הוסף את תורה לממצאים'])assert.equal(await button(page,label).isDisabled(),true,label+' is disabled during candidate verification');
   await page.evaluate(()=>{window.__fixtureHoldVerification=false;window.__fixtureReleaseVerification()});
   await page.waitForFunction(()=>window.__state?.findings?.find(f=>f.t==='תורה')?.hits?.some(hit=>hit.shown&&hit.verified));
   await page.waitForFunction(()=>!document.querySelector('[aria-label="סרוק לאורך הציר הנבחר"]').disabled);
   assert.equal(await button(page,'בחר ציר לסריקה: התורה').getAttribute('aria-pressed'),'true','original secondary target is revalidated after completion');
   assert.equal(await input.inputValue(),draft);
   assert.equal(await page.locator('.els29-native-line-cells').textContent(),retained);
   assert.equal(await page.locator('.els29-native-line-cells .is-word').count(),4);
   assert.equal(await page.locator('[data-experience-capability="els-line-inspection"]').innerText().then(text=>text.includes('לאורך הציר · התורה')),true);
   await activate(page,'מקור הממצא הנבחר');
   await page.waitForFunction(id=>window.__lens?.lens==='verse-context'&&window.__lens?.hitId===id&&window.__lens?.target?.term==='התורה',hit.hitId);
   await expectStable(page,secondaryPan,'inline source');assert.equal(await input.isVisible(),true);
   assert.equal(await button(page,'בחר ציר לסריקה: התורה').isVisible(),true);
   // A delayed old primary completion must not replace the selected secondary result.
   await injectToolMessage(page,primary);
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   assert.equal(await page.locator('[data-experience-capability="els-line-inspection"]').count(),0,'stale primary scan cannot replace the newer inline source');
   const body=page.locator('.els29-native-rail-scroll').filter({visible:true});
   await body.evaluate(element=>element.scrollTop=element.scrollHeight);
   await alignedPanel(page,'scrolled rail');
   for(const label of ['סרוק לאורך הציר הנבחר','מקור הממצא הנבחר']){
    const action=await button(page,label).boundingBox(),panel=await page.locator('.els29-native-context-panel').boundingBox();
    assert.ok(action.height>=44&&action.y>=panel.y&&action.y+action.height<=panel.y+panel.height+1,label+' stays reachable in the persistent footer');
   }
   await expectStable(page,secondaryPan,'internal rail scroll');
  });
 });

test('native UI: selected targets are invalidated by radius, hiding, removal and a new main axis',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
  await withNative({width:1440,height:1000},async page=>{
   await addSecondary(page,'תורה');await selectAxis(page,'תורה');
   const initial=await page.evaluate(()=>window.__state),old=initial.findings.find(f=>f.t==='תורה').hits.find(h=>h.shown&&h.verified);
   assert.ok(old.axisDistance>1,'fixture has a secondary hit outside the narrow radius');
   await radius(page,1);
   await page.waitForFunction(()=>window.__state?.findings?.find(f=>f.t==='תורה')?.hits?.every(hit=>!hit.shown||hit.axisDistance<=1));
   assert.notEqual(await button(page,'בחר ציר לסריקה: תורה').getAttribute('aria-pressed'),'true','radius invalidates the unavailable selected hit');
   assert.equal(await page.locator('[data-experience-capability="els-line-inspection"]').count(),0);
   await radius(page,null);await page.waitForFunction(()=>window.__state?.findings?.find(f=>f.t==='תורה')?.hits?.some(hit=>hit.shown&&hit.verified));
   await selectAxis(page,'תורה');
   await activate(page,'מופעים וצבע של תורה');
   const group=page.locator('.els29-native-finding-group').filter({has:page.getByRole('button',{name:'בחר ציר לסריקה: תורה',exact:true})});
   await group.locator('input[type="checkbox"]:checked').first().dispatchEvent('click');
   await page.waitForFunction(id=>!window.__state?.findings?.find(f=>f.t==='תורה')?.hits?.some(hit=>hit.hitId===id&&hit.shown),old.hitId);
   assert.notEqual(await button(page,'בחר ציר לסריקה: תורה').getAttribute('aria-pressed'),'true','hiding invalidates the selected hit');
   await activate(page,'מחק את המילה תורה וכל מופעיה');
   await page.waitForFunction(()=>!window.__state?.findings?.some(f=>f.t==='תורה'));
   assert.equal(await button(page,'בחר ציר לסריקה: תורה').count(),0);
   await selectAxis(page,golden.term);
   await page.getByRole('textbox',{name:'מונח',exact:true}).fill('אליהו');await activate(page,'חפש');
   await page.waitForFunction(()=>window.__state?.term==='אליהו'&&window.__state?.status==='ok');
   assert.equal(await button(page,'בחר ציר לסריקה: '+golden.term).count(),0,'old primary target disappears after main-axis replacement');
   await selectAxis(page,'אליהו');await activate(page,'סרוק לאורך הציר הנבחר');
   await page.waitForFunction(()=>window.__lens?.lens==='line-context'&&window.__lens?.word==='אליהו'&&window.__lens?.scan);
   const reloadItem=await page.evaluate(()=>{const state=window.__state;return{term:state.term,scope:state.scope,skip:state.axis.skip,start:state.axis.start,dir:state.axis.direction==='back'?-1:1}});
   const restoredAxis=await page.evaluate(()=>window.__state.axis.hitId);
   // A same-axis reload must terminate pending operations even without an axis identity change.
   for(const kind of ['findings','search']){
    await page.evaluate(()=>{window.__fixtureHoldVerification=true;delete window.__fixtureReleaseVerification});
    if(kind==='findings'){
     await page.getByRole('textbox',{name:'חיפוש משני במטריצה',exact:true}).fill('דוד');await activate(page,'חפש במטריצה');
    }else{
     await page.getByRole('textbox',{name:'מונח',exact:true}).fill('משיח');await activate(page,'חפש');
    }
    await page.waitForFunction(()=>typeof window.__fixtureReleaseVerification==='function');
    const requestId=await page.evaluate(currentKind=>window.__hostLog.findLast(message=>message.type===(currentKind==='search'?'native-search':'update-findings')).requestId,kind);
    await page.evaluate(()=>{window.__fixtureHoldVerification=false;window.__fixtureHeldRelease=window.__fixtureReleaseVerification});
    await page.locator('iframe').evaluate((element,item)=>element.contentWindow.postMessage({source:'sod-host',type:'load-matrix',item},location.origin),{...reloadItem,id:'same-axis-'+kind+'-cancel'});
    await page.waitForFunction(({kind,requestId})=>window.__log.some(message=>message.type==='operation'&&message.kind===kind&&message.requestId===requestId&&message.status==='cancelled'),{kind,requestId});
    await page.waitForFunction(id=>window.__state?.provenance?.editId===id,'same-axis-'+kind+'-cancel');
    await page.waitForFunction(()=>!document.querySelector('.els29-native-search').disabled&&!document.querySelector('[aria-label="חיפוש משני במטריצה"]').disabled);
    assert.equal(await page.evaluate(()=>window.__state.axis.hitId),restoredAxis,'reload retains the same main axis');
    await page.evaluate(()=>window.__fixtureHeldRelease());
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.equal(await page.evaluate(()=>window.__state.axis.hitId),restoredAxis,'late cancelled verification cannot replace the restored axis');
   }
  });
 });

test('native UI: mobile bounded sheets and wide 90% panels preserve geometry, pan and reachable height controls',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
  await withNative({width:2560,height:1000},async page=>{
   const margins=await page.evaluate(()=>{const frame=document.querySelector('.sod29-main').getBoundingClientRect(),content=document.querySelector('.sod29-content').getBoundingClientRect();return{ratio:content.width/frame.width,left:content.left-frame.left,right:frame.right-content.right}});
   assert.ok(Math.abs(margins.ratio-.9)<=.001&&Math.abs(margins.left-margins.right)<=1);
   assert.ok((await capture(page)).width>1450);await alignedPanel(page,'wide pinned rail');
   const pinned=await pan(page);await activate(page,'בטל הצמדה');const overlay=await pan(page);assert.ok(overlay.width>pinned.width);
   await activate(page,'סגור כלי מטריצה');await expectStable(page,overlay,'overlay close');await openPanel(page);await expectStable(page,overlay,'overlay reopen');
   await activate(page,'הצמד');const repinned=await pan(page);assert.ok(Math.abs(repinned.width-pinned.width)<=1);
   const baseline=await stageHeight(page);await activate(page,'הגדל גובה ב־50%');assert.ok(Math.abs(await stageHeight(page)-baseline*1.5)<=1);await alignedPanel(page,'expanded pinned rail');
   await activate(page,'חזור לגובה הרגיל');await alignedPanel(page,'restored pinned rail');
   await activate(page,'סגור כלי מטריצה');await expectHeightControl(page);
   await page.setViewportSize({width:390,height:844});await openPanel(page);
   const before=await pan(page),sheet=page.getByRole('complementary',{name:'כלי ELS והקשר המטריצה',exact:true});
   const compact=await sheet.boundingBox();assert.ok(compact.height<=844*.36+1&&compact.x>=0&&compact.x+compact.width<=390);
   await inspectAndScanPrimary(page,before);
   await activate(page,'הרחב');const expanded=await sheet.boundingBox();assert.ok(expanded.height<=844*.7+1);await expectStable(page,before,'expanded mobile rail');
   await activate(page,'סגור כלי מטריצה');await expectHeightControl(page);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  });
 });

test('native UI: unified scan recovers from Classic; heat paints only unmarked cells without changing research state',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
  await withNative({width:1440,height:1000},async page=>{
   const url=page.url();await selectAxis(page,golden.term);await activate(page,'כל הכלים');
   assert.equal(await page.locator('.els29-classic-fallback.is-open').count(),1);
   await page.getByRole('button',{name:'סרוק לאורך הציר הנבחר',exact:true,includeHidden:true}).dispatchEvent('click');
   await button(page,'סמן את תורה ברצף').waitFor();await expectNative(page,url,'scan after Classic');
   await activate(page,'סגור כלי מטריצה');await button(page,'מפת חום').scrollIntoViewIfNeeded();
   const initial=await identity(page),before=await pan(page);
   const marked=()=>page.locator('.els29-native-cell.is-axis,.els29-native-cell.is-finding').evaluateAll(cells=>cells.map(cell=>({index:cell.dataset.elsIndex,background:getComputedStyle(cell).backgroundColor,color:getComputedStyle(cell).color})));
   const backgrounds=()=>page.locator('.els29-native-cell:not(.is-axis):not(.is-finding)').evaluateAll(cells=>cells.map(cell=>getComputedStyle(cell).backgroundColor));
   const originalMarks=await marked(),originalBackgrounds=await backgrounds();
   await activate(page,'מפת חום');await page.waitForFunction(()=>window.__state?.ui?.heat===true);
   assert.deepEqual(await marked(),originalMarks);assert.notDeepEqual(await backgrounds(),originalBackgrounds);assert.deepEqual(await identity(page),initial);await expectStable(page,before,'heat on');
   await activate(page,'מפת חום');await page.waitForFunction(()=>window.__state?.ui?.heat===false);
   assert.deepEqual(await marked(),originalMarks);assert.deepEqual(await backgrounds(),originalBackgrounds);await expectStable(page,before,'heat off');
  });
 });

test('native UI: fresh anonymous 2029 searches bypass legacy demo gates while canonical verification remains required',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
  await withNative({width:1440,height:1000},async page=>{
   const url=page.url();assert.equal(await page.evaluate(()=>localStorage.getItem('tzofen_onboarded_v1')),null);
   assert.ok((await page.locator('iframe').getAttribute('src')).includes('experience=2029'));
   for(const [index,term] of ['תורה','אליהו','דוד','משיח'].entries()){
    const oldOperation=await page.evaluate(()=>window.__operation);
    if(index===3)await page.evaluate(()=>window.__fixtureHoldVerification=true);
    await page.getByRole('textbox',{name:'מונח',exact:true}).fill(term);await activate(page,'חפש');
    if(index===3){
     await page.waitForFunction(()=>typeof window.__fixtureReleaseVerification==='function');
     assert.equal(await page.locator('.els29-native-search').isDisabled(),true,'primary search stays disabled while verification is pending');
     for(const label of ['סרוק לאורך הציר הנבחר','מקור הממצא הנבחר','חפש במטריצה','הגדל מטריצה','התאם מטריצה למסך'])assert.equal(await button(page,label).isDisabled(),true,label+' is disabled during main verification');
     assert.equal(await page.getByLabel('גודל חלון החיפוש',{exact:true}).isDisabled(),true);
     assert.equal(await page.getByRole('textbox',{name:'חיפוש משני במטריצה',exact:true}).isDisabled(),true);
     assert.equal(await page.getByLabel('מרחק מרבי מהציר הראשי',{exact:true}).isDisabled(),true);
     const requests=await page.evaluate(()=>window.__hostLog.filter(message=>message.type==='native-search').length);
     await page.locator('.els29-native-search').evaluate(element=>{element.click();element.click();element.click()});
     assert.equal(await page.evaluate(()=>window.__hostLog.filter(message=>message.type==='native-search').length),requests,'disabled search ignores repeated clicks');
     await injectToolMessage(page,{...oldOperation,status:'done'});
     await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
     assert.equal(await page.locator('.els29-native-search').isDisabled(),true,'stale completion cannot clear the current pending search');
     await page.evaluate(()=>{window.__fixtureHoldVerification=false;window.__fixtureReleaseVerification()});
    }
    await page.waitForFunction(word=>window.__state?.term===word&&window.__state?.status==='ok'&&window.__state?.verification?.state==='MATCH',term,{timeout:60000});
    await page.waitForFunction(()=>!document.querySelector('.els29-native-search').disabled);
    await expectNative(page,url,'fresh anonymous '+term);
   }
   await activate(page,'כל התנ״ך');await page.waitForFunction(()=>window.__state?.scope==='tanakh'&&window.__state?.status==='ok');
   assert.equal(await page.evaluate(()=>window.__log.some(message=>message.type==='gate'||message.type==='onboarding-required')),false,'no local demo or scope signup gates');
   assert.equal(await page.locator('[data-fixture-subscribe-gate]').count(),0);
   assert.equal(await page.evaluate(()=>localStorage.getItem('tzofen_onboarded_v1')),null);
   await page.evaluate(()=>window.__fixtureVerificationDenied=true);
   await page.getByRole('textbox',{name:'מונח',exact:true}).fill('גאולה');await activate(page,'חפש');
   await page.waitForFunction(()=>window.__state?.term==='גאולה'&&window.__state?.status==='candidate');
   assert.notEqual(await page.evaluate(()=>window.__state.verification.state),'MATCH','server verification denial still fails closed');
   assert.equal(await page.locator('.els29-native-cell.is-axis').count(),0);
   await expectNative(page,url,'canonical verification denial');
  },{realHost:true,loadGolden:false,onboarded:false,tier:'anon'});
 });

test('native UI: compact findings, vowels, classic letters and depth retain exact base letters and source indices',
  { skip: !canRun && 'Native browser tooling unavailable', timeout: 180000 }, async () => {
    await withNative({ width: 1440, height: 1000 }, async (page) => {
      await addSecondary(page, 'תורה');
      const finding = page.locator('.els29-native-finding-group').filter({ has: page.getByRole('button', { name: 'בחר ציר לסריקה: תורה', exact: true }) });
      assert.equal(await finding.count(), 1);
      for (const name of ['בחר ציר לסריקה: תורה', 'מופעים וצבע של תורה']) {
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
      for(const name of ['העלה את תורה','הורד את תורה','מחק את המילה תורה וכל מופעיה']){const bounds=await finding.getByRole('button',{name,exact:true}).boundingBox();assert.ok(bounds.width>=44&&bounds.height>=44,name+' remains touch accessible inside the disclosure');}
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

test('native UI: cross meetings have exact numbered navigation, real compact bounds and adaptive expansion',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:240000},async()=>{
  await withNative({width:1440,height:1000},async page=>{
   const searchCross=async(axis,term,radius=18)=>{
    const seq=await page.evaluate(()=>window.__operation?.requestId||0);
    await page.getByRole('textbox',{name:'מונח',exact:true}).fill(axis);
    if(!(await page.locator('.els29-native-cross-row').count()))await activate(page,'הצלבה בין צירים');
    await page.getByRole('textbox',{name:'מונח שני',exact:true}).fill(term);
    await changeRange(page,'מרחק מרבי מהציר בהצלבה',radius);await activate(page,'מצא מפגש');
    await page.waitForFunction(n=>window.__operation?.kind==='search'&&window.__operation.requestId>n&&window.__operation.status==='done',seq,{timeout:90000});
   };
   const resize=async(size)=>{
    const seq=await page.evaluate(()=>window.__operation.requestId);
    await page.getByLabel('גודל חלון החיפוש',{exact:true}).selectOption(size);
    await page.waitForFunction(n=>window.__operation?.kind==='search'&&window.__operation.requestId>n&&window.__operation.status==='done',seq,{timeout:90000});
   };
   await searchCross('משיח טבת','ישלח מלאכו');
   const compact=await page.evaluate(()=>window.__state);
   assert.equal(compact.ui.windowSize,'small');assert.equal(compact.geometry.cw,40);assert.equal(compact.ui.ctxR,1);
   assert.equal(compact.search.zones,1);assert.equal(compact.occurrence.count,7);
   assert.equal(await button(page,'מפגש הבא').isDisabled(),true,'one meeting is not seven main-axis occurrences');
   assert.equal(await button(page,'מופע הבא').count(),0,'cross controls do not clear findings by navigating unrelated occurrences');
   assert.equal(await button(page,'פתח מפגש 1').getAttribute('aria-pressed'),'true');
   assert.equal(compact.search.results.items[0].sourceSequence,true,'literal source sequence is distinguished from a verified ELS');
   assert.equal(await page.getByRole('textbox',{name:'מונח',exact:true}).inputValue(),'משיח טבת');
   const matrix=page.locator('.els29-native-matrix-scroll');await matrix.scrollIntoViewIfNeeded();
   await matrix.evaluate(el=>el.scrollLeft=(el.scrollWidth-el.clientWidth)/2);
   const box=await matrix.boundingBox(),before=await capture(page);
   await page.mouse.move(box.x+box.width/2,box.y+80);await page.mouse.down();
   await page.mouse.move(box.x+box.width/2+80,box.y+80,{steps:8});await page.mouse.up();
   assert.ok((await capture(page)).left<before.left-60,'real mouse drag pans horizontally');
   await matrix.focus();const left=await matrix.evaluate(el=>el.scrollLeft);await page.keyboard.press('ArrowRight');
   assert.ok((await matrix.evaluate(el=>el.scrollLeft))>left,'keyboard can pan the same matrix');
   const oldSet=compact.search.results.id;
   await resize('large');const large=await page.evaluate(()=>window.__state);
   assert.equal(large.geometry.cw,80);assert.equal(large.ui.ctxR,8);
   assert.ok(large.matrix.rows.length*large.geometry.cw>compact.matrix.rows.length*compact.geometry.cw,'larger selection changes canonical search geometry');
   assert.equal(large.search.crossA,'משיח טבת');assert.equal(large.search.crossB,'ישלח מלאכו');
   await resize('small');await searchCross('משיח טבת','ישלח מלאכו',20);
   const expanded=await page.evaluate(()=>window.__state);
   assert.equal(expanded.ui.windowRequested,'small');assert.equal(expanded.ui.windowSize,'medium');assert.equal(expanded.geometry.cw,60);
   assert.equal(await page.getByText('החלון הורחב כדי להכיל את הציר והמרחק',{exact:true}).count(),1);
   await searchCross('משיח','גאולה',18);
   const multi=await page.evaluate(()=>window.__state);
   assert.ok(multi.search.zones>1,'fixture has multiple canonical meetings');
   await activate(page,'מפגש הבא');await page.waitForFunction(()=>window.__state.search.zoneIndex===1);
   assert.equal((await page.evaluate(()=>window.__state)).axis.hitId,multi.search.results.items[1].hitId);
   assert.ok((await page.evaluate(()=>window.__state)).findings.length>0,'meeting navigation retains the secondary terms');
   await page.evaluate(setId=>document.querySelector('iframe').contentWindow.postMessage({source:'sod-host',type:'native-control',action:'meeting-select',value:{setId,index:0}},location.origin),oldSet);
   await page.waitForFunction(setId=>window.__hostLog.some(message=>message.action==='meeting-select'&&message.value?.setId===setId),oldSet);
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   assert.equal((await page.evaluate(()=>window.__state)).search.zoneIndex,1,'stale result-list selection cannot open a different meeting in the current list');
   await page.locator('.els29-native-results summary').click();
   await page.getByLabel('מיון מפגשי ההצלבה',{exact:true}).selectOption('skip');
   const skips=await page.locator('.els29-native-result b').allTextContents();
   const numbers=skips.map(s=>Number(s.match(/דילוג (\d+)/)[1]));assert.deepEqual(numbers,[...numbers].sort((a,b)=>a-b));
   const third=multi.search.results.items.find(item=>item.available&&item.index===2);
   assert.ok(third);await activate(page,'פתח מפגש 3');await page.waitForFunction(()=>window.__state.search.zoneIndex===2);
   assert.equal((await page.evaluate(()=>window.__state)).axis.hitId,third.hitId,'sorting retains original exact meeting identity');
   const panBefore=await capture(page);await page.getByLabel('דילוג מינימלי בתוצאות',{exact:true}).fill('999999');
   assert.equal(await page.locator('.els29-native-result').count(),0);await expectStable(page,panBefore,'local results filter');
   await page.getByLabel('דילוג מינימלי בתוצאות',{exact:true}).fill('');
   // A saved compact matrix restores its search geometry, and cannot retain the previous cross list.
   const item={term:compact.termRaw,scope:compact.scope,skip:compact.axis.skip,start:compact.axis.start,dir:1,hitId:compact.axis.hitId,words:[],searchWindow:{ctxR:1,windowColumns:40,windowSize:'small',windowRequested:'small'}};
   await page.evaluate(item=>document.querySelector('iframe').contentWindow.postMessage({source:'sod-host',type:'load-matrix',item},location.origin),item);
   await page.waitForFunction(id=>window.__state?.axis?.hitId===id&&window.__state?.search?.mode==='regular',compact.axis.hitId);
   const restored=await page.evaluate(()=>window.__state);assert.equal(restored.search.results,null);assert.equal(restored.geometry.cw,40);assert.equal(restored.ui.ctxR,1);
   await page.evaluate(item=>document.querySelector('iframe').contentWindow.postMessage({source:'sod-host',type:'load-matrix',item},location.origin),{...item,searchWindow:{ctxR:8,windowColumns:80,windowSize:'large',windowRequested:'large'}});
   await page.waitForFunction(()=>window.__state?.ui?.windowRequested==='large');
   assert.equal(await page.getByLabel('גודל חלון החיפוש',{exact:true}).inputValue(),'large','saved search size is reflected by the native control');
   await page.evaluate(item=>document.querySelector('iframe').contentWindow.postMessage({source:'sod-host',type:'load-matrix',item},location.origin),{...item,searchWindow:null});
   await page.waitForFunction(()=>window.__state?.ui?.windowRequested==='legacy');
   assert.equal((await page.evaluate(()=>window.__state)).geometry.cw,80,'older saves retain their original window');
   assert.equal(await page.getByText('מוצג החלון המקורי',{exact:true}).count(),1);
   await activate(page,'הצלבה בין צירים');
   await page.getByRole('textbox',{name:'מונח',exact:true}).fill('תורהקדשה');await activate(page,'חפש');
   await page.waitForFunction(()=>window.__state?.term==='תורהקדשה'&&window.__operation?.status==='done');
   assert.equal((await page.evaluate(()=>window.__state)).search.mode,'regular','fresh regular search clears cross identity');
  },{realHost:true,loadGolden:false,tier:'anon'});
 });

async function reliabilityCross(page, axis, term) {
  const seq=await page.evaluate(()=>window.__operation?.requestId||0);
  await page.getByRole('textbox',{name:'מונח',exact:true}).fill(axis);
  if(!(await page.locator('.els29-native-cross-row').count()))await activate(page,'הצלבה בין צירים');
  await page.getByRole('textbox',{name:'מונח שני',exact:true}).fill(term);
  await activate(page,'מצא מפגש');
  await page.waitForFunction(n=>window.__operation?.kind==='search'&&window.__operation.requestId>n&&window.__operation.status==='done',seq,{timeout:90000});
  return page.evaluate(()=>window.__state);
}

test('native transition: minus-two reading layout preserves exact cells and opens names cross without refresh',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:120000},async()=>{
  await withNative({width:1440,height:1000},async page=>{
    const url=page.url();
    await page.getByRole('textbox',{name:'מונח',exact:true}).fill('בעל משבר מאים בעקירה');await activate(page,'חפש');
    await page.waitForFunction(()=>window.__state?.axis?.hitId==='2_-1_49435'&&window.__operation?.status==='done');
    const original=await identity(page);
    const cells=()=>page.locator('.els29-native-cell').evaluateAll(nodes=>nodes.map(n=>({i:Number(n.dataset.elsIndex),text:n.textContent,axis:n.classList.contains('is-axis')})));
    const originalCells=await cells();
    assert.equal(original.geometry.S,2);assert.equal(original.geometry.cw,2);
    assert.equal(originalCells.filter(c=>c.axis).reverse().map(c=>c.text).join(''),'בעלמשברמאימבעקירה');
    assert.equal(await page.locator('.els29-native-matrix.is-reading').count(),1,'short skip defaults to a broad reading layout');
    const rowWidth=()=>page.locator('.els29-native-cell').evaluateAll(nodes=>{const first=nodes[0].getBoundingClientRect();return nodes.filter(n=>Math.abs(n.getBoundingClientRect().top-first.top)<1).length;});
    assert.ok(await rowWidth()>8,'source cells actually reflow into broader rows');
    const beforeMessages=await page.evaluate(()=>window.__hostLog.filter(m=>['native-search','request-lens','native-control'].includes(m.type)).length);
    await page.getByLabel('תצוגת דילוג קטן',{exact:true}).selectOption('columns');
    assert.equal(await rowWidth(),2,'original skip columns remain available');
    assert.deepEqual(await cells(),originalCells);assert.deepEqual(await identity(page),original);
    await page.getByLabel('תצוגת דילוג קטן',{exact:true}).selectOption('reading');
    assert.equal(await page.evaluate(()=>window.__hostLog.filter(m=>['native-search','request-lens','native-control'].includes(m.type)).length),beforeMessages,'changing layout never searches or changes engine geometry');
    for(const width of [1440,390]){
      await page.setViewportSize({width,height:900});
      assert.deepEqual(await cells(),originalCells,'responsive wrapping preserves each exact source index');
      assert.ok(await rowWidth()>2);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    }
    await page.setViewportSize({width:1440,height:1000});
    await page.locator('[data-els-index="49435"]').dispatchEvent('click');
    await page.waitForFunction(()=>window.__lens?.lens==='letter-context'&&window.__lens.target?.i===49435);
    assert.equal(await page.evaluate(()=>window.__lens.ok),true,'reading view uses the same exact verse inspection');
    assert.equal(await page.evaluate(()=>window.__lens.letter),'ב');
    await page.getByRole('textbox',{name:'מונח',exact:true}).fill('צוריאל');await activate(page,'הצלבה בין צירים');
    await page.getByRole('textbox',{name:'מונח שני',exact:true}).fill('פולייס');
    assert.equal(await button(page,'מצא מפגש').count(),1,'one submission control for the active search mode');
    assert.equal(await button(page,'חפש').count(),0);
    // Enter in the PRIMARY input must honor the open cross mode as well.
    await page.getByRole('textbox',{name:'מונח',exact:true}).press('Enter');
    await page.waitForFunction(()=>window.__state?.search?.mode==='cross-simple'&&window.__operation?.status==='done');
    const names=await page.evaluate(()=>window.__state);
    assert.equal(names.axis.hitId,'14870_-1_251278');assert.equal(names.search.zones,3);
    assert.equal(names.geometry.cw,40);assert.equal(names.ui.windowSize,'small');
    assert.equal(await page.locator('.els29-native-stage h3').textContent(),'פולייס');
    assert.equal(await page.locator('.els29-native-matrix.is-reading').count(),0,'cross displays its canonical matrix geometry');
    assert.equal(await page.locator('.els29-native-matrix-status').textContent(),'מטריצה פעילה');
    assert.equal(await page.locator('.els29-native-progress').count(),0);
    assert.equal(await page.locator('.els29-native-result').count(),3);
    await activate(page,'מפגש הבא');await page.waitForFunction(()=>window.__state.axis.hitId==='17529_-1_139194');
    assert.equal(await page.locator('.els29-native-stage h3').textContent(),'פולייס');
    await expectNative(page,url,'minus-two to names cross');
  },{realHost:true,loadGolden:false,tier:'anon'});
 });

test('native transition: a failed cross labels the retained result and retry replaces it in the same tab',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:120000},async()=>{
  await withNative({width:1440,height:1000},async page=>{
    await page.getByRole('textbox',{name:'מונח',exact:true}).fill('בעל משבר מאים בעקירה');await activate(page,'חפש');
    await page.waitForFunction(()=>window.__state?.axis?.hitId==='2_-1_49435'&&window.__operation?.status==='done');
    const original=await identity(page);
    await page.evaluate(()=>window.__fixtureVerificationDenied=true);
    await page.getByRole('textbox',{name:'מונח',exact:true}).fill('צוריאל');await activate(page,'הצלבה בין צירים');
    await page.getByRole('textbox',{name:'מונח שני',exact:true}).fill('פולייס');await activate(page,'מצא מפגש');
    await page.waitForFunction(()=>window.__operation?.kind==='search'&&window.__operation.status==='error');
    assert.deepEqual(await identity(page),original,'failed verification preserves the last successful matrix');
    assert.match(await page.locator('.els29-native-matrix-status').textContent(),/הממצא הקודם.*לא הושלם/);
    assert.equal(await page.locator('.els29-native-progress').count(),0);
    await page.evaluate(()=>window.__fixtureVerificationDenied=false);
    // Enter in the secondary input follows the SAME form submission and is a real retry.
    await page.getByRole('textbox',{name:'מונח שני',exact:true}).press('Enter');
    await page.waitForFunction(()=>window.__state?.search?.mode==='cross-simple'&&window.__operation?.status==='done');
    assert.equal((await identity(page)).axis.hitId,'14870_-1_251278');
    assert.equal(await page.locator('.els29-native-matrix-status').textContent(),'מטריצה פעילה');
    assert.equal(await page.locator('.els29-native-notice').count(),0);
  },{realHost:true,loadGolden:false,tier:'anon'});
 });

test('native reliability: both user examples, reversed roles, literal source inspection and compact cross geometry',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
  await withNative({width:1440,height:1000},async page=>{
    const first=await reliabilityCross(page,'משיח טבת עשירי','ישלח מלאכו');
    assert.equal(first.axis.hitId,'1820_1_15170');
    assert.equal(first.geometry.cw,40);assert.equal(first.ui.ctxR,2);assert.equal(first.ui.windowSize,'small');
    const source=first.findings.find(w=>w.t==='ישלחמלאכו');
    assert.deepEqual(source.shown,[],'source is not promoted to canonical ELS');
    assert.equal(source.sourceHits[0].kind,'source-sequence');assert.equal(source.sourceHits[0].shown,true);
    assert.equal(source.sourceHits[0].hitId,'1_1_29729');
    assert.deepEqual(first.matrix.sourceMarks.map(m=>m.i),Array.from({length:9},(_,k)=>29729+k));
    assert.equal(first.matrix.sourceMarks.map(m=>letters[m.i]).join(''),'ישלחמלאכו');
    assert.equal(first.matrix.marks.filter(m=>m.type==='finding').length,0,'canonical marks remain MATCH-only');
    assert.equal(await page.locator('.els29-native-cell.is-source-text').count(),9);
    await selectAxis(page,'ישלחמלאכו');await activate(page,'מקור הממצא הנבחר');
    await page.waitForFunction(()=>window.__lens?.lens==='verse-context'&&window.__lens?.target?.kind==='source-sequence');
    assert.equal(await page.evaluate(()=>window.__lens.hitId),'1_1_29729');
    await activate(page,'סרוק לאורך הציר הנבחר');
    await page.waitForFunction(()=>window.__lens?.lens==='line-context'&&window.__lens?.target?.kind==='source-sequence');
    assert.equal(await page.evaluate(()=>window.__lens.skip),1);
    await activate(page,'מופעים וצבע של ישלחמלאכו');
    const checkbox=page.locator('.els29-native-finding-extra:visible input[type="checkbox"]').first();
    await checkbox.dispatchEvent('click');await page.waitForFunction(()=>window.__state.matrix.sourceMarks.length===0);
    await checkbox.dispatchEvent('click');await page.waitForFunction(()=>window.__state.matrix.sourceMarks.length===9);
    const reverse=await reliabilityCross(page,'ישלח מלאכו','משיח טבת עשירי');
    assert.deepEqual(reverse.search.results.items,first.search.results.items,'input order preserves the exact meeting');
    const names=await reliabilityCross(page,'צוריאל','פולייס');
    assert.equal(names.geometry.cw,40);assert.equal(names.ui.windowSize,'small');
    assert.deepEqual(names.search.results.items.filter(m=>m.sourceSequence).map(m=>m.hitId),['14870_-1_251278','17529_-1_139194']);
    assert.ok(names.search.results.items.some(m=>m.axis==='צוריאל'&&m.hitId==='1418_-1_69122'),'both axis perspectives survive merging');
    assert.ok(!names.search.results.items.some(m=>m.hitId==='23174_-1_216135'),'secondary outside Torah cannot create a meeting');
    assert.equal(names.search.coverage.truncated,true,'bounded coverage is disclosed');
    assert.ok(names.search.coverage.scanned<names.search.coverage.available);
    await activate(page,'מפגש הבא');await page.waitForFunction(()=>window.__state.search.zoneIndex===1);
    assert.equal((await page.evaluate(()=>window.__state)).axis.hitId,'17529_-1_139194');
    await selectAxis(page,'צוריאל');await radius(page,5);
    await page.waitForFunction(()=>window.__state.findings[0].sourceHits[0].withinRadius===false);
    assert.equal(await page.locator('.els29-native-cell.is-source-text').count(),0);
    await radius(page,null);await page.waitForFunction(()=>window.__state.matrix.sourceMarks.length===6);
    const otherOrder=await reliabilityCross(page,'פולייס','צוריאל');
    assert.deepEqual(otherOrder.search.results.items,names.search.results.items);
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'source findings preserve mobile bounds');
  },{realHost:true,loadGolden:false,tier:'anon'});
 });

test('native reliability: cancel aborts verification, rolls back secondary edits and rejects late progress after replacement',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:120000},async()=>{
  await withNative({width:1440,height:1000},async page=>{
    const original=await identity(page);
    await page.evaluate(()=>window.__fixtureHoldVerification=true);
    await page.getByRole('textbox',{name:'מונח',exact:true}).fill('ישראל');await activate(page,'חפש');
    await page.waitForFunction(()=>window.__operation?.kind==='search'&&window.__operation.status==='verifying'&&window.__fixtureReleaseVerification);
    const old=await page.evaluate(()=>window.__operation);
    assert.equal(await button(page,'בטל חיפוש').count(),1);
    assert.match(await page.locator('.els29-native-progress').textContent(),/זמן הסיום עדיין לא ידוע/);
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'pending progress fits mobile');
    await activate(page,'בטל חיפוש');
    await page.waitForFunction(()=>window.__fixtureAborts>=1);
    assert.equal(await page.locator('.els29-native-progress').count(),0);
    assert.deepEqual(await identity(page),original,'cancel retains the last successful matrix');
    await page.evaluate(()=>{window.__fixtureHoldVerification=false;window.__fixtureReleaseVerification?.();});
    await page.getByRole('textbox',{name:'מונח',exact:true}).fill('תורהקדשה');await activate(page,'חפש');
    await page.waitForFunction(()=>window.__state?.term==='תורהקדשה'&&window.__operation.status==='done');
    await injectToolMessage(page,{source:'tzofen',type:'operation',kind:'search',requestId:old.requestId,status:'verifying'});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.equal(await page.locator('.els29-native-progress').count(),0,'late progress cannot reopen loading UI');
    const after=await identity(page), aborts=await page.evaluate(()=>window.__fixtureAborts);
    await page.evaluate(()=>{window.__fixtureHoldVerification=true;window.__fixtureReleaseVerification=null;});
    await openPanel(page);await page.getByRole('textbox',{name:'חיפוש משני במטריצה',exact:true}).fill('התורה');await activate(page,'חפש במטריצה');
    await page.waitForFunction(()=>window.__operation.kind==='findings'&&window.__operation.status==='verifying'&&window.__fixtureReleaseVerification);
    await activate(page,'בטל חיפוש משני');await page.waitForFunction(n=>window.__fixtureAborts>n,aborts);
    await page.waitForFunction(()=>window.__state.findings.length===0);
    assert.equal(await page.locator('.els29-native-progress').count(),0);
    assert.deepEqual(await identity(page),after,'secondary cancel restores the previous findings');
    await page.evaluate(()=>{window.__fixtureHoldVerification=false;window.__fixtureReleaseVerification?.();});
    const frame=page.frames().find(frame=>frame.parentFrame());
    assert.equal(await frame.locator('#searchLoad.show').count(),0,'native searches do not leave the legacy loader open');
  },{realHost:true});
 });

test('native reliability: cancellation terminates discovery and cross workers; partial progress belongs only to its request',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:120000},async()=>{
  await withNative({width:1440,height:1000},async page=>{
    const baseline=await identity(page), frame=page.frames().find(frame=>frame.parentFrame());
    await frame.evaluate(()=>{
      const send=Worker.prototype.postMessage, stop=Worker.prototype.terminate;
      window.__fixtureHoldWorker='routed-discover';window.__fixtureHeldWorkers=0;window.__fixtureStoppedWorkers=0;window.__fixtureCrossChunks=0;
      Worker.prototype.postMessage=function(message,...rest){
        if(message.type===window.__fixtureHoldWorker){
          if(message.type!=='hitchunk'||++window.__fixtureCrossChunks>1){window.__fixtureHeldWorkers++;return;}
        }
        return send.call(this,message,...rest);
      };
      Worker.prototype.terminate=function(){window.__fixtureStoppedWorkers++;return stop.call(this);};
    });
    await page.getByRole('textbox',{name:'מונח',exact:true}).fill('צוריאל');await activate(page,'כל התנ״ך');
    await frame.waitForFunction(()=>window.__fixtureHeldWorkers>0);
    await activate(page,'בטל חיפוש');await frame.waitForFunction(()=>window.__fixtureStoppedWorkers>0);
    await activate(page,'מפת חום');await page.waitForFunction(()=>window.__state.ui.heat===true);
    assert.deepEqual(await identity(page),baseline);
    await frame.evaluate(()=>{window.__fixtureHoldWorker='hitchunk';window.__fixtureHeldWorkers=0;});
    await page.getByRole('textbox',{name:'מונח',exact:true}).fill('צוריאל');await activate(page,'הצלבה בין צירים');
    await page.getByRole('textbox',{name:'מונח שני',exact:true}).fill('פולייס');await activate(page,'מצא מפגש');
    await page.waitForFunction(()=>window.__operation?.progress?.completed===8);
    const progress=await page.evaluate(()=>window.__operation.progress);
    assert.ok(progress.total>progress.completed);assert.equal(progress.phase,'cross');
    assert.equal(await page.getByRole('progressbar',{name:'מיקומי ציר שנבדקו'}).getAttribute('value'),'8');
    const terminated=await frame.evaluate(()=>window.__fixtureStoppedWorkers);
    await activate(page,'בטל חיפוש');await frame.waitForFunction(n=>window.__fixtureStoppedWorkers>n,terminated);
    assert.equal(await page.locator('.els29-native-progress').count(),0);
    assert.deepEqual(await identity(page),baseline,'cancelled scan never commits its pending geometry or results');
    await frame.evaluate(()=>window.__fixtureHoldWorker=null);
    const complete=await reliabilityCross(page,'צוריאל','פולייס');
    assert.equal(complete.search.zones,3,'new workers complete the replacement search');
  },{realHost:true});
 });
