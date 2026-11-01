import ogHandler from "../api/og.js";
import { mergePublicDocumentMetadata } from "../preview-deploy/api/public-document.js";
// Disposable static Preview output. It never deploys Edge functions or live migrations.
import { build } from "vite";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, writeFile, copyFile, mkdir } from "node:fs/promises";
import { COMMUNITY_UPLOAD_POLICY } from "../src/lib/community/communityUploadPolicy.js";
import { AVATAR_UPLOAD_POLICY } from "../src/lib/userCenter/avatarPolicy.js";
import { execFileSync } from "node:child_process";

const END_TO_END_BRANCH = "gpt/2029-unified-community-latest-integration-20261031";
if ([END_TO_END_BRANCH, "gpt/2029-unified-performance-consolidation-20261031", "gpt/2029-home-loading-acceptance-20261031", "gpt/2029-unified-end-to-end-preview-20261031"].includes(process.env.VERCEL_GIT_COMMIT_REF) && process.env.VERCEL_ENV === "production") {
  throw new Error("unified_preview_is_never_production");
}

const POSTS_PREVIEW_BRANCH = "gpt/posts-integrated-backgrounds-20261030";
if (["gpt/2029-functional-unified-preview-20261031", "gpt/2029-public-foundation-continuity-20261101", "gpt/2029-public-frame-context-20261101", "gpt/2029-community1187-unified-20261101", "gpt/2029-number-fullpage-performance-20261101", "gpt/2029-world-one-tree-sources-20261101", "gpt/2029-public-world-number-acceptance-20261101", "gpt/2029-public-launch-candidate-20261101", "gpt/2029-public-reading-release-configuration-20261101"].includes(process.env.VERCEL_GIT_COMMIT_REF) && process.env.VERCEL_ENV !== "preview") {
  throw new Error("functional_preview_requires_preview_environment");
}
if (process.env.VERCEL_GIT_COMMIT_REF === POSTS_PREVIEW_BRANCH && process.env.VERCEL_ENV === "production") {
  throw new Error("posts_preview_is_never_production");
}

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "preview-deploy/dist");
const functionalPreviewBuild = process.env.VERCEL_ENV === "preview"
  && ["gpt/2029-functional-unified-preview-20261031", "gpt/2029-public-foundation-continuity-20261101", "gpt/2029-public-frame-context-20261101", "gpt/2029-community1187-unified-20261101", "gpt/2029-number-fullpage-performance-20261101", "gpt/2029-world-one-tree-sources-20261101", "gpt/2029-public-world-number-acceptance-20261101", "gpt/2029-public-launch-candidate-20261101", "gpt/2029-public-reading-release-configuration-20261101"].includes(process.env.VERCEL_GIT_COMMIT_REF);
const launchReadOnlyBuild = process.env.VERCEL_ENV === "preview" && ["gpt/2029-public-launch-candidate-20261101", "gpt/2029-public-reading-release-configuration-20261101"].includes(process.env.VERCEL_GIT_COMMIT_REF);
const publicFoundationBuild = process.env.VERCEL_ENV === "preview" && ["gpt/2029-public-foundation-continuity-20261101", "gpt/2029-public-frame-context-20261101", "gpt/2029-community1187-unified-20261101", "gpt/2029-number-fullpage-performance-20261101", "gpt/2029-world-one-tree-sources-20261101", "gpt/2029-public-world-number-acceptance-20261101", "gpt/2029-public-launch-candidate-20261101", "gpt/2029-public-reading-release-configuration-20261101"].includes(process.env.VERCEL_GIT_COMMIT_REF);
const publicReadingBuild = process.env.VERCEL_ENV === "preview" && process.env.VERCEL_GIT_COMMIT_REF === "gpt/2029-public-reading-release-configuration-20261101";
process.env.SOD_BUILD_TARGET = "2029";
// Same source/content gate used by the regular builds; no Preview exemption.
execFileSync(process.execPath, [resolve(root, "scripts/test-one-tree-content-contract.mjs")], { cwd: root, stdio: "inherit" });
await build({ root, define: {
  "import.meta.env.VITE_PUBLIC_READING_RELEASE": JSON.stringify(publicReadingBuild ? "public-reading-20261101" : ""),
  "import.meta.env.VITE_PUBLIC_FRAME_PREVIEW": JSON.stringify(process.env.VERCEL_ENV === "preview" && ["gpt/2029-public-frame-context-20261101", "gpt/2029-community1187-unified-20261101", "gpt/2029-number-fullpage-performance-20261101", "gpt/2029-world-one-tree-sources-20261101", "gpt/2029-public-world-number-acceptance-20261101", "gpt/2029-public-launch-candidate-20261101", "gpt/2029-public-reading-release-configuration-20261101"].includes(process.env.VERCEL_GIT_COMMIT_REF) ? "true" : "false"),
  "import.meta.env.VITE_PUBLIC_FOUNDATION_PREVIEW": JSON.stringify(publicFoundationBuild ? "true" : "false"),
  "import.meta.env.VITE_PUBLIC_LAUNCH_READ_ONLY_PREVIEW": JSON.stringify(launchReadOnlyBuild ? "true" : "false"),
  "import.meta.env.VITE_INTEGRATED_PREVIEW": '"true"',
  "import.meta.env.VITE_KINGDOM_PREVIEW": '"true"',
  "import.meta.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW": '"true"',
  "import.meta.env.VITE_UNLOCKED_2029_PREVIEW": '"true"',
  "import.meta.env.VITE_FUNCTIONAL_UNIFIED_PREVIEW": JSON.stringify(functionalPreviewBuild ? "true" : "false"),
  ...(publicReadingBuild ? Object.fromEntries(["VITE_PUBLIC_FRAME_PREVIEW", "VITE_PUBLIC_FOUNDATION_PREVIEW", "VITE_INTEGRATED_PREVIEW", "VITE_KINGDOM_PREVIEW", "VITE_BOOK_PUBLICATION_REVIEW_PREVIEW", "VITE_UNLOCKED_2029_PREVIEW", "VITE_FUNCTIONAL_UNIFIED_PREVIEW"].map(key => ["import.meta.env." + key, '\"false\"'])) : {}),
}, build: { outDir: output, emptyOutDir: true, manifest: true } });

const allow = ["gematria_api", "fn_method_value", "fn_method_profile", "gematria_method_trace", "fn_zero_scale", "posts_by_number_strict", "fn_number_lookup", "fn_number_dossier", "fn_number_journey", "fn_verses_by_gematria", "lang_links_list", "number_neighbors", "fn_all_methods", "world_group_source_arrivals_v2", "rd_is_admin", "fn_list_family", "fn_name_protocol", "fn_cross_research"];
const launchReadOnlyPreview = typeof process !== "undefined" && process.env.VERCEL_ENV === "preview" && ["gpt/2029-public-launch-candidate-20261101", "gpt/2029-public-reading-release-configuration-20261101"].includes(process.env.VERCEL_GIT_COMMIT_REF);

const functionalPreview = typeof process !== "undefined" && process.env.VERCEL_ENV === "preview"
  && ["gpt/2029-functional-unified-preview-20261031", "gpt/2029-public-foundation-continuity-20261101", "gpt/2029-public-frame-context-20261101", "gpt/2029-community1187-unified-20261101", "gpt/2029-number-fullpage-performance-20261101", "gpt/2029-world-one-tree-sources-20261101", "gpt/2029-public-world-number-acceptance-20261101", "gpt/2029-public-launch-candidate-20261101", "gpt/2029-public-reading-release-configuration-20261101"].includes(process.env.VERCEL_GIT_COMMIT_REF);
// This is a transport boundary, never an alternative to canonical server Auth/RLS.
// New functionality belongs only to the explicitly authorized Preview branch.
function interceptFunctionalPreview(event, { req, u, rpc, authOrigin }) {
  if (u.origin === authOrigin && u.pathname === "/functions/v1/newsletter-signup") {
    event.respondWith((async () => {
      const denied = () => new Response(JSON.stringify({ error: "preview_operation_denied" }), { status: 403 });
      if (!publicFoundationPreview || req.method !== "POST" || u.search !== "?format=json") return denied();
      try {
        const raw = await req.clone().text(); if (raw.length > 12000) return denied();
        const body = JSON.parse(raw);
        if (!body || Array.isArray(body) || Object.keys(body).some(key => !["email", "source", "acquisition"].includes(key))
          || body.source !== "2029-public-updates" || typeof body.email !== "string" || body.email.length > 120
          || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)
          || (body.acquisition != null && (typeof body.acquisition !== "object" || Array.isArray(body.acquisition)))) return denied();
        return fetch(req); // Existing public signup validates/stores/sends only on explicit submit.
      } catch { return denied(); }
    })());
    return true;
  }
  const mutating = !["GET", "HEAD", "OPTIONS"].includes(req.method);
  if(u.origin===authOrigin && rpc==="convergence_meter") {
    event.respondWith((async()=>{
      try {const b=await req.clone().json();if(req.method==="POST"&&!u.search&&Object.keys(b).join(",")==="p_n"&&Number.isSafeInteger(b.p_n)&&b.p_n>0&&b.p_n<=2147483647)return fetch(req);}catch{}
      return new Response(JSON.stringify({error:"preview_operation_denied"}),{status:403});
    })());
    return true;
  }
  const personRpcs = new Set(["fn_get_or_create_my_person", "fn_upsert_self_profile", "fn_upsert_family_member", "fn_upsert_family_relation"]);
  const stateRpcs = new Set(["research_state_snapshot_v1", "research_state_apply_ops_v1", "fn_research_path_resume_v1", "fn_research_path_append_v1", "fn_research_path_fork_v1"]);
  const ownRpcKeys = {
    my_center:[],update_my_page_config:["p_config"],save_my_info:["p_full_name","p_birth_date"],
    save_els_matrix:["p_term","p_scope","p_skip","p_direction","p_positions","p_image_url","p_title","p_note","p_public","p_from_topic","p_corpus_id","p_term_norm","p_start_index","p_engine_detail"],
    self_publish_matrix:["p_id","p_on"],delete_els_matrix:["p_id"],
    follow_subject_state:["p_entity_type","p_stable_id","p_visitor"],
    follow_subject_toggle:["p_entity_type","p_stable_id","p_source","p_on","p_visitor"],
    watch_toggle:["p_topic","p_source","p_on","p_visitor"],
    dm_inbox:[],dm_thread:["p_with","p_limit"],dm_mark_read:["p_with"],dm_send:["p_to","p_body"],
    my_contributions:["p_limit"],
  };
  const hintMedia = u.origin === authOrigin && u.pathname === "/functions/v1/media-upload-intent";
  const els = u.origin === authOrigin && u.pathname === "/functions/v1/els-search-bridge";
  const heichalResearch = u.origin === authOrigin && u.pathname === "/functions/v1/research-run";
  const researchItems = u.origin === authOrigin && u.pathname === "/rest/v1/research_items" && mutating;
  const signup = u.origin === authOrigin && req.method === "POST" && ["/auth/v1/otp", "/auth/v1/signup"].includes(u.pathname);
  const razielProxy = u.origin === self.location?.origin && u.pathname === "/api/preview-raziel";
  const ownSelf = u.origin === self.location?.origin && u.pathname === "/api/contributor-self" && mutating;
  const ownProfile = u.origin === authOrigin && u.pathname === "/rest/v1/users" && mutating;
  const privateTus = u.origin === "https://linswmnnkjxvweumprav.storage.supabase.co" && /^\/storage\/v1\/upload\/resumable(?:\/[^/?#]+)?$/.test(u.pathname) && mutating;
  if (!(signup || hintMedia || els || heichalResearch || privateTus || researchItems || razielProxy || ownSelf || ownProfile || (u.origin === authOrigin && (personRpcs.has(rpc) || stateRpcs.has(rpc) || Object.hasOwn(ownRpcKeys,rpc))))) return false;
  event.respondWith((async () => {
    const denied = reason => new Response(JSON.stringify({ error: reason || "preview_operation_denied" }), { status: 403, headers: { "Content-Type": "application/json", "X-Preview-Write-Blocked": "true" } });
    try {
      if (privateTus) {
        const signature = req.headers.get("x-signature") || "";
        if (!["POST", "PATCH"].includes(req.method) || signature.length < 30 || signature.length > 4096 || req.headers.get("Tus-Resumable") !== "1.0.0" || u.search) return denied();
        if (req.method === "POST") {
          const metadata = new Map((req.headers.get("Upload-Metadata") || "").split(",").map(pair => { const [key, value] = pair.trim().split(" "); return [key, atob(value || "")]; }));
          const size = Number(req.headers.get("Upload-Length"));
          if (metadata.get("bucketName") !== "submission-inbox" || !/^sod1820\/2029\/accounts\/[0-9a-f-]{36}\//i.test(metadata.get("objectName") || "") || !metadata.get("contentType")?.startsWith("image/") || !(size > 0 && size <= 25 * 1024 * 1024)) return denied();
        }
        return fetch(req); // Storage validates the server-signed capability for this exact object.
      }
      if (signup) {
        const body = await req.clone().json();
        if (!body || typeof body.email !== "string" || !body.email.includes("@") || body.phone) return denied();
        return fetch(req); // Supabase owns confirmation, provider configuration and rate limits.
      }
      if (req.method !== "POST" && !researchItems && !ownProfile) return denied();
      const bearer = req.headers.get("Authorization") || "";
      if (!/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/i.test(bearer)) return denied("authentication_required");
      if(els) {
        const raw=await req.clone().text();if(raw.length>100000)return denied("payload_too_large");
        const body=JSON.parse(raw);
        if(!body||!["page","verify","verify_batch"].includes(body.op)||u.search)return denied();
        return fetch(req); // Canonical bridge explicitly supports guest/user quotas; no role is elevated.
      }
      if(heichalResearch){
        const raw=await req.clone().text();if(raw.length>48000)return denied();
        const b=JSON.parse(raw),keys=["number","question","visitor_id","interaction_id","requested_capabilities","surface"];
        if(!b||Array.isArray(b)||Object.keys(b).some(k=>!keys.includes(k))||u.search||b.surface!=="heichal"||!/^[0-9]{1,10}$/.test(b.number)||Number(b.number)>2147483647||typeof b.question!=="string"||Array.from(b.question).length>300||!Array.isArray(b.requested_capabilities)||b.requested_capabilities.join(",")!=="numeric,numeric_operators")return denied();
        return fetch(req); // Same public numeric Result Bundle gate, trace and budget; never a second model transport.
      }
      const authResponse = await fetch(authOrigin + "/auth/v1/user", { headers: { apikey: req.headers.get("apikey") || "", Authorization: bearer }, credentials: "omit" });
      if (!authResponse.ok) return denied("authentication_required");
      const user = await authResponse.json();
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(user?.id || "")) return denied();
      const raw = req.method === "DELETE" ? "{}" : await req.clone().text();
      if (raw.length > 100000) return denied("payload_too_large");
      const body = JSON.parse(raw || "{}");
      if(ownSelf){
        if(u.search||!body||body.ack!==true)return denied();
        const keys=Object.keys(body).sort().join(",");
        const valid=body.action==="create" ? keys==="ack,action,bio,displayName"&&typeof body.displayName==="string"&&typeof body.bio==="string"&&body.displayName.trim().length>0&&Array.from(body.displayName).length<=60&&Array.from(body.bio).length<=600
          :body.action==="portrait" ? keys==="ack,action,enabled"&&typeof body.enabled==="boolean"
          :body.action==="avatar"&&keys==="ack,action,publish,url"&&body.publish===true&&typeof body.url==="string";
        if(!valid)return denied();
        if(body.action==="avatar"){
          const image=new URL(body.url),prefix="/storage/v1/object/public/gallery/avatars/"+user.id+"-";
          if(image.origin!==authOrigin||image.username||image.password||image.search||image.hash||!image.pathname.startsWith(prefix)||!/^[0-9]{13}\.(jpg|jpeg|png|webp|gif)$/.test(image.pathname.slice(prefix.length)))return denied();
        }
        return fetch(req); // Canonical self handler re-verifies JWT and caller-bound ownership/consent.
      }
      if(ownProfile){
        if(req.method!=="PATCH"||u.searchParams.get("id")!=="eq."+user.id||!body||Array.isArray(body)||Object.keys(body).some(k=>!["username","display_name","avatar_url"].includes(k)))return denied();
        if(Object.values(body).some(v=>v!==null&&(typeof v!=="string"||v.length>2048)))return denied();
        if(body.avatar_url){
          const avatar=new URL(body.avatar_url);
          const prefix="/storage/v1/object/public/gallery/avatars/"+user.id+"-";
          if(avatar.origin!==authOrigin||!avatar.pathname.startsWith(prefix)||avatar.search||avatar.hash){
            const old=await fetch(authOrigin+"/rest/v1/users?select=avatar_url&id=eq."+user.id,{headers:{apikey:req.headers.get("apikey")||"",Authorization:bearer},credentials:"omit"});
            if(!old.ok||(await old.json())?.[0]?.avatar_url!==body.avatar_url)return denied();
          }
        }
        return fetch(req);
      }
      if(Object.hasOwn(ownRpcKeys,rpc)){
        if(u.search||!body||Array.isArray(body)||Object.keys(body).some(key=>!ownRpcKeys[rpc].includes(key)))return denied();
        return fetch(req); // Existing RPC owns Auth/RLS, publication truth and any administrator check.
      }
      if (razielProxy) {
        if(u.search || body?.kind!=="research" || body?.persona!=="raziel" || body?.research_contract!=="public-number-research-run-v1" || typeof body.subject!=="string" || !body.subject.trim() || Array.from(body.subject).length>300) return denied();
        return fetch(req); // Same-origin server verifies platform identity; Edge owns quotas and receipts.
      }
      if (hintMedia) {
        const operations = new Set(["issue", "verify_hint_media", "bind_hint_media", "read_hint_media", "detach_hint_media", "retry_hint_media_cleanup", "delete_hint", "retry_hint_delete_cleanup"]);
        if (!operations.has(body?.action) || (body.action === "issue" && (body.owner_kind !== "research_item_hint" || body.kind !== "image")) || u.search) return denied();
        return fetch(req); // Server verifies owner, signed receipts, private bindings and cleanup.
      }
      if (personRpcs.has(rpc) || stateRpcs.has(rpc)) {
        if (!body || Array.isArray(body) || typeof body !== "object" || u.search || (rpc === "fn_get_or_create_my_person" && Object.keys(body).length)) return denied();
        return fetch(req); // Existing functions derive identity from auth.uid(), never client role claims.
      }
      if (researchItems) {
        const keys = new Set(["id", "user_id", "bucket", "entity_type", "entity_ref", "title", "link", "metadata"]);
        if (req.method === "POST") {
          const rows = Array.isArray(body) ? body : [body];
          if (!rows.length || rows.length > 50 || rows.some(row => !row || row.user_id !== user.id || Object.keys(row).some(key => !keys.has(key)))) return denied("owned_item_required");
          return fetch(req);
        }
        if (!["PATCH", "DELETE"].includes(req.method) || !/^eq\.[0-9a-f-]{36}$/i.test(u.searchParams.get("id") || "")) return denied();
        if (req.method === "PATCH" && (Array.isArray(body) || Object.keys(body).some(key => !["title", "link", "metadata"].includes(key)))) return denied();
        const owned = new URL(u); owned.searchParams.set("user_id", "eq." + user.id);
        return fetch(new Request(owned.href, req));
      }
      return denied();
    } catch { return denied(); }
  })());
  return true;
}
// One explicit, authenticated user turn may reach the EXISTING live server.
// This is not an Edge rollout, matrix job allowance or product-write exemption.
const realRazielPreview = typeof process !== "undefined" && process.env.VERCEL_ENV === "preview"
  && ["gpt/2029-unified-end-to-end-preview-20261031", "gpt/2029-unified-community-latest-integration-20261031", "gpt/2029-unified-performance-consolidation-20261031", "gpt/2029-home-loading-acceptance-20261031", "gpt/2029-functional-unified-preview-20261031", "gpt/2029-public-foundation-continuity-20261101", "gpt/2029-public-frame-context-20261101", "gpt/2029-community1187-unified-20261101", "gpt/2029-number-fullpage-performance-20261101", "gpt/2029-world-one-tree-sources-20261101", "gpt/2029-public-world-number-acceptance-20261101", "gpt/2029-public-launch-candidate-20261101", "gpt/2029-public-reading-release-configuration-20261101"].includes(process.env.VERCEL_GIT_COMMIT_REF);
const endToEndReadOnly = typeof process !== "undefined"
  && ["gpt/2029-unified-end-to-end-preview-20261031", "gpt/2029-unified-community-latest-integration-20261031", "gpt/2029-unified-performance-consolidation-20261031", "gpt/2029-home-loading-acceptance-20261031"].includes(process.env.VERCEL_GIT_COMMIT_REF);
// The Preview is restricted to existing accounts. This identity RPC is forwarded so an
// already-linked account can recover its canonical Person ref; every Person/Family upsert
// remains blocked below. The approved owner's Person exists before this disposable build.
const existingPersonAccess = "fn_get_or_create_my_person";
// Match the existing public reader's closed projection. Joined contributor
// columns are deliberately excluded. Reply pages require the parent-chain check below;
// raw reply-count RPCs remain blocked.
const communityFields = "id,parent_id,author_name,author_user_id,author_contributor_id,title,body,reactions,origin,created_at,edited_at,is_deleted,total_count";
// ZURIEL explicitly authorized this single protected Preview to manage Community
// messages through the reviewed server RPCs. No general write or model allowance.
const communityMessageManagement = typeof process !== "undefined"
  && process.env.VERCEL_ENV === "preview"
  && ["gpt/community-server-auth-20261031", "gpt/community-auth-publish-media-20261031", "gpt/2029-unified-community-latest-integration-20261031", "gpt/2029-unified-performance-consolidation-20261031", "gpt/2029-home-loading-acceptance-20261031", "gpt/2029-functional-unified-preview-20261031", "gpt/2029-public-foundation-continuity-20261101", "gpt/2029-public-frame-context-20261101", "gpt/2029-community1187-unified-20261101", "gpt/2029-number-fullpage-performance-20261101", "gpt/2029-world-one-tree-sources-20261101", "gpt/2029-public-world-number-acceptance-20261101", "gpt/2029-public-launch-candidate-20261101", "gpt/2029-public-reading-release-configuration-20261101"].includes(process.env.VERCEL_GIT_COMMIT_REF);
const communityPublishing = typeof process !== "undefined" && process.env.VERCEL_ENV === "preview"
  && ["gpt/community-auth-publish-media-20261031", "gpt/2029-unified-community-latest-integration-20261031", "gpt/2029-unified-performance-consolidation-20261031", "gpt/2029-home-loading-acceptance-20261031", "gpt/2029-functional-unified-preview-20261031", "gpt/2029-public-foundation-continuity-20261101", "gpt/2029-public-frame-context-20261101", "gpt/2029-community1187-unified-20261101", "gpt/2029-number-fullpage-performance-20261101", "gpt/2029-world-one-tree-sources-20261101", "gpt/2029-public-world-number-acceptance-20261101", "gpt/2029-public-launch-candidate-20261101", "gpt/2029-public-reading-release-configuration-20261101"].includes(process.env.VERCEL_GIT_COMMIT_REF);
// The unified working preview must not create Person records or record ELS traces.
const unifiedReadOnly = typeof process !== "undefined" && ["gpt/2029-central-unified-workspace-20261029", "gpt/2029-central-shell-alignment-20261029", "gpt/2029-central-topbar-menu-completion-20261029", "gpt/2029-central-ui-carry-restoration-20261029", "gpt/2029-central-community-filter-tiles-20261029", "gpt/2029-central-community-small-filters-20261029", "gpt/2029-central-single-command-bar-20261029", "gpt/2029-central-public-context-labels-20261029", "gpt/2029-central-zvi-public-material-20261029", "gpt/2029-central-zvi-research-experience-20261029", "gpt/2029-central-zvi-world-source-tree-20261030", "gpt/elections-world-seed-integration-20261030", "gpt/posts-integrated-backgrounds-20261030", "gpt/2029-central-posts-els-raziel-integration-20261031"].includes(process.env.VERCEL_GIT_COMMIT_REF);
const worker = `const reads = new Set(${JSON.stringify(allow)});
const functionalPreview=${JSON.stringify(functionalPreview)};
const publicFoundationPreview=${JSON.stringify(functionalPreview && ["gpt/2029-public-foundation-continuity-20261101", "gpt/2029-public-frame-context-20261101", "gpt/2029-community1187-unified-20261101", "gpt/2029-number-fullpage-performance-20261101", "gpt/2029-world-one-tree-sources-20261101", "gpt/2029-public-world-number-acceptance-20261101", "gpt/2029-public-launch-candidate-20261101", "gpt/2029-public-reading-release-configuration-20261101"].includes(process.env.VERCEL_GIT_COMMIT_REF))};
if(publicFoundationPreview){reads.add("is_number_indexable");reads.add("is_phrase_indexable");}
${interceptFunctionalPreview.toString()}
const existingPersonAccess=${JSON.stringify(existingPersonAccess)};
const unifiedReadOnly=${JSON.stringify((unifiedReadOnly || communityMessageManagement || endToEndReadOnly) && !functionalPreview)};
const realRazielPreview=${JSON.stringify(realRazielPreview)};
const communityMessageManagement=${JSON.stringify(communityMessageManagement)};
const communityPublishing=${JSON.stringify(communityPublishing)};
const uploadPolicy=${JSON.stringify(COMMUNITY_UPLOAD_POLICY)};
const avatarPolicy=${JSON.stringify(AVATAR_UPLOAD_POLICY)};
const communityFields=${JSON.stringify(communityFields)};
const communityReads=new Set(['community_feed_page','community_message_context']);
const authOrigin='https://linswmnnkjxvweumprav.supabase.co';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 const req=event.request,u=new URL(req.url),rpc=u.pathname.match(/^\\/rest\\/v1\\/rpc\\/(.+)$/)?.[1];
${launchReadOnlyPreview ? " if(u.origin===self.location.origin && /^\\/api\\/(?:preview-raziel|contributor-self)(?:\\/|$)/.test(u.pathname) && !['GET','HEAD','OPTIONS'].includes(req.method) || u.origin===authOrigin && ((u.pathname.startsWith('/functions/v1/')) || (u.pathname.startsWith('/auth/v1/') && !['GET','HEAD','OPTIONS'].includes(req.method)) || (u.pathname.startsWith('/rest/v1/') && !['GET','HEAD','OPTIONS'].includes(req.method) && !(req.method==='POST' && (reads.has(rpc)||['community_feed_page','community_message_context','community_replies_page','convergence_meter'].includes(rpc)))) || (u.pathname.startsWith('/storage/v1/') && !['GET','HEAD','OPTIONS'].includes(req.method)))){\n  event.respondWith(Promise.resolve(new Response(JSON.stringify({error:'launch_acceptance_pending'}),{status:403,headers:{'Content-Type':'application/json','X-Preview-Write-Blocked':'true'}})));return;\n }\n" : ""} if(functionalPreview&&interceptFunctionalPreview(event,{req,u,rpc,authOrigin}))return;
 if(req.method==='OPTIONS')return;
 if(u.origin===authOrigin&&rpc==='community_replies_page'&&communityPublishing){
  event.respondWith((async()=>{
   const blocked=()=>new Response(JSON.stringify({error:'preview_read_only'}),{status:403,headers:{'Content-Type':'application/json','X-Preview-Write-Blocked':'true'}});
   if(req.method!=='POST'||u.searchParams.size!==1||u.searchParams.get('select')!==communityFields)return blocked();
   try{
    const b=await req.clone().json();
    if(!b||Object.keys(b).sort().join(',')!=='p_limit,p_offset,p_parent'||!/^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(b.p_parent)||!Number.isSafeInteger(b.p_offset)||b.p_offset<0||b.p_offset>1000000||!Number.isSafeInteger(b.p_limit)||b.p_limit<1||b.p_limit>100)return blocked();
    const context=await fetch(authOrigin+'/rest/v1/rpc/community_message_context?select='+encodeURIComponent(communityFields),{method:'POST',headers:{apikey:req.headers.get('apikey')||'',Authorization:req.headers.get('Authorization')||'','Content-Type':'application/json'},body:JSON.stringify({p_id:b.p_parent}),credentials:'omit'});
    if(!context.ok)return new Response(JSON.stringify({error:'public_reply_context_unavailable'}),{status:503,headers:{'Content-Type':'application/json'}});
    const chain=await context.json();
    if(!Array.isArray(chain))return blocked();
    if(!chain.some(row=>row.id===b.p_parent))return new Response('[]',{status:200,headers:{'Content-Type':'application/json'}});
    return fetch(req);
   }catch{return blocked();}
  })());return;
 }
 const avatarStorage=u.origin===authOrigin&&u.pathname.startsWith('/storage/v1/object/gallery/avatars/')&&!['GET','HEAD'].includes(req.method);
 const avatarSave=u.origin===self.location?.origin&&u.pathname==='/api/contributor-self'&&req.method==='POST';
 if(avatarStorage||avatarSave){
  event.respondWith((async()=>{
   const blocked=()=>new Response(JSON.stringify({error:'preview_read_only'}),{status:403,headers:{'Content-Type':'application/json','X-Preview-Write-Blocked':'true'}});
   const bearer=req.headers.get('Authorization')||'';
   if(!communityPublishing||req.method!=='POST'||u.search||!/^Bearer [A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$/i.test(bearer))return blocked();
   try{
    if(avatarSave){
     const b=await req.clone().json();
     if(!b||typeof b!=='object'||Object.keys(b).sort().join(',')!=='ack,action,publish,url'||b.action!=='avatar'||b.ack!==true||b.publish!==true||typeof b.url!=='string')return blocked();
     const image=new URL(b.url);
     if(image.origin!==authOrigin||image.search||image.hash||image.username||image.password||!/^\\/storage\\/v1\\/object\\/public\\/gallery\\/avatars\\/[0-9a-f-]{36}-[0-9]{13}\\.(jpg|jpeg|png|webp|gif)$/.test(image.pathname))return blocked();
     return fetch(req); // The canonical self handler verifies caller + URL ownership.
    }
    const path=/^\\/storage\\/v1\\/object\\/gallery\\/avatars\\/([0-9a-f-]{36})-[0-9]{13}\\.(jpg|jpeg|png|webp|gif)$/.exec(u.pathname);
    if(!path||req.headers.get('x-upsert')!=='false'||!req.headers.get('Content-Type')?.startsWith('multipart/form-data;'))return blocked();
    const form=await req.clone().formData();if([...form.keys()].some(k=>!['','cacheControl'].includes(k))||form.getAll('').length!==1)return blocked();
    const file=form.get(''),extensions=avatarPolicy.types[file?.type?.toLowerCase()];
    if(!extensions?.includes(path[2])||!(file.size>0)||file.size>avatarPolicy.maxBytes)return blocked();
    const identity=await fetch(authOrigin+'/auth/v1/user',{headers:{apikey:req.headers.get('apikey')||'',Authorization:bearer},credentials:'omit'});
    if(!identity.ok||(await identity.json())?.id!==path[1])return blocked();
    return fetch(req);
   }catch{}
   return blocked();
  })());return;
 }
 const publishRpc=['add_contribution','toggle_contribution_reaction','contributors_claim_legacy'].includes(rpc);
 const communityUpload=u.origin===authOrigin&&u.pathname.startsWith('/storage/v1/object/gallery/community/');
 if(u.origin===authOrigin&&(publishRpc||communityUpload&&req.method!=='GET'&&req.method!=='HEAD')){
  event.respondWith((async()=>{
   const blocked=()=>new Response(JSON.stringify({error:'preview_read_only'}),{status:403,headers:{'Content-Type':'application/json','X-Preview-Write-Blocked':'true'}});
   const bearer=req.headers.get('Authorization')||'';
   if(!communityPublishing||req.method!=='POST'||u.search||!/^Bearer [A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$/i.test(bearer))return blocked();
   const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
   const verifiedUser=async(requireConfirmed=false)=>{const r=await fetch(authOrigin+'/auth/v1/user',{method:'GET',headers:{apikey:req.headers.get('apikey')||'',Authorization:bearer},credentials:'omit'});if(!r.ok)return null;const user=await r.json();return uuid(user?.id)&&(!requireConfirmed||user.email_confirmed_at)?user.id:null;};
   try{
    if(communityUpload){
     const path=/^\\/storage\\/v1\\/object\\/gallery\\/community\\/([0-9a-f-]{36})\\/([0-9a-f-]{36})\\.([a-z0-9]+)$/i.exec(u.pathname);
     if(!path||!uuid(path[1])||!uuid(path[2])||req.headers.get('x-upsert')!=='false'||!req.headers.get('Content-Type')?.startsWith('multipart/form-data;'))return blocked();
     const form=await req.clone().formData();
     if([...form.keys()].some(key=>!['','cacheControl'].includes(key))||form.getAll('').length!==1)return blocked();
     const file=form.get(''),type=uploadPolicy.types[file?.type?.toLowerCase()];
     if(!type||!type.extensions.includes(path[3].toLowerCase())||!(file.size>0)||file.size>(type.kind==='video'?uploadPolicy.videoMaxBytes:uploadPolicy.fileMaxBytes))return blocked();
     if(await verifiedUser()!==path[1])return blocked();
     return fetch(req);
    }
    const body=await req.clone().json();if(!body||typeof body!=='object'||Array.isArray(body))return blocked();
    const keys=Object.keys(body).sort().join(',');
    if(rpc==='contributors_claim_legacy'){
     // The existing server checks exact confirmed email and unclaimed status.
     // No target user/email/role is accepted from a client or a display name.
     if(keys==='p_contributor_id'&&uuid(body.p_contributor_id)&&await verifiedUser(true))return fetch(req);
    }else if(rpc==='toggle_contribution_reaction'){
     if(keys==='p_emoji,p_id,p_visitor'&&uuid(body.p_id)&&['👍','💡','🔥','🙏','✨'].includes(body.p_emoji)&&body.p_visitor===null)return fetch(req);
    }else{
     const expected='p_author_name,p_body,p_gematria_claim,p_image_url,p_intent,p_origin,p_parent_id,p_target_id,p_target_type,p_title';
     if(keys!==expected||body.p_origin!=='community_2029'||body.p_intent!=='תגובה'||body.p_target_type!=='home'||body.p_target_id!=='community'||body.p_title!==null||body.p_gematria_claim!==null||body.p_image_url!==null||!(body.p_parent_id===null||uuid(body.p_parent_id))||typeof body.p_body!=='string'||!body.p_body.trim()||Array.from(body.p_body).length>6000||!(body.p_author_name===null||typeof body.p_author_name==='string'&&body.p_author_name.length<=200))return blocked();
     if(!await verifiedUser())return blocked();
     return fetch(req);
    }
   }catch{}
   return blocked();
  })());return;
 }
 const managementRpc=['community_message_actions_v1','community_edit_message','community_delete_message'].includes(rpc);
 if(u.origin===authOrigin&&managementRpc){
  event.respondWith((async()=>{
   const blocked=()=>new Response(JSON.stringify({error:'preview_read_only'}),{status:403,headers:{'Content-Type':'application/json','X-Preview-Write-Blocked':'true'}});
   if(!communityMessageManagement||req.method!=='POST'||u.search||!/^Bearer [A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$/i.test(req.headers.get('Authorization')||''))return blocked();
   try{
    const body=await req.clone().json();
    const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
    if(!body||typeof body!=='object'||Array.isArray(body))return blocked();
    const keys=Object.keys(body).sort().join(',');
    const permitted=rpc==='community_message_actions_v1'
      ? keys==='p_ids'&&Array.isArray(body.p_ids)&&body.p_ids.length<=100&&body.p_ids.every(uuid)
      : rpc==='community_delete_message'
        ? keys==='p_id'&&uuid(body.p_id)
        : keys==='p_body,p_id'&&uuid(body.p_id)&&typeof body.p_body==='string'&&body.p_body.trim().length>0&&Array.from(body.p_body.trim()).length<=6000;
    if(permitted)return fetch(req);
   }catch{}
   return blocked();
  })());return;
 }
 const communityRead=u.origin===authOrigin&&communityReads.has(rpc);
 const communityProjection=communityRead&&u.searchParams.getAll('select').length===1&&u.searchParams.get('select')===communityFields;
 const ambiguousPath=(u.pathname.includes('%')&&!u.pathname.startsWith('/storage/v1/'))
  ||(u.pathname.toLowerCase().includes('/rest/v1/rpc/')&&(!u.pathname.startsWith('/rest/v1/rpc/')||!rpc||!/^[a-z_][a-z0-9_]*$/.test(rpc)));
 if(req.method!=='OPTIONS'&&u.origin===authOrigin&&(ambiguousPath||(communityRead&&!communityProjection)||['community_replies_page','community_reply_counts'].includes(rpc))){
  event.respondWith(Promise.resolve(new Response(JSON.stringify({error:'preview_read_only'}),{status:403,headers:{'Content-Type':'application/json','X-Preview-Write-Blocked':'true'}})));return;
 }
 const safe=(!u.pathname.startsWith('/auth/v1/')&&['GET','HEAD','OPTIONS'].includes(req.method))
  ||(u.origin===authOrigin&&req.method==='POST'&&(reads.has(rpc)||communityProjection||(!unifiedReadOnly&&rpc===existingPersonAccess)
    ||(realRazielPreview&&['research_state_snapshot_v1','fn_research_path_resume_v1','dm_inbox'].includes(rpc))));
 if(safe)return;
 if(u.origin===authOrigin&&u.pathname==='/functions/v1/ai-analyze'&&req.method!=='GET'&&req.method!=='HEAD'){
  event.respondWith((async()=>{
   const denied=(error='preview_read_only')=>new Response(JSON.stringify({error}),{status:403,headers:{'Content-Type':'application/json','X-Preview-Write-Blocked':'true'}});
   if(!realRazielPreview||req.method!=='POST'||u.search||!/^Bearer [A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$/i.test(req.headers.get('Authorization')||''))return denied();
   try{
    const raw=await req.clone().text();if(raw.length>24000)return denied();
    const b=JSON.parse(raw);
    if(!b||Array.isArray(b)||b.kind!=='research'||b.persona!=='raziel'||b.research_contract!=='public-number-research-run-v1'||typeof b.subject!=='string'||!b.subject.trim()||Array.from(b.subject).length>300)return denied();
    // Live v90 lacks the newest owned-occurrence receipt. Never silently run
    // an expensive matrix action or turn an unsupported ELS action into chat.
    if(b.els_matrix_context||b.els_matrix_reading_action||b.els_planning_action)return denied('preview_server_contract_pending');
    const keys=new Set(['kind','persona','subject','facts','context','path','again','metatron','visitor_id','intelligence_level','surface_semantic','conversation_resolution','research_contract','interaction_id','companion_action','view_mode']);
    if(Object.keys(b).some(k=>!keys.has(k)))return denied();
    return fetch(req); // Existing server verifies Auth, availability and quota.
   }catch{return denied();}
  })());return;
 }
 event.respondWith((async()=>{
  // Existing-account access only. No signup, account mutation or product writes.
  if(u.origin===authOrigin){
   if(req.method==='GET'&&['/auth/v1/user','/auth/v1/settings'].includes(u.pathname))return fetch(req);
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
const publicContextLabelsMockBranch = "gpt/2029-central-public-context-labels-20261029";
const zviPublicMaterialMockBranch = "gpt/2029-central-zvi-public-material-20261029";
const zviResearchExperienceMockBranch = "gpt/2029-central-zvi-research-experience-20261029";
const zviWorldSourceTreeMockBranch = "gpt/2029-central-zvi-world-source-tree-20261030";
const electionsWorldMockBranch = "gpt/elections-world-seed-integration-20261030";
const allowedMockBranches = new Set([legacyMockBranch, personalNavigationMockBranch, unifiedWorkspaceMockBranch, centralShellMockBranch, topbarMenuMockBranch, carryRestorationMockBranch, communityFilterTilesMockBranch, communitySmallFiltersMockBranch, singleCommandBarMockBranch, publicContextLabelsMockBranch, zviPublicMaterialMockBranch, zviResearchExperienceMockBranch, zviWorldSourceTreeMockBranch, electionsWorldMockBranch]);
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
  if ([carryRestorationMockBranch, communityFilterTilesMockBranch, communitySmallFiltersMockBranch, singleCommandBarMockBranch, publicContextLabelsMockBranch, zviPublicMaterialMockBranch, zviResearchExperienceMockBranch, zviWorldSourceTreeMockBranch, electionsWorldMockBranch].includes(expectedBranch)) {
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
if (publicFoundationBuild) {
  let metadata = "";
  // / is served as index.html by the platform filesystem before fallback rewrites.
  // The existing root OG owner is static; no product/server read or write occurs.
  await ogHandler({ query: { path: "/" }, publicFoundationPreview: true }, {
    setHeader() {}, status() { return this; }, send(value) { metadata = value; },
  });
  html = mergePublicDocumentMetadata(html, metadata);
}
await writeFile(resolve(output, "2029.html"), html);
// Public documents use the existing 2029 entry through their metadata/status adapter.
// An index.html would shadow / and /?p=... before platform fallback rewrites.
if (!publicFoundationBuild) await writeFile(resolve(output, "index.html"), html);
if (realRazielPreview) {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA || execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  await writeFile(resolve(output, "preview-identity.json"), JSON.stringify({
    sha, branch: process.env.VERCEL_GIT_COMMIT_REF, target: "preview", transport: launchReadOnlyPreview ? "public-reading-only" : functionalPreview ? "authenticated-preview-server-to-canonical-ai-analyze" : "existing-live-ai-analyze",
    model_trigger: launchReadOnlyPreview ? "disabled" : "explicit-user-turn", requires_existing_account: !functionalPreview,
    product_writes: !launchReadOnlyPreview && (functionalPreview || communityPublishing), edge_deploy: false, matrix_jobs: launchReadOnlyPreview ? false : functionalPreview ? "admin-explicit-cost-ack" : false,
    launch_scope: launchReadOnlyPreview ? "public-reading-only-account-and-mail-pending" : "existing-preview",
    product_write_scope: launchReadOnlyPreview ? [] : functionalPreview ? ["own-person-family","own-research-state","own-private-hints-media","governed-community-actions","own-avatar","existing-verified-legacy-claim"] : communityPublishing ? ["governed-community-actions", "own-avatar", "existing-verified-legacy-claim"] : [],
    ...(["gpt/2029-public-frame-context-20261101", "gpt/2029-community1187-unified-20261101", "gpt/2029-number-fullpage-performance-20261101", "gpt/2029-world-one-tree-sources-20261101", "gpt/2029-public-world-number-acceptance-20261101", "gpt/2029-public-launch-candidate-20261101", "gpt/2029-public-reading-release-configuration-20261101"].includes(process.env.VERCEL_GIT_COMMIT_REF) ? { public_preview_restrictions: publicReadingBuild ? ["life-journey-closed", "raziel-closed", "els-closed", "account-and-mail-closed"] : ["life-journey-admin-only", "raziel-admin-only", "els-admin-only"], companion: "temporarily-unmounted", production_flags_changed: false } : {}),
    general_profile_writes: false,
    ...(functionalPreview ? {els_followup_server_contract:"requires-approved-shared-artifact",expected_server_sha256:"2ac19e112e77e71fbab61270338e126edf88128a786f3425b09157291494281f"} : {els_followup_server_contract:"pending",server_observed_version:90}),
  }, null, 2));
}
// Exact Posts Preview identity; no project/Production settings or live writes.
if (process.env.VERCEL_GIT_COMMIT_REF === POSTS_PREVIEW_BRANCH) {
  const { execFileSync } = await import("node:child_process");
  const sha = process.env.VERCEL_GIT_COMMIT_SHA || execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  await writeFile(resolve(output, "posts-preview-identity.json"), JSON.stringify({
    branch: process.env.VERCEL_GIT_COMMIT_REF, sha, target: "preview",
    readOnly: unifiedReadOnly, realModelCalls: false,
  }, null, 2));
}
await mkdir(resolve(output, "preview-evidence"), { recursive: true });
for (const name of ["corrected-answer.png", "fresh-session-next-question.png", "failed-save-reopens-question.png", "fresh-session-completes-pending-save.png"]) {
  await copyFile(resolve(root, "preview-deploy/evidence", name), resolve(output, "preview-evidence", name));
}
console.log("Static integrated Preview built; request guard runs before App2029.");

if (publicFoundationBuild) await writeFile(resolve(output, "robots.txt"), "User-agent: *\nDisallow: /\n");
