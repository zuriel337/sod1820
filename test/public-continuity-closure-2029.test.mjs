import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import {publicReadingContinuation,publicReadingPath,PUBLIC_HISTORICAL_LECTURE_PATHS} from '../src/lib/publicReadingRelease2029.js';
import {publicHistoricalLecturePage2029,publicForumChatHref2029} from '../src/lib/publicContinuityReaders2029.js';
import {publicReadingDocumentHandler} from '../public-reading-deploy/api/public-document.js';
import {personalReturnHref,writerPersonalHref,personalMessagesReturnHref} from '../src/lib/userCenter/writerPersonal2029.js';
import {readingSessionOptions,verifyReadingSession} from '../src/lib/publicReadingAuthSession.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const pages=JSON.parse(read('src/data/publicLegacyLecturePages2029.json'));
const response=()=>({code:null,headers:{},body:'',setHeader(k,v){this.headers[k.toLowerCase()]=v;},status(code){this.code=code;return this;},send(body){this.body=String(body);return this;}});
const handler=publicReadingDocumentHandler({authorized:()=>true,readDocument:async()=>'<html><head></head><body></body></html>'});
async function document(path){const res=response();await handler({method:'GET',url:path,headers:{host:'sod1820.co.il'},query:{}},res);return res;}
const json=rows=>new Response(JSON.stringify(rows),{headers:{'Content-Type':'application/json'}});

test('three exact public historical pages retain original body bytes, dates, parent dependencies and source video order',()=>{
 assert.equal(pages.length,3);assert.deepEqual(pages.map(p=>p.path.replace(/\/$/,'')),PUBLIC_HISTORICAL_LECTURE_PATHS);
 const bodies=['parent-original-entry.json','lecture-original-entry.json','proofs-original-entry.json'];
 const counts=[17,6,7];
 pages.forEach((page,index)=>{
  assert.equal(createHash('sha256').update(page.html).digest('hex'),page.bodySha256);
  const preserved=JSON.parse(read('docs/reviews/public-url-exceptions-20261103/residual205/evidence/lecture-recovery/'+bodies[index]));
  const bytes=Buffer.from(preserved.data,'base64');assert.equal(bytes.length,preserved.byteLength);assert.equal(createHash('sha256').update(bytes).digest('hex'),preserved.sha256);assert.equal(page.html,bytes.toString());
  assert.equal(publicHistoricalLecturePage2029(encodeURI(page.path)).wpPageId,page.wpPageId);
  assert.equal(publicReadingPath(encodeURI(page.path)),'public');
  assert.equal(publicReadingContinuation('/','?page_id='+page.wpPageId+'&part=2&part=7','#original'),page.path.replace(/\/$/,'')+'?page_id='+page.wpPageId+'&part=2&part=7#original');
  assert.equal((page.html.match(/https?:\/\/(?:www\.youtube\.com|youtu\.be)\//g)||[]).length,counts[index]);
  assert.ok(page.publishedAt.startsWith(index===0?'2014-':'2015-'));
 });
 for(const path of ['/משיח-בשנת-התשעו/not-original/','/not-a-real-lecture/','/%ZZ'])assert.equal(publicHistoricalLecturePage2029(path),null);
 assert.equal(publicReadingContinuation('/','?p=3798&page_id=3288'),null);
 assert.equal(publicReadingContinuation('/','?p=3798&p=3288'),null);
 const config=JSON.parse(read('public-reading-deploy/vercel.json'));
 assert.ok(!config.redirects.some(r=>decodeURI(r.source).replace(/\/$/,'')==='/משיח-בשנת-התשעו'));
 // Root vercel.json is pinned by content hash to the last approved main version (42ff15120: #1191 deploymentEnabled=false, #1253 /tzofen.html). A hash, not `git show`, so the pin needs no commit history and also holds in the shallow CI checkout. Re-pin only with an explicit approval of the config change.
 assert.equal(createHash('sha256').update(readFileSync(new URL('../vercel.json',import.meta.url))).digest('hex'),'62144d03db717f2f6c1283bb08ba647ba7d76631043d8a0b34c76f875d600887','root vercel.json changed since the approved pin 42ff15120');
});

test('original historical documents have exact self canonicals without querying a guessed Post identity',async()=>{
 const original=globalThis.fetch;globalThis.fetch=()=>assert.fail('historical source must not depend on a guessed live Post');
 try {for(const page of pages){const r=await document(encodeURI(page.path));assert.equal(r.code,200);const canonical=decodeURI(r.body.match(/<link rel="canonical" href="([^"]+)/)?.[1]||'');assert.equal(canonical,'https://sod1820.co.il'+page.path.replace(/\/$/,''));}}
 finally{globalThis.fetch=original;}
});

test('proven Forum aliases retain query/anchor and every well-formed old thread address continues to the chat, uniformly',async()=>{
 for(const path of ['/forum','/yuval-kogan-echad-hasichim-hamashiach','/post/yuval-kogan-echad-hasichim-hamashiach'])
  assert.equal(publicReadingContinuation(path,'?part=2&part=7','#return'),'/community/chat?part=2&part=7#return');
 assert.equal(publicReadingContinuation('/','?p=36971&source=google','#original'),'/community/chat?p=36971&source=google#original');
 assert.equal(publicForumChatHref2029('?a=%D7%90&a=2','#source'),'/community/chat?a=%D7%90&a=2#source');
 const id='00000000-0000-4000-8000-000000000001';
 const original=globalThis.fetch;
 try{
  // ZURIEL 5.11: the retired Forum is replaced by the chat. A well-formed old thread address continues to the chat whether or not the thread still
 // exists (approved, draft or gone): the answer is identical, so nothing about an unpublished thread is disclosed.
 for(const [rows,status]of [[[ {id,status:'approved'} ],308],[[],308],[[{id,status:'draft'}],308],[[{id:'00000000-0000-4000-8000-000000000002',status:'approved'}],308]]){
   let reads=0;globalThis.fetch=async input=>{const u=new URL(input);assert.ok(u.pathname.endsWith('/research_contributions'));assert.equal(u.searchParams.get('select'),'id,status');assert.equal(u.searchParams.get('id'),'eq.'+id);assert.equal(u.searchParams.get('status'),'eq.approved');reads++;return json(rows);};
   const result=await document('/forum/'+id+'?part=2&part=7');assert.equal(result.code,status);assert.equal(reads,1);
   if(status===308)assert.equal(result.headers.location,'/community/chat?part=2&part=7');else assert.equal(result.headers.location,undefined);
  }
  globalThis.fetch=async()=>{throw Error('source outage');};assert.equal((await document('/forum/'+id)).code,503);
  globalThis.fetch=()=>assert.fail('invalid IDs must not read');assert.equal((await document('/forum/not-an-id')).code,404);
 }finally{globalThis.fetch=original;}
});

test('a metadata Location cannot select an external or unrelated destination',async()=>{
 for(const destination of ['https://evil.invalid/community/chat','/login','//evil.invalid/community/chat']){
  const r=response();await publicReadingDocumentHandler({authorized:()=>true,metadataHandler:async(_req,res)=>{res.setHeader('Location',destination);res.status(308).send('');}})({method:'GET',url:'/forum/00000000-0000-4000-8000-000000000001',headers:{host:'sod1820.co.il'}},r);assert.equal(r.code,503);assert.equal(r.headers.location,undefined);
 }
});

test('public account returns preserve Home, old Posts, calculator, taxonomy, phrase, media and every original query/anchor',()=>{
 const paths=['/?part=2&part=7#home','/old-original-post?part=2&part=7#media','/gematria?q=%D7%93%D7%95%D7%93#result','/gallery?id=17#image','/books?source=world#book','/tag/%D7%90%20%D7%91?part=2&part=7#cards','/category/known?source=world#first','/number/%D7%90%20%D7%91?method=%D7%9E%D7%99%D7%9C%D7%95%D7%99&result=1820#source'];
 for(const path of paths){const safe=personalReturnHref(path,{publicReading:true});assert.equal(safe,new URL(path,'https://local.invalid').pathname+new URL(path,'https://local.invalid').search+new URL(path,'https://local.invalid').hash,path);const href=writerPersonalHref('messages',{publicReading:true,returnTo:path,tab:'replies'});assert.equal(new URL(href,'https://local.invalid').searchParams.get('returnTo'),path);assert.equal(personalMessagesReturnHref(href,{publicReading:true}),href);}
 assert.equal(personalReturnHref('/books',{publicReading:false}),null,'old compatibility remains unchanged');
 for(const path of ['//evil.invalid','https://evil.invalid/','/api/private','/auth/callback','/admin/private','/%5Cevil','/%252f%252fevil','/number/%0aevil','/unknown/subpage','/login?returnTo=/'])assert.equal(personalReturnHref(path,{publicReading:true}),null,path);
});

test('canonical dormant artifact reuses SDK-owned local storage without a token-copy bridge; all Preview origins remain isolated',async()=>{
 const mapStore=()=>{const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
 // The SDK receives a storage that cannot throw; while the given store works it writes and reads through to exactly that store.
 const writesThrough=(options,target)=>{options.storage.setItem('probe','1');const ok=target.map.get('probe')==='1'&&options.storage.getItem('probe')==='1';options.storage.removeItem('probe');return ok&&!target.map.has('probe');};
 const tab=mapStore(),canonicalStorage=mapStore();
 const options={productionArtifact:true,canonicalStorage};
 const canonical=readingSessionOptions(tab,{origin:'https://sod1820.co.il',pathname:'/old-post'},options);
 assert.equal(writesThrough(canonical,canonicalStorage),true);assert.equal(tab.map.size,0);assert.equal(canonical.persistSession,true);assert.equal(Object.hasOwn(canonical,'storageKey'),false);assert.equal(canonical.detectSessionInUrl,false);
 for(const origin of ['https://preview.vercel.app','https://www.sod1820.co.il','https://sod1820.vercel.app','http://sod1820.co.il','https://sod1820.co.il.evil.invalid']){
  const o=readingSessionOptions(tab,{origin,pathname:'/'},options);assert.equal(writesThrough(o,tab),true);assert.equal(canonicalStorage.map.size,0);assert.equal(o.storageKey,'sod-public-reading-account');
 }
 {const o=readingSessionOptions(tab,{origin:'https://sod1820.co.il',pathname:'/'},{...options,productionArtifact:false});assert.equal(writesThrough(o,tab),true);assert.equal(canonicalStorage.map.size,0);}
 for(const value of [{data:{user:{id:'b'}}},{error:Error('expired')},{data:{user:null}}])assert.equal(await verifyReadingSession({access_token:'synthetic',user:{id:'a'}},{getUser:async()=>value}),null);
});

test('operational numeric projection distinguishes missing/error from measured zero',()=>{
 const source=read('src/pages/ControlPlane2029Page.jsx');const block=source.slice(source.indexOf('const n ='),source.indexOf('const when ='));
 const format=vm.runInNewContext(block+';({num,cost,mib,gib,pct});');
 for(const value of [null,undefined,'',false,'broken',Infinity,NaN])for(const [name,fn]of Object.entries(format))assert.equal(fn(value),'—',name+':'+value);
 assert.equal(format.num(0),'0');assert.equal(format.cost(0),'₪0.0000');assert.equal(format.pct(0),'0%');assert.ok(source.includes('state.traceError ? <FrameState kind="error" title="לא ניתן לקרוא traces כרגע"'));
});
