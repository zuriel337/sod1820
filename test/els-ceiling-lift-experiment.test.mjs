import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import * as M from "../supabase/functions/_shared/elsMatrixReading.js";
import { handle } from "../experiments/els-axis-addendum/edge/handler.mjs";
import { MAX_LOCKS, renderSource } from "../experiments/els-ceiling-lift/edge/render.mjs";
import { buildRequest, buildRuns } from "../experiments/els-ceiling-lift/lib/arms.mjs";
import { ARMS, CAP, EXPERIMENT_CAP_USD, GROUP_SIZE, MODEL, PREVIOUS_CAP } from "../experiments/els-ceiling-lift/lib/plan.mjs";
import { SUPABASE_URL, planReview, processEntry, worstCaseUsd } from "../experiments/els-ceiling-lift/run.mjs";
import { buildRuns as buildPreviousRuns } from "../experiments/els-line-groups/lib/arms.mjs";
import { guard, reserve, seed, loadLedger } from "../experiments/els-axis-addendum/lib/ledger.mjs";

// EXP-24: the narrow follow-up of EXP-23. The saved-line groups, arm A only, the ceiling of proposals raised from 12 to 40, nothing else in the instruction. These tests prove the plan, that the
// instruction differs from EXP-23's arm A only by that number, the lock and the guards BEFORE any call. The group choice is evaluation-oriented, so the experiment is a diagnostic and never a blind discovery.
const root = fileURLToPath(new URL("../", import.meta.url));
const exp = join(root, "experiments/els-ceiling-lift");
const prev = join(root, "experiments/els-line-groups");
const json = (path) => JSON.parse(readFileSync(path, "utf8"));
const fixtures = join(root, "test/fixtures/els-matrix-reading/regression-saved-cipher");
const SAVED = json(join(fixtures, "saved-cipher.json"));
const FORMS = [...SAVED.findings.map((f) => f.t), "מחכית שפו", "לכפר עליכם", "האר חשך", "מלך", "מחכי", "תשפו", "האר", "חשך", "לכפר", "עליכם"];
const mentions = (text, form) => new RegExp(`(?<![א-ת])${form}(?![א-ת])`).test(text);

test("the committed plan is what the code builds now: 4 saved-line groups, arm A, the worst cases together inside the USD 2.5", async () => {
  const fresh = await planReview();
  assert.deepEqual(json(join(exp, "controls/plan-review.json")), fresh, "controls/plan-review.json is stale: rerun `plan`");
  assert.equal(EXPERIMENT_CAP_USD, 2.5);
  assert.equal(fresh.runs.length, 4);
  assert.ok(fresh.budget.fits_cap && fresh.budget.sum_of_worst_cases_usd <= 2.5 && fresh.budget.headroom_usd > 0.3, JSON.stringify(fresh.budget));
  assert.deepEqual([MODEL.id, MODEL.effort, MODEL.maxTokens, GROUP_SIZE, CAP, PREVIOUS_CAP], ["claude-fable-5-1", "medium", 20_000, 8, 40, 12]);
  assert.deepEqual(ARMS.map((x) => x.id), ["A"]);
  assert.equal(fresh.window_sha256, "208cbe689b68f941daf995f07ff490d8974a5c13128f1724c8792471c02802fe", "the canonical window of EXP-22/23");
  assert.deepEqual(fresh.runs.map((r) => [r.id, r.role, `${r.lines[0]}..${r.lines[7]}`]), [["G02A", "saved_lines", "R09..R16"], ["G06A", "saved_lines", "C08..C15"], ["G07A", "saved_lines", "C16..C23"], ["G10A", "saved_lines", "C40..D06"]]);
  for (const r of fresh.runs) assert.ok(r.worst_case_usd > 0.5 && r.worst_case_usd < 0.53, `${r.id} ${r.worst_case_usd}`);
  assert.deepEqual(fresh.function.approved_lock_sha256, fresh.runs.map((r) => r.lock_sha256));
  assert.equal(new Set(fresh.function.approved_lock_sha256).size, 4);
  assert.ok(fresh.function.approved_lock_sha256.length <= MAX_LOCKS);
  const dir = mkdtempSync(join(tmpdir(), "exp24-"));
  try {
    const path = join(dir, "ledger.json");
    writeFileSync(path, JSON.stringify(seed(EXPERIMENT_CAP_USD)));
    for (const r of fresh.runs) { assert.equal(guard(loadLedger(path), r.worst_case_usd).ok, true, r.id); reserve(path, { id: r.id, usd: r.worst_case_usd }); }
    assert.ok(loadLedger(path).spent_usd <= 2.5);
    assert.equal(guard(loadLedger(path), 0.5).ok, false, "a further request would pass the cap");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("the instruction is EXP-23's arm A: with the old ceiling and the old output allowance the request is byte-identical to EXP-23's; with the new one only the number in section 3 and max_tokens differ", async () => {
  const { runs } = await buildRuns();
  const { runs: previous } = await buildPreviousRuns();
  const previousPlan = json(join(prev, "controls/plan-review.json"));
  for (const r of runs) {
    const before = previous.find((p) => p.id === r.id);
    assert.ok(before, `${r.id} existed in EXP-23`);
    assert.deepEqual(r.group.ids, before.group.ids, `${r.id}: the same eight lines`);
    const rebuilt = buildRequest({ groupLines: r.groupLines, cap: PREVIOUS_CAP, maxTokens: 10_000 });
    assert.equal(await M.requestSha256(rebuilt.request), before.requestSha256, `${r.id}: cap 12 and max_tokens 10,000 reproduce EXP-23's request`);
    assert.equal(before.requestSha256, previousPlan.runs.find((p) => p.id === r.id).request_sha256, "and that is the request EXP-23 reviewed and sent");
    assert.equal(r.prompt.user, before.prompt.user.replace("3. עד 12 הצעות.", "3. עד 40 הצעות."), `${r.id}: the only change in the text is the ceiling`);
    assert.notEqual(r.prompt.user, before.prompt.user);
    assert.equal(r.request.system, before.request.system);
    assert.equal(r.request.system, M.SYSTEM, "the system text is the product's");
    assert.deepEqual(r.request.output_config, before.request.output_config, "same effort and schema");
    assert.deepEqual(r.request.thinking, before.request.thinking);
    assert.equal(r.request.model, before.request.model);
    assert.deepEqual([r.request.max_tokens, before.request.max_tokens], [20_000, 10_000]);
    assert.deepEqual(Object.keys(r.request), Object.keys(before.request), "same fields in the same order");
  }
  assert.match(runs[0].prompt.prose.task, /עד 40 הצעות\. זו תקרה בלבד: אין מכסת מינימום ואין חובה למלא אותה/);
  assert.match(runs[0].prompt.prose.task, /אל תפסול הצעה רק משום שהמילה אינה במילון/);
  assert.doesNotMatch(runs[0].prompt.prose.task, /לפחות \d+ הצעות|מינימום של/);
});

test("no saved word (nor its parts, as whole words) in an instruction, a schema or the code that builds and runs the plan; the saved line ids are not used by this experiment's own code", async () => {
  const { runs } = await buildRuns();
  for (const r of runs) for (const [what, text] of Object.entries({ system: r.request.system, intro: r.prompt.prose.intro, spec: r.prompt.prose.spec, task: r.prompt.prose.task, schema: JSON.stringify(r.request.output_config) })) for (const form of FORMS) assert.equal(mentions(text, form), false, `${r.id}/${what} must not contain "${form}"`);
  const walk = (dir) => readdirSync(dir).flatMap((name) => { const full = join(dir, name); return statSync(full).isDirectory() ? (["controls", "results"].includes(name) ? [] : walk(full)) : [full]; });
  const code = walk(exp).filter((f) => !/(evaluate|matrix)\.mjs$|PREREGISTERED/.test(f));
  assert.ok(code.length >= 4, `found ${code.length} files`);
  for (const file of code) {
    const text = readFileSync(file, "utf8");
    for (const form of SAVED.findings.map((f) => f.t)) assert.equal(text.includes(form), false, `${relative(root, file)} contains "${form}"`);
    assert.equal(/saved-cipher\.json|regression-saved-cipher|SAVED_LINE_IDS/.test(text), false, `${relative(root, file)} reads the saved cipher or its line ids`);
  }
});

test("the pass-through lock: the 4 reviewed requests pass, anything else (EXP-23's cap-12 request, another allowance, a changed text, a batch of two) is refused before the provider", async () => {
  const { runs } = await buildRuns();
  const { runs: previous } = await buildPreviousRuns();
  const token = "t".repeat(64);
  const tokenSha256 = await M.sha256Hex(token);
  const cfg = { apiKey: "key-held-by-the-function", tokenSha256, approved: new Set(runs.map((r) => r.lockSha256)), models: [MODEL.id], maxBody: 400_000, expiresAt: Date.now() + 3_600_000, round2Bases: new Set([]), round2Prefix: "", round2MaxCards: 0, round2MaxAssistant: 0, round2MaxUser: 0 };
  const upstream = [];
  const fakeUpstream = async (url, init) => { upstream.push({ url, init }); return new Response("{}", { status: 200, headers: { "content-type": "application/json" } }); };
  const post = (body, headers = { "x-els-token": token }) => handle(new Request("https://example.test/functions/v1/els-live-reading/v1/messages/batches", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) }), cfg, fakeUpstream);
  for (const r of runs) assert.equal((await post({ requests: [{ custom_id: r.customId, params: r.request }] })).status, 200, r.id);
  assert.equal(upstream.length, 4);
  assert.ok(runs.every((r) => /^els-live-[a-z0-9-]{1,32}$/.test(r.customId)), "every custom id passes the handler's shape rule");
  const [first, second] = runs;
  const changed = { ...first.request, messages: [{ ...first.request.messages[0], content: `${first.request.messages[0].content} ` }] };
  const old = previous.find((p) => p.id === first.id);
  const refusals = [
    [await post({ requests: [{ custom_id: first.customId, params: old.request }] }), 403, /request_not_approved/],
    [await post({ requests: [{ custom_id: first.customId, params: changed }] }), 403, /request_not_approved/],
    [await post({ requests: [{ custom_id: first.customId, params: { ...first.request, max_tokens: 64_000 } }] }), 403, /request_not_approved/],
    [await post({ requests: [{ custom_id: first.customId, params: { ...first.request, model: "claude-opus-5-5" } }] }), 403, /model_not_allowed/],
    [await post({ requests: [{ custom_id: first.customId, params: first.request }, { custom_id: second.customId, params: second.request }] }), 400, /one_request_only/],
    [await post({ requests: [{ custom_id: first.customId, params: first.request }] }, {}), 403, /forbidden/],
    [await post({ requests: [{ custom_id: first.customId, params: first.request }] }, { "x-els-token": "0".repeat(64) }), 403, /forbidden/],
  ];
  for (const [response, status, pattern] of refusals) { assert.equal(response.status, status); assert.match(await response.text(), pattern); }
  assert.equal(upstream.length, 4, "nothing refused reached the provider");
});

test("the function source: only the token's hash, the reviewed lock hashes (at most 20, distinct), one model and an expiry; the disabled source answers 410", async () => {
  const { runs } = await buildRuns();
  const tokenSha256 = await M.sha256Hex("secret-token-never-in-the-source");
  const args = { "token-sha256": tokenSha256, approve: runs.map((r) => r.lockSha256).join(","), model: MODEL.id, expires: "2026-10-30T12:00:00Z" };
  const live = renderSource("live", args);
  assert.ok(live.includes(tokenSha256) && runs.every((r) => live.includes(r.lockSha256)) && live.includes(JSON.stringify([MODEL.id])));
  assert.equal(live.includes("secret-token-never-in-the-source"), false);
  assert.ok(live.includes(`expiresAt: ${Date.parse("2026-10-30T12:00:00Z")}`));
  assert.match(live, /round2Bases: new Set\(\[\]\)/);
  assert.throws(() => renderSource("live", { ...args, approve: `${runs[0].lockSha256},${runs[0].lockSha256}` }), /distinct/);
  assert.throws(() => renderSource("live", { ...args, "token-sha256": "abc" }), /64 hex/);
  assert.throws(() => renderSource("live", { ...args, model: "claude-fable-5-1,claude-opus-5-5" }), /exactly one/);
  const off = renderSource("disabled");
  assert.match(off, /status: 410/);
  assert.match(off, /EXP-24/);
  assert.equal(/ANTHROPIC_API_KEY|approved/.test(off), false);
});

test("fail closed: without the three variables of the pass-through the runner exits 2 before any request", () => {
  const clean = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^ELS_PROXY_|^ANTHROPIC/.test(k)));
  for (const stage of ["run", "selftest"]) {
    const done = spawnSync(process.execPath, [join(exp, "run.mjs"), stage], { env: clean, encoding: "utf8" });
    assert.equal(done.status, 2, `${stage}: ${done.stderr.slice(0, 200)}`);
    assert.match(done.stderr, /no credential/);
  }
});

// ---------- the processing of an answer (provider-free): a SYNTHETIC answer goes through the product's own location, verification and classification ----------
const matchEverything = async (url) => {
  assert.equal(url, `${SUPABASE_URL}/rest/v1/rpc/els_verify_occurrence_v1`);
  return { ok: true, status: 200, json: async () => ({ status: "OK", verification_state: "MATCH", contract: "els_occurrence_replay_v1", corpus_id: "test", occurrence: { occurrence_id: "test" } }) };
};
const answer = (text, extra = {}) => ({ custom_id: "els-live-l24-g02a", result: { type: "succeeded", message: { model: MODEL.id, stop_reason: "end_turn", content: [{ type: "text", text }], usage: { input_tokens: 3_000, output_tokens: 6_500, output_tokens_details: { thinking_tokens: 3_800 } }, ...extra } } });

test("an answer is located ONLY in the lines of its group; the ceiling is reported against 40 and against the old 12; a cut-off, refused or failed answer keeps its cost and shows nothing", async () => {
  const { ctx, runs } = await buildRuns();
  const g02a = runs[0];
  const readings = M.readings(g02a.groupLines);
  const r09 = readings.get("R09+").letters;
  const stretch = (from, n) => r09.slice(from, from + n); // stretches of a shown source row (synthetic test input, not a finding)
  const outside = ctx.lines.find((l) => l.id === "C21").letters.slice(10, 15); // letters that exist only in a line the group does not show
  assert.ok(!Object.values(Object.fromEntries(readings)).some((r) => r.letters.includes(outside)), "the outside sequence is really absent from the group's lines");
  const timing = { batch_ms: 100_000 };
  const many = { findings: [...Array.from({ length: 14 }, (_, k) => ({ id: `F${k + 1}`, line: "R09+", text: stretch(k * 3, 3) })), { id: "F15", line: "R09+", text: stretch(0, 3) }, { id: "F16", line: "C21+", text: outside }], observations: "x" };
  const done = await processEntry({ run: g02a, ctx, entry: answer(JSON.stringify(many)), batch: { id: "msgbatch_test" }, timing, fetchImpl: matchEverything, restHeaders: () => ({}) });
  assert.equal(done.state, "COMPLETE");
  assert.equal(done.cap, 40);
  assert.deepEqual(done.cap_info, { requested: 40, proposals: 16, reached: false }, "16 proposals: past the old ceiling of 12, short of the new one of 40");
  assert.deepEqual([done.summary.proposals, done.summary.source_rows, done.summary.engine_verified, done.summary.not_verified], [16, 15, 0, 1]);
  assert.equal(done.summary.duplicates, 1);
  assert.equal(done.summary.cited_line_outside_group, 1);
  assert.equal("split_invalid" in done.summary, false, "no arm B in this experiment");
  assert.equal(done.cost.usd, M.costFromUsage(MODEL.id, done.usage, { batch: true }).usd);
  const cut = await processEntry({ run: g02a, ctx, entry: answer("{\"findings\":[", { stop_reason: "max_tokens" }), batch: null, timing, fetchImpl: async () => assert.fail("no engine call for a cut-off answer"), restHeaders: () => ({}) });
  assert.deepEqual([cut.state, cut.reason, cut.findings, cut.cost.usd > 0], ["INCOMPLETE", "max_tokens", undefined, true]);
  const refused = await processEntry({ run: g02a, ctx, entry: answer("", { stop_reason: "refusal", content: [], usage: { input_tokens: 2_600, output_tokens: 1_046, output_tokens_details: { thinking_tokens: 1_046 } } }), batch: null, timing, fetchImpl: async () => assert.fail("no engine call for a refused answer"), restHeaders: () => ({}) });
  assert.deepEqual([refused.state, refused.reason, refused.findings, refused.cost.usd > 0], ["INCOMPLETE", "refusal", undefined, true]);
  const bad = await processEntry({ run: g02a, ctx, entry: answer("not json"), batch: null, timing, fetchImpl: async () => assert.fail("no engine call"), restHeaders: () => ({}) });
  assert.deepEqual([bad.state, bad.reason], ["INCOMPLETE", "invalid_json"]);
  const failed = await processEntry({ run: g02a, ctx, entry: { custom_id: "x", result: { type: "errored", error: { type: "api_error" } } }, batch: null, timing, fetchImpl: async () => assert.fail("no engine call"), restHeaders: () => ({}) });
  assert.deepEqual([failed.state, failed.reason, failed.cost.usd], ["FAILED", "batch_errored", null]);
  assert.ok(worstCaseUsd(3_000) < 0.53 && worstCaseUsd(3_000) > 0.5);
});
