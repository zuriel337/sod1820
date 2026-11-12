// CL-13 — the Edge half of the personal-memory policy (supabase/functions/_shared/personalMemoryPolicy.js) and the handlers'
// behaviour when the database answer is missing or malformed. No database here: the answers are given directly, so the
// fail-closed rules are tested on every shape of answer. The handlers on a real throwaway database are in
// test/cl13-personal-memory-pg.test.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  PERSONAL_MEMORY_POLICY_RPC, PERSONAL_MEMORY_CLOSED, normalizePersonalMemoryPolicy, readPersonalMemoryPolicy,
  gatePersonalContext, personalMemorySaveStatus, emptyUserContext,
} from "../supabase/functions/_shared/personalMemoryPolicy.js";
import { PAUSED_POLICY, CONSENT_POLICY, POLICY_FUNCTION_MISSING } from "./helpers/personal-memory-policy-fixture.mjs";
import { runAiAnalyze, UID, USER_JWT } from "./helpers/ai-analyze-handler.mjs";
import { runWaRaziel } from "./helpers/wa-raziel-handler.mjs";
import { numberResearcherHandler } from "./helpers/number-researcher-handler.mjs";
import { fixture } from "./fixtures/raziel-interview-787.mjs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const GRANTS = ["write_personal", "write_profile_facts", "read_personal", "research_output_as_personal_context"];
const OPEN = { policy: "p", write_personal: true, write_profile_facts: true, read_personal: true, research_output_as_personal_context: true };
const PERMISSIVE_CONTEXT = { user_context: { summary: "OLD-SUMMARY", recent_conversation: ["OLD-TOPIC"], research_threads: ["OLD-RESEARCH"], approved_preferences: ["OLD-PREF"], profile: [{ kind: "name", value: "OLD-NAME" }] },
  channel_context: { topic_summary: "GROUP-TOPIC" }, privacy: { personal_memory_allowed: true, personal_memory_write_allowed: true } };

test("the fixture of the paused policy is exactly what the reviewed proposal returns", () => {
  const sql = read("supabase/proposed/20261112230000_cl13_personal_memory_pause.sql");
  const body = sql.slice(sql.indexOf("CREATE OR REPLACE FUNCTION public.fn_personal_memory_policy_v1"), sql.indexOf("CREATE OR REPLACE FUNCTION public.fn_personal_memory_is_research_output_v1"));
  const pairs = [...body.matchAll(/^\s+'([a-z_]+)', (.+?),?\)?$/gm)].map(([, key, value]) => [key, value.replace(/\)$/, "")]);
  const fromSql = Object.fromEntries(pairs.map(([key, value]) => [key, value === "null" ? null : value === "true" ? true : value === "false" ? false : value.replace(/^'|'$/g, "")]));
  assert.deepEqual(fromSql, { ...PAUSED_POLICY });
  assert.equal(PERSONAL_MEMORY_POLICY_RPC, "fn_personal_memory_policy_v1");
});

test("only a literal true grants; every other answer is closed", () => {
  for (const raw of [null, undefined, "", 0, [], "cl13", { write_personal: true, read_personal: true }, { policy: "" , read_personal: true }, { policy: 7, read_personal: true }]) {
    const p = normalizePersonalMemoryPolicy(raw);
    for (const g of GRANTS) assert.equal(p[g], false, `${JSON.stringify(raw)} -> ${g}`);
    assert.equal(p.source, "closed");
  }
  for (const value of ["true", 1, "yes", {}, [], null, undefined, "t"]) {
    const p = normalizePersonalMemoryPolicy({ policy: "p", write_personal: value, write_profile_facts: value, read_personal: value, research_output_as_personal_context: value });
    for (const g of GRANTS) assert.equal(p[g], false, `${JSON.stringify(value)} is not a grant of ${g}`);
  }
  assert.deepEqual(GRANTS.map((g) => normalizePersonalMemoryPolicy(OPEN)[g]), [true, true, true, true], "the allowed counterpart: literal true grants");
});

test("the grants are separate: memory does not open profile facts, reading does not open research output", () => {
  assert.equal(normalizePersonalMemoryPolicy({ ...OPEN, write_profile_facts: false }).write_profile_facts, false);
  assert.equal(normalizePersonalMemoryPolicy({ ...OPEN, write_personal: false }).write_profile_facts, false, "a profile fact is also a personal-memory row");
  assert.equal(normalizePersonalMemoryPolicy({ ...OPEN, research_output_as_personal_context: false }).research_output_as_personal_context, false);
  assert.equal(normalizePersonalMemoryPolicy({ ...OPEN, read_personal: false }).research_output_as_personal_context, false, "research output joins a personal context only where personal context is allowed");
  const paused = normalizePersonalMemoryPolicy(PAUSED_POLICY);
  assert.deepEqual(GRANTS.map((g) => paused[g]), [false, false, false, false]);
  assert.equal(paused.policy, "cl13_pause_v1"); assert.equal(paused.reason, PAUSED_POLICY.reason);
  const consent = normalizePersonalMemoryPolicy(CONSENT_POLICY);
  assert.deepEqual(GRANTS.map((g) => consent[g]), [true, false, true, false], "a consent to memory: write and read only");
});

test("reading the policy fails closed: no person, an error, a missing function", async () => {
  let calls = 0;
  for (const ref of [null, undefined, "", "   ", 7, {}]) assert.equal((await readPersonalMemoryPolicy(async () => { calls += 1; return OPEN; }, ref)).reason, "no_person");
  assert.equal(calls, 0, "without a person the database is not asked");
  assert.equal((await readPersonalMemoryPolicy(async () => { throw new Error("404"); }, "u")).reason, "policy_unavailable");
  assert.equal((await readPersonalMemoryPolicy(async () => null, "u")).reason, "policy_unavailable");
  assert.equal((await readPersonalMemoryPolicy(async () => ({ read_personal: true }), "u")).reason, "policy_malformed");
  const seen = [];
  const open = await readPersonalMemoryPolicy(async (name, args) => { seen.push([name, args]); return OPEN; }, " u-1 ");
  assert.equal(open.read_personal, true); assert.deepEqual(seen, [["fn_personal_memory_policy_v1", { p_user_ref: "u-1" }]]);
  for (const g of GRANTS) assert.equal(PERSONAL_MEMORY_CLOSED[g], false);
});

test("a stored context is used only when the policy AND the context itself allow it", () => {
  const open = normalizePersonalMemoryPolicy(OPEN), noResearch = normalizePersonalMemoryPolicy(CONSENT_POLICY), paused = normalizePersonalMemoryPolicy(PAUSED_POLICY);
  // closed policy, permissive context (the database before the proposal): nothing personal survives; the channel part does
  for (const policy of [paused, PERSONAL_MEMORY_CLOSED, null, undefined, {}]) {
    const g = gatePersonalContext(PERMISSIVE_CONTEXT, policy);
    assert.deepEqual(g.user_context, emptyUserContext()); assert.equal(g.privacy.personal_memory_allowed, false); assert.equal(g.privacy.personal_memory_write_allowed, false);
    assert.equal(g.channel_context.topic_summary, "GROUP-TOPIC"); assert.ok(g.privacy.reason);
    assert.doesNotMatch(JSON.stringify(g.user_context), /OLD-/);
  }
  // open policy, but the context says no (a group, or nobody): still nothing
  for (const privacy of [{ personal_memory_allowed: false, reason: "group" }, {}, undefined, { personal_memory_allowed: "true" }]) {
    const g = gatePersonalContext({ ...PERMISSIVE_CONTEXT, privacy }, open);
    assert.deepEqual(g.user_context, emptyUserContext()); assert.equal(g.privacy.personal_memory_allowed, false);
  }
  assert.equal(gatePersonalContext({ ...PERMISSIVE_CONTEXT, privacy: { personal_memory_allowed: false, reason: "group" } }, open).privacy.reason, "group");
  // no context at all: an empty one in the shape the callers read
  for (const ctx of [null, undefined, "x", []]) assert.deepEqual(gatePersonalContext(ctx, open).user_context, emptyUserContext());
  // the allowed counterpart; research threads need their own grant
  const consented = gatePersonalContext(PERMISSIVE_CONTEXT, noResearch);
  assert.equal(consented.user_context.summary, "OLD-SUMMARY"); assert.deepEqual(consented.user_context.research_threads, []); assert.equal(consented.privacy.personal_memory_allowed, true); assert.equal(consented.privacy.reason, null);
  assert.deepEqual(gatePersonalContext(PERMISSIVE_CONTEXT, open).user_context.research_threads, ["OLD-RESEARCH"]);
  assert.deepEqual(PERMISSIVE_CONTEXT.user_context.research_threads, ["OLD-RESEARCH"], "the input is not mutated");
  // list fields are arrays for the callers, whatever the database returned
  const odd = gatePersonalContext({ user_context: { summary: "s", recent_conversation: null, profile: "x", approved_preferences: {} }, privacy: { personal_memory_allowed: true } }, open);
  assert.deepEqual([odd.user_context.recent_conversation, odd.user_context.profile, odd.user_context.approved_preferences, odd.user_context.research_threads], [[], [], [], []]);
  assert.equal(odd.user_context.summary, "s");
});

test("'saved' is said only for a stored row", () => {
  const consent = normalizePersonalMemoryPolicy(CONSENT_POLICY), paused = normalizePersonalMemoryPolicy(PAUSED_POLICY);
  assert.deepEqual(personalMemorySaveStatus(consent, "33333333-3333-4333-8333-333333333333"), { saved: true, reason: null, policy: "SIMULATED_CONSENT" });
  for (const id of [null, undefined, "", true, 1, {}]) assert.equal(personalMemorySaveStatus(consent, id).saved, false, `${JSON.stringify(id)} is not a stored row`);
  assert.equal(personalMemorySaveStatus(consent, null).reason, "write_failed");
  assert.equal(personalMemorySaveStatus(consent, null, "writer_returned_nothing").reason, "writer_returned_nothing");
  assert.deepEqual(personalMemorySaveStatus(paused, "33333333-3333-4333-8333-333333333333"), { saved: false, reason: PAUSED_POLICY.reason, policy: "cl13_pause_v1" }, "a row id without a permission is still not 'saved'");
  assert.equal(personalMemorySaveStatus(null, "x").saved, false);
});

// ── the handlers, when the database answers something that is not a clear grant ──
const NOT_A_GRANT = [POLICY_FUNCTION_MISSING, null, { policy: "x", write_personal: "true", write_profile_facts: 1, read_personal: "true", research_output_as_personal_context: "yes" }, { write_personal: true, read_personal: true }];
const STORED = { user_context: { summary: "OLD-SUMMARY-SENTINEL", recent_conversation: ["OLD-TOPIC"], research_threads: ["OLD-RESEARCH-THREAD"], approved_preferences: ["OLD-PREF"] }, privacy: { personal_memory_allowed: true, personal_memory_write_allowed: true } };

test("ai-analyze: an unclear policy answer means no stored context and no remembered turn; a clear grant means both", async () => {
  for (const memoryPolicy of NOT_A_GRANT) {
    const run = await runAiAnalyze({ allowed: true, bearer: USER_JWT, verifiedUid: UID, legacyContext: STORED, memoryPolicy });
    const names = run.calls.map((c) => c.name);
    assert.equal(names.includes("fn_personal_memory_policy_v1"), true);
    assert.equal(names.includes("fn_raziel_context"), false); assert.equal(names.includes("fn_raziel_remember"), false);
    assert.doesNotMatch(JSON.stringify(run.models.map((m) => [m.system, m.user])), /OLD-/);
    assert.equal(run.status, 200); assert.equal(run.models.length, 1, "the answer is still produced");
  }
  const granted = await runAiAnalyze({ allowed: true, bearer: USER_JWT, verifiedUid: UID, legacyContext: STORED, memoryPolicy: CONSENT_POLICY, rememberResult: "33333333-3333-4333-8333-333333333333" });
  const names = granted.calls.map((c) => c.name);
  assert.ok(names.includes("fn_raziel_context") && names.includes("fn_raziel_remember"));
  const prompt = JSON.stringify(granted.models.map((m) => [m.system, m.user]));
  assert.match(prompt, /OLD-SUMMARY-SENTINEL/); assert.doesNotMatch(prompt, /OLD-RESEARCH-THREAD/, "research output needs its own grant");
  // with a grant from the policy, a context that itself says "not allowed" (a group, nobody) still contributes nothing
  const refused = await runAiAnalyze({ allowed: true, bearer: USER_JWT, verifiedUid: UID, legacyContext: { ...STORED, privacy: { personal_memory_allowed: false, reason: "group" } }, memoryPolicy: CONSENT_POLICY });
  assert.doesNotMatch(JSON.stringify(refused.models.map((m) => [m.system, m.user])), /OLD-/);
});

test("ai-analyze: an anonymous caller and the 2029 research contract never touch the shared memory", async () => {
  const anonymous = await runAiAnalyze({ allowed: true, legacyContext: STORED, memoryPolicy: CONSENT_POLICY });
  for (const forbidden of ["fn_personal_memory_policy_v1", "fn_raziel_context", "fn_raziel_remember"]) assert.equal(anonymous.calls.some((c) => c.name === forbidden), false, forbidden);
});

test("wa-raziel: an unclear policy answer means nothing is remembered, extracted or read; the person is still answered", async () => {
  const text = "שמי דוד כהן. מה הגימטריה של אור?";
  for (const memoryPolicy of NOT_A_GRANT) {
    const run = await runWaRaziel({ incoming: { id: `m-${Math.random()}`, text }, memoryPolicy, rpcOverrides: { fn_raziel_context: STORED } });
    const names = run.rpcCalls.map((c) => c.name);
    assert.ok(names.includes("fn_personal_memory_policy_v1"));
    for (const forbidden of ["fn_raziel_remember", "fn_raziel_fact", "fn_raziel_context"]) assert.equal(names.includes(forbidden), false, forbidden);
    assert.equal(run.inserts.some((x) => x.row?.action === "raziel_facts"), false);
    assert.ok(run.sent.length >= 1); assert.doesNotMatch(JSON.stringify(run.aiCalls), /OLD-/);
  }
  // the allowed counterparts: a consent to memory remembers the message; profile facts need their own grant
  const consent = await runWaRaziel({ incoming: { id: "m-consent", text }, memoryPolicy: CONSENT_POLICY, rpcOverrides: { fn_raziel_remember: "33333333-3333-4333-8333-333333333333", fn_raziel_fact: "44444444-4444-4444-8444-444444444444", fn_raziel_context: STORED } });
  assert.ok(consent.rpcCalls.some((c) => c.name === "fn_raziel_remember")); assert.equal(consent.rpcCalls.some((c) => c.name === "fn_raziel_fact"), false);
  const facts = await runWaRaziel({ incoming: { id: "m-facts", text }, memoryPolicy: { ...CONSENT_POLICY, write_profile_facts: true }, rpcOverrides: { fn_raziel_remember: "33333333-3333-4333-8333-333333333333", fn_raziel_fact: "44444444-4444-4444-8444-444444444444", fn_raziel_context: STORED } });
  assert.deepEqual(facts.rpcCalls.filter((c) => c.name === "fn_raziel_fact").map((c) => c.args.p_kind), ["name"]);
  assert.deepEqual(facts.inserts.filter((x) => x.row?.action === "raziel_facts").map((x) => x.row.reply_out), ["[facts-captured] name"]);
  // a fact the writer did not store is not reported as captured
  const refused = await runWaRaziel({ incoming: { id: "m-refused", text }, memoryPolicy: { ...CONSENT_POLICY, write_profile_facts: true }, rpcOverrides: { fn_raziel_remember: null, fn_raziel_fact: null } });
  assert.equal(refused.inserts.some((x) => x.row?.action === "raziel_facts"), false, "no 'captured' record for a fact that was not stored");
});

test("wa-raziel no longer tells a person who links an account that everything is saved", () => {
  const source = read("supabase/functions/wa-raziel/index.ts");
  assert.doesNotMatch(source, /וכל המחקר נשמר/);
  assert.match(source, /מחובר! מעכשיו אתה מזוהה — בלי הגבלה\.\$\{nl\}/);
});

test("number-researcher: an unclear policy answer means the client turns are the conversation and nothing is stored or claimed", async () => {
  for (const memoryPolicy of NOT_A_GRANT) {
    const f = fixture(); f.memoryPolicy = memoryPolicy; f.memoryTrigger = false;   // even a database WITHOUT the trigger gets no write
    f.memory.push({ id: "old", created_at: 0, user_ref: "11111111-2222-4333-8444-555555555555", content: "OLD-STORED-QUESTION", data: { reply: "OLD-STORED-REPLY" } });
    const result = await numberResearcherHandler(f)({ values: [787], message: "שאלה חדשה", history: [{ role: "user", text: "NEW-EARLIER-TURN" }, { role: "assistant", text: "NEW-EARLIER-REPLY" }] });
    assert.ok(result.body.answer); assert.equal(result.body.persisted, false); assert.equal(result.body.memory.saved, false); assert.equal(result.body.memory.read_allowed, false);
    assert.equal(result.body.remembered, 0);
    assert.equal(f.calls.some((c) => c.name === "agent_user_memory" || c.name === "fn_raziel_context"), false, "no stored thread, no stored context, no write");
    const prompt = f.models[0].messages[0].content;
    assert.match(prompt, /NEW-EARLIER-TURN/); assert.match(prompt, /NEW-EARLIER-REPLY/); assert.doesNotMatch(prompt, /OLD-|Older conversation/);
    assert.equal(f.memory.length, 1);
  }
});

test("number-researcher: 'saved' needs a returned row even when the database answers with a success", async () => {
  const f = fixture(); f.memoryPolicy = CONSENT_POLICY;
  f.failOnce("agent_user_memory", (_, c) => c.method === "POST", [], 201);   // a writer that skips silently: HTTP success, no row
  const result = await numberResearcherHandler(f)({ values: [787], message: "שאלה", history: [] });
  assert.equal(result.body.persisted, false); assert.deepEqual(result.body.memory, { saved: false, read_allowed: true, reason: "write_failed", policy: "SIMULATED_CONSENT" });
  const saved = await numberResearcherHandler(f)({ values: [787], message: "שאלה שנייה", history: [] });
  assert.equal(saved.body.persisted, true); assert.equal(saved.body.memory.saved, true);
  assert.equal(f.memory.filter((r) => r.content === "שאלה שנייה").length, 1, "the allowed counterpart: a stored row, reported as saved");
});
