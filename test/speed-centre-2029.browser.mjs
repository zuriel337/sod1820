// The speed centre in /2029/control (ZURIEL 17.11.2026), in a real browser: the real Control Plane page, Frame and CSS with a synthetic
// administrator and stub readers. All external traffic is blocked. It proves the screen's behaviour (states, refresh, account boundary,
// layout on a phone and a desktop); it does not prove a real login or the live database (that is the SQL gate and the hosted check).
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, statSync, readFileSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const out = resolve(process.env.SPEED_CENTRE_BROWSER_OUT || 'docs/reviews/speed-centre-20261117');
await mkdir(out, { recursive: true });

const exportNames = async file => [...(await readFile(file, 'utf8')).matchAll(/^export (?:async )?(?:function|const|let|class)\s+(\w+)/gm)].map(x => x[1]);
const supabaseExports = await exportNames('src/lib/supabase.js');
const authExports = await exportNames('src/lib/auth.js');
const visitsExports = await exportNames('src/lib/visits.js');
const fixtureAuth = `import React,{createContext,useContext,useState,useEffect} from 'react';
const Context=createContext(null); export const useAuth=()=>useContext(Context);
const IDS={admin:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',adminB:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'};
export function AuthFixture({children}) {const [role,setRole]=useState('admin');
 useEffect(()=>{window.fixtureRole=setRole;},[]);
 const id=IDS[role]||null; window.__fixture.userId=id;
 const user=id?{id,user_metadata:{role:'admin'}}:null;
 const value={user,isAdmin:Boolean(id),loading:false,verified:Boolean(id),profile:user?{id,role:'admin',display_name:'חשבון בדיקה'}:null};
 return React.createElement(Context.Provider,{value},children); }`;
const stubSupabase = `
const f=()=>window.__fixture;
const denied=name=>(...args)=>{f().unexpected.push(name);throw new Error('Unexpected isolated IO: '+name);};
export const SUPABASE_URL='https://fixture.invalid',SUPABASE_ANON='fixture-anon';
export const supabase={rpc:async(name)=>{f().reads.push(name);return {data:null,error:{message:'denied '+name}};},
 auth:{getSession:async()=>({data:{session:f().userId?{user:{id:f().userId}}:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
 from:table=>{f().unexpected.push('from:'+table);throw new Error('Unexpected table '+table);},functions:{invoke:denied('model')}};
export const getSiteFlags=async()=>({});
${supabaseExports.filter(n => !['SUPABASE_URL','SUPABASE_ANON','supabase','getSiteFlags'].includes(n)).map(n=>`export const ${n}=denied(${JSON.stringify(n)});`).join('\n')}
`;
const stubAuth = `const denied=name=>(...args)=>{window.__fixture.unexpected.push(name);throw new Error('Unexpected isolated IO '+name);};
export const getCloudResearch=async()=>({cart:[],saved:[],pinned:[],history:[],collections:[],journeys:[],context:null,revision:0});
export const applyCloudResearchOps=denied('research-write');
${authExports.filter(n=>!['getCloudResearch','applyCloudResearchOps'].includes(n)).map(n=>`export const ${n}=denied(${JSON.stringify(n)});`).join('\n')}`;
const stubVisits = `const f=()=>window.__fixture;
export const getSystemHealth=async()=>{f().reads.push('health');return {generated_at:new Date().toISOString(),usage:{},db:{},cron:[],security:{},media:{}};};
export const getVideoMapHealth=async()=>({generated_at:new Date().toISOString()});
export const getOperationalTraceList=async()=>[];export const getOperationalTrace=async()=>({rollup:{},spans:[]});
export const getGaInsights=()=>new Promise(()=>{});export const getVercelInsights=()=>new Promise(()=>{});export const getSearchConsole=()=>new Promise(()=>{});
${visitsExports.filter(n=>!['getSystemHealth','getVideoMapHealth','getOperationalTraceList','getOperationalTrace','getGaInsights','getVercelInsights','getSearchConsole'].includes(n)).map(n=>`export const ${n}=()=>{f().unexpected.push(${JSON.stringify(n)});return Promise.reject(new Error('isolated'));};`).join('\n')}`;
const stubAnalytics = `export const AUDIENCE_KIND_2029={};
export async function get2029Analytics({hours,signal,expectedUserId}={}){const f=window.__fixture;f.rum.push({hours,expectedUserId,at:Date.now()});
 if(expectedUserId!==f.userId) throw new DOMException('Account changed','AbortError');
 const answer=f.answer(hours,f.rum.length);
 if(answer==='pending') return new Promise(()=>{});
 await new Promise(r=>setTimeout(r,f.delay||150)); if(signal?.aborted) throw new DOMException('Aborted','AbortError');
 if(answer instanceof Error||answer==='fail') throw new Error('source unavailable'); return answer; }`;
const { outputFiles } = await build({ entryPoints: ['docs/reviews/speed-centre-20261117/browser-fixture.jsx'],
  bundle: true, write: false, outfile: '/tmp/speed-centre-fixture.js', format: 'esm', platform: 'browser',
  define: { 'process.env.NODE_ENV': '"production"', '__SOD_2029_BUILD__': 'true', 'import.meta.env': '{"DEV":false,"VITE_PUBLIC_READING_RELEASE":"public-reading-20261101","VITE_INTEGRATED_PREVIEW":"false"}' },
  loader: { '.woff2': 'dataurl', '.png': 'dataurl', '.jpg': 'dataurl', '.svg': 'dataurl' },
  plugins: [{ name: 'isolated-identity-and-readers', setup(b) {
    b.onResolve({ filter: /(?:^fixture-auth$|AuthContext\.jsx$|\/supabase\.js$|\/auth\.js$|\/visits\.js$|\/analytics2029\.js$)/ }, args => ({ path: /AuthContext\.jsx$|^fixture-auth$/.test(args.path) ? 'fixture-auth' : args.path.split('/').at(-1), namespace: 'fixture' }));
    b.onResolve({ filter: /^\// }, args => args.kind === 'url-token' ? { path: args.path, external: true } : null);
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ resolveDir: process.cwd(), loader: 'jsx', contents: args.path === 'fixture-auth' ? fixtureAuth
      : args.path === 'supabase.js' ? stubSupabase : args.path === 'auth.js' ? stubAuth : args.path === 'visits.js' ? stubVisits : stubAnalytics }));
  } }],
});
const js = outputFiles.find(f => f.path.endsWith('.js')).contents, css = outputFiles.find(f => f.path.endsWith('.css'))?.contents || '';
const html = '<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><style>html,body{margin:0}</style></head><body><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>';
const publicRoot = resolve('public');
const types = { '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png' };
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://fixture.invalid').pathname;
  if (path === '/fixture.js') { res.writeHead(200, { 'content-type': 'application/javascript' }).end(js); return; }
  if (path === '/fixture.css') { res.writeHead(200, { 'content-type': 'text/css' }).end(css); return; }
  const asset = resolve(publicRoot, '.' + path);
  if (asset.startsWith(publicRoot + sep) && existsSync(asset) && statSync(asset).isFile()) { res.writeHead(200, { 'content-type': types[extname(asset)] || 'application/octet-stream' }).end(readFileSync(asset)); return; }
  if (extname(path)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {});
const results = [], errors = [];
// One live-shaped answer (17.11.2026 numbers, rounded), with the speed watch and one open finding.
const answerSource = `(hours,n)=>{const ago=ms=>new Date(Date.now()-ms).toISOString();const s=window.__scenario;
 if(s==='fail')return 'fail'; if(s==='refresh-fails'&&n>1)return 'fail'; if(s==='refresh-pending'&&n>1)return 'pending';
 if(s==='missing')return {meta:{hours,from:ago(hours*36e5),to:ago(0)},web_vitals:{samples:0,p75:{},thresholds:{},latest_sample_at:null,watch:null,watch_open:[]}};
 return {meta:{hours,from:ago(hours*36e5),to:ago(0)},identified_traffic:{summary:{views:1}},web_vitals:{samples:316,first_sample_at:ago(864e5),latest_sample_at:ago(120e3),
  p75:{lcp_ms:3919,inp_ms:252,cls:0.1358,fcp_ms:2420,ttfb_ms:1225},sample_counts:{lcp:283,inp:122,cls:316,fcp:307,ttfb:316},good_rate_pct:{lcp:56.2,inp:63.9,cls:78.2,fcp:59.6,ttfb:43.7},
  thresholds:{cls_good_max:0.1,cls_poor_above:0.25,lcp_good_max_ms:2500,lcp_poor_above_ms:4000,inp_good_max_ms:200,inp_poor_above_ms:500,fcp_good_max_ms:1800,fcp_poor_above_ms:3000,ttfb_good_max_ms:800,ttfb_poor_above_ms:1800},
  context_coverage:{build:159,device_class:159,article_first:159,nav_timing:159},
  by_surface:[{surface:'community',samples:168,lcp_p75_ms:3919,cls_p75:0.1358,lcp_good_pct:50,cls_good_pct:70,first_at:ago(8e7),latest_at:ago(2e5)},{surface:'home',samples:63,lcp_p75_ms:3937,cls_p75:0.0351,first_at:ago(8e7),latest_at:ago(3e5)}],
  by_device:[{device:'mobile',samples:105},{device:'desktop',samples:54},{device:'unknown',samples:157}],
  by_build:[{build:'2029-CNp2F-eD',samples:24,mobile_samples:20,desktop_samples:4},{build:'2029-DvYRh6FW',samples:135},{build:'unknown',samples:157}],by_article_first:[{article_first:'adopted',samples:40}],
  nav_timing_p75:{samples:159,redirect_ms:1013,worker_ms:108,dns_ms:0,connect_ms:0,wait_ms:1225,download_ms:36,wait_p50_ms:521},
  routes_by_samples:[{path:'/community/chat',samples:150,lcp_p75_ms:3900,cls_p75:0.14,ttfb_p75_ms:1300}],
  watch:{status:'regression',computed_at:ago(6e5),groups:[{group:'community',window:'current',samples:168,cls_p75:0.1358},{group:'community',window:'baseline',samples:400,cls_p75:0.062}]},
  watch_open:[{id:97,detector:'web_vitals_regression',title:'האטה בקהילה: CLS p75 0.1358 (לפני: 0.0620)',reason:'ב־24 השעות האחרונות CLS p75 בקהילה הוא 0.1358 לעומת 0.0620.'}]}};}`;
try {
  for (const [label, contextOptions] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['mobile', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }]]) {
    for (const scenario of ['data', 'fail', 'missing', 'refresh-fails', 'refresh-pending', 'account']) {
      const context = await browser.newContext({ ...contextOptions, reducedMotion: 'reduce', serviceWorkers: 'block', locale: 'he-IL', timezoneId: 'Asia/Jerusalem' });
      const blocked = [];
      await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : (blocked.push(route.request().url()), route.abort()));
      await context.addInitScript(([s, src]) => { window.__scenario = s; window.__fixture = { reads: [], unexpected: [], rum: [], userId: null, answer: eval(src) }; }, [scenario, answerSource]);
      const page = await context.newPage();
      page.on('pageerror', error => errors.push({ label, scenario, message: error.message }));
      await page.goto(origin + '/2029/control');
      await page.locator('[data-experience-capability="speed-centre"]').waitFor({ timeout: 20000 });
      await page.waitForFunction(() => !document.querySelector('[data-speed-read-times]')?.textContent.includes('קורא את המקור'), null, { timeout: 15000 });
      const state = () => page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - window.innerWidth,
        attention: [...document.querySelectorAll('[data-speed-attention-item]')].map(n => n.getAttribute('data-speed-attention-item')),
        status: document.querySelector('[data-speed-read-times]')?.textContent || '', rum: window.__fixture.rum.map(r => ({ hours: r.hours, user: r.expectedUserId })),
        metrics: [...document.querySelectorAll('[data-speed-metric]')].map(n => `${n.getAttribute('data-speed-metric')}:${n.getAttribute('data-rating')}`),
        text: document.querySelector('[data-experience-capability="speed-centre"]')?.textContent || '',
        // The field measurement only (not the fix history, whose lab notes may legitimately say "0 ms").
        measured: ['[data-speed-read-times]', '[data-speed-attention]', '[data-speed-metrics]', '[data-speed-breakdowns]', '[data-speed-watch]']
          .map(q => document.querySelector(q)?.textContent || '').join(' '), unexpected: window.__fixture.unexpected }));
      let s = await state();
      assert.ok(s.overflow <= 0, `${label}/${scenario}: no horizontal page scroll (${s.overflow}px)`);
      assert.deepEqual(s.unexpected, [], `${label}/${scenario}: no unexpected reader`);
      assert.equal(s.rum.length, 1, `${label}/${scenario}: the speed reader starts once, by itself`);
      assert.ok(s.rum.every(r => r.hours === 24 && r.user === 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'));
      if (scenario === 'data' || scenario.startsWith('refresh') || scenario === 'account') {
        assert.ok(s.status.includes('המקור נקרא') && s.status.includes('המדידה האחרונה בתוכו'), `${label}/${scenario}: read time and measurement time, separately`);
        assert.deepEqual(s.metrics, ['lcp:needs', 'inp:needs', 'cls:needs', 'fcp:needs', 'ttfb:needs']);
        assert.ok(s.attention.includes('finding-97'), 'the open watch finding is attention');
        assert.ok(s.text.includes('2011226fe'), 'a verified build is named by its commit');
      }
      if (scenario === 'data') {
        await page.screenshot({ path: `${out}/speed-centre-${label}.png`, fullPage: false });
        await page.locator('[data-speed-breakdowns] summary').click();
        await page.locator('[data-speed-watch] summary').click();
        await page.screenshot({ path: `${out}/speed-centre-${label}-details.png`, fullPage: true });
        s = await state(); assert.ok(s.overflow <= 0, `${label}: details open, still no horizontal scroll`);
      }
      if (scenario === 'fail') { assert.ok(s.attention.includes('source') && s.text.includes('קריאת המקור נכשלה')); assert.ok(!/\b0 ms\b/.test(s.measured), 'no zero shown for a failure'); }
      if (scenario === 'missing') { assert.ok(s.attention.includes('no-samples') && s.attention.includes('watch-missing')); }
      if (scenario === 'refresh-fails' || scenario === 'refresh-pending') {
        await page.locator('[data-control-refresh]').click();   // the page's own "רענן"
        await page.waitForFunction(() => window.__fixture.rum.length === 2, null, { timeout: 5000 });
        if (scenario === 'refresh-fails') await page.waitForFunction(() => document.querySelector('[data-speed-read-times]')?.textContent.includes('נכשלה'), null, { timeout: 5000 });
        s = await state();
        assert.equal(s.rum.length, 2, 'the page refresh really re-read the speed source');
        assert.ok(s.status.includes('(קריאה קודמת)'), 'the previous reading stays, named as previous');
        if (scenario === 'refresh-fails') { assert.ok(s.attention.includes('source')); await page.screenshot({ path: `${out}/speed-centre-${label}-refresh-failed.png` }); }
        else assert.ok(s.status.includes('קורא את המקור'), 'a live counter while the source is read (Operation Visibility Law)');
      }
      if (scenario === 'account') {
        await page.evaluate(() => window.fixtureRole('adminB'));
        await page.waitForFunction(() => window.__fixture.rum.length >= 2 && window.__fixture.rum.at(-1).expectedUserId === 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', null, { timeout: 5000 });
        await page.waitForFunction(() => document.querySelector('[data-speed-read-times]')?.textContent.includes('המקור נקרא'), null, { timeout: 5000 });
        s = await state(); assert.ok(s.rum.slice(1).every(r => r.user === 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 'the new account reads with its own identity');
        await page.evaluate(() => window.fixtureRole('public'));
        await page.locator('[data-fixture-away]').waitFor({ timeout: 5000 });
        assert.equal(await page.locator('[data-experience-capability="speed-centre"]').count(), 0, 'a signed-out viewer sees no measurement');
      }
      results.push({ label, scenario, attention: s.attention, reads: s.rum.length, blocked: blocked.length });
      await context.close();
    }
  }
} finally { await browser.close(); server.close(); }
assert.deepEqual(errors, [], 'no page error');
await writeFile(`${out}/browser-acceptance.json`, JSON.stringify({ when: new Date().toISOString(), results }, null, 2) + '\n');
console.log(`speed centre browser: PASS (${results.length} cases)`);
