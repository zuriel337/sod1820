// G3 ELS multi-strategy benchmark — BRANCH-ONLY PROTOTYPE (not an engine, not a truth owner).
// Strategies are internal execution behaviours under the single canonical ELS boundary
// (els_research_layer_law v9 / els_single_engine_law v2). Occurrence truth is fixed:
//   skip >= 2, both directions, zero-based canonical corpus index, start = first letter of the term,
//   canonical order = skip, start, forward-before-back on exact tie.
// Strategies differ ONLY in which occurrences they return under a cap (selection policy) and how fast.
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

const ROOT = new URL('../../../', import.meta.url).pathname;
export const TORAH_LEN = 304805;
export const TANAKH_LEN = 1204583;
export const CORPUS_IDS = {
  torah: '0b022e8eef6f9c16',
  tanakh: '0b022e8eef6f9c16a20c3836c11e652e5cac45469016766f7f4fc670c9f84e1b',
};
const FIN = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' };

export const normalize = (s) => {
  let o = '';
  for (const c of s || '') if (c >= 'א' && c <= 'ת') o += FIN[c] || c;
  return o;
};

export function loadCorpus() {
  const text = readFileSync(ROOT + 'tools/els/data/tk-letters.txt', 'utf8');
  const T = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) T[i] = text.charCodeAt(i) - 0x5d0;
  return { text, T };
}

// Per-scope letter position index (sorted Int32Array per letter). One-time build cost is reported separately.
export function buildIndex(corpus, SN) {
  const t0 = performance.now();
  const counts = new Int32Array(27);
  for (let i = 0; i < SN; i++) counts[corpus.T[i]]++;
  const pos = Array.from(counts, (c) => new Int32Array(c));
  const fill = new Int32Array(27);
  for (let i = 0; i < SN; i++) { const c = corpus.T[i]; pos[c][fill[c]++] = i; }
  return { SN, pos, buildMs: performance.now() - t0 };
}

export const scopeLen = (scope) => (scope === 'torah' ? TORAH_LEN : TANAKH_LEN);
export const fullMaxSkip = (SN, L) => Math.max(1, Math.floor((SN - 1) / Math.max(1, L - 1)));
const encode = (term) => Array.from(term, (c) => c.charCodeAt(0) - 0x5d0);
const lb = (a, x) => { let lo = 0, hi = a.length; while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] < x) lo = m + 1; else hi = m; } return lo; };

export const canonicalCmp = (a, b) => a.skip - b.skip || a.start - b.start || b.dir - a.dir;
export const hitKey = (h) => `${h.skip}:${h.start}:${h.dir}`;

class Timeout extends Error {}
function makeRun(deadlineMs) {
  const run = { work: 0, candidates: 0, deadline: performance.now() + deadlineMs, timedOut: false };
  run.tick = () => { if ((++run.work & 0x3fff) === 0 && performance.now() > run.deadline) { run.timedOut = true; throw new Timeout(); } };
  return run;
}

// ---------------------------------------------------------------------------------------------
// Independent replay verifier: works on the raw canonical string, not on the strategy's typed arrays.
export function replay(text, term, h, SN, minSkip = 2) {
  const L = term.length;
  if (!(h.skip >= minSkip) || (h.dir !== 1 && h.dir !== -1)) return false;
  const end = h.start + h.dir * h.skip * (L - 1);
  if (h.start < 0 || h.start >= SN || end < 0 || end >= SN) return false;
  for (let k = 0; k < L; k++) if (text[h.start + h.dir * h.skip * k] !== term[k]) return false;
  return true;
}

// ---------------------------------------------------------------------------------------------
// (A) EXACT_EXHAUSTIVE_V1 — canonical occurrence enumeration, skip-major, ordered-prefix page semantics.
// Independent of anchors: for each skip ascending, for each first-letter position ascending.
// cap = Infinity gives the exhaustive ground truth on bounded domains.
export function runExact(ctx, q) {
  const { T, idx } = ctx; const t = encode(q.term), L = t.length, SN = idx.SN;
  const run = makeRun(q.budgetMs); const hits = []; let finished = false;
  const P0 = idx.pos[t[0]];
  const peek = q.cap === Infinity ? Infinity : q.cap + 1; // fetch one extra to know real truncation
  try {
    outer: for (let s = 2; s <= q.maxskip; s++) {
      const reach = (L - 1) * s;
      for (let a = 0; a < P0.length; a++) {
        const st = P0[a]; run.tick();
        let f = st + reach < SN, b = st - reach >= 0;
        if (!f && !b) continue;
        for (let k = 1; k < L && (f || b); k++) {
          if (f && T[st + k * s] !== t[k]) f = false;
          if (b && T[st - k * s] !== t[k]) b = false;
        }
        if (f) { hits.push({ skip: s, dir: 1, start: st }); if (hits.length >= peek) break outer; }
        if (b) { hits.push({ skip: s, dir: -1, start: st }); if (hits.length >= peek) break outer; }
      }
    }
    finished = hits.length < peek;
  } catch (e) { if (!(e instanceof Timeout)) throw e; }
  const truncated = q.cap !== Infinity && hits.length > q.cap;
  if (truncated) hits.length = q.cap;
  return finish('EXACT_EXHAUSTIVE_V1', run, hits, {
    timedOut: run.timedOut, complete: finished && !run.timedOut, truncated, policy: 'ordered_prefix_v1',
  });
}

// ---------------------------------------------------------------------------------------------
// Shared anchor machinery (rarest-two-letter pair anchor, derived from legacy fwdSetup/fwdScan strengths).
function anchorSetup(idx, tt) {
  const L = tt.length; const ord = [];
  for (let k = 0; k < L; k++) { if (!idx.pos[tt[k]].length) return null; ord.push(k); }
  ord.sort((a, b) => idx.pos[tt[a]].length - idx.pos[tt[b]].length || a - b);
  let i = ord[0], j = ord[1]; if (i > j) { const x = i; i = j; j = x; }
  return { tt, L, i, j, g: j - i, Pi: idx.pos[tt[i]], Pj: idx.pos[tt[j]] };
}

// Scan anchors [aFrom,aTo) for skips in [sLo,sHi]. Adds exact-verified canonical hits to `out` until quota.
// Returns { next, finished }. Every hit is verified letter-by-letter before it is emitted.
function scanAnchors(ctx, run, su, orient, aFrom, aTo, sLo, sHi, quota, out, seen) {
  const { T, idx } = ctx; const SN = idx.SN; const { tt, L, i, g, Pi, Pj } = su;
  let added = 0;
  for (let a = aFrom; a < aTo; a++) {
    const pi = Pi[a]; const lo = pi + g * sLo, hi = pi + g * sHi;
    for (let b = lb(Pj, lo); b < Pj.length; b++) {
      const pj = Pj[b]; if (pj > hi) break; run.tick();
      const d = pj - pi; if (d % g) continue;
      const s = d / g; const start = pi - i * s, end = start + (L - 1) * s;
      if (start < 0 || end >= SN) continue;
      run.candidates++;
      let ok = 1; for (let k = 0; k < L; k++) if (T[start + k * s] !== tt[k]) { ok = 0; break; }
      if (!ok) continue;
      const h = orient === 'fwd' ? { skip: s, dir: 1, start } : { skip: s, dir: -1, start: end };
      const key = hitKey(h); if (seen.has(key)) continue; seen.add(key); out.push(h); added++;
      if (added >= quota) return { next: a, finished: false };
    }
  }
  return { next: aTo, finished: true };
}

// (B) ANCHOR_FAST_V1 — pair-anchor candidate generation, early exit at cap in anchor (corpus) order.
// Not capped => exact complete enumeration (equal to A). Capped => partial_sampled with prefix policy.
export function runAnchorFast(ctx, q) {
  const t = encode(q.term); const tb = [...t].reverse(); const run = makeRun(q.budgetMs);
  const sF = anchorSetup(ctx.idx, t), sB = anchorSetup(ctx.idx, tb); const hits = []; const seen = new Set();
  let stopped = false, fF = { next: 0, finished: true };
  try {
    if (sF && sB) {
      const capF = q.cap === Infinity ? Infinity : Math.ceil(q.cap / 2);
      fF = scanAnchors(ctx, run, sF, 'fwd', 0, sF.Pi.length, 2, q.maxskip, capF, hits, seen);
      const fB = scanAnchors(ctx, run, sB, 'back', 0, sB.Pi.length, 2, q.maxskip, q.cap - hits.length, hits, seen);
      if (hits.length < q.cap && !fF.finished)
        fF = scanAnchors(ctx, run, sF, 'fwd', fF.next, sF.Pi.length, 2, q.maxskip, q.cap - hits.length, hits, seen);
      stopped = (!fF.finished || !fB.finished) && hits.length >= q.cap;
    }
  } catch (e) { if (!(e instanceof Timeout)) throw e; }
  hits.sort(canonicalCmp);
  return finish('ANCHOR_FAST_V1', run, hits, {
    timedOut: run.timedOut, complete: !stopped && !run.timedOut, truncated: stopped, policy: 'anchor_prefix_v1',
  });
}

// (C) HYBRID_COVERAGE_V1 — anchor candidates + explicit stratified coverage policy:
// cells = orientation(2) x corpus-position segments(8, by anchor index) x skip bands (log bands).
// Pass 1: dynamic equal quotas per cell. Pass 2: fill leftover from unfinished cells in order.
// All returned occurrences are exact-verified. Complete only if every cell was exhausted.
export const HYBRID_SEGMENTS = 8;
export const skipBands = (maxskip) => {
  const edges = [[2, 40], [41, 400], [401, 4000], [4001, Infinity]]; const out = [];
  for (const [lo, hi] of edges) { if (lo > maxskip) break; out.push([lo, Math.min(hi, maxskip)]); }
  return out;
};
export function runHybrid(ctx, q) {
  const t = encode(q.term); const tb = [...t].reverse(); const run = makeRun(q.budgetMs);
  const su = { fwd: anchorSetup(ctx.idx, t), back: anchorSetup(ctx.idx, tb) }; const hits = []; const seen = new Set();
  const bands = skipBands(q.maxskip); const cells = [];
  if (su.fwd && su.back) {
    for (const orient of ['fwd', 'back']) for (let s = 0; s < HYBRID_SEGMENTS; s++) for (const b of bands) {
      const n = su[orient].Pi.length, seg = Math.max(1, Math.ceil(n / HYBRID_SEGMENTS));
      const from = s * seg, to = Math.min(n, from + seg); if (from < to) cells.push({ orient, from, to, lo: b[0], hi: b[1], finished: false });
    }
  }
  let complete = false;
  try {
    for (let c = 0; c < cells.length && hits.length < q.cap; c++) {
      const cell = cells[c]; const quota = q.cap === Infinity ? Infinity : Math.ceil((q.cap - hits.length) / (cells.length - c));
      const r = scanAnchors(ctx, run, su[cell.orient], cell.orient, cell.from, cell.to, cell.lo, cell.hi, quota, hits, seen);
      cell.finished = r.finished;
    }
    for (let c = 0; c < cells.length && hits.length < q.cap; c++) {
      const cell = cells[c]; if (cell.finished) continue;
      const r = scanAnchors(ctx, run, su[cell.orient], cell.orient, cell.from, cell.to, cell.lo, cell.hi, q.cap - hits.length, hits, seen);
      cell.finished = r.finished;
    }
    complete = cells.every((c) => c.finished);
  } catch (e) { if (!(e instanceof Timeout)) throw e; }
  if (!su.fwd || !su.back) complete = true; // a letter absent from the scope: exact empty, exhaustively true
  hits.sort(canonicalCmp);
  return finish('HYBRID_COVERAGE_V1', run, hits, {
    timedOut: run.timedOut, complete: complete && !run.timedOut, truncated: !complete && !run.timedOut,
    policy: 'stratified_anchor_v1', cells: cells.length,
  });
}

function finish(strategy, run, hits, c) {
  return {
    strategy, hits, work: run.work, candidates: run.candidates, timedOut: run.timedOut,
    // Honest completion semantics: negative=true ONLY when the whole domain was exhaustively covered.
    completion: {
      executed: !run.timedOut, state: run.timedOut ? 'TIMEOUT_UNBOUNDED_COST' : c.complete ? 'COMPLETE_EXACT' : c.policy === 'ordered_prefix_v1' ? 'TRUNCATED_ORDERED_PREFIX' : 'PARTIAL_SAMPLED',
      truncated: !!c.truncated, negative: !!(c.complete && hits.length === 0 && !run.timedOut),
      strategy, selection_policy: c.policy, strategy_version: 1, sampled: !c.complete && c.policy !== 'ordered_prefix_v1', cells: c.cells ?? null,
    },
  };
}

// Result-contract (els_search_result_v1) envelope: preserves corpus_id, zero-based coordinates, dependency group,
// selection-protocol slot and replay-verifiable occurrence records. Strategy/policy live under completion + search.
export function toResultV1(ctx, q, r) {
  const L = q.term.length; const cid = CORPUS_IDS[q.scope];
  return {
    contract: 'els_search_result_v1', scope: q.scope, corpus_id: cid, selection_protocol: q.selectionProtocol ?? null,
    coordinate: { position_base: 0, space: 'canonical_corpus_character_index', start_semantics: 'first_letter_of_searched_expression', direction_values: { fwd: 1, back: -1 } },
    search: { skip_min: 2, skip_max_executed: q.maxskip, max_hits: q.cap, ordering: 'skip,start,forward-before-back-on-exact-tie', strategy: r.strategy, selection_policy: r.completion.selection_policy },
    dependency_group: `els:${cid}:${q.term}:skip2-${q.maxskip}`,
    hits: r.hits.map((h) => ({ occurrence_id: `els:${cid}:${q.term}:${h.skip}:${h.dir}:${h.start}`, skip: h.skip, dir: h.dir, start: h.start, end: h.start + h.dir * h.skip * (L - 1), coordinate_convention: 'zero_based_character_index' })),
    completion: r.completion,
  };
}

export function makeCtx(corpus, scope) {
  return { T: corpus.T, text: corpus.text, scope, idx: buildIndex(corpus, scopeLen(scope)) };
}

// Ground truth: exhaustive canonical set. bounded -> independent skip-major scan (A, cap=Infinity);
// otherwise anchor exhaustive with budget. Returns null when budget exceeded (UNBOUNDED_COST), never fabricated.
export function groundTruth(ctx, term, maxskip, budgetMs, useExact) {
  const q = { term, maxskip, cap: Infinity, budgetMs };
  const r = useExact ? runExact(ctx, q) : runAnchorFast(ctx, q);
  if (r.timedOut) return { status: 'UNBOUNDED_COST', ms: budgetMs, hits: null, work: r.work };
  return { status: 'OK', hits: r.hits, work: r.work };
}

// ---------------------------------------------------------------------------------------------
// Legacy baseline: the browser template's findAll/fwdSetup/fwdScan/fwdDisperse extracted verbatim from
// tools/els/els-code.template.html; the ONLY change is a deadline tick injected into the inner window loop.
export function loadLegacy(corpus, scope) {
  const src = readFileSync(ROOT + 'tools/els/els-code.template.html', 'utf8');
  const a = src.indexOf('function lb(a,x)'); const b = src.indexOf('// חיפוש בדילוגים נתונים בטווח-אותיות');
  if (a < 0 || b < 0 || b < a) throw new Error('legacy extraction markers not found');
  let code = src.slice(a, b);
  if (!code.includes('const pj=Pj[b];')) throw new Error('legacy tick anchor not found');
  code = code.replace('const pj=Pj[b];', 'const pj=Pj[b];__tick();');
  const SN = scopeLen(scope); const st = { deadline: Infinity, work: 0 };
  const tick = () => { if ((++st.work & 0x3fff) === 0 && performance.now() > st.deadline) throw new Timeout(); };
  const factory = new Function('T', 'N', 'scopeN', 'norm', '__tick', code + '\nreturn {findAll};');
  const { findAll } = factory(corpus.text, corpus.text.length, () => SN, normalize, tick);
  return {
    run(term, cap, budgetMs) {
      st.deadline = performance.now() + budgetMs; st.work = 0;
      try {
        const r = findAll(term, cap);
        return { hits: r.hits.map((h) => ({ skip: h.skip, dir: h.dir, start: h.start })), capped: !!r.capped, timedOut: false, work: st.work };
      } catch (e) { if (!(e instanceof Timeout)) throw e; return { hits: [], capped: null, timedOut: true, work: st.work }; }
    },
  };
}

export const STRATEGIES = { EXACT_EXHAUSTIVE_V1: runExact, ANCHOR_FAST_V1: runAnchorFast, HYBRID_COVERAGE_V1: runHybrid };
