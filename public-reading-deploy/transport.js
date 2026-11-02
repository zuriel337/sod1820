import { interceptPublicReadingAdminAuth } from "../preview-deploy/admin-readonly-auth.js";
// Deployment transport for the existing public-reading profile. This is not
// an Auth/RLS policy: canonical public readers and server permissions still own
// which records are public. No models, Auth mutation, A3, credits or signup.
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
export const PUBLIC_READING_POLICY_ID = "public-reading-production-20261102";
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
  const readFetch = req => fetch(new Request(req, { cache: "no-store", credentials: "omit" }));
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
  self.addEventListener("message", event => {
    if (event.data?.type === "public-reading-policy" && event.ports?.[0])
      event.ports[0].postMessage({ policy: policy.id, sourceSha: policy.sourceSha });
  });
  self.addEventListener("fetch", event => {
    const req = event.request, url = new URL(req.url);
    const rpc = /^\/rest\/v1\/rpc\/([a-z_][a-z0-9_]*)$/.exec(url.pathname)?.[1];
    if (interceptPublicReadingAdminAuth(event, authOrigin)) return;
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
          ? readFetch(req) : denied();
      })().catch(() => denied()));
      return;
    }
    // Signed unsubscribe is the only preserved mutation. The server remains
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
    if (url.origin === authOrigin) {
      const ambiguous = url.pathname.includes("//") || url.pathname.includes("%") && !url.pathname.startsWith("/storage/v1/");
      if (ambiguous || url.pathname.startsWith("/functions/v1")
        || url.pathname.startsWith("/realtime/v1")
        || url.pathname.startsWith("/auth/v1/") && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        event.respondWith(Promise.resolve(denied())); return;
      }
      if (url.pathname.startsWith("/auth/v1/") && !["/auth/v1/user", "/auth/v1/settings"].includes(url.pathname)
        || url.pathname.startsWith("/rest/v1/rpc/") && safeMethods.has(req.method) && !getReads.has(rpc)) {
        event.respondWith(Promise.resolve(denied())); return;
      }
      if (safeMethods.has(req.method)) { event.respondWith(readFetch(req)); return; }
      if (req.method !== "POST" || !rpc) { event.respondWith(Promise.resolve(denied())); return; }
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
        return denied();
      })().catch(() => denied()));
      return;
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

export function buildPublicReadingWorker(sourceSha) {
  if (!/^[a-f0-9]{40}$/.test(sourceSha)) throw new Error("exact_source_sha_required");
  return `${interceptPublicReadingAdminAuth.toString()}\n(${installPublicReadingWorker.toString()})(${JSON.stringify({ id: PUBLIC_READING_POLICY_ID,
    sourceSha, reads: PUBLIC_READING_READ_RPCS, getReads: PUBLIC_READING_GET_RPCS, communityFields: COMMUNITY_PUBLIC_FIELDS })});\n`;
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
