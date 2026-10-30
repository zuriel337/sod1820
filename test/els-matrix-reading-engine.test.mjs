import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import * as M from "../supabase/functions/_shared/elsMatrixReading.js";

const fx = (name) => JSON.parse(readFileSync(new URL(`./fixtures/els-matrix-reading/${name}`, import.meta.url), "utf8"));
const windowC1 = fx("window-c1.json");
const AXIS = { term: "קולומביה", scope: "torah", skip: 4545, dir: 1, start: 248765 };
const axisSpec = { start: 248765, skip: 4545, dir: 1, length: 8 };
const region = M.makeRegion({ width: windowC1.width, r0: windowC1.rows[0], c0: windowC1.cols[0], rows: windowC1.grid.map((row) => row.s), axis: axisSpec });
const lines = M.buildLines(region);

test("focus uniform: the request equals, byte for byte, the requests that were measured in EXP-18 (cap 60 and cap 25)", async () => {
  for (const [cap, file, hashes] of [[60, "request-c2-general-cap60.json", null], [25, "request-c3-general-cap25.json", fx("response-c3.json")]]) {
    const saved = fx(file);
    const { request } = M.buildReadingRequest({ model: M.MODEL_DEFAULT, region, lines, cap, focus: "uniform" });
    assert.equal(JSON.stringify(request), JSON.stringify(saved), `cap ${cap}: same keys, same order, same text`);
    if (hashes) {
      assert.equal(await M.requestSha256(request), hashes.request_sha256);
      assert.equal(await M.lockSha256(request), hashes.lock_sha256);
    }
  }
  assert.equal(M.DEFAULTS.cap, 60);
  assert.equal(M.DEFAULTS.rows, 33);
  assert.equal(M.DEFAULTS.cols, 41);
});

test("the lines and the coverage are those of the harness (23 x 41: 182 lines) and say what is not covered", () => {
  assert.equal(lines.length, 182);
  const window = M.selectWindow({ axis: AXIS, rows: 23, cols: 41 });
  const coverage = M.describeCoverage({ region, lines, window });
  assert.equal(coverage.cells, 943);
  assert.deepEqual(coverage.rows, { from: 44, to: 66, count: 23, requested: 23 });
  assert.deepEqual(coverage.cols, { from: 3315, to: 3355, count: 41, requested: 41 });
  assert.equal(coverage.lines_shown.total, 182);
  assert.equal(coverage.lines_shown.readings, 364);
  assert.equal(coverage.touches_matrix_edge.bottom, true);
  assert.match(coverage.what_is_not_covered, /outside this window/);
});

test("window selection: the Columbia default is the region of EXP-15 (rows 34-66, columns 3315-3355); it shifts inward at an edge and refuses what it cannot cover", () => {
  const w = M.selectWindow({ axis: AXIS });
  assert.deepEqual([w.r0, w.r1, w.c0, w.c1, w.rows, w.cols], [34, 66, 3315, 3355, 33, 41]);
  assert.equal(w.shifted.rows, true, "the window slid up so that it keeps 33 rows");
  assert.equal(w.touches_edge.bottom, true);
  // an axis near the left edge of its matrix: the columns shift, they are not cut
  const left = M.selectWindow({ axis: { term: "אב", skip: 4545, dir: -1, start: 100000 } });
  assert.equal(left.c0, 0);
  assert.equal(left.cols, 41);
  assert.equal(left.shifted.cols, true);
  assert.throws(() => M.selectWindow({ axis: { term: "אבג", skip: 10, dir: 1, start: 5 } }), /matrix_too_narrow/);
  assert.throws(() => M.selectWindow({ axis: { term: "אבגדהוזחטיכל", skip: 4545, dir: 1, start: 4545 * 30 + 100 }, rows: 9 }), /window_smaller_than_axis/);
  assert.throws(() => M.selectWindow({ axis: { ...AXIS, start: 304_000 } }), /axis_outside/);
});

test("golden: the saved answer of C3, located, replayed through the canonical engine record and classified, gives the harness classification", async () => {
  const response = fx("response-c3.json");
  const parsed = M.parseModelOutput(response.summary.text);
  assert.equal(parsed.ok, true);
  const raw = parsed.value.findings.map((f, k) => ({ ...f, modelId: f.id, id: `r1.f${String(k + 1).padStart(2, "0")}` }));
  const byReading = M.readings(lines);
  const located = raw.map((f) => M.locateFinding(f, { region, byReading }));
  const recorded = new Map(fx("engine-replay-c3.json").rows.map((r) => [`${r.term}|${r.skip}|${r.dir}|${r.start}`, r]));
  const replay = async ({ term, skip, dir, start }) => {
    const r = recorded.get(`${term}|${skip}|${dir}|${start}`);
    return r ? { verification_state: r.verification_state, status: r.status, contract: r.contract, corpus_id: r.corpus_id, occurrence: { occurrence_id: r.occurrence_id } } : { verification_state: "MISMATCH", status: "REPLAY_MISMATCH" };
  };
  const rows = await M.verifyOccurrences(M.verificationItems(located), { region, replay });
  const classified = M.classify(located, rows);
  const golden = fx("harness-classified-c3.json");
  assert.equal(classified.length, golden.length);
  for (const [k, f] of classified.entries()) {
    assert.equal(f.id, golden[k].id);
    assert.equal(f.text, golden[k].text);
    assert.equal(f.verdict, golden[k].verdict, f.text);
    assert.equal(f.verifiedOccurrences, golden[k].verifiedOccurrences);
    assert.deepEqual(f.occurrences.map((o) => o.params), golden[k].occurrences.map((o) => o.params));
  }
  // the view the card shows, and the numbers the experiment reported for this run
  const findings = M.viewFindings({ classified, raw, region, rows });
  const summary = M.summarizeFindings(findings);
  assert.deepEqual([summary.proposals, summary.engine_verified, summary.plain_text_only, summary.not_verified], [25, 25, 0, 0]);
  assert.deepEqual([summary.engine_verified_long, summary.engine_verified_short, summary.unlikely_by_chance, summary.expected_by_chance], [10, 15, 8, 17]);
  assert.deepEqual(summary.by_relation, { crosses: 2, touches: 0, far: 23 });
  assert.ok(findings.every((f) => f.verification.engine?.verification_state === "MATCH" && f.verification.engine.occurrence_id.startsWith("els:0b022e8eef6f9c16:")));
  assert.ok(findings.every((f) => f.model_claims.status === "UNVERIFIED_INTERPRETATION"));
  assert.equal(M.REPORTING_NOTES.some((n) => /output cap/.test(n)), true);
});

test("a wrong position is not verified: the letters differ in the stream, and a replay MISMATCH is not a match", async () => {
  const items = [{ key: "x.0", term: "קולומביה", start: 248766, skip: 4545, dir: 1 }, { key: "y.0", term: "קולומביה", start: 248765, skip: 4545, dir: 1 }];
  const replay = async ({ start }) => (start === 248765 ? { verification_state: "MATCH", status: "OK" } : { verification_state: "MISMATCH", status: "REPLAY_MISMATCH" });
  const rows = await M.verifyOccurrences(items, { region, replay });
  assert.equal(rows[0].letters_match, false);
  assert.equal(rows[0].engine.found, false);
  assert.equal(rows[1].letters_match, true);
  assert.equal(rows[1].engine.found, true);
  // an engine that cannot answer aborts: an unanswered item must not look like "not verified"
  await assert.rejects(M.verifyOccurrences(items, { region, replay: async () => { throw new M.ReadingError("engine_unavailable"); } }), /engine_unavailable/);
});

test("cost: from the usage object and list prices (batch), ILS only as a flagged estimate; the upper bound and the expected range come with their evidence", () => {
  const response = fx("response-c3.json");
  const cost = M.costFromUsage("claude-fable-5-1", response.summary.usage);
  assert.equal(cost.usd, response.cost.usd, "the same arithmetic as the harness that produced 0.39984");
  assert.equal(cost.ils.status, "ESTIMATED");
  assert.equal(cost.ils.fx.basis, "ASSUMPTION_NOT_VERIFIED");
  assert.equal(cost.ils.fx.effective_at, null);
  assert.equal(cost.certainty, "ESTIMATED_FROM_USAGE_AND_LIST_PRICES");
  assert.equal(M.costFromUsage("claude-unknown-1", response.summary.usage).usd, null, "no list price, no invented number");
  const configured = M.costFromUsage("claude-fable-5-1", response.summary.usage, { fxRate: 3.5, fxBasis: "CONFIGURED_NOT_VERIFIED" });
  assert.equal(configured.ils.amount, Number((cost.usd * 3.5).toFixed(4)));
  // calibrated from every measured reading (see the estimate tests below); here only the invariants of the shape
  const counted = 16_858 / 1.03; // the billed input of the measured readings, as the provider counts it before the run
  const e25 = M.estimateCost({ model: "claude-fable-5-1", inputTokens: counted, maxTokens: 64_000, cap: 25, cells: 943 });
  const e60 = M.estimateCost({ model: "claude-fable-5-1", inputTokens: counted, maxTokens: 64_000, cap: 60, cells: 943 });
  assert.ok(Math.abs(e25.upper_bound_usd - 1.7023) < 0.001, `upper bound ${e25.upper_bound_usd}`);
  assert.ok(e25.expected_usd.low <= 0.3998 * 1.01 && e25.expected_usd.high >= 0.4928 - 0.0005, "cap 25 at 943 cells covers the two measured readings (0.40 and 0.49)");
  assert.ok(e60.expected_usd.high <= e60.upper_bound_usd);
  assert.equal(e60.evidence.length, 5);
  assert.deepEqual(e60.cost_exposure, { charged_to_user: false, credits: "NOT_CHARGED", refund: "NOT_PROMISED" });
});

test("the signed job token is stateless, tamper-evident, expiring and secret-bound", async () => {
  const payload = { v: 1, b: "msgbatch_x", i: "u:1", t: 1000, x: 5000 };
  const token = await M.signJobToken(payload, "secret-1");
  assert.equal((await M.verifyJobToken(token, "secret-1", { now: 2000 })).ok, true);
  assert.equal((await M.verifyJobToken(token, "secret-2", { now: 2000 })).error, "invalid_job_token");
  assert.equal((await M.verifyJobToken(token, "secret-1", { now: 9000 })).error, "job_token_expired");
  const [body, sig] = token.split(".");
  const forged = `${Buffer.from(JSON.stringify({ ...payload, i: "u:2" })).toString("base64url")}.${sig}`;
  assert.equal((await M.verifyJobToken(forged, "secret-1", { now: 2000 })).error, "invalid_job_token");
  assert.equal((await M.verifyJobToken("garbage", "secret-1")).error, "invalid_job_token");
  await assert.rejects(M.signJobToken(payload, ""), /job_secret_missing/);
  assert.ok(body.length > 10);
});

test("the chance model uses the Torah's own letter counts: the embedded counts equal the counts of the page text (md5 of the canonical stream)", () => {
  const html = readFileSync(new URL("../public/tzofen.html", import.meta.url), "utf8");
  const data = /<script id="torah-data" type="text\/plain">([\s\S]*?)<\/script>/.exec(html);
  const torah = gunzipSync(Buffer.from(data[1].trim(), "base64")).toString("utf8").slice(0, M.TORAH_LENGTH);
  assert.equal(createHash("md5").update(torah, "utf8").digest("hex"), "0066c2431821863d258745e664d3883e");
  const counts = {};
  for (const ch of torah) counts[ch] = (counts[ch] ?? 0) + 1;
  assert.deepEqual(M.TORAH_LETTER_COUNTS, counts);
  assert.equal(Object.values(M.TORAH_LETTER_COUNTS).reduce((a, b) => a + b, 0), M.TORAH_LENGTH);
  assert.ok(M.expectedChance("קולומביה", 4545) < 1e-3);
  assert.ok(M.expectedChance("אל", 4545) > 1);
});

test("relation to the selected occurrence: crossing, touching, far", () => {
  assert.equal(M.relationToAxis(region, [[10, 5], [10, 6]]).relation, "far");
  const [r, c] = region.axisCells[0];
  assert.deepEqual(M.relationToAxis(region, [[r, c], [r, c + 1]]), { distance: 0, relation: "crosses" });
  assert.deepEqual(M.relationToAxis(region, [[r - 1, c + 1]]), { distance: 1, relation: "touches" });
});

test("the modules stay plain JS with only their explicit sibling action/job dependencies; no Node or Deno API by name", () => {
  const allowed = { "elsMatrixReading.js": ["./elsMatrixReadingAction.js", "./elsMatrixReadingJobs.js"],
    "elsMatrixReadingAction.js": [], "elsMatrixReadingJobs.js": ["./elsMatrixReadingAction.js"] };
  for (const name of Object.keys(allowed)) {
    const source = readFileSync(new URL(`../supabase/functions/_shared/${name}`, import.meta.url), "utf8");
    const imports = source.match(/^import .*$/gm) ?? [];
    assert.deepEqual(imports.map((line) => line.match(/from "([^"]+)"/)[1]), allowed[name], name);
    assert.doesNotMatch(source, /Deno\.|node:|process\.env|require\(/, name);
  }
});

// ---------- the neighbourhood-depth default (ZURIEL 30.10.2026) ----------
const near = M.neighborhoodBox(region);

test("neighbourhood box: every cell within 8 of the selected occurrence, clipped to the window", () => {
  assert.equal(M.NEIGHBORHOOD_RADIUS, 8);
  const axisRows = region.axisCells.map(([r]) => r), axisCol = region.axisCells[0][1];
  assert.deepEqual(near.rows, { from: Math.max(1, Math.min(...axisRows) - 8), to: Math.min(region.nRows, Math.max(...axisRows) + 8) });
  assert.deepEqual(near.cols, { from: Math.max(1, axisCol - 8), to: Math.min(region.nCols, axisCol + 8) });
  assert.equal(near.radius, 8);
  assert.equal(near.cells, (near.rows.to - near.rows.from + 1) * (near.cols.to - near.cols.from + 1));
  assert.ok(near.share_of_window > 0 && near.share_of_window < 1);
  const edge = M.neighborhoodBox({ ...region, axisCells: [[1, 1], [2, 1]] });
  assert.deepEqual([edge.rows.from, edge.cols.from], [1, 1], "clipped at the top-left corner of the window");
});

test("the default is the measured text with ONE section appended after it: nothing measured is replaced, shortened or reordered", () => {
  const dflt = M.buildReadingPrompt({ region, lines, cap: 25 });
  const uniform = M.buildReadingPrompt({ region, lines, cap: 25, focus: "uniform" });
  assert.equal(dflt.focus, "axis_neighborhood");
  assert.equal(uniform.neighborhood, null);
  assert.equal(uniform.prose.addendum, null);
  assert.equal(dflt.system, uniform.system);
  assert.equal(dflt.user, `${uniform.user}\n\n${dflt.prose.addendum}`, "the measured prompt is an exact prefix: removing the addendum restores it byte for byte");
  for (const kept of ["אל תדרג לפי קרבה לאמצע הקטע או לפי סוג הקו", "או למילים שנמצאות באמצע הקטע", "5. עד 25 הצעות.", "אזורים או כיוונים שהקדשת להם פחות תשומת לב."]) assert.ok(dflt.user.includes(kept), `still in the default: ${kept}`);
  const a = dflt.prose.addendum;
  assert.match(a, /^## תוספת: העמקה לאורך הציר ובסביבתו/);
  assert.match(a, /זו תוספת בלבד, ואינה מחליפה את מה שלמעלה: כל ההוראות שלמעלה נשארות בתוקף/);
  assert.match(a, new RegExp(`עד ${near.radius} תאים`));
  assert.match(a, new RegExp(`R${String(near.rows.from).padStart(2, "0")}–R${String(near.rows.to).padStart(2, "0")} ועמודות C${String(near.cols.from).padStart(2, "0")}–C${String(near.cols.to).padStart(2, "0")}`));
  const along = M.axisLines(region, lines);
  assert.ok(along.length > 0 && along.every((l) => l.cells.some(([i, j]) => region.axisCells.some(([x, y]) => x === i && y === j))));
  assert.ok(a.includes(`${along.length} קווים: ${along.map((l) => l.id).join(", ")}`), "the lines through the selected occurrence are named: where the depth along the axis starts");
  assert.match(a, /בדיקת השוליים נשמרת תמיד: גם אם מצאת מילים ליד הציר, ואפילו הרבה, עבור על קווי השוליים עד הסוף/);
  assert.match(a, /זו בדיקה ולא מכסה: אם אין בשוליים קריאה ראויה אל תציע/);
  assert.match(a, /אל תמלא מכסה: עד 25 הצעות הוא תקרה בלבד/);
  assert.match(a, /הצעה רחוקה מהציר אינה נדחקת מפני הצעה קרובה/);
  assert.match(a, /שורות R הן הטקסט המקראי עצמו \(דילוג 1\). אל תדלג עליהן/);
  assert.match(a, /ונספרות באותה תקרה כמו כל הצעה, בסביבה ובשוליים/);
  assert.match(a, /review[\s\S]*היא נפרדת ממספר ההצעות, אינה נבדקת, ואינה דורשת למלא דבר/);
  // no quota anywhere: the only number of proposals in the addendum is the ceiling, and it is said to be a ceiling
  assert.deepEqual([...a.matchAll(/(\d+)\s+הצעות/g)].map((m) => m[0]), ["25 הצעות"]);
  assert.doesNotMatch(a, /לפחות \d+|\d+ מתוך|שני שלישים|שלושה רבעים|רבע מההצעות|מינימום|חובה להציע/);
  assert.doesNotMatch(dflt.user, /הצע רק מה שבולט|רק מה שבולט/, "the margins are not left to 'only what stands out': that would be a gate");
  assert.doesNotMatch(uniform.user, /תוספת: העמקה|בדיקת השוליים נשמרת/);
  const stories = M.buildReadingPrompt({ region, lines, cap: 25, story: "סיפור" });
  assert.match(stories.user, /^## הרקע\n„סיפור”/);
  assert.equal(stories.user, `${M.buildReadingPrompt({ region, lines, cap: 25, story: "סיפור", focus: "uniform" }).user}\n\n${stories.prose.addendum}`);
});

test("no number of proposals is asked for, near or far, at any cap: the addendum differs between caps only in the sentence that names the ceiling", () => {
  assert.equal(M.allocationTargets, undefined, "the quota helper is gone");
  assert.equal(M.MARGIN_SHARE_MIN, undefined);
  assert.equal(M.NEIGHBORHOOD_TARGET_RATIO, undefined);
  const norm = (cap) => M.buildReadingPrompt({ region, lines, cap }).prose.addendum.replace(`עד ${cap} הצעות הוא תקרה בלבד`, "עד N הצעות הוא תקרה בלבד");
  for (let cap = M.LIMITS.minCap; cap <= M.LIMITS.maxCap; cap += 1) assert.equal(norm(cap), norm(25), `cap ${cap}`);
});

/** The paths at which two JSON values differ (arrays by index). */
const diffPaths = (a, b, path = "") => {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (a && b && typeof a === "object" && typeof b === "object") return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap((k) => diffPaths(a[k], b[k], `${path}${Array.isArray(a) ? `[${k}]` : `.${k}`}`));
  return [path];
};

test("the differences from the measured request are exactly these: the appended text and the schema that also carries the model's review", async () => {
  const dflt = M.buildReadingRequest({ model: M.MODEL_DEFAULT, region, lines, cap: 25 });
  const uni = M.buildReadingRequest({ model: M.MODEL_DEFAULT, region, lines, cap: 25, focus: "uniform" });
  assert.deepEqual(diffPaths(uni.request, dflt.request), [".messages[0].content", ".output_config.format.schema.required[1]", ".output_config.format.schema.required[2]", ".output_config.format.schema.properties.review"]);
  assert.equal(dflt.request.messages[0].content, `${uni.request.messages[0].content}\n\n${dflt.prompt.prose.addendum}`);
  const saved = fx("request-c3-general-cap25.json");
  assert.equal(JSON.stringify(uni.request), JSON.stringify(saved), "the measured route is untouched");
  assert.deepEqual(dflt.request.output_config.format.schema.required, ["findings", "review", "observations"]);
  assert.deepEqual(uni.request.output_config.format.schema.required, ["findings", "observations"]);
  assert.deepEqual(dflt.request.output_config.format.schema.properties.review.required, ["near_lines", "margin_lines"]);
  assert.deepEqual(dflt.request.output_config.format.schema.properties.findings, saved.output_config.format.schema.properties.findings, "the findings (and their cap of fields) are the measured ones");
  assert.deepEqual(dflt.request.output_config.format.schema.properties.observations, saved.output_config.format.schema.properties.observations);
  assert.deepEqual(M.FINDINGS_SCHEMA_V2, saved.output_config.format.schema, "the measured schema, byte for byte");
  assert.equal(M.instructionLabel({ focus: "uniform" }), "general_v2_axis_marked_unnamed");
  assert.equal(M.instructionLabel({ focus: "uniform", story: "x" }), "general_v2_axis_marked_unnamed+user_story_unmeasured");
  assert.equal(M.instructionLabel({}), "general_v2_axis_marked_unnamed+axis_deepening_addendum_unmeasured");
  assert.equal(M.instructionLabel({ story: "x" }), "general_v2_axis_marked_unnamed+axis_deepening_addendum_unmeasured+user_story_unmeasured");
  assert.notEqual(await M.requestSha256(dflt.request), await M.requestSha256(uni.request), "the hash tells which route a reading took");
});

const mkF = (id, distance, state = "ENGINE_VERIFIED", extra = {}) => ({ id, text: "אבג", verification: { state }, relation_to_axis: state === "NOT_VERIFIED" ? null : { distance, relation: distance === 0 ? "crosses" : distance === 1 ? "touches" : "far" }, chance: null, ...extra });

test("the zones only DESCRIBE where the proposals lie: no target, no quota, no pass or fail; source rows counted in the same zones", () => {
  const set = [mkF("a", 0), mkF("b", 3), mkF("c", 8), mkF("d", 9), mkF("e", 20), mkF("f", 5, "PLAIN_TEXT_ONLY"), mkF("g", 99, "NOT_VERIFIED")];
  const z = M.summarizeFindings(set).zones;
  assert.deepEqual([z.basis, z.observed_only, z.radius, z.near.proposals, z.far.proposals, z.near_to_far, z.margin_share], ["PROPOSAL_POSITIONS", true, 8, 4, 2, 2, 0.33]);
  assert.deepEqual([z.near.engine_verified, z.near.source_rows, z.far.engine_verified, z.far.source_rows], [3, 1, 2, 0]);
  assert.equal("target" in z, false, "nothing to meet");
  assert.deepEqual(Object.keys(z).sort(), ["basis", "far", "margin_share", "near", "near_to_far", "observed_only", "radius"]);
  const heavy = M.summarizeFindings([mkF("a", 0), mkF("b", 1), mkF("c", 2), mkF("d", 3)]).zones;
  assert.deepEqual([heavy.near_to_far, heavy.margin_share, heavy.far.proposals], [null, 0, 0], "all near and nothing at the margin is a description, not a failure");
  const farOnly = M.summarizeFindings([mkF("a", 30), mkF("b", 40)]).zones;
  assert.deepEqual([farOnly.near.proposals, farOnly.far.proposals, farOnly.margin_share], [0, 2, 1], "far findings are kept and counted wherever they lie");
  const none = M.summarizeFindings([]).zones;
  assert.deepEqual([none.near.proposals, none.far.proposals, none.near_to_far, none.margin_share], [0, 0, null, null]);
  assert.deepEqual(M.summarizeFindings(set, { focus: "axis_neighborhood" }).zones, M.summarizeFindings(set, { focus: "uniform" }).zones, "the same description whatever the instruction");
  assert.equal(M.summarizeFindings(set).source_rows, 1);
});

test("three things are reported apart and never derived from one another: the count of proposals, the deterministic coverage, the model's own report", () => {
  const box = M.neighborhoodBox(region), zl = M.zoneLines(lines, box);
  assert.ok(zl.near.size > 0 && zl.margin.size > 0);
  const win = M.selectWindow({ axis: AXIS, rows: 23, cols: 41 });
  const coverage = M.describeCoverage({ region, lines, window: win, focus: "axis_neighborhood" });
  const along = M.axisLines(region, lines);
  assert.deepEqual([coverage.neighborhood.lines.near, coverage.neighborhood.lines.margin, coverage.neighborhood.margin_cells, coverage.neighborhood.axis_lines.total], [zl.near.size, zl.margin.size, region.nRows * region.nCols - box.cells, along.length]);
  assert.equal("margin_share_min" in coverage.neighborhood || "target_ratio" in coverage.neighborhood, false, "no target in the coverage either");
  // one proposal on the axis column (near), one on a row far from the axis (margin), one that did not verify
  const nearCells = region.axisCells.slice(0, 4);
  const farRow = region.nRows, farCells = [[farRow, 1], [farRow, 2], [farRow, 3]];
  const nearLine = `C${String(region.axisCells[0][1]).padStart(2, "0")}`, farLine = `R${String(farRow).padStart(2, "0")}`;
  const found = [mkF("a", 0, "ENGINE_VERIFIED", { occurrence: { reading: `${nearLine}+`, cells: nearCells } }), mkF("b", 30, "PLAIN_TEXT_ONLY", { occurrence: { reading: `${farLine}+`, cells: farCells } }), mkF("c", 0, "NOT_VERIFIED")];
  const review = { near_lines: [nearLine, `${nearLine}-`, "C99", farLine], margin_lines: [farLine, "R01", "ZZ"] };
  const report = M.buildCoverageReport({ region, lines, window: win, focus: "axis_neighborhood", findings: found, review, cap: 25 });
  assert.match(report.note, /three things, reported apart and never derived from one another/);
  // 1. the count of proposals: an output ceiling, not coverage, not to be filled
  assert.deepEqual([report.proposals.basis, report.proposals.count, report.proposals.cap, report.proposals.reached_cap], ["PROPOSAL_COUNT", 3, 25, false]);
  assert.match(report.proposals.note, /tells the model not to fill|the model is told not to fill/);
  assert.equal(M.buildCoverageReport({ region, lines, window: win, focus: "axis_neighborhood", findings: found, review, cap: 3 }).proposals.reached_cap, true);
  // 2. deterministic
  assert.deepEqual([report.shown_to_model.basis, report.shown_to_model.status, report.proposal_footprint.basis, report.proposal_footprint.status], ["DETERMINISTIC", "CERTAIN", "DETERMINISTIC_LOWER_BOUND", "VERIFIED_LOWER_BOUND"]);
  assert.equal(report.shown_to_model.near.lines, zl.near.size);
  assert.equal(report.shown_to_model.axis_lines.lines, along.length);
  assert.deepEqual([report.proposal_footprint.near.lines_with_proposals, report.proposal_footprint.near.cells_touched, report.proposal_footprint.margin.lines_with_proposals, report.proposal_footprint.margin.cells_touched], [zl.near.has(nearLine) ? 1 : 0, 4, zl.margin.has(farLine) ? 1 : 0, 3]);
  assert.equal(report.proposal_footprint.axis.lines_with_proposals, along.some((l) => l.id === nearLine) ? 1 : 0);
  // 3. the model's own report
  assert.deepEqual([report.model_review.basis, report.model_review.status], ["MODEL_REPORT", "UNVERIFIED_MODEL_REPORT"]);
  assert.deepEqual([report.model_review.near.reported, report.model_review.margin.reported], [zl.near.has(farLine) ? 2 : 1, zl.margin.has(farLine) ? (zl.margin.has("R01") ? 2 : 1) : 0], "the line is counted once whatever the direction, and only where it can be read");
  assert.ok(report.model_review.invalid_count >= 2 && report.model_review.invalid_ids.includes("near:C99") && report.model_review.invalid_ids.includes("margin:ZZ"), "ids that do not exist are dropped and counted");
  assert.match(report.model_review.note, /cannot check what a model went through/);
  // independence: changing one of the three leaves the other two exactly as they were
  const other = M.buildCoverageReport({ region, lines, window: win, focus: "axis_neighborhood", findings: [], review: { near_lines: [], margin_lines: [] }, cap: 60 });
  assert.deepEqual(other.shown_to_model, report.shown_to_model, "what was shown does not depend on the proposals or on what the model says");
  assert.deepEqual(M.buildCoverageReport({ region, lines, window: win, focus: "axis_neighborhood", findings: found, review: undefined, cap: 25 }).proposal_footprint, report.proposal_footprint, "the verified footprint does not depend on the model's statement");
  assert.deepEqual(M.buildCoverageReport({ region, lines, window: win, focus: "axis_neighborhood", findings: [mkF("z", 0, "NOT_VERIFIED")], review, cap: 25 }).model_review, report.model_review, "the model's statement is not raised or lowered by the proposals");
  assert.equal(other.proposals.count, 0);
  assert.equal(other.model_review.margin.state, "NONE_REPORTED");
  // the margin check is its own state, whatever was found near the axis
  const marginAll = [...zl.margin];
  const crowdedNear = Array.from({ length: 25 }, (_, i) => mkF(`n${i}`, 1, "ENGINE_VERIFIED", { occurrence: { reading: `${nearLine}+`, cells: nearCells } }));
  const checkedAll = M.buildCoverageReport({ region, lines, window: win, focus: "axis_neighborhood", findings: crowdedNear, review: { near_lines: [...zl.near], margin_lines: marginAll }, cap: 25 });
  assert.deepEqual([checkedAll.model_review.margin.state, checkedAll.model_review.margin.reported, checkedAll.proposal_footprint.margin.lines_with_proposals], ["ALL_REPORTED", zl.margin.size, 0], "a full margin check with nothing proposed at the margin is a fine result");
  const skipped = M.buildCoverageReport({ region, lines, window: win, focus: "axis_neighborhood", findings: crowdedNear, review: { near_lines: [...zl.near], margin_lines: [] }, cap: 25 });
  assert.equal(skipped.model_review.margin.state, "NONE_REPORTED", "many words near the axis and no margin check reported: said so");
  assert.equal(skipped.model_review.margin.lines_not_reported.length, Math.min(40, zl.margin.size));
  assert.equal(M.buildCoverageReport({ region, lines, window: win, focus: "axis_neighborhood", findings: [], review: { near_lines: [], margin_lines: marginAll.slice(0, 1) } }).model_review.margin.state, "PARTIAL_REPORTED");
  assert.equal(M.buildCoverageReport({ region, lines, window: win, focus: "axis_neighborhood", findings: [], review: undefined }).model_review.status, "NOT_REPORTED");
  assert.equal(M.buildCoverageReport({ region, lines, window: win, focus: "uniform", findings: [], review: { near_lines: ["C01"] } }).model_review.status, "NOT_REQUESTED");
});

// ---------- the calibrated cost estimate ----------
const billedCost = (inputTokens, outputTokens) => Number((0.5 * (inputTokens * 10 + outputTokens * 50) / 1e6).toFixed(6));

test("estimate: the live run (33x41, cap 25: $1.3158, 48,322 output tokens) sits inside the range; the earlier cap-only interpolation ($0.42-0.51) did not", () => {
  const live = M.estimateCost({ model: "claude-fable-5-1", inputTokens: 20_917, maxTokens: 64_000, cap: 25, cells: 1353 });
  assert.equal(live.evidence_class.class, "large");
  assert.ok(live.expected_usd.low <= 1.315755 && 1.315755 <= live.expected_usd.high, JSON.stringify(live.expected_usd));
  assert.ok(live.expected_usd.low > 0.6 && live.expected_usd.high < 1.7, "a real range, not the old $0.42-0.51");
  assert.ok(live.expected_usd.low <= live.expected_usd.typical && live.expected_usd.typical <= live.expected_usd.high && live.expected_usd.high <= live.upper_bound_usd);
  assert.equal(live.upper_bound_usd, 1.7307, "the ceiling is unchanged");
  assert.deepEqual([live.evidence_class.n_completed, live.evidence_class.n_ended_at_max_tokens, live.evidence_class.truncated_share], [12, 6, 0.33]);
  assert.equal(live.expected_ils.status, "ESTIMATED");
});

test("estimate: every completed reading measured so far lies inside the range of its own window class, and no measured cost exceeds the ceiling", () => {
  const large = M.OUTPUT_EVIDENCE.large.completed_output_tokens;
  const e = M.estimateCost({ model: "claude-fable-5-1", inputTokens: 20_700, maxTokens: 64_000, cap: 60, cells: 1353 });
  for (const out of large) {
    const usd = billedCost(20_700 * 1.03, out);
    assert.ok(usd >= e.expected_usd.low - 0.002 && usd <= e.expected_usd.high + 0.002, `${out} tokens -> ${usd}`);
    assert.ok(usd <= e.upper_bound_usd);
  }
  for (const truncated of [1.7058, 1.705665, 1.706725, 1.706525, 1.70674, 1.7063]) assert.ok(truncated <= e.upper_bound_usd, "the cost of a reading cut at the allowance stays under the ceiling");
  const small = M.estimateCost({ model: "claude-fable-5-1", inputTokens: 16_858 / 1.03, maxTokens: 64_000, cap: 25, cells: 943 });
  assert.equal(small.evidence_class.class, "small_cap25");
  for (const usd of [0.39984, 0.492825]) assert.ok(usd >= small.expected_usd.low - 0.001 && usd <= small.expected_usd.high + 0.001, String(usd));
});

test("estimate: where nothing was measured the range is wide and says so (small window above cap 25, sizes in between, unknown size)", () => {
  const above = M.estimateCost({ model: "claude-fable-5-1", inputTokens: 16_300, maxTokens: 64_000, cap: 60, cells: 943 });
  assert.equal(above.evidence_class.class, "small_cap_above_25");
  assert.equal(above.expected_usd.typical, null);
  assert.ok(above.expected_usd.high >= 1.6, "the one measured reading at cap 60 ended at the allowance");
  const between = M.estimateCost({ model: "claude-fable-5-1", inputTokens: 18_000, maxTokens: 64_000, cap: 25, cells: 1100 });
  assert.equal(between.evidence_class.class, "between");
  assert.equal(between.expected_usd.typical, null);
  const unknown = M.estimateCost({ model: "claude-fable-5-1", inputTokens: 18_000, maxTokens: 64_000, cap: 25 });
  assert.equal(unknown.evidence_class.class, "between", "an unknown size never gets the narrow range");
  assert.match(unknown.basis, /cap does not bound the cost at large windows/);
});
