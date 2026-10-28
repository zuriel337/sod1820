#!/usr/bin/env node
// EXP-16: writes the control-window data files from the text embedded in the page (a second copy of public.torah_stream) and prints the md5 of every whole window,
// which is then compared with the same md5 computed by SQL over public.torah_stream (windowMd5Sql). Equal -> the page copy and the canonical table agree on every letter of the window.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { MATRIX_WIDTH, WINDOW_COLS, WINDOW_ROWS, sampleWindows, seedOf } from "./lib/windows.mjs";
import { PLANTED_WORDS, plantedFile } from "./lib/plant.mjs";

export const WINDOW_SEED_LABEL = "EXP16-control-windows-v1";
export const WINDOW_COUNT = 8;
const md5 = (text) => createHash("md5").update(text, "utf8").digest("hex");

export function pageLetters(htmlPath) {
  const html = readFileSync(htmlPath, "utf8");
  const data = /<script id="torah-data" type="text\/plain">([\s\S]*?)<\/script>/.exec(html);
  if (!data) throw new Error("embedded letters not found in the page");
  return gunzipSync(Buffer.from(data[1].trim(), "base64")).toString("utf8");
}

export function buildWindow(letters, w) {
  const grid = [];
  for (let k = 0; k < WINDOW_ROWS; k += 1) {
    const r = w.r0 + k;
    const s = letters.slice(r * MATRIX_WIDTH + w.c0, r * MATRIX_WIDTH + w.c0 + WINDOW_COLS);
    if ([...s].length !== WINDOW_COLS) throw new Error(`${w.id} row ${r}: ${[...s].length} letters`);
    grid.push({ r, s, md5: md5(s) });
  }
  return { source: "text embedded in public/tzofen.html (a second copy of public.torah_stream); each whole window is compared with the table by an md5 computed in SQL (see md5_window). idx = row * width + col + 1.", scope: "torah", width: MATRIX_WIDTH, rows: [w.r0, w.r1], cols: [w.c0, w.c1], axis: null, id: w.id, md5_window: md5(grid.map((row) => row.s).join("")), grid };
}

/** The SQL that returns the same whole-window md5 from the canonical table. */
export function windowMd5Sql(windows) {
  const values = windows.map((w) => `('${w.id}', ${w.r0}, ${w.c0})`).join(", ");
  return `set local statement_timeout = '55000ms';
select jsonb_agg(jsonb_build_object('id', id, 'md5_window', md5(s)) order by id) as windows
from (select id, string_agg(row_s, '' order by r) as s from (
  select w.id, w.r0 + k as r, string_agg(t.ch, '' order by t.idx) as row_s
  from (values ${values}) w(id, r0, c0)
  cross join generate_series(0, ${WINDOW_ROWS - 1}) k
  join public.torah_stream t on t.idx between (w.r0 + k) * ${MATRIX_WIDTH} + w.c0 + 1 and (w.r0 + k) * ${MATRIX_WIDTH} + w.c0 + ${WINDOW_COLS}
  group by w.id, w.r0, k) rows group by id) q;`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const windows = sampleWindows({ seed: seedOf(WINDOW_SEED_LABEL), n: WINDOW_COUNT });
  const letters = pageLetters(process.argv[2] || "public/tzofen.html");
  mkdirSync(new URL("./data/windows/", import.meta.url), { recursive: true });
  const summary = windows.map((w) => { const file = buildWindow(letters, w); writeFileSync(new URL(`./data/windows/${w.id}.json`, import.meta.url), JSON.stringify(file, null, 1)); return { id: w.id, md5_window: file.md5_window }; });
  console.log(JSON.stringify(summary));
  for (const id of Object.keys(PLANTED_WORDS)) {
    const base = JSON.parse(readFileSync(new URL(`./data/windows/${PLANTED_WORDS[id].base}.json`, import.meta.url), "utf8"));
    const file = plantedFile(base, id);
    writeFileSync(new URL(`./data/windows/${id}.json`, import.meta.url), JSON.stringify(file, null, 1));
    console.log(id, JSON.stringify(file.planted.map((w) => [w.text, w.reading, w.from, w.to, w.distance, w.occurrences_in_window])));
  }
  writeFileSync(new URL("./review/window-md5.sql", import.meta.url), windowMd5Sql(windows));
}
