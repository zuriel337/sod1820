// Canonical ELS corpus loader for the benchmark harness (branch-only, read-only).
// Source: tools/els/data/tk-letters.txt — the single raw witness (els_single_engine_law v2).
// Admission mirrors the live tanakh_stream admission md5s (G3_ELS_TANAKH_CANONICAL_STREAM_BUILD_V1).
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
export const LETTERS_PATH = join(HERE, '..', '..', 'data', 'tk-letters.txt');

export const TORAH_LETTERS = 304805;
export const TANAKH_LETTERS = 1204583;
export const ADMISSION = {
  all: 'baf161858c0b4dc57b5b96990bea18db',
  torahPrefix: '0066c2431821863d258745e664d3883e',
  nwSuffix: 'f62203f8a916b11ad68bfb195f5ed238',
};
// fn_els_corpus_id() values as pinned by the live admission block.
export const CORPUS_ID = {
  torah: '0b022e8eef6f9c16',
  tanakh: '0b022e8eef6f9c16a20c3836c11e652e5cac45469016766f7f4fc670c9f84e1b',
};

const md5 = s => createHash('md5').update(s).digest('hex');
export const sha256 = s => createHash('sha256').update(s).digest('hex');

const FIN = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
/** Canonical ELS normalization: keep only א-ת, fold final letters. */
export function normalizeTerm(raw) {
  let o = '';
  for (const c of String(raw ?? '')) if (c >= 'א' && c <= 'ת') o += FIN[c] || c;
  return o;
}

let cached = null;
/** Returns the full stream string after hard admission checks (fail closed). */
export function loadStream() {
  if (cached) return cached;
  const s = readFileSync(LETTERS_PATH, 'utf8');
  if (s.length !== TANAKH_LETTERS) throw new Error(`ADMISSION_FAILED: letters=${s.length}`);
  if (md5(s) !== ADMISSION.all) throw new Error('ADMISSION_FAILED: combined md5');
  if (md5(s.slice(0, TORAH_LETTERS)) !== ADMISSION.torahPrefix) throw new Error('ADMISSION_FAILED: torah prefix md5');
  if (md5(s.slice(TORAH_LETTERS)) !== ADMISSION.nwSuffix) throw new Error('ADMISSION_FAILED: NW suffix md5');
  cached = s;
  return s;
}

const scopeCache = new Map();
/**
 * A scope view: `text` (string, zero-based indexing), `n`, per-letter sorted position arrays (Int32Array).
 * Positions are zero-based (public ELS coordinate contract; SQL idx = position + 1).
 */
export function getScope(scope) {
  if (scopeCache.has(scope)) return scopeCache.get(scope);
  if (scope !== 'torah' && scope !== 'tanakh') throw new Error(`unsupported scope ${scope}`);
  const all = loadStream();
  const text = scope === 'torah' ? all.slice(0, TORAH_LETTERS) : all;
  const counts = new Map();
  for (let i = 0; i < text.length; i++) counts.set(text[i], (counts.get(text[i]) || 0) + 1);
  const pos = new Map();
  for (const [c, k] of counts) pos.set(c, new Int32Array(k));
  const fill = new Map([...counts.keys()].map(c => [c, 0]));
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const f = fill.get(c);
    pos.get(c)[f] = i;
    fill.set(c, f + 1);
  }
  const view = { scope, text, n: text.length, pos, corpusId: CORPUS_ID[scope] };
  scopeCache.set(scope, view);
  return view;
}
