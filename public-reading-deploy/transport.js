import { verifyReadingAdmin, verifyReadingPrincipal } from "./admin-request.js";
import { readingPersonalResponse } from "./personal-request.js";
import { interceptOpeningMail } from "../preview-deploy/opening-mail-transport.js";
import { interceptPublicReadingAdminAuth } from "../preview-deploy/admin-readonly-auth.js";
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
]);
export const PUBLIC_READING_GET_RPCS = Object.freeze([
  ...PUBLIC_READING_READ_RPCS, "writer_public_contributions_page_v1", "canonical_follow_subject",
]);
export const PUBLIC_READING_POLICY_ID = "public-reading-owned-account-continuity-20261103";
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
  const adminFunctions = new Set(["ai-analyze", "research-run", "els-search-bridge", "media-upload-intent", "journey-message", "number-researcher", "raziel-attention", "lab-teacher", "gallery-ocr", "post-save", "post-ai-edit"]);
  const blockedRpc = /^(?:credit_|membership_|claim_daily_credit$|claim_research_lead$|cardcom_|checkout_|billing_|newsletter_|subscribe_email|send_|wa_system_|meta_capi)/;
  const blockedTables = new Set(["site_flags", "profiles", "credit_ledger", "credit_action_prices", "membership_credit_cycles", "credit_reservations", "credit_reservation_allocations", "subscribers", "events", "visitor_events"]);
  const adminFetch = async req => {
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
    if (url.origin === authOrigin && req.method === "POST"
      && ["/rest/v1/rpc/ingest_event", "/rest/v1/contact_messages"].includes(url.pathname)) {
      event.respondWith((async () => {
        const columns = url.searchParams.get("columns");
        const contactColumns = url.pathname.endsWith("/contact_messages") && url.searchParams.size === 1
          && columns?.split(",").sort().join(",") === '\"email\",\"message\",\"name\",\"subject\"';
        if (url.search && !contactColumns) return denied();
        const raw = await req.clone().text();
        if (raw.length > 8192) return denied();
        const parsed = JSON.parse(raw);
        const body = url.pathname.endsWith("/contact_messages") && Array.isArray(parsed) && parsed.length === 1 ? parsed[0] : parsed;
        if (!plainObject(body)) return denied();
        if (url.pathname.endsWith("/ingest_event")) {
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
      if (url.pathname.startsWith("/functions/v1")) { event.respondWith(adminFetch(req).catch(() => denied())); return; }
      if (url.pathname.startsWith("/auth/v1/") && !["/auth/v1/user", "/auth/v1/settings"].includes(url.pathname)
        || url.pathname.startsWith("/rest/v1/rpc/") && safeMethods.has(req.method) && !getReads.has(rpc)) {
        event.respondWith(adminFetch(req).catch(() => denied())); return;
      }
      if (safeMethods.has(req.method)) { event.respondWith(readFetch(req)); return; }
      if (req.method !== "POST" || !rpc) { event.respondWith(adminFetch(req).catch(() => denied())); return; }
      event.respondWith((async () => {
        if (reads.has(rpc) && !url.search) { await jsonBody(req); return readFetch(req); }
        if (rpc === "convergence_meter" && !url.search) {
          const body = await jsonBody(req);
          return Object.keys(body).join(",") === "p_n" && Number.isSafeInteger(body.p_n)
            && body.p_n > 0 && body.p_n <= 2147483647 ? readFetch(req) : denied();
        }
        if (["community_feed_page", "community_message_context", "community_replies_page"].includes(rpc)
          && url.searchParams.size === 1 && url.searchParams.get("select") === policy.communityFields) {
          const body = await jsonBody(req);
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
        return adminFetch(req);
      })().catch(() => denied()));
      return;
    }
    if (url.origin === self.location.origin && url.pathname === "/api/contributor-self") {
      event.respondWith(adminFetch(req).catch(() => denied())); return;
    }
    if (!safeMethods.has(req.method)) { event.respondWith(Promise.resolve(denied())); return; }
    if (url.origin === self.location.origin) {
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

export function buildPublicReadingWorker(sourceSha, { anonKey = "" } = {}) {
  if (!/^[a-f0-9]{40}$/.test(sourceSha)) throw new Error("exact_source_sha_required");
  return `${verifyReadingPrincipal.toString()}\n${verifyReadingAdmin.toString()}\n${readingPersonalResponse.toString()}\n${interceptPublicReadingAdminAuth.toString()}\n${interceptOpeningMail.toString()}\n(${installPublicReadingWorker.toString()})(${JSON.stringify({ id: PUBLIC_READING_POLICY_ID,
    sourceSha, anonKey, reads: PUBLIC_READING_READ_RPCS, getReads: PUBLIC_READING_GET_RPCS, communityFields: COMMUNITY_PUBLIC_FIELDS })});\n`;
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
    return true;
  } catch (error) {
    cancelled = true;
    runtime.onFailure?.(error);
    document.body.textContent = "העמוד לא נפתח. אפשר לרענן ולנסות שוב.";
    return false;
  } finally { clearTimeout(timer); for (const close of cleanup) close(); }
}

export function publicReadingBootstrap(entry, sourceSha) {
  if (!/^\/assets\/[A-Za-z0-9_.-]+\.js$/.test(entry) || !/^[a-f0-9]{40}$/.test(sourceSha)) throw new Error("invalid_build_identity");
  const config = { entry, sourceSha, policy: PUBLIC_READING_POLICY_ID, timeoutMs: 10000 };
  return `<script type="module">(${startPublicReading.toString()})(${JSON.stringify(config)},{navigator,document,MessageChannel,setTimeout,clearTimeout,loadEntry:entry=>import(entry)});</script>`;
}
