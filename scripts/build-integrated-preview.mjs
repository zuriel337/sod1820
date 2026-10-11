// Disposable static Preview output. It never deploys Edge functions or live migrations.
import { build } from "vite";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, writeFile, copyFile, mkdir } from "node:fs/promises";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "preview-deploy/dist");
process.env.SOD_BUILD_TARGET = "2029";
await build({ root, define: {
  "import.meta.env.VITE_INTEGRATED_PREVIEW": '"true"',
  "import.meta.env.VITE_KINGDOM_PREVIEW": '"true"',
}, build: { outDir: output, emptyOutDir: true, manifest: true } });

const allow = ["gematria_api", "fn_method_value", "fn_method_profile", "gematria_method_trace", "fn_zero_scale", "posts_by_number_strict", "fn_number_lookup", "fn_number_dossier", "fn_number_journey", "number_neighbors", "fn_all_methods", "world_group_source_arrivals_v2"];
const worker = `const reads = new Set(${JSON.stringify(allow)});
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 const req=event.request,u=new URL(req.url),rpc=u.pathname.match(/^\\/rest\\/v1\\/rpc\\/(.+)$/)?.[1];
 const safe=(!u.pathname.startsWith('/auth/v1/')&&['GET','HEAD','OPTIONS'].includes(req.method))||(u.hostname==='linswmnnkjxvweumprav.supabase.co'&&reads.has(rpc));
 if(safe)return;
 event.respondWith((async()=>{
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
await mkdir(resolve(output, "preview-evidence"), { recursive: true });
for (const name of ["corrected-answer.png", "fresh-session-next-question.png", "failed-save-reopens-question.png", "fresh-session-completes-pending-save.png"]) {
  await copyFile(resolve(root, "preview-deploy/evidence", name), resolve(output, "preview-evidence", name));
}
console.log("Static integrated Preview built; read-only guard runs before App2029.");
