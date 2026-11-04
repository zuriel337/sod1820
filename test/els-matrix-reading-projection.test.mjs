import test from "node:test";
import assert from "node:assert/strict";
import { projectElsReadingFindings, readableElsFinding } from "../src/lib/research/elsMatrixReadingProjection.js";
import { projectSavedElsMatrixReading } from "../src/lib/research/elsMatrixReadingSavedResult.js";

const axis = { term: "אבגדהו", scope: "torah", start: 52, skip: 10, dir: -1, corpusId: "0123456789abcdef" };
function fixture() {
  const hit = { start: 42, skip: 10, dir: -1, length: 3 };
  const finding = { id: "test", text: "בגד", parts: ["בג", "ד"], occurrence: hit,
    verification: { state: "ENGINE_VERIFIED", letters_match: true, occurrences_verified: 1,
      engine: { contract: "els_occurrence_replay_v1", verification_state: "MATCH", corpus_id: axis.corpusId,
        occurrence_id: `els:${axis.corpusId}:בגד:10:-1:42` } } };
  const rows = Array.from({ length: 6 }, () => "א".repeat(10).split(""));
  [...axis.term].forEach((c, i) => { rows[5 - i][2] = c; });
  return { result: { contract: "els_matrix_reading_v1", state: "COMPLETE", is_test_fixture: true,
    axis: { ...axis, corpus_id: axis.corpusId }, findings: [finding] },
    matrix: { S: 10, r0: 0, c0: 0, cw: 10, rows: rows.map(row => row.join("")) } };
}

test("readable Hebrew uses only letter-preserving parts; original stays unchanged", () => {
  const item = { text: "אמרלונא", parts: ["אמר", "לו", "נא"] };
  assert.equal(readableElsFinding(item), "אמר לו נא");
  assert.equal(item.text, "אמרלונא");
  assert.equal(readableElsFinding({ text: "בלבבמ", parts: ["בלב", "שלנו"] }), "בלבבם");
  assert.equal(readableElsFinding({ text: "אירנ", parts: ["איראן"] }), "אירן");
  assert.equal(readableElsFinding({ text: "אבג", parts: ["<b>אבג</b>"] }), "אבג");
});
test("reverse exact receipt projects only its indices and identifies an axis subset", () => {
  const { result, matrix } = fixture(), before = JSON.stringify({ result, matrix });
  const projection = projectElsReadingFindings(result, axis, matrix);
  assert.deepEqual(projection.findings[0].visiblePositions, [42, 32, 22]);
  assert.equal(projection.findings[0].axisPart, true);
  assert.equal(projection.visibleCount, 1);
  assert.equal(JSON.stringify({ result, matrix }), before);
});
test("another occurrence, corpus, incomplete or missing replay cannot paint", () => {
  const { result, matrix } = fixture();
  for (const other of [{ ...axis, start: 53 }, { ...axis, corpusId: "other" }, { ...axis, dir: 1 }])
    assert.equal(projectElsReadingFindings(result, other, matrix).findings.length, 0);
  for (const state of ["RUNNING", "INCOMPLETE", "REFUSED"]) assert.equal(projectElsReadingFindings({ ...result, state }, axis, matrix).findings.length, 0);
  for (const field of ["occurrence_id", "corpus_id", "contract", "verification_state"]) {
    const copy = structuredClone(result); delete copy.findings[0].verification.engine[field];
    assert.equal(projectElsReadingFindings(copy, axis, matrix).findings.length, 0);
  }
});
test("partial, outside and conflicting current letters are explicit, never synthesized", () => {
  const { result, matrix } = fixture();
  const partial = projectElsReadingFindings(result, axis, { ...matrix, rows: matrix.rows.slice(0, 3) });
  assert.deepEqual(partial.findings[0].visiblePositions, [22]); assert.equal(partial.partialCount, 1);
  const outside = projectElsReadingFindings(result, axis, { ...matrix, rows: matrix.rows.slice(0, 1) });
  assert.equal(outside.outsideCount, 1);
  matrix.rows[3] = "א".repeat(10);
  const mismatch = projectElsReadingFindings(result, axis, matrix).findings[0];
  assert.equal(mismatch.visibility, "mismatch"); assert.deepEqual(mismatch.visiblePositions, []);
});
test("exact replay identity, length and dedup are checked", () => {
  const { result, matrix } = fixture();
  result.findings.push(structuredClone(result.findings[0]));
  assert.equal(projectElsReadingFindings(result, axis, matrix).findings.length, 1);
  result.findings.forEach(f => { f.occurrence.start++; });
  assert.equal(projectElsReadingFindings(result, axis, matrix).findings.length, 0);
});
test("saved structured result retains the same exact overlay without a new request", () => {
  const { result, matrix } = fixture();
  const saved = projectSavedElsMatrixReading(result, axis);
  assert.equal(saved.saved_snapshot, true);
  assert.deepEqual(projectElsReadingFindings(saved, axis, matrix), projectElsReadingFindings(result, axis, matrix));
});
