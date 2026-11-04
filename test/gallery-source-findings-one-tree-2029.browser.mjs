// Full built application, real public gallery + synthetic findings only. No DB writes.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createReadStream,existsSync,statSync} from 'node:fs';
import {mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {createRequire} from 'node:module';
import {createInterface} from 'node:readline';
import {galleryReadingHref2029} from '../src/lib/research/topicSourceContext.js';
const {chromium}=createRequire(import.meta.url)('playwright');
const imageId='7287ad08-1c7b-4642-a5c4-cecbbaf35b81',sourceRef='gallery_images:'+imageId;
const id=n=>'70000000-0000-4000-8000-'+String(n).padStart(12,'0');
const row=n=>({id:id(n),created_at:'2026-10-31T09:00:00Z',kind:'observation',statement:'ממצא בדיקה מהתמונה '+n,
  source:'gallery',source_ref:sourceRef+'#stored-ocr:0-10',status:'approved',privacy_scope:'public',
  promoted_node_id:null,engine_verified:false,meta:{ext:{presentation:{statement_role:'research_statement'}}}});
let origin=process.env.PREVIEW_ORIGIN,server;
if(!origin){const dist=resolve('preview-deploy/dist');server=createServer((req,res)=>{
  let file=resolve(dist,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
  if(!file.startsWith(dist+sep)){res.writeHead(403).end();return;}
  if(!existsSync(file)||statSync(file).isDirectory())file=resolve(dist,'index.html');
  res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'})[extname(file)]||'application/octet-stream');
  res.setHeader('Cache-Control','no-store');createReadStream(file).pipe(res);
});await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;}
origin=new URL(origin).origin;let accessUrl;
if(process.env.PREVIEW_ACCESS_STDIN==='true'){console.log('Waiting for scoped access on stdin (not logged).');const input=createInterface({input:process.stdin});for await(const line of input){accessUrl=line.trim();input.close();break;}assert.equal(new URL(accessUrl).origin,origin);}
const out=process.env.PREVIEW_EVIDENCE_DIR||'/tmp/gallery-one-tree';await mkdir(out,{recursive:true});
const rpcReads=new Set(['rd_is_admin','fn_list_family','world_group_source_arrivals_v2','fn_method_profile','gematria_api','fn_number_lookup','fn_number_dossier','fn_number_journey','posts_by_number_strict','fn_all_methods','lang_links_list','number_neighbors','fn_verses_by_gematria','gematria_method_trace','fn_zero_scale']);
const report={cases:[],blocked:[],errors:[],models:[]};
const live=process.env.GALLERY_FINDINGS_LIVE==='true';
try{for(const width of [320,390,1440]){
  const proxy=process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}:undefined;
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage'],...(proxy?{proxy}:{})});
  try{
  const context=await browser.newContext({viewport:{width,height:1000},locale:'he-IL',reducedMotion:'reduce'});
  let requests=0,extra=false,fail=false,withdrawn=false;
  await context.route('**/*',route=>{
    const req=route.request(),u=new URL(req.url());
    if(u.origin===origin)return route.continue();
    if(u.pathname.startsWith('/functions/'))report.models.push(u.pathname);
    if(u.hostname==='linswmnnkjxvweumprav.supabase.co'){
      const table=u.pathname.split('/').at(-1);
      if(!live&&table==='world_contributor_research_v1'){
        requests++;assert.ok(u.searchParams.get('or')?.includes(sourceRef));assert.equal(u.searchParams.has('value'),false);assert.equal(u.searchParams.has('source_contributor_id'),false);
        if(fail){fail=false;return route.fulfill({status:400,json:{error:'synthetic_retry'}});}
        let rows=Array.from({length:extra?10:9},(_,i)=>row(i+1)).reverse();
        // An untrusted response must not leak a private or neighboring-source finding.
        rows=rows.map(r=>r.id===id(8)?{...r,privacy_scope:'private'}:r.id===id(7)?{...r,source_ref:'gallery_images:00000000-0000-4000-8000-000000000001'}:r);
        const cursor=u.searchParams.getAll('or').find(s=>s.includes('created_at.lt.'));
        if(cursor){const last=cursor.match(/id.lt.([0-9a-f-]+)/)?.[1];rows=rows.filter(r=>r.id<last);}
        return route.fulfill({json:rows.slice(0,Number(u.searchParams.get('limit'))||9)});
      }
      if(!live&&table==='research_objects'&&u.searchParams.get('id')?.startsWith('eq.70000000-')){
        return route.fulfill({json:row(Number(u.searchParams.get('id').slice(-12)))});
      }
      if(withdrawn&&table==='gallery_images'&&u.searchParams.get('id')===`in.(${imageId})`)return route.fulfill({json:[]});
      const rpc=u.pathname.match(/^\/rest\/v1\/rpc\/([^/]+)$/)?.[1];
      if((rpc&&rpcReads.has(rpc))||(!rpc&&!u.pathname.startsWith('/functions/')&&['GET','HEAD','OPTIONS'].includes(req.method())))return route.continue();
    }else if(['fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname)&&req.method()==='GET')return route.continue();
    report.blocked.push({method:req.method(),path:u.pathname});return route.abort();
  });
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.setDefaultTimeout(45000);
  await page.addInitScript(()=>localStorage.setItem('sod-theme','dark'));
  if(accessUrl){const access=new URL(accessUrl);access.pathname='/preview-identity.json';await page.goto(access.href,{waitUntil:'domcontentloaded'});}
  const href=galleryReadingHref2029('?sort=original&layout=compact',{galleryId:105,imageId,take:12});
  await page.goto(origin+href,{waitUntil:'domcontentloaded'});
  const photo=page.locator(`[data-gallery-image-id="${imageId}"]`);await photo.waitFor();
  assert.equal(requests,0,'gallery/photo opening does not fan out finding scans');
  await photo.locator('.g29-depth > summary').click();
  // A section without a heading is not an implicit region in every browser.
  const panel=photo.locator('.zvi-research');
  await panel.getByRole('button',{name:'ממצאים במקור',exact:true}).click();
  if(live){
    await panel.getByText('לא נמצאו ממצאים ציבוריים במקור שנקרא.',{exact:true}).waitFor();
    assert.equal(await panel.locator('a.zvi-research__excerpt').count(),0);
    await panel.screenshot({path:`${out}/live-source-empty-${width}.png`});
    const identity=await page.evaluate(()=>fetch('/preview-identity.json').then(r=>r.json()));
    report.cases.push({width,identity,livePublicData:true,syntheticFindings:false,sourceFindings:0});
    await context.close();continue;
  }
  await panel.locator('a.zvi-research__excerpt').first().waitFor();
  assert.equal(await panel.locator(`a[href="/world?finding=${id(8)}"]`).count(),0);
  assert.equal(await panel.locator(`a[href="/world?finding=${id(7)}"]`).count(),0);
  await panel.getByRole('button',{name:'עוד ממצאים במקור',exact:true}).click();
  await panel.locator(`a[href="/world?finding=${id(1)}"]`).waitFor();
  assert.equal(await panel.locator('a.zvi-research__excerpt').count(),7);
  await panel.screenshot({path:`${out}/synthetic-source-positive-${width}.png`});
  await panel.locator(`a[href="/world?finding=${id(9)}"]`).click();
  const focus=page.getByRole('region',{name:'ממצא ציבורי בעולם'});await focus.waitFor();
  await focus.getByRole('button',{name:'חזרה לתמונה בגלריה',exact:true}).click();
  await photo.waitFor();assert.equal(new URL(page.url()).pathname+new URL(page.url()).search+new URL(page.url()).hash,href);
  await photo.locator('.g29-depth > summary').click();
  await panel.getByRole('button',{name:'ממצאים במקור',exact:true}).click();await panel.locator('a.zvi-research__excerpt').first().waitFor();
  extra=true;await panel.getByRole('button',{name:'בדיקה מחדש של הממצאים',exact:true}).click();
  await panel.locator(`a[href="/world?finding=${id(10)}"]`).waitFor();
  fail=true;await panel.getByRole('button',{name:'בדיקה מחדש של הממצאים',exact:true}).click();
  await panel.getByText('לא הצלחנו לטעון את הממצאים. אפשר לנסות שוב.',{exact:true}).waitFor();
  await panel.getByRole('button',{name:'נסה שוב',exact:true}).click();await panel.locator('a.zvi-research__excerpt').first().waitFor();
  withdrawn=true;await panel.getByRole('button',{name:'בדיקה מחדש של הממצאים',exact:true}).click();
  await panel.getByText('חלק מהחומר או מקורותיו אינם זמינים בתצוגה הציבורית.',{exact:true}).waitFor();
  assert.equal(await panel.locator('a.zvi-research__excerpt').count(),0,'refresh removes findings whose source is no longer admitted');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await panel.screenshot({path:`${out}/source-findings-${width}.png`});
  const identity=await page.evaluate(()=>fetch('/preview-identity.json').then(r=>r.json()));
  report.cases.push({width,identity,syntheticFindings:true,realPublicImage:true,exactReturn:true,pagination:true,refreshNewFinding:true,retry:true,withdrawal:true});
  await context.close();
  }finally{await browser.close();}
}assert.deepEqual(report.errors,[]);assert.deepEqual(report.models,[]);console.log(JSON.stringify(report,null,2));
}finally{if(server)await new Promise(r=>server.close(r));}
