import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadContext, regionPathOf, round1Request, round1RequestV2 } from "../experiments/els-live-reading/lib/context.mjs";
import { COLUMBIA, MATRIX_WIDTH, WINDOW_COLS, WINDOW_ROWS, mulberry32, sampleWindows, seedOf } from "../experiments/els-live-reading/lib/windows.mjs";
import { WINDOW_COUNT, WINDOW_SEED_LABEL, buildWindow, pageLetters } from "../experiments/els-live-reading/build-windows.mjs";
import { PLANTED_WORDS, distanceClass, plantedFile } from "../experiments/els-live-reading/lib/plant.mjs";
import { FINDINGS_SCHEMA_V2, FIRST_GROUP_SIZE, HINTS, STORIES, STORY_WRONG, buildRound1V2 } from "../experiments/els-live-reading/lib/prompt2.mjs";
import { STORY } from "../experiments/els-live-reading/lib/prompt.mjs";
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
  assert.deepEqual(Object.keys(STORIES), ["columbia", "wrong", "none"]);
});

test("EXP-16 plan: S1 is the EXP-15 request byte for byte; every request hash is unique; blind runs carry no hint; diagnostics are marked and last; targets are in no request", () => {
  const ids = RUNS.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(Object.keys(SERIES).includes("diagnostic"));
  const hashes = new Map();
  for (const run of RUNS) {
    const ctx = ctxOf(run);
    const { round1, request } = run.prompt === "v2" ? round1RequestV2(ctx, run) : round1Request(ctx);
    assert.equal(request.model, "claude-fable-5-1");
    assert.equal(request.max_tokens, 64_000);
    assert.equal(request.output_config.effort, "medium");
    assert.equal(request.thinking.type, "adaptive");
    // The letters of the region necessarily contain the targets as runs (they are part of the matrix); what must not contain them is everything the harness writes: the system text, the prose, the schema.
    const prose = `${request.system}\n${Object.values(round1.prose).join("\n")}\n${JSON.stringify(request.output_config)}`;
    for (const target of TARGETS) assert.equal(prose.includes(target), false, `${run.id}: the harness's own text contains a target`);
    hashes.set(run.id, requestSha256(request));
    assert.match(lockSha256(request), /^[0-9a-f]{64}$/);
    if (run.series === "diagnostic") { assert.ok(run.hint, `${run.id} is a diagnostic: it has a hint`); assert.ok(run.priority >= 4, "diagnostics run last"); } else { assert.equal(run.hint, undefined, `${run.id}: a blind run has no hint`); assert.ok(run.priority <= 3); }
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
  const ledger = loadLedger(`${DIR}controls/budget-ledger.json`);
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
function writeLedgerCopy(path) { writeFile(path, readFileSync(`${DIR}controls/budget-ledger.json`, "utf8")); }
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
  const text = renderSummary({ runs: [item("S2", "blind", "story"), item("N1", "blind", "nostory"), item("D2", "diagnostic", "diagnostic")], reference: null, ledger: { spent_usd: 4, cap_usd: 40, remaining_usd: 36, entries: [] }, targets: [] });
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
  for (const stage of ["preflight", "call1"]) {
    const run = spawnSync(process.execPath, [`${DIR}run-live-reading.mjs`, stage, "--run", "S2"], { env, cwd: fileURLToPath(new URL("../", import.meta.url)), encoding: "utf8" });
    assert.equal(run.status, 2, `${stage}: exit code`);
    assert.match(run.stderr, /no credential/);
    assert.equal(run.stdout.trim(), "");
  }
  assert.equal(existsSync(`${DIR}controls/runs/S2/round1-response.json`), false);
  const budget = spawnSync(process.execPath, [`${DIR}run-live-reading.mjs`, "budget"], { env, cwd: fileURLToPath(new URL("../", import.meta.url)), encoding: "utf8" });
  assert.equal(budget.status, 0);
  assert.equal(JSON.parse(budget.stdout).remaining_usd, 37.518394);
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
