import test from 'node:test';
import assert from 'node:assert/strict';
import {contextNavigationItems2029 as project} from '../src/components/experience2029/razielSessionSeam2029.js';
import {normalizeResearchContext,mergeResearchContext} from '../src/lib/research/researchContext.js';
const image='7287ad08-1c7b-4642-a5c4-cecbbaf35b81';
const galleryHref='/world?view=gallery&gallery=105';
const imageHref=galleryHref+'&image='+image+'#gallery-source-'+image;
const previous={subject:{id:'105',type:'gallery',label:'גלריית דוד 24',href:galleryHref},
 selection:{entityId:image,entityType:'image',locator:'#gallery-source-'+image},
 dimensions:{surfaceFocus:{id:image,type:'image',label:'המטוס מדובאי · 14,000',locator:'#gallery-source-'+image,href:imageHref}},
 returnTo:{href:'/topic/1237#sources',label:'התגלות'},journey:{kind:'research_path',id:'10000000-0000-4000-8000-000000000001'}};
test('World never labels the previous gallery/image as current reading, but keeps exact usable links',()=>{
 const snapshot=JSON.stringify(previous),rows=project(previous,{currentHref:'/world',pageTitle:'העולם'});
 assert.equal(rows.find(r=>r.key==='subject').prefix,'במסלול');
 assert.equal(rows.find(r=>r.key==='selection').prefix,'בחירה קודמת');
 assert.equal(rows.find(r=>r.key==='selection').href,imageHref);
 assert.equal(rows.find(r=>r.key==='return').href,previous.returnTo.href);
 assert.equal(JSON.stringify(previous),snapshot);
});
test('the public story can be current without changing subject, selection, Path or exact return',()=>{
 const dimensions={readingFocus:{id:'world-plane-story',type:'post',label:'סיפור המטוס',href:'/post/flight',locator:'#world-plane-story'},readingFocusSurfaceHref:'/world'};
 const current=mergeResearchContext(previous,{dimensions}),before=normalizeResearchContext(previous);
 assert.equal(before.journey.kind,'research_path');assert.ok(before.returnTo.href);
 for(const k of ['subject','selection','journey','returnTo'])assert.deepEqual(current[k],before[k]);
 const rows=project(current,{currentHref:'/world',pageTitle:'העולם'});
 assert.equal(rows.find(r=>r.key==='reading').prefix,'המקור שמוצג כאן');
 assert.equal(rows.find(r=>r.key==='reading').href,'/post/flight');
 assert.equal(rows.find(r=>r.key==='subject').href,galleryHref);
 const moved=project(current,{currentHref:'/world?view=gallery&gallery=105',pageTitle:'גלריות'});
 assert.equal(moved.find(r=>r.key==='reading').prefix,'בחירה קודמת');
});
test('exact expression/method query survives; missing destinations are not invented',()=>{
 const href='/2029/number/1237?expr=example&method=misratar#number-methods';
 const c={subject:{id:'1237',type:'number',label:'1237',href},dimensions:{surfaceFocus:{label:'תוצאה',locator:'#x'}},selection:{locator:'#x'}};
 const rows=project(c,{currentHref:'/world',pageTitle:'העולם'});
 assert.equal(rows.find(r=>r.key==='subject').href,href);assert.equal(rows.find(r=>r.key==='selection').href,null);
});
test('unsafe destinations never become context links; opaque IDs are not labels',()=>{
 for(const href of ['//evil.example','https://evil.example','javascript:alert(1)','/admin','/api/x','/world?view=admin','/world?_vercel_share=secret','/world?access_token=secret','/world\\evil','/%2fevil']){
  assert.equal(project({subject:{label:'מקור',href}},{currentHref:'/world'}).find(r=>r.key==='subject').href,null,href);
 }
 assert.ok(!project({subject:{label:image,href:imageHref}},{currentHref:'/world'}).some(r=>r.key==='subject'));
});
