// CLAUDE_PERF_HOME_STABILITY_V3_20261016 — Home readiness + return-stability runner v4 (evidence tool; READ_ONLY on product code).
// Derived from runner v3 (e23dee27) and docs/perf-evidence-20261015/home-stability-v2/runner.mjs @ 1270d1fa (never part of the base).
//
// INPUT AND ISOLATION — the shared mechanism only (no replay or isolation mechanism of its own):
//   * must run under scripts/ci-isolation/run.mjs (native connect guard + audit), e.g.
//       SOD_CI_SNAPSHOT_SHA256=<sha256 of the snapshot> node scripts/ci-isolation/run.mjs -- node runner.mjs --fx <snapshot.json.gz> --arms A=distA,B=distB --pairs 7 --out out.json
//   * the corpus is read with policy.cjs frozenSnapshot (exact SHA256, canonical Base64 bodies via snapshot-contract decodeSnapshot) — never the old UTF-8-string
//     corpus — and admitted only if every image response decodes (fixtures.mjs). There is no default corpus. A decoded body is sent byte for byte.
//   * every request goes through policy.cjs requestPolicy: local origin = served from dist; known telemetry effects = 204; a mapped read = its frozen row (after a Node-timer
//     delay, never waiting on the renderer); anything else (unmapped read, write, external host) is a violation: the request is aborted, the sample is invalid, and the
//     shared audit fails the run. There is no empty-body or synthesized fallback. Serving, browser flags, the guest identity and the beacon/WebSocket boundary are the shared ones.
//   * unmapped identifiers go to a PRIVATE file (--private, default in the OS temp dir, mode 0600); the evidence carries only a count, a digest and request shapes.
//
// MEASUREMENT
//   * "composed" = the DOM holds real content; "usable" = a person can see and use it now (opacity, viewport, hit-test; on a return: the departure control itself). See readiness.mjs.
//   * cls = standard session-window maximum inside the observed window (gaps < 1000 ms, span < 5000 ms); v2's sum is kept as actionWindowShiftSum.
//   * a response the page cannot decode as an image (naturalWidth 0) invalidates the sample.
//   * scenarios: --late MS (reads after Back answer late), --gateDelay MS, --gate closed (from the Back phase only), --resize W (viewport width change 800 ms after Back),
//     --interruptAt MS (a swipe MS after Back; the sample proves early-input cancellation only if the touch reached the page before the restore jump), --mode load (cold load),
//     --state normal|empty|error|outage (outage = every REST read except the flags fails; --stateFrom back: only the return's reads), --post auto|/post/slug (departure; auto = first visible Home post control whose complete body is in the corpus).
//   * --profile mobile|desktop (default mobile, the profile every earlier result was taken with): mobile = touch (isMobile, hasTouch, CDP touch swipes, DPR 2); desktop = a person with a mouse and a keyboard
//     (isMobile=false, hasTouch=false, DPR 1 unless --dpr, mouse wheel and a mouse click, no touch event at all). --input wheel|key (desktop only; default wheel) picks what interrupts the restore in --interruptAt.
//   * SIGNATURES — every result file says what produced it: --armShas A=<commit>,B=<commit> (or SOD_ARM_SHAS; an arm without one is recorded as null, never guessed), the build-artifact signature of each dist
//     (sha256 over the sorted "relative path, file sha256" lines), the input signature (fixture sha256 + the corpus the runner admitted), the runner / readiness file hashes, the repository HEAD and whether the tree was dirty, and the environment.
// usage: see above; further: --width 390 --height 844 --theme dark|light|parchment --reduced 1 --horizon MS --headers 1 --traceDir DIR --private FILE
// Method (kept from v2): route handlers never await the renderer; controller wall stamps around real commands; observers installed before any navigation;
// no scrollIntoView; fixed wall horizon after Back.
import { createRequire } from 'node:module'; import fs from 'node:fs'; import os from 'node:os'; import zlib from 'node:zlib'; import crypto from 'node:crypto'; import path from 'node:path';
import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
import { serve } from '../../../scripts/perf-execution-2029/serve.mjs';
import { READINESS_SRC, READINESS_VERSION } from './readiness.mjs';
import { admitCorpus, missDigest, requestShape } from './fixtures.mjs';
const sharedRequire = createRequire(import.meta.url);
const { requireIsolation, frozenSnapshot, requestPolicy, fixtureKey, browserArgs, installTransportBoundary } = sharedRequire('../../../scripts/ci-isolation/policy.cjs');
requireIsolation();
const require = createRequire((process.env.PLAYWRIGHT_DIR || '/opt/node-tools') + '/node_modules/'); const { chromium } = require('playwright');
const argv = process.argv.slice(2);
const A = Object.fromEntries(argv.reduce((a, v, i, arr) => v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1]]] : a, []));
const PAIRS = +(A.pairs || 1), THEME = A.theme || 'dark', DELAY = 150, LATE = A.late ? +A.late : null, HORIZON_MS = A.horizon ? +A.horizon : (LATE && LATE >= 3200 ? 9000 : 7000);
const TRACE_DIR = A.traceDir || null;
const MODE = A.mode || 'back', GATE_DELAY = +(A.gateDelay || 0), GATE_CLOSED = A.gate === 'closed', RESIZE_TO = A.resize ? +A.resize : null;
const W = +(A.width || 390), H = +(A.height || 844), STATE = A.state || 'normal', REDUCED = A.reduced === '1';
const STATE_FROM_BACK = A.stateFrom === 'back';
const SHOTS = A.shots || null;   // --shots <dir>: a screenshot of the first viewport at the end of each sample (for looking at, not committed)
const CAPSULE = A.capsule === '1';   // --capsule 1 (desktop profile): after the return has settled, open the companion capsule the way a person does (hover), read the rail and the content width, leave it
const RECOVER = A.recover === '1';   // --recover 1 (with --stateFrom back and --forward 1): the reads of the SECOND return are healthy again (a failure that was over by the next entry)
const FORWARD = A.forward === '1', DELIBERATE = A.deliberate === '1';   // --forward 1: Forward to the Post, then Back again; --deliberate 1: a deliberate scroll down and up once the return has settled
const INTERRUPT_AT = A.interruptAt != null ? +A.interruptAt : (A.interrupt === '1' ? 900 : null);
const PROFILE = A.profile || 'mobile', DESKTOP = PROFILE === 'desktop', DPR = A.dpr ? +A.dpr : (DESKTOP ? 1 : 2);
const INPUT_KIND = A.input || (DESKTOP ? 'wheel' : 'touch');   // what the person does to interrupt a restore (--interruptAt)
if (!['mobile', 'desktop'].includes(PROFILE)) { console.error('--profile mobile|desktop'); process.exit(2); }
if (!(DESKTOP ? ['wheel', 'key'] : ['touch']).includes(INPUT_KIND)) { console.error(`--input ${DESKTOP ? 'wheel|key' : 'touch'} for the ${PROFILE} profile`); process.exit(2); }
if (!['normal', 'empty', 'error', 'outage'].includes(STATE)) { console.error('--state normal|empty|error|outage'); process.exit(2); }
if (!A.fx) { console.error('--fx <snapshot.json.gz> required (an exact, decodable corpus; there is no default)'); process.exit(2); }
const FX = path.resolve(A.fx);
const FX_SHA = process.env.SOD_CI_SNAPSHOT_SHA256 || A.fxSha256 || '';
let fixtures, corpusImages;
try { fixtures = frozenSnapshot(FX, FX_SHA); corpusImages = admitCorpus(fixtures); }
catch (error) { console.error(`BLOCKED: ${String(error.message).split('\n')[0]}`); process.exit(3); }
// complete post bodies in the corpus: the only posts a departure may use
const COMPLETE_POSTS = new Set(Object.entries(fixtures).flatMap(([key, row]) => {
  const slug = /\/rest\/v1\/posts\?select=\*&slug=in\.\(([^)&]+)\)/.exec(key)?.[1]; if (!slug || ![200, 206].includes(row.status)) return [];
  try { const post = JSON.parse(Buffer.from(row.body, 'base64'))?.[0]; return post && String(post.content || '').replace(/<[^>]*>/g, ' ').length >= 800 ? [decodeURIComponent(slug)] : []; } catch { return []; }
}));
const POST_ARG = A.post || null;   // 'auto' (default for a return) or an exact /post/slug
if (MODE === 'back') {
  const need = POST_ARG && POST_ARG !== 'auto' ? [decodeURIComponent(POST_ARG.replace(/^\/post\//, ''))] : [];
  if (!COMPLETE_POSTS.size || need.some(slug => !COMPLETE_POSTS.has(slug))) { console.error(`BLOCKED: the corpus has no complete body for the departure post (${COMPLETE_POSTS.size} complete post bodies present${need.length ? `; required: ${need.length}, missing: ${need.filter(s => !COMPLETE_POSTS.has(s)).length}` : ''})`); process.exit(3); }
}
const SBHOST = 'linswmnnkjxvweumprav.supabase.co';
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': 'content-range' };
const shortShape = (key) => requestShape(key).replace(/^(GET|HEAD|POST|OPTIONS) [^/]+\/(?:rest\/v1\/)?/, '$1 ').slice(0, 96);
const arms = Object.fromEntries((A.arms || '').split(',').filter(Boolean).map(s => s.split('=')));
const armNames = Object.keys(arms); if (!armNames.length) { console.error('--arms A=dist,B=dist required'); process.exit(2); }
// ---- signatures: what produced this result. Nothing is filled in afterwards: a value that is not known stays null. ------------------------------------------
const HERE_FILE = fileURLToPath(import.meta.url), HERE_DIR = path.dirname(HERE_FILE);
const sha256File = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function treeSignature(dir) {
  const files = []; const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else if (e.isFile()) files.push(f); } }; walk(dir);
  const lines = files.map((f) => `${path.relative(dir, f).split(path.sep).join('/')}\t${sha256File(f)}`).sort();
  return { signature: crypto.createHash('sha256').update(lines.join('\n') + '\n').digest('hex'), files: lines.length, bytes: files.reduce((n, f) => n + fs.statSync(f).size, 0) };
}
const ARM_SHAS = Object.fromEntries(String(A.armShas || process.env.SOD_ARM_SHAS || '').split(',').filter(Boolean).map((x) => x.split('=')));
if (Object.entries(ARM_SHAS).some(([k, v]) => !arms[k] || !/^[0-9a-f]{40}$/.test(v || ''))) { console.error('--armShas A=<40-hex commit>,B=<40-hex commit> (an arm of --arms; an unknown commit is simply left out)'); process.exit(2); }
const CORPUS_CLASS = A.corpus || null;   // 'synthetic' | 'central' | ...: said by the caller, never guessed
const buildAtStart = Object.fromEntries(armNames.map((n) => [n, treeSignature(path.resolve(arms[n]))]));
const git = (args) => { try { return execFileSync('git', args, { cwd: HERE_DIR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; } };
const servers = {}; for (const n of armNames) { const s = await serve(path.resolve(arms[n])); servers[n] = { ...s, origin: `http://127.0.0.1:${s.port}` }; }
const browser = await chromium.launch({ executablePath: process.env.PERF_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: browserArgs });
const med = a => { const s = a.filter(x => x != null && !Number.isNaN(x)).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const privateMisses = [];

// ---- in-page instrumentation (installed before any navigation) -------------------------------------------------------
const INIT = `(()=>{const m=window.__r={cs:[],mut:[],geo:[],lt:[],ev:[],touch:[],kinds:[],jumps:[],sc:[],paint:[],ord:[],poll:true,t0:performance.timeOrigin};
const lg=(k)=>{if(m.ord.length<3000)m.ord.push([Math.round(performance.now()*10)/10+performance.timeOrigin,k,Math.round(scrollY),document.documentElement?document.documentElement.scrollHeight:0])};
const D=n=>{if(!n||!n.tagName)return String(n&&n.nodeName);let s=n.tagName.toLowerCase();if(typeof n.className==='string'&&n.className)s+='.'+n.className.trim().split(/\\s+/).slice(0,2).join('.');const l=n.getAttribute&&n.getAttribute('aria-label');if(l)s+='['+l.slice(0,14)+']';return s};
const ep=t=>Math.round((performance.timeOrigin+t)*10)/10;
new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)m.cs.push({t:ep(e.startTime),v:e.value,src:(e.sources||[]).slice(0,5).map(s=>({n:D(s.node),py:Math.round(s.previousRect.y),cy:Math.round(s.currentRect.y),ph:Math.round(s.previousRect.height),ch:Math.round(s.currentRect.height)}))})}).observe({type:'layout-shift',buffered:true});
try{new PerformanceObserver(l=>{for(const e of l.getEntries())m.lt.push({t:ep(e.startTime),d:Math.round(e.duration)})}).observe({type:'longtask',buffered:true})}catch(_){}
try{new PerformanceObserver(l=>{for(const e of l.getEntries())m.ev.push({n:e.name,t:ep(e.startTime),dur:Math.round(e.duration),inDelay:Math.round(e.processingStart-e.startTime)})}).observe({type:'event',buffered:true,durationThreshold:16})}catch(_){}
const SEL='.h29-sec,.dg29,.h29-notable,.h29-updates > *,.dg29-source,.dg29-empty,.dg29-gateway,.dg29-dimension,.h29-skel,.h29-hero,.h29-card,.sod29-watch-icon-wrap,.h29-notable-card';
const mo=new MutationObserver(l=>{const t=ep(performance.now());for(const r of l){if(m.mut.length>1500)return;if(r.type==='childList'){for(const n of [...r.addedNodes,...r.removedNodes]){if(n.nodeType===1&&(n.matches&&(n.matches(SEL)||n.querySelector&&n.querySelector(SEL))))m.mut.push({t,k:r.addedNodes.length&&[...r.addedNodes].includes(n)?'add':'rm',n:D(n),p:D(r.target)})}}else if(r.type==='attributes'&&r.target.matches&&r.target.matches('.dg29,.h29-hero,.h29-sec,.dg29-gateway,.k29-reveal')&&(r.attributeName==='class'||r.attributeName==='data-reveal'||r.attributeName==='aria-busy'))m.mut.push({t,k:'attr:'+r.attributeName,n:D(r.target),v:String(r.target.getAttribute(r.attributeName)).slice(0,40)})}});
const startMo=()=>mo.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-reveal','aria-busy']});
if(document.documentElement)startMo();else document.addEventListener('DOMContentLoaded',startMo);
// per-frame geometry of every direct block of the Home composition (doc-absolute top/height), recorded only when something changed
let last='';const loop=()=>{const root=document.querySelector("[data-experience-capability='home-composition'] .h29")||document.querySelector('.h29');
 if(root){const kids=[...root.children].map((c,i)=>{const r=c.getBoundingClientRect();return [i,D(c),Math.round(r.top+scrollY),Math.round(r.height)]});
  const rh=e=>Math.round(e.getBoundingClientRect().height);
  const det={upd:[...document.querySelectorAll('.h29-updates > *')].map(e=>rh(e)),
   nota:[...document.querySelectorAll('.h29-notable > *')].map(e=>rh(e)),
   gw:[...document.querySelectorAll('.dg29-gateway')].map(e=>[rh(e),e.querySelectorAll('a.dg29-source,a.dg29-language-preview').length,rh(e.querySelector('.dg29-sources')||e),!!e.querySelector('[role=status]')]),
   dim:[...document.querySelectorAll('.dg29-dimension')].map(e=>[rh(e),e.querySelectorAll('.dg29-dimension-source').length,!!e.querySelector('[role=status]')]),
   heroKids:[...document.querySelectorAll('.h29-hero > *')].map(e=>[D(e),rh(e)]),
   frame:window.__frame?window.__frame():null};
  const key=JSON.stringify(kids)+JSON.stringify(det)+Math.round(scrollY)+document.documentElement.scrollHeight;
  if(key!==last){last=key;if(m.geo.length<4000)m.geo.push({t:ep(performance.now()),y:Math.round(scrollY),dh:document.documentElement.scrollHeight,k:kids,det})}}
 lg('raf');if(m.poll)rd();pch.port2.postMessage(0);requestAnimationFrame(loop)};
// what was PAINTED: sampled from a message task posted by the frame's rAF callback, i.e. after layout, ResizeObserver callbacks and paint of that frame
const pch=new MessageChannel();let lastPaint='';pch.port1.onmessage=()=>{const tops={};for(const b of document.querySelectorAll('[data-scroll-anchor]')){const r=b.getBoundingClientRect();if(r.height>0)tops[b.getAttribute('data-scroll-anchor')]=Math.round(r.top)}const k=JSON.stringify(tops)+Math.round(scrollY);if(k!==lastPaint&&m.paint.length<3000){lastPaint=k;m.paint.push({t:ep(performance.now()),y:Math.round(scrollY),tops})}};
requestAnimationFrame(loop);
${READINESS_SRC}
// paint / LCP
new PerformanceObserver(l=>{for(const e of l.getEntries())m.lcp={t:ep(e.startTime),size:e.size,el:D(e.element),url:(e.url||'').slice(-60)}}).observe({type:'largest-contentful-paint',buffered:true});
// the System Frame around the surface: what it is (classes), where the content column and the companion / context rail are, and how wide (a column that changes width changes every box in it)
window.__frame=()=>{const q=s=>document.querySelector(s),rr=e=>{if(!e)return null;const b=e.getBoundingClientRect();return {x:Math.round(b.left),w:Math.round(b.width),h:Math.round(b.height)}};
 const root=q('.sod29-root'),comp=q('aside.sod29-companion');
 return {root:root?[...root.classList].filter(c=>/^(has-companion|companion-|sidebar-collapsed|surface-|has-tool-dock)/.test(c)).join(' '):null,stage:rr(q('.sod29-main-stage')),stageCls:(q('.sod29-main-stage')||{}).className||null,main:rr(q('.sod29-main')),content:rr(q('.sod29-content')),h29:rr(q('.h29')),companion:rr(comp),companionCls:comp?comp.className:null,rail:rr(q('aside.sod29-surface-context-rail')),sidebar:rr(q('.sod29-sidebar')),vw:innerWidth}};
window.__post=()=>{const e=document.querySelector("[data-experience-capability='post-master-reading-stage']");return !!(e&&e.innerText.length>800)};
window.__wait=(kind,ms=30000)=>new Promise(res=>{let done=false;const chk=()=>kind==='post'?window.__post():(window.__ready()||{})[kind];
 const fin=v=>{if(done)return;done=true;mo2.disconnect();clearInterval(iv);res({ok:v,t:ep(performance.now())})};
 const mo2=new MutationObserver(()=>{if(chk())fin(true)});mo2.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true});
 const iv=setInterval(()=>{if(chk())fin(true)},50);if(chk())fin(true);setTimeout(()=>fin(false),ms)});
// ready observer: records the first epoch time each predicate becomes true (installed pre-navigation, always running)
m.ready={};const rd=()=>{const r=window.__ready();if(r){for(const k of ['heroReal','composed','usable','both','dgReady','dgSettled'])if(r[k]&&m.ready[k]==null)m.ready[k]=ep(performance.now());if(r.prMarker==='ready'&&m.ready.markerPrimary==null)m.ready.markerPrimary=ep(performance.now());if(r.dgMarker==='ready'&&m.ready.markerDg==null)m.ready.markerDg=ep(performance.now());if(r.prMarker&&m.ready.markerSeen==null)m.ready.markerSeen=r.prMarker;if(m.ready.usable!=null&&m.ready.dgSettled!=null)m.poll=false}};
const mo3=new MutationObserver(rd);const st3=()=>mo3.observe(document.documentElement,{childList:true,subtree:true,attributes:true});if(document.documentElement)st3();else document.addEventListener('DOMContentLoaded',st3);
window.__resetReady=()=>{m.ready={};m.poll=true};
// order of events around a layout change (diagnostic): DOM mutations, ResizeObserver delivery on the root, animation frames, programmatic scrolls
const startOrd=()=>{new MutationObserver(()=>lg('mo')).observe(document.documentElement,{childList:true,subtree:true,attributes:true});new ResizeObserver(()=>lg('ro0')).observe(document.documentElement)};if(document.documentElement)startOrd();else document.addEventListener('DOMContentLoaded',startOrd);
// user input and programmatic scroll jumps (the scroll restorer's scrollTo), for the early-input cancellation check
// every kind of input the restorer cancels on: a touch, a wheel, a key, a mouse press (m.touch keeps the times, m.kinds the kind)
{const inp=k=>{m.touch.push(ep(performance.now()));m.kinds.push(k)};
window.addEventListener('touchstart',()=>inp('touch'),{capture:true,passive:true});
window.addEventListener('wheel',()=>inp('wheel'),{capture:true,passive:true});
window.addEventListener('keydown',()=>inp('key'),{capture:true,passive:true});
window.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')inp('pointer')},{capture:true,passive:true});}
window.addEventListener('scroll',()=>{if(m.sc.length<6000)m.sc.push([ep(performance.now()),Math.round(scrollY)])},{passive:true});
const nativeScrollTo=window.scrollTo.bind(window);window.scrollTo=function(...a){lg('scrollTo>'+(a[0]&&typeof a[0]==='object'?a[0].top:a[1]));m.jumps.push({t:ep(performance.now()),to:a[0]&&typeof a[0]==='object'?a[0].top:a[1],from:Math.round(scrollY)});return nativeScrollTo(...a)};
try{window.__target=sessionStorage.getItem('__homeTarget')||null}catch(_){window.__target=null}
window.__anchor=(key)=>{const out={};const els=[...document.querySelectorAll('h1,h2,h3,h4,a,p,li,button,span,strong,b,small')].filter(e=>e.children.length===0);
 if(key){const el=els.find(e=>(e.innerText||'').trim().slice(0,80)===key);out.found=!!el;out.top=el?Math.round(el.getBoundingClientRect().top):null;return out}
 return out};
})()`;

// ---- sample ----------------------------------------------------------------------------------------------------------
const stateRow = (key, row, phase) => {
  // Explicit scenario injection (named by --state / --gate), applied to a row that IS in the corpus; never a stand-in for a missing one.
  if (GATE_CLOSED && phase === 'back' && /\/rest\/v1\/site_flags/.test(key)) {
    const rows = JSON.parse(Buffer.from(row.body, 'base64')).filter(r => r.key !== 'lock_world'); rows.push({ key: 'lock_world', enabled: true, message: 'fixture: world gate closed', mode: 'all' });
    return { ...row, body: Buffer.from(JSON.stringify(rows)).toString('base64') };
  }
  if (STATE === 'normal' || (STATE_FROM_BACK && phase !== 'back')) return row;
  const rest = /\/rest\/v1\//.test(key);
  const target = STATE === 'outage' ? rest && !/\/rest\/v1\/site_flags/.test(key) : (/\/rest\/v1\/posts|get_category_videos|els_records/.test(key) && !/storage/.test(key));
  if (!target) return row;
  if (STATE === 'empty') return { status: 200, type: 'application/json', body: Buffer.from('[]').toString('base64') };
  return { status: 500, type: 'application/json', body: Buffer.from('{"message":"fixture injected failure"}').toString('base64') };
};
async function newSample(origin, ctl) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, isMobile: !DESKTOP, hasTouch: !DESKTOP, serviceWorkers: 'block', locale: 'he-IL', timezoneId: 'Asia/Jerusalem', reducedMotion: REDUCED ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(INIT); await ctx.addInitScript(`try{localStorage.setItem('sod-theme','${THEME}')}catch(_){}`);
  await installTransportBoundary(ctx);
  const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
  const st = { misses: new Set(), violations: [], errors: [], effects: 0, reqLog: [], assets: [], consoleErrors: 0 };
  page.on('requestfinished', (r) => { try { const pathname = new URL(r.url()).pathname, a = st.assets.find((x) => x.u === pathname && x.end == null); if (a) a.end = Date.now(); } catch { /* not a local asset */ } });
  page.on('pageerror', e => st.errors.push(String(e.message).slice(0, 160)));
  page.on('console', m => { if (m.type() === 'error') st.consoleErrors++; });
  await page.route('**/*', async route => {
    const req = route.request(), key = fixtureKey(req, A.headers === '1'); let kind;
    try { kind = requestPolicy(req, origin, fixtures, key); }
    catch (error) { st.misses.add(key); st.violations.push(String(error.message).split('\n')[0].slice(0, 120)); return route.abort('blockedbyclient'); }
    if (kind === 'local') { try { st.assets.push({ u: new URL(req.url()).pathname, type: req.resourceType(), t: Date.now(), end: null }); } catch { /* ignore */ } return route.continue(); }
    if (kind === 'effect-fixture') { st.effects++; return route.fulfill({ status: 204, body: '', headers: CORS }); }
    const u = new URL(req.url()), supabase = u.hostname === SBHOST, isGate = /\/rest\/v1\/site_flags/.test(key);
    const row = stateRow(key, fixtures[key], ctl.phase), tReq = Date.now();
    // delay uses Node timers only; never waits on the renderer
    const d = supabase ? ((ctl.phase === 'back' && LATE != null) ? LATE : DELAY) + ((isGate && ctl.phase === 'back') ? GATE_DELAY : 0) : 400;
    await new Promise(r => setTimeout(r, d));
    st.reqLog.push({ k: shortShape(key), phase: ctl.phase, tReq, tFulfil: Date.now(), delay: d });
    return route.fulfill({ status: row.status, body: req.method() === 'HEAD' ? '' : Buffer.from(row.body, 'base64'), headers: { ...CORS, 'content-type': row.type || 'application/json', ...(row.range ? { 'content-range': row.range } : {}) } });
  });
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  return { ctx, page, cdp, st };
}
// The identity of what Home shows, as hashes only: titles, headings, link destinations, image sources (without query), gateway rows. Taken after the first visit has settled and
// again after each return; the difference (missing / added, by kind) says whether a return brought back the same titles, images, identities and links.
// What the page looks like at the end of a sample, as numbers: width of the document against the viewport (horizontal overflow), the theme actually applied, the
// headings and images on Home and how many images did not decode. Looking at the pictures (--shots) stays the way to judge the design.
const displayInfo = (page) => page.evaluate(() => { const root = document.querySelector('.h29') || document.body; const imgs = [...document.images].filter((i) => i.closest('.h29'));
  return { vw: innerWidth, vh: innerHeight, overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth), preset: document.documentElement.getAttribute('data-theme-preset'), theme: document.documentElement.getAttribute('data-theme'),
    bodyBg: getComputedStyle(document.body).backgroundColor, ink: getComputedStyle(root).color, headings: root.querySelectorAll('h1, h2').length, images: imgs.length, imagesBroken: imgs.filter((i) => i.complete && i.naturalWidth === 0).length,
    cards: document.querySelectorAll('.h29-updates .h29-card').length }; }).catch(() => null);
const takeShot = async (page, arm, idx, label) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, `${arm}-${label}-${W}x${H}-${THEME}-${idx}.png`) }).catch(() => {}); };
const IDENTITY_SRC = `window.__identity=()=>{const h=s=>{let x=5381;for(const c of String(s)){x=((x<<5)+x+c.charCodeAt(0))|0}return (x>>>0).toString(36)};const norm=t=>(t||'').replace(/[\\s\\u00a0]+/g,' ').trim();const out=[];const add=(kind,v)=>{if(v)out.push(kind+':'+h(v))};
 document.querySelectorAll('.h29 .h29-card-t').forEach(n=>add('title',norm(n.textContent)));
 document.querySelectorAll('.h29 h1, .h29 h2').forEach(n=>add('head',norm(n.textContent)));
 document.querySelectorAll('.h29 a[href], .dg29 a[href]').forEach(a=>add('link',a.getAttribute('href')));
 document.querySelectorAll('.h29 img[src], .dg29 img[src]').forEach(i=>add('img',(i.getAttribute('src')||'').split('?')[0]));
 document.querySelectorAll('.dg29-source > span:first-child, .dg29-dimension-source > span:last-child').forEach(n=>add('source',norm(n.textContent)));
 return out.sort();};`;
const diffIdentity = (before, after) => {
  const count = (list) => list.reduce((m, k) => (m[k] = (m[k] || 0) + 1, m), {}), a = count(before || []), b = count(after || []), kind = (k) => k.split(':')[0];
  const by = { missing: {}, added: {} };
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const d = (b[k] || 0) - (a[k] || 0); if (d < 0) by.missing[kind(k)] = (by.missing[kind(k)] || 0) - d; if (d > 0) by.added[kind(k)] = (by.added[kind(k)] || 0) + d; }
  const kinds = {}; for (const k of before || []) kinds[kind(k)] = (kinds[kind(k)] || 0) + 1;
  return { before: kinds, after: (() => { const o = {}; for (const k of after || []) o[kind(k)] = (o[kind(k)] || 0) + 1; return o; })(), missing: by.missing, added: by.added, same: !Object.keys(by.missing).length && !Object.keys(by.added).length };
};
async function swipe(cdp, dist) { const x = Math.round(W / 2); let y = dist < 0 ? 120 : H - 90; await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); const n = 24;
  for (let i = 0; i < n; i++) { y -= dist / n; await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] }); await new Promise(r => setTimeout(r, 16)); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
// A scroll the person makes (dist > 0 = down): a touch swipe on the mobile profile, mouse wheel notches on the desktop profile (the same fixed script for every arm).
async function scrollBy(page, cdp, dist) {
  if (!DESKTOP) return swipe(cdp, dist);
  await page.mouse.move(Math.round(W / 2), Math.round(H / 2)); const n = 24;
  for (let i = 0; i < n; i++) { await page.mouse.wheel(0, dist / n); await sleep(16); }
}
// What the person does while a return is being placed: the profile's own input (touch swipe; wheel or keyboard on the desktop profile).
async function userInput(page, cdp) {
  if (INPUT_KIND === 'key') { await page.keyboard.press('PageDown'); return; }
  return scrollBy(page, cdp, 400);
}
// Open the departure control the way the profile's person does: a tap, or a mouse move and a click.
async function openControl(page, x, y) {
  if (!DESKTOP) return page.touchscreen.tap(x, y);
  await page.mouse.move(x, y); await sleep(60); return page.mouse.click(x, y);
}
function sessionWindowMax(entries) { let best = 0, cur = 0, start = null, last = null;
  for (const e of [...entries].sort((a, b) => a.t - b.t)) { if (start != null && (e.t - last >= 1000 || e.t - start >= 5000)) { cur = 0; start = null; } if (start == null) start = e.t; cur += e.v; last = e.t; best = Math.max(best, cur); }
  return +best.toFixed(4); }
const HOME_POST = "[data-experience-capability='home-composition'] a[href^='/post/']";
// find the first Home post control that is fully inside the viewport (no programmatic scroll); with eligible slugs, only a post whose complete body the corpus holds
async function visibleLink(page, eligible) {
  return page.evaluate(([sel, vh, slugs]) => { const els = [...document.querySelectorAll(sel)]; for (const e of els) { const r = e.getBoundingClientRect(); if (r.top >= 90 && r.bottom <= vh - 90 && r.width > 20 && r.height > 12 && getComputedStyle(e).visibility !== 'hidden') {
    const slug = decodeURIComponent((e.getAttribute('href') || '').replace(/^\/post\//, '')); if (slugs && !slugs.includes(slug)) continue;
    const leafs = [...e.querySelectorAll('*')].filter(c => c.children.length === 0 && (c.innerText || '').trim().length >= 6); const lf = leafs[0] || e;
    return { href: e.getAttribute('href'), x: r.left + r.width / 2, y: r.top + r.height / 2, top: Math.round(r.top), anchorText: ((lf.innerText || e.innerText || '').trim().slice(0, 80)), anchorTop: Math.round(lf.getBoundingClientRect().top) }; } } return null; }, [HOME_POST, H, eligible]);
}
async function finishSample(o, st, page, label) {
  o.pageErrors = st.errors; o.consoleErrors = st.consoleErrors; o.misses = st.misses.size; o.missDigest = missDigest([...st.misses]); o.policyViolations = [...new Set(st.violations)].slice(0, 6); o.effects = st.effects;
  let broken = []; try { broken = await page.evaluate(() => window.__brokenImages()); } catch { /* page gone */ }
  o.brokenImages = missDigest(broken); if (broken.length) o.invalid.push(`${broken.length} image(s) the page could not decode`);
  if (st.misses.size || broken.length) privateMisses.push({ arm: o.arm, idx: o.idx, label, unmapped: [...st.misses], undecodableImages: broken });
  if (A.shot) { try { await page.screenshot({ path: `${A.shot}-${o.arm}-${o.idx}.png` }); } catch (_) {} }
  o.valid = !o.error && !o.invalid.length && o.misses === 0 && o.pageErrors.length === 0;
}
async function oneSample(arm, idx) {
  const { origin } = servers[arm]; const ctl = { phase: 'depart' };
  const { ctx, page, cdp, st } = await newSample(origin, ctl);
  const o = { arm, idx, invalid: [], late: LATE, interruptAt: INTERRUPT_AT, state: STATE };
  try {
    const nav0 = Date.now();
    await page.goto(origin + '/', { waitUntil: 'load', timeout: 120000 }).catch(() => {});
    const rdy = await page.evaluate(() => window.__wait('dgSettled')); if (!rdy.ok) o.invalid.push('Home discovery never settled');
    o.homeReadyEpoch = { usable: await page.evaluate(() => window.__r.ready.usable), dgSettled: await page.evaluate(() => window.__r.ready.dgSettled), navStart: nav0 };
    await sleep(2200);   // explicit setup settle (not part of measured action)
    await page.evaluate(IDENTITY_SRC); const identityBefore = await page.evaluate(() => window.__identity());
    o.frameFirstVisit = await page.evaluate(() => window.__frame()).catch(() => null);
    o.holdsBefore = await page.evaluate(() => window.__holds()).catch(() => null);   // every remembered box on the first visit, with the width it has: a return at another width releases the hold
    const eligible = POST_ARG && POST_ARG !== 'auto' ? [decodeURIComponent(POST_ARG.replace(/^\/post\//, ''))] : [...COMPLETE_POSTS];
    // reach the departure position by real touch swipes (same fixed script for every arm)
    for (let i = 0; i < 3; i++) { await scrollBy(page, cdp, 600); await sleep(250); } await sleep(500);
    let link = null; for (let i = 0; i < 10 && !link; i++) { link = await visibleLink(page, eligible); if (!link) { await scrollBy(page, cdp, 300); await sleep(350); } }
    // a wide page can be passed by the fixed downward script (the control is higher up than on a phone): look back up before giving up
    for (let i = 0; i < 16 && !link; i++) { await scrollBy(page, cdp, -300); await sleep(350); link = await visibleLink(page, eligible); }
    await sleep(800);
    link = await visibleLink(page, eligible);
    if (!link) { o.departDiag = await page.evaluate(([sel, vh]) => ({ vh, y: Math.round(scrollY), dh: document.documentElement.scrollHeight, links: [...document.querySelectorAll(sel)].map((e) => { const r = e.getBoundingClientRect(); return { slug: decodeURIComponent((e.getAttribute('href') || '').replace(/^\/post\//, '')).slice(0, 40), top: Math.round(r.top), bottom: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) }; }) }), [HOME_POST, H]).catch(() => null); o.invalid.push('no really-visible Home post control for departure (with a complete body in the corpus)'); throw new Error('no visible control'); }
    const readingBlock = await page.evaluate(() => { let best = null; for (const b of document.querySelectorAll('[data-scroll-anchor]')) { const r = b.getBoundingClientRect(); if (r.height > 0 && r.top <= 1) best = { id: b.getAttribute('data-scroll-anchor'), top: Math.round(r.top), h: Math.round(r.height) }; } return best; });
    o.depart = { readingBlock, href: link.href, anchorText: link.anchorText, anchorTopBefore: link.anchorTop, linkTop: link.top, scrollY: await page.evaluate(() => Math.round(scrollY)), docH: await page.evaluate(() => document.documentElement.scrollHeight), blocksBefore: (await page.evaluate(() => { const g = window.__r.geo; return g.length ? g[g.length - 1].k : null; })) };
    // REAL tap (touch) at the control; controller timestamps immediately around the command
    const tapMono0 = performance.now(), tapWall0 = Date.now();
    await openControl(page, link.x, link.y);
    const tapMono1 = performance.now(), tapWall1 = Date.now();
    await page.waitForFunction(() => location.pathname.startsWith('/post/'), null, { timeout: 15000 }).catch(() => o.invalid.push('no navigation to /post/ after tap'));
    const pr = await page.evaluate(() => window.__wait('post')); if (!pr.ok) o.invalid.push('post never became readable');
    o.postRoute = { path: decodeURIComponent(await page.evaluate(() => location.pathname)), tapCmdMs: Math.round(tapMono1 - tapMono0), tapToPostReadyMs: Math.round(pr.t - tapWall0), postTextLen: await page.evaluate(() => (document.querySelector("[data-experience-capability='post-master-reading-stage']") || { innerText: '' }).innerText.length), postDocH: await page.evaluate(() => document.documentElement.scrollHeight) };
    await sleep(3000);   // explicit settle on the Post
    for (let i = 0; i < 2; i++) { await scrollBy(page, cdp, 700); await sleep(300); } await sleep(600);
    o.postY = await page.evaluate(() => Math.round(scrollY));
    // ---- measured action: actual browser Back ----
    ctl.phase = 'back'; await page.evaluate((target) => { try { sessionStorage.setItem('__homeTarget', target); } catch (_) {} window.__target = target; window.__resetReady(); }, link.anchorText);
    if (TRACE_DIR) await browser.startTracing(page, { categories: ['-*', 'devtools.timeline', 'disabled-by-default-devtools.timeline', 'v8.execute'] });
    const bMono0 = performance.now(), bWall0 = Date.now();
    await page.goBack({ waitUntil: 'commit' });
    const bMono1 = performance.now(), bWall1 = Date.now();
    o.back = { cmdWallStart: bWall0, cmdWallEnd: bWall1, cmdDurMs: Math.round(bMono1 - bMono0) };
    if (RESIZE_TO) { await sleep(800); const before = await page.evaluate(() => window.__holds()); await page.setViewportSize({ width: RESIZE_TO, height: H }); await sleep(600); const after = await page.evaluate(() => window.__holds());
      o.resize = { from: W, to: RESIZE_TO, before, after, staleVars: after.filter(h => h.v !== '').length, excess: after.map(h => h.nat == null ? null : h.h - h.nat) }; }
    let interruptSent = null;
    if (INTERRUPT_AT != null) { const wait = INTERRUPT_AT - (Date.now() - bWall0); if (wait > 0) await sleep(wait); interruptSent = Date.now() - bWall0; await userInput(page, cdp); await sleep(400); }
    // poll the visible content anchor through the whole horizon
    const traj = []; const deadline = bWall0 + HORIZON_MS;
    while (Date.now() < deadline) { const p = await page.evaluate((k) => ({ y: Math.round(scrollY), dh: document.documentElement.scrollHeight, a: window.__anchor(k) }), link.anchorText).catch(() => null); if (p) traj.push([Date.now() - bWall0, p.y, p.dh, p.a.found ? p.a.top : null]); await sleep(120); }
    if (TRACE_DIR) { const buf = await browser.stopTracing(); fs.mkdirSync(TRACE_DIR, { recursive: true }); fs.writeFileSync(path.join(TRACE_DIR, `${arm}-${idx}.trace.json.gz`), zlib.gzipSync(buf)); }
    const rec = await page.evaluate(([w0, w1]) => { const m = window.__r; const inW = x => x.t >= w0 && x.t <= w1 + 300; return { cs: m.cs.filter(inW), mut: m.mut.filter(inW), geo: m.geo.filter(inW), lt: m.lt.filter(inW), ev: m.ev.filter(x => x.t >= w0 - 100 && x.t <= w1), ready: m.ready, geoPre: m.geo.filter(x => x.t < w0).slice(-1), paint: m.paint.filter(x => x.t >= w0 - 50 && x.t <= w1 + 300), ord: m.ord.filter(x => x[0] >= w0 && x[0] <= w1),
      touch: m.touch.filter(t => t >= w0), touchKinds: m.kinds.filter((_, i) => m.touch[i] >= w0), jumps: m.jumps.filter(j => j.t >= w0), sc: m.sc.filter(s => s[0] >= w0) }; }, [bWall0, bWall0 + HORIZON_MS]);
    const sum = rec.cs.reduce((s, x) => s + x.v, 0);
    o.actionWindowShiftSum = +sum.toFixed(4); o.cls = sessionWindowMax(rec.cs); o.shifts = rec.cs; o.mut = rec.mut; o.geo = rec.geo; o.geoPre = rec.geoPre; o.longTasks = rec.lt; o.events = rec.ev;
    const ms = (v) => v != null ? Math.round(v - bWall0) : null;
    o.readyAfterBack = { usable: ms(rec.ready.usable), composed: ms(rec.ready.composed), hero: ms(rec.ready.heroReal), both: ms(rec.ready.both), dgReady: ms(rec.ready.dgReady), dgSettled: ms(rec.ready.dgSettled), markerPrimary: ms(rec.ready.markerPrimary), markerDg: ms(rec.ready.markerDg), markerSeen: rec.ready.markerSeen ?? null,
      usableFromCmdEnd: rec.ready.usable != null ? Math.round(rec.ready.usable - bWall1) : null };
    o.traj = traj.filter((_, i) => i % 3 === 0);
    const lastT = traj[traj.length - 1] || []; const found = traj.filter(t => t[3] != null);
    const afterAnchor = found.length ? found[found.length - 1][3] : null; o.anchor = { text: link.anchorText, topBefore: link.anchorTop, topFinal: afterAnchor, finalDisp: afterAnchor == null ? null : Math.abs(afterAnchor - link.anchorTop), yFinal: lastT[1], docHFinal: lastT[2] };
    // stability: after the anchor first lands within 120px, max displacement thereafter
    const first = found.findIndex(t => Math.abs(t[3] - link.anchorTop) <= 120);
    o.anchor.firstWithin120Ms = first >= 0 ? found[first][0] : null; o.anchor.maxDispAfter = first >= 0 ? found.slice(first).reduce((m, t) => Math.max(m, Math.abs(t[3] - link.anchorTop)), 0) : null;
    o.anchor.within120Final = o.anchor.finalDisp != null && o.anchor.finalDisp <= 120;
    o.anchor.sampledFound = found.length + '/' + traj.length;
    // restore jumps (the shared restorer's scrollTo) and the user's touch, in page time relative to the Back command
    // the reading place: the block the person was reading in, and where it is at the end of the horizon (a steady state). The per-frame samples can include a
    // layout that was corrected before it was painted (a message task may run between a DOM change and the next frame), so a "jump" between two samples is not
    // evidence of what was painted; CLS (layout-shift entries) is. The series is kept for diagnosis only.
    if (readingBlock) {
      const series = rec.paint.map(p => ({ t: Math.round(p.t - bWall0), top: p.tops[readingBlock.id] ?? null })).filter(p => p.top != null);
      const landed = series.findIndex(p => Math.abs(p.top - readingBlock.top) <= 120);
      const finalTop = series.at(-1)?.top ?? null;
      o.reading = { id: readingBlock.id, topBefore: readingBlock.top, blockH: readingBlock.h, landedAtMs: landed >= 0 ? series[landed].t : null, finalTop, displacement: finalTop == null ? null : Math.abs(finalTop - readingBlock.top),
        series: rec.paint.map(p => [Math.round(p.t - bWall0), p.y, p.tops[readingBlock.id] ?? null]).slice(0, 400) };
    }
    o.cardsAtEnd = await page.evaluate(() => { const r = (n) => n ? Math.round(n.getBoundingClientRect().height * 10) / 10 : null; const box = document.querySelector('.h29-updates'); const cs = box ? getComputedStyle(box) : null; return box ? { box: r(box), pad: cs.paddingBlockStart + '/' + cs.paddingBlockEnd, gap: cs.rowGap, head: r(box.closest('section')?.querySelector('.h29-sec-h')), section: r(box.closest('section')), cards: [...box.children].map((c) => ({ tag: c.tagName, cls: String(c.className).slice(0, 40), h: r(c), main: r(c.querySelector('.h29-card-main')), media: r(c.querySelector('.h29-media')), body: r(c.querySelector('.h29-card-body')), cats: r(c.querySelector('.h29-card-cats')), catsCls: c.querySelector('.h29-card-cats') ? String(c.querySelector('.h29-card-cats').className).slice(0, 30) : null, open: r(c.querySelector('.h29-card-open')), upd: r(c.querySelector('.h29-upd')), t: r(c.querySelector('.h29-card-t')), meta: r(c.querySelector('.h29-meta')), metaText: (c.querySelector('.h29-meta') || {}).textContent || null, metaFont: c.querySelector('.h29-meta') ? (({ fontFamily, lineHeight, fontSize }) => `${fontFamily}|${lineHeight}|${fontSize}`)(getComputedStyle(c.querySelector('.h29-meta'))) : null, tFont: c.querySelector('.h29-card-t') ? (({ fontFamily, lineHeight }) => `${fontFamily}|${lineHeight}`)(getComputedStyle(c.querySelector('.h29-card-t'))) : null })), fonts: [...document.fonts].map((f) => `${f.family}:${f.status}`), probe: (() => { const m = box.children[1]?.querySelector('.h29-card-main'); if (!m) return null; const parts = [m, m.querySelector('.h29-media'), m.querySelector('.h29-media > *'), m.querySelector('.h29-card-body')].filter(Boolean); return { html: m.outerHTML.slice(0, 700), parts: parts.map((n) => { const q = getComputedStyle(n), b = n.getBoundingClientRect(); return { tag: n.tagName, cls: String(n.className).slice(0, 30), h: Math.round(b.height * 100) / 100, minH: q.minBlockSize, height: q.height, disp: q.display, fs: q.fontSize, lh: q.lineHeight, ff: q.fontFamily.slice(0, 40), ar: q.aspectRatio, pad: q.padding }; }) }; })() } : null; }).catch(() => null);   // per-card geometry of the updates strip at the end of the horizon (base and candidate alike)
    o.frameAtEnd = await page.evaluate(() => window.__frame()).catch(() => null);
    o.holdsAtEnd = await page.evaluate(() => window.__holds()).catch(() => null);   // every remembered box at the end of the horizon: its height against its natural extent (a hold that outlives its loading is blank space)
    o.restore = { jumps: rec.jumps.map(j => ({ atMs: ms(j.t), to: j.to, from: j.from })), touchAtMs: rec.touch.length ? ms(rec.touch[0]) : null, inputKind: rec.touchKinds[0] ?? null, departScrollY: o.depart.scrollY };
    o.identity = diffIdentity(identityBefore, await page.evaluate(() => window.__identity()));
    o.display = await displayInfo(page); await takeShot(page, arm, idx, 'back');
    if (CAPSULE && DESKTOP) {
      // the rail keeps its ability on a wide screen: the capsule is there after the return, opens when the person opens it (hover) with the context of the subject in it, never moves the content column, and goes back when the person leaves it
      const where = await page.evaluate(() => { const c = document.querySelector('aside.sod29-companion'); if (!c) return null; const b = c.getBoundingClientRect(); return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + 70) }; });
      const read = () => page.evaluate(() => { const f = window.__frame(), rail = document.querySelector('aside.sod29-companion .sod29-surface-context-rail'); return { companionCls: f.companionCls, companionW: f.companion?.w ?? null, railPresent: !!rail, railTextLen: rail ? rail.textContent.trim().length : 0, contentW: f.content?.w ?? null, h29W: f.h29?.w ?? null, ctxIndicator: !!document.querySelector('aside.sod29-companion .sod29-companion-ctx') }; });
      o.capsule = { present: !!where };
      if (where) { o.capsule.start = await read(); await page.mouse.move(where.x, where.y); await sleep(1200); o.capsule.hover = await read(); await page.mouse.move(Math.round(W / 2), Math.round(H / 2)); await sleep(900); o.capsule.leave = await read(); }
    }
    if (DELIBERATE) {
      // a deliberate scroll once the return has settled: it must move the page by about what was asked and nothing may pull it back
      const tMark = await page.evaluate(() => Date.now()), y0 = await page.evaluate(() => Math.round(scrollY));
      await scrollBy(page, cdp, 500); await sleep(1000); const y1 = await page.evaluate(() => Math.round(scrollY));
      await scrollBy(page, cdp, -300); await sleep(1000); const y2 = await page.evaluate(() => Math.round(scrollY));
      const after = await page.evaluate((t) => window.__r.jumps.filter(j => j.t >= t).length, tMark);
      o.deliberate = { y0, downBy: y1 - y0, upBy: y1 - y2, programmaticScrollsAfter: after, ok: y1 - y0 > 250 && y1 - y2 > 150 && after === 0 };
    }
    if (FORWARD) {
      // Forward to the Post: the same Post at the scroll position it was left at; then Back once more: the same reading place and the same content
      const leftAt = await page.evaluate((k) => ({ y: Math.round(scrollY), a: window.__anchor(k) }), link.anchorText);   // where the person is when they leave for the Post (after any deliberate scroll)
      const blockTop = (id) => id ? page.evaluate((i) => { const b = document.querySelector(`[data-scroll-anchor="${i}"]`); return b ? Math.round(b.getBoundingClientRect().top) : null; }, id).catch(() => null) : Promise.resolve(null);
      const blockWhenLeft = await blockTop(readingBlock?.id);
      await page.goForward({ waitUntil: 'commit' });
      await page.waitForFunction(() => location.pathname.startsWith('/post/'), null, { timeout: 15000 }).catch(() => o.invalid.push('Forward did not reach the Post'));
      await sleep(3000);
      const f = await page.evaluate(() => ({ path: decodeURIComponent(location.pathname), y: Math.round(scrollY) }));
      o.forward = { path: f.path, samePost: f.path === o.postRoute?.path, y: f.y, yWhenLeft: o.postY, yDiff: Math.abs(f.y - o.postY) };
      const bAgain = Date.now();
      if (RECOVER) ctl.phase = 'back2';   // stateRow serves the corpus rows as they are for any phase but 'back'
      await page.goBack({ waitUntil: 'commit' });
      const traj2 = []; while (Date.now() - bAgain < 4500) { const p = await page.evaluate((k) => ({ y: Math.round(scrollY), a: window.__anchor(k) }), link.anchorText).catch(() => null); if (p) traj2.push([Date.now() - bAgain, p.y, p.a.found ? p.a.top : null]); await sleep(120); }
      const last2 = traj2.filter((t) => t[2] != null).at(-1);
      o.backAgain = { leftAtY: leftAt.y, anchorTopWhenLeft: leftAt.a?.found ? leftAt.a.top : null, anchorTopFinal: last2 ? last2[2] : null, anchorDisp: last2 && leftAt.a?.found ? Math.abs(last2[2] - leftAt.a.top) : null, yDisp: traj2.at(-1) ? Math.abs(traj2.at(-1)[1] - leftAt.y) : null, yFinal: traj2.at(-1)?.[1] ?? null, identity: diffIdentity(identityBefore, await page.evaluate(() => window.__identity())) };
      // the second return is a fresh entry to Home (a new mount): its own layout shifts, the document it ends with, and every remembered box at the end (the space an earlier failure left is given back here)
      const second = await page.evaluate((t) => ({ cs: window.__r.cs.filter((x) => x.t >= t), dh: document.documentElement.scrollHeight }), bAgain);
      { const final = await blockTop(readingBlock?.id); o.backAgain.block = { id: readingBlock?.id ?? null, whenLeft: blockWhenLeft, final, displacement: blockWhenLeft != null && final != null ? Math.abs(final - blockWhenLeft) : null }; }
      o.backAgain.shifts = second.cs.map((x) => ({ t: Math.round(x.t - bAgain), v: +x.v.toFixed(4), src: x.src }));   // what moved on the fresh entry (element, y and height before / after)
      o.backAgain.cls = sessionWindowMax(second.cs); o.backAgain.docH = second.dh; o.backAgain.holdsAtEnd = await page.evaluate(() => window.__holds()).catch(() => null); o.backAgain.frame = await page.evaluate(() => window.__frame()).catch(() => null);
    }
    if (INTERRUPT_AT != null) {
      const touchAt = o.restore.touchAtMs, jumpsAfter = o.restore.jumps.filter(j => touchAt != null && j.atMs > touchAt);
      const jumpsBefore = o.restore.jumps.filter(j => touchAt == null || j.atMs <= touchAt);
      o.interrupt = { requestedAtMs: INTERRUPT_AT, sentAtMs: interruptSent, inputKind: o.restore.inputKind, profile: PROFILE, touchReachedPageAtMs: touchAt, restoreJumpsBeforeInput: jumpsBefore.length, restoreJumpsAfterInput: jumpsAfter.length, yFinal: lastT[1],
        earlyInput: touchAt != null && jumpsBefore.length === 0, pullback: jumpsAfter.length > 0 };
      // the touch reaches the page either before the restorer's first jump (it then must not jump at all) or during its hold window (it must stop and never pull back): both are reported, by phase
      o.interrupt.phase = touchAt == null ? 'never reached' : o.interrupt.earlyInput ? 'before-restore' : 'during-hold';
      if (touchAt == null) o.invalid.push(`the ${INPUT_KIND} input never reached the page`);
    }
    o.reqLog = st.reqLog.filter(r => r.phase === 'back').map(r => ({ k: r.k, tReq: r.tReq - bWall0, tFulfil: r.tFulfil - bWall0, delay: r.delay }));
    o.reqCount = { depart: st.reqLog.filter(r => r.phase === 'depart').length, back: st.reqLog.filter(r => r.phase === 'back').length };
    o.finalDocH = lastT[2];
  } catch (e) { o.error = String(e.message).replace(/\u001b\[[0-9;]*m/g, '').slice(0, 300); }
  await finishSample(o, st, page, 'back');
  await ctx.close(); return o;
}

// Cold Home load (no navigation away): composition/usability, CLS (session-window max over the whole load), LCP, skeleton residue, markers.
// Per script: the time it took to compile and to evaluate its top level, and the time spent in functions it defines (top-level calls only, so nested calls are not counted twice),
// from a Chromium trace taken under the same CPU throttling as the page. Long tasks: any task over 50 ms, with its start from the first trace event.
function summarizeTrace(buf) {
  const events = (JSON.parse(buf.toString()).traceEvents || []).filter((e) => e.ph === 'X' && e.dur);
  const base = Math.min(...events.map((e) => e.ts)), ms = (us) => +(us / 1000).toFixed(1), file = (u) => String(u || '').replace(/^.*\//, '').replace(/\?.*$/, '') || '(inline)';
  const add = (map, key, dur) => { map[key] = +((map[key] || 0) + dur / 1000).toFixed(1); };
  const evaluate = {}, compile = {}, calls = {}, tasks = [];
  const open = {};   // per thread: end of the last top-level FunctionCall
  for (const e of events.sort((a, b) => a.ts - b.ts)) {
    const url = e.args?.data?.url || e.args?.data?.fileName || e.args?.fileName || e.args?.url;
    if (e.name === 'EvaluateScript' || e.name === 'v8.evaluateModule') add(evaluate, file(url), e.dur);
    else if (e.name === 'v8.compile' || e.name === 'v8.compileModule' || e.name === 'v8.parseOnBackground') add(compile, file(url), e.dur);
    else if (e.name === 'FunctionCall') { const key = `${e.pid}:${e.tid}`; if (!(open[key] > e.ts)) { open[key] = e.ts + e.dur; add(calls, file(url), e.dur); } }
    else if (e.name === 'RunTask' && e.dur > 50000) tasks.push({ t: ms(e.ts - base), dur: ms(e.dur) });
  }
  const sum = (m) => +Object.values(m).reduce((a, b) => a + b, 0).toFixed(1), top = (m) => Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 12));
  return { evaluate: top(evaluate), compile: top(compile), calls: top(calls), totals: { evaluate: sum(evaluate), compile: sum(compile), calls: sum(calls) }, longTasks: tasks.slice(0, 40), longTaskMs: +tasks.reduce((a, t) => a + t.dur, 0).toFixed(1) };
}
async function loadSample(arm, idx) {
  const { origin } = servers[arm]; const ctl = { phase: 'depart' };
  const { ctx, page, st } = await newSample(origin, ctl);
  const o = { arm, idx, invalid: [], mode: 'load', state: STATE, width: W };
  try {
    if (TRACE_DIR) await browser.startTracing(page, { categories: ['-*', 'devtools.timeline', 'disabled-by-default-devtools.timeline', 'v8', 'v8.execute'] });
    const navWall0 = Date.now();
    await page.goto(origin + '/', { waitUntil: 'load', timeout: 120000 }).catch(() => {});
    const settled = await page.waitForFunction(() => { const r = window.__ready(); if (!r) return false; const sk = window.__skeletons(); return sk.loading + sk.busy + sk.status === 0; }, null, { timeout: 40000 }).then(() => true).catch(() => false);
    if (!settled) o.invalid.push('Home never left its loading state');
    await sleep(1500);
    const rec = await page.evaluate(() => { const m = window.__r, r = window.__ready(); return { cs: m.cs, ready: m.ready, lcp: m.lcp || null, t0: m.t0, fcp: (performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime ?? null, ready0: r, sk: window.__skeletons(), holds: window.__holds(), emptyText: (document.querySelector('.h29-empty') || {}).textContent || null, heroText: (document.querySelector('.h29-hero h1') || {}).textContent || null }; });
    const rel = (v) => v != null ? Math.round(v - rec.t0) : null;
    o.cls = sessionWindowMax(rec.cs); o.shiftSum = +rec.cs.reduce((s, x) => s + x.v, 0).toFixed(4); o.shifts = rec.cs.map(x => ({ t: rel(x.t), v: +x.v.toFixed(4), src: x.src && x.src.slice(0, 2) }));
    o.fcp = rec.fcp != null ? Math.round(rec.fcp) : null; o.lcp = rec.lcp ? { t: rel(rec.lcp.t), el: rec.lcp.el, size: rec.lcp.size } : null;
    o.readyMs = { usable: rel(rec.ready.usable), composed: rel(rec.ready.composed), hero: rel(rec.ready.heroReal), dgSettled: rel(rec.ready.dgSettled), markerPrimary: rel(rec.ready.markerPrimary), markerDg: rel(rec.ready.markerDg), markerSeen: rec.ready.markerSeen ?? null };
    o.display = await displayInfo(page); await takeShot(page, arm, idx, 'load');
    o.final = rec.ready0; o.skeletonResidue = rec.sk; o.holds = rec.holds; o.emptyText = rec.emptyText; o.heroText = rec.heroText;
    o.reqCount = st.reqLog.length;
    // what the first entry asks for, in order: the app's own files (name, kind, start/end from the navigation) and the reads (shape, count, first/last) with repeated shapes called out
    o.assets = st.assets.map((a) => ({ f: a.u.replace(/^.*\//, '') || '/', type: a.type, start: a.t - navWall0, end: a.end == null ? null : a.end - navWall0 }));
    const shapes = {}; for (const r of st.reqLog) { const e = (shapes[r.k] = shapes[r.k] || { n: 0, first: null, last: null }); e.n++; e.first = e.first ?? r.tReq - navWall0; e.last = r.tReq - navWall0; }
    o.reads = { total: st.reqLog.length, distinct: Object.keys(shapes).length, repeated: Object.entries(shapes).filter(([, v]) => v.n > 1).map(([k, v]) => ({ k, n: v.n, first: v.first, last: v.last })), shapes };
    if (TRACE_DIR) { const buf = await browser.stopTracing(); o.scripts = summarizeTrace(buf); fs.mkdirSync(TRACE_DIR, { recursive: true }); fs.writeFileSync(path.join(TRACE_DIR, `${arm}-load-${idx}.trace.json.gz`), zlib.gzipSync(buf)); }
  } catch (e) { o.error = String(e.message).replace(/\u001b\[[0-9;]*m/g, '').slice(0, 300); }
  await finishSample(o, st, page, 'load');
  await ctx.close(); return o;
}
const runs = []; const t0 = new Date().toISOString();
for (let i = 0; i < PAIRS; i++) {
  const order = i % 2 === 0 ? armNames : [...armNames].reverse();   // interleaved A/B, alternating who goes first
  for (const arm of order) { const r = MODE === 'load' ? await loadSample(arm, i + 1) : await oneSample(arm, i + 1); runs.push(r); process.stderr.write(`${arm}#${i + 1} valid=${r.valid} cls=${r.cls} miss=${r.misses} ${MODE === 'load' ? `usable=${r.readyMs?.usable} composed=${r.readyMs?.composed} lcp=${r.lcp?.t} residue=${JSON.stringify(r.skeletonResidue)}` : `anchor=${r.anchor?.finalDisp} usable=${r.readyAfterBack?.usable} composed=${r.readyAfterBack?.composed} dg=${r.readyAfterBack?.dgSettled}`} ${r.invalid.join(';')}${r.error ? ' ERR ' + r.error : ''}\n`); }
}
const profile = { runner: 4, readiness: READINESS_VERSION, profile: PROFILE, input: INPUT_KIND, viewport: `${W}x${H}`, dpr: DPR, touch: !DESKTOP, cpuThrottle: 4, network: '1.6Mbps down / 750kbps up / 150ms RTT (CDP)', supabaseReplayDelayMs: DELAY, backPhaseDelayMs: LATE, horizonMs: HORIZON_MS, theme: THEME, reducedMotion: REDUCED, state: STATE, stateFromBack: STATE_FROM_BACK, interruptAt: INTERRUPT_AT, recoverOnSecondReturn: RECOVER, mode: MODE, gateDelayMs: GATE_DELAY, gateClosed: GATE_CLOSED, resizeTo: RESIZE_TO,
  definitions: 'v4: composed = real hero/card in the DOM; usable = visible (opacity>=0.9, >=40% in viewport, hit-testable, no hidden/inert/loading ancestor), on a return the departure control itself; cls = session-window max',
  isolation: 'scripts/ci-isolation (run.mjs, policy.cjs requestPolicy/frozenSnapshot/browserArgs/installTransportBoundary, perf-execution-2029/serve.mjs)', requestPolicy: 'unmapped = violation, no fallback body',
  browser: 'Chromium ' + browser.version(), fixtureSha256: FX_SHA, fixtureKeys: Object.keys(fixtures).length, corpusImages: corpusImages.images, completePostBodies: COMPLETE_POSTS.size, node: process.version, cpus: os.cpus().length, startedAt: t0, finishedAt: new Date().toISOString() };
let playwrightVersion = null; try { playwrightVersion = require('playwright/package.json').version; } catch { /* not resolvable: stays null */ }
const buildAtEnd = Object.fromEntries(armNames.map((n) => [n, treeSignature(path.resolve(arms[n]))]));
const dirty = git(['status', '--porcelain', '--untracked-files=no']);
const signatures = {
  arms: Object.fromEntries(armNames.map((n) => [n, { dist: path.basename(path.resolve(arms[n])), commit: ARM_SHAS[n] || null, buildArtifact: { ...buildAtStart[n], algorithm: 'sha256 of the sorted "relative path TAB file sha256" lines of the dist tree', stableDuringRun: buildAtStart[n].signature === buildAtEnd[n].signature } }])),
  input: { fixtureSha256: FX_SHA || null, fixtureFileSha256: sha256File(FX), fixtureKeys: Object.keys(fixtures).length, corpusImages: corpusImages.images, completePostBodies: COMPLETE_POSTS.size, corpusClass: CORPUS_CLASS },
  tool: { runnerSha256: sha256File(HERE_FILE), readinessSha256: sha256File(path.join(HERE_DIR, 'readiness.mjs')), repoHead: git(['rev-parse', 'HEAD']), repoTrackedFilesDirty: dirty == null ? null : dirty !== '' },
  environment: { browser: 'Chromium ' + browser.version(), playwright: playwrightVersion, node: process.version, os: `${os.type()} ${os.release()} ${os.arch()}`, cpuModel: os.cpus()[0]?.model ?? null, cpus: os.cpus().length, profile: PROFILE, input: INPUT_KIND, viewport: `${W}x${H}`, dpr: DPR, touch: !DESKTOP, cpuThrottle: 4, network: '1.6Mbps down / 750kbps up / 150ms RTT (CDP)', locale: 'he-IL', timezone: 'Asia/Jerusalem', theme: THEME, reducedMotion: REDUCED },
};
fs.writeFileSync(A.out, JSON.stringify({ profile, signatures, arms, runs }, null, 1));
if (privateMisses.length) {
  const privateFile = path.resolve(A.private || path.join(os.tmpdir(), `home-stability-private-${FX_SHA.slice(0, 8)}-${Date.now()}.json`));
  let earlier = []; try { earlier = JSON.parse(fs.readFileSync(privateFile, 'utf8')).entries || []; } catch { /* first writer */ }
  fs.writeFileSync(privateFile, JSON.stringify({ note: 'PRIVATE: full unmapped request identifiers and undecodable image URLs. Do not commit or publish.', fixtureSha256: FX_SHA, entries: [...earlier, ...privateMisses.map(entry => ({ run: path.basename(A.out), ...entry }))] }, null, 1), { mode: 0o600 });
  process.stderr.write(`full unmapped identifiers written to the private file ${privateFile} (not part of the evidence)\n`);
}
for (const n of armNames) { const r = runs.filter(x => x.arm === n); const v = r.filter(x => x.valid); console.log(n, 'attempts', r.length, 'valid', v.length, 'CLS valid:', v.map(x => x.cls).join(' '), 'median', med(v.map(x => x.cls))); }
await browser.close();
for (const n of armNames) servers[n].srv.close();
process.exit(0);
