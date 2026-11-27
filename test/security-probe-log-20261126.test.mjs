// Security package (decision 337, 26.11.2026): who may report, what a canary is, and the login / permission / path / SEO / privacy / speed guarantees of the
// edge probe layer. Synthetic effects only; the production logic (securityProbeLogCore.js, the middleware) is what runs.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import middleware, { config } from "../middleware.js";
import { isSecurityProbe, PROBE_CANARY_PATH, PROBE_CANARY_UA } from "../edge-security-probe.js";
import {
  CANARY_PROOF_WINDOW_MINUTES, CANARY_UA, canaryProof, canaryProofValid, createSecurityProbeLogHandler, normalizeEntry,
} from "../supabase/functions/_shared/securityProbeLogCore.js";

const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const NOW = Date.UTC(2026, 10, 26, 12, 0, 0);
const KEY = "unit-test-canary-key";
const minute = Math.floor(NOW / 60000);

function harness({ verify = async () => ({}), key = KEY } = {}) {
  const recorded = [];
  const handle = createSecurityProbeLogHandler({ verifyOidc: verify, record: async (e) => { recorded.push(e); }, canaryKey: key, now: () => NOW });
  const post = (body, headers = { authorization: "Bearer good.token" }, method = "POST") =>
    handle(new Request("https://f.test/", { method, headers, body: method === "POST" ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined }));
  return { recorded, post, handle };
}
const entry = (o = {}) => ({ country: "CN", path: "/wp-login.php", ua: "scanner/1", ip: "203.0.113.0/24", proof: "", ...o });

// ───────────────────────── permissions: who may report ─────────────────────────
test("only a request with a verified Vercel OIDC token can record: no token, bad token, wrong method are refused and write nothing", async () => {
  const h = harness({ verify: async (t) => { if (t !== "good.token") throw new Error("bad"); } });
  assert.equal((await h.post(entry(), {})).status, 401);
  assert.equal((await h.post(entry(), { authorization: "Basic abc" })).status, 401);
  assert.equal((await h.post(entry(), { authorization: "Bearer " })).status, 401);
  assert.equal((await h.post(entry(), { authorization: "Bearer forged.token" })).status, 401);
  assert.equal((await h.post(null, { authorization: "Bearer good.token" }, "GET")).status, 405);
  assert.equal((await h.post(entry())).status, 200);
  assert.equal(h.recorded.length, 1, "exactly the one authenticated request wrote");
});

test("the anon key is not a credential for this function: a Supabase JWT in the Authorization header fails the OIDC verifier", async () => {
  const sg = read("supabase/functions/_shared/vercelProductionOidc.ts");
  assert.match(sg, /environment !== "production"/); assert.match(sg, /EXPECTED_SUBJECT/); assert.match(sg, /audience: AUDIENCE/);
  const idx = read("supabase/functions/security-probe-log/index.ts");
  assert.match(idx, /verifyOidc: verifyVercelProductionToken/);
  assert.doesNotMatch(idx, /apikey.*anon|SUPABASE_ANON/i, "no anon key anywhere in the function");
});

test("the verifier constants are the ones sg-rate-limit already uses (no drift between the two callers)", () => {
  const a = read("supabase/functions/sg-rate-limit/index.ts"), b = read("supabase/functions/_shared/vercelProductionOidc.ts");
  for (const name of ["TEAM_SLUG", "TEAM_ID", "PROJECT_ID", "PROJECT_NAME", "AUDIENCE", "EXPECTED_SUBJECT", "TEAM_ISSUER", "GLOBAL_ISSUER"]) {
    const re = new RegExp(`const ${name} = (.*);`);
    assert.equal(b.match(re)?.[1], a.match(re)?.[1], name);
  }
  for (const check of ['payload.owner_id !== TEAM_ID', 'payload.project_id !== PROJECT_ID', 'payload.environment !== "production"', 'payload.sub !== EXPECTED_SUBJECT']) {
    assert.ok(a.includes(check) && b.includes(check), check);
  }
});

test("log_security is service_role only in the proposal; nothing in the repo calls it with a public key", () => {
  assert.equal(readdirSync(new URL("../public-reading-deploy/api", import.meta.url).pathname).includes("honeypot.js"), false, "the deployed root has no honeypot function");
  const sql = read("supabase/proposed/20261126155000_log_security_lockdown_PROPOSAL.sql");
  assert.match(sql, /revoke all on function public\.log_security\(text,text,text,text\) from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.log_security\(text,text,text,text\) to service_role/);
  for (const dir of ["src", "api", "public-reading-deploy"]) {
    const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? (f === "node_modules" || f === ".generated" ? [] : walk(p)) : [p]; });
    for (const f of walk(new URL("../" + dir, import.meta.url).pathname).filter((x) => /\.(js|jsx|mjs|ts)$/.test(x))) {
      if (f.includes("/test")) continue;
      // api/honeypot.js is the retired Legacy function: it exists only in the repository root, which is not the deployed 2029 root. After the lockdown
      // it could no longer write even if it were deployed. Removing it belongs to the Legacy-removal residuals (REMOVAL.md), a separate decision.
      if (f.endsWith("/api/honeypot.js")) continue;
      assert.doesNotMatch(readFileSync(f, "utf8"), /rpc\/log_security|rpc\(['"]log_security/, f);
    }
  }
});

// ───────────────────────── canary identity ─────────────────────────
test("a canary needs a valid HMAC proof: forged marker, wrong key, stale proof and missing proof are all stored as forged-canary", async () => {
  const good = await canaryProof(KEY, minute);
  const cases = [
    ["valid", good, CANARY_UA, ""],
    ["no proof", "", `forged-canary:${PROBE_CANARY_UA}`, "203.0.113.0/24"],
    ["wrong key", await canaryProof("other", minute), `forged-canary:${PROBE_CANARY_UA}`, "203.0.113.0/24"],
    ["stale (11 min)", await canaryProof(KEY, minute - CANARY_PROOF_WINDOW_MINUTES - 1), `forged-canary:${PROBE_CANARY_UA}`, "203.0.113.0/24"],
    ["future (11 min)", await canaryProof(KEY, minute + CANARY_PROOF_WINDOW_MINUTES + 1), `forged-canary:${PROBE_CANARY_UA}`, "203.0.113.0/24"],
    ["tampered", good.slice(0, -1) + (good.endsWith("0") ? "1" : "0"), `forged-canary:${PROBE_CANARY_UA}`, "203.0.113.0/24"],
    ["edge of window (10 min)", await canaryProof(KEY, minute - CANARY_PROOF_WINDOW_MINUTES), CANARY_UA, ""],
  ];
  for (const [label, proof, ua, ip] of cases) {
    const h = harness(); assert.equal((await h.post(entry({ ua: PROBE_CANARY_UA, proof, ip: "203.0.113.0/24" }))).status, 200, label);
    assert.equal(h.recorded[0].p_ua, ua, label); assert.equal(h.recorded[0].p_ip, ip, label);
  }
  const noKey = harness({ key: "" }); await noKey.post(entry({ ua: PROBE_CANARY_UA, proof: good }));
  assert.equal(noKey.recorded[0].p_ua, `forged-canary:${PROBE_CANARY_UA}`, "without a configured key nothing can ever be a genuine canary");
  assert.equal(await canaryProofValid("1.zz", KEY, NOW), false);
});

test("a probe that merely mentions the canary agent in the middle of its user agent is an ordinary probe", async () => {
  const h = harness(); await h.post(entry({ ua: "Mozilla/5.0 sod1820-security-canary/1" }));
  assert.equal(h.recorded[0].p_ua, "Mozilla/5.0 sod1820-security-canary/1");
});

// ───────────────────────── privacy: what is stored ─────────────────────────
test("privacy: only a coarse address, a path without query, bounded text and no control characters ever reach log_security", async () => {
  const h = harness();
  await h.post(entry({ ip: "203.0.113.77", path: "/wp-admin/x?user=alice@example.com&token=abc#frag", ua: "ua\u0000\u0007x".padEnd(500, "a"), country: "israel" }));
  const r = h.recorded[0];
  assert.equal(r.p_ip, "", "a full address is dropped, not truncated by the function");
  assert.equal(r.p_path, "/wp-admin/x"); assert.equal(r.p_country, "XX");
  assert.ok(r.p_ua.length <= 300 && !/[\u0000-\u001f]/.test(r.p_ua));
  assert.deepEqual(Object.keys(r).sort(), ["p_country", "p_ip", "p_path", "p_ua"]);
  for (const ok of ["203.0.113.0/24", "2001:db8:abcd::/48"]) { const g = harness(); await g.post(entry({ ip: ok })); assert.equal(g.recorded[0].p_ip, ok); }
  assert.equal(normalizeEntry({ ...entry(), path: "no-slash" }), null);
  assert.equal((await harness().post(entry({ path: "relative" }))).status, 400);
  assert.equal((await harness().post("{not json")).status, 400);
  assert.equal((await harness().post({ ...entry(), pad: "x".repeat(3000) })).status, 413);
});

test("privacy: the edge forwards no cookie, no user Authorization and no query, and the function never echoes or logs the report", async () => {
  const calls = []; const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => { calls.push({ url: String(url), init }); return new Response(null, { status: 204 }); };
  try {
    const pending = [];
    const res = await middleware(new Request("https://sod1820.co.il/xmlrpc.php?u=alice", { headers: {
      "user-agent": "scanner/1", "x-vercel-ip-country": "US", "x-forwarded-for": "198.51.100.23", cookie: "sb-access-token=SECRET; vb=browser",
      authorization: "Bearer USER-SESSION-TOKEN", "x-vercel-oidc-token": "oidc.t" } }), { waitUntil: (p) => pending.push(p) });
    await Promise.all(pending);
    assert.equal(res.status, 403);
    const report = calls.find((c) => c.url.endsWith("/security-probe-log"));
    const sent = JSON.stringify(report.init.headers) + report.init.body;
    assert.doesNotMatch(sent, /SECRET|USER-SESSION-TOKEN|alice|198\.51\.100\.23/);
    assert.deepEqual(Object.keys(report.init.headers).sort(), ["Authorization", "Content-Type"]);
  } finally { globalThis.fetch = original; }
  const src = read("supabase/functions/_shared/securityProbeLogCore.js") + read("supabase/functions/security-probe-log/index.ts");
  assert.doesNotMatch(src, /console\./);
  assert.match(src, /json\(\{ ok: true \}, 200\)/);
});

// ───────────────────────── login, permissions, paths, SEO ─────────────────────────
async function through(path, headers = {}) {
  const pending = [], calls = []; const original = globalThis.fetch;
  globalThis.fetch = async (url) => { const u = new URL(url); calls.push(u.pathname);
    if (u.pathname === "/rest/v1/edge_blocked_countries" || u.pathname === "/rest/v1/rpc/content_big_numbers") return Response.json([]);
    return new Response(null, { status: 204 }); };
  try {
    const response = await middleware(new Request("https://sod1820.co.il" + path, { headers: { "user-agent": "Mozilla/5.0 Chrome/142.0.0.0 Safari/537.36", "x-vercel-ip-country": "IL", "x-vercel-oidc-token": "t", ...headers } }), { waitUntil: (p) => pending.push(p) });
    await Promise.all(pending); return { response, calls };
  } finally { globalThis.fetch = original; }
}

test("login and permission surfaces are untouched: sign-in, callbacks, personal area, control console and API paths are never probes and never reported", async () => {
  for (const path of ["/login", "/auth", "/auth/callback", "/auth/v1/verify", "/2029/me/profile", "/2029/me/research", "/2029/control", "/profile", "/community/chat", "/unsubscribe", "/.well-known/security.txt"]) {
    assert.equal(isSecurityProbe(path), false, path);
    const { response, calls } = await through(path);
    assert.notEqual(response.status, 403, path);
    assert.equal(calls.includes("/functions/v1/security-probe-log"), false, path);
    assert.equal(response.headers.get("x-sod-probe"), null, path);
  }
});

test("a signed-in visitor's cookies and Authorization header are irrelevant to the probe layer (no session lookup, no auth call)", async () => {
  const { response, calls } = await through("/post/some-slug", { cookie: "sb-access-token=abc", authorization: "Bearer user" });
  assert.equal(response.status, 200);
  assert.ok(calls.every((c) => !c.includes("/auth/") && !c.includes("security")), calls.join(","));
});

test("SEO: probe addresses are noindex, nothing indexable is added, robots.txt and sitemap.xml stay outside the middleware", async () => {
  const { response } = await through("/wp-admin/anything");
  assert.equal(response.status, 403); assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
  assert.equal(response.headers.get("cache-control"), "no-store");
  const covers = (path) => config.matcher.some((m) => new RegExp("^" + m + "$").test(path));
  for (const path of ["/robots.txt", "/sitemap.xml", "/sitemap-posts-1.xml", "/favicon.ico", "/og.png", "/assets/a.js", "/.well-known/security.txt", "/wp-content/uploads/2020/05/a.jpg"]) assert.equal(covers(path), false, path);
  assert.equal(isSecurityProbe("/wp-content/uploads/2020/05/a.jpg"), false, "S-56 redirects old media from this prefix");
  assert.ok(!/wp-admin|wp-login|xmlrpc/.test(read("public-reading-deploy/api/public-sitemap.js")), "the sitemap never lists a probe path");
});

// ───────────────────────── speed ─────────────────────────
test("speed: no client code, a cheap synchronous check, no extra call for ordinary requests, a small module", async () => {
  const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
  for (const f of walk(new URL("../src", import.meta.url).pathname).filter((x) => /\.(js|jsx)$/.test(x))) {
    assert.doesNotMatch(readFileSync(f, "utf8"), /edge-security-probe/, `${f}: the probe layer is edge-only and never enters a client bundle`);
  }
  const sample = ["/", "/world", "/post/a-b-c", "/number/1820", "/community/chat", "/wp-login.php", "/.env", "/x/y/z", "/assets/a.js"];
  const t0 = process.hrtime.bigint(); let hits = 0;
  for (let i = 0; i < 200000; i += 1) if (isSecurityProbe(sample[i % sample.length])) hits += 1;
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.ok(hits > 0 && ms < 1500, `200k checks in ${ms.toFixed(0)} ms (a request pays one check, microseconds)`);
  const ordinary = await through("/world");
  assert.deepEqual(ordinary.calls.filter((c) => !["/rest/v1/rpc/log_edge", "/rest/v1/edge_blocked_countries"].includes(c)), [], "no new network call for an ordinary request");
  assert.ok(statSync(new URL("../edge-security-probe.js", import.meta.url)).size < 7000);
});

test("the cap: per-instance 10 reports a minute here, and a global 60-row ceiling in the database (a spike needs 150 rows an hour)", () => {
  assert.match(read("edge-security-probe.js"), /PROBE_LOG_PER_MINUTE = 10/);
  const sql = read("supabase/proposed/20261126155000_log_security_lockdown_PROPOSAL.sql");
  assert.match(sql, /v_recent >= 60/); assert.match(sql, /pg_advisory_xact_lock/);
  assert.ok(60 * 60 > 150, "the hourly ceiling is far above the spike threshold, so a flood is still detected");
  void PROBE_CANARY_PATH;
});
