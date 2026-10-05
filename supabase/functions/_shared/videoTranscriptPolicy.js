// Pure policy for video_transcripts rows (video_transcription_law / content_translation_law v4).
// SOURCE != TRANSCRIPT != TRANSLATION, all under one video_key, one row per (video_key, lang).
// No I/O. Never assumes a source language.
import { normalizeLanguage } from "./sttTranscribe.js";

export const TRANSLATE_CANON_LANGS = ["he", "en", "ar", "es", "fr", "ru", "pt", "de"];

// Decide the source language for a translate/set_original request.
// Priority: stored original row (authoritative) > caller-declared language > unknown (blocked, not guessed).
/** @param {{ requested?: unknown, existingOriginalLang?: unknown }} args @returns {{ ok: true, lang: string, evidence: string } | { ok: false, error: string }} */
export function resolveSourceLanguage({ requested, existingOriginalLang }) {
  const stored = normalizeLanguage(existingOriginalLang);
  if (stored) return { ok: true, lang: stored, evidence: "stored_original" };
  const declared = normalizeLanguage(requested);
  if (declared) return { ok: true, lang: declared, evidence: "declared" };
  return { ok: false, error: "source_language_unknown" };
}

// Original transcript produced by STT: kept as the ORIGINAL row in the spoken language. Never published
// as a translation, and never relabelled "human".
export function sttOriginalRow({ base, stt }) {
  if (!stt?.ok) return { ok: false, error: stt?.error || "stt_failed" };
  const lang = normalizeLanguage(stt.language);
  if (!lang) return { ok: false, error: "source_language_unknown" };
  return {
    ok: true,
    row: {
      ...base, lang, transcript: stt.text, is_original: true,
      translated_by: `openai:${stt.model}`, model: stt.model, status: "published",
    },
    language_evidence: stt.language_evidence,
  };
}

export function translationRow({ base, lang, text, model }) {
  return { ...base, lang, transcript: text, is_original: false, translated_by: `anthropic:${model}`, model, status: "published" };
}

/** @param {{ requested?: unknown, sourceLang?: string | null }} args @returns {string[]} */
export function translationTargets({ requested, sourceLang }) {
  const list = Array.isArray(requested) && requested.length ? requested : TRANSLATE_CANON_LANGS;
  return [...new Set(list.map(normalizeLanguage).filter((l) => !!l && l !== sourceLang))];
}

// ORIGINAL INVARIANT: one and only one is_original row per video_key (DB partial unique index enforces it too).
// Decide what a set_original/translate request may do, ALWAYS from the stored originals first. Caller text never
// overwrites a stored original; it is only ever the first source when none exists and its language is known.
// >1 stored => conflict (no mutation) · 1 stored => stored is authoritative · 0 stored => create first source.
/** @param {{ originals: { lang?: unknown, transcript?: unknown }[], action: string, requestedText?: unknown, requestedLang?: unknown }} args
 *  @returns {{ kind: "conflict", error: "original_conflict", originals: string[] } | { kind: "original_exists", error: "original_exists", lang: string }
 *   | { kind: "use_stored", lang: string, text: string, caller_original_ignored: boolean }
 *   | { kind: "blocked", error: string } | { kind: "create", lang: string, text: string }} */
export function planOriginal({ originals, action, requestedText, requestedLang }) {
  const list = Array.isArray(originals) ? originals : [];
  if (list.length > 1) return { kind: "conflict", error: "original_conflict", originals: list.map((o) => String(o?.lang ?? "")) };
  if (list.length === 1) {
    const lang = normalizeLanguage(list[0].lang);
    const text = String(list[0].transcript ?? "").trim();
    if (action === "set_original") return { kind: "original_exists", error: "original_exists", lang: lang || String(list[0].lang ?? "") };
    if (!lang || !text) return { kind: "blocked", error: "stored_original_unusable" };
    const callerText = String(requestedText ?? "").trim();
    const callerLang = normalizeLanguage(requestedLang);
    return { kind: "use_stored", lang, text, caller_original_ignored: (!!callerText && callerText !== text) || (!!callerLang && callerLang !== lang) };
  }
  const text = String(requestedText ?? "").trim();
  if (!text) return { kind: "blocked", error: "original_text_required" };
  const src = resolveSourceLanguage({ requested: requestedLang, existingOriginalLang: null });
  if (!src.ok) return { kind: "blocked", error: src.error };
  return { kind: "create", lang: src.lang, text };
}

// A Postgres unique violation (23505) from the partial unique index / (video_key, lang) key = a concurrent writer won.
export const isUniqueViolation = (err) => /23505|duplicate key|unique constraint/i.test(String(err?.message ?? err ?? ""));
