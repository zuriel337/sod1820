// CL-13 — acceptance tests M-1..M-15 on the REAL Edge handlers against a throwaway PostgreSQL (never a live project).
// Spec: the contracts handoff 53bb72e13, alignment README section 14. Decisions of ZURIEL, 12.11.2026 (D-CL13-1..3).
// Run by scripts/run-cl13-personal-memory-handlers-test.sh, which starts the database and pins the number of tests.
//
// The same scenarios run in three database states, in this order (the tests of this file are sequential):
//   BEFORE   the live 12.11.2026 functions, the proposal NOT applied  = the Edge code deployed first;
//   PAUSED   the proposal applied                                     = the reviewed target of this phase;
//   CONSENT  a SIMULATION of a later policy version for one person    = no consent store exists yet (a separate approval).
// Every refusal has an allowed counterpart: what is not written or read while paused IS written and read with the permission.
// RESEARCH (decision of ZURIEL after the Codex review of abb2f3907): authorised research is available during the pause, and a
// personal detail inside a "research" row stays under consent. PAUSED 4 proves both on the real handlers of the two research bots.
// "Unchanged" is the md5 of the full content of every row that existed before, not a count (M-1, M-3).
import test from "node:test";
import assert from "node:assert/strict";
import { pgBridge } from "./helpers/cl13-pg-bridge.mjs";
import { siteThreadHandler, aiAnalyzeOnPg, waRazielOnPg, waRazielGroupOnPg, runResearchBot, UA, UB, BOT_PERSON, GROUP } from "./helpers/cl13-edge-handlers.mjs";
import { USER_JWT, SERVICE_KEY } from "./helpers/ai-analyze-handler.mjs";
import { PAUSED_POLICY } from "./helpers/personal-memory-policy-fixture.mjs";

const pg = pgBridge();
const APPLY = "supabase/proposed/20261112230000_cl13_personal_memory_pause.sql";
const ROLLBACK = "supabase/proposed/ROLLBACK_20261112230000_cl13_personal_memory_pause.sql";
const STORED = /OLD-|PRE-LINK|BARE-PHONE/;            // any text of a stored memory row
const TURNS = ["אני חוקר את המספר 787", "ומה הקשר שלו למה שאמרתי קודם?", "תרחיב על הנקודה השנייה שציינת", "סכם את שלוש התשובות האחרונות"];
const researchOutput = (r) => (r.agent === "hatishbi" || r.agent === "uriel") && ["research_note", "method_discovery"].includes(r.memory_type);
const personalRows = () => pg.newRows().filter((r) => !researchOutput(r));
const memoryReads = () => pg.statements.filter((s) => s.kind === "select" || (s.kind === "rpc" && ["fn_raziel_context", "fn_research_output_context_v1"].includes(s.name)));
const memoryWrites = () => pg.statements.filter((s) => s.kind === "insert" || (s.kind === "rpc" && ["fn_raziel_remember", "fn_raziel_fact", "fn_mem_add"].includes(s.name)));
const begin = () => { pg.statements.length = 0; return { stamp: pg.stamp(), personal: personalRows().length }; };
// nothing personal was stored and no existing row changed (full content)
const nothingStored = (before, label) => {
  const after = pg.stamp();
  assert.equal(after.original, before.stamp.original, `${label}: the full content of every existing row is unchanged`);
  assert.equal(personalRows().length, before.personal, `${label}: no new personal-memory row`);
};

// M-15: a stored thread exists and several NEW messages arrive, each depending on the previous one.
async function fourTurns(name, token, extraBody, expect) {
  const h = siteThreadHandler(name, pg);
  const history = [];
  for (const [i, message] of TURNS.entries()) {
    const seen = h.models.length;
    const r = await h.call({ ...extraBody, message, history: [...history] }, token);
    assert.equal(r.status, 200, `${name} turn ${i + 1}`);
    assert.ok(r.body.answer && !r.body.degraded, `${name} turn ${i + 1}: the person gets an answer`);
    const prompt = h.models.slice(seen).map((m) => m.user).join("\n");
    await expect({ i, message, r, prompt, history: [...history] });
    history.push({ role: "user", text: message }, { role: "assistant", text: r.body.answer });
  }
  return h;
}
const closedTurn = (name, reasonOf) => ({ i, message, r, prompt, history }) => {
  assert.ok(prompt.includes(message), `${name} turn ${i + 1}: the new message is in the context`);
  for (const h of history) assert.ok(prompt.includes(h.text), `${name} turn ${i + 1}: the earlier NEW turns are in the context (${h.text.slice(0, 20)})`);
  assert.doesNotMatch(prompt, STORED, `${name} turn ${i + 1}: no stored memory in the context`);
  assert.equal(r.body.persisted, false, `${name} turn ${i + 1}: the status is "not saved"`);
  assert.equal(r.body.memory.saved, false);
  assert.equal(r.body.memory.read_allowed, false);
  assert.equal(r.body.memory.reason, reasonOf);
};

async function siteThreadsClosed(label, reason) {
  for (const [name, token, body] of [["number-researcher", "token-user-a", { values: [787] }], ["raziel-attention", "token-admin-a", { digest: null, profile: "ZURIEL_RESEARCH" }]]) {
    const before = begin();
    const h = await fourTurns(name, token, body, closedTurn(name, reason));
    assert.deepEqual(memoryReads(), [], `${label} ${name}: the stored thread and the stored context are not read at all`);
    assert.deepEqual(memoryWrites(), [], `${label} ${name}: nothing is sent to a writer`);
    nothingStored(before, `${label} ${name}`);
    // M-14: after a reload the stored thread is not returned, and the caller is told why
    const reload = await h.call({ op: "history" }, token);
    assert.deepEqual(reload.body.history, []); assert.equal(reload.body.snapshot, null);
    assert.deepEqual(reload.body.memory, { read_allowed: false, reason, policy: reason === "policy_unavailable" ? null : "cl13_pause_v1" });
    assert.deepEqual(memoryReads(), [], `${label} ${name}: the reload does not read the stored thread either`);
  }
}

async function aiAnalyzeClosed(label) {
  const before = begin();
  // R7 / M-11: an identified site caller (the path that used the shared memory: a request without the 2029 research contract)
  const site = await aiAnalyzeOnPg(pg, { bearer: USER_JWT, verifiedUid: UA });
  assert.equal(site.status, 200); assert.equal(site.models.length, 1, "the answer is still produced");
  assert.doesNotMatch(JSON.stringify(site.models.map((m) => [m.system, m.user])), STORED, `${label}: no stored memory reaches the model`);
  // R1: the trusted WhatsApp channel of a linked sender reads the same context
  const wa = await aiAnalyzeOnPg(pg, { bearer: SERVICE_KEY, trustedUid: UA, body: { surface: "whatsapp", visitor_id: undefined, trusted_channel: { channel: "whatsapp", sender: "972500000001", depth: false } } });
  assert.equal(wa.status, 200);
  assert.doesNotMatch(JSON.stringify(wa.models.map((m) => [m.system, m.user])), STORED, `${label}: no stored memory reaches the model on WhatsApp`);
  // R8 / M-12: an anonymous site caller is not a person: no policy read, no memory call of any kind
  pg.statements.length = 0;
  const anonymous = await aiAnalyzeOnPg(pg, { bearer: "" });
  assert.deepEqual(pg.statements, [], `${label}: an anonymous caller touches no memory function`);
  assert.ok([200, 401].includes(anonymous.status));
  assert.deepEqual(memoryReads(), []); assert.deepEqual(memoryWrites(), []);
  nothingStored(before, `${label} ai-analyze`);
}

const PROFILE_TEXT = "שמי דוד כהן. מה הגימטריה של אור?";
async function waRazielClosed(label) {
  for (const linked of [true, false]) {
    const before = begin();
    const run = await waRazielOnPg(pg, { text: PROFILE_TEXT, linked });
    const who = `${label} wa-raziel ${linked ? "linked" : "without an account"}`;
    assert.ok(run.sent.length >= 1 && run.sent.every((m) => String(m.message || "").trim().length > 0), `${who}: the person gets an answer`);
    assert.deepEqual(memoryReads(), [], `${who}: no stored memory is read`);
    assert.deepEqual(memoryWrites(), [], `${who}: nothing is sent to a writer (M-1, M-8, M-9)`);
    assert.equal(run.inserts.some((x) => x.row?.action === "raziel_facts" || /facts-captured/.test(String(x.row?.reply_out))), false, `${who}: no "captured facts" record in any other store (M-9)`);
    assert.ok(run.inserts.some((x) => x.table === "wa_bot_log" && x.row?.action === "raziel_dm"), `${who}: the operational log is still written (M-2)`);
    assert.doesNotMatch(JSON.stringify(run.aiCalls), STORED, `${who}: no stored memory is sent on`);
    nothingStored(before, who);
  }
}

// M-7, M-10: a group. The sender is a linked account holder with stored memory; the message names the assistant and a profile detail.
async function waRazielGroupClosed(label) {
  const before = begin();
  const run = await waRazielGroupOnPg(pg, { text: `רזיאל, ${PROFILE_TEXT}` });
  assert.ok(run.sent.some((m) => m.chatId === GROUP && String(m.message || "").trim()), `${label} group: the group gets an answer`);
  assert.equal(run.modelCalls.length, 1, `${label} group: the answer comes from the model`);
  assert.doesNotMatch(JSON.stringify(run.modelCalls), STORED, `${label} group: no stored memory in the prompt of a group answer (M-7)`);
  assert.doesNotMatch(JSON.stringify(run.sent), STORED, `${label} group: no stored memory in what is sent`);
  assert.deepEqual(memoryReads(), [], `${label} group: no stored memory is read`);
  assert.deepEqual(memoryWrites(), [], `${label} group: nothing is remembered and no profile detail is extracted (M-7, M-10)`);
  assert.equal(run.inserts.some((x) => x.row?.action === "raziel_facts"), false);
  nothingStored(before, `${label} group`);
}

// What the model of a research bot returns: one clean finding, one "finding" that carries a personal detail (a synthetic phone
// for one bot, a name for the other), and the question it asked. Every text carries the tag of the run.
const BOTS = ["wa-hatishbi", "wa-uriel"];
const letterOf = (name) => (name === "wa-hatishbi" ? "H" : "U");
const researchType = (name) => (name === "wa-hatishbi" ? "research_note" : "method_discovery");
const botReply = (name, tag) => name === "wa-hatishbi"
  ? `שמעתי את מה שהבאת ואני משקף אותו במילים שלי, עם שאלה אחת להמשך.\n— התשבי · סוד 1820\n###למידות###\n{"learnings":[{"topic":"NEW-TOPIC-H-${tag}","claim":"NEW-FINDING-H-${tag}","interpretation":"i"},{"topic":"NEW-TOPIC-PERSONAL-H-${tag}","claim":"NEW-PERSONAL-H-${tag}: הטלפון שלה 050-0000002","interpretation":"i"}],"question_asked":"NEW-QUESTION-H-${tag}"}`
  : `קיבלתי את מה שהבאת ואני משקף אותו במילים שלי, עם שאלה אחת להמשך הלימוד.\n— אוריאל · סוד 1820\n###למידות###\n{"learnings":[{"word":"NEW-WORD-U-${tag}","decomposed_form":"x","interpretation":"NEW-FINDING-U-${tag}"},{"word":"NEW-WORD-PERSONAL-U-${tag}","decomposed_form":"y","interpretation":"NEW-PERSONAL-U-${tag}: שמי רחל"}],"question_asked":"NEW-QUESTION-U-${tag}"}`;
const freshOf = (name, tag) => pg.newRows().filter((r) => r.user_ref === BOT_PERSON[name] && JSON.stringify([r.topic, r.content]).includes(tag)).map((r) => [r.memory_type, r.content.replace(/:.*$/, "")]).sort();
const promptOf = (run) => run.models.map((m) => m.user).join("\n");

// No policy function in the database (the Edge code before the proposal, or after its rollback): the bot answers, and its
// research memory is closed with everything else - nothing is read and nothing is stored. Research needs the database to
// decide row by row what is personal, so without the database nothing is taken on trust.
async function botsClosed(label, tag) {
  for (const name of BOTS) {
    const before = begin();
    const run = await runResearchBot(name, pg, { incomingText: "הודעה חדשה מהאדם על השיטה", modelText: botReply(name, tag) });
    assert.equal(run.body.replies, 1, `${label} ${name}: ${JSON.stringify(run.body)}`);
    assert.equal(run.sent.length, 1, `${label} ${name}: the person gets an answer`);
    assert.doesNotMatch(promptOf(run), STORED, `${label} ${name}: neither the stored questions nor the stored findings join the prompt`);
    assert.deepEqual(memoryReads(), [], `${label} ${name}: the stored rows are not read, directly or through the reader`);
    assert.deepEqual(memoryWrites(), [], `${label} ${name}: nothing is sent to a writer`);
    assert.deepEqual(freshOf(name, tag), [], `${label} ${name}: nothing was stored`);
    assert.ok(run.inserts.some((x) => x.table === "wa_bot_log") && run.inserts.some((x) => x.table === "ai_token_log"), `${label} ${name}: operational logs are still written (M-2)`);
    nothingStored(before, `${label} ${name}`);
  }
}

// The reviewed pause. Authorised research IS available: the stored findings join the prompt and the new finding is stored.
// A personal detail does not pass under the label "research": the stored "finding" that carries one is withheld, the new one
// is not stored, and the questions (personal memory) are neither read nor written.
async function botsPaused(label, tag) {
  for (const name of BOTS) {
    const before = begin(), person = BOT_PERSON[name], letter = letterOf(name);
    const withheld = pg.rpc("fn_research_output_context_v1", { p_user_ref: person, p_agent: name.slice(3) }).data;
    pg.statements.length = 0;
    const run = await runResearchBot(name, pg, { incomingText: "הודעה חדשה מהאדם על השיטה", modelText: botReply(name, tag) });
    assert.equal(run.body.replies, 1, `${label} ${name}: ${JSON.stringify(run.body)}`);
    assert.equal(run.sent.length, 1, `${label} ${name}: the person gets an answer`);
    const prompt = promptOf(run);
    // allowed: the research without a personal detail is in the prompt
    assert.match(prompt, new RegExp(`OLD-BOT-FINDING-${letter}`), `${label} ${name}: the stored research is available during the pause`);
    if (name === "wa-uriel") assert.match(prompt, /OLD-BOT-RULE-U/, `${label} ${name}: the stored letter rules are available during the pause`);
    // refused: a personal detail inside a research row, and the questions
    assert.doesNotMatch(prompt, /OLD-BOT-PERSONAL/, `${label} ${name}: a "research" row with a personal detail does not join the prompt`);
    assert.doesNotMatch(prompt, /OLD-BOT-QUESTION/, `${label} ${name}: the stored questions (personal memory) do not join the prompt`);
    assert.doesNotMatch(prompt, /050-0000001|r@example\.invalid|נולדתי/, `${label} ${name}: none of the stored personal details reaches the model`);
    assert.equal(withheld.allowed, true); assert.equal(withheld.withheld_personal, name === "wa-hatishbi" ? 1 : 2, `${label} ${name}: the reader says how many rows it withheld`);
    // the table is never read directly: research comes from the one reader, for this person and this bot only
    assert.deepEqual(pg.statements.filter((s) => s.kind === "select"), [], `${label} ${name}: no direct read of the memory table`);
    assert.deepEqual(memoryReads().map((s) => [s.name, s.args]), [["fn_research_output_context_v1", { p_user_ref: person, p_agent: name.slice(3) }]]);
    // written: the clean finding only. The writer was asked for both findings and stored one; the question was not sent at all.
    assert.deepEqual(memoryWrites().map((s) => [s.name, s.args.p_memory_type]), [["fn_mem_add", researchType(name)], ["fn_mem_add", researchType(name)]]);
    assert.deepEqual(freshOf(name, tag), [[researchType(name), `NEW-FINDING-${letter}-${tag}`]], `${label} ${name}: the research output is stored; the "finding" with a personal detail and the question are not`);
    assert.ok(run.inserts.some((x) => x.table === "wa_bot_log") && run.inserts.some((x) => x.table === "ai_token_log"), `${label} ${name}: operational logs are still written (M-2)`);
    nothingStored(before, `${label} ${name}`);
  }
}

// a later policy version, simulated inside the throwaway database only (the SQL test does the same)
const simulate = ({ persons, profileFacts = false, research = true }) => pg.run(`
  create or replace function public.fn_personal_memory_policy_v1(p_user_ref text) returns jsonb language sql stable set search_path to 'public', 'pg_temp' as $f$
    select jsonb_build_object('policy', 'SIMULATED_CONSENT', 'write_personal', p_user_ref = any(array[${persons.map((p) => `'${p}'`).join(",")}]),
      'write_profile_facts', ${profileFacts} and p_user_ref = any(array[${persons.map((p) => `'${p}'`).join(",")}]),
      'read_personal', p_user_ref = any(array[${persons.map((p) => `'${p}'`).join(",")}]),
      'research_output_write', ${research}, 'research_output_read', ${research}, 'consent', null, 'reason', 'no consent of this person') $f$;`);

if (!pg) {
  test("CL-13 handler tests need the throwaway PostgreSQL of scripts/run-cl13-personal-memory-handlers-test.sh", { skip: "start them with the runner script" }, () => {});
} else {
  // ───────────────────────── BEFORE: the Edge code deployed before the database proposal ─────────────────────────
  test("BEFORE 0: the live database reads memory without consent and has no policy function (what the Edge gate cannot rely on)", () => {
    const ctx = pg.rpc("fn_raziel_context", { p_user_ref: UA, p_channel: "site" }).data;
    assert.match(ctx.user_context.summary, /OLD-SITE-THREAD-A3/); assert.equal(ctx.privacy.personal_memory_allowed, true);
    assert.match(JSON.stringify(ctx), /BARE-PHONE-MEMORY-OF-A/, "live: a memory recorded under the bare phone is merged into the account through the link");
    assert.equal(pg.rpc("fn_personal_memory_policy_v1", { p_user_ref: UA }).status, 404);
  });
  test("BEFORE 1 (M-14, M-15): the two site threads use the NEW turns, read no stored thread, store nothing, and say so", () => siteThreadsClosed("BEFORE", "policy_unavailable"));
  test("BEFORE 2 (M-11, M-12): ai-analyze answers without stored memory and stores nothing", () => aiAnalyzeClosed("BEFORE"));
  test("BEFORE 3 (M-1, M-8, M-9): wa-raziel answers a linked sender and a sender without an account; nothing is stored or extracted", () => waRazielClosed("BEFORE"));
  test("BEFORE 4 (M-2, M-13): without the policy function the research bots answer, read nothing and store nothing", () => botsClosed("BEFORE", "RUN-BEFORE"));
  test("BEFORE 5 (M-7, M-10): in a group nothing personal is read, exposed, remembered or extracted", () => waRazielGroupClosed("BEFORE"));

  // ───────────────────────── PAUSED: the proposal applied ─────────────────────────
  test("PAUSED 0: the proposal applies on the state the Edge-first run left, and its policy is the one the handler tests assume", () => {
    pg.file(APPLY);
    assert.deepEqual(pg.rpc("fn_personal_memory_policy_v1", { p_user_ref: UA }).data, PAUSED_POLICY);
    const ctx = pg.rpc("fn_raziel_context", { p_user_ref: UA, p_channel: "site" }).data;
    assert.doesNotMatch(JSON.stringify(ctx), STORED); assert.equal(ctx.privacy.personal_memory_allowed, false);
  });
  test("PAUSED 1 (M-14, M-15): the two site threads use the NEW turns, read no stored thread, store nothing, and say so", () => siteThreadsClosed("PAUSED", PAUSED_POLICY.reason));
  test("PAUSED 2 (M-11, M-12): ai-analyze answers without stored memory and stores nothing", () => aiAnalyzeClosed("PAUSED"));
  test("PAUSED 3 (M-1, M-8, M-9): wa-raziel answers a linked sender and a sender without an account; nothing is stored or extracted", () => waRazielClosed("PAUSED"));
  test("PAUSED 4 (M-2, M-13, research rule): authorised research is read and stored during the pause; a personal detail inside research, and the questions, are not", () => botsPaused("PAUSED", "RUN-PAUSED"));
  test("PAUSED 6 (M-7, M-10): in a group nothing personal is read, exposed, remembered or extracted", () => waRazielGroupClosed("PAUSED"));
  test("PAUSED 5: a writer that ignores the policy is refused by the database with an error, and the status is still honest", async () => {
    // the direct write of the site thread, as the Edge code of origin/main sends it (no policy check): the trigger answers
    const before = begin();
    const refused = pg.rest("https://fixture.invalid/rest/v1/agent_user_memory?select=id", { method: "POST", headers: { Prefer: "return=representation" },
      body: JSON.stringify({ user_ref: UA, channel: "site", agent: "raziel", memory_type: "conversation", memory_scope: "personal", visibility: "private", source: "site", topic: "t", content: "NEW-DIRECT-WRITE", data: {} }) });
    assert.equal(refused.status, 400);
    assert.equal((await refused.json()).message, "personal memory is paused (CL-13): INSERT of a conversation row for agent raziel is refused; nothing was saved");
    for (const [name, args] of [["fn_raziel_remember", { p_user_ref: UA, p_channel: "site", p_content: "NEW-REMEMBER" }], ["fn_raziel_fact", { p_user_ref: UA, p_channel: "site", p_kind: "city", p_value: "NEW-FACT" }],
      ["fn_mem_add", { p_user: BOT_PERSON["wa-hatishbi"], p_agent: "hatishbi", p_memory_type: "conversation", p_content: "NEW-QUESTION" }]]) {
      assert.deepEqual(pg.rpc(name, args), { data: null, error: null, status: 200 }, `${name} returns NULL = not saved`);
    }
    nothingStored(before, "PAUSED direct writers");
  });

  // ───────────────────────── CONSENT: a simulated later policy version (person A only) ─────────────────────────
  test("CONSENT 1 (M-4, M-15 second half): with a consent the stored thread is read and each turn is stored; the status is real", async () => {
    pg.run("create table public.cl13_reviewed_policy as select pg_get_functiondef('public.fn_personal_memory_policy_v1(text)'::regprocedure) as def;");
    simulate({ persons: [UA] });
    for (const [name, token, body] of [["number-researcher", "token-user-a", { values: [787] }], ["raziel-attention", "token-admin-a", { digest: null, profile: "ZURIEL_RESEARCH" }]]) {
      const before = begin();
      const stored = pg.scalar(`(select count(*) from public.agent_user_memory where user_ref = '${UA}' and channel = 'site' and memory_type = 'conversation' and source = 'site')`);
      const h = await fourTurns(name, token, body, ({ i, message, r, prompt }) => {
        assert.match(prompt, /OLD-SITE-THREAD-A3/, `${name} turn ${i + 1}: the stored thread is read`);
        assert.ok(prompt.includes(message));
        assert.equal(r.body.persisted, true, `${name} turn ${i + 1}: saved`);
        assert.deepEqual(r.body.memory, { saved: true, read_allowed: true, reason: null, policy: "SIMULATED_CONSENT" });
        const row = pg.rows(`select content, data ->> 'reply' as reply from public.agent_user_memory where user_ref = '${UA}' and content = '${message}' order by created_at desc limit 1`)[0];
        assert.deepEqual(row, { content: message, reply: r.body.answer }, `${name} turn ${i + 1}: "saved" means a stored row with this turn`);
      });
      assert.equal(pg.scalar(`(select count(*) from public.agent_user_memory where user_ref = '${UA}' and channel = 'site' and memory_type = 'conversation' and source = 'site')`), stored + TURNS.length);
      assert.equal(pg.stamp().original, before.stamp.original, "the rows that existed before are still unchanged");
      const reload = await h.call({ op: "history" }, token);
      assert.ok(reload.body.history.some((x) => x.text === TURNS.at(-1)), "after a reload the thread, with the new turns, is returned");
      assert.equal(reload.body.memory.read_allowed, true);
    }
    // the consent of A opens nobody else
    const before = begin();
    const other = siteThreadHandler("number-researcher", pg);
    const r = await other.call({ values: [787], message: "שאלה של משתמש אחר", history: [] }, "token-user-b");
    assert.equal(r.body.persisted, false); assert.equal(r.body.memory.read_allowed, false);
    assert.doesNotMatch(other.models.map((m) => m.user).join("\n"), STORED);
    assert.deepEqual(memoryReads(), []); nothingStored(before, "CONSENT other person");
  });
  test("CONSENT 2 (M-4, M-6): ai-analyze reads the person's own memory (the assistant's research-typed rows included), without the phone memory", async () => {
    const before = begin();
    const site = await aiAnalyzeOnPg(pg, { bearer: USER_JWT, verifiedUid: UA });
    const prompt = JSON.stringify(site.models.map((m) => [m.system, m.user]));
    // the stored context is the ten most recent rows of the person: by now those are the turns stored in CONSENT 1
    assert.ok(prompt.includes(TURNS.at(-1)), "the stored memory of the consenting person joins the prompt");
    assert.doesNotMatch(prompt, /PRE-LINK-MEMORY-OF-A|BARE-PHONE-MEMORY-OF-A/, "no implied merge of a memory recorded under the phone (M-6)");
    assert.match(prompt, /OLD-RESEARCH-TYPED-ROW-OF-A/, "a research-typed row of the assistant is the person's own memory: read with the same consent (and never without it: PAUSED 2)");
    assert.equal(personalRows().length, before.personal + 1, "this turn was remembered (one row)");
    assert.equal(pg.stamp().original, before.stamp.original);
    // another person: still nothing
    const b = begin();
    const other = await aiAnalyzeOnPg(pg, { bearer: USER_JWT, verifiedUid: UB });
    assert.doesNotMatch(JSON.stringify(other.models.map((m) => [m.system, m.user])), STORED);
    assert.deepEqual(memoryReads(), []); assert.deepEqual(memoryWrites(), []); nothingStored(b, "CONSENT ai-analyze other person");
  });
  test("CONSENT 3 (M-8, D-CL13-3): with a consent to memory wa-raziel stores the message but NO profile detail; a detail needs its own grant", async () => {
    let before = begin();
    let run = await waRazielOnPg(pg, { text: PROFILE_TEXT, linked: true });
    assert.ok(run.sent.length >= 1);
    assert.deepEqual(memoryWrites().map((s) => s.name), ["fn_raziel_remember"], "the message is remembered; the fact writer is not called");
    assert.deepEqual(personalRows().slice(before.personal).map((r) => [r.memory_type, r.content]), [["conversation", PROFILE_TEXT]]);
    assert.equal(run.inserts.some((x) => x.row?.action === "raziel_facts"), false);
    // a sender without an account has no consent in this simulation: nothing
    before = begin();
    run = await waRazielOnPg(pg, { text: PROFILE_TEXT, linked: false });
    assert.deepEqual(memoryWrites(), []); nothingStored(before, "CONSENT wa-raziel sender without an account");
    // the explicit grant for profile facts (the allowed counterpart): the fact is stored and only then recorded as captured
    simulate({ persons: [UA], profileFacts: true });
    before = begin();
    run = await waRazielOnPg(pg, { text: PROFILE_TEXT, linked: true });
    assert.ok(memoryWrites().some((s) => s.name === "fn_raziel_fact"));
    assert.ok(pg.newRows().some((r) => r.memory_type === "personal_context" && r.topic === "name" && r.user_ref === UA));
    assert.deepEqual(run.inserts.filter((x) => x.row?.action === "raziel_facts").map((x) => x.row.reply_out), ["[facts-captured] name"]);
    assert.equal(pg.stamp().original, before.stamp.original);
    simulate({ persons: [UA] });
  });
  test("CONSENT 4 (M-13, research rule): with the person's consent the questions and the research that carries a personal detail are read and stored too; without the research grant no research is", async () => {
    for (const name of BOTS) {
      const person = BOT_PERSON[name], letter = letterOf(name);
      // the consent of ANOTHER person opens nothing personal for this one: still exactly the paused behaviour
      simulate({ persons: [UA] });
      let run = await runResearchBot(name, pg, { incomingText: "הודעה נוספת", modelText: botReply(name, "RUN-OTHER") });
      assert.match(promptOf(run), new RegExp(`OLD-BOT-FINDING-${letter}`)); assert.doesNotMatch(promptOf(run), /OLD-BOT-PERSONAL|OLD-BOT-QUESTION/, `${name}: somebody else's consent opens nothing personal`);
      assert.deepEqual(freshOf(name, "RUN-OTHER"), [[researchType(name), `NEW-FINDING-${letter}-RUN-OTHER`]]);
      // the consent of this person (the allowed counterpart of every refusal of PAUSED 4)
      simulate({ persons: [person] });
      run = await runResearchBot(name, pg, { incomingText: "הודעה שלישית", modelText: botReply(name, "RUN-CONSENT") });
      let prompt = promptOf(run);
      assert.match(prompt, new RegExp(`OLD-BOT-QUESTION-${letter}`), `${name}: the stored questions are read with the consent`);
      assert.match(prompt, new RegExp(`OLD-BOT-FINDING-${letter}`), `${name}: the research is read`);
      assert.match(prompt, new RegExp(`OLD-BOT-PERSONAL-${letter}`), `${name}: with the consent the research that carries a personal detail is read too`);
      assert.deepEqual(freshOf(name, "RUN-CONSENT"), [["conversation", `NEW-QUESTION-${letter}-RUN-CONSENT`], [researchType(name), `NEW-FINDING-${letter}-RUN-CONSENT`], [researchType(name), `NEW-PERSONAL-${letter}-RUN-CONSENT`]].sort(), `${name}: the question, the finding and the finding with a personal detail are stored`);
      // a policy that does not grant research (the closed counterpart of the research grant): personal memory as consented, no research
      simulate({ persons: [person], research: false });
      pg.statements.length = 0;
      run = await runResearchBot(name, pg, { incomingText: "הודעה רביעית", modelText: botReply(name, "RUN-NORESEARCH") });
      prompt = promptOf(run);
      assert.match(prompt, new RegExp(`OLD-BOT-QUESTION-${letter}`)); assert.doesNotMatch(prompt, /OLD-BOT-FINDING|OLD-BOT-RULE|OLD-BOT-PERSONAL|NEW-FINDING/, `${name}: without the research grant no research joins the prompt`);
      assert.equal(pg.statements.some((s) => s.name === "fn_research_output_context_v1"), false, `${name}: the reader is not asked`);
      assert.deepEqual(freshOf(name, "RUN-NORESEARCH"), [["conversation", `NEW-QUESTION-${letter}-RUN-NORESEARCH`]], `${name}: no research is stored without the research grant`);
    }
  });

  test("CONSENT 5 (M-7, M-10): even when the sender consented, a group gets no personal context and no profile detail", async () => {
    simulate({ persons: [UA], profileFacts: true });
    const before = begin();
    const run = await waRazielGroupOnPg(pg, { text: `רזיאל, ${PROFILE_TEXT}` });
    assert.ok(run.sent.some((m) => m.chatId === GROUP));
    assert.doesNotMatch(JSON.stringify(run.modelCalls), STORED, "no stored memory in the prompt of a group answer, with a consent too");
    // (the unrelated private message of the same run may read the sender's own context for the PRIVATE chat: that is allowed)
    assert.deepEqual(memoryReads().filter((s) => s.args?.p_channel !== `${"972500000001"}@c.us`), [], "the stored context is not read for a group");
    // the consenting sender's own message may be remembered (the target of R3); a profile detail is never taken from a group
    const groupWrites = memoryWrites().filter((s) => s.args?.p_channel === GROUP);
    assert.deepEqual(groupWrites.map((s) => [s.name, s.args.p_user_ref]), [["fn_raziel_remember", UA]]);
    assert.equal(memoryWrites().some((s) => s.name === "fn_raziel_fact" && s.args.p_channel === GROUP), false, "no profile fact from a group (M-10)");
    assert.equal(pg.stamp().original, before.stamp.original);
    simulate({ persons: [UA] });
  });

  // ───────────────────────── ROLLBACK: the Edge code stays closed when the database goes back ─────────────────────────
  test("ROLLBACK: after the rollback of the proposal the handlers are still closed (no policy function = no write, no read)", async () => {
    // the reviewed policy back (the rollback continues only on exactly the applied state), then the rollback file
    pg.run("do $r$ begin execute (select def from public.cl13_reviewed_policy); end $r$;");
    pg.file(ROLLBACK);
    assert.equal(pg.rpc("fn_personal_memory_policy_v1", { p_user_ref: UA }).status, 404);
    const live = pg.rpc("fn_raziel_context", { p_user_ref: UA, p_channel: "site" }).data;
    assert.ok(live.privacy.personal_memory_allowed === true && live.user_context.summary.includes(TURNS.at(-1)) && !("policy" in live.privacy), "the database is the live one again: it reads memory without consent");
    await siteThreadsClosed("ROLLBACK", "policy_unavailable");
    await waRazielClosed("ROLLBACK");
    await botsClosed("ROLLBACK", "RUN-ROLLBACK");
  });
}
