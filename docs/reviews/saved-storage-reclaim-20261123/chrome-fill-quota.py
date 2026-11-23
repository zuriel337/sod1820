import json, http.server, threading, socketserver, os
from playwright.sync_api import sync_playwright
os.chdir('/tmp/proof')
open('index.html','w').write('<!doctype html><script src="bundle.js"></script>')
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=socketserver.TCPServer(('127.0.0.1',8765),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
JS='''async ({launches, entityBytes}) => {
 const {createResearchSyncRuntime:C, makeResearchOp:M, emptyResearchState:E} = window.__lib;
 const sess = () => ({getItem:()=>null,setItem(){},removeItem(){}});
 const sleep = ms => new Promise(r=>setTimeout(r,ms));
 const usage = () => { let n=0, j=0; for (let i=0;i<localStorage.length;i++){const k=localStorage.key(i); n+=k.length+localStorage.getItem(k).length; if(k.includes(':pending:')) j++;} return {kb:Math.round(n/1024), journals:j}; };
 const server = {read: async()=>({...E(),revision:0}), write: async(u,ops,{batchId,expectedRevision})=>({ok:true,batch_id:batchId,applied_revision:expectedRevision+1,snapshot:{...E(),revision:expectedRevision+1}})};
 const out = {quota:null, trace:[]};
 let failedAt = null;
 for (let s=0; s<launches; s++) {
   const r = C({userId:'A',storage:localStorage,session:sess(),delay:1,resumePendingOnStart:false,cloudEnabled:true,readCloud:server.read,writeCloud:server.write});
   r.start(); await sleep(15);
   let ok = true;
   for (let i=0;i<30;i++) ok = r.commit([M('history_add',{entity:{id:'number:'+(s*30+i),type:'number',ref:s*30+i,title:'x'.repeat(entityBytes)}})]) && ok;
   if (s%10===9 || !ok) out.trace.push({launch:s+1, ok, ...usage(), status:r.getSnapshot().syncStatus});
   if (!ok && failedAt===null) failedAt = s+1;
   r.stop();
   if (!ok && out.trace.length>6) break;
 }
 out.firstFailureLaunch = failedAt; out.final = usage();
 // real write test
 try { localStorage.setItem('__p','x'.repeat(4096)); localStorage.removeItem('__p'); out.writeAfter='ok'; } catch(e){ out.writeAfter=e.name; }
 // reclaim-equivalent: count passive journals (same rule as the shipped code) and remove them
 const now = Date.now()+11*60*1000; let removed=0, bytes=0, nonPassive=0, stateHist=new Set();
 const st = JSON.parse(localStorage.getItem('sod_research_v2:user:A')||'null'); (st?.state?.history||[]).forEach(h=>stateHist.add(h.id));
 const names=[]; for (let i=0;i<localStorage.length;i++) names.push(localStorage.key(i));
 let allInState = true, historyIdsInRemoved=0;
 for (const k of names) { if(!k.includes(':pending:')||k.includes(':conflict:')) continue; const rec=JSON.parse(localStorage.getItem(k)); const ops=rec.queue.flatMap(b=>b.ops);
   if (rec.inflight || !ops.every(o=>o.kind==='history_add'||o.kind==='context_set')) {nonPassive++; continue;}
   if (!(rec.owner.released===true || now-rec.owner.at>600000)) continue;
   removed++; bytes+=k.length+localStorage.getItem(k).length;
 }
 out.reclaimable={journals:removed,kb:Math.round(bytes/1024),nonPassiveKept:nonPassive,stateHistoryEntries:stateHist.size};
 return out; }'''
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    pg=b.new_page(); pg.goto('http://127.0.0.1:8765/index.html')
    res=pg.evaluate(JS,{'launches':100,'entityBytes':900})
    print(json.dumps(res,ensure_ascii=False,indent=1))
    b.close()
