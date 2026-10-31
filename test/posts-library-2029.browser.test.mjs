import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { build, transformWithOxc } from "vite";
import react from "@vitejs/plugin-react";
import { POST_BACKGROUND_ASSETS_2029 } from "../src/lib/research/postBackground2029.js";

const require = createRequire(import.meta.url);
let playwright; try { playwright = require("playwright"); } catch {}
const root = fileURLToPath(new URL("..", import.meta.url));
const executablePath = "/usr/bin/chromium";

function libraryFixture() {
  const modules = {
    reader: `export const getPublicResearchClient=()=>window.__db;`,
    backend: `export const contributorHref=row=>'/community/researcher/'+row.slug;
      export const supabase={};export const getNotificationPrefs=async()=>({topics:window.__prefs||[],channels:[]});`,
    auth: `export const useAuth=()=>({user:null,isAdmin:false,loading:false});`,
    command: `export async function watchToggle(topic,source,on){window.__followCalls.push({topic,source,on});if(window.__followFails)return null;window.__prefs=on?[...new Set([...(window.__prefs||[]),topic])]:(window.__prefs||[]).filter(t=>t!==topic);return {ok:true};}`,
    tracking: `export const getVisitorId=()=>'fixture-guest';`,
    marketing: `export const trackConversion=()=>{};`,
    push: `export const PUSH_CONFIGURED=false,pushSupported=()=>false,enablePush=async()=>({ok:false});`,
    identity: `import React from 'react';export default function Identity(){return <div data-identity-fixture='true'>אימות זהות לדוגמה בלבד</div>;}`,
    shell: `
      import React from 'react';
      import {resolve2029Palette} from '/src/lib/palette.js';
      export function FrameState({title,children}){return <section role='status'><h2>{title}</h2>{children}</section>;}
      export default function Shell({children}){
        const theme=new URLSearchParams(location.search).get('theme')||'dark',p=resolve2029Palette(theme);
        return <div className='sod29-root closed-shell native-frame surface-post' style={{'--s29-page':p.pageBg,'--s29-panel':p.card,'--s29-panel-soft':p.cardSoft,'--s29-ink':p.ink,'--s29-muted':p.inkSoft,'--s29-line':p.border,'--s29-line-strong':p.borderStrong,'--s29-accent':p.accent,'--s29-accent-text':p.accentText,'--s29-font-ui':'Arial,sans-serif','--s29-font-body':'Arial,sans-serif','--s29-font-numeric':'monospace','--s29-type-micro':'14px','--s29-type-ui':'16px','--s29-type-body':'18px','--s29-type-lead':'21px','--s29-type-title':'28px','--s29-type-display':'46px'}}>{children}</div>;
      }`,
    entry: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import {BrowserRouter,Routes,Route,useNavigate} from 'react-router-dom';
      import Posts from '/src/pages/Posts2029Page.jsx';
      import PostFollowBox from '/src/components/PostFollowBox.jsx';
      import '/src/components/experience2029/sod2029.css';
      import '/src/components/experience2029/previewVisualCalibration2029.css';
      const seed=(id,over={})=>({id,slug:'post-'+id,title:'פוסט לקריאה '+id,excerpt:'פסקה קצרה שמזמינה לקרוא ולהתבונן בסיפור ובמקורות שלו.',author:'המערכת',categories:[],tags:[],image_url:'/cover.svg',thumb_url:'/cover.svg',date:'2026-10-20',modified:'2026-10-31',...over});
      window.__rows=[seed(1,{author:'בדרך לנצח',categories:['מימד חמש']}),seed(2,{author:'אלון לוי',tags:['מה קורה הבורא'],image_url:null,thumb_url:null}),seed(3,{author:'מחבר אורח',tags:['סוד החשמל']}),seed(4,{author:'מפרסם אחר',categories:['מימד חמש']}),seed(5,{title:'פוסט ללא סדרה',tags:['1237','2029-golden'],thumb_url:null,image_url:null}),...Array.from({length:30},(_,i)=>seed(i+6)),seed(90,{author:'בדרך לנצח',categories:['מימד חמש'],tags:['טיוטה']}),seed(91,{tags:['פורום']})];
      window.__calls=[];window.__followCalls=[];window.__failSeries=false;window.__failPosts=false;window.__slowDimension=false;window.__seriesReady=false;
      window.__db={async rpc(name,args){if(name!=='canonical_follow_subject')throw Error('Unexpected RPC');if(window.__resolverFails)return {error:{message:'unavailable'},data:null};return {error:null,data:args.p_entity_type==='series'&&!window.__seriesReady?'':(args.p_entity_type==='category'?'cat':args.p_entity_type)+':'+args.p_stable_id};},from(table){const calls={table,filters:[],columns:'',limit:null,range:null};
        const q={select(columns){calls.columns=columns;return q;},or(filter){calls.filters.push(['or',filter]);return q;},eq(k,v){calls.filters.push(['eq',k,v]);return q;},ilike(k,v){calls.filters.push(['ilike',k,v]);return q;},overlaps(k,v){calls.filters.push(['overlaps',k,v]);return q;},order(){return q;},limit(n){calls.limit=n;return q;},range(a,b){calls.range=[a,b];return q;},
          async then(done,fail){try{
            window.__calls.push(structuredClone(calls));
            const isSeries=calls.limit!==null;
            if(isSeries&&window.__failSeries||!isSeries&&window.__failPosts)throw Error('unavailable');
            let rows=window.__rows.filter(row=>calls.filters.every(([op,k,v])=>{
              if(op==='eq')return row[k]===v;
              if(op==='overlaps')return row[k].some(x=>v.includes(x));
              if(op==='ilike')return row[k].toLowerCase().includes(v.slice(1,-1).toLowerCase());
              if(k.includes('tags.is.null'))return !row.tags.some(x=>['טיוטה','פורום'].includes(x));
              const pairs=[...k.matchAll(/(tags|categories)\\.cs\\.\\{"([^\"]+)"\\}/g)];return pairs.some(([,field,value])=>row[field].includes(value));
            }));
            const count=rows.length;
            if(calls.range)rows=rows.slice(calls.range[0],calls.range[1]+1);
            if(calls.limit!==null)rows=rows.slice(0,calls.limit);
            if(!isSeries&&window.__slowDimension&&calls.filters.some(x=>x.includes('בדרך לנצח')))await new Promise(resolve=>{window.__releaseDimension=resolve;});
            return done({data:structuredClone(rows),count,error:null});
          }catch(error){return fail?fail(error):Promise.reject(error);}}
        };return q;}};
      function Navigation(){window.__navigate=useNavigate();return null;}
      const style=document.createElement('style');style.textContent='html,body{margin:0;padding:0}.sod29-root{display:block!important;background:var(--s29-page);color:var(--s29-ink);min-height:100vh;padding:1px 0}*{box-sizing:border-box}';document.head.append(style);
      createRoot(document.getElementById('root')).render(<BrowserRouter><Navigation/><Routes><Route path='/2029/posts' element={<Posts/>}/><Route path='/post/:slug' element={<h1>קריאת הפוסט</h1>}/><Route path='/follow-post' element={<div className='sod29-root' style={{padding:16}}><PostFollowBox variant='2029' post={seed(1,{author:'בדרך לנצח',categories:['מימד חמש','תיעוד אירועים']})} source='post_footer_2029'/></div>}/></Routes></BrowserRouter>);`,
  };
  return { name: "posts-library-fixture", enforce: "pre", resolveId(source) {
    if (source === "virtual:posts-library.jsx") return "\0library:entry";
    if (source.endsWith("/researchViewMode.js")) return "\0library:reader";
    if (source.endsWith("/Sod2029Shell.jsx")) return "\0library:shell";
    const mocks={'/supabase.js':'backend','/AuthContext.jsx':'auth','/commandCenter.js':'command','/tracking.js':'tracking','/marketing.js':'marketing','/push.js':'push','/EmailVerify.jsx':'identity'};
    for(const [suffix,id] of Object.entries(mocks))if(source.endsWith(suffix))return '\0library:'+id;
  }, async load(id) {
    if (!id.startsWith("\0library:")) return;
    return transformWithOxc(modules[id.slice(9)], "fixture.jsx", { lang: "jsx", jsx: { runtime: "automatic" } });
  } };
}

test("Posts library: live series, general posts, scoped navigation, errors and readable layouts", { skip: !playwright || !existsSync(executablePath), timeout: 120000 }, async () => {
  const output = mkdtempSync(join(tmpdir(), "posts-library-"));
  const artifacts = process.env.POST_LIBRARY_ARTIFACT_DIR || "/workspace/shared/downloads/posts-library-20261031";
  mkdirSync(artifacts, { recursive: true });
  let server, browser;
  try {
    const result = await build({ root, configFile: false, publicDir: false, logLevel: "error", plugins: [libraryFixture(), react()], build: { outDir: output, emptyOutDir: true, rollupOptions: { input: "virtual:posts-library.jsx" } } });
    const entry = result.output.find(x => x.isEntry), css = result.output.filter(x => x.fileName.endsWith(".css"));
    const html = `<!doctype html><html lang="he" dir="rtl"><head><meta name="viewport" content="width=device-width,initial-scale=1">${css.map(x => `<link rel="stylesheet" href="/${x.fileName}">`).join("")}</head><body><div id="root"></div><script type="module" src="/${entry.fileName}"></script></body></html>`;
    server = createServer((req, res) => {
      const pathname = new URL(req.url, "http://test").pathname;
      if (Object.values(POST_BACKGROUND_ASSETS_2029).some(asset => asset.preview === pathname || asset.mobile === pathname)) { res.setHeader("Content-Type", "image/webp"); res.end(readFileSync(join(root, "public", pathname.slice(1)))); return; }
      if (pathname === "/cover.svg") { res.setHeader("Content-Type", "image/svg+xml"); res.end('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><rect width="640" height="400" fill="#342b20"/><circle cx="320" cy="200" r="95" fill="#897843"/></svg>'); return; }
      const file = result.output.find(x => "/" + x.fileName === pathname);
      res.setHeader("Content-Type", file ? extname(pathname) === ".css" ? "text/css" : "text/javascript" : "text/html; charset=utf-8");
      res.end(file ? readFileSync(join(output, file.fileName)) : html);
    });
    await new Promise(done => server.listen(0, "127.0.0.1", done));
    const origin = "http://127.0.0.1:" + server.address().port;
    browser = await playwright.chromium.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    const cases = [];
    for (const width of [320, 390, 1440]) for (const theme of ["light", "parchment", "dark"]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" }), page = await context.newPage(), errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(`${origin}/2029/posts?theme=${theme}`);
      await page.locator(".sod29-posts-series-card").nth(2).waitFor();
      await page.locator(".sod29-library-post-card").nth(23).waitFor();
      assert.equal(await page.locator('[href="/2029/posts?series=mah-kore-habora"] [data-series-cover="illustration"] img').getAttribute("src"), POST_BACKGROUND_ASSETS_2029["mah-kore-habora"].preview);
      assert.equal(await page.getByRole("heading", { level: 1, name: "פוסטים", exact: true }).count(), 1);
      assert.ok(await page.getByRole("heading", { name: "פוסט ללא סדרה", exact: true }).isVisible());
      assert.equal(await page.locator('[href="/post/post-90"]').count(), 0);
      assert.equal(await page.locator(".sod29-library-post-signals,[data-post-golden]").count(), 0, "no tag-based numbers/quality decorations");
      const geometry = await page.evaluate(() => {
        const main = document.querySelector("main").getBoundingClientRect(), title = document.querySelector("h1").getBoundingClientRect();
        const size = selector => parseFloat(getComputedStyle(document.querySelector(selector)).fontSize);
        return { mainWidth:main.width,mainAxis:Math.abs(main.x+main.width/2-innerWidth/2),overflow: document.documentElement.scrollWidth > innerWidth, titleAxis: Math.abs(title.x + title.width / 2 - main.x - main.width / 2), align: getComputedStyle(document.querySelector(".sod29-library-post-copy h2")).textAlign,
          title: size(".sod29-library-post-copy h2"), body: size(".sod29-library-post-copy>p"), metadata: size(".sod29-library-post-meta"), control: size(".sod29-library-post-open"),
          columns: getComputedStyle(document.querySelector(".sod29-posts-library-grid")).gridTemplateColumns.split(" ").length };
      });
      assert.equal(geometry.overflow, false); assert.ok(geometry.mainWidth>=Math.min(width-34,1240));assert.ok(geometry.mainAxis<2);assert.ok(geometry.titleAxis < 2); assert.equal(geometry.align, "start");
      assert.ok(geometry.title >= 21 && geometry.body >= 18 && geometry.metadata >= 15 && geometry.control >= 16);
      assert.equal(geometry.columns, width === 1440 ? 3 : 1);
      const calls = await page.evaluate(() => window.__calls);
      assert.equal(calls.filter(call => call.limit === 1).length, 3);
      assert.ok(calls.every(call => !call.columns.includes("content") && call.filters.some(filter => filter[0] === "or" && filter[1].includes("tags.is.null"))));
      const series = page.locator('a.sod29-posts-series-card[href="/2029/posts?series=dimension-five"]');
      await series.focus(); await page.keyboard.press("Enter");
      await page.waitForURL("**/2029/posts?series=dimension-five");
      await page.waitForFunction(() => document.querySelectorAll(".sod29-library-post-card").length === 1);
      assert.equal(await page.locator('.sod29-posts-series-card[aria-current="page"]').getAttribute("href"), "/2029/posts?series=dimension-five");
      assert.equal(await page.locator(".sod29-library-post-card-link").getAttribute("href"), "/post/post-1");
      assert.equal(await page.evaluate(() => window.__calls.filter(call => call.limit === 1).length), 3, "changing series does not refetch all entrances");
      await page.getByRole("link", { name: "לכל הפוסטים", exact: false }).first().click();
      await page.waitForFunction(() => document.querySelectorAll(".sod29-library-post-card").length === 24);
      if (width === 390) await page.screenshot({ path: join(artifacts, `library-${theme}-mobile.png`), fullPage: true });
      if (width === 1440 && theme === "dark") await page.screenshot({ path: join(artifacts, "library-dark-desktop.png"), fullPage: true });
      assert.deepEqual(errors, []); cases.push({ width, theme, geometry }); await context.close();
    }
    const followPage=await browser.newPage({viewport:{width:320,height:1000}}),followErrors=[];
    followPage.on('pageerror',error=>followErrors.push(error.message));
    await followPage.goto(origin+'/2029/posts');
    await followPage.getByRole('searchbox').fill('פוסט ללא סדרה');
    await followPage.getByRole('button',{name:'חיפוש',exact:true}).click();
    await followPage.waitForFunction(()=>document.querySelectorAll('.sod29-library-post-card').length===1);
    assert.ok(new URL(followPage.url()).searchParams.has('q'));
    assert.equal(await followPage.locator('.sod29-posts-series-card').count(),0);
    await followPage.getByRole('button',{name:'ניקוי החיפוש',exact:true}).click();
    await followPage.waitForFunction(()=>document.querySelectorAll('.sod29-library-post-card').length===24);
    await followPage.getByRole('searchbox').fill('מימד חמש');
    await followPage.getByRole('button',{name:'חיפוש',exact:true}).click();
    await followPage.locator('.sod29-posts-series-card').waitFor();
    assert.equal(await followPage.locator('.sod29-posts-series-card').count(),1);
    await followPage.locator('.sod29-posts-series-card').click();
    await followPage.locator('[data-follow-target="series:dimension-five"][data-follow-readiness="unsupported"]').waitFor();
    assert.equal(await followPage.locator('[data-follow-target="series:dimension-five"] button').count(),0,'An unsupported series cannot promise alerts or substitute a category');
    await followPage.goto(origin+'/follow-post');
    const category=followPage.locator('[data-follow-target="cat:תיעוד אירועים"]');
    const follow=category.getByRole('button',{name:'מעקב אחרי תיעוד אירועים',exact:true});
    await follow.waitFor();await follow.click();
    await category.getByText('שמרו את המעקב בזהות שלכם',{exact:true}).waitFor();
    assert.equal(await followPage.getByRole('button',{name:'הפעלת התראות בדפדפן',exact:true}).count(),0);
    assert.equal(await category.locator('[data-icon-name="check"]').count(),1);
    await category.getByRole('button',{name:'עוקב אחרי תיעוד אירועים',exact:true}).click();
    await follow.waitFor();
    assert.deepEqual(await followPage.evaluate(()=>window.__followCalls),[{topic:'cat:תיעוד אירועים',source:'post_footer_2029',on:true},{topic:'cat:תיעוד אירועים',source:'post_footer_2029',on:false}]);
    assert.equal(await followPage.locator('[data-follow-target="cat:מימד חמש"],[data-follow-target^="post:"]').count(),0);
    await followPage.evaluate(()=>{window.__followFails=true;});await follow.click();
    await category.getByRole('alert').waitFor();assert.equal(await follow.getAttribute('aria-pressed'),'false');
    await followPage.screenshot({path:join(artifacts,'post-follow-mobile.png'),fullPage:true});
    assert.equal(await followPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await followPage.evaluate(()=>{window.__resolverFails=true;window.__rows[4].categories=['תיעוד אירועים'];window.__navigate('/2029/posts?category=תיעוד אירועים');});
    await followPage.locator('[data-follow-readiness="unavailable"]').waitFor();
    assert.equal(await followPage.locator('.sod29-watch-btn[aria-pressed]').count(),0);
    await followPage.evaluate(()=>{window.__resolverFails=false;});
    await followPage.getByRole('button',{name:'בדיקה נוספת של יעדי המעקב',exact:true}).click();
    await followPage.locator('[data-follow-readiness="ready"]').waitFor();
    await followPage.evaluate(()=>{window.__seriesReady=true;window.__navigate('/2029/posts?series=dimension-five');});
    await followPage.locator('[data-follow-target="series:dimension-five"][data-follow-readiness="ready"]').waitFor();
    assert.equal(await followPage.locator('[data-follow-target="series:dimension-five"] [data-icon-name="layers"]').count(),1);
    assert.deepEqual(followErrors,[]);await followPage.close();
    const reviewCases=[];
    for(const width of [320,390,1440])for(const option of ['1','2','3','4','5','6','7','8']){
      const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
      await context.addInitScript(option=>{document.documentElement.dataset.sodVisualOption=option;document.documentElement.dataset.sodSelectedPreview='true';},option);
      const p=await context.newPage();await p.goto(origin+'/2029/posts?theme=dark');
      await p.locator('.sod29-library-post-card').first().waitFor();
      const geometry=await p.evaluate(()=>{
        const h=document.querySelector('main h1'),r=h.getBoundingClientRect(),m=document.querySelector('main').getBoundingClientRect();
        const text=document.createRange();text.selectNodeContents(h);const lines=[...text.getClientRects()];
        return {width:r.width,height:r.height,lines:lines.length,font:parseFloat(getComputedStyle(h).fontSize),center:Math.abs(r.x+r.width/2-m.x-m.width/2),overflow:document.documentElement.scrollWidth>innerWidth,excerpt:getComputedStyle(document.querySelector('.sod29-library-post-copy>p')).display};
      });
      assert.ok(geometry.lines===1&&geometry.height<geometry.font*2,'The short Posts heading stays on one line in every review mode');
      assert.ok(geometry.width>200&&geometry.center<2);assert.equal(geometry.overflow,false);assert.notEqual(geometry.excerpt,'none');
      if(width===390&&option==='8')await p.screenshot({path:join(artifacts,'persisted-preview-390-option8.png')});
      reviewCases.push({width,option,geometry});await context.close();
    }
    writeFileSync(join(artifacts,'review-options.json'),JSON.stringify(reviewCases,null,2));
    const page = await browser.newPage({ viewport: { width: 390, height: 1000 } });
    await page.goto(origin + "/2029/posts"); await page.locator(".sod29-posts-series-card").nth(2).waitFor();
    await page.getByRole("button", { name: "פוסטים קודמים", exact: true }).click();
    await page.waitForURL("**/2029/posts?page=2");
    await page.waitForFunction(() => document.querySelectorAll(".sod29-library-post-card").length === 11);
    assert.equal(await page.locator(".sod29-library-post-card-link").first().getAttribute("href"), "/post/post-25");
    assert.equal(await page.evaluate(() => window.__calls.filter(call => call.limit === 1).length), 3, "paging does not repeat series reads");
    await page.evaluate(() => { window.__rows.unshift({ ...window.__rows[0], id: 999, slug: "new-after-build", thumb_url: "/cover.svg?new" }); window.__failSeries = true; window.__failPosts = true; window.__navigate("/2029/posts?category=וידאו"); });
    await page.getByRole("button", { name: "ניסיון טעינה נוסף", exact: true }).waitFor();
    assert.equal(await page.locator(".sod29-library-post-card").count(), 0);
    await page.evaluate(() => { window.__failPosts = false; window.__navigate("/2029/posts"); });
    await page.getByRole("button", { name: "לטעון שוב את הסדרות", exact: true }).waitFor();
    await page.locator(".sod29-library-post-card").first().waitFor();
    assert.equal(await page.locator(".sod29-posts-series-card").count(), 0, "failed series are not fabricated zero-count cards");
    await page.evaluate(() => { window.__failSeries = false; });
    await page.getByRole("button", { name: "לטעון שוב את הסדרות", exact: true }).click();
    await page.locator(".sod29-posts-series-card").nth(2).waitFor();
    assert.equal(await page.locator('[href="/2029/posts?series=dimension-five"] .sod29-posts-series-image img').getAttribute("src"), "/cover.svg?new", "new admitted source supplies its cover without a Post-ID list");
    await page.evaluate(() => { window.__slowDimension = true; window.__navigate("/2029/posts?series=dimension-five"); });
    await page.waitForFunction(() => typeof window.__releaseDimension === "function");
    await page.evaluate(() => window.__navigate("/2029/posts?series=sod-hashmal"));
    await page.waitForFunction(() => document.querySelector(".sod29-library-post-card-link")?.getAttribute("href") === "/post/post-3");
    await page.evaluate(() => window.__releaseDimension());
    await page.waitForTimeout(50);
    assert.equal(await page.locator(".sod29-library-post-card-link").getAttribute("href"), "/post/post-3", "a late source response cannot overwrite a new series scope");
    await page.locator(".sod29-library-post-card-link").click(); await page.waitForURL("**/post/post-3");
    await page.close();
    writeFileSync(join(artifacts, "browser.json"), JSON.stringify({ cases, independentErrorsAndRetry: true, newCoverAfterBuild: true, staleRouteGuard: true }, null, 2));
  } finally { await browser?.close(); if (server) await new Promise(done => server.close(done)); rmSync(output, { recursive: true, force: true }); }
});
