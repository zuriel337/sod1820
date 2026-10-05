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
export function normalizeLanguage(value) {
  const v = String(value || "").trim().toLowerCase().split(/[-_]/)[0];
  return LANG_RE.test(v) ? v : null;
}

export function mediaExtension(url, fallback = "mp4") {
  return (String(url || "").match(/\.(mp4|webm|m4v|mov)(?:[?#]|$)/i)?.[1] || fallback).toLowerCase();
}

// -> { ok, status, text, language, language_evidence: "declared"|"provider_reported"|"unknown", model, error?, raw }
export async function transcribeBlob({ key, blob, filename, type, language = null, fetchImpl = fetch }) {
  if (!key) return { ok: false, status: 0, error: "stt_key_missing", model: STT_MODEL, language: null, language_evidence: "unknown" };
  if (!blob || !blob.size) return { ok: false, status: 0, error: "media_empty", model: STT_MODEL, language: null, language_evidence: "unknown" };
  if (blob.size > MAX_STT_BYTES) return { ok: false, status: 0, error: `media_too_large:${blob.size}`, model: STT_MODEL, language: null, language_evidence: "unknown" };
  const declared = normalizeLanguage(language);
  const form = new FormData();
  form.append("file", new File([blob], filename, { type }));
  form.append("model", STT_MODEL);
  if (declared) form.append("language", declared);
  const r = await fetchImpl(STT_ENDPOINT, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form });
  const raw = await r.text();
  if (!r.ok) return { ok: false, status: r.status, error: `stt_${r.status}:${raw.slice(0, 240)}`, model: STT_MODEL, language: declared, language_evidence: declared ? "declared" : "unknown", raw };
  let parsed = null;
  try { parsed = JSON.parse(raw); } catch { /* plain-text response */ }
  const text = String(parsed?.text ?? raw ?? "").trim();
  if (!text) return { ok: false, status: r.status, error: "stt_empty", model: STT_MODEL, language: declared, language_evidence: declared ? "declared" : "unknown", raw };
  const reported = normalizeLanguage(parsed?.language);
  const language_out = declared || reported;
  return {
    ok: true, status: r.status, text, model: STT_MODEL, raw,
    language: language_out,
    language_evidence: declared ? "declared" : reported ? "provider_reported" : "unknown",
  };
}
