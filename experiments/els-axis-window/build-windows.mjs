#!/usr/bin/env node
// Builds the three EXP-18 windows from windows that were already verified against public.torah_stream (each row has its md5 from the canonical table): the rows of the selected occurrence
// plus 10 above and below, every column kept. Nothing is read from the page here; the loader re-checks every row md5 and the page cross-check compares each cell. Run once:
//   node experiments/els-axis-window/build-windows.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = (path) => fileURLToPath(new URL(path, import.meta.url));
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
export const MARGIN_ROWS = 10;

/** axisRows: stream rows of the selected occurrence (min, max). Returns the saved window cut to [min - margin, max + margin] (inside the saved rows). */
export function cut(source, axis, { id, margin = MARGIN_ROWS }) {
  const rowOf = (k) => Math.floor((axis.start + k * axis.skip * axis.dir) / source.width);
  const rows = Array.from({ length: axis.length }, (_, k) => rowOf(k));
  const lo = Math.max(source.rows[0], Math.min(...rows) - margin);
  const hi = Math.min(source.rows[1], Math.max(...rows) + margin);
  const grid = source.grid.filter((row) => row.r >= lo && row.r <= hi);
  return { source: `${id}: rows ${lo}-${hi} of a window verified against public.torah_stream (per-row md5 from the canonical table); selected occurrence rows ${Math.min(...rows)}-${Math.max(...rows)} +-${margin}`, scope: source.scope, width: source.width, rows: [lo, hi], cols: source.cols, axis, id, grid };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const live = (name) => here(`../els-live-reading/${name}`);
  const columbia = readJson(live("data/region-columbia.json"));
  const v1 = readJson(live("data/windows/v1.json"));
  const w03 = readJson(live("data/windows/w03.json"));
  const windows = {
    c1: cut(columbia, { start: columbia.axis.start, skip: columbia.axis.skip, dir: columbia.axis.dir, length: columbia.axis.length }, { id: "c1" }),
    v1x: cut(v1, { start: v1.axis.start, skip: v1.axis.skip, dir: v1.axis.dir, length: v1.axis.length }, { id: "v1x" }), // the phrase of the axis is not carried over
    // control: a pseudo-axis of 8 cells in the middle column of a random window (letters are whatever the stream holds there; it is marked, never named)
    k1: (() => {
      const col = Math.floor((w03.cols[0] + w03.cols[1]) / 2);
      const firstRow = w03.rows[0] + 12;
      const axis = { start: firstRow * w03.width + col, skip: w03.width, dir: 1, length: 8 };
      return cut(w03, axis, { id: "k1" });
    })(),
  };
  for (const [name, window] of Object.entries(windows)) {
    writeFileSync(here(`./data/windows/${name}.json`), `${JSON.stringify(window, null, 1)}\n`);
    process.stdout.write(`${name}: rows ${window.rows[0]}-${window.rows[1]} (${window.grid.length}) x ${window.cols[1] - window.cols[0] + 1} columns, width ${window.width}\n`);
  }
}
