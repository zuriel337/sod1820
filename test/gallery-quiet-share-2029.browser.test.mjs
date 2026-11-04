import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
let playwright, vite, react;
try {
  playwright = require("playwright");
  vite = await import(pathToFileURL(require.resolve("vite")).href);
  react = (await import(pathToFileURL(require.resolve("@vitejs/plugin-react")).href)).default;
} catch { /* Optional browser runtime: report a skip, never a browser PASS. */ }
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : playwright?.chromium.executablePath());
const available = Boolean(playwright && vite && react && executablePath && existsSync(executablePath));
const root = fileURLToPath(new URL("..", import.meta.url));
const id = "12345678-1234-4123-8123-123456789012";

function fixtures() {
  const modules = {
    palette: "export const usePalette=()=>({});export const use2029Palette=()=>({successText:'#167242',dangerText:'#b22'});",
    telemetry: `export const shareSlug=()=>'/world';export const attributedShareUrl=(u)=>u;
      export const emitShare=(e)=>{window.__events.push(e)};`,
    lightbox: "import React from 'react';export default function Lightbox(){return React.createElement('div',{'data-test-lightbox':'open'},'full image')}",
    entry: `import React from 'react';import{createRoot}from'react-dom/client';import{BrowserRouter}from'react-router-dom';
      import Figure from '/src/components/experience2029/CanonicalMediaFigure2029.jsx';
      import ShareActions from '/src/components/ShareActions.jsx';
      const id='${id}'; const item={galleryImageId:id,sourceRef:'gallery_images:'+id,label:'וראית את אחרי',
        imageUrl:'https://example.test/storage/v1/object/public/media/fixture.svg',
        thumbUrl:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#241c12"/><text x="240" y="180" fill="#e2c77d" font-size="50">1237</text></svg>'),
        access:{scope:'public'},legacyPlacement:{galleryImageId:id,wpGalleryId:81},intrinsic:{representation:{imageUrl:'https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/fixture.svg'}}};
      createRoot(document.getElementById('root')).render(React.createElement(BrowserRouter,null,
        React.createElement('main',{className:'sod29-root','data-frame-theme-mode':'dark'},
          React.createElement('section',{'data-fixture':'public'},React.createElement(Figure,{item,alt:'התמונה הציבורית'})),
          React.createElement('section',{'data-fixture':'private'},React.createElement(Figure,{item:{...item,access:{scope:'private'}},alt:'תמונה ללא הרשאת שיתוף'})),
          React.createElement('section',{'data-fixture':'full'},React.createElement(ShareActions,{force:true,url:location.origin+'/world',title:'default channels'})))));`,
  };
  return {
    name: "quiet-share-fixtures", enforce: "pre",
    resolveId(source) {
      if (source === "/__quiet-share-entry.jsx") return "\0quiet-entry.jsx";
      if (source.endsWith("/lib/palette.js")) return "\0quiet-palette.js";
      if (source.endsWith("/lib/share/shareTelemetry.js") || source === "../lib/share/shareTelemetry.js") return "\0quiet-telemetry.js";
      if (source.endsWith("/Lightbox.jsx")) return "\0quiet-lightbox.js";
    },
    load(id) { const key = id.match(/^\0quiet-(.+)\.(?:jsx|js)$/)?.[1]; return key ? modules[key] : null; },
    configureServer(server) { server.middlewares.use(async (req,res,next) => {
      if (req.url?.split('?')[0] !== '/__quiet-share') return next();
      res.setHeader('Content-Type','text/html');
      const html = `<html dir="rtl" lang="he"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
        *{box-sizing:border-box}body{margin:0}main{max-width:700px;margin:auto;padding:12px;--s29-muted:#aaa;--s29-ink:#eee;--s29-panel:#18130f;--s29-panel-soft:#211b15;--s29-page:#110e0b;--s29-accent-text:#c8a860;--s29-line-strong:#78633b;--s29-focus-ring:#a88;--s29-discovery:#a99;--s29-font-ui:Arial;background:var(--s29-page);color:var(--s29-ink)}
        section{margin-bottom:20px}img{max-height:220px}
        </style><div id="root"></div><script type="module" src="/__quiet-share-entry.jsx"></script></html>`;
      res.end(await server.transformIndexHtml('/__quiet-share', html));
    }); },
  };
}

test("quiet share: exact link, copy/native/cancel/error, no image open or writes, mobile/desktop", { skip: !available }, async t => {
  const evidence = mkdtempSync(join(tmpdir(), "gallery-quiet-share-"));
  const server = await vite.createServer({ root, configFile:false, plugins:[fixtures(),react()], server:{host:'127.0.0.1',port:0}, logLevel:'error' });
  await server.listen();
  const browser = await playwright.chromium.launch({ executablePath, headless:true, args:['--no-sandbox'] });
  t.after(async()=>{ await browser.close(); await server.close(); });
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const page = await browser.newPage();
  const errors=[], failures=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('requestfailed',r=>failures.push({url:r.url(),error:r.failure()?.errorText}));
  await page.addInitScript(()=>{
    window.__copies=[];window.__events=[];window.__native=[];window.__copyFail=false;
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{if(window.__copyFail)throw Error('denied');window.__copies.push(text)}}});
    Object.defineProperty(navigator,'share',{configurable:true,value:undefined});
    document.execCommand=()=>false;
  });
  await page.route('https://**',route=>route.abort());
  for (const width of [320,390,1440]) {
    await page.setViewportSize({width,height:900});
    await page.goto(origin+'/__quiet-share');
    const button=page.locator('[data-fixture="public"] button[data-share-variant="icon"]');
    await button.waitFor();
    const photo=page.locator('[data-fixture="public"] img');
    assert.equal(await photo.count(),1);
    await photo.evaluate(el=>{el.loading='eager'});
    try { await page.waitForFunction(()=>document.querySelector('[data-fixture="public"] img')?.naturalWidth>0,{},{timeout:5000}); }
    catch(error) { t.diagnostic(JSON.stringify({photo:await photo.evaluate(el=>({html:el.outerHTML,complete:el.complete,width:el.naturalWidth})),failures})); throw error; }
    assert.ok((await photo.boundingBox()).height>100,'source remains visible next to share');
    const box=await button.boundingBox();assert.ok(box.width>=44&&box.height>=44);
    assert.equal(await button.locator('svg').getAttribute('width'),'16');
    assert.equal(await page.locator('[data-fixture="private"] [data-share-variant="icon"]').count(),0);
    assert.ok(await page.locator('[data-fixture="full"] a').count()>=4,'default channel row unchanged');
    assert.equal(await button.locator('svg').getAttribute('data-icon-name'),'share');
    await page.screenshot({path:join(evidence,`${width}-idle.png`),fullPage:true});
    await button.click();
    const exact=`${origin}/world?view=gallery&gallery=81&image=${id}#gallery-source-${id}`;
    assert.deepEqual(await page.evaluate(()=>window.__copies),[exact]);
    assert.equal(await page.locator('[data-test-lightbox]').count(),0);
    await button.focus();await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>window.__copies.length),2);
    await page.evaluate(()=>{window.__copyFail=true});await button.click();
    await button.getAttribute('aria-label').then(s=>assert.match(s,/נכשלה/));
    await page.evaluate(()=>{window.__copyFail=false});await button.click();
    assert.equal(await button.getAttribute('data-state'),'success','copy failure can be retried');
    await page.evaluate(()=>{window.__copyFail=false;Object.defineProperty(navigator,'share',{configurable:true,value:async payload=>{window.__native.push(payload);throw new DOMException('cancel','AbortError')}})});
    await page.reload();
    // Reload reapplies the copy fixture. Switch native sharing then rerender via copy.
    await button.waitFor();
    await page.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:async payload=>{window.__native.push(payload);throw new DOMException('cancel','AbortError')}}));
    await button.click(); // first click copies and rerenders, observing the newly available native API
    await button.click();
    assert.equal(await page.evaluate(()=>window.__native.length),1);
    assert.equal(await page.evaluate(()=>window.__copies.length),1,'cancel is not silent copy fallback');
    await page.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:async payload=>{window.__native.push(payload)}}));
    await button.click();
    const nativePayload=await page.evaluate(()=>window.__native.at(-1));
    assert.equal(nativePayload.url,exact);
    assert.equal(nativePayload.files,undefined,'link click never silently fetches/shares a file');
    assert.equal(await page.locator('[data-test-lightbox]').count(),0);
    assert.equal(await page.locator('button button').count(),0);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    for(const mode of ['dark','light','parchment']) {
      await page.locator('main').evaluate((el,mode)=>{el.dataset.frameThemeMode=mode;if(mode!=='dark'){el.style.setProperty('--s29-page',mode==='light'?'#fff':'#f3ebd8');el.style.setProperty('--s29-muted','#625643');el.style.setProperty('--s29-ink','#211b15')}},mode);
      await page.screenshot({path:join(evidence,`${width}-${mode}.png`),fullPage:true});
    }
  }
  assert.deepEqual(errors,[]);
  assert.equal(failures.filter(r=>r.url.startsWith('https://')).length,0,'no external request escaped the link-only fixture');
  t.diagnostic(`Fixture browser evidence: ${evidence}; no live backend or external share destination used.`);
});
