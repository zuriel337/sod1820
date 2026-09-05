// src/lib/spatial/torahOccurrenceAdapter.js
// Torah Occurrence → Spatial Runtime Adapter — the smallest renderer-independent occurrence contract.
// Pure data shaping: reads torahCorpusSource.js (the one existing corpus, read-only) and produces
// plain objects. NO x/y/z, camera, color, mesh, or Three.js identity anywhere in here — those belong
// only to the renderer/compiler layer, never to occurrence truth (frozen Slice-0 invariant, extended).
//
// IDENTITY INVARIANT: `corpusIndex` is the ONE stable identity for a Torah occurrence. Everything else
// on the object (locator, grapheme, niqqud, path annotation) is DESCRIPTIVE of that same identity —
// changing lens/LOD/highlight/path never changes corpusIndex, and two occurrence objects with the same
// corpusIndex are, by construction, the same occurrence (see occurrenceKey()).

import { T, N, TORAH_N, locateLetter, niqqudAt, TEAMIM_AVAILABLE, exactGraphemeAt, BOOK_NAMES } from "./torahCorpusSource.js";

export const CORPUS_SOURCE_ID = "sod1820:tools/els/data (tk-letters.txt + tk-vlens/vchap/meta + niqqud-compact.txt)";
export const WITNESS_SOURCE_ID = "sod1820:public/tanakh-verses.json";

export function occurrenceKey(corpusIndex) {
  return `torah:${corpusIndex}`;
}

// buildOccurrenceSync — everything derivable WITHOUT the async witness cross-reference (base letter,
// locator, niqqud, provenance). Cheap, synchronous, safe to call for thousands of positions at once.
export function buildOccurrenceSync(corpusIndex, pathAnnotation = null) {
  if (corpusIndex < 0 || corpusIndex >= N) return null;
  const loc = locateLetter(corpusIndex);
  return {
    // ── IDENTITY (stable, renderer-independent) ──
    corpusIndex,
    occurrenceKey: occurrenceKey(corpusIndex),
    baseLetterFamily: T[corpusIndex],

    // ── SOURCE / WITNESS BOUNDARY (kept separate on purpose) ──
    // Canonical Torah Occurrence = corpusIndex + baseLetterFamily (this section).
    // Source/Witness Representation = exactGrapheme (attached later, async, see attachWitness()).
    // Renderable Glyph Representation / Rendering Instance = the renderer's own concern, not here.
    exactGrapheme: null,       // filled by attachWitness() — final vs. non-final form
    isFinalForm: null,
    witnessSourceId: WITNESS_SOURCE_ID,
    witnessPending: true,

    // ── LOCATOR (available where the corpus supports it) ──
    locator: loc ? {
      book: loc.book,
      bookIndex: loc.bookIndex,
      chapter: loc.chapter,
      verse: loc.verse,
      offsetInVerse: loc.offsetInVerse,
      ref: `${loc.book} ${loc.chapter}:${loc.verse}`,
      // word-within-verse locator requires the witness text (word boundaries) — see attachWitness()
      wordIndex: null,
    } : null,

    // ── NIQQUD / TE'AMIM — preserved even when unavailable/unrenderable, never dropped ──
    niqqud: corpusIndex < TORAH_N ? (niqqudAt(corpusIndex) ?? "") : null,
    niqqudAvailable: corpusIndex < TORAH_N,
    teamim: null,
    teamimAvailable: TEAMIM_AVAILABLE, // false — reported honestly, not omitted

    // ── OPTIONAL ELS-PATH MEMBERSHIP (never mutates identity above) ──
    pathMembership: pathAnnotation ? {
      pathId: pathAnnotation.pathId,
      step: pathAnnotation.step,
      skip: pathAnnotation.skip,
      direction: pathAnnotation.direction,
    } : null,

    // ── PROVENANCE ──
    corpusSourceId: CORPUS_SOURCE_ID,
    inTorah: corpusIndex < TORAH_N,
  };
}

// attachWitness — fills exactGrapheme/isFinalForm/wordIndex from the existing tanakh-verses.json
// cross-reference (async: fetches the witness asset once, cached by torahCorpusSource.js). Mutates a
// COPY, never the identity fields above — this is additive description, not a second identity.
export async function attachWitness(occurrence) {
  if (!occurrence) return occurrence;
  const w = await exactGraphemeAt(occurrence.corpusIndex);
  if (!w) return { ...occurrence, witnessPending: false };
  let wordIndex = null;
  if (occurrence.locator) {
    const words = w.verseText.split(/\s+/);
    let count = 0;
    for (let wi = 0; wi < words.length; wi++) {
      const heb = [...words[wi]].filter((c) => /[א-ת]/.test(c)).length;
      if (occurrence.locator.offsetInVerse < count + heb) { wordIndex = wi; break; }
      count += heb;
    }
  }
  return {
    ...occurrence,
    exactGrapheme: w.exact,
    isFinalForm: w.isFinal,
    witnessPending: false,
    locator: occurrence.locator ? { ...occurrence.locator, wordIndex, verseGematria: w.verseGematria } : null,
  };
}

// buildOccurrenceRange — the 100/1K/10K real-corpus test entry point. Contiguous real Torah text
// starting at `start` (default 0 = Genesis 1:1), matching the proven 10K prototype's ROWS×COLS shape
// so the SAME row/chunk Glyph Runtime can consume it unmodified. pathAnnotations: Map<corpusIndex, {..}>
export function buildOccurrenceRange(start, count, pathAnnotations = null) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const idx = start + i;
    if (idx >= N) break;
    out.push(buildOccurrenceSync(idx, pathAnnotations?.get(idx) || null));
  }
  return out;
}

export async function attachWitnessBatch(occurrences) {
  return Promise.all(occurrences.map(attachWitness));
}

export { BOOK_NAMES, TORAH_N, N as CORPUS_N };
