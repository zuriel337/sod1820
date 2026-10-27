// EXP-14: hidden findings with known ground truth. Real lexicon words are written into a control window along straight lines (never into an axis cell, never overlapping each other)
// and the signals are asked to bring them up without being told where they are. These are overwritten letters, not engine occurrences.
import { LINES } from "./ranking.mjs";

export const PLANT_CLASSES = Object.freeze(["cross", "adjacent", "parallel", "distant"]);
export const PLANT_GEOMETRY = Object.freeze({ parallelColumnOffset: 4, parallelRowOffset: 10, distantColumnOffset: -14 });
const LINE = Object.fromEntries(LINES.map((line) => [line.name, line]));
const cellKey = (row, col) => row * 1_000_000 + col;
const cellsOf = (line, start, length) => Array.from({ length }, (_, j) => [start[0] + line.dr * j, start[1] + line.dc * j]);

/** Words usable for planting: folded Hebrew keys of the lexicon, lengths in [min, max], sorted, minus any excluded string. */
export function plantingWords(words, { min = 6, max = 8, exclude = [] } = {}) {
  const banned = new Set(exclude);
  return [...words].filter((word) => /^[א-ת]+$/.test(word) && !/[ךםןףץ]/.test(word) && word.length >= min && word.length <= max && !banned.has(word)).sort();
}

/**
 * Placements for one window, or null if they do not fit. `axisCells` are the axis cells top to bottom, `axisLetters` their letters, `inside(row, col)` says whether a cell lies in the box,
 * `index(k)` gives the first word index for class k (the next words are tried in order when a placement does not fit).
 * cross: a down-right line through one axis cell whose letter equals the word's letter at that position (the crossing cell is the only axis cell used).
 * adjacent: a down-right line ending next to the last axis cell, never crossing. parallel: vertical, 4 columns right of the axis, starting 10 rows below its first row.
 * distant: vertical, 14 columns left of the axis (the language-only control).
 */
export function planWindow({ axisCells, axisLetters, words, index, inside, geometry = PLANT_GEOMETRY }) {
  const [firstRow, column] = axisCells[0];
  const lastRow = axisCells[axisCells.length - 1][0];
  const used = new Set(axisCells.map(([r, c]) => cellKey(r, c)));
  const placements = [];
  const pick = (cls, fits) => {
    const k = PLANT_CLASSES.indexOf(cls);
    for (let step = 0; step < 60; step += 1) {
      const word = words[(index(k) + step) % words.length];
      const placement = fits(word);
      if (placement) return { class: cls, word, ...placement };
    }
    return null;
  };
  const keep = (placement) => { for (const [r, c] of placement.cells) used.add(cellKey(r, c)); placements.push(placement); return true; };
  const freeLine = (lineName, startOf) => (word) => {
    const cells = cellsOf(LINE[lineName], startOf(word.length), word.length);
    return cells.every(([r, c]) => inside(r, c) && !used.has(cellKey(r, c))) ? { cells, line: lineName } : null;
  };
  const cross = pick("cross", (word) => {
    for (let k = 0; k < axisCells.length; k += 1) {
      for (let j = 0; j < word.length; j += 1) {
        if (word[j] !== axisLetters[k]) continue;
        const cells = cellsOf(LINE.down_right, [axisCells[k][0] - j, axisCells[k][1] - j], word.length);
        const others = cells.filter((_, at) => at !== j);
        if (cells.every(([r, c]) => inside(r, c)) && others.every(([r, c]) => !used.has(cellKey(r, c)))) return { cells, line: "down_right" };
      }
    }
    return null;
  });
  if (!cross) return null;
  keep(cross);
  const adjacent = pick("adjacent", freeLine("down_right", (length) => [lastRow - (length - 1), column - 1 - (length - 1)]));
  const parallel = pick("parallel", freeLine("down", () => [firstRow + geometry.parallelRowOffset, column + geometry.parallelColumnOffset]));
  const distant = pick("distant", freeLine("down", () => [firstRow, column + geometry.distantColumnOffset]));
  if (!adjacent || !parallel || !distant) return null;
  keep(adjacent); keep(parallel); keep(distant);
  const all = placements.flatMap((p) => p.cells.map(([r, c]) => cellKey(r, c)));
  return new Set(all).size === all.length ? placements : null; // the four words never share a cell
}

/** letterAt with some cells overwritten: overrides maps cellKey to a letter. */
export function withOverrides(letterAt, overrides) {
  return (row, col) => overrides.get(cellKey(row, col)) ?? letterAt(row, col);
}

export function overridesOf(placements) {
  const map = new Map();
  for (const p of placements) p.cells.forEach(([r, c], j) => map.set(cellKey(r, c), p.word[j]));
  return map;
}
