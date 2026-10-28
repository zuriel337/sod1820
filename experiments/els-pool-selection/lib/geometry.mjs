// EXP-12 pilot: matrix geometry for the candidate pool. NO ELS arithmetic that the engine owns is decided here: a candidate is a run of letters of the canonical stream along a straight
// step of the matrix, and every candidate that reaches the pool is confirmed by the engine (verify.mjs). This module only lists the straight steps ("line families"), the lines of a
// window, and the engine parameters (start, skip, dir) of a run of cells.
//
// Stream position p (0-based) = row * W + col. A family is a step (dr, dc) with dr >= 0 (dr = 0 only for (0, 1)); its engine skip is dr * W + dc, read forward (+1) or backward (-1).
export const FAMILIES = Object.freeze([
  { id: "R", dr: 0, dc: 1, label: "שורה" },
  { id: "C", dr: 1, dc: 0, label: "עמודה" },
  { id: "D1", dr: 1, dc: 1, label: "אלכסון (רוחב+1)" },
  { id: "A1", dr: 1, dc: -1, label: "אלכסון (רוחב−1)" },
  { id: "D2", dr: 1, dc: 2, label: "אלכסון תלול (רוחב+2)" },
  { id: "A2", dr: 1, dc: -2, label: "אלכסון תלול (רוחב−2)" },
  { id: "C2", dr: 2, dc: 0, label: "עמודה בדילוג שורה (2·רוחב)" },
  { id: "K1", dr: 2, dc: 1, label: "קו שיפוע 2·רוחב+1" },
  { id: "K2", dr: 2, dc: -1, label: "קו שיפוע 2·רוחב−1" },
  { id: "K3", dr: 2, dc: 2, label: "קו שיפוע 2·רוחב+2" },
  { id: "K4", dr: 2, dc: -2, label: "קו שיפוע 2·רוחב−2" },
]);
export const familyOf = (id) => FAMILIES.find((family) => family.id === id);
export const skipOf = (family, width) => family.dr * width + family.dc;

/** The window of the matrix of width W: rows r0..r1 and columns c0..c1 (0-based, inclusive). Local cells are 1-based [i, j]. */
export function makeWindow({ width, r0, r1, c0, c1 }) {
  return Object.freeze({ width, r0, r1, c0, c1, nRows: r1 - r0 + 1, nCols: c1 - c0 + 1 });
}
export const positionAt = (win, i, j) => (win.r0 + i - 1) * win.width + (win.c0 + j - 1);
export function cellOfPosition(win, p) {
  const r = Math.floor(p / win.width), c = p % win.width;
  if (r < win.r0 || r > win.r1 || c < win.c0 || c > win.c1) return null;
  return [r - win.r0 + 1, c - win.c0 + 1];
}

/** Every maximal chain of cells of the window along one family, in increasing stream order. A line has at least 2 cells. */
export function linesOf(win, family) {
  const inside = (i, j) => i >= 1 && i <= win.nRows && j >= 1 && j <= win.nCols;
  const lines = [];
  let n = 0;
  for (let i = 1; i <= win.nRows; i += 1) {
    for (let j = 1; j <= win.nCols; j += 1) {
      if (inside(i - family.dr, j - family.dc)) continue; // not the first cell of its chain
      const cells = [];
      for (let a = i, b = j; inside(a, b); a += family.dr, b += family.dc) cells.push([a, b]);
      if (cells.length >= 2) { n += 1; lines.push({ id: `${family.id}${n}`, family: family.id, cells }); }
    }
  }
  return lines;
}

/** Engine parameters of a run of cells given in reading order. Throws if the cells are not evenly spaced in the stream. */
export function engineParams(win, cells) {
  const positions = cells.map(([i, j]) => positionAt(win, i, j));
  const step = positions.length > 1 ? positions[1] - positions[0] : 0;
  for (let k = 0; k < positions.length; k += 1) if (positions[k] !== positions[0] + k * step) throw new Error("cells are not evenly spaced in the stream");
  return { start: positions[0], skip: Math.abs(step), dir: step > 0 ? 1 : -1, step, positions };
}
