// Pure policy for content_translations rows (content_translation_law §4: one entity identity + one translation row per (entity, lang)).
// Hebrew is the SOURCE and stays in posts.*; translations are representations (law v3/v4). No I/O, no network, no DB, no model call here.
// This module is the deterministic half of the canonical engine extension (video-transcribe `translate_entity`, NOT deployed yet):
//   - strict entity-id parsing and safe conversion to posts.id,
//   - the source hash (byte-identical to SQL public.content_translation_source_hash),
//   - HTML -> text-segment plan: ONLY text nodes (and alt/title/aria-label values) reach the model; markup, URLs, timestamps stay in a skeleton,
//   - verbatim-keep spans (Hebrew quotes/verses) travel as ⟦K#⟧ placeholders and are restored from the source, never re-typed by the model,
//   - verification (placeholders, digits, markup injection, id coverage, tag skeleton) and token-bounded chunking.
import { TRANSLATE_CANON_LANGS, translationTargets } from "./videoTranscriptPolicy.js";

export const ENTITY_TYPES = Object.freeze(["post"]);
export const SEGMENT_MARK = (id) => `⟦S:${id}⟧`;
export const KEEP_MARK = (n) => `⟦K${n}⟧`;
const MARK_CHARS = /[⟦⟧]/;
const POST_ID_RE = /^[1-9][0-9]{0,17}$/;                       // fits bigint; no sign, zeros, spaces, unicode digits (same regex as SQL)
const TAG_RE = /<!--[\s\S]*?-->|<(?:[^>"']|"[^"]*"|'[^']*')*>/g;
const TRANSLATABLE_ATTRS = ["alt", "title", "aria-label"];
const SKIP_TEXT_TAGS = new Set(["code", "pre", "blockquote"]);   // text inside is kept verbatim in the skeleton (script/style: rawTag)
const HEBREW_ONLY_CELL = /^[֐-׿\s"'׳״,.\-–/()‎‏]+$/;

// ── identity ─────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Strict post id: a canonical positive decimal string (or a safe positive integer). Returns the canonical string or null. */
export function parsePostId(value) {
  if (typeof value === "number") return Number.isSafeInteger(value) && value > 0 ? String(value) : null;
  return typeof value === "string" && POST_ID_RE.test(value) ? value : null;
}

/** @returns {{ ok: true, entityType: "post", entityId: string, postId: string, targets: string[] } | { ok: false, error: string }} */
export function planEntityTranslation({ entityType, entityId, sourceLang = "he", requestedLangs } = {}) {
  if (!ENTITY_TYPES.includes(entityType)) return { ok: false, error: "entity_type_unsupported" };
  const id = parsePostId(entityId);
  if (!id) return { ok: false, error: "entity_id_invalid" };
  const targets = translationTargets({ requested: requestedLangs, sourceLang });
  if (!targets.length) return { ok: false, error: "no_target_languages" };
  return { ok: true, entityType, entityId: id, postId: id, targets };
}

/** Defense in depth only: the database (RLS + publish guard) is authoritative. Mirrors posts_anon_read: the «טיוטה» tag hides a post. */
export function isDraftPost(post) { return Array.isArray(post?.tags) && post.tags.includes("טיוטה"); }
export function assertEligibleForPublishedTranslation(post) {
  if (!post || parsePostId(post.id) === null) throw new Error("entity_id_invalid");
  if (isDraftPost(post)) throw new Error("draft_post_not_publishable");
}

// ── source hash (== SQL content_translation_source_hash) ─────────────────────────────────────────────────────────────
export async function sourceHash({ title, excerpt, content }) {
  const text = `${title ?? ""}\n${excerpt ?? ""}\n${content ?? ""}`;
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── segmentation ─────────────────────────────────────────────────────────────────────────────────────────────────────
const hasLetter = (s) => /\p{L}/u.test(String(s).replace(/&#?[A-Za-z0-9]+;/g, ""));   // entities alone (&nbsp;) are not text
const tagName = (tag) => (/^<\/?\s*([a-zA-Z][a-zA-Z0-9-]*)/.exec(tag) || [])[1]?.toLowerCase() || "";
const isClosing = (tag) => /^<\s*\//.test(tag);
const isSelfClosing = (tag) => /\/\s*>$/.test(tag) || ["br", "hr", "img", "input", "meta", "link", "source", "wbr"].includes(tagName(tag));

function extractKeeps(text, keeps) {
  // verbatim Hebrew quoted spans: „…” and “…” containing Hebrew letters and no Latin letters (exact spelling/verses never retyped by the model)
  return text.replace(/„[^”„]{1,240}”|“[^”“]{1,240}”/g, (span) => {
    if (!/[֐-׿]/.test(span) || /[A-Za-z]/.test(span)) return span;
    const key = KEEP_MARK(keeps.length + 1);
    keeps.push(span);
    return key;
  });
}

/**
 * Plan: { version, skeleton, segments: [{ id, kind: "text"|"attr", text, keeps: string[] }] }.
 * skeleton holds every byte that is not translated; each translatable run is replaced by ⟦S:id⟧.
 */
export function segmentHtml(html) {
  const source = String(html ?? "");
  if (MARK_CHARS.test(source)) throw new Error("source_contains_reserved_marker");
  const segments = [];
  let skeleton = "", last = 0, skipDepth = 0, rawTag = null, cell = 0;
  const addSegment = (kind, text) => {
    const keeps = [];
    const id = `s${segments.length + 1}`;
    segments.push({ id, kind, text: extractKeeps(text, keeps), keeps });
    return SEGMENT_MARK(id);
  };
  const emitText = (text) => {
    if (!text) return;
    const core = text.trim();
    const verbatim = skipDepth > 0 || rawTag || !hasLetter(core) || (cell === 1 && core.length <= 60 && HEBREW_ONLY_CELL.test(core));
    if (verbatim) { skeleton += text; return; }
    const lead = text.slice(0, text.length - text.trimStart().length), trail = text.slice(text.trimEnd().length);
    skeleton += lead + addSegment("text", core) + trail;
  };
  for (const match of source.matchAll(TAG_RE)) {
    emitText(source.slice(last, match.index));
    last = match.index + match[0].length;
    let tag = match[0];
    if (!tag.startsWith("<!--")) {
      const name = tagName(tag), closing = isClosing(tag);
      if (rawTag) { if (closing && name === rawTag) rawTag = null; }
      else if (!closing && (name === "script" || name === "style")) rawTag = name;
      if (SKIP_TEXT_TAGS.has(name) && !rawTag && !isSelfClosing(tag)) skipDepth = Math.max(0, skipDepth + (closing ? -1 : 1));
      if ((name === "tr" || name === "table") ) cell = 0;                   // new row / table boundary: first-column state never leaks
      if ((name === "td" || name === "th") && !closing) cell += 1;
      if (!closing && !rawTag) {
        tag = tag.replace(new RegExp(`(\\s(?:${TRANSLATABLE_ATTRS.join("|")})\\s*=\\s*)(["'])([^"']*)\\2`, "gi"), (all, head, quote, value) =>
          hasLetter(value) ? `${head}${quote}${addSegment("attr", value)}${quote}` : all);
      }
    }
    skeleton += tag;
  }
  emitText(source.slice(last));
  return { version: 1, skeleton, segments };
}

const escapeText = (s) => s.replace(/&(?!#?[A-Za-z0-9]+;)/g, "&amp;");
const escapeAttr = (s) => escapeText(s).replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Rebuild HTML from a plan and per-segment texts (placeholders restored verbatim from the SOURCE). Throws on structural problems. */
export function reassemble(plan, translations) {
  let out = plan.skeleton;
  for (const seg of plan.segments) {
    const t = translations[seg.id];
    if (typeof t !== "string") throw new Error(`missing_segment:${seg.id}`);
    let text = t;
    for (const [i, keep] of seg.keeps.entries()) {
      const mark = KEEP_MARK(i + 1);
      if (text.split(mark).length !== 2) throw new Error(`keep_mismatch:${seg.id}:${mark}`);
      text = text.replace(mark, () => "\u0000KEEP" + i + "\u0000");
    }
    if (t !== seg.text) text = seg.kind === "attr" ? escapeAttr(text) : escapeText(text);
    for (const [i, keep] of seg.keeps.entries()) text = text.replace("\u0000KEEP" + i + "\u0000", () => keep);
    out = out.replace(SEGMENT_MARK(seg.id), () => text);
  }
  return out;
}

/** The identity transform: reassembling the source texts must reproduce the source byte-for-byte. */
export function roundTrip(html) {
  const plan = segmentHtml(html);
  return reassemble(plan, Object.fromEntries(plan.segments.map((s) => [s.id, s.text]))) === String(html ?? "");
}

/** Tag skeleton with translatable attribute values blanked: what MUST be identical between source and translated HTML. */
export function tagSkeleton(html) {
  const tags = String(html ?? "").match(TAG_RE) || [];
  return tags.map((t) => t.replace(new RegExp(`(\\s(?:${TRANSLATABLE_ATTRS.join("|")})\\s*=\\s*)(["'])[^"']*\\2`, "gi"), "$1$2$2")).join("\n");
}

// ── verification ─────────────────────────────────────────────────────────────────────────────────────────────────────
const digitRuns = (s) => s.replace(/⟦[^⟧]*⟧/g, " ").match(/[0-9]+/g) || [];
/** @returns {{ ok: boolean, errors: { id: string, code: string, detail?: string }[] }} */
export function verifyTranslation(plan, translations, { sourceHtml } = {}) {
  const errors = [];
  const known = new Set(plan.segments.map((s) => s.id));
  for (const id of Object.keys(translations || {})) if (!known.has(id)) errors.push({ id, code: "unknown_segment" });
  for (const seg of plan.segments) {
    const t = translations?.[seg.id];
    if (typeof t !== "string") { errors.push({ id: seg.id, code: "missing_segment" }); continue; }
    if (!t.trim()) { errors.push({ id: seg.id, code: "empty_translation" }); continue; }
    if (/[<>]/.test(t)) errors.push({ id: seg.id, code: "markup_in_translation" });
    if (MARK_CHARS.test(t.replace(/⟦K\d+⟧/g, ""))) errors.push({ id: seg.id, code: "reserved_marker_in_translation" });
    const found = t.match(/⟦K\d+⟧/g) || [];
    for (let i = 1; i <= seg.keeps.length; i++) {
      const n = found.filter((m) => m === KEEP_MARK(i)).length;
      if (n === 0) errors.push({ id: seg.id, code: "keep_missing", detail: KEEP_MARK(i) });
      else if (n > 1) errors.push({ id: seg.id, code: "keep_duplicate", detail: KEEP_MARK(i) });
    }
    for (const m of new Set(found)) if (!/^⟦K\d+⟧$/.test(m) || Number(m.slice(2, -1)) > seg.keeps.length) errors.push({ id: seg.id, code: "keep_unknown", detail: m });
    // every digit run of the source (gematria values, dates, timestamps, years) must survive as a digit run (ASCII digits only)
    const have = digitRuns(t);
    for (const run of digitRuns(seg.text)) {
      const at = have.indexOf(run);
      if (at < 0) errors.push({ id: seg.id, code: "digits_missing", detail: run }); else have.splice(at, 1);
    }
  }
  if (!errors.length) {
    try {
      const out = reassemble(plan, translations);
      if (sourceHtml !== undefined && tagSkeleton(out) !== tagSkeleton(sourceHtml)) errors.push({ id: "*", code: "skeleton_mismatch" });
    } catch (e) { errors.push({ id: "*", code: "reassemble_failed", detail: String(e.message || e) }); }
  }
  return { ok: errors.length === 0, errors };
}

// ── chunking + batch I/O ─────────────────────────────────────────────────────────────────────────────────────────────
export const estimateTokens = (text) => Math.ceil(String(text ?? "").length / 2.2);     // conservative for Hebrew
/** Greedy chunks bounded by an estimated source-token budget (engine max_tokens is 4000 per call: budget leaves room for the answer). */
export function chunkSegments(segments, { maxSourceTokens = 1200 } = {}) {
  const chunks = [];
  let cur = [], used = 0;
  for (const seg of segments) {
    const cost = estimateTokens(seg.text) + 12;
    if (cur.length && used + cost > maxSourceTokens) { chunks.push({ segments: cur, tokens: used }); cur = []; used = 0; }
    cur.push(seg); used += cost;
  }
  if (cur.length) chunks.push({ segments: cur, tokens: used });
  return chunks.map((c, i) => ({ index: i, segments: c.segments, tokens: c.tokens, oversize: c.segments.length === 1 && c.tokens > maxSourceTokens }));
}
export const batchPayload = (chunk) => JSON.stringify(chunk.segments.map((s) => ({ id: s.id, text: s.text })));
/** Strict parse of the model answer for one chunk: JSON array of {id,text} with exactly the chunk's ids. */
export function parseBatchAnswer(raw, chunk) {
  const body = String(raw ?? "").trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  let arr; try { arr = JSON.parse(body); } catch { return { ok: false, error: "bad_json" }; }
  if (!Array.isArray(arr)) return { ok: false, error: "not_array" };
  const map = {};
  for (const item of arr) { if (!item || typeof item.id !== "string" || typeof item.text !== "string" || item.id in map) return { ok: false, error: "bad_item" }; map[item.id] = item.text; }
  const want = chunk.segments.map((s) => s.id);
  if (want.length !== Object.keys(map).length || want.some((id) => !(id in map))) return { ok: false, error: "id_mismatch" };
  return { ok: true, translations: map };
}

/** Addendum for the canonical TRANSLATE_SYSTEM prompt when the engine extension is approved (engine prompt itself is unchanged here). */
export const ENTITY_TRANSLATE_ADDENDUM =
  "You receive a JSON array of {id,text}. Return ONLY a JSON array of {id,text} with exactly the same ids, in the same order. " +
  "Tokens like ⟦K1⟧ stand for verbatim Hebrew quotations: keep every such token exactly once, unchanged. " +
  "Keep every number, date and timestamp exactly as written, using ASCII digits 0-9 and the same numeric order (do not localize digits or date formats). " +
  "Do not add HTML or markup, do not add commentary, do not merge or split items.";

export { TRANSLATE_CANON_LANGS };
