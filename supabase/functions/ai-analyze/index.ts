// ai-analyze — ניתוח AI גנרי. fast=true → Haiku (מהיר, לכלים אינטראקטיביים); אחרת Sonnet (עומק).
// יושר: מפרש רק עובדות שסופקו, לא מחשב גימטריה, מפריד עובדה מפרשנות, בלי נבואות.
//
// 🆕 מנוע נוסף (A/B): body.engine = "claude" (ברירת-מחדל) | "gemini".
//    אותו SYSTEM + אותו user-prompt לשני המנועים → השוואת פרשנות הוגנת על אותן עובדות מהמנוע.
//    Gemini משתמש ב-GEMINI_API_KEY (Edge secret, כמו ANTHROPIC_API_KEY — לא Vault).
//    אם אין מפתח למנוע המבוקש → { analysis:null, error:"not_configured" } (נפילה בחן, לא קריסה).
// .trim() — הגנה מפני רווח/שורה עודפת בסוד (הכי נפוץ; גורם ל-Google להחזיר "API key not valid").
const ANTHROPIC_KEY = (Deno.env.get("ANTHROPIC_API_KEY") || "").trim();
const GEMINI_KEY = (Deno.env.get("GEMINI_API_KEY") || "").trim();
const MODEL = (Deno.env.get("ANALYZE_MODEL") || "claude-sonnet-5").trim();
const FAST_MODEL = (Deno.env.get("CHAT_MODEL") || "claude-haiku-4-5").trim();
// אם GEMINI_MODEL לא מוגדר/שגוי → ברירת-מחדל בטוחה (מונע דגם לא-תקין בסוד).
const GEMINI_MODEL_RAW = (Deno.env.get("GEMINI_MODEL") || "").trim();
const GEMINI_MODEL = GEMINI_MODEL_RAW.startsWith("gemini") ? GEMINI_MODEL_RAW : "gemini-2.5-flash";

// 🔓 CORS: חובה לכלול את *כל* ה-headers ש-supabase-js שולח בקריאת functions.invoke
//    (בעיקר x-client-info + x-supabase-api-version), אחרת ה-preflight של הדפדפן נכשל
//    והבקשה נחסמת בשקט (עבד ב-curl אך לא בדפדפן). זו הייתה הסיבה ל«לא התקבל ניתוח».
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info, x-supabase-api-version",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS } });
}

async function logTokens(kind: string, model: string, usage: { input_tokens?: number; output_tokens?: number } | undefined, identity = "") {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key || !usage) return;
    // 🪙 שיוך עלות למי: מחובר → user_id (מהטוקן) · אנונימי → visitor. כך רואים כמה כל אחד «עולה».
    let user_id: string | null = null, visitor: string | null = null;
    if (identity.startsWith("u:")) user_id = identity.slice(2);
    else if (identity.startsWith("v:")) visitor = identity.slice(2);
    await fetch(`${url}/rest/v1/ai_token_log`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ source: "analyze", kind, model, input_tokens: usage.input_tokens || 0, output_tokens: usage.output_tokens || 0, user_id, visitor }),
    });
  } catch { /* לא חוסם */ }
}

const KIND_HINT: Record<string, string> = {
  compare: "השוואת שני שמות/ביטויים. אם הם מתכנסים (ערך שווה באחת מ-19 השיטות) — הסבר מה המפגש מרמז. אם אין ביניהם מפגש כלל (0 מתוך 19) — אל תציג זאת ככישלון אלא כהשלמה: שני צירים מקבילים שאינם מגבילים זה את זה בתבנית מוכרת. נהל דיאלוג בין המקבילות של כל שם (מה שהאחד שווה לו מול מה שהשני שווה לו), והתייחס לסכום שני השמות כאל נקודת-החיבור. הפרד עובדה (הערכים) מרמז (הפרשנות), הצג כהזמנה למחשבה על הדינמיקה המשותפת — לא כקביעה או נבואה.",
  notarikon: "ראשי/אמצעי/סופי תיבות: מה המילה/הצירוף שנוצר מהאותיות, והקשר האפשרי לביטוי המקור.",
  verse: "פסוק מהתורה: משמעות הפסוק בהקשרו, וכל ערך/צירוף שכבר סופק — כרמז משלים.",
  daily_verse: "פסוק יומי: מסר קצר ומעורר השראה מהפסוק, נאמן לפשט.",
  number: "מספר במערכת: משמעותו, המילים/הביטויים ששווים לו וההתכנסויות שסופקו — מה הם עשויים לרמז יחד. רמז משלים חם, לא נבואה, נאמן לעובדות שסופקו בלבד.",
  discovery: "מגלה-המקבילות: קיבלת רשימת מקבילות (ביטויים באותו ערך, מדורגים מהמפתיע לנפוץ). בחר מתוכן אחת — הכי מפתיעה ובעלת עומק — לפי: (א) הימנע ממילים בנאליות/יומיומיות; (ב) העדף ניגודיות משלימה — מקבילה שמרחיבה את השם למרחב בלתי-צפוי; (ג) העדף עולמות רוחניים/היסטוריים/תרבותיים בעלי משקל; (ד) הסבר בקצרה מדוע דווקא היא מפתיעה. כלל-ברזל: בחר אך ורק מהרשימה שסופקה — אל תמציא מקבילה. הצג כהזמנה למחשבה, לא כנבואה, ותמיד הפרד את השוויון (עובדה) מהפרשנות (רמז).",
  research: "אוסף-המחקר של החוקר: כמה ישויות שאסף יחד. מצא את החוטים האמיתיים — ערכים משותפים, קשר תמטי, התכנסות — והצע כיוון-המשך. בכנות אם אין קשר אמיתי.",
};

const SYSTEM =
  "אתה פרשן עברי באתר גימטריה ותורה. תפקידך: לתת ניתוח מכובד ומדויק בעברית (האורך נקבע בהנחיה שבסוף בקשת-המשתמש).\n" +
  "חוקי ברזל:\n" +
  "1. אל תחשב גימטריה בעצמך — כל הערכים שסופקו כבר חושבו במנוע הרשמי. השתמש רק בהם.\n" +
  "2. הפרד תמיד עובדה (מה שסופק) מפרשנות (רמז משלים). אל תמציא ערכים, מקורות, פסוקים או עובדות.\n" +
  "3. בלי נבואות, בלי תאריכים עתידיים, בלי טענות על אנשים חיים.\n" +
  "4. אם אין קשר אמיתי בין הנתונים — אמור זאת ביושר, אל תמציא חיבור.\n" +
  "5. עברית בלבד, חם אך מדויק. בלי כותרות ובלי Markdown.";

// 🧭 מלווה-כניסה (kind="guide") — לא פרשן-גימטריה אלא נתב-ניווט. מקבל טקסט-חופשי של מבקר חדש
//    ומחזיר JSON עם יעד/ים מתוך רשימה סגורה בלבד (בלי להמציא כתובות). fast=Haiku, זול ומהיר.
const SYSTEM_GUIDE =
  "אתה מלווה-כניסה חם וידידותי באתר «סוד 1820» (גימטריה, תורה ורמזי גאולה). מבקר חדש כתב לך במילים שלו מה מביא אותו. תפקידך היחיד: לכוון אותו למקום הנכון באתר.\n" +
  "כללי ברזל:\n" +
  "1. החזר אך ורק JSON תקין ותו לא — בלי טקסט לפני/אחרי, בלי Markdown, בלי ```.\n" +
  "2. מבנה מדויק: {\"message\":\"<משפט חם אחד, עד 18 מילים>\",\"picks\":[{\"label\":\"<תווית קצרה עם אימוג'י>\",\"to\":\"<נתיב>\"}]}\n" +
  "3. picks = בין 1 ל-3 יעדים, אך ורק מהרשימה המותרת שסופקה (to חייב להיות זהה בדיוק). אסור להמציא נתיבים.\n" +
  "4. בלי נבואות, בלי הבטחות, בלי טענות על אנשים. עברית בלבד. אם לא ברור מה רוצים — כוון לדף המספר של 1820 ולמנוע החיפוש.";

// ===== 🌳 המוח-המשותף של רזיאל (גזע) =====
// persona="raziel" הופך את ai-analyze לרזיאל — אותה פרסונה + אותו זיכרון של הוואטסאפ (wa-christina).
// הפרסונה מגיעה ממקור-אמת יחיד ב-DB (fn_raziel_persona) → עדכון אחד משנה את שני הערוצים (חוק העץ האחד).
// אם ה-DB לא זמין — נפילה-בחן לעותק המוטמע (רזיאל עדיין עונה, בלי חוזה מקביל).
const RAZIEL_SITE_FALLBACK =
  "אתה רזיאל — פרשן גימטריה ותורה מטעם סוד 1820, והשער האישי למערכת המחקר. תמיד ענה בעברית בלבד.\n" +
  "חוקי ברזל: (1) אל תחשב גימטריה בעצמך — רק ערכים שסופקו לך. אל תמציא ערכים/פסוקים. (2) הפרד עובדה מרמז, בלי נבואות. " +
  "(3) חם, מדויק, עברית — בלי חתימה (הממשק מציג את זהותך). (4) אם ניתן זיכרון-רקע על המשתמש — התייחס בטבעיות. " +
  "(5) יש התכנסות אמיתית → בנה תשובה שכבה על שכבה; אין → קצר וישר. (6) לעולם אל תבקש מהמשתמש להריץ מנוע. " +
  "(7) סיים בשאלה מזמינה שממשיכה את המחקר. (8) גדול=רגיל כשאין סופיות — לא ממצא. (9) עובדה≠רמז, ענווה, בלי נבואות.\n" +
  "החזר אך ורק JSON תקין אחד: {\"v\":1,\"agent\":\"raziel\",\"context\":null,\"greeting\":null,\"answer\":\"...\",\"facts\":[{\"label\":\"...\",\"value\":\"...\"}],\"suggested_paths\":[{\"id\":\"...\",\"label\":\"...\",\"icon\":\"...\",\"hint\":\"...\"}],\"follow_up_question\":null,\"continue_wa\":true} — בלי טקסט לפני/אחרי, בלי Markdown.";

const svcHeaders = () => ({ apikey: SB_SVC, Authorization: `Bearer ${SB_SVC}`, "Content-Type": "application/json" });

// פרסונת-רזיאל ממקור-האמת היחיד (fn_raziel_persona) — משותפת עם wa-christina.
async function fetchRazielPersona(channel: string): Promise<string> {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/rpc/fn_raziel_persona`, {
      method: "POST", headers: svcHeaders(), body: JSON.stringify({ p_channel: channel }),
    });
    if (r.ok) { const t = await r.json(); if (typeof t === "string" && t.length > 60) return t; }
  } catch { /* נפילה לעותק המוטמע */ }
  return RAZIEL_SITE_FALLBACK;
}
// זיכרון משותף — אותו fn_raziel_context/remember שהוואטסאפ קורא/כותב.
async function fetchRazielContext(userRef: string, channel: string): Promise<any | null> {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/rpc/fn_raziel_context`, {
      method: "POST", headers: svcHeaders(), body: JSON.stringify({ p_user_ref: userRef, p_channel: channel }),
    });
    if (r.ok) return await r.json();
  } catch { /* noop */ }
  return null;
}
async function razielRemember(userRef: string, channel: string, content: string, topic: string | null = null) {
  if (!userRef || !content || content.trim().length < 2) return;
  try {
    await fetch(`${SB_URL}/rest/v1/rpc/fn_raziel_remember`, {
      method: "POST", headers: svcHeaders(),
      body: JSON.stringify({ p_user_ref: userRef, p_channel: channel, p_content: content.slice(0, 3000), p_memory_type: "conversation", p_scope: "personal", p_topic: topic, p_visibility: "private" }),
    });
  } catch { /* לא חוסם */ }
}
// זיכרון → טקסט-רקע לפרומפט (רק ב-DM/אתר-מזוהה; פרטי בלבד).
function razielContextText(ctx: any): string {
  if (!ctx) return "";
  const parts: string[] = [];
  const u = ctx.user_context || {};
  if (ctx.privacy?.personal_memory_allowed !== false) {
    if (u.summary) parts.push(`מה שאתה יודע על המשתמש: ${u.summary}`);
    if (Array.isArray(u.research_threads) && u.research_threads.length) parts.push(`נושאים שחקר לאחרונה: ${u.research_threads.slice(0, 5).join(" · ")}`);
    if (Array.isArray(u.approved_preferences) && u.approved_preferences.length) parts.push(`העדפות מאושרות: ${u.approved_preferences.join(" · ")}`);
  }
  if (!parts.length) return "";
  return `\n\nזיכרון-רקע (פרטי — התייחס בטבעיות, בלי לחשוף אותו כרשימה):\n${parts.join("\n")}`;
}
// חילוץ אובייקט JSON מפלט-המודל (עמיד לגדרות-קוד/רעש).
function parseContract(text: string): any | null {
  if (!text) return null;
  let t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const i = t.indexOf("{"), j = t.lastIndexOf("}");
  if (i < 0 || j <= i) return null;
  try { const o = JSON.parse(t.slice(i, j + 1)); return (o && typeof o === "object") ? o : null; } catch { return null; }
}

// ===== מנוע Claude (Anthropic) — ברירת-המחדל =====
async function runClaude(model: string, user: string, maxTokens: number, system: string = SYSTEM) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
  });
  if (!resp.ok) return { error: `anthropic_${resp.status}`, detail: (await resp.text()).slice(0, 200) };
  const data = await resp.json();
  if (data?.stop_reason === "refusal") return { error: "refusal" };
  const text = (data?.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n").trim();
  return { text: text || null, usage: data?.usage };
}

// ===== מנוע Gemini (Google) — מנוע נוסף להשוואה =====
// אותו SYSTEM (systemInstruction) + אותו user, כדי שההשוואה תהיה על אותן עובדות בדיוק.
async function runGemini(user: string, maxTokens: number) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      // thinkingBudget:0 — מכבה את שלב ה«חשיבה» של gemini-2.5-flash, אחרת הוא צורך את תקציב
      // הטוקנים על מחשבה פנימית והפלט הגלוי נקטע. ל-2-4 משפטי פרשנות לא צריך thinking.
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7, thinkingConfig: { thinkingBudget: 0 } },
    }),
  });
  if (!resp.ok) return { error: `gemini_${resp.status}`, detail: (await resp.text()).slice(0, 200) };
  const data = await resp.json();
  const cand = data?.candidates?.[0];
  if (cand?.finishReason === "SAFETY" || cand?.finishReason === "BLOCKLIST") return { error: "refusal" };
  const text = (cand?.content?.parts || []).map((p: any) => p?.text || "").join("\n").trim();
  const um = data?.usageMetadata;
  const usage = um ? { input_tokens: um.promptTokenCount || 0, output_tokens: um.candidatesTokenCount || 0 } : undefined;
  return { text: text || null, usage };
}

// ===== 📏 מכסת-AI (ai_quota_law) — אכיפה אמיתית בשרת =====
// אורח 3/יום · רשום 15/יום · מנוי 100/יום · אדמין ∞. הזהות: משתמש מאומת > visitor_id > IP.
const SB_URL = Deno.env.get("SUPABASE_URL") || "";
const SB_SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SB_ANON = (Deno.env.get("SUPABASE_ANON_KEY") || "").trim();

// מזהה תיר+זהות מהבקשה: מאמת את טוקן-המשתמש (אם יש), אחרת אורח לפי visitor_id/IP.
async function resolveIdentity(req: Request, body: any): Promise<{ identity: string; tier: string }> {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  // טוקן-משתמש אמיתי (לא anon-key) → אימות מול auth
  if (token && token !== SB_ANON && SB_URL) {
    try {
      const r = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SB_ANON || token, Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const u = await r.json();
        const uid = u?.id;
        if (uid) {
          let tier = "user";
          try {  // אדמין → ∞
            const rr = await fetch(`${SB_URL}/rest/v1/users?id=eq.${uid}&select=role`, { headers: { apikey: SB_SVC, Authorization: `Bearer ${SB_SVC}` } });
            const rows = rr.ok ? await rr.json() : [];
            if (rows?.[0]?.role === "admin") tier = "admin";
          } catch { /* ברירת-מחדל user */ }
          return { identity: `u:${uid}`, tier };
        }
      }
    } catch { /* נופל לאורח */ }
  }
  const vid = String(body?.visitor_id || "").slice(0, 60);
  if (vid) return { identity: `v:${vid}`, tier: "anon" };
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  return { identity: ip ? `ip:${ip}` : "", tier: "anon" };
}

async function checkQuota(identity: string, tier: string, limitOverride: number | null = null): Promise<{ allowed: boolean; used: number; limit: number | null; tier: string }> {
  // fail-open: אם בדיקת-המכסה נכשלת (DB), לא חוסמים את הפיצ׳ר — אבל הלוג עדיין נספר בהמשך.
  try {
    const r = await fetch(`${SB_URL}/rest/v1/rpc/ai_quota_check`, {
      method: "POST",
      headers: { apikey: SB_SVC, Authorization: `Bearer ${SB_SVC}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_identity: identity, p_tier: tier, p_limit_override: limitOverride }),
    });
    if (!r.ok) return { allowed: true, used: 0, limit: null, tier };
    return await r.json();
  } catch { return { allowed: true, used: 0, limit: null, tier }; }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const body = await req.json().catch(() => ({}));
    const engine = String(body?.engine || "claude").toLowerCase() === "gemini" ? "gemini" : "claude";
    if (engine === "claude" && !ANTHROPIC_KEY) return json({ analysis: null, engine, error: "not_configured" });
    if (engine === "gemini" && !GEMINI_KEY) return json({ analysis: null, engine, error: "not_configured" });

    const kind = String(body?.kind || "").slice(0, 40);
    const subject = String(body?.subject || "").slice(0, 300);

    // 🧭 kind="guide" — מלווה-כניסה (נתב ניווט). מסלול נפרד לגמרי מנתיב-הגימטריה:
    //    SYSTEM ייעודי, מודל מהיר (Haiku), רשימת-יעדים סגורה, פלט JSON. מכסה קלה (אנטי-לולאה).
    if (kind === "guide") {
      if (engine !== "claude" || !ANTHROPIC_KEY) return json({ analysis: null, error: "not_configured" });
      const ask = String(body?.subject || body?.facts || "").slice(0, 400).trim();
      if (!ask) return json({ analysis: null, error: "empty" });
      const { identity, tier } = await resolveIdentity(req, body);
      if (tier === "anon" || tier === "user") {   // אנטי-לולאה בלבד, נדיב
        const q = await checkQuota(`${identity}:g`, tier, tier === "anon" ? 40 : 300);
        if (!q.allowed) return json({ analysis: null, error: "quota", surface: "guide", tier: q.tier, used: q.used, limit: q.limit,
          message: "עברת את מכסת המלווה היומית — אבל כל הכלים פתוחים לך למטה." });
      }
      const routes =
        "רשימת היעדים המותרים (to — מתי לבחור):\n" +
        "/number — יש לו מספר / שם / מילה / ביטוי קונקרטי לבדוק (מנוע החיפוש הראשי)\n" +
        "/number/1820 — סקרן «מה זה 1820» או חדש לגמרי ורוצה טעימה\n" +
        "/סוד-1820 — רוצה קודם להבין מה זה האתר בכלל (פוסט המבוא)\n" +
        "/research?tool=gematria — רוצה לחשב גימטריה במחשבון\n" +
        "/research?tool=els — דילוגי-אותיות / הצופן התנ\"כי\n" +
        "/research?tool=verse — לחפש ביטוי/ערך בתוך פסוקי התורה\n" +
        "/beit-midrash — רוצה ללמוד את שיטות החישוב\n" +
        "/research — רוצה את כל הכלים / להעמיק בלי יעד מסוים\n" +
        "/archive?tab=reality — לראות רמזים מהמציאות / חדשות\n" +
        "/join — רוצה להצטרף / להירשם / וואטסאפ / קהילה\n" +
        "/members — מנוי מתקדם (בני ההיכל)\n" +
        "/post — לקרוא מאמרים ורמזים";
      const guideUser = `${routes}\n\nמה שהמבקר כתב: "${ask}"\n\nהחזר JSON בלבד לפי הכללים.`;
      const out = await runClaude(FAST_MODEL, guideUser, 320, SYSTEM_GUIDE);
      if (out.error) return json({ analysis: null, error: out.error, detail: out.detail });
      await logTokens("guide", FAST_MODEL, out.usage, identity);
      return json({ analysis: out.text, engine: "claude", model: FAST_MODEL });
    }

    // ===== 🌳 persona="raziel" — המוח-המשותף (רזיאל באתר = רזיאל בוואטסאפ) =====
    // מחזיר את חוזה raziel_response_contract (v1). קול+זיכרון ממקור-האמת היחיד. תאימות-לאחור:
    // אם המודל לא החזיר JSON תקין — נופל למחרוזת {analysis} והפרונט עוטף כ-{answer}.
    if (String(body?.persona || "").toLowerCase() === "raziel") {
      if (engine !== "claude" || !ANTHROPIC_KEY) return json({ analysis: null, error: "not_configured" });
      const rFacts = String(body?.facts || "").slice(0, 3500);
      const rSubject = subject;
      const rPath = String(body?.path || "").slice(0, 40);
      const rCtxHint = String(body?.context || "").slice(0, 600);
      const rAgain = !!body?.again;
      if (!rSubject && !rFacts) return json({ analysis: null, error: "empty" });

      const { identity, tier } = await resolveIdentity(req, body);
      // מכסת-AI (ai_quota_law) — רזיאל-עומק תחת אותה מכסה כמו שאר האתר (3/15/100/∞).
      const q = await checkQuota(identity, tier);
      if (!q.allowed) {
        return json({ analysis: null, error: "quota", surface: "raziel", tier: q.tier, used: q.used, limit: q.limit,
          message: q.tier === "anon"
            ? "השתמשת ב-3 שיחות-רזיאל המעמיקות היומיות. הירשמו בחינם (פחות מדקה) ל-15 ביום, ולשמירת המחקר והמשכיות."
            : "הגעת למכסת שיחות-רזיאל המעמיקות היומית. המכסה מתחדשת מחר." });
      }

      const userRef = identity.startsWith("u:") ? identity.slice(2) : null;  // זיכרון = למשתמש מזוהה בלבד
      const [persona, ctx] = await Promise.all([
        fetchRazielPersona("site"),
        userRef ? fetchRazielContext(userRef, "site") : Promise.resolve(null),
      ]);
      const ctxText = razielContextText(ctx);

      const user =
        (rSubject ? `הנושא הנוכחי: ${rSubject}\n` : "") +
        (rFacts ? `\nעובדות מאומתות מהמנוע (השתמש רק באלה, שבץ אותן ב-facts[]):\n${rFacts}\n` : "\n(לא סופקו עובדות-מנוע — אל תמציא ערכים; ענה על המשמעות והצע כיוון.)\n") +
        (rPath ? `\nהמשתמש בחר את מסלול-המחקר: "${rPath}". ענה עליו ב-answer, והצע 0-2 מסלולי-המשך חדשים.\n` : "") +
        (rCtxHint ? `\nהקשר-הגעה: ${rCtxHint}\n` : "") +
        (rAgain ? "\nזו בקשה לקריאה *נוספת* — הבא זווית/רובד אחר ממה שכבר נאמר.\n" : "") +
        ctxText +
        `\n\nכתוב את מענה-רזיאל לפי חוקי הברזל והחוזה. החזר JSON בלבד.`;

      const out = await runClaude(MODEL, user, 1600, persona);
      if (out.error) return json({ analysis: null, engine: "claude", model: MODEL, error: out.error, detail: out.detail });
      await logTokens("raziel", MODEL, out.usage, identity);
      // כתיבת-זיכרון (fire-and-forget) — אותו fn_raziel_remember של הוואטסאפ.
      if (userRef && rSubject) { try { await razielRemember(userRef, "site", rSubject, rSubject.slice(0, 80)); } catch { /* noop */ } }

      const contract = parseContract(out.text || "");
      if (contract) {
        contract.v = 1; contract.agent = "raziel";
        if (contract.continue_wa == null) contract.continue_wa = true;
        return json({ raziel: contract, engine: "claude", model: MODEL });
      }
      // נפילה-בחן: מחרוזת → הפרונט עוטף כ-{answer}.
      return json({ analysis: out.text, engine: "claude", model: MODEL });
    }

    const isCollection = kind === "research";
    const facts = String(body?.facts || "").slice(0, isCollection ? 3500 : 2000);
    const again = !!body?.again;
    if (!subject && !facts) return json({ analysis: null, engine, error: "empty" });

    // 📏 מכסת-AI (ai_quota_law) — רק ה-AI *העמוק* (Sonnet, ברירת-מחדל) תחת מכסת 3/יום.
    // ה-AI המהיר (fast=Haiku, דפי-מספר/מחשבון) = מסלול-חינם נדיב (אנטי-לולאה בלבד).
    // מסר-המסע (journey-message) לא עובר כאן כלל → נשאר חינם.
    const isDeep = !body?.fast;
    const { identity, tier } = await resolveIdentity(req, body);
    if (isDeep) {
      const q = await checkQuota(identity, tier);            // עמוק: 3/15/100/∞
      if (!q.allowed) {
        return json({ analysis: null, error: "quota", surface: "deep", tier: q.tier, used: q.used, limit: q.limit,
          message: q.tier === "anon"
            ? "השתמשת ב-3 ניתוחי-ה-AI המעמיקים היומיים. הירשמו בחינם (פחות מדקה) ל-15 ביום, ולשמירת היסטוריה ומסעות."
            : "הגעת למכסת ניתוחי-ה-AI המעמיקים היומית. המכסה מתחדשת מחר." });
      }
    } else if (tier === "anon" || tier === "user") {
      const lim = tier === "anon" ? 30 : 200;                // מהיר: נדיב, אנטי-לולאה; מנוי/אדמין = חופשי
      const q = await checkQuota(`${identity}:f`, tier, lim);
      if (!q.allowed) {
        return json({ analysis: null, error: "quota", surface: "fast", tier: q.tier, used: q.used, limit: q.limit,
          message: tier === "anon"
            ? "הגעת למכסת ה-AI המהיר היומית (נדיבה). הירשמו בחינם להמשך חלק ולשמירת ההיסטוריה."
            : "הגעת למכסת ה-AI המהיר היומית. המכסה מתחדשת מחר." });
      }
    }

    // ✨ ניתוח עמוק ממוזג ארוך (החלטת צוריאל 14.7): כשהלקוח שולח long=true — אין תקרת-משפטים,
    //    והתקציב מורם. אינרטי לגמרי בלי הדגל (לקוח ישן → התנהגות זהה להיום).
    const wantLong = !!body?.long;
    const hint = KIND_HINT[kind] || "ניתוח כללי של הנתון שסופק.";
    const lengthRule = wantLong
      ? "כתוב ניתוח מלא ומעמיק — אין הגבלת אורך. פְּתח במשמעות חמה וישירה, ואז העמק ושזור את ההתכנסויות/ההצלבות כהעשרה; תן לרעיון לנשום. אל תמתח באופן מלאכותי ואל תחזור על עצמך — עומק אמיתי, לא אריכות."
      : (isCollection ? "כתוב סינתזה שמחברת בין פריטי האוסף — עד 6 משפטים." : "2-4 משפטים.");
    const user =
      `סוג הניתוח: ${hint}\n\n` +
      (subject ? `הנושא: ${subject}\n` : "") +
      (facts ? `עובדות מאומתות מהמנוע (השתמש רק באלה):\n${facts}\n` : "") +
      (again ? "\nזו בקשה לקריאה *נוספת* — הבא זווית/רובד אחר ממה שכבר נאמר." : "") +
      `\nכתוב ניתוח בעברית לפי חוקי הברזל. ${lengthRule}`;

    const maxTokens = wantLong ? 3200 : (isCollection ? 650 : 400);
    const model = engine === "gemini" ? GEMINI_MODEL : (body?.fast ? FAST_MODEL : MODEL);
    const out = engine === "gemini" ? await runGemini(user, maxTokens) : await runClaude(model, user, maxTokens);

    if (out.error) return json({ analysis: null, engine, model, error: out.error, detail: out.detail });
    await logTokens(kind || "analyze", model, out.usage, identity);
    return json({ analysis: out.text, engine, model });
  } catch (e) {
    return json({ analysis: null, error: String(e).slice(0, 200) }, 200);
  }
});
