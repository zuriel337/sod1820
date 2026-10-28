// EXP-12 pilot: the word list behind the candidate pool, and where it is blind. Two sources, both visible to any visitor:
//   G  public.gematria_words (the project's dictionary): single words, read through the public REST contract with the public key (rows the key can see);
//   T  forms of the Tanakh text (public/tanakh-verses.json) that occur at least `tanakhMin` times.
// What a word list cannot contain is stated in the pre-registration: abbreviations, modern proper names, spelling variants and anything the two sources lack. The pool never claims
// more than these lists allow; a known finding that is not in them is reported as "not in the word list" (a pool-creation failure), never as a model failure.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const FINALS = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };
export const fold = (text) => [...String(text ?? "")].map((c) => FINALS[c] ?? c).join("");
export const cleanWord = (text) => fold(text).replace(/[^א-ת]/g, "");

export function tanakhForms(versesPath, { min = 2 } = {}) {
  const data = JSON.parse(readFileSync(versesPath, "utf8"));
  const counts = new Map();
  for (const verse of data.verses ?? []) for (const raw of String(verse[3] ?? "").split(/[ ־]+/)) { const word = cleanWord(raw); if (word.length >= 2) counts.set(word, (counts.get(word) ?? 0) + 1); }
  return new Map([...counts].filter(([, n]) => n >= min));
}

export async function gematriaWords({ url, anonKey, fetchImpl = fetch, pageSize = 1000 }) {
  const words = new Set();
  let offset = 0, pages = 0, rows = 0;
  for (;;) {
    const response = await fetchImpl(`${url}/rest/v1/gematria_words?select=phrase&order=id.asc&limit=${pageSize}&offset=${offset}`, { headers: { apikey: anonKey, authorization: `Bearer ${anonKey}` } });
    if (!response.ok) throw new Error(`gematria_words: HTTP ${response.status}`);
    const page = await response.json();
    pages += 1; rows += page.length;
    for (const row of page) { const phrase = String(row.phrase ?? "").trim(); if (phrase && !/\s/.test(phrase)) { const word = cleanWord(phrase); if (word.length >= 2) words.add(word); } }
    if (page.length < pageSize) break;
    offset += pageSize;
    if (pages > 60) throw new Error("gematria_words: too many pages");
  }
  return { words, rows, pages };
}

/** Union lexicon: Map word -> { g: bool, t: tanakh count } for lengths minLen..maxLen. */
export function unionLexicon({ gematria, tanakh, minLen = 4, maxLen = 9 }) {
  const lex = new Map();
  const ok = (w) => w.length >= minLen && w.length <= maxLen;
  for (const w of gematria) if (ok(w)) lex.set(w, { g: true, t: tanakh.get(w) ?? 0 });
  for (const [w, n] of tanakh) if (ok(w) && !lex.has(w)) lex.set(w, { g: false, t: n });
  return lex;
}
export const lexiconDigest = (lex) => createHash("sha256").update([...lex.keys()].sort().join("\n"), "utf8").digest("hex");
