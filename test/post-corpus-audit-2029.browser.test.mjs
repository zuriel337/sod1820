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
    assert.equal(row.claims[1].engineCheck.resultMatch,'not_tested');assert.equal(row.claims[1].method,null);
    assert.equal(row.claims[2].engineCheck.resultMatch,'not_tested');assert.equal(row.claims[2].method,null);
    assert.deepEqual(row.convergenceCards.map(c=>c.id),['1','2']);assert.equal(row.convergenceCards[0].quality,null);assert.equal(row.convergenceCards[0].basis,'shared_number_indirect');assert.equal(row.quality,undefined);
    assert.equal(row.coverage.length,6);assert.equal(row.coverage.find(c=>c.key==='links').state,'not_tested');assert.equal(row.coverage.find(c=>c.key==='calculations').state,'partial');assert.equal(row.sourceGroups.length,1);
    const proof=await page.evaluate(async()=>{
      const reading=window.__postAudit.reading;
      const content='<h2 id="repeated">פרק א</h2><p><b id="mark" data-gem="גבורה">גבורה</b> = 216 (רגיל)</p><h2 id="repeated">פרק ב</h2><p><b id="mark" data-gem="ניאו">ניאו</b> = 67 (רגיל)</p>'
        +'<div class="sod-gematria-box"><div class="gb-title">כותרת המקור</div><div class="gb-rows"><div><b>216</b> = גבורה</div></div><div class="gb-note">השוויון בגימטריה רגילה אומת במנוע.</div></div>'
        +'<div class="sod-gematria-box"><div class="gb-rows"><div><b>67</b> = ניאו</div></div><div class="gb-note">הערך במקור ללא תיעוד שיטה.</div></div>'
        +'<span data-expression="ניאו" data-method="רגיל" data-result="67">טענה עתידית ללא מזהה</span>'
        +'<p id="" style="font-size:9px">כיתוב מקור קטן</p><p id="">מזהה מקור ריק</p><img src="/source.png">';
      const post={id:12345,slug:'future-template',content,source:'ai',tags:[],modified:'2026-10-31T03:00:00Z'};
      const root=document.createElement('div');root.innerHTML=content;
      const legacy=await reading.collectPostLegacyOccurrences2029(post,root),annotations=reading.collectPostCalculationOccurrences2029(post,root);
      const firstLocators=legacy.map(c=>c.locator);
      const repeated=await reading.collectPostLegacyOccurrences2029(post,root);
      const client={from(){const query={select(){return query},eq(){return query},limit(){return query},then(resolve){return Promise.resolve({data:[post],error:null}).then(resolve)}};return query}};
      const checks=[];for(const claim of [...legacy,...annotations])checks.push(await reading.checkPostCalculation2029(post,claim,{client,profileReader:window.postAuditReadProfile,sourceDocument:document}));
      const ids=[...root.querySelectorAll('[id]')].map(n=>n.id),counts=Object.fromEntries(ids.map(id=>[id,ids.filter(x=>x===id).length]));
      return {legacy:legacy.map(c=>({binding:c.binding,expression:c.expression,method:c.method,precision:c.locatorPrecision})),annotations:annotations.map(c=>({precision:c.locatorPrecision,locator:c.locator})),checks:checks.map(c=>({status:c.status,result:c.resultMatch,steps:c.steps})),sameLocators:JSON.stringify(firstLocators)===JSON.stringify(repeated.map(c=>c.locator)),duplicateIds:ids.filter(id=>counts[id]>1),firstNativeId:root.querySelector('h2').id,sourceUnchanged:post.content===content,
        absentMethodButtons:root.querySelectorAll('.sod-gematria-box:nth-of-type(2) [data-post-box-operand]').length,
        textFloor:root.querySelector('[data-post-text-floor]')?.dataset.postTextFloor,alt:root.querySelector('img').alt};
    });
    assert.equal(proof.sourceUnchanged,true);assert.equal(proof.sameLocators,true);assert.deepEqual(proof.duplicateIds,[]);assert.equal(proof.firstNativeId,'repeated');
    assert.equal(proof.legacy.length,4);assert.equal(proof.legacy[2].binding,'authored_gematria_box');assert.equal(proof.legacy[2].precision,'snapshot_bound_occurrence');assert.equal(proof.absentMethodButtons,1);assert.equal(proof.legacy[3].method,null);
    assert.equal(proof.annotations[0].precision,'snapshot_bound_occurrence');assert.equal(proof.checks.filter(c=>c.result==='matched').length,4);assert.equal(proof.checks.filter(c=>c.result==='not_tested').length,1);assert.ok(proof.checks.every(c=>c.steps==='not_tested'));assert.ok(proof.textFloor);assert.match(proof.alt,/תיאור תוכן לא סופק/);
    const cssContainment=await page.evaluate(()=>{
      const input='<link rel="stylesheet" href="https://example.invalid/legacy.css"><script src="https://example.invalid/plugin.js"></script><style>body{background:rgb(255,0,0)}.inside,:is(.alternate,.extra){color:rgb(0,128,0)}@media(min-width:1px){.inside::before{content:"מקור"}}</style><div class="inside">תוכן מקור</div>';
      const html=window.__postAudit.reading.postReadingHtml2029(input),outside=document.createElement('div');outside.className='inside';document.body.append(outside);
      const before=getComputedStyle(outside).color,bodyBefore=getComputedStyle(document.body).backgroundColor;
      const source=document.createElement('div');source.className='sod29-reading-source';source.innerHTML=html;document.body.append(source);
      const artifacts=window.__postAudit.reading.postReadingHtml2029('<div class="loading"><img src="https://example.invalid/wp-content/plugins/gallery-images/loading.gif"></div><img src="/evidence.png">');
      const result={scripts:source.querySelectorAll('script').length,links:source.querySelectorAll('link').length,scoped:source.querySelector('style')?.textContent.includes('.sod29-reading-source :is(.alternate, .extra)'),outsideUnchanged:getComputedStyle(outside).color===before,bodyUnchanged:getComputedStyle(document.body).backgroundColor===bodyBefore,inside:getComputedStyle(source.querySelector('.inside')).color,sourceUnchanged:input.includes('https://example.invalid/legacy.css'),spinnerRemoved:!artifacts.includes('loading.gif'),evidenceKept:artifacts.includes('/evidence.png')};
      source.remove();outside.remove();return result;
    });
    assert.equal(cssContainment.scripts,0);assert.equal(cssContainment.links,0);assert.equal(cssContainment.outsideUnchanged,true);assert.equal(cssContainment.bodyUnchanged,true);assert.equal(cssContainment.inside,'rgb(0, 128, 0)');assert.equal(cssContainment.scoped,true);assert.equal(cssContainment.sourceUnchanged,true);
    assert.equal(cssContainment.spinnerRemoved,true);assert.equal(cssContainment.evidenceKept,true);
    const audit={summary:{posts:1,postsWithClaims:1,postsWithEqualityTextCandidates:1,claims:3,claimsWithDocumentedTuple:1,engineResults:{matched:1,not_tested:2},backgrounds:{general:1},reviewFlags:{incomplete_calculation_context:1},postsWithConvergenceCards:1,distinctRepeatedArtifactRefs:0},posts:rows};
    writeAuditReports(audit,output);
    const html=readFileSync(join(output,'posts-map.html'),'utf8');await page.setContent(html);
    assert.equal(await page.evaluate(()=>window.leaked),undefined);assert.equal(await page.locator('script').count(),1);
    assert.match(await page.locator('#rows').innerText(),/window.leaked=true/);assert.match(await page.locator('#status').innerText(),/^1 פוסטים/);
    await page.locator('#flag').selectOption('series_author_review');assert.match(await page.locator('#status').innerText(),/^0 פוסטים/);
    await page.getByRole('button',{name:'ניקוי',exact:true}).click();assert.match(await page.locator('#status').innerText(),/^1 פוסטים/);
    assert.deepEqual(external,[]);
  }finally{await browser.close();await server.close();rmSync(output,{recursive:true,force:true});}
});
