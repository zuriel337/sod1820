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
