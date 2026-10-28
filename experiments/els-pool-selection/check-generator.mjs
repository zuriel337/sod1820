// Is the local generator the same as the engine on the registered families? For a seeded sample of word-list words and every ELS family, the engine (public contract
// els_search_page_v1, exact skip) is asked for all occurrences in the whole Torah; those that lie wholly inside a window must equal the generator's occurrences of the same words
// (unfiltered, maximal:false). Read-only. Output: review/generator-vs-engine.json
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { pageLetters } from "../els-live-reading/build-windows.mjs";
import { makeRpc } from "../els-live-reading/lib/verify-rest.mjs";
import { TORAH_LENGTH, torahChanceModel } from "../els-live-reading/lib/metrics.mjs";
import { mulberry32 } from "../els-live-reading/lib/windows.mjs";
import { SUPABASE_ANON, SUPABASE_URL } from "./lib/public.mjs";
import { FAMILIES, cellOfPosition, makeWindow, positionAt, skipOf } from "./lib/geometry.mjs";
import { gematriaWords, tanakhForms, unionLexicon } from "./lib/lexicon.mjs";
import { seedOfLabel } from "./lib/controls.mjs";
import { scanWindow } from "./lib/pool.mjs";

const W = 10101;
const letters = pageLetters("public/tzofen.html").slice(0, TORAH_LENGTH);
torahChanceModel(letters, (t) => createHash("md5").update(t, "utf8").digest("hex")); // md5 check of the text used
const g = await gematriaWords({ url: SUPABASE_URL, anonKey: SUPABASE_ANON });
const lex = unionLexicon({ gematria: g.words, tanakh: tanakhForms("public/tanakh-verses.json", { min: 2 }) });
const words = [...lex.keys()].sort();
const next = mulberry32(seedOfLabel("EXP12P-generator-check-v1"));
const sample = new Set();
while (sample.size < 60) sample.add(words[Math.floor(next() * words.length)]);
const rpc = makeRpc({ anonKey: SUPABASE_ANON, retries: 3 });
const windows = [["real", makeWindow({ width: W, r0: 0, r1: 30, c0: 162, c1: 262 })], ["tile", makeWindow({ width: W, r0: 0, r1: 30, c0: 900, c1: 1000 })]];
const sampleLex = new Map([...sample].map((w) => [w, lex.get(w)]));
const els = FAMILIES.filter((f) => skipOf(f, W) >= 2);
// engine hits for the sample, once per (word, skip)
const engineHits = new Map();
let calls = 0;
for (const word of sample) {
  for (const family of els) {
    const skip = skipOf(family, W);
    const hits = [];
    let after = null;
    for (let page = 0; page < 5; page += 1) {
      const res = await rpc({ term: word, skip, pageSize: 100, ...(after ? { afterSkip: after.skip, afterStart: after.start, afterDir: after.dir } : {}) });
      calls += 1;
      hits.push(...(res.hits ?? []));
      if (!(res.completion?.has_more && res.completion.continuation)) break;
      const c = res.completion.continuation; after = { skip: c.skip ?? c.after_skip, start: c.start ?? c.after_start, dir: c.dir ?? c.after_dir };
    }
    engineHits.set(`${word}|${skip}`, hits);
  }
}
const report = { sample_size: sample.size, engine_calls: calls, lexicon_size: lex.size, windows: [] };
for (const [name, win] of windows) {
  const grid = Array.from({ length: win.nRows }, (_, i) => Array.from({ length: win.nCols }, (_, j) => letters[positionAt(win, i + 1, j + 1)]).join(""));
  const local = scanWindow({ win, grid, lexicon: sampleLex, minLen: 4, maxLen: 9, maximal: false }).filter((c) => c.skip >= 2);
  const localKeys = new Set(local.map((c) => `${c.text}|${c.skip}|${c.dir}|${c.start}`));
  const engineKeys = new Set();
  for (const [key, hits] of engineHits) {
    const [word, skip] = key.split("|");
    for (const h of hits) if (h.positions.every((p) => cellOfPosition(win, p))) engineKeys.add(`${word}|${Number(skip)}|${h.dir}|${h.start}`);
  }
  const onlyLocal = [...localKeys].filter((k) => !engineKeys.has(k)), onlyEngine = [...engineKeys].filter((k) => !localKeys.has(k));
  report.windows.push({ window: name, cols: [win.c0, win.c1], local: localKeys.size, engine_inside: engineKeys.size, only_local: onlyLocal, only_engine: onlyEngine, equal: !onlyLocal.length && !onlyEngine.length });
}
writeFileSync(new URL("./review/generator-vs-engine.json", import.meta.url), `${JSON.stringify(report, null, 1)}\n`);
console.log(JSON.stringify(report.windows.map((w) => ({ window: w.window, local: w.local, engine_inside: w.engine_inside, only_local: w.only_local.length, only_engine: w.only_engine.length, equal: w.equal })), null, 0), `engine calls ${calls}`);
