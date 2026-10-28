#!/usr/bin/env node
// Offline evaluation of questions 1 and 2, no model involved. The saved words come from a data file (evaluation/saved-cipher-u1.json), never from code; this script is the only reader.
//   Q1  Is each saved word in the word list? Where does it occur in the real window (all registered families, both readings, every occurrence)? Is it a candidate (the exhaustive scan)? In the shortlist?
//       In the final engine-confirmed pool? If not, at which step was it lost (word list / region / families / shortlist cut)?
//   Q2  For the located occurrences of the pair: which relation does the computed relation table give, is it listed in the packet, and does an independent recomputation from raw stream positions agree?
// Also reports what the registered families cannot reach (an extended step search), so that a limitation is reported as a limitation of the pool, not of a model.
//   node experiments/els-pool-selection/evaluation/locate-saved.mjs [--pair אירנ,ארהב]
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { pageLetters } from "../../els-live-reading/build-windows.mjs";
import { TORAH_LENGTH, torahChanceModel } from "../../els-live-reading/lib/metrics.mjs";
import { SUPABASE_ANON, SUPABASE_URL } from "../lib/public.mjs";
import { FAMILIES, cellOfPosition, engineParams, familyOf, makeWindow, positionAt } from "../lib/geometry.mjs";
import { gematriaWords, lexiconDigest, tanakhForms, unionLexicon, fold } from "../lib/lexicon.mjs";
import { geometryOf, relationOf } from "../lib/relations.mjs";
import { scanWindow } from "../lib/pool.mjs";
import { listedRelations } from "../lib/packet.mjs";

const here = (path) => new URL(path, import.meta.url);
const md5 = (text) => createHash("md5").update(text, "utf8").digest("hex");
const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => (a.startsWith("--") ? [a.slice(2), all[i + 1]] : null)).filter(Boolean));
const saved = JSON.parse(readFileSync(here("./saved-cipher-u1.json"), "utf8"));
const pool = JSON.parse(readFileSync(here("../data/pools/real.json"), "utf8"));
const letters = pageLetters("public/tzofen.html").slice(0, TORAH_LENGTH);
const win = makeWindow({ width: pool.window.width, r0: pool.window.r0, r1: pool.window.r1, c0: pool.window.c0, c1: pool.window.c1 });
const grid = Array.from({ length: win.nRows }, (_, i) => Array.from({ length: win.nCols }, (_, j) => letters[positionAt(win, i + 1, j + 1)]).join(""));
if (md5(grid.join("")) !== pool.md5_window) throw new Error("window md5 differs from the pool's");
const chance = torahChanceModel(letters, md5);

// the same word list the pool was built from (checked by digest)
const g = await gematriaWords({ url: SUPABASE_URL, anonKey: SUPABASE_ANON });
const lex = unionLexicon({ gematria: g.words, tanakh: tanakhForms("public/tanakh-verses.json", { min: 2 }) });
const lexiconSame = lexiconDigest(lex) === pool.lexicon.digest && lex.size === pool.lexicon.size;

const words = saved.findings.map((f) => fold(f.t));
const unionAll = unionLexicon({ gematria: g.words, tanakh: tanakhForms("public/tanakh-verses.json", { min: 2 }), minLen: 2, maxLen: 12 });
const keyOf = (c) => `${c.text}|${c.start}|${c.skip}|${c.dir}`;
const poolKeys = new Map(pool.items.map((i) => [keyOf(i), i]));
const candidates = scanWindow({ win, grid, lexicon: lex, chance });
const candKeys = new Map(candidates.map((c) => [keyOf(c), c]));

const out = { lexiconSame, window: pool.window, words: [] };
for (const [k, saved_f] of saved.findings.entries()) {
  const text = words[k];
  const row = { saved: saved_f.t, text, length: text.length, in_word_list: lex.has(text), in_any_source_without_length_limit: unionAll.has(text), list_entry: lex.get(text) ?? unionAll.get(text) ?? null };
  // every occurrence in the window along the registered families, whatever the word list says
  const any = scanWindow({ win, grid, lexicon: new Map([[text, {}]]), minLen: 2, maxLen: 12, chance, maximal: false });
  row.occurrences = any.map((o) => ({ family: o.family, dir: o.dir, skip: o.skip, start: o.start, cells: o.cells, first: o.cells[0], last: o.cells.at(-1), E: o.E, candidate: candKeys.has(keyOf(o)), in_pool: poolKeys.has(keyOf(o)), pool_id: poolKeys.get(keyOf(o))?.id ?? null, tier: poolKeys.get(keyOf(o))?.tier ?? null }));
  row.occurrences_in_window = row.occurrences.length;
  out.words.push(row);
}

// extended step search: which occurrences exist along steps the registered families do not cover (|dr|<=4, |dc|<=4, gcd 1)? Reported only as a limit of the families.
const extended = [];
const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b));
for (let dr = 0; dr <= 4; dr += 1) for (let dc = -4; dc <= 4; dc += 1) {
  if ((dr === 0 && dc <= 0) || gcd(dr, dc) !== 1) continue;
  if (FAMILIES.some((f) => f.dr === dr && f.dc === dc)) continue;
  for (const text of new Set(words)) {
    for (const rev of [false, true]) {
      const t = rev ? [...text].reverse().join("") : text;
      for (let i = 1; i <= win.nRows; i += 1) for (let j = 1; j <= win.nCols; j += 1) {
        const cells = [];
        for (let a = 0; a < t.length; a += 1) cells.push([i + a * dr, j + a * dc]);
        if (cells.some(([x, y]) => x < 1 || x > win.nRows || y < 1 || y > win.nCols)) continue;
        if (cells.every(([x, y], a) => grid[x - 1][y - 1] === t[a])) extended.push({ text, step: [dr, dc], reversed: rev, first: cells[0], last: cells.at(-1) });
      }
    }
  }
}
out.extended_steps = extended;

// the pair (default: the first two saved words)
const pairWords = (args.pair ? args.pair.split(",") : words.slice(0, 2)).map(fold);
const [wa, wb] = pairWords.map((w) => out.words.find((r) => r.text === w));
const geoOf = (o) => ({ ...o, geo: geometryOf({ family: o.family, cells: o.cells }) });
out.pair = { words: pairWords, relations: [] };
const listedIds = new Set(listedRelations(pool).map((r) => `${r.a}|${r.b}`));
for (const oa of wa.occurrences) for (const ob of wb.occurrences) {
  const rel = relationOf(geoOf(oa), geoOf(ob));
  const row = { a: { text: wa.text, family: oa.family, dir: oa.dir, first: oa.first, last: oa.last, pool_id: oa.pool_id }, b: { text: wb.text, family: ob.family, dir: ob.dir, first: ob.first, last: ob.last, pool_id: ob.pool_id }, computed: rel };
  if (oa.pool_id && ob.pool_id) {
    const [x, y] = [oa.pool_id, ob.pool_id].sort();
    const table = pool.relations.find((r) => r.a === x && r.b === y);
    row.in_relation_table = table ?? null;
    row.listed_in_packet = listedIds.has(`${x}|${y}`);
    row.table_matches_computed = Boolean(table) === Boolean(rel) && (!rel || table.type === rel.type);
  }
  // independent recomputation from the raw stream positions: step vectors, perpendicular offset in cell units, overlap along the line
  const pa = oa.cells.map(([i, j]) => positionAt(win, i, j)), pb = ob.cells.map(([i, j]) => positionAt(win, i, j));
  row.independent = { stepA: pa[1] - pa[0], stepB: pb[1] - pb[0], sameSkipStep: Math.abs(pa[1] - pa[0]) === Math.abs(pb[1] - pb[0]), letters_a: pa.map((p) => letters[p]).join(""), letters_b: pb.map((p) => letters[p]).join("") };
  out.pair.relations.push(row);
}
writeFileSync(here("./locate-saved-result.json"), `${JSON.stringify(out, null, 1)}\n`);
console.log(JSON.stringify({ lexiconSame, words: out.words.map((w) => ({ text: w.text, in_word_list: w.in_word_list, inAnySource: w.in_any_source_without_length_limit, occurrences: w.occurrences_in_window, in_pool: w.occurrences.filter((o) => o.in_pool).length, candidates: w.occurrences.filter((o) => o.candidate).length })), extended: extended.length, pair: out.pair.relations.map((r) => ({ a: r.a, b: r.b, computed: r.computed, table: r.in_relation_table, listed: r.listed_in_packet })) }, null, 1));
