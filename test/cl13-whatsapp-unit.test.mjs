// CL-13 WhatsApp unit - wa-raziel and ai-analyze TOGETHER on the REAL Edge handlers against a throwaway PostgreSQL (never a live project).
// Decisions of ZURIEL, 12.11.2026 (D-CL13-1..3): pause new personal memory; read an old memory only with a verified consent;
// a profile detail needs its own grant. Run by scripts/run-cl13-whatsapp-unit-test.sh, which starts the database, exports the database
// proposal from the pinned commit of the database-step branch (unit.json -> source_references.database_step) and pins the number of tests.
//
// The same scenarios run on EVERY deploy candidate of unit.json, in the order of the release (Edge first, database after):
//   wa-raziel : the files of the tree (candidate B) and candidate A (the deployed v21 + the CL-13 diff)
//   ai-analyze: the source of the tree and the A bundle (the deployed v91 bundle + the CL-13 diff), so the exact bytes of the candidate run
// in three database states, one after the other:
//   BEFORE   the live 12.11.2026 functions, the proposal NOT applied  = the Edge code deployed first
//   PAUSED   the proposal applied                                     = the reviewed target
//   CONSENT  a SIMULATION of a later policy version for one person    = no consent store exists yet (a separate approval)
// Every refusal has an allowed counterpart: what is not written or read while paused IS written and read with the permission.
// "Unchanged" is the md5 of the full content of every row that existed before, not a count.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { pgBridge } from "./helpers/cl13-pg-bridge.mjs";
import { aiAnalyzeOnPg, waRazielOnPg, waRazielGroupOnPg, treeSource, UA, UB, GROUP } from "./helpers/cl13-wa-edge-handlers.mjs";
import { USER_JWT, SERVICE_KEY } from "./helpers/ai-analyze-handler.mjs";
import { PAUSED_POLICY } from "./helpers/personal-memory-policy-fixture.mjs";
import { candidate } from "../scripts/cl13-whatsapp-unit.mjs";

const pg = pgBridge();
const APPLY = "supabase/proposed/20261112230000_cl13_personal_memory_pause.sql";
const ROLLBACK = "supabase/proposed/ROLLBACK_20261112230000_cl13_personal_memory_pause.sql";
const STORED = /OLD-|PRE-LINK|BARE-PHONE/;            // any text of a stored memory row
const PROFILE_TEXT = "שמי דוד כהן. מה הגימטריה של אור?";
const haveHistory = (() => { try { for (const c of ["949c24ad549ae9e95ced528a4ee8159670b52678", "b4d5ec47132ed8003b822cc70de9e1b82447cb7c"]) execFileSync("git", ["cat-file", "-e", `${c}^{commit}`], { stdio: "ignore" }); return true; } catch { return false; } })();

// the code under test: [label, options for the helper]
const WA = haveHistory ? [["tree", { source: treeSource("wa-raziel") }], ["A", { source: candidate("wa-raziel", "A").get("functions/wa-raziel/index.ts").toString("utf8") }]] : [];
const AI = [["tree", { source: treeSource("ai-analyze") }], ["A bundle", { source: candidate("ai-analyze", "A").get("index.ts").toString("utf8"), bundled: true }]];

const memoryReads = () => pg.statements.filter((s) => s.kind === "select" || (s.kind === "rpc" && ["fn_raziel_context", "fn_research_output_context_v1"].includes(s.name)));
const memoryWrites = () => pg.statements.filter((s) => s.kind === "insert" || (s.kind === "rpc" && ["fn_raziel_remember", "fn_raziel_fact", "fn_mem_add"].includes(s.name)));
const begin = () => { pg.statements.length = 0; return { stamp: pg.stamp(), rows: pg.stamp().rows }; };
// nothing was stored and no existing row changed (full content)
const nothingStored = (before, label) => {
  const after = pg.stamp();
  assert.equal(after.original, before.stamp.original, `${label}: the full content of every existing row is unchanged`);
  assert.equal(after.rows, before.rows, `${label}: no new row of any kind`);
};
const modelText = (run) => JSON.stringify(run.models.map((m) => [m.system, m.user]));

// ai-analyze: the paths that used the shared memory - an identified site caller without the 2029 research contract, and the trusted WhatsApp channel
async function aiAnalyzeClosed(label, variant) {
  const before = begin();
  const site = await aiAnalyzeOnPg(pg, { bearer: USER_JWT, verifiedUid: UA, ...variant });
  assert.equal(site.status, 200); assert.equal(site.models.length, 1, `${label}: the answer is still produced`);
  assert.doesNotMatch(modelText(site), STORED, `${label}: no stored memory reaches the model`);
  const wa = await aiAnalyzeOnPg(pg, { bearer: SERVICE_KEY, trustedUid: UA, body: { surface: "whatsapp", visitor_id: undefined, trusted_channel: { channel: "whatsapp", sender: "972500000001", depth: false } }, ...variant });
  assert.equal(wa.status, 200); assert.equal(wa.models.length, 1);
  assert.doesNotMatch(modelText(wa), STORED, `${label}: no stored memory reaches the model on the WhatsApp channel`);
  assert.deepEqual(memoryWrites(), [], `${label}: nothing is sent to a writer (R3)`);
  // an anonymous site caller is not a person: no policy read, no memory call of any kind
  pg.statements.length = 0;
  const anonymous = await aiAnalyzeOnPg(pg, { bearer: "", ...variant });
  assert.deepEqual(pg.statements, [], `${label}: an anonymous caller touches no memory function`);
  assert.ok([200, 401].includes(anonymous.status));
  nothingStored(before, label);
}
async function waRazielClosed(label, variant) {
  for (const linked of [true, false]) {
    const before = begin();
    const run = await waRazielOnPg(pg, { text: PROFILE_TEXT, linked, ...variant });
    const who = `${label} ${linked ? "linked" : "without an account"}`;
    assert.ok(run.sent.length >= 1 && run.sent.every((m) => String(m.message || "").trim().length > 0), `${who}: the person gets an answer`);
    assert.deepEqual(memoryReads(), [], `${who}: no stored memory is read`);
    assert.deepEqual(memoryWrites(), [], `${who}: nothing is sent to a writer (M-1, M-8, M-9)`);
    assert.equal(run.inserts.some((x) => x.row?.action === "raziel_facts" || /facts-captured/.test(String(x.row?.reply_out))), false, `${who}: no "captured facts" record in any other store (M-9)`);
    assert.ok(run.inserts.some((x) => x.table === "wa_bot_log" && x.row?.action === "raziel_dm"), `${who}: the operational log is still written (M-2)`);
    assert.doesNotMatch(JSON.stringify(run.aiCalls), STORED, `${who}: no stored memory is sent on`);
    nothingStored(before, who);
  }
}
async function waRazielGroupClosed(label, variant) {
  const before = begin();
  const run = await waRazielGroupOnPg(pg, { text: `רזיאל, ${PROFILE_TEXT}`, source: variant.source });
  assert.ok(run.sent.some((m) => m.chatId === GROUP && String(m.message || "").trim()), `${label} group: the group gets an answer`);
  assert.equal(run.modelCalls.length, 1, `${label} group: the answer comes from the model`);
  assert.doesNotMatch(JSON.stringify(run.modelCalls), STORED, `${label} group: no stored memory in the prompt of a group answer (M-7)`);
  assert.doesNotMatch(JSON.stringify(run.sent), STORED, `${label} group: no stored memory in what is sent`);
  assert.deepEqual(memoryReads(), [], `${label} group: no stored memory is read`);
  assert.deepEqual(memoryWrites(), [], `${label} group: nothing is remembered and no profile detail is extracted (M-7, M-10)`);
  nothingStored(before, `${label} group`);
}
const eachWa = async (label, fn) => { assert.ok(WA.length === 2, "both wa-raziel candidates run (the commits of the rollback manifest are needed)"); for (const [name, v] of WA) await fn(`${label} wa-raziel ${name}`, v); };
const eachAi = async (label, fn) => { for (const [name, v] of AI) await fn(`${label} ai-analyze ${name}`, v); };

// a later policy version, simulated inside the throwaway database only (the SQL test of the database step does the same)
const simulate = ({ persons, profileFacts = false, research = true }) => pg.run(`
  create or replace function public.fn_personal_memory_policy_v1(p_user_ref text) returns jsonb language sql stable set search_path to 'public', 'pg_temp' as $f$
    select jsonb_build_object('policy', 'SIMULATED_CONSENT', 'write_personal', p_user_ref = any(array[${persons.map((p) => `'${p}'`).join(",")}]),
      'write_profile_facts', ${profileFacts} and p_user_ref = any(array[${persons.map((p) => `'${p}'`).join(",")}]),
      'read_personal', p_user_ref = any(array[${persons.map((p) => `'${p}'`).join(",")}]),
      'research_output_write', ${research}, 'research_output_read', ${research}, 'consent', null, 'reason', 'no consent of this person') $f$;`);

if (!pg) {
  test("CL-13 WhatsApp unit tests need the throwaway PostgreSQL of scripts/run-cl13-whatsapp-unit-test.sh", { skip: "start them with the runner script" }, () => {});
} else {
  // ───────────────────────── BEFORE: the Edge code deployed before the database proposal ─────────────────────────
  test("BEFORE 0: the live database reads memory without consent and has no policy function (what the Edge gate cannot rely on)", () => {
    const ctx = pg.rpc("fn_raziel_context", { p_user_ref: UA, p_channel: "site" }).data;
    assert.match(ctx.user_context.summary, /OLD-SITE-THREAD-A3/); assert.equal(ctx.privacy.personal_memory_allowed, true);
    assert.match(JSON.stringify(ctx), /BARE-PHONE-MEMORY-OF-A/, "live: a memory recorded under the bare phone is merged into the account through the link");
    assert.equal(pg.rpc("fn_personal_memory_policy_v1", { p_user_ref: UA }).status, 404);
  });
  test("BEFORE 1 (M-1, M-8, M-9): wa-raziel answers a linked sender and a sender without an account; nothing is stored or extracted", () => eachWa("BEFORE", waRazielClosed));
  test("BEFORE 2 (M-11, M-12): ai-analyze answers without stored memory and stores nothing, on the site path and on the WhatsApp channel", () => eachAi("BEFORE", aiAnalyzeClosed));
  test("BEFORE 3 (M-7, M-10): in a group nothing personal is read, exposed, remembered or extracted", () => eachWa("BEFORE", waRazielGroupClosed));

  // ───────────────────────── PAUSED: the proposal applied ─────────────────────────
  test("PAUSED 0: the proposal applies on the state the Edge-first run left, and its policy is the one the handler tests assume", () => {
    pg.file(APPLY);
    assert.deepEqual(pg.rpc("fn_personal_memory_policy_v1", { p_user_ref: UA }).data, PAUSED_POLICY);
    const ctx = pg.rpc("fn_raziel_context", { p_user_ref: UA, p_channel: "site" }).data;
    assert.doesNotMatch(JSON.stringify(ctx), STORED); assert.equal(ctx.privacy.personal_memory_allowed, false);
  });
  test("PAUSED 1 (M-1, M-8, M-9): wa-raziel answers a linked sender and a sender without an account; nothing is stored or extracted", () => eachWa("PAUSED", waRazielClosed));
  test("PAUSED 2 (M-11, M-12): ai-analyze answers without stored memory and stores nothing, on the site path and on the WhatsApp channel", () => eachAi("PAUSED", aiAnalyzeClosed));
  test("PAUSED 3 (M-7, M-10): in a group nothing personal is read, exposed, remembered or extracted", () => eachWa("PAUSED", waRazielGroupClosed));
  test("PAUSED 4: a writer that ignores the policy is refused by the database with an error, and the status is still honest", () => {
    const before = begin();
    const refused = pg.rest("https://fixture.invalid/rest/v1/agent_user_memory?select=id", { method: "POST", headers: { Prefer: "return=representation" },
      body: JSON.stringify({ user_ref: UA, channel: "site", agent: "raziel", memory_type: "conversation", memory_scope: "personal", visibility: "private", source: "site", topic: "t", content: "NEW-DIRECT-WRITE", data: {} }) });
    assert.equal(refused.status, 400);
    for (const [name, args] of [["fn_raziel_remember", { p_user_ref: UA, p_channel: "site", p_content: "NEW-REMEMBER" }], ["fn_raziel_fact", { p_user_ref: UA, p_channel: "site", p_kind: "city", p_value: "NEW-FACT" }]]) {
      assert.deepEqual(pg.rpc(name, args), { data: null, error: null, status: 200 }, `${name} returns NULL = not saved`);
    }
    nothingStored(before, "PAUSED direct writers");
  });

  // ───────────────────────── CONSENT: a simulated later policy version (person A only) ─────────────────────────
  test("CONSENT 1 (M-4, M-6): ai-analyze reads the person's own memory (the assistant's research-typed rows included), without the phone memory; the turn is remembered", async () => {
    pg.run("create table public.cl13_reviewed_policy as select pg_get_functiondef('public.fn_personal_memory_policy_v1(text)'::regprocedure) as def;");
    simulate({ persons: [UA] });
    for (const [name, variant] of AI) {
      const before = begin();
      const site = await aiAnalyzeOnPg(pg, { bearer: USER_JWT, verifiedUid: UA, ...variant });
      const prompt = modelText(site);
      assert.match(prompt, /OLD-SITE-THREAD-A3|OLD-DM-A/, `${name}: the stored memory of the consenting person joins the prompt`);
      assert.doesNotMatch(prompt, /PRE-LINK-MEMORY-OF-A|BARE-PHONE-MEMORY-OF-A/, `${name}: no implied merge of a memory recorded under the phone (M-6)`);
      assert.match(prompt, /OLD-RESEARCH-TYPED-ROW-OF-A/, `${name}: a research-typed row of the assistant is the person's own memory: read with the same consent (and never without it: PAUSED 2)`);
      assert.equal(pg.stamp().rows, before.rows + 1, `${name}: this turn was remembered (one row)`);
      assert.equal(pg.stamp().original, before.stamp.original);
      // another person: still nothing
      const b = begin();
      const other = await aiAnalyzeOnPg(pg, { bearer: USER_JWT, verifiedUid: UB, ...variant });
      assert.doesNotMatch(modelText(other), STORED); assert.deepEqual(memoryReads(), []); assert.deepEqual(memoryWrites(), []); nothingStored(b, `${name} other person`);
    }
  });
  test("CONSENT 2 (M-8, D-CL13-3): with a consent to memory wa-raziel stores the message but NO profile detail; a detail needs its own grant", async () => {
    for (const [name, variant] of WA) {
      simulate({ persons: [UA] });
      let before = begin();
      let run = await waRazielOnPg(pg, { text: PROFILE_TEXT, linked: true, ...variant });
      assert.ok(run.sent.length >= 1);
      assert.deepEqual(memoryWrites().map((s) => s.name), ["fn_raziel_remember"], `${name}: the message is remembered; the fact writer is not called`);
      assert.equal(pg.stamp().rows, before.rows + 1); assert.equal(run.inserts.some((x) => x.row?.action === "raziel_facts"), false);
      // a sender without an account has no consent in this simulation: nothing
      before = begin();
      run = await waRazielOnPg(pg, { text: PROFILE_TEXT, linked: false, ...variant });
      assert.deepEqual(memoryWrites(), []); nothingStored(before, `${name} sender without an account`);
      // the explicit grant for profile facts (the allowed counterpart): the fact is stored and only then recorded as captured
      simulate({ persons: [UA], profileFacts: true });
      before = begin();
      run = await waRazielOnPg(pg, { text: PROFILE_TEXT, linked: true, ...variant });
      assert.ok(memoryWrites().some((s) => s.name === "fn_raziel_fact"), `${name}: with the grant the profile detail is written`);
      assert.deepEqual(run.inserts.filter((x) => x.row?.action === "raziel_facts").map((x) => x.row.reply_out), ["[facts-captured] name"], `${name}: recorded as captured only after it was stored`);
      assert.equal(pg.stamp().original, before.stamp.original);
      // the grant is there but the writer stores nothing (a refusal, a failure): the record says nothing was captured, because nothing was
      before = begin();
      run = await waRazielOnPg(pg, { text: PROFILE_TEXT, linked: true, refuseFacts: true, ...variant });
      assert.ok(run.rpcCalls.some((c) => c.name === "fn_raziel_fact"), `${name}: the writer was asked`);
      assert.equal(run.inserts.some((x) => x.row?.action === "raziel_facts" || /facts-captured/.test(String(x.row?.reply_out))), false, `${name}: no "captured" record for a detail that was not stored`);
    }
    simulate({ persons: [UA] });
  });
  test("CONSENT 3 (M-7, M-10): even when the sender consented, a group gets no personal context and no profile detail", async () => {
    simulate({ persons: [UA], profileFacts: true });
    for (const [name, variant] of WA) {
      const before = begin();
      const run = await waRazielGroupOnPg(pg, { text: `רזיאל, ${PROFILE_TEXT}`, source: variant.source });
      assert.ok(run.sent.some((m) => m.chatId === GROUP), `${name}: the group is answered`);
      assert.doesNotMatch(JSON.stringify(run.modelCalls), STORED, `${name}: no stored memory in the prompt of a group answer, with a consent too`);
      // (the unrelated private message of the same run may read the sender's own context for the PRIVATE chat: that is allowed)
      assert.deepEqual(memoryReads().filter((s) => s.args?.p_channel !== "972500000001@c.us"), [], `${name}: the stored context is not read for a group`);
      assert.deepEqual(memoryWrites().filter((s) => s.args?.p_channel === GROUP).map((s) => [s.name, s.args.p_user_ref]), [["fn_raziel_remember", UA]], `${name}: the consenting sender's own message may be remembered`);
      assert.equal(memoryWrites().some((s) => s.name === "fn_raziel_fact" && s.args.p_channel === GROUP), false, `${name}: no profile fact from a group (M-10)`);
      assert.equal(pg.stamp().original, before.stamp.original);
    }
    simulate({ persons: [UA] });
  });

  // ───────────────────────── ROLLBACK: the Edge code stays closed when the database goes back ─────────────────────────
  test("ROLLBACK: after the rollback of the proposal both functions are still closed (no policy function = no write, no read)", async () => {
    pg.run("do $r$ begin execute (select def from public.cl13_reviewed_policy); end $r$;");   // the reviewed policy back: the rollback continues only on exactly the applied state
    pg.file(ROLLBACK);
    assert.equal(pg.rpc("fn_personal_memory_policy_v1", { p_user_ref: UA }).status, 404);
    const live = pg.rpc("fn_raziel_context", { p_user_ref: UA, p_channel: "site" }).data;
    assert.ok(live.privacy.personal_memory_allowed === true && !("policy" in live.privacy), "the database is the live one again: it reads memory without consent");
    await eachWa("ROLLBACK", waRazielClosed);
    await eachAi("ROLLBACK", aiAnalyzeClosed);
  });
}
