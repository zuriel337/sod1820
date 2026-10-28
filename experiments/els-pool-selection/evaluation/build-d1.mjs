#!/usr/bin/env node
// Builds the DIAGNOSTIC pool D1 = the real pool + every located occurrence of a saved word that the pool lacked because the word is not in the word list. The added items are ordinary
// items in the same format (same fields, same neutral ids by position, same E, same context letters, same engine confirmation); which ids were added is kept in evaluation/d1-forced-ids.json,
// outside the pool file the prompt builder reads. Generic: the words come from the data file, never from code.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { pageLetters } from "../../els-live-reading/build-windows.mjs";
import { TORAH_LENGTH, torahChanceModel } from "../../els-live-reading/lib/metrics.mjs";
import { SUPABASE_ANON } from "../lib/public.mjs";
import { makeWindow, positionAt } from "../lib/geometry.mjs";
import { chanceExpectation, finalizePool, makeAxis, storable } from "../lib/pool.mjs";
import { axisRelation, geometryOf } from "../lib/relations.mjs";
import { confirmed, makeVerifyRpc, verifyItems } from "../lib/verify.mjs";

const here = (path) => new URL(path, import.meta.url);
const md5 = (text) => createHash("md5").update(text, "utf8").digest("hex");
const located = JSON.parse(readFileSync(here("./locate-saved-result.json"), "utf8"));
const pool = JSON.parse(readFileSync(here("../data/pools/real.json"), "utf8"));
const letters = pageLetters("public/tzofen.html").slice(0, TORAH_LENGTH);
const chance = torahChanceModel(letters, md5);
const win = makeWindow({ width: pool.window.width, r0: pool.window.r0, r1: pool.window.r1, c0: pool.window.c0, c1: pool.window.c1 });
const axis = makeAxis({ win, positions: pool.axis.positions, term: pool.axis.term });
const around = (cells, from, to) => cells.slice(Math.max(0, from), to).map(([i, j]) => letters[positionAt(win, i, j)]).join("");

const forced = [];
for (const w of located.words) {
  if (w.in_word_list) continue;
  for (const o of w.occurrences) {
    // context letters on the same line, up to 6, inside the region: the line is the family line through the run, read in the run's own direction
    const family = o.family;
    forced.push({ text: w.text, family, dir: o.dir, start: o.start, skip: o.skip, cells: o.cells, E: o.E, source: "saved" });
  }
}
const toCheck = forced.map((c) => ({ key: `${c.text}|${c.start}|${c.skip}|${c.dir}`, term: c.text, start: c.start, skip: c.skip, dir: c.dir }));
const rows = await verifyItems(toCheck, { torah: letters, rpc: makeVerifyRpc({ anonKey: SUPABASE_ANON }), concurrency: 4 });
const byKey = new Map(rows.map((r) => [r.key, r]));
const lineCells = (c) => { // extend the run along its own step inside the window to read the letters before/after (same rule as the scan: up to 6)
  const [di, dj] = [c.cells[1][0] - c.cells[0][0], c.cells[1][1] - c.cells[0][1]];
  const inside = (i, j) => i >= 1 && i <= win.nRows && j >= 1 && j <= win.nCols;
  const before = [], after = [];
  for (let k = 1, i = c.cells[0][0] - di, j = c.cells[0][1] - dj; k <= 6 && inside(i, j); k += 1, i -= di, j -= dj) before.unshift([i, j]);
  for (let k = 1, i = c.cells.at(-1)[0] + di, j = c.cells.at(-1)[1] + dj; k <= 6 && inside(i, j); k += 1, i += di, j += dj) after.push([i, j]);
  return { before, after };
};
const items = [];
for (const c of forced) {
  const row = byKey.get(`${c.text}|${c.start}|${c.skip}|${c.dir}`);
  if (!confirmed(row)) { console.error("engine did not confirm", c.text, c.start); continue; }
  const { before, after } = lineCells(c);
  const item = { ...c, before: before.map(([i, j]) => letters[positionAt(win, i, j)]).join(""), after: after.map(([i, j]) => letters[positionAt(win, i, j)]).join(""), tier: "D", verify: row.state, lex: { g: false, t: 0 }, E: c.E ?? chanceExpectation(chance, c.text, c.skip) };
  item.geo = geometryOf(item);
  item.axisRelation = axisRelation(item, axis);
  items.push(item);
}
const existing = pool.items.map((i) => ({ ...i, axisRelation: i.axis }));
const all = finalizePool([...existing, ...items]);
const forcedKeys = new Set(items.map((i) => `${i.text}|${i.start}|${i.skip}|${i.dir}`));
const out = { ...pool, id: "real-d1", diagnostic: true, counts: { ...pool.counts, items: all.items.length, relations: all.relations.length }, items: all.items.map(storable), relations: all.relations };
writeFileSync(here("../data/pools/real-d1.json"), `${JSON.stringify(out)}\n`);
writeFileSync(here("./d1-forced-ids.json"), `${JSON.stringify({ note: "ids of the items added to the real pool for the diagnostic arm D1 (kept outside the pool file the prompt builder reads)", pool: "real-d1", forced: all.items.filter((i) => forcedKeys.has(`${i.text}|${i.start}|${i.skip}|${i.dir}`)).map((i) => ({ id: i.id, text: i.text, family: i.family, dir: i.dir, skip: i.skip, first: i.cells[0], last: i.cells.at(-1) })) }, null, 1)}\n`);
console.log(JSON.stringify({ added: items.length, total: all.items.length, relations: all.relations.length, forced: JSON.parse(readFileSync(here("./d1-forced-ids.json"), "utf8")).forced }, null, 1));
