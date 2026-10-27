#!/usr/bin/env node
// EXP-13 runner.
//   node run-crossing.mjs --blind --out results/exp13-blind.json
//   node run-crossing.mjs --run --blind-file results/exp13-blind.json --exp11-blind results/exp11-blind.json --out results/exp13-cases.json
import { readFileSync, writeFileSync } from "node:fs";
import { loadProductReader } from "./lib/product-reader.mjs";
import { axisOf } from "./lib/calibrate.mjs";
import { makeReadInfo } from "./lib/reading.mjs";
import { RANKERS, TOP_K, annotate, axisGeometry, describe, enumerateCandidates, noiseAbove, positionOf, rankFindings, unionRank, windowLetters } from "./lib/ranking.mjs";
import { bestByLength, crossingScore, crossingTable, enumerateCrossing, rankerD } from "./lib/crossing.mjs";

const args = Object.fromEntries(process.argv.slice(2).map((item, i, all) => (item.startsWith("--") ? [item.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] === undefined ? "true" : all[i + 1]] : null)).filter(Boolean));
const config = JSON.parse(readFileSync(new URL("./cases-exp13.json", import.meta.url), "utf8"));
const fold = (text) => text.replace(/[ךםןףץ]/g, (c) => ({ ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" })[c]);
const reader = loadProductReader({ htmlPath: args.html || "public/tzofen.html", lexiconPath: args.lexicon || "public/els-dynamic-lexicon-v1.gz64.txt" });
const lexicon = await reader.loadLexicon();
if (!lexicon) throw new Error("the dynamic lexicon did not load");
const read = makeReadInfo({ reader, lexicon, hints: reader.newMap() });
const cmp = (a, b) => { for (let i = 0; i < Math.min(a.length, b.length); i += 1) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };
const streamOf = (scope) => (scope === "tanakh" ? reader.streamLetters : reader.torahLetters);

function crossingWindow({ scope, axisSpec }) {
  reader.setScope(scope);
  const axis = axisOf(axisSpec);
  const box = reader.box(axis);
  const geometry = axisGeometry(axis.positions, box);
  const letterAt = windowLetters({ letters: reader.letters, box, streamLetters: streamOf(scope) });
  const axisCells = axis.positions.map((p) => [Math.floor(p / box.S), p % box.S]);
  const t0 = performance.now();
  const candidates = enumerateCrossing({ letterAt, axisCells, axisLine: geometry.lineName });
  annotate(candidates, { geometry, read });
  return { axis, box, geometry, letterAt, candidates, ms: performance.now() - t0 };
}

function blindSpecs(scope, n) {
  const spec = config.blind;
  reader.setScope(scope);
  const out = [];
  for (let i = 1; out.length < 2 * spec.setSize && i < 20000; i += 1) {
    const skip = spec.skipBase + ((i * 7919 * 104729) % spec.skipSpan);
    const start = (i * 104729 * 13) % (streamOf(scope) - n * skip);
    const box = reader.box(axisOf({ start, skip, dir: 1, length: n }));
    if (box && box.cells >= spec.minCells) out.push({ i, skip, start });
  }
  return out;
}

if (args.blind) {
  const sets = {};
  for (const { scope, axisLength: n } of config.blind.sets) {
    const t0 = performance.now();
    const windows = blindSpecs(scope, n).map((spec) => {
      const win = crossingWindow({ scope, axisSpec: { start: spec.start, skip: spec.skip, dir: 1, length: n } });
      return { ...spec, cells: win.box.cells, crossing: win.candidates.length, best: bestByLength(win.candidates), ms: Math.round(win.ms) };
    });
    sets[`${scope}-${n}`] = { scope, axisLength: n, A: windows.slice(0, config.blind.setSize), B: windows.slice(config.blind.setSize), seconds: Math.round((performance.now() - t0) / 100) / 10 };
    process.stderr.write(`blind ${scope}-${n} done\n`);
  }
  const out = JSON.stringify({ sets, provenance: reader.provenance }, null, 1);
  if (args.out) writeFileSync(args.out, out); else console.log(out);
} else if (args.run) {
  const blind = JSON.parse(readFileSync(args["blind-file"], "utf8"));
  const exp11 = JSON.parse(readFileSync(args["exp11-blind"], "utf8"));
  const nullStat = (set, table) => set.B.map((w) => Math.max(0, ...Object.entries(w.best).map(([len, bucket]) => -Math.log10(table[len][bucket]))));
  const prepare = (scope, n) => {
    const set = blind.sets[`${scope}-${n}`];
    if (!set) throw new Error(`no blind set for ${scope}-${n}`);
    const table = crossingTable(set.A.map((w) => w.best));
    return { table, null: nullStat(set, table), set };
  };
  const windowResult = (win, prep) => {
    const ctx = { axisLine: win.geometry.lineName, crossTable: prep.table, context: new Set() };
    const D = rankFindings(win.candidates, rankerD, ctx);
    const S = Math.max(0, ...win.candidates.map((c) => crossingScore(c, prep.table)));
    const p = (1 + prep.null.filter((x) => x >= S).length) / (prep.null.length + 1);
    return { ctx, D, S: Number(S.toFixed(3)), p: Number(p.toFixed(4)) };
  };
  const out = { cases: [], siblings: [], knownCrossings: null, tables: {}, nullSummary: {}, provenance: reader.provenance };
  for (const key of Object.keys(blind.sets)) {
    const prep = prepare(blind.sets[key].scope, blind.sets[key].axisLength);
    out.tables[key] = prep.table;
    const sorted = prep.null.slice().sort((a, b) => a - b);
    out.nullSummary[key] = { windows: sorted.length, median: Number(sorted[sorted.length >> 1].toFixed(3)), p90: Number(sorted[Math.floor(sorted.length * 0.9)].toFixed(3)), max: Number(sorted.at(-1).toFixed(3)), meanCrossing: Math.round(blind.sets[key].B.reduce((s, w) => s + w.crossing, 0) / blind.sets[key].B.length), meanMs: Math.round(blind.sets[key].B.reduce((s, w) => s + w.ms, 0) / blind.sets[key].B.length) };
  }
  for (const c of config.cases) {
    const prep = prepare(c.scope, c.length);
    const win = crossingWindow({ scope: c.scope, axisSpec: c });
    const wr = windowResult(win, prep);
    // the full pool is needed only for the combined list and to locate targets that do not cross
    const tFull = performance.now();
    const full = enumerateCandidates({ letterAt: win.letterAt, box: win.box });
    annotate(full, { geometry: win.geometry, read });
    const ctx11 = { tail: exp11.tail, context: new Set() };
    const A = rankFindings(full, "A", ctx11);
    const B = rankFindings(full, "B", ctx11);
    const U2 = unionRank({ A, B, D: wr.D }, TOP_K);
    const U1 = unionRank({ A, B }, TOP_K);
    const fullMs = performance.now() - tFull;
    const targets = c.targets.map((raw) => {
      const target = fold(raw);
      const placements = full.filter((x) => x.surface === target);
      const row = { target: raw, present: placements.length > 0, placements: placements.map(describe) };
      if (!placements.length) return row;
      const crossing = placements.filter((x) => x.cross && x.line !== win.geometry.lineName && x.readScore >= 0.75);
      row.crossing = placements.some((x) => x.cross && x.line !== win.geometry.lineName);
      row.crossingEligible = crossing.length > 0;
      const uo = positionOf(U2, placements);
      const u1 = positionOf(U1, placements);
      row.unionBefore = { rank: u1, surfaced: u1 !== null && u1 <= TOP_K };
      row.unionWithCrossing = { rank: uo, surfaced: uo !== null && uo <= TOP_K };
      if (crossing.length) {
        const best = crossing.map((x) => ({ x, tuple: rankerD.tuple(x, wr.ctx) })).sort((a, b) => cmp(b.tuple, a.tuple))[0];
        const rank = positionOf(wr.D, crossing);
        const share = Number((prep.null.filter((s) => s >= best.tuple[0]).length / prep.null.length).toFixed(3));
        row.D = { X: Number(best.tuple[0].toFixed(3)), regionRank: rank, exactNoiseBefore: noiseAbove(wr.D, crossing, best.tuple, cmp), of: wr.D.length, blindShare: share, lifted: rank !== null && rank <= TOP_K, credible: rank !== null && rank <= TOP_K && share <= 0.1 };
      }
      return row;
    });
    out.cases.push({ id: c.id, scope: c.scope, origin: c.origin, box: win.box, crossingCandidates: win.candidates.length, crossingFindings: wr.D.length, S: wr.S, p: wr.p, timeMs: { crossing: Math.round(win.ms), fullPoolForUnion: Math.round(fullMs) }, targets, top5D: wr.D.slice(0, 5).map((f) => ({ ...describe(f.candidate), X: Number(f.tuple[0].toFixed(3)) })), unionWithCrossing: U2.map((f) => ({ tier: f.tier, ...describe(f.candidate) })) });
  }
  const sib = config.siblings;
  const prepSib = prepare(sib.scope, sib.length);
  for (const o of sib.occurrences) {
    reader.setScope(sib.scope);
    const spec = { start: o.start, skip: o.skip, dir: o.dir, length: sib.length };
    const axis = axisOf(spec);
    const letters = axis.positions.map((p) => reader.letters[p]).join("");
    if (letters !== fold(sib.cipher)) throw new Error(`${o.id}: the engine occurrence does not spell the cipher (${letters})`);
    const box = reader.box(axis);
    if (!box || box.cells < config.blind.minCells) { out.siblings.push({ id: o.id, skip: o.skip, comparable: false, cells: box?.cells ?? 0 }); continue; }
    const win = crossingWindow({ scope: sib.scope, axisSpec: spec });
    const wr = windowResult(win, prepSib);
    out.siblings.push({ id: o.id, skip: o.skip, comparable: true, cells: win.box.cells, crossingFindings: wr.D.length, S: wr.S, p: wr.p, ms: Math.round(win.ms), top3: wr.D.slice(0, 3).map((f) => ({ surface: f.candidate.surface, len: f.candidate.len, line: f.candidate.line, X: Number(f.tuple[0].toFixed(3)) })) });
    if (o.id === config.knownCrossings.sibling) {
      const pairs = config.knownCrossings.targets.map((raw) => {
        const target = fold(raw);
        const placements = win.candidates.filter((x) => x.surface === target);
        const eligible = placements.filter((x) => x.readScore >= 0.75);
        const row = { target: raw, crossingPlacements: placements.length, eligible: eligible.length };
        if (eligible.length) {
          const best = eligible.map((x) => ({ x, tuple: rankerD.tuple(x, wr.ctx) })).sort((a, b) => cmp(b.tuple, a.tuple))[0];
          const rank = positionOf(wr.D, eligible);
          row.D = { X: Number(best.tuple[0].toFixed(3)), regionRank: rank, exactNoiseBefore: noiseAbove(wr.D, eligible, best.tuple, cmp), of: wr.D.length, blindShare: Number((prepSib.null.filter((s) => s >= best.tuple[0]).length / prepSib.null.length).toFixed(3)) };
        }
        return row;
      });
      out.knownCrossings = { sibling: o.id, origin: config.knownCrossings.origin, targets: pairs };
    }
  }
  const comparable = out.siblings.filter((s) => s.comparable);
  out.summary = { siblingWindows: comparable.length, siblingsUnusual: comparable.filter((s) => s.p <= 0.05).length, expectedFalseAlarms: Number((0.05 * comparable.length).toFixed(2)), devUnusual: out.cases.filter((c) => c.p <= 0.05).map((c) => c.id) };
  const text = JSON.stringify(out, null, 1);
  if (args.out) writeFileSync(args.out, text); else console.log(text);
} else throw new Error("use --blind or --run");
