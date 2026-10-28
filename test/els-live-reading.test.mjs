import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { KINDS, buildLines, engineParams, foldFinals, loadRegion, readings } from "../experiments/els-live-reading/lib/region.mjs";
import { FINDINGS_SCHEMA, MAX_FINDINGS, STORY, SYSTEM, buildCard, buildRound1, buildRound2Message } from "../experiments/els-live-reading/lib/prompt.mjs";
import { classify, locateFinding, parseModelOutput, verificationItems, MAX_OCCURRENCES_VERIFIED } from "../experiments/els-live-reading/lib/validate.mjs";
import { BATCH, verificationSql, verificationStatements } from "../experiments/els-live-reading/lib/verify-sql.mjs";
import { KEY_ENV, NoCredentialError, PRICES, buildRequest, costOf, requestSha256, summarizeMessage } from "../experiments/els-live-reading/lib/request.mjs";
import { DEFAULTS, REGION_PATH, countsByKind, loadContext, round1Request } from "../experiments/els-live-reading/lib/context.mjs";
import { evaluateTargets } from "../experiments/els-live-reading/lib/evaluate.mjs";
import { renderReport } from "../experiments/els-live-reading/lib/report.mjs";

const DIR = fileURLToPath(new URL("../experiments/els-live-reading/", import.meta.url));
const PAGE = fileURLToPath(new URL("../public/tzofen.html", import.meta.url));
const ctx = loadContext(PAGE);
const { region, lines, byReading } = ctx;
const pageLetters = (() => { const html = readFileSync(PAGE, "utf8"); return gunzipSync(Buffer.from(/<script id="torah-data" type="text\/plain">([\s\S]*?)<\/script>/.exec(html)[1].trim(), "base64")).toString("utf8"); })();
// Two strings the user named as evaluation targets. They appear in this test file only, never in the library, the runner or the prompt prose.
const TARGETS = ["ספינת", "יכלאש"];

let sdk = null;
try { sdk = await import("../experiments/els-live-reading/lib/client.mjs"); } catch { /* the experiment's own dependencies are not installed: the stubbed client tests are skipped */ }

test("EXP-15 region: 33 x 41 cells from the canonical stream, every row checksummed, the selected occurrence is column 21 rows 21-28, second copy of the text agrees", () => {
  assert.deepEqual([region.nRows, region.nCols, region.W, region.scope], [33, 41, 4545, "torah"]);
  assert.deepEqual(region.axisCells[0], [21, 21]);
  assert.deepEqual(region.axisCells.at(-1), [28, 21]);
  assert.equal(region.axisCells.map(([i, j]) => region.letterAt(i, j)).join(""), "קולומביה");
  assert.equal(ctx.pageCheck.checked, 1353);
  assert.equal(ctx.pageCheck.mismatches.length, 0);
  const data = JSON.parse(readFileSync(REGION_PATH, "utf8"));
  data.grid[3].s = `${data.grid[3].s.slice(0, 5)}א${data.grid[3].s.slice(6)}`;
  const tampered = `${mkdtempSync(`${tmpdir()}/region-`)}/r.json`;
  writeFileSync(tampered, JSON.stringify(data));
  assert.throws(() => loadRegion(tampered), /checksum mismatch/);
  assert.equal(foldFinals("ךםןףץ"), "כמנפצ");
});

test("EXP-15 lines: four kinds in both directions, every cell on exactly one line of each kind, short corner lines are listed as omitted, and skips follow from the width", () => {
  assert.deepEqual(countsByKind(lines), { R: 33, C: 41, D: 69, A: 69 });
  assert.equal(lines.omitted.length, 8);
  assert.ok(lines.omitted.every((o) => o.length < 3));
  for (const kind of ["R", "C", "D", "A"]) {
    const seen = new Map();
    for (const line of lines.filter((l) => l.kind === kind)) for (const [i, j] of line.cells) seen.set(`${i},${j}`, (seen.get(`${i},${j}`) ?? 0) + 1);
    assert.ok([...seen.values()].every((n) => n === 1), `${kind}: no cell twice`);
    const omittedCells = lines.omitted.filter((o) => o.kind === kind).reduce((s, o) => s + o.length, 0);
    assert.equal(seen.size + omittedCells, 33 * 41, `${kind}: every cell is on a line or on an omitted short line`);
  }
  assert.equal(byReading.size, lines.length * 2);
  const expectedSkip = { R: 1, C: 4545, D: 4546, A: 4544 };
  for (const reading of byReading.values()) {
    const params = engineParams(region, reading.cells);
    assert.equal(params.skip, expectedSkip[reading.kind], `${reading.id}: skip`);
    assert.equal(params.dir, reading.sign, `${reading.id}: direction`);
    // an independent reading of the second copy of the text at the derived start, skip and direction
    const letters = Array.from({ length: params.length }, (_, k) => pageLetters[params.start + params.dir * params.skip * k]).join("");
    assert.equal(letters, reading.letters, `${reading.id}: letters at the derived positions`);
  }
  assert.equal(KINDS.D.step(4545), 4546);
});

test("EXP-15 prompt: the story verbatim, the continue-from option, no invented letters, no positions or skips, no target in the instruction text, deterministic", () => {
  const first = round1Request(ctx);
  const second = round1Request(ctx);
  assert.equal(requestSha256(first.request), requestSha256(second.request));
  const prose = [SYSTEM, ...Object.values(first.round1.prose), JSON.stringify(FINDINGS_SCHEMA)].join("\n");
  for (const target of TARGETS) assert.equal(prose.includes(target), false, `the instruction text does not name ${target}`);
  assert.ok(first.round1.prose.intro.includes(STORY));
  for (const needle of ["from_finding", "continue_from", "extension", "crossing", "בדוק את האותיות שלפניה ואחריה", "הקווים האחרים שחותכים", "הסביבה הקרובה", "בלי להוסיף, להשמיט, להחליף או לסדר מחדש אותיות", "אל תגביל את עצמך לנושא התיאור"]) assert.ok(first.round1.prose.task.includes(needle), needle);
  assert.ok(SYSTEM.includes("אל תחשב מיקומים, מספרי דילוג או גימטריה"));
  for (const number of ["4544", "4545", "4546", "248765"]) assert.equal(first.request.messages[0].content.includes(number), false, `the model is never shown ${number}`);
  const user = first.request.messages[0].content;
  for (const reading of byReading.keys()) assert.ok(user.includes(`\n${reading} `) || user.includes(`\n${reading} `), `${reading} is in the data`);
  assert.ok(MAX_FINDINGS >= 40);
  assert.deepEqual([...FINDINGS_SCHEMA.properties.findings.items.required].sort(), Object.keys(FINDINGS_SCHEMA.properties.findings.items.properties).sort());
});

test("EXP-15 request: Claude Opus 5.5 by default, adaptive thinking, effort, structured output, no tools or fallbacks, sampling parameters absent; cost arithmetic", () => {
  const { request } = round1Request(ctx);
  assert.equal(request.model, DEFAULTS.model);
  assert.deepEqual(Object.keys(request).sort(), ["max_tokens", "messages", "model", "output_config", "system", "thinking"].sort());
  assert.deepEqual(request.thinking, { type: "adaptive", display: "summarized" });
  assert.equal(request.output_config.format.type, "json_schema");
  for (const forbidden of ["temperature", "top_p", "top_k", "tools", "fallbacks", "betas", "stream", "cache_control"]) assert.equal(forbidden in request, false, forbidden);
  assert.equal("cache_control" in buildRequest({ model: "m", system: "s", messages: [], cache: true }), true);
  assert.deepEqual(costOf("claude-opus-5-5", { input_tokens: 1_000_000, output_tokens: 1_000_000 }).usd, 24);
  assert.equal(costOf("claude-sonnet-5-5", { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 1_000_000, cache_read_input_tokens: 1_000_000 }).usd, 2.5 + 0.2);
  assert.equal(costOf("some-other-model", { input_tokens: 1 }).usd, null);
  assert.ok(PRICES["claude-opus-5-5"].input === 4);
  const message = { content: [{ type: "thinking", thinking: "t" }, { type: "text", text: "{}" }], stop_reason: "end_turn", model: "m", usage: { input_tokens: 1 }, id: "x" };
  assert.deepEqual(summarizeMessage(message).thinking, ["t"]);
  assert.equal(summarizeMessage(message).text, "{}");
});

test("EXP-15 locating proposals (synthetic fixtures built from the region's own lines, not model output): exact, wrong line, altered letters, final letters, bad parts, unknown line", () => {
  const reading = byReading.get("D20+");
  const slice = reading.letters.slice(4, 9);
  const exact = locateFinding({ id: "t1", line: "D20+", text: slice, parts: [slice] }, ctx);
  assert.equal(exact.status, "located_in_cited_line");
  assert.deepEqual(exact.occurrences[0].params.skip, 4546);
  assert.equal(exact.occurrences[0].cells.length, 5);
  const altered = slice.slice(0, 2) + (slice[2] === "א" ? "ב" : "א") + slice.slice(3);
  const none = locateFinding({ id: "t2", line: "D20+", text: `${altered}${altered}`, parts: [] }, ctx);
  assert.equal(none.status, "not_in_region");
  assert.ok(none.reasons.join(" ").includes("do not appear"));
  const elsewhere = locateFinding({ id: "t3", line: "R01+", text: slice, parts: [] }, ctx);
  assert.equal(elsewhere.status, "located_in_other_line");
  assert.ok(elsewhere.occurrences.some((o) => o.reading === "D20+"));
  const unknown = locateFinding({ id: "t4", line: "Z99+", text: slice, parts: [] }, ctx);
  assert.equal(unknown.status, "located_in_other_line");
  assert.ok(unknown.reasons.join(" ").includes("unknown line id"));
  let at = 0;
  while (!/[כמנפצ]/.test(reading.letters.slice(at, at + 5))) at += 1;
  const withBase = reading.letters.slice(at, at + 5);
  const withFinal = withBase.replace("כ", "ך").replace("מ", "ם").replace("נ", "ן").replace("פ", "ף").replace("צ", "ץ");
  assert.notEqual(withFinal, withBase);
  const finals = locateFinding({ id: "t5", line: "D20+", text: withFinal, parts: [] }, ctx);
  assert.equal(finals.status, "located_in_cited_line", "final letters are formatting");
  assert.equal(finals.text, withBase);
  const badParts = locateFinding({ id: "t6", line: "D20+", text: slice, parts: [slice.slice(0, 2), slice.slice(3)] }, ctx);
  assert.equal(badParts.segmentationOk, false);
  assert.equal(badParts.status, "located_in_cited_line", "the letters are still located; only the segmentation is rejected");
  assert.equal(locateFinding({ id: "t7", line: "D20+", text: "א", parts: [] }, ctx).status, "invalid_text");
  const many = locateFinding({ id: "t8", line: "R01+", text: byReading.get("R01+").letters.slice(0, 2), parts: [] }, ctx);
  assert.ok(many.occurrences.length <= MAX_OCCURRENCES_VERIFIED);
  assert.ok(parseModelOutput('{"findings":[]}').ok && !parseModelOutput("nope").ok && !parseModelOutput("{}").ok);
});

test("EXP-15 verification SQL: read-only, validated values, the canonical function, batches; classification keeps verified and not verified apart (synthetic engine answers)", () => {
  const sql = verificationSql([{ key: "a.0", term: "אבגד", start: 10, skip: 4545, dir: -1 }]);
  assert.match(sql, /public\.els_search_page_core_v1/);
  assert.match(sql, /public\.torah_stream/);
  assert.equal(/\b(insert|update|delete|drop|create|alter|truncate|grant)\b/i.test(sql), false);
  assert.throws(() => verificationSql([{ key: "a.0", term: "abc", start: 1, skip: 2, dir: 1 }]), /Hebrew/);
  assert.throws(() => verificationSql([{ key: "a.0", term: "אבגד", start: -1, skip: 2, dir: 1 }]), RangeError);
  assert.throws(() => verificationSql([{ key: "a.0", term: "אבגד", start: 1, skip: 2, dir: 0 }]));
  assert.throws(() => verificationSql([{ key: "a'.0", term: "אבגד", start: 1, skip: 2, dir: 1 }]), /key/);
  assert.equal(verificationStatements(Array.from({ length: BATCH * 2 + 1 }, (_, k) => ({ key: `k.${k}`, term: "אבגד", start: k, skip: 2, dir: 1 }))).length, 3);
  const reading = byReading.get("C05+");
  const located = [
    locateFinding({ id: "r1.f01", line: "C05+", text: reading.letters.slice(0, 4), parts: [] }, ctx),
    locateFinding({ id: "r1.f02", line: "R05+", text: byReading.get("R05+").letters.slice(0, 4), parts: [] }, ctx),
    locateFinding({ id: "r1.f03", line: "C05+", text: reading.letters.slice(6, 10), parts: [] }, ctx),
    locateFinding({ id: "r1.f04", line: "C05+", text: reading.letters.slice(0, 3).replace(/./, "ת") + "תתת", parts: [] }, ctx),
  ];
  const items = verificationItems(located);
  assert.ok(items.every((item) => /^r1\.f0[1-4]\.\d+$/.test(item.key)));
  const answers = [
    { key: "r1.f01.0", letters_match: true, engine: { status: "OK", found: true } },
    { key: "r1.f02.0", letters_match: true, engine: { status: "plain_text_row_not_els" } },
    { key: "r1.f03.0", letters_match: true, engine: { status: "OK", found: false } },
  ];
  const classified = classify(located, answers);
  assert.deepEqual(classified.map((f) => f.verdict), ["verified_by_engine", "verified_plain_text_only", "not_verified", "not_verified"]);
  assert.ok(classified[2].reasons.join(" ").includes("no matching occurrence"));
  assert.ok(classified[3].reasons.join(" ").includes("do not appear"));
});

test("EXP-15 neighbourhood cards (round 2) are built from the region only: the letters before and after, the other three lines through every cell, a patch of the grid", () => {
  const reading = byReading.get("D30-");
  const from = 6;
  const text = reading.letters.slice(from, from + 5);
  const card = buildCard({ region, lines, byReading, findingId: "r1.f09", text, readingId: "D30-", from, to: from + 4 });
  assert.ok(card.includes(`[${text}]`));
  assert.equal((card.match(/^תא \d+ של ההצעה/gm) ?? []).length, 5);
  assert.ok(card.includes("הסביבה הקרובה"));
  const body = card.split("\n").filter((row) => row.startsWith("תא "));
  assert.ok(body.every((row) => (row.match(/ \| /g) ?? []).length === 2), "three other lines per cell (the cited line is left out)");
  const message = buildRound2Message({ cards: [card] });
  assert.ok(message.includes("בלי להגביל את עצמך לנושא התיאור") && message.includes("from_finding"));
  for (const target of TARGETS) assert.equal(message.replace(card, "").includes(target), false);
});

test("EXP-15 evaluation of the targets is separate from the run and distinguishes exact, inside a longer run and overlap on the same line (synthetic findings)", () => {
  const reading = byReading.get("D20+");
  const target = reading.letters.slice(6, 11);
  const make = (id, text, from, verdict) => ({ id, text, verdict, occurrences: [{ reading: "D20+", from, to: from + text.length - 1, cells: reading.cells.slice(from, from + text.length) }] });
  const classified = [make("a", target, 6, "verified_by_engine"), make("b", reading.letters.slice(4, 13), 4, "verified_by_engine"), make("c", reading.letters.slice(9, 14), 9, "not_verified")];
  const [result] = evaluateTargets({ targets: [target], classified, byReading });
  assert.equal(result.best, "exact_verified");
  assert.deepEqual(result.hits.inside_longer_verified, ["b"]);
  assert.deepEqual(result.hits.overlap_same_line_unverified, ["c"]);
  const [absent] = evaluateTargets({ targets: ["תתתתתתת"], classified, byReading });
  assert.equal(absent.best, "none");
  assert.equal(absent.placementsInRegion.length, 0);
});

test("EXP-15 report: model, exact input, proposals before verification, verified and not verified apart, time and cost, limits (synthetic round)", () => {
  const classified = [{ id: "r1.f01", modelId: "F1", text: "אבגד", rawText: "אבגד", occurrences: [{ reading: "C05+" }], totalOccurrences: 1, verifiedOccurrences: 1, verdict: "verified_by_engine", segmentationOk: true, reasons: [] }, { id: "r1.f02", modelId: "F2", text: "תתתת", rawText: "תתתת", line: "C05+", occurrences: [], totalOccurrences: 0, verifiedOccurrences: 0, verdict: "not_verified", segmentationOk: true, reasons: ["letters do not appear"] }];
  const round = { findings: [{ id: "r1.f01", modelId: "F1", line: "C05+", text: "אבגד", parts: ["אב", "גד"], kind: "word", story_related: false, continue_from: true, from_finding: "", note: "n" }], observations: "o", servedModel: "model-x", stopReason: "end_turn", stopDetails: null, usage: { input_tokens: 10, output_tokens: 5 }, ms: 1500, cost: { usd: 0.001, basis: "b" } };
  const input = { round1Sha: "x".repeat(64), systemChars: 1, userChars: 2, nRows: 33, nCols: 41, cells: 1353, lines: 212, byKind: { R: 33, C: 41, D: 69, A: 69 }, pageMismatches: 0, omittedShortLines: 8 };
  const { text, sha256 } = renderReport({ meta: { requestedModel: "model-x", effort: "high", maxTokens: 1, preflight: null }, input, rounds: [round], classified, evaluation: [{ target: "t", placementsInRegion: [], best: "none", hits: {} }] });
  for (const heading of ["## 1. מה הופעל", "## 2. מה בדיוק התקבל", "## 3. מה המודל הציע לפני האימות", "## 4. מה המנוע הקנוני אימת", "## 5. מה לא אומת", "## 6. זמן ועלות", "## 7. האם נמצאו יעדי ההערכה", "## 8. מגבלות"]) assert.ok(text.includes(heading), heading);
  assert.match(sha256, /^[0-9a-f]{64}$/);
  assert.ok(text.indexOf("## 4.") < text.indexOf("## 5."));
});

test("EXP-15 fail closed: without the experiment's own credential the call stages stop with exit code 2 and nothing is built or sent; no mock path exists", () => {
  const env = { ...process.env };
  delete env[KEY_ENV];
  delete env.ANTHROPIC_API_KEY;
  for (const stage of ["preflight", "call1"]) {
    const run = spawnSync(process.execPath, [`${DIR}run-live-reading.mjs`, stage], { env, cwd: fileURLToPath(new URL("../", import.meta.url)), encoding: "utf8" });
    assert.equal(run.status, 2, `${stage}: exit code`);
    assert.match(run.stderr, /no credential/);
    assert.equal(run.stdout.trim(), "");
  }
  assert.throws(() => { throw new NoCredentialError(); }, /nothing was sent/);
  const sources = ["run-live-reading.mjs", ...readdirSync(`${DIR}lib`).map((name) => `lib/${name}`)].map((name) => readFileSync(`${DIR}${name}`, "utf8").replace(/\/\/.*$/gm, ""));
  for (const source of sources) assert.equal(/\b(mock|fake|stub|simulate)\b/i.test(source), false, "no mock path in the harness");
});

test("EXP-15 the targets never enter the input or the code of the run (only the post-hoc evaluation reads them)", () => {
  const code = ["run-live-reading.mjs", ...readdirSync(`${DIR}lib`).map((name) => `lib/${name}`)].map((name) => [name, readFileSync(`${DIR}${name}`, "utf8").replace(/\/\/.*$/gm, "")]);
  for (const [name, source] of code) for (const target of [...TARGETS, "אשאכלה"]) assert.equal(source.includes(target), false, `${name} contains ${target}`);
  const runner = readFileSync(`${DIR}run-live-reading.mjs`, "utf8");
  assert.equal(runner.split("evaluateTargets(").length - 1, 1, "the evaluation is called once");
  const callBody = runner.slice(runner.indexOf("async function callStage"), runner.indexOf("mkdirSync(outDir"));
  assert.equal(callBody.includes("target"), false, "the call path never touches the targets");
  assert.ok(runner.includes("const targets = args.targets ?"), "the targets file is read only if the report stage is given one");
  for (const name of ["context.mjs", "prompt.mjs", "request.mjs", "client.mjs", "validate.mjs", "verify-sql.mjs", "region.mjs"]) assert.equal(readFileSync(`${DIR}lib/${name}`, "utf8").includes("evaluate"), false, `${name} does not import the evaluation`);
  const summary = JSON.parse(readFileSync(`${DIR}review/input-summary.json`, "utf8"));
  assert.equal(summary.request_sha256, requestSha256(round1Request(ctx).request), "the reviewed request is the one the harness builds");
  const reviewed = readFileSync(`${DIR}review/request-round1.txt`, "utf8");
  assert.ok(reviewed.includes(summary.request_sha256));
  assert.equal(createHash("sha256").update(JSON.stringify(JSON.parse(readFileSync(`${DIR}review/request-round1.json`, "utf8"))), "utf8").digest("hex"), summary.request_sha256);
  const selftest = JSON.parse(readFileSync(`${DIR}review/verification-selftest.json`, "utf8")).result;
  assert.deepEqual(selftest.map((row) => [row.key, row.letters_match, row.engine.found ?? null]), [["ctl.axis", true, true], ["ctl.row", true, null], ["ctl.shift", false, false]]);
});

test("EXP-15 stubbed client (test-only objects, never part of the harness): an unlisted model stops the run, a listed one is checked for capabilities, limits and the token guard", { skip: sdk ? false : "experiment dependencies not installed" }, async () => {
  const { preflight, callRound } = sdk;
  const { request } = round1Request(ctx);
  const client = (ids, info, count) => ({ models: { list: () => (async function* () { for (const id of ids) yield { id }; })(), retrieve: async () => info }, messages: { countTokens: async () => ({ input_tokens: count }) } });
  const good = { display_name: "x", max_input_tokens: 1_000_000, max_tokens: 128_000, capabilities: { structured_outputs: { supported: true }, thinking: { types: { adaptive: { supported: true } } }, effort: { high: { supported: true } } } };
  const unlisted = await preflight(client(["other-model"], good, 1000), request);
  assert.equal(unlisted.ok, false);
  assert.match(unlisted.reason, /not available/);
  const ok = await preflight(client([request.model], good, 40_000), request);
  assert.equal(ok.ok, true);
  assert.equal(ok.request_sha256, requestSha256(request));
  assert.ok(ok.upper_bound_usd > 0.6 && ok.upper_bound_usd < 1);
  const noStructured = await preflight(client([request.model], { ...good, capabilities: { ...good.capabilities, structured_outputs: { supported: false } } }, 40_000), request);
  assert.equal(noStructured.ok, false);
  const tooBig = await preflight(client([request.model], good, 160_000), request);
  assert.equal(tooBig.ok, false, "refuses instead of truncating");
  const message = { content: [], stop_reason: "end_turn" };
  const done = await callRound({ messages: { stream: () => ({ finalMessage: async () => message }) } }, request);
  assert.equal(done.message, message);
  assert.ok(done.ms >= 0);
  assert.throws(() => sdk.makeClient({}), NoCredentialError);
});
