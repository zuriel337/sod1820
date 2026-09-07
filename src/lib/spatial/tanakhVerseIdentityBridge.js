// src/lib/spatial/tanakhVerseIdentityBridge.js
// Thin bridge only — ELS letter position → the EXISTING locateLetter() → canonical Verse Identity.
// Does NOT rebuild any letter→verse arithmetic (that stays owned by torahCorpusSource.js, unmodified)
// and does NOT touch the ELS search engine. Kept separate from ../research/tanakhVerseIdentity.js so
// that module stays free of Vite-only (`?raw`) imports and remains unit-testable under plain node:test.
import { locateLetter } from "./torahCorpusSource.js";
import { verseIdentityFromElsLocator, verseIdentitiesForElsPositions } from "../research/tanakhVerseIdentity.js";

// verseIdentityAtLetter — one absolute corpus letter position → one Verse Identity envelope (or null
// past the corpus / on a position the corpus has no locator for).
export function verseIdentityAtLetter(pos) {
  const loc = locateLetter(pos);
  if (!loc) return null;
  return verseIdentityFromElsLocator(loc, { corpusIndex: pos });
}

// verseIdentitiesForOccurrence — an ELS occurrence is a sequence of positions (e.g. a found skip-term)
// that MAY span more than one verse; this is honest about that and never collapses a span into one
// verse. Returns one Verse Identity per distinct verse actually touched.
export function verseIdentitiesForOccurrence(positions) {
  return verseIdentitiesForElsPositions(positions, locateLetter);
}
