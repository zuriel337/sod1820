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
  "import.meta.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW": '"true"',
  "import.meta.env.VITE_UNLOCKED_2029_PREVIEW": '"true"',
}, build: { outDir: output, emptyOutDir: true, manifest: true } });

const allow = ["gematria_api", "fn_method_value", "fn_method_profile", "gematria_method_trace", "fn_zero_scale", "posts_by_number_strict", "fn_number_lookup", "fn_number_dossier", "fn_number_journey", "fn_verses_by_gematria", "lang_links_list", "number_neighbors", "fn_all_methods", "world_group_source_arrivals_v2", "rd_is_admin", "fn_list_family", "fn_name_protocol", "fn_cross_research"];
// The Preview is restricted to existing accounts. This identity RPC is forwarded so an
// already-linked account can recover its canonical Person ref; every Person/Family upsert
// remains blocked below. The approved owner's Person exists before this disposable build.
const existingPersonAccess = "fn_get_or_create_my_person";
// Match the existing public reader's closed projection. Joined contributor
// columns are deliberately excluded. Replies/counts await chain-visibility acceptance.
const communityFields = "id,parent_id,author_name,author_user_id,author_contributor_id,title,body,reactions,origin,created_at,edited_at,is_deleted,total_count";
// The unified working preview must not create Person records or record ELS traces.
const unifiedReadOnly = typeof process !== "undefined" && ["gpt/2029-central-unified-workspace-20261029", "gpt/2029-central-shell-alignment-20261029", "gpt/2029-central-topbar-menu-completion-20261029", "gpt/2029-central-ui-carry-restoration-20261029", "gpt/2029-central-community-filter-tiles-20261029", "gpt/2029-central-community-small-filters-20261029", "gpt/2029-central-single-command-bar-20261029"].includes(process.env.VERCEL_GIT_COMMIT_REF);
const worker = `const reads = new Set(${JSON.stringify(allow)});
const existingPersonAccess=${JSON.stringify(existingPersonAccess)};
const unifiedReadOnly=${JSON.stringify(unifiedReadOnly)};
const communityFields=${JSON.stringify(communityFields)};
const communityReads=new Set(['community_feed_page','community_message_context']);
const authOrigin='https://linswmnnkjxvweumprav.supabase.co';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 const req=event.request,u=new URL(req.url),rpc=u.pathname.match(/^\\/rest\\/v1\\/rpc\\/(.+)$/)?.[1];
 const communityRead=u.origin===authOrigin&&communityReads.has(rpc);
 const communityProjection=communityRead&&u.searchParams.getAll('select').length===1&&u.searchParams.get('select')===communityFields;
 const ambiguousPath=(u.pathname.includes('%')&&!u.pathname.startsWith('/storage/v1/'))
  ||(u.pathname.toLowerCase().includes('/rest/v1/rpc/')&&(!u.pathname.startsWith('/rest/v1/rpc/')||!rpc||!/^[a-z_][a-z0-9_]*$/.test(rpc)));
 if(req.method!=='OPTIONS'&&u.origin===authOrigin&&(ambiguousPath||(communityRead&&!communityProjection)||['community_replies_page','community_reply_counts'].includes(rpc))){
  event.respondWith(Promise.resolve(new Response(JSON.stringify({error:'preview_read_only'}),{status:403,headers:{'Content-Type':'application/json','X-Preview-Write-Blocked':'true'}})));return;
 }
 const safe=(!u.pathname.startsWith('/auth/v1/')&&['GET','HEAD','OPTIONS'].includes(req.method))
  ||(u.origin===authOrigin&&req.method==='POST'&&(reads.has(rpc)||communityProjection||(!unifiedReadOnly&&rpc===existingPersonAccess)));
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
  if(!unifiedReadOnly&&req.method==='POST'&&u.hostname==='linswmnnkjxvweumprav.supabase.co'&&u.pathname==='/functions/v1/els-search-bridge'){
   try{const body=await req.clone().json();if(['page','verify','verify_batch'].includes(body.op))return fetch(req);}catch{}
  }
  return new Response(JSON.stringify({error:'preview_read_only'}),{status:403,headers:{'Content-Type':'application/json','X-Preview-Write-Blocked':'true'}});
 })());
});`;
await writeFile(resolve(output, "preview-readonly-sw.js"), worker);
// A push opt-in must never replace the Preview guard with the production push worker.
await writeFile(resolve(output, "sw.js"), worker);
// vercel.json's buildCommand takes precedence over a deployment-level override.
// Only these explicitly isolated Git branches may select the hosted mock variant.
// Keep this exact allowlist narrow: a gpt/* prefix would let an unrelated branch
// opt into a transport fixture that is intended only for reviewed Preview cuts.
const legacyMockBranch = "gpt/2029-central-raziel-safe-actions-integration-20261026";
const personalNavigationMockBranch = "gpt/2029-central-raziel-personal-navigation-integration-20261026";
const unifiedWorkspaceMockBranch = "gpt/2029-central-unified-workspace-20261029";
const centralShellMockBranch = "gpt/2029-central-shell-alignment-20261029";
const topbarMenuMockBranch = "gpt/2029-central-topbar-menu-completion-20261029";
const carryRestorationMockBranch = "gpt/2029-central-ui-carry-restoration-20261029";
const communityFilterTilesMockBranch = "gpt/2029-central-community-filter-tiles-20261029";
const communitySmallFiltersMockBranch = "gpt/2029-central-community-small-filters-20261029";
const singleCommandBarMockBranch = "gpt/2029-central-single-command-bar-20261029";
const allowedMockBranches = new Set([legacyMockBranch, personalNavigationMockBranch, unifiedWorkspaceMockBranch, centralShellMockBranch, topbarMenuMockBranch, carryRestorationMockBranch, communityFilterTilesMockBranch, communitySmallFiltersMockBranch, singleCommandBarMockBranch]);
const selectMockPreviewBranch = env => {
  const branch = typeof env.VERCEL_GIT_COMMIT_REF === "string" ? env.VERCEL_GIT_COMMIT_REF : "";
  const explicitMock = env.SOD_RAZIEL_SAFE_ACTIONS_PREVIEW === "true";
  const approvedGitPreview = env.VERCEL_ENV === "preview" && allowedMockBranches.has(branch);
  if (!explicitMock && !approvedGitPreview) return null;
  if (env.VERCEL_ENV === "production") throw new Error("mock_preview_is_never_production");
  if (branch && !allowedMockBranches.has(branch)) throw new Error("mock_preview_branch_mismatch");
  // Preserve the existing local explicit-build behavior when Vercel has not
  // supplied a Git ref. Hosted receipts always use the actual approved ref.
  return branch || legacyMockBranch;
};
const selectedMockBranch = selectMockPreviewBranch(process.env);
const razielSafeActionsMock = selectedMockBranch !== null;
if (razielSafeActionsMock) {
  const expectedBranch = selectedMockBranch;
  const { buildRazielSafeActionsPreviewWorker } = await import("../test/helpers/raziel-safe-actions-preview-fixture.mjs");
  const outputWorker = buildRazielSafeActionsPreviewWorker(worker);
  await writeFile(resolve(output, "preview-readonly-sw.js"), outputWorker);
  await writeFile(resolve(output, "sw.js"), outputWorker);
  const { execFileSync } = await import("node:child_process");
  const sha = process.env.VERCEL_GIT_COMMIT_SHA || execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  await writeFile(resolve(output, "preview-identity.json"), JSON.stringify({ sha, branch: expectedBranch, transport: "mock-only", product_writes: false, edge_deploy: false }));
  if ([carryRestorationMockBranch, communityFilterTilesMockBranch, communitySmallFiltersMockBranch, singleCommandBarMockBranch].includes(expectedBranch)) {
    const audit = JSON.parse(await readFile(resolve(root, "docs/reviews/ui-carry-receipt-20261029.json"), "utf8"));
    // Publish only build identity and a coverage marker. Source handoffs and
    // internal planning evidence stay in the repository/canonical planning row.
    await writeFile(resolve(output, "preview-carry-receipt.json"), JSON.stringify({
      sha, branch: expectedBranch, audit_date_utc: audit.audit_date_utc,
      surface_count: audit.surfaces.length, verification: "partial",
      product_writes: false, edge_deploy: false,
    }, null, 2));
  }
}
const bootstrap = `<script type="module">if(!('serviceWorker' in navigator)){document.body.textContent='פריוויו זה דורש דפדפן התומך בתצוגה לקריאה בלבד.';}else{await navigator.serviceWorker.register('/preview-readonly-sw.js',{scope:'/'});await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}));await import('__ENTRY__');}</script>`;
let html = await readFile(resolve(output, "2029.html"), "utf8");
const entry = html.match(/<script\b[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>/);
if (!entry) throw new Error("missing2029Entry");
html = html.replace(entry[0], bootstrap.replace("__ENTRY__", entry[1]));
if (razielSafeActionsMock) {
  const notice = '<style>body:has(#sod29-mobile-navigation,.sod29-frame-panel,[data-raziel-companion-view="open"]) > [data-raziel-preview-transport="mock-only"]{display:none}[data-raziel-preview-disclosure="mock-only"]{margin:6px 12px;padding:6px 8px;border:1px solid var(--s29-line-strong);border-radius:8px;background:var(--s29-panel-soft);color:var(--s29-ink);font:14px/1.4 var(--s29-font-ui);overflow-wrap:anywhere}</style><aside data-raziel-preview-transport="mock-only" role="note" dir="rtl" style="position:fixed;z-index:2147483000;inset-inline:8px;bottom:82px;padding:6px 10px;border:1px solid #98783e;border-radius:8px;background:#fff5de;color:#231b12;font:14px/1.4 Arial;text-align:center;pointer-events:none">פריוויו בדיקה · תשובות דמה בלבד · אין קריאות מודל או כתיבה חיה. אפשר לשאול על משיח, או לכתוב „שמור שיחה”.</aside>';
  html = html.replace("</body>", notice + "</body>");
}
await writeFile(resolve(output, "2029.html"), html);
await writeFile(resolve(output, "index.html"), html);
await mkdir(resolve(output, "preview-evidence"), { recursive: true });
for (const name of ["corrected-answer.png", "fresh-session-next-question.png", "failed-save-reopens-question.png", "fresh-session-completes-pending-save.png"]) {
  await copyFile(resolve(root, "preview-deploy/evidence", name), resolve(output, "preview-evidence", name));
}
console.log("Static integrated Preview built; read-only guard runs before App2029.");
