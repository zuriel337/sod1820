// Exploratory sizes only (no target, no saved record): how many candidates, how large the shortlist and the relation list, for the real window and a few tiles.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { pageLetters } from "../els-live-reading/build-windows.mjs";
import { TORAH_LENGTH, TORAH_MD5, torahChanceModel } from "../els-live-reading/lib/metrics.mjs";
import { SUPABASE_ANON, SUPABASE_URL } from "./lib/public.mjs";
import { makeWindow, positionAt } from "./lib/geometry.mjs";
import { gematriaWords, tanakhForms, unionLexicon } from "./lib/lexicon.mjs";
import { controlTiles } from "./lib/controls.mjs";
import { makeAxis, scanWindow, shortlist, poolRelations } from "./lib/pool.mjs";

const letters = pageLetters("public/tzofen.html").slice(0, TORAH_LENGTH);
const chance = torahChanceModel(letters, (t) => createHash("md5").update(t, "utf8").digest("hex"));
const W = 10101;
const engine = JSON.parse(readFileSync(new URL("../els-live-reading/review/case-u1-engine.json", import.meta.url), "utf8"));
const hit = engine.occurrences[0];
const g = await gematriaWords({ url: SUPABASE_URL, anonKey: SUPABASE_ANON });
const t = tanakhForms("public/tanakh-verses.json", { min: 2 });
const lex = unionLexicon({ gematria: g.words, tanakh: t });
console.log(JSON.stringify({ gematria_rows: g.rows, gematria_single_words: g.words.size, tanakh_forms_ge2: t.size, union_4_9: lex.size }));
const gridOf = (win) => Array.from({ length: win.nRows }, (_, i) => Array.from({ length: win.nCols }, (_, j) => letters[positionAt(win, i + 1, j + 1)]).join(""));
function run(label, win, axisPositions) {
  const started = Date.now();
  const grid = gridOf(win);
  const candidates = scanWindow({ win, grid, lexicon: lex, chance });
  const axis = makeAxis({ win, positions: axisPositions });
  const { items, counts } = shortlist({ candidates, axis });
  const rel = poolRelations(items);
  const byType = rel.reduce((m, r) => ((m[r.type] = (m[r.type] ?? 0) + 1), m), {});
  console.log(label, JSON.stringify({ cells: win.nRows * win.nCols, candidates_len4_9: candidates.length, ...counts, shortlist: items.length, relations: rel.length, byType, ms: Date.now() - started }));
}
const real = makeWindow({ width: W, r0: 0, r1: 30, c0: 162, c1: 262 });
run("real", real, hit.positions);
for (const tile of controlTiles({ label: "EXP12P-calibration-only", n: 3, cols: 101, completeCols: 1775, exclude: [{ c0: 162, c1: 262 }] })) {
  const win = makeWindow({ width: W, r0: 0, r1: 30, c0: tile.c0, c1: tile.c1 });
  const mid = tile.c0 + 50;
  run(tile.id, win, Array.from({ length: 7 }, (_, k) => (8 + k) * W + mid));
}
