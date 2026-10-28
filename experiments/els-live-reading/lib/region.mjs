// The bounded region of the matrix that a model is shown, and the lines through it. The letters come from the canonical stream (public.torah_stream, fetched
// with the canonical SQL and checksummed per row); this module only arranges them. Nothing here knows a word, a cipher or a target: positions and skips are
// derived by the harness, never by the model.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const FOLD = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };
export const foldFinals = (text) => text.replace(/[ךםןףץ]/g, (c) => FOLD[c]);
const md5 = (text) => createHash("md5").update(text, "utf8").digest("hex");
const pad = (n, width = 2) => String(n).padStart(width, "0");

/** The four line types. `step(W)` is the change of stream position per cell in the forward ('+') reading. */
export const KINDS = Object.freeze({
  R: { name: "row", label: "שורה", dr: 0, dc: 1, step: () => 1 },
  C: { name: "column", label: "טור", dr: 1, dc: 0, step: (W) => W },
  D: { name: "down-right", label: "אלכסון ↘", dr: 1, dc: 1, step: (W) => W + 1 },
  A: { name: "down-left", label: "אלכסון ↙", dr: 1, dc: -1, step: (W) => W - 1 },
});
export const MIN_LINE_LENGTH = 3;

/** Loads the region file and re-checks the checksum and length of every row. Coordinates are 1-based inside the region: row i, column j. */
export function loadRegion(path) {
  const data = JSON.parse(readFileSync(path, "utf8"));
  const [r0, r1] = data.rows;
  const [c0, c1] = data.cols;
  const nRows = r1 - r0 + 1;
  const nCols = c1 - c0 + 1;
  if (data.grid.length !== nRows) throw new Error(`region: ${data.grid.length} rows, expected ${nRows}`);
  data.grid.forEach((row, index) => {
    if (row.r !== r0 + index) throw new Error(`region: row ${row.r} is out of order`);
    if ([...row.s].length !== nCols) throw new Error(`region: row ${row.r} has ${[...row.s].length} letters, expected ${nCols}`);
    if (md5(row.s) !== row.md5) throw new Error(`region: checksum mismatch in row ${row.r}`);
    if (/[ךםןףץ]/.test(row.s)) throw new Error(`region: row ${row.r} holds final letters (the stream is folded)`);
  });
  const rows = data.grid.map((row) => [...row.s]);
  const region = { ...data, r0, r1, c0, c1, nRows, nCols, W: data.width, rows };
  region.letterAt = (i, j) => (i >= 1 && i <= nRows && j >= 1 && j <= nCols ? rows[i - 1][j - 1] : undefined);
  region.position = (i, j) => (r0 + i - 1) * region.W + (c0 + j - 1); // 0-based position in the stream
  region.axisCells = Array.from({ length: data.axis.length }, (_, k) => data.axis.start + k * data.axis.skip * data.axis.dir).map((p) => [Math.floor(p / region.W) - r0 + 1, (p % region.W) - c0 + 1]);
  return region;
}

/** Independent check against the letters embedded in the page (a second copy of the same text). Returns the number of cells compared and the mismatches. */
export function crossCheckAgainstPage(region, htmlPath) {
  const html = readFileSync(htmlPath, "utf8");
  const data = /<script id="torah-data" type="text\/plain">([\s\S]*?)<\/script>/.exec(html);
  if (!data) throw new Error("embedded letters not found in the page");
  const letters = gunzipSync(Buffer.from(data[1].trim(), "base64")).toString("utf8");
  const mismatches = [];
  let checked = 0;
  for (let i = 1; i <= region.nRows; i += 1) for (let j = 1; j <= region.nCols; j += 1) { checked += 1; if (letters[region.position(i, j)] !== region.letterAt(i, j)) mismatches.push([i, j]); }
  return { checked, mismatches, pageLetters: letters.length };
}

const cellName = (i, j) => `R${pad(i)}C${pad(j)}`;
export { cellName };

/** Every line of the region with at least MIN_LINE_LENGTH cells. `cells` are in the forward ('+') order of the line. */
export function buildLines(region) {
  const lines = [];
  const walk = (kind, startI, startJ) => {
    const { dr, dc } = KINDS[kind];
    const cells = [];
    for (let i = startI, j = startJ; i >= 1 && i <= region.nRows && j >= 1 && j <= region.nCols; i += dr, j += dc) cells.push([i, j]);
    return cells;
  };
  const add = (kind, ordinal, cells) => {
    if (cells.length < MIN_LINE_LENGTH) { omitted.push({ kind, ordinal, length: cells.length }); return; }
    lines.push({ id: `${kind}${pad(ordinal)}`, kind, cells, letters: cells.map(([i, j]) => region.letterAt(i, j)).join("") });
  };
  const omitted = [];
  for (let i = 1; i <= region.nRows; i += 1) add("R", i, walk("R", i, 1));
  for (let j = 1; j <= region.nCols; j += 1) add("C", j, walk("C", 1, j));
  let d = 0;
  for (let j = 1; j <= region.nCols; j += 1) add("D", (d += 1), walk("D", 1, j));
  for (let i = 2; i <= region.nRows; i += 1) add("D", (d += 1), walk("D", i, 1));
  let a = 0;
  for (let j = region.nCols; j >= 1; j -= 1) add("A", (a += 1), walk("A", 1, j));
  for (let i = 2; i <= region.nRows; i += 1) add("A", (a += 1), walk("A", i, region.nCols));
  lines.omitted = omitted;
  return lines;
}

/** A line read in one direction: id like "D17+" or "D17-", the letters and the cells in reading order. */
export function readings(lines) {
  const out = new Map();
  for (const line of lines) {
    out.set(`${line.id}+`, { id: `${line.id}+`, lineId: line.id, kind: line.kind, sign: 1, letters: line.letters, cells: line.cells });
    out.set(`${line.id}-`, { id: `${line.id}-`, lineId: line.id, kind: line.kind, sign: -1, letters: [...line.letters].reverse().join(""), cells: line.cells.slice().reverse() });
  }
  return out;
}

/**
 * Engine parameters of a run of cells in reading order: the position of its first letter, the skip and the direction. Throws if the cells are not evenly spaced
 * in the stream (they always are for a straight line of the region).
 */
export function engineParams(region, cells) {
  const positions = cells.map(([i, j]) => region.position(i, j));
  const step = positions.length > 1 ? positions[1] - positions[0] : 0;
  for (let k = 0; k < positions.length; k += 1) if (positions[k] !== positions[0] + k * step) throw new Error("cells are not evenly spaced in the stream");
  return { start: positions[0], skip: Math.abs(step), dir: step > 0 ? 1 : -1, length: positions.length, step };
}

/** Plain-text hint for the axis cells: their region coordinates. */
export const axisSummary = (region) => ({ column: region.axisCells[0][1], rowFrom: region.axisCells[0][0], rowTo: region.axisCells[region.axisCells.length - 1][0], cells: region.axisCells.length });
