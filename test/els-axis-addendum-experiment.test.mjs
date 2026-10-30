import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import * as M from "../supabase/functions/_shared/elsMatrixReading.js";
import { handle } from "../experiments/els-axis-addendum/edge/handler.mjs";
import { renderSource } from "../experiments/els-axis-addendum/edge/render.mjs";
import { buildArms } from "../experiments/els-axis-addendum/lib/arms.mjs";
import { guard, loadLedger, reserve, seed, settle, spentOf } from "../experiments/els-axis-addendum/lib/ledger.mjs";
import { CAP, EXPERIMENT_CAP_USD, MODEL, RUNS } from "../experiments/els-axis-addendum/lib/plan.mjs";
import { NoCredentialError, makeProxyFetch } from "../experiments/els-axis-addendum/lib/proxy.mjs";
import { SUPABASE_URL, planReview, processEntry, worstCaseUsd } from "../experiments/els-axis-addendum/run.mjs";

// EXP-22: one uniform and one addendum reading of the saved-cipher instance, on the window the live job sent. These tests prove the plan, the lock and the guards BEFORE any call.
const root = fileURLToPath(new URL("../", import.meta.url));
const exp = join(root, "experiments/els-axis-addendum");
const json = (path) => JSON.parse(readFileSync(path, "utf8"));
const fixtures = join(root, "test/fixtures/els-matrix-reading/regression-saved-cipher");
const SAVED = json(join(fixtures, "saved-cipher.json"));
const REPLAY = json(join(fixtures, "engine-replay.json"));

test("the committed plan is what the code builds now: two requests, the window the live job sent, U identical to the live run's request, the worst cases inside the USD 4", async () => {
  const fresh = await planReview();
  assert.deepEqual(json(join(exp, "controls/plan-review.json")), fresh, "controls/plan-review.json is stale: rerun `plan`");
  assert.equal(readFileSync(join(exp, "data/window.json"), "utf8"), readFileSync(join(fixtures, "window.json"), "utf8"), "the window is a byte copy of the regression fixture");
  assert.equal(fresh.window_sha256, "208cbe689b68f941daf995f07ff490d8974a5c13128f1724c8792471c02802fe");
  assert.equal(fresh.window_matches_selectWindow, true);
  assert.equal(fresh.u_equals_live_run_request, true, "U sends exactly what live job 5f5aa117 sent");
  assert.deepEqual(fresh.runs.map((r) => [r.id, r.focus, r.cap, r.rows, r.cols]), [["U", "uniform", 25, 33, 41], ["A", "axis_neighborhood", 25, 33, 41]]);
  assert.deepEqual(fresh.request_differences_u_to_a, [".messages[0].content", ".output_config.format.schema.required[1]", ".output_config.format.schema.required[2]", ".output_config.format.schema.properties.review"], "the arms differ in the appended text and the schema that carries the review, nothing else");
  assert.equal(EXPERIMENT_CAP_USD, 4);
  assert.ok(fresh.budget.fits_cap && fresh.budget.sum_of_worst_cases_usd <= 4, `the sum of the two worst cases ${fresh.budget.sum_of_worst_cases_usd}`);
  assert.ok(fresh.budget.sum_of_worst_cases_usd < 3.5 && fresh.budget.headroom_usd > 0.5);
  for (const r of fresh.runs) assert.ok(r.worst_case_usd < 1.75 && r.worst_case_usd > 1.7, `${r.id} ${r.worst_case_usd}`);
  assert.deepEqual(fresh.function.approved_lock_sha256, fresh.runs.map((r) => r.lock_sha256));
});

test("the arms are the product's own requests; nothing in the plan, the code or the instructions knows the saved words", async () => {
  const { ctx, arms } = await buildArms();
  for (const arm of arms) {
    const { request } = M.buildReadingRequest({ model: M.MODEL_DEFAULT, region: ctx.region, lines: ctx.lines, cap: CAP, focus: arm.run.focus });
    assert.equal(JSON.stringify(arm.request), JSON.stringify(request));
    assert.equal(arm.request.model, MODEL.id);
    assert.deepEqual([arm.request.max_tokens, arm.request.output_config.effort, arm.request.thinking.type], [64_000, "medium", "adaptive"]);
  }
  const [u, a] = arms;
  assert.equal(a.request.messages[0].content, `${u.request.messages[0].content}\n\n${a.prompt.prose.addendum}`);
  // the saved words (and their parts) as whole Hebrew words, in every instruction text and in the code that builds and runs the plan
  const forms = [...SAVED.findings.map((f) => f.t), "מחכית שפו", "לכפר עליכם", "האר חשך", "מלך", "מחכי", "תשפו", "האר", "חשך", "לכפר", "עליכם"];
  const mentions = (text, form) => new RegExp(`(?<![א-ת])${form}(?![א-ת])`).test(text);
  for (const arm of arms) for (const [what, text] of Object.entries({ system: arm.request.system, intro: arm.prompt.prose.intro, spec: arm.prompt.prose.spec, task: arm.prompt.prose.task, addendum: arm.prompt.prose.addendum ?? "", schema: JSON.stringify(arm.request.output_config) })) for (const form of forms) assert.equal(mentions(text, form), false, `${arm.run.id}/${what} must not contain "${form}"`);
  const walk = (dir) => readdirSync(dir).flatMap((name) => { const full = join(dir, name); return statSync(full).isDirectory() ? (["controls", "results", "data"].includes(name) ? [] : walk(full)) : [full]; });
  const code = walk(exp).filter((f) => !/(evaluate|matrix)\.mjs$|PREREGISTERED/.test(f));
  assert.ok(code.length >= 7, `found ${code.length} files`);
  for (const file of code) { const text = readFileSync(file, "utf8"); for (const form of SAVED.findings.map((f) => f.t)) assert.equal(text.includes(form), false, `${relative(root, file)} contains "${form}"`); }
  for (const file of code.filter((f) => /\.mjs$/.test(f))) assert.equal(/saved-cipher\.json|regression-saved-cipher/.test(readFileSync(file, "utf8")), false, `${relative(root, file)} reads the saved cipher`);
});

test("the pass-through lock: exactly the two reviewed requests pass; anything else is refused before the provider", async () => {
  const { arms } = await buildArms();
  const token = "t".repeat(64);
  const tokenSha256 = await M.sha256Hex(token);
  const [u, a] = arms;
  const cfg = { apiKey: "key-held-by-the-function", tokenSha256, approved: new Set([u.lockSha256, a.lockSha256]), models: [MODEL.id], maxBody: 400_000, expiresAt: Date.now() + 3_600_000, round2Bases: new Set([]), round2Prefix: "", round2MaxCards: 0, round2MaxAssistant: 0, round2MaxUser: 0 };
  const upstream = [];
  const fakeUpstream = async (url, init) => { upstream.push({ url, init }); return new Response("{}", { status: 200, headers: { "content-type": "application/json" } }); };
  const post = (path, body, headers = { "x-els-token": token }) => handle(new Request(`https://example.test/functions/v1/els-live-reading${path}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) }), cfg, fakeUpstream);
  const batch = (arm, customId = arm.run.customId) => ({ requests: [{ custom_id: customId, params: arm.request }] });
  assert.equal((await post("/v1/messages/batches", batch(u))).status, 200);
  assert.equal((await post("/v1/messages/batches", batch(a))).status, 200);
  assert.equal(upstream.length, 2);
  assert.ok(upstream.every((call) => call.init.headers["x-api-key"] === "key-held-by-the-function" && call.url === "https://api.anthropic.com/v1/messages/batches"));
  assert.equal(await M.lockSha256(u.request), u.lockSha256, "the lock hash is the one the handler computes");
  const changed = { ...u.request, messages: [{ ...u.request.messages[0], content: `${u.request.messages[0].content} ` }] };
  const refusals = [
    [await post("/v1/messages/batches", { requests: [{ custom_id: u.run.customId, params: changed }] }), 403, /request_not_approved/],
    [await post("/v1/messages/batches", { requests: [{ custom_id: u.run.customId, params: { ...u.request, max_tokens: 64_001 } }] }), 403, /request_not_approved/],
    [await post("/v1/messages/batches", { requests: [{ custom_id: u.run.customId, params: { ...u.request, model: "claude-opus-5-5" } }] }), 403, /model_not_allowed/],
    [await post("/v1/messages/batches", { requests: [batch(u).requests[0], batch(a).requests[0]] }), 400, /one_request_only/],
    [await post("/v1/messages/batches", batch(u, "els-reading-1")), 400, /bad_request_shape/],
    [await post("/v1/messages/batches", batch(u), { "x-els-token": "0".repeat(64) }), 403, /forbidden/],
    [await post("/v1/messages/batches", batch(u), {}), 403, /forbidden/],
    [await post("/v1/messages/count_tokens", { model: "claude-sonnet-5-5", messages: [] }), 403, /model_not_allowed/],
    [await post("/v1/messages", { model: MODEL.id }), 404, /not_found/],
    [await handle(new Request("https://example.test/functions/v1/els-live-reading/v1/files", { headers: { "x-els-token": token } }), cfg, fakeUpstream), 404, /not_found/],
    [await handle(new Request("https://example.test/functions/v1/els-live-reading/v1/messages/batches", { headers: { "x-els-token": token } }), cfg, fakeUpstream), 404, /not_found/],
    [await handle(new Request("https://example.test/functions/v1/els-live-reading/v1/models/claude-fable-5-1", { headers: { "x-els-token": token } }), { ...cfg, expiresAt: Date.now() - 1 }, fakeUpstream), 410, /expired/],
  ];
  for (const [response, status, pattern] of refusals) { assert.equal(response.status, status); assert.match(await response.text(), pattern); }
  assert.equal(upstream.length, 2, "nothing refused reached the provider");
  // a second round-2 style request (three messages) is refused because no round-2 base is approved
  const three = { ...u.request, messages: [u.request.messages[0], { role: "assistant", content: [{ type: "text", text: "x" }] }, { role: "user", content: "y" }], cache_control: { type: "ephemeral" } };
  assert.equal((await post("/v1/messages/batches", { requests: [{ custom_id: u.run.customId, params: three }] })).status, 403);
});

test("the function source carries only the hash of the token, the two lock hashes, one model and an expiry; the disabled one answers 410", async () => {
  const { arms } = await buildArms();
  const tokenSha256 = await M.sha256Hex("secret-token-never-in-the-source");
  const args = { "token-sha256": tokenSha256, approve: arms.map((x) => x.lockSha256).join(","), model: MODEL.id, expires: "2026-10-30T12:00:00Z" };
  const live = renderSource("live", args);
  assert.ok(live.includes(tokenSha256) && arms.every((x) => live.includes(x.lockSha256)) && live.includes(JSON.stringify([MODEL.id])));
  assert.equal(live.includes("secret-token-never-in-the-source"), false);
  assert.ok(live.includes(`expiresAt: ${Date.parse("2026-10-30T12:00:00Z")}`));
  assert.match(live, /round2Bases: new Set\(\[\]\)/);
  assert.match(live, /Deno\.env\.get\("ANTHROPIC_API_KEY"\)/);
  assert.doesNotMatch(live, /^export /m);
  assert.throws(() => renderSource("live", { ...args, approve: `${args.approve},${"a".repeat(64)}` }), /one or two/);
  assert.throws(() => renderSource("live", { ...args, "token-sha256": "abc" }), /64 hex/);
  assert.throws(() => renderSource("live", { ...args, model: "claude-fable-5-1,claude-opus-5-5" }), /exactly one/);
  assert.throws(() => renderSource("live", { ...args, expires: "never" }), /ISO/);
  const off = renderSource("disabled");
  assert.match(off, /status: 410/);
  assert.equal(/ANTHROPIC_API_KEY|approved/.test(off), false);
});

test("fail closed: without the three variables of the pass-through nothing is built and the runner exits 2 before any request", () => {
  assert.throws(() => makeProxyFetch({}), NoCredentialError);
  assert.throws(() => makeProxyFetch({ ELS_PROXY_URL: "https://x.test/functions/v1/f", ELS_PROXY_TOKEN: "t" }), NoCredentialError);
  const clean = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^ELS_PROXY_|^ANTHROPIC/.test(k)));
  for (const stage of ["run", "selftest"]) {
    const done = spawnSync(process.execPath, [join(exp, "run.mjs"), stage], { env: clean, encoding: "utf8" });
    assert.equal(done.status, 2, `${stage}: ${done.stderr.slice(0, 200)}`);
    assert.match(done.stderr, /no credential/);
  }
});

test("only the provider's own address is re-addressed to the pass-through, with the token and the JWT instead of a key; anything else is untouched", async () => {
  const seen = [];
  const env = { ELS_PROXY_URL: "https://p.test/functions/v1/els-live-reading/", ELS_PROXY_TOKEN: "tok", ELS_PROXY_JWT: "jwt" };
  const proxyFetch = makeProxyFetch(env, async (url, init) => { seen.push({ url, init }); return new Response("{}"); });
  await proxyFetch("https://api.anthropic.com/v1/messages/batches/msgbatch_abc/results", { headers: { "x-api-key": "k", "anthropic-version": "2026-10-21" }, redirect: "error" });
  await proxyFetch("https://linswmnnkjxvweumprav.supabase.co/rest/v1/rpc/els_verify_occurrence_v1", { method: "POST", headers: { apikey: "anon" } });
  assert.equal(seen[0].url, "https://p.test/functions/v1/els-live-reading/v1/messages/batches/msgbatch_abc/results");
  assert.deepEqual(seen[0].init.headers, { "anthropic-version": "2026-10-21", authorization: "Bearer jwt", "x-els-token": "tok" });
  assert.equal(seen[0].init.redirect, "error");
  assert.equal(seen[1].url, "https://linswmnnkjxvweumprav.supabase.co/rest/v1/rpc/els_verify_occurrence_v1");
  assert.deepEqual(seen[1].init.headers, { apikey: "anon" });
});

test("the budget guard: the worst case is reserved before a run, a first run that uses its whole allowance still leaves room for the second, and an unknown outcome keeps its reservation", async () => {
  const dir = mkdtempSync(join(tmpdir(), "exp22-"));
  try {
    const path = join(dir, "ledger.json");
    writeFileSync(path, JSON.stringify(seed(EXPERIMENT_CAP_USD)));
    const plan = await planReview();
    const worst = plan.runs.map((r) => worstCaseUsd(r.est_input_tokens));
    assert.equal(guard(loadLedger(path), worst[0]).ok, true);
    reserve(path, { id: "U", usd: worst[0] });
    assert.equal(guard(loadLedger(path), worst[1]).ok, true, "both worst cases fit together");
    settle(path, "U", { usd: worst[0], result_type: "succeeded" }); // a first run that used the whole 64,000 allowance
    const second = guard(loadLedger(path), worst[1]);
    assert.equal(second.ok, true);
    assert.ok(second.worstCase <= 4 && second.worstCase > 3.4);
    reserve(path, { id: "A", usd: worst[1] });
    settle(path, "A", { usd: worst[1], unknown_outcome: true });
    assert.ok(spentOf(loadLedger(path)) <= 4 + 1e-9);
    const tight = guard({ cap_usd: 4, entries: [{ usd: 2.4 }] }, worst[1]);
    assert.equal(tight.ok, false);
    assert.match(tight.reason, /would pass the cap 4/);
    assert.equal(guard({ cap_usd: 4, entries: [] }, Number.NaN).ok, false);
    assert.throws(() => settle(path, "nope", { usd: 1 }), /no reservation/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
  // a worst case is the whole allowance: counted input x 1.25 plus 64,000 output tokens, at batch prices
  assert.equal(worstCaseUsd(20_000), M.costFromUsage(MODEL.id, { input_tokens: 25_000, output_tokens: 64_000 }, { batch: true }).usd);
});

// ---------- the processing of an answer (provider-free): a recorded answer goes through the product's own verification, classification and reports ----------
const replayFetch = (rows) => async (url, init) => {
  assert.equal(url, `${SUPABASE_URL}/rest/v1/rpc/els_verify_occurrence_v1`);
  const body = JSON.parse(init.body);
  const hit = rows.find((r) => r.term === body.p_term && r.skip === body.p_skip && r.dir === body.p_dir && r.start === body.p_start);
  assert.ok(hit, `no recorded replay for ${body.p_term}/${body.p_skip}`);
  return { ok: true, status: 200, json: async () => hit.result };
};
const answer = (text, extra = {}) => ({ custom_id: "els-live-axis-a", result: { type: "succeeded", message: { model: MODEL.id, stop_reason: "end_turn", content: [{ type: "thinking", thinking: "x" }, { type: "text", text }], usage: { input_tokens: 23_000, output_tokens: 30_000, output_tokens_details: { thinking_tokens: 25_000 } }, ...extra } } });
const READING_OF = { מחכיתשפו: "C17+", לכפרעליכמ: "R16+", הארחשכ: "D03+", שופר: "C13-", ישלח: "C21-", מלכ: "R09+" };

test("a recorded answer is verified, classified and reported by the product's code; a cut-off or failed answer is kept as it is, with its cost, and nothing is shown from it", async () => {
  const { ctx, arms } = await buildArms();
  const a = arms[1];
  const synthetic = { findings: SAVED.findings.map((f, i) => ({ id: `F${i + 1}`, line: READING_OF[f.t], text: f.t, parts: [], kind: "word", story_related: false, continue_from: false, from_finding: "", tier: "A", note: "SYNTHETIC_TEST_ONLY" })), review: { near_lines: ["C21", "D03"], margin_lines: ["R01"] }, observations: "SYNTHETIC_TEST_ONLY" };
  const timing = { created_at: "2026-10-30T10:00:00Z", ended_at: "2026-10-30T10:09:25Z", batch_ms: 565_000, wall_ms: 580_000 };
  const done = await processEntry({ arm: a, ctx, entry: answer(JSON.stringify(synthetic)), batch: { id: "msgbatch_test" }, timing, fetchImpl: replayFetch(REPLAY.rows), restHeaders: () => ({}) });
  assert.equal(done.state, "COMPLETE");
  assert.deepEqual([done.summary.proposals, done.summary.engine_verified, done.summary.source_rows, done.summary.not_verified], [6, 4, 2, 0]);
  assert.deepEqual([done.cap_info.requested, done.cap_info.proposals, done.cap_info.reached], [25, 6, false]);
  assert.equal(done.coverage_report.proposals.count, 6);
  assert.equal(done.coverage_report.model_review.status, "UNVERIFIED_MODEL_REPORT");
  assert.equal("target" in done.summary.zones, false);
  assert.deepEqual([done.output.thinking_tokens, done.output.stop_reason], [25_000, "end_turn"]);
  assert.equal(done.cost.usd, M.costFromUsage(MODEL.id, done.usage, { batch: true }).usd);
  // the uniform arm does not ask for a review: its report says so
  const u = await processEntry({ arm: arms[0], ctx, entry: answer(JSON.stringify({ findings: synthetic.findings, observations: "" })), batch: null, timing, fetchImpl: replayFetch(REPLAY.rows), restHeaders: () => ({}) });
  assert.equal(u.coverage_report.model_review.status, "NOT_REQUESTED");
  const cut = await processEntry({ arm: a, ctx, entry: answer("{\"findings\":[", { stop_reason: "max_tokens" }), batch: null, timing, fetchImpl: async () => assert.fail("no engine call for a cut-off answer"), restHeaders: () => ({}) });
  assert.deepEqual([cut.state, cut.reason, cut.findings, cut.cost.usd > 0], ["INCOMPLETE", "max_tokens", undefined, true]);
  const bad = await processEntry({ arm: a, ctx, entry: answer("not json"), batch: null, timing, fetchImpl: async () => assert.fail("no engine call"), restHeaders: () => ({}) });
  assert.deepEqual([bad.state, bad.reason], ["INCOMPLETE", "invalid_json"]);
  const failed = await processEntry({ arm: a, ctx, entry: { custom_id: "x", result: { type: "errored", error: { type: "api_error" } } }, batch: null, timing, fetchImpl: async () => assert.fail("no engine call"), restHeaders: () => ({}) });
  assert.deepEqual([failed.state, failed.reason, failed.cost.usd], ["FAILED", "batch_errored", null]);
});

// ---------- the recorded run (EXP-22, 30.10.2026): what happened is what was reviewed, and nothing was sent twice ----------
test("the recorded run: each reviewed request was sent exactly once, inside the USD 4, the answers are saved as received, and the evaluation file is what the code computes from them", async () => {
  const { evaluate } = await import("../experiments/els-axis-addendum/evaluate.mjs");
  const plan = json(join(exp, "controls/plan-review.json"));
  const log = readFileSync(join(exp, "controls/run-log.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  for (const id of ["U", "A"]) {
    assert.equal(log.filter((e) => e.event === "batch_created" && e.run === id).length, 1, `${id}: one batch, never a retry`);
    assert.equal(log.filter((e) => e.event === "preflight" && e.run === id).length, 1);
    const entry = json(join(exp, `controls/runs/${id}/batch-entry.json`));
    const result = json(join(exp, `controls/runs/${id}/result.json`));
    const reviewed = plan.runs.find((r) => r.id === id);
    assert.deepEqual([result.request_sha256, result.lock_sha256, result.window_sha256], [reviewed.request_sha256, reviewed.lock_sha256, plan.window_sha256], `${id}: what was sent is what was reviewed`);
    assert.equal(entry.saved_as_received, true);
    assert.equal(entry.entry.result.type, "succeeded");
    assert.equal(json(join(exp, `controls/runs/${id}/request.json`)).model, MODEL.id);
    assert.deepEqual([result.state, result.output.stop_reason, result.cap_info.requested], ["COMPLETE", "end_turn", 25]);
    assert.equal(result.cost.usd, M.costFromUsage(MODEL.id, entry.entry.result.message.usage, { batch: true }).usd, `${id}: the cost is the usage times the list prices`);
    assert.ok(result.findings.every((f) => f.verification.state !== "NOT_VERIFIED"), `${id}: every proposal verified (engine or plain-text row)`);
  }
  assert.equal(log.filter((e) => e.event === "batch_created").length, 2);
  assert.equal(json(join(exp, "controls/runs/U/result.json")).usage.input_tokens, 21_541, "U billed exactly the input of the live run it repeats");
  const ledger = loadLedger(join(exp, "controls/budget-ledger.json"));
  assert.ok(ledger.entries.every((e) => !e.reserved && !e.unknown_outcome), "both reservations settled");
  assert.ok(spentOf(ledger) < 1.5 && spentOf(ledger) <= EXPERIMENT_CAP_USD);
  const fresh = evaluate();
  const saved = json(join(exp, "results/summary.json"));
  delete fresh.generated_at; delete saved.generated_at;
  assert.deepEqual(saved, JSON.parse(JSON.stringify(fresh)), "results/summary.json is stale: rerun evaluate");
  assert.deepEqual(fresh.saved_hits.U, { exact: 0, overlap: 0, crossed_at_one_cell: 1, of: 6 });
  assert.deepEqual(fresh.saved_hits.A, { exact: 0, overlap: 0, crossed_at_one_cell: 3, of: 6 });
});
