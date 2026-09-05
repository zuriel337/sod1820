// src/lib/spatial/torahCorpusSource.js
// READ-ONLY reuse of the ONE existing Torah/ELS corpus (els_single_engine_law) — Torah Occurrence
// → Spatial Runtime Adapter. Every import below is the EXACT existing file the canonical ELS engine
// itself embeds (tools/els/build.py -> public/tzofen.html), imported read-only via Vite ?raw/JSON —
// zero copies, zero second corpus, zero second store. This module does not search anything; it only
// exposes the same letter-stream + locator index the engine already has, plus one cross-reference to
// an EXISTING production asset (public/tanakh-verses.json, already used live by VerseSearch/
// NotarikonTool/NameStory/VerseGematriaPage) for the exact final/non-final grapheme the search-stream
// itself has already normalized away (verified empirically: tk-letters.txt contains zero sofit chars).

import lettersRaw from "../../../tools/els/data/tk-letters.txt?raw";
import vlensRaw from "../../../tools/els/data/tk-vlens.txt?raw";
import vchapRaw from "../../../tools/els/data/tk-vchap.txt?raw";
import niqqudRaw from "../../../tools/els/data/niqqud-compact.txt?raw";
import tkMeta from "../../../tools/els/data/tk-meta.json";

// T — the engine's own search stream: base letters only, final forms already collapsed to base,
// niqqud/teamim already stripped (verified live, see work_log BEFORE d504776d). This is the ONE
// stable identity axis every occurrence in this adapter is keyed on — same axis the real ELS engine
// itself computes skip/position arithmetic against.
export const T = lettersRaw;
export const N = T.length;

// TORAH_N — same constant the engine hardcodes (els-code.template.html: TORAH_N=304805, "חמשת
// החומשים = 304,805 האותיות הראשונות"). Derived here from the SAME tk-meta.json bookLetterStart the
// engine's own build reads, not a second hardcoded literal, in the one already-committed row where
// the value is unambiguous (index 5 = start of יהושע = end of Torah).
export const BOOK_NAMES = tkMeta.books;
export const BOOK_LETTER_START = tkMeta.bookLetterStart;
export const TORAH_N = BOOK_LETTER_START[5];

// VCUM/VREF — the exact same cumulative-verse-length locator derivation as els-code.template.html's
// own VCUM/VREF (lines ~1094-1098). Reused read-only as a locator lookup over the SAME index files
// the engine embeds; this is not a second search engine (no skip/position search logic here at all),
// only the passive "which verse contains letter i" index every occurrence needs for its locator.
const VLENS = vlensRaw.trim().split(",").map(Number);
const VCUM = new Int32Array(VLENS.length + 1);
for (let i = 0; i < VLENS.length; i++) VCUM[i + 1] = VCUM[i] + VLENS[i];

const VCHAP = vchapRaw.trim().split("|").map((bk) => bk.split(",").map(Number));
const VREF = (() => {
  const a = [];
  for (let b = 0; b < VCHAP.length; b++) {
    for (let c = 0; c < VCHAP[b].length; c++) {
      for (let v = 0; v < VCHAP[b][c]; v++) a.push([b, c + 1, v + 1]);
    }
  }
  return a;
})();

function verseAt(pos) {
  if (pos < 0 || pos >= N) return -1;
  let lo = 0, hi = VLENS.length - 1;
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1;
    if (VCUM[m] <= pos) lo = m; else hi = m - 1;
  }
  return lo;
}

// The one locator primitive every occurrence carries — identical shape/semantics to the engine's own
// locateLetter(), so a future ELS 3D build can trust this adapter's locator without re-deriving it.
export function locateLetter(pos) {
  const vi = verseAt(pos);
  if (vi < 0) return null;
  const [b, chapter, verse] = VREF[vi];
  return { book: BOOK_NAMES[b], bookIndex: b, chapter, verse, offsetInVerse: pos - VCUM[vi], verseIndex: vi };
}

// Niqqud — per-letter-aligned, Torah-only (verified live: exactly 304,805 pipe-separated entries,
// matching TORAH_N byte-for-byte). Empty string = no combining mark at that position (real, not a
// gap). Positions >= TORAH_N (Nevi'im/Ketuvim) have no niqqud source in this corpus build — reported
// as absent, never fabricated.
const NIQQUD = niqqudRaw.split("|");
export function niqqudAt(pos) {
  if (pos < 0 || pos >= TORAH_N || pos >= NIQQUD.length) return null;
  return NIQQUD[pos] || "";
}

// Te'amim (cantillation): NOT present in this corpus build at all (same font/data gap already
// reported in the Hebrew 10K Font Closure, work_log 2bc1a5cd). Per this task's explicit instruction
// ("preserved but not rendered" is acceptable; dropping the field is not), the occurrence contract
// still carries a teamim field — always null here, honestly, with a `teamimAvailable:false` flag
// rather than silently omitting the key.
export const TEAMIM_AVAILABLE = false;

let versesCache = null;
async function loadTanakhVerses() {
  if (versesCache) return versesCache;
  // Existing production asset (already fetched live by other tools) — NOT re-embedded, NOT copied.
  const res = await fetch("/tanakh-verses.json");
  const data = await res.json();
  versesCache = data.verses; // [bookIndex, chapter, verse, text, gematriaValue][]
  return versesCache;
}

const FINAL_TO_BASE = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };
const HEB_ALL = new Set(Object.keys({ א: 1, ב: 1, ג: 1, ד: 1, ה: 1, ו: 1, ז: 1, ח: 1, ט: 1, י: 1, כ: 1, ל: 1, מ: 1, נ: 1, ס: 1, ע: 1, פ: 1, צ: 1, ק: 1, ר: 1, ש: 1, ת: 1, ך: 1, ם: 1, ן: 1, ף: 1, ץ: 1 }));

// Exact grapheme (final vs. non-final form) for a given corpus position — cross-referenced against
// the EXISTING tanakh-verses.json verse text, not a second corpus. Alignment verified empirically
// (BEFORE d504776d) across 6 verses spanning the full corpus with zero mismatches: filtering a
// verse's real text to Hebrew letters and mapping finals to base reproduces the engine's own T slice
// for that verse exactly, so position `offsetInVerse` in the filtered real text IS the same letter.
export async function exactGraphemeAt(pos) {
  const loc = locateLetter(pos);
  if (!loc) return null;
  const verses = await loadTanakhVerses();
  const row = verses[loc.verseIndex];
  if (!row) return null;
  const text = row[3] || "";
  const hebLetters = [];
  for (const ch of text) if (HEB_ALL.has(ch)) hebLetters.push(ch);
  const exact = hebLetters[loc.offsetInVerse];
  if (exact == null) return null;
  const base = FINAL_TO_BASE[exact] || exact;
  return { exact, base, isFinal: exact !== base, verseText: text, verseGematria: row[4] ?? null };
}
