import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { ARMS, BASES, BUDGET, EXPERIMENT_CAP_USD, MODELS, PRIOR_SPEND_USD, RUNS } from "../experiments/els-model-matched/lib/plan.mjs";
import { inputOf, prepareAll, savedFableRequestPath } from "../experiments/els-model-matched/lib/prepare.mjs";
import { ledgerSeed, planReview } from "../experiments/els-model-matched/run-matched.mjs";
import { lockSha256, requestSha256 } from "../experiments/els-live-reading/lib/request.mjs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const prepared = prepareAll();

test("the plan is four saved Fable requests times four cheap arms, no Fable, cheapest first", () => {
  assert.equal(RUNS.length, BASES.length * Object.keys(ARMS).length);
  assert.deepEqual([...MODELS].sort(), ["claude-haiku-5-5", "claude-sonnet-5-5"]);
  assert.ok(ARMS["haiku-m"].priority < ARMS["sonnet-m"].priority && ARMS["sonnet-m"].priority < ARMS["sonnet-h"].priority);
  for (const run of RUNS) { assert.equal(run.round2, false); assert.equal(run.series, "blind"); }
});

test("every request carries the saved Fable input; only model, effort and max_tokens differ", () => {
  assert.equal(prepared.length, RUNS.length);
  for (const { run, request, review } of prepared) {
    const saved = JSON.parse(readFileSync(savedFableRequestPath(run.base), "utf8"));
    assert.deepEqual(inputOf(request), inputOf(saved), run.id);
    assert.equal(review.input_identical_to_fable_request, true);
    assert.equal(saved.model, "claude-fable-5-1");
    assert.notEqual(request.model, saved.model);
    assert.equal(request.system, saved.system);
    assert.deepEqual(request.messages, saved.messages);
    assert.deepEqual(request.thinking, saved.thinking);
    assert.deepEqual(request.output_config.format, saved.output_config.format);
    assert.equal(request.output_config.effort, run.effort);
    assert.equal(request.max_tokens, run.maxTokens);
  }
});

test("the reviewed plan equals what the code builds, and every lock hash is distinct", () => {
  const plan = JSON.parse(read("../experiments/els-model-matched/controls/plan-review.json"));
  assert.equal(plan.runs.length, prepared.length);
  const byId = new Map(plan.runs.map((entry) => [entry.id, entry]));
  for (const { run, request } of prepared) {
    const entry = byId.get(run.id);
    assert.equal(requestSha256(request), entry.request_sha256, run.id);
    assert.equal(lockSha256(request), entry.lock_sha256, run.id);
  }
  assert.equal(new Set(plan.function.approved_lock_sha256).size, plan.runs.length);
  assert.deepEqual(plan.function.models.sort(), [...MODELS].sort());
  assert.deepEqual(planReview(prepared).runs.map((r) => r.lock_sha256), plan.runs.map((r) => r.lock_sha256));
});

test("the budget is a hard sub-cap inside the total cap and counts the earlier spend", () => {
  assert.equal(BUDGET.cap_usd, 40);
  assert.equal(BUDGET.hard_guard_usd, Number((PRIOR_SPEND_USD + EXPERIMENT_CAP_USD).toFixed(6)));
  assert.ok(BUDGET.stop_new_usd < BUDGET.hard_guard_usd);
  const seed = ledgerSeed();
  assert.equal(seed.entries.length, 1);
  assert.equal(seed.entries[0].usd, PRIOR_SPEND_USD);
  const pilot = JSON.parse(read("../experiments/els-pool-selection/controls/budget-ledger.json"));
  assert.equal(Math.round(pilot.spent_usd * 1e6) / 1e6, PRIOR_SPEND_USD, "the prior spend equals the pilot ledger total");
});

test("no target word or story text lives in the EXP-17 code; targets come from the evaluation data file", () => {
  const targets = JSON.parse(read("../experiments/els-live-reading/evaluation/targets.json")).targets;
  const dir = new URL("../experiments/els-model-matched/", import.meta.url);
  const files = [...readdirSync(new URL("lib/", dir)).map((f) => `lib/${f}`), "run-matched.mjs"];
  for (const file of files) { const text = readFileSync(new URL(file, dir), "utf8"); for (const target of targets) assert.ok(!text.includes(target), `${file} contains a target word`); }
});

test("a live stage without the pass-through environment refuses to run and sends nothing", () => {
  const env = { ...process.env, ELS_PROXY_URL: "", ELS_PROXY_TOKEN: "", ELS_PROXY_JWT: "", ELS_EXPERIMENT_ANTHROPIC_KEY: "" };
  for (const stage of ["selftest", "run"]) {
    const run = spawnSync(process.execPath, ["experiments/els-model-matched/run-matched.mjs", stage], { cwd: new URL("../", import.meta.url).pathname, env, encoding: "utf8" });
    assert.equal(run.status, 2, stage);
    assert.match(run.stderr, /no credential/);
  }
});
