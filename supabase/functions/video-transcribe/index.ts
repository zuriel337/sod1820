// video-transcribe — שכבת תמלול רב-לשוני לכל סרטון (video_transcription_law).
// -----------------------------------------------------------------------------
// מקבל תמלול-מקור אחד (בד״כ עברית) ומפזר אותו לכל שפות-היעד דרך Anthropic
// (claude-sonnet-5 — תרגום נאמן, בלי temperature, חוזה ai_analyze). כל שפה = שורה
// נוספת ב-public.video_transcripts. אין STT מאודיו — המקור מגיע כטקסט/כתוביות.
//
// אבטחה (זהה ל-facebook-admin): verify_jwt=false + header x-fb-admin-key שחייב
//   להתאים ל-FB_ADMIN_KEY (Edge secret). קריאה מהשרת דרך SQL-wrapper video_translate
//   (SECURITY DEFINER) שמושך את המפתח מ-Vault. ⛔ ציבור לא יכול להפעיל.
//
// פעולות (POST JSON):
//   { action:'translate', video_key, original_text, original_lang?='he',
//     langs?=[...], yt?, source_url?, video_id?, title? }  → שומר מקור + מתרגם לכל שפה
//   { action:'set_original', video_key, original_text, original_lang, ... }  → שומר מקור ראשון בלבד (בלי תרגום); מקור קיים => 409 original_exists (אין דריסה)
//   translate: מקור שמור גובר תמיד על original_text/original_lang של הקורא. >1 מקורות => 409 original_conflict. DB: אינדקס ייחודי חלקי — מקור אחד לכל video_key.
//   { action:'transcribe', video_key, media_url, source_lang?, ... } → STT (gpt-transcribe, shared _shared/sttTranscribe.js)
//        מהסרטון הקנוני ב-Supabase Storage → שורת-מקור (is_original). שפת-המקור: מוצהרת/מדווחת-ספק, לעולם לא מנוחשת.
//   { action:'list', video_key }  → מחזיר את כל השורות (לניפוי; הלקוח קורא ישירות מהטבלה)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { mediaExtension, transcribeBlob } from "../_shared/sttTranscribe.js";
import { canonicalMediaPath, isCanonicalVideoOriginalPath } from "../_shared/mediaPosterLane.js";
import { isUniqueViolation, planOriginal, sttOriginalRow, translationRow, translationTargets } from "../_shared/videoTranscriptPolicy.js";

const ANTHROPIC_KEY = (Deno.env.get("ANTHROPIC_API_KEY") || "").trim();
const MODEL   = (Deno.env.get("ANALYZE_MODEL") || "claude-sonnet-5").trim();
const ADMIN_KEY = (Deno.env.get("FB_ADMIN_KEY") || "").trim();
const SB_URL  = Deno.env.get("SUPABASE_URL") || "";
const SB_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// 🔓 CORS מלא (x-client-info + x-supabase-api-version חובה ל-supabase-js, אחרת נחסם בשקט)
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info, x-supabase-api-version, x-fb-admin-key",
  "Access-Control-Max-Age": "86400",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...CORS } });

// סט-השפות הקנוני של יעדי-התרגום (video_transcription_law). שפת-המקור אינה ברירת-מחדל: מוצהרת או נשלפת מהמקור השמור.
const LANG_NAME: Record<string, string> = {
  he: "Hebrew (עברית)", en: "English", ar: "Arabic (العربية)", es: "Spanish (Español)",
  fr: "French (Français)", ru: "Russian (Русский)", pt: "Portuguese (Português)",
  de: "German (Deutsch)", yi: "Yiddish (ייִדיש)", it: "Italian", nl: "Dutch",
};
const langName = (l: string) => LANG_NAME[l] || l;

const TRANSLATE_SYSTEM =
  "You are a faithful translator for a Hebrew gematria & Torah website (Sod 1820). " +
  "Translate the given transcript accurately into the requested target language. Rules:\n" +
  "1. Translate faithfully — do NOT add interpretation, commentary, or prophecy that isn't in the source.\n" +
  "2. Preserve proper names, verse references, and any gematria numbers/values exactly as given.\n" +
  "3. Keep Hebrew words/phrases that carry gematria meaning in Hebrew, and add the translation in parentheses when it helps the reader.\n" +
  "4. Natural, fluent register in the target language. Keep paragraph breaks.\n" +
  "5. Output ONLY the translated text — no preface, no notes, no markdown fences.";

let LAST_ERR = "";
async function translate(text: string, targetLang: string): Promise<{ text: string; model: string } | null> {
  if (!ANTHROPIC_KEY) { LAST_ERR = "no_key"; return null; }
  const body = {
    model: MODEL,
    max_tokens: 4000,
    system: TRANSLATE_SYSTEM,
    messages: [{
      role: "user",
      content: `Target language: ${langName(targetLang)}.\n\nTranscript to translate:\n\n${text}`,
    }],
  };
  let r: Response;
  try {
    r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (e) { LAST_ERR = "fetch_threw:" + String((e as Error)?.message || e); return null; }
  if (!r.ok) { LAST_ERR = `http_${r.status}:` + (await r.text()).slice(0, 300); return null; }
  const data = await r.json();
  // claude-sonnet-5 עשוי לפלוט בלוק "thinking" ראשון — בוחרים את בלוק ה-text הראשון
  const textBlock = (data?.content || []).find((c: { type?: string }) => c?.type === "text");
  const out = (textBlock?.text || "").trim();
  if (!out) { LAST_ERR = "empty_out:" + JSON.stringify(data).slice(0, 200); return null; }
  return { text: out, model: MODEL };
}

// 🌍 מצב-raw (Language Layer) — זיהוי-שפה + תרגום-ליעד בקריאה אחת, בלי video_key ובלי כתיבה ל-video_transcripts.
// מחזיר usage (טוקנים) לרישום-עלות. אותם כללי-תרגום נאמנים (שמות/פסוקים/גימטריות נשמרים).
// ⚠️ טרם נפרס — additive בלבד (לא נוגע במסלולי translate/set_original/list הקיימים).
async function detectAndTranslate(text: string, targetLang: string) {
  if (!ANTHROPIC_KEY) { LAST_ERR = "no_key"; return null; }
  const sys = TRANSLATE_SYSTEM +
    "\n\nADDITIONAL: First DETECT the source language (ISO-639-1 code). Then translate the text into " + langName(targetLang) + "." +
    " Return ONLY strict JSON, no markdown/prose: {\"detected_language\":\"<iso>\",\"confidence\":<0..1>,\"translation\":\"<translated text>\"}.";
  const body = { model: MODEL, max_tokens: 4000, system: sys, messages: [{ role: "user", content: `Text:\n\n${text}` }] };
  let r;
  try {
    r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) { LAST_ERR = "fetch_threw:" + String((e as Error)?.message || e); return null; }
  if (!r.ok) { LAST_ERR = `http_${r.status}:` + (await r.text()).slice(0, 300); return null; }
  const data = await r.json();
  const textBlock = (data?.content || []).find((c: { type?: string }) => c?.type === "text");
  const outTxt = (textBlock?.text || "").trim();
  if (!outTxt) { LAST_ERR = "empty_out"; return null; }
  const m = outTxt.match(/\{[\s\S]*\}/);
  let parsed: { detected_language?: string; confidence?: number; translation?: string } | null = null;
  try { parsed = JSON.parse(m ? m[0] : outTxt); } catch { parsed = null; }
  if (!parsed || typeof parsed.translation !== "string") { LAST_ERR = "bad_json_out:" + outTxt.slice(0, 160); return null; }
  return {
    detected: String(parsed.detected_language || "").toLowerCase().slice(0, 5) || null,
    confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : null,
    translation: parsed.translation, model: MODEL, usage: data?.usage || null,
  };
}

// 💰 רישום-עלות — reuse של ai_token_log (בלי schema חדש) עם provenance (ref=msg_id · ref_name=group · visitor=user_ref).
async function logTokens(row: Record<string, unknown>) {
  try {
    await fetch(`${SB_URL}/rest/v1/ai_token_log`, {
      method: "POST",
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(row),
    });
  } catch { /* fire-and-forget — לא מפיל את התרגום */ }
}

// upsert שורת-תמלול (service role → REST) לפי (video_key, lang)
async function upsertRow(row: Record<string, unknown>, onDuplicate: "merge" | "ignore" = "merge") {
  const r = await fetch(`${SB_URL}/rest/v1/video_transcripts?on_conflict=video_key,lang`, {
    method: "POST",
    headers: {
      apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      Prefer: `resolution=${onDuplicate === "ignore" ? "ignore" : "merge"}-duplicates,return=representation`,
    },
    body: JSON.stringify(row),
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`upsert ${r.status}: ${txt}`);
  try { return JSON.parse(txt); } catch { return txt; }
}

// existing is_original rows for a video_key (read-only)
async function listOriginals(video_key: string): Promise<{ lang: string; transcript?: string }[]> {
  const r = await fetch(
    `${SB_URL}/rest/v1/video_transcripts?video_key=eq.${encodeURIComponent(video_key)}&is_original=eq.true&select=lang,transcript`,
    { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } },
  );
  if (!r.ok) throw new Error(`originals_lookup_${r.status}`);
  const rows = await r.json();
  return Array.isArray(rows) ? rows : [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // 🔐 שער-אדמין (זהה ל-facebook-admin)
  if (!ADMIN_KEY || req.headers.get("x-fb-admin-key") !== ADMIN_KEY)
    return json({ error: "unauthorized" }, 401);

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ error: "bad_json" }, 400); }

  const action = String(b.action || "translate");

  // 🌍 מצב-raw כללי (Language Layer · WhatsApp) — זיהוי+תרגום של טקסט חופשי, ללא video_key וללא כתיבה ל-video_transcripts.
  // ⛔ המקור לעולם לא נשמר/נדרס כאן — מחזיר תרגום כשכבת-תקשורת; רישום-עלות ל-ai_token_log עם provenance.
  if (action === "raw" || action === "detect_translate") {
    const text = String(b.text || "").trim();
    const target = String(b.target_lang || "he").trim();
    if (!text) return json({ error: "text_required" }, 400);
    const out = await detectAndTranslate(text, target);
    if (!out) return json({ error: "translate_failed", detail: LAST_ERR }, 502);
    await logTokens({
      source: "wa-translate", kind: "detect_translate", model: out.model,
      input_tokens: (out.usage as { input_tokens?: number } | null)?.input_tokens || 0,
      output_tokens: (out.usage as { output_tokens?: number } | null)?.output_tokens || 0,
      ref: b.ref ?? null, ref_name: b.ref_name ?? null, visitor: b.user_ref ?? null,
    });
    return json({ ok: true, detected_lang: out.detected, confidence: out.confidence, text: out.translation, target, model: out.model, usage: out.usage });
  }

  const video_key = String(b.video_key || "").trim();
  if (!video_key) return json({ error: "video_key_required" }, 400);

  const base = {
    video_key,
    yt: b.yt ?? null,
    source_url: b.source_url ?? null,
    video_id: b.video_id ?? null,
    title: b.title ?? null,
  };

  try {
    if (action === "list") {
      const r = await fetch(
        `${SB_URL}/rest/v1/video_transcripts?video_key=eq.${encodeURIComponent(video_key)}&select=*`,
        { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } },
      );
      return json({ ok: true, rows: await r.json() });
    }

    if (action === "transcribe") {
      // Canonical media only: the stored source video in the media bucket (no raw external URL as identity).
      // Strict WHATWG parse: exact Supabase origin, no credentials/query/hash/encoding/dot segments, and the storage path
      // must be exactly sod1820/2029/video/YYYY/MM/<uuid>/original.<video-ext>.
      const mediaUrl = String(b.media_url || "").trim();
      const mediaPath = canonicalMediaPath(mediaUrl, SB_URL);
      if (!mediaPath || !isCanonicalVideoOriginalPath(mediaPath)) return json({ error: "canonical_media_url_required" }, 400);
      // ORIGINAL INTEGRITY: STT never overwrites or duplicates an existing original (human/source or earlier STT).
      const orig = await listOriginals(video_key);
      if (orig.length > 1) return json({ error: "original_conflict", originals: orig.map((o) => o.lang) }, 409);
      if (orig.length === 1) return json({ ok: true, state: "original_exists", original: orig[0].lang, saved: [], translated: [] });
      const kr = await fetch(`${SB_URL}/rest/v1/rpc/wa_video_enrich_openai_key`, {
        method: "POST", headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" }, body: "{}",
      });
      const key = kr.ok ? String(await kr.json() || "").trim() : "";
      const media = await fetch(mediaUrl, { redirect: "error" }).catch(() => null);
      if (!media) return json({ error: "media_fetch_failed", status: 0 }, 502);
      if (!media.ok) return json({ error: "media_fetch_failed", status: media.status }, 502);
      const blob = await media.blob();
      const ext = mediaExtension(mediaUrl);
      const stt = await transcribeBlob({
        key, blob, filename: `${video_key.replace(/[^a-z0-9_-]/gi, "_").slice(0, 60)}.${ext}`,
        type: blob.type || (ext === "webm" ? "video/webm" : "video/mp4"), language: b.source_lang ?? null,
      });
      const built = sttOriginalRow({ base: { ...base, source_url: base.source_url ?? mediaUrl }, stt });
      if (!built.ok) return json({ error: built.error, continuation: built.error === "source_language_unknown" ? "declare_source_lang_then_retry" : undefined }, built.error === "source_language_unknown" ? 422 : 502);
      // ignore-duplicates: a (video_key, lang) row that appeared meanwhile is never merged over.
      // A concurrent unique-violation (video_key,lang or the one-original index) is re-read and reported, never a 500.
      let saved: unknown = null;
      try { saved = await upsertRow(built.row, "ignore"); } catch (e) { if (!isUniqueViolation(e)) throw e; }
      const after = await listOriginals(video_key);
      if (after.length > 1) return json({ error: "original_conflict", originals: after.map((o) => o.lang) }, 409);
      if (!Array.isArray(saved) || !saved.length) return json({ ok: true, state: "original_exists", original: after[0]?.lang ?? null, saved: [], translated: [] });
      return json({ ok: true, original: built.row.lang, language_evidence: built.language_evidence, saved: [built.row.lang], translated: [] });
    }

    // ORIGINAL INVARIANT: always inspect stored originals BEFORE trusting caller original_text/original_lang.
    // >1 => original_conflict · 1 => stored source is authoritative (set_original refuses; translate uses it) · 0 => first source.
    const plan = planOriginal({ originals: await listOriginals(video_key), action, requestedText: b.original_text, requestedLang: b.original_lang });
    if (plan.kind === "conflict") return json({ error: plan.error, originals: plan.originals }, 409);
    if (plan.kind === "original_exists") return json({ error: plan.error, original: plan.lang, saved: [], translated: [] }, 409);
    if (plan.kind === "blocked") return json({ error: plan.error }, plan.error === "original_text_required" ? 400 : 422);
    const original_text = plan.text;
    const original_lang = plan.lang;
    const callerOriginalIgnored = plan.kind === "use_stored" && plan.caller_original_ignored ? true : undefined;

    // 1) first human source only (non-overwriting insert). A concurrent writer that wins the (video_key, lang) key or the
    //    one-original partial unique index is re-read and reported — never merged over.
    if (plan.kind === "create") {
      let saved: unknown = null;
      try {
        saved = await upsertRow({
          ...base, lang: original_lang, transcript: original_text,
          is_original: true, translated_by: "human", model: null, status: "published",
        }, "ignore");
      } catch (e) {
        if (!isUniqueViolation(e)) throw e;
      }
      const after = await listOriginals(video_key);
      if (after.length > 1) return json({ error: "original_conflict", originals: after.map((o) => o.lang) }, 409);
      if (!Array.isArray(saved) || !saved.length || after.length !== 1 || after[0].lang !== original_lang || after[0].transcript !== original_text)
        return json({ error: "original_exists", original: after[0]?.lang ?? null, saved: [], translated: [] }, 409);
    }

    if (action === "set_original")
      return json({ ok: true, saved: [original_lang], translated: [] });

    // 2) תרגום לכל שפות-היעד (הקנוני פחות שפת-המקור), אלא אם נשלחה רשימה
    const targets = translationTargets({ requested: b.langs, sourceLang: original_lang });

    const done: string[] = [], failed: string[] = [];
    for (const lang of targets) {
      const t = await translate(original_text, lang);
      if (!t) { failed.push(lang); continue; }
      await upsertRow(translationRow({ base, lang, text: t.text, model: t.model }));
      done.push(lang);
    }
    return json({ ok: true, original: original_lang, original_source: plan.kind === "use_stored" ? "stored" : "created", caller_original_ignored: callerOriginalIgnored, translated: done, failed, last_err: failed.length ? LAST_ERR : undefined });
  } catch (e) {
    return json({ error: "server_error", detail: String((e as Error)?.message || e) }, 500);
  }
});
