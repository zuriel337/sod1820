#!/usr/bin/env node
// EXP-16 case V1 (a saved cipher): builds data/windows/v1.json, a 33 x 41 window of the width-5541 Torah matrix with the saved phrase as its axis. The occurrence comes from the engine
// (review/case-v1-engine.json: start, skip, direction as returned by els_search_page_v1), never from the saved record, which has no start_index. The axis is placed like the Columbia
// one: its middle cell in the middle row of the window and in column 21. The letters come from the page copy; the whole window is compared with the canonical table by md5 (SQL printed below).
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { buildWindow, pageLetters, windowMd5Sql } from "./build-windows.mjs";
import { WINDOW_COLS, WINDOW_ROWS } from "./lib/windows.mjs";

/**
 * A WINDOW_ROWS x WINDOW_COLS window around the chosen occurrence, which must be one column of the width-`skip` matrix. Where the Torah has fewer rows than that at this width
 * (case U1: width 10101 gives 31 rows) the window is clipped to the rows that exist, whole rows only (the last row of the stream is partial and is used only if the window's
 * columns lie inside it).
 */
export function caseWindow(engineJson, letters, { id = "v1" } = {}) {
  const chosen = engineJson.occurrences.find((o) => o.skip === engineJson.chosen.skip);
  const width = chosen.skip; // the saved skip is the matrix width: the phrase is one column
  const rowOf = (p) => Math.floor(p / width);
  const colOf = (p) => p % width;
  const rows = chosen.positions.map(rowOf);
  const cols = new Set(chosen.positions.map(colOf));
  if (cols.size !== 1) throw new Error("the occurrence is not a single column at this width");
  const top = Math.min(...rows);
  const middle = top + Math.floor((rows.length - 1) / 2);
  const c0 = [...cols][0] - 20;
  const lastRow = Math.floor((letters.length - 1) / width);
  const lastCompleteRow = (letters.length - lastRow * width) > c0 + WINDOW_COLS - 1 ? lastRow : lastRow - 1;
  const r0 = Math.max(0, middle - Math.floor(WINDOW_ROWS / 2));
  const r1 = Math.min(lastCompleteRow, r0 + WINDOW_ROWS - 1);
  const w = { id, r0, r1, c0, c1: c0 + WINDOW_COLS - 1, axis: { start: chosen.start, skip: chosen.skip, dir: chosen.dir, length: chosen.positions.length, text: engineJson.phrase } };
  const file = buildWindow(letters, w, width);
  const spelled = chosen.positions.map((p) => letters[p]).join("");
  return { file, width, spelled, window: w };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const engine = JSON.parse(readFileSync(new URL("./review/case-v1-engine.json", import.meta.url), "utf8"));
  const { file, width, spelled, window: w } = caseWindow(engine, pageLetters(process.argv[2] || "public/tzofen.html").slice(0, 304_805)); // the Torah is the first 304,805 letters of the page copy
  writeFileSync(new URL("./data/windows/v1.json", import.meta.url), JSON.stringify(file, null, 1));
  writeFileSync(new URL("./review/case-v1-md5.sql", import.meta.url), windowMd5Sql([w], width));
  console.log(JSON.stringify({ width, rows: file.rows, cols: file.cols, axis: file.axis, spelled_along_the_engine_positions: spelled, md5_window: file.md5_window, md5_of_spelled: createHash("md5").update(spelled).digest("hex").slice(0, 8) }));
}
