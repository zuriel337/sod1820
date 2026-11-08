// node --test src/lib/research/home2029Pulse.test.js
// PF4: the Home system pulse asks for "added in the last 7 days" with ONE exact count of (created OR made visible),
// not three counts combined as created + visibility - overlap. The numbers must stay identical.
import { test } from "node:test";
import assert from "node:assert/strict";
import { supabase } from "../supabase.js";
import { fetchHomeSystemPulse2029 } from "./home2029Projection.js";

// ---- a tiny in-memory PostgREST: just the operators the pulse uses --------------------------------------------------
const splitTop = (text) => { // split on commas that are outside double quotes
  const out = []; let depth = false, cur = "";
  for (const ch of text) { if (ch === '"') depth = !depth; if (ch === "," && !depth) { out.push(cur); cur = ""; } else cur += ch; }
  out.push(cur); return out;
};
const unquote = (v) => (v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1) : v);
const cond = (expr) => {
  const [, col, op, rawValue] = /^([a-z_]+)\.(is|eq|gte)\.(.*)$/s.exec(expr);
  const value = unquote(rawValue);
  return (row) => {
    const cell = row[col];
    if (op === "is") return value === "null" ? cell == null : cell === (value === "true");
    if (op === "eq") return String(cell) === value;
    return cell != null && Date.parse(cell) >= Date.parse(value);
  };
};
function makeClient(tables, log) {
  return (table) => {
    const state = { table, preds: [], head: false, ops: [], limit: null, order: null };
    const run = () => {
      let rows = (tables[table] || []).filter((row) => state.preds.every((p) => p(row)));
      if (state.order) rows = [...rows].sort((a, b) => (Date.parse(b[state.order] || 0) || 0) - (Date.parse(a[state.order] || 0) || 0));
      const count = rows.length;
      if (state.limit != null) rows = rows.slice(0, state.limit);
      return { data: state.head ? null : rows, count, error: null };
    };
    const builder = {
      select(columns, options = {}) { state.head = options.head === true; state.ops.push(["select", columns, options]); return builder; },
      eq(col, value) { state.ops.push(["eq", col, value]); state.preds.push((row) => row[col] === value); return builder; },
      gte(col, value) { state.ops.push(["gte", col, value]); state.preds.push(cond(`${col}.gte.${value}`)); return builder; },
      or(expr) { state.ops.push(["or", expr]); const parts = splitTop(expr).map(cond); state.preds.push((row) => parts.some((p) => p(row))); return builder; },
      order(col) { state.order = col; return builder; },
      limit(n) { state.limit = n; return builder; },
      abortSignal() { return builder; },
      then(resolve, reject) { log.push(state); return Promise.resolve(run()).then(resolve, reject); },
    };
    return builder;
  };
}

function prng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; }
function makeWords(seed) {
  const r = prng(seed), now = Date.now(), day = 86400000;
  const stamp = () => (r() < 0.2 ? null : new Date(now - (r() * 20 - 1) * day).toISOString());
  return Array.from({ length: 400 }, (_, i) => ({
    phrase: `ביטוי ${i}`, ragil: 100 + i, is_verified: r() < 0.9, is_published: r() < 0.9,
    is_encrypted: r() < 0.7 ? null : r() < 0.5, created_at: stamp(), visibility_changed_at: stamp(),
  }));
}

test("pulse: corpusAdded7d from one union count equals created + visibility - overlap, over many random tables", async () => {
  const original = supabase.from;
  try {
    for (let seed = 1; seed <= 40; seed += 1) {
      const words = makeWords(seed), log = [];
      supabase.from = makeClient({ gematria_words: words, research_contributions: [] }, log);
      const pulse = await fetchHomeSystemPulse2029();
      const since = Date.now() - 7 * 86400000;
      const eligible = words.filter((w) => w.is_verified === true && w.is_published === true && (w.is_encrypted == null || w.is_encrypted === false));
      const after = (v) => v != null && Date.parse(v) >= since;
      const created = eligible.filter((w) => after(w.created_at)).length;
      const visible = eligible.filter((w) => after(w.visibility_changed_at)).length;
      const both = eligible.filter((w) => after(w.created_at) && after(w.visibility_changed_at)).length;
      assert.equal(pulse.corpusAdded7d, created + visible - both, `seed ${seed}`);
      assert.equal(pulse.corpusTotal, eligible.length, `seed ${seed} total`);
    }
  } finally { supabase.from = original; }
});

test("pulse: two exact counts on gematria_words (total, added) instead of four; the other reads are unchanged", async () => {
  const original = supabase.from, log = [];
  try {
    supabase.from = makeClient({ gematria_words: makeWords(7), research_contributions: [] }, log);
    await fetchHomeSystemPulse2029();
  } finally { supabase.from = original; }
  const words = log.filter((q) => q.table === "gematria_words");
  assert.equal(words.filter((q) => q.head).length, 2, "exact head counts");
  assert.equal(words.filter((q) => !q.head).length, 2, "the two latest-phrase reads");
  assert.equal(log.filter((q) => q.table === "research_contributions").length, 1);
  assert.equal(log.length, 5);
  const added = words.filter((q) => q.head && q.ops.filter(([op]) => op === "or").length === 2);
  assert.equal(added.length, 1, "exactly one count carries the created/visibility OR on top of the public-word filter");
  assert.match(added[0].ops.filter(([op]) => op === "or")[1][1], /^created_at\.gte\."[^"]+",visibility_changed_at\.gte\."[^"]+"$/);
});

test("pulse: an error on either remaining count still withholds the corpus numbers", async () => {
  const original = supabase.from;
  try {
    supabase.from = (table) => {
      const builder = new Proxy({}, { get(_, op) {
        if (op === "then") return (resolve) => resolve({ data: null, count: null, error: table === "gematria_words" ? { message: "boom" } : null });
        return () => builder;
      } });
      return builder;
    };
    const pulse = await fetchHomeSystemPulse2029();
    assert.equal(pulse.corpusTotal, null);
    assert.equal(pulse.corpusAdded7d, null);
  } finally { supabase.from = original; }
});
