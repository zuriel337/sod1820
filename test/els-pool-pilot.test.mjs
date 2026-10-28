import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { pageLetters } from "../experiments/els-live-reading/build-windows.mjs";
import { TORAH_LENGTH } from "../experiments/els-live-reading/lib/metrics.mjs";
import { DEFAULTS, loadContext, regionPathOf, round1RequestV2 } from "../experiments/els-live-reading/lib/context.mjs";
import { BudgetStop, pipeline } from "../experiments/els-live-reading/lib/orchestrate.mjs";
import { guardSpend, loadLedger, settledOf, spentOf } from "../experiments/els-live-reading/lib/ledger.mjs";
import { lockSha256, requestSha256 } from "../experiments/els-live-reading/lib/request.mjs";
import { ARMS, DIAGNOSTIC_PRIORITY, MODELS, RUNS, poolIdOf, runById } from "../experiments/els-pool-selection/lib/plan.mjs";
import { FREE_RUN, estimateTokens, poolFile, prepareAll, prepareRun } from "../experiments/els-pool-selection/lib/prepare.mjs";
import { evaluateAnswer, poolPipeline, requestOf } from "../experiments/els-pool-selection/lib/pilot.mjs";
import { ERROR_CODES, groupStats, parseAnswer, termsOf, validateAnswer } from "../experiments/els-pool-selection/lib/validate.mjs";
import { ANSWER_SCHEMA, HINT_STRUCTURE, buildPacket } from "../experiments/els-pool-selection/lib/packet.mjs";
import { PILOT_BUDGET, PILOT_CAP_USD, PRIOR_SPEND_USD, ledgerSeed, planMarkdown, planReview } from "../experiments/els-pool-selection/run-pilot.mjs";

const DIR = fileURLToPath(new URL("../experiments/els-pool-selection/", import.meta.url));
const PAGE = fileURLToPath(new URL("../public/tzofen.html", import.meta.url));
const TORAH = pageLetters(PAGE).slice(0, TORAH_LENGTH);
const REAL = poolFile("real");

test("plan: 22 runs with unique ids, blind arms carry no hint, diagnostic arms are marked and run last, controls are tiles", () => {
  assert.equal(RUNS.length, 22);
  assert.equal(new Set(RUNS.map((r) => r.id)).size, RUNS.length);
  for (const r of RUNS) {
    assert.ok(MODELS[r.model], r.id);
    assert.equal(r.series, ARMS[r.arm].series);
    if (r.series === "blind") assert.equal(ARMS[r.arm].hint ?? null, null, `${r.id} is blind: no hint`);
    if (r.series === "diagnostic") assert.ok(r.priority >= DIAGNOSTIC_PRIORITY, `${r.id} diagnostics run after the blind arms`);
  }
  assert.deepEqual([...new Set(RUNS.filter((r) => r.arm === "B3").map((r) => poolIdOf(r)))].sort(), ["t01", "t02", "t03", "t04", "t05", "t06", "t07", "t08"]);
  assert.equal(RUNS.filter((r) => r.model === "fable").length, 3, "Fable only on B1, B2 and D1");
  assert.equal(RUNS.filter((r) => r.arm === "B3" && r.model === "fable").length, 0);
  assert.throws(() => runById("nope"), /unknown run/);
});

test("plan: the committed plan-review equals what the code builds now (hashes cannot drift silently), and the cost bounds fit the pilot cap", () => {
  const prepared = prepareAll();
  const review = planReview(prepared);
  const committed = JSON.parse(readFileSync(`${DIR}controls/plan-review.json`, "utf8"));
  assert.deepEqual(JSON.parse(JSON.stringify(review)), committed);
  assert.equal(readFileSync(`${DIR}controls/plan-review.md`, "utf8"), planMarkdown(review));
  assert.ok(review.totals.worst_case_if_every_run_used_max_tokens_usd <= PILOT_CAP_USD, "even if every run used max_tokens the plan stays inside the pilot cap");
  assert.ok(review.totals.expected_usd < PILOT_CAP_USD - 1);
  assert.deepEqual(review.function.models.sort(), Object.values(MODELS).map((m) => m.id).sort());
  assert.equal(review.function.approved_lock_sha256.length, 22);
  assert.equal(review.function.round2, "none");
  const seed = JSON.parse(readFileSync(`${DIR}controls/budget-ledger.seed.json`, "utf8"));
  assert.deepEqual(seed, JSON.parse(JSON.stringify(ledgerSeed())));
});

test("requests: same prompt for the same arm, the unnamed arm never carries the axis phrase, the hint appears only in D2, the free arm is the EXP-16 request apart from the model", () => {
  const byId = new Map(prepareAll().map((p) => [p.run.id, p]));
  const text = (id) => `${byId.get(id).request.system}\n${byId.get(id).request.messages[0].content}`;
  assert.equal(text("B1-sonnet-1"), text("B1-fable-1"), "the model changes the settings, not the words");
  assert.equal(text("B1-sonnet-1"), text("B1-haiku-1"));
  assert.equal(requestSha256(byId.get("B1-sonnet-1").request), requestSha256(byId.get("B1-sonnet-3").request), "repeats are identical requests");
  assert.notEqual(requestSha256(byId.get("B1-sonnet-1").request), requestSha256(byId.get("B1-fable-1").request));
  const axis = REAL.axis.term;
  assert.match(axis, /^[א-ת]{4,}$/u, "the axis phrase is a real word of the pool file, not null");
  assert.equal(text("B1-sonnet-1").includes(axis), false);
  assert.equal(text("B2-sonnet-1").includes(`„${axis}”`), true);
  assert.equal(text("D1-sonnet-1").includes(`„${axis}”`), true);
  assert.equal(text("B2-fable-1").includes(`„${axis}”`), true);
  for (const p of byId.values()) assert.equal(/null|undefined|NaN/.test(`${p.request.system}\n${p.request.messages[0].content}`), false, `${p.run.id}: no placeholder leaked into the request`);
  for (const id of byId.keys()) assert.equal(text(id).includes(HINT_STRUCTURE), id.startsWith("D2"), id);
  for (const [id, p] of byId) {
    assert.equal(p.request.output_config.effort, "medium", id);
    assert.deepEqual(p.request.thinking, { type: "adaptive", display: "summarized" }, id);
    assert.equal(p.request.max_tokens, MODELS[p.run.model].maxTokens);
    assert.ok(!("tools" in p.request) && !("tool_choice" in p.request), `${id}: no tools, no forced tool use`);
  }
  assert.deepEqual(byId.get("B1-sonnet-1").request.output_config.format.schema, ANSWER_SCHEMA);
  const ctx = loadContext(PAGE, { regionPath: regionPathOf("u1") });
  const { request: exp16 } = round1RequestV2(ctx, FREE_RUN, DEFAULTS);
  const free = byId.get("F-sonnet-1").request;
  assert.equal(free.system, exp16.system);
  assert.deepEqual(free.messages, exp16.messages);
  assert.deepEqual(free.output_config.format, exp16.output_config.format);
  assert.equal(free.model, "claude-sonnet-5-5");
  // control tiles get the same prompt as B1 (only the data differ)
  const sentences = (s) => s.split("\n").filter((l) => !/^(F\d{3}|R\d{4})\|/.test(l));
  const t01 = byId.get("B3-sonnet-1").request.messages[0].content.split("\n");
  assert.equal(t01.filter((l) => /^F\d{3}\|/.test(l)).length, poolFile("t01").items.length);
  assert.equal(sentences(text("B1-sonnet-1")).filter((l) => /^## (המשימה|הרקע)/.test(l)).length, sentences(`${text("B3-sonnet-1")}`).filter((l) => /^## (המשימה|הרקע)/.test(l)).length);
  assert.ok(estimateTokens("שלום 123 abc") > 0);
});

test("requests: no saved word is in any request, and no request reads the saved comparison", () => {
  const saved = JSON.parse(readFileSync(`${DIR}evaluation/saved-cipher-u1.json`, "utf8"));
  const forced = JSON.parse(readFileSync(`${DIR}evaluation/d1-forced-ids.json`, "utf8")).forced.map((f) => f.text);
  const words = [...new Set(saved.findings.map((f) => f.t.replace(/[ןםץףך]/g, (c) => ({ ן: "נ", ם: "מ", ץ: "צ", ף: "פ", ך: "כ" })[c])))].filter((w) => w !== REAL.axis.term);
  for (const p of prepareAll()) {
    const text = `${p.request.system}\n${p.request.messages[0].content}`;
    if (p.run.arm === "D1") { for (const w of ["אירנ", "ארהב", "סיכנ"]) assert.ok(text.split("\n").some((l) => l.split("|")[1] === w), "D1 holds the forced words as ordinary items"); continue; }
    // outside D1 the rows of the item list are free of the words that were not in the word list
    const rows = text.split("\n").filter((l) => /^F\d{3}\|/.test(l)).map((l) => l.split("|")[1]);
    for (const w of ["אירנ", "ארהב", "סיכנ", "ארהבאששבת"]) assert.equal(rows.includes(w), false, `${p.run.id} lists ${w}`);
    // and the instruction prose (everything that is not a data row) never contains any of the saved words
    const prose = text.split("\n").filter((l) => !/^(F\d{3}|R\d{4})\|/.test(l)).join("\n");
    for (const w of words.filter((x) => x !== "ישראל")) assert.equal(prose.includes(w), false, `${p.run.id} prose contains ${w}`);
  }
  assert.equal(forced.length, 6);
});

// ---- validation ----
const listedOf = (pool) => buildPacket({ pool, arm: { named: false, hint: null } }).listedRelationIds;
const emptyAnswer = () => ({ groups: [], singles: [], phrases: [], continuations: [], chance_note: "" });
const check = (answer, pool = REAL) => validateAnswer({ pool, listedRelationIds: listedOf(pool), answer: { ...emptyAnswer(), ...answer } });
const codes = (v) => v.errors.map((e) => e.code);

test("validation: every deviation is recorded with a code, nothing is repaired", () => {
  assert.equal(parseAnswer("not json").code, "not_json");
  assert.equal(parseAnswer(JSON.stringify({ groups: [] })).code, "bad_shape");
  assert.equal(parseAnswer(JSON.stringify(emptyAnswer())).ok, true);
  const [a, b, c, d] = REAL.items;
  const listed = [...listedOf(REAL)];
  const rel = REAL.relations.find((r) => listed.includes(r.id));
  const outside = REAL.relations.find((r) => listed.includes(r.id) && r.a !== a.id && r.b !== a.id && r.a !== b.id && r.b !== b.id);
  const unlisted = REAL.relations.find((r) => !listed.includes(r.id));
  assert.ok(rel && outside && unlisted);
  const v = check({ groups: [
    { ids: [a.id, "F999"], relation_ids: ["R9999"], kind: "pair", why: `${a.id} and F999 at 12 cells` },
    { ids: [a.id, b.id], relation_ids: [outside.id, unlisted.id], kind: "chain", why: "x".repeat(500) },
    { ids: [c.id], relation_ids: [], kind: "pair", why: "" },
    { ids: [d.id, d.id], relation_ids: [], kind: "pair", why: "" },
  ], singles: [{ id: "F777", why: "q" }], chance_note: "7 relations" });
  for (const code of ["unknown_id", "relation_unknown", "digits_in_text", "id_in_two_groups", "kind_size_mismatch", "relation_outside_group", "relation_not_listed", "text_too_long", "group_too_small", "duplicate_id"]) assert.ok(codes(v).includes(code), `${code} recorded`);
  assert.ok(codes(v).every((code) => ERROR_CODES.includes(code)));
  assert.equal(v.groups[0].ids.includes("F999"), true, "the unknown id is kept in the record, not removed");
  // ids that appear in free text do not count as digits
  assert.equal(codes(check({ groups: [{ ids: [rel.a, rel.b], relation_ids: [rel.id], kind: "pair", why: `${rel.a} and ${rel.b} are joined by ${rel.id}` }] })).length, 0);
  // over-limit counts are recorded
  assert.ok(codes(check({ singles: Array.from({ length: 16 }, () => ({ id: a.id, why: "q" })) })).includes("over_limit"));
});

const chainOnOneLine = () => {
  for (const r of REAL.relations) {
    if (r.type !== "same_line" && r.type !== "continuation") continue;
    const x = REAL.items.find((i) => i.id === r.a), y = REAL.items.find((i) => i.id === r.b);
    if (x.family !== y.family || x.dir !== y.dir) continue;
    const v = check({ phrases: [{ ids: [x.id, y.id], why: "q" }] });
    if (!codes(v).length) return { x, y, v };
    const w = check({ phrases: [{ ids: [y.id, x.id], why: "q" }] });
    if (!codes(w).length) return { x: y, y: x, v: w };
  }
  return null;
};

test("validation: phrases must be items on one line in reading order; continuations must use exactly the letters shown, and both become engine items", () => {
  const found = chainOnOneLine();
  assert.ok(found, "the real pool holds two items on one line");
  const { x, y, v } = found;
  assert.equal(v.engineItems.length, 1);
  assert.equal(v.phrases[0].status, "local_ok");
  const items = termsOf(v.engineItems, TORAH);
  assert.equal(items[0].start, x.start);
  assert.equal(items[0].skip, x.skip);
  assert.ok(items[0].term.startsWith(x.text) && items[0].term.endsWith(y.text), "the phrase's term runs from the first letter of the first part to the last of the last");
  const reversed = check({ phrases: [{ ids: [y.id, x.id], why: "q" }] });
  assert.ok(codes(reversed).includes("phrase_not_contiguous"));
  const other = REAL.items.find((i) => i.family !== x.family);
  assert.ok(codes(check({ phrases: [{ ids: [x.id, other.id], why: "q" }] })).includes("phrase_not_contiguous"));
  assert.ok(codes(check({ phrases: [{ ids: [x.id], why: "q" }] })).includes("phrase_too_short"));
  // continuations
  const withBefore = REAL.items.find((i) => i.skip >= 2 && i.before.length >= 2 && i.after.length >= 2);
  const good = check({ continuations: [{ id: withBefore.id, before_letters: withBefore.before.slice(-2), after_letters: withBefore.after.slice(0, 1), why: "q" }] });
  assert.equal(codes(good).length, 0);
  const ext = good.engineItems[0];
  assert.equal(ext.length, withBefore.text.length + 3);
  const [term] = termsOf(good.engineItems, TORAH);
  assert.equal(term.term, `${withBefore.before.slice(-2)}${withBefore.text}${withBefore.after.slice(0, 1)}`);
  assert.equal(term.stream_letters, term.term, "the letters the model was shown are the letters of the stream at the extended start");
  assert.ok(codes(check({ continuations: [{ id: withBefore.id, before_letters: "תת", after_letters: "", why: "q" }] })).includes("continuation_letters_not_shown"));
  assert.ok(codes(check({ continuations: [{ id: withBefore.id, before_letters: "", after_letters: "", why: "q" }] })).includes("continuation_empty"));
  assert.ok(codes(check({ continuations: [{ id: "F999", before_letters: "א", after_letters: "", why: "q" }] })).includes("unknown_id"));
});

test("validation: group statistics (connected share, relation types, E) on a hand-built pool", () => {
  const items = [{ id: "F001", E: 3 }, { id: "F002", E: 0.2 }, { id: "F003", E: null }, { id: "F004", E: 5 }];
  const relations = [{ id: "R0001", a: "F001", b: "F002", type: "parallel" }, { id: "R0002", a: "F002", b: "F003", type: "crossing" }];
  const pool = { items, relations };
  const stats = groupStats(pool, new Set(["R0001"]), { ids: ["F001", "F002", "F003", "F004"] });
  assert.deepEqual([stats.size, stats.relations_any, stats.relations_listed, stats.connected_share_any, stats.connected_share_listed], [4, 2, 1, 0.75, 0.5]);
  assert.deepEqual(stats.types, ["crossing", "parallel"]);
  assert.deepEqual([stats.members_with_E_ge_1, stats.members_with_E_lt_1, stats.members_plain_text], [2, 1, 1]);
});

// ---- the life of one run (fakes) ----
function world({ answer, stop = "end_turn", resultType = null, createError = null, createStatus = null, upper = 0.4, spentExtra = 0, engine = "MATCH", creates = [] } = {}) {
  const dir = mkdtempSync(`${tmpdir()}/exp12-`);
  const ledgerPath = `${dir}/ledger.json`;
  copyFileSync(`${DIR}controls/budget-ledger.seed.json`, ledgerPath);
  if (spentExtra) { const l = JSON.parse(readFileSync(ledgerPath, "utf8")); l.entries.push({ id: "filler", usd: spentExtra }); writeFileSync(ledgerPath, JSON.stringify(l)); }
  const events = [], rpcCalls = [];
  const deps = {
    ledgerPath, budget: PILOT_BUDGET, diagnosticsMaxSpent: PILOT_BUDGET.diagnostics_max_spent_usd, now: () => "2026-10-28T12:00:00.000Z", log: (event, data) => events.push({ event, ...data }), torah: TORAH,
    verifyRpc: async (p) => { rpcCalls.push(p); return { verification_state: engine }; }, engineConcurrency: 2, pollMs: 1, maxWaitMs: 5_000, sleep: async () => {}, runDir: (id) => `${dir}/runs/${id}`,
    preflight: async (_c, request) => ({ ok: true, upper_bound_usd: upper, request_sha256: requestSha256(request), lock_sha256: lockSha256(request) }),
    client: { messages: { batches: {
      create: async (body, options) => { assert.equal(options.maxRetries, 0); creates.push(body); if (createError) throw Object.assign(new Error(createError), createStatus ? { status: createStatus } : {}); return { id: "msgbatch_fake1", created_at: "2026-10-28T12:00:00.000Z" }; },
      retrieve: async (id) => ({ id, processing_status: "ended", created_at: "2026-10-28T12:00:00.000Z", ended_at: "2026-10-28T12:02:00.000Z", request_counts: { succeeded: 1 } }),
    } } },
    fetchResults: async () => (resultType ? [{ custom_id: "els-live-1", result: { type: resultType } }] : [{ custom_id: "els-live-1", result: { type: "succeeded", message: { content: [{ type: "thinking", thinking: "t", signature: "s" }, { type: "text", text: typeof answer === "string" ? answer : JSON.stringify(answer) }], stop_reason: stop, model: "claude-sonnet-5-5", id: "msg_fake", usage: { input_tokens: 50_000, output_tokens: 20_000, output_tokens_details: { thinking_tokens: 12_000 } } } } }]),
  };
  return { dir, deps, events, ledgerPath, creates, rpcCalls };
}
const entryOf = (request) => ({ request_sha256: requestSha256(request), lock_sha256: lockSha256(request) });
const goodAnswer = () => {
  const rel = REAL.relations.find((r) => listedOf(REAL).has(r.id) && r.type === "parallel");
  const withBefore = REAL.items.find((i) => i.skip >= 2 && i.before.length >= 2 && i.after.length >= 1);
  return { groups: [{ ids: [rel.a, rel.b], relation_ids: [rel.id], kind: "pair", why: `${rel.a} and ${rel.b} run side by side` }], singles: [{ id: withBefore.id, why: "stands out" }], phrases: [], continuations: [{ id: withBefore.id, before_letters: withBefore.before.slice(-2), after_letters: withBefore.after.slice(0, 1), why: "extended by the letters shown" }], chance_note: "most relations here are chance" };
};

test("pilot pipeline (fakes): one batch, worst case reserved then replaced by the actual cost, answer saved first, validated and engine-checked, restart creates nothing", async () => {
  const run = runById("B1-sonnet-1");
  const { packet, request } = requestOf({ run, pool: REAL });
  const w = world({ answer: goodAnswer() });
  const out = await poolPipeline({ run, pool: REAL, packet, request, planEntry: entryOf(request), deps: w.deps });
  assert.equal(out.failed, undefined);
  assert.equal(w.creates.length, 1);
  assert.equal(out.usable, true);
  assert.equal(out.errors, 0);
  assert.equal(out.groups, 1);
  const dir = w.deps.runDir("B1-sonnet-1");
  for (const file of ["request-round1.json", "preflight-round1.json", "round1-response.json", "evaluation-round1.json", "state-round1.json"]) assert.ok(existsSync(`${dir}/${file}`), file);
  const ledger = JSON.parse(readFileSync(w.ledgerPath, "utf8"));
  assert.ok(ledger.entries.every((e) => !e.reserved));
  const mine = ledger.entries.find((e) => e.id === "B1-sonnet-1 round1");
  assert.equal(mine.usd, 0.5 * (50_000 * 2 + 20_000 * 10) / 1e6, "batch price from the usage object (Sonnet 5.5: 2 / 10 USD per MTok)");
  assert.equal(spentOf(ledger), Number((PRIOR_SPEND_USD + mine.usd).toFixed(6)));
  const evaluation = JSON.parse(readFileSync(`${dir}/evaluation-round1.json`, "utf8"));
  assert.equal(evaluation.continuations[0].status, "engine_confirmed");
  assert.equal(w.rpcCalls.length, 1, "the continuation was sent to the engine contract; the group needed no engine call");
  assert.ok(evaluation.groups[0].stats.size === 2);
  // restart: nothing new
  const again = await poolPipeline({ run, pool: REAL, packet, request, planEntry: entryOf(request), deps: w.deps });
  assert.equal(again.failed, undefined);
  assert.equal(w.creates.length, 1);
  assert.equal(JSON.parse(readFileSync(w.ledgerPath, "utf8")).entries.length, ledger.entries.length);
  // an engine that says MISMATCH makes the continuation "engine_not_confirmed", it is not repaired
  const w2 = world({ answer: goodAnswer(), engine: "MISMATCH" });
  const out2 = await poolPipeline({ run, pool: REAL, packet, request, planEntry: entryOf(request), deps: w2.deps });
  assert.equal(JSON.parse(readFileSync(`${w2.deps.runDir("B1-sonnet-1")}/evaluation-round1.json`, "utf8")).continuations[0].status, "engine_not_confirmed");
  assert.equal(out2.failed, undefined);
  // a plan mismatch is refused before anything is sent
  await assert.rejects(() => poolPipeline({ run, pool: REAL, packet, request: { ...request, max_tokens: 1 }, planEntry: entryOf(request), deps: world({ answer: goodAnswer() }).deps }), /differs from the reviewed plan/);
});

test("pilot pipeline (fakes): a cut answer, a failed batch, a refused create and an answer that is not JSON are recorded, counted and never retried; the guard stops at the pilot cap", async () => {
  const run = runById("B1-sonnet-1");
  const { packet, request } = requestOf({ run, pool: REAL });
  const plan = entryOf(request);
  let w = world({ answer: goodAnswer(), stop: "max_tokens" });
  let out = await poolPipeline({ run, pool: REAL, packet, request, planEntry: plan, deps: w.deps });
  assert.match(out.failed, /no usable answer/);
  assert.ok(settledOf(JSON.parse(readFileSync(w.ledgerPath, "utf8"))) > PRIOR_SPEND_USD, "the cost of a cut answer is counted");
  assert.equal(existsSync(`${w.deps.runDir(run.id)}/evaluation-round1.json`), false);
  w = world({ answer: "this is not json" });
  out = await poolPipeline({ run, pool: REAL, packet, request, planEntry: plan, deps: w.deps });
  assert.match(out.failed, /no usable answer/);
  w = world({ resultType: "errored" });
  out = await poolPipeline({ run, pool: REAL, packet, request, planEntry: plan, deps: w.deps });
  assert.match(out.failed, /errored/);
  assert.equal(settledOf(JSON.parse(readFileSync(w.ledgerPath, "utf8"))), PRIOR_SPEND_USD);
  out = await poolPipeline({ run, pool: REAL, packet, request, planEntry: plan, deps: w.deps });
  assert.match(out.failed, /errored/);
  assert.equal(w.creates.length, 1);
  w = world({ createError: '403 {"error":"request_not_approved"}', createStatus: 403 });
  out = await poolPipeline({ run, pool: REAL, packet, request, planEntry: plan, deps: w.deps });
  assert.match(out.failed, /batch create failed/);
  assert.equal(settledOf(JSON.parse(readFileSync(w.ledgerPath, "utf8"))), PRIOR_SPEND_USD, "a refused create costs nothing");
  // the guard: spent + worst case must stay under prior + 8
  w = world({ answer: goodAnswer(), upper: 2 * (PILOT_CAP_USD + 1) });
  await assert.rejects(() => poolPipeline({ run, pool: REAL, packet, request, planEntry: plan, deps: w.deps }), BudgetStop);
  assert.equal(w.creates.length, 0);
  assert.equal(guardSpend(loadLedger(w.ledgerPath), 2 * (PILOT_CAP_USD - 0.01), { budget: PILOT_BUDGET }).ok, true);
  assert.equal(guardSpend(loadLedger(w.ledgerPath), 2 * (PILOT_CAP_USD + 0.01), { budget: PILOT_BUDGET }).ok, false);
  // new calls stop above prior + 7
  w = world({ answer: goodAnswer(), spentExtra: 7.5 });
  await assert.rejects(() => poolPipeline({ run, pool: REAL, packet, request, planEntry: plan, deps: w.deps }), /stop level/);
  // diagnostic arms only while the settled spend is at most prior + 6
  const diag = runById("D1-sonnet-1");
  const d1 = poolFile("real-d1");
  const built = requestOf({ run: diag, pool: d1 });
  w = world({ answer: goodAnswer(), spentExtra: 6.5 });
  await assert.rejects(() => poolPipeline({ run: diag, pool: d1, packet: built.packet, request: built.request, planEntry: entryOf(built.request), deps: w.deps }), /diagnostics only while spent/);
  w = world({ answer: goodAnswer(), spentExtra: 5 });
  const ok = await poolPipeline({ run, pool: REAL, packet, request, planEntry: plan, deps: w.deps });
  assert.equal(ok.failed, undefined, "a blind arm may still run at that spend");
});

test("evaluateAnswer: an answer that is not valid JSON or has the wrong shape is a result, not an exception", async () => {
  const { packet } = requestOf({ run: runById("B1-sonnet-1"), pool: REAL });
  assert.equal((await evaluateAnswer({ pool: REAL, packet, text: "{", torah: TORAH, rpc: async () => ({}) })).ok, false);
  assert.equal((await evaluateAnswer({ pool: REAL, packet, text: "{}", torah: TORAH, rpc: async () => ({}) })).code, "bad_shape");
});

test("temporary function renderer: one or several allow-listed models, token hash and lock hashes required; the disabled version refuses everything", () => {
  const render = (...args) => spawnSync(process.execPath, [fileURLToPath(new URL("../experiments/els-live-reading/edge/render.mjs", import.meta.url)), ...args], { encoding: "utf8" });
  const token = "a".repeat(64), lock = "b".repeat(64);
  const live = render("live", "--token-sha256", token, "--approve", `${lock},${"c".repeat(64)}`, "--model", "claude-sonnet-5-5,claude-haiku-5-5", "--expires", "2026-10-30T00:00:00Z");
  assert.equal(live.status, 0, live.stderr);
  assert.match(live.stdout, /models: \["claude-sonnet-5-5","claude-haiku-5-5"\]/);
  assert.match(live.stdout, new RegExp(lock));
  assert.equal(render("live", "--token-sha256", token, "--approve", lock).status === 0, false, "a model list is required");
  assert.equal(render("live", "--token-sha256", token, "--approve", lock, "--model", "Bad Model!").status === 0, false);
  const single = render("live", "--token-sha256", token, "--approve", lock, "--model", "claude-fable-5-1");
  assert.match(single.stdout, /models: \["claude-fable-5-1"\]/, "a single model renders as before");
  assert.match(render("disabled").stdout, /410/);
});

test("free-proposal arm F (fakes): runs through the EXP-16 pipeline with the pilot budget, every proposal is verified by the engine contract, no continuation round", async () => {
  const p = prepareAll().find((item) => item.run.id === "F-sonnet-1");
  const ctx = p.ctx;
  const reading = [...ctx.byReading.values()].find((r) => r.id.startsWith("C") && r.id.endsWith("+"));
  const answer = { findings: [{ id: "F1", line: reading.id, text: reading.letters.slice(3, 8), parts: [], kind: "word", story_related: false, continue_from: true, from_finding: "", tier: "A", note: "n" }, { id: "F2", line: reading.id, text: "תתתתתת", parts: [], kind: "word", story_related: false, continue_from: false, from_finding: "", tier: "C", note: "invented" }], relations: [], groups: [], observations: "o" };
  const w = world({ answer });
  const localEngine = async ({ term, skip, pageSize }) => {
    const hits = [];
    const L = term.length;
    for (let s0 = 0; s0 < TORAH.length; s0 += 1) {
      if (s0 + (L - 1) * skip < TORAH.length && [...term].every((ch, j) => TORAH[s0 + j * skip] === ch)) hits.push({ start: s0, dir: 1, skip });
      if (s0 - (L - 1) * skip >= 0 && [...term].every((ch, j) => TORAH[s0 - j * skip] === ch)) hits.push({ start: s0, dir: -1, skip });
    }
    return { status: "OK", hits: hits.slice(0, pageSize), completion: { executed: true, has_more: hits.length > pageSize, truncated: hits.length > pageSize, returned_hits: Math.min(hits.length, pageSize) } };
  };
  const deps = { ...w.deps, rpc: localEngine, round2Cap: 0 };
  const out = await pipeline({ run: { ...p.run, round2: false }, ctx, request: p.request, planEntry: entryOf(p.request), deps });
  assert.equal(out.failed, undefined);
  assert.equal(w.creates.length, 1, "one batch, no continuation round");
  const classified = JSON.parse(readFileSync(`${deps.runDir("F-sonnet-1")}/classified-round1.json`, "utf8"));
  assert.deepEqual(classified.map((f) => f.verdict), [classified[0].verdict, "not_verified"]);
  assert.notEqual(classified[0].verdict, "not_verified");
  const ledger = JSON.parse(readFileSync(w.ledgerPath, "utf8"));
  assert.ok(ledger.entries.some((e) => e.id === "F-sonnet-1 round1" && !e.reserved));
  assert.ok(spentOf(ledger) > PRIOR_SPEND_USD);
});
