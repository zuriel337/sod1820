import test from 'node:test';
import assert from 'node:assert/strict';
import { COMMUNITY_DRAFT_CACHE, COMMUNITY_DRAFT_MAX_AGE, loadCommunityDraft, saveCommunityDraft, normalizeCommunityDraft } from './communityDraft.js';
const root='11111111-1111-4111-8111-111111111111',reply='22222222-2222-4222-8222-222222222222';
const makeStorage=()=>{const data=new Map();return{data,getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}};
test('formatted text and reply IDs survive reload without caching message bodies, files or author details',()=>{
 const storage=makeStorage();const body='[sod:v1]\n[b]שלום[/b] [u]עולם[/u]';
 assert.equal(saveCommunityDraft(storage,'user:'+root,{body,reply:{id:reply,parentId:root,body:'NEVER CACHE ORIGINAL',authorName:'private',file:'blob:secret'},hadAttachments:true}),true);
 const value=loadCommunityDraft(storage,'user:'+root).value;
 assert.equal(value.body,body);assert.deepEqual(value.reply,{id:reply,parentId:root});assert.equal(value.hadAttachments,true);
 assert.doesNotMatch([...storage.data.values()][0],/NEVER CACHE|private|blob:/);
 assert.equal(loadCommunityDraft(storage,'guest').value,null);assert.equal(loadCommunityDraft(storage,'user:'+reply).value,null);
 saveCommunityDraft(storage,'guest',{body:'guest text',reply:null,hadAttachments:false});
 saveCommunityDraft(storage,'user:'+root,{body:'',reply:null,hadAttachments:false});
 assert.equal(loadCommunityDraft(storage,'user:'+root).value,null);assert.equal(loadCommunityDraft(storage,'guest').value.body,'guest text');
});
test('expired, oversized, corrupt and impossible-target drafts never populate the composer',()=>{
 const now=Date.now(), valid={version:1,updatedAt:now,body:'text',reply:null,hadAttachments:false};
 for(const changes of [{updatedAt:now-COMMUNITY_DRAFT_MAX_AGE-1},{updatedAt:now+61000},{body:'x'.repeat(1501)},{body:5},{reply:{id:root,parentId:root}},{reply:{id:'https://evil.invalid'}}])assert.equal(normalizeCommunityDraft({...valid,...changes},now),null);
 const storage=makeStorage();storage.setItem(COMMUNITY_DRAFT_CACHE+'guest',JSON.stringify({...valid,updatedAt:1}));
 assert.equal(loadCommunityDraft(storage,'guest').value,null);assert.equal(storage.data.size,0);
 assert.equal(loadCommunityDraft({getItem:()=>'{bad'},'guest').available,false);
 assert.equal(saveCommunityDraft({setItem(){throw Error('quota');}},'guest',{body:'text',reply:null}),false);
 assert.equal(loadCommunityDraft(null,'guest').available,false);
 assert.equal(saveCommunityDraft(storage,null,{body:'unsafe no principal'}),false);
});
