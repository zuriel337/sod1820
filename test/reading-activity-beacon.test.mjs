import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync, readdirSync } from "node:fs";
import { build } from "esbuild";
import { readingActivityBody, readingWebVitalBody } from "../src/lib/publicReadingTelemetry2029.js";
import { buildPublicReadingWorker } from "../public-reading-deploy/transport.js";
import { buildWebVitalsSnapshot } from "../src/lib/webVitalsCore.js";

const SITE = "https://sod1820.co.il", DB = "https://linswmnnkjxvweumprav.supabase.co";
const RPC = DB + "/rest/v1/rpc/ingest_reading_activity_v1", GENERIC = DB + "/rest/v1/rpc/ingest_event";
const HEBREW = /[֐-׿]/;
const U = n => `aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12, "0")}`;
const SESSION = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const UID = "11111111-1111-4111-8111-111111111111";
const token = Buffer.from("{}").toString("base64url") + "." + Buffer.from(JSON.stringify({ role: "authenticated", sub: UID })).toString("base64url") + ".signature";
const json = value => new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } });

// The dedicated RPC has exactly four named arguments.
function beacon(over = {}, props = {}) {
  return { p_event_type: "first_compute", p_path: "/gematria", p_app_context: "chrome",
    p_props: { schema: 1, activity_event_id: U(1), activity_session: SESSION, length_bucket: "4-8", entry: "direct", surface_kind: "calculator", ...props }, ...over };
}

// Same harness as test/public-reading-observability.test.mjs, plus a controllable clock.
function worker({ origin = SITE, clientPath = "/gematria", clientId = "window-1" } = {}) {
  const listeners = {}, calls = [];
  let clock = 1_800_000_000_000;
  class FakeDate extends Date { static now() { return clock; } }
  const self = { location: { origin }, skipWaiting() {}, clients: { claim() {}, get: async () => ({ type: "window", url: origin + clientPath }) }, addEventListener: (n, fn) => { listeners[n] = fn; } };
  const context = { self, Request, Response, Headers, URL, URLSearchParams, atob, TextEncoder, console, Date: FakeDate,
    fetch: async (req, opts) => { const r = req instanceof Request ? req : new Request(req, opts); calls.push(r); return json({ ok: true }); } };
  vm.runInNewContext(buildPublicReadingWorker("a".repeat(40), { anonKey: "public-fixture", gaId: "G-TEST12345" }), context);
  return { calls, advance(ms) { clock += ms; },
    request: async (path, body, options = {}) => {
      let response;
      const request = new Request(path, { ...(body ? { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } } : {}), ...options });
      listeners.fetch({ request, clientId, respondWith: value => { response = Promise.resolve(value); } });
      return response ? response : null;
    } };
}
const send = (w, body, headers = { "Content-Type": "application/json" }) => w.request(RPC, body, { headers });

// ───────────────────────── validator: closed schema, content-free ─────────────────────────
test("beacon validator accepts exactly the closed content-free shape", () => {
  for (const type of ["first_compute", "repeat_compute", "recompute"]) assert.equal(readingActivityBody(beacon({ p_event_type: type })), true);
  for (const path of ["/gematria", "/community/calculator"]) assert.equal(readingActivityBody(beacon({ p_path: path })), true);
  const b = beacon();
  assert.deepEqual(Object.keys(b).sort(), ["p_app_context", "p_event_type", "p_path", "p_props"]);
  assert.deepEqual(Object.keys(b.p_props).sort(), ["activity_event_id", "activity_session", "entry", "length_bucket", "schema", "surface_kind"]);
});

test("beacon validator rejects identity, actor claims, content, query, hash and every extra or missing field", () => {
  const mutations = [
    // arguments the generic ingest_event has but this RPC must never carry
    ...["p_sod_id", "p_session_id", "p_surface", "p_is_bot", "p_via", "p_utm", "p_actor_class", "p_user_id"].map(key => b => { b[key] = null; }),
    b => { b.p_event_type = "compute"; }, b => { b.p_event_type = "search"; }, b => { b.p_event_type = "seeded"; },
    b => { b.p_path = "/number/:value"; }, b => { b.p_path = "/gematria?q=שלום"; }, b => { b.p_path = "/gematria#x"; }, b => { b.p_path = "/2029/me/research"; },
    b => { b.p_app_context = "curl"; }, b => { b.extra = 1; }, b => { delete b.p_app_context; }, b => { delete b.p_props; },
    ...["expression", "term", "slug", "query", "hash", "value", "method_key", "method", "user_id", "uid", "email", "sod_id", "share_id", "q", "url", "actor_class", "actor_basis", "role", "seeded", "beacon"]
      .map(key => b => { b.p_props[key] = "x"; }),
    b => { delete b.p_props.entry; }, b => { delete b.p_props.activity_event_id; },
    b => { b.p_props.schema = 2; }, b => { b.p_props.entry = "שיתוף"; }, b => { b.p_props.entry = "other"; },
    b => { b.p_props.length_bucket = "1"; }, b => { b.p_props.length_bucket = "שלום"; }, b => { b.p_props.surface_kind = "admin"; },
    b => { b.p_props.activity_event_id = "not-a-uuid"; }, b => { b.p_props.activity_session = "11111111-1111-1111-8111-111111111111"; /* v1 */ },
    b => { b.p_props = null; }, b => { b.p_props = []; },
  ];
  for (const mutate of mutations) { const b = structuredClone(beacon()); mutate(b); assert.equal(readingActivityBody(b), false, JSON.stringify(b)); }
  for (const nonObject of [null, undefined, [], "x", 1]) assert.equal(readingActivityBody(nonObject), false);
});

test("privacy fuzz: no Hebrew or arbitrary string can pass in any slot of the beacon", () => {
  let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const pool = ["שלום עולם", "משיח", "q=1820", "https://x.invalid/?a=b", "<script>", "1820", "", "a".repeat(300), "דני", "user@example.invalid"];
  const slots = ["p_event_type", "p_path", "p_app_context"];
  const propSlots = ["activity_event_id", "activity_session", "length_bucket", "entry", "surface_kind"];
  let accepted = 0;
  for (let i = 0; i < 4000; i += 1) {
    const b = structuredClone(beacon());
    const slot = rnd() < 0.5 ? slots[Math.floor(rnd() * slots.length)] : null;
    const prop = slot ? null : propSlots[Math.floor(rnd() * propSlots.length)];
    const value = pool[Math.floor(rnd() * pool.length)];
    if (slot) b[slot] = value; else b.p_props[prop] = value;
    if (readingActivityBody(b)) accepted += 1;
  }
  assert.equal(accepted, 0, "a free string must never validate in a beacon slot");
  assert.equal(HEBREW.test(JSON.stringify(beacon())), false);
});

// ───────────────────────── client module ─────────────────────────
async function loadActivity() {
  const code = await build({ entryPoints: ["src/lib/readingActivity2029.js"], bundle: true, write: false, format: "cjs", platform: "node",
    define: { __SOD_2029_BUILD__: "true", "import.meta.env.VITE_PUBLIC_READING_RELEASE": '"public-reading-20261101"' },
    plugins: [{ name: "io-fixtures", setup(b) {
      b.onResolve({ filter: /\/(?:supabase|identity|botVerdict)\.js$/ }, a => ({ path: a.path.split("/").at(-1), namespace: "fixture" }));
      b.onLoad({ filter: /.*/, namespace: "fixture" }, a => ({ contents: a.path === "supabase.js" ? "export const supabase=null;" : a.path === "identity.js" ? "export const appContext=()=>'chrome';" : "export const isBot=()=>false;" }));
    } }] });
  const context = { module: { exports: {} }, exports: {}, console, URL, JSON, Map, Set, Date, Uint8Array };
  context.exports = context.module.exports;
  vm.runInNewContext(code.outputFiles[0].text, context);
  return context.module.exports;
}
function harness(extra = {}) {
  const sent = []; let t = 1_800_000_000_000, n = 0; const store = new Map();
  const storage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  const make = (over = {}) => ({ enabled: true, isBot: () => false, appContext: () => "chrome", pathname: () => "/gematria", storage, now: () => t,
    uuid: () => `cccccccc-cccc-4ccc-8ccc-${String(++n).padStart(12, "0")}`, send: body => sent.push(body), ...extra, ...over });
  return { sent, store, make, tick: ms => { t += ms; } };
}

test("client: first / repeat / recompute are separate event types; rapid duplicates are dropped", async () => {
  const { createReadingActivity } = await loadActivity(); const h = harness(); const a = createReadingActivity(h.make());
  const r = e => a.reportCompute({ expression: e, entry: "direct", surfaceKind: "calculator" });
  assert.equal(r("שלום").p_event_type, "first_compute"); h.tick(2000);
  assert.equal(r("עולם").p_event_type, "repeat_compute"); h.tick(2000);
  assert.equal(r("שלום"), null, "same expression within 60s is a UI artifact, not a compute"); h.tick(61000);
  assert.equal(r("שלום").p_event_type, "recompute");
  assert.deepEqual(h.sent.map(b => b.p_event_type), ["first_compute", "repeat_compute", "recompute"]);
  assert.equal(new Set(h.sent.map(b => b.p_props.activity_session)).size, 1, "one anonymous session");
  assert.equal(new Set(h.sent.map(b => b.p_props.activity_event_id)).size, 3, "every event has its own id");
});

test("client: nothing content-bearing, no identity and no actor claim is ever serialized; every body passes the validator", async () => {
  const { createReadingActivity } = await loadActivity(); const h = harness(); const a = createReadingActivity(h.make());
  const expressions = ["שלום עולם", "משיח בן דוד", "1820 שנת", "Hello World"];
  for (const e of expressions) { a.reportCompute({ expression: e, entry: "direct", surfaceKind: "professional" }); h.tick(61000); }
  assert.ok(h.sent.length >= 3);
  for (const body of h.sent) {
    const text = JSON.stringify(body);
    assert.equal(HEBREW.test(text), false, text);
    for (const e of expressions) assert.equal(text.includes(e), false);
    assert.equal(readingActivityBody(body), true);
    assert.deepEqual(Object.keys(body).sort(), ["p_app_context", "p_event_type", "p_path", "p_props"], "no sod_id, session, bot flag, surface or actor class");
    assert.doesNotMatch(text, /actor|sod_id|user|role|admin/i);
  }
  assert.equal(h.store.get("sod_act_s").includes("שלום"), false, "storage holds only an id and flags");
});

test("client: not reported for bots, disabled build, single letters, non-calculator routes or an unknown app context", async () => {
  const { createReadingActivity } = await loadActivity();
  const cases = [
    [{ isBot: () => true }, "שלום"], [{ enabled: false }, "שלום"], [{}, "ש"], [{}, " "], [{}, "1"],
    [{ pathname: () => "/number/1820" }, "שלום"], [{ pathname: () => "/2029/me/research" }, "שלום"], [{ pathname: () => "/code" }, "שלום"],
  ];
  for (const [over, expression] of cases) { const h = harness(); createReadingActivity(h.make(over)).reportCompute({ expression, entry: "direct", surfaceKind: "calculator" }); assert.equal(h.sent.length, 0, JSON.stringify(over) + expression); }
  const h = harness(); createReadingActivity(h.make({ appContext: () => "unknown-ua" })).reportCompute({ expression: "שלום", entry: "share", surfaceKind: "community" });
  assert.equal(h.sent[0].p_app_context, "other");
  const e = harness(); const boom = createReadingActivity(e.make({ send: () => { throw new Error("network"); } }));
  assert.doesNotThrow(() => boom.reportCompute({ expression: "שלום", entry: "direct", surfaceKind: "calculator" }));
});

test("client: session persists across a reload (no second first_compute) and rotates after 30 idle minutes", async () => {
  const { createReadingActivity } = await loadActivity(); const h = harness();
  const first = createReadingActivity(h.make()); first.reportCompute({ expression: "שלום", entry: "direct", surfaceKind: "calculator" });
  h.tick(5 * 60000);
  const reloaded = createReadingActivity(h.make()); reloaded.reportCompute({ expression: "עולם", entry: "direct", surfaceKind: "calculator" });
  assert.deepEqual(h.sent.map(b => b.p_event_type), ["first_compute", "repeat_compute"]);
  assert.equal(h.sent[0].p_props.activity_session, h.sent[1].p_props.activity_session);
  h.tick(31 * 60000);
  const later = createReadingActivity(h.make()); later.reportCompute({ expression: "משיח", entry: "direct", surfaceKind: "calculator" });
  assert.equal(h.sent[2].p_event_type, "first_compute");
  assert.notEqual(h.sent[2].p_props.activity_session, h.sent[0].p_props.activity_session);
  const noStorage = harness(); const ns = createReadingActivity(noStorage.make({ storage: null }));
  assert.doesNotThrow(() => ns.reportCompute({ expression: "שלום", entry: "direct", surfaceKind: "calculator" }));
  assert.equal(noStorage.sent.length, 1);
});

test("client default sender calls the dedicated RPC, never the generic ingest_event", () => {
  const src = readFileSync("src/lib/readingActivity2029.js", "utf8");
  assert.match(src, /supabase\.rpc\("ingest_reading_activity_v1", body\)/);
  assert.doesNotMatch(src.replace(/^\s*\/\/.*$/gm, ""), /ingest_event/);
});

// ───────────────────────── worker (service worker) integration ─────────────────────────
test("worker admits a valid beacon on the dedicated RPC from the matching canonical window, with the anon key only", async () => {
  const w = worker();
  const res = await send(w, beacon(), { "Content-Type": "application/json", Authorization: "Bearer " + token });
  assert.equal(res.status, 200); assert.equal(w.calls.length, 1);
  assert.equal(w.calls[0].url, RPC);
  assert.equal(w.calls[0].headers.get("Authorization"), "Bearer public-fixture", "the account JWT never reaches the beacon");
  assert.equal(w.calls[0].headers.get("apikey"), "public-fixture");
  assert.equal((await send(worker({ clientPath: "/community/calculator" }), beacon({ p_path: "/community/calculator" }))).status, 200);
  assert.equal((await send(worker({ clientPath: "/2029/calculator" }), beacon())).status, 200, "the SW label of /2029/calculator is /gematria");
});

test("worker refuses a beacon whose random ids equal the signed-in account id (no stable user identifier)", async () => {
  const auth = { "Content-Type": "application/json", Authorization: "Bearer " + token };
  for (const props of [{ activity_session: UID }, { activity_event_id: UID }]) {
    const w = worker(); assert.equal((await send(w, beacon({}, props), auth)).status, 403); assert.equal(w.calls.length, 0);
  }
  const w = worker(); assert.equal((await send(w, beacon(), auth)).status, 200);
  assert.equal(w.calls[0].headers.get("Authorization"), "Bearer public-fixture");
});

test("worker denies wrong window, foreign origin, missing client, query strings and any schema deviation", async () => {
  for (const opts of [{ origin: "https://preview.invalid" }, { clientPath: "/world" }, { clientPath: "/login" }, { clientPath: "/code" }, { clientPath: "/community/calculator" }, { clientId: "" }]) {
    const d = worker(opts); assert.equal((await send(d, beacon())).status, 403, JSON.stringify(opts)); assert.equal(d.calls.length, 0);
  }
  for (const bad of [beacon({ p_sod_id: UID }), beacon({ p_is_bot: true }), beacon({ extra: 1 }), beacon({}, { expression: "שלום" }), beacon({}, { entry: "שלום" }), beacon({ p_event_type: "compute" }), beacon({}, { actor_class: "owner_admin" })]) {
    const d = worker(); assert.equal((await send(d, bad)).status, 403); assert.equal(d.calls.length, 0);
  }
  const q = worker(); assert.equal((await q.request(RPC + "?select=*", beacon())).status, 403); assert.equal(q.calls.length, 0);
});

test("the worker's replay map is temporary defence in depth, NOT the authority for deduplication", async () => {
  const w = worker(); assert.equal((await send(w, beacon())).status, 200);
  assert.equal((await send(w, beacon())).status, 403, "within one worker lifetime a replay is dropped early");
  // A browser may stop and restart the worker at any time; a different browser has a different worker. Memory is lost with it.
  const restarted = worker(); assert.equal((await send(restarted, beacon())).status, 200, "the same id passes a fresh worker: only the database can deduplicate");
  const src = readFileSync("public-reading-deploy/transport.js", "utf8");
  assert.match(src, /DEFENCE IN DEPTH ONLY\. The authority is the database function ingest_reading_activity_v1/);
});

test("worker bounds a client: 30 events per minute, window reset, 500 per worker lifetime", async () => {
  const w = worker(); let ok = 0, denied = 0;
  for (let i = 1; i <= 35; i += 1) ((await send(w, beacon({}, { activity_event_id: U(i) }))).status === 200 ? ok++ : denied++);
  assert.equal(ok, 30); assert.equal(denied, 5);
  w.advance(61000);
  assert.equal((await send(w, beacon({}, { activity_event_id: U(100) }))).status, 200, "a new minute resets the window");
  const long = worker(); let accepted = 0;
  for (let i = 1; i <= 520; i += 1) { long.advance(61000); if ((await send(long, beacon({}, { activity_event_id: U(i) }))).status === 200) accepted += 1; }
  assert.equal(accepted, 500);
});

test("no general ingest_event path opened: the generic RPC admits only performance and issue_report, as before; this RPC admits only its own shape", async () => {
  const src = readFileSync("public-reading-deploy/transport.js", "utf8");
  const surfaces = [...src.matchAll(/p_surface\s*(?:===|!==)\s*"([a-z_]+)"/g)].map(m => m[1]);
  assert.deepEqual([...new Set(surfaces)].sort(), ["issue_report", "performance"], "unchanged from origin/main: gematria is NOT admitted on ingest_event");
  const generic = ["gematria", "page", "arrival", "els", "research", "share", "app", "ai", "number", "journey_2029", "calculator_2029", "reality-stream", "post_exp", "home", "runtime_error", "or-geula"];
  for (const surface of generic) for (const type of ["view", "compute", "first_compute", "repeat_compute", "recompute", "search", "cross_search", "add", "save"]) {
    const w = worker(); const r = await w.request(GENERIC, { p_sod_id: null, p_session_id: null, p_surface: surface, p_event_type: type, p_path: "/gematria", p_app_context: "chrome", p_is_bot: false, p_props: { slug: "שלום" } });
    assert.equal(r.status, 403, surface + "/" + type); assert.equal(w.calls.length, 0);
  }
  // the beacon cannot be sent through the generic RPC, nor a generic body through the beacon RPC
  const viaGeneric = worker(); assert.equal((await viaGeneric.request(GENERIC, { p_sod_id: null, p_session_id: null, p_surface: "gematria", p_event_type: "first_compute", p_path: "/gematria", p_app_context: "chrome", p_is_bot: false, p_props: beacon().p_props })).status, 403);
  const viaBeacon = worker(); assert.equal((await send(viaBeacon, { p_sod_id: null, p_session_id: null, p_surface: "gematria", p_event_type: "first_compute", p_path: "/gematria", p_app_context: "chrome", p_is_bot: false, p_props: beacon().p_props })).status, 403);
  const rpcNames = new Set([...src.matchAll(/"\/rest\/v1\/rpc\/([a-z_0-9]+)"/g)].map(m => m[1]));
  assert.ok(rpcNames.has("ingest_reading_activity_v1") && rpcNames.has("ingest_event"));
  for (const table of ["events", "visitor_events", "search_log", "reading_activity_ids"]) {
    const w = worker(); const r = await w.request(DB + "/rest/v1/" + table, { slug: "שלום" }); assert.equal(r.status, 403, table); assert.equal(w.calls.length, 0);
  }
  for (const rpc of ["link_identity", "claim_daily_credit", "newsletter_send", "ingest_ga_daily", "fn_reading_activity_ids_prune_v1", "edge_rate_limit_check"]) {
    const w = worker(); assert.equal((await w.request(DB + "/rest/v1/rpc/" + rpc, {})).status, 403, rpc); assert.equal(w.calls.length, 0);
  }
});

test("the existing RUM family keeps working beside the beacon and is not widened by it", async () => {
  const vital = { p_sod_id: null, p_session_id: null, p_surface: "performance", p_event_type: "web_vital", p_path: "/gematria", p_app_context: "chrome", p_is_bot: false,
    p_props: { ...buildWebVitalsSnapshot(), sample_id: U(7), phase: "checkpoint", flush_reason: "15s_checkpoint", initial_path: "/gematria", current_path: "/gematria", collector: "performance_observer", measurement_scope: "document_navigation_hard_load_only", nav_type: "navigate", visibility_at_flush: "visible" } };
  assert.equal(readingWebVitalBody(vital), true);
  const w = worker(); assert.equal((await w.request(GENERIC, vital)).status, 200);
  assert.equal((await send(w, beacon())).status, 200);
  assert.equal(w.calls.length, 2);
  assert.equal(readingActivityBody(vital), false); assert.equal(readingWebVitalBody(beacon()), false);
});

// ───────────────────────── before the worker controls the page ─────────────────────────
test("the application (and so the beacon) is not loaded before the matching worker controls the page; a direct call needs the database to enforce", () => {
  const src = readFileSync("public-reading-deploy/transport.js", "utf8");
  const start = src.slice(src.indexOf("export async function startPublicReading"), src.indexOf("export function publicReadingBootstrap"));
  const order = ["serviceWorker.register", "serviceWorker.ready", "serviceWorker.controller", "public-reading-policy", "worker_identity_mismatch", "await loadEntry(config.entry)"].map(m => start.indexOf(m));
  assert.ok(order.every(i => i > 0) && order.every((v, i, a) => i === 0 || v > a[i - 1]), "register -> ready -> controller -> policy handshake -> identity check -> only then import the application: " + order);
  const artifact = readFileSync("test/public-reading-production-artifact.test.mjs", "utf8");
  assert.match(artifact, /startPublicReading\(config, stalledUpdate\), false\); assert\.equal\(stalledUpdate\.imports\.length, 0\)/, "an existing test proves a stalled worker never imports the application");
  // The RPC is also reachable without the worker (the anon key is public, and the generic RPC is executable by PUBLIC), so the
  // proposed database function is the enforcement point. Its proof is tests/sql/reading_activity_v1.sql (scripts/run-reading-activity-sql-test.sh).
  const proposed = readFileSync("supabase/proposed/reading_activity_v1.sql", "utf8");
  for (const needle of ["edge_rate_limit_check", "on conflict do nothing", "'actor_class', 'unknown'", "GUARD: reserved compute identities"]) assert.ok(proposed.includes(needle), needle);
  assert.equal(readdirSync("supabase/migrations").some(f => /reading_activity/.test(f)), false, "the proposal is not a migration and cannot be applied by a tool");
});

// ───────────────────────── call sites: single emitter set, no overlapping sources ─────────────────────────
test("call sites: only the three calculators report compute; legacy emitter stays; no public-reading gate was loosened", () => {
  const read = p => readFileSync(p, "utf8");
  const users = ["src/pages/Calculator2029Page.jsx", "src/pages/CalculatorPro2029Page.jsx", "src/pages/CommunityCalculatorPage.jsx"];
  for (const p of users) { const s = read(p); assert.match(s, /reportReadingCompute\(\{/); assert.match(s, /readingActivity2029\.js/); }
  const calls = [...read("src/pages/Calculator2029Page.jsx").matchAll(/reportReadingCompute\(\{([^}]*)\}\)/g)].map(m => m[1]);
  for (const body of calls) assert.match(body, /^\s*expression: phrase, entry: [^,]+, surfaceKind: "calculator"\s*$/);
  const importers = ["src", "public-reading-deploy"].flatMap(dir => {
    const out = []; const walk = d => { for (const f of readdirSync(d, { withFileTypes: true })) { if (f.isDirectory()) walk(d + "/" + f.name); else if (/\.(jsx?|mjs)$/.test(f.name) && read(d + "/" + f.name).includes("readingActivity2029.js")) out.push(d + "/" + f.name); } };
    walk(dir); return out;
  }).sort();
  assert.deepEqual(importers, ["src/pages/Calculator2029Page.jsx", "src/pages/CalculatorPro2029Page.jsx", "src/pages/CommunityCalculatorPage.jsx"]);
  const community = read("src/pages/CommunityCalculatorPage.jsx");
  assert.match(community, /track\("gematria", word\.slice\(0, 60\), "compute"/, "legacy emitter untouched: it is a no-op in the public build");
  const beaconEffect = community.slice(community.indexOf("beaconSeed = useRef"), community.indexOf("// ✦ חיבור לסוד 1820"));
  assert.doesNotMatch(beaconEffect, /actionsLocked|passive/, "measurement is not an action: it must not depend on the save/AI lock");
  const events = read("src/lib/events.js"), tracking = read("src/lib/tracking.js");
  assert.match(events, /if \(PUBLIC_READING_RELEASE\) return;/); assert.match(tracking, /if \(PUBLIC_READING_RELEASE\) \{/);
});
