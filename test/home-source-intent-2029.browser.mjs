// Built Home request-admission and Post passive-media acceptance. All APIs are
// synthetic and blocked from the network. The unified performance lab measures timing.
// BEFORE_DIST=<4cf3079 build> AFTER_DIST=<candidate> OUT=/tmp/... node ...
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { gzipSync } from "node:zlib";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");

const BEFORE = resolve(process.env.BEFORE_DIST || "/tmp/sod1820-home-before-dist");
const AFTER = resolve(process.env.AFTER_DIST || "preview-deploy/dist");
const OUT = process.env.OUT || "/tmp/home-loading-acceptance-20261031";
const TITLE = "מקור ציבורי לדוגמת מדידת פתיחה";
const image = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2rL0AAAAASUVORK5CYII=", "base64");
const post = { id: 1, slug: "performance-public-fixture", title: TITLE, content: "<p>תוכן ציבורי מדומה למדידת המעבר בלבד.</p>", excerpt: "דוגמת בדיקה", tags: [], categories: [], source: "site", date: "2026-10-31T00:00:00Z", modified: "2026-10-31T00:00:00Z", image_url: "https://public-fixture.invalid/post.png", thumb_url: "https://public-fixture.invalid/post.png" };
const flags = ["lock_world", "lock_number", "lock_books", "lock_els", "lock_life_journey", "lock_heichal", "lock_raziel_site", "lock_forum", "lock_galleries"].map(key => ({ key, enabled: false, mode: "all", message: "" }));
const types = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2", ".ttf": "font/ttf" };
await mkdir(OUT, { recursive: true });

async function serve(dist) {
  const cache = new Map();
  const entry = JSON.parse(readFileSync(resolve(dist, ".vite/manifest.json")))["2029.html"].file;
  const server = createServer((req, res) => {
    const path = new URL(req.url, "http://local.invalid").pathname;
    let file = resolve(dist, "." + decodeURIComponent(path));
    if (!file.startsWith(dist + sep)) { res.writeHead(403).end(); return; }
    if (!existsSync(file) || statSync(file).isDirectory()) file = resolve(dist, "2029.html");
    const type = types[extname(file)] || "application/octet-stream";
    if (!cache.has(file)) {
      let raw = readFileSync(file);
      // In-process lab harness only: both artifacts use their exact built entry,
      // while every API is intercepted above. The hosted SW guard is unchanged
      // and verified separately; its bootstrap latency is NOT measured here.
      if (file.endsWith(".html")) raw = Buffer.from(raw.toString().replace(/<script type="module">if\(!\('serviceWorker'[\s\S]*?<\/script>/, `<script type="module" src="/${entry}"></script>`));
      const compress = /javascript|text\/|json|svg/.test(type);
      cache.set(file, { data: compress ? gzipSync(raw) : raw, compress });
    }
    const { data, compress } = cache.get(file);
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store", "Content-Length": data.length, ...(compress ? { "Content-Encoding": "gzip" } : {}) });
    res.end(data);
  });
  await new Promise(done => server.listen(0, "127.0.0.1", done));
  return { origin: `http://127.0.0.1:${server.address().port}`, server };
}

async function install(context, origin, theme, { failChunk = null, noObserver = false, primaryDelay = 0, fixture = {} } = {}) {
  const state = { flagReads: 0, requests: [], modelCalls: [], blockedWrites: [], pageErrors: [], failChunk };
  await context.addInitScript(({ theme, title, noObserver }) => {
    if (noObserver) delete window.IntersectionObserver;
    localStorage.setItem("sod-theme", theme);
    window.__perf = { primary_ms: null, lcp: null, cls: 0, longTasks: 0, longTaskMs: 0 };
    const observe = (type, fn) => { try { new PerformanceObserver(list => list.getEntries().forEach(fn)).observe({ type, buffered: true }); } catch {} };
    observe("largest-contentful-paint", e => { window.__perf.lcp = e.startTime; });
    observe("layout-shift", e => { if (!e.hadRecentInput) window.__perf.cls += e.value; });
    observe("longtask", e => { window.__perf.longTasks++; window.__perf.longTaskMs += e.duration; });
    const observer = new MutationObserver(() => {
      if (window.__perf.primary_ms === null && document.querySelector(".h29-hero")?.textContent.includes(title)) window.__perf.primary_ms = performance.now();
    });
    observer.observe(document, { subtree: true, childList: true });
  }, { theme, title: TITLE, noObserver });
  await context.route("**/*", async route => {
    const req = route.request(), url = new URL(req.url());
    const reply = (body, status = 200, headers = {}) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body), headers });
    state.requests.push({ path: url.pathname, query: url.search, method: req.method() });
    if (url.origin === origin) {
      if (url.pathname.startsWith("/api/")) return reply({ state: "login_required" }, 401);
      if (state.failChunk && url.pathname.endsWith(state.failChunk)) return route.abort();
      return route.continue();
    }
    if (url.hostname === "public-fixture.invalid" || /\.(png|jpg|webp)(\?|$)/.test(url.pathname)) return route.fulfill({ contentType: "image/png", body: image });
    if (url.hostname !== "linswmnnkjxvweumprav.supabase.co") return route.abort();
    const name = url.pathname.split("/").at(-1);
    if (url.pathname.includes("/functions/")) { state.modelCalls.push(url.pathname); return reply({}, 403); }
    if (url.pathname === "/auth/v1/settings") return reply({ external: { email: true } });
    if (name === "site_flags") { state.flagReads++; await new Promise(done => setTimeout(done, 250)); return reply(flags); }
    if (name === "home_videos") return reply(fixture.failVideos ? { message: "synthetic video failure" } : [{ yt: "fixture-video", slug: "fixture-video", title: "סרטון בדיקה ציבורי", poster_url: "https://public-fixture.invalid/video.png" }], fixture.failVideos ? 503 : 200);
    if (name === "posts" && primaryDelay && url.searchParams.get("limit") === "9") await new Promise(done => setTimeout(done, primaryDelay));
    if (name === "posts") return reply(url.searchParams.get("select")?.includes("content") && req.headers().accept?.includes("object") ? post : [post], 200, { "content-range": "0-0/1" });
    if (name === "channel_updates") return reply([{ id: "11111111-1111-4111-8111-111111111111", text: "מקור ציבורי מדומה לסטורי", image_url: "https://public-fixture.invalid/story.png", created_at: "2026-10-31T00:00:00Z", priority: 50, credit: "דוגמת בדיקה" }]);
    if (["link_identity", "track_visit", "ingest_event"].includes(name)) return route.abort();
    if (req.method() === "GET" || req.method() === "HEAD") return reply([], 200, { "content-range": "*/0" });
    const reads = new Set(["world_group_source_arrivals_v2", "rd_is_admin", "fn_list_family", "fn_method_value", "get_reality_videos", "community_feed_page", "writer_public_contributions_page_v1", "fn_number_lookup", "fn_number_dossier", "fn_number_journey"]);
    if (reads.has(name)) return reply(name === "fn_method_value" ? null : []);
    state.blockedWrites.push(url.pathname); return reply({}, 403);
  });
  return state;
}


// Reuse the existing synthetic, deny-all-external transport fixture. These are
// controlled lifecycle tests, not proof of real backend/public content.
const served=await serve(AFTER);const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const cases=[];
try{for(const width of[390,1440])for(const intent of['scroll','fragment','failure-retry']){
 const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});const state=await install(context,served.origin,'parchment');const releases=[];let failSource=intent==='failure-retry';
 await context.route('**/rest/v1/topic_cards_public**',route=>new Promise(resolve=>releases.push(async()=>{await route.fulfill({status:200,contentType:'application/json',body:'[]'}).catch(()=>{});resolve();})));
 await context.route('**/rest/v1/posts**',route=>{const u=new URL(route.request().url());if(failSource&&u.searchParams.get('slug')?.includes('flydubai-fz1073'))return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'controlled source failure'})});return route.fallback();});
 const page=await context.newPage();page.on('pageerror',e=>state.pageErrors.push(e.message));
 try{await page.goto(served.origin+'/2029');await page.locator('.h29-card-open').first().waitFor();await page.waitForTimeout(600);
 const sourceReads=()=>state.requests.filter(r=>r.path==='/rest/v1/posts'&&new URLSearchParams(r.query).get('slug')?.includes('flydubai-fz1073'));assert.equal(sourceReads().length,0,'pending Topic geometry cannot auto-admit the source');
 if(intent==='scroll')await page.locator('#home-plane').scrollIntoViewIfNeeded();else await page.evaluate(()=>{location.hash='home-plane';});
 if(failSource){const retry=page.getByRole('button',{name:'נסה שוב את המקור',exact:true});await retry.waitFor();failSource=false;await retry.click();}
 await page.locator('[data-flight-story="home"]').waitFor({timeout:5000});assert.ok(sourceReads().length>=1);assert.equal(state.modelCalls.length,0);assert.deepEqual(state.pageErrors,[]);cases.push({width,intent,passed:true,topicReaderStillPending:true,sourceReads:sourceReads().length});console.log(JSON.stringify(cases.at(-1)));
 }finally{await Promise.all(releases.map(f=>f()));await context.close();}
 }
 const stableSections=[];
 for(const width of[320,390,760,1440])for(const outcome of['ready','empty','failure']){
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});const fixtureState=await install(context,served.origin,'parchment');const releases=[];let requested,repliesReleased=false;const topicRequested=new Promise(resolve=>{requested=resolve;});
  const topics=Array.from({length:4},(_,i)=>({id:'fixture-topic-'+i,slug:'fixture-topic-'+i,title:'נושא ציבורי מבוקר',numbers:[1820],highlight_numbers:[],quality:6,meter_score:50}));
  await context.route('**/rest/v1/topic_cards_public**',route=>new Promise(resolve=>{const reply=async()=>{await route.fulfill({status:outcome==='failure'?503:200,contentType:'application/json',body:JSON.stringify(outcome==='failure'?{message:'controlled Topic failure'}:outcome==='ready'?topics:[])}).catch(()=>{});resolve();};if(repliesReleased)void reply();else releases.push(reply);requested();}));
  const page=await context.newPage();
  try{
   await page.goto(served.origin+'/2029');await page.locator('.h29-card-open').first().waitFor();await page.locator('.h29-notable[aria-busy="true"]').waitFor();
   const sourceTop=()=>page.locator('#home-plane').evaluate(e=>e.getBoundingClientRect().top+scrollY);
   const before=await sourceTop();await Promise.race([topicRequested,new Promise((_r,reject)=>setTimeout(()=>reject(Error('Topic fixture never requested: '+JSON.stringify(fixtureState.requests.map(r=>r.path)))),5000))]);repliesReleased=true;await Promise.all(releases.map(f=>f()));await page.locator('.h29-notable[aria-busy="false"]').waitFor();await page.waitForTimeout(350);
   if(outcome==='ready')assert.equal(await page.locator('.h29-notable-card').count(),4);
   else assert.match(await page.locator('.h29-notable').innerText(),outcome==='failure'?/לא ניתן לטעון/:/אין כרגע/);
   const after=await sourceTop();assert.ok(Math.abs(after-before)<1,`${width}/${outcome}: delayed Topic section moved source by${after-before}px`);
   stableSections.push({width,outcome,before,after,passed:true});
  }finally{await Promise.all(releases.map(f=>f()));await context.close();}
 }
 await writeFile(resolve(OUT,'source-intent.json'),JSON.stringify({source:'controlled local fixture, no external calls',cases,stableSections},null,2));}finally{await browser.close();await new Promise(r=>served.server.close(r));}
