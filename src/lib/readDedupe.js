// Read de-duplication for the shared Supabase client: in-flight sharing + a short TTL memo for an EXPLICIT list of
// read-only operations. Nothing else is touched: writes, telemetry beacons (ingest_event / track_visit / link_identity),
// authentication, storage, functions, realtime and every operation that is not listed below pass straight through.
//
// What it guarantees
//  - Only `POST /rest/v1/rpc/<name>` for the RPCs in READ_DEDUPE_RULES and `GET /rest/v1/<relation>` for the relations in
//    READ_DEDUPE_RULES are ever shared. Everything else is `baseFetch` untouched.
//  - Two identical requests (same method, URL, canonical JSON body and ALL request headers except client-info) that overlap in
//    time share ONE network request. The key contains the Authorization header, so a signed-in caller never shares with another
//    caller or with an anonymous one.
//  - A settled 2xx response is remembered for `ttlMs` ONLY when the request carried the anonymous key (Authorization === the
//    apikey, i.e. no user session). Responses for a signed-in user are never remembered: nothing user-specific is cached.
//  - A request that carries an AbortSignal is never SHARED in flight (one caller's abort must not cancel another caller's read):
//    it runs on its own, honours its signal, and - when it succeeds anonymously - its response is remembered like any other. A
//    later caller (with or without a signal) may be served from that memo; an already-aborted signal still rejects first.
//  - Failures (network error, non-2xx) are never remembered; in-flight sharing of a failure ends when it settles.
//  - Every caller receives its own independent `Response` (own body stream), so supabase-js can read each one.
//
// Proof that each listed RPC is read-only (SELECT on pg_proc of linswmnnkjxvweumprav, 7.11.2026: provolatile, prosrc, and every
// public-schema callee found in prosrc with its provolatile):
//  every one is provolatile='s' (STABLE) - Postgres rejects data-modifying statements inside a STABLE function - and the
//  source of each was read: SELECT / RETURN only, and every public-schema function it calls is STABLE or IMMUTABLE
//  (fn_number_dossier / fn_number_journey call rd_is_admin(), which is why the TTL is anonymous-only).
//    world_group_source_arrivals_v2(int, timestamptz)   STABLE SECURITY DEFINER sql   no custom callees (live, 11.11.2026). The proposed
//                                                       media extension (supabase/proposed/20261111234000_group_source_media_v1) keeps
//                                                       it STABLE and adds one STABLE sql callee (group_source_media_publishable_v1) and
//                                                       SELECTs on storage.objects; still read-only.
//    fn_number_lookup(bigint, int, text)                STABLE sql                    callees: fn_composite_calc, fn_method_* (stable)
//    fn_number_dossier(int)                             STABLE SECURITY DEFINER       callees stable/immutable (rd_is_admin stable)
//    fn_number_journey(int)                             STABLE SECURITY DEFINER       callees stable/immutable
//    number_neighbors(int, int)                         STABLE sql                    SELECT only
//    fn_zero_scale(int)                                 STABLE plpgsql                SELECT / jsonb_build_object only
//    is_number_indexable(int)                           STABLE sql                    SELECT exists(sitemap_numbers() (stable))
//    posts_by_number_strict(int, int)                   STABLE sql                    SELECT only
//    fn_verses_by_gematria(int, int)                    STABLE SECURITY DEFINER sql   SELECT only
//    lang_links_list(text)                              STABLE SECURITY DEFINER sql   SELECT approved rows only; shared ONLY when
//                                                       the body is {} or p_visitor is null/"" (the public-reading policy's
//                                                       own admission rule); any other visitor body passes through.
//  GET reads are read-only by HTTP method (PostgREST runs GET in a read-only transaction). The listed relations are public
//  content lists/registries that an anonymous visitor cannot write: posts, topic_cards_public, gematria_methods.
//  Deliberately NOT listed: fn_relation_candidate (heavy, distinct pairs, denied by the public-reading worker),
//  notification_prefs_guest_get_v1 (VOLATILE, visitor-specific), rd_is_admin and any community/comment/feed reader (a guest's
//  own write must be visible immediately), and every write.

export const READ_DEDUPE_TTL_MS = 30000;
export const READ_DEDUPE_REGISTRY_TTL_MS = 120000;

const onlyPublicLangLinks = (body) => {
  const keys = Object.keys(body);
  return keys.length === 0 || (keys.length === 1 && keys[0] === "p_visitor" && (body.p_visitor === null || body.p_visitor === ""));
};

export const READ_DEDUPE_RULES = Object.freeze([
  Object.freeze({ kind: "rpc", name: "world_group_source_arrivals_v2", ttlMs: READ_DEDUPE_TTL_MS }),
  Object.freeze({ kind: "rpc", name: "fn_number_lookup", ttlMs: READ_DEDUPE_TTL_MS }),
  Object.freeze({ kind: "rpc", name: "fn_number_dossier", ttlMs: READ_DEDUPE_TTL_MS }),
  Object.freeze({ kind: "rpc", name: "fn_number_journey", ttlMs: READ_DEDUPE_TTL_MS }),
  Object.freeze({ kind: "rpc", name: "number_neighbors", ttlMs: READ_DEDUPE_TTL_MS }),
  Object.freeze({ kind: "rpc", name: "fn_zero_scale", ttlMs: READ_DEDUPE_TTL_MS }),
  Object.freeze({ kind: "rpc", name: "is_number_indexable", ttlMs: READ_DEDUPE_TTL_MS }),
  Object.freeze({ kind: "rpc", name: "posts_by_number_strict", ttlMs: READ_DEDUPE_TTL_MS }),
  Object.freeze({ kind: "rpc", name: "fn_verses_by_gematria", ttlMs: READ_DEDUPE_TTL_MS }),
  Object.freeze({ kind: "rpc", name: "lang_links_list", ttlMs: READ_DEDUPE_TTL_MS, acceptBody: onlyPublicLangLinks }),
  Object.freeze({ kind: "rest", name: "posts", ttlMs: READ_DEDUPE_TTL_MS }),
  Object.freeze({ kind: "rest", name: "topic_cards_public", ttlMs: READ_DEDUPE_TTL_MS }),
  // Method registry: changes only through an admin migration; every compute of a new phrase re-reads the same key list.
  Object.freeze({ kind: "rest", name: "gematria_methods", ttlMs: READ_DEDUPE_REGISTRY_TTL_MS }),
]);

const IGNORED_HEADERS = new Set(["x-client-info", "content-length", "user-agent"]);
const NULL_BODY_STATUS = new Set([101, 204, 205, 304]);
const DROPPED_RESPONSE_HEADERS = ["content-encoding", "content-length", "transfer-encoding"];

/** JSON.stringify with object keys sorted at every level, so {a,b} and {b,a} are the same request. */
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function bearerOf(headers) {
  const match = /^Bearer\s+(.+)$/i.exec(headers.get("authorization") || "");
  return match ? match[1] : "";
}

/**
 * Build a drop-in `fetch` for supabase-js (`global.fetch`).
 * @param {{ baseFetch?: Function, supabaseUrl?: string, rules?: readonly object[], now?: () => number, maxEntries?: number }} options
 */
export function createReadDedupe({
  baseFetch = (...args) => globalThis.fetch(...args),
  supabaseUrl = "",
  rules = READ_DEDUPE_RULES,
  now = Date.now,
  maxEntries = 64,
} = {}) {
  let origin = "";
  try { origin = supabaseUrl ? new URL(supabaseUrl).origin : ""; } catch { origin = ""; }
  const rpcRules = new Map(), restRules = new Map();
  for (const rule of rules) (rule.kind === "rpc" ? rpcRules : restRules).set(rule.name, rule);
  const inflight = new Map(); // key -> Promise<snapshot>
  const memo = new Map();     // key -> { snapshot, expiresAt }
  const stats = { network: 0, shared: 0, memoHits: 0, bypass: 0 };

  function classify(input, init) {
    try { return classifyUnsafe(input, init); } catch { return null; }
  }

  function classifyUnsafe(input, init) {
    if (typeof input !== "string" && !(input instanceof URL)) return null; // a Request object: leave it alone
    const method = String(init?.method || "GET").toUpperCase();
    let url;
    try { url = new URL(String(input)); } catch { return null; }
    if (!origin || url.origin !== origin) return null;
    let rule = null, bodyKey = "";
    const rpc = method === "POST" ? /^\/rest\/v1\/rpc\/([A-Za-z_][A-Za-z0-9_]*)$/.exec(url.pathname) : null;
    if (rpc) {
      rule = rpcRules.get(rpc[1]) || null;
      if (!rule || typeof init?.body !== "string") return null;
      let parsed;
      try { parsed = JSON.parse(init.body); } catch { return null; }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
      if (rule.acceptBody && !rule.acceptBody(parsed)) return null;
      bodyKey = canonicalJson(parsed);
    } else if (method === "GET") {
      const rest = /^\/rest\/v1\/([A-Za-z_][A-Za-z0-9_]*)$/.exec(url.pathname);
      rule = rest ? restRules.get(rest[1]) || null : null;
      if (!rule) return null;
    } else return null;
    const headers = new Headers(init?.headers || undefined);
    const apikey = headers.get("apikey") || "";
    const anonymous = Boolean(apikey) && bearerOf(headers) === apikey;
    const headerKey = [...headers.entries()].filter(([name]) => !IGNORED_HEADERS.has(name.toLowerCase()))
      .map(([name, value]) => `${name.toLowerCase()}:${value}`).sort().join("\n");
    return { rule, anonymous, signal: init?.signal || null, key: `${method} ${url.pathname}${url.search}\n${bodyKey}\n${headerKey}` };
  }

  async function snapshotOf(response) {
    const bytes = NULL_BODY_STATUS.has(response.status) ? null : await response.arrayBuffer();
    const headers = [...response.headers.entries()].filter(([name]) => !DROPPED_RESPONSE_HEADERS.includes(name.toLowerCase()));
    return { status: response.status, statusText: response.statusText, headers, bytes };
  }
  const respond = (snap) => new Response(snap.bytes ? snap.bytes.slice(0) : null, { status: snap.status, statusText: snap.statusText, headers: snap.headers });

  function remember(key, snap, ttlMs) {
    const stamp = now();
    for (const [k, v] of memo) if (v.expiresAt <= stamp) memo.delete(k);
    memo.delete(key);
    memo.set(key, { snapshot: snap, expiresAt: stamp + ttlMs });
    while (memo.size > maxEntries) memo.delete(memo.keys().next().value);
  }

  const abortReason = (signal) => signal.reason ?? new DOMException("This operation was aborted", "AbortError");

  async function dedupedFetch(input, init) {
    const plan = classify(input, init);
    if (!plan) { stats.bypass += 1; return baseFetch(input, init); }
    const { key, rule, anonymous, signal } = plan;
    if (signal?.aborted) throw abortReason(signal);
    const hit = memo.get(key);
    if (hit) {
      if (hit.expiresAt > now()) { stats.memoHits += 1; return respond(hit.snapshot); }
      memo.delete(key);
    }
    const rememberable = anonymous && rule.ttlMs > 0;
    if (signal) {
      // Own request (never shared), own signal; keep a copy of a successful anonymous answer for later callers.
      stats.network += 1;
      const response = await baseFetch(input, init);
      if (rememberable && response.ok) {
        snapshotOf(response.clone()).then((snap) => remember(key, snap, rule.ttlMs), () => {});
      }
      return response;
    }
    const pending = inflight.get(key);
    if (pending) { stats.shared += 1; return respond(await pending); }
    stats.network += 1;
    const task = (async () => {
      const snap = await snapshotOf(await baseFetch(input, init));
      if (rememberable && snap.status >= 200 && snap.status < 300) remember(key, snap, rule.ttlMs);
      return snap;
    })();
    inflight.set(key, task);
    try { return respond(await task); }
    finally { if (inflight.get(key) === task) inflight.delete(key); }
  }

  return { fetch: dedupedFetch, stats: () => ({ ...stats }), clear: () => { inflight.clear(); memo.clear(); } };
}

// One shared instance per Supabase origin, so every client of the app (the session client and the anonymous public-research
// client) shares the same in-flight table and memo. Entries are keyed by the full request including Authorization, so sharing
// the instance never mixes callers.
const shared = new Map();
export function sharedReadDedupe(supabaseUrl) {
  let instance = shared.get(supabaseUrl);
  if (!instance) { instance = createReadDedupe({ supabaseUrl }); shared.set(supabaseUrl, instance); }
  return instance;
}
