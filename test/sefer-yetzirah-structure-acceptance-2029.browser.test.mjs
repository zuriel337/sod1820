import assert from 'node:assert/strict';
import test from 'node:test';
import {createRequire} from 'node:module';
import {existsSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const req=createRequire(import.meta.url);
let pw,vite,react;
try {pw=req('playwright');vite=await import(pathToFileURL(req.resolve('vite')).href);react=(await import(pathToFileURL(req.resolve('@vitejs/plugin-react')).href)).default;}catch{}
const available=Boolean(pw&&vite&&react&&existsSync('/usr/bin/chromium'));
const pdf=process.env.SEFER_YETZIRAH_SOURCE_PDF;
const root=fileURLToPath(new URL('..',import.meta.url));
const out=process.env.SEFER_YETZIRAH_ACCEPTANCE_OUT||'/tmp/sefer-yetzirah-structure-acceptance';
const source=JSON.parse(readFileSync(resolve(root,'public/book-data/sefer-yetzirah.units.json'),'utf8'));

test('requested Sefer Yetzirah acceptance has genuine browser and source-byte fixtures',()=>{
 if(process.env.SEFER_YETZIRAH_REQUIRE_BROWSER){assert.ok(available);assert.ok(pdf&&existsSync(pdf));}
});

// Inspect the real Chrome PDF viewer's open shadow roots, never an injected PDF UI.
async function nativeViewer(page){
 for(const frame of page.frames()){
  try{
   const result=await frame.evaluate(()=>{
    const viewer=document.querySelector('pdf-viewer');if(!viewer)return null;
    const roots=[document];const inputs=[];const texts=[];
    for(let i=0;i<roots.length;i++)for(const e of roots[i].querySelectorAll('*')){
     if(e.shadowRoot)roots.push(e.shadowRoot);
     if(e.tagName==='INPUT')inputs.push({id:e.id,value:e.value,type:e.type});
     if(e.id==='pageselector'||e.id==='page-selector'||e.id==='num-pages')texts.push({id:e.id,text:e.textContent});
    }
    return {documentUrl:location.href,inputs,texts,loaded:viewer.loaded_,loadState:viewer.loadState_,initialLoadComplete:viewer.initialLoadComplete_,pageCount:viewer.documentDimensions?.pageDimensions?.length,viewportPage:typeof viewer.viewport_?.getMostVisiblePage==='function'?viewer.viewport_.getMostVisiblePage():null};
   });
   if(result)return result;
  }catch{}
 }
 return null;
}

// The scanned witness has warm paper; require actual PDF pixels inside the iframe,
// not the surrounding reader or a native viewer that has only received metadata.
async function capturePaintedPdf(page,frame,path){
 const deadline=Date.now()+30000;
 let ratio=0;
 while(Date.now()<deadline){
  const box=await frame.boundingBox(),viewport=page.viewportSize();
  const x=Math.max(0,box.x+4),y=Math.max(0,box.y+4);
  const clip={x,y,width:Math.min(box.width-8,viewport.width-x),height:Math.min(box.height-8,viewport.height-y)};
  const shot=await page.screenshot({clip});
  ratio=await page.evaluate(async encoded=>{
   const image=new Image();image.src='data:image/png;base64,'+encoded;await image.decode();
   const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
   const context=canvas.getContext('2d');context.drawImage(image,0,0,64,64);
   const pixels=context.getImageData(0,0,64,64).data;let warm=0;
   for(let i=0;i<pixels.length;i+=4)if(pixels[i]>80&&pixels[i]>pixels[i+1]+8&&pixels[i+1]>pixels[i+2]+8)warm++;
   return warm/(64*64);
  },shot.toString('base64'));
  if(ratio>.05){writeFileSync(path,shot);return ratio;}
  await page.waitForTimeout(250);
 }
 assert.fail(`native source metadata loaded but the PDF paper was not painted: ${ratio}`);
}

// This test measures existing source reading. It never mounts any of the 33 unimplemented specifications.
test('Sefer Yetzirah source/native-PDF/return/fallback audit across nine viewport presets', {skip:!available||!pdf,timeout:600000},async()=>{
 const bytes=readFileSync(pdf);assert.equal(createHash('sha256').update(bytes).digest('hex'),source.source_pdf_sha256);
 assert.equal(bytes.subarray(0,5).toString(),'%PDF-');mkdirSync(out,{recursive:true});
 process.env.SOD_BUILD_TARGET='2029';process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW='true';process.env.VITE_INTEGRATED_PREVIEW='true';
 const server=await vite.createServer({root,configFile:false,plugins:[react()],appType:'spa',server:{host:'127.0.0.1',port:0}});await server.listen();
 const base=`http://127.0.0.1:${server.httpServer.address().port}`;
 const browser=await pw.chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const observations=[];
 const revisionFiles=['public/book-data/sefer-yetzirah.units.json','public/book-data/sefer-yetzirah.structures.json','public/book-data/sefer-yetzirah.source-readings.json','src/pages/SeferYetzirahWorld2029Page.jsx','src/components/books2029/SeferYetzirahScene2029.jsx','test/sefer-yetzirah-structure-acceptance-2029.browser.test.mjs'];
 const sourceFilesSha256=Object.fromEntries(revisionFiles.map(file=>[file,createHash('sha256').update(readFileSync(resolve(root,file))).digest('hex')]));
 try{
  for(const width of [320,390,1440])for(const theme of ['light','parchment','dark']){
   const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
   let pdfResponses=0,engineAttempts=0;
   await context.addInitScript(theme=>{if(window===window.top&&/^https?:$/.test(location.protocol))localStorage.setItem('sod-theme',theme);},theme);
   await context.route('**/*',async route=>{
    const r=route.request(),u=new URL(r.url());
    if(u.origin===base&&r.isNavigationRequest()&&u.pathname==='/2029/control'){
     const response=await context.request.get(`${base}/2029.html`);return route.fulfill({status:response.status(),contentType:'text/html',body:await response.body()});
    }
    if(u.href.split('#')[0]===source.source_pdf_url){pdfResponses++;return route.fulfill({status:200,contentType:'application/pdf',body:bytes,headers:{'content-disposition':'inline','access-control-allow-origin':'*'}});}
    if(u.hostname==='linswmnnkjxvweumprav.supabase.co'){
     if(u.pathname.startsWith('/functions/')){engineAttempts++;return route.fulfill({status:503,body:'deliberately unavailable during source acceptance'});}
     return route.fulfill({status:200,contentType:'application/json',body:u.pathname.startsWith('/auth/')?'{}':'[]'});
    }
    if(u.hostname.endsWith('googleapis.com')||u.hostname.endsWith('gstatic.com'))return route.abort();
    return route.continue();
   });
   const page=await context.newPage();const normalErrors=[];page.on('pageerror',error=>normalErrors.push(String(error)));const item={width,theme,browser:'Chromium',backend:'mocked',engineTransport:'blocked',pdfFixtureSha256:source.source_pdf_sha256,pdfFramesAborted:false,specificationModelsMounted:0,modelAcceptance:'NOT_TESTED_NO_RENDERER_BINDING',gaps:[],notTested:['per-specification component selection/return','dynamic reduced-motion resource audit','real mobile browser/device','server authorization and RLS']};
   try{
    await page.goto(`${base}/2029/control?surface=sefer-yetzirah-world&page=44`,{waitUntil:'domcontentloaded'});
    const panel=page.locator('#yetzirah29-source');await panel.waitFor({timeout:30000});
    await page.waitForFunction(theme=>document.documentElement.getAttribute('data-theme-preset')===theme,theme);
    const frame=panel.locator('iframe');assert.match(await frame.getAttribute('src'),/#page=44&view=FitH/);
    await panel.locator('input').fill('207');await panel.getByRole('button',{name:'עבור',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#yetzirah29-source iframe')?.src.includes('#page=207&'));
    await panel.getByRole('button',{name:'הבא',exact:true}).click();assert.match(await frame.getAttribute('src'),/#page=208&/);
    await panel.getByRole('button',{name:'הקודם',exact:true}).click();assert.match(await frame.getAttribute('src'),/#page=207&/);
    await page.reload({waitUntil:'domcontentloaded'});await panel.waitFor();assert.match(await frame.getAttribute('src'),/#page=207&/);
    await panel.getByRole('button',{name:'מסך מלא',exact:true}).focus();await page.keyboard.press('Enter');
    await page.waitForFunction(()=>Boolean(document.fullscreenElement));
    item.fullscreen=true;
    const nativeDeadline=Date.now()+45000;
    while(Date.now()<nativeDeadline){
     item.nativeViewer=await nativeViewer(page);
     if(item.nativeViewer?.pageCount===220&&item.nativeViewer.inputs.some(i=>i.id==='pageSelector'&&i.value==='207'))break;
     await page.waitForTimeout(250);
    }
    assert.equal(item.nativeViewer?.pageCount,220,'actual native PDF must expose all 220 pages');
    assert.equal(item.nativeViewer.inputs.find(i=>i.id==='pageSelector')?.value,'207','native viewer must show physical page 207, not just the iframe URL');
    assert.equal(item.nativeViewer.loadState,'success');
    assert.equal(item.nativeViewer.initialLoadComplete,true);
    assert.equal(item.nativeViewer.viewportPage,206,'Chrome native zero-based viewport must match physical PDF page 207');
    item.nativePdfLoadedAtPhysicalPage=207;
    item.nativeFrameUrls=page.frames().map(f=>f.url());
    item.paintedPdfPaperFraction=await capturePaintedPdf(page,frame,resolve(out,`native-${width}-${theme}.png`));
    await panel.getByRole('button',{name:'יציאה ממסך מלא',exact:true}).click();await page.waitForFunction(()=>!document.fullscreenElement);
    assert.match(await frame.getAttribute('src'),/#page=207&/);item.sourceNavigationAndReturn=true;
    assert.equal(await page.getByText('מאומת במנוע',{exact:true}).count(),0);
    item.initialCanvasCount=await page.locator('.yetzirah29 canvas').count();
    item.gaps.push('existing scene has no explicit start/close and no binding of these 33 specifications','component source/return and visible new legends are not implemented');
    const modes=page.locator('nav[aria-label="בחירת מבנה תלת־ממדי"] button');assert.equal(await modes.count(),5);
    for(const button of await modes.all()){await button.focus();await page.keyboard.press('Enter');assert.equal(await button.getAttribute('aria-pressed'),'true');}
    item.keyboardModeControls=true;
    item.noHorizontalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.body.scrollWidth<=innerWidth+1);
    assert.equal(item.noHorizontalOverflow,true);
    const asset=await context.request.get(`${base}/book-data/sefer-yetzirah.structures.json`);assert.equal(asset.status(),200);
    assert.equal((await asset.json()).acceptance_continuation.implemented_models,0);
    item.normalPageErrors=[...normalErrors];assert.deepEqual(normalErrors,[]);
    await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return /webgl/i.test(kind)?null:original.call(this,kind,...args);};});
    await page.reload({waitUntil:'domcontentloaded'});await panel.waitFor();
    assert.equal(await frame.count(),1);assert.match(await frame.getAttribute('src'),/#page=207&/);
    assert.ok((await page.locator('.yetzirah29').innerText()).length>500);
    assert.equal(await page.getByText('מאומת במנוע',{exact:true}).count(),0);
    item.nonWebglSourceReadingRetained=true;
    assert.ok(pdfResponses>0);assert.equal(engineAttempts,0);item.pdfResponses=pdfResponses;item.engineAttempts=engineAttempts;
   }catch(error){item.auditError=String(error);throw error;}
   finally{
    observations.push(item);writeFileSync(resolve(out,'browser-observations.json'),JSON.stringify({task:'SEFER_YETZIRAH_SOURCE_STRUCTURE_ACCEPTANCE_CONTINUATION',sourceBase:'291cbc875f08406c3fac1a7bd3548514f9699eca',sourceFilesSha256,meaning:'Existing source-reading audit, not acceptance of 33 implemented models. Real PDF bytes fulfilled from the hash-matched witness; backend mocked.',observations},null,2)+'\n');
    await context.close();
   }
   console.log(`Sefer Yetzirah acceptance: ${width}/${theme} source reading checked`);
  }
 }finally{await browser.close();await server.close();}
});
