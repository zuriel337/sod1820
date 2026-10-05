import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const edge = read("../../../supabase/functions/ai-analyze/index.ts");
const mig = read("../../../supabase/migrations/20261005210000_raziel_intelligence_core_v1_phase_l_personal_research_continuity_read.sql");
const lBlock = edge.slice(edge.indexOf("// ── Raziel Intelligence Core v1 Phase L"), edge.indexOf("// ── Raziel Intelligence Core v1 Phase J"));
const callSite = edge.slice(edge.indexOf("// Phase L — personal research continuity READ"), edge.indexOf("// Phase E — one operational db_rpc/tool span"));

// Load the REAL Phase L block (types stripped by Node). razielOperatorRpc is stubbed: it receives (bearer, call) and returns the stub result.
function load(rpcImpl, spans = []) {
  const code = stripTypeScriptTypes(
    `type OperationalTraceHandle = any; type RazielOperatorResult = any; type RazielOperatorCall = any;\n` +
    `const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);\n` +
    `const coordText = (v, max) => typeof v === "string" ? v.replace(/https?:\\/\\/\\S+/gi, "").replace(/[A-Za-z0-9_\\-]{32,}/g, "").replace(/\\s+/g, " ").trim().slice(0, max) : "";\n` +
    `async function razielOperatorRpc(bearer, call) { return await rpc(bearer, call); }\n${lBlock}\n`) +
    "\nreturn { razielPersonalDescriptor, razielPersonalSnapshot, razielPersonalPath, razielPersonalProject, runRazielPersonal };";
  return new Function("rpc", "recordOperationalSpan", "crypto", code)(rpcImpl, async (_t, s) => { spans.push(s); }, { randomUUID: () => "uuid" });
}
const ok = (data) => ({ ok: true, data, outcome: "success", ms: 1, error: null });
const UID = "11111111-2222-3333-4444-555555555555";
const item = (i, extra = {}) => ({ type: "post", ref: "r" + i, id: "id" + i, title: "T" + i, link: "/p/" + i, metadata_secret: "PRIVATE-META", note: "PRIVATE-NOTE", ...extra });
const many = (n) => Array.from({ length: n }, (_, i) => item(i));
const snapshot = (over = {}) => ({ revision: 3, history: many(20), collections: many(9), journeys: many(8), context: { secret: "PRIVATE-CTX" }, cart: many(2), saved: many(15), pinned: many(7), ...over });
const path = (over = {}) => ({ ok: true, path_id: UID, revision_no: 4, identity_metadata: { subject: "שלום", lens: "גימטריה", journey: "J1", secret: "PRIVATE-IDM" },
  steps: many(10), provenance: { raw: "PRIVATE-PROV" }, representation: { raw: "PRIVATE-REPR" }, ...over });
const det = (cap, over = {}) => ({ enabled: true, availability: "personal_research_read", trace: { personal: { capability: cap } }, ...over });

test("Phase L: descriptor only for authenticated (user/admin) + valid verified uid + enabled + allowlisted capability; anon/public → null", () => {
  const m = load(async () => ok({}));
  assert.deepEqual(m.razielPersonalDescriptor(det("personal_saved"), "user", UID), { capability: "personal_saved" });
  assert.deepEqual(m.razielPersonalDescriptor(det("personal_resume"), "admin", UID), { capability: "personal_resume" });
  for (const t of ["anon", "", "ADMIN", "public"]) assert.equal(m.razielPersonalDescriptor(det("personal_saved"), t, UID), null, t);
  for (const u of [null, "", "not-a-uuid", "1; drop table"]) assert.equal(m.razielPersonalDescriptor(det("personal_saved"), "user", u), null, String(u));
  assert.equal(m.razielPersonalDescriptor(det("personal_saved", { enabled: false }), "user", UID), null);
  assert.equal(m.razielPersonalDescriptor(det("personal_saved", { availability: "operator_read" }), "user", UID), null);
  assert.equal(m.razielPersonalDescriptor(det("write_anything"), "user", UID), null);
  assert.equal(m.razielPersonalDescriptor(det("personal_saved"), "user", UID.replace(/-/g, "")), null);
});

test("Phase L: anonymous → zero personal RPC calls (descriptor null, call-site gated on descriptor + verified ref)", () => {
  assert.match(callSite, /if \(!rOpDesc && !rCoordDesc && rPersDesc && rVerifiedRef\)/);
  assert.match(edge, /rPersDesc = razielPersonalDescriptor\(det, tier, rVerifiedRef\)/);
  assert.match(edge, /rUserBearer = tier === "user" \|\| tier === "admin"/);
});

test("Phase L: caller JWT + uid derived from the validated JWT only; no service role, no client uid, no raw table access, no writes", () => {
  assert.doesNotMatch(lBlock, /SB_SVC|svcHeaders|service_role|body\??\.(user_id|uid|userId|user_ref)|\/rest\/v1\/(?!rpc)|insert|update public|delete|upsert|user_research|research_items|research_paths/i);
  assert.match(callSite, /runRazielPersonal\(rPersDesc, rUserBearer, rVerifiedRef, activeTrace\)/);
  assert.match(edge, /const rVerifiedRef = identity\.startsWith\("u:"\) \? identity\.slice\(2\) : null/);   // identity comes from validated /auth/v1/user
  assert.deepEqual([...new Set([...lBlock.matchAll(/rpc: "(\w+)"/g)].map((x) => x[1]))].sort(), ["fn_research_path_resume_v1", "research_state_snapshot_v1"]);
});

test("Phase L: same-user JWT boundary — snapshot gets p_expected_user_id = verified uid; resume gets no id; the JWT is forwarded verbatim", async () => {
  const seen = [];
  const m = load(async (bearer, call) => { seen.push([bearer, call.rpc, call.args]); return ok(call.rpc === "research_state_snapshot_v1" ? snapshot() : path()); }, []);
  await m.runRazielPersonal({ capability: "personal_saved" }, "caller-jwt", UID, null);
  await m.runRazielPersonal({ capability: "personal_resume" }, "caller-jwt", UID, null);
  await m.runRazielPersonal({ capability: "personal_continue" }, "caller-jwt", UID, null);
  assert.deepEqual(seen, [
    ["caller-jwt", "research_state_snapshot_v1", { p_expected_user_id: UID }],
    ["caller-jwt", "fn_research_path_resume_v1", {}],
    ["caller-jwt", "research_state_snapshot_v1", { p_expected_user_id: UID }],
    ["caller-jwt", "fn_research_path_resume_v1", {}],
  ]);
  // principal mismatch (owner raises 42501 → access_filtered) → no data, no answer
  const bad = load(async () => ({ ok: false, data: null, outcome: "access_filtered", ms: 1, error: "http_403" }), []);
  const f = await bad.runRazielPersonal({ capability: "personal_saved" }, "jwt", UID, null);
  assert.equal(f.ok, false); assert.equal(f.answer, undefined); assert.equal(f.pack, undefined); assert.equal(f.outcome, "access_filtered");
});

test("Phase L: snapshot projection = counts + max 6 items per bucket; type/ref/id/title/link only; no metadata/private payload", () => {
  const m = load(async () => ok({}));
  const s = m.razielPersonalSnapshot(snapshot());
  assert.deepEqual(Object.keys(s).sort(), ["cart", "collections", "history", "journeys", "pinned", "saved"]);
  assert.equal(s.history.count, 20); assert.equal(s.history.items.length, 6);
  assert.equal(s.saved.count, 15); assert.ok(Object.values(s).every((b) => b.items.length <= 6));
  assert.deepEqual(Object.keys(s.saved.items[0]).sort(), ["id", "link", "ref", "title", "type"]);
  assert.doesNotMatch(JSON.stringify(s), /PRIVATE/);
  assert.equal(m.razielPersonalSnapshot({ history: [] }), null);
  assert.equal(m.razielPersonalSnapshot([]), null);
  // external / protocol-relative / javascript links are dropped; only internal navigation paths survive
  const l = m.razielPersonalSnapshot(snapshot({ saved: [item(1, { link: "https://evil.example/x" }), item(2, { link: "//evil.example" }), item(3, { link: "javascript:alert(1)" }), item(4)] }));
  assert.deepEqual(l.saved.items.map((x) => x.link), ["", "", "", "/p/4"]);
});

test("Phase L: latest path projection = max 6 recent steps + bounded subject/lens/journey; provenance/representation omitted", () => {
  const m = load(async () => ok({}));
  const p = m.razielPersonalPath(path());
  assert.equal(p.total, 10); assert.equal(p.steps.length, 6);
  assert.deepEqual(p.steps.map((x) => x.ref), ["r4", "r5", "r6", "r7", "r8", "r9"]);   // the 6 MOST RECENT
  assert.deepEqual([p.subject, p.lens, p.journey, p.revision], ["שלום", "גימטריה", "J1", 4]);
  assert.doesNotMatch(JSON.stringify(p), /PRIVATE/);
  assert.equal(m.razielPersonalPath({ ok: false, error: "not_found" }).found, false);
  assert.equal(m.razielPersonalPath({ ok: false, error: "weird" }), null);
  assert.equal(m.razielPersonalPath({ nope: 1 }), null);
  const long = m.razielPersonalPath(path({ identity_metadata: { subject: "x".repeat(500) } }));
  assert.ok(long.subject.length <= 80);
});

test("Phase L: L0 answers are labeled PERSONAL_RESEARCH_STATE (not Fact/Canonical), bounded, free of private payload", () => {
  const m = load(async () => ok({}));
  for (const cap of ["personal_saved", "personal_now", "personal_recent", "personal_pinned", "personal_structure"]) {
    const r = m.razielPersonalProject(cap, [snapshot()]);
    assert.equal(r.basis, "PERSONAL_RESEARCH_STATE", cap);
    assert.match(r.answer, /PERSONAL_RESEARCH_STATE/); assert.match(r.answer, /לא עובדה ולא קנוני/);
    assert.doesNotMatch(r.answer, /PRIVATE|SECRET/);
    assert.ok(r.answer.split("\n").filter((l) => l.startsWith("•")).length <= 12, cap);
    assert.equal(r.pack, undefined);
  }
  const res = m.razielPersonalProject("personal_resume", [path()]);
  assert.equal(res.basis, "PERSONAL_RESEARCH_STATE"); assert.doesNotMatch(res.answer, /PRIVATE/);
  assert.match(m.razielPersonalProject("personal_resume", [{ ok: false, error: "not_found" }]).answer, /לא נמצא מסלול/);
  assert.equal(m.razielPersonalProject("personal_saved", [{ nope: 1 }]), null);
  assert.equal(m.razielPersonalProject("personal_unknown", [snapshot()]), null);
});

test("Phase L: personal_continue → bounded pack (synthesis input, no answer); latest-path failure is non-fatal; snapshot failure is fatal", async () => {
  const m = load(async (_b, call) => (call.rpc === "research_state_snapshot_v1" ? ok(snapshot()) : { ok: false, data: null, outcome: "access_filtered", ms: 1, error: "http_403" }), []);
  const r = await m.runRazielPersonal({ capability: "personal_continue" }, "jwt", UID, null);
  assert.equal(r.ok, true); assert.equal(r.answer, undefined);
  assert.ok(r.pack.length <= 2400); assert.match(r.pack, /PERSONAL_RESEARCH_STATE/); assert.doesNotMatch(r.pack, /PRIVATE/);
  const m2 = load(async (_b, call) => (call.rpc === "research_state_snapshot_v1" ? { ok: false, data: null, outcome: "tool_error", ms: 1, error: "http_500" } : ok(path())), []);
  const f = await m2.runRazielPersonal({ capability: "personal_continue" }, "jwt", UID, null);
  assert.equal(f.ok, false); assert.equal(f.pack, undefined);
});

test("Phase L: one db_rpc span per owner call; span detail carries no uid / payload / items; read_only + redaction flags", async () => {
  const spans = [];
  const m = load(async (_b, call) => ok(call.rpc === "research_state_snapshot_v1" ? snapshot() : path()), spans);
  await m.runRazielPersonal({ capability: "personal_continue" }, "caller-jwt", UID, null);
  assert.equal(spans.length, 2);
  for (const s of spans) { assert.equal(s.kind, "db_rpc"); assert.equal(s.detail.privacy.rawPrivatePayloadLogged, false); assert.match(s.detail.replay.parametersRef, /caller_jwt:true;read_only:true/); }
  assert.doesNotMatch(JSON.stringify(spans), /PRIVATE|"T\d"|11111111|caller-jwt|p_expected_user_id/);
});

test("Phase L: call-site answers L0 without a model (deterministic); synthesis gets the pack; runs before the model call; A-K call sites preserved", () => {
  assert.match(callSite, /model: "none", intelligence_level: "deterministic"/);
  assert.match(callSite, /if \(op\.ok && op\.pack\) rPersPack = op\.pack/);
  assert.ok(edge.indexOf("runRazielPersonal(rPersDesc") < edge.indexOf("callClaudeReliable("));
  for (const k of ["runRazielOperator(rOpDesc", "runRazielCoordination(rCoordDesc", "razielNumberContextDescriptor(", "razielCurrentContentDescriptor("]) assert.ok(edge.includes(k), k);
  assert.match(edge, /const planText = razielPlanBlockText\(rPlanMeta\) \+ \(rPersPack/);
});

test("Phase L: migration extends only fn_raziel_plan; first-person grammar; anon denied; routing OFF; no tables/policies/grants/provider names", () => {
  assert.deepEqual([...mig.matchAll(/create or replace function public\.(\w+)/g)].map((x) => x[1]), ["fn_raziel_plan"]);
  assert.doesNotMatch(mig, /create table|alter table|drop |insert into|update public|grant |routing_enabled\s*=|fn_raziel_model/i);
  assert.doesNotMatch(mig, /anthropic|sonnet|opus|haiku/i);
  for (const c of ["personal_saved", "personal_now", "personal_recent", "personal_pinned", "personal_structure", "personal_resume", "personal_continue"]) assert.match(mig, new RegExp(`v_pcap := '${c}'`));
  assert.match(mig, /v_urank >= 1 and v_op is null/); assert.match(mig, /login_required/);
  assert.match(mig, /v_pcap := 'personal_continue'; v_pmode := 'synthesis'/);
  assert.match(mig, /'personal_research_deterministic'/); assert.match(mig, /'personal_research_synthesis'/);
  assert.equal((mig.match(/v_pers is null/g) || []).length, 3);   // D2 domains · Phase G · Phase H are skipped for a personal capability
  for (const k of ["operator_read", "number_context", "L4_TOOL_RESEARCH", "operator_coordination"]) assert.match(mig, new RegExp(k));   // A-K preserved
});
