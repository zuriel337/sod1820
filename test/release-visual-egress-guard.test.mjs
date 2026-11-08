// Policy proof for the Release Visual egress guard: every write / telemetry / unexpected request is classified "blocked", every explicit
// read is still allowed, and third parties are DEFAULT-DENY with an exact allow-list. Pure decision logic — no browser, no network (the
// browser proof is release-visual-egress-guard.browser.mjs).
//
// The matrix is derived from the application source, not from a hand-written list: every RPC name, every REST table that is
// inserted/updated/deleted, every Edge Function and every Storage write the code can issue is generated into a request and must be
// blocked unless it is in the reviewed read inventory; every host the app, 2029.html or public/*.html mention is generated into requests
// of every method / resource type / path and must be blocked unless it is an exact allow-list entry. A new write or a new host added to
// the app is therefore covered without touching this file.
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
const guard = require("../tests/fixtures/release-visual-egress.cjs");
const { classify, isExtraGetRead, matchThirdParty, validateAllowlist, ALLOWLIST, CANONICAL_API: API, CANONICAL_STORAGE, EXTRA_GET_RPCS, TELEMETRY_HOST_RE } = guard;

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
const HTML = ["2029.html", ...fs.readdirSync(path.join(root, "public")).filter((f) => f.endsWith(".html")).map((f) => `public/${f}`)]
  .map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n");
const names = (re, group = 1) => [...new Set([...SOURCE.matchAll(re)].map((m) => m[group]))];

const RPC_NAMES = names(/\.rpc\(\s*['"`]([A-Za-z0-9_]+)['"`]/g);
const TABLE_WRITES = [...SOURCE.matchAll(/\.from\(\s*['"`]([A-Za-z0-9_]+)['"`]\s*\)\s*\.\s*(insert|upsert|update|delete)\b/g)].map((m) => ({ table: m[1], op: m[2] }));
const FUNCTIONS = [...new Set([...names(/functions\/v1\/([A-Za-z0-9_-]+)/g), ...names(/\.functions\.invoke\(\s*['"`]([A-Za-z0-9_-]+)['"`]/g)])];
const STORAGE = [...SOURCE.matchAll(/\.storage\s*\.from\(\s*['"`]([A-Za-z0-9_-]+)['"`]\s*\)\s*\.\s*(upload|update|remove|move|copy)\b/g)].map((m) => ({ bucket: m[1], op: m[2] }));
const HTTP_FOR = { insert: "POST", upsert: "POST", update: "PATCH", delete: "DELETE" };
const HOSTS_IN_REPO = [...new Set([...(SOURCE + "\n" + HTML).matchAll(/https?:\/\/([a-z0-9][a-z0-9.-]*\.[a-z]{2,})(?=[/:?#"'`)\s]|$)/gi)].map((m) => m[1].toLowerCase()))];

test("the source scans are not vacuous", () => {
  assert.ok(RPC_NAMES.length > 200, `expected >200 RPC names in src/, found ${RPC_NAMES.length}`);
  for (const must of ["track_visit", "ingest_event", "link_identity", "log_journey_save", "increment_post_share", "fn_log_name_research"]) {
    assert.ok(RPC_NAMES.includes(must), `${must} must be found in the source scan`);
  }
  assert.ok(TABLE_WRITES.some((w) => w.table === "page_views" && w.op === "insert"), "the page_views insert (logView) must be found");
  assert.ok(TABLE_WRITES.length > 5);
  assert.ok(FUNCTIONS.length > 0 && STORAGE.length > 0);
  assert.ok(HOSTS_IN_REPO.length > 30, `expected >30 distinct hosts in src/ and the HTML shells, found ${HOSTS_IN_REPO.length}`);
  for (const must of ["fonts.googleapis.com", "fonts.gstatic.com", "i.ytimg.com", "launcher.spot.im", "cdnjs.cloudflare.com", "sod1820.co.il"]) assert.ok(HOSTS_IN_REPO.includes(must), `${must} must be found`);
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
  assert.equal(verdict(`${CANONICAL_STORAGE}/storage/v1/object/public/gallery/a.png`, "GET", "image"), "read");
  assert.equal(verdict(`${CANONICAL_STORAGE}/storage/v1/object/public/gallery/a.png`, "POST", "fetch"), "blocked");
  assert.equal(verdict(`${API}/storage/v1/object/sign/gallery/a.png`, "POST"), "blocked");
  assert.equal(verdict(`${API}/storage/v1/object/authenticated/gallery/a.png`, "GET", "image"), "blocked", "non-public Storage reads are not allowed");
});

test("analytics / advertising hosts are blocked for every method and resource type, with their own reason", () => {
  const hosts = ["www.google-analytics.com", "region1.google-analytics.com", "analytics.google.com", "www.googletagmanager.com", "stats.g.doubleclick.net",
    "googleads.g.doubleclick.net", "www.googleadservices.com", "pagead2.googlesyndication.com", "www.clarity.ms", "c.clarity.ms", "connect.facebook.net",
    "www.facebook.com", "vitals.vercel-insights.com", "va.vercel-scripts.com", "static.hotjar.com", "api.mixpanel.com", "api.segment.io", "api.amplitude.com",
    "analytics.tiktok.com", "static.ads-twitter.com", "px.ads.linkedin.com"];
  for (const host of hosts) {
    assert.match(host, TELEMETRY_HOST_RE, `${host} must be in the telemetry denylist`);
    for (const type of ["image", "script", "fetch", "xhr", "ping", "stylesheet", "document", "other"]) {
      for (const method of ["GET", "HEAD", "POST", "PUT"]) {
        const decision = classify(`https://${host}/g/collect?v=2`, method, BASE, type);
        assert.deepEqual([decision.verdict, decision.why], ["blocked", "telemetry_host"], `${method} ${type} ${host}`);
      }
    }
  }
  assert.equal(TELEMETRY_HOST_RE.test("notgoogle-analytics.com"), false, "the denylist matches registrable domains, not substrings");
});

test("unexpected requests do not pass: odd methods, odd paths, look-alike hosts, credentials, plain http, other projects", () => {
  const tricks = [
    [`${API}/rest/v1/rpc/track%5Fvisit`, "POST"], [`${API}/rest/v1/rpc//track_visit`, "POST"], [`${API}/rest/v1/rpc/track_visit/`, "POST"],
    [`${API}/rest/v1/rpc/track_visit?x=1`, "POST"], [`${API}/REST/v1/rpc/track_visit`, "POST"], [`${API}/rest/v1/rpc/Track_Visit`, "POST"],
    [`${API}/rest/v1/rpc/lang_links_list`, "POST"], [`${API}/rest/v1/rpc/some_function_that_does_not_exist`, "POST"],
    [`${API}//rest/v1/rpc/gematria_api`, "POST"], [`${API}/rest/v1/../rpc/track_visit`, "POST"],
    ["https://user:pass@linswmnnkjxvweumprav.supabase.co/rest/v1/rpc/gematria_api", "POST"],
    ["http://linswmnnkjxvweumprav.supabase.co/rest/v1/rpc/gematria_api", "POST"],
    ["https://linswmnnkjxvweumprav.supabase.co.attacker.test/rest/v1/rpc/gematria_api", "POST"],
    ["https://linswmnnkjxvweumprav-supabase.co/rest/v1/rpc/gematria_api", "POST"],
    ["https://other-project.supabase.co/rest/v1/rpc/gematria_api", "POST"], ["https://other-project.supabase.co/rest/v1/posts", "GET"],
    ["https://sod1820.co.il/api/anything", "POST"], ["https://www.sod1820.co.il/api/anything", "PUT"],
    ["https://unknown.example/collect", "POST"], ["https://unknown.example/collect", "PUT"], ["https://unknown.example/collect", "DELETE"],
    [`${API}/rest/v1/posts`, "TRACE"], [`${API}/rest/v1/posts`, "CONNECT"], [`${API}/rest/v1/posts`, "PROPFIND"],
  ];
  for (const [url, method] of tricks) assert.equal(verdict(url, method), "blocked", `${method} ${url}`);
});

// ---- third parties: default-deny with an exact allow-list ---------------------------------------------------------------------------
const TYPES = ["document", "stylesheet", "image", "media", "font", "script", "texttrack", "xhr", "fetch", "eventsource", "websocket", "manifest", "other", "ping", "prefetch", "cspreport"];
const METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"];
const PATHS = ["/", "/pixel.gif", "/a/b.js", "/css2", "/css", "/s/ibmplexmono/v19/x.woff2", "/s/other/v1/x.woff2", "/collect", "/vi/abc/hqdefault.jpg", "/wp-content/uploads/a.png"];
const QUERIES = ["", "?x=1", "?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap", "?family=Other&display=swap"];

// An independent re-statement of what the allow-list means, written from the JSON (not from the module's compiled form).
function expectedAllowed(host, method, type, pathname, search) {
  return ALLOWLIST.thirdParty.some((e) => e.host === host && e.methods.includes(method) && e.resourceTypes.includes(type)
    && new RegExp(e.pathRegex).test(pathname) && (e.search === undefined || e.search === search));
}

test("third parties are default-deny: across every host the repo mentions × method × resource type × path × query, only the exact allow-list entries pass", () => {
  const hosts = [...new Set([...HOSTS_IN_REPO, "pixel.unknown.example", "static.unknown.example", "fonts.googleapis.com.attacker.test", "fonts.gstatic.com.attacker.test", "evil-fonts.googleapis.com"])]
    .filter((h) => h !== new URL(API).host && h !== new URL(CANONICAL_STORAGE).host && !TELEMETRY_HOST_RE.test(h));
  let combinations = 0;
  const passing = new Set();
  for (const host of hosts) for (const method of METHODS) for (const type of TYPES) for (const p of PATHS) for (const q of QUERIES) {
    const url = `https://${host}${p}${q}`;
    const expected = expectedAllowed(host, method, type, p, q) ? "read" : "blocked";
    const actual = verdict(url, method, type);
    combinations++;
    if (actual !== expected) assert.fail(`${method} ${type} ${url}: expected ${expected}, got ${actual}`);
    if (actual === "read") passing.add(`${host}`);
  }
  assert.ok(combinations > 50000, `the grid must be large (${combinations})`);
  assert.deepEqual([...passing].sort(), ALLOWLIST.thirdParty.map((e) => e.host).sort(), "only allow-listed hosts may pass, and each must pass for at least one request shape");
  // The two shapes the pages need, spelled out:
  assert.equal(verdict("https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap", "GET", "stylesheet"), "read");
  assert.equal(verdict("https://fonts.gstatic.com/s/ibmplexmono/v19/-F63fjptAgt5VM-kVkqdyU8n5ig.woff2", "GET", "font"), "read");
});

test("near-misses of the allowed third-party requests are blocked", () => {
  const css = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap";
  const font = "https://fonts.gstatic.com/s/ibmplexmono/v19/x.woff2";
  const near = [
    [css, "HEAD", "stylesheet"], [css, "POST", "stylesheet"], [css, "GET", "fetch"], [css, "GET", "script"], [css, "GET", "image"], [css, "GET", "document"],
    ["https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400&display=swap", "GET", "stylesheet"], ["https://fonts.googleapis.com/css?family=IBM+Plex+Mono", "GET", "stylesheet"],
    ["https://fonts.googleapis.com/css2/", "GET", "stylesheet"], ["https://fonts.googleapis.com/css2", "GET", "stylesheet"],
    // only the PATH differs from the allowed stylesheet (exact allowed query kept): widening the path would let these through
    [css.replace("/css2?", "/css?"), "GET", "stylesheet"], [css.replace("/css2?", "/pixel.gif?"), "GET", "stylesheet"], [css.replace("/css2?", "/css2/x?"), "GET", "stylesheet"],
    [css.replace("/css2?", "/?"), "GET", "stylesheet"], [css.replace("/css2?", "/css2.js?"), "GET", "stylesheet"],
    // only the PATH differs from the allowed font shape
    [font.replace("/s/ibmplexmono/", "/s/"), "GET", "font"], [font.replace("/s/ibmplexmono/", "/s/ibmplexsans/"), "GET", "font"], [font.replace("/s/ibmplexmono/", "/ibmplexmono/"), "GET", "font"],
    [css.replace("https:", "http:"), "GET", "stylesheet"], [css.replace(".com", ".com:8443"), "GET", "stylesheet"], [css.replace("https://", "https://u:p@"), "GET", "stylesheet"],
    [css.replace("fonts.googleapis.com", "fonts.googleapis.com."), "GET", "stylesheet"], [css.replace("fonts.googleapis.com", "x.fonts.googleapis.com"), "GET", "stylesheet"],
    [font, "POST", "font"], [font, "GET", "fetch"], [font, "GET", "image"], [font, "GET", "stylesheet"], [font, "GET", "script"],
    ["https://fonts.gstatic.com/s/otherfont/v1/x.woff2", "GET", "font"], ["https://fonts.gstatic.com/l/font?kit=x", "GET", "font"], ["https://fonts.gstatic.com/", "GET", "font"],
    [font.replace("https:", "http:"), "GET", "font"], [font.replace(".com", ".com:8443"), "GET", "font"],
    // hosts the app mentions but this run does not need:
    ["https://i.ytimg.com/vi/abc/hqdefault.jpg", "GET", "image"], ["https://sod1820.co.il/wp-content/uploads/a.png", "GET", "image"], ["https://www.sod1820.co.il/a.png", "GET", "image"],
    ["https://images.spot.im/image/upload/x", "GET", "image"], ["https://launcher.spot.im/spot/sp_x", "GET", "script"], ["https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js", "GET", "script"],
    ["https://www.youtube-nocookie.com/embed/abc", "GET", "document"], ["https://player.vimeo.com/video/1", "GET", "document"], ["https://pixel.unknown.example/p.gif", "GET", "image"],
    ["https://unknown.example/api/ping", "GET", "fetch"], ["https://unknown.example/x.css", "GET", "stylesheet"], ["https://unknown.example/f.woff2", "GET", "font"],
  ];
  for (const [url, method, type] of near) assert.equal(verdict(url, method, type), "blocked", `${method} ${type} ${url}`);
  assert.equal(classify("https://pixel.unknown.example/p.gif", "GET", BASE, "image").why, "third_party_not_allowlisted");
});

test("the allow-list is documented, minimal and validated; over-broad or undocumented lists are rejected", () => {
  assert.deepEqual(ALLOWLIST.thirdParty.map((e) => e.host), ["fonts.googleapis.com", "fonts.gstatic.com"], "adding a host is a deliberate, documented change (update docs section 6 and this pin)");
  // The exact shape of each allowed request is pinned too: widening a path, a type, a method or the query is a deliberate change of this file.
  const shape = (e) => { const { reason, evidence, ...rest } = e; return rest; };
  assert.deepEqual(ALLOWLIST.thirdParty.map(shape), [
    { host: "fonts.googleapis.com", methods: ["GET"], resourceTypes: ["stylesheet"], pathRegex: "^/css2$", search: "?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap" },
    { host: "fonts.gstatic.com", methods: ["GET"], resourceTypes: ["font"], pathRegex: "^/s/ibmplexmono/" },
  ]);
  assert.deepEqual([...EXTRA_GET_RPCS], ["canonical_follow_subject"]);
  for (const e of [...ALLOWLIST.thirdParty, ...ALLOWLIST.canonicalExtraGetRpcs]) {
    assert.ok(e.reason.trim().length >= 20 && e.evidence.trim().length >= 20, `${e.host || e.name}: reason and evidence are required`);
    assert.ok(!TELEMETRY_HOST_RE.test(e.host || "example.test"), `${e.host}: analytics hosts can never be allowed`);
  }
  const good = JSON.parse(JSON.stringify(ALLOWLIST));
  assert.doesNotThrow(() => validateAllowlist(good));
  const mutate = (fn) => { const copy = JSON.parse(JSON.stringify(ALLOWLIST)); fn(copy); return copy; };
  const rejects = [
    ["wildcard host", (l) => { l.thirdParty[0].host = "*.googleapis.com"; }], ["host with a port", (l) => { l.thirdParty[0].host = "fonts.googleapis.com:443"; }],
    ["telemetry host", (l) => { l.thirdParty.push({ ...l.thirdParty[0], host: "www.google-analytics.com" }); }], ["canonical host", (l) => { l.thirdParty.push({ ...l.thirdParty[0], host: "linswmnnkjxvweumprav.supabase.co" }); }],
    ["duplicate host", (l) => { l.thirdParty.push({ ...l.thirdParty[0] }); }], ["POST method", (l) => { l.thirdParty[0].methods = ["GET", "POST"]; }],
    ["no resource type", (l) => { l.thirdParty[0].resourceTypes = []; }], ["unanchored path", (l) => { l.thirdParty[0].pathRegex = "css2"; }],
    ["catch-all path", (l) => { l.thirdParty[0].pathRegex = "^/.*$"; }], ["bad search", (l) => { l.thirdParty[0].search = "family=x"; }],
    ["missing reason", (l) => { delete l.thirdParty[0].reason; }], ["thin evidence", (l) => { l.thirdParty[1].evidence = "needed"; }],
    ["bad extra rpc name", (l) => { l.canonicalExtraGetRpcs[0].name = "Track Visit"; }], ["undocumented extra rpc", (l) => { l.canonicalExtraGetRpcs[0].reason = ""; }],
    ["missing arrays", (l) => { delete l.thirdParty; }],
  ];
  for (const [label, fn] of rejects) assert.throws(() => validateAllowlist(mutate(fn)), /release_visual_allowlist_invalid/, label);
});

test("the one extra canonical read is GET/HEAD only and exact", () => {
  const url = `${API}/rest/v1/rpc/canonical_follow_subject`;
  assert.equal(isExtraGetRead(new URL(url), "GET"), true);
  assert.equal(isExtraGetRead(new URL(url), "HEAD"), true);
  for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) assert.equal(isExtraGetRead(new URL(url), method), false, method);
  assert.equal(isExtraGetRead(new URL(`${url}2`), "GET"), false);
  assert.equal(isExtraGetRead(new URL(`${url}/x`), "GET"), false);
  assert.equal(isExtraGetRead(new URL("https://other.supabase.co/rest/v1/rpc/canonical_follow_subject"), "GET"), false);
  assert.equal(verdict(url, "POST"), "blocked");
});

test("the guard is never more permissive than the shared read-only guard on canonical hosts, and third parties are only ever stricter", () => {
  const canonical = [
    ...RPC_NAMES.map((n) => `${API}/rest/v1/rpc/${n}`), ...TABLE_WRITES.map((w) => `${API}/rest/v1/${w.table}`),
    ...FUNCTIONS.map((f) => `${API}/functions/v1/${f}`), `${API}/auth/v1/user`, `${API}/auth/v1/token`, `${API}/storage/v1/object/public/a.png`, `${CANONICAL_STORAGE}/storage/v1/object/public/a.png`,
  ];
  for (const url of canonical) for (const method of ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) for (const type of ["fetch", "image", "script", "ping"]) {
    const mine = verdict(url, method, type) === "read";
    const shared = allowsPublicRead(url, method, BASE, type);
    if (mine) assert.ok(shared || isExtraGetRead(new URL(url), method), `${method} ${type} ${url} is allowed here but denied by the shared guard`);
    if (shared && !mine) assert.fail(`${method} ${type} ${url} is denied here but allowed by the shared guard`);
  }
  const others = ["https://cdn.example/a.png", "https://unknown.example/collect", "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap", "https://fonts.gstatic.com/s/ibmplexmono/v1/x.woff2", "https://i.ytimg.com/vi/a/b.jpg"];
  for (const url of others) for (const method of METHODS) for (const type of TYPES) {
    if (verdict(url, method, type) === "read") assert.ok(allowsPublicRead(url, method, BASE, type), `${method} ${type} ${url}: stricter, never looser than the shared guard`);
  }
});

test("local preview requests are never classified as external", () => {
  assert.equal(verdict(`${BASE}/2029`, "GET", "document"), "local");
  assert.equal(verdict(`${BASE}/api/anything`, "POST", "fetch"), "local");
  assert.equal(matchThirdParty(new URL("https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap"), "GET", "stylesheet").host, "fonts.googleapis.com");
});
