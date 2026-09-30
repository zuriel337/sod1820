// Three internal execution strategies behind ONE ELS boundary (els_research_layer_law v9 /
// els_single_engine_law v2). None of them is a truth authority: every returned occurrence is an exact
// letter match over the canonical stream and is replay-verified separately (verify.mjs).
//
//   EXACT_EXHAUSTIVE_V1   — models els_occurrences_internal_v1 / els_search_core_v1: first-two-letter pair
//                            join over the whole skip domain, ALL occurrences, ordered (skip,start,fwd-first),
//                            then top-`cap`. Truncation is a pure LIMIT over a fully counted result.
//   ANCHOR_FAST_V1        — rarest-two-letter anchor scan (legacy strength) with early exit at `cap`.
//                            Selection policy = ANCHOR_CORPUS_PREFIX_V1 (first occurrences in corpus order).
//   HYBRID_COVERAGE_V1    — same anchor candidate generation, but sliced into (direction × skip band ×
//                            corpus segment) cells drained round-robin, so a capped result is spread over
//                            corpus position and skip magnitude. Selection policy = STRATIFIED_CELL_ROUND_ROBIN_V1.
//
// Occurrence TRUTH (which occurrences exist) is separated from SELECTION POLICY (which `cap` of them are
// returned): the enumerators below only emit exact occurrences; the policy only picks/orders among them.
import { performance } from 'node:perf_hooks';
import { getScope, sha256, normalizeTerm } from './corpus.mjs';

export const STRATEGY = {
  EXACT: { id: 'EXACT_EXHAUSTIVE_V1', version: 1, exhaustive: true, policy: 'CANONICAL_ORDER_LIMIT_V1' },
  ANCHOR: { id: 'ANCHOR_FAST_V1', version: 1, exhaustive: false, policy: 'ANCHOR_CORPUS_PREFIX_V1' },
  HYBRID: { id: 'HYBRID_COVERAGE_V1', version: 1, exhaustive: false, policy: 'STRATIFIED_CELL_ROUND_ROBIN_V1' },
};

export const MAX_ROWS = 8_000_000 ;          // materialization ceiling for the exhaustive enumerator
export const SKIP_BANDS = [2, 4, 16, 64, 256, 1024, 4096, 16384, 65536];   // band lower edges (geometric ×4)
export const SEGMENTS = 8;                    // corpus-position strata

class Timeout extends Error { constructor(kind = 'TIME_BUDGET') { super(kind); this.kind = kind; } }

class Budget {
  constructor(ms) { this.deadline = ms == null ? Infinity : performance.now() + ms; this.n = 0; }
  tick() { if ((++this.n & 0x3fff) === 0 && performance.now() > this.deadline) throw new Timeout(); }
}

// Occurrence keys: order-preserving pack of (skip asc, start asc, fwd before back). < 2^43, exact in a double.
const KS = 2 ** 21;
export const packKey = (skip, start, dir) => (skip * KS + start) * 2 + (dir === 1 ? 0 : 1);
export const unpackKey = key => {
  const dirBit = key % 2, q = (key - dirBit) / 2, start = q % KS, skip = (q - start) / KS;
  return { skip, start, dir: dirBit === 0 ? 1 : -1 };
};

class KeyBuf {
  constructor() { this.a = new Float64Array(1 << 16); this.n = 0; }
  push(k) {
    if (this.n === this.a.length) {
      if (this.n >= MAX_ROWS) throw new Timeout('MEMORY_BUDGET');
      const b = new Float64Array(this.a.length * 2); b.set(this.a); this.a = b;
    }
    this.a[this.n++] = k;
  }
  sorted() { const v = this.a.subarray(0, this.n); v.sort(); return v; }
}

function lowerBound(a, x, lo = 0, hi = a.length) {
  while (lo < hi) { const m = (lo + hi) >>> 1; if (a[m] < x) lo = m + 1; else hi = m; }
  return lo;
}

function prepare(scope, rawTerm, maxskip) {
  const view = getScope(scope);
  const term = normalizeTerm(rawTerm);
  const L = term.length;
  if (L < 2) throw new Error('ELS search requires at least 2 normalized Hebrew letters');
  const fullMax = Math.max(1, Math.floor((view.n - 1) / Math.max(1, L - 1)));
  const smax = Math.min(fullMax, Math.max(2, maxskip));   // the harness lets the full domain through (core clamps at 20000)
  return { view, term, L, fullMax, smax };
}

// ── EXACT_EXHAUSTIVE_V1 ─────────────────────────────────────────────────────────
/** Enumerate ALL occurrences (skip 2..smax, both directions) → packed sorted keys. */
export function enumerateExact(view, term, smax, budget, stats) {
  const L = term.length, n = view.n, text = view.text;
  const P1 = view.pos.get(term[0]), P2 = view.pos.get(term[1]);
  const buf = new KeyBuf();
  if (!P1 || !P2 || smax < 2) return buf.sorted();
  for (let x = 0; x < P1.length; x++) {
    const a = P1[x];
    // forward pair-join rows: c2 within [a+2, a+smax]
    for (let y = lowerBound(P2, a + 2); y < P2.length; y++) {
      const b = P2[y]; if (b > a + smax) break;
      budget.tick(); stats.candidates++;
      const skip = b - a;
      if (a + (L - 1) * skip > n - 1) continue;
      let ok = true;
      for (let j = 2; j < L; j++) { stats.compares++; if (text[a + j * skip] !== term[j]) { ok = false; break; } }
      if (ok) buf.push(packKey(skip, a, 1));
    }
    // backward pair-join rows: c2 within [a-smax, a-2]
    for (let y = lowerBound(P2, a - smax); y < P2.length; y++) {
      const b = P2[y]; if (b > a - 2) break;
      budget.tick(); stats.candidates++;
      const skip = a - b;
      if (a - (L - 1) * skip < 0) continue;
      let ok = true;
      for (let j = 2; j < L; j++) { stats.compares++; if (text[a - j * skip] !== term[j]) { ok = false; break; } }
      if (ok) buf.push(packKey(skip, a, -1));
    }
  }
  stats.rowsMaterialized = buf.n;
  return buf.sorted();
}

// ── anchor candidate generation (shared by ANCHOR_FAST_V1 and HYBRID_COVERAGE_V1) ──
/** Rarest-two-letter anchor setup for one directional term (fwd term, or reversed term for back). */
function anchorSetup(view, tt) {
  const L = tt.length;
  const ord = [...Array(L).keys()].sort((a, b) => (view.pos.get(tt[a])?.length ?? 0) - (view.pos.get(tt[b])?.length ?? 0));
  let i = ord[0], j = ord[1]; if (i > j) [i, j] = [j, i];
  const Pi = view.pos.get(tt[i]), Pj = view.pos.get(tt[j]);
  if (!Pi || !Pj) return null;
  return { L, i, j, g: j - i, Pi, Pj };
}

/**
 * Exact-hit generator over anchors [aFrom,aTo) and skips [skipLo,skipHi]. Yields forward-oriented starts of `tt`.
 * The letter loop verifies EVERY position, so a yielded hit is an exact occurrence by construction.
 */
function* anchorScan(view, tt, su, skipLo, skipHi, aFrom, aTo, budget, stats) {
  const { L, i, g, Pi, Pj } = su, text = view.text, n = view.n;
  for (let a = aFrom; a < aTo; a++) {
    const pi = Pi[a], lo = pi + g * skipLo, hi = pi + g * skipHi;
    for (let b = lowerBound(Pj, lo); b < Pj.length; b++) {
      const pj = Pj[b]; if (pj > hi) break;
      budget.tick(); stats.candidates++;
      const d = pj - pi; if (d % g) continue;
      const s = d / g;
      const start = pi - i * s, end = start + (L - 1) * s;
      if (start < 0 || end >= n) continue;
      let ok = true;
      for (let k = 0; k < L; k++) { stats.compares++; if (text[start + k * s] !== tt[k]) { ok = false; break; } }
      if (ok) yield { skip: s, start };
    }
  }
}

const reverse = s => s.split('').reverse().join('');
/** Map a hit of the directional term to the canonical occurrence (start = first letter of the searched expression). */
const toCanon = (h, dir, L) => (dir === 1 ? { skip: h.skip, dir: 1, start: h.start } : { skip: h.skip, dir: -1, start: h.start + (L - 1) * h.skip });

// ── ANCHOR_FAST_V1 ─────────────────────────────────────────────────────────────
function runAnchor(ctx, cap, budget, stats) {
  const { view, term, L, smax } = ctx;
  const dirs = [{ dir: 1, tt: term }, { dir: -1, tt: reverse(term) }];
  const out = []; let complete = true;
  const fwdQuota = Math.ceil(cap / 2);
  for (const d of dirs) {
    const su = anchorSetup(view, d.tt); if (!su) continue;
    // direction isolation (legacy strength): forward may not starve back — forward keeps ceil(cap/2) when it saturates.
    const limit = d.dir === 1 ? cap : cap - out.length;
    const got = [];
    for (const h of anchorScan(view, d.tt, su, 2, smax, 0, su.Pi.length, budget, stats)) {
      got.push(toCanon(h, d.dir, L));
      if (got.length >= limit) { complete = false; break; }
    }
    if (d.dir === 1 && got.length >= cap) out.push(...got.slice(0, fwdQuota)); else out.push(...got);
  }
  return { hits: out, complete };
}

// ── HYBRID_COVERAGE_V1 ─────────────────────────────────────────────────────────
export function bandEdges(smax) {
  const lows = SKIP_BANDS.filter(b => b <= smax);
  return lows.map((lo, k) => ({ lo, hi: k + 1 < lows.length ? Math.min(smax, lows[k + 1] - 1) : smax }));
}

function runHybrid(ctx, cap, budget, stats) {
  const { view, term, L, smax } = ctx, n = view.n;
  const bands = bandEdges(smax);
  const cells = [];
  const setups = [{ dir: 1, tt: term }, { dir: -1, tt: reverse(term) }].map(d => ({ ...d, su: anchorSetup(view, d.tt) }));
  // Deterministic low-discrepancy visiting order: every (band, segment, direction) appears exactly once,
  // and consecutive cells differ in band AND segment.
  for (let step = 0; step < SEGMENTS; step++) {
    for (let b = 0; b < bands.length; b++) {
      const seg = (b * 3 + step) % SEGMENTS;
      for (const d of setups) {
        if (!d.su) continue;
        const from = lowerBound(d.su.Pi, Math.floor(seg * n / SEGMENTS)), to = lowerBound(d.su.Pi, Math.floor((seg + 1) * n / SEGMENTS));
        if (from >= to) continue;
        cells.push({ d, band: b, seg, gen: anchorScan(view, d.tt, d.su, bands[b].lo, bands[b].hi, from, to, budget, stats), done: false });
      }
    }
  }
  const out = [];
  let active = cells.length;
  while (out.length < cap && active > 0) {
    const q = Math.max(1, Math.floor((cap - out.length) / active));
    for (const c of cells) {
      if (c.done) continue;
      for (let t = 0; t < q && out.length < cap; t++) {
        const r = c.gen.next();
        if (r.done) { c.done = true; active--; break; }
        out.push(toCanon(r.value, c.d.dir, L));
      }
      if (out.length >= cap) break;
    }
  }
  return { hits: out, complete: active === 0 && out.length < cap };
}

// ── result assembly (els_search_result_v1-shaped, with explicit strategy/partial provenance) ──
function hitObject(ctx, h) {
  const { view, term, L, smax } = ctx;
  return {
    occurrence_id: `els:${view.corpusId}:${term}:${h.skip}:${h.dir}:${h.start}`,
    skip: h.skip, dir: h.dir, direction: h.dir === 1 ? 'fwd' : 'back',
    start: h.start, end: h.start + h.dir * h.skip * (L - 1),
    positions: Array.from({ length: L }, (_, k) => h.start + h.dir * h.skip * k),
    coordinate_convention: 'zero_based_character_index',
    dependency_group: `els:${view.corpusId}:${sha256(term)}:skip2-${smax}`,
  };
}

const canonCompare = (a, b) => a.skip - b.skip || a.start - b.start || b.dir - a.dir;

function buildResult(ctx, strat, { hits, total, scanComplete, timeout, cap, maxskipRequested }) {
  const { view, term, L, smax, fullMax } = ctx;
  const sorted = [...hits].sort(canonCompare);
  const objs = sorted.map(h => hitObject(ctx, h));
  const exhaustiveWithinDomain = scanComplete && !timeout;
  const truncated = total != null ? total > objs.length : !exhaustiveWithinDomain;
  const partial = !exhaustiveWithinDomain || (!strat.exhaustive && truncated);
  const coverage = partial ? 'sampled_partial' : (smax >= fullMax ? 'full_skip_domain' : 'bounded_partial');
  const status = timeout ? 'TIMEOUT' : (objs.length === 0 && exhaustiveWithinDomain ? 'EXECUTED_EMPTY' : 'OK');
  return {
    contract: 'els_search_result_v1',
    status, scope: view.scope, corpus_id: view.corpusId,
    input: { raw: term, normalized: term, length: L, language: 'he', script: 'Hebrew' },
    selection_protocol: null,
    engine: { id: 'els-sql-core', version: 2, owner: 'els_research_layer_law:v9', single_engine_owner: 'els_single_engine_law:v2' },
    execution_strategy: { id: strat.id, version: strat.version, exhaustive: strat.exhaustive, selection_policy: strat.policy },
    coordinate: { position_base: 0, space: 'canonical_corpus_character_index', start_semantics: 'first_letter_of_searched_expression', direction_values: { fwd: 1, back: -1 } },
    search: { skip_min: 2, skip_max_requested: maxskipRequested, skip_max_executed: smax, full_domain_max: fullMax, max_hits: cap, directions: ['fwd', 'back'], plain_excluded: true, ordering: 'skip,start,forward-before-back-on-exact-tie' },
    els_count: total, hits: objs,
    dependency_group: `els:${view.corpusId}:${sha256(term)}:skip2-${smax}`,
    completion: {
      executed: !timeout || objs.length > 0, state: status, coverage, scan_complete: exhaustiveWithinDomain,
      // A sampled/partial run never asserts absence: negative only after a completed scan of the requested domain.
      negative: exhaustiveWithinDomain && objs.length === 0,
      truncated, total_hits: total, returned_hits: objs.length,
      partial, selection_policy: strat.policy, timeout: timeout ?? null,
    },
  };
}

/**
 * Run one strategy. Returns { result, stats, ms }.
 * opts: { scope, term, maxskip (null ⇒ full domain), cap, budgetMs, exactKeys? (reuse a completed enumeration) }
 */
export function runStrategy(strategyKey, { scope, term: rawTerm, maxskip = null, cap, budgetMs = 20000, exactKeys = null }) {
  const strat = STRATEGY[strategyKey];
  const ctx = prepare(scope, rawTerm, maxskip == null ? Number.MAX_SAFE_INTEGER : maxskip);
  const stats = { candidates: 0, compares: 0, rowsMaterialized: 0 };
  const budget = new Budget(budgetMs);
  const t0 = performance.now();
  const args = { cap, maxskipRequested: maxskip };
  let result, keys = null;
  try {
    if (strategyKey === 'EXACT') {
      keys = exactKeys || enumerateExact(ctx.view, ctx.term, ctx.smax, budget, stats);
      const head = Array.from(keys.subarray(0, cap), unpackKey);
      result = buildResult(ctx, strat, { ...args, hits: head, total: keys.length, scanComplete: true });
    } else {
      const r = strategyKey === 'ANCHOR' ? runAnchor(ctx, cap, budget, stats) : runHybrid(ctx, cap, budget, stats);
      result = buildResult(ctx, strat, { ...args, hits: r.hits, total: r.complete ? r.hits.length : null, scanComplete: r.complete });
    }
  } catch (e) {
    if (!(e instanceof Timeout)) throw e;
    result = buildResult(ctx, strat, { ...args, hits: [], total: null, scanComplete: false, timeout: e.kind });
  }
  return { result, stats, ms: performance.now() - t0, keys };
}

/** Exhaustive occurrence set via the anchor enumerator (independent code path from the pair join). */
export function enumerateViaAnchor(scope, rawTerm, maxskip, budgetMs) {
  const ctx = prepare(scope, rawTerm, maxskip == null ? Number.MAX_SAFE_INTEGER : maxskip);
  const budget = new Budget(budgetMs), stats = { candidates: 0, compares: 0 };
  const buf = new KeyBuf();
  try {
    for (const dir of [1, -1]) {
      const tt = dir === 1 ? ctx.term : reverse(ctx.term);
      const su = anchorSetup(ctx.view, tt); if (!su) continue;
      for (const h of anchorScan(ctx.view, tt, su, 2, ctx.smax, 0, su.Pi.length, budget, stats)) {
        const c = toCanon(h, dir, ctx.L); buf.push(packKey(c.skip, c.start, c.dir));
      }
    }
  } catch (e) { if (e instanceof Timeout) return { keys: null, timeout: e.kind, stats }; throw e; }
  return { keys: buf.sorted(), timeout: null, stats };
}
