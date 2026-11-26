// Edge security probe layer (decision 337, 26.11.2026): prevention (403 before any read), recording (existing RPC log_security),
// no cost for ordinary browsing, and the matcher that lets dotted scanner paths reach the middleware. All effects are synthetic.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import middleware, { config as rootConfig } from "../middleware.js";
import { config as coreConfig } from "../middleware-core.js";
import { config as publicConfig } from "../public-reading-deploy/middleware.js";
import { KNOWN_SINGLE_SEGMENT_ROUTES } from "../route-legitimacy.js";
import {
  PROBE_CANARY_PATH, PROBE_CANARY_UA, coarseAddress, createProbeAdmission, isProbeCanary, isSecurityProbe, probeLogBody,
} from "../edge-security-probe.js";

const BROWSER = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/142.0.0.0 Mobile Safari/537.36";
const PROBES = ["/wp-login.php", "/wp-admin", "/wp-admin/", "/wp-admin/setup-config.php", "/wp-includes/x", "/xmlrpc.php", "/wp-cron.php",
  "/wp-config.php", "/.env", "/.env.local", "/.git/config", "/.git", "/.aws/credentials", "/.ssh/id_rsa", "/.vscode/settings.json",
  "/.DS_Store", "/app/.env", "/phpinfo.php", "/phpmyadmin/", "/phpmyadmin/index.php", "/pma/x", "/vendor/phpunit/x", "/cgi-bin/test",
  "/config.php", "/configuration.php", "/server-status", "/actuator/health", "/shell.php", "/a/b/c.PHP", PROBE_CANARY_PATH];
const LEGIT = ["/", "/world", "/post", "/post/some-slug", "/number/1820", "/community/chat", "/gematria", "/code", "/stats", "/admin", "/admin/x",
  "/wp-content/uploads/2020/05/photo.jpg", "/assets/index-abc.js", "/favicon.ico", "/robots.txt", "/sitemap.xml", "/og.png", "/.well-known/security.txt",
  "/.envelope", "/2029/control", "/phpmyadmin-fan-page-not-real-but-ok".replace("phpmyadmin-", "x-"), "/vendors", "/wp-contents"];

function matcherCoversPath(config, path) {
  return config.matcher.some((source) => new RegExp("^" + source + "$").test(path));
}

test("probe shapes are recognised, ordinary addresses and every known route are not", () => {
  for (const p of PROBES) assert.equal(isSecurityProbe(p), true, p);
  for (const p of LEGIT) assert.equal(isSecurityProbe(p), false, p);
  for (const known of KNOWN_SINGLE_SEGMENT_ROUTES) assert.equal(isSecurityProbe(known), false, `known route ${known}`);
  assert.equal(isSecurityProbe("/%2e%65nv"), true, "an encoded .env is decoded before matching");
  assert.equal(isSecurityProbe("/%77p-admin/x"), true, "percent-encoded probe is decoded before matching");
  assert.equal(isSecurityProbe(undefined), false);
});

test("matcher: ordinary pages keep the old coverage, static assets stay outside, and every dotted probe is covered", () => {
  assert.deepEqual(rootConfig, publicConfig);
  assert.deepEqual(rootConfig, coreConfig);
  assert.equal(rootConfig.matcher[0], "/((?!api/|assets/|.*\\.).*)", "the first entry is the unchanged page matcher");
  for (const p of ["/assets/index-abc.js", "/favicon.ico", "/robots.txt", "/sitemap.xml", "/og.png", "/.well-known/security.txt",
    "/wp-content/uploads/2020/05/photo.jpg", "/api/ga-insights"]) {
    assert.equal(matcherCoversPath(rootConfig, p), false, `${p} must not invoke the middleware (no cost for ordinary assets)`);
  }
  for (const p of ["/", "/world", "/post/x", "/number/1820"]) assert.equal(matcherCoversPath(rootConfig, p), true, p);
  for (const p of PROBES.filter((x) => /[.]/.test(x))) assert.equal(matcherCoversPath(rootConfig, p), true, `dotted probe ${p} reaches the middleware`);
});

async function invoke(path, agent, headers = {}) {
  const pending = [], calls = [], original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const u = new URL(url); calls.push({ path: u.pathname, body: init?.body ? JSON.parse(init.body) : null, auth: init?.headers?.Authorization || "" });
    if (u.pathname === "/rest/v1/edge_blocked_countries") return Response.json([]);
    if (u.pathname === "/rest/v1/rpc/content_big_numbers") return Response.json([]);
    if (["/rest/v1/rpc/log_edge", "/rest/v1/rpc/log_crawl", "/functions/v1/security-probe-log"].includes(u.pathname)) return new Response(null, { status: 204 });
    if (u.pathname === "/rest/v1/rpc/log_security") throw new Error("the edge must never call log_security with the public key");
    throw new Error("unexpected synthetic dependency: " + u.pathname);
  };
  try {
    const response = await middleware(new Request("https://sod1820.co.il" + path, {
      headers: { "user-agent": agent, "x-vercel-ip-country": "CN", "x-forwarded-for": "203.0.113.77", "x-vercel-oidc-token": "oidc.test.token", ...headers },
    }), { waitUntil: (promise) => pending.push(promise) });
    await Promise.all(pending); return { response, calls };
  } finally { globalThis.fetch = original; }
}

test("a probe is denied at the edge with no database read except the existing counter and ONE authenticated report to security-probe-log", async () => {
  const { response, calls } = await invoke("/wp-login.php?redirect_to=1", BROWSER);
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("x-sod-probe"), "denied");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(await response.text(), "Access denied");
  const names = calls.map((c) => c.path.split("/").pop());
  assert.equal(names.filter((n) => n === "security-probe-log").length, 1, "exactly one report");
  assert.ok(names.every((n) => ["log_edge", "security-probe-log"].includes(n)), `no country-policy read, no slug or big-number lookup, no crawl row (${names})`);
  const call = calls.find((c) => c.path.endsWith("/security-probe-log"));
  assert.equal(call.auth, "Bearer oidc.test.token", "the report is authenticated with the deployment's own OIDC token, never the anon key");
  const row = call.body;
  assert.deepEqual(Object.keys(row).sort(), ["country", "ip", "path", "proof", "ua"]);
  assert.equal(row.country, "CN");
  assert.equal(row.path, "/wp-login.php", "the query string is never sent");
  assert.equal(row.ip, "203.0.113.0/24", "a coarse address, not the visitor's address");
  assert.equal(row.ua, BROWSER);
  assert.equal(row.proof, "");
});

test("the canary is reported with its user agent and its opaque proof; the edge never decides what is a genuine canary; the 403 is the same", async () => {
  const proof = `${Math.floor(Date.now() / 60000)}.${"ab".repeat(32)}`;
  const { response, calls } = await invoke(PROBE_CANARY_PATH, PROBE_CANARY_UA, { "x-sod-canary": proof });
  assert.equal(response.status, 403);
  const row = calls.find((c) => c.path.endsWith("/security-probe-log")).body;
  assert.equal(row.ua, PROBE_CANARY_UA); assert.equal(row.proof, proof); assert.equal(isProbeCanary(row.ua), true);
  const junk = await invoke(PROBE_CANARY_PATH, PROBE_CANARY_UA, { "x-sod-canary": "not-a-proof; drop table" });
  assert.equal(junk.calls.find((c) => c.path.endsWith("/security-probe-log")).body.proof, "", "a malformed proof is not forwarded");
});

test("no OIDC token (a Preview, a local run): the visitor still gets the 403, nothing is reported, and nothing else is called", async () => {
  const { response, calls } = await invoke("/.env", BROWSER, { "x-vercel-oidc-token": "" });
  assert.equal(response.status, 403);
  assert.equal(calls.some((c) => c.path.endsWith("/security-probe-log")), false);
});

test("ordinary requests never touch security_log; blocked-bot and country behaviour is unchanged", async () => {
  for (const path of ["/", "/world", "/post/some-slug", "/number/1820", "/wp-content/uploads/2020/05/photo.jpg", "/admin"]) {
    const { calls } = await invoke(path, BROWSER, { "x-vercel-ip-country": "IL" });
    assert.equal(calls.some((c) => c.path.endsWith("/security-probe-log")), false, path);
  }
  const bot = await invoke("/world", "curl/8.0", { "x-vercel-ip-country": "IL" });
  assert.equal(bot.response.status, 403);
  assert.ok(bot.calls.some((c) => c.path.endsWith("/log_crawl")), "a bad bot on an ordinary path is still counted by crawl intelligence");
  assert.equal(bot.calls.some((c) => c.path.endsWith("/security-probe-log")), false);
});

test("a scan cannot flood the database: rows are capped per minute per instance, every probe still gets its 403", async () => {
  let logged = 0, denied = 0;
  for (let i = 0; i < 40; i += 1) {
    const { response, calls } = await invoke(`/wp-admin/flood-${i}`, "scanner/1.0");
    if (response.status === 403) denied += 1;
    logged += calls.filter((c) => c.path.endsWith("/security-probe-log")).length;
  }
  assert.equal(denied, 40);
  assert.ok(logged >= 1 && logged <= 10, `at most 10 reports per minute per instance (got ${logged})`);
});

test("admission window and address masking helpers", () => {
  let t = 0; const admit = createProbeAdmission({ limit: 2, windowMs: 1000, now: () => t });
  assert.deepEqual([admit(), admit(), admit()], [true, true, false]); t = 1001; assert.equal(admit(), true);
  assert.equal(coarseAddress("203.0.113.77, 10.0.0.1"), "203.0.113.0/24");
  assert.equal(coarseAddress("2001:db8:abcd:12::1"), "2001:db8:abcd::/48");
  assert.equal(coarseAddress(""), ""); assert.equal(coarseAddress("not-an-ip"), "");
  assert.equal(probeLogBody({ country: "il", pathname: "/x".repeat(400), userAgent: "u".repeat(400), forwardedFor: "1.2.3.4" }).path.length, 300);
});

test("the edge layer adds no client code and no new store: it reuses log_security and ships no new function", () => {
  const core = readFileSync(new URL("../middleware-core.js", import.meta.url), "utf8");
  assert.match(core, /\/functions\/v1\/security-probe-log/);
  assert.doesNotMatch(core, /\/rest\/v1\/rpc\/log_security/, "the public key is never used to write security_log");
  assert.doesNotMatch(core, /\/api\/honeypot/);
  assert.equal(JSON.parse(readFileSync(new URL("../public-reading-deploy/vercel.json", import.meta.url), "utf8")).rewrites?.some?.((r) => r.destination === "/api/honeypot") ?? false, false);
});

// ── the scheduled canary: report-only first, enforcing on a flag ─────────────────────────────────────────────
import { runCanary } from "../scripts/post-deploy-canary.mjs";
import { canaryProof, canaryProofValid } from "../supabase/functions/_shared/securityProbeLogCore.js";

function canaryFetch({ probe }) {
  return async (url, init = {}) => {
    const u = new URL(url);
    if (u.pathname === PROBE_CANARY_PATH) {
      assert.equal(init.headers["user-agent"], PROBE_CANARY_UA); assert.equal(init.redirect, "manual");
      return probe();
    }
    const ok = (text) => new Response(text, { status: 200 });
    if (u.pathname === "/") return ok('<div id="root"></div><script src="/assets/index-1.js"></script>');
    if (u.pathname.startsWith("/assets/")) return ok("x".repeat(2000));
    if (u.pathname === "/robots.txt") return ok("User-agent: *");
    if (u.pathname === "/sitemap.xml") return ok("<urlset></urlset>");
    return new Response("nf", { status: 404 });
  };
}

test("canary: the probe check records the denial; a missing 403 never blocks in report mode and blocks in enforce mode", async () => {
  const denied = () => new Response("Access denied", { status: 403, headers: { "x-sod-probe": "denied" } });
  const open = () => new Response("<html>spa</html>", { status: 200 });
  const good = await runCanary("https://x.test", { fetchImpl: canaryFetch({ probe: denied }) });
  assert.equal(good.ok, true); assert.equal(good.advisory.find((c) => c.name === "security_probe_denied").ok, true);
  const reportOnly = await runCanary("https://x.test", { fetchImpl: canaryFetch({ probe: open }) });
  assert.equal(reportOnly.advisory.find((c) => c.name === "security_probe_denied").ok, false, "the failure is visible in the evidence");
  assert.equal(reportOnly.checks.some((c) => c.name === "security_probe_denied"), false);
  assert.equal(reportOnly.ok, true, "report mode: the release is not blocked by a layer not yet deployed");
  const enforced = await runCanary("https://x.test", { fetchImpl: canaryFetch({ probe: open }), securityMode: "enforce" });
  assert.equal(enforced.ok, false, "enforce mode: the missing denial blocks");
  assert.equal(enforced.checks.find((c) => c.name === "security_probe_denied").ok, false);
  const thrown = await runCanary("https://x.test", { fetchImpl: canaryFetch({ probe: () => { throw new Error("boom"); } }), securityMode: "enforce" });
  assert.equal(thrown.ok, false);
});

test("canary: with SECURITY_CANARY_KEY the request carries a verifiable proof; without it none", async () => {
  let seen = null;
  const fetchImpl = canaryFetch({ probe: () => new Response("x", { status: 403, headers: { "x-sod-probe": "denied" } }) });
  const spy = async (url, init = {}) => { if (new URL(url).pathname === PROBE_CANARY_PATH) seen = init.headers; return fetchImpl(url, init); };
  const fixed = Date.UTC(2026, 10, 26, 12, 0, 0);
  await runCanary("https://x.test", { fetchImpl: spy, canaryKey: "k-test", now: () => fixed });
  assert.equal(seen["x-sod-canary"], await canaryProof("k-test", Math.floor(fixed / 60000)));
  assert.equal(await canaryProofValid(seen["x-sod-canary"], "k-test", fixed), true);
  assert.equal(await canaryProofValid(seen["x-sod-canary"], "other-key", fixed), false);
  await runCanary("https://x.test", { fetchImpl: spy, canaryKey: "" });
  assert.equal("x-sod-canary" in seen, false);
});

test("canary: it blocks automatically from the first deployed SHA that contains the layer; it is never advisory-forever", () => {
  const src = readFileSync(new URL("../scripts/post-deploy-canary.mjs", import.meta.url), "utf8");
  assert.match(src, /process\.env\.SECURITY_PROBE_LAYER === "present"/);
  const wf = readFileSync(new URL("../.github/workflows/post-deploy-canary.yml", import.meta.url), "utf8");
  assert.match(wf, /contents\/edge-security-probe\.js\?ref=\$\{TARGET_SHA\}/, "the layer is detected at the exact deployed SHA");
  assert.match(wf, /SECURITY_PROBE_LAYER: \$\{\{ steps\.probe_layer\.outputs\.present \}\}/);
  assert.match(wf, /SECURITY_CANARY_KEY: \$\{\{ secrets\.SECURITY_CANARY_KEY \}\}/);
  assert.match(wf, /STATE="failure"/, "the existing failure semantics are untouched");
});
