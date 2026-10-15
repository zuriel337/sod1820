import { createResearchSyncRuntime } from '/home/user/sod1820/src/lib/research/researchSyncRuntime.js';
import { makeResearchOp } from '/home/user/sod1820/src/lib/research/researchSyncState.js';
import { mergeResearchContext } from '/home/user/sod1820/src/lib/research/researchContext.js';
class S{m=new Map();bytes=0;writes=0;getItem(k){return this.m.get(k)??null}setItem(k,v){this.writes++;this.bytes+=String(v).length;this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}key(i){return[...this.m.keys()][i]}get length(){return this.m.size}}
const N = +process.argv[2]||40, ACC = process.argv[3]==='rich';
const ent=(i,t)=>({id:`${t}${i}`,type:'number',title:`ביטוי ארוך מספר ${i} ${'א'.repeat(30)}`,ref:`${t}${i}`,meta:{note:'x'.repeat(120)}});
function mk(user){
  const storage=new S(),session=new S();
  const server={rev:0};
  const snap=()=>({cart:[],saved:[],pinned:[],history:[],collections:[],journeys:[],context:null,revision:0});
  const rt=createResearchSyncRuntime({userId:user,storage,session,readCloud:async()=>snap(),
    writeCloud:async(u,ops,{batchId})=>new Promise(()=>{}) /* write in flight forever: worst case scroll during sync */,delay:350,onContext:()=>{}});
  rt.start(); return {rt,storage,session};
}
const regions=Array.from({length:24},(_,i)=>({id:`r${i}`,label:`אזור ${i}`,targetId:`source-region-r${i}`}));
const findings=Array.from({length:12},(_,i)=>({id:`f${i}`,label:`ממצא ${i}`,value:i*7,kind:'k',reason:'סיבה '.repeat(8),href:`/n/${i}`,sourceLabel:'מקור'}));
function patch(i){return {subject:{id:'5112',type:'post',label:'כותרת',href:'/post/x'},selection:{entityId:`r${i}`,entityType:'post_region',locator:`#source-region-r${i}`},lens:'reading',
 dimensions:{bottomTrail:[{id:'post',label:'פוסט'},{id:`r${i}`,label:'הסיפור'}],surfaceSections:regions,activeSectionId:`r${i}`,surfaceMapLabel:'בתוך הפוסט',surfaceFindings:findings,surfaceFocus:{id:`r${i}`,type:'post_region',label:'x',signals:[]},readingFocus:{id:`r${i}`,postId:'5112',locator:`#source-region-r${i}`}}};}
for (const user of [null,'u1']) {
  const {rt,storage,session}=mk(user); await new Promise(r=>setTimeout(r,20));
  if (ACC) { // accumulate
    for(let i=0;i<300;i++) rt.commit([makeResearchOp('item_upsert',{bucket:'cart',entity:ent(i,'c')})]);
    for(let i=0;i<300;i++) rt.commit([makeResearchOp('item_upsert',{bucket:'library',entity:ent(i,'s')})]);
  }
  storage.bytes=0;storage.writes=0;session.bytes=0;
  let tMerge=0,tCommit=0; const t0=performance.now();
  for(let i=0;i<N;i++){
    let a=performance.now(); const cur=rt.getSnapshot().context; const ctx=mergeResearchContext(cur,patch(i)); let b=performance.now(); tMerge+=b-a;
    rt.commit([makeResearchOp('context_set',{context:ctx})]); tCommit+=performance.now()-b;
  }
  const s=rt.getSnapshot();
  console.log(JSON.stringify({user:user?'signed-in':'guest',acc:ACC,N,mergeMsPer:+(tMerge/N).toFixed(3),commitMsPer:+(tCommit/N).toFixed(3),lastCommitKB:0,storageKBwritten:Math.round(storage.bytes/1024),sessionKBwritten:Math.round(session.bytes/1024),queue:s.syncPending}));
  rt.stop();
}
