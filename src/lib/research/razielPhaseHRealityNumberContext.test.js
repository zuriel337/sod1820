import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const edge = read("../../../supabase/functions/ai-analyze/index.ts");
const mig = read("../../../supabase/migrations/20261005190000_raziel_intelligence_core_v1_phase_h_reality_number_context.sql");

// Load the REAL Phase H adapter block (types stripped by Node itself) with stubbed I/O.
const block = edge.slice(edge.indexOf("// ── Raziel Intelligence Core v1 Phase H"), edge.indexOf("Deno.serve(async"));
const rz = edge.match(/^const rzClean = [^\n]+/m)[0];
const numFn = edge.match(/^const num = [^\n]+/m)[0];
function load(rpcImpl, spans = []) {
  const code = stripTypeScriptTypes(`type OperationalTraceHandle = any;\nconst SB_ANON = "anon";\n${rz}\n${numFn}\n${block}\n`) +
    "\nreturn { razielSurfaceNumberRoot, razielNumberContextDescriptor, razielNumberContextProject, runRazielNumberContext };";
  const mod = { exports: new Function("razielOperatorRpc", "recordOperationalSpan", "crypto", code)(rpcImpl, async (_t, s) => { spans.push(s); }, { randomUUID: () => "uuid" }) };
  return mod.exports;
}
const mapPayload = (np = 8, extra = {}) => ({ node: "x", value: 631, counts: { post: np, entity: 1 },
  neighbors: { post: Array.from({ length: np }, (_, i) => ({ ref: `ref-${i}`, label: `<b>פוסט ${i}</b>`, weight: 1, relation: "mentions", body: "FULL BODY SECRET" })),
    entity: [{ ref: "מלך ישראל", label: "מלך ישראל", weight: 1, relation: "equals" }], ...extra } });
const dossier = () => ({ posts: Array.from({ length: 9 }, (_, i) => `פוסט-תיק ${i}`), topics: Array.from({ length: 8 }, (_, i) => ({ label: `טופיק ${i}`, body: "SECRET" })),
  value: 631, methods: Array.from({ length: 8 }, (_, i) => ({ method: `m${i}`, phrases: Array.from({ length: 9 }, (_, j) => `p${j}`) })), reality: 0, definitions: [] });
const rpc = (m, d, fail = {}) => async (_b, call) => fail[call.rpc] ? { ok: false, data: null, outcome: "tool_error", ms: 1, error: "http_500" } : ({ ok: true, data: call.rpc === "number_map" ? m : d, outcome: "success", ms: 2, error: null });

const det = (nc, extra = {}) => ({ enabled: true, availability: "number_context", mode: "number_context", number_context: { contract: "number_context_v1", mode: "deterministic", ...nc }, ...extra });
const root = (id, type = "number") => ({ surface: "number", subject: { type, id, label: id } });

test("H: explicit anchor → descriptor (number from the plan only)", () => {
  const { razielNumberContextDescriptor: d } = load(rpc());
  assert.deepEqual(d(det({ anchor: "explicit", number: 631 }), null), { number: 631, anchor: "explicit", mode: "deterministic" });
  assert.equal(d(det({ anchor: "explicit", number: 0 }), null), null);
  assert.equal(d(det({ anchor: "explicit", number: 1234567 }), null), null);
  assert.equal(d(det({ anchor: "explicit", number: "631" }), null), null);       // no coercion of non-integers
  assert.equal(d({ ...det({ anchor: "explicit", number: 631 }), availability: "available" }), null);
  assert.equal(d({ ...det({ anchor: "explicit", number: 631 }), enabled: false }), null);
});

test("H: pronoun form uses ONLY an explicit Number root from surface_semantic; no root → no tool", () => {
  const { razielNumberContextDescriptor: d, razielSurfaceNumberRoot: r } = load(rpc());
  const p = det({ anchor: "surface_root", number: null });
  assert.equal(d(p, root("631")).number, 631);
  assert.equal(d(p, undefined), null);
  assert.equal(d(p, null), null);
  assert.equal(d(p, {}), null);
  assert.equal(d(p, root("631", "post")), null);                                   // not a Number root
  assert.equal(d(p, root("אבג")), null);                                           // non-decimal id
  assert.equal(d(p, { surface: "number", subject: { type: "number", label: "631" } }), null);   // label alone is not a root id
  assert.equal(d(p, { surface: "number", number: { expression: "631", result: "631" } }), null); // calculator focus ≠ Number root
  assert.equal(r({ subject: { type: "number", id: "<i>631</i>" } }), null);        // tags stripped → still must be pure decimal
  assert.equal(d(p, root("0")), null);
  assert.equal(d(p, root("1234567")), null);
  // an explicit anchor never reads the surface root; a surface root never overrides an explicit number
  assert.equal(d(det({ anchor: "explicit", number: 358 }), root("631")).number, 358);
});

test("H: gematria dependency — only a verified value from the same answer becomes the anchor", () => {
  const { razielNumberContextDescriptor: d } = load(rpc());
  const ok = det({ anchor: "gematria_dependency", mode: "synthesis", number: 358, dependency: { from: "gematria", verified: true } }, { mode: "tool_research" });
  assert.deepEqual(d(ok, root("631")), { number: 358, anchor: "gematria_dependency", mode: "synthesis" });
  assert.equal(d(det({ anchor: "gematria_dependency", number: 358, dependency: { verified: true } }, { mode: "fallback" }), null), null);
  assert.equal(d(det({ anchor: "gematria_dependency", number: 358 }, { mode: "tool_research" }), null), null);
  assert.equal(d(det({ anchor: "gematria_dependency", number: null }, { mode: "tool_research" }), null), null);
});

test("H: projection is bounded (≤6 per category), labels/refs only, no raw body, tags stripped, definitions count only", () => {
  const { razielNumberContextProject: p } = load(rpc());
  const r = p(631, mapPayload(8), dossier());
  const b = JSON.parse(r.pack);
  assert.equal(b.map.post.length, 6);
  assert.deepEqual(b.map.post[0], { ref: "ref-0", label: "פוסט 0", relation: "mentions", weight: 1 });
  assert.equal(b.dossier.posts.length, 6);
  assert.equal(b.dossier.topics.length, 6);
  assert.equal(b.dossier.methods.length, 6);
  assert.ok(b.dossier.methods.every((m) => m.phrases.length <= 6));
  assert.equal(b.counts.posts_map, 8);
  assert.equal(b.counts.definitions, 0);
  assert.equal(b.dossier.definitions, 0);
  assert.ok(!r.pack.includes("SECRET") && !r.pack.includes("BODY"), "no raw body fields");
  assert.ok(!/<b>/.test(r.pack));
  assert.ok(r.pack.length <= 2600 && r.answer.length <= 1400);
  assert.match(r.answer, /המספר 631/);
  assert.match(b.note, /ראיית-קשר בלבד/);
  assert.deepEqual(r.refs, { post: 6, topic: 6, entity: 1, event: 0 });
});

test("H: empty projection is a scoped negative, not proof of absence; unusable payloads fail closed", () => {
  const { razielNumberContextProject: p } = load(rpc());
  const r = p(7, { node: "x", counts: {}, neighbors: {} }, { posts: [], topics: [], methods: [], reality: 0, definitions: [] });
  assert.match(r.answer, /אין זו הוכחה/);
  assert.equal(p(7, null, null), null);
  assert.equal(p(7, [], "x"), null);
  assert.ok(p(7, null, { posts: ["a"], topics: [], methods: [], definitions: [] }).answer.includes("a"), "map unavailable but dossier ok → partial, honest");
});

test("H: runner — exactly one db_rpc span per canonical call, allowlisted rpcs, bounded refs only, no raw payload", async () => {
  const spans = [], calls = [];
  const { runRazielNumberContext: run } = load(async (b, c) => { calls.push({ b, c }); return rpc(mapPayload(8), dossier())(b, c); }, spans);
  const r = await run({ number: 631, anchor: "explicit", mode: "deterministic" }, null);
  assert.equal(r.ok, true); assert.equal(r.outcome, "success");
  assert.deepEqual(calls.map((x) => x.c), [{ rpc: "number_map", args: { n: 631 } }, { rpc: "number_dossier_json", args: { n: 631 } }]);
  assert.ok(calls.every((x) => x.b === "anon"), "anon key only, never service role / caller admin JWT");
  assert.equal(spans.length, 2);
  assert.deepEqual(spans.map((s) => s.name), ["ai-analyze:raziel:number_context:number_map", "ai-analyze:raziel:number_context:number_dossier_json"]);
  for (const s of spans) {
    assert.equal(s.kind, "db_rpc"); assert.equal(s.outcome, "success");
    assert.match(s.detail.owner_ref, /reality_graph_law v8/);
    assert.equal(s.detail.output_use, "used");
    assert.equal(s.detail.privacy.rawPrivatePayloadLogged, false);
    assert.ok(typeof s.detail.resources.latency_ms === "number");
    assert.ok(!JSON.stringify(s).includes("SECRET") && !JSON.stringify(s).includes("ref-0"), "spans carry counts only");
    assert.deepEqual(s.detail.result_refs.bounded_refs, { post: 6, topic: 6, entity: 1, event: 0 });
  }
});

test("H: runner — partial and total failure are explicit", async () => {
  const spans = [];
  let { runRazielNumberContext: run } = load(rpc(mapPayload(2), dossier(), { number_dossier_json: 1 }), spans);
  let r = await run({ number: 631, anchor: "explicit", mode: "deterministic" }, null);
  assert.equal(r.ok, true); assert.equal(r.outcome, "partial");
  assert.equal(spans[1].outcome, "tool_error"); assert.equal(spans[1].detail.output_use, "not_applicable");
  spans.length = 0;
  ({ runRazielNumberContext: run } = load(rpc(null, null, { number_map: 1, number_dossier_json: 1 }), spans));
  r = await run({ number: 631, anchor: "explicit", mode: "deterministic" }, null);
  assert.equal(r.ok, false); assert.equal(r.answer, undefined);
  assert.ok(spans.every((s) => s.detail.output_use === "not_applicable"));
});

test("H: ai-analyze wiring — extends the existing seam, no second router, no raw tables, deterministic L0 returns without a model", () => {
  const code = edge.replace(/\/\/.*$/gm, "");
  assert.match(code, /razielNumberContextDescriptor\(rDet, body\?\.surface_semantic\)/);
  assert.match(code, /rNcDesc\.mode === "deterministic" && !rToolRes/);
  assert.match(code, /number_context_executed/);
  // only the two canonical read adapters; never raw graph/post/topic tables or other REST paths for this capability
  assert.doesNotMatch(code, /rest\/v1\/(graph_|reality_nodes|reality_edges|number_graph|posts|topics)|\/rest\/v1\/rpc\/fn_raziel_(answer|plan)[^`]*number/);
  assert.equal((code.match(/rpc: "number_map"/g) || []).length, 1);
  assert.equal((code.match(/rpc: "number_dossier_json"/g) || []).length, 1);
  assert.doesNotMatch(code, /number_(map|dossier_json)[^\n]*(SB_SVC|svcHeaders)/);
  // the deterministic short-circuit sits AFTER the Phase E span block and BEFORE persona/model work (dependency order gematria → reality)
  assert.ok(edge.indexOf("ai-analyze:raziel:tool:${t.capability}") < edge.indexOf("const rNcDesc"));
  assert.ok(edge.indexOf("const rNcDesc") < edge.indexOf("const [persona, ctx] = await Promise.all"));
  // A–G tool_research contract untouched
  assert.match(edge, /RAZIEL_TOOL_LEVEL = "L4_TOOL_RESEARCH"/);
  assert.match(edge, /for \(const t of rToolRes\.tools\)/);
});

test("H: migration — additive, extends fn_raziel_plan/answer only, no store/graph/table, no execution of map/dossier in the DB", () => {
  const code = mig.replace(/--.*$/gm, "");
  assert.equal((code.match(/create or replace function/g) || []).length, 2);
  assert.doesNotMatch(code, /create table|alter table|insert into|update public|delete from|routing_enabled|fn_raziel_model|http_|net\./i);
  assert.doesNotMatch(code, /create or replace function public\.(number_map|number_dossier_json|fn_raziel_protocol|fn_raziel_route|fn_raziel_extract_subject)/);
  assert.doesNotMatch(code, /number_map\(|number_dossier_json\(/);      // plan/answer never call the projections; ai-analyze does
  assert.match(code, /'reality_number_context'/);
  assert.match(code, /'number_context_deterministic'/);
  assert.match(code, /'number_context_synthesis'/);
  assert.match(code, /gematria_dependency/);
  // dependency: exactly one gematria protocol call in the Phase H branch; value must be a verified integer
  assert.match(code, /v_gnum !~ '\^\[0-9\]\{1,6\}\$'/);
  // no provider/model names in the plan
  assert.doesNotMatch(code, /claude|gpt|gemini|anthropic|openai|sonnet|opus|haiku/i);
});
