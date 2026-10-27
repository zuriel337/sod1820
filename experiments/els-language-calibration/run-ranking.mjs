#!/usr/bin/env node
// EXP-11 runner.
//   node run-ranking.mjs --blind --out results/exp11-blind.json
//   node run-ranking.mjs --case gd02 [--scenario gd02-context] --blind-file results/exp11-blind.json --out results/exp11-gd02.json
import { readFileSync, writeFileSync } from "node:fs";
import { loadProductReader } from "./lib/product-reader.mjs";
import { axisOf } from "./lib/calibrate.mjs";
import { RANKERS, TOP_K, annotate, axisGeometry, describe, enumerateCandidates, parseCoverage, positionOf, rankFindings, tailTable, unionRank, windowLetters } from "./lib/ranking.mjs";

const args = Object.fromEntries(process.argv.slice(2).map((item, i, all) => (item.startsWith("--") ? [item.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] === undefined ? "true" : all[i + 1]] : null)).filter(Boolean));
const config = JSON.parse(readFileSync(new URL("./cases-exp11.json", import.meta.url), "utf8"));
const fold = (text) => text.replace(/[ךםןףץ]/g, (c) => ({ ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" })[c]);
const reader = loadProductReader({ htmlPath: args.html || "public/tzofen.html", lexiconPath: args.lexicon || "public/els-dynamic-lexicon-v1.gz64.txt" });
const lexicon = await reader.loadLexicon();
if (!lexicon) throw new Error("the dynamic lexicon did not load");
const hints = reader.newMap();
const cache = new Map();
const readings = (surface) => { let value = cache.get(surface); if (!value) { value = reader.readSurface(surface, hints, lexicon); cache.set(surface, value); } return value; };
const info = new Map();
const read = (surface) => {
  let value = info.get(surface);
  if (value) return value;
  const list = readings(surface);
  if (list.length) value = { readScore: 1, lexConf: Number(list[0].lexicalConfidence) || 0, bases: [...new Set(list.map((r) => r.baseTerm))] };
  else if ([...surface].length >= 6) value = { readScore: parseCoverage(surface, (sub) => readings(sub).length > 0), lexConf: 0, bases: [] };
  else value = { readScore: 0, lexConf: 0, bases: [] };
  info.set(surface, value);
  return value;
};

function buildWindow({ scope, axisSpec }) {
  reader.setScope(scope);
  const streamLetters = scope === "tanakh" ? reader.streamLetters : reader.torahLetters;
  const axis = axisOf(axisSpec);
  const box = reader.box(axis);
  const started = performance.now();
  const letterAt = windowLetters({ letters: reader.letters, box, streamLetters });
  const candidates = enumerateCandidates({ letterAt, box });
  annotate(candidates, { geometry: axisGeometry(axis.positions, box), read });
  return { axis, box, candidates, poolMs: performance.now() - started };
}

function blindWindows() {
  const spec = config.blind;
  const windows = [];
  reader.setScope("torah");
  for (let i = 1; windows.length < spec.windows && i < 1000; i += 1) {
    const skip = spec.skipBase + ((i * 7919 * 104729) % spec.skipSpan);
    const start = (i * 104729 * 13) % (reader.torahLetters - spec.axisLength * skip);
    const axis = axisOf({ start, skip, dir: 1, length: spec.axisLength });
    const box = reader.box(axis);
    if (box && box.cells >= spec.minCells) windows.push({ i, skip, start });
  }
  return windows;
}

function bestOf(candidates, ctx, name) { return rankFindings(candidates, name, ctx)[0] ?? null; }

if (args.blind) {
  const specs = blindWindows();
  const pass1 = [];
  for (const spec of specs) {
    const win = buildWindow({ scope: "torah", axisSpec: { start: spec.start, skip: spec.skip, dir: 1, length: config.blind.axisLength } });
    pass1.push({ spec, win });
    if (pass1.length % 5 === 0) process.stderr.write(`blind ${pass1.length}/${specs.length}\n`);
  }
  const tail = tailTable(pass1.map(({ win }) => win.candidates));
  const ctx = { tail, context: new Set() };
  const rows = pass1.map(({ spec, win }) => {
    const started = performance.now();
    const A = rankFindings(win.candidates, "A", ctx);
    const B = rankFindings(win.candidates, "B", ctx);
    const rankMs = performance.now() - started;
    return {
      i: spec.i, skip: spec.skip, start: spec.start, cells: win.box.cells, candidates: win.candidates.length, poolMs: Math.round(win.poolMs), rankMs: Math.round(rankMs),
      bestA: A[0] ? { len: A[0].candidate.len, score: A[0].tuple[0], lexConf: A[0].tuple[1] } : null, bestB: B[0] ? { tuple: B[0].tuple, len: B[0].candidate.len } : null,
      nA7: A.filter((f) => f.candidate.len >= 7).length, nB6: B.filter((f) => f.candidate.len >= 6).length,
    };
  });
  const median = (values) => { const s = values.slice().sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
  const out = { windows: rows, tail, medianA7: median(rows.map((r) => r.nA7)), medianB6: median(rows.map((r) => r.nB6)), medianCandidates: median(rows.map((r) => r.candidates)), medianPoolMs: median(rows.map((r) => r.poolMs)), provenance: reader.provenance };
  const text = JSON.stringify(out, null, 2);
  if (args.out) writeFileSync(args.out, text); else console.log(text);
} else {
  const blind = JSON.parse(readFileSync(args["blind-file"], "utf8"));
  const scenario = config.scenarios.find((s) => s.id === args.scenario) ?? null;
  const chosen = config.cases.find((c) => c.id === (scenario ? scenario.case : args.case));
  if (!chosen) throw new Error("unknown --case");
  const context = new Set((scenario?.context ?? []).map(fold));
  const ctx = { tail: blind.tail, context };
  const win = buildWindow({ scope: chosen.scope, axisSpec: chosen });
  const t0 = performance.now();
  const lists = { A: rankFindings(win.candidates, "A", ctx), B: rankFindings(win.candidates, "B", ctx) };
  if (context.size) lists.C = rankFindings(win.candidates, "C", ctx);
  const union = unionRank(lists, TOP_K);
  const rankMs = performance.now() - t0;
  reader.setScope(chosen.scope);
  const t1 = performance.now();
  const inspection = reader.inspect(win.axis, win.box, hints, lexicon);
  const productMs = performance.now() - t1;
  const cmp = (a, b) => { for (let i = 0; i < Math.min(a.length, b.length); i += 1) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };
  const share = (name, tuple) => {
    const values = blind.windows.map((w) => (name === "A" ? (w.bestA ? [w.bestA.score, w.bestA.lexConf] : null) : w.bestB?.tuple ?? null));
    const better = values.filter((v) => v && (name === "A" ? v[0] >= tuple[0] : cmp(v, tuple) >= 0)).length;
    return Number((better / values.length).toFixed(3));
  };
  const targets = chosen.targets.map((raw) => {
    const target = fold(raw);
    const placements = win.candidates.filter((c) => c.surface === target);
    const out = { target: raw, present: placements.length > 0, placements: placements.map(describe) };
    const pr = inspection;
    out.product = {
      inReadings: (pr.readings.findIndex((r) => r.canonicalLetters === target) + 1) || null, readings: pr.readings.length,
      inSegmentations: (pr.segmentations.findIndex((s) => s.canonicalLetters?.includes(target)) + 1) || null, segmentations: pr.segmentations.length,
      inBoundaries: (pr.boundaries.findIndex((b) => (b.leftContext + b.rightContext).includes(target)) + 1) || null, boundaries: pr.boundaries.length,
    };
    if (!placements.length) return out;
    const per = {};
    for (const name of Object.keys(lists)) {
      const eligible = placements.filter((c) => RANKERS[name].eligible(c, ctx));
      const position = positionOf(lists[name], placements);
      const best = eligible.length ? eligible.map((c) => ({ c, tuple: RANKERS[name].tuple(c, ctx) })).sort((x, y) => cmp(y.tuple, x.tuple))[0] : null;
      per[name] = { eligible: eligible.length > 0, rank: position, noiseBefore: position ? position - 1 : null, of: lists[name].length, tuple: best?.tuple ?? null, blindShare: best && name !== "C" ? share(name, best.tuple) : null };
    }
    out.rankers = per;
    const u = positionOf(union, placements);
    out.union = { rank: u, noiseBefore: u ? u - 1 : null, size: union.length, surfaced: u !== null && u <= TOP_K, tiers: u ? union[u - 1].tier : null };
    out.credible = out.union.surfaced && ["A", "B"].some((name) => per[name].rank && per[name].rank <= TOP_K && per[name].blindShare !== null && per[name].blindShare <= 0.2);
    return out;
  });
  const top = (list) => list.slice(0, TOP_K).map((f) => ({ ...describe(f.candidate), tuple: f.tuple }));
  const report = {
    case: chosen.id, scenario: scenario?.id ?? null, scope: chosen.scope, origin: scenario?.origin ?? chosen.origin, box: win.box, candidates: win.candidates.length,
    timeMs: { pool: Math.round(win.poolMs), rank: Math.round(rankMs), productReader: Math.round(productMs) }, targets,
    top10: { A: top(lists.A), B: top(lists.B), ...(lists.C ? { C: top(lists.C) } : {}), U: union.map((f) => ({ tier: f.tier, ...describe(f.candidate) })) },
    blindContext: { windows: blind.windows.length, tail: blind.tail, medianA7: blind.medianA7, medianB6: blind.medianB6 }, provenance: reader.provenance,
  };
  const text = JSON.stringify(report, null, 2);
  if (args.out) writeFileSync(args.out, text); else console.log(text);
}
