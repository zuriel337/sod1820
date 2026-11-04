import test from 'node:test';
import assert from 'node:assert/strict';
import {supabase} from '../src/lib/supabase.js';
import {fetchResearchObjectsForEntity} from '../src/lib/research/entityHubProjection.js';

test('Number projection issues each existing bounded research filter once and preserves distinct aliases; absent-node support is explicit',async()=>{
 const original=supabase.from,calls=[];
 supabase.from=table=>{
  assert.equal(table,'research_objects','this acceptance has no live network or writes');
  const call={table};calls.push(call);
  const query={select(){return query;},eq(key,value){call.filter=['eq',key,value];return query;},contains(key,value){call.filter=['contains',key,value];return query;},order(key,options){call.order=[key,options];return query;},limit(value){call.limit=value;return Promise.resolve({data:[],error:null});}};
  return query;
 };
 try{
  await fetchResearchObjectsForEntity({id:'existing',type:'number',label:'1820',identity_key:'1820'},{limit:80});
  assert.deepEqual(calls.map(c=>c.filter),[['eq','value',1820],['contains','terms',['1820']],['contains','relates',['1820']]]);
  assert.ok(calls.every(c=>c.limit===80&&c.order[0]==='created_at'));
  calls.length=0;await fetchResearchObjectsForEntity({id:'existing',type:'number',label:'1820',identity_key:'number:alias'},{limit:80});assert.equal(calls.length,5);assert.deepEqual(calls.at(-1).filter,['contains','relates',['number:alias']]);
  calls.length=0;await fetchResearchObjectsForEntity({id:null,type:'number',label:'3928'});assert.equal(calls.length,0);
  const result=await fetchResearchObjectsForEntity({id:null,type:'number',label:'3928'},{allowUnstoredNumber:true});assert.equal(calls.length,3);assert.deepEqual(result.findings,[]);
  calls.length=0;await fetchResearchObjectsForEntity({id:null,type:'entity',label:'3928'},{allowUnstoredNumber:true});assert.equal(calls.length,0);
 }finally{supabase.from=original;}
});
