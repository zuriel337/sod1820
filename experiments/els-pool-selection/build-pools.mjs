// Builds the engine-confirmed candidate pools of the real window and of the control tiles. No model, no saved record, no target is used. Output: data/pools/<id>.json and review/window-md5.sql
//   node experiments/els-pool-selection/build-pools.mjs [--only real|t01,t02,...] [--no-engine]
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { pageLetters } from "../els-live-reading/build-windows.mjs";
import { TORAH_LENGTH, torahChanceModel } from "../els-live-reading/lib/metrics.mjs";
import { SUPABASE_ANON, SUPABASE_URL } from "./lib/public.mjs";
import { makeWindow, positionAt } from "./lib/geometry.mjs";
import { gematriaWords, lexiconDigest, tanakhForms, unionLexicon } from "./lib/lexicon.mjs";
import { controlTiles } from "./lib/controls.mjs";
import { finalizePool, makeAxis, scanWindow, shortlist, storable, POOL_RULE } from "./lib/pool.mjs";
import { confirmed, makeVerifyRpc, verifyItems } from "./lib/verify.mjs";

export const W = 10101;
export const REAL = Object.freeze({ id: "real", r0: 0, r1: 30, c0: 162, c1: 262, axisRows: [8, 14], axisCol: 212 });
export const TILE_LABEL = "EXP12P-control-tiles-v1";
export const TILE_COUNT = 12;
export const md5 = (text) => createHash("md5").update(text, "utf8").digest("hex");
export const here = (path) => new URL(path, import.meta.url);

export function windows() {
  const tiles = controlTiles({ label: TILE_LABEL, n: TILE_COUNT, cols: 101, completeCols: 1775, exclude: [{ c0: REAL.c0, c1: REAL.c1 }] });
  return [REAL, ...tiles.map((t) => ({ id: t.id, r0: 0, r1: 30, c0: t.c0, c1: t.c1, axisRows: [8, 14], axisCol: t.c0 + 50 }))];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => (a.startsWith("--") ? [a.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] === undefined ? "true" : all[i + 1]] : null)).filter(Boolean));
  const letters = pageLetters("public/tzofen.html").slice(0, TORAH_LENGTH);
  const chance = torahChanceModel(letters, md5);
  const g = await gematriaWords({ url: SUPABASE_URL, anonKey: SUPABASE_ANON });
  const lex = unionLexicon({ gematria: g.words, tanakh: tanakhForms("public/tanakh-verses.json", { min: 2 }) });
  const engine = JSON.parse(readFileSync(here("../els-live-reading/review/case-u1-engine.json"), "utf8")).occurrences[0];
  const rpc = makeVerifyRpc({ anonKey: SUPABASE_ANON });
  mkdirSync(here("./data/pools/"), { recursive: true });
  const all = windows();
  writeFileSync(here("./review/window-md5.sql"), `set local statement_timeout = '55000ms';\nselect jsonb_agg(jsonb_build_object('id', id, 'md5_window', md5(s)) order by id) as windows\nfrom (select id, string_agg(row_s, '' order by r) as s from (\n  select w.id, w.r0 + k as r, string_agg(t.ch, '' order by t.idx) as row_s\n  from (values ${all.map((w) => `('${w.id}', ${w.r0}, ${w.c0})`).join(", ")}) w(id, r0, c0)\n  cross join generate_series(0, 30) k\n  join public.torah_stream t on t.idx between (w.r0 + k) * ${W} + w.c0 + 1 and (w.r0 + k) * ${W} + w.c0 + 101\n  group by w.id, w.r0, k) rows group by id) q;\n`);
  const only = args.only ? args.only.split(",") : null;
  const summary = [];
  for (const spec of all) {
    if (only && !only.includes(spec.id)) continue;
    const started = Date.now();
    const win = makeWindow({ width: W, r0: spec.r0, r1: spec.r1, c0: spec.c0, c1: spec.c1 });
    const grid = Array.from({ length: win.nRows }, (_, i) => Array.from({ length: win.nCols }, (_, j) => letters[positionAt(win, i + 1, j + 1)]).join(""));
    const positions = spec.id === "real" ? engine.positions : Array.from({ length: spec.axisRows[1] - spec.axisRows[0] + 1 }, (_, k) => (spec.axisRows[0] + k) * W + spec.axisCol);
    const axis = makeAxis({ win, positions, term: spec.id === "real" ? engine.phrase : null });
    const candidates = scanWindow({ win, grid, lexicon: lex, chance });
    const { items: short, counts } = shortlist({ candidates, axis });
    // engine confirmation of every shortlisted item
    const toCheck = short.map((c) => ({ key: `${c.text}|${c.start}|${c.skip}|${c.dir}`, term: c.text, start: c.start, skip: c.skip, dir: c.dir }));
    const rows = args["no-engine"] ? toCheck.map((t) => ({ key: t.key, letters_match: true, state: t.skip < 2 ? "PLAIN_TEXT_ROW" : "NOT_CHECKED" })) : await verifyItems(toCheck, { torah: letters, rpc, concurrency: 6 });
    const byKey = new Map(rows.map((r) => [r.key, r]));
    const kept = [], dropped = [];
    for (const c of short) { const r = byKey.get(`${c.text}|${c.start}|${c.skip}|${c.dir}`); c.verify = r.state; (args["no-engine"] || confirmed(r) ? kept : dropped).push(c); }
    const { items, relations } = finalizePool(kept);
    const types = relations.reduce((m, r) => ((m[r.type] = (m[r.type] ?? 0) + 1), m), {});
    const out = {
      id: spec.id, window: { width: W, r0: win.r0, r1: win.r1, c0: win.c0, c1: win.c1, nRows: win.nRows, nCols: win.nCols }, md5_window: md5(grid.join("")),
      axis: { positions: axis.positions, cells: axis.cells, skip: axis.skip, dir: axis.dir, family: axis.family, term: axis.term },
      rule: POOL_RULE, lexicon: { size: lex.size, digest: lexiconDigest(lex), gematria_rows_visible: g.rows, gematria_single_words: g.words.size },
      counts: { ...counts, candidates_total: candidates.length, shortlisted: short.length, engine_dropped: dropped.length, items: items.length, relations: relations.length, relation_types: types }, items: items.map(storable), relations,
    };
    writeFileSync(here(`./data/pools/${spec.id}.json`), `${JSON.stringify(out)}\n`);
    summary.push({ id: spec.id, ...out.counts, ms: Date.now() - started });
    console.log(JSON.stringify({ id: spec.id, candidates: candidates.length, shortlisted: short.length, dropped: dropped.length, items: items.length, relations: relations.length, types, tierCounts: counts, ms: Date.now() - started }));
  }
  writeFileSync(here("./review/pool-summary.json"), `${JSON.stringify(summary, null, 1)}\n`);
}
