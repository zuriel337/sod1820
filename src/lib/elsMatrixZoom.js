// Cell geometry of the research-mode ELS matrix. Mirrors the classic engine (public/tzofen.html: buildMatrix / fitMatrixToScreen /
// markedBBox) so that zoom, "fit to screen" and the letter size behave exactly like the classic matrix. Presentation only: the
// letters, positions and verification of every occurrence stay the engine's.

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 2.8;
export const CELL_MIN = 11;
export const CELL_MAX = 64;
export const CELL_GAP = 2;
export const FIT_MIN_COLS = 18;

const num = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const clampZoom = value => clamp(num(value, 1), ZOOM_MIN, ZOOM_MAX);

// Free layout: the base cell depends on the column count (20–30px), then the zoom multiplies it. Same formula as the engine.
export function freeCellPx(cols, zoom, { min = CELL_MIN } = {}) {
  const base = clamp(Math.round(720 / Math.min(Math.max(1, num(cols, 1)), 26)), 20, 30);
  return clamp(Math.round(base * clampZoom(zoom)), min, CELL_MAX);
}

// "Fit to screen": the cell fills the available width, capped at 46px on a phone and 58px on a desktop; the zoom multiplies it.
export function fitCellPx(cols, availableWidth, zoom, viewportWidth = 800, { min = CELL_MIN } = {}) {
  const count = Math.max(1, Math.round(num(cols, 1)));
  const cap = viewportWidth >= 980 ? 58 : 46;
  const room = num(availableWidth, 0) - (count - 1) * CELL_GAP;
  const fit = clamp(Math.floor(room / count), min, cap);
  return clamp(Math.round(fit * clampZoom(zoom)), min, CELL_MAX);
}

// Letter size follows the cell, as in the engine (cell - 5px).
export const letterPx = cell => Math.max(8, Math.round(num(cell, 26)) - 5);

// The window "fit to screen" shows: the box around everything marked (axis + findings) with a margin, widened to fill the screen
// and kept inside the engine's research window. Mirrors the engine's markedBBox. `marks` are absolute text indexes.
export function fitWindow(window, marks, _viewportWidth = 800, { hideMain = false } = {}) {
  const S = num(window?.S, 0), r0 = num(window?.r0, 0), r1 = num(window?.r1, 0), c0 = num(window?.c0, 0), cw = num(window?.cw, 0);
  const base = { r0, r1, c0, cw };
  if (!(S > 0) || !(cw > 0) || r1 < r0) return base;
  let rMin = Infinity, rMax = -Infinity, cMin = Infinity, cMax = -Infinity;
  for (const mark of marks || []) {
    if (hideMain && mark.main) continue;
    const row = Math.floor(mark.i / S), col = ((mark.i % S) + S) % S;
    if (row < r0 || row > r1 || col < c0 || col >= c0 + cw) continue;
    rMin = Math.min(rMin, row); rMax = Math.max(rMax, row); cMin = Math.min(cMin, col); cMax = Math.max(cMax, col);
  }
  if (!Number.isFinite(rMin)) return base;
  let top = Math.max(r0, rMin - 2), bottom = Math.min(r1, rMax + 2);
  let left = Math.max(c0, cMin - 2), right = Math.min(c0 + cw, cMax + 3), width = Math.max(1, right - left);
  // The crop is the same on every screen (18 columns at least), so rotating or resizing never changes which letters are shown;
  // only the cell size follows the width.
  const minCols = FIT_MIN_COLS;
  if (width < minCols) {
    const want = Math.min(minCols, cw), mainCol = num(window?.mainCol, Math.round((cMin + cMax) / 2));
    let start = Math.round(mainCol - want / 2);
    if (start > cMin) start = cMin;
    if (start + want <= cMax) start = cMax - want + 1;
    left = clamp(start, c0, c0 + cw - want); width = want;
  }
  if (bottom - top < 6) {
    top = Math.max(r0, top - Math.ceil((6 - (bottom - top)) / 2));
    bottom = Math.min(r1, top + 6);
  }
  return { r0: top, r1: bottom, c0: left, cw: width };
}
