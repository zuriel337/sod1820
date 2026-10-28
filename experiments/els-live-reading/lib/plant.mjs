// EXP-16 planted-recall windows: a real Torah window in which the harness replaces the letters of a few straight runs with known Hebrew words and phrases, so that
// what the model should find is known without any target from the Columbia case. The words are registered below before any model call. Planting is deterministic (seeded),
// the planted cells never overlap, and the untouched letters are kept next to the planted ones so the loader can compare them with the page.
// A planted window is synthetic: it is NOT verified against the canonical engine (its letters are not in the stream); the harness verifies it against its own letters.
import { createHash } from "node:crypto";
import { buildLines, foldFinals, readings } from "./region.mjs";
import { WINDOW_COLS, WINDOW_ROWS, mulberry32, seedOf } from "./windows.mjs";

export const PLANT_SEED_LABEL = "EXP16-planting-v1";
const md5 = (text) => createHash("md5").update(text, "utf8").digest("hex");
/** Chebyshev distance of a cell from the middle of the window; near <= 6, mid 7-12, far >= 13. */
export const CENTER = Object.freeze({ i: 17, j: 21 });
export const distanceClass = (cell) => { const d = Math.max(Math.abs(cell[0] - CENTER.i), Math.abs(cell[1] - CENTER.j)); return d <= 6 ? "near" : d <= 12 ? "mid" : "far"; };

/** Registered words. `kind` is the line type, `reversed` means the word is read in the '-' direction of its line, `distance` the required distance class of its middle cell. */
export const PLANTED_WORDS = Object.freeze({
  p1: { base: "w07", words: [
    { text: "ביתספר", kind: "R", reversed: false, distance: "near", type: "phrase" },
    { text: "ירושלים", kind: "D", reversed: true, distance: "mid", type: "name" },
    { text: "שמחהגדולה", kind: "C", reversed: false, distance: "mid", type: "phrase" },
    { text: "טלפון", kind: "C", reversed: false, distance: "far", type: "word" },
    { text: "כוכבים", kind: "A", reversed: false, distance: "far", type: "word" },
    { text: "מחשבה", kind: "R", reversed: true, distance: "far", type: "word" },
  ] },
  p2: { base: "w08", words: [
    { text: "דרךהחיים", kind: "R", reversed: false, distance: "near", type: "phrase" },
    { text: "מלכותשמים", kind: "D", reversed: true, distance: "mid", type: "phrase" },
    { text: "אורחדש", kind: "C", reversed: false, distance: "mid", type: "phrase" },
    { text: "ספרתורה", kind: "C", reversed: false, distance: "far", type: "phrase" },
    { text: "זכרונות", kind: "A", reversed: false, distance: "far", type: "word" },
    { text: "נהרגדול", kind: "R", reversed: true, distance: "far", type: "phrase" },
  ] },
});

const allIndexes = (haystack, needle) => { const out = []; for (let at = haystack.indexOf(needle); at >= 0; at = haystack.indexOf(needle, at + 1)) out.push(at); return out; };

/**
 * `baseRows`: 33 arrays of 41 letters (the real window). Returns the planted rows and the ground truth. The truth of each word is the reading (e.g. "D12-") and the index
 * range in that reading where the word is spelled forward, so it can be compared with what the model cites.
 */
export function plantWindow(baseRows, spec, windowId) {
  const rows = baseRows.map((row) => [...row]);
  const region = { nRows: WINDOW_ROWS, nCols: WINDOW_COLS, letterAt: (i, j) => rows[i - 1][j - 1] };
  const lines = buildLines(region);
  const next = mulberry32(seedOf(`${PLANT_SEED_LABEL}:${windowId}`));
  const used = new Set();
  const planted = [];
  for (const word of spec.words) {
    const folded = foldFinals(word.text);
    const candidates = lines.filter((line) => line.kind === word.kind && line.cells.length >= folded.length);
    let placed = null;
    for (let attempt = 0; attempt < 5000 && !placed; attempt += 1) {
      const line = candidates[Math.floor(next() * candidates.length)];
      const offset = Math.floor(next() * (line.cells.length - folded.length + 1));
      const cells = line.cells.slice(offset, offset + folded.length);
      if (cells.some(([i, j]) => used.has(`${i},${j}`))) continue;
      if (distanceClass(cells[Math.floor(cells.length / 2)]) !== word.distance) continue;
      placed = { line, offset, cells };
    }
    if (!placed) throw new Error(`could not plant ${word.text} (${word.kind}, ${word.distance})`);
    const forwardLetters = word.reversed ? [...folded].reverse() : [...folded];
    placed.cells.forEach(([i, j], k) => { rows[i - 1][j - 1] = forwardLetters[k]; used.add(`${i},${j}`); });
    const reading = `${placed.line.id}${word.reversed ? "-" : "+"}`;
    const from = word.reversed ? placed.line.cells.length - placed.offset - folded.length : placed.offset;
    const cellsInReading = word.reversed ? placed.cells.slice().reverse() : placed.cells;
    planted.push({ text: word.text, folded, kind: word.kind, reversed: word.reversed, distance: word.distance, type: word.type, reading, from, to: from + folded.length - 1, cells: cellsInReading });
  }
  // the ground truth is checked on the finished window: every word must be spelled where it is said to be
  const finished = buildLines({ nRows: WINDOW_ROWS, nCols: WINDOW_COLS, letterAt: (i, j) => rows[i - 1][j - 1] });
  const byReading = readings(finished);
  for (const item of planted) {
    const reading = byReading.get(item.reading);
    if (!reading || reading.letters.slice(item.from, item.to + 1) !== item.folded) throw new Error(`planting check failed for ${item.text}`);
    item.occurrences_in_window = [...byReading.values()].reduce((sum, r) => sum + allIndexes(r.letters, item.folded).length, 0);
  }
  return { rows, planted };
}

/** The data file of a planted window: same shape as a control window plus the untouched grid and the ground truth. */
export function plantedFile(windowFile, id) {
  const spec = PLANTED_WORDS[id];
  const baseRows = windowFile.grid.map((row) => [...row.s]);
  const { rows, planted } = plantWindow(baseRows, spec, windowFile.id);
  const grid = windowFile.grid.map((row, k) => { const s = rows[k].join(""); return { r: row.r, s, md5: md5(s) }; });
  return { ...windowFile, base_md5_window: windowFile.md5_window, md5_window: md5(grid.map((row) => row.s).join("")), source: `${windowFile.source} EXP-16 planted window ${id}: words replaced by the harness (synthetic; not in the stream).`, id, synthetic: true, base_window: spec.base, base_grid: windowFile.grid, grid, planted };
}
