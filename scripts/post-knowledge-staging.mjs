#!/usr/bin/env node
// scripts/post-knowledge-staging.mjs — READ-ONLY staging of what a post category ATTESTS (v2).
//
// Owner-first: this is NOT a new extractor, engine, store or truth system. It composes the existing Shared
// Expression Extraction (src/lib/triage.js → analysisFlow.js) and the canonical engine definitions
// (src/lib/gematria.js) over published posts, and records what the engine itself re-verifies.
//   Input    published posts of one category (public read, the same anon key the browser uses)
//   Stage    Claim  (input ≠ candidate ≠ finding ≠ evidence ≠ claim ≠ interpretation ≠ canonical ≠ published)
//   Output   JSON files in --out. NO database write, NO RPC, NO secret, NO promotion, NO publication,
//            NO connection to Raziel, NO change to gematria_words / post_qa / metatron_context.
// Every output is a candidate for the Human Gate (ZURIEL). Nothing here admits anything to the corpus.
//
// Three things are always kept apart (never merged into one claim):
//   A. a claim the POST actually wrote        (claim_text, declared method/value)
//   B. a calculation the ENGINE verified       (computed method/value, engine_verified)
//   C. the AUTHOR's interpretation             (not extracted or scored here at all)
// A claim the engine did not reproduce is `extraction_unresolved`: neither wrong nor verified. On narrative
// posts most of these are phrase-boundary noise of a recall-oriented extractor, so they are never reported as
// author errors, and this script does not "repair" the extractor with phrase lists.
//
// Usage:
//   node scripts/post-knowledge-staging.mjs --category "<name>" --out <dir> [--check-corpus]
//   node scripts/post-knowledge-staging.mjs --category "<name>" --out <dir> --verify <manifest.json>

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { triageSource, extractCompoundClaims } from "../src/lib/triage.js";
import { METHODS, DEPTH_METHODS, methodLabel } from "../src/lib/gematria.js";

export const STAGING_VERSION = "post-knowledge-staging-v2";
export const CANDIDATE_GROUPS = Object.freeze([
  "clean_explicit_recomputed",
  "spelling_variant_of_existing",
  "suspected_spelling_error",
  "suspected_boundary_cut",
  "person_event_or_time_dependent",
]);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const MIN_LETTERS = 3;
const HEBREW_ONLY = /^[֐-׿ ]+$/u;

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

export const normalizePhrase = (value) => String(value || "")
  .replace(/["׳״'`’‘“”()\[\]{}«»*#]/gu, "").replace(/[֑-ׇ]/gu, "").replace(/\s+/gu, " ").trim();

const isSpacedLetters = (phrase) => { const t = phrase.split(" "); return t.length >= 2 && t.every((x) => x.length === 1); };

// ── general boundary rules (structural; no phrase list) ───────────────────────────────────────────────────────
// Closed grammatical class only (function words / particles). This is classification for HUMAN review, never an
// extractor change: a flagged row is not rejected for being "wrong", it is routed to review.
const FUNCTION_WORDS = new Set(["את", "על", "של", "כי", "אל", "עם", "גם", "אבל", "או", "זה", "זו", "זאת", "הוא", "היא", "לא", "מה", "כל", "אשר", "אם", "אז", "כמו", "וגם", "לפי", "בין", "ללא", "כך", "יש", "אין", "עוד", "רק", "אך"]);
let methodWords = null;
function methodVocabulary() {
  if (!methodWords) {
    methodWords = new Set();
    for (const m of [...METHODS, ...DEPTH_METHODS]) {
      for (const name of [m.key, methodLabel(m.key)]) methodWords.add(normalizePhrase(name).replace(/\s+/g, ""));
    }
  }
  return methodWords;
}
export function boundaryFlags(phrase) {
  const tokens = phrase.split(" ");
  const flags = [];
  if (isSpacedLetters(phrase)) flags.push("spaced_letters");
  else if (tokens.some((t) => t.length === 1)) flags.push("detached_single_letter_token");
  if (FUNCTION_WORDS.has(tokens[0]) || FUNCTION_WORDS.has(tokens.at(-1))) flags.push("function_word_at_edge");
  const first = tokens[0].replace(/^[הבלוכמש]/u, "");
  if (methodVocabulary().has(tokens[0]) || (first.length >= 3 && methodVocabulary().has(first))) flags.push("method_label_captured_as_phrase");
  if (tokens.length >= 6) flags.push("overlong_capture");
  return flags;
}

// ── corpus / variant / typo / person-event-time classification ───────────────────────────────────────────────
const FINAL_TO_BASE = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };
// Spelling-variant key: spacing, quotes, definite article on the first word, final forms and matres lectionis
// (ו/י that are not word-initial) are ignored. Two phrases with the same key are the same word spelled differently.
export function variantKey(phrase) {
  const base = normalizePhrase(phrase).split(" ").filter(Boolean);
  if (base.length && base[0].length > 3 && base[0].startsWith("ה")) base[0] = base[0].slice(1);
  return base.map((token) => [...token].map((c) => FINAL_TO_BASE[c] || c).filter((c, i) => i === 0 || (c !== "ו" && c !== "י")).join("")).join("");
}
export function withinOneEdit(a, b) {
  if (a === b) return false;
  const [x, y] = a.length <= b.length ? [a, b] : [b, a];
  if (y.length - x.length > 1) return false;
  let i = 0;
  while (i < x.length && x[i] === y[i]) i += 1;
  if (x.length === y.length) {
    if (x.slice(i + 1) === y.slice(i + 1)) return true;                                         // substitution
    return x[i] === y[i + 1] && x[i + 1] === y[i] && x.slice(i + 2) === y.slice(i + 2);        // adjacent swap
  }
  return x.slice(i) === y.slice(i + 1);                                                        // single insertion/deletion
}
const HEBREW_MONTHS = new Set(["תשרי", "חשון", "מרחשון", "כסלו", "טבת", "שבט", "אדר", "ניסן", "אייר", "סיון", "תמוז", "אב", "אלול"]);
const YEAR_TOKEN = /^ה?ת[רשק][א-ת]{1,2}$/u;
export function timeFlags(phrase) {
  const tokens = phrase.split(" ");
  const flags = [];
  if (tokens.some((t) => YEAR_TOKEN.test(t))) flags.push("hebrew_year_form");
  if (tokens.some((t) => HEBREW_MONTHS.has(t.replace(/^[בלהו]/u, "")) || HEBREW_MONTHS.has(t))) flags.push("hebrew_month");
  return flags;
}

// corpusPhrases: array of phrases already in gematria_words · entityLabels: labels of nodes typed entity/event/person/year.
export function buildCorpusIndex(corpusPhrases, entityLabels = []) {
  const byVariant = new Map();
  for (const phrase of corpusPhrases) {
    const key = variantKey(phrase);
    if (!key) continue;
    const list = byVariant.get(key) || [];
    list.push(phrase);
    byVariant.set(key, list);
  }
  const exact = new Set(corpusPhrases.map(normalizePhrase));
  const tokens = new Set();
  const stems = new Set();
  for (const phrase of exact) for (const token of phrase.split(" ")) if (token) { tokens.add(token); for (const form of stemForms(token)) stems.add(form); }
  const entities = new Set(entityLabels.map(normalizePhrase).filter(Boolean));
  const byLength = new Map();
  for (const phrase of exact) { const l = phrase.length; (byLength.get(l) || byLength.set(l, []).get(l)).push(phrase); }
  return { byVariant, exact, entities, byLength, tokens, stems };
}

// A token whose stem appears in NO corpus phrase is typical of a transliterated name, a place/event name or a novel
// word. Data-driven (the corpus is the vocabulary), not a name list. Stems are compared after stripping up to two
// attached prefix letters and one common suffix, so ordinary inflections of known words are not mistaken for names.
const PREFIX_LETTERS = "ובהלמכש";
const SUFFIXES = ["ים", "ות", "תי", "כם", "כן", "נו", "ה", "ת", "ו", "י", "ך", "ם", "ן"];
export function stemForms(token) {
  const forms = new Set([token]);
  const prefixed = [token];
  for (let i = 0; i < 2; i += 1) {
    const last = prefixed[prefixed.length - 1];
    if (last.length > 3 && PREFIX_LETTERS.includes(last[0])) prefixed.push(last.slice(1)); else break;
  }
  for (const form of prefixed) {
    forms.add(form);
    for (const suffix of SUFFIXES) if (form.length - suffix.length >= 3 && form.endsWith(suffix)) forms.add(form.slice(0, -suffix.length));
  }
  return forms;
}
export function unseenTokens(phrase, index) {
  return phrase.split(" ").filter((token) => token.length >= 3 && ![...stemForms(token)].some((form) => index.stems.has(form)));
}

// One primary group per candidate (precedence: variant > typo > boundary > person/event/time > clean); every
// flag that fired is kept so the reviewer sees the whole picture.
export function classifyCandidate(row, index, postTexts = new Map()) {
  const phrase = row.phrase;
  const flags = [];
  const variants = (index.byVariant.get(variantKey(phrase)) || []).filter((p) => normalizePhrase(p) !== phrase);
  if (variants.length) flags.push(`variant_of:${variants.slice(0, 3).join("|")}`);
  let typoOf = null;
  if (!variants.length && phrase.length >= 4) {
    for (const l of [phrase.length - 1, phrase.length, phrase.length + 1]) {
      for (const other of index.byLength.get(l) || []) if (withinOneEdit(phrase, other)) { typoOf = other; break; }
      if (typoOf) break;
    }
    if (typoOf) flags.push(`edit_distance_1_from:${typoOf}`);
  }
  const boundary = boundaryFlags(phrase);
  const time = timeFlags(phrase);
  const entity = index.entities.has(phrase) || [...index.entities].some((label) => label.split(" ").length >= 2 && label.length >= 6 && phrase.includes(label));
  if (entity) flags.push("matches_known_entity_or_event_label");
  const unseen = unseenTokens(phrase, index);
  if (unseen.length) flags.push(`unseen_token_possible_proper_name:${unseen.join("|")}`);
  flags.push(...boundary, ...time);
  const verbatim = row.posts.some((p) => normalizePhrase(postTexts.get(p.wp_id) || "").includes(phrase));
  if (!verbatim) flags.push("not_verbatim_in_post_text");
  let group;
  if (variants.length) group = "spelling_variant_of_existing";
  else if (typoOf) group = "suspected_spelling_error";
  else if (boundary.length) group = "suspected_boundary_cut";
  else if (entity || time.length || (unseen.length && phrase.split(" ").length <= 2)) group = "person_event_or_time_dependent";
  else group = "clean_explicit_recomputed";
  return { group, flags, appears_verbatim_in_post: verbatim };
}

// ── claim locator: the sentence/line of the post that carries the claim (for human review) ───────────────────
function locateClaim(text, phrase, value) {
  const lines = text.split("\n");
  const wanted = String(value);
  const norm = normalizePhrase(phrase);
  let best = null;
  for (const line of lines) {
    const n = normalizePhrase(line);
    if (n.includes(norm) && new RegExp(`(?<!\\d)${wanted}(?!\\d)`).test(line)) { best = { line, locator: "phrase_and_value_on_line" }; break; }
    if (!best && n.includes(norm)) best = { line, locator: "phrase_only_on_line" };
  }
  if (!best) return { claim_text: null, claim_locator: "not_found" };
  const at = Math.max(0, best.line.indexOf(phrase) >= 0 ? best.line.indexOf(phrase) - 60 : 0);
  return { claim_text: best.line.slice(at, at + 300).trim(), claim_locator: best.locator };
}

// ── pure core (no network) ────────────────────────────────────────────────────────────────────────────────────
// posts: [{ wp_id, slug, date, modified, title, content | text }] · versions: opaque ids copied into every review row.
export function stagePosts(posts, { versions = {} } = {}) {
  const stats = {
    posts: posts.length, posts_with_artifacts: 0, artifacts: 0, explicit_claims: 0, engine_verified: 0,
    extraction_unresolved: 0, not_applicable: 0, composite_verified: 0, composite_mismatch: 0, composite_unresolved: 0,
  };
  const attested = new Map();
  const touched = new Set();
  const reviewRows = [];
  const postTexts = new Map();
  const remember = (phrase, value, method, post, kind) => {
    const clean = normalizePhrase(phrase);
    // < 3 letters verifies by coincidence too easily (e.g. a 2-letter fragment), so it is not attested.
    if (!clean || clean.replace(/ /g, "").length < MIN_LETTERS || !HEBREW_ONLY.test(clean) || clean.split(" ").length > 6 || isSpacedLetters(clean)) return false;
    const key = `${clean}|${value}|${method}`;
    const entry = attested.get(key) || { phrase: clean, value, method, kinds: new Set(), posts: new Map() };
    entry.kinds.add(kind);
    entry.posts.set(post.wp_id, String(post.date || "").slice(0, 10));
    attested.set(key, entry);
    return true;
  };
  for (const post of posts) {
    const raw = post.text ?? postText(post.content);
    postTexts.set(post.wp_id, raw);
    const triage = triageSource({ raw }, {});
    if (triage.artifacts.length) stats.posts_with_artifacts += 1;
    for (const artifact of triage.artifacts) {
      stats.artifacts += 1;
      const { candidate, verification } = artifact;
      if (candidate.type !== "explicit-claim") continue;
      stats.explicit_claims += 1;
      const phrase = normalizePhrase(verification.engine_detail?.phrase || candidate.norm || candidate.text);
      const declaredMethod = candidate.method || null;
      const computedMethod = verification.engine_detail?.method || null;
      const computedValue = verification.engine_detail?.computed ?? null;
      const flags = phrase ? boundaryFlags(phrase) : ["empty_phrase"];
      let status;
      let accepted = false;
      let reason;
      if (verification.engine_verified === true) {
        status = "engine_verified";
        stats.engine_verified += 1;
        const kept = remember(phrase, candidate.value, computedMethod || "רגיל", post, "explicit-claim");
        if (kept) touched.add(post.wp_id);
        accepted = kept && flags.length === 0;
        reason = !kept ? "verified_but_not_attestable:fewer_than_3_letters_or_non_hebrew_or_spaced_letters"
          : flags.length ? `verified_but_boundary_suspect:${flags.join(",")}` : "engine_recomputed_the_stated_value";
      } else if (verification.engine_verified === false) {
        status = "extraction_unresolved";
        stats.extraction_unresolved += 1;
        reason = `engine_did_not_reproduce_stated_value_under_${computedMethod || "default_regular"}:computed_${computedValue}; not an author error, not verified`;
      } else {
        status = "not_applicable";
        stats.not_applicable += 1;
        reason = verification.engine_detail?.reason || "not_a_value_claim";
      }
      const located = locateClaim(raw, phrase, candidate.value);
      reviewRows.push({
        row_id: `${post.wp_id}:${reviewRows.length}`,
        post_id: post.wp_id, slug: post.slug ?? null, post_date: String(post.date || "").slice(0, 10),
        claim_text: located.claim_text, claim_locator: located.claim_locator,
        extracted_phrase: phrase, declared_method: declaredMethod, computed_method: computedMethod,
        declared_value: candidate.value ?? null, computed_value: computedValue,
        alternative_engine_matches: (verification.engine_matches || verification.alt_method_matches || []).map((m) => m.method),
        extraction_status: status,
        // high: the engine reproduced it, the line carries phrase and value, no boundary flag · medium: reproduced but flagged or located loosely
        // low_unresolved: not reproduced (NOT an error finding) · not_applicable: not a value claim
        extraction_confidence: status === "engine_verified"
          ? (flags.length === 0 && located.claim_locator === "phrase_and_value_on_line" ? "high" : "medium")
          : status === "extraction_unresolved" ? "low_unresolved" : "not_applicable",
        boundary_flags: flags, accepted, reason,
        extraction_version: versions.extraction ?? null, engine_version: versions.engine ?? null, registry_version: versions.registry ?? null,
      });
    }
    for (const compound of extractCompoundClaims(raw)) {
      if (compound.status === "ENGINE_VERIFIED_COMPOSITE") stats.composite_verified += 1;
      else if (compound.status === "ENGINE_MISMATCH") stats.composite_mismatch += 1;
      else stats.composite_unresolved += 1;
    }
  }
  // Dependency collapse (conditional equivalence, gematria_methods.dependency_rules "no_final_letters"): a גדול row
  // that repeats a רגיל row of the same phrase+value is the same evidence, not a second method. (The stricter
  // pair-conditioned rule lives in src/lib/research/pairConditionedMethodDependency.js and is design-only.)
  const rows = [...attested.values()].map((e) => ({
    phrase: e.phrase, value: e.value, method: e.method, kinds: [...e.kinds],
    posts: [...e.posts.entries()].map(([wp_id, date]) => ({ wp_id, date })).sort((a, b) => a.date.localeCompare(b.date) || a.wp_id - b.wp_id),
  }));
  const regular = new Set(rows.filter((r) => r.method === "רגיל").map((r) => `${r.phrase}|${r.value}`));
  const attestedRelations = rows.filter((r) => !(r.method === "גדול" && regular.has(`${r.phrase}|${r.value}`)))
    .sort((a, b) => a.value - b.value || a.phrase.localeCompare(b.phrase, "he") || a.method.localeCompare(b.method, "he"));
  const byValue = {};
  for (const row of attestedRelations.filter((r) => r.method === "רגיל")) (byValue[row.value] ||= []).push(row.phrase);
  stats.attested_relations = attestedRelations.length;
  stats.distinct_phrases = new Set(attestedRelations.map((r) => r.phrase)).size;
  stats.distinct_values = new Set(attestedRelations.map((r) => r.value)).size;
  stats.posts_with_attested = touched.size;
  return {
    version: STAGING_VERSION, stage: "claim", stats,
    attested: attestedRelations,
    anchors: Object.entries(byValue).map(([value, phrases]) => ({ value: Number(value), phrases })).filter((a) => a.phrases.length > 1).sort((a, b) => b.phrases.length - a.phrases.length || a.value - b.value),
    review_rows: reviewRows,
    post_texts: postTexts,
  };
}

// Candidates for HUMAN corpus review. Nothing here becomes a gematria_words row automatically.
export function classifyMissingPhrases(staged, corpusIndex) {
  const present = (phrase) => corpusIndex.exact.has(phrase);
  const byPhrase = new Map();
  for (const row of staged.attested) {
    const entry = byPhrase.get(row.phrase) || { phrase: row.phrase, claims: [], posts: new Map() };
    entry.claims.push({ method: row.method, value: row.value });
    for (const p of row.posts) entry.posts.set(p.wp_id, p.date);
    byPhrase.set(row.phrase, entry);
  }
  const groups = Object.fromEntries(CANDIDATE_GROUPS.map((g) => [g, []]));
  for (const entry of [...byPhrase.values()].sort((a, b) => a.phrase.localeCompare(b.phrase, "he"))) {
    if (present(entry.phrase)) continue;
    const candidate = { phrase: entry.phrase, claims: entry.claims, posts: [...entry.posts.entries()].map(([wp_id, date]) => ({ wp_id, date })).sort((a, b) => a.wp_id - b.wp_id) };
    const verdict = classifyCandidate({ phrase: entry.phrase, posts: candidate.posts }, corpusIndex, staged.post_texts);
    const example = staged.review_rows.find((r) => r.extracted_phrase === entry.phrase && r.claim_text);
    groups[verdict.group].push({ ...candidate, flags: verdict.flags, appears_verbatim_in_post: verdict.appears_verbatim_in_post, claim_text: example?.claim_text?.slice(0, 220) ?? null });
  }
  return { groups, counts: Object.fromEntries(CANDIDATE_GROUPS.map((g) => [g, groups[g].length])), total: Object.values(groups).reduce((s, g) => s + g.length, 0) };
}

// ── provenance: versions, checksums, manifest ─────────────────────────────────────────────────────────────────
const stable = (value) => JSON.stringify(value, (_, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v));
export function gitBlob(path) {
  try { return execFileSync("git", ["hash-object", path], { encoding: "utf8" }).trim(); } catch { return null; }
}
export function toolVersions(root = ".") {
  return {
    staging: STAGING_VERSION,
    triage_js: gitBlob(join(root, "src/lib/triage.js")),
    analysisFlow_js: gitBlob(join(root, "src/lib/analysisFlow.js")),
    gematria_js: gitBlob(join(root, "src/lib/gematria.js")),
    staging_script: gitBlob(join(root, "scripts/post-knowledge-staging.mjs")),
  };
}
export function buildManifest({ category, posts, staged, candidates, versions, registrySnapshot, artifacts, reproCommand }) {
  return {
    manifest_version: 1,
    tool: STAGING_VERSION,
    category,
    repro_command: reproCommand,
    note: "Read-only staging at Claim stage. No database write, no RPC, no connection to Raziel. Full post bodies are NOT stored; each post is identified by wp_id, slug, source timestamps and a sha256 of its extracted text.",
    tool_versions: versions,
    registry_snapshot: registrySnapshot,
    counts: staged.stats,
    corpus_candidates: candidates ? { total: candidates.total, by_group: candidates.counts } : null,
    posts: posts.map((p) => ({ wp_id: p.wp_id, slug: p.slug ?? null, date: p.date ?? null, modified: p.modified ?? null, text_sha256: sha256(p.text ?? postText(p.content)) })).sort((a, b) => a.wp_id - b.wp_id),
    post_set_sha256: sha256(posts.map((p) => `${p.wp_id}:${sha256(p.text ?? postText(p.content))}`).sort().join("\n")),
    artifacts,
  };
}
export const artifactEntry = (name, text) => ({ file: name, bytes: Buffer.byteLength(text), sha256: sha256(text) });

// ── CLI ───────────────────────────────────────────────────────────────────────────────────────────────────────
async function restAll(base, headers, path, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const response = await fetch(`${base}/rest/v1/${path}`, { headers: { ...headers, Range: `${from}-${from + pageSize - 1}`, "Range-Unit": "items" } });
    if (!response.ok) throw new Error(`${path.split("?")[0]} read failed: HTTP ${response.status}`);
    const page = await response.json();
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

async function main() {
  const args = process.argv.slice(2);
  const arg = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
  const category = arg("--category");
  const out = arg("--out");
  if (!category || !out) { console.error('usage: --category "<name>" --out <dir> [--check-corpus] [--verify <manifest.json>]'); process.exit(2); }
  const { SUPABASE_URL, SUPABASE_ANON } = await import("../src/lib/supabasePublicConfig.js");
  const headers = { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` };
  const posts = await restAll(SUPABASE_URL, headers, `posts?select=wp_id,slug,title,date,modified,content&categories=cs.${encodeURIComponent(`{"${category}"}`)}&order=date.asc,wp_id.asc`, 20);
  const methods = await restAll(SUPABASE_URL, headers, "gematria_methods?select=method_key,version,active&order=method_key.asc");
  const registrySnapshot = { methods: Object.fromEntries(methods.map((m) => [m.method_key, { version: m.version, active: m.active }])) };
  registrySnapshot.sha256 = sha256(stable(registrySnapshot.methods));
  const versions = toolVersions();
  const rowVersions = { extraction: `${versions.staging}/${(versions.triage_js || "?").slice(0, 8)}+${(versions.analysisFlow_js || "?").slice(0, 8)}`, engine: `gematria.js@${(versions.gematria_js || "?").slice(0, 8)}`, registry: registrySnapshot.sha256.slice(0, 12) };
  const staged = stagePosts(posts, { versions: rowVersions });
  let candidates = null;
  if (args.includes("--check-corpus")) {
    const corpus = (await restAll(SUPABASE_URL, headers, "gematria_words?select=phrase&order=phrase.asc")).map((r) => r.phrase);
    const entities = (await restAll(SUPABASE_URL, headers, "nodes?select=label&type=in.(entity,event,person,year)&is_active=eq.true&order=label.asc")).map((r) => r.label);
    candidates = classifyMissingPhrases(staged, buildCorpusIndex(corpus, entities));
  }
  const files = {
    "attested_relations.json": JSON.stringify({ version: staged.version, stage: staged.stage, stats: staged.stats, attested: staged.attested, anchors: staged.anchors }, null, 1),
    "post_qa_review_bundle.json": JSON.stringify({ version: STAGING_VERSION, stage: "claim", note: "LOCAL review bundle. Not inserted into post_qa; not read by metatron_context.", row_count: staged.review_rows.length, rows: staged.review_rows }, null, 1),
    ...(candidates ? { "corpus_candidates_review.json": JSON.stringify({ version: STAGING_VERSION, note: "Candidates for human review only. None becomes a gematria_words row automatically.", total: candidates.total, by_group: candidates.counts, groups: candidates.groups }, null, 1) } : {}),
  };
  const artifacts = Object.fromEntries(Object.entries(files).map(([name, text]) => [name, artifactEntry(name, text)]));
  const reproCommand = `node scripts/post-knowledge-staging.mjs --category "${category}" --out <dir> --check-corpus`;
  const manifest = buildManifest({ category, posts, staged, candidates, versions, registrySnapshot: { sha256: registrySnapshot.sha256, method_count: methods.length }, artifacts, reproCommand });
  const verifyPath = arg("--verify");
  if (verifyPath) {
    const expected = JSON.parse(readFileSync(verifyPath, "utf8"));
    const drift = [];
    if (expected.post_set_sha256 !== manifest.post_set_sha256) drift.push("post_set_sha256");
    for (const [name, entry] of Object.entries(expected.artifacts || {})) if (manifest.artifacts[name]?.sha256 !== entry.sha256) drift.push(`artifact:${name}`);
    for (const key of ["triage_js", "analysisFlow_js", "gematria_js"]) if (expected.tool_versions?.[key] !== manifest.tool_versions[key]) drift.push(`tool:${key}`);
    if (expected.registry_snapshot?.sha256 !== manifest.registry_snapshot.sha256) drift.push("registry_snapshot");
    console.log(JSON.stringify({ verify: drift.length ? "DRIFT" : "PASS", drift }, null, 1));
    process.exit(drift.length ? 1 : 0);
  }
  mkdirSync(out, { recursive: true });
  for (const [name, text] of Object.entries(files)) writeFileSync(join(out, name), text);
  writeFileSync(join(out, "manifest.json"), JSON.stringify({ ...manifest, generated_at: new Date().toISOString() }, null, 1));
  console.log(JSON.stringify({ category, ...staged.stats, ...(candidates ? { corpus_candidates: candidates.total, by_group: candidates.counts } : {}) }, null, 1));
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) main().catch((error) => { console.error(error.message); process.exit(1); });
