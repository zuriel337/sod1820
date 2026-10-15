import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { prepareCurrentRouteCode2029 } from '../src/lib/criticalRouteCode2029.js';
import { currentRouteFiles2029 } from '../scripts/criticalRoutePreload2029.mjs';

const files = { home:['/assets/home.js','/assets/shared.js'],world:['/assets/world.js','/assets/shared.js'],post:['/assets/post.js','/assets/shared.js'] };
function browser(pathname, search = '', supports = true) {
  const links=[];
  const host={location:{pathname,search},fetch(){assert.fail('No data fetch permitted');},document:{
    createElement(){return {relList:{supports:()=>supports},getAttribute(k){return this[k];}};},
    querySelectorAll(){return links;},head:{appendChild(link){links.push(link);}},
  }};
  return {host,links};
}
test('only the current public route code is prepared; no data or evaluation',()=>{
  for(const [path,key] of [['/','home'],['/2029','home'],['/2029/','home'],['/world','world'],['/world/','world'],['/2029/world','world'],['/post/a','post'],['/post/%D7%90','post']]){
    const {host,links}=browser(path);
    prepareCurrentRouteCode2029(files,host);
    assert.deepEqual(links.map(l=>l.href),files[key]);
    assert.ok(links.every(l=>l.rel==='modulepreload'&&l.crossOrigin===''));
    prepareCurrentRouteCode2029(files,host);
    assert.equal(links.length,2,'Preparation must not duplicate resources');
  }
});
test('preview, private, unknown and unrelated routes remain demand loaded',()=>{
  for(const path of ['/control','/topic/a','/number/1','/post','/post/a/b','/world/a','/home-preview','/community','/preview']){
    const {host,links}=browser(path);prepareCurrentRouteCode2029(files,host);assert.deepEqual(links,[]);
  }
  for(const path of ['/','/2029']){
    const {host,links}=browser(path,'?preview=community');prepareCurrentRouteCode2029(files,host);assert.deepEqual(links,[]);
  }
});
test('unsupported or failing preparation leaves the existing lazy route path available',()=>{
  const {host,links}=browser('/world','',false);prepareCurrentRouteCode2029(files,host);assert.deepEqual(links,[]);
  assert.doesNotThrow(()=>prepareCurrentRouteCode2029(files,{get location(){throw new Error('unavailable');}}));
});
test('serialized build function runs without its source module or imports',()=>{
  const {host,links}=browser('/post/a');
  vm.runInNewContext(`(${prepareCurrentRouteCode2029.toString()})(${JSON.stringify(files)})`,{window:host,URLSearchParams});
  assert.deepEqual(links.map(l=>l.href),files.post);
});
test('build walks static dependencies only, handles cycles, and fails on missing routes',()=>{
  const chunk=(fileName,facadeModuleId,imports=[],dynamicImports=[])=>({type:'chunk',fileName,facadeModuleId,imports,dynamicImports});
  const bundle={
    'home.js':chunk('home.js','/repo/src/pages/Home2029Page.jsx',['shared.js'],['world.js']),
    'world.js':chunk('world.js','/repo/src/pages/World2029Page.jsx',['shared.js'],['stage.js']),
    'post.js':chunk('post.js','/repo/src/pages/Post2029Page.jsx',['shared.js']),
    'shared.js':chunk('shared.js',null,['shared.js']),
    'stage.js':chunk('stage.js',null),
  };
  assert.deepEqual(currentRouteFiles2029(bundle,'/assets/').world,['/assets/world.js','/assets/shared.js']);
  delete bundle['post.js'];assert.throws(()=>currentRouteFiles2029(bundle),/Missing 2029 route chunk: post/);
});
