// Disposable static Preview output. It never deploys Edge functions or live migrations.
import { build } from "vite";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, writeFile, copyFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  NUMBER_REVIEW_PREVIEW_BRANCH_2029,
  isNumberReviewPreviewBuild2029,
} from "../src/lib/numberReviewPreview2029.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "preview-deploy/dist");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

function approvedPreviewHost(raw) {
  if (typeof raw !== "string" || raw !== raw.trim() || raw !== raw.toLowerCase()) return "";
  if (!/^sod1820-[a-z0-9](?:[a-z0-9-]*[a-z0-9])?-sod1820-s-projects\.vercel\.app$/.test(raw)) return "";
  if (raw === "sod1820-sod1820-s-projects.vercel.app") return "";
  try {
    const parsed = new URL(`https://${raw}`);
    return parsed.hostname === raw && parsed.host === raw && parsed.pathname === "/" ? raw : "";
  } catch {
    return "";
  }
}

process.env.SOD_BUILD_TARGET = "2029";
const commit = process.env.VERCEL_GIT_COMMIT_SHA || "";
const previewHost = approvedPreviewHost(process.env.VERCEL_URL || "");
const numberReviewPreviewOpen = isNumberReviewPreviewBuild2029(process.env);
if (!numberReviewPreviewOpen) {
  throw new Error(`Integrated Preview requires target=2029, VERCEL_ENV=preview and branch=${NUMBER_REVIEW_PREVIEW_BRANCH_2029}`);
}
if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error("Exact 40-hex preview source commit required");
if (!previewHost) throw new Error("Approved exact VERCEL_URL Preview host required");
const checkoutCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
if (checkoutCommit !== commit) throw new Error("VERCEL_GIT_COMMIT_SHA must match the checked-out source commit");

await build({
  root,
  define: {
    "import.meta.env.VITE_INTEGRATED_PREVIEW": '"true"',
    "import.meta.env.VITE_KINGDOM_PREVIEW": '"true"',
    __SOD_NUMBER_REVIEW_PREVIEW_HOST__: JSON.stringify(previewHost),
  },
  build: { outDir: output, emptyOutDir: true, manifest: true },
});

const allow = ["gematria_api", "fn_method_value", "fn_method_profile", "gematria_method_trace", "fn_zero_scale", "posts_by_number_strict", "fn_number_lookup", "fn_number_opening_projection_2029", "fn_number_dossier", "fn_number_journey", "fn_verses_by_gematria", "lang_links_list", "number_neighbors", "fn_all_methods", "world_group_source_arrivals_v3", "world_group_source_arrivals_v2", "convergence_meter", "get_category_videos", "notification_prefs_guest_get_v1"];
const worker = `const previewIdentity=Object.freeze(${JSON.stringify({ commit, branch: NUMBER_REVIEW_PREVIEW_BRANCH_2029, host: previewHost })});
const reads = new Set(${JSON.stringify(allow)});
const authOrigin='https://linswmnnkjxvweumprav.supabase.co';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 const req=event.request,u=new URL(req.url),rpc=u.pathname.match(/^\\/rest\\/v1\\/rpc\\/(.+)$/)?.[1];
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

const workerScript = `/preview-readonly-sw.js?build=${commit}`;
const bootstrap = `<script type="module">const expectedHost=${JSON.stringify(previewHost)},workerScript=${JSON.stringify(workerScript)},build=${JSON.stringify(commit)};const fail=()=>{document.documentElement.dataset.sodPreviewGuard='blocked';document.body.textContent='לא ניתן לאמת את מצב הקריאה בלבד של הפריוויו. יש לרענן את הדף.';};if(!('serviceWorker' in navigator)||location.hostname.toLowerCase()!==expectedHost){fail();}else{try{const expected=new URL(workerScript,location.href).href;const exact=()=>navigator.serviceWorker.controller?.scriptURL===expected;const registration=await navigator.serviceWorker.register(workerScript,{scope:'/',updateViaCache:'none'});if(!exact())await new Promise((resolve,reject)=>{let done=false;const finish=error=>{if(done)return;done=true;clearTimeout(timer);navigator.serviceWorker.removeEventListener('controllerchange',check);for(const worker of [registration.installing,registration.waiting,registration.active])worker?.removeEventListener('statechange',check);error?reject(error):resolve();};const check=()=>{if(exact())finish();};const timer=setTimeout(()=>finish(new Error('preview_guard_controller_timeout')),15000);navigator.serviceWorker.addEventListener('controllerchange',check);for(const worker of [registration.installing,registration.waiting,registration.active])worker?.addEventListener('statechange',check);check();});if(!exact())throw new Error('preview_guard_controller_mismatch');document.documentElement.dataset.sodPreviewGuard=build;await import('__ENTRY__');}catch{fail();}}</script>`;
let html = await readFile(resolve(output, "2029.html"), "utf8");
const entry = html.match(/<script\b[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>/);
if (!entry) throw new Error("missing2029Entry");
html = html.replace(entry[0], bootstrap.replace("__ENTRY__", entry[1]));
await writeFile(resolve(output, "2029.html"), html);
await writeFile(resolve(output, "index.html"), html);

const manifestBytes = await readFile(resolve(output, ".vite/manifest.json"));
const htmlBytes = await readFile(resolve(output, "2029.html"));
const workerBytes = await readFile(resolve(output, "preview-readonly-sw.js"));
const artifacts = {
  manifestSha256: sha256(manifestBytes),
  htmlSha256: sha256(htmlBytes),
  workerSha256: sha256(workerBytes),
};
const identity = {
  commit,
  branch: NUMBER_REVIEW_PREVIEW_BRANCH_2029,
  host: previewHost,
  buildTarget: "2029",
  vercelEnv: "preview",
  workerScript,
  ...artifacts,
};
await writeFile(resolve(output, "preview-build.json"), JSON.stringify({
  ...identity,
  identitySha256: sha256(JSON.stringify(identity)),
  readOnly: true,
  numberReviewPreviewOpen,
  previewOverrides: numberReviewPreviewOpen ? ["lock_number"] : [],
}, null, 2));
await mkdir(resolve(output, "preview-evidence"), { recursive: true });
for (const name of ["corrected-answer.png", "fresh-session-next-question.png", "failed-save-reopens-question.png", "fresh-session-completes-pending-save.png"]) {
  await copyFile(resolve(root, "preview-deploy/evidence", name), resolve(output, "preview-evidence", name));
}
console.log("Static integrated Preview built; exact read-only controller runs before App2029.");
