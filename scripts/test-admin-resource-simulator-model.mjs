import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS,FIELDS,SOURCES,normalize,price,simulate,freshState,parseState} from '../src/lib/admin/resourceSimulator.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<Math.max(1e-8,Math.abs(b)*1e-10),`${a} ≠ ${b}`);
const clean={...DEFAULTS,uploads:1,sizeMB:1000,keepOriginal:false,renditionPercent:100,variants:1,thumbnailKB:0,metadataKB:0,logKB:0,views:0,retries:0,cpuSeconds:0,wallSeconds:0,invocations:0};
test('storage averages uniform arrivals and retains cohorts without monthly charge overstatement',()=>{
 const s=simulate({...clean,retention:3});
 near(s.rows[0].storageEnd,30);near(s.rows[0].usage.storage,15);
 near(s.rows[1].usage.storage,45);near(s.rows[2].usage.storage,75);
 near(s.rows[3].usage.storage,90);near(s.rows[11].storageEnd,90);
});
test('retention and monthly growth remove only expired cohorts',()=>{
 const s=simulate({...clean,retention:1,growth:100,months:3});
 near(s.rows[0].active,30);near(s.rows[1].active,60);near(s.rows[2].active,120);
 near(s.rows[1].avgActive,45);near(s.rows[2].avgActive,90);
});
test('the same quota is shared with baseline, incremental cost is after minus before',()=>{
 const s=simulate({...clean,baseStorage:90,includedStorage:100,storageRate:2});
 near(s.base.total,0);near(s.rows[0].total,10);near(s.rows[0].delta,10);
 const above=simulate({...clean,baseStorage:120,includedStorage:100,storageRate:2});
 near(above.base.total,40);near(above.rows[0].total,70);near(above.rows[0].delta,30);
});
test('cached and uncached traffic have independent quotas; metadata bypasses media cache',()=>{
 const r=simulate({...clean,sizeMB:100,views:100,watched:100,cache:80,metadataKB:10,includedCached:100,includedUncached:100,cachedRate:3,uncachedRate:9}).rows[0];
 near(r.usage.cached,120);near(r.usage.uncached,30.015);
 near(r.costs.cached,60);near(r.costs.uncached,0);
});
test('embed excludes video storage, ingress and media egress while including thumbnails and metadata',()=>{
 const r=simulate({...clean,mode:'embed',thumbnailKB:200,metadataKB:10,views:100,watched:100,cache:50}).rows[0];
 near(r.storageEnd,0.006);near(r.ingress,0);near(r.mediaGB,0);near(r.usage.cached,0.15);near(r.usage.uncached,0.165);
});
test('retries increase transport and processing, but not stored duplicates or AI duration per source',()=>{
 const r=simulate({...clean,sizeMB:30,retries:50,cpuSeconds:10,wallSeconds:20,memoryGB:2,invocations:2,aiEnabled:true,duration:120}).rows[0];
 near(r.attempts,45);near(r.ingress,1.35);near(r.storageEnd,0.9);
 near(r.usage.cpu,0.125);near(r.usage.memory,0.5);near(r.usage.calls,90);near(r.aiMinutes,90);
});
test('variants increase storage without multiplying playback',()=>{
 const one=simulate({...clean,views:10,sizeMB:30,watched:100,variants:1}).rows[0];
 const three=simulate({...clean,views:10,sizeMB:30,watched:100,variants:3}).rows[0];
 near(three.storageEnd,one.storageEnd*3);near(three.servedGB,one.servedGB);
});
test('proxy is a separately selected network hop, never a second storage meter',()=>{
 const direct=simulate({...clean,views:10,sizeMB:30,watched:100,proxyRate:1}).rows[0];
 near(direct.proxyGB,0);
 const proxy=simulate({...clean,views:10,sizeMB:30,watched:100,proxyUpload:true,proxyViews:true,proxyRate:1}).rows[0];
 near(proxy.proxyGB,proxy.ingress+proxy.servedGB+proxy.metadataGB);
 near(proxy.usage.uncached+proxy.usage.cached,direct.usage.uncached+direct.usage.cached);
 near(proxy.total-direct.total,proxy.proxyGB);
});
test('credit applies only to compute once and cannot make total negative',()=>{
 const v={...DEFAULTS,baseCPU:10,cpuRate:1,baseStorage:10,storageRate:1,computeCredit:15,fixedMonthly:20};
 const baseline=price(v);near(baseline.total,30);
 const after=price(v,{cpu:10});near(after.total,35);near(after.total-baseline.total,5);
 assert.ok(price({...v,computeCredit:1000}).total>=0);
});
test('no uploads still preserves baseline and explicitly entered new subscription fees',()=>{
 const s=simulate({...DEFAULTS,uploads:0,fixedMonthly:45,serviceMonthly:7,extraMonthly:3});
 near(s.base.total,45);near(s.rows[0].delta,10);near(s.rows[0].storageEnd,0);near(s.cumulativeDelta,120);
});
test('sensitivity recalculates quota effects rather than scaling the dollar result',()=>{
 const v={...clean,baseStorage:90,includedStorage:100,storageRate:1};
 near(simulate(v,0.5).rows[0].delta,0);near(simulate(v,1).rows[0].delta,5);near(simulate(v,1.5).rows[0].delta,12.5);
});
test('JSON state export/import preserves assumptions, provenance and saved snapshots',()=>{
 const s=freshState();s.values.uploads=37;s.provenance.uploads='user';s.currency='ILS';s.scenarioName='בדיקה';
 s.saved.push({name:'צילום ראשון',values:{...s.values},provenance:{...s.provenance}});
 const roundtrip=parseState(JSON.parse(JSON.stringify(s)));assert.deepEqual(roundtrip,s);
 roundtrip.values.uploads=99;assert.equal(roundtrip.saved[0].values.uploads,37);
 assert.throws(()=>parseState({version:7}));
});
test('defaults distinguish reference prices from example assumptions; imported references require a source',()=>{
 const s=freshState();assert.equal(s.provenance.uploads,'example');assert.equal(s.provenance.cpuRate,'reference');
 s.provenance.uploads='reference';assert.equal(parseState(s).provenance.uploads,'example');
 assert.ok(Object.keys(SOURCES).every(k=>FIELDS.some(f=>f[0]===k)));
});
test('invalid inputs normalize to bounded finite outputs, extreme modeled horizons remain finite',()=>{
 const v=normalize({uploads:-20,cache:500,sizeMB:Infinity,months:500});
 assert.equal(v.uploads,0);assert.equal(v.cache,100);assert.equal(v.sizeMB,DEFAULTS.sizeMB);assert.equal(v.months,24);
 const r=simulate({...DEFAULTS,uploads:10000,sizeMB:10000,views:1000000,growth:100,months:24}).rows;
 assert.ok(r.every(x=>Number.isFinite(x.total)&&Number.isFinite(x.storageEnd)&&x.delta>=0));
});
