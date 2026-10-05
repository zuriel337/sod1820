import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const edge = read("../../../supabase/functions/ai-analyze/index.ts");
const lBlock = edge.slice(edge.indexOf("// ── Raziel Intelligence Core v1 Phase L"), edge.indexOf("// ── Raziel Intelligence Core v1 Phase K")).replace(/^\s*\/\/.*$/gm, "");
const kBlock = edge.slice(edge.indexOf("// ── Raziel Intelligence Core v1 Phase K"), edge.indexOf("// ── Raziel Intelligence Core v1 Phase J"));

// Loads the REAL Phase L block + Phase K runRazielCoordination with a mocked global fetch. `routes` maps endpoint class → response.
function load(fetchImpl, spans = []) {
  const code = stripTypeScriptTypes(
    `type OperationalTraceHandle = any; type RazielOperatorResult = any; type RazielOperatorCap = any; type RazielOperatorCall = any;\n` +
    `const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);\n` +
    `const razielOperatorProject = () => ({ pack: "SYS" });\n` +
    `async function razielOperatorRpc() { throw new Error("no rpc expected"); }\n${lBlock}\n${kBlock}\n`) +
    "\nreturn { razielLiveExternalState, razielLiveExternalAnswer, razielCoordDescriptor, runRazielCoordination };";
  return new Function("fetch", "recordOperationalSpan", "crypto", "AbortSignal", code)(fetchImpl, async (_t, s) => { spans.push(s); }, { randomUUID: () => "uuid" }, AbortSignal);
}
const SHA_A = "a".repeat(40), SHA_B = "b".repeat(40), SHA_C = "c".repeat(40);
const resp = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
// scenario: { main, deps:[{id,sha,state}], canary: array|null|"fail", depsStatus, mainStatus }
function gh(sc, log = []) {
  return async (url, init) => {
    log.push({ url, init });
    const u = new URL(url);
    if (u.pathname.endsWith("/commits/main")) return sc.mainStatus ? resp(sc.mainStatus, {}) : resp(200, { sha: sc.main });
    if (u.pathname.endsWith("/deployments")) return sc.depsStatus ? resp(sc.depsStatus, {}) : resp(200, sc.deps.map(({ id, sha }) => ({ id, sha })));
    const m = u.pathname.match(/\/deployments\/(\d+)\/statuses$/);
    if (m) { const d = sc.deps.find((x) => x.id === Number(m[1])); return resp(200, [{ state: d.state, created_at: "2026-10-05T10:00:00Z" }]); }
    const c = u.pathname.match(/\/commits\/([0-9a-f]{40})\/status$/);
    if (c) { if (sc.canary === "fail") return resp(500, {}); return resp(200, { statuses: sc.canary || [] }); }
    return resp(404, {});
  };
}
const canary = (state, extra = {}) => ({ context: "sod1820/post-deploy-canary", state, updated_at: "2026-10-05T10:05:00Z", ...extra });
const adminDet = { enabled: true, availability: "operator_read", trace: { operator: { capability: "live_external_state" } } };

test("Phase L: exact parity + deployment success + canary success ⇒ LIVE_VERIFIED", async () => {
  const log = [], spans = [];
  const m = load(gh({ main: SHA_A, deps: [{ id: 1, sha: SHA_A, state: "success" }], canary: [canary("success")] }, log), spans);
  const r = await m.runRazielCoordination({ capability: "live_external_state", days: null }, "caller-jwt", null);
  assert.equal(r.ok, true); assert.equal(r.basis, "LIVE_VERIFIED"); assert.equal(r.outcome, "success");
  assert.match(r.answer, /LIVE_VERIFIED/); assert.match(r.answer, /התאמה main==production: כן/);
  const st = await m.razielLiveExternalState(null);
  assert.deepEqual([st.verdict, st.main_sha, st.production_sha, st.parity, st.deployment_state, st.canary_state], ["LIVE_VERIFIED", SHA_A, SHA_A, true, "success", "success"]);
  assert.equal(st.canary_time, "2026-10-05T10:05:00Z");
});

test("Phase L: main ahead of production ⇒ parity false; LIVE_VERIFIED only for the production SHA (not main)", async () => {
  const m = load(gh({ main: SHA_B, deps: [{ id: 1, sha: SHA_A, state: "success" }], canary: [canary("success")] }));
  const st = await m.razielLiveExternalState(null);
  assert.equal(st.parity, false); assert.equal(st.production_sha, SHA_A); assert.equal(st.verdict, "LIVE_VERIFIED");
  assert.match(m.razielLiveExternalAnswer(st), /לא \(main מקדים/);
});

test("Phase L: canary failure / pending / missing / duplicate-latest ⇒ NOT_VERIFIED (latest context wins)", async () => {
  for (const [name, cs, state] of [["failure", [canary("failure")], "failure"], ["pending", [canary("pending")], "pending"], ["missing", [{ context: "other", state: "success" }], "missing"]]) {
    const m = load(gh({ main: SHA_A, deps: [{ id: 1, sha: SHA_A, state: "success" }], canary: cs }));
    const st = await m.razielLiveExternalState(null);
    assert.equal(st.verdict, "NOT_VERIFIED", name); assert.equal(st.canary_state, state, name);
  }
  const m = load(gh({ main: SHA_A, deps: [{ id: 1, sha: SHA_A, state: "success" }],
    canary: [canary("success", { updated_at: "2026-10-05T09:00:00Z" }), canary("failure", { updated_at: "2026-10-05T11:00:00Z" })] }));
  assert.equal((await m.razielLiveExternalState(null)).verdict, "NOT_VERIFIED");
});

test("Phase L: deployment endpoint failure / rate-limit / combined-status failure / main failure ⇒ NOT_VERIFIED, nothing inferred", async () => {
  for (const sc of [{ main: SHA_A, depsStatus: 500, deps: [] }, { main: SHA_A, depsStatus: 403, deps: [] }, { main: SHA_A, depsStatus: 429, deps: [] },
    { mainStatus: 403 }, { main: SHA_A, deps: [{ id: 1, sha: SHA_A, state: "success" }], canary: "fail" }]) {
    const m = load(gh(sc));
    const st = await m.razielLiveExternalState(null);
    assert.equal(st.verdict, "NOT_VERIFIED"); assert.match(m.razielLiveExternalAnswer(st), /NOT_VERIFIED/); assert.doesNotMatch(m.razielLiveExternalAnswer(st), /LIVE_VERIFIED —/);
  }
  const rl = load(gh({ main: SHA_A, depsStatus: 429, deps: [] }));
  assert.match((await rl.razielLiveExternalState(null)).reason, /rate_limited/);
  const thrown = load(async () => { throw Object.assign(new Error("x"), { name: "TimeoutError" }); });
  assert.match((await thrown.razielLiveExternalState(null)).reason, /timeout/);
});

test("Phase L: shape mismatch ⇒ NOT_VERIFIED", async () => {
  const bad = (f) => load(async (url) => { const u = new URL(url); return f(u) || resp(200, {}); });
  assert.equal((await bad((u) => u.pathname.endsWith("/commits/main") && resp(200, { sha: "nothex" })).razielLiveExternalState(null)).reason, "main_shape_mismatch");
  assert.equal((await bad((u) => u.pathname.endsWith("/commits/main") ? resp(200, { sha: SHA_A }) : u.pathname.endsWith("/deployments") ? resp(200, { not: "array" }) : null).razielLiveExternalState(null)).reason, "deployments_shape_mismatch");
});

test("Phase L: no successful production deployment in the first 10 ⇒ NOT_VERIFIED; scan is bounded (≤13 calls)", async () => {
  const log = [];
  const deps = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, sha: SHA_C, state: i % 2 ? "failure" : "inactive" }));
  const m = load(gh({ main: SHA_A, deps }, log));
  const st = await m.razielLiveExternalState(null);
  assert.equal(st.verdict, "NOT_VERIFIED"); assert.equal(st.reason, "no_successful_production_deployment");
  assert.equal(log.length, 12);   // main + deployments + 10 statuses; combined status never fetched
  const ok = [{ id: 1, sha: SHA_C, state: "failure" }, { id: 2, sha: SHA_A, state: "success" }, { id: 3, sha: SHA_B, state: "success" }];
  const log2 = []; const m2 = load(gh({ main: SHA_A, deps: ok, canary: [canary("success")] }, log2));
  assert.equal((await m2.razielLiveExternalState(null)).production_sha, SHA_A);   // first success, newest-first
  assert.equal(log2.length, 5);   // stops after the first success
  assert.match(log2[1].url, /per_page=10/);
});

test("Phase L: non-admin ⇒ zero external calls (descriptor null); admin descriptor carries the L capability", async () => {
  let calls = 0; const m = load(async () => { calls++; return resp(200, {}); });
  for (const t of ["user", "anon", "ADMIN", ""]) assert.equal(m.razielCoordDescriptor(adminDet, t), null, t);
  assert.deepEqual(m.razielCoordDescriptor(adminDet, "admin"), { capability: "live_external_state", days: null });
  assert.equal(calls, 0);
  const callSite = edge.slice(edge.indexOf("// Phase K — coordination / attention READ"), edge.indexOf("// Phase E — one operational db_rpc/tool span"));
  assert.match(callSite, /if \(!rOpDesc && rCoordDesc\)/);
});

test("Phase L: requests carry only Accept / API-version / User-Agent; no Authorization, token, env secret or caller JWT", async () => {
  const log = [], spans = [];
  const m = load(gh({ main: SHA_A, deps: [{ id: 1, sha: SHA_A, state: "success" }], canary: [canary("success")] }, log), spans);
  await m.runRazielCoordination({ capability: "live_external_state", days: null }, "SECRET-CALLER-JWT", { traceId: "t", rootSpanId: "r" });
  assert.ok(log.length >= 4);
  for (const { url, init } of log) {
    assert.deepEqual(Object.keys(init.headers).sort(), ["Accept", "User-Agent", "X-GitHub-Api-Version"]);
    assert.match(url, /^https:\/\/api\.github\.com\/repos\/zuriel337\/sod1820\//);
    assert.ok(init.signal, "4s timeout signal"); assert.equal(init.method, "GET"); assert.equal(init.body, undefined);
    assert.doesNotMatch(JSON.stringify(init) + url, /SECRET-CALLER-JWT|Authorization|Bearer/i);
  }
  assert.doesNotMatch(lBlock, /Authorization|Bearer|Deno\.env|GITHUB_TOKEN|GH_TOKEN|SB_SVC|service_role|vercel\.com|\bbearer\b/i);
  assert.doesNotMatch(JSON.stringify(spans), /SECRET-CALLER-JWT|https?:\/\//);
});

test("Phase L: one bounded `network` span per call — class/outcome/latency/status only, no payload or URL", async () => {
  const spans = [];
  const m = load(gh({ main: SHA_A, deps: [{ id: 1, sha: SHA_A, state: "success" }], canary: [canary("failure")] }, []), spans);
  await m.razielLiveExternalState({ traceId: "t", rootSpanId: "r" });
  assert.equal(spans.length, 4);
  for (const s of spans) {
    assert.equal(s.kind, "network"); assert.match(s.name, /^ai-analyze:raziel:external_http:github_/);
    assert.equal(s.detail.privacy.rawPrivatePayloadLogged, false);
    assert.match(s.detail.replay.parametersRef, /endpoint_class:github_\w+;status:\d+;read_only:true;auth:none/);
    assert.doesNotMatch(JSON.stringify(s), /https?:\/\/|per_page|environment=|aaaaaaaa/);
  }
});

test("Phase L: K coordination semantics stay separate — work_log answers still COORDINATION_REPORTED and make zero GitHub calls", async () => {
  assert.doesNotMatch(kBlock, /api\.github|razielGhGet/);
  assert.doesNotMatch(lBlock, /work_log|get_work_log_current/);
  assert.match(kBlock, /basis: "COORDINATION_REPORTED"/);
});
