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
  const out = (data?.content?.[0]?.text || "").trim();
  if (!out) { LAST_ERR = "empty_out:" + JSON.stringify(data).slice(0, 200); return null; }
  return { text: out, model: MODEL };
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

    const original_text = String(b.original_text || "").trim();
    const original_lang = String(b.original_lang || "he").trim();
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
