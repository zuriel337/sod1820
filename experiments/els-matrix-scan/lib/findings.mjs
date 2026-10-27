// Turns the canonical engine's occurrences (as returned by scanBatchSql) into markable findings. Nothing here searches or computes
// letters: it labels, de-duplicates and (optionally) joins findings that sit end-to-end on the same matrix line.
import { DIRECTIONS, cellOf, directionOf, occurrenceCells } from "./geometry.mjs";

const pad = (n, width = 3) => String(n).padStart(width, "0");
const stepOf = (direction) => ({ dRow: direction.dRow, dCol: direction.dCol });
const key = (cell) => `${cell.row}:${cell.col}`;

/** rows: `target` items of one or more batches {w,len,grp,skip,dir,s,e}; matrixHits: merged `word_matrix_hits` ({"w|grp": n}). */
export function normalizeFindings({ rows, width, region, matrixHits = {} }) {
  const seen = new Map();
  for (const row of rows) {
    const direction = directionOf(row.skip, row.dir, width);
    if (!direction) continue; // not a matrix-contiguous direction: never a finding
    const cells = occurrenceCells(row.s, row.skip, row.dir, row.len, width);
    const geometryKey = `${row.w}@${[key(cells[0]), key(cells[cells.length - 1])].sort().join("~")}`;
    const previous = seen.get(geometryKey);
    if (previous && previous.dir === 1) continue; // a palindrome is reported twice by the engine (both directions): keep the forward one
    seen.set(geometryKey, { ...row, direction, cells });
  }
  const ordered = [...seen.values()].sort((a, b) => b.len - a.len || a.w.localeCompare(b.w, "he") || a.s - b.s || a.dir - b.dir);
  return ordered.map((row, index) => {
    const total = Object.entries(matrixHits).filter(([k]) => k.startsWith(`${row.w}|`)).reduce((sum, [, n]) => sum + Number(n), 0);
    const first = row.cells[0];
    const last = row.cells[row.cells.length - 1];
    return Object.freeze({
      id: `F${pad(index + 1)}`,
      word: row.w,
      length: row.len,
      kind: row.grp === "row" ? "plain_text_row" : "els_in_matrix",
      direction: row.direction.id,
      skip: row.skip,
      dir: row.dir,
      start: row.s,
      end: row.e,
      startCell: Object.freeze({ row: first.row, col: first.col }),
      endCell: Object.freeze({ row: last.row, col: last.col }),
      local: Object.freeze({ fromRow: first.row - region.r0, fromCol: first.col - region.c0, toRow: last.row - region.r0, toCol: last.col - region.c0 }),
      cells: Object.freeze(row.cells.map((cell) => Object.freeze({ row: cell.row - region.r0, col: cell.col - region.c0 }))),
      matrixHits: total,
    });
  });
}

/** Join findings of the same direction that touch end-to-end (the next cell of A is the first cell of B). Reports components by id. */
export function joinAdjacentFindings(findings, { maxParts = 3, width } = {}) {
  const byDirection = new Map();
  for (const finding of findings) {
    if (finding.kind !== "els_in_matrix") continue;
    byDirection.set(finding.direction, [...(byDirection.get(finding.direction) || []), finding]);
  }
  const phrases = [];
  for (const [directionId, list] of byDirection) {
    const direction = DIRECTIONS.find((entry) => entry.id === directionId);
    const step = stepOf(direction);
    const startAt = new Map(list.map((finding) => [key(finding.startCell), finding]));
    const next = (finding) => startAt.get(key({ row: finding.endCell.row + step.dRow, col: finding.endCell.col + step.dCol }));
    const isPart = new Set();
    for (const head of list) {
      const parts = [head];
      let cursor = head;
      while (parts.length < maxParts) {
        const follower = next(cursor);
        if (!follower || parts.includes(follower)) break;
        parts.push(follower);
        cursor = follower;
        phrases.push({ directionId, parts: [...parts] });
        parts.forEach((part) => isPart.add(part.id));
      }
    }
  }
  return phrases
    .sort((a, b) => b.parts.reduce((n, p) => n + p.length, 0) - a.parts.reduce((n, p) => n + p.length, 0) || a.parts[0].id.localeCompare(b.parts[0].id))
    .map((entry, index) => Object.freeze({
      id: `P${pad(index + 1)}`,
      words: Object.freeze(entry.parts.map((part) => part.word)),
      text: entry.parts.map((part) => part.word).join(" "),
      direction: entry.directionId,
      components: Object.freeze(entry.parts.map((part) => part.id)),
      startCell: entry.parts[0].startCell,
      endCell: entry.parts[entry.parts.length - 1].endCell,
    }));
}

/** Marks for drawing on the matrix: local coordinates only, straight from the engine's positions. */
export function markupFor(findings) {
  return findings.map((finding) => ({ id: finding.id, word: finding.word, direction: finding.direction, kind: finding.kind, cells: finding.cells }));
}
