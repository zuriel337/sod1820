// Pure matrix bookkeeping for the ELS matrix-scan experiment. NO ELS arithmetic lives here: every occurrence comes from the
// canonical engine (els_search_geometry_core_v1, owner els_research_layer_law:v9). This module only labels where an engine-reported
// occurrence sits on a matrix of a declared width, and which region/tile contains it.
//
// A matrix of width W lays the stream out in rows of W letters. A letter sequence that is contiguous on that matrix is exactly an engine
// occurrence whose skip is 1 (rows), W (columns), W-1 or W+1 (diagonals), in either direction (dir = +1 / -1): 4 skips x 2 = 8 directions.

// Column numbers grow along the text (column 0 = first letter of a matrix row). "fwd"/"back" therefore mean "toward the end / the start of
// the text line", i.e. with the reading direction / against it. In a Hebrew (right-to-left) display "fwd" points visually LEFT.
export const DIRECTIONS = Object.freeze([
  { id: "row_fwd", skip: "1", dir: 1, dRow: 0, dCol: 1 },
  { id: "row_back", skip: "1", dir: -1, dRow: 0, dCol: -1 },
  { id: "col_down", skip: "W", dir: 1, dRow: 1, dCol: 0 },
  { id: "col_up", skip: "W", dir: -1, dRow: -1, dCol: 0 },
  { id: "diag_down_fwd", skip: "W+1", dir: 1, dRow: 1, dCol: 1 },
  { id: "diag_up_back", skip: "W+1", dir: -1, dRow: -1, dCol: -1 },
  { id: "diag_down_back", skip: "W-1", dir: 1, dRow: 1, dCol: -1 },
  { id: "diag_up_fwd", skip: "W-1", dir: -1, dRow: -1, dCol: 1 },
]);

export const MIN_AXIS_WIDTH = 5;

const intIn = (value, min, max, name) => {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new RangeError(`${name} must be an integer in [${min}, ${max}]`);
  return value;
};

export function skipValue(spec, width) {
  return spec === "1" ? 1 : spec === "W" ? width : spec === "W+1" ? width + 1 : width - 1;
}

/**
 * The engine skip sets for a matrix: columns+diagonals ("cd"), only the two diagonal families ("diag" — what can CROSS a column), and rows ("row").
 */
export function skipGroups(width) {
  intIn(width, MIN_AXIS_WIDTH, 1_000_000, "width");
  return Object.freeze({ cd: Object.freeze([width - 1, width, width + 1]), diag: Object.freeze([width - 1, width + 1]), row: Object.freeze([1]) });
}

export function cellOf(index, width) {
  intIn(index, 0, Number.MAX_SAFE_INTEGER, "index");
  return Object.freeze({ row: Math.floor(index / width), col: index % width });
}

/** Direction record of an engine occurrence (skip, dir) on a width-W matrix, or null if it is not a matrix-contiguous direction. */
export function directionOf(skip, dir, width) {
  for (const entry of DIRECTIONS) if (skipValue(entry.skip, width) === skip && entry.dir === dir) return entry;
  return null;
}

/** Cells of an occurrence given its start index, skip, dir and length (positions as the engine reports them). */
export function occurrenceCells(start, skip, dir, length, width) {
  const cells = [];
  for (let k = 0; k < length; k += 1) cells.push(cellOf(start + dir * skip * k, width));
  return cells;
}

/** True when the occurrence stays on straight matrix cells (the column does not wrap around a row boundary). */
export function isMatrixContiguous({ start, skip, dir, length }, width) {
  const direction = directionOf(skip, dir, width);
  if (!direction) return false;
  const first = cellOf(start, width);
  const lastCol = first.col + (length - 1) * direction.dCol;
  return lastCol >= 0 && lastCol <= width - 1;
}

/** Number of full rows available for a stream of `total` letters at width W (the last partial row is not used). */
export function fullRows(total, width) {
  return Math.floor(total / width);
}

/** Region centred on an anchor occurrence's middle cell, clamped inside the matrix. */
export function regionAroundAnchor({ anchorStart, anchorSkip, anchorDir, anchorLength, width, totalLetters, rows = 21, cols = 61 }) {
  const R = fullRows(totalLetters, width);
  intIn(rows, 3, R, "rows");
  intIn(cols, 3, width, "cols");
  const mid = anchorStart + anchorDir * anchorSkip * Math.floor((anchorLength - 1) / 2);
  const centre = cellOf(mid, width);
  const r0 = Math.min(Math.max(0, centre.row - Math.floor(rows / 2)), R - rows);
  const c0 = Math.min(Math.max(0, centre.col - Math.floor(cols / 2)), width - cols);
  return Object.freeze({ width, r0, r1: r0 + rows - 1, c0, cw: cols, rows, cols });
}

/**
 * Display/search neighbourhood of an occurrence: the bounding box of its cells grown by `margin` cells on every side, clamped to the matrix.
 * With margin = (longest dictionary word - 1) every word that shares a cell with the occurrence lies entirely inside it.
 */
export function regionAroundPositions({ positions, width, totalLetters, margin }) {
  const R = fullRows(totalLetters, width);
  intIn(margin, 0, 64, "margin");
  if (!Array.isArray(positions) || positions.length < 2) throw new RangeError("positions must list the occurrence's letters");
  const cells = positions.map((position) => {
    if (!Number.isSafeInteger(position) || position < 0 || position >= R * width) throw new RangeError(`position ${position} is outside the ${R}x${width} matrix`);
    return cellOf(position, width);
  });
  const r0 = Math.max(0, Math.min(...cells.map((c) => c.row)) - margin);
  const r1 = Math.min(R - 1, Math.max(...cells.map((c) => c.row)) + margin);
  const c0 = Math.max(0, Math.min(...cells.map((c) => c.col)) - margin);
  const c1 = Math.min(width - 1, Math.max(...cells.map((c) => c.col)) + margin);
  return Object.freeze({ width, r0, r1, c0, cw: c1 - c0 + 1, rows: r1 - r0 + 1, cols: c1 - c0 + 1 });
}

export function inRegion(cell, region) {
  return cell.row >= region.r0 && cell.row <= region.r1 && cell.col >= region.c0 && cell.col < region.c0 + region.cw;
}

/** Tile (rb, cb) of a cell on the tiling anchored at the target region, tile size = region size. Floor division (negatives allowed). */
export function tileOf(cell, region) {
  return Object.freeze({ rb: Math.floor((cell.row - region.r0) / region.rows), cb: Math.floor((cell.col - region.c0) / region.cols) });
}

/** All tiles that lie fully inside the matrix (same size as the target region). The target region itself is tile (0,0). */
export function fullTiles(region, totalLetters) {
  const R = fullRows(totalLetters, region.width);
  const tiles = [];
  for (let rb = Math.ceil(-region.r0 / region.rows); region.r0 + rb * region.rows + region.rows - 1 <= R - 1; rb += 1) {
    for (let cb = Math.ceil(-region.c0 / region.cols); region.c0 + cb * region.cols + region.cols - 1 <= region.width - 1; cb += 1) tiles.push({ rb, cb });
  }
  return tiles;
}

/** The rectangular grid (inclusive bounds) of full tiles; tile order is rb ascending, then cb ascending. */
export function tileGrid(region, totalLetters) {
  const tiles = fullTiles(region, totalLetters);
  if (!tiles.length) throw new RangeError("no full tile fits in the matrix");
  const rbs = tiles.map((tile) => tile.rb);
  const cbs = tiles.map((tile) => tile.cb);
  return Object.freeze({ rbMin: Math.min(...rbs), rbMax: Math.max(...rbs), cbMin: Math.min(...cbs), cbMax: Math.max(...cbs), count: tiles.length });
}

/** Render a region as rows of letters from a map idx->letter (display only; letters come from the canonical stream relation). */
export function renderRegion(letterAt, region) {
  const lines = [];
  for (let row = region.r0; row <= region.r1; row += 1) {
    let line = "";
    for (let col = region.c0; col < region.c0 + region.cw; col += 1) line += letterAt(row * region.width + col) ?? "·";
    lines.push(line);
  }
  return lines;
}
