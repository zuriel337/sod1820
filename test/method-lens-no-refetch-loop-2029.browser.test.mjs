import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium';

// Regression: MethodLens2029 re-ran its whole read (1 fn_number_lookup + up to 28 fn_relation_candidate) on EVERY parent render,
// because the effect depended on the `selection` object and the `onProjection` callback, which CalculatorPro2029Page rebuilds
// on each render; with onProjection setting parent state this was an endless loop (measured: ~1,400 relation RPCs in 3.5 s).
// The fixture is the Pro page's exact shape: selection is a NEW object each render, onProjection sets parent state to a NEW
// object. A negative control mounts the pre-fix effect shape in the same harness and must loop, so the test is proven sensitive.
const fixture = `import React,{useEffect,useState}from'react';import{createRoot}from'react-dom/client';
  import MethodLens2029 from'/src/components/gematria2029/MethodLens2029.jsx';
  import{fetchMethodLensProjection}from'/src/lib/research/methodLensProjection.js';
  const mk=()=>Object.freeze({kind:'gematria_calculation',expression:'ברכה',methodKey:'רגיל',methodLabel:'רגיל',resultValue:227});
  function Parent(){
    const[n,setN]=useState(0);const[discovery,setDiscovery]=useState(null);
    const selection=mk();                                   // new object on every render, as in CalculatorPro2029Page
    window.__renders=(window.__renders||0)+1;
    return React.createElement('div',null,
      React.createElement('button',{id:'rerender',onClick:()=>setN(x=>x+1)},'rerender '+n),
      React.createElement('output',{id:'discovery'},discovery?discovery.phrase:''),
      React.createElement(MethodLens2029,{selection,compact:true,onProjection:data=>{const hit=(data.items||[]).find(i=>!i.current);setDiscovery(hit?{phrase:hit.phrase,value:hit.value}:null);}}));
  }
  // Negative control: the effect exactly as it was before the fix (object + callback identity as dependencies).
  function LegacyLens({selection,onProjection}){
    const[started,setStarted]=useState(false);
    useEffect(()=>{if(!selection||!started)return undefined;let alive=true;
      fetchMethodLensProjection({expression:selection.expression,methodKey:selection.methodKey,value:selection.resultValue}).then(d=>{if(alive)onProjection?.(d);});
      return()=>{alive=false;};},[selection,started,onProjection]);
    return React.createElement('button',{id:'legacy-open',onClick:()=>setStarted(true)},'legacy open');
  }
  function LegacyParent(){const[d,setD]=useState(null);const selection=mk();
    return React.createElement('div',null,React.createElement(LegacyLens,{selection,onProjection:data=>{const hit=(data.items||[]).find(i=>!i.current);setD(hit?{phrase:hit.phrase}:null);}}));}
  createRoot(document.getElementById('root')).render(React.createElement(location.search.includes('legacy')?LegacyParent:Parent));`;

const PHRASES = Array.from({ length: 30 }, (_, i) => 'מילה' + 'אבגדהוזחטיכלמנסעפצקרשת'[i % 22] + (i >= 22 ? 'א' : ''));
const lookupRows = PHRASES.map((phrase, i) => ({ phrase, method: 'רגיל', value: 227, is_verified: true, method_governed: true, method_active: true, lead_rank: i + 1 }));
const relation = { engine_signal_components: { raw_independent_group_count: 3, effective_independent_group_count: 2, dependent_expression_group_count: 0, min_rarity: 0.4 }, expression_dependency: {}, engine_evidence: [{ method: 'רגיל', value: 227, group_repr: 'g', normalized_rarity: 0.4 }], noise_flags: [] };

test('opening the method lens reads once; parent re-renders and the lens\'s own parent-state update never re-read it', async () => {
  const server = await createServer({ configFile: false, root: process.cwd(), server: { host: '127.0.0.1', port: 0, watch: { ignored: ['**/preview-deploy/**', '**/dist/**', '**/public-reading-deploy/**'] } }, plugins: [react(), {
    name: 'lens-fixture', configureServer(s) { s.middlewares.use(async (req, res, next) => {
      if (req.url?.split('?')[0] !== '/lens-fixture/') return next();
      res.setHeader('Content-Type', 'text/html');
      res.end(await s.transformIndexHtml(req.url, '<html dir="rtl"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/lens-fixture.jsx"></script></html>'));
    }); },
    resolveId(id) { if (id === '/lens-fixture.jsx') return '\0lens-fixture.jsx'; },
    load(id) { if (id === '\0lens-fixture.jsx') return fixture; },
  }] });
  await server.listen();
  const browser = await chromium.launch({ executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const run = async (query, drive) => {
    const page = await browser.newPage({ viewport: { width: 390, height: 800 } });
    const seen = { lookup: 0, relation: 0, other: [] };
    await page.route(/supabase\.co/, (route) => {
      const url = route.request().url();
      const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
      if (/rpc\/fn_number_lookup/.test(url)) { seen.lookup += 1; return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(lookupRows) }); }
      if (/rpc\/fn_relation_candidate/.test(url)) { seen.relation += 1; return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(relation) }); }
      seen.other.push(url); return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: '[]' });
    });
    const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${origin}/lens-fixture/${query}`);
    await drive(page, seen);
    await page.close();
    assert.deepEqual(errors, []);
    return seen;
  };
  try {
    // Fixed component: one lookup + (30 matches - the current phrase, capped at 28) relation reads, then silence, whatever the parent does.
    const fixed = await run('', async (page, seen) => {
      await page.getByRole('button', { name: 'פתח את השיטה' }).click();
      await page.waitForFunction(() => document.querySelector('[data-method-lens="evidence"] .sod29-method-lens-list') !== null);
      await page.waitForTimeout(800);
      const afterOpen = { lookup: seen.lookup, relation: seen.relation };
      assert.equal(afterOpen.lookup, 1, 'one fn_number_lookup for one open');
      assert.ok(afterOpen.relation >= 25, `the enrichment ran (got ${afterOpen.relation})`);
      assert.ok(afterOpen.relation > 0 && afterOpen.relation <= 28, `relation reads bounded by the enrich limit (got ${afterOpen.relation})`);
      assert.notEqual(await page.locator('#discovery').innerText(), '', 'onProjection still delivered the projection to the parent');
      const rendersAfterOpen = await page.evaluate(() => window.__renders);
      for (let i = 0; i < 6; i += 1) await page.locator('#rerender').click();
      await page.waitForTimeout(1200);
      assert.ok((await page.evaluate(() => window.__renders)) >= rendersAfterOpen + 6, 'the parent really re-rendered');
      assert.equal(seen.lookup, afterOpen.lookup, 'no lookup after parent re-renders');
      assert.equal(seen.relation, afterOpen.relation, 'no relation read after parent re-renders');
    });
    assert.ok(fixed.lookup === 1);
    // Negative control: the pre-fix effect shape loops in the identical harness.
    const legacy = await run('?legacy=1', async (page, seen) => {
      await page.locator('#legacy-open').click();
      await page.waitForFunction(() => true);
      await page.waitForTimeout(2500);
    });
    // (fn_number_lookup repeats are absorbed by the read memo, fn_relation_candidate is deliberately not listed there, so the loop shows in the relation reads.)
    assert.ok(legacy.relation >= 56, `negative control must loop: at least two full enrichments (got ${legacy.relation} relation reads in 2.5 s)`);
  } finally { await browser.close(); await server.close(); }
});
