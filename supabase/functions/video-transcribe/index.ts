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
//   { action:'set_original', video_key, original_text, ... }  → שומר מקור בלבד (בלי תרגום)
//   { action:'list', video_key }  → מחזיר את כל השורות (לניפוי; הלקוח קורא ישירות מהטבלה)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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

// סט-השפות הקנוני (video_transcription_law). he = ברירת-מחדל של המקור.
const CANON_LANGS = ["he", "en", "ar", "es", "fr", "ru", "pt", "de"];
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
async function upsertRow(row: Record<string, unknown>) {
  const r = await fetch(`${SB_URL}/rest/v1/video_transcripts?on_conflict=video_key,lang`, {
    method: "POST",
    headers: {
      apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(row),
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`upsert ${r.status}: ${txt}`);
  try { return JSON.parse(txt); } catch { return txt; }
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

    let original_text = String(b.original_text || "").trim();
    let original_lang = String(b.original_lang || "he").trim();

    // אם לא נשלח טקסט-מקור — שולפים את המקור הקיים מהטבלה (מאפשר תרגום בקבוצות בלי לשלוח שוב)
    if (!original_text) {
      const r = await fetch(
        `${SB_URL}/rest/v1/video_transcripts?video_key=eq.${encodeURIComponent(video_key)}&is_original=eq.true&select=lang,transcript&limit=1`,
        { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } },
      );
      const ex = await r.json();
      if (Array.isArray(ex) && ex[0]?.transcript) {
        original_text = String(ex[0].transcript);
        original_lang = String(ex[0].lang || original_lang);
      }
    }
    if (!original_text) return json({ error: "original_text_required" }, 400);

    // 1) שמירת המקור (is_original=true, מפורסם)
    await upsertRow({
      ...base, lang: original_lang, transcript: original_text,
      is_original: true, translated_by: "human", model: null, status: "published",
    });

    if (action === "set_original")
      return json({ ok: true, saved: [original_lang], translated: [] });

    // 2) תרגום לכל שפות-היעד (הקנוני פחות שפת-המקור), אלא אם נשלחה רשימה
    const reqLangs = Array.isArray(b.langs) && b.langs.length
      ? (b.langs as string[]) : CANON_LANGS;
    const targets = reqLangs.filter((l) => l && l !== original_lang);

    const done: string[] = [], failed: string[] = [];
    for (const lang of targets) {
      const t = await translate(original_text, lang);
      if (!t) { failed.push(lang); continue; }
      await upsertRow({
        ...base, lang, transcript: t.text, is_original: false,
        translated_by: `anthropic:${t.model}`, model: t.model, status: "published",
      });
      done.push(lang);
    }
    return json({ ok: true, original: original_lang, translated: done, failed, last_err: failed.length ? LAST_ERR : undefined });
  } catch (e) {
    return json({ error: "server_error", detail: String((e as Error)?.message || e) }, 500);
  }
});
