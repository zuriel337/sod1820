// Disposable static Preview output. It never deploys Edge functions or live migrations.
import { build } from "vite";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, writeFile, copyFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "preview-deploy/dist");
process.env.SOD_BUILD_TARGET = "2029";
await build({ root, define: {
  "import.meta.env.VITE_INTEGRATED_PREVIEW": '"true"',
  "import.meta.env.VITE_KINGDOM_PREVIEW": '"true"',
}, build: { outDir: output, emptyOutDir: true, manifest: true } });

const allow = ["gematria_api", "fn_method_value", "fn_method_profile", "gematria_method_trace", "fn_zero_scale", "posts_by_number_strict", "fn_number_lookup", "fn_number_dossier", "fn_number_journey", "fn_verses_by_gematria", "lang_links_list", "number_neighbors", "fn_all_methods", "world_group_source_arrivals_v3", "world_group_source_arrivals_v2", "convergence_meter", "get_category_videos", "notification_prefs_guest_get_v1"];
const worker = `const reads = new Set(${JSON.stringify(allow)});
const authOrigin='https://linswmnnkjxvweumprav.supabase.co';
// A Preview-only projection of the existing launch gate. Never mutate live
// flags, grant identity/roles, or enable the separate Number optimization.
const host=self.location?.hostname||'';
const numberPreviewHost=['localhost','127.0.0.1','[::1]'].includes(host)||
 (host.startsWith('sod1820-')&&host.endsWith('-sod1820-s-projects.vercel.app')&&host!=='sod1820-sod1820-s-projects.vercel.app');
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 const req=event.request,u=new URL(req.url),rpc=u.pathname.match(/^\\/rest\\/v1\\/rpc\\/(.+)$/)?.[1];
 if(numberPreviewHost&&req.method==='GET'&&u.origin===authOrigin&&u.pathname==='/rest/v1/site_flags'){
  event.respondWith((async()=>{
   const response=await fetch(req,{cache:'no-store'});
   if(!response.ok)return response;
   let rows;try{rows=await response.clone().json();}catch{return response;}
   // Missing gates and malformed reads keep their original fail-closed meaning.
   if(!Array.isArray(rows)||!rows.some(row=>row?.key==='lock_number'))return response;
   const headers=new Headers(response.headers);
   for(const name of ['Content-Length','Content-Encoding','ETag','Last-Modified','Content-MD5','Digest'])headers.delete(name);
   headers.set('Cache-Control','no-store');
   headers.set('X-SOD-Preview-Overrides','lock_number');
   return new Response(JSON.stringify(rows.map(row=>row?.key==='lock_number'?{...row,enabled:false}:row)),{status:response.status,headers});
  })());
  return;
 }
 const safe=(!u.pathname.startsWith('/auth/v1/')&&['GET','HEAD','OPTIONS'].includes(req.method))||(u.hostname==='linswmnnkjxvweumprav.supabase.co'&&reads.has(rpc));
 if(safe)return;
 event.respondWith((async()=>{
  // Existing-account access only. No signup, account mutation or product writes.
  if(u.origin===authOrigin){
   if(req.method==='GET'&&u.pathname==='/auth/v1/user')return fetch(req);
   if(req.method==='POST'&&u.pathname==='/auth/v1/token'&&['password','refresh_token'].includes(u.searchParams.get('grant_type')))return fetch(req);
   if(req.method==='POST'&&u.pathname==='/auth/v1/logout'&&u.searchParams.get('scope')==='local')return fetch(req);
   if(req.method==='POST'&&['/auth/v1/otp','/auth/v1/verify'].includes(u.pathname)){
    try{
     const body=await req.clone().json();
     const emailOnly=typeof body.email==='string'&&body.email.includes('@')&&!body.phone;
     if(emailOnly&&u.pathname==='/auth/v1/otp'&&body.create_user===false)return fetch(req);
     if(emailOnly&&u.pathname==='/auth/v1/verify'&&body.type==='email'&&typeof body.token==='string')return fetch(req);
    }catch{}
   }
  }
  // Only the existing governed ELS reader is callable. Save/upload/model endpoints stay blocked.
  if(req.method==='POST'&&u.hostname==='linswmnnkjxvweumprav.supabase.co'&&u.pathname==='/functions/v1/els-search-bridge'){
   try{const body=await req.clone().json();if(['page','verify','verify_batch'].includes(body.op))return fetch(req);}catch{}
  }
  return new Response(JSON.stringify({error:'preview_read_only'}),{status:403,headers:{'Content-Type':'application/json','X-Preview-Write-Blocked':'true'}});
 })());
});`;
await writeFile(resolve(output, "preview-readonly-sw.js"), worker);
// A push opt-in must never replace the Preview guard with the production push worker.
await writeFile(resolve(output, "sw.js"), worker);
const bootstrap = `<script type="module">if(!('serviceWorker' in navigator)){document.body.textContent='פריוויו זה דורש דפדפן התומך בתצוגה לקריאה בלבד.';}else{await navigator.serviceWorker.register('/preview-readonly-sw.js',{scope:'/'});await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}));await import('__ENTRY__');}</script>`;
let html = await readFile(resolve(output, "2029.html"), "utf8");
const entry = html.match(/<script\b[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>/);
if (!entry) throw new Error("missing2029Entry");
html = html.replace(entry[0], bootstrap.replace("__ENTRY__", entry[1]));
await writeFile(resolve(output, "2029.html"), html);
await writeFile(resolve(output, "index.html"), html);
let commit = process.env.VERCEL_GIT_COMMIT_SHA;
if (!commit) commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('Exact preview source commit required');
const manifestBytes = await readFile(resolve(output, '.vite/manifest.json'));
await writeFile(resolve(output, 'preview-build.json'), JSON.stringify({ commit, buildTarget: '2029',
  readOnly: true, previewOverrides: ['lock_number'],
  manifestSha256: createHash('sha256').update(manifestBytes).digest('hex') }, null, 2));
await mkdir(resolve(output, "preview-evidence"), { recursive: true });
for (const name of ["corrected-answer.png", "fresh-session-next-question.png", "failed-save-reopens-question.png", "fresh-session-completes-pending-save.png"]) {
  await copyFile(resolve(root, "preview-deploy/evidence", name), resolve(output, "preview-evidence", name));
}
console.log("Static integrated Preview built; read-only guard runs before App2029.");
