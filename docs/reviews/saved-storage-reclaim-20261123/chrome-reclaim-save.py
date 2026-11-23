import json, http.server, threading, socketserver, os
from playwright.sync_api import sync_playwright
os.chdir('/tmp/proof')
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.TCPServer(('127.0.0.1',8766),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
JS='''async () => {
 const {createResearchSyncRuntime:C, makeResearchOp:M, emptyResearchState:E} = window.__lib;
 const sess = () => ({getItem:()=>null,setItem(){},removeItem(){}});
 const sleep = ms => new Promise(r=>setTimeout(r,ms));
 const usage = () => { let n=0, j=0; for (let i=0;i<localStorage.length;i++){const k=localStorage.key(i); n+=k.length+localStorage.getItem(k).length; if(k.includes(':pending:')) j++;} return {kb:Math.round(n/1024), journals:j}; };
 const cloud = {revision:0, saved:[]};
 const server = {read: async()=>JSON.parse(JSON.stringify({...E(),revision:cloud.revision, saved:cloud.saved})),
   write: async(u,ops,{batchId,expectedRevision})=>{ for(const o of ops) if(o.kind==='item_upsert') cloud.saved.push(o.entity); cloud.revision++; return {ok:true,batch_id:batchId,applied_revision:cloud.revision,snapshot:{...E(),revision:cloud.revision,saved:cloud.saved}}; }};
 const mk = () => C({userId:'A',storage:localStorage,session:sess(),delay:1,resumePendingOnStart:false,cloudEnabled:true,readCloud:server.read,writeCloud:server.write});
 const out = {};
 // 1. fill the real quota exactly like the device did
 let s=0, failed=null;
 for (; s<200 && failed===null; s++) { const r=mk(); r.start(); await sleep(10); let ok=true; for(let i=0;i<30;i++) ok = r.commit([M('history_add',{entity:{id:'number:'+(s*30+i),type:'number',ref:s*30+i,title:'x'.repeat(900)}})]) && ok; if(!ok) failed=s+1; r.stop(); }
 out.beforeFull = usage(); out.failedAtLaunch = failed;
 // 2. the user's save on the full device
 const r1 = mk(); r1.start(); await sleep(20);
 const ent = {id:'number:776',type:'number',ref:776,title:'776'};
 out.saveOnFullDevice = r1.commit([M('item_upsert',{bucket:'library',entity:ent})]); out.statusAfterFailedSave = r1.getSnapshot().syncStatus;
 // 3. reclaim: dry run then confirmed
 const now = Date.now()+11*60*1000;
 out.dryRun = await r1.localOnly('reclaim',{now}); out.afterDry = usage();
 out.reclaim = await r1.localOnly('reclaim',{confirm:true,now}); out.afterReclaim = usage();
 const ex = await r1.localOnly('extras'); out.archivedHistory = (ex.history||[]).length; out.newestArchived = (ex.history||[]).slice(-1)[0]?.id;
 r1.stop();
 // 4. fresh launch: save works, reaches server, survives reopen
 const r2 = mk(); r2.start(); await sleep(30);
 out.saveAfterReclaim = r2.commit([M('item_upsert',{bucket:'library',entity:ent})]); await sleep(60);
 out.statusAfterSave = r2.getSnapshot().syncStatus; out.cloudSavedRefs = cloud.saved.map(x=>x.ref); r2.stop();
 const r3 = mk(); r3.start(); await sleep(40); out.afterReopenSaved = r3.getSnapshot().saved.map(x=>x.ref); out.afterReopenConfirmed = r3.getSnapshot().cloudConfirmed ?? (r3.getSnapshot().syncStatus==='synced'); r3.stop();
 out.finalUsage = usage();
 return out; }'''
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    pg=b.new_page(); pg.goto('http://127.0.0.1:8766/index.html')
    print(json.dumps(pg.evaluate(JS),ensure_ascii=False,indent=1))
    b.close()
