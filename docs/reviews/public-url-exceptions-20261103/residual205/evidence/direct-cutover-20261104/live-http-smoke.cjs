const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}}:{})});
 const context=await browser.newContext();const rows=[];
 const cases=[['/',200,'index'],['/world',200,'index'],['/post',200,'index'],['/gematria',200,'index'],['/gematria?q=%D7%9E%D7%A9%D7%99%D7%97',200,'noindex'],['/number/1820',200,'index'],['/privacy',200,'index'],['/updates',200,'noindex'],['/community/chat',200,'noindex'],['/sitemap.xml',200,null],['/robots.txt',200,null],['/not-a-real-page-2029-cutover-9dc02d7b',404,'noindex']];
 for(const [path,status,robots]of cases){
  for(const method of ['GET','HEAD']){
   const row={path,method};rows.push(row);
   try{const res=await context.request.fetch('https://sod1820.co.il'+path,{method,maxRedirects:0});row.status=res.status();row.robots=res.headers()['x-robots-tag'];assert.equal(row.status,status);
    if(robots)assert.match(row.robots||'',robots==='index'?/^index\b/:/^noindex\b/);
    if(method==='GET'&&path==='/robots.txt'){const body=await res.text();assert.ok(!/^Disallow:\s*\/\s*$/m.test(body));assert.ok(body.includes('https://sod1820.co.il/sitemap.xml'));}
    if(method==='GET'&&path==='/sitemap.xml'){const body=await res.text();assert.ok(/<(urlset|sitemapindex)\b/.test(body));assert.ok(body.includes('https://sod1820.co.il/'));assert.ok(!body.includes('vercel.app'));}
    row.passed=true;
   }catch(e){row.passed=false;row.failure=e.message.slice(0,500);}
  }
 }
 const report={origin:'https://sod1820.co.il',sourceSha:'1bc8260adaa889d7903aaa33ef43510df09817f2',deploymentId:'dpl_CkoiEsaT1UJ7rAZuzYE7i79noi9A',anonymous:true,grantUsed:false,productWrites:0,modelCalls:0,rows,passed:rows.filter(r=>r.passed).length};report.ok=report.passed===24;fs.writeFileSync('/tmp/direct-live-http-smoke.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();process.exitCode=report.ok?0:1;
})().catch(e=>{console.error(e.message);process.exitCode=1});
