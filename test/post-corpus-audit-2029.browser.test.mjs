import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createServer } from 'vite';
import { analyzePostBatch, writeAuditReports } from '../scripts/audit-posts-one-tree-2029.mjs';

const require=createRequire(import.meta.url); let playwright;try{playwright=require('playwright');}catch{}

test('offline corpus audit respects public boundaries, method identity, card ownership and safe local review', {skip:!playwright,timeout:30000},async()=>{
  const output=mkdtempSync(join(tmpdir(),'post-corpus-audit-'));
  const server=await createServer({root:resolve('.'),configFile:false,logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false},plugins:[{name:'audit-test',configureServer(vite){vite.middlewares.use((req,res,next)=>{if(req.url!=='/__audit__')return next();res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><body></body></html>');});}}]});
  await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
  const browser=await playwright.chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  try{
    const page=await browser.newPage(),external=[];
    await page.route('**/*',route=>{if(new URL(route.request().url()).origin===origin)return route.continue();external.push(route.request().url());return route.abort();});
    if(page.routeWebSocket)await page.routeWebSocket('**/*',socket=>socket.close());
    await page.goto(origin+'/__audit__');
    await page.exposeFunction('postAuditReadProfile',expression=>[{methodKey:'רגיל',displayLabel:'רגיל',computedValue:expression==='גבורה'?216:67,definitionVersion:1,lifecycleActive:true}]);
    const card=(id,score,quality)=>({id,slug:'card-'+id,title:'כרטיס '+id,numbers:[216],status:'approved',quality,meter_score:score,findings:[]});
    await page.evaluate(async cards=>{window.__postAudit={cards,reading:await import('/src/lib/research/post2029ReadingProjection.js'),series:await import('/src/lib/research/contentSeries2029Identity.js'),background:await import('/src/lib/research/postBackground2029.js'),character:await import('/src/lib/postCharacters2029.js'),depth:await import('/src/lib/research/contextDepthProjection2029.js')};},[card(1,10,null),card(2,99,5)]);
    const source={id:9999,slug:'audit-source',title:'</script><script>window.leaked=true</script>',source:'ai',tags:['216'],categories:[],modified:'2026-10-31T01:00:00Z',home_hidden:false,
      content:'<p id="known"><button data-gem="גבורה">גבורה</button> = 216 (רגיל)</p><p><b>(= שחקן 067)</b></p><p><button data-gem="ניאו">ניאו</button> = 67</p><p><button data-gem="חסר">חסר</button></p>'};
    const rows=await page.evaluate(analyzePostBatch,[source,{...source,id:9998,home_hidden:true},{...source,id:9997,tags:['טיוטה']},{...source,id:9996,tags:['פורום']},{...source,id:9995,source:'gpt-draft'}]);
    assert.equal(rows.length,1);const row=rows[0];assert.equal(row.id,9999);
    assert.equal(row.claims[0].engineCheck.resultMatch,'matched');assert.equal(row.claims[0].engineCheck.canonicalMethod,'רגיל');assert.equal(row.claims[0].engineCheck.steps,'not_tested');
    assert.equal(row.claims[1].engineCheck.resultMatch,'mismatch');assert.equal(row.claims[1].engineCheck.reason,'source_method_unresolved');assert.equal(row.claims[1].engineCheck.canonicalMethod,null);
    assert.equal(row.claims[2].engineCheck.resultMatch,'not_tested');assert.equal(row.claims[2].method,null);
    assert.deepEqual(row.convergenceCards.map(c=>c.id),['1','2']);assert.equal(row.convergenceCards[0].quality,null);assert.equal(row.convergenceCards[0].basis,'shared_number_indirect');assert.equal(row.quality,undefined);
    assert.equal(row.coverage.length,6);assert.equal(row.coverage.find(c=>c.key==='links').state,'not_tested');assert.equal(row.coverage.find(c=>c.key==='calculations').state,'partial');assert.equal(row.sourceGroups.length,1);
    const audit={summary:{posts:1,postsWithClaims:1,postsWithEqualityTextCandidates:1,claims:3,claimsWithDocumentedTuple:2,engineResults:{matched:1,not_tested:1,mismatch:1},backgrounds:{general:1},reviewFlags:{incomplete_calculation_context:1},postsWithConvergenceCards:1,distinctRepeatedArtifactRefs:0},posts:rows};
    writeAuditReports(audit,output);
    const html=readFileSync(join(output,'posts-map.html'),'utf8');await page.setContent(html);
    assert.equal(await page.evaluate(()=>window.leaked),undefined);assert.equal(await page.locator('script').count(),1);
    assert.match(await page.locator('#rows').innerText(),/window.leaked=true/);assert.match(await page.locator('#status').innerText(),/^1 פוסטים/);
    await page.locator('#flag').selectOption('series_author_review');assert.match(await page.locator('#status').innerText(),/^0 פוסטים/);
    await page.getByRole('button',{name:'ניקוי',exact:true}).click();assert.match(await page.locator('#status').innerText(),/^1 פוסטים/);
    assert.deepEqual(external,[]);
  }finally{await browser.close();await server.close();rmSync(output,{recursive:true,force:true});}
});
