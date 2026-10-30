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
const withoutSection = (text) => text.replace(/## סביבת הציר[^\n]*\n[\s\S]*?\n\n(?=## הגריד)/, "");

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

test("the default prompt asks for 2-3x the depth near the axis, keeps the rest of the measured text, and never makes it a filter", () => {
  const dflt = M.buildReadingPrompt({ region, lines, cap: 25 });
  const uniform = M.buildReadingPrompt({ region, lines, cap: 25, focus: "uniform" });
  assert.equal(dflt.focus, "axis_neighborhood");
  assert.equal(uniform.neighborhood, null);
  assert.match(dflt.user, /## סביבת הציר — ברירת המחדל לעומק החיפוש/);
  assert.match(dflt.user, new RegExp(`עד ${near.radius} תאים`));
  assert.match(dflt.user, new RegExp(`R${String(near.rows.from).padStart(2, "0")}–R${String(near.rows.to).padStart(2, "0")} ועמודות C${String(near.cols.from).padStart(2, "0")}–C${String(near.cols.to).padStart(2, "0")}`));
  assert.match(dflt.user, /פי שניים עד שלושה יותר מאשר ברחוק/);
  assert.match(dflt.user, /לפחות שני שלישים מההצעות שלך, ועדיף שלושה רבעים/);
  assert.match(dflt.user, /התרחק; אל תמציא ואל תכפה קריאה/);
  assert.match(dflt.user, /זו הנחיית עומק ולא סינון: כל הצעה, קרובה או רחוקה, תקפה ונבדקת/);
  assert.doesNotMatch(uniform.user, /סביבת הציר/);
  // the two sentences of the measured task that said the opposite are replaced, nothing else changes
  assert.match(uniform.user, /אל תדרג לפי קרבה לאמצע הקטע/);
  assert.doesNotMatch(dflt.user, /אל תדרג לפי קרבה לאמצע הקטע|שנמצאות באמצע הקטע/);
  const restored = withoutSection(dflt.user)
    .replace("ואל למילים שכיחות. הצע גם", "ואל למילים שכיחות או למילים שנמצאות באמצע הקטע. הצע גם")
    .replace("tier אינו מבטא קרבה לציר: כל רמה יכולה להכיל שורות, טורים ואלכסונים, קרובים ורחוקים.", "אל תדרג לפי קרבה לאמצע הקטע או לפי סוג הקו: כל רמה יכולה להכיל שורות, טורים ואלכסונים מכל מקום בקטע.")
    .replace(", ובמיוחד על קווים בסביבה הקרובה שלא עברת עליהם.", ".");
  assert.equal(restored, uniform.user, "the default is the measured text plus one section and two replaced sentences");
  const stories = M.buildReadingPrompt({ region, lines, cap: 25, story: "סיפור" });
  assert.match(stories.user, /^## הרקע\n„סיפור”/);
  assert.match(stories.user, /סביבת הציר/);
});

test("the labels say what was asked: uniform is the measured instruction, the default is unmeasured, a story adds its own flag", () => {
  assert.equal(M.instructionLabel({ focus: "uniform" }), "general_v2_axis_marked_unnamed");
  assert.equal(M.instructionLabel({ focus: "uniform", story: "x" }), "general_v2_axis_marked_unnamed+user_story_unmeasured");
  assert.equal(M.instructionLabel({}), "general_v2_axis_neighborhood_2to3x_unmeasured");
  assert.equal(M.instructionLabel({ story: "x" }), "general_v2_axis_neighborhood_2to3x_unmeasured+user_story_unmeasured");
  const dflt = M.buildReadingRequest({ model: M.MODEL_DEFAULT, region, lines, cap: 25 }).request;
  const uni = M.buildReadingRequest({ model: M.MODEL_DEFAULT, region, lines, cap: 25, focus: "uniform" }).request;
  assert.notEqual(JSON.stringify(dflt), JSON.stringify(uni));
  assert.deepEqual({ ...dflt, messages: null }, { ...uni, messages: null }, "same model, system, thinking, effort, schema and allowance");
});

test("the zones measure where the proposals lie (distance as relation_to_axis), the ratio, and whether the asked ratio was reached; never a filter", () => {
  const mk = (id, distance, state = "ENGINE_VERIFIED") => ({ id, text: "אבג", verification: { state }, relation_to_axis: state === "NOT_VERIFIED" ? null : { distance, relation: distance === 0 ? "crosses" : distance === 1 ? "touches" : "far" }, chance: null });
  const set = [mk("a", 0), mk("b", 3), mk("c", 8), mk("d", 9), mk("e", 20), mk("f", 5, "PLAIN_TEXT_ONLY"), mk("g", 99, "NOT_VERIFIED")];
  const z = M.summarizeFindings(set, { focus: "axis_neighborhood" }).zones;
  assert.deepEqual([z.radius, z.near.proposals, z.far.proposals, z.near_to_far], [8, 4, 2, 2]);
  assert.deepEqual([z.near.engine_verified, z.near.plain_text_only, z.far.engine_verified], [3, 1, 2]);
  assert.deepEqual(z.target, { applies: true, ratio: 2, met: true });
  const miss = M.summarizeFindings([mk("a", 0), mk("b", 30), mk("c", 40)], { focus: "axis_neighborhood" }).zones;
  assert.deepEqual([miss.near_to_far, miss.target.met], [0.5, false]);
  const onlyNear = M.summarizeFindings([mk("a", 1)], { focus: "axis_neighborhood" }).zones;
  assert.deepEqual([onlyNear.near_to_far, onlyNear.target.met], [null, true]);
  const none = M.summarizeFindings([], { focus: "axis_neighborhood" }).zones;
  assert.equal(none.target.met, false, "no proposal near the axis is not meeting a target of depth near the axis");
  const uniformRun = M.summarizeFindings(set, { focus: "uniform" }).zones;
  assert.deepEqual([uniformRun.target.applies, uniformRun.target.met, uniformRun.near.proposals], [false, null, 4], "measured, but no target applies to the uniform instruction");
  assert.equal(M.summarizeFindings(set).zones.target.applies, false);
  assert.equal(M.describeCoverage({ region, lines, window: M.selectWindow({ axis: AXIS, rows: 23, cols: 41 }), focus: "axis_neighborhood" }).neighborhood.target_ratio, 2);
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
