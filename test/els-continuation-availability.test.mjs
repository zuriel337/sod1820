import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const code=readFileSync(new URL('../tools/els/els-code.template.html',import.meta.url),'utf8');
function source(name){const start=code.indexOf(`function ${name}(`);assert.ok(start>=0);let depth=0;for(let i=code.indexOf('{',start);i<code.length;i++){if(code[i]==='{')depth++;else if(code[i]==='}'&&--depth===0)return code.slice(start,i+1);}throw Error(name);}
function make(body,values={}){const c=vm.createContext(values);vm.runInContext(body,c);return c;}
const c=make(source('nativeSearchContinuation')+';this.project=nativeSearchContinuation');
const project=r=>JSON.parse(JSON.stringify(c.project(r)));

test('completed discovery never offers redundant low-skip continuation, regardless of the ordered page',()=>{
  for(const ordered of [null,{min:2,max:50,completeThrough:50},{min:2,max:50,error:'unavailable'},{min:2,max:50,hasMore:true}])
    assert.equal(project({discoveryComplete:true,capped:false,ordered}),null);
  assert.equal(project({capped:false}),null,'exact-only/unknown coverage cannot invent an unsearched range');
});
test('bounded search keeps real pages, retries and unsearched ranges without promising new hits',()=>{
  assert.deepEqual(project({capped:true}),{kind:'range',min:2,max:50});
  assert.deepEqual(project({capped:true,ordered:{min:2,max:50,completeThrough:50}}),{kind:'range',min:51,max:100});
  assert.deepEqual(project({capped:true,ordered:{min:451,max:500,completeThrough:500}}),null);
  assert.deepEqual(project({capped:true,ordered:{min:451,max:500,hasMore:true}}),{kind:'page',min:451,max:500});
  assert.deepEqual(project({ordered:{min:51,max:100,error:'unavailable'}}),{kind:'retry',min:51,max:100});
});
test('router marks exhaustion for both existing collectors, not an early probe and not a semantic negative',async()=>{
  for(const strategy of ['ANCHOR_FAST_V1','HYBRID_COVERAGE_V1'])for(const capped of [0,1]){
    const r=make('async '+source('routedDiscover')+';this.run=routedDiscover;',{
      norm:x=>x,st:{scope:'torah'},AD_PROBE_PAIRS:5,AD_PROBE_PAIRS_EXT:10,AD_POLICY:'fixture',
      stratProbeInit:()=>({sig:0,pairs:5}),stratProbeRun:()=>{},adChoose:()=>({strategy,extended:false}),
      stratCollect:()=>({hits:[],capped}),findAll:()=>({hits:[],capped}),
    });
    const result=await r.run('בדיקה',10);
    assert.equal(result.discoveryComplete,!capped);
    assert.equal(result.status,undefined);assert.equal(result.negative_authority,undefined);
  }
});
test('verification preserves execution coverage without manufacturing it for exact-only candidates',async()=>{
  const r=make('async '+source('promoteVerified')+';this.run=promoteVerified;',{st:{scope:'torah'}});
  for(const discoveryComplete of [true,false,undefined]){
    const result=await r.run({t:'בדיקה',hits:[],capped:false,discoveryComplete},'torah',null);
    assert.equal(result.discoveryComplete,discoveryComplete===true);
    assert.equal(result.vstate,'LOCAL_NO_HIT','exhaustion does not mint a canonical negative');
  }
});
test('completed or unknown continuation cannot trigger an engine call through a stale/manual action',async()=>{
  let callCount=0,finished;
  const r=make('async '+source('continueNativeSearch')+';this.run=continueNativeSearch;',{
    st:{res:{},crossMeetings:null},_matrixRequestSeq:1,hasGov:()=>true,
    nativeOccurrenceResults:()=>({id:'current',continuation:null}),
    operationStatus:(_op,status)=>{finished=status;},orderedSearchPage:()=>{callCount++;},
  });
  await r.run({setId:'current'},{});assert.equal(callCount,0);assert.equal(finished,'done');
});
