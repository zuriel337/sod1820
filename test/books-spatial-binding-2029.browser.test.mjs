import assert from 'node:assert/strict';
import test from 'node:test';
import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const req=createRequire(import.meta.url);
let pw,vite,react;
try { pw=req('playwright');vite=await import(pathToFileURL(req.resolve('vite')).href);react=(await import(pathToFileURL(req.resolve('@vitejs/plugin-react')).href)).default; } catch {}
const available=Boolean(pw&&vite&&react&&existsSync('/usr/bin/chromium'));
test('required Books browser tooling is available',()=>{if(process.env.BOOKS_SPATIAL_REQUIRE_BROWSER)assert.ok(available);});

test('measure existing Books spatial source/return/fallback across nine viewport presets', {skip:!available,timeout:600000},async()=>{
 const root=process.env.BOOKS_SPATIAL_AUDIT_ROOT||fileURLToPath(new URL('..',import.meta.url));
 const out=process.env.BOOKS_SPATIAL_AUDIT_OUT||'/tmp/books-spatial-binding-audit';mkdirSync(out,{recursive:true});
 process.env.SOD_BUILD_TARGET='2029';process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW='true';process.env.VITE_INTEGRATED_PREVIEW='true';
 const server=await vite.createServer({root,configFile:false,plugins:[react()],appType:'spa',server:{host:'127.0.0.1',port:0}});await server.listen();
 const base=`http://127.0.0.1:${server.httpServer.address().port}`;
 const browser=await pw.chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const observations=[];
 const books=(process.env.BOOKS_SPATIAL_AUDIT_BOOKS||'ahavat-torah,sefer-yetzirah').split(',');
 assert.ok(books.length&&books.every(book=>['ahavat-torah','sefer-yetzirah'].includes(book)));
 try {
  for(const width of [320,390,1440])for(const theme of ['light','parchment','dark'])for(const book of books){
   const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
   let engines=0;
   await context.addInitScript(theme=>localStorage.setItem('sod-theme',theme),theme);
   await context.route('**/*',async route=>{
    const r=route.request(),u=new URL(r.url());
    if(u.origin===base&&r.isNavigationRequest()&&u.pathname==='/2029/control'){
     const response=await context.request.get(`${base}/2029.html`);return route.fulfill({status:response.status(),contentType:'text/html',body:await response.body()});
    }
    if(u.pathname.toLowerCase().endsWith('.pdf'))return route.abort(); // URL/interaction audit only; real bytes checked separately.
    if(u.hostname==='linswmnnkjxvweumprav.supabase.co'){
     if(u.pathname.startsWith('/functions/')){engines++;return route.fulfill({status:503,body:'engine deliberately unavailable'});}
     return route.fulfill({status:200,contentType:'application/json',body:u.pathname.startsWith('/auth/')?'{}':'[]'});
    }
    if(u.hostname.endsWith('googleapis.com')||u.hostname.endsWith('gstatic.com'))return route.abort();
    return route.continue();
   });
   const page=await context.newPage();const surface=book==='ahavat-torah'?'ahavat-torah-system':'sefer-yetzirah-world';
   const sourceId=book==='ahavat-torah'?'ahavat29-source':'yetzirah29-source';
   const prefix=book==='ahavat-torah'?'.ahavat29':'.yetzirah29';
   const result={book,width,theme,root,engineCalls:0,pdfBytesRendered:false,models:[],gaps:[],notTested:['native PDF rendering','touch target contrast measurement','dynamic reduced-motion change','per-component full source return']};
   try {
    await page.goto(`${base}/2029/control?surface=${surface}`,{waitUntil:'domcontentloaded'});
    const source=page.locator(`#${sourceId}`);await source.waitFor({timeout:30000});
    assert.equal(await source.locator('iframe').count(),1);
    assert.equal(await source.getByRole('button',{name:'מסך מלא',exact:true}).count(),1);
    const frame=source.locator('iframe');const initial=await frame.getAttribute('src');
    assert.match(initial,/#page=\d+&view=FitH/);
    await source.locator('button').filter({hasText:/^הבא$/}).click();
    const next=await frame.getAttribute('src');assert.notEqual(next,initial);
    await page.reload({waitUntil:'domcontentloaded'});await source.waitFor();
    assert.equal(await frame.getAttribute('src'),next,'refresh preserves exact source page');
    await source.locator('button').filter({hasText:/^הקודם$/}).click();assert.equal(await frame.getAttribute('src'),initial);
    await source.getByRole('button',{name:'מסך מלא',exact:true}).click();
    await page.waitForFunction(()=>Boolean(document.fullscreenElement));
    await source.getByRole('button',{name:'יציאה ממסך מלא',exact:true}).click();
    await page.waitForFunction(()=>!document.fullscreenElement);assert.equal(await frame.getAttribute('src'),initial);
    assert.equal(await page.getByText('מאומת במנוע',{exact:true}).count(),0,'unexecuted engine cannot verify book content');
    result.sourcePageAndRefresh=true;result.fullscreenAndReturn=true;
    result.initialCanvasCount=await page.locator(`${prefix} canvas`).count();
    const opens=page.getByRole('button',{name:/^פתח.*תלת/});
    const names=await opens.allTextContents();
    for(const name of names){
     const button=page.getByRole('button',{name:name.trim(),exact:true});if(await button.isDisabled())continue;
     const before=await frame.getAttribute('src');await button.focus();await page.keyboard.press('Enter');
     const close=page.getByRole('button',{name:name.trim().replace(/^פתח/,'סגור'),exact:true});await close.waitFor();
     await page.waitForFunction(()=>document.querySelector('canvas')||document.body.textContent.includes('אינו זמין'),null,{timeout:15000});
     const canvas=await page.locator('canvas').count();await close.click();
     assert.equal(await frame.getAttribute('src'),before,'model close preserves source page');
     result.models.push({name:name.trim(),keyboardOpened:true,closed:true,canvasObserved:canvas>0,sourcePageRetained:true});
    }
    if(book==='sefer-yetzirah'){
     result.sceneModes=await page.locator('nav[aria-label="בחירת מבנה תלת־ממדי"] button').allTextContents();
     for(const b of await page.locator('nav[aria-label="בחירת מבנה תלת־ממדי"] button').all())await b.click();
     result.gaps.push('GPU scene starts on entry; no explicit model start/close control','five modes are not bindings of the 33 new source specifications','node selection does not establish per-component source navigation');
    }
    if(!names.length&&book==='ahavat-torah')result.notTested.push('3D controls absent at this central revision; source403 audited separately');
    result.noHorizontalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.body.scrollWidth<=innerWidth+1);
    if(!result.noHorizontalOverflow)result.gaps.push('horizontal page overflow');
    await page.screenshot({path:resolve(out,`${book}-${width}-${theme}.png`),fullPage:false});
    // Force the genuine renderer failure path; no runtime component is replaced.
    await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return /webgl/i.test(kind)?null:original.call(this,kind,...args);};});
    await page.reload({waitUntil:'domcontentloaded'});await source.waitFor();
    assert.equal(await frame.count(),1);assert.ok((await page.locator(prefix).innerText()).length>300,'readable source material survives unavailable GPU/engine');
    result.nonWebglReadingRetained=true;result.engineCalls=engines;assert.equal(engines,0);
   }catch(error){result.auditError=String(error);throw error;}
   finally {observations.push(result);writeFileSync(resolve(out,'browser-observations.json'),JSON.stringify({meaning:'audit execution is not full model compliance; PDF frames deliberately aborted',observations},null,2));await context.close();}
  }
 } finally {await browser.close();await server.close();}
});
