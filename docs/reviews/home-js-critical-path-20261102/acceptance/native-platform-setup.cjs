// Protected access comparison without executing the returned application HTML.
// Cookie names/metadata only; no cookie values, token values, raw HTML or headers.
const {chromium}=require('@playwright/test');
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const [baselinePath,candidatePath,out]=process.argv.slice(2);
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:false,...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});const report={kind:'protected-access-platform-setup-comparison',applicationExecuted:false,rawHtmlRetained:false,cookieValuesRetained:false,cases:[]};
 try{for(const path of[baselinePath,candidatePath]){
  const cfg=JSON.parse(fs.readFileSync(path,'utf8')),item={sha:cfg.sha,origin:cfg.origin};report.cases.push(item);const context=await browser.newContext({viewport:{width:390,height:900},locale:'he-IL'});
  try{
   const access=new URL(cfg.accessUrl);item.accessSetup={host:access.hostname,path:access.pathname,queryKeys:[...access.searchParams.keys()]};const accessResponse=await context.request.get(cfg.accessUrl);item.accessStatus=accessResponse.status();
   const id=await context.request.get(cfg.origin+'/preview-identity.json');assert.equal(id.status(),200);assert.equal((await id.json()).sha,cfg.sha);item.identityVerified=true;
   const response=await context.request.get(cfg.origin+'/?home-js-diagnostic=1'),html=await response.text();item.documentStatus=response.status();item.htmlBytes=Buffer.byteLength(html);item.htmlSha256=hash(html);
   item.scriptTags=[...html.matchAll(/<script\b[^>]*>/gi)].map(m=>{
    const tag=m[0],attrs={};for(const a of tag.matchAll(/\s([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)){const key=a[1],value=a[2]??a[3]??a[4]??'';if(key==='src'){const u=new URL(value,cfg.origin);attrs.src=u.origin+u.pathname;}else if(['true','false','module',''].includes(value))attrs[key]=value;else attrs[key]={length:value.length,sha256:hash(value)};}return attrs;
   });
   item.cookies=(await context.cookies()).map(c=>({name:c.name,domain:c.domain,path:c.path,secure:c.secure,httpOnly:c.httpOnly,sameSite:c.sameSite}));item.platformText={feedbackScript:html.includes('/_next-live/feedback/feedback.js'),vercelLive:html.includes('vercel.live'),vercelToolbar:html.includes('vercel-toolbar')};item.ok=true;
  }catch(e){item.ok=false;item.failure={name:e.name,message:String(e.message).replace(/_vercel_share=[^\s"')&]+/g,'_vercel_share=[REDACTED]').slice(0,500)};}finally{await context.close();}
 }}finally{await browser.close();fs.mkdirSync(out,{recursive:true,mode:0o700});report.ok=report.cases.every(c=>c.ok);fs.writeFileSync(out+'/setup.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
})().catch(e=>{console.error(e.name);process.exitCode=1;});
