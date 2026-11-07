import test from "node:test";
import assert from "node:assert/strict";
import { createReadDedupe, canonicalJson, sharedReadDedupe, READ_DEDUPE_RULES, READ_DEDUPE_TTL_MS, READ_DEDUPE_REGISTRY_TTL_MS } from "./readDedupe.js";

const URL_BASE = "https://example-ref.supabase.co";
const ANON = "anon-key";
const anonHeaders = (extra = {}) => ({ apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json", "X-Client-Info": "supabase-js-web/test", ...extra });
const userHeaders = (token = "user-jwt-1") => anonHeaders({ Authorization: `Bearer ${token}` });
const rpc = (name) => `${URL_BASE}/rest/v1/rpc/${name}`;

/** A fake network: counts calls, answers JSON, can be held open and settled by the test. */
function fakeNetwork({ status = 200, body = (call) => [{ call }], hold = false } = {}) {
  const calls = [];
  const waiting = [];
  const fetch = (input, init) => {
    const call = { input: String(input), init };
    calls.push(call);
    const respond = () => new Response(JSON.stringify(typeof body === "function" ? body(calls.length) : body), { status, headers: { "content-type": "application/json", "content-range": "0-0/1" } });
    if (!hold) return Promise.resolve(respond());
    return new Promise((resolve) => waiting.push(() => resolve(respond())));
  };
  return { fetch, calls, release: () => { while (waiting.length) waiting.shift()(); } };
}
const clock = (start = 1000) => { let t = start; return { now: () => t, tick: (ms) => { t += ms; } }; };
const post = (name, body, headers = anonHeaders()) => [rpc(name), { method: "POST", headers, body: JSON.stringify(body) }];
const get = (path, headers = anonHeaders(), extra = {}) => [`${URL_BASE}/rest/v1/${path}`, { method: "GET", headers, ...extra }];

test("canonicalJson: key order never changes the key, array order does", () => {
  assert.equal(canonicalJson({ b: 1, a: { d: 2, c: [3, { z: 1, y: 2 }] } }), canonicalJson({ a: { c: [3, { y: 2, z: 1 }], d: 2 }, b: 1 }));
  assert.notEqual(canonicalJson({ a: [1, 2] }), canonicalJson({ a: [2, 1] }));
  assert.equal(canonicalJson(null), "null");
  assert.equal(canonicalJson({ a: null }), '{"a":null}');
});

test("in flight: identical listed reads that overlap share ONE network request and each caller gets its own readable Response", async () => {
  const net = fakeNetwork({ hold: true });
  const dedupe = createReadDedupe({ baseFetch: net.fetch, supabaseUrl: URL_BASE });
  const calls = [1, 2, 3, 4].map(() => dedupe.fetch(...post("fn_number_dossier", { p_value: 1820 })));
  await Promise.resolve();
  assert.equal(net.calls.length, 1, "one request on the wire");
  net.release();
  const responses = await Promise.all(calls);
  const bodies = await Promise.all(responses.map((r) => r.json()));
  assert.equal(new Set(responses).size, 4, "four distinct Response objects");
  assert.deepEqual(bodies, [[{ call: 1 }], [{ call: 1 }], [{ call: 1 }], [{ call: 1 }]]);
  assert.equal(responses[0].status, 200);
  assert.equal(responses[0].headers.get("content-range"), "0-0/1", "headers survive");
  assert.deepEqual(dedupe.stats(), { network: 1, shared: 3, memoHits: 0, bypass: 0 });
});

test("body key order is canonical; a different value or a different RPC is a different request", async () => {
  const net = fakeNetwork();
  const dedupe = createReadDedupe({ baseFetch: net.fetch, supabaseUrl: URL_BASE });
  await dedupe.fetch(...post("world_group_source_arrivals_v2", { p_limit: 40, p_before: null }));
  await dedupe.fetch(...post("world_group_source_arrivals_v2", { p_before: null, p_limit: 40 }));
  assert.equal(net.calls.length, 1);
  await dedupe.fetch(...post("world_group_source_arrivals_v2", { p_limit: 24, p_before: null }));
  await dedupe.fetch(...post("fn_zero_scale", { p_value: 40 }));
  assert.equal(net.calls.length, 3);
});

test("TTL memo: an anonymous 2xx is served from memory until the TTL, then fetched again", async () => {
  const net = fakeNetwork(); const time = clock();
  const dedupe = createReadDedupe({ baseFetch: net.fetch, supabaseUrl: URL_BASE, now: time.now });
  const first = await (await dedupe.fetch(...post("fn_number_lookup", { p_value: 227 }))).json();
  time.tick(READ_DEDUPE_TTL_MS - 1);
  const second = await (await dedupe.fetch(...post("fn_number_lookup", { p_value: 227 }))).json();
  assert.deepEqual(second, first);
  assert.equal(net.calls.length, 1);
  assert.equal(dedupe.stats().memoHits, 1);
  time.tick(2);
  const third = await (await dedupe.fetch(...post("fn_number_lookup", { p_value: 227 }))).json();
  assert.equal(net.calls.length, 2);
  assert.deepEqual(third, [{ call: 2 }]);
});

test("the method registry keeps its longer TTL; posts and topic_cards_public use the short one", async () => {
  const net = fakeNetwork(); const time = clock();
  const dedupe = createReadDedupe({ baseFetch: net.fetch, supabaseUrl: URL_BASE, now: time.now });
  const registry = "gematria_methods?select=method_key&method_key=in.(%D7%A8%D7%92%D7%99%D7%9C)";
  await dedupe.fetch(...get(registry)); await dedupe.fetch(...get("posts?select=id&limit=1")); await dedupe.fetch(...get("topic_cards_public?select=id&limit=1"));
  time.tick(READ_DEDUPE_TTL_MS + 1);
  await dedupe.fetch(...get(registry)); await dedupe.fetch(...get("posts?select=id&limit=1")); await dedupe.fetch(...get("topic_cards_public?select=id&limit=1"));
  assert.equal(net.calls.length, 5, "registry hit, the two content lists refetched");
  time.tick(READ_DEDUPE_REGISTRY_TTL_MS);
  await dedupe.fetch(...get(registry));
  assert.equal(net.calls.length, 6);
});

test("GET: the full query string and the Accept / Prefer / Range headers are part of the key", async () => {
  const net = fakeNetwork();
  const dedupe = createReadDedupe({ baseFetch: net.fetch, supabaseUrl: URL_BASE });
  await dedupe.fetch(...get("posts?select=id&slug=eq.a"));
  await dedupe.fetch(...get("posts?select=id&slug=eq.b"));
  await dedupe.fetch(...get("posts?select=id&slug=eq.a", anonHeaders({ Accept: "application/vnd.pgrst.object+json" })));
  await dedupe.fetch(...get("posts?select=id&slug=eq.a", anonHeaders({ Prefer: "count=exact" })));
  await dedupe.fetch(...get("posts?select=id&slug=eq.a", anonHeaders({ Range: "0-9" })));
  assert.equal(net.calls.length, 5);
  await dedupe.fetch(...get("posts?select=id&slug=eq.a", anonHeaders({ "X-Client-Info": "another-version" })));
  assert.equal(net.calls.length, 5, "x-client-info is not part of the key");
});

test("NOTHING user-specific is remembered: a signed-in request is shared only while in flight and never kept", async () => {
  const net = fakeNetwork({ hold: true });
  const dedupe = createReadDedupe({ baseFetch: net.fetch, supabaseUrl: URL_BASE });
  const pair = [dedupe.fetch(...post("fn_number_dossier", { p_value: 7 }, userHeaders("jwt-A"))), dedupe.fetch(...post("fn_number_dossier", { p_value: 7 }, userHeaders("jwt-A")))];
  const other = dedupe.fetch(...post("fn_number_dossier", { p_value: 7 }, userHeaders("jwt-B")));
  const anonymous = dedupe.fetch(...post("fn_number_dossier", { p_value: 7 }));
  await Promise.resolve();
  assert.equal(net.calls.length, 3, "A shared with A; B and anonymous are separate callers");
  net.release(); await Promise.all([...pair, other, anonymous]);
  const again = dedupe.fetch(...post("fn_number_dossier", { p_value: 7 }, userHeaders("jwt-A")));
  net.release(); await again;
  assert.equal(net.calls.length, 4, "signed-in response was not memoised");
  net.release();
  const anonAgain = await dedupe.fetch(...post("fn_number_dossier", { p_value: 7 }));
  assert.deepEqual(await anonAgain.json(), [{ call: 3 }], "the anonymous entry never contains a signed-in answer");
  assert.equal(net.calls.length, 4, "...and is served from the anonymous memo");
});

test("failures are never remembered, and a rejected request is not left in flight", async () => {
  let n = 0;
  const calls = [];
  const baseFetch = async (input, init) => { calls.push(1); n += 1; if (n === 1) throw new TypeError("network down"); if (n === 2) return new Response("{}", { status: 500 }); return new Response("[1]", { status: 200 }); };
  const dedupe = createReadDedupe({ baseFetch, supabaseUrl: URL_BASE });
  await assert.rejects(() => dedupe.fetch(...post("fn_zero_scale", { p_value: 5 })), /network down/);
  const bad = await dedupe.fetch(...post("fn_zero_scale", { p_value: 5 }));
  assert.equal(bad.status, 500);
  const good = await dedupe.fetch(...post("fn_zero_scale", { p_value: 5 }));
  assert.deepEqual(await good.json(), [1]);
  assert.equal(calls.length, 3);
  await dedupe.fetch(...post("fn_zero_scale", { p_value: 5 }));
  assert.equal(calls.length, 3, "the 200 is remembered");
});

test("concurrent callers of a failing request all see the failure, then the next call retries", async () => {
  let n = 0; let reject; const calls = [];
  const baseFetch = () => { calls.push(1); n += 1; return n === 1 ? new Promise((_, r) => { reject = r; }) : Promise.resolve(new Response("[]", { status: 200 })); };
  const dedupe = createReadDedupe({ baseFetch, supabaseUrl: URL_BASE });
  const a = dedupe.fetch(...post("number_neighbors", { p_value: 9, p_limit: 12 }));
  const b = dedupe.fetch(...post("number_neighbors", { p_value: 9, p_limit: 12 }));
  reject(new TypeError("boom"));
  await assert.rejects(a, /boom/); await assert.rejects(b, /boom/);
  const c = await dedupe.fetch(...post("number_neighbors", { p_value: 9, p_limit: 12 }));
  assert.equal(c.status, 200); assert.equal(calls.length, 2);
});

test("a request with an AbortSignal is never shared; it still honours its signal and a success is remembered for later callers", async () => {
  const net = fakeNetwork(); const time = clock();
  const dedupe = createReadDedupe({ baseFetch: net.fetch, supabaseUrl: URL_BASE, now: time.now });
  const c1 = new AbortController(), c2 = new AbortController();
  const [url, init] = get("posts?select=id&limit=3");
  const r1 = dedupe.fetch(url, { ...init, signal: c1.signal }); const r2 = dedupe.fetch(url, { ...init, signal: c2.signal });
  assert.equal(net.calls.length, 2, "two signal-bearing callers are two requests");
  assert.equal(net.calls[0].init.signal, c1.signal, "the signal reaches the network layer");
  await Promise.all([r1, r2]);
  await new Promise((resolve) => setTimeout(resolve, 5)); // the copy is read in the background after the caller has its answer
  const later = await dedupe.fetch(url, init); // no signal: served from the memo the signal-bearing requests left behind
  assert.ok([1, 2].includes((await later.json())[0].call));
  assert.equal(net.calls.length, 2);
  const aborted = new AbortController(); aborted.abort();
  await assert.rejects(() => dedupe.fetch(url, { ...init, signal: aborted.signal }), (e) => e.name === "AbortError");
  assert.equal(net.calls.length, 2, "an already-aborted signal rejects before the memo or the network");
});

test("a signal-bearing request that FAILS or is signed-in leaves nothing behind", async () => {
  const net = fakeNetwork({ status: 500 });
  const dedupe = createReadDedupe({ baseFetch: net.fetch, supabaseUrl: URL_BASE });
  const c = new AbortController();
  const [url, init] = get("posts?select=id&limit=3");
  await dedupe.fetch(url, { ...init, signal: c.signal }); await dedupe.fetch(url, init);
  assert.equal(net.calls.length, 2);
  const ok = fakeNetwork(); const d2 = createReadDedupe({ baseFetch: ok.fetch, supabaseUrl: URL_BASE });
  await d2.fetch(url, { ...init, headers: userHeaders(), signal: c.signal }); await d2.fetch(url, { ...init, headers: userHeaders() });
  assert.equal(ok.calls.length, 2, "a signed-in answer is not remembered even with a signal");
});

test("a caller may read its own Response body while the memo keeps serving the next ones", async () => {
  const net = fakeNetwork();
  const dedupe = createReadDedupe({ baseFetch: net.fetch, supabaseUrl: URL_BASE });
  const a = await dedupe.fetch(...post("posts_by_number_strict", { num: 1, lim: 3 }));
  assert.deepEqual(await a.json(), [{ call: 1 }]);
  const b = await dedupe.fetch(...post("posts_by_number_strict", { num: 1, lim: 3 }));
  const c = b.clone();
  assert.deepEqual(await b.json(), [{ call: 1 }]); assert.deepEqual(await c.json(), [{ call: 1 }]);
  assert.equal(net.calls.length, 1);
});

test("null-body statuses are rebuilt as null-body Responses", async () => {
  const baseFetch = async () => new Response(null, { status: 204 });
  const dedupe = createReadDedupe({ baseFetch, supabaseUrl: URL_BASE });
  const r = await dedupe.fetch(...post("fn_zero_scale", { p_value: 1 }));
  assert.equal(r.status, 204); assert.equal(await r.text(), "");
});

test("pass-through: writes, telemetry, unlisted reads, auth/storage/functions, other origins and non-JSON bodies are never touched", async () => {
  const net = fakeNetwork();
  const dedupe = createReadDedupe({ baseFetch: net.fetch, supabaseUrl: URL_BASE });
  const sameTwice = async (...args) => { await dedupe.fetch(...args); await dedupe.fetch(...args); };
  await sameTwice(...post("ingest_event", { p_event_type: "view" }));
  await sameTwice(...post("track_visit", { p_path: "/" }));
  await sameTwice(...post("link_identity", { p_kind: "legacy_seed" }));
  await sameTwice(...post("add_guest_community_message", { p_body: "x" }));
  await sameTwice(...post("notification_prefs_guest_get_v1", { p_visitor: "11111111-1111-4111-8111-111111111111" }));
  await sameTwice(...post("fn_relation_candidate", { p_a: "א", p_b: "ב" }));
  await sameTwice(...post("rd_is_admin", {}));
  await sameTwice(...get("community_messages?select=id"));
  await sameTwice(`${URL_BASE}/rest/v1/posts?select=id`, { method: "POST", headers: anonHeaders(), body: "{}" }); // a write to a listed relation
  await sameTwice(`${URL_BASE}/rest/v1/posts?id=eq.1`, { method: "PATCH", headers: anonHeaders(), body: "{}" });
  await sameTwice(`${URL_BASE}/auth/v1/user`, { method: "GET", headers: anonHeaders() });
  await sameTwice(`${URL_BASE}/storage/v1/object/public/media/a.jpg`, { method: "GET", headers: anonHeaders() });
  await sameTwice(`${URL_BASE}/functions/v1/anything`, { method: "POST", headers: anonHeaders(), body: "{}" });
  await sameTwice("https://other.example.com/rest/v1/rpc/fn_zero_scale", { method: "POST", headers: anonHeaders(), body: '{"p_value":1}' });
  await sameTwice(rpc("fn_zero_scale"), { method: "POST", headers: anonHeaders(), body: "not json" });
  await sameTwice(rpc("fn_zero_scale"), { method: "POST", headers: anonHeaders(), body: "[1]" });
  await sameTwice(rpc("fn_zero_scale"), { method: "POST", headers: anonHeaders(), body: new Uint8Array([123, 125]) });
  await sameTwice(new Request(rpc("fn_zero_scale"), { method: "POST", headers: anonHeaders(), body: '{"p_value":1}' }));
  assert.equal(net.calls.length, 36, "every one of the 18 operations hit the network both times");
  assert.deepEqual(dedupe.stats(), { network: 0, shared: 0, memoHits: 0, bypass: 36 });
});

test("lang_links_list is shared only for the public (visitor-less) body", async () => {
  const net = fakeNetwork();
  const dedupe = createReadDedupe({ baseFetch: net.fetch, supabaseUrl: URL_BASE });
  await dedupe.fetch(...post("lang_links_list", {})); await dedupe.fetch(...post("lang_links_list", {}));
  await dedupe.fetch(...post("lang_links_list", { p_visitor: null })); await dedupe.fetch(...post("lang_links_list", { p_visitor: "" }));
  assert.equal(net.calls.length, 3, "{} , {p_visitor:null}, {p_visitor:''} are three distinct bodies, each remembered once");
  await dedupe.fetch(...post("lang_links_list", { p_visitor: "22222222-2222-4222-8222-222222222222" }));
  await dedupe.fetch(...post("lang_links_list", { p_visitor: "22222222-2222-4222-8222-222222222222" }));
  assert.equal(net.calls.length, 5, "a visitor-bound body is never shared or remembered");
});

test("memo is bounded and prunes expired entries", async () => {
  const net = fakeNetwork(); const time = clock();
  const dedupe = createReadDedupe({ baseFetch: net.fetch, supabaseUrl: URL_BASE, now: time.now, maxEntries: 3 });
  for (let i = 1; i <= 5; i += 1) await dedupe.fetch(...post("fn_zero_scale", { p_value: i }));
  assert.equal(net.calls.length, 5);
  await dedupe.fetch(...post("fn_zero_scale", { p_value: 5 })); await dedupe.fetch(...post("fn_zero_scale", { p_value: 4 })); await dedupe.fetch(...post("fn_zero_scale", { p_value: 3 }));
  assert.equal(net.calls.length, 5, "the three newest are kept");
  await dedupe.fetch(...post("fn_zero_scale", { p_value: 1 }));
  assert.equal(net.calls.length, 6, "the oldest was evicted");
});

test("clear() empties both tables; the default base fetch resolves globalThis.fetch lazily", async () => {
  const net = fakeNetwork();
  const dedupe = createReadDedupe({ supabaseUrl: URL_BASE });
  const original = globalThis.fetch;
  globalThis.fetch = net.fetch;
  try {
    await dedupe.fetch(...post("fn_zero_scale", { p_value: 2 })); await dedupe.fetch(...post("fn_zero_scale", { p_value: 2 }));
    assert.equal(net.calls.length, 1);
    dedupe.clear();
    await dedupe.fetch(...post("fn_zero_scale", { p_value: 2 }));
    assert.equal(net.calls.length, 2);
  } finally { globalThis.fetch = original; }
});

test("sharedReadDedupe: one instance per origin, so every client of the app shares the same memo", async () => {
  assert.equal(sharedReadDedupe(URL_BASE), sharedReadDedupe(URL_BASE));
  assert.notEqual(sharedReadDedupe(URL_BASE), sharedReadDedupe("https://other-ref.supabase.co"));
});

test("a client with no origin configured never shares anything", async () => {
  const net = fakeNetwork();
  const dedupe = createReadDedupe({ baseFetch: net.fetch });
  await dedupe.fetch(...post("fn_zero_scale", { p_value: 1 })); await dedupe.fetch(...post("fn_zero_scale", { p_value: 1 }));
  assert.equal(net.calls.length, 2);
});

test("the explicit list: frozen, exactly these operations, each with a positive TTL, none of them a write, telemetry or user-specific reader", () => {
  assert.ok(Object.isFrozen(READ_DEDUPE_RULES));
  const listed = READ_DEDUPE_RULES.map((rule) => `${rule.kind}:${rule.name}`).sort();
  assert.deepEqual(listed, [
    "rest:gematria_methods", "rest:posts", "rest:topic_cards_public",
    "rpc:fn_number_dossier", "rpc:fn_number_journey", "rpc:fn_number_lookup", "rpc:fn_verses_by_gematria", "rpc:fn_zero_scale",
    "rpc:is_number_indexable", "rpc:lang_links_list", "rpc:number_neighbors", "rpc:posts_by_number_strict", "rpc:world_group_source_arrivals_v2",
  ]);
  for (const rule of READ_DEDUPE_RULES) { assert.ok(Object.isFrozen(rule)); assert.ok(rule.ttlMs > 0 && rule.ttlMs <= READ_DEDUPE_REGISTRY_TTL_MS); }
  const forbidden = /ingest|track_visit|link_identity|record_|save|add_|set_|toggle|delete|edit|claim|login|verify|notification_prefs|rd_is_admin|relation_candidate|community|feed|comment/i;
  assert.deepEqual(READ_DEDUPE_RULES.filter((rule) => forbidden.test(rule.name)).map((rule) => rule.name), []);
});

test("the listed RPCs are a subset of the public-reading worker's own read-RPC allow-list", async () => {
  const { PUBLIC_READING_READ_RPCS } = await import("../../public-reading-deploy/transport.js");
  const unadmitted = READ_DEDUPE_RULES.filter((rule) => rule.kind === "rpc" && !PUBLIC_READING_READ_RPCS.includes(rule.name)).map((rule) => rule.name);
  assert.deepEqual(unadmitted, []);
});
