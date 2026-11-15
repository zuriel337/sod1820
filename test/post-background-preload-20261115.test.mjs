import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { setImmediate as tick } from 'node:timers/promises';
import { build } from 'esbuild';
import { preloadPostBackground2029, postBackground2029 } from '../src/lib/research/postBackground2029.js';

function dom({theme='dark',narrow=true}={}) {
  const links=[];
  return {links,doc:{documentElement:{getAttribute:()=>theme},head:{querySelector:q=>links.find(x=>q.includes(x.href)),appendChild:l=>links.push(l)},createElement:()=>({})},
    win:{matchMedia:q=>{assert.equal(q,'(max-width:760px)');return {matches:narrow};}}};
}
test('preload matches the exact adopted CSS image for the source series and viewport, and deduplicates',()=>{
  for(const narrow of [true,false])for(const post of [{categories:['סוד החשמל']},{categories:['מימד חמש'],author:'בדרך לנצח'},{author:'אלון לוי'},{}]){
    const d=dom({narrow});preloadPostBackground2029(post,d);preloadPostBackground2029(post,d);
    assert.equal(d.links.length,1);assert.equal(d.links[0].href,postBackground2029(post)[narrow?'mobile':'desktop']);
    assert.equal(d.links[0].as,'image');assert.equal(d.links[0].fetchPriority,'high');
  }
});
test('light and parchment do not download an unused backdrop; unavailable DOM is harmless',()=>{
  for(const theme of ['light','parchment',null]){const d=dom({theme});preloadPostBackground2029({},d);assert.equal(d.links.length,0);}
  assert.doesNotThrow(()=>preloadPostBackground2029({},{doc:null,win:null}));
});

const compiled=await build({entryPoints:['src/lib/research/post2029ReadingProjection.js'],bundle:true,write:false,format:'cjs',platform:'node',
  plugins:[{name:'read-only-post-fixture',setup(b){b.onResolve({filter:/\/supabase\.js$/},()=>({path:'fixture',namespace:'post-fixture'}));
    b.onLoad({filter:/.*/,namespace:'post-fixture'},()=>({contents:'export const supabase={rpc:(...args)=>globalThis.rpc(...args)}; export const getPostBySlug=()=>null;'}));}}]});
test('the real reader starts the backdrop before a pending canonical calculation, preserving the final source',async()=>{
  const d=dom();let release,started=false,settled=false;
  const row={id:90001,slug:'remzei-geula-ai-sod-hashir',title:'Public source',content:'<p>Original</p>',source:'sod1820',categories:['סוד החשמל']};
  const c={module:{exports:{}},exports:{},document:d.doc,window:d.win,DOMException,
    rpc:()=>{started=true;return new Promise(r=>release=r);}};c.exports=c.module.exports;
  vm.runInNewContext(compiled.outputFiles[0].text,c);
  const promise=c.module.exports.fetchPost2029ReadingProjection(row.slug,{readPost:async()=>row}).then(x=>{settled=true;return x;});
  await tick();assert.ok(started);assert.equal(settled,false);assert.equal(d.links.length,1,'fetch begins while calculation is still pending');
  release({data:787});const projection=await promise;assert.equal(projection.sourcePost,row);assert.equal(projection.post.content,row.content);
});
test('the real reader never preloads denied sources, invitations, or an already cancelled read',async()=>{
  for(const kind of ['draft','suppressed','invitation','cancelled']){
    const d=dom();const c={module:{exports:{}},exports:{},document:d.doc,window:d.win,DOMException};c.exports=c.module.exports;
    vm.runInNewContext(compiled.outputFiles[0].text,c);
    const row={id:90002,slug:'ordinary',title:'Fixture',source:kind==='draft'?'gpt-draft':'sod1820',tags:kind==='suppressed'?['טיוטה']:[],content:'<p>Original</p>'};
    const promise=c.module.exports.fetchPost2029ReadingProjection(row.slug,{readPost:async()=>row,sourceInvitation:kind==='invitation',signal:{aborted:kind==='cancelled'}});
    if(kind==='cancelled')await assert.rejects(promise,e=>e.name==='AbortError');else await promise;
    assert.equal(d.links.length,0,kind);
  }
});
