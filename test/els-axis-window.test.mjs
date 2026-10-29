import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { BUDGET, EXPERIMENT_CAP_USD, MODEL, MODELS, PRIOR_SPEND_USD, RUNS } from "../experiments/els-axis-window/lib/plan.mjs";
import { prepareAll } from "../experiments/els-axis-window/lib/prepare.mjs";
import { FINDINGS_SCHEMA_V4, MAX_FINDINGS_V4, buildRound1General, buildRound1V4 } from "../experiments/els-axis-window/lib/prompt4.mjs";
import { MARGIN_ROWS } from "../experiments/els-axis-window/build-windows.mjs";
import { ledgerSeed, planReview } from "../experiments/els-axis-window/run-axis.mjs";
import { FINDINGS_SCHEMA_V2, buildRound1V2 } from "../experiments/els-live-reading/lib/prompt2.mjs";
import { lockSha256, requestSha256 } from "../experiments/els-live-reading/lib/request.mjs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const prepared = prepareAll();

test("three Fable runs, one model, sequential priorities, no round 2", () => {
  assert.equal(RUNS.length, 3);
  assert.deepEqual([...MODELS], ["claude-fable-5-1"]);
  assert.deepEqual(RUNS.map((r) => r.id), ["C1", "C2", "C3"]);
  assert.ok(RUNS.every((r) => r.round2 === false));
  assert.deepEqual([...new Set(RUNS.map((r) => r.priority))].length, 3);
  assert.equal(MODEL.effort, "medium");
  assert.equal(MODEL.maxTokens, 64_000);
});

test("each window is the selected occurrence's rows +-10 (cut only at the saved or Torah edge), all 41 columns, rows verified by md5", () => {
  for (const { run, ctx } of prepared) {
    const r = ctx.region;
    assert.equal(r.nCols, 41, run.id);
    const rows = r.axisCells.map(([i]) => i);
    assert.ok(Math.min(...rows) - 1 <= MARGIN_ROWS && r.nRows - Math.max(...rows) <= MARGIN_ROWS, `${run.id}: at most ${MARGIN_ROWS} rows above and below`);
    assert.equal(Math.min(...rows) - 1, MARGIN_ROWS, `${run.id}: ${MARGIN_ROWS} rows above the occurrence`);
    assert.equal(r.axisCells.length, r.axis.length);
    assert.ok(ctx.pageCheck.mismatches.length === 0, `${run.id}: the page's letters equal the window`);
  }
  assert.ok(prepared.every((p) => p.run.windowFile === prepared[0].run.windowFile), "all three runs read the same window");
  const c1 = prepared.find((p) => p.run.id === "C1").ctx.region;
  assert.equal(c1.r1, 66, "Columbia is cut at the last full row of the Torah matrix");
});

test("the v4 prompt reuses the v2 system text, schema, description and data; only the background and the task differ", () => {
  const { ctx } = prepared[0];
  const v4 = buildRound1V4({ region: ctx.region, lines: ctx.lines });
  const v2 = buildRound1V2({ region: ctx.region, lines: ctx.lines, story: "none", marked: true });
  assert.equal(v4.system, v2.system);
  assert.equal(v4.prose.spec, v2.prose.spec);
  assert.equal(v4.data.grid, v2.data.grid);
  assert.equal(v4.data.lines, v2.data.lines);
  assert.notEqual(v4.prose.task, v2.prose.task);
  assert.deepEqual(FINDINGS_SCHEMA_V4, FINDINGS_SCHEMA_V2);
  assert.match(v4.prose.task, new RegExp(`עד ${MAX_FINDINGS_V4} הצעות`));
  assert.match(v4.prose.task, /חוצים אותו/);
  assert.match(v4.prose.task, /צמודים אליו/);
});

test("the three arms differ only in the instruction and the output cap; the focused request is the one already sent", () => {
  const byId = Object.fromEntries(prepared.map((p) => [p.run.id, p]));
  assert.equal(byId.C1.review.lock_sha256, "e9e5f54640bdcc690a99968891242f1f053b9312dae568edde7cd466dafc0285", "C1 is the request whose batch was created before the amendment");
  const { region, lines } = byId.C2.ctx;
  const v2 = buildRound1V2({ region, lines, story: "none", marked: true });
  assert.equal(byId.C2.request.messages[0].content, v2.user, "C2 is the previous (v2) instruction exactly");
  const c3 = byId.C3.request.messages[0].content;
  assert.equal(c3.replace("עד 25 הצעות.", "עד 60 הצעות."), v2.user, "C3 is v2 with the single number of the output cap changed");
  assert.notEqual(c3, v2.user);
  assert.equal(buildRound1General({ region, lines, cap: 60 }).user, v2.user);
  for (const id of ["C1", "C2", "C3"]) { assert.equal(byId[id].request.system, v2.system); assert.deepEqual(byId[id].request.output_config, byId.C1.request.output_config); }
});

test("the reviewed plan equals what the code builds; lock hashes are distinct", () => {
  const plan = JSON.parse(read("../experiments/els-axis-window/controls/plan-review.json"));
  assert.equal(plan.runs.length, 3);
  assert.deepEqual(plan.runs.map((r) => r.prompt), ["v4", "v2-general", "v2-general"]);
  const byId = new Map(plan.runs.map((e) => [e.id, e]));
  for (const { run, request } of prepared) {
    assert.equal(requestSha256(request), byId.get(run.id).request_sha256, run.id);
    assert.equal(lockSha256(request), byId.get(run.id).lock_sha256, run.id);
    assert.equal(request.model, "claude-fable-5-1");
  }
  assert.equal(new Set(plan.function.approved_lock_sha256).size, 3);
  assert.deepEqual(planReview(prepared).runs.map((r) => r.lock_sha256), plan.runs.map((r) => r.lock_sha256));
});

test("the budget is a hard sub-cap that counts all earlier spend", () => {
  assert.equal(EXPERIMENT_CAP_USD, 5.2);
  assert.equal(BUDGET.hard_guard_usd, Number((PRIOR_SPEND_USD + 5.2).toFixed(6)));
  assert.ok(BUDGET.hard_guard_usd - PRIOR_SPEND_USD < 7.72, "inside the remaining USD 7.72 that ZURIEL approved");
  assert.ok(BUDGET.hard_guard_usd < 40);
  const ledger = JSON.parse(read("../experiments/els-axis-window/controls/budget-ledger.json"));
  assert.equal(ledger.hard_guard_usd, BUDGET.hard_guard_usd);
  assert.equal(ledger.stop_new_usd, BUDGET.stop_new_usd);
  const seed = ledgerSeed();
  assert.equal(seed.entries.length, 1);
  assert.equal(seed.entries[0].usd, PRIOR_SPEND_USD);
  const previous = JSON.parse(read("../experiments/els-model-matched/controls/budget-ledger.json"));
  assert.equal(Math.round(previous.spent_usd * 1e6) / 1e6, PRIOR_SPEND_USD, "the prior spend equals the EXP-17 ledger total");
});

test("no target word lives in the EXP-18 code or prompt", () => {
  const targets = JSON.parse(read("../experiments/els-live-reading/evaluation/targets.json")).targets;
  const dir = new URL("../experiments/els-axis-window/", import.meta.url);
  const files = [...readdirSync(new URL("lib/", dir)).map((f) => `lib/${f}`), "run-axis.mjs", "build-windows.mjs"];
  for (const file of files) { const text = readFileSync(new URL(file, dir), "utf8"); for (const t of targets) assert.ok(!text.includes(t), `${file} contains a target word`); }
  // the grid and the lines hold the letters of the region (so a target may appear there as letters); the instruction text itself never names one
  for (const { ctx } of prepared) { const { prose } = buildRound1V4({ region: ctx.region, lines: ctx.lines }); for (const t of targets) assert.ok(![prose.intro, prose.task].some((part) => part.includes(t)), "the instruction names a target"); }
});

test("a live stage without the pass-through environment refuses and sends nothing", () => {
  const env = { ...process.env, ELS_PROXY_URL: "", ELS_PROXY_TOKEN: "", ELS_PROXY_JWT: "", ELS_EXPERIMENT_ANTHROPIC_KEY: "" };
  for (const stage of ["selftest", "run"]) {
    const run = spawnSync(process.execPath, ["experiments/els-axis-window/run-axis.mjs", stage], { cwd: new URL("../", import.meta.url).pathname, env, encoding: "utf8" });
    assert.equal(run.status, 2, stage);
    assert.match(run.stderr, /no credential/);
  }
});
