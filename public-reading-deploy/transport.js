import { verifyReadingAdmin, verifyReadingPrincipal } from "./admin-request.js";
import { readingPersonalResponse } from "./personal-request.js";
import { interceptOpeningMail } from "../preview-deploy/opening-mail-transport.js";
import { interceptPublicReadingAdminAuth } from "../preview-deploy/admin-readonly-auth.js";
import { COMMUNITY_UPLOAD_POLICY } from "../src/lib/community/communityUploadPolicy.js";
import { readingTelemetryPath, readingWebVitalBody, readingVisitBody, readingEngagementBody } from "../src/lib/publicReadingTelemetry2029.js";
// Deployment transport for the existing public-reading profile. This is not
// an Auth/RLS policy: canonical public readers and server permissions still own
// which records are public. Explicit verified-admin actions retain the existing
// server policies; authentication itself starts no model, write or credit action.
export const PUBLIC_READING_READ_RPCS = Object.freeze([
  "gematria_api", "fn_method_value", "fn_method_profile", "gematria_method_trace", "fn_zero_scale",
  "posts_by_number_strict", "fn_number_lookup", "fn_number_dossier", "fn_number_journey",
  "fn_verses_by_gematria", "lang_links_list", "number_neighbors", "fn_all_methods",
  "world_group_source_arrivals_v2", "rd_is_admin", "fn_list_family", "fn_name_protocol", "fn_cross_research",
  "is_number_indexable", "is_phrase_indexable",
  // Community reads the database already grants to anon/authenticated (ZURIEL, 8.11.2026):
  // tree-hint pins and the online-now list are public by design; this worker's own allowlist
  // had not caught up, so every caller without a verified admin token fell to the admin-only
  // fallback and was denied. community_tree_hint_set (admin marks a hint) stays off this list.
  "community_tree_hints_list", "community_tree_hints_by_number", "community_presence_online",
]);
export const PUBLIC_READING_GET_RPCS = Object.freeze([
  ...PUBLIC_READING_READ_RPCS, "writer_public_contributions_page_v1", "canonical_follow_subject",
]);
export const PUBLIC_READING_POLICY_ID = "public-reading-owned-account-continuity-20261110";
export const COMMUNITY_PUBLIC_FIELDS = "id,parent_id,author_name,author_user_id,author_contributor_id,title,body,reactions,origin,created_at,edited_at,is_deleted,total_count";

// Kept as a function so Node VM tests execute precisely the emitted worker.
function installPublicReadingWorker(policy) {
  const authOrigin = "https://linswmnnkjxvweumprav.supabase.co";
  const reads = new Set(policy.reads);
  const getReads = new Set(policy.getReads);
  const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
  const denied = () => new Response(JSON.stringify({ error: "public_reading_operation_denied" }), {
    status: 403, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
  const plainObject = body => body && typeof body === "object" && !Array.isArray(body);
  async function jsonBody(req) {
    const text = await req.clone().text();
    if (text.length > 65536) throw new Error("request_too_large");
    const body = JSON.parse(text);
    if (!plainObject(body)) throw new Error("invalid_body");
    return body;
  }
  const uuid = value => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  const readFetch = req => fetch(new Request(req, { cache: "no-store", credentials: "omit", redirect: "error" }));
  // Sizing parameters of a public image rendition (avatar and thumbnail slots). Nothing else may ride on the address.
  const publicRenditionQuery = params => {
    const seen = new Set();
    for (const [key, value] of params) {
      if (seen.has(key)) return false;
      seen.add(key);
      if (key === "resize") { if (!["cover", "contain", "fill"].includes(value)) return false; }
      else if (key === "width" || key === "height") { if (!/^[0-9]{1,4}$/.test(value) || Number(value) < 1 || Number(value) > 2048) return false; }
      else if (key === "quality") { if (!/^[0-9]{1,3}$/.test(value) || Number(value) < 1 || Number(value) > 100) return false; }
      else return false;
    }
    return seen.has("width") || seen.has("height");
  };
  const metricDocuments = new Map();
  const measurementClient = async event => {
    if (!event.clientId || !["https://sod1820.co.il", "https://www.sod1820.co.il"].includes(self.location.origin)) return null;
    const client = await self.clients.get(event.clientId);
    if (!client || client.type !== "window") return null;
    const source = new URL(client.url);
    return source.origin === self.location.origin ? readingTelemetryPath(source.pathname) : null;
  };
  // Existing Community contracts restored from the accepted working weekly
  // Preview. This admits only explicit authenticated Community operations;
  // the canonical RPCs retain authorship, moderation and ownership authority.
  const communityResponse = async req => {
    const url = new URL(req.url);
    const rpc = /^\/rest\/v1\/rpc\/([a-z_][a-z0-9_]*)$/.exec(url.pathname)?.[1];
    const names = new Set(["add_contribution", "toggle_contribution_reaction", "contributors_claim_legacy", "community_message_actions_v1", "community_edit_message", "community_delete_message",
      // Presence heartbeat and guest-review moderation (ZURIEL, 8.11.2026): each DB function
      // already requires a real signed-in account (grant to authenticated, or self-checked
      // inside); missing from this worker's allowlist, both fell to the admin-only fallback.
      "community_presence_ping", "community_guest_unreviewed", "community_guest_review"]);
    const upload = url.pathname.startsWith("/storage/v1/object/gallery/community/") && !safeMethods.has(req.method);
    const sso = url.pathname === "/functions/v1/openweb-sso";
    if (url.origin !== authOrigin || !names.has(rpc) && !upload && !sso) return null;
    if (req.method !== "POST" || url.search || req.signal.aborted) return denied();
    const parsed = names.has(rpc) ? await jsonBody(req) : null;
    const repeatableLike = rpc === "toggle_contribution_reaction" && Object.keys(parsed).sort().join(",") === "p_emoji,p_id,p_visitor"
      && parsed.p_visitor === "community-repeatable-like" && parsed.p_emoji === "👍" && uuid(parsed.p_id);
    const token = /^Bearer ([A-Za-z0-9_.-]+)$/i.exec(req.headers.get("Authorization") || "")?.[1];
    const uid = repeatableLike ? null : await verifyReadingPrincipal({ token, apiKey: req.headers.get("apikey") || policy.anonKey, signal: req.signal });
    if ((!repeatableLike && !uid) || req.signal.aborted) return denied();
    if (upload) {
      const path = /^\/storage\/v1\/object\/gallery\/community\/([0-9a-f-]{36})\/([0-9a-f-]{36})\.([a-z0-9]+)$/i.exec(url.pathname);
      if (!path || path[1] !== uid || !uuid(path[2]) || req.headers.get("x-upsert") !== "false"
        || !req.headers.get("Content-Type")?.startsWith("multipart/form-data;")) return denied();
      const form = await req.clone().formData();
      if ([...form.keys()].some(key => !["", "cacheControl"].includes(key)) || form.getAll("").length !== 1) return denied();
      const file = form.get(""), type = policy.communityUpload.types[file?.type?.toLowerCase()];
      if (!type || !type.extensions.includes(path[3].toLowerCase()) || !(file.size > 0)
        || file.size > (type.kind === "video" ? policy.communityUpload.videoMaxBytes : policy.communityUpload.fileMaxBytes)) return denied();
      return readFetch(req);
    }
    const body = parsed || await jsonBody(req), keys = Object.keys(body).sort().join(",");
    if (sso) return keys === "code_a" && typeof body.code_a === "string" && body.code_a.trim()
      && body.code_a.length <= 512 ? readFetch(req) : denied();
    if (rpc === "contributors_claim_legacy") return keys === "p_contributor_id" && uuid(body.p_contributor_id) ? readFetch(req) : denied();
    if (rpc === "community_message_actions_v1") return keys === "p_ids" && Array.isArray(body.p_ids)
      && body.p_ids.length <= 100 && body.p_ids.every(uuid) ? readFetch(req) : denied();
    if (rpc === "community_delete_message") return keys === "p_id" && uuid(body.p_id) ? readFetch(req) : denied();
    if (rpc === "community_edit_message") return keys === "p_body,p_id" && uuid(body.p_id)
      && typeof body.p_body === "string" && body.p_body.trim().length > 0
      && Array.from(body.p_body.trim()).length <= 6000 ? readFetch(req) : denied();
    if (rpc === "community_presence_ping") return keys === "" ? readFetch(req) : denied();
    if (rpc === "community_guest_unreviewed") return (keys === "" || keys === "p_ids")
      && (!("p_ids" in body) || body.p_ids === null || Array.isArray(body.p_ids) && body.p_ids.length <= 200 && body.p_ids.every(uuid))
      ? readFetch(req) : denied();
    if (rpc === "community_guest_review") return keys === "p_action,p_id" && uuid(body.p_id)
      && ["approve", "hide"].includes(body.p_action) ? readFetch(req) : denied();
    let publicTarget = null;
    if (rpc === "toggle_contribution_reaction") {
      if (keys !== "p_emoji,p_id,p_visitor" || !uuid(body.p_id) || body.p_visitor !== null && !repeatableLike
        || !["👍", "💡", "🔥", "🙏", "✨"].includes(body.p_emoji)) return denied();
      publicTarget = body.p_id;
    } else {
      if (keys !== "p_author_name,p_body,p_gematria_claim,p_image_url,p_intent,p_origin,p_parent_id,p_target_id,p_target_type,p_title"
        || body.p_origin !== "community_2029" || body.p_intent !== "תגובה"
        || body.p_target_type !== "home" || body.p_target_id !== "community"
        || body.p_title !== null || body.p_gematria_claim !== null || body.p_image_url !== null
        || !(body.p_parent_id === null || uuid(body.p_parent_id))
        || typeof body.p_body !== "string" || !body.p_body.trim() || Array.from(body.p_body).length > 6000
        || !(body.p_author_name === null || typeof body.p_author_name === "string" && body.p_author_name.length <= 200)) return denied();
      publicTarget = body.p_parent_id;
    }
    if (publicTarget) {
      const context = await fetch(authOrigin + "/rest/v1/rpc/community_message_context?select=" + encodeURIComponent(policy.communityFields), {
        method: "POST", headers: { apikey: policy.anonKey || req.headers.get("apikey") || "", Authorization: "Bearer " + (policy.anonKey || req.headers.get("apikey") || ""), "Content-Type": "application/json" },
        body: JSON.stringify({ p_id: publicTarget }), cache: "no-store", credentials: "omit", redirect: "error", signal: req.signal,
      });
      if (!context.ok) return new Response(JSON.stringify({ error: "public_reply_context_unavailable" }), { status: 503 });
      const chain = await context.json();
      if (!Array.isArray(chain) || !chain.some(row => row.id === publicTarget)) return denied();
    }
    if (req.signal.aborted) return denied();
    if (repeatableLike) {
      const key = policy.anonKey || req.headers.get("apikey") || "";
      return readFetch(new Request(req, { headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" } }));
    }
    return readFetch(req);
  };
  const adminFunctions = new Set(["ai-analyze", "research-run", "els-search-bridge", "media-upload-intent", "journey-message", "number-researcher", "raziel-attention", "lab-teacher", "gallery-ocr", "post-save", "post-ai-edit"]);
  const blockedRpc = /^(?:credit_|membership_|claim_daily_credit$|claim_research_lead$|cardcom_|checkout_|billing_|newsletter_|subscribe_email|send_|wa_system_|meta_capi)/;
  const blockedTables = new Set(["site_flags", "profiles", "credit_ledger", "credit_action_prices", "membership_credit_cycles", "credit_reservations", "credit_reservation_allocations", "subscribers", "events", "visitor_events"]);
  const adminFetch = async req => {
    const community = await communityResponse(req);
    if (community) return community;
    const personal = await readingPersonalResponse(req, { apiKey:req.headers.get("apikey")||policy.anonKey, clientOrigin:self.location.origin, verify:verifyReadingPrincipal });
    if (personal) return personal;
    const target = new URL(req.url);
    if (req.signal.aborted) return denied();
    const rpcName = /^\/rest\/v1\/rpc\/([a-z_][a-z0-9_]*)$/.exec(target.pathname)?.[1];
    const table = /^\/rest\/v1\/([a-z_][a-z0-9_]*)$/.exec(target.pathname)?.[1];
    const functionName = /^\/functions\/v1\/([a-z][a-z0-9-]*)$/.exec(target.pathname)?.[1];
    const selfApi = target.origin === self.location.origin && target.pathname === "/api/contributor-self";
    const tus = target.origin === "https://linswmnnkjxvweumprav.storage.supabase.co"
      && /^\/storage\/v1\/upload\/resumable(?:\/[^/?#]+)?$/.test(target.pathname) && !target.search
      && ["POST", "PATCH", "HEAD"].includes(req.method) && req.headers.get("Tus-Resumable") === "1.0.0";
    const canonical = tus || target.origin === authOrigin && (rpcName && !blockedRpc.test(rpcName)
      || table && (!blockedTables.has(table) || safeMethods.has(req.method))
      || functionName && adminFunctions.has(functionName)
      || /^\/storage\/v1\/(?:object|upload)\//.test(target.pathname));
    if (!selfApi && !canonical) return denied();
    const token = /^Bearer ([A-Za-z0-9_.-]+)$/i.exec(req.headers.get("Authorization") || "")?.[1];
    // The same-origin adapter independently verifies JWT + admin on the server.
    // Its fetch caller has no apikey; never substitute a privileged credential.
    if (selfApi) return token ? fetch(new Request(req, { cache: "no-store", credentials: "same-origin", redirect: "error" })) : denied();
    if (!await verifyReadingAdmin({ token, apiKey: req.headers.get("apikey") || policy.anonKey, signal: req.signal })) return denied();
    if (req.signal.aborted) return denied();
    return readFetch(req);
  };
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
  self.addEventListener("message", event => {
    if (event.data?.type === "public-reading-policy" && event.ports?.[0])
      event.ports[0].postMessage({ policy: policy.id, sourceSha: policy.sourceSha });
    // A navigation can finish between activation and clients.claim(). Updating
    // an identical active script does not activate it again. Reclaim only our
    // exact admitted worker, then the caller still validates its handshake.
    if (event.data?.type === "public-reading-claim" && event.data.policy === policy.id
      && event.data.sourceSha === policy.sourceSha && event.source?.type === "window") {
      try { if (new URL(event.source.url).origin === self.location.origin) event.waitUntil(self.clients.claim()); }
      catch { /* Foreign/malformed client messages never change control. */ }
    }
  });
  self.addEventListener("fetch", event => {
    const req = event.request, url = new URL(req.url);
    const rpc = /^\/rest\/v1\/rpc\/([a-z_][a-z0-9_]*)$/.exec(url.pathname)?.[1];
    // Only existing GA4 collection endpoints and the configured public
    // measurement ID. No Ads/Meta conversion endpoints, user properties,
    // raw expressions, private routes, query tokens or document titles.
    if (["https://www.google-analytics.com", "https://region1.google-analytics.com"].includes(url.origin)) {
      event.respondWith((async () => {
        if (!["GET", "POST"].includes(req.method) || url.pathname !== "/g/collect" || !policy.gaId) return denied();
        const clientPath = await measurementClient(event);
        if (!clientPath) return denied();
        const text = req.method === "POST" ? await req.clone().text() : "";
        if (text.length > 8192 || /[\r\n]/.test(text)) return denied();
        const params = new URLSearchParams(url.search);
        for (const [key, value] of new URLSearchParams(text)) {
          if (params.has(key)) return denied();
          params.append(key, value);
        }
        if (params.getAll("tid").length !== 1 || params.get("tid") !== policy.gaId || params.get("v") !== "2"
          || !["page_view", "user_engagement", "scroll", "session_start", "first_visit"].includes(params.get("en"))
          || [...params.keys()].some(key => /^(?:uid|user_id|uip|up\.|upn\.|ep\.|epn\.)/.test(key))) return denied();
        const page = new URL(params.get("dl") || "");
        if (page.origin !== self.location.origin || page.search || page.hash || page.username || page.password
          || page.pathname !== clientPath || params.get("dt") !== "SOD1820"
          || params.get("dp") && params.get("dp") !== clientPath || params.get("dr")) return denied();
        return fetch(new Request(req, { credentials: "omit", cache: "no-store", redirect: "error", referrerPolicy: "no-referrer" }));
      })().catch(() => denied())); return;
    }
    if (url.origin === self.location.origin && ["/api/ga-insights", "/api/vercel-insights", "/api/search-console"].includes(url.pathname)) {
      event.respondWith((async () => {
        if (req.method !== "GET" || [...url.searchParams.keys()].some(key => key !== "days") || url.searchParams.getAll("days").length > 1
          || !/^Bearer [A-Za-z0-9_.-]{20,8192}$/.test(req.headers.get("Authorization") || "")) return denied();
        // The deployment adapter and original handler independently verify
        // JWT/current admin role. No browser role claim grants access.
        return fetch(new Request(req, { cache: "no-store", credentials: "omit", redirect: "error" }));
      })().catch(() => denied())); return;
    }
    // The restored original OpenWeb box uses its own guest/login/publication
    // API. Preserve that working service instead of applying native read-only
    // restrictions to its bootstrap and explicit chat actions.
    if (url.protocol === "https:" && (url.hostname === "spot.im" || url.hostname.endsWith(".spot.im"))
      && ["GET", "HEAD", "POST", "OPTIONS"].includes(req.method)) return;
    if (interceptPublicReadingAdminAuth(event, authOrigin, { accountAccess: true, clientOrigin: self.location.origin }) || interceptOpeningMail(event, authOrigin)) return;
    if (url.origin === "https://linswmnnkjxvweumprav.storage.supabase.co" && url.pathname.startsWith("/storage/v1/upload/")) {
      event.respondWith(adminFetch(req).catch(() => denied())); return;
    }
    // Canonical schema-only review: this existing SECURITY DEFINER reader can
    // include visitor drafts when p_visitor is supplied. Public launch admits
    // approved links only, without changing the shared function or Preview.
    if (url.origin === authOrigin && rpc === "lang_links_list") {
      event.respondWith((async () => {
        if (url.search) return denied();
        if (safeMethods.has(req.method)) return readFetch(req);
        if (req.method !== "POST") return denied();
        const body = await jsonBody(req);
        return Object.keys(body).length === 0
          || Object.keys(body).join(",") === "p_visitor" && (body.p_visitor === null || body.p_visitor === "")
          ? readFetch(req) : adminFetch(req);
      })().catch(() => denied()));
      return;
    }
    // Signed unsubscribe retains its separate link-bound public admission. The server remains
    // the HMAC authority; the worker only narrows transport to its existing UI.
    if (url.origin === authOrigin && url.pathname === "/functions/v1/newsletter-unsubscribe") {
      event.respondWith((async () => {
        const exactKeys = [...url.searchParams.keys()].sort().join(",") === "e,format,t";
        if (req.method !== "GET" || !exactKeys || url.searchParams.get("format") !== "json"
          || !/^[A-Za-z0-9_-]{1,320}$/.test(url.searchParams.get("e") || "")
          || !/^[A-Za-z0-9_-]{43}$/.test(url.searchParams.get("t") || "") || !event.clientId) return denied();
        const client = await self.clients.get(event.clientId);
        if (!client || client.type !== "window") return denied();
        const source = new URL(client.url);
        if (source.origin !== self.location.origin || source.pathname !== "/unsubscribe") return denied();
        // Bind exactly to the link open in that controlled document. No
        // background caller, redirect/callback parameter, or foreign token.
        if (source.searchParams.getAll("e").length !== 1 || source.searchParams.getAll("t").length !== 1
          || source.searchParams.get("e") !== url.searchParams.get("e")
          || source.searchParams.get("t") !== url.searchParams.get("t")) return denied();
        return fetch(new Request(req, { cache: "no-store", credentials: "omit", redirect: "error", referrerPolicy: "no-referrer" }));
      })().catch(() => denied()));
      return;
    }
    // Native no-cors image responses must retain redirect=follow. Fetching
    // them through readFetch's redirect=error makes the opaque response
    // incompatible with the browser image request. Only already-public image
    // GETs bypass that API wrapper; private/signed objects and writes do not.
    if (url.origin === authOrigin && req.method === "GET" && req.destination === "image"
      && req.mode === "no-cors" && !url.search && !url.hash
      && /^\/storage\/v1\/object\/public\/(?:media|gallery|magar)\//.test(url.pathname)) return;
    // The same exception covers the small renditions of those public images. Through readFetch they failed outright
    // (net::ERR_FAILED), so avatar slots fell back to the multi-megabyte original. Only sizing parameters are accepted.
    if (url.origin === authOrigin && req.method === "GET" && req.destination === "image"
      && req.mode === "no-cors" && !url.hash && !url.pathname.includes("//")
      && /^\/storage\/v1\/render\/image\/public\/(?:media|gallery|magar)\//.test(url.pathname)
      && publicRenditionQuery(url.searchParams)) return;
    // Public video/audio objects: the media element sends no-cors Range requests. Forwarding them through readFetch
    // (redirect=error, no-store) breaks the partial-content exchange on phones ("המדיה לא נטענה"), so, like public images,
    // already-public media GETs go straight to the network. Private/signed objects and writes do not.
    if (url.origin === authOrigin && req.method === "GET" && (req.destination === "video" || req.destination === "audio")
      && req.mode === "no-cors" && !url.search && !url.hash && !url.pathname.includes("//")
      && /^\/storage\/v1\/object\/public\/(?:media|gallery|magar)\//.test(url.pathname)) return;
    if (url.origin === authOrigin && req.method === "POST"
      && ["/rest/v1/rpc/ingest_event", "/rest/v1/rpc/track_visit", "/rest/v1/contact_messages"].includes(url.pathname)) {
      event.respondWith((async () => {
        const columns = url.searchParams.get("columns");
        const contactColumns = url.pathname.endsWith("/contact_messages") && url.searchParams.size === 1
          && columns?.split(",").sort().join(",") === '\"email\",\"message\",\"name\",\"subject\"';
        // An engagement beacon sent at pagehide carries only the public anon key in its address.
        const beaconKey = url.pathname.endsWith("/ingest_event") && url.searchParams.size === 1
          && Boolean(policy.anonKey) && url.searchParams.get("apikey") === policy.anonKey;
        if (url.search && !contactColumns && !beaconKey) return denied();
        const raw = await req.clone().text();
        if (raw.length > 8192) return denied();
        const parsed = JSON.parse(raw);
        const body = url.pathname.endsWith("/contact_messages") && Array.isArray(parsed) && parsed.length === 1 ? parsed[0] : parsed;
        if (!plainObject(body)) return denied();
        const anonymous = () => readFetch(new Request(req, { headers: { apikey: policy.anonKey, Authorization: `Bearer ${policy.anonKey}`, "Content-Type": "application/json" } }));
        // First-party visit counter: exact track_visit shape, bound to the sending window's normalized route.
        if (url.pathname.endsWith("/track_visit"))
          return policy.anonKey && readingVisitBody(body) && await measurementClient(event) === body.p_path ? anonymous() : denied();
        if (beaconKey && body.p_surface !== "page") return denied();
        if (url.pathname.endsWith("/ingest_event") && body.p_surface === "page") {
          // Page engagement is flushed on route change (the window has already moved on) or at pagehide,
          // so it is bound to an admitted public-site window rather than to that window's current route.
          return policy.anonKey && readingEngagementBody(body) && await measurementClient(event) !== null ? anonymous() : denied();
        }
        if (url.pathname.endsWith("/ingest_event")) {
          if (body.p_surface === "performance") {
            if (!readingWebVitalBody(body) || await measurementClient(event) !== body.p_path || !policy.anonKey) return denied();
            const now = Date.now();
            for (const [key, value] of metricDocuments) if (now - value.at > 1800000) metricDocuments.delete(key);
            let record = metricDocuments.get(event.clientId);
            if (!record) {
              if (metricDocuments.size >= 500) return denied();
              record = { at: now, sample: body.p_props.sample_id, phases: new Set() };
              metricDocuments.set(event.clientId, record);
            }
            if (record.sample !== body.p_props.sample_id || record.phases.has(body.p_props.phase)) return denied();
            record.phases.add(body.p_props.phase);
            return readFetch(new Request(req, { headers: { apikey: policy.anonKey, Authorization: `Bearer ${policy.anonKey}`, "Content-Type": "application/json" } }));
          }
          const fields = ["path","source_href","surface","capability","concept","learn_stage","action_tried","at","locale","viewport","auth","interaction_id","message"];
          if (!["p_event_type,p_is_bot,p_path,p_props,p_sod_id,p_surface", "p_event_type,p_is_bot,p_path,p_props,p_session_id,p_sod_id,p_surface"].includes(Object.keys(body).sort().join(","))
            || body.p_session_id != null && !uuid(body.p_session_id)
            || body.p_sod_id !== null || body.p_is_bot !== false || body.p_surface !== "issue_report" || body.p_event_type !== "issue_report"
            || typeof body.p_path !== "string" || body.p_path.length > 200 || !body.p_path.startsWith("/") || /[?#]/.test(body.p_path)
            || !plainObject(body.p_props) || Object.keys(body.p_props).some(key => !fields.includes(key))
            || Object.values(body.p_props).some(value => value !== null && typeof value !== "string")
            || JSON.stringify(body.p_props).length > 4000 || String(body.p_props.message || "").length > 500) return denied();
        } else if (Object.keys(body).sort().join(",") !== "email,message,name,subject"
          || Object.values(body).some(value => typeof value !== "string")
          || body.name.length < 1 || body.name.length > 100 || body.email.length < 3 || body.email.length > 200
          || body.subject.length > 200 || body.message.length < 1 || body.message.length > 3000) return denied();
        return readFetch(req); // acknowledge only committed canonical RPC/insert
      })().catch(() => denied())); return;
    }
    if (url.origin === authOrigin) {
      if (["GET","HEAD"].includes(req.method) && /^\/rest\/v1\/(?:profiles|user_notes|research_items|user_research|notification_prefs|user_notifications|wa_account_links)$/.test(url.pathname)) {
        event.respondWith(readingPersonalResponse(req, {apiKey:req.headers.get("apikey")||policy.anonKey,clientOrigin:self.location.origin,verify:verifyReadingPrincipal}).then(result=>result||denied()).catch(()=>denied()));return;
      }
      const ambiguous = url.pathname.includes("//") || url.pathname.includes("%") && !url.pathname.startsWith("/storage/v1/");
      if (ambiguous || url.pathname.startsWith("/realtime/v1")) {
        event.respondWith(Promise.resolve(denied())); return;
      }
      // Community link preview (Open Graph): a read-only GET of the public preview service with exactly one
      // https address. The request is rebuilt without any session or key, so no account data leaves the browser.
      if (url.pathname === "/functions/v1/link-preview") {
        const target = url.searchParams.get("url") || "";
        if (req.method !== "GET" || url.searchParams.size !== 1 || target.length > 2048 || !/^https:\/\/[^\s]+$/i.test(target)) { event.respondWith(Promise.resolve(denied())); return; }
        event.respondWith(fetch(new Request(url.href, { method: "GET", headers: { accept: "application/json" }, credentials: "omit", redirect: "error" })).catch(() => denied()));
        return;
      }
      // Bible code (Classic mode): the engine verifies every candidate through the canonical bridge. The bridge is rate-limited,
      // traced and gated by the server flag, so it is open to visitors; the worker only admits its three operations with a bounded
      // JSON body and sends the public key (or the verified member's own session), never a role claim.
      if (url.pathname === "/functions/v1/els-search-bridge") {
        event.respondWith((async () => {
          if (req.method !== "POST" || url.search || req.signal.aborted) return denied();
          const raw = await req.clone().text();
          if (raw.length > 262144) return denied();
          let body; try { body = JSON.parse(raw); } catch { return denied(); }
          if (!plainObject(body) || !["verify", "page", "verify_batch"].includes(body.op)
            || typeof body.term !== "string" || body.term.trim().length < 2 || body.term.length > 200
            || body.scope !== undefined && !["torah", "tanakh"].includes(body.scope)) return denied();
          const key = policy.anonKey || req.headers.get("apikey") || "";
          const token = /^Bearer ([A-Za-z0-9_.-]+)$/i.exec(req.headers.get("Authorization") || "")?.[1];
          const uid = token && token !== key ? await verifyReadingPrincipal({ token, apiKey: key, signal: req.signal }) : null;
          if (req.signal.aborted) return denied();
          return readFetch(new Request(url.href, { method: "POST", signal: req.signal,
            headers: { apikey: key, Authorization: "Bearer " + (uid ? token : key), "Content-Type": "application/json" }, body: raw }));
        })().catch(() => denied()));
        return;
      }
      if (url.pathname.startsWith("/functions/v1")) { event.respondWith(adminFetch(req).catch(() => denied())); return; }
      if (url.pathname.startsWith("/auth/v1/") && !["/auth/v1/user", "/auth/v1/settings"].includes(url.pathname)
        || url.pathname.startsWith("/rest/v1/rpc/") && safeMethods.has(req.method) && !getReads.has(rpc)) {
        event.respondWith(adminFetch(req).catch(() => denied())); return;
      }
      if (safeMethods.has(req.method)) { event.respondWith(readFetch(req)); return; }
      if (req.method !== "POST" || !rpc) { event.respondWith(adminFetch(req).catch(() => denied())); return; }
      event.respondWith((async () => {
        // Bible code: a verified member saves a private cipher to their own library (the server owns authorship, status and
        // moderation; only the exact calls of the Classic save panel are admitted, with bounded values).
        if ((rpc === "save_els_matrix" || rpc === "update_els_matrix") && !url.search) {
          const raw = await req.clone().text();
          if (raw.length > 200000) return denied();
          let body; try { body = JSON.parse(raw); } catch { return denied(); }
          if (!plainObject(body)) return denied();
          const keys = Object.keys(body).sort().join(",");
          const text = (value, max) => value === null || typeof value === "string" && value.length <= max;
          const int = value => value === null || Number.isSafeInteger(value);
          const object = value => value === null || plainObject(value);
          const imageOk = value => value === null || typeof value === "string" && value.length <= 400
            && value.startsWith(authOrigin + "/storage/v1/object/public/gallery/sod1820/ciphers/");
          const exact = rpc === "save_els_matrix"
            ? keys === "p_direction,p_engine_detail,p_from_topic,p_image_url,p_note,p_positions,p_public,p_scope,p_skip,p_start_index,p_term,p_title"
              && typeof body.p_term === "string" && body.p_term.trim().length >= 2 && body.p_term.length <= 200
              && ["torah", "tanakh"].includes(body.p_scope) && int(body.p_skip) && text(body.p_direction, 20) && object(body.p_positions)
              && imageOk(body.p_image_url) && text(body.p_title, 300) && text(body.p_note, 4000) && typeof body.p_public === "boolean"
              && text(body.p_from_topic, 200) && int(body.p_start_index) && object(body.p_engine_detail)
            : keys === "p_description,p_engine_detail,p_id,p_image_url,p_positions"
              && uuid(body.p_id) && object(body.p_positions) && imageOk(body.p_image_url) && text(body.p_description, 4000) && object(body.p_engine_detail);
          if (!exact) return denied();
          const token = /^Bearer ([A-Za-z0-9_.-]+)$/i.exec(req.headers.get("Authorization") || "")?.[1];
          const uid = await verifyReadingPrincipal({ token, apiKey: req.headers.get("apikey") || policy.anonKey, signal: req.signal });
          if (!uid || req.signal.aborted) return denied();
          return readFetch(req);
        }
        // Bible code: a verified member renames or deletes their own cipher. The database function owns the ownership check and
        // refuses moderated (published) records; the worker admits only the exact bodies, so publication stays administrator-only.
        if ((rpc === "rename_my_els_matrix" || rpc === "delete_my_els_matrix") && !url.search) {
          const raw = await req.clone().text();
          if (raw.length > 2000) return denied();
          let body; try { body = JSON.parse(raw); } catch { return denied(); }
          if (!plainObject(body)) return denied();
          const exact = rpc === "rename_my_els_matrix"
            ? Object.keys(body).sort().join(",") === "p_id,p_title" && uuid(body.p_id) && typeof body.p_title === "string" && body.p_title.length <= 400
            : Object.keys(body).join(",") === "p_id" && uuid(body.p_id);
          if (!exact) return denied();
          const token = /^Bearer ([A-Za-z0-9_.-]+)$/i.exec(req.headers.get("Authorization") || "")?.[1];
          const uid = await verifyReadingPrincipal({ token, apiKey: req.headers.get("apikey") || policy.anonKey, signal: req.signal });
          if (!uid || req.signal.aborted) return denied();
          return readFetch(req);
        }
        if (reads.has(rpc) && !url.search) { await jsonBody(req); return readFetch(req); }
        if (rpc === "convergence_meter" && !url.search) {
          const body = await jsonBody(req);
          return Object.keys(body).join(",") === "p_n" && Number.isSafeInteger(body.p_n)
            && body.p_n > 0 && body.p_n <= 2147483647 ? readFetch(req) : denied();
        }
        if (rpc === "community_thread_updates") {
          if (url.searchParams.size !== 1 || url.searchParams.get("select") !== "root_id,new_count,first_reply_id,first_path") return denied();
          const body = await jsonBody(req);
          if (Object.keys(body).join(",") !== "p_cursors" || !Array.isArray(body.p_cursors) || body.p_cursors.length > 40
            || body.p_cursors.some(item => !plainObject(item) || Object.keys(item).sort().join(",") !== "created_at,message_id,root_id"
              || !uuid(item.root_id) || !uuid(item.message_id) || typeof item.created_at !== "string" || item.created_at.length > 64 || !Number.isFinite(Date.parse(item.created_at)))
            || new Set(body.p_cursors.map(item => item.root_id)).size !== body.p_cursors.length) return denied();
          const key = policy.anonKey || req.headers.get("apikey") || "";
          return readFetch(new Request(req, { headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" } }));
        }
        if (["community_feed_page", "community_message_context", "community_replies_page", "community_search"].includes(rpc)
          && url.searchParams.size === 1 && url.searchParams.get("select") === policy.communityFields) {
          const body = await jsonBody(req);
          // Corpus-wide community search: read-only, exact body only. The database function owns visibility
          // (approved, not deleted, whole chain public); the worker bounds the query text and the page window.
          if (rpc === "community_search") {
            const text = typeof body.p_query === "string" ? body.p_query.trim() : "";
            const length = Array.from(text).length;
            return Object.keys(body).sort().join(",") === "p_limit,p_offset,p_query" && length >= 2 && length <= 80
              && Number.isSafeInteger(body.p_offset) && body.p_offset >= 0 && body.p_offset <= 1000000
              && Number.isSafeInteger(body.p_limit) && body.p_limit >= 1 && body.p_limit <= 50 ? readFetch(req) : denied();
          }
          if (rpc !== "community_replies_page") return readFetch(req);
          if (Object.keys(body).sort().join(",") !== "p_limit,p_offset,p_parent" || !uuid(body.p_parent)
            || !Number.isSafeInteger(body.p_offset) || body.p_offset < 0 || body.p_offset > 1000000
            || !Number.isSafeInteger(body.p_limit) || body.p_limit < 1 || body.p_limit > 100) return denied();
          const context = await fetch(authOrigin + "/rest/v1/rpc/community_message_context?select=" + encodeURIComponent(policy.communityFields), {
            method: "POST", headers: { apikey: req.headers.get("apikey") || "", Authorization: req.headers.get("Authorization") || "", "Content-Type": "application/json" },
            body: JSON.stringify({ p_id: body.p_parent }), credentials: "omit", cache: "no-store",
          });
          if (!context.ok) return new Response(JSON.stringify({ error: "public_reply_context_unavailable" }), { status: 503 });
          const chain = await context.json();
          if (!Array.isArray(chain)) return denied();
          return chain.some(row => row.id === body.p_parent) ? readFetch(req) : new Response("[]", { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
        }
        // Guest community publishing: no account is involved, the server enforces the
        // limits (kill switch, per-address rate, text only). Only the exact anonymous
        // request shape is forwarded, always with the public key; any session token is refused.
        if (rpc === "add_guest_community_message" && !url.search) {
          const key = policy.anonKey || "";
          if (!key) return denied();
          const authorization = req.headers.get("Authorization");
          if (authorization && authorization !== "Bearer " + key) return denied();
          const body = await jsonBody(req);
          // p_name is optional (a guest's display name); the server validates and labels it.
          const shape = Object.keys(body).sort().join(",");
          if (!(shape === "p_body,p_parent_id,p_website" || shape === "p_body,p_name,p_parent_id,p_website")
            || "p_name" in body && !(typeof body.p_name === "string" && body.p_name.trim() && Array.from(body.p_name).length <= 100)
            || typeof body.p_body !== "string" || !body.p_body.trim() || Array.from(body.p_body).length > 3000
            || !(body.p_parent_id === null || uuid(body.p_parent_id))
            || !(body.p_website === null || typeof body.p_website === "string" && body.p_website.length <= 200)) return denied();
          return readFetch(new Request(req, { headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" } }));
        }
        return adminFetch(req);
      })().catch(() => denied()));
      return;
    }
    if (url.origin === self.location.origin && url.pathname === "/api/contributor-self") {
      event.respondWith(adminFetch(req).catch(() => denied())); return;
    }
    if (!safeMethods.has(req.method)) { event.respondWith(Promise.resolve(denied())); return; }
    if (url.origin === self.location.origin) {
      // The raw engine page is an internal iframe document. A top-level navigation to it (a search-engine result, a shared link)
      // goes to the cipher page. Server rules cannot tell the two apart for a browser this worker controls, because the worker's
      // own fetch() carries Sec-Fetch-Dest: empty and the raw page would be served; so the decision is made here, from the real
      // navigation destination. The engine iframe (destination "iframe") is untouched.
      if (url.pathname === "/tzofen.html" && req.mode === "navigate" && req.destination === "document") {
        event.respondWith(Response.redirect(new URL("/code", self.location.origin).href, 307)); return;
      }
      // No same-origin proxy or Auth adapter can bypass the browser boundary.
      if (url.pathname.startsWith("/api/") && !["/api/card", "/api/public-document", "/api/public-sitemap", "/api/public-robots",
        "/api/public-contributor-rank", "/api/contributor-public-overview", "/api/contributor-interactions"].includes(url.pathname)) {
        event.respondWith(Promise.resolve(denied())); return;
      }
      const dynamic = req.mode === "navigate" || url.pathname.startsWith("/api/")
        || /\.(?:html|json)$/.test(url.pathname) || /(?:^|\/)(?:sw|public-reading-sw|preview-readonly-sw)\.js$/.test(url.pathname);
      if (dynamic) event.respondWith(fetch(new Request(req, { cache: "no-store" })));
    }
    // Ordinary static/media/font GET requests use HTTP cache policy. The
    // worker never reads/writes CacheStorage and never serves stale documents.
  });
}

export function buildPublicReadingWorker(sourceSha, { anonKey = "", gaId = "" } = {}) {
  if (!/^[a-f0-9]{40}$/.test(sourceSha)) throw new Error("exact_source_sha_required");
  return `${readingTelemetryPath.toString()}\n${readingWebVitalBody.toString()}\n${readingVisitBody.toString()}\n${readingEngagementBody.toString()}\n${verifyReadingPrincipal.toString()}\n${verifyReadingAdmin.toString()}\n${readingPersonalResponse.toString()}\n${interceptPublicReadingAdminAuth.toString()}\n${interceptOpeningMail.toString()}\n(${installPublicReadingWorker.toString()})(${JSON.stringify({ id: PUBLIC_READING_POLICY_ID,
    sourceSha, anonKey, gaId: /^G-[A-Z0-9]{5,20}$/.test(gaId) ? gaId : "", reads: PUBLIC_READING_READ_RPCS, getReads: PUBLIC_READING_GET_RPCS, communityFields: COMMUNITY_PUBLIC_FIELDS, communityUpload: COMMUNITY_UPLOAD_POLICY })});\n`;
}

// One deadline covers register, install, ready, controller and policy handshake.
// A late resolution after timeout can never import the application.
export async function startPublicReading(config, runtime) {
  const { navigator, document, MessageChannel, setTimeout, clearTimeout, loadEntry } = runtime;
  let cancelled = false, timer, phase = "registration";
  const cleanup = [];
  const check = () => { if (cancelled) throw new Error("worker_bootstrap_expired"); };
  try {
    const admission = (async () => {
      if (!("serviceWorker" in navigator)) throw new Error("worker_required");
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }); check();
      // register() may reuse a fresh same-URL Legacy registration without an
      // update job. Explicitly refresh an already-active script before trusting
      // its handshake; a scope/script URL alone is not a policy identity.
      if (!registration.installing && registration.active) { phase = "update"; await registration.update(); check(); }
      phase = "activation";
      if (registration.installing) await new Promise((resolve, reject) => {
        const worker = registration.installing;
        const change = () => { if (worker.state === "activated") resolve(); if (worker.state === "redundant") reject(new Error("worker_redundant")); };
        cleanup.push(() => worker.removeEventListener("statechange", change));
        worker.addEventListener("statechange", change); change();
      });
      check(); phase = "readiness"; await navigator.serviceWorker.ready; check();
      phase = "control";
      if (!navigator.serviceWorker.controller && registration.active?.postMessage)
        registration.active.postMessage({ type: "public-reading-claim", policy: config.policy, sourceSha: config.sourceSha });
      if (!navigator.serviceWorker.controller) await new Promise(resolve => {
        const change = () => { if (navigator.serviceWorker.controller) resolve(); };
        cleanup.push(() => navigator.serviceWorker.removeEventListener("controllerchange", change));
        navigator.serviceWorker.addEventListener("controllerchange", change); change();
      });
      check();
      phase = "policy";
      const policy = await new Promise(resolve => {
        const channel = new MessageChannel();
        cleanup.push(() => { channel.port1.close(); channel.port2.close(); });
        channel.port1.onmessage = event => resolve(event.data);
        navigator.serviceWorker.controller.postMessage({ type: "public-reading-policy" }, [channel.port2]);
      });
      check();
      if (policy?.policy !== config.policy || policy.sourceSha !== config.sourceSha) throw new Error("worker_identity_mismatch");
    })();
    await Promise.race([admission, new Promise((_, reject) => {
      timer = setTimeout(() => { cancelled = true; reject(new Error("worker_bootstrap_timeout:" + phase)); }, config.timeoutMs);
    })]);
    check(); clearTimeout(timer);
    await loadEntry(config.entry);
    runtime.healed?.();
    return true;
  } catch (error) {
    cancelled = true;
    runtime.onFailure?.(error);
    // One safe self-heal per tab session when a stale worker/cache keeps the page from opening: drop service workers and
    // CacheStorage, then reload. Never touches the signed-in session (the SDK keeps it in its own storage).
    if (error?.message !== "worker_required" && await runtime.recover?.(error)) return false;
    document.body.textContent = "העמוד לא נפתח. אפשר לרענן ולנסות שוב.";
    return false;
  } finally { clearTimeout(timer); for (const close of cleanup) close(); }
}

export function publicReadingBootstrap(entry, sourceSha) {
  if (!/^\/assets\/[A-Za-z0-9_.-]+\.js$/.test(entry) || !/^[a-f0-9]{40}$/.test(sourceSha)) throw new Error("invalid_build_identity");
  const config = { entry, sourceSha, policy: PUBLIC_READING_POLICY_ID, timeoutMs: 10000 };
  return `<script type="module">(${startPublicReading.toString()})(${JSON.stringify(config)},{navigator,document,MessageChannel,setTimeout,clearTimeout,loadEntry:entry=>import(entry),healed:()=>{try{sessionStorage.removeItem("sod_runtime_heal")}catch{}},recover:async()=>{try{if(sessionStorage.getItem("sod_runtime_heal")==="1")return false;sessionStorage.setItem("sod_runtime_heal","1");const registrations=await navigator.serviceWorker.getRegistrations();await Promise.all(registrations.map(registration=>registration.unregister()));if(self.caches){const keys=await caches.keys();await Promise.all(keys.map(key=>caches.delete(key)))}location.reload();return true}catch{return false}}});</script>`;
}
