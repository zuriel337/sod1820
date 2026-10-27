#!/usr/bin/env node
// EXP-09 runner. node run.mjs --case gd02 [--shifts 100] [--html public/tzofen.html] [--lexicon public/els-dynamic-lexicon-v1.gz64.txt] [--out file.json]
import { readFileSync, writeFileSync } from "node:fs";
import { loadProductReader } from "./lib/product-reader.mjs";
import { PRIMARY_METRIC, SECONDARY_METRICS, axisOf, compare, metricsOf, shiftedAxes } from "./lib/calibrate.mjs";

const args = Object.fromEntries(process.argv.slice(2).map((item, i, all) => (item.startsWith("--") ? [item.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] === undefined ? "true" : all[i + 1]] : null)).filter(Boolean));
const cases = JSON.parse(readFileSync(new URL("./cases.json", import.meta.url), "utf8")).cases;
const chosen = cases.find((entry) => entry.id === args.case);
if (!chosen) throw new Error(`--case must be one of ${cases.map((entry) => entry.id).join(", ")}`);
const reader = loadProductReader({ htmlPath: args.html || "public/tzofen.html", lexiconPath: args.lexicon || "public/els-dynamic-lexicon-v1.gz64.txt" });
reader.setScope(chosen.scope);
const lexicon = await reader.loadLexicon();
if (!lexicon) throw new Error("the dynamic lexicon did not load (size/hash check of the product failed)");
const streamLetters = chosen.scope === "tanakh" ? reader.streamLetters : reader.torahLetters;
const axis = axisOf(chosen);
const box = reader.box(axis);
const started = Date.now();
const realInspection = reader.inspect(axis, box, reader.newMap(), lexicon);
const real = metricsOf(realInspection);
const windows = shiftedAxes({ axis, box, boxOf: (moved) => reader.box(moved), streamLetters, count: Number(args.shifts || 100) });
const shifted = windows.map((entry) => metricsOf(reader.inspect(entry.axis, entry.box, reader.newMap(), lexicon)));
const comparison = compare({ real, shifted });
const lookups = (chosen.look || []).map((text) => {
  const base = text.replace(/[ךםןףץ]/g, (c) => ({ ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" })[c]);
  const inReadings = realInspection.readings.filter((r) => r.canonicalLetters?.includes(base) || base.includes(r.canonicalLetters || "\u0000")).length;
  const inSegmentations = realInspection.segmentations.filter((s) => s.canonicalLetters?.includes(base)).length;
  const inBoundaries = realInspection.boundaries.filter((b) => `${b.leftContext}${b.rightContext}`.includes(base) || (b.leftContext + b.rightContext).includes(base)).length;
  return { text, canonical: base, readingsContaining: inReadings, segmentationsContaining: inSegmentations, boundaryContextsContaining: inBoundaries };
});
const report = {
  case: chosen.id, scope: chosen.scope, axis: { start: chosen.start, skip: chosen.skip, dir: chosen.dir, length: chosen.length }, box,
  windowsMoved: windows.length, movedFirstLetters: windows.slice(0, 5).map((entry) => entry.axis.positions[0]), elapsedMs: Date.now() - started,
  primaryMetric: PRIMARY_METRIC, secondaryMetrics: SECONDARY_METRICS, comparison,
  primary: comparison[PRIMARY_METRIC], unusual: comparison[PRIMARY_METRIC].p <= 0.05 && !comparison[PRIMARY_METRIC].saturated,
  topReadings: realInspection.readings.slice(0, 6).map((r) => ({ letters: r.exactLetters, relation: r.relation, source: r.source, length: r.length })),
  topRelation: realInspection.relations[0] ? { score: realInspection.relations[0].candidateScore, geometry: realInspection.relations[0].geometry, tokens: realInspection.relations[0].tokens.map((t) => t.exactLetters) } : null,
  lookups, provenance: reader.provenance, lexiconEntries: lexicon.profile.entryCount,
};
const text = JSON.stringify(report, null, 2);
if (args.out) writeFileSync(args.out, text); else console.log(text);
