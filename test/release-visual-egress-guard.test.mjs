// Policy proof for the Release Visual egress guard: every write / telemetry / unexpected request is classified "blocked",
// every explicit read is still allowed. Pure decision logic — no browser, no network (the browser proof is the tripwire test).
//
// The matrix is derived from the application source, not from a hand-written list: every RPC name, every REST table that is
// inserted/updated/deleted, every Edge Function and every Storage write the code can issue is generated into a request and
// must be blocked unless it is in the reviewed read inventory. A new write added to the app is therefore covered without
// touching this file.
//
// Needs the Playwright package only because the shared read-only guard (tests/fixtures/public-readonly-egress.cjs) imports it.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

for (const key of ["HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy", "ALL_PROXY", "all_proxy"]) delete process.env[key];
const require = createRequire(import.meta.url);
const root = path.resolve(new URL("..", import.meta.url).pathname);
const { READ_RPCS, allowsPublicRead } = require("../tests/fixtures/public-readonly-egress.cjs");
const { classify, isExtraGetRead, CANONICAL_API: API, EXTRA_GET_RPCS, TELEMETRY_HOST_RE } = require("../tests/fixtures/release-visual-egress.cjs");

const BASE = "http://127.0.0.1:4173";
const verdict = (url, method = "GET", type = "fetch") => classify(url, method, BASE, type).verdict;

function sourceFiles(dir = path.join(root, "src")) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(js|jsx|mjs)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [full] : [];
  });
}
const SOURCE = sourceFiles().map((file) => fs.readFileSync(file, "utf8")).join("\n");
const names = (re, group = 1) => [...new Set([...SOURCE.matchAll(re)].map((m) => m[group]))];

const RPC_NAMES = names(/\.rpc\(\s*['"`]([A-Za-z0-9_]+)['"`]/g);
const TABLE_WRITES = [...SOURCE.matchAll(/\.from\(\s*['"`]([A-Za-z0-9_]+)['"`]\s*\)\s*\.\s*(insert|upsert|update|delete)\b/g)].map((m) => ({ table: m[1], op: m[2] }));
const FUNCTIONS = [...new Set([...names(/functions\/v1\/([A-Za-z0-9_-]+)/g), ...names(/\.functions\.invoke\(\s*['"`]([A-Za-z0-9_-]+)['"`]/g)])];
const STORAGE = [...SOURCE.matchAll(/\.storage\s*\.from\(\s*['"`]([A-Za-z0-9_-]+)['"`]\s*\)\s*\.\s*(upload|update|remove|move|copy)\b/g)].map((m) => ({ bucket: m[1], op: m[2] }));
const HTTP_FOR = { insert: "POST", upsert: "POST", update: "PATCH", delete: "DELETE" };

test("the source scan is not vacuous", () => {
  assert.ok(RPC_NAMES.length > 200, `expected >200 RPC names in src/, found ${RPC_NAMES.length}`);
  for (const must of ["track_visit", "ingest_event", "link_identity", "log_journey_save", "increment_post_share", "fn_log_name_research"]) {
    assert.ok(RPC_NAMES.includes(must), `${must} must be found in the source scan`);
  }
  assert.ok(TABLE_WRITES.some((w) => w.table === "page_views" && w.op === "insert"), "the page_views insert (logView) must be found");
  assert.ok(TABLE_WRITES.length > 5);
  assert.ok(FUNCTIONS.length > 0 && STORAGE.length > 0);
});

test("every RPC the app can call is blocked unless it is in the reviewed read inventory (POST and GET)", () => {
  const reads = new Set(READ_RPCS);
  let blocked = 0;
  let allowed = 0;
  for (const name of RPC_NAMES) {
    const url = `${API}/rest/v1/rpc/${name}`;
    const expectPost = reads.has(name) ? "read" : "blocked";
    assert.equal(verdict(url, "POST"), expectPost, `POST ${name}`);
    const expectGet = reads.has(name) || EXTRA_GET_RPCS.includes(name) ? "read" : "blocked";
    assert.equal(verdict(url, "GET"), expectGet, `GET ${name}`);
    for (const method of ["PUT", "PATCH", "DELETE"]) assert.equal(verdict(url, method), "blocked", `${method} ${name}`);
    if (expectPost === "blocked") blocked++; else allowed++;
  }
  assert.ok(blocked > 250, `most app RPCs must be blocked (blocked ${blocked}, allowed ${allowed})`);
  assert.ok(allowed >= 3, "the reads the pages need must stay allowed");
});

test("the telemetry and identity writes measured on the pages are blocked", () => {
  for (const name of ["track_visit", "ingest_event", "link_identity", "log_journey_ab", "log_journey_save", "log_edge", "log_crawl", "log_security", "recent_number_opens"]) {
    assert.equal(verdict(`${API}/rest/v1/rpc/${name}`, "POST"), "blocked", name);
  }
  assert.equal(verdict(`${API}/rest/v1/page_views`, "POST"), "blocked");
  for (const table of ["visitor_events", "user_activity", "site_visits", "events", "push_subscriptions"]) {
    assert.equal(verdict(`${API}/rest/v1/${table}`, "POST"), "blocked", table);
  }
});

test("every table the app inserts, upserts, updates or deletes is blocked for every write method; reads of it are unchanged", () => {
  for (const { table, op } of TABLE_WRITES) {
    const url = `${API}/rest/v1/${table}`;
    assert.equal(verdict(url, HTTP_FOR[op]), "blocked", `${HTTP_FOR[op]} ${table}`);
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) assert.equal(verdict(`${url}?id=eq.1`, method), "blocked", `${method} ${table}?id=eq.1`);
    assert.equal(verdict(`${url}?select=*&limit=1`, "GET"), "read", `GET ${table} stays a read (RLS decides at the database)`);
  }
});

test("Edge Functions, Auth and Storage writes are blocked; the allowed Auth and Storage reads stay allowed", () => {
  for (const fn of FUNCTIONS) for (const method of ["POST", "GET", "PUT"]) assert.equal(verdict(`${API}/functions/v1/${fn}`, method), "blocked", `${method} functions/${fn}`);
  assert.ok(FUNCTIONS.includes("meta-capi"), "the Meta Conversions API edge function must be found");
  for (const { bucket, op } of STORAGE) {
    const url = `${API}/storage/v1/object/${bucket}/x/y.png`;
    for (const method of ["POST", "PUT", "DELETE"]) assert.equal(verdict(url, method), "blocked", `${method} storage ${bucket} (${op})`);
  }
  for (const [method, route] of [["POST", "token?grant_type=password"], ["POST", "signup"], ["POST", "otp"], ["POST", "logout"], ["PUT", "user"], ["POST", "verify"], ["POST", "recover"]]) {
    assert.equal(verdict(`${API}/auth/v1/${route}`, method), "blocked", `${method} auth/${route}`);
  }
  assert.equal(verdict(`${API}/auth/v1/user`, "GET"), "read");
  assert.equal(verdict(`${API}/auth/v1/settings`, "GET"), "read");
  assert.equal(verdict(`${API}/storage/v1/object/public/gallery/a.png`, "GET", "image"), "read");
  assert.equal(verdict(`${API}/storage/v1/render/image/public/gallery/a.png?width=100`, "GET", "image"), "read");
  assert.equal(verdict(`${API}/storage/v1/object/sign/gallery/a.png`, "POST"), "blocked");
  assert.equal(verdict(`${API}/storage/v1/object/authenticated/gallery/a.png`, "GET", "image"), "blocked", "non-public Storage reads are not allowed");
});

test("analytics / advertising hosts are blocked for every method and resource type", () => {
  const hosts = ["www.google-analytics.com", "region1.google-analytics.com", "analytics.google.com", "www.googletagmanager.com", "stats.g.doubleclick.net",
    "googleads.g.doubleclick.net", "www.googleadservices.com", "pagead2.googlesyndication.com", "www.clarity.ms", "c.clarity.ms", "connect.facebook.net",
    "www.facebook.com", "vitals.vercel-insights.com", "va.vercel-scripts.com", "static.hotjar.com", "api.mixpanel.com", "api.segment.io", "api.amplitude.com",
    "analytics.tiktok.com", "static.ads-twitter.com", "px.ads.linkedin.com"];
  for (const host of hosts) {
    assert.match(host, TELEMETRY_HOST_RE, `${host} must be in the telemetry denylist`);
    for (const type of ["image", "script", "fetch", "xhr", "ping", "stylesheet", "document", "other"]) {
      for (const method of ["GET", "HEAD", "POST", "PUT"]) assert.equal(verdict(`https://${host}/g/collect?v=2`, method, type), "blocked", `${method} ${type} ${host}`);
    }
  }
  assert.equal(TELEMETRY_HOST_RE.test("notgoogle-analytics.com"), false, "the denylist matches registrable domains, not substrings");
});

test("unexpected requests do not pass: odd methods, odd paths, look-alike hosts, credentials, plain http", () => {
  const tricks = [
    [`${API}/rest/v1/rpc/track%5Fvisit`, "POST"], [`${API}/rest/v1/rpc//track_visit`, "POST"], [`${API}/rest/v1/rpc/track_visit/`, "POST"],
    [`${API}/rest/v1/rpc/track_visit?x=1`, "POST"], [`${API}/REST/v1/rpc/track_visit`, "POST"], [`${API}/rest/v1/rpc/Track_Visit`, "POST"],
    [`${API}/rest/v1/rpc/lang_links_list`, "POST"], [`${API}/rest/v1/rpc/some_function_that_does_not_exist`, "POST"],
    [`${API}//rest/v1/rpc/gematria_api`, "POST"], [`${API}/rest/v1/../rpc/track_visit`, "POST"],
    ["https://user:pass@linswmnnkjxvweumprav.supabase.co/rest/v1/rpc/gematria_api", "POST"],
    ["http://linswmnnkjxvweumprav.supabase.co/rest/v1/rpc/gematria_api", "POST"],
    ["https://linswmnnkjxvweumprav.supabase.co.attacker.test/rest/v1/rpc/gematria_api", "POST"],
    ["https://linswmnnkjxvweumprav-supabase.co/rest/v1/rpc/gematria_api", "POST"],
    ["https://other-project.supabase.co/rest/v1/rpc/gematria_api", "POST"],
    ["https://sod1820.co.il/api/anything", "POST"], ["https://www.sod1820.co.il/api/anything", "PUT"],
    ["https://unknown.example/collect", "POST"], ["https://unknown.example/collect", "PUT"], ["https://unknown.example/collect", "DELETE"],
    [`${API}/rest/v1/posts`, "TRACE"], [`${API}/rest/v1/posts`, "CONNECT"], [`${API}/rest/v1/posts`, "PROPFIND"],
  ];
  for (const [url, method] of tricks) assert.equal(verdict(url, method), "blocked", `${method} ${url}`);
  for (const type of ["fetch", "xhr", "ping", "websocket", "eventsource", "other", "manifest", "texttrack", "prefetch"]) {
    assert.equal(verdict("https://unknown.example/collect", "GET", type), "blocked", `GET ${type} to an unknown host`);
  }
});

test("the accepted read classes are pinned: ordinary third-party assets and the reads the pages issue", () => {
  for (const type of ["image", "media", "font", "stylesheet", "script", "document"]) {
    assert.equal(verdict("https://cdn.example/asset.bin", "GET", type), "read", `third-party ${type} GET is an accepted read class`);
    assert.equal(verdict("https://cdn.example/asset.bin", "POST", type), "blocked", `third-party ${type} POST is not`);
  }
  assert.equal(verdict("https://fonts.googleapis.com/css2?family=Heebo", "GET", "stylesheet"), "read");
  // Observed offline on the spec's pages (RELEASE-VISUAL-EGRESS-GUARD.md):
  for (const name of ["world_group_source_arrivals_v2", "fn_method_value", "fn_method_profile"]) assert.equal(verdict(`${API}/rest/v1/rpc/${name}`, "POST"), "read", name);
  for (const table of ["site_flags", "posts", "topic_cards_public", "contributors"]) assert.equal(verdict(`${API}/rest/v1/${table}?select=*`, "GET"), "read", table);
  assert.equal(verdict(`${API}/rest/v1/rpc/canonical_follow_subject?p_kind=x`, "GET"), "read");
});

test("the one extra read is GET/HEAD only and exact", () => {
  assert.deepEqual([...EXTRA_GET_RPCS], ["canonical_follow_subject"]);
  const url = `${API}/rest/v1/rpc/canonical_follow_subject`;
  assert.equal(isExtraGetRead(new URL(url), "GET"), true);
  assert.equal(isExtraGetRead(new URL(url), "HEAD"), true);
  for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) assert.equal(isExtraGetRead(new URL(url), method), false, method);
  assert.equal(isExtraGetRead(new URL(`${url}2`), "GET"), false);
  assert.equal(isExtraGetRead(new URL(`${url}/x`), "GET"), false);
  assert.equal(isExtraGetRead(new URL("https://other.supabase.co/rest/v1/rpc/canonical_follow_subject"), "GET"), false);
  assert.equal(verdict(url, "POST"), "blocked");
});

test("the guard never allows what the shared read-only guard denies (other than the one extra GET), and only adds the telemetry denylist", () => {
  const urls = [
    ...RPC_NAMES.map((n) => `${API}/rest/v1/rpc/${n}`), ...TABLE_WRITES.map((w) => `${API}/rest/v1/${w.table}`),
    ...FUNCTIONS.map((f) => `${API}/functions/v1/${f}`), `${API}/auth/v1/user`, `${API}/auth/v1/token`, `${API}/storage/v1/object/public/a.png`,
    "https://cdn.example/a.png", "https://unknown.example/collect", "https://www.google-analytics.com/g/collect",
  ];
  for (const url of urls) for (const method of ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) for (const type of ["fetch", "image", "script", "ping"]) {
    const mine = verdict(url, method, type) === "read";
    const shared = allowsPublicRead(url, method, BASE, type);
    const host = new URL(url).hostname;
    if (mine) assert.ok(shared || isExtraGetRead(new URL(url), method), `${method} ${type} ${url} is allowed here but denied by the shared guard`);
    if (shared && !mine) assert.ok(TELEMETRY_HOST_RE.test(host), `${method} ${type} ${url} is denied here but allowed by the shared guard without being a telemetry host`);
  }
});

test("local preview requests are never classified as external", () => {
  assert.equal(verdict(`${BASE}/2029`, "GET", "document"), "local");
  assert.equal(verdict(`${BASE}/api/anything`, "POST", "fetch"), "local");
});
