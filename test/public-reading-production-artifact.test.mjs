import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import vm from "node:vm";
import { createHash } from "node:crypto";
import ogHandler from "../api/og.js";
import { publicReadingDocumentHandler } from "../public-reading-deploy/api/public-document.js";
import { publicReadingSitemapHandler } from "../public-reading-deploy/api/public-sitemap.js";
import { publicReadingRobotsHandler } from "../public-reading-deploy/api/public-robots.js";
import { publicReadingReadOnlyApi } from "../public-reading-deploy/read-only-api.js";
import { buildPublicReadingWorker, startPublicReading, PUBLIC_READING_POLICY_ID, COMMUNITY_PUBLIC_FIELDS } from "../public-reading-deploy/transport.js";
import { PUBLIC_READING_DEPLOYMENT_AUTHORIZATION, deploymentAuthorized } from "../public-reading-deploy/authorization.js";

const root = new URL("..", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");
const sha = "a".repeat(40), SITE = "https://sod1820.co.il", API = "https://linswmnnkjxvweumprav.supabase.co";
function response() {
  return { headers: new Map(), code: null, body: "", setHeader(k, v) { this.headers.set(k.toLowerCase(), v); },
    status(code) { this.code = code; return this; }, send(value) { this.body = String(value); return this; },
    json(value) { return this.send(JSON.stringify(value)); } };
}
const req = (path, extras = {}) => ({ method: "GET", headers: { host: "sod1820.co.il" }, url: path,
  query: { ...Object.fromEntries(new URL(path, SITE).searchParams), path: new URL(path, SITE).pathname }, ...extras });
const document = '<html><head><title>static</title><meta name="robots" content="index, follow"/></head><body><div id="root">existing shell</div></body></html>';
async function withFetch(fetcher, run) {
  const original = globalThis.fetch; globalThis.fetch = fetcher;
  try { return await run(); } finally { globalThis.fetch = original; }
}
const json = data => new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
const legacy = { id: 1, wp_id: 100, slug: "old-post", title: "Original", source: "wordpress", tags: [], categories: [], date: "2020-01-01" };
const modern = { id: 2, wp_id: 36936, slug: "new-post", title: "Native", source: "sod1820", tags: [], categories: [], date: "2026-01-01" };
const encoded = { ...legacy, id: 3, slug: "%d7%a9%d7%9c%d7%95%d7%9d", title: "שלום" };
const assetId = "b".repeat(32);

test("dormant default cannot be activated by environment, forged request or production branch name", async () => {
  assert.equal(PUBLIC_READING_DEPLOYMENT_AUTHORIZATION.state, "dormant"); assert.equal(deploymentAuthorized(), false);
  let reads = 0;
  const handler = publicReadingDocumentHandler({ readDocument: async () => { reads++; return document; } });
  const res = response(); await handler(req("/?publicReadingRelease=public-reading-20261101", {
    publicReadingProductionArtifact: true, publicReadingRelease: "public-reading-20261101" }), res);
  assert.equal(res.code, 503); assert.equal(reads, 0);
  for (const env of [{ VERCEL: "1" }, { VERCEL_ENV: "production" }, { VERCEL_ENV: "preview" }]) {
    const result = spawnSync(process.execPath, ["scripts/build-public-reading-production.mjs"], { cwd: root,
      env: { ...process.env, ...env }, encoding: "utf8" });
    assert.notEqual(result.status, 0); assert.match(result.stderr, /hosted_activation_requires_separate_guard_approval/);
  }
});

test("only dedicated 2029 compiler target can enable the signed service; default, Preview and stray Legacy flags cannot", () => {
  const source = read("src/lib/publicReadingRelease2029.js").replaceAll("export ", "")
    .replace("import.meta.env?.VITE_PUBLIC_READING_RELEASE", JSON.stringify("public-reading-20261101"));
  for (const [build, production, expected] of [[false, true, false], [true, false, false], [true, true, true]]) {
    const result = vm.runInNewContext(source + ';[PUBLIC_READING_PRODUCTION_ARTIFACT,publicReadingPath("/unsubscribe"),publicReadingPath("/updates")];',
      { __SOD_2029_BUILD__: build, __SOD_PUBLIC_READING_PRODUCTION_ARTIFACT__: production, URLSearchParams });
    assert.equal(result[0], expected); assert.equal(result[1], expected ? "public" : "service-closed"); assert.equal(result[2], "service-closed");
  }
});

test("Production document uses canonical owner, preserves old/native/encoded/wp addresses and genuine missing/failure status", async () => {
  const paths = [["/old-post", legacy, "/old-post"], ["/post/old-post", legacy, "/old-post"],
    ["/new-post", modern, "/post/new-post"], ["/post/new-post", modern, "/post/new-post"],
    ["/%D7%A9%D7%9C%D7%95%D7%9D", encoded, "/%D7%A9%D7%9C%D7%95%D7%9D"], ["/?p=100", legacy, "/old-post"]];
  for (const [path, post, canonical] of paths) await withFetch(async (url) => {
    assert.ok(String(url).includes("/rest/v1/posts?")); return json([post]);
  }, async () => {
    const res = response(); await publicReadingDocumentHandler({ authorized: () => true, indexable: origin => origin === SITE, readDocument: async () => document })(req(path), res);
    assert.equal(res.code, 200, path); assert.match(res.body, new RegExp(`rel="canonical" href="${SITE}${canonical}"`, "i"));
    assert.equal(res.headers.get("cache-control"), "no-store"); assert.equal(res.headers.get("x-robots-tag"), "index, follow");
    assert.ok(res.body.includes("existing shell")); assert.ok(!res.body.includes("http-equiv=\"refresh\""));
  });
  for (const [source, status] of [[[], 404], [[{ ...modern, tags: ["טיוטה"] }], 404], [null, 503]]) await withFetch(async () => {
    if (source === null) throw Error("synthetic outage"); return json(source);
  }, async () => {
    const res = response(); await publicReadingDocumentHandler({ authorized: () => true, indexable: origin => origin === SITE, readDocument: async () => document })(req("/missing-post"), res);
    assert.equal(res.code, status); assert.match(res.headers.get("x-robots-tag"), /noindex/); assert.equal(res.headers.get("cache-control"), "no-store");
  });
});

test("closed, private and unknown routes remain noindex without product lookups; service metadata preserves signed unsubscribe", async () => {
  await withFetch(async () => { throw Error("closed route must not query data"); }, async () => {
    const handler=publicReadingDocumentHandler({ authorized: () => true, indexable: origin => origin === SITE, readDocument: async () => document });
    // Fragments are kept by the browser across redirects, never sent in HTTP.
    const alias=response();await handler(req('/2029/me?returnTo=%2Fworld'),alias);
    assert.equal(alias.code,308);assert.equal(alias.headers.get('location'),'/2029/me/research?returnTo=%2Fworld');assert.match(alias.headers.get('x-robots-tag'),/noindex/);
    for (const path of ["/login", "/2029/me/research?returnTo=%2Fworld#private", "/community/researcher/me", "/journey", "/raziel", "/els", "/updates", "/2029/control", "/unsubscribe?e=synthetic&t=synthetic"]) {
      const res = response(); await publicReadingDocumentHandler({ authorized: () => true, indexable: origin => origin === SITE, readDocument: async () => document })(req(path), res);
      assert.equal(res.code, 200, path); assert.match(res.headers.get("x-robots-tag"), /noindex/, path);
      assert.ok(!res.body.includes("e=synthetic"));
      if (path.startsWith("/unsubscribe")) { assert.match(res.body, /הסרה מהדיוור/); assert.equal(res.headers.get("referrer-policy"), "no-referrer"); }
    }
  });
});

test("public aliases and named existing capabilities retain truthful continuations without publicizing unknown slugs", async () => {
  await withFetch(async url => { assert.ok(/\/(?:posts|channel_updates)\?/.test(String(url))); return json([]); }, async () => {
    const handler = publicReadingDocumentHandler({ authorized: () => true, indexable: origin => origin === SITE, readDocument: async () => document });
    for (const path of ["/2029", "/2029/posts", "/2029/gematria/viral", "/2029/calculator"]) {
      const res = response(); await handler(req(path), res); assert.equal(res.code, 200, path);
    }
    for (const path of ["/name", "/or-geula"]) {
      const res = response(); await handler(req(path), res); assert.equal(res.code, 200, path);
    }
    // ZURIEL's accepted Forum continuation preserves the exact public chat
    // destination. It is a redirect, not a generic200 status placeholder.
    const forum=response();await handler(req('/forum?part=2&part=7'),forum);
    assert.equal(forum.code,308);assert.equal(forum.headers.get('location'),'/community/chat?part=2&part=7');
    for (const path of ["/invented-capability", "/forum/invented-thread"]) {
      const res = response(); await handler(req(path), res); assert.equal(res.code, 404, path); assert.match(res.headers.get("x-robots-tag"), /noindex/);
    }
  });
});

test("HTTP origin, path and method boundaries cannot select metadata profile or enter private readers", async () => {
  let metadataCalls = 0;
  const handler = publicReadingDocumentHandler({ authorized: () => true, indexable: origin => origin === SITE, readDocument: async () => document,
    metadataHandler: async (_req, res) => { metadataCalls++; return res.status(200).send('<head><meta name="robots" content="index, follow"/></head>'); } });
  for (const path of ["//evil.test/x", "/%ZZ", "/%00", "/%5cprivate", "/a?b", "/a#b"]) {
    const res = response(); await handler(req("/api/public-document", { query: { path } }), res); assert.equal(res.code, 400, path);
  }
  for (const extras of [{ method: "POST" }, { headers: { host: "evil.test" } }, { headers: { host: "sod1820.co.il", "x-forwarded-proto": "http" } }]) {
    const res = response(); await handler(req("/", extras), res); assert.ok([405, 421].includes(res.code));
  }
  assert.equal(metadataCalls, 0);
  const alias = response(); await handler(req("/old-post?part=2&part=7", { headers: { host: "www.sod1820.co.il" } }), alias);
  assert.equal(alias.code, 308); assert.equal(alias.headers.get("location"), SITE + "/old-post?part=2&part=7");
  const exact = response(); const address = "/old-post?part=2&part=7&encoded=%2f%2F+%20&path=%2Fkept";
  await handler(req(address, { headers: { host: "www.sod1820.co.il" } }), exact);
  assert.equal(exact.headers.get("location"), SITE + address);
  const rewritten = response(); await handler(req("/api/public-document?path=%2Fold-post&part=2&part=7", {
    headers: { host: "www.sod1820.co.il" }, query: { path: "/old-post" } }), rewritten);
  assert.equal(rewritten.code, 200); assert.equal(rewritten.headers.get("location"), undefined);
  const head = response(); await handler(req("/", { method: "HEAD" }), head); assert.equal(head.code, 200); assert.equal(head.body, "");
});

test("Numbers/phrases use the same canonical indexability readers; source failure is 503, false is noindex", async () => {
  for (const [path, rpc, expectedBody] of [["/number/1820", "is_number_indexable", { p_value: 1820 }],
    ["/number/בראשית", "is_phrase_indexable", { p_phrase: "בראשית" }]]) {
    for (const value of [true, false, null]) await withFetch(async (url, options) => {
      if (String(url).includes("/rpc/")) { assert.ok(String(url).endsWith(rpc)); assert.deepEqual(JSON.parse(options.body), expectedBody); return json(value); }
      return json([]);
    }, async () => {
      const res = response(); await publicReadingDocumentHandler({ authorized: () => true, indexable: origin => origin === SITE, readDocument: async () => document })(req(path), res);
      assert.equal(res.code, value === null ? 503 : 200); assert.match(res.headers.get("x-robots-tag"), value === true ? /^index/ : /^noindex/);
    });
  }
  const res = response(); await publicReadingDocumentHandler({ authorized: () => true, indexable: origin => origin === SITE, readDocument: async () => document })(req("/gematria?q=דוד&n=1"), res);
  assert.equal(res.code, 200); assert.match(res.headers.get("x-robots-tag"), /noindex/); assert.ok(!res.body.includes('content="דוד = 1'));
});

test("public topic/writer/video missing and failed source responses keep 404 and 503 distinct", async () => {
  for (const path of ["/topic/missing", "/community/researcher/missing", "/video/" + assetId]) {
    for (const [data, code] of [[[], 404], [{ error: "synthetic" }, 503]]) await withFetch(async (url) => {
      if (path.startsWith("/community")) assert.match(String(url), /active=eq.true.*locked=not.is.true.*visibility.eq.public/);
      return json(data);
    }, async () => {
      const res = response(); await publicReadingDocumentHandler({ authorized: () => true, indexable: origin => origin === SITE, readDocument: async () => document })(req(path), res);
      assert.equal(res.code, code, path); assert.match(res.headers.get("x-robots-tag"), /noindex/);
    });
  }
});

test("sitemap reuses eligible publication owner for both Post families, Numbers, phrases, topic, public writer and verified video", async () => {
  const calls = [];
  const fetcher = async (url, options) => {
    const value = String(url); calls.push(value);
    if (value.includes("/posts?")) return json([legacy, modern, encoded]);
    if (value.includes("/rpc/sitemap_numbers")) { assert.equal(options.method, "POST"); return json([{ value: 1820 }]); }
    if (value.includes("/sitemap_phrases_v1?")) return json([{ phrase: "בראשית" }]);
    if (value.includes("/topic_cards_public?")) return json([{ slug: "subject" }]);
    if (value.includes("/contributors?")) { assert.match(value, /active=eq.true.*visibility.eq.public/); return json([{ slug: "writer", code: "2042" }]); }
    if (value.includes("/els_records?")) { assert.match(value, /status=eq.published.*visibility=eq.public/); assert.match(value, /source.neq.research/); return json([{ slug: 'published-cipher' }]); }
    if (value.includes("/nodes?")) { assert.match(value, /type=eq.book.*is_active=eq.true/); return json([]); }
    if (value.includes("/video_media_assets_v1?")) return json([{ public_id: assetId, title: "Video", google_indexable: true,
      primary_source_type: "channel_update", primary_source_id: "00000000-0000-4000-8000-000000000001",
      media_url: API + "/storage/v1/object/public/gallery/movie.mp4", video_kind: "selfhost", primary_page_url: SITE + "/video/" + assetId }]);
    if (value.includes("/channel_updates?")) {
      const params = new URL(value).searchParams;
      assert.equal(params.get("status"), "eq.live"); assert.equal(params.get("page_only"), "eq.false");
      assert.match(params.get("or"), /expires_at.gt/);
      return json([{ id: "00000000-0000-4000-8000-000000000001", status: "live", page_only: false,
        text: "Video", image_url: API + "/storage/v1/object/public/gallery/movie.mp4", created_at: "2026-01-01", expires_at: null }]);
    }
    throw Error("unexpected public source " + new URL(value).pathname);
  };
  await withFetch(fetcher, async () => {
    const res = response(); await publicReadingSitemapHandler({ authorized: () => true, indexable: origin => origin === SITE })(req("/sitemap.xml"), res);
    assert.equal(res.code, 200); assert.equal(res.headers.get("cache-control"), "public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400");
    for (const path of ["/old-post", "/post/new-post", "/number/1820", "/number/" + encodeURIComponent("בראשית"),
      "/topic/subject", "/community/researcher/2042", "/video/" + assetId, "/gematria", "/gallery", "/books", "/codes/published-cipher", "/privacy"])
      assert.ok(res.body.includes(`<loc>${SITE}${path}</loc>`), path);
    for (const path of ["/login", "/journey", "/unsubscribe", "/code", "/codes/מחקר"]) assert.ok(!res.body.includes(`<loc>${SITE}${path}</loc>`), path);
    assert.ok(!calls.some(url => /site_flags|research_contributions/.test(url)));
  });
  await withFetch(async () => { throw Error("synthetic outage"); }, async () => {
    const res = response(); await publicReadingSitemapHandler({ authorized: () => true, indexable: origin => origin === SITE })(req("/sitemap.xml"), res); assert.equal(res.code, 503);
  });
});

test("robots follows Production canonical sitemap while dormant mode fails closed; public GET APIs strip Legacy authority and reject POST", async () => {
  const dormant = response(); publicReadingRobotsHandler()(req("/robots.txt"), dormant); assert.equal(dormant.code, 503); assert.match(dormant.body, /Disallow: \//);
  const robots = response(); publicReadingRobotsHandler({ authorized: () => true, indexable: origin => origin === SITE })(req("/robots.txt"), robots);
  assert.equal(robots.code, 200); assert.match(robots.body, /Allow: \/\n/); assert.match(robots.body, /Sitemap: https:\/\/sod1820.co.il\/sitemap.xml/);
  let calls = 0;
  const api = publicReadingReadOnlyApi((request, res) => {
    calls++; assert.equal(request.headers.authorization, undefined); assert.equal(request.headers.cookie, undefined);
    return res.status(200).json({ state: "ready" });
  }, { authorized: () => true });
  const read = response(); await api(req("/api/contributor-interactions", { headers: { host: "sod1820.co.il", authorization: "saved Legacy", cookie: "saved" } }), read);
  const write = response(); await api(req("/api/contributor-interactions", { method: "POST" }), write);
  assert.equal(read.code, 200); assert.equal(write.code, 405); assert.equal(calls, 1);
});

function workerHarness({ clients = {}, fetcher = async () => json([]) } = {}) {
  const listeners = {}, calls = [], claims = [];
  vm.runInNewContext(buildPublicReadingWorker(sha), { self: { location: { origin: SITE }, skipWaiting() {},
    clients: { claim() {claims.push(true);return Promise.resolve();}, get: async id => clients[id] }, addEventListener: (name, handler) => { listeners[name] = handler; } },
    URL, Response, Request, Set, JSON, fetch: async (...args) => { calls.push(args); return fetcher(...args); } });
  return { calls, listeners, claims, async request(path, { method = "POST", body = "{}", clientId = "", origin = API, destination = "", mode } = {}) {
    let pending;
    const request = new Request(origin + path, { method, ...(mode ? {mode} : {}), ...(!["GET", "HEAD"].includes(method) ? { body } : {}) });
    Object.defineProperty(request, "destination", {value: destination});
    listeners.fetch({ request, clientId,
      respondWith(value) { pending = value; } });
    return pending ? await pending : null;
  } };
}

test("exact emitted worker denies A3/models/Auth/credits/writes through GET/POST/PATCH/DELETE and proxy paths before network", async () => {
  const harness = workerHarness({ fetcher: async () => { throw Error("live I/O forbidden"); } });
  for (const path of ["/functions/v1/research-run", "/functions/v1/ai-analyze", "/functions/v1/newsletter-signup", "/rest/v1/rpc/credit_reserve_v1",
    "/rest/v1/rpc/fn_get_or_create_my_person", "/rest/v1/rpc/research_state_apply_ops_v1", "/auth/v1/token?grant_type=password", "/auth/v1/logout"])
    for (const method of ["GET", "POST", "PATCH", "DELETE"]) assert.equal((await harness.request(path, { method })).status, 403, method + path);
  for (const path of ["/api/preview-raziel", "/api/contributor-self", "/api/contributor-interactions"])
    assert.equal((await harness.request(path, { origin: SITE })).status, 403, path);
  assert.equal(harness.calls.length, 0);
});

test("active worker claims only a same-origin window requesting its exact source and policy",async()=>{
 const h=workerHarness(),source={type:'window',url:SITE+'/login'};
 const data={type:'public-reading-claim',policy:PUBLIC_READING_POLICY_ID,sourceSha:sha};
 for(const event of [{data:{...data,sourceSha:'b'.repeat(40)},source},{data:{...data,policy:'legacy'},source},{data,source:{...source,url:'https://foreign.invalid/'}},{data,source:{...source,type:'worker'}},{data,source:null}])h.listeners.message({...event,waitUntil:()=>assert.fail('invalid message claimed')});
 assert.equal(h.claims.length,0);let waited=false;h.listeners.message({data,source,waitUntil:promise=>{assert.ok(promise instanceof Promise);waited=true;}});assert.equal(h.claims.length,1);assert.equal(waited,true);
});

test("emitted worker retains public calculator/STABLE GET/community projection reads and context checks, never raw replies", async () => {
  const harness = workerHarness();
  assert.equal((await harness.request("/rest/v1/rpc/fn_method_profile")).status, 200);
  assert.equal((await harness.request("/rest/v1/rpc/writer_public_contributions_page_v1?p_limit=20", { method: "GET" })).status, 200);
  assert.equal((await harness.request("/rest/v1/rpc/convergence_meter", { body: '{"p_n":1820}' })).status, 200);
  assert.equal((await harness.request("/rest/v1/rpc/convergence_meter", { body: '{"p_n":1820,"write":true}' })).status, 403);
  assert.equal((await harness.request("/rest/v1/rpc/community_feed_page?select=" + encodeURIComponent(COMMUNITY_PUBLIC_FIELDS))).status, 200);
  const before = harness.calls.length;
  assert.equal((await harness.request("/rest/v1/rpc/community_feed_page?select=*" )).status, 403);
  assert.equal((await harness.request("/rest/v1/rpc/community_replies_page", { body: '{}' })).status, 403);
  assert.equal((await harness.request("/rest/v1/rpc/%63redit_reserve_v1", { method: "GET" })).status, 403);
  assert.equal(harness.calls.length, before);
  assert.ok(harness.calls.every(([request, options]) => request instanceof Request ? request.cache === "no-store" && request.credentials === "omit" : options.cache === "no-store"));
});

test("language-link reader admits approved-only scope and denies visitor drafts before any network call", async () => {
  const harness = workerHarness();
  for (const body of ["{}", '{"p_visitor":null}', '{"p_visitor":""}']) {
    assert.equal((await harness.request("/rest/v1/rpc/lang_links_list", { body })).status, 200);
  }
  const publicCalls = harness.calls.length;
  for (const body of ['{"p_visitor":"someone-else"}', '{"p_visitor":0}', '{"p_visitor":null,"extra":true}']) {
    assert.equal((await harness.request("/rest/v1/rpc/lang_links_list", { body })).status, 403);
  }
  for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
    assert.equal((await harness.request("/rest/v1/rpc/lang_links_list?p_visitor=someone-else", { method })).status, 403);
  }
  assert.equal(harness.calls.length, publicCalls);
});

test("signed Legacy unsubscribe alone can reach its unchanged HMAC server from exact controlled service document", async () => {
  const e = "c3ludGhldGljQGV4YW1wbGUuaW52YWxpZA", t = "S".repeat(43), path = `/functions/v1/newsletter-unsubscribe?e=${e}&t=${t}&format=json`;
  const clients = { good: { type: "window", url: `${SITE}/unsubscribe?e=${e}&t=${t}` },
    wrong: { type: "window", url: `${SITE}/world?e=${e}&t=${t}` }, foreign: { type: "window", url: `https://foreign.invalid/unsubscribe?e=${e}&t=${t}` },
    other: { type: "window", url: `${SITE}/unsubscribe?e=other&t=${t}` } };
  const harness = workerHarness({ clients, fetcher: async () => json({ ok: true }) });
  for (const clientId of ["", "missing", "wrong", "foreign", "other"]) assert.equal((await harness.request(path, { method: "GET", clientId })).status, 403, clientId);
  for (const suffix of ["&callback=x", "&format=json", "&e=other"]) assert.equal((await harness.request(path + suffix, { method: "GET", clientId: "good" })).status, 403);
  for (const method of ["POST", "HEAD", "OPTIONS"]) assert.equal((await harness.request(path, { method, clientId: "good" })).status, 403);
  assert.equal(harness.calls.length, 0);
  assert.equal((await harness.request(path, { method: "GET", clientId: "good" })).status, 200); assert.equal(harness.calls.length, 1);
  const [request] = harness.calls[0]; assert.equal(request.url, API + path); assert.equal(request.credentials, "omit"); assert.equal(request.cache, "no-store");
});

test("bootstrap bounds every worker phase, rejects redundant/wrong policy and never imports after a late timeout", async () => {
  function runtime({ register, ready = Promise.resolve(), controller = "valid", installing } = {}) {
    const imports = [], document = { body: { textContent: "existing shell" } };
    class Channel {
      constructor() {
        this.port1 = { close() {}, onmessage: null };
        this.port2 = { close() {}, reply: value => queueMicrotask(() => this.port1.onmessage?.({ data: value })) };
      }
    }
    const sw = new EventTarget(); sw.ready = ready;
    sw.controller = controller === null ? null : { postMessage(_message, ports) {
      ports[0].reply({ policy: controller === "valid" ? PUBLIC_READING_POLICY_ID : "wrong", sourceSha: sha });
    } };
    sw.register = register || (async (_path, options) => { assert.equal(options.updateViaCache, "none"); return { installing }; });
    return { imports, document, navigator: { serviceWorker: sw }, MessageChannel: Channel, setTimeout, clearTimeout,
      loadEntry: async entry => { imports.push(entry); } };
  }
  const config = { entry: "/assets/entry.js", sourceSha: sha, policy: PUBLIC_READING_POLICY_ID, timeoutMs: 10 };
  const success = runtime(); assert.equal(await startPublicReading(config, success), true); assert.equal(success.imports.length, 1);
  const reused = runtime({ controller: "wrong" }); let updates = 0;
  const current = runtime().navigator.serviceWorker.controller;
  reused.navigator.serviceWorker.register = async () => ({ active: {}, update: async () => {
    updates++; reused.navigator.serviceWorker.controller = current;
  } });
  assert.equal(await startPublicReading(config, reused), true); assert.equal(updates, 1); assert.equal(reused.imports.length, 1);
  const unclaimed=runtime({controller:null});let claimRequests=0;
  unclaimed.navigator.serviceWorker.register=async()=>({active:{postMessage(message){assert.equal(message.type,'public-reading-claim');assert.equal(message.policy,config.policy);assert.equal(message.sourceSha,sha);claimRequests++;unclaimed.navigator.serviceWorker.controller=current;}},update:async()=>{}});
  assert.equal(await startPublicReading(config,unclaimed),true);assert.equal(claimRequests,1);assert.equal(unclaimed.imports.length,1);
  const stalledUpdate = runtime();
  stalledUpdate.navigator.serviceWorker.register = async () => ({ active: {}, update: () => new Promise(() => {}) });
  assert.equal(await startPublicReading(config, stalledUpdate), false); assert.equal(stalledUpdate.imports.length, 0);
  const redundant = new EventTarget(); redundant.state = "redundant";
  for (const failure of [runtime({ installing: redundant }), runtime({ ready: new Promise(() => {}) }),
    runtime({ controller: null }), runtime({ controller: "wrong" }), { ...runtime(), navigator: {} }]) {
    assert.equal(await startPublicReading(config, failure), false); assert.equal(failure.imports.length, 0); assert.match(failure.document.body.textContent, /העמוד לא נפתח/);
  }
  let release;
  const late = runtime({ register: () => new Promise(resolve => { release = resolve; }) });
  assert.equal(await startPublicReading(config, late), false); release({}); await new Promise(resolve => setImmediate(resolve));
  assert.equal(late.imports.length, 0, "late register resolution cannot import after timeout");
  const stalled = new EventTarget(); stalled.state = "installing";
  const installation = runtime({ installing: stalled }); assert.equal(await startPublicReading(config, installation), false);
  stalled.state = "activated"; stalled.dispatchEvent(new Event("statechange")); await new Promise(resolve => setImmediate(resolve));
  assert.equal(installation.imports.length, 0);
});

test("actual local artifact retains font fix, compiler isolation, no index shadow, no-store worker and no Legacy rollback worker", () => {
  assert.ok(existsSync(new URL("public-reading-deploy/dist/public-reading-artifact.json", root)), "run node scripts/build-public-reading-production.mjs before acceptance");
  const report = JSON.parse(read("public-reading-deploy/dist/public-reading-artifact.json"));
  const hash = data => createHash("sha256").update(data).digest("hex");
  const html = read("public-reading-deploy/.generated/2029.html"), worker = read("public-reading-deploy/dist/sw.js");
  assert.equal(report.activation.state, "dormant"); assert.equal(report.deployed, false); assert.equal(report.productionReady, false);
  assert.equal(report.workerSha256, hash(worker)); assert.equal(report.previewBypassFlags, false);
  assert.equal(report.documentTemplateSha256, hash(html)); assert.equal(report.documentTemplatePublic, false);
  assert.match(html, /media="print" onload="this.onload=null;this.media='all'"/);
  assert.match(html, /navigator.serviceWorker.register\("\/sw.js"/); assert.match(html, /worker_identity_mismatch/);
  assert.ok(html.indexOf("public-reading-policy") < html.indexOf("await loadEntry("));
  assert.equal(existsSync(new URL("public-reading-deploy/dist/index.html", root)), false);
  assert.equal(existsSync(new URL("public-reading-deploy/dist/2029.html", root)), false);
  assert.equal(existsSync(new URL("public-reading-deploy/dist/robots.txt", root)), false);
  for (const alias of ["public-reading-sw.js", "preview-readonly-sw.js"]) assert.equal(read("public-reading-deploy/dist/" + alias), worker);
  assert.equal(existsSync(new URL("public-reading-deploy/dist/rollback/legacy-sw.js", root)), false, "no Legacy rollback worker is shipped");
  assert.equal("legacyRollbackWorkerSha256" in report, false);
  assert.ok(!worker.includes("caches.open")); assert.ok(!worker.includes("caches.match"));
  const config = JSON.parse(read("public-reading-deploy/vercel.json"));
  assert.equal(report.deploymentConfigSha256, hash(read("public-reading-deploy/vercel.json")));
  assert.ok(config.headers.some(rule => rule.source === "/assets/(.*)" && rule.headers.some(header => header.value === "public, max-age=31536000, immutable")));
  assert.ok(!JSON.stringify(config).includes("autoAssignCustomDomains"));
  const attachmentProofs=JSON.parse(read("docs/reviews/public-url-exceptions-20261103/evidence/attachment-bindings.json"));
  const exactAttachmentRules=attachmentProofs.flatMap(proof=>["","/"].map(suffix=>({source:proof.sourcePath+suffix,destination:proof.postHref+"?sourceAttachment="+encodeURIComponent(proof.sourcePath),permanent:true})));
  const embedRules=config.redirects.slice(exactAttachmentRules.length,exactAttachmentRules.length+12);
  assert.equal(embedRules.length,12);
  for(const rule of embedRules){assert.match(rule.source,/\/embed\/?$/);assert.equal(decodeURIComponent(rule.destination).replace(/\/$/,""),rule.source.replace(/\/embed\/?$/,""));assert.equal(rule.permanent,true);}
  const legacyRedirects=JSON.parse(read("vercel.json")).redirects;
  const recoveredSources=legacyRedirects.filter(rule=>decodeURIComponent(rule.source)==='/משיח-בשנת-התשעו');
  assert.deepEqual(recoveredSources,[
    {source:'/משיח-בשנת-התשעו',destination:'/code',permanent:true},
    {source:'/%D7%9E%D7%A9%D7%99%D7%97-%D7%91%D7%A9%D7%A0%D7%AA-%D7%94%D7%AA%D7%A9%D7%A2%D7%95',destination:'/code',permanent:true},
  ]);
  assert.ok(!config.redirects.some(rule=>recoveredSources.some(source=>source.source===rule.source)),'recovered WP2481 must stay at its own original address');
  assert.deepEqual(config.redirects, [...exactAttachmentRules,...embedRules,...legacyRedirects.filter(rule=>!recoveredSources.includes(rule)),
    { source: "/posts", destination: "/post", permanent: true }]);
  const gate = spawnSync(process.execPath, ["scripts/test-legacy-retired.mjs"], { cwd: root, encoding: "utf8" }); assert.equal(gate.status, 0, gate.stderr);
});

 test("native public image loading retains opaque response compatibility without bypassing private reads or writes", async () => {
 const h=workerHarness();
 for(const bucket of ["media","gallery","magar"]) assert.equal(await h.request(`/storage/v1/object/public/${bucket}/fixture.jpg`,{method:"GET",mode:"no-cors",destination:"image"}),null);
 assert.equal(h.calls.length,0);
 for(const path of ["/storage/v1/object/sign/gallery/a.jpg?token=synthetic", "/storage/v1/object/public/submission-inbox/a.jpg"])
   assert.equal((await h.request(path,{method:"GET",mode:"no-cors",destination:"image"})).status,200);
 assert.equal(h.calls.length,2); // existing API wrapper still owns these reads
 assert.equal((await h.request("/storage/v1/object/public/gallery/a.jpg",{method:"POST"})).status,403);
 });

 test("public image renditions load natively with sizing parameters only; every other shape stays with the API wrapper", async () => {
 const h=workerHarness();
 const image={method:"GET",mode:"no-cors",destination:"image"};
 for(const bucket of ["media","gallery","magar"]){
   assert.equal(await h.request(`/storage/v1/render/image/public/${bucket}/fixture.gif?width=160&height=160&resize=contain&quality=70`,image),null);
   assert.equal(await h.request(`/storage/v1/render/image/public/${bucket}/fixture.jpg?width=480&quality=62&resize=contain`,image),null);
 }
 assert.equal(h.calls.length,0,"renditions are native loads, not worker fetches");
 const wrapped=[
   "/storage/v1/render/image/public/gallery/a.jpg",
   "/storage/v1/render/image/public/gallery/a.jpg?quality=70",
   "/storage/v1/render/image/public/gallery/a.jpg?width=160&token=synthetic",
   "/storage/v1/render/image/public/gallery/a.jpg?width=160&width=170",
   "/storage/v1/render/image/public/gallery/a.jpg?width=0",
   "/storage/v1/render/image/public/gallery/a.jpg?width=99999",
   "/storage/v1/render/image/public/gallery/a.jpg?width=160&quality=101",
   "/storage/v1/render/image/public/gallery/a.jpg?width=160&resize=..%2Fx",
   "/storage/v1/render/image/public/gallery/a.jpg?width=160#fragment",
   "/storage/v1/render/image/public/submission-inbox/a.jpg?width=160",
   "/storage/v1/render/image/authenticated/gallery/a.jpg?width=160",
   "/storage/v1/render/image/sign/gallery/a.jpg?width=160&token=synthetic",
 ];
 for(const path of wrapped) assert.equal((await h.request(path,image)).status,200,path);
 assert.equal(h.calls.length,wrapped.length,"existing API wrapper still owns every other rendition shape");
 assert.equal((await h.request("/storage/v1/render/image/public//gallery/a.jpg?width=160",image)).status,403,"ambiguous double-slash paths stay refused");
 assert.equal(h.calls.length,wrapped.length);
 // Only a native image load qualifies: a script-initiated or cors read keeps going through the wrapper.
 const before=h.calls.length;
 assert.equal((await h.request("/storage/v1/render/image/public/gallery/a.jpg?width=160",{method:"GET",mode:"cors",destination:""})).status,200);
 assert.equal(h.calls.length,before+1);
 assert.equal((await h.request("/storage/v1/render/image/public/gallery/a.jpg?width=160",{method:"POST"})).status,403);
 });

test('approved explicit report receipt path permits no identity-bearing, generic telemetry or unrelated writes',async()=>{
 const h=workerHarness();const body={p_sod_id:null,p_surface:'issue_report',p_event_type:'issue_report',p_path:'/post',p_props:{message:'synthetic'},p_is_bot:false};
 assert.equal((await h.request('/rest/v1/rpc/ingest_event',{body:JSON.stringify(body)})).status,200);
 assert.equal((await h.request('/rest/v1/contact_messages',{body:JSON.stringify([{name:'synthetic',email:'owner@example.invalid',subject:'test',message:'synthetic'}])})).status,200);
 for(const invalid of [{...body,p_sod_id:'spoofed'},{...body,p_event_type:'view'},{...body,p_is_bot:true},{...body,p_props:{email:'private@example.invalid'}},{...body,p_props:{message:'x'.repeat(501)}}])assert.equal((await h.request('/rest/v1/rpc/ingest_event',{body:JSON.stringify(invalid)})).status,403);
 assert.equal(h.calls.length,2);
});

test('actual Supabase insert array columns are admitted exactly; extra columns and selectors remain denied',async()=>{
 const {createClient}=await import('@supabase/supabase-js');const h=workerHarness();let observed;
 const client=createClient(API,'synthetic-public-key',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(url,options)=>{
  const u=new URL(url);observed=u.search;
  return h.request(u.pathname+u.search,{body:options.body});
 }}});
 const response=await client.from('contact_messages').insert([{name:'synthetic',email:'owner@example.invalid',subject:'test',message:'synthetic'}]);
 assert.equal(response.error,null);assert.match(observed,/columns=/);assert.equal(h.calls.length,1);
 for(const search of ['?columns=id','?columns=%22email%22,%22message%22,%22name%22,%22subject%22&select=*'])assert.equal((await h.request('/rest/v1/contact_messages'+search,{body:JSON.stringify({name:'synthetic',email:'x@y',subject:'test',message:'synthetic'})})).status,403);
 assert.equal(h.calls.length,1);
});
test('explicit report retains canonical anonymous session correlation without accepting visitor identity',async()=>{
 const h=workerHarness();const body={p_sod_id:null,p_surface:'issue_report',p_event_type:'issue_report',p_path:'/',p_props:{message:'synthetic'},p_is_bot:false,p_session_id:'7b160de1-ff4c-4da2-a00a-421ed39a4996'};
 assert.equal((await h.request('/rest/v1/rpc/ingest_event',{body:JSON.stringify(body)})).status,200);
 assert.equal((await h.request('/rest/v1/rpc/ingest_event',{body:JSON.stringify({...body,p_session_id:'arbitrary-identity'})})).status,403);assert.equal(h.calls.length,1);
});
