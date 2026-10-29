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

test("the request equals, byte for byte, the requests that were measured in EXP-18 (cap 60 and cap 25)", async () => {
  for (const [cap, file, hashes] of [[60, "request-c2-general-cap60.json", null], [25, "request-c3-general-cap25.json", fx("response-c3.json")]]) {
    const saved = fx(file);
    const { request } = M.buildReadingRequest({ model: M.MODEL_DEFAULT, region, lines, cap });
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
  const e25 = M.estimateCost({ model: "claude-fable-5-1", inputTokens: 16_858, maxTokens: 64_000, cap: 25 });
  const e60 = M.estimateCost({ model: "claude-fable-5-1", inputTokens: 16_858, maxTokens: 64_000, cap: 60 });
  assert.ok(Math.abs(e25.upper_bound_usd - 1.7054) < 0.001, `upper bound ${e25.upper_bound_usd}`);
  assert.ok(e25.expected_usd.low >= 0.3 && e25.expected_usd.high <= 0.6, "cap 25 reads like the measured 0.40-0.49");
  assert.ok(e60.expected_usd.low >= 1.4 && e60.expected_usd.high <= e60.upper_bound_usd, "cap 60 reads like the measured 1.56-1.68");
  assert.equal(e60.evidence.length, 4);
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
