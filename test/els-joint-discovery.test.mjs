// The joint discovery list (ZURIEL 18.11.2026): one row per exact occurrence over the engine's discovery and the Fable reading.
import { test } from "node:test";
import assert from "node:assert/strict";
import { joinElsDiscovery, filterElsJointRows, sortElsJointRows, countElsJointRows, prepareElsReadingAddition, elsAxisDistance, ELS_MATRIX_WORD_LIMIT } from "../src/lib/research/elsJointDiscovery.js";
import { expectedChance } from "../supabase/functions/_shared/elsChanceModel.js";
import { expectedChance as serverChance } from "../supabase/functions/_shared/elsMatrixReading.js";

const S = 583, axis = { term: "יוממשיחבא", skip: 583, dir: -1, start: 239480 };
const positions = (start, skip, dir, n) => Array.from({ length: n }, (_, i) => start + dir * skip * i);
const engineItem = (term, start, skip, dir, extra = {}) => ({ term, label: term, start, skip, dir, hitId: `${skip}_${dir}_${start}`, positions: positions(start, skip, dir, term.length), kind: skip > 1 ? "els" : "source", distance: 3, ...extra });
const C = "x";
const run = items => ({ data: { ok: true, items, origin: { corpusId: C } } });
const fable = (text, start, skip, dir, extra = {}) => ({ key: `els:${C}:${text}:${skip}:${dir}:${start}`, label: extra.label || text, positions: positions(start, skip, dir, text.length), visibility: extra.visibility || "full", axisPart: !!extra.axisPart,
  item: { text, occurrence: { start, skip, dir, length: text.length }, chance: extra.E === undefined ? undefined : { expected_occurrences: extra.E } } });

test("one row per exact occurrence; what both found shows once with both sources", () => {
  const shared = engineItem("ואעמד", 232000, 582, 1);
  const rows = joinElsDiscovery({ runs: [run([shared, engineItem("ימיני", 232100, 582, 1)])], projection: { findings: [fable("ואעמד", 232000, 582, 1, { E: 0.377 }), fable("דובדובר", 231000, 584, 1, { E: 0.00055 })] }, axis, width: S });
  assert.equal(rows.length, 3);
  const both = rows.find(r => r.term === "ואעמד");
  assert.equal(both.source, "both"); assert.ok(both.engine && both.fable); assert.equal(both.verified, true); assert.equal(both.E, 0.377);
  assert.equal(rows.find(r => r.term === "ימיני").source, "engine");
  assert.equal(rows.find(r => r.term === "ימיני").verified, false, "a discovery candidate is verified by the engine only when added");
  assert.deepEqual(countElsJointRows(rows), { all: 3, engine: 2, fable: 2, both: 1 });
});

test("the axis and its pieces are not findings; a different start or direction is another row", () => {
  const axisPiece = engineItem("משיח", axis.start - 3 * 583, 583, -1);
  const rows = joinElsDiscovery({ runs: [run([axisPiece, engineItem("אבאאלי", 230000, 583, -1), engineItem("אבאאלי", 230001, 583, -1)])],
    projection: { findings: [fable("יוממשיחבא", axis.start, 583, -1, { axisPart: true })] }, axis, width: S });
  assert.deepEqual(rows.map(r => r.start).sort(), [230000, 230001]);
});

test("E: the reading's own value, else the shared chance model (Torah, ELS only); the same formula as the server", () => {
  assert.equal(expectedChance, serverChance, "one chance model: the server module re-exports it");
  const rows = joinElsDiscovery({ runs: [run([engineItem("המורה", 230500, 582, 1), engineItem("ונסכיהמ", 230600, 1, 1)])], axis, width: S });
  assert.equal(rows.find(r => r.term === "המורה").E, expectedChance("המורה", 582));
  assert.equal(rows.find(r => r.term === "ונסכיהמ").E, null, "plain text (skip 1) has no ELS chance");
  const tanakh = joinElsDiscovery({ runs: [run([engineItem("המורה", 230500, 582, 1)])], axis, width: S, scope: "tanakh" });
  assert.equal(tanakh[0].E, null, "the model is the Torah's");
});

test("filters and sorting: ELS by default, rare = E<1, all includes plain text; axis, rarity, length", () => {
  const rows = joinElsDiscovery({ runs: [run([engineItem("ונסכיהמ", 239480 - 583 * 2 + 1, 1, 1), engineItem("אילות", 239480 + 20, 584, 1)])],
    projection: { findings: [fable("נהייהיובלו", 200000, 582, 1, { E: 0.0000099 }), fable("שמו", 239480 - 583 + 2, 584, 1, { E: 256 })] }, axis, width: S });
  assert.deepEqual(filterElsJointRows(rows).map(r => r.term).sort(), ["אילות", "נהייהיובלו", "שמו"].sort());
  assert.deepEqual(filterElsJointRows(rows, { kind: "rare" }).map(r => r.term), ["נהייהיובלו"]);
  assert.deepEqual(filterElsJointRows(rows, { kind: "source" }).map(r => r.term), ["ונסכיהמ"]);
  assert.equal(filterElsJointRows(rows, { kind: "all" }).length, 4);
  assert.deepEqual(filterElsJointRows(rows, { source: "fable" }).map(r => r.term).sort(), ["נהייהיובלו", "שמו"].sort());
  assert.equal(sortElsJointRows(rows, "rare")[0].term, "נהייהיובלו");
  assert.equal(sortElsJointRows(rows, "length")[0].term, "נהייהיובלו");
  const byAxis = sortElsJointRows(filterElsJointRows(rows), "axis");
  assert.ok(byAxis[0].distance <= byAxis[1].distance && byAxis[1].distance <= byAxis[2].distance);
});

test("distance is measured in the matrix the same way for both sources", () => {
  assert.equal(elsAxisDistance([239480], positions(axis.start, 583, -1, 9), S), 0);
  assert.equal(elsAxisDistance([239481], positions(axis.start, 583, -1, 9), S), 1);
  assert.equal(elsAxisDistance([], [1], S), null);
});

test("a Fable occurrence joins the matrix words through the same findings update, within the 24-word limit", () => {
  const state = { axis: { hitId: "583_-1_239480" }, verification: { state: "MATCH" }, findings: [{ t: "תורה", color: "#111111" }] };
  const finding = fable("דובדובר", 231000, 584, 1, { E: 0.00055 });
  const added = prepareElsReadingAddition(state, finding, () => "#222222");
  assert.deepEqual(added.findings, [{ t: "תורה", color: "#111111" }, { t: "דובדובר", color: "#222222", addShown: ["584_1_231000"] }]);
  assert.equal(prepareElsReadingAddition(state, { ...finding, visibility: "partial" }, "#2").error, "outside", "only an occurrence fully in the view");
  assert.equal(prepareElsReadingAddition({ ...state, verification: { state: "CANDIDATE" } }, finding, "#2").error, "stale");
  const full = { ...state, findings: Array.from({ length: ELS_MATRIX_WORD_LIMIT }, (_, i) => ({ t: `מילה${"א".repeat(i)}`, color: "#000000" })) };
  assert.equal(prepareElsReadingAddition(full, finding, "#2").error, "limit");
});
