// Read-only metadata parity audit. No login, model, mail or product mutation.
const fs=require('node:fs');
const {chromium}=require(require.resolve('@playwright/test',{paths:[process.cwd()]}));
const origin='https://sod1820.co.il', db='https://linswmnnkjxvweumprav.supabase.co';
const output=process.argv[2]||'/tmp/canonical-parity-audit-initial.json';
const width=Number(process.argv[4]||390);
const reads=JSON.parse(fs.readFileSync('docs/reviews/public-foundation-20261101/evidence/rpc-read-inventory.json')).functions.map(x=>x.proname).filter(x=>x!=='lang_links_list');
reads.push('convergence_meter','is_number_indexable','is_phrase_indexable','writer_public_contributions_page_v1');
const cases=[
 {id:'home-alias',path:'/2029',family:'public-home'},
 {id:'posts-alias',path:'/2029/posts',family:'public-posts'},
 {id:'number-alias',path:'/2029/number/1820',family:'public-number',root:'1820'},
 {id:'phrase-alias',path:'/2029/number/'+encodeURIComponent('משיח'),family:'public-phrase',root:'358'},
 {id:'calculator-pro',path:'/2029/calculator?q='+encodeURIComponent('משיח'),family:'public-calculator',text:'358'},
 {id:'calculator-entry',path:'/2029/gematria?q='+encodeURIComponent('משיח'),family:'public-calculator',text:'358'},
 {id:'calculator-viral',path:'/2029/gematria/viral?q='+encodeURIComponent('משיח'),family:'public-calculator',text:'358'},
 {id:'number-alias-method',path:'/2029/number/358?phrase='+encodeURIComponent('משיח')+'&method=regular&returnTo=%2Fworld%3Fpart%3D2&part=2&part=7',family:'public-number',root:'358'},
 {id:'number-entry-continuation',path:'/2029/number?returnTo=%2Fworld&part=2&part=7',family:'public-continuation'},
 {id:'number-public',path:'/number/1820',family:'public-canonical-control',root:'1820'},
 {id:'phrase-public',path:'/number/'+encodeURIComponent('משיח'),family:'public-canonical-control',root:'358'},
 {id:'calculator-public',path:'/gematria?q='+encodeURIComponent('משיח'),family:'public-canonical-control',text:'358'},
 {id:'world-public',path:'/world',family:'public-canonical-control'},
 {id:'posts-public',path:'/post',family:'public-canonical-control'},
 {id:'home-public',path:'/',family:'public-canonical-control'},
 {id:'gallery-public',path:'/gallery',family:'public-canonical-control'},
 {id:'books-public',path:'/books',family:'public-canonical-control'},
 {id:'research-tool-continuation',path:'/research?tool=gematria&q='+encodeURIComponent('משיח'),family:'public-continuation',text:'358'},
 {id:'journey-closed',path:'/2029/journey',family:'intentionally-closed-control'},
];
const filter=new Set((process.argv[3]||'').split(',').filter(Boolean));
const report={task:'PUBLIC_CANONICAL_SERVER_CLIENT_AUDIT_20261104',origin,anonymous:true,grantUsed:false,width,actualSW:true,performanceMeasurement:false,scope:'metadata parity, not full route/function/performance acceptance',rows:[]};
const save=()=>fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
function tag(html,kind){
 const re=kind==='canonical'?/<link\b[^>]*\brel=["']canonical["'][^>]*>/i:new RegExp('<meta\\b[^>]*\\b(?:property|name)=["\']'+kind+'["\'][^>]*>','i');
 const tag=html.match(re)?.[0]||'';
 return tag.match(new RegExp('\\b'+(kind==='canonical'?'href':'content')+'=["\']([^"\']*)'))?.[1]?.replaceAll('&amp;','&')||null;
}
function normalized(url){try{return new URL(url).href;}catch{return null;}}
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}}:{})});
 const context=await browser.newContext({viewport:{width,height:width===390?844:1000}});
 await context.addInitScript(({origin,db,reads})=>{
   const originalFetch=window.fetch.bind(window), allowedRPC=new Set(reads);
   window.__metadataDenied=[];window.__metadataReads=[];window.__canonicalHistory=[];
   const allowed=req=>{const u=new URL(req.url),rpc=u.pathname.match(/^\/rest\/v1\/rpc\/([a-z_][a-z0-9_]*)$/)?.[1];return (u.origin===origin&&req.method==='GET'&&(!u.pathname.startsWith('/api/')||/^\/api\/public-(?:document|robots|sitemap)$/.test(u.pathname)))||(u.origin===db&&((u.pathname.startsWith('/rest/v1/')&&(!rpc||allowedRPC.has(rpc))&&(['GET','HEAD'].includes(req.method)||rpc&&req.method==='POST'))||(req.method==='GET'&&['/auth/v1/settings','/auth/v1/user'].includes(u.pathname))||(req.method==='GET'&&u.pathname.startsWith('/storage/v1/object/public/'))));};
   window.fetch=(input,init)=>{const r=new Request(input instanceof Request?input:new URL(input,location.href),init),u=new URL(r.url),row={origin:u.origin,path:u.pathname,method:r.method};if(!allowed(r)){window.__metadataDenied.push(row);return Promise.reject(Error('metadata_read_only_guard'));}window.__metadataReads.push(row);return originalFetch(r);};
   const open=XMLHttpRequest.prototype.open;
   XMLHttpRequest.prototype.open=function(method,url,...rest){const r=new Request(new URL(url,location.href),{method});if(!['GET','HEAD'].includes(r.method)||!allowed(r))throw Error('metadata_read_only_guard');return open.call(this,method,url,...rest);};
   navigator.sendBeacon=()=>false;
   window.WebSocket=class{constructor(){throw Error('metadata_read_only_guard');}};
   new MutationObserver(()=>{const v=document.querySelector('link[rel="canonical"]')?.getAttribute('href');const list=window.__canonicalHistory;if(v&&list.at(-1)!==v)list.push(v);}).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['href','content']});
 },{origin,db,reads});
 async function artifact(){const r=await context.request.get(origin+'/public-reading-artifact.json',{timeout:30000});const data=await r.json();return {status:r.status(),sourceSha:data.sourceSha};}
 report.artifactBefore=await artifact();save();
 for(const item of cases.filter(x=>!filter.size||filter.has(x.id))){
  const row={...item,errors:[]};report.rows.push(row);const page=await context.newPage();page.on('pageerror',e=>row.errors.push(String(e.message).slice(0,500)));
  try{
   const r=await page.goto(origin+item.path,{waitUntil:'domcontentloaded',timeout:60000});
   row.httpStatus=r.status();const html=await r.text();row.server={canonical:tag(html,'canonical'),ogUrl:tag(html,'og:url'),robots:tag(html,'robots'),headerRobots:r.headers()['x-robots-tag']||null};
   row.redirects=[];let request=r.request().redirectedFrom();while(request){const response=await request.response();row.redirects.unshift({path:new URL(request.url()).pathname+new URL(request.url()).search,status:response?.status(),location:response?.headers().location||null});request=request.redirectedFrom();}
   await page.waitForFunction(()=>Boolean(document.querySelector('#root')?.children.length)&&document.querySelector('#root').innerText.length>80,{},{timeout:45000});
   if(item.root)await page.locator('[data-number-core-root="'+item.root+'"]').first().waitFor({state:'visible',timeout:45000});
   if(item.text)await page.waitForFunction(t=>document.querySelector('#root')?.innerText.includes(t),item.text,{timeout:45000});
   let last=null,stable=0;for(let n=0;n<24&&stable<4;n++){const current=await page.locator('link[rel="canonical"]').getAttribute('href');stable=current===last?stable+1:0;last=current;await page.waitForTimeout(350);}
   row.client=await page.evaluate(()=>({canonical:document.querySelector('link[rel="canonical"]')?.getAttribute('href')||null,ogUrl:document.querySelector('meta[property="og:url"]')?.content||null,robots:document.querySelector('meta[name="robots"]')?.content||null,title:document.title,history:window.__canonicalHistory,surface:document.querySelector('[data-experience-surface]')?.getAttribute('data-experience-surface')||null,worker:navigator.serviceWorker.controller?new URL(navigator.serviceWorker.controller.scriptURL).pathname:null,readRequests:window.__metadataReads?.length,denied:window.__metadataDenied}));
   row.finalPath=new URL(page.url()).pathname+new URL(page.url()).search;
   row.canonicalEqual=normalized(row.server.canonical)===normalized(row.client.canonical);
   row.oldPrefixRepairedInBrowser=Boolean(row.server.canonical?.includes('/2029')&&!row.client.canonical?.includes('/2029'));
   row.observed=true;
  }catch(e){row.observed=false;row.failure=String(e.message).slice(0,1100);}
  save();console.log(JSON.stringify({id:row.id,status:row.httpStatus,server:row.server?.canonical,client:row.client?.canonical,equal:row.canonicalEqual,oldPrefix:row.oldPrefixRepairedInBrowser,observed:row.observed,failure:row.failure}));await page.close();
 }
 report.galleryHeaders=[];if(filter.has('gallery-public')){for(const method of ['GET','HEAD']){const r=await context.request.fetch(origin+'/gallery',{method,timeout:30000});report.galleryHeaders.push({method,status:r.status(),headerRobots:r.headers()['x-robots-tag'],contentType:r.headers()['content-type'],bodyBytes:(await r.body()).length});}}
 report.artifactAfter=await artifact();report.sourceStable=report.artifactBefore.sourceSha===report.artifactAfter.sourceSha;report.completed=report.rows.every(x=>x.observed);save();await browser.close();
})().catch(e=>{report.runnerFailure=String(e.message).slice(0,1100);save();console.error(report.runnerFailure);process.exitCode=1;});
