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

async function logTokens(kind: string, model: string, usage: { input_tokens?: number; output_tokens?: number } | undefined) {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key || !usage) return;
    await fetch(`${url}/rest/v1/ai_token_log`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ source: "analyze", kind, model, input_tokens: usage.input_tokens || 0, output_tokens: usage.output_tokens || 0 }),
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
  "אתה פרשן עברי באתר גימטריה ותורה. תפקידך: לתת ניתוח קצר, מכובד ומדויק בעברית.\n" +
  "חוקי ברזל:\n" +
  "1. אל תחשב גימטריה בעצמך — כל הערכים שסופקו כבר חושבו במנוע הרשמי. השתמש רק בהם.\n" +
  "2. הפרד תמיד עובדה (מה שסופק) מפרשנות (רמז משלים). אל תמציא ערכים, מקורות, פסוקים או עובדות.\n" +
  "3. בלי נבואות, בלי תאריכים עתידיים, בלי טענות על אנשים חיים.\n" +
  "4. אם אין קשר אמיתי בין הנתונים — אמור זאת ביושר, אל תמציא חיבור.\n" +
  "5. עברית בלבד, חם אך מדויק. בלי כותרות ובלי Markdown.";

// ===== מנוע Claude (Anthropic) — ברירת-המחדל =====
async function runClaude(model: string, user: string, maxTokens: number) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: maxTokens, system: SYSTEM, messages: [{ role: "user", content: user }] }),
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const body = await req.json().catch(() => ({}));
    const engine = String(body?.engine || "claude").toLowerCase() === "gemini" ? "gemini" : "claude";
    if (engine === "claude" && !ANTHROPIC_KEY) return json({ analysis: null, engine, error: "not_configured" });
    if (engine === "gemini" && !GEMINI_KEY) return json({ analysis: null, engine, error: "not_configured" });

    const kind = String(body?.kind || "").slice(0, 40);
    const subject = String(body?.subject || "").slice(0, 300);
    const isCollection = kind === "research";
    const facts = String(body?.facts || "").slice(0, isCollection ? 3500 : 2000);
    const again = !!body?.again;
    if (!subject && !facts) return json({ analysis: null, engine, error: "empty" });

    const hint = KIND_HINT[kind] || "ניתוח כללי של הנתון שסופק.";
    const lengthRule = isCollection ? "כתוב סינתזה שמחברת בין פריטי האוסף — עד 6 משפטים." : "2-4 משפטים.";
    const user =
      `סוג הניתוח: ${hint}\n\n` +
      (subject ? `הנושא: ${subject}\n` : "") +
      (facts ? `עובדות מאומתות מהמנוע (השתמש רק באלה):\n${facts}\n` : "") +
      (again ? "\nזו בקשה לקריאה *נוספת* — הבא זווית/רובד אחר ממה שכבר נאמר." : "") +
      `\nכתוב ניתוח בעברית לפי חוקי הברזל. ${lengthRule}`;

    const maxTokens = isCollection ? 650 : 400;
    const model = engine === "gemini" ? GEMINI_MODEL : (body?.fast ? FAST_MODEL : MODEL);
    const out = engine === "gemini" ? await runGemini(user, maxTokens) : await runClaude(model, user, maxTokens);

    if (out.error) return json({ analysis: null, engine, model, error: out.error, detail: out.detail });
    await logTokens(kind || "analyze", model, out.usage);
    return json({ analysis: out.text, engine, model });
  } catch (e) {
    return json({ analysis: null, error: String(e).slice(0, 200) }, 200);
  }
});
