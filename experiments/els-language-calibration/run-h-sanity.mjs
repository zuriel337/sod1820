#!/usr/bin/env node
// EXP-14 check of the Hebrew-likeness signal at the candidate level (not part of the pre-registered rules): where does a lexicon word fall among random runs of its length?
//   node run-h-sanity.mjs --out results/exp14-h-sanity.json
import { writeFileSync } from "node:fs";
import { loadProductReader } from "./lib/product-reader.mjs";
import { axisOf } from "./lib/calibrate.mjs";
import { enumerateCandidates, windowLetters } from "./lib/ranking.mjs";
import { trainTrigram } from "./lib/signals.mjs";
import { plantingWords } from "./lib/planting.mjs";

const args = Object.fromEntries(process.argv.slice(2).map((item, i, all) => (item.startsWith("--") ? [item.slice(2), all[i + 1]] : null)).filter(Boolean));
const reader = loadProductReader({ htmlPath: "public/tzofen.html", lexiconPath: "public/els-dynamic-lexicon-v1.gz64.txt" });
const lexicon = await reader.loadLexicon();
reader.setScope("torah");
const model = trainTrigram(reader.letters, { limit: reader.torahLetters });
const words = plantingWords(lexicon.words.keys(), { min: 6, max: 8 });
const byLength = {};
let windows = 0;
for (let i = 1; windows < 6 && i < 1000; i += 1) {
  const skip = 50 + ((i * 7919 * 104729) % 4950);
  const start = (i * 104729 * 13) % (reader.torahLetters - 6 * skip);
  const box = reader.box(axisOf({ start, skip, dir: 1, length: 6 }));
  if (!box || box.cells < 1100) continue;
  windows += 1;
  for (const c of enumerateCandidates({ letterAt: windowLetters({ letters: reader.letters, box, streamLetters: reader.torahLetters }), box })) (byLength[c.len] ??= []).push(model.score(c.surface));
}
const out = { windows, share: 50 / 1345, lengths: {} };
for (const length of [6, 7, 8]) {
  const sorted = Float64Array.from(byLength[length]).sort();
  const sample = words.filter((w) => w.length === length).filter((_, i) => i % 7 === 0).map((w) => model.score(w));
  const percentile = (s) => { let lo = 0; let hi = sorted.length; while (hi > lo) { const mid = (lo + hi) >> 1; if (sorted[mid] < s) lo = mid + 1; else hi = mid; } return lo / sorted.length; };
  const pct = sample.map(percentile).sort((a, b) => a - b);
  const cut = sorted[Math.floor(sorted.length * (1 - out.share))];
  out.lengths[length] = { words: sample.length, nullRuns: sorted.length, medianPercentile: Number(pct[pct.length >> 1].toFixed(3)), p10: Number(pct[Math.floor(pct.length * 0.1)].toFixed(3)), p90: Number(pct[Math.floor(pct.length * 0.9)].toFixed(3)), shareAboveNullTop: Number((sample.filter((s) => s >= cut).length / sample.length).toFixed(3)) };
}
const text = JSON.stringify(out, null, 2);
if (args.out) writeFileSync(args.out, text); else console.log(text);
