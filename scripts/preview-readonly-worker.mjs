import { createHash } from "node:crypto";

export const PREVIEW_GUARD_PROTOCOL = "sod1820-preview-readonly-v3";

export const PREVIEW_READ_RPC_ALLOWLIST = Object.freeze([
  "gematria_api",
  "fn_method_value",
  "fn_method_profile",
  "gematria_method_trace",
  "fn_zero_scale",
  "posts_by_number_strict",
  "fn_number_lookup",
  "fn_number_opening_projection_2029",
  "fn_number_dossier",
  "fn_number_journey",
  "fn_verses_by_gematria",
  "lang_links_list",
  "number_neighbors",
  "fn_all_methods",
  "world_group_source_arrivals_v3",
  "world_group_source_arrivals_v2",
  "convergence_meter",
  "get_category_videos",
  "notification_prefs_guest_get_v1",
  // Verified STABLE readers installed by the Community soft-delete migration.
  // Search/history/restore/claims are not installed or admitted here.
  "community_feed_page",
  "community_replies_page",
  "community_reply_counts",
]);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

// ZURIEL Human Gate 2026-10-22 (#1142): the complete Fast/Deep Raziel conversation may reach its
// existing backend from the current isolated integration Preview only. Every other branch keeps all model calls blocked.
export const RAZIEL_CHAT_PREVIEW_BRANCHES = Object.freeze(["codex/issue-1142-raziel-grounded-source-composer-preview-v1-20261023"]);

export function createPreviewGuardDescriptor({ commit, branch, host, buildTarget = "2029" }) {
  if (!new Set(["2029", "hybrid"]).has(buildTarget)) {
    throw new Error(`Unsupported Preview guard build target: ${buildTarget}`);
  }
  return Object.freeze({
    protocol: PREVIEW_GUARD_PROTOCOL,
    commit,
    branch,
    host,
    buildTarget,
    vercelEnv: "preview",
    readRpcAllowlist: [...PREVIEW_READ_RPC_ALLOWLIST],
    razielChat: RAZIEL_CHAT_PREVIEW_BRANCHES.includes(branch),
  });
}

export function renderPreviewReadonlyWorker({ commit, branch, host, buildTarget = "2029" }) {
  const descriptor = createPreviewGuardDescriptor({ commit, branch, host, buildTarget });
  const guardIdentitySha256 = sha256(JSON.stringify(descriptor));
  const previewIdentity = Object.freeze({ ...descriptor, guardIdentitySha256 });
  const worker = `const previewIdentity=Object.freeze(${JSON.stringify(previewIdentity)});
const reads=new Set(previewIdentity.readRpcAllowlist);
const authOrigin='https://linswmnnkjxvweumprav.supabase.co';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{
 const data=event.data;
 if(!data||data.type!=='SOD_PREVIEW_GUARD_CHALLENGE'||typeof data.nonce!=='string'||!event.ports?.[0])return;
 const script=new URL(self.location.href);
 event.ports[0].postMessage({
  type:'SOD_PREVIEW_GUARD_ATTESTATION',
  nonce:data.nonce,
  identity:{...previewIdentity,workerContentSha256:script.searchParams.get('content')||''}
 });
});
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
  // Raziel conversation only (approved branch, see RAZIEL_CHAT_PREVIEW_BRANCHES): persona=raziel research ask; never Metatron,
  // advanced mode, a path, an oversized body or any other function. Save/upload endpoints stay blocked.
  if(previewIdentity.razielChat===true&&req.method==='POST'&&u.hostname==='linswmnnkjxvweumprav.supabase.co'&&u.pathname==='/functions/v1/ai-analyze'){
   try{const text=await req.clone().text();if(text.length<=8192){const body=JSON.parse(text);if(body&&body.persona==='raziel'&&body.kind==='research'&&body.metatron!==true&&!body.mode&&body.path==null)return fetch(req);}}catch{}
  }
  // Only the existing governed ELS reader is callable. Save/upload/model endpoints stay blocked.
  if(req.method==='POST'&&u.hostname==='linswmnnkjxvweumprav.supabase.co'&&u.pathname==='/functions/v1/els-search-bridge'){
   try{const body=await req.clone().json();if(['page','verify','verify_batch'].includes(body.op))return fetch(req);}catch{}
  }
  return new Response(JSON.stringify({error:'preview_read_only'}),{status:403,headers:{'Content-Type':'application/json','X-Preview-Write-Blocked':'true'}});
 })());
});`;
  return { worker, descriptor, guardIdentitySha256, previewIdentity };
}
