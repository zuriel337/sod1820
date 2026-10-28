#!/usr/bin/env node
// Post-hoc, offline, no model: how many word-list words (4-9 letters, exhaustive candidates of the generator) run alongside the axis in the axis' own family (same skip, vertical in the
// width-10101 matrix) with at least 3 / 4 rows in common with the axis rows, at any column offset, in the real window and in the 12 control tiles (pseudo-axis = middle column, same rows).
// Added after ZURIEL asked which "parallels" the pair has; the registered parallel limit (6 columns) had hidden the relation of one known word to the axis (13 columns). Descriptive only.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { pageLetters } from "../../els-live-reading/build-windows.mjs";
import { TORAH_LENGTH, torahChanceModel } from "../../els-live-reading/lib/metrics.mjs";
import { SUPABASE_ANON, SUPABASE_URL } from "../lib/public.mjs";
import { makeWindow, positionAt } from "../lib/geometry.mjs";
import { gematriaWords, tanakhForms, unionLexicon } from "../lib/lexicon.mjs";
import { scanWindow } from "../lib/pool.mjs";
import { windows } from "../build-pools.mjs";

const here = (p) => new URL(p, import.meta.url);
const md5 = (t) => createHash("md5").update(t, "utf8").digest("hex");
const letters = pageLetters("public/tzofen.html").slice(0, TORAH_LENGTH);
const chance = torahChanceModel(letters, md5);
const g = await gematriaWords({ url: SUPABASE_URL, anonKey: SUPABASE_ANON });
const lex = unionLexicon({ gematria: g.words, tanakh: tanakhForms("public/tanakh-verses.json", { min: 2 }) });
const rows = [];
for (const spec of windows()) {
  const win = makeWindow({ width: 10101, r0: spec.r0, r1: spec.r1, c0: spec.c0, c1: spec.c1 });
  const grid = Array.from({ length: win.nRows }, (_, i) => Array.from({ length: win.nCols }, (_, j) => letters[positionAt(win, i + 1, j + 1)]).join(""));
  const axisCol = spec.axisCol - spec.c0 + 1, axisRows = [spec.axisRows[0] + 1, spec.axisRows[1] + 1];
  const cands = scanWindow({ win, grid, lexicon: lex, chance }).filter((c) => c.family === "C" && c.text.length >= 4);
  const stat = (minOverlap) => {
    const hit = cands.filter((c) => { const r = c.cells.map((x) => x[0]); const ov = Math.max(0, Math.min(Math.max(...r), axisRows[1]) - Math.max(Math.min(...r), axisRows[0]) + 1); return ov >= minOverlap && c.cells[0][1] !== axisCol; });
    return { words: hit.length, same_direction: hit.filter((c) => c.dir === 1).length, within_15_columns: hit.filter((c) => Math.abs(c.cells[0][1] - axisCol) <= 15).length, starting_on_axis_first_row_same_direction: hit.filter((c) => c.dir === 1 && c.cells[0][0] === axisRows[0]).length };
  };
  rows.push({ id: spec.id, vertical_words_4plus: cands.length, overlap_ge_3_rows: stat(3), overlap_ge_4_rows: stat(4) });
}
writeFileSync(here("../review/axis-parallels.json"), `${JSON.stringify(rows, null, 1)}\n`);
for (const r of rows) console.log(r.id, "vertical words", r.vertical_words_4plus, "| >=4 shared rows:", JSON.stringify(r.overlap_ge_4_rows));
