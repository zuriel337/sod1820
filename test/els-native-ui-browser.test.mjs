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
   if(message.type==='ready'){ready.current=true;send({type:'tier',tier:'admin'});send({type:'load-matrix',item:${JSON.stringify(golden)}});}
   if(message.type==='engine-request'){
    const result=await fetch('/oracle',{method:'POST',body:JSON.stringify({op:message.op,payload:message.payload})}).then(response=>response.json());
    send({type:'engine-result',requestId:message.requestId,...result});
   }
   if(message.type==='state'){window.__state=message;latest.current.onState?.(message);}
   if(message.type==='lens'){window.__lens=message;latest.current.onLens?.(message);}
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
import {resolve2029Palette} from '/src/lib/palette.js';import '/src/components/experience2029/sod2029.css';
window.__log=[];window.__hostLog=[];
const palette=resolve2029Palette('dark','research_lab');
const fields={page:'pageBg',panel:'card','panel-soft':'cardSoft',line:'border','line-strong':'borderStrong',accent:'accent','accent-text':'accentText','accent-secondary':'accentSecondary',ink:'ink',muted:'inkSoft','focus-ring':'focusRing','on-accent':'onAccent','accent-btn':'accentBtn','warm-accent':'warmAccent'};
const style={fontFamily:'Arial',color:palette.ink,background:palette.pageBg,minHeight:'100vh',padding:12};
for(const [key,value] of Object.entries(fields))style['--s29-'+key]=palette[value];
for(const [key,value] of Object.entries({micro:14,small:15,body:16,lead:20,title:24}))style['--s29-type-'+key]=value+'px';
style['--s29-font-display']='Arial';
createRoot(document.getElementById('root')).render(React.createElement('div',{style},
 React.createElement('main',{className:'sod29-content wide'},
  React.createElement('section',{className:'sod29-focus-stage','data-els-2029-surface':'v1'},
   React.createElement('section',{className:'sod29-section','data-els-classic-2029':'native-v1'},React.createElement(Native))))));
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

async function withNative(viewport, run) {
  const fixture = {
    name: 'els-native-browser-fixture', enforce: 'pre',
    resolveId(id, importer) {
      if (id === 'els-native-fixture') return '\0els-native-fixture';
      if (id === '../TzofenEmbed.jsx' && importer?.endsWith('/ElsNativeClassic2029.jsx')) return '\0els-native-host';
    },
    load(id) {
      if (id === '\0els-native-fixture') return entry;
      if (id === '\0els-native-host') return host;
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
    await page.addInitScript(() => localStorage.setItem('tzofen_onboarded_v1', '1'));
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/fixture`);
    await page.waitForFunction((id) => window.__state?.provenance?.editId === id, golden.id, { timeout: 60000 });
    await page.waitForFunction(() => document.querySelector('.els29-native-cell.is-axis'));
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
    });
  });
