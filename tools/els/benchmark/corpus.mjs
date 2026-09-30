// ELS strategy benchmark — corpus access (READ-ONLY over the canonical raw corpus tools/els/data/tk-letters.txt).
// Zero-based coordinates; torah = first 304,805 letters of the Tanakh stream (same as tanakh_stream.idx<=304805).
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

export const TORAH_LEN = 304805;
export const TANAKH_LEN = 1204583;
export const HASH = {
  all: 'baf161858c0b4dc57b5b96990bea18db',
  torah: '0066c2431821863d258745e664d3883e',
  suffix: 'f62203f8a916b11ad68bfb195f5ed238',
};
const FIN = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' };
export const norm = (s) => { let o = ''; for (const c of s || '') if (c >= 'א' && c <= 'ת') o += (FIN[c] || c); return o; };
export const code = (c) => c.charCodeAt(0) - 0x5d0;

const lb = (a, x) => { let lo = 0, hi = a.length; while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] < x) lo = m + 1; else hi = m; } return lo; };
export { lb };

let cached = null;
export function loadCorpus(path = new URL('../data/tk-letters.txt', import.meta.url)) {
  if (cached) return cached;
  const letters = readFileSync(path, 'utf8');
  const md5 = (s) => createHash('md5').update(s).digest('hex');
  const admission = {
    letters: letters.length, all: md5(letters), torah: md5(letters.slice(0, TORAH_LEN)), suffix: md5(letters.slice(TORAH_LEN)),
  };
  admission.ok = admission.letters === TANAKH_LEN && admission.all === HASH.all && admission.torah === HASH.torah && admission.suffix === HASH.suffix;
  if (!admission.ok) throw new Error('CORPUS_ADMISSION_FAILED ' + JSON.stringify(admission));
  const codes = new Uint8Array(letters.length);
  const counts = new Array(27).fill(0);
  for (let i = 0; i < letters.length; i++) { const c = letters.charCodeAt(i) - 0x5d0; codes[i] = c; counts[c]++; }
  const lists = counts.map((n) => new Int32Array(n)); const fill = new Array(27).fill(0);
  for (let i = 0; i < codes.length; i++) lists[codes[i]][fill[codes[i]]++] = i;
  cached = { letters, codes, lists, admission };
  return cached;
}

/** A scope view: N letters (torah=304805, tanakh=1204583) and per-letter position lists clipped to the scope. */
export function scopeView(corpus, scope) {
  const N = scope === 'torah' ? TORAH_LEN : scope === 'tanakh' ? TANAKH_LEN : null;
  if (N == null) throw new Error('unsupported scope ' + scope);
  const lists = corpus.lists.map((l) => (N === TANAKH_LEN ? l : l.subarray(0, lb(l, N))));
  return { scope, N, codes: corpus.codes, letters: corpus.letters, lists };
}
