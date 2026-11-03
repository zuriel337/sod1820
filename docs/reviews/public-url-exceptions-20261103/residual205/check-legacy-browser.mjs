// Public, anonymous Legacy observations only; no writes, Auth or model calls.
import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const rows=JSON.parse(await readFile(new URL('../reconciliation.json',import.meta.url))).rows.filter(x=>x.status==='pending_decision'&&!x.sourceUrl.startsWith('/audio/'));
const out=process.argv[2]||'/tmp/residual205-legacy-browser';await mkdir(out,{recursive:true});
const report={kind:'residual12-anonymous-legacy-browser',liveWrites:0,sourceRows:12,cases:[],errors:[],denied:[]};
const proxy=process.env.HTTPS_PROXY||process.env.HTTP_PROXY;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],...(proxy?{proxy:{server:proxy}}:{})});
try{
 const context=await browser.newContext({viewport:{width:390,height:900},locale:'he-IL'});
 await context.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():(report.denied.push({method:route.request().method(),path:new URL(route.request().url()).pathname}),route.abort('blockedbyclient')));
 await context.addInitScript(()=>{navigator.sendBeacon=()=>false;window.WebSocket=class{constructor(){throw Error('readonly_review_socket_denied');}};});
 const page=await context.newPage();page.setDefaultTimeout(12000);
 for(const [i,row]of rows.entries()){
  const entry={sourceUrl:row.sourceUrl,synthetic:false,realAccount:false};report.cases.push(entry);
  try{
   const r=await page.goto('https://sod1820.co.il'+row.sourceUrl,{waitUntil:'domcontentloaded',timeout:30000});entry.httpStatus=r.status();
   // Wait for a real Post or a settled missing state, not only the HTML shell.
   await page.waitForFunction(()=>{const s=document.body.innerText;return /הפוסט לא נמצא|העמוד לא נמצא|לא מצאנו|הפוסט אינו|טיוטה|פורום|לא הצלחתי/.test(s)||!!document.querySelector('article [class*=post],article.post')},{timeout:8000}).catch(()=>{});
   entry.finalPath=new URL(page.url()).pathname;entry.headings=await page.locator('h1,h2').allTextContents();const text=await page.locator('body').innerText();entry.notFoundText=/הפוסט לא נמצא|העמוד לא נמצא|לא מצאנו|הפוסט אינו|לא הצלחתי/.test(text);entry.loginText=/התחבר.*לצפייה|צריך להתחבר|כניסה.*נדרש/.test(text);entry.bodyLength=text.length;
   // Four matching identities are drafts: do not copy their content/title into public evidence.
   if(['/lemi-ata-neeman-ot-umofet','/mataamim-1254','/raza-deshabbat-910','/shimon-haimov-english-gold'].includes(row.sourceUrl)){entry.headingsCount=entry.headings.length;delete entry.headings;entry.privateContentNotExported=true;}
   else entry.bodyExcerpt=text.slice(-650);
   entry.lookupResponses=await page.evaluate(()=>performance.getEntriesByType('resource').filter(x=>x.name.includes('/rest/v1/posts')).map(x=>({path:new URL(x.name).pathname,duration:Math.round(x.duration)})));
  }catch(e){entry.error=String(e.message).slice(0,300);}
  await writeFile(out+'/receipt.json',JSON.stringify(report,null,2));console.log(JSON.stringify({index:i+1,path:row.sourceUrl,status:entry.httpStatus,missing:entry.notFoundText,error:entry.error}));
 }
 await context.close();
}finally{await browser.close();await writeFile(out+'/receipt.json',JSON.stringify(report,null,2));}
