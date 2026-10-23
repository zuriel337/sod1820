#!/usr/bin/env node
// scripts/post-knowledge-staging.mjs — READ-ONLY staging of what a post category ATTESTS.
//
// Owner-first: this is NOT a new extractor, engine, store or truth system. It only composes the existing
// Shared Expression Extraction (src/lib/triage.js → analysisFlow.js) and the canonical engine definitions
// (src/lib/gematria.js) over published posts, and keeps ONLY what the engine itself re-verifies.
//   Input    published posts of one category (public read, the same anon key the browser uses)
//   Stage    Claim  (input ≠ candidate ≠ finding ≠ evidence ≠ claim ≠ interpretation ≠ canonical ≠ published)
//   Output   JSON files in --out. NO database write, NO RPC, NO secret, NO promotion, NO publication.
// Anything this produces is a candidate for the Human Gate (ZURIEL) — e.g. corpus admission or post_qa review.
//
// Why only engine-verified claims: the extractor is recall-oriented. On narrative posts a large share of its
// "engine_verified:false" rows are phrase-boundary noise, NOT author errors; they are counted but never reported
// as contradictions. A claim that the engine re-computes to the stated value is the high-precision subset.
//
// Usage:
//   node scripts/post-knowledge-staging.mjs --category "סוד האותיות והמספרים" --out <dir> [--check-corpus]

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { triageSource, extractCompoundClaims } from "../src/lib/triage.js";

export const STAGING_VERSION = "post-knowledge-staging-v1";

const decode = (s) => s
  .replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;|&#8220;|&#8221;|&#8243;/g, '"').replace(/&#8211;|&#8212;|&ndash;|&mdash;/g, "-")
  .replace(/&#8217;|&#8216;/g, "'").replace(/&#(\d+);/g, (_, n) => { try { return String.fromCodePoint(+n); } catch { return ""; } });

// Line-preserving HTML → text (src/lib/format.js stripHtml collapses newlines, which vertical arithmetic needs).
export function postText(html) {
  return decode(String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h\d|\/tr)\b[^>]*>/gi, "\n").replace(/<[^>]+>/g, " "))
    .replace(/[ \t ]+/g, " ").replace(/ *\n */g, "\n").replace(/\n\s*\n+/g, "\n").trim();
}

const HEBREW_ONLY = /^[֐-׿ ]+$/u;
const MIN_LETTERS = 3;
const normalizePhrase = (value) => String(value || "")
  .replace(/["׳״'`’‘“”()\[\]{}«»*#]/gu, "").replace(/[֑-ׇ]/gu, "").replace(/\s+/gu, " ").trim();

const isSpacedLetters = (phrase) => { const t = phrase.split(" "); return t.length >= 2 && t.every((x) => x.length === 1); };

// Pure core (no I/O) so it is testable offline. posts: [{ wp_id, date, title, content | text }]
export function stagePosts(posts) {
  const stats = { posts: posts.length, posts_with_artifacts: 0, artifacts: 0, explicit_claims: 0, engine_verified: 0, engine_unverified_not_reported_as_errors: 0, composite_verified: 0, composite_mismatch: 0, composite_unresolved: 0 };
  const attested = new Map();
  const touched = new Set();
  const remember = (phrase, value, method, post, kind) => {
    const clean = normalizePhrase(phrase);
    // < 3 letters verifies by coincidence too easily (e.g. a 2-letter fragment), so it is not attested.
    if (!clean || clean.replace(/ /g, "").length < MIN_LETTERS || !HEBREW_ONLY.test(clean) || clean.split(" ").length > 6 || isSpacedLetters(clean)) return;
    const key = `${clean}|${value}|${method}`;
    const entry = attested.get(key) || { phrase: clean, value, method, kinds: new Set(), posts: new Map() };
    entry.kinds.add(kind);
    entry.posts.set(post.wp_id, String(post.date || "").slice(0, 10));
    attested.set(key, entry);
  };
  for (const post of posts) {
    const raw = post.text ?? postText(post.content);
    const triage = triageSource({ raw }, {});
    if (triage.artifacts.length) stats.posts_with_artifacts += 1;
    for (const artifact of triage.artifacts) {
      stats.artifacts += 1;
      const { candidate, verification } = artifact;
      if (candidate.type !== "explicit-claim") continue;
      stats.explicit_claims += 1;
      if (verification.engine_verified === true && verification.engine_detail?.phrase) {
        stats.engine_verified += 1;
        touched.add(post.wp_id);
        remember(verification.engine_detail.phrase, candidate.value, verification.engine_detail.method || "רגיל", post, "explicit-claim");
      } else if (verification.engine_verified === false) {
        stats.engine_unverified_not_reported_as_errors += 1;
      }
    }
    for (const compound of extractCompoundClaims(raw)) {
      if (compound.status === "ENGINE_VERIFIED_COMPOSITE") stats.composite_verified += 1;
      else if (compound.status === "ENGINE_MISMATCH") stats.composite_mismatch += 1;
      else stats.composite_unresolved += 1;
    }
  }
  // Dependency collapse (conditional equivalence, gematria_methods.dependency_rules "no_final_letters"):
  // a גדול row that repeats a רגיל row of the same phrase+value is the same evidence, not a second method.
  const rows = [...attested.values()].map((e) => ({
    phrase: e.phrase, value: e.value, method: e.method, kinds: [...e.kinds],
    posts: [...e.posts.entries()].map(([wp_id, date]) => ({ wp_id, date })).sort((a, b) => a.date.localeCompare(b.date)),
  }));
  const regular = new Set(rows.filter((r) => r.method === "רגיל").map((r) => `${r.phrase}|${r.value}`));
  const attestedRelations = rows.filter((r) => !(r.method === "גדול" && regular.has(`${r.phrase}|${r.value}`)))
    .sort((a, b) => a.value - b.value || a.phrase.localeCompare(b.phrase, "he"));
  const byValue = {};
  for (const row of attestedRelations.filter((r) => r.method === "רגיל")) (byValue[row.value] ||= []).push(row.phrase);
  stats.attested_relations = attestedRelations.length;
  stats.distinct_phrases = new Set(attestedRelations.map((r) => r.phrase)).size;
  stats.distinct_values = new Set(attestedRelations.map((r) => r.value)).size;
  stats.posts_with_attested = touched.size;
  return { version: STAGING_VERSION, stage: "claim", stats, attested: attestedRelations, anchors: Object.entries(byValue).map(([value, phrases]) => ({ value: Number(value), phrases })).filter((a) => a.phrases.length > 1).sort((a, b) => b.phrases.length - a.phrases.length) };
}

async function main() {
  const args = process.argv.slice(2);
  const arg = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
  const category = arg("--category");
  const out = arg("--out");
  if (!category || !out) { console.error('usage: --category "<name>" --out <dir> [--check-corpus]'); process.exit(2); }
  const { SUPABASE_URL, SUPABASE_ANON } = await import("../src/lib/supabasePublicConfig.js");
  const headers = { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` };
  const posts = [];
  for (let from = 0; ; from += 20) {
    const url = `${SUPABASE_URL}/rest/v1/posts?select=wp_id,title,date,content&categories=cs.${encodeURIComponent(`{"${category}"}`)}&order=date.asc`;
    const response = await fetch(url, { headers: { ...headers, Range: `${from}-${from + 19}`, "Range-Unit": "items" } });
    if (!response.ok) throw new Error(`posts read failed: HTTP ${response.status}`);
    const rows = await response.json();
    posts.push(...rows);
    if (rows.length < 20) break;
  }
  const staged = { ...stagePosts(posts), category, fetched_at: new Date().toISOString() };
  if (args.includes("--check-corpus")) {
    const phrases = [...new Set(staged.attested.map((r) => r.phrase))];
    const present = new Set();
    for (let i = 0; i < phrases.length; i += 40) {
      const list = phrases.slice(i, i + 40).map((p) => `"${p.replace(/"/g, '\\"')}"`).join(",");
      const response = await fetch(`${SUPABASE_URL}/rest/v1/gematria_words?select=phrase&phrase=in.(${encodeURIComponent(list)})`, { headers });
      if (!response.ok) throw new Error(`gematria_words read failed: HTTP ${response.status}`);
      for (const row of await response.json()) present.add(row.phrase);
    }
    staged.corpus_coverage = { checked: phrases.length, already_in_gematria_words: present.size, missing_candidates_for_corpus_admission: phrases.filter((p) => !present.has(p)) };
  }
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "attested_relations.json"), JSON.stringify(staged, null, 1));
  console.log(JSON.stringify({ category, ...staged.stats, ...(staged.corpus_coverage ? { corpus: { checked: staged.corpus_coverage.checked, present: staged.corpus_coverage.already_in_gematria_words, missing: staged.corpus_coverage.missing_candidates_for_corpus_admission.length } } : {}) }, null, 1));
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) main().catch((error) => { console.error(error.message); process.exit(1); });
