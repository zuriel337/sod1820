#!/usr/bin/env node
// Window statistics for the real pool, the diagnostic pool and the 12 control tiles (deterministic, no model), and the rank of the located known pair in the diagnostic pool.
//   node experiments/els-pool-selection/evaluation/pool-stats.mjs
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { collinearPairs, compactGroups, rankOfPair, rankedPairs, similarGroups, windowStats } from "../lib/metrics.mjs";

const here = (path) => new URL(path, import.meta.url);
const poolOf = (id) => JSON.parse(readFileSync(here(`../data/pools/${id}.json`), "utf8"));
const ids = readdirSync(here("../data/pools/")).map((f) => f.replace(".json", "")).filter((id) => id === "real" || id === "real-d1" || /^t\d\d$/.test(id)).sort();
const stats = ids.map((id) => windowStats(poolOf(id)));
const forced = JSON.parse(readFileSync(here("./d1-forced-ids.json"), "utf8")).forced;
const d1 = poolOf("real-d1");
const find = (text, family, first) => forced.find((f) => f.text === text && f.family === family && f.first[0] === first[0] && f.first[1] === first[1])?.id;
const iran = find("אירנ", "C", [9, 64]), usa = find("ארהב", "C", [15, 64]), danger = find("סיכנ", "C", [19, 65]), usaK = find("ארהב", "K1", [12, 61]), long = find("ארהבאששבת", "K1", [12, 61]);
const rel = (a, b) => d1.relations.find((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a)) ?? null;
const rank = (a, b, options) => rankOfPair(d1, a, b, options);
const pair = { ids: { iran, usa, danger, usaK, long }, relation_iran_usa: rel(iran, usa), relation_usa_danger: rel(usa, danger), relation_usa_usaK: rel(usa, usaK), relation_usaK_long: rel(usaK, long),
  rank_registered_score: { iran_usa: rank(iran, usa), usa_danger_all: rank(usa, danger), usa_danger_els: rank(usa, danger, { elsOnly: true }), pairs_scored_all: rankedPairs(d1).length, pairs_scored_els: rankedPairs(d1, { elsOnly: true }).length },
  compact_group_with_known: compactGroups(d1).filter((g) => g.ids.includes(iran) || g.ids.includes(usa)) };
const controls = stats.filter((s) => /^t\d\d$/.test(s.id));
const summaryOf = (key) => { const v = controls.map((s) => s[key]).sort((a, b) => a - b); return { min: v[0], median: v[Math.floor(v.length / 2)], max: v.at(-1), values: controls.map((s) => s[key]) }; };
const knownGroup = pair.compact_group_with_known[0] ?? null;
const out = { windows: stats, pair, controls_summary: { PP: summaryOf("PP"), PPA: summaryOf("PPA"), PXA: summaryOf("PXA"), collinear: summaryOf("collinear"), tight_pairs_or_more: summaryOf("tight_pairs_or_more"), compact_groups: summaryOf("compact_groups"), largest_group: summaryOf("largest_group") },
  controls_with_group_at_least_as_large_as_known: knownGroup ? controls.filter((s) => s.largest_group >= knownGroup.size).map((s) => s.id) : null,
  controls_with_any_collinear_pair_of_els_4plus: controls.filter((s) => s.collinear > 0).map((s) => s.id) };
writeFileSync(here("../review/pool-stats.json"), `${JSON.stringify(out, null, 1)}\n`);
console.log(JSON.stringify({ windows: stats.map((s) => ({ id: s.id, items: s.items, relations: s.relations, PP: s.PP, PPA: s.PPA, PXA: s.PXA, collinear: s.collinear, tight: s.tight_pairs_or_more, compact_groups: s.compact_groups, largest_group: s.largest_group })), pair, controls_summary: out.controls_summary, controls_with_group_at_least_as_large_as_known: out.controls_with_group_at_least_as_large_as_known, knownGroup }, null, 1));
