#!/usr/bin/env node
// Offline analysis of the located saved words (reads evaluation/locate-saved-result.json, written by locate-saved.mjs). No model, no engine call. Answers, with numbers:
//   - the letters between two located words on one ELS line (a longer ELS?),
//   - the relation of every located occurrence to every other and to the axis (registered relation definitions),
//   - the connected structure (cluster) the located occurrences form, and how much of it is plain text rows (chance level for common words),
//   - for each saved word: where it was lost on the way into the pool (word list / region / families / maximal rule / shortlist).
import { readFileSync, writeFileSync } from "node:fs";
import { pageLetters } from "../../els-live-reading/build-windows.mjs";
import { TORAH_LENGTH } from "../../els-live-reading/lib/metrics.mjs";
import { makeWindow, positionAt } from "../lib/geometry.mjs";
import { geometryOf, relationOf } from "../lib/relations.mjs";

const here = (path) => new URL(path, import.meta.url);
const located = JSON.parse(readFileSync(here("./locate-saved-result.json"), "utf8"));
const pool = JSON.parse(readFileSync(here("../data/pools/real.json"), "utf8"));
const letters = pageLetters("public/tzofen.html").slice(0, TORAH_LENGTH);
const win = makeWindow({ width: pool.window.width, r0: pool.window.r0, r1: pool.window.r1, c0: pool.window.c0, c1: pool.window.c1 });
const occs = located.words.flatMap((w, wi) => w.occurrences.map((o, k) => ({ ...o, word: w.text, ref: `${w.text}#${k + 1}`, wordIndex: wi, inList: w.in_word_list })));
const geo = new Map(occs.map((o) => [o.ref, geometryOf({ family: o.family, cells: o.cells })]));
const withGeo = (o) => ({ family: o.family, dir: o.dir, cells: o.cells, geo: geo.get(o.ref) });
const result = { relations: [], sameLineLetters: [], cluster: null, loss: [] };

// (1) occurrences on one ELS line: the letters of the stream between two of them (positions normalised to ascending stream order)
const ascending = (o) => { const p = o.cells.map(([i, j]) => positionAt(win, i, j)); return p[0] <= p.at(-1) ? p : p.slice().reverse(); };
for (const a of occs) for (const b of occs) {
  if (a.ref >= b.ref || a.family !== b.family || a.skip !== b.skip || a.skip < 2) continue;
  const [lo, hi] = ascending(a)[0] <= ascending(b)[0] ? [a, b] : [b, a];
  const plo = ascending(lo), phi = ascending(hi), step = a.skip;
  const distance = phi[0] - plo.at(-1);
  if (distance <= 0 || distance % step !== 0 || distance / step - 1 > 6) continue; // not on the same arithmetic line, overlapping, or too far
  const between = [];
  for (let p = plo.at(-1) + step; p < phi[0]; p += step) between.push({ pos: p, cell: [Math.floor(p / win.width) - win.r0 + 1, (p % win.width) - win.c0 + 1], letter: letters[p] });
  result.sameLineLetters.push({ first: lo.ref, second: hi.ref, step, gap: between.length, between, whole_ascending: [...plo, ...between.map((x) => x.pos), ...phi].map((p) => letters[p]).join("") });
}

// (2) relations among all occurrences (registered definitions); the non-list words first, ישראל occurrences only as partners
for (let x = 0; x < occs.length; x += 1) for (let y = x + 1; y < occs.length; y += 1) {
  const a = occs[x], b = occs[y];
  if (a.word === b.word && !(a.text !== undefined)) continue;
  if (a.word === "ישראל" && b.word === "ישראל") continue;
  const rel = relationOf(withGeo(a), withGeo(b), geo.get(a.ref), geo.get(b.ref));
  if (rel) result.relations.push({ a: a.ref, b: b.ref, aWhere: `${a.family}${a.dir > 0 ? "+" : "-"} (${a.first})→(${a.last})`, bWhere: `${b.family}${b.dir > 0 ? "+" : "-"} (${b.first})→(${b.last})`, ...rel, same_direction: a.dir === b.dir });
}

// (3) the connected structure of the occurrences of the words that are not in the word list, plus every ישראל occurrence that relates to them
const core = occs.filter((o) => !o.inList);
const reach = new Set(core.map((o) => o.ref));
const edges = result.relations.filter((r) => reach.has(r.a) || reach.has(r.b));
const members = new Set(edges.flatMap((r) => [r.a, r.b]).concat([...reach]));
result.cluster = { members: [...members], edges: edges.map((r) => ({ a: r.a, b: r.b, type: r.type, offset: r.offset, overlap: r.overlap, gap: r.gap, shared: r.shared, distance: r.distance, same_direction: r.same_direction })),
  plain_text_members: [...members].filter((m) => occs.find((o) => o.ref === m).family === "R"), note: "relations to the plain-text row are weak evidence for a common word: the Torah text itself contains it many times" };

// (4) where each saved word was lost
for (const w of located.words) {
  const poolHit = w.occurrences.filter((o) => o.in_pool).length, cand = w.occurrences.filter((o) => o.candidate).length;
  let reason;
  if (!w.in_word_list) reason = "word list (the word is in neither source: single-word rows of gematria_words or Tanakh forms, length 4-9)";
  else if (w.occurrences_in_window === 0) reason = "region or families (no occurrence along the registered families inside the region)";
  else if (cand < w.occurrences_in_window) reason = `maximal-per-reading rule dropped ${w.occurrences_in_window - cand} of ${w.occurrences_in_window} occurrences (contained in a longer word-list word on the same reading)`;
  else reason = "";
  if (w.in_word_list && cand > poolHit) reason += `${reason ? "; " : ""}shortlist cut ${cand - poolHit} of ${cand} candidates`;
  result.loss.push({ word: w.text, in_word_list: w.in_word_list, occurrences: w.occurrences_in_window, candidates: cand, in_pool: poolHit, lost_at: poolHit === w.occurrences_in_window ? "none" : reason });
}
writeFileSync(here("./analyse-saved-result.json"), `${JSON.stringify(result, null, 1)}\n`);
console.log(JSON.stringify({ sameLineLetters: result.sameLineLetters, relationsAmongNonList: result.relations.filter((r) => !r.a.startsWith("ישראל") && !r.b.startsWith("ישראל")), cluster: { members: result.cluster.members, edges: result.cluster.edges, plain: result.cluster.plain_text_members }, loss: result.loss }, null, 1));
