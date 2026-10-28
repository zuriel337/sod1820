import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadContext, regionPathOf, round1Request, round1RequestV2, usesExp16Prompt } from "../experiments/els-live-reading/lib/context.mjs";
import { COLUMBIA, MATRIX_WIDTH, WINDOW_COLS, WINDOW_ROWS, mulberry32, sampleWindows, seedOf } from "../experiments/els-live-reading/lib/windows.mjs";
import { WINDOW_COUNT, WINDOW_SEED_LABEL, buildWindow, pageLetters } from "../experiments/els-live-reading/build-windows.mjs";
import { PLANTED_WORDS, distanceClass, plantedFile } from "../experiments/els-live-reading/lib/plant.mjs";
import { FINDINGS_SCHEMA_V2, FIRST_GROUP_SIZE, HINTS, STORIES, STORY_WRONG, buildRound1V2 } from "../experiments/els-live-reading/lib/prompt2.mjs";
import { ROUND2_PREFIX, STORY, buildRound2Message } from "../experiments/els-live-reading/lib/prompt.mjs";
import { FINDINGS_SCHEMA_V3, RELATION_TYPES, buildRound1V3 } from "../experiments/els-live-reading/lib/prompt3.mjs";
import * as edge from "../experiments/els-live-reading/edge/handler.mjs";
import { RUNS, SERIES, runById } from "../experiments/els-live-reading/lib/plan.mjs";
import { BUDGET, appendEntry, guardSpend, loadLedger, spentOf } from "../experiments/els-live-reading/lib/ledger.mjs";
import { classify, locateFinding, syntheticRows, verificationItems } from "../experiments/els-live-reading/lib/validate.mjs";
import { TORAH_LENGTH, chanceModel, enrich, expectedChance, plantedRecall, recallBy, runMetrics, torahChanceModel } from "../experiments/els-live-reading/lib/metrics.mjs";
import { createHash } from "node:crypto";
import { renderSummary } from "../experiments/els-live-reading/lib/summary.mjs";
import { KEY_ENV, lockSha256, requestSha256 } from "../experiments/els-live-reading/lib/request.mjs";

const DIR = fileURLToPath(new URL("../experiments/els-live-reading/", import.meta.url));
const PAGE = fileURLToPath(new URL("../public/tzofen.html", import.meta.url));
const TARGETS = ["ספינת", "יכלאש", "אשאכלה"]; // named here only; the library, the runner and the requests must not contain them
const EXP15_REQUEST_SHA = "a8eb021bb779f551449302184d4e6844dfedfb60428d87466fa72a43505caa15";
const ctxOf = (run) => loadContext(PAGE, { regionPath: regionPathOf(run.region) });

test("EXP-16 windows: seeded, disjoint from each other and from Columbia, prefix-stable, and the page copy equals the canonical table for every whole window", () => {
  const seed = seedOf(WINDOW_SEED_LABEL);
  const windows = sampleWindows({ seed, n: WINDOW_COUNT });
  assert.equal(windows.length, 8);
  assert.deepEqual(sampleWindows({ seed, n: 3 }), windows.slice(0, 3), "the first k windows do not depend on how many are asked for");
  assert.deepEqual(sampleWindows({ seed, n: WINDOW_COUNT }), windows, "deterministic");
  for (const [k, w] of windows.entries()) {
    assert.equal(w.r1 - w.r0 + 1, WINDOW_ROWS);
    assert.equal(w.c1 - w.c0 + 1, WINDOW_COLS);
    assert.ok(w.r1 <= 66 && w.c0 >= 21 && w.c1 <= MATRIX_WIDTH - 22, "complete rows and no wrap");
    assert.equal(w.r0 <= COLUMBIA.r1 && COLUMBIA.r0 <= w.r1 && w.c0 <= COLUMBIA.c1 && COLUMBIA.c0 <= w.c1, false, `${w.id} shares no cell with Columbia`);
    for (const other of windows.slice(k + 1)) assert.equal(w.r0 <= other.r1 && other.r0 <= w.r1 && w.c0 <= other.c1 && other.c0 <= w.c1, false, `${w.id}/${other.id} disjoint`);
  }
  const a = mulberry32(7); const b = mulberry32(7);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
  const canonical = JSON.parse(readFileSync(`${DIR}review/window-md5-canonical.json`, "utf8")).windows;
  const letters = pageLetters(PAGE);
  for (const w of windows) {
    const file = buildWindow(letters, w);
    assert.equal(file.md5_window, canonical.find((c) => c.id === w.id).md5_window, `${w.id}: page copy equals public.torah_stream (md5 of the whole window)`);
    assert.deepEqual(JSON.parse(readFileSync(`${DIR}data/windows/${w.id}.json`, "utf8")), JSON.parse(JSON.stringify(file)), `${w.id}: the data file is what the builder makes`);
  }
});

test("EXP-16 window files load like the Columbia region: checksums, no axis, second copy of the text agrees cell by cell", () => {
  for (const id of ["w01", "w02", "w03", "w04", "w05", "w06", "w07", "w08"]) {
    const ctx = loadContext(PAGE, { regionPath: regionPathOf(id) });
    assert.equal(ctx.pageCheck.mismatches.length, 0, id);
    assert.equal(ctx.pageCheck.checked, 1353);
    assert.equal(ctx.region.axisCells.length, 0);
    assert.equal(ctx.lines.length, 212);
  }
});

test("EXP-16 planted windows: the words are where the truth says, never overlap, follow the registered kinds, distances and directions, and the untouched grid still equals the page", () => {
  for (const id of ["p1", "p2"]) {
    const base = JSON.parse(readFileSync(`${DIR}data/windows/${PLANTED_WORDS[id].base}.json`, "utf8"));
    const file = JSON.parse(readFileSync(`${DIR}data/windows/${id}.json`, "utf8"));
    assert.deepEqual(file, JSON.parse(JSON.stringify(plantedFile(base, id))), `${id}: deterministic`);
    const ctx = loadContext(PAGE, { regionPath: regionPathOf(id) });
    assert.equal(ctx.pageCheck.mismatches.length, 0, `${id}: untouched copy equals the page; only planted cells differ`);
    assert.equal(ctx.region.synthetic, true);
    const cells = new Set();
    for (const [k, word] of file.planted.entries()) {
      const spec = PLANTED_WORDS[id].words[k];
      assert.deepEqual([word.text, word.kind, word.reversed, word.distance, word.type], [spec.text, spec.kind, spec.reversed, spec.distance, spec.type]);
      assert.equal(ctx.byReading.get(word.reading).letters.slice(word.from, word.to + 1), word.folded, `${word.text} is spelled in ${word.reading}`);
      assert.equal(distanceClass(word.cells[Math.floor(word.cells.length / 2)]), word.distance);
      assert.equal(word.reading.endsWith("-"), word.reversed);
      for (const [i, j] of word.cells) { assert.equal(cells.has(`${i},${j}`), false, "no overlap"); cells.add(`${i},${j}`); }
    }
    assert.equal(file.planted.length, 6);
    assert.deepEqual([...new Set(file.planted.map((w) => w.kind))].sort(), ["A", "C", "D", "R"]);
    assert.equal(file.planted.filter((w) => w.reversed).length, 2);
    // the file really has planted letters, and the page loader would reject a changed cell that is not planted
    const tampered = JSON.parse(JSON.stringify(file));
    assert.notDeepEqual(tampered.grid.map((r) => r.s), tampered.base_grid.map((r) => r.s));
  }
});

test("EXP-16 prompt v2: the same instruction text in every arm; the story, the marking and the hint are the only differences; no story or topic in the none arm", () => {
  const ctx = ctxOf({ region: "columbia" });
  const arm = (opts) => buildRound1V2({ region: ctx.region, lines: ctx.lines, ...opts });
  const columbia = arm({ story: "columbia" });
  const wrong = arm({ story: "wrong" });
  const none = arm({ story: "none" });
  assert.ok(columbia.user.includes(STORY) && !columbia.user.includes(STORY_WRONG));
  assert.ok(wrong.user.includes(STORY_WRONG) && !wrong.user.includes(STORY));
  assert.ok(!none.user.includes(STORY) && !none.user.includes(STORY_WRONG));
  assert.match(none.user, /אין תיאור ואין נושא/);
  assert.equal(columbia.prose.task, wrong.prose.task);
  assert.equal(columbia.prose.task, none.prose.task);
  assert.equal(columbia.prose.spec, none.prose.spec);
  assert.equal(columbia.data.lines, none.data.lines);
  assert.equal(columbia.data.grid, none.data.grid);
  assert.ok(!columbia.user.includes("המופע הנבחר") && !columbia.user.includes("בשורה הזו יש תא"), "unmarked: nothing names or marks the occurrence");
  const marked = arm({ story: "none", marked: true });
  assert.ok(marked.user.includes("המופע הנבחר") && marked.user.includes("← בשורה הזו יש תא של המופע הנבחר"));
  assert.throws(() => arm({ marked: true, region: ctxOf({ region: "w01" }).region }), /no selected occurrence/);
  assert.ok(columbia.prose.task.includes(`עד ${FIRST_GROUP_SIZE}`) && /סדר הצגה בלבד, לא סינון/.test(columbia.prose.task), "tier is a presentation order, not a filter");
  assert.ok(/אל תדרג לפי קרבה לאמצע הקטע או לפי סוג הקו/.test(columbia.prose.task), "no geometry assumption");
  const hinted = arm({ story: "columbia", marked: true, hint: "names" });
  assert.ok(hinted.user.includes(HINTS.names) && !columbia.user.includes("רמז אבחוני"));
  const lineOnly = arm({ story: "none", marked: true, hint: "lines", onlyLines: ["D45", "A45"] });
  assert.equal(lineOnly.data.grid, null);
  assert.ok(/D45\+/.test(lineOnly.user) && /A45-/.test(lineOnly.user) && !/D44\+/.test(lineOnly.user));
  assert.ok(FINDINGS_SCHEMA_V2.properties.findings.items.required.includes("tier"));
  assert.deepEqual(FINDINGS_SCHEMA_V2.properties.findings.items.properties.tier.enum, ["A", "B", "C"]);
  assert.deepEqual(Object.keys(STORIES), ["columbia", "wrong", "none", "axis"]);
});

test("EXP-16 plan: S1 is the EXP-15 request byte for byte; every request hash is unique; blind runs carry no hint; diagnostics are marked and last; targets are in no request", () => {
  const ids = RUNS.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(Object.keys(SERIES).includes("diagnostic"));
  const hashes = new Map();
  for (const run of RUNS) {
    const ctx = ctxOf(run);
    const { round1, request } = usesExp16Prompt(run) ? round1RequestV2(ctx, run) : round1Request(ctx);
    assert.equal(request.model, "claude-fable-5-1");
    assert.equal(request.max_tokens, 64_000);
    assert.equal(request.output_config.effort, "medium");
    assert.equal(request.thinking.type, "adaptive");
    // The letters of the region necessarily contain the targets as runs (they are part of the matrix); what must not contain them is everything the harness writes: the system text, the prose, the schema.
    const prose = `${request.system}\n${Object.values(round1.prose).join("\n")}\n${JSON.stringify(request.output_config)}`;
    for (const target of TARGETS) assert.equal(prose.includes(target), false, `${run.id}: the harness's own text contains a target`);
    hashes.set(run.id, requestSha256(request));
    assert.match(lockSha256(request), /^[0-9a-f]{64}$/);
    if (run.series === "diagnostic") { assert.ok(run.hint, `${run.id} is a diagnostic: it has a hint`); assert.ok(run.priority >= 4, "diagnostics run last"); } else { assert.equal(run.hint, undefined, `${run.id}: a blind run has no hint`); assert.ok(run.priority <= 3.5); }
    if (run.series === "planted") assert.equal(ctx.region.synthetic, true);
  }
  assert.equal(new Set(hashes.values()).size, hashes.size, "no two runs send the same request");
  assert.equal(hashes.get("S1"), EXP15_REQUEST_SHA, "S1 repeats the EXP-15 request exactly");
  assert.equal(runById("N1").story, "none");
  assert.deepEqual(RUNS.filter((r) => r.group === "story" && r.id.startsWith("S4")).map((r) => r.region), ["w01", "w02", "w03", "w04", "w05", "w06"]);
  assert.deepEqual(RUNS.filter((r) => r.id.startsWith("N2")).map((r) => r.region), ["w01", "w02", "w03", "w04"], "the no-story windows are the first four story windows (paired)");
  for (const f of readdirSync(`${DIR}lib`)) assert.equal(TARGETS.some((t) => readFileSync(`${DIR}lib/${f}`, "utf8").replace(/\/\/.*$/gm, "").includes(t)), false, `lib/${f} names a target`);
  assert.equal(TARGETS.some((t) => readFileSync(`${DIR}run-live-reading.mjs`, "utf8").replace(/\/\/.*$/gm, "").includes(t)), false);
});

test("EXP-16 ledger and guard: the three EXP-15 calls are in it, the guard refuses a worst case past the hard guard and new arms past the stop level, and every call appends its cost", () => {
  const ledger = loadLedger(`${DIR}controls/budget-ledger.seed.json`);
  assert.equal(spentOf(ledger), 2.481606);
  assert.deepEqual([ledger.cap_usd, ledger.hard_guard_usd, ledger.stop_new_usd], [BUDGET.cap_usd, BUDGET.hard_guard_usd, BUDGET.stop_new_usd]);
  assert.equal(guardSpend(ledger, 3.5).ok, true);
  assert.equal(guardSpend({ entries: [{ usd: 30.5 }] }, 0.1).ok, false, "above the stop level");
  assert.equal(guardSpend({ entries: [{ usd: 29 }] }, 16).ok, false, "worst case 37 > 36");
  assert.equal(guardSpend({ entries: [{ usd: 29 }] }, 16, { batch: false }).ok, false);
  assert.equal(guardSpend({ entries: [{ usd: 29 }] }, 13).ok, true, "29 + 6.5 = 35.5 <= 36 as a batch");
  assert.equal(guardSpend(ledger, Number.NaN).ok, false);
  assert.throws(() => loadLedger(`${DIR}controls/does-not-exist.json`), /refusing to call any model/);
  const tmp = `${DIR}controls/.test-ledger-${process.pid}.json`;
  try {
    writeLedgerCopy(tmp);
    const after = appendEntry(tmp, { id: "x", usd: 1.5 });
    assert.equal(after.spent_usd, 3.981606);
    assert.equal(after.remaining_usd, 36.018394);
  } finally { rmIfExists(tmp); }
});

import { writeFileSync as writeFile, rmSync } from "node:fs";
function writeLedgerCopy(path) { writeFile(path, readFileSync(`${DIR}controls/budget-ledger.seed.json`, "utf8")); }
function rmIfExists(path) { if (existsSync(path)) rmSync(path); }

test("EXP-16 synthetic windows verify against their own letters only, and the verdict says so; real windows still need the engine", () => {
  const ctx = ctxOf({ region: "p1" });
  const planted = JSON.parse(readFileSync(`${DIR}data/windows/p1.json`, "utf8")).planted;
  const found = planted.map((word, k) => ({ id: `r1.f0${k + 1}`, line: word.reading, text: word.text, parts: [] }));
  const hallucination = { id: "r1.f09", line: "R01+", text: "ארץישראל", parts: [] };
  const located = [...found, hallucination].map((f) => locateFinding(f, ctx));
  const rows = syntheticRows(located);
  const classified = classify(located, rows);
  assert.ok(classified.slice(0, 6).every((f) => f.verdict === "verified_synthetic"), "planted words are found where they were put");
  assert.equal(classified[6].verdict, "not_verified", "an invented run is not verified");
  assert.ok(rows.every((r) => r.engine.status === "synthetic_region"));
  const real = ctxOf({ region: "w01" });
  const realLocated = locateFinding({ id: "r1.f01", line: "R01+", text: real.lines[0].letters.slice(0, 4), parts: [] }, real);
  assert.equal(classify([realLocated], []).at(0).verdict, "not_verified", "without an engine row a real-window proposal is not verified");
  void verificationItems;
});

test("EXP-16 metrics: noise, rarity, first group and what the first group would lose are computed without filtering anything; planted recall by match type", () => {
  const mk = (id, text, verdict, reading, hits, truncated) => ({ id, text, verdict, occurrences: [{ reading, cells: [[1, 1], [1, 2]] }], checks: [{ engine_hits: hits, engine_truncated: truncated, engine_found: true, letters_match: true }] });
  const classified = [
    mk("a1", "אבגדה", "verified_by_engine", "D01+", 1, false), mk("a2", "אבג", "verified_by_engine", "C02+", 100, true), mk("a3", "אבגדהו", "verified_by_engine", "A03-", 2, false),
    mk("a4", "אבגדהוזחט", "verified_plain_text_only", "R04+", null, false), { ...mk("a5", "זזזזז", "not_verified", "R05+", null, false), occurrences: [] },
  ];
  const raw = [
    { id: "a1", tier: "A", story_related: true, kind: "word", parts: ["אבגדה"], from_finding: "", continue_from: true },
    { id: "a2", tier: "A", story_related: false, kind: "word", parts: [], from_finding: "a1" },
    { id: "a3", tier: "C", story_related: false, kind: "construct_or_phrase", parts: ["אבג", "דהו"], from_finding: "" },
    { id: "a4", tier: "B", story_related: false, kind: "word", parts: [], from_finding: "" },
    { id: "a5", tier: "C", story_related: false, kind: "word", parts: [], from_finding: "" },
  ];
  const m = runMetrics(enrich(classified, raw));
  assert.deepEqual([m.proposals, m.verified, m.notVerified], [5, 4, 1]);
  assert.deepEqual([m.els.n, m.els.long, m.els.longStoryRelated, m.els.rare, m.els.truncatedPages], [3, 2, 1, 2, 1]);
  assert.equal(m.byVerdict.plainText, 1);
  assert.deepEqual([m.tiers.A, m.tiers.B, m.tiers.C], [2, 1, 2]);
  assert.equal(m.firstGroup.interesting, 1, "a1 is long and rare and in tier A");
  assert.equal(m.outsideFirstGroup.interesting, 1, "a3 is long and rare and would be lost if only tier A were shown");
  assert.equal(m.continuation.fromFinding, 1);
  assert.ok(m.noise.shortElsShare > 0 && m.noise.shortElsShare < 1);
  const planted = [{ text: "אבגדה", folded: "אבגדה", kind: "D", reversed: false, distance: "near", type: "word", reading: "D01+", cells: [[1, 1], [1, 2]] }, { text: "תתתתת", folded: "תתתתת", kind: "R", reversed: false, distance: "far", type: "word", reading: "R09+", cells: [[9, 1], [9, 2]] }];
  const results = plantedRecall(planted, classified, raw);
  assert.deepEqual(results.map((r) => r.match), ["exact", "missed"]);
  assert.equal(results[0].firstGroup, true);
  assert.deepEqual(recallBy(results, "kind").D, { n: 1, exact: 1, found: 1, firstGroup: 1 });
});

test("EXP-16 summary: blind, planted and diagnostic runs are in separate sections; diagnostics say they are not blind; the interpretation rules are printed", () => {
  const classified = [{ id: "r1.f01", text: "אבגדה", verdict: "verified_by_engine", occurrences: [{ reading: "D01+", cells: [[1, 1]] }], checks: [{ engine_hits: 1, engine_truncated: false, engine_found: true, letters_match: true }] }];
  const raw = [{ id: "r1.f01", tier: "A", story_related: true, kind: "word", parts: [], from_finding: "" }];
  const response = { ms: 1000, cost: { usd: 0.9 }, summary: { stop_reason: "end_turn", usage: { input_tokens: 10, output_tokens: 5 } } };
  const item = (id, series, group) => ({ run: { id, series, group, note: "n" }, classified, raw, response });
  const text = renderSummary({ runs: [item("S2", "blind", "story"), item("N1", "blind", "nostory"), item("D2", "diagnostic", "diagnostic")], reference: null, ledger: { spent_usd: 4, cap_usd: 40, remaining_usd: 36, entries: [{ id: "x", usd: 4 }] }, targets: [] });
  assert.ok(text.indexOf("## 1.") < text.indexOf("## 2.") && text.indexOf("## 2.") < text.indexOf("## 4."));
  assert.match(text, /בדיקות אבחון \(לא עיוורות/);
  assert.match(text, /אינה סוגרת את כיוון הגילוי/);
  const diagSection = text.slice(text.indexOf("## 4."), text.indexOf("## 5."));
  assert.ok(diagSection.includes("D2") && !diagSection.includes("S2") && !diagSection.includes("N1"));
  assert.match(text, /נותר 36/);
});

test("EXP-16 runner fails closed: without the experiment's own credential a call stage with --run stops with exit code 2 and writes no response; plan and budget need no credential", () => {
  const env = { ...process.env };
  delete env[KEY_ENV];
  delete env.ANTHROPIC_API_KEY;
  for (const name of ["ELS_PROXY_URL", "ELS_PROXY_TOKEN", "ELS_PROXY_JWT"]) delete env[name];
  const responseBefore = existsSync(`${DIR}controls/runs/S2/round1-response.json`);
  for (const stage of ["preflight", "call1"]) {
    const run = spawnSync(process.execPath, [`${DIR}run-live-reading.mjs`, stage, "--run", "S2"], { env, cwd: fileURLToPath(new URL("../", import.meta.url)), encoding: "utf8" });
    assert.equal(run.status, 2, `${stage}: exit code`);
    assert.match(run.stderr, /no credential/);
    assert.equal(run.stdout.trim(), "");
  }
  assert.equal(existsSync(`${DIR}controls/runs/S2/round1-response.json`), responseBefore, "the call stage wrote nothing");
  const budget = spawnSync(process.execPath, [`${DIR}run-live-reading.mjs`, "budget"], { env, cwd: fileURLToPath(new URL("../", import.meta.url)), encoding: "utf8" });
  assert.equal(budget.status, 0);
  assert.equal(JSON.parse(budget.stdout).cap_usd, 40);
  assert.ok(JSON.parse(budget.stdout).spent_usd >= 2.481606, "the live ledger only grows from the seeded EXP-15 spend");
});

test("EXP-16 chance model: built from the Torah stream only (its md5 equals the canonical table), expected chance occurrences follow letter frequencies, and the model refuses a text that is not the stream", () => {
  const md5 = (text) => createHash("md5").update(text, "utf8").digest("hex");
  const text = pageLetters(PAGE);
  assert.ok(text.length > TORAH_LENGTH, "the page embeds more than the Torah");
  const model = torahChanceModel(text, md5);
  assert.equal(model.N, 304_805);
  assert.throws(() => torahChanceModel(`א${text.slice(1)}`, md5), /differ from public.torah_stream/);
  const four = expectedChance(model, "ביתא", 4545);
  const eight = expectedChance(model, "ביתאביתא", 4545);
  assert.ok(four > eight * 100, "longer runs are far less expected by chance");
  assert.ok(expectedChance(model, "ספינת", 4544) < 0.1, "a 5-letter run with rare letters is not expected by chance anywhere in the Torah at one skip");
  assert.ok(expectedChance(model, "והוי", 4545) > expectedChance(model, "ספינת", 4544));
  const tiny = chanceModel("אבאב");
  assert.equal(tiny.N, 4);
  assert.equal(expectedChance(tiny, "אב", 1), 2 * 3 * (2 / 4) * (2 / 4), "2 directions x 3 starts x f(א) x f(ב)");
  assert.equal(expectedChance(tiny, "אבאבאב", 1), 0, "a run longer than the stream cannot occur");
});

test("EXP-16 pass-through: only the approved round-1 requests, and a continuation only by the fixed rule (approved base, fixed text, at most 6 cards, assistant thinking/text only), with an expiry", async () => {
  const TOKEN = "unit-test-token-not-a-secret";
  const n1 = RUNS.find((r) => r.id === "N1");
  const s2 = RUNS.find((r) => r.id === "S2");
  const requestOf = (run) => (usesExp16Prompt(run) ? round1RequestV2(ctxOf(run), run) : round1Request(ctxOf(run))).request;
  const n1Request = requestOf(n1);
  const s2Request = requestOf(s2);
  const cfgBase = { apiKey: "unit-test-upstream-key", tokenSha256: await edge.sha256Hex(TOKEN), approved: new Set([lockSha256(n1Request), lockSha256(s2Request)]), models: ["claude-fable-5-1"], maxBody: 400_000, expiresAt: 2_000_000, now: () => 1_000_000, round2Bases: new Set([lockSha256(n1Request)]), round2Prefix: ROUND2_PREFIX, round2MaxCards: 6, round2MaxAssistant: 150_000, round2MaxUser: 20_000 };
  const forwarded = [];
  const upstream = async (url, init) => { forwarded.push({ url, init }); return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } }); };
  const post = (cfg, params, customId = "els-live-1") => edge.handle(new Request("https://x.supabase.co/functions/v1/els-live-reading/v1/messages/batches", { method: "POST", body: JSON.stringify({ requests: [{ custom_id: customId, params }] }), headers: { "x-els-token": TOKEN } }), cfg, upstream);
  const assistant = { role: "assistant", content: [{ type: "thinking", thinking: "t", signature: "sig" }, { type: "text", text: "{\"findings\":[],\"observations\":\"\"}" }] };
  const card = (k) => `### r1.f${String(k).padStart(2, "0")}: אבגד (R01+, R01C01 עד R01C04)\nבאותו קו: …`;
  const round2 = (base, cards = 3, user = null) => ({ ...base, cache_control: { type: "ephemeral" }, messages: [...base.messages, assistant, { role: "user", content: user ?? buildRound2Message({ cards: Array.from({ length: cards }, (_, k) => card(k + 1)) }) }] });
  assert.equal((await post(cfgBase, n1Request)).status, 200, "an approved round-1 request passes");
  assert.equal((await post(cfgBase, s2Request)).status, 200);
  assert.equal(forwarded.length, 2);
  assert.equal((await post(cfgBase, round2(n1Request))).status, 200, "a continuation of an approved, continuable request passes");
  assert.equal(forwarded.length, 3);
  const refused = async (params, error) => { const r = await post(cfgBase, params); assert.equal(r.status, 403); assert.equal((await r.json()).error, error); };
  await refused(round2(s2Request), "request_not_approved"); // S2 is approved but not continuable
  await refused({ ...n1Request, max_tokens: 63_999 }, "request_not_approved");
  await refused({ ...round2(n1Request), tools: [] }, "request_not_approved");
  await refused({ ...round2(n1Request), cache_control: { type: "ephemeral", ttl: "1h" } }, "request_not_approved");
  await refused(round2(n1Request, 7), "round2_rule:cards");
  await refused(round2(n1Request, 0, ROUND2_PREFIX), "round2_rule:cards");
  await refused(round2(n1Request, 3, `${ROUND2_PREFIX.slice(0, -5)}x\n\n${card(1)}`), "round2_rule:user_prefix");
  await refused({ ...round2(n1Request), messages: [...n1Request.messages, { role: "assistant", content: [{ type: "tool_use", id: "t", name: "x", input: {} }] }, { role: "user", content: buildRound2Message({ cards: [card(1)] }) }] }, "round2_rule:assistant_blocks");
  await refused({ ...round2(n1Request), messages: [...n1Request.messages, { role: "assistant", content: "plain" }, { role: "user", content: buildRound2Message({ cards: [card(1)] }) }] }, "round2_rule:assistant_turn");
  await refused(round2(n1Request, 3, `${ROUND2_PREFIX}${card(1)}${"x".repeat(25_000)}`), "round2_rule:user_size");
  assert.equal(forwarded.length, 3, "nothing refused was forwarded");
  const wrongToken = await edge.handle(new Request("https://x.supabase.co/functions/v1/els-live-reading/v1/models", { method: "GET", headers: { "x-els-token": "nope" } }), cfgBase, upstream);
  assert.equal(wrongToken.status, 403);
  const expired = await edge.handle(new Request("https://x.supabase.co/functions/v1/els-live-reading/v1/models", { method: "GET", headers: { "x-els-token": TOKEN } }), { ...cfgBase, now: () => 3_000_000 }, upstream);
  assert.equal(expired.status, 410);
  assert.equal((await expired.json()).error, "expired");
  assert.ok(ROUND2_PREFIX.endsWith("\n\n") && buildRound2Message({ cards: ["### r1.f01: x"] }).startsWith(ROUND2_PREFIX), "the prefix is exactly what the harness writes before the cards");
});

// ---------------------------------------------------------------- the unattended pipeline, with fakes (no network, no money)
import { mkdtempSync, copyFileSync, writeFileSync as writeFileSync2 } from "node:fs";
import { tmpdir } from "node:os";
import { BudgetStop, buildContinuation, callOnce, pipeline } from "../experiments/els-live-reading/lib/orchestrate.mjs";
import { EngineUnavailableError, makeRpc, verifyItem, verifyItems } from "../experiments/els-live-reading/lib/verify-rest.mjs";
import { reserve, settle, settledOf } from "../experiments/els-live-reading/lib/ledger.mjs";
import { TORAH_LENGTH as TORAH_N } from "../experiments/els-live-reading/lib/metrics.mjs";

const TORAH = pageLetters(PAGE).slice(0, TORAH_N);
/** A local stand-in for the engine contract: scans the real Torah letters for the term at one skip, in both directions, ordered by start, with keyset continuation. */
const localEngine = ({ log = [] } = {}) => async ({ term, skip, pageSize, afterStart = null }) => {
  log.push({ term, skip, pageSize, afterStart });
  const L = term.length;
  const hits = [];
  for (let s = 0; s < TORAH.length; s += 1) {
    if (afterStart !== null && s <= afterStart) continue;
    if (s + (L - 1) * skip < TORAH.length) { let ok = true; for (let j = 0; j < L && ok; j += 1) ok = TORAH[s + j * skip] === term[j]; if (ok) hits.push({ start: s, dir: 1, skip }); }
    if (s - (L - 1) * skip >= 0) { let ok = true; for (let j = 0; j < L && ok; j += 1) ok = TORAH[s - j * skip] === term[j]; if (ok) hits.push({ start: s, dir: -1, skip }); }
  }
  const page = hits.slice(0, pageSize);
  return { status: "OK", hits: page, completion: { executed: true, has_more: hits.length > pageSize, truncated: hits.length > pageSize, returned_hits: page.length } };
};

function fakeWorld({ answers, creates = [], ledgerSpent = 0 }) {
  const dir = mkdtempSync(`${tmpdir()}/exp16-`);
  const ledgerPath = `${dir}/ledger.json`;
  copyFileSync(`${DIR}controls/budget-ledger.seed.json`, ledgerPath);
  if (ledgerSpent) { const l = JSON.parse(readFileSync(ledgerPath, "utf8")); l.entries.push({ id: "filler", usd: ledgerSpent }); writeFileSync2(ledgerPath, JSON.stringify(l)); }
  const events = [];
  let call = 0;
  const messageFor = (answer) => ({ content: [{ type: "thinking", thinking: "t", signature: "s" }, { type: "text", text: JSON.stringify(answer.body) }], stop_reason: answer.stop ?? "end_turn", model: "claude-fable-5-1", id: "msg_fake", usage: { input_tokens: 20_000, output_tokens: answer.out ?? 30_000, cache_creation_input_tokens: answer.cacheWrite ?? 0, output_tokens_details: { thinking_tokens: 25_000 } } });
  const deps = {
    ledgerPath, now: () => "2026-10-28T12:00:00.000Z", log: (event, data) => events.push({ event, ...data }), torah: TORAH, rpc: localEngine(), engineConcurrency: 2, round2Cap: 6, pollMs: 1, maxWaitMs: 5_000, diagnosticsMaxSpent: 26, sleep: async () => {},
    runDir: (id) => `${dir}/runs/${id}`,
    preflight: async (_c, request) => ({ ok: true, upper_bound_usd: 3.5, request_sha256: requestSha256(request), lock_sha256: lockSha256(request) }),
    client: { messages: { batches: {
      create: async (body, options) => { assert.equal(options.maxRetries, 0, "a batch creation is never retried by the SDK"); assert.equal(body.requests.length, 1); creates.push(body); call += 1; if (answers[call - 1]?.createError) throw new Error(answers[call - 1].createError); return { id: `msgbatch_fake${call}`, created_at: "2026-10-28T12:00:00.000Z" }; },
      retrieve: async (id) => ({ id, processing_status: "ended", created_at: "2026-10-28T12:00:00.000Z", ended_at: "2026-10-28T12:03:00.000Z", request_counts: { succeeded: 1 } }),
    } } },
    fetchResults: async (id) => { const answer = answers[Number(id.replace("msgbatch_fake", "")) - 1]; if (answer.resultType) return [{ custom_id: "els-live-1", result: { type: answer.resultType } }]; return [{ custom_id: "els-live-1", result: { type: "succeeded", message: messageFor(answer) } }]; },
  };
  return { dir, deps, events, ledgerPath, creates };
}

const planEntryOf = (request) => ({ request_sha256: requestSha256(request), lock_sha256: lockSha256(request) });

test("EXP-16 pipeline (fakes): one batch per call, worst case reserved then replaced by the actual cost, proposals verified against the (local) engine, continuation built by the rule, resume never creates a batch again", async () => {
  const run = RUNS.find((r) => r.id === "N2a");
  const ctx = ctxOf(run);
  const { request } = round1RequestV2(ctx, run);
  const col = ctx.byReading.get("C10+");
  const row = ctx.byReading.get("R05+");
  const answer1 = { body: { findings: [
    { id: "F1", line: "C10+", text: col.letters.slice(4, 9), parts: [], kind: "word", story_related: false, continue_from: true, from_finding: "", tier: "A", note: "n" },
    { id: "F2", line: "R05+", text: row.letters.slice(3, 11), parts: [], kind: "word", story_related: false, continue_from: true, from_finding: "", tier: "A", note: "n" },
    { id: "F3", line: "R05+", text: "תתתתתתתת", parts: [], kind: "word", story_related: false, continue_from: false, from_finding: "", tier: "C", note: "invented" },
  ], observations: "o" }, out: 30_000 };
  const answer2 = { body: { findings: [{ id: "G1", line: "C10+", text: col.letters.slice(2, 8), parts: [], kind: "extension", story_related: false, continue_from: false, from_finding: "r1.f01", tier: "A", note: "n" }], observations: "" }, out: 8_000, cacheWrite: 50_000 };
  const world = fakeWorld({ answers: [answer1, answer2] });
  const outcome = await pipeline({ run, ctx, request, planEntry: planEntryOf(request), deps: world.deps });
  assert.equal(outcome.failed, undefined);
  assert.equal(world.creates.length, 2, "one batch for round 1 and one for the continuation");
  assert.equal(outcome.cards, 2);
  const dir = world.deps.runDir("N2a");
  const classified1 = JSON.parse(readFileSync(`${dir}/classified-round1.json`, "utf8"));
  assert.deepEqual(classified1.map((f) => f.verdict), ["verified_by_engine", "verified_plain_text_only", "not_verified"]);
  const classified2 = JSON.parse(readFileSync(`${dir}/classified-round2.json`, "utf8"));
  assert.equal(classified2.length, 1);
  assert.equal(classified2[0].id, "r2.f01");
  const ledger = JSON.parse(readFileSync(world.ledgerPath, "utf8"));
  assert.ok(ledger.entries.every((e) => !e.reserved), "every reservation was replaced by the actual cost");
  const mine = ledger.entries.filter((e) => String(e.id).startsWith("N2a"));
  assert.equal(mine.length, 2);
  assert.equal(mine[0].usd, 0.5 * (20_000 * 10 + 30_000 * 50) / 1e6, "batch price from the usage object");
  assert.ok(mine[1].usd > mine[0].usd * 0.4, "the continuation is costed with its cache write");
  const r2 = JSON.parse(readFileSync(`${dir}/request-round2.json`, "utf8"));
  assert.equal(r2.cache_control.type, "ephemeral");
  assert.equal(r2.messages.length, 3);
  assert.ok(r2.messages[2].content.startsWith(ROUND2_PREFIX));
  assert.equal((r2.messages[2].content.match(/^### r1\.f\d+:/gm) ?? []).length, 2, "cards only for verified proposals that asked to continue");
  assert.ok(!r2.messages[2].content.includes("תתתתתתתת"), "an invented run gets no card");
  // resume: nothing new is created, nothing new is reserved
  const again = await pipeline({ run, ctx, request, planEntry: planEntryOf(request), deps: world.deps });
  assert.equal(again.failed, undefined);
  assert.equal(world.creates.length, 2, "a restart never creates a batch again");
  assert.equal(JSON.parse(readFileSync(world.ledgerPath, "utf8")).entries.length, ledger.entries.length);
  assert.ok(world.events.some((e) => e.event === "call_done"));
  // a plan mismatch is refused before anything is sent
  const changed = { ...request, max_tokens: request.max_tokens - 1 };
  await assert.rejects(() => pipeline({ run, ctx, request: changed, planEntry: planEntryOf(request), deps: fakeWorld({ answers: [] }).deps }), /differs from the reviewed plan/);
});

test("EXP-16 pipeline (fakes): a failed batch, an answer cut at max_tokens, a create that throws and the budget guard are recorded and never retried", async () => {
  const run = RUNS.find((r) => r.id === "S4a");
  const ctx = ctxOf(run);
  const { request } = round1RequestV2(ctx, run);
  // errored batch: no cost, recorded, no retry
  let w = fakeWorld({ answers: [{ resultType: "errored" }] });
  let out = await pipeline({ run, ctx, request, planEntry: planEntryOf(request), deps: w.deps });
  assert.match(out.failed, /errored/);
  assert.equal(w.creates.length, 1);
  assert.equal(settledOf(JSON.parse(readFileSync(w.ledgerPath, "utf8"))), 2.481606);
  out = await pipeline({ run, ctx, request, planEntry: planEntryOf(request), deps: w.deps });
  assert.match(out.failed, /errored/);
  assert.equal(w.creates.length, 1, "not retried after a restart either");
  // max_tokens: the cost is counted, the run is not usable, nothing is verified
  w = fakeWorld({ answers: [{ body: { findings: [], observations: "" }, stop: "max_tokens", out: 64_000 }] });
  out = await pipeline({ run, ctx, request, planEntry: planEntryOf(request), deps: w.deps });
  assert.match(out.failed, /no usable answer/);
  assert.equal(settledOf(JSON.parse(readFileSync(w.ledgerPath, "utf8"))), Number((2.481606 + 0.5 * (20_000 * 10 + 64_000 * 50) / 1e6).toFixed(6)));
  assert.equal(existsSync(`${w.deps.runDir("S4a")}/classified-round1.json`), false);
  // a create that throws: the worst case stays as the spend (outcome unknown), no retry
  w = fakeWorld({ answers: [{ createError: "socket hang up" }] });
  out = await pipeline({ run, ctx, request, planEntry: planEntryOf(request), deps: w.deps });
  assert.match(out.failed, /batch create failed/);
  assert.ok(settledOf(JSON.parse(readFileSync(w.ledgerPath, "utf8"))) > 2.481606 + 1, "the unknown outcome is counted at its worst case");
  // budget: a worst case that would pass the hard guard is refused before anything is reserved or sent
  w = fakeWorld({ answers: [], ledgerSpent: 34.5 });
  await assert.rejects(() => pipeline({ run, ctx, request, planEntry: planEntryOf(request), deps: w.deps }), BudgetStop);
  assert.equal(w.creates.length, 0);
  assert.ok(JSON.parse(readFileSync(w.ledgerPath, "utf8")).entries.every((e) => !e.reserved));
  // diagnostics only while the settled spend is small
  const diag = RUNS.find((r) => r.id === "D2");
  const dctx = ctxOf(diag);
  const { request: dreq } = round1RequestV2(dctx, diag);
  w = fakeWorld({ answers: [], ledgerSpent: 24 });
  await assert.rejects(() => pipeline({ run: diag, ctx: dctx, request: dreq, planEntry: planEntryOf(dreq), deps: w.deps }), /diagnostics only while spent/);
  assert.equal(w.creates.length, 0);
});

test("EXP-16 verifier (fakes): letters from the certified Torah text, plain rows, the engine contract with its keyset continuation, and an unavailable engine is an error, not 'not verified'", async () => {
  const rpc = localEngine();
  const col = ctxOf({ region: "w01" }).byReading.get("C10+");
  const item = (term, start, skip, dir = 1) => ({ key: "k", term, start, skip, dir });
  const real = ctxOf({ region: "w01" });
  const cells = col.cells.slice(4, 9);
  const params = { start: real.region.position(...cells[0]), skip: 4545, dir: 1 };
  const ok = await verifyItem(item(col.letters.slice(4, 9), params.start, 4545), { torah: TORAH, rpc });
  assert.equal(ok.letters_match, true);
  assert.equal(ok.engine.found, true);
  const shifted = await verifyItem(item(col.letters.slice(4, 9), params.start + 1, 4545), { torah: TORAH, rpc });
  assert.equal(shifted.letters_match, false);
  assert.equal((await verifyItem(item("אבגד", 10, 1), { torah: TORAH, rpc })).engine.status, "plain_text_row_not_els");
  // a three-letter term at skip 4545 has far more than 100 hits: the claimed start is past the first page, the continuation finds it
  const log = [];
  const rpc2 = localEngine({ log });
  const term = "הוי";
  let startLate = -1;
  for (let s = TORAH.length - 4545 * 3; s > 0; s -= 1) if (TORAH[s] === "ה" && TORAH[s + 4545] === "ו" && TORAH[s + 9090] === "י") { startLate = s; break; }
  assert.ok(startLate > 0);
  const late = await verifyItem(item(term, startLate, 4545), { torah: TORAH, rpc: rpc2 });
  assert.equal(late.engine.found, true);
  assert.ok(late.engine.followup, "found by the keyset continuation");
  assert.equal(late.engine.first_page_found, false);
  assert.equal(log.length, 2);
  assert.equal(log[1].afterStart, startLate - 1);
  // engine down: an error that stops the verification, never a silent 'not verified'
  const down = makeRpc({ anonKey: "k", fetchImpl: async () => new Response("boom", { status: 503 }), retries: 1, sleep: async () => {} });
  await assert.rejects(() => verifyItems([item("אבגד", 10, 4545)], { torah: TORAH, rpc: down }), EngineUnavailableError);
  assert.throws(() => makeRpc({ anonKey: "" }), EngineUnavailableError);
  assert.ok(typeof reserve === "function" && typeof settle === "function" && typeof buildContinuation === "function" && typeof callOnce === "function");
});

test("EXP-16 case V1 (a saved cipher): the window is built around the engine's occurrence, equals the canonical table by md5, the prompt gives only the region and the axis phrase from the data, and no phrase or description is in the library", () => {
  const engine = JSON.parse(readFileSync(`${DIR}review/case-v1-engine.json`, "utf8"));
  const canonical = JSON.parse(readFileSync(`${DIR}review/case-v1-md5-canonical.json`, "utf8")).windows[0];
  const file = JSON.parse(readFileSync(`${DIR}data/windows/v1.json`, "utf8"));
  assert.equal(file.md5_window, canonical.md5_window, "the page copy equals public.torah_stream for the whole window");
  assert.equal(file.width, 5541);
  assert.equal(file.axis.skip, 5541);
  assert.equal(file.axis.dir, -1);
  assert.equal(file.axis.start, engine.occurrences[0].start, "the occurrence is the engine's, not the saved record's (which has no start_index)");
  const ctx = loadContext(PAGE, { regionPath: regionPathOf("v1") });
  assert.equal(ctx.pageCheck.mismatches.length, 0);
  assert.deepEqual([ctx.region.nRows, ctx.region.nCols, ctx.region.W], [33, 41, 5541]);
  assert.deepEqual(ctx.region.axisCells[0], [21, 21]);
  assert.deepEqual(ctx.region.axisCells.at(-1), [13, 21]);
  const spelled = ctx.region.axisCells.map(([i, j]) => ctx.region.letterAt(i, j)).join("");
  assert.equal(spelled, file.axis.text.replace(/\s+/g, "").replace(/ם/g, "מ"), "the marked cells spell the phrase in the engine's reading direction");
  assert.deepEqual(engine.occurrences[0].positions.map((p) => p - 5541 * 0).slice(0, 2), [236297, 230756]);
  const run = RUNS.find((r) => r.id === "V1");
  const { round1, request } = round1RequestV2(ctx, run);
  const user = request.messages[0].content;
  assert.equal(user.split(file.axis.text).length - 1, 1, "the phrase appears once, in the background paragraph");
  assert.match(round1.prose.intro, /אין תיאור נוסף ואין נושא/);
  assert.ok(user.includes("המופע הנבחר הוא 9 האותיות של טור C21 בשורות R13–R21"));
  assert.equal(run.hint, undefined);
  assert.equal(run.series, "blind");
  for (const name of readdirSync(`${DIR}lib`)) assert.equal(readFileSync(`${DIR}lib/${name}`, "utf8").includes("וישבת"), false, `lib/${name} contains the saved phrase`);
  assert.equal(readFileSync(`${DIR}run-live-reading.mjs`, "utf8").includes("וישבת"), false);
  assert.equal(readFileSync(`${DIR}run-controls.mjs`, "utf8").includes("וישבת"), false);
  assert.throws(() => buildRound1V2({ region: ctxOf({ region: "w01" }).region, lines: ctxOf({ region: "w01" }).lines, story: "axis", marked: false }), /axis background needs a marked axis/);
  // nothing that was not meant to be given: the request holds no 'record', 'cipher' or description wording
  assert.equal(/רשומה|צופן|תיאור הרשומה/.test(`${request.system}${round1.prose.intro}${round1.prose.task}`), false);
});

test("EXP-16 case U1 (a second saved cipher): the occurrence is the engine's single hit, the window is the whole 31-row Torah matrix at this width and equals the canonical table by md5, the v3 prompt adds relations and reasons without naming anything, and nothing about the phrase is in the library", () => {
  const engine = JSON.parse(readFileSync(`${DIR}review/case-u1-engine.json`, "utf8"));
  const canonical = JSON.parse(readFileSync(`${DIR}review/case-u1-md5-canonical.json`, "utf8")).windows[0];
  const file = JSON.parse(readFileSync(`${DIR}data/windows/u1.json`, "utf8"));
  assert.equal(engine.occurrences.length, 1, "identification rule: exactly one engine hit at the saved skip");
  assert.equal(engine.identification.hits, 1);
  assert.equal(file.md5_window, canonical.md5_window, "the page copy equals public.torah_stream for the whole window");
  assert.deepEqual([file.width, file.axis.skip, file.axis.dir, file.axis.length], [10101, 10101, 1, 7]);
  assert.equal(file.axis.start, engine.occurrences[0].start);
  assert.deepEqual(engine.occurrences[0].positions, [0, 1, 2, 3, 4, 5, 6].map((k) => 81020 + k * 10101));
  const ctx = loadContext(PAGE, { regionPath: regionPathOf("u1") });
  assert.equal(ctx.pageCheck.mismatches.length, 0);
  assert.deepEqual([ctx.region.nRows, ctx.region.nCols, ctx.region.W, ctx.region.r0, ctx.region.r1], [31, 41, 10101, 0, 30], "all 31 rows the Torah has at this width, 41 columns around the phrase's column");
  assert.equal(Math.floor((TORAH_LENGTH - 1) / 10101), 30, "the last row of the stream is row 30");
  assert.deepEqual(ctx.region.axisCells[0], [9, 21]);
  assert.deepEqual(ctx.region.axisCells.at(-1), [15, 21]);
  assert.equal(ctx.region.axisCells.map(([i, j]) => ctx.region.letterAt(i, j)).join(""), file.axis.text.replace(/ם/g, "מ"));
  const run = RUNS.find((r) => r.id === "U1");
  assert.deepEqual([run.series, run.prompt, run.story, run.marked, run.round2, run.priority], ["blind", "v3", "axis", true, true, 2.6]);
  assert.equal(run.hint, undefined);
  const { round1, request } = round1RequestV2(ctx, run);
  const user = request.messages[0].content;
  assert.equal(user.split(file.axis.text).length - 1, 1, "the phrase appears once, in the background paragraph");
  assert.ok(user.includes("31 שורות (R01–R31") && user.includes("המופע הנבחר הוא 7 האותיות של טור C21 בשורות R09–R15"));
  // the v3 background, region description, grid and lines are the v2 ones for the same arguments; only the task differs
  const v2 = buildRound1V2({ region: ctx.region, lines: ctx.lines, story: "axis", marked: true });
  assert.equal(round1.prose.intro, v2.prose.intro);
  assert.equal(round1.prose.spec, v2.prose.spec);
  assert.deepEqual(round1.data, v2.data);
  assert.notEqual(round1.prose.task, v2.prose.task);
  assert.match(round1.prose.task, /מקבילות/);
  assert.match(round1.prose.task, /חיתוך/);
  assert.match(round1.prose.task, /קרבה/);
  assert.match(round1.prose.task, /groups/);
  assert.match(round1.prose.task, /אל תניח שרק קשרים כאלה מעניינים/);
  // the schema: v2's findings plus relations and groups, all required, nothing open
  assert.deepEqual(FINDINGS_SCHEMA_V3.required, ["findings", "relations", "groups", "observations"]);
  assert.deepEqual(FINDINGS_SCHEMA_V3.properties.findings, FINDINGS_SCHEMA_V2.properties.findings);
  assert.deepEqual(FINDINGS_SCHEMA_V3.properties.relations.items.properties.type.enum, [...RELATION_TYPES]);
  assert.equal(FINDINGS_SCHEMA_V3.properties.groups.items.additionalProperties, false);
  assert.equal(request.output_config.format.schema.properties.relations.type, "array");
  // not given: any country, any expectation, the saved record, a description, a findings list
  const sent = `${request.system}\n${round1.prose.intro}\n${round1.prose.spec}\n${round1.prose.task}`;
  for (const word of ["אורניום", "אירן", "איראן", "קוריאה", "ארצות", "ישראל", "מדינ", "גרעינ", "טראמפ"]) assert.equal(word === "אורניום" ? sent.split(word).length - 1 : sent.includes(word), word === "אורניום" ? 1 : false, `the harness text mentions ${word}`);
  assert.equal(/רשומה|צופן|תיאור הרשומה|רשימת ממצאים/.test(sent), false);
  for (const name of readdirSync(`${DIR}lib`)) for (const word of ["אורניום", "אורניומ"]) assert.equal(readFileSync(`${DIR}lib/${name}`, "utf8").includes(word), false, `lib/${name} contains the saved phrase`);
  for (const file2 of ["run-live-reading.mjs", "run-controls.mjs"]) assert.equal(/אורני/.test(readFileSync(`${DIR}${file2}`, "utf8")), false);
  // the other arms are untouched: every earlier request still has the hash that was reviewed and approved
  const reviewed = JSON.parse(readFileSync(`${DIR}controls/plan-review.json`, "utf8"));
  assert.equal(reviewed.runs.length, RUNS.length);
  for (const entry of reviewed.runs) { const r = RUNS.find((x) => x.id === entry.id); const req = (usesExp16Prompt(r) ? round1RequestV2(ctxOf(r), r) : round1Request(ctxOf(r))).request; assert.equal(requestSha256(req), entry.request_sha256, `${entry.id} changed`); assert.equal(lockSha256(req), entry.lock_sha256); }
  // an arm cannot ask for v3 text by accident
  assert.equal(RUNS.filter((r) => r.prompt === "v3").map((r) => r.id).join(), "U1");
  assert.equal(buildRound1V3({ region: ctx.region, lines: ctx.lines, story: "axis", marked: true }).user, user);
});

test("EXP-16 geometry (Amendment C): crossing, parallel and near are the registered definitions; the model's relations are scored against them; the summary prints the v3 section only for runs that have relations and keeps them blind", async () => {
  const { relationFacts, scoreRelations, pairCounts, NEAR_MAX } = await import("../experiments/els-live-reading/lib/geometry.mjs");
  const mk = (id, reading, cells, verdict = "verified_by_engine", text = "אבגד") => ({ id, text, verdict, occurrences: [{ reading, cells }], checks: [{ letters_match: true, engine_found: true }] });
  const col = mk("r1.f01", "C21+", [[1, 5], [2, 5], [3, 5]]);
  const row = mk("r1.f02", "R02-", [[2, 3], [2, 4], [2, 5]]);
  const farCol = mk("r1.f03", "C07-", [[1, 7], [2, 7]]);
  const sameLine = mk("r1.f04", "C21-", [[3, 5], [4, 5]]);
  const unverified = mk("r1.f05", "C09+", [[1, 9]], "not_verified");
  assert.equal(NEAR_MAX, 2);
  assert.deepEqual(relationFacts(col, row), { crossing: true, parallel: false, near: false, minDist: 0 });
  assert.deepEqual(relationFacts(col, farCol), { crossing: false, parallel: true, near: true, minDist: 2 });
  assert.equal(relationFacts(col, sameLine).parallel, false, "the same line is not a parallel");
  assert.equal(relationFacts({ occurrences: [] }, col), null);
  const raw = ["F1", "F2", "F3", "F4", "F5"].map((modelId, k) => ({ modelId, id: `r1.f0${k + 1}` }));
  const classified = [col, row, farCol, sameLine, unverified];
  const scored = scoreRelations([
    { a: "F1", b: "F2", type: "crossing", note: "" }, { a: "F1", b: "F3", type: "parallel", note: "" }, { a: "F1", b: "F3", type: "near", note: "" },
    { a: "F2", b: "F3", type: "parallel", note: "" }, { a: "F1", b: "F5", type: "near", note: "" }, { a: "F1", b: "F9", type: "crossing", note: "" }, { a: "F1", b: "F2", type: "other", note: "" },
  ], { raw, classified });
  assert.deepEqual(scored.map((x) => x.result), ["holds", "holds", "holds", "does_not_hold", "unverifiable", "unverifiable", "unverifiable"]);
  assert.deepEqual(pairCounts(classified), { proposals: 4, crossing: 2, near: 4 }); // 6 pairs: col-row and col-sameLine cross; the other four are within 2 cells
  // the summary: the section appears for a run whose answer has relations, with the registered definitions, and not otherwise
  const response = { ms: 1000, cost: { usd: 0.9 }, summary: { stop_reason: "end_turn", usage: { input_tokens: 10, output_tokens: 5 } } };
  const rawFull = raw.map((r, k) => ({ ...r, tier: k < 2 ? "A" : "B", text: "אבגד", line: "C21+", note: "reason", story_related: false, kind: "word", parts: [], from_finding: "" }));
  const answer = { findings: rawFull, relations: [{ a: "F1", b: "F2", type: "crossing", note: "x" }], groups: [{ ids: ["F1", "F2"], why: "because" }], observations: "" };
  const withV3 = { run: { id: "U1", series: "blind", group: "saved", note: "n" }, classified, raw: rawFull, response, answer };
  const plain = { run: { id: "N1", series: "blind", group: "nostory", note: "n" }, classified, raw: rawFull, response };
  const text = renderSummary({ runs: [withV3, plain], reference: null, ledger: null, targets: [] });
  const section = text.slice(text.indexOf("## 2ג."), text.indexOf("## 5."));
  assert.match(section, /חיתוך = תא משותף/);
  assert.ok(section.includes("U1") && !section.includes("N1"));
  assert.match(section, /because/);
  assert.match(section, /מתקיים/);
  assert.equal(renderSummary({ runs: [plain], reference: null, ledger: null, targets: [] }).includes("## 2ג."), false);
});
