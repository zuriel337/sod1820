import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';

const compiled = await build({entryPoints:['src/lib/analytics.js'],bundle:true,write:false,format:'cjs',platform:'node',
  define:{'import.meta.env.VITE_GA_ID':'"G-TEST"'}});
function fixture(path='/post/current?utm_source=newsletter&utm_medium=email&utm_campaign=november&q=PRIVATE') {
  const location=new URL(path,'https://sod1820.co.il');
  const title={textContent:'Previous page',dataset:{analyticsRoute:'/post/previous',analyticsPath:'/post/previous',analyticsPublic:'true'}};
  const scripts=[],timers=new Map();let nextTimer=0,notify=()=>{},disconnected=false;
  const doc={title:'Previous page',referrer:'https://example.org/search?q=PRIVATE',head:{querySelector:()=>title,appendChild:e=>scripts.push(e)},createElement:()=>({})};
  const context={module:{exports:{}},exports:{},URL,window:{location,dataLayer:[]},document:doc,
    setTimeout:fn=>{timers.set(++nextTimer,fn);return nextTimer;},clearTimeout:id=>timers.delete(id),
    MutationObserver:class {constructor(fn){notify=fn;}observe(){}disconnect(){disconnected=true;}}};
  context.exports=context.module.exports;vm.runInNewContext(compiled.outputFiles[0].text,context);
  const api=context.module.exports;api.initGA({publicReading:true,path:location.pathname});
  return {api,title,doc,scripts,context,timers,notify:()=>notify(),get disconnected(){return disconnected;},
    views:()=>context.window.dataLayer.map(x=>Array.from(x)).filter(x=>x[0]==='event'&&x[1]==='page_view').map(x=>JSON.parse(JSON.stringify(x[2]))),
    ready:(canonical=location.pathname,label='Current public article · SOD1820',isPublic=true)=>{
      title.textContent=label;title.dataset={analyticsRoute:location.pathname,analyticsPath:canonical,analyticsPublic:String(isPublic)};notify();
    }};
}

test('a slow source cannot send the previous title; its resolved public identity is emitted once',()=>{
  const f=fixture();f.api.trackPageview(f.context.window.location.pathname,{publicReading:true});
  assert.equal(f.views().length,0);f.ready();f.notify();
  assert.equal(f.views().length,1);assert.equal(f.views()[0].page_title,'Current public article · SOD1820');
  assert.equal(f.views()[0].page_path,'/post/current');assert.equal(f.views()[0].send_to,'G-TEST');
  assert.equal(f.timers.size,0);assert.ok(f.disconnected);
});
test('external source and explicit campaign fields survive without the raw query or referrer search',()=>{
  const f=fixture();f.ready();f.api.trackPageview('/post/current',{publicReading:true});
  const v=f.views()[0];assert.equal(v.page_location,'https://sod1820.co.il/post/current');
  assert.equal(v.page_referrer,'https://example.org/');assert.equal(v.campaign_source,'newsletter');
  assert.equal(v.campaign_medium,'email');assert.equal(v.campaign_name,'november');assert.ok(!JSON.stringify(v).includes('PRIVATE'));
});
test('cleanup cancels a pending page, including late metadata and timeout callbacks',()=>{
  const f=fixture();const stop=f.api.trackPageview('/post/current',{publicReading:true});
  const pending=[...f.timers.values()];stop();f.ready();pending.forEach(fn=>fn());assert.equal(f.views().length,0);
});
test('the www alias is not counted as an external referrer; invalid campaign values are omitted',()=>{
  const f=fixture('/post/current?utm_source='+ 'x'.repeat(201)+'&utm_medium=line%0Abreak');
  f.doc.referrer='https://www.sod1820.co.il/post/previous';f.ready();f.api.trackPageview('/post/current',{publicReading:true});
  assert.equal(f.views()[0].page_referrer,'');assert.equal(f.views()[0].campaign_source,undefined);assert.equal(f.views()[0].campaign_medium,undefined);
});
test('a source which never finishes gets one bounded family fallback, never a stale title',()=>{
  const f=fixture();f.api.trackPageview('/post/current',{publicReading:true});[...f.timers.values()].forEach(fn=>fn());
  f.ready();assert.equal(f.views().length,1);assert.equal(f.views()[0].page_path,'/post/:item');assert.equal(f.views()[0].page_title,'SOD1820');
});
test('root article permalinks use the canonical identity already supplied by the SEO owner',()=>{
  const f=fixture('/post/old-slug');f.ready('/old-slug/');f.api.trackPageview('/post/old-slug',{publicReading:true});
  assert.equal(f.views()[0].page_path,'/old-slug/');
});
test('the current route loading title does not finish the page view before public SEO resolves',()=>{
  const f=fixture();f.ready('/post/current','SOD1820 · פוסט',false);
  f.api.trackPageview('/post/current',{publicReading:true});assert.equal(f.views().length,0);
  f.ready();assert.equal(f.views()[0].page_title,'Current public article · SOD1820');
});
test('public numeric identities can be distinguished while free expressions and draft titles remain grouped',()=>{
  for(const [path,publicTitle,expected] of [['/number/73',true,'/number/73'],['/number/private-name',true,'/number/:value'],['/post/draft',false,'/post/:item']]){
    const f=fixture(path);f.ready(path,'PRIVATE TITLE',publicTitle);f.api.trackPageview(path,{publicReading:true});
    if(!publicTitle)[...f.timers.values()].forEach(fn=>fn());
    assert.equal(f.views()[0].page_path,expected);
    if(expected.endsWith(':value')||!publicTitle)assert.ok(!JSON.stringify(f.views()).includes('PRIVATE TITLE'));
  }
});
test('account routes never initialize or send GA, and an external canonical cannot supply page identity',()=>{
  const hidden=fixture('/2029/me/research');hidden.api.trackPageview('/2029/me/research',{publicReading:true});
  assert.equal(hidden.scripts.length,0);assert.equal(hidden.views().length,0);
  const f=fixture();f.ready('//foreign.invalid/private');f.api.trackPageview('/post/current',{publicReading:true});
  assert.equal(f.views()[0].page_path,'/post/:item');
});
test('ordinary public page families retain their distinct title and canonical path',()=>{
  for(const path of ['/','/post','/world','/community/chat','/topic/public-topic','/book/public-book','/video/public-video','/writer/public-writer']){
    const f=fixture(path);f.ready(path,`Title for ${path}`);f.api.trackPageview(path,{publicReading:true});
    assert.equal(f.views()[0].page_path,path);assert.equal(f.views()[0].page_title,`Title for ${path}`);
  }
});
