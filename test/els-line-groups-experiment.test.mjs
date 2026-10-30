import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import * as M from "../supabase/functions/_shared/elsMatrixReading.js";
import { handle } from "../experiments/els-axis-addendum/edge/handler.mjs";
import { MAX_LOCKS, renderSource } from "../experiments/els-line-groups/edge/render.mjs";
import { buildRuns } from "../experiments/els-line-groups/lib/arms.mjs";
import { chunk, selectGroups } from "../experiments/els-line-groups/lib/groups.mjs";
import { ARMS, CAP, EXPERIMENT_CAP_USD, GROUP_SIZE, MODEL } from "../experiments/els-line-groups/lib/plan.mjs";
import { SCHEMA_A, SCHEMA_B, buildGroupPrompt, splitPreservesLetters } from "../experiments/els-line-groups/lib/prompts.mjs";
import { SAVED_LINE_IDS } from "../experiments/els-line-groups/lib/selection.mjs";
import { SUPABASE_URL, planReview, processEntry, worstCaseUsd } from "../experiments/els-line-groups/run.mjs";
import { guard, reserve, seed, loadLedger } from "../experiments/els-axis-addendum/lib/ledger.mjs";

// EXP-23: a diagnostic of why the reading missed the six saved findings (input load, choice of proposals, Hebrew recognition and word division). These tests prove the plan, the
// group rule, the two instructions, the lock and the guards BEFORE any call. The group choice is evaluation-oriented, so the experiment is a diagnostic and never a blind discovery.
const root = fileURLToPath(new URL("../", import.meta.url));
const exp = join(root, "experiments/els-line-groups");
const json = (path) => JSON.parse(readFileSync(path, "utf8"));
const fixtures = join(root, "test/fixtures/els-matrix-reading/regression-saved-cipher");
const SAVED = json(join(fixtures, "saved-cipher.json"));
const FORMS = [...SAVED.findings.map((f) => f.t), "מחכית שפו", "לכפר עליכם", "האר חשך", "מלך", "מחכי", "תשפו", "האר", "חשך", "לכפר", "עליכם"];
const mentions = (text, form) => new RegExp(`(?<![א-ת])${form}(?![א-ת])`).test(text);

test("the committed plan is what the code builds now: 8 groups x 2 arms, the worst cases of all 16 requests inside the USD 5", async () => {
  const fresh = await planReview();
  assert.deepEqual(json(join(exp, "controls/plan-review.json")), fresh, "controls/plan-review.json is stale: rerun `plan`");
  assert.equal(EXPERIMENT_CAP_USD, 5);
  assert.equal(fresh.runs.length, 16);
  assert.ok(fresh.budget.fits_cap && fresh.budget.sum_of_worst_cases_usd <= 5 && fresh.budget.headroom_usd > 0.5, JSON.stringify(fresh.budget));
  assert.deepEqual([MODEL.id, MODEL.effort, MODEL.maxTokens, GROUP_SIZE, CAP], ["claude-fable-5-1", "medium", 10_000, 8, 12]);
  assert.equal(fresh.window_sha256, "208cbe689b68f941daf995f07ff490d8974a5c13128f1724c8792471c02802fe", "the canonical window of EXP-22");
  for (const r of fresh.runs) { assert.equal(r.lines.length, 8); assert.ok(r.worst_case_usd > 0.26 && r.worst_case_usd < 0.28, `${r.id} ${r.worst_case_usd}`); }
  assert.deepEqual(fresh.function.approved_lock_sha256, fresh.runs.map((r) => r.lock_sha256));
  assert.equal(new Set(fresh.function.approved_lock_sha256).size, 16);
  assert.ok(fresh.function.approved_lock_sha256.length <= MAX_LOCKS);
  // the reservation of every worst case together still leaves the cap unbroken, in any order
  const dir = mkdtempSync(join(tmpdir(), "exp23-"));
  try {
    const path = join(dir, "ledger.json");
    writeFileSync(path, JSON.stringify(seed(EXPERIMENT_CAP_USD)));
    for (const r of fresh.runs) { assert.equal(guard(loadLedger(path), r.worst_case_usd).ok, true, r.id); reserve(path, { id: r.id, usd: r.worst_case_usd }); }
    assert.ok(loadLedger(path).spent_usd <= 5);
    assert.equal(guard(loadLedger(path), 1).ok, false, "a further request would pass the cap");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("the group rule: fixed size, canonical order, saved groups first in pairs with positional controls; it reads ids only, never letters", async () => {
  const { ctx, groups } = await buildRuns();
  const ids = ctx.lines.map((l) => l.id);
  assert.equal(ids.length, 212);
  const chunks = chunk(ids);
  assert.equal(chunks.length, 26, "27 chunks, the last of 4 lines is never used");
  assert.ok(chunks.every((c) => c.ids.length === 8));
  assert.deepEqual(groups.map((g) => [g.id, g.role, g.control_of ?? null]), [["G02", "saved_lines", null], ["G03", "control", "G02"], ["G06", "saved_lines", null], ["G08", "control", "G06"], ["G07", "saved_lines", null], ["G09", "control", "G07"], ["G10", "saved_lines", null], ["G11", "control", "G10"]]);
  assert.deepEqual(groups.map((g) => `${g.ids[0]}..${g.ids[7]}`), ["R09..R16", "R17..R24", "C08..C15", "C24..C31", "C16..C23", "C32..C39", "C40..D06", "D07..D14"]);
  const saved = new Set(SAVED_LINE_IDS);
  assert.ok(groups.filter((g) => g.role === "saved_lines").every((g) => g.ids.some((id) => saved.has(id))));
  assert.ok(groups.filter((g) => g.role === "control").every((g) => !g.ids.some((id) => saved.has(id))), "no control group holds a saved line");
  assert.deepEqual([...new Set(groups.flatMap((g) => g.ids.filter((id) => saved.has(id))))].sort(), [...SAVED_LINE_IDS].sort(), "every saved line is covered");
  assert.equal(new Set(groups.flatMap((g) => g.ids)).size, 64, "no line is in two groups");
  // the choice is a function of the ids: the same on any other letters
  assert.deepEqual(selectGroups(ids), selectGroups(ids.slice()));
  assert.equal(selectGroups.length >= 1 && /letters/.test(selectGroups.toString()), false, "the group rule never touches a letter");
});

test("the two instructions differ only in the paragraph that says what to return; neither names a word or marks a line; saved and control groups read the same text", async () => {
  const { runs } = await buildRuns();
  for (const group of new Set(runs.map((r) => r.group.id))) {
    const a = runs.find((r) => r.id === `${group}A`), b = runs.find((r) => r.id === `${group}B`);
    assert.equal(b.prompt.user, a.prompt.user.replace(a.prompt.fields, b.prompt.fields), `${group}: B is A with section 4 replaced`);
    assert.equal(a.request.system, b.request.system);
    assert.equal(a.request.system, M.SYSTEM, "the system text is the product's");
    assert.deepEqual([a.request.max_tokens, b.request.max_tokens, JSON.stringify(a.request.thinking), a.request.output_config.effort], [10_000, 10_000, JSON.stringify(b.request.thinking), "medium"]);
    assert.deepEqual(a.request.output_config.format.schema, SCHEMA_A);
    assert.deepEqual(b.request.output_config.format.schema, SCHEMA_B);
  }
  // the text of the instruction is the same for a saved and a control group once the shown lines are masked
  const masked = (r) => r.prompt.user.replace(/## הקווים[\s\S]*?(?=## המשימה)/, "## הקווים\n<LINES>\n\n");
  for (const arm of ["A", "B"]) assert.equal(new Set(runs.filter((r) => r.arm === arm).map(masked)).size, 1, `arm ${arm}: one text for every group`);
  const a = runs[0].prompt, b = runs[1].prompt;
  assert.match(a.prose.task, /אין מכסת מינימום ואין חובה למלא אותה/);
  assert.match(a.prose.task, /אל תפסול הצעה רק משום שהמילה אינה במילון/);
  assert.match(b.fields, /חיבור המילים בלי הרווחים, אחרי נרמול האותיות הסופיות, חייב לתת בדיוק את אותיות text/);
  assert.match(b.fields, /בלי לבנות סיפור או הקשר שאינם בקלט/);
  assert.match(b.fields, /unclear_split/);
  assert.doesNotMatch(a.fields, /display|classification|explanation/);
  assert.doesNotMatch(a.prose.task + b.prose.task, /לפחות \d+ הצעות|מינימום של/);
  // no saved word (nor its parts, as whole words) in an instruction, a schema or the code that builds and runs the plan; the saved line ids appear only in the selection file
  for (const r of runs) for (const [what, text] of Object.entries({ system: r.request.system, intro: r.prompt.prose.intro, spec: r.prompt.prose.spec, task: r.prompt.prose.task, schema: JSON.stringify(r.request.output_config) })) for (const form of FORMS) assert.equal(mentions(text, form), false, `${r.id}/${what} must not contain "${form}"`);
  const walk = (dir) => readdirSync(dir).flatMap((name) => { const full = join(dir, name); return statSync(full).isDirectory() ? (["controls", "results"].includes(name) ? [] : walk(full)) : [full]; });
  const code = walk(exp).filter((f) => !/(evaluate|matrix)\.mjs$|PREREGISTERED/.test(f));
  assert.ok(code.length >= 7, `found ${code.length} files`);
  for (const file of code) { const text = readFileSync(file, "utf8"); for (const form of SAVED.findings.map((f) => f.t)) assert.equal(text.includes(form), false, `${relative(root, file)} contains "${form}"`); assert.equal(/saved-cipher\.json|regression-saved-cipher/.test(text), false, `${relative(root, file)} reads the saved cipher`); }
  for (const file of code.filter((f) => !/selection\.mjs$/.test(f))) { const text = readFileSync(file, "utf8"); assert.equal(/SAVED_LINE_IDS/.test(text) && !/groups\.mjs$/.test(file), false, `${relative(root, file)} uses the saved line ids outside the group rule`); }
  assert.deepEqual(ARMS.map((x) => x.id), ["A", "B"]);
});

test("the split rule of arm B is checked by code: final letters folded, spaces removed, the letters exactly those of the sequence", () => {
  assert.equal(splitPreservesLetters("שמע ישראל", "שמעישראל"), true);
  assert.equal(splitPreservesLetters("שמע ישראל", "שמעישרא"), false, "an added letter");
  assert.equal(splitPreservesLetters("בכל לבבך", "בכללבבכ"), true, "a final letter written in its final form");
  assert.equal(splitPreservesLetters("לכפר על כם", "לכפרעליכמ"), false, "a changed letter");
  assert.equal(splitPreservesLetters("כמלא", "כלמא"), false, "reordered letters");
  assert.equal(splitPreservesLetters("", "אבג"), false);
});

test("the pass-through lock: the 16 reviewed requests pass, anything else (another request, a changed one, a batch of two) is refused before the provider", async () => {
  const { runs } = await buildRuns();
  const token = "t".repeat(64);
  const tokenSha256 = await M.sha256Hex(token);
  const cfg = { apiKey: "key-held-by-the-function", tokenSha256, approved: new Set(runs.map((r) => r.lockSha256)), models: [MODEL.id], maxBody: 400_000, expiresAt: Date.now() + 3_600_000, round2Bases: new Set([]), round2Prefix: "", round2MaxCards: 0, round2MaxAssistant: 0, round2MaxUser: 0 };
  const upstream = [];
  const fakeUpstream = async (url, init) => { upstream.push({ url, init }); return new Response("{}", { status: 200, headers: { "content-type": "application/json" } }); };
  const post = (body, headers = { "x-els-token": token }) => handle(new Request("https://example.test/functions/v1/els-live-reading/v1/messages/batches", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) }), cfg, fakeUpstream);
  for (const r of runs) assert.equal((await post({ requests: [{ custom_id: r.customId, params: r.request }] })).status, 200, r.id);
  assert.equal(upstream.length, 16);
  assert.ok(runs.every((r) => /^els-live-[a-z0-9-]{1,32}$/.test(r.customId)), "every custom id passes the handler's shape rule");
  const [first, second] = runs;
  const changed = { ...first.request, messages: [{ ...first.request.messages[0], content: `${first.request.messages[0].content} ` }] };
  const refusals = [
    [await post({ requests: [{ custom_id: first.customId, params: changed }] }), 403, /request_not_approved/],
    [await post({ requests: [{ custom_id: first.customId, params: { ...first.request, max_tokens: 64_000 } }] }), 403, /request_not_approved/],
    [await post({ requests: [{ custom_id: first.customId, params: { ...first.request, model: "claude-opus-5-5" } }] }), 403, /model_not_allowed/],
    [await post({ requests: [{ custom_id: first.customId, params: first.request }, { custom_id: second.customId, params: second.request }] }), 400, /one_request_only/],
    [await post({ requests: [{ custom_id: first.customId, params: first.request }] }, {}), 403, /forbidden/],
    [await post({ requests: [{ custom_id: first.customId, params: first.request }] }, { "x-els-token": "0".repeat(64) }), 403, /forbidden/],
  ];
  for (const [response, status, pattern] of refusals) { assert.equal(response.status, status); assert.match(await response.text(), pattern); }
  assert.equal(upstream.length, 16, "nothing refused reached the provider");
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
  assert.throws(() => renderSource("live", { ...args, approve: [...runs.map((r) => r.lockSha256), ...Array.from({ length: 5 }, (_, i) => String(i).repeat(64))].join(",") }), /1 to 20 distinct/);
  assert.throws(() => renderSource("live", { ...args, approve: `${runs[0].lockSha256},${runs[0].lockSha256}` }), /distinct/);
  assert.throws(() => renderSource("live", { ...args, "token-sha256": "abc" }), /64 hex/);
  assert.throws(() => renderSource("live", { ...args, model: "claude-fable-5-1,claude-opus-5-5" }), /exactly one/);
  const off = renderSource("disabled");
  assert.match(off, /status: 410/);
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
const matchEverything = async (url, init) => {
  assert.equal(url, `${SUPABASE_URL}/rest/v1/rpc/els_verify_occurrence_v1`);
  return { ok: true, status: 200, json: async () => ({ status: "OK", verification_state: "MATCH", contract: "els_occurrence_replay_v1", corpus_id: "test", occurrence: { occurrence_id: "test" } }) };
};
const answer = (text, extra = {}) => ({ custom_id: "els-live-g02b", result: { type: "succeeded", message: { model: MODEL.id, stop_reason: "end_turn", content: [{ type: "text", text }], usage: { input_tokens: 3_000, output_tokens: 2_500, output_tokens_details: { thinking_tokens: 1_800 } }, ...extra } } });

test("an answer is located ONLY in the lines of its group, split and classification of arm B are checked, duplicates and outside citations are counted; a cut-off or failed answer keeps its cost and shows nothing", async () => {
  const { ctx, runs } = await buildRuns();
  const g02b = runs.find((r) => r.id === "G02B");
  const readings = M.readings(g02b.groupLines);
  const r09 = readings.get("R09+").letters;
  const sequence = r09.slice(r09.indexOf("המשפח"), r09.indexOf("המשפח") + 5); // a stretch of a shown source row (synthetic test input, not a finding)
  const outside = ctx.lines.find((l) => l.id === "C21").letters.slice(10, 15); // letters that exist only in a line the group does not show
  assert.ok(!Object.values(Object.fromEntries(readings)).some((r) => r.letters.includes(outside)), "the outside sequence is really absent from the group's lines");
  const timing = { batch_ms: 100_000 };
  const body = { findings: [
    { id: "F1", line: "R09+", text: sequence, display: "ה משפח", classification: "unclear_split", explanation: "בדיקה" },
    { id: "F2", line: "R09+", text: sequence, display: "המשפח", classification: "clear_word_or_phrase", explanation: "כפילות" },
    { id: "F3", line: "R09+", text: sequence, display: "המשפחו", classification: "name", explanation: "אות מיותרת" },
    { id: "F4", line: "C21+", text: outside, display: outside, classification: "unclear_split", explanation: "קו מחוץ לקבוצה" },
  ], observations: "" };
  const done = await processEntry({ run: g02b, ctx, entry: answer(JSON.stringify(body)), batch: { id: "msgbatch_test" }, timing, fetchImpl: matchEverything, restHeaders: () => ({}) });
  assert.equal(done.state, "COMPLETE");
  assert.deepEqual([done.summary.proposals, done.summary.source_rows, done.summary.engine_verified, done.summary.not_verified], [4, 3, 0, 1], "the outside sequence is NOT verified: it is not in the group's lines");
  assert.equal(done.summary.duplicates, 2);
  assert.equal(done.summary.cited_line_outside_group, 1);
  assert.deepEqual(done.findings.map((f) => f.group_check.split_preserves_letters), [true, true, false, true]);
  assert.deepEqual(done.summary.classifications, { clear_word_or_phrase: 1, name: 1, abbreviation: 0, unclear_split: 2 });
  assert.equal(done.summary.split_invalid, 1);
  assert.equal(done.findings[0].verification.state, "PLAIN_TEXT_ONLY", "a stretch of a shown row is a source row, reported apart from ELS");
  assert.equal(done.cost.usd, M.costFromUsage(MODEL.id, done.usage, { batch: true }).usd);
  const g02a = runs.find((r) => r.id === "G02A");
  const basic = await processEntry({ run: g02a, ctx, entry: answer(JSON.stringify({ findings: [{ id: "F1", line: "R09+", text: sequence }], observations: "x" })), batch: null, timing, fetchImpl: matchEverything, restHeaders: () => ({}) });
  assert.deepEqual([basic.state, basic.summary.proposals, "split_invalid" in basic.summary], ["COMPLETE", 1, false]);
  const cut = await processEntry({ run: g02b, ctx, entry: answer("{\"findings\":[", { stop_reason: "max_tokens" }), batch: null, timing, fetchImpl: async () => assert.fail("no engine call for a cut-off answer"), restHeaders: () => ({}) });
  assert.deepEqual([cut.state, cut.reason, cut.findings, cut.cost.usd > 0], ["INCOMPLETE", "max_tokens", undefined, true]);
  const bad = await processEntry({ run: g02b, ctx, entry: answer("not json"), batch: null, timing, fetchImpl: async () => assert.fail("no engine call"), restHeaders: () => ({}) });
  assert.deepEqual([bad.state, bad.reason], ["INCOMPLETE", "invalid_json"]);
  const failed = await processEntry({ run: g02b, ctx, entry: { custom_id: "x", result: { type: "errored", error: { type: "api_error" } } }, batch: null, timing, fetchImpl: async () => assert.fail("no engine call"), restHeaders: () => ({}) });
  assert.deepEqual([failed.state, failed.reason, failed.cost.usd], ["FAILED", "batch_errored", null]);
  assert.ok(worstCaseUsd(3_000) < 0.3);
});

// ---------- the recorded run (EXP-23, 30.10.2026): what happened is what was reviewed, each request was sent once, inside the USD 5 ----------
test("the recorded run: each reviewed request was sent exactly once, the answers are saved as received (refusals included), inside the USD 5; the blinded rating input carries sequences only; the evaluation file is what the code computes", async () => {
  const { evaluate, blindExport, loadResults } = await import("../experiments/els-line-groups/evaluate.mjs");
  const plan = json(join(exp, "controls/plan-review.json"));
  const log = readFileSync(join(exp, "controls/run-log.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  assert.equal(log.filter((e) => e.event === "batch_created").length, 16, "one batch per request, never a retry");
  assert.equal(log.filter((e) => e.event === "preflight").length, 16);
  assert.equal(log.filter((e) => ["create_unknown", "budget_stop", "halted", "stop_duplicate", "error"].includes(e.event)).length, 0);
  const states = {};
  for (const r of plan.runs) {
    assert.equal(log.filter((e) => e.event === "batch_created" && e.run === r.id).length, 1, r.id);
    const entry = json(join(exp, `controls/runs/${r.id}/batch-entry.json`));
    const result = json(join(exp, `controls/runs/${r.id}/result.json`));
    assert.deepEqual([result.request_sha256, result.lock_sha256, result.window_sha256], [r.request_sha256, r.lock_sha256, plan.window_sha256], `${r.id}: what was sent is what was reviewed`);
    assert.equal(entry.saved_as_received, true);
    assert.equal(entry.entry.result.type, "succeeded");
    assert.equal(result.cost.usd, M.costFromUsage(MODEL.id, entry.entry.result.message.usage, { batch: true }).usd);
    assert.ok(entry.entry.result.message.usage.output_tokens <= MODEL.maxTokens);
    states[result.state === "COMPLETE" ? "complete" : entry.entry.result.message.stop_reason] = (states[result.state === "COMPLETE" ? "complete" : entry.entry.result.message.stop_reason] ?? 0) + 1;
    if (result.state === "INCOMPLETE") { assert.equal(result.reason, "refusal"); assert.equal(result.findings, undefined, "nothing is shown from a refused answer"); assert.ok(["cyber", "bio"].includes(entry.entry.result.message.stop_details.category)); }
    else { assert.ok(result.findings.every((f) => f.group_check.cited_line_in_group), `${r.id}: only the group's lines were cited`); assert.equal(result.summary.duplicates, 0); }
  }
  assert.deepEqual(states, { complete: 11, refusal: 5 });
  const ledger = loadLedger(join(exp, "controls/budget-ledger.json"));
  assert.ok(ledger.entries.every((e) => !e.reserved && !e.unknown_outcome) && ledger.entries.length === 16);
  assert.ok(ledger.spent_usd < 1.3 && ledger.spent_usd <= EXPERIMENT_CAP_USD);
  const { runs } = await buildRuns();
  const results = loadResults(runs);
  const { items, key } = blindExport(results);
  assert.ok(items.every((i) => Object.keys(i).sort().join() === "rid,text"), "the rater sees a sequence and an opaque id, nothing else");
  assert.equal(items.length, 115);
  assert.deepEqual(Object.keys(json(join(exp, "results/blind-ratings.json"))).sort(), items.map((i) => i.rid).sort(), "every sequence was rated");
  assert.deepEqual(json(join(exp, "results/blind-key.json")), JSON.parse(JSON.stringify(key)), "the key decodes exactly the exported ids");
  const fresh = await evaluate();
  const saved = json(join(exp, "results/summary.json"));
  delete fresh.generated_at; delete saved.generated_at;
  assert.deepEqual(saved, JSON.parse(JSON.stringify(fresh)), "results/summary.json is stale: rerun evaluate");
  assert.deepEqual(fresh.targets.map((t) => [t.line, t.group]), [["C17", "G07"], ["R16", "G02"], ["D03", "G10"], ["C13", "G06"], ["C21", "G07"], ["R09", "G02"]], "each saved finding belongs to the group of its own line");
  assert.deepEqual([fresh.saved_exact.A, fresh.saved_exact.B], [0, 0]);
});
