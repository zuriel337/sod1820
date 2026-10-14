// Synthetic guard inputs ONLY, never timing evidence or a live database substitute.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,readFileSync}from'node:fs';
import{tmpdir}from'node:os';
import{join}from'node:path';
import{spawnSync}from'node:child_process';
const script=new URL('../scripts/perf-navigation-2029/compare.mjs',import.meta.url).pathname;
function data(){return{mode:'replay',runtime:'unit-only',runs:7,profile:{cpu:4,viewport:{width:390,height:844}},fixtureSha256:'same-unit-snapshot',samples:Array.from({length:7},(_,sample)=>({sample,path:'/world',errors:[],misses:[],reads:[{key:'unit public read',hash:'unchanged'}],measures:[{name:'actual-click',readyMs:1000,metrics:{TaskDuration:50,ScriptDuration:20,LayoutDuration:5},storage:[],frames:[{ms:16.7}],longTasks:[],trustedClicks:[{trusted:true}]}]}))};}
function check(before,after){const dir=mkdtempSync(join(tmpdir(),'navigation-guard-unit-'));try{writeFileSync(join(dir,'before.json'),JSON.stringify(before));writeFileSync(join(dir,'after.json'),JSON.stringify(after));const r=spawnSync(process.execPath,[script,join(dir,'before.json'),join(dir,'after.json'),join(dir,'out.json')],{encoding:'utf8'});return{status:r.status,out:r.status===0?JSON.parse(readFileSync(join(dir,'out.json'))):null};}finally{rmSync(dir,{recursive:true,force:true});}}
test('matched complete trusted-input replay accepted',()=>assert.equal(check(data(),data()).status,0));
test('runtime failure, fixture miss and failed primary cannot masquerade as fast content',()=>{for(const change of [s=>s.errors.push('failure'),s=>s.misses.push('unmapped'),s=>s.failedPrimary=true]){const a=data();change(a.samples[0]);assert.notEqual(check(data(),a).status,0);}});
test('synthetic click and fewer than seven samples are rejected',()=>{const a=data();a.samples[0].measures[0].trustedClicks[0].trusted=false;assert.notEqual(check(data(),a).status,0);a.samples=data().samples.slice(0,6);assert.notEqual(check(data(),a).status,0);});
test('hosted/fixture, profile and snapshot mismatches are rejected',()=>{for(const change of [a=>a.mode='hosted',a=>a.profile.cpu=1,a=>a.fixtureSha256='different']){const a=data();change(a);assert.notEqual(check(data(),a).status,0);}});
test('slower transitions and extra repeated reads fail regression gate',()=>{const a=data();a.samples.forEach(s=>s.measures[0].readyMs=1300);assert.notEqual(check(data(),a).status,0);const b=data();b.samples.forEach(s=>s.reads.push({key:'extra',hash:'extra'}));assert.notEqual(check(data(),b).status,0);});
test('same query with changed response bytes fails parity',()=>{const a=data();a.samples.forEach(s=>s.reads[0].hash='changed');assert.notEqual(check(data(),a).status,0);});
