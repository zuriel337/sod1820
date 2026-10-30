import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import * as M from "../supabase/functions/_shared/elsMatrixReading.js";
import { ELS_MATRIX_READING_FOCUS } from "../supabase/functions/_shared/elsMatrixReadingAction.js";
import { call, message, req, world } from "./helpers/els-matrix-reading-world.mjs";

// REGRESSION on the saved cipher "יום משיח בא 583" (see fixtures/els-matrix-reading/regression-saved-cipher/README.md).
//   - its six words are an EVALUATION TARGET: they are never written into an instruction, a schema, a default or any production file;
//   - nothing here is a blind discovery: the cipher is known and the neighbourhood radius was first read off it (in-sample);
//   - a miss measures the reading, it does not fail the engine.
const dir = new URL("./fixtures/els-matrix-reading/regression-saved-cipher/", import.meta.url);
const load = (name) => JSON.parse(readFileSync(new URL(name, dir), "utf8"));
const WINDOW = load("window.json"), SAVED = load("saved-cipher.json"), BASE = load("live-run-uniform-proposals.json"), REPLAY = load("engine-replay.json");
const AXIS = { ...WINDOW.axis, corpusId: WINDOW.axis.corpus_id };
const W = WINDOW.width, R0 = WINDOW.r0, C0 = WINDOW.c0;
const axisSpec = { start: AXIS.start, skip: AXIS.skip, dir: AXIS.dir, length: [...AXIS.term].length };
const region = M.makeRegion({ width: W, r0: R0, c0: C0, rows: WINDOW.rows, axis: axisSpec });
const lines = M.buildLines(region);
const byReading = M.readings(lines);

const keyOf = (f) => { const [skip, dir, start] = f.key.split("_").map(Number); return { skip, dir, start }; };
const cellsOf = (term, { skip, dir, start }) => [...term].map((_, k) => { const p = start + k * skip * dir; return [Math.floor(p / W) - R0 + 1, (p % W) - C0 + 1]; });
const sameCells = (a, b) => a.length === b.length && a.every((c, i) => c[0] === b[i][0] && c[1] === b[i][1]);
/** A proposal "hits" a saved finding when it names the same letters on the same cells. Regression scoring only: never a product metric. */
const hitsOfSavedCipher = (proposals) => SAVED.findings.filter((f) => proposals.some((p) => p.text === f.t && sameCells(cellsOf(p.text, p), cellsOf(f.t, keyOf(f))))).map((f) => f.t);

const SIX = SAVED.findings.map((f) => f.t);
const FORMS = [...SIX, "מחכית שפו", "לכפר עליכם", "האר חשך", "מלך", "מחכי", "תשפו", "האר", "חשך", "לכפר", "עליכם"];
/** Whole Hebrew words only: the short parts must not trip on ordinary words that merely contain them (האר inside הארכה). */
const mentions = (text, form) => new RegExp(`(?<![א-ת])${form}(?![א-ת])`).test(text);

// ---------- 1. the six words are not in any general instruction ----------
function walk(root, keep) {
  const out = [];
  for (const name of readdirSync(root)) {
    const full = join(root, name);
    if (statSync(full).isDirectory()) { if (!["node_modules", ".build", "fixtures"].includes(name)) out.push(...walk(full, keep)); } else if (keep(full)) out.push(full);
  }
  return out;
}

test("the contamination scan is not vacuous: it flags a word standing alone and ignores an ordinary word that merely contains a part", () => {
  assert.equal(mentions("הצעה: שופר, ומלכ", "שופר"), true);
  assert.equal(mentions("האר חשך", "האר חשך"), true);
  assert.equal(mentions("אם הארכה או חיתוך", "האר"), false);
  const poisoned = M.buildReadingPrompt({ region, lines, cap: 25, story: `רמז ${SIX[3]}`, focus: ELS_MATRIX_READING_FOCUS.AXIS_NEIGHBORHOOD });
  assert.equal(mentions([poisoned.system, poisoned.prose.intro].join("\n"), SIX[3]), true, "a story carrying a word IS caught (the user's own text is the only way a word can get in)");
});

test("the six words and their parts are in no instruction, schema, default or refusal text the layer can send or show", () => {
  const texts = new Map();
  for (const focus of [ELS_MATRIX_READING_FOCUS.AXIS_NEIGHBORHOOD, ELS_MATRIX_READING_FOCUS.UNIFORM]) {
    for (const story of ["", "סיפור כללי"]) {
      const prompt = M.buildReadingPrompt({ region, lines, cap: 25, story, focus });
      texts.set(`${focus}/${story ? "story" : "plain"} instruction`, [prompt.system, prompt.prose.intro, prompt.prose.spec, prompt.prose.addendum ?? "", prompt.prose.task].join("\n"));
      texts.set(`${focus} request schema`, JSON.stringify(M.buildReadingRequest({ model: M.MODEL_DEFAULT, region, lines, cap: 25, story, focus }).request.output_config));
    }
  }
  texts.set("system", M.SYSTEM);
  texts.set("both schemas", JSON.stringify([M.FINDINGS_SCHEMA_V2, M.FINDINGS_SCHEMA_V3]));
  texts.set("notes", JSON.stringify([M.REPORTING_NOTES, M.COST_EVIDENCE, M.TRUNCATION_EVIDENCE, M.OUTPUT_EVIDENCE]));
  for (const [what, text] of texts) for (const word of FORMS) assert.equal(mentions(text, word), false, `${what} must not contain "${word}"`);
});

test("the reading layer's own source files do not contain the six words, and no production file reads the regression data", () => {
  const root = new URL("../", import.meta.url).pathname;
  const layer = walk(join(root, "supabase/functions"), (f) => /\/(elsMatrixReading[A-Za-z]*\.js)$/.test(f))
    .concat(walk(join(root, "src"), (f) => /\/(elsMatrixReading[A-Za-z]*\.(js|jsx))$/.test(f)));
  assert.ok(layer.length >= 5, `found ${layer.length} layer files`);
  for (const file of layer) {
    const text = readFileSync(file, "utf8");
    for (const word of FORMS) assert.equal(mentions(text, word), false, `${relative(root, file)} contains "${word}"`);
  }
  const production = walk(join(root, "supabase/functions"), (f) => /\.(js|ts|mjs)$/.test(f)).concat(walk(join(root, "src"), (f) => /\.(js|jsx|ts|mjs)$/.test(f)))
    .filter((f) => !/\.test\.(js|mjs|jsx)$/.test(f));
  for (const file of production) assert.equal(/regression-saved-cipher/.test(readFileSync(file, "utf8")), false, `${relative(root, file)} reads the regression data`);
});

// ---------- 2. the regression data is what it says it is ----------
test("fixture integrity: the window is the one the live job sent, every saved word is spelled by its saved position, the engine confirmed the axis and the four ELS findings", async () => {
  assert.equal(await M.sha256Hex(WINDOW.rows.join("\n")), WINDOW.window_sha256);
  assert.equal(WINDOW.window_sha256, "208cbe689b68f941daf995f07ff490d8974a5c13128f1724c8792471c02802fe");
  const at = (p) => WINDOW.rows[Math.floor(p / W) - R0][(p % W) - C0];
  for (const f of SAVED.findings) { const k = keyOf(f); assert.equal([...f.t].map((_, i) => at(k.start + i * k.skip * k.dir)).join(""), f.t, f.t); }
  assert.equal([...AXIS.term].map((_, i) => at(AXIS.start + i * AXIS.skip * AXIS.dir)).join(""), AXIS.term);
  assert.equal(REPLAY.rows.length, 5);
  for (const row of REPLAY.rows) assert.deepEqual([row.result.verification_state, row.result.status, row.result.contract], ["MATCH", "OK", "els_occurrence_replay_v1"], row.term);
  assert.equal(BASE.proposals.length, 25);
  assert.equal(BASE.baseline.saved_cipher_hits, 0);
});

// ---------- 3. regression of the pipeline ----------
const replay = async ({ term, skip, dir, start }) => {
  const row = REPLAY.rows.find((r) => r.term === term && r.skip === skip && r.dir === dir && r.start === start);
  return row ? row.result : { verification_state: "MISMATCH", status: "REPLAY_MISMATCH" };
};
const READING_OF = { "מחכיתשפו": "C17+", "לכפרעליכמ": "R16+", "הארחשכ": "D03+", "שופר": "C13-", "ישלח": "C21-", "מלכ": "R09+" };

test("REGRESSION: the engine locates each saved finding at its saved place in the lines the model is shown, and classifies four as ELS and two as source rows", async () => {
  const raw = SAVED.findings.map((f, i) => ({ id: `s${i}`, line: READING_OF[f.t], text: f.t, parts: [], kind: "word", story_related: false, continue_from: false, from_finding: "", tier: "B", note: "" }));
  const located = raw.map((f) => M.locateFinding(f, { region, byReading }));
  for (const [i, f] of located.entries()) {
    const wanted = keyOf(SAVED.findings[i]);
    assert.equal(f.status, "located_in_cited_line", f.text);
    assert.ok(f.occurrences.some((o) => o.params.start === wanted.start && o.params.skip === wanted.skip && o.params.dir === wanted.dir), `${f.text} at ${JSON.stringify(wanted)}`);
  }
  const rows = await M.verifyOccurrences(M.verificationItems(located), { region, replay });
  const classified = M.classify(located, rows);
  const verdicts = Object.fromEntries(classified.map((f) => [f.text, f.verdict]));
  assert.deepEqual(Object.values(verdicts).filter((v) => v === "verified_by_engine").length, SAVED.expected.engine_verified);
  assert.equal(Object.values(verdicts).filter((v) => v === "verified_plain_text_only").length, SAVED.expected.source_rows);
  assert.equal(verdicts["לכפרעליכמ"], "verified_plain_text_only");
  assert.equal(verdicts["מלכ"], "verified_plain_text_only");
  assert.equal(verdicts["שופר"], "verified_by_engine");
  const findings = M.viewFindings({ classified, raw, region, rows });
  // IN-SAMPLE: all six lie within the radius that was first read off this very cipher, the farthest exactly at it
  const distances = findings.map((f) => f.relation_to_axis.distance);
  assert.equal(Math.max(...distances), SAVED.expected.max_distance);
  assert.equal(distances.filter((d) => d <= M.NEIGHBORHOOD_RADIUS).length, SAVED.expected.within_radius_8);
  const summary = M.summarizeFindings(findings, { focus: "axis_neighborhood" });
  assert.deepEqual([summary.engine_verified, summary.source_rows, summary.zones.near.proposals, summary.zones.far.proposals], [4, 2, 6, 0]);
});

test("REGRESSION BASELINE: the first live run (uniform instruction) hit none of the six; the scoring helper agrees with the recorded result", () => {
  assert.deepEqual(hitsOfSavedCipher(BASE.proposals), []);
  assert.equal(BASE.proposals.length - 0, 25);
  // the helper is not trivially empty: given the saved findings as proposals it hits all six, and a shifted position hits none
  const asProposals = SAVED.findings.map((f) => ({ text: f.t, ...keyOf(f) }));
  assert.deepEqual(hitsOfSavedCipher(asProposals).sort(), [...SIX].sort());
  assert.deepEqual(hitsOfSavedCipher(asProposals.map((p) => ({ ...p, start: p.start + 1 }))), []);
});

test("REGRESSION BASELINE: the live uniform run lay near:far = 11:14 (0.79:1); the position of the proposals is only described, never a target", () => {
  const box = M.neighborhoodBox(region);
  const distance = (p) => Math.min(...cellsOf(p.text, p).map(([i, j]) => Math.min(...region.axisCells.map(([a, b]) => Math.max(Math.abs(i - a), Math.abs(j - b))))));
  const near = BASE.proposals.filter((p) => distance(p) <= M.NEIGHBORHOOD_RADIUS).length;
  assert.deepEqual([near, BASE.proposals.length - near], [BASE.baseline.near_within_8, BASE.baseline.far]);
  assert.ok(box.cells > 0);
});

test("REGRESSION through the whole operation on a SYNTHETIC answer (the pipeline can verify and report these; this is NOT a discovery and says so): source rows, zones described, the three coverage levels apart", async () => {
  const synthetic = {
    findings: SAVED.findings.map((f, i) => ({ id: `F${i + 1}`, line: READING_OF[f.t], text: f.t, parts: [], kind: "word", story_related: false, continue_from: false, from_finding: "", tier: "A", note: "SYNTHETIC_NOT_DISCOVERY" })),
    review: { near_lines: ["C13", "C17", "C21", "D03", "R16", "R09", "C99"], margin_lines: ["C41"] },
    observations: "SYNTHETIC_NOT_DISCOVERY",
  };
  const w = world({ stream: WINDOW.rows, geometry: { width: W, r0: R0, c0: C0 }, replays: new Map(REPLAY.rows.map((r) => [`${r.term}|${r.skip}|${r.dir}|${r.start}`, r.result])),
    result: { type: "succeeded", message: message({ text: JSON.stringify(synthetic) }) } });
  const opts = { axis: AXIS };
  const started = await call(w, req("start", { window: { rows: 33, cols: 41 }, cap: 25, ack_upper_bound_usd: 2 }), opts);
  assert.equal(started.body.state, "RUNNING", JSON.stringify(started.body).slice(0, 300));
  assert.equal(started.body.coverage.rows.from, R0);
  assert.equal(started.body.request.window_sha256, WINDOW.window_sha256, "the same window the live job read");
  w.state.batchState = "ended";
  const token = await M.signJobToken(w.state.jobs[0].job_payload, "job-secret");
  const done = (await call(w, req("status", { job_token: token }), opts)).body;
  assert.equal(done.state, "COMPLETE");
  assert.equal(done.is_test_fixture, true, "a test double: never presented as a reading");
  assert.deepEqual([done.summary.engine_verified, done.summary.source_rows, done.summary.not_verified], [4, 2, 0]);
  assert.deepEqual([done.cap.requested, done.cap.proposals, done.cap.reached, done.summary.proposals], [25, 6, false, 6], "six proposals of a ceiling of 25: nothing is padded to fill the ceiling");
  const z = done.summary.zones;
  assert.deepEqual([z.near.proposals, z.far.proposals, z.near.source_rows, z.near.engine_verified], [6, 0, 2, 4]);
  assert.equal("target" in z, false, "all near and nothing at the margin is described, not judged against a target");
  assert.deepEqual([z.near_to_far, z.margin_share], [null, 0]);
  const cr = done.coverage_report;
  assert.equal(cr.model_review.status, "UNVERIFIED_MODEL_REPORT");
  assert.deepEqual([cr.model_review.near.reported, cr.model_review.margin.reported, cr.model_review.margin.state], [6, 1, "PARTIAL_REPORTED"]);
  assert.deepEqual([cr.proposals.basis, cr.proposals.count, cr.proposals.cap], ["PROPOSAL_COUNT", 6, 25], "the count of proposals is its own number");
  assert.ok(cr.model_review.invalid_ids.includes("near:C99"));
  assert.equal(cr.proposal_footprint.near.lines_with_proposals, 6);
  // the footprint is per CELL: הארחשכ starts two cells outside the box, so its line (D03) and those two cells count at the margin although the proposal itself is near
  assert.deepEqual([cr.proposal_footprint.margin.lines_with_proposals, cr.proposal_footprint.margin.cells_touched], [1, 2]);
  assert.notEqual(cr.proposal_footprint.near.lines_with_proposals, done.summary.proposals - 0 + 1, "coverage numbers are not the proposal count");
  const text = M.razielReadingAnswer(done);
  assert.match(text, /שורות מקור \(טקסט רגיל, לא ELS\): 2 \(2 בסביבה, 0 בשוליים\)/);
  assert.doesNotMatch(text, /יעדי ברירת המחדל|הושג|לא הושג/, "nothing is judged against a target");
  assert.match(text, /דיווח המודל על מה שעבר \(הצהרה שלו, לא נבדקת; 1 מזהים לא תקפים הוסרו\): לאורך הציר \d+\/\d+ קווים, בסביבה 6\/\d+, בשוליים 1\/\d+\./);
  assert.match(text, /בדיקת השוליים בוצעה חלקית לפי הצהרתו/);
  assert.match(text, /כמות ההצעות: 6 מתוך תקרה של 25/);
  assert.equal(hitsOfSavedCipher(done.findings.map((f) => ({ text: f.text, ...f.occurrence }))).length, 6, "the synthetic answer contains them by construction");
  assert.doesNotMatch(text, /גילוי עיוור|נמצאו הצופן|מצא את הצופן/, "nothing in the answer claims a discovery");
});
