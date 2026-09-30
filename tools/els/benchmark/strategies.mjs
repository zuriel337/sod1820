// ELS execution strategies — BENCHMARK PROTOTYPE (branch-only). Pure functions over a scope view; nothing here is
// an engine, store, or truth authority. Occurrence truth = "letters at start±k*skip equal the term" (exact);
// strategies differ ONLY in which exact occurrences they enumerate/select and what completeness they may claim.
import { lb, norm } from './corpus.mjs';
import { canonicalCompare } from './verify.mjs';

export const STRATEGY_VERSION = 'v1';
const DEFAULT_WORK_BUDGET = 3e7; // pair examinations (DB-work proxy) before a sampled strategy must stop

class Budget {
  constructor({ maxWork = Infinity, deadlineMs = Infinity } = {}) { this.n = 0; this.maxWork = maxWork; this.t0 = performance.now(); this.deadline = deadlineMs; this.stop = null; }
  tick() { // called from hot loops every 64k pair examinations
    if (this.n > this.maxWork) this.stop = 'WORK_BUDGET';
    else if (performance.now() - this.t0 > this.deadline) this.stop = 'TIMEOUT';
    return this.stop;
  }
}

// ── shared anchor setup: rarest-two-letter pair (same selection rule as legacy fwdSetup; stable tie order) ──
function setupFor(view, tt) {
  const L = tt.length, cnt = [];
  for (let k = 0; k < L; k++) { const l = view.lists[tt.charCodeAt(k) - 0x5d0]; if (!l.length) return null; cnt.push(l.length); }
  const ord = [...Array(L).keys()].sort((a, b) => cnt[a] - cnt[b]);
  let i = ord[0], j = ord[1]; if (i > j) { const t = i; i = j; j = t; }
  const mx = Math.floor((view.N - 1) / (L - 1)) || 1;
  return { L, i, j, g: j - i, Pi: view.lists[tt.charCodeAt(i) - 0x5d0], Pj: view.lists[tt.charCodeAt(j) - 0x5d0], mx, tt, tc: Array.from(tt, (c) => c.charCodeAt(0) - 0x5d0) };
}

/** Resumable exact scan of anchors [cur.a, aTo) restricted to skips [sLo,sHi]. Every emitted hit is fully verified. */
function scan(view, su, dir, sLo, sHi, cur, aTo, quota, out, bud, workLimit = Infinity) {
  const { L, i, g, Pi, Pj, mx, tc } = su, codes = view.codes, N = view.N;
  let got = 0;
  const hiSkip = Math.min(sHi, mx);
  while (cur.a < aTo) {
    const pi = Pi[cur.a], lo = pi + g * sLo, hi = pi + g * hiSkip;
    if (cur.b < 0) cur.b = lb(Pj, lo);
    for (; cur.b < Pj.length; cur.b++) {
      const pj = Pj[cur.b]; if (pj > hi) break;
      if ((++bud.n & 0x3fff) === 0 && (bud.tick() || bud.n > workLimit)) return false;
      const d = pj - pi; if (d % g) continue;
      const s = d / g; if (s < 1) continue;
      const start = pi - i * s, end = start + (L - 1) * s; if (start < 0 || end >= N) continue;
      let ok = true; for (let k = 0; k < L; k++) if (codes[start + k * s] !== tc[k]) { ok = false; break; }
      if (!ok) continue;
      out.push(dir === 1 ? { skip: s, dir: 1, start } : { skip: s, dir: -1, start: end });
      if (++got >= quota) { cur.b++; return false; }
    }
    cur.a++; cur.b = -1;
    if (bud.stop || bud.tick() || bud.n > workLimit) return false;
  }
  return true; // range exhausted
}

function prepare(view, rawTerm, sMin, sMax) {
  const t = norm(rawTerm); if (t.length < 2) return { t, bad: true };
  const L = t.length, full = Math.max(1, Math.floor((view.N - 1) / Math.max(1, L - 1)));
  const lo = Math.max(1, sMin ?? 1), hi = Math.min(full, sMax ?? full);
  const tb = [...t].reverse().join('');
  return { t, tb, L, lo, hi, full, fw: setupFor(view, t), bk: setupFor(view, tb), boundedSkip: hi < full || lo > 1 };
}
const emptyMeta = (name, policy) => ({ strategy: name, policy, version: STRATEGY_VERSION });

// ══ (A) EXACT_EXHAUSTIVE_V1 — canonical occurrence enumeration: the complete occurrence set in canonical order,
//     cap = first `cap` of that order (page semantics). No early exit; cost independent of cap.
export const EXACT_MAX_MATERIALIZED = 4e6; // occurrence-set size beyond which full materialisation is reported UNBOUNDED_COST
export function exactExhaustive(view, rawTerm, { cap = Infinity, skipMin, skipMax, deadlineMs = Infinity, maxMaterialized = EXACT_MAX_MATERIALIZED } = {}) {
  const p = prepare(view, rawTerm, skipMin, skipMax); const bud = new Budget({ deadlineMs });
  const meta = emptyMeta('EXACT_EXHAUSTIVE_V1', 'CANONICAL_ORDER_FIRST_N');
  if (p.bad) return { hits: [], meta: { ...meta, completeness: 'INVALID_TERM', exhaustive: false }, work: 0 };
  const all = [];
  for (const [su, dir] of [[p.fw, 1], [p.bk, -1]]) {
    if (!su) continue;
    scan(view, su, dir, p.lo, p.hi, { a: 0, b: -1 }, su.Pi.length, maxMaterialized - all.length, all, bud);
    if (all.length >= maxMaterialized) bud.stop = 'UNBOUNDED_COST';
    if (bud.stop) break;
  }
  if (bud.stop) return { hits: [], meta: { ...meta, completeness: bud.stop, exhaustive: false, not_found_authoritative: false }, work: bud.n, candidates: bud.n, timeout: true, unbounded: bud.stop === 'UNBOUNDED_COST' };
  all.sort(canonicalCompare);
  const hits = all.slice(0, cap);
  return { hits, total: all.length, meta: { ...meta, completeness: 'EXHAUSTIVE_COMPLETE', exhaustive: true, not_found_authoritative: all.length === 0, capped: all.length > cap, els_count: all.length }, work: bud.n, candidates: bud.n };
}

// ══ (B) ANCHOR_FAST_V1 — rarest-letter anchor, corpus-order scan with early exit at cap. Direction quota
//     ceil(cap/2) fwd first then remainder back, unused quota flows to the other direction (legacy-derived).
//     Result is a corpus-position PREFIX per direction ⇒ SAMPLED when the cap is hit; exact when the scan completes.
export function anchorFast(view, rawTerm, { cap = 400, skipMin, skipMax, deadlineMs = Infinity, maxWork = DEFAULT_WORK_BUDGET } = {}) {
  const p = prepare(view, rawTerm, skipMin, skipMax); const bud = new Budget({ maxWork, deadlineMs });
  const meta = emptyMeta('ANCHOR_FAST_V1', 'CORPUS_ORDER_PREFIX_DIR_HALF_CAP');
  if (p.bad) return { hits: [], meta: { ...meta, completeness: 'INVALID_TERM', exhaustive: false }, work: 0 };
  const cf = { a: 0, b: -1 }, cb = { a: 0, b: -1 }, hf = [], hb = [];
  let doneF = !p.fw, doneB = !p.bk;
  const half = Math.ceil(cap / 2);
  if (p.fw) doneF = scan(view, p.fw, 1, p.lo, p.hi, cf, p.fw.Pi.length, half, hf, bud);
  if (p.bk && !bud.stop) doneB = scan(view, p.bk, -1, p.lo, p.hi, cb, p.bk.Pi.length, cap - hf.length, hb, bud);
  if (!bud.stop && !doneF && hf.length + hb.length < cap) scan(view, p.fw, 1, p.lo, p.hi, cf, p.fw.Pi.length, cap - hf.length - hb.length, hf, bud), (doneF = cf.a >= p.fw.Pi.length);
  const exhausted = doneF && doneB && !bud.stop;
  return finish(meta, [hf, hb], exhausted, bud, cap, p);
}

// ══ (C) HYBRID_COVERAGE_V1 — anchor candidate generation + explicit stratified coverage policy, then exact verify.
//     Strata = direction × corpus-position segment (by anchor rank, SEG=8) × log-spaced skip band (BANDS=4).
//     Round-robin quota per stratum (resumable), leftover quota redistributed; stops at cap / work budget / all
//     strata exhausted. Complete-without-hitting-cap ⇒ exact set (canonical order); otherwise SAMPLED_PARTIAL.
export const HYBRID_SEG = 8, HYBRID_BANDS = 4;
export function skipBands(lo, hi, B = HYBRID_BANDS) {
  if (hi <= lo) return [[lo, hi]];
  const a = Math.log(lo), b = Math.log(hi + 1), edges = [lo];
  for (let k = 1; k < B; k++) { const e = Math.round(Math.exp(a + (b - a) * k / B)); if (e > edges[edges.length - 1]) edges.push(e); }
  edges.push(hi + 1);
  const out = []; for (let k = 0; k + 1 < edges.length; k++) out.push([edges[k], edges[k + 1] - 1]);
  return out;
}
export function hybridCoverage(view, rawTerm, { cap = 400, skipMin, skipMax, deadlineMs = Infinity, maxWork = DEFAULT_WORK_BUDGET } = {}) {
  const p = prepare(view, rawTerm, skipMin, skipMax); const bud = new Budget({ maxWork, deadlineMs });
  const meta = emptyMeta('HYBRID_COVERAGE_V1', `STRATIFIED_DIR${2}xSEG${HYBRID_SEG}xSKIPBAND${HYBRID_BANDS}_ROUND_ROBIN`);
  if (p.bad) return { hits: [], meta: { ...meta, completeness: 'INVALID_TERM', exhaustive: false }, work: 0 };
  const strata = [], bands = skipBands(p.lo, p.hi);
  for (const [su, dir] of [[p.fw, 1], [p.bk, -1]]) {
    if (!su) continue;
    const n = su.Pi.length, seg = Math.max(1, Math.ceil(n / HYBRID_SEG));
    for (let s = 0; s < HYBRID_SEG; s++) {
      const aFrom = s * seg, aTo = Math.min(n, aFrom + seg); if (aFrom >= aTo) continue;
      for (const [bl, bh] of bands) strata.push({ su, dir, seg: s, bl, bh, aTo, cur: { a: aFrom, b: -1 }, done: false, out: [] });
    }
  }
  let total = 0;
  const seen = new Set();
  let active = strata.length, quota = Math.max(1, Math.ceil(cap / Math.max(1, strata.length)));
  // work-fair rounds: each stratum gets a per-round work slice (doubling) so sparse strata cannot monopolise the budget
  let slice = Math.max(50000, Math.floor(maxWork / (Math.max(1, strata.length) * 16)));
  while (total < cap && active > 0 && !bud.stop) {
    for (const S of strata) {
      if (S.done || total >= cap || bud.stop) continue;
      const before = S.out.length;
      S.done = scan(view, S.su, S.dir, S.bl, S.bh, S.cur, S.aTo, Math.min(quota, cap - total), S.out, bud, bud.n + slice);
      total += S.out.length - before; if (S.done) active--;
    }
    quota = Math.max(1, Math.ceil((cap - total) / Math.max(1, active))); // leftover redistributed to unfinished strata
    slice *= 2;
  }
  const exhausted = active === 0 && !bud.stop && total < cap; // every stratum fully scanned without ever hitting the cap
  const hits = strata.flatMap((S) => S.out).filter((h) => { const k = `${h.skip}|${h.start}|${h.dir}`; if (seen.has(k)) return false; seen.add(k); return true; });
  const r = finish(meta, [hits], exhausted, bud, cap, p, strata.length);
  r.strata = { total: strata.length, exhausted: strata.length - active, populated: strata.filter((S) => S.out.length).length };
  return r;
}

function finish(meta, lists, exhausted, bud, cap, p, strataN) {
  let hits = lists.flat();
  if (exhausted) hits.sort(canonicalCompare);
  const completeness = bud.stop ? (bud.stop === 'TIMEOUT' ? 'TIMEOUT' : 'SAMPLED_PARTIAL_WORK_BUDGET') : exhausted ? 'EXHAUSTIVE_COMPLETE' : 'SAMPLED_PARTIAL_CAP';
  return {
    hits: hits.slice(0, cap),
    meta: {
      ...meta, completeness, exhaustive: exhausted, capped: !exhausted,
      not_found_authoritative: exhausted && hits.length === 0,           // sampled/partial no-hit is NEVER canonical NOT_FOUND
      no_hit_in_sample: !exhausted && hits.length === 0,
      ...(strataN ? { strata: strataN } : {}),
    },
    work: bud.n, candidates: bud.n, timeout: bud.stop === 'TIMEOUT',
  };
}

export const STRATEGIES = { EXACT_EXHAUSTIVE_V1: exactExhaustive, ANCHOR_FAST_V1: anchorFast, HYBRID_COVERAGE_V1: hybridCoverage };
