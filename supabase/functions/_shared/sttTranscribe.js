// Shared speech-to-text call (OpenAI gpt-transcribe). Single STT implementation for wa-video-enrich
// and video-transcribe (POST_PUBLISHING_2029_CHAIN_V1). Pure over an injected fetch; no key lookup,
// no persistence, no tracing here — callers own those.
// SOURCE != TRANSCRIPT: the language is sent to the provider only when the caller KNOWS it. When unknown
// it is omitted (provider auto-detects) and the result reports language_evidence "unknown" unless the
// provider itself reports a language. Nothing here defaults to Hebrew.

export const STT_MODEL = "gpt-transcribe";
export const STT_ENDPOINT = "https://api.openai.com/v1/audio/transcriptions";
export const MAX_STT_BYTES = 24 * 1024 * 1024;

const LANG_RE = /^[a-z]{2,3}$/;
/** @param {unknown} value @returns {string | null} */
export function normalizeLanguage(value) {
  const v = String(value || "").trim().toLowerCase().split(/[-_]/)[0];
  return LANG_RE.test(v) ? v : null;
}

export function mediaExtension(url, fallback = "mp4") {
  return (String(url || "").match(/\.(mp4|webm|m4v|mov)(?:[?#]|$)/i)?.[1] || fallback).toLowerCase();
}

/**
 * @param {{ key: string, blob: Blob, filename: string, type: string, language?: unknown, fetchImpl?: typeof fetch, timestamped?: boolean }} args
 * @returns {Promise<{ok: boolean, status: number, text?: string, model: string, language: string|null, language_evidence: string, error?: string, raw?: string, words?: Array<{start:number,end:number,word:string}>, segments?: Array<{start:number,end:number,text:string,no_speech_prob?:number,avg_logprob?:number}>, duration?:number, provider_language?:string}>}
 */
// -> { ok, status, text, language, language_evidence: "declared"|"provider_reported"|"unknown", model, error?, raw }
export async function transcribeBlob({ key, blob, filename, type, language = null, fetchImpl = fetch, timestamped = false }) {
  const model = timestamped ? "whisper-1" : STT_MODEL;
  if (!key) return { ok: false, status: 0, error: "stt_key_missing", model, language: null, language_evidence: "unknown" };
  if (!blob || !blob.size) return { ok: false, status: 0, error: "media_empty", model, language: null, language_evidence: "unknown" };
  if (blob.size > MAX_STT_BYTES) return { ok: false, status: 0, error: `media_too_large:${blob.size}`, model, language: null, language_evidence: "unknown" };
  const declared = normalizeLanguage(language);
  const form = new FormData();
  form.append("file", new File([blob], filename, { type }));
  form.append("model", model);
  if (timestamped) {
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "word");
    form.append("timestamp_granularities[]", "segment");
    form.append("prompt", "Transcribe the original speech faithfully. Hebrew and Russian may alternate. Preserve each spoken language; do not translate. Do not add words to silence.");
  }
  if (declared) form.append("language", declared);
  const r = await fetchImpl(STT_ENDPOINT, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form });
  const raw = await r.text();
  if (!r.ok) return { ok: false, status: r.status, error: `stt_${r.status}:${raw.slice(0, 240)}`, model, language: declared, language_evidence: declared ? "declared" : "unknown", raw };
  let parsed = null;
  try { parsed = JSON.parse(raw); } catch { /* plain-text response */ }
  const text = String(parsed?.text ?? raw ?? "").trim();
  if (!text) return { ok: false, status: r.status, error: "stt_empty", model, language: declared, language_evidence: declared ? "declared" : "unknown", raw };
  const reported = normalizeLanguage(parsed?.language);
  const language_out = declared || reported;
  return {
    ok: true, status: r.status, text, model, raw,
    ...(timestamped ? { words: parsed?.words, segments: parsed?.segments, duration: parsed?.duration, provider_language: parsed?.language } : {}),
    language: language_out,
    language_evidence: declared ? "declared" : reported ? "provider_reported" : "unknown",
  };
}
