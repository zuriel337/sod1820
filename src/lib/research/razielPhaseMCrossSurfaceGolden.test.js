import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { selectRazielIntelligence } from "../../../supabase/functions/_shared/razielIntelligence.js";

// RAZIEL_INTELLIGENCE_CORE_V1_PHASE_M — cross-surface Golden (verification only: no production code is added by this phase).
// Runs the REAL ai-analyze Raziel adapter region (Phase H..L + surface context) against a counting fetch and asserts, per natural-language row:
// tool order, call counts, intelligence level, truth labels, provenance separation. The plan fixtures below are the exact fn_raziel_plan/answer
// outputs verified by tests/sql/raziel_phase_m_cross_surface_golden_v1.sql (same questions; the SQL golden is the plan-side source of truth).
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const edge = read("../../../supabase/functions/ai-analyze/index.ts");
const sqlGolden = read("../../../tests/sql/raziel_phase_m_cross_surface_golden_v1.sql");
const frame = read("../../components/experience2029/SystemFrame2029.jsx");
const region = edge.slice(edge.indexOf("const rzClean = "), edge.indexOf("Deno.serve(async"));
const razielReq = edge.slice(edge.indexOf("Deno.serve(async"));

const SHA = "a".repeat(40);
function load(log, scenario = {}) {
  const resp = (status, body) => ({ ok: status >= 200 && status < 300, status, text: async () => "", json: async () => body });
  const fetchImpl = async (url, init = {}) => {
    const u = new URL(url);
    const host = u.host === "api.github.com" ? "github" : "supabase";
    const rpc = u.pathname.match(/\/rest\/v1\/rpc\/(\w+)$/)?.[1] || null;
    const table = !rpc ? u.pathname.match(/\/rest\/v1\/(\w+)$/)?.[1] || null : null;
    const auth = init.headers?.Authorization || init.headers?.authorization || null;
    log.push({ host, rpc, table, path: u.pathname, auth });
    if (host === "github") {
      if (u.pathname.endsWith("/commits/main")) return resp(200, { sha: SHA });
      if (u.pathname.endsWith("/deployments")) return resp(200, [{ id: 1, sha: SHA }]);
      if (/\/deployments\/1\/statuses$/.test(u.pathname)) return resp(200, [{ state: "success", created_at: "2026-10-05T10:00:00Z" }]);
      if (/\/commits\/[0-9a-f]{40}\/status$/.test(u.pathname)) return resp(200, { statuses: [{ context: "sod1820/post-deploy-canary", state: "success", updated_at: "2026-10-05T10:05:00Z" }] });
      return resp(404, {});
    }
    if (rpc === "number_map") return resp(200, { node: "x", value: 631, counts: { post: 2 }, neighbors: { post: [{ ref: "p1", label: "פוסט א", weight: 1, relation: "mentions", body: "RAW BODY" }] } });
    if (rpc === "number_dossier_json") return resp(200, { posts: ["תיק א"], topics: [], value: 631, methods: [], reality: 0, definitions: [] });
    if (rpc === "get_work_log_current") return resp(200, [{ id: "SECRET-ID", task_key: "T1", topic: "t", status: "CLAIMED_WRITE", from_actor: "GPT", to_actor: "CLAUDE", assignment_mode: "WRITE",
      release_authorization_state: "BRANCH_ONLY", created_at: new Date().toISOString(), what_we_did: "RAW-WORKLOG-PAYLOAD https://x.example", open_threads: "OPEN", dispatch_context: { s: 1 } }]);
    if (table === "posts") return resp(200, scenario.post === undefined ? [{ id: 1, slug: "my-post", title: "כותרת", excerpt: "תקציר", categories: [], tags: [], content: "<p>גוף <script>alert(1)</script>הפוסט</p>" }] : scenario.post);
    if (table === "topic_cards_public") return resp(200, [{ id: 2, slug: "covid-1237", title: "ציר", subtitle: "תת", numbers: [1237], highlight_numbers: [], findings: ["ממצא"] }]);
    return resp(404, {});
  };
  const code = stripTypeScriptTypes(
    `type OperationalTraceHandle = any; type RazielOperatorResult = any; type RazielOperatorCap = any; type RazielOperatorCall = any; type RazielToolResearch = any;\n` +
    `const SB_URL = "https://x.supabase.co"; const SB_ANON = "anon-key";\n${region}\n`) +
    "\nreturn { razielOperatorDescriptor, razielCoordDescriptor, runRazielOperator, runRazielCoordination, razielNumberContextDescriptor, runRazielNumberContext, razielCurrentContentDescriptor, runRazielCurrentContent, razielSemanticSurfaceText };";
  const spans = [];
  const m = new Function("fetch", "recordOperationalSpan", "crypto", "AbortSignal", code)(fetchImpl, async (_t, s) => { spans.push(s); }, { randomUUID: () => "uuid" }, AbortSignal);
  return { m, spans };
}

const L0 = "L0_DETERMINISTIC", L2 = "L2_FAST", L3 = "L3_DEEP", L4 = "L4_TOOL_RESEARCH";
const PLAN = (capability_class, minimum_intelligence, extra = {}) => ({ capability_class, minimum_intelligence, route_intent: null, cross_check_required: false, contradictory: false, compare: false, domains: null, executed: false, ...extra });
const sem = (o) => o;
const postSem = (slug = "my-post") => ({ surface: "post", subject: { type: "post", id: slug, label: "כותרת" }, context: { focus: { type: "post", postSlug: slug } } });
const topicSem = (slug = "covid-1237") => ({ surface: "topic", subject: { type: "topic", id: slug, label: "ציר" } });
const worldSem = { surface: "world", subject: { type: "world", id: "w", label: "עולם" }, context: { lens: "world", sections: ["א", "ב"] } };
const journeySem = { surface: "journey", subject: { type: "number", id: "631", label: "631" }, context: { journey: { kind: "number", id: "j1", position: "3", revisionNo: 2 }, navigation: { entrySource: "search", journeyVisitedValues: [358, 631] } } };
const elsSem = { surface: "els", els: { occurrence: "תורה·שמות·2", term: "משיח" } };
const heichalSem = { surface: "heichal", subject: { type: "heichal", id: "h1", label: "היכל" }, context: { lens: "heichal" } };

// Each row: the plan as it reaches ai-analyze (`det`), requested tier, surface, and the exact expectation.
// calls: ordered "host:rpc|table" classes of every network call the adapters make. level: selector output when the model path is reached (null ⇒ deterministic short-circuit).
const MATRIX = [
  { name: "Number: כמה זה משיח? ⇒ deterministic canonical gematria, zero model, zero adapter calls", q: "כמה זה משיח?", tier: "anon", ss: null,
    plan: PLAN("gematria_expression", L0, { route_intent: "single_domain" }), det: { enabled: true, availability: "available", mode: "deterministic" }, level: null, calls: [], model: false },
  { name: "Number context: איפה עוד 631 מופיע? ⇒ number_map + dossier deterministic (no model)", q: "איפה עוד 631 מופיע?", tier: "anon", ss: null,
    plan: PLAN("reality_number_context", L0), det: { enabled: true, availability: "number_context", mode: "number_context", number_context: { contract: "number_context_v1", anchor: "explicit", number: 631, mode: "deterministic" } },
    level: null, calls: ["supabase:number_map", "supabase:number_dossier_json"], model: false },
  { name: "Post: תסביר לי את מה שאני קורא ⇒ current-post read (exact slug) + L2, no global search", q: "תסביר לי את מה שאני קורא", tier: "anon", ss: postSem(),
    plan: PLAN("general_synthesis", L2, { availability: "no_match" }), det: { enabled: true, availability: "no_match", mode: "fallback" }, level: L2, calls: ["supabase:posts"], model: true },
  { name: "Topic: מה מעניין בציר הזה? ⇒ topic surface context L2 (bounded context, no content tool: not a current-content phrase)", q: "מה מעניין בציר הזה?", tier: "anon", ss: topicSem(),
    plan: PLAN("general_synthesis", L2, { availability: "no_match" }), det: { enabled: true, availability: "no_match", mode: "fallback" }, level: L2, calls: [], model: true, ctx: /ציר/ },
  { name: "World: מה כדאי לבדוק מכאן? ⇒ bounded surface context only, no invented tool", q: "מה כדאי לבדוק מכאן?", tier: "anon", ss: worldSem,
    plan: PLAN("general_synthesis", L2, { availability: "no_match" }), det: { enabled: true, availability: "no_match", mode: "fallback" }, level: L2, calls: [], model: true, ctx: /עדשה: world/ },
  { name: "Journey: איפה אני במסע ומה אפשר לבדוק עכשיו? ⇒ journey context preserved, no tool", q: "איפה אני במסע ומה אפשר לבדוק עכשיו?", tier: "anon", ss: journeySem,
    plan: PLAN("general_synthesis", L2, { availability: "no_match" }), det: { enabled: true, availability: "no_match", mode: "fallback" }, level: L2, calls: [], model: true, ctx: /מסע: number · j1 · מיקום 3 · גרסה 2.*ערכים שנבדקו 358,631/s },
  { name: "Heichal: bounded context, no tool", q: "מה אפשר לחקור כאן?", tier: "anon", ss: heichalSem,
    plan: PLAN("general_synthesis", L2, { availability: "no_match" }), det: { enabled: true, availability: "no_match", mode: "fallback" }, level: L2, calls: [], model: true, ctx: /היכל/ },
  { name: "ELS: current occurrence explanation ⇒ ELS occurrence/term context, L2, no tool run", q: "תסביר לי את המופע הזה", tier: "anon", ss: elsSem,
    plan: PLAN("general_synthesis", L2, { availability: "no_match" }), det: { enabled: true, availability: "no_match", mode: "fallback" }, level: L2, calls: [], model: true, ctx: /מופע ELS: תורה·שמות·2 · משיח/ },
  { name: "Admin: על מה עובדים עכשיו? ⇒ work_log COORDINATION_REPORTED (never LIVE_VERIFIED), single get_work_log_current under caller JWT", q: "על מה עובדים עכשיו?", tier: "admin", ss: null,
    plan: PLAN("operator_coordination", L0), det: { enabled: true, availability: "operator_read", mode: "fallback", trace: { operator: { capability: "work_now" } } }, level: null, calls: ["supabase:get_work_log_current"], model: false, op: "coord" },
  { name: "Admin: מה מצב הפריסה? ⇒ public GitHub deployment + canary, exact SHA evidence, deterministic, no Supabase call", q: "מה מצב הפריסה?", tier: "admin", ss: null,
    plan: PLAN("operator_coordination", L0), det: { enabled: true, availability: "operator_read", mode: "fallback", trace: { operator: { capability: "live_external_state" } } }, level: null,
    calls: ["github:", "github:", "github:", "github:"], model: false, op: "coord" },
  { name: "Non-admin: operator questions (work + deployment) ⇒ zero admin/external calls", q: "על מה עובדים עכשיו? / מה מצב הפריסה?", tier: "anon", ss: null,
    plan: PLAN("general_synthesis", L2, { availability: "no_match" }), det: { enabled: true, availability: "no_match", mode: "fallback" }, level: L2, calls: [], model: true, denied: ["work_now", "live_external_state"] },
];

async function drive(row) {
  const log = [];
  const { m, spans } = load(log);
  const out = { op: null, nc: null, cc: null };
  const opD = m.razielOperatorDescriptor(row.det, row.tier), coD = m.razielCoordDescriptor(row.det, row.tier);
  if (row.denied) for (const cap of row.denied) {
    const d = { ...row.det, availability: "operator_read", trace: { operator: { capability: cap } } };   // even a forged operator_read plan cannot act for a non-admin
    assert.equal(m.razielOperatorDescriptor(d, row.tier), null, cap); assert.equal(m.razielCoordDescriptor(d, row.tier), null, cap);
  }
  if (!opD && coD) out.op = await m.runRazielCoordination(coD, "caller-jwt", null);
  else if (opD) out.op = await m.runRazielOperator(opD, "caller-jwt", null);
  const ncD = m.razielNumberContextDescriptor(row.det, row.ss);
  if (ncD) out.nc = await m.runRazielNumberContext(ncD, null);
  const ccD = m.razielCurrentContentDescriptor(row.q, row.ss);
  if (ccD.kind && ccD.slug) out.cc = await m.runRazielCurrentContent({ kind: ccD.kind, slug: ccD.slug }, null);
  return { log, spans, out, m };
}

test("M: matrix covers every required surface/capability family", () => {
  assert.ok(MATRIX.length >= 11);
  const names = MATRIX.map((r) => r.name).join(" | ");
  for (const k of [/^Number:/m, /Number context/, /Post:/, /Topic:/, /World:/, /Journey:/, /Heichal/, /ELS:/, /Admin: על מה/, /Admin: מה מצב/, /Non-admin/]) assert.match(names, k);
  // every question is also present in the SQL plan-side golden (single source of plan truth)
  for (const r of MATRIX) for (const q of r.q.split(" / ")) if (!/Heichal|תסביר לי את המופע|מה אפשר לחקור כאן/.test(r.name + q)) assert.ok(sqlGolden.includes(q), "SQL golden covers: " + q);
});

for (const row of MATRIX) {
  test(`M golden: ${row.name}`, async () => {
    const { log, out, m } = await drive(row);
    // tool order + call counts (no repeated tool, nothing outside the expected classes)
    assert.deepEqual(log.map((c) => `${c.host}:${c.rpc || c.table || ""}`), row.calls);
    // intelligence level
    if (row.level === null) assert.equal(row.plan.minimum_intelligence, L0);
    else { const s = selectRazielIntelligence({ plan: row.plan, requested: null }); assert.equal(s.selected_level, row.level); assert.equal(s.may_run_model, true); }
    assert.equal(row.model, row.level !== null);
    // truth labels + provenance separation
    if (row.op?.valueOf && row.op === "coord" && row.det.trace.operator.capability === "work_now") {
      assert.equal(out.op.ok, true);
      assert.match(out.op.answer, /COORDINATION_REPORTED/); assert.doesNotMatch(out.op.answer, /LIVE_VERIFIED(?!;)/);
      assert.match(out.op.answer, /לא LIVE_VERIFIED/); assert.doesNotMatch(out.op.answer, /RAW-WORKLOG-PAYLOAD|SECRET-ID|OPEN|https?:/);
      assert.ok(log.every((c) => c.auth === "Bearer caller-jwt"));
    }
    if (row.det.trace?.operator?.capability === "live_external_state") {
      assert.equal(out.op.ok, true); assert.equal(out.op.basis, "LIVE_VERIFIED");
      assert.match(out.op.answer, new RegExp(SHA.slice(0, 8))); assert.match(out.op.answer, /sod1820\/post-deploy-canary|canary/i);
      assert.ok(log.every((c) => c.auth === null || !/Bearer/.test(String(c.auth))), "no Authorization header to GitHub");
      assert.equal(log.filter((c) => c.host === "supabase").length, 0);
    }
    if (out.nc) {
      assert.equal(out.nc.ok, true); assert.equal(out.nc.mode, "deterministic"); assert.equal(out.nc.number, 631);
      assert.ok(log.every((c) => c.auth === "Bearer anon-key"), "anon key only");
      assert.doesNotMatch(JSON.stringify(out.nc), /RAW BODY/);
    }
    if (out.cc) {
      assert.equal(out.cc.ok, true); assert.equal(out.cc.kind, "post");
      assert.equal(log.length, 1); assert.match(log[0].path, /\/rest\/v1\/posts$/); assert.ok(log[0].auth === "Bearer anon-key");
      assert.doesNotMatch(out.cc.pack, /<script|alert\(1\)|<p>/);
    }
    if (row.ctx) assert.match(m.razielSemanticSurfaceText(row.ss), row.ctx);
    if (!row.ss) assert.equal(m.razielCurrentContentDescriptor(row.q, null).kind, null);
  });
}

test("M security: forged / missing / conflicting surface slug cannot fetch arbitrary current content", async () => {
  const q = "תסביר לי את מה שאני קורא";
  for (const ss of [null, undefined, {}, { surface: "post" }, postSem("a b"), postSem("x,slug.eq.1"), postSem("../etc"), { surface: "post", subject: { type: "post", id: "a" }, context: { focus: { type: "post", postSlug: "b" } } },
    { surface: "number", subject: { type: "number", id: "631" } }]) {
    const log = []; const { m } = load(log);
    const d = m.razielCurrentContentDescriptor(q, ss);
    assert.equal(d.trigger, true); assert.equal(d.kind, null); assert.equal(d.slug, null);
    assert.equal(log.length, 0);
  }
  // slug typed in the question is never used as identity
  const log = []; const { m } = load(log);
  assert.equal(m.razielCurrentContentDescriptor("תסביר לי את מה שאני קורא secret-post", null).kind, null);
  // a not-found slug yields an unavailable result, never another row
  const { m: m2 } = load(log, { post: [{ id: 9, slug: "other", title: "x", content: "y" }] });
  const r = await m2.runRazielCurrentContent({ kind: "post", slug: "my-post" }, null);
  assert.equal(r.ok, false);
});

test("M security: non-admin / forged plan cannot reach operator, coordination or external adapters", async () => {
  for (const cap of ["work_now", "work_active", "attention", "agents_status", "live_external_state", "traffic_count", "system_overview", "ai_cost_week", "research_demand"]) {
    const { m } = load([]);
    const det = { enabled: true, availability: "operator_read", trace: { operator: { capability: cap } } };
    for (const tier of ["anon", "user", "", "Admin", undefined]) { assert.equal(m.razielOperatorDescriptor(det, tier), null); assert.equal(m.razielCoordDescriptor(det, tier), null); }
  }
  // plan-supplied rpc names are never honored
  const { m } = load([]);
  assert.equal(m.razielOperatorDescriptor({ enabled: true, availability: "operator_read", trace: { operator: { capability: "constructor", rpc: "admin_delete_all" } } }, "admin"), null);
});

test("M security: no service-role in Post/Topic/operator/external adapters; no raw HTML/body/worklog in span detail", async () => {
  const adapters = edge.slice(edge.indexOf("async function razielOperatorRpc"), edge.indexOf("Deno.serve(async"));
  assert.doesNotMatch(adapters, /SB_SVC|svcHeaders|SERVICE_ROLE|service_role/);
  const rows = [MATRIX[1], MATRIX[2], MATRIX[8], MATRIX[9]];
  for (const row of rows) {
    const { spans } = await drive(row);
    assert.ok(spans.length > 0, row.name);
    const s = JSON.stringify(spans);
    assert.doesNotMatch(s, /RAW BODY|RAW-WORKLOG-PAYLOAD|SECRET-ID|<script|alert\(1\)|גוף הפוסט|<p>/);
    for (const sp of spans) assert.equal(sp.detail?.privacy?.rawPrivatePayloadLogged, false, sp.name);
  }
});

test("M: global routing stays OFF; model/provider calls only on explicit send, never on panel open", () => {
  assert.doesNotMatch(edge, /routing_enabled\s*=\s*true/);
  assert.doesNotMatch(razielReq.slice(razielReq.indexOf('persona || "").toLowerCase() === "raziel"')), /fn_raziel_model|routing_enabled/);
  const chat = frame.slice(frame.indexOf("function RazielNativeChat"), frame.indexOf("function RazielProjection"));
  assert.doesNotMatch(chat, /useEffect/);                         // no effect ⇒ nothing fires on mount/open
  assert.match(chat, /surfaceSemantic: buildSurfaceSemantic\(\)/);
  const mig = (f) => read("../../../supabase/migrations/" + f);
  const lineage = ["20261005050000_raziel_route_token_boundary_match_v1.sql", "20261005130000_raziel_intelligence_core_v1_phase_a_plan_first.sql", "20261005140000_raziel_intelligence_core_v1_phase_c_operator_read.sql",
    "20261005150000_raziel_intelligence_core_v1_phase_d2_plan_signals.sql", "20261005160000_raziel_intelligence_core_v1_phase_e_l4_tool_research.sql", "20261005170000_raziel_intelligence_core_v1_phase_f_sandalphon_source.sql",
    "20261005180000_raziel_intelligence_core_v1_phase_g_source_l4_combination.sql", "20261005190000_raziel_intelligence_core_v1_phase_h_reality_number_context.sql", "20261005200000_raziel_intelligence_core_v1_phase_k_operator_coordination_read.sql"];
  for (const f of lineage) assert.doesNotMatch(mig(f).replace(/^\s*--.*$/gm, ""), /update\s+(public\.)?raziel_(config|routing)[^;]*routing_enabled\s*=\s*true|routing_enabled\s*=\s*true/i, f);
});

test("M: combined gematria+ELS+Sandalphon ⇒ plan L4 once each, then L3 synthesis (selector); fixtures mirror SQL golden", () => {
  const plan = PLAN("general_synthesis", L4, { route_intent: "multi_domain", domains: ["gematria_engine", "els_cipher", "sandalphon"] });
  assert.equal(selectRazielIntelligence({ plan, requested: null }).selected_level, L3);
  assert.equal(selectRazielIntelligence({ plan, requested: null }).escalation_reason, "multi_domain_intent");
  assert.match(sqlGolden, /בדוק את משיח בגימטריה בדילוגים ובתנך/);
  assert.match(sqlGolden, /gematria.*els.*tanakh_source/s);       // exact tool order asserted on the SQL side (proto_calls sequence)
});
