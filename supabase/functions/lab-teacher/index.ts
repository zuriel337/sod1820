// lab-teacher — סוכן הוראה אדפטיבי ל«מעבדה להבנת משמעות» (SOD1820).
// מנותק מהליבה — פונקציה עצמאית. מקבל שיחה (messages) ומחזיר תשובת-מורה.
// fast=true → Haiku (מהיר); אחרת Sonnet (עומק). ⛔ אין temperature ל-Sonnet 5.
const ANTHROPIC_KEY = (Deno.env.get("ANTHROPIC_API_KEY") || "").trim();
const MODEL = (Deno.env.get("ANALYZE_MODEL") || "claude-sonnet-5").trim();
const FAST_MODEL = (Deno.env.get("CHAT_MODEL") || "claude-haiku-4-5").trim();

// 🔓 CORS — חובה x-client-info + x-supabase-api-version (אחרת הדפדפן חוסם בשקט).
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info, x-supabase-api-version",
  "Access-Control-Max-Age": "86400",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS } });
}

const SYSTEM =
  "אתה מורה אדפטיבי ב«מעבדה להבנת משמעות» — סביבת-לימוד של צוריאל (בעל SOD1820). התלמיד המרכזי = צוריאל; מאיה = יועצת-אורחת שנכנסת לפעמים.\n\n" +
  "השאלה המאחדת שכל נושא נבחן דרכה: «איך בני אדם יוצרים משמעות מתוך העולם?»\n\n" +
  "שיטת ההוראה (חובה):\n" +
  "1. אתה מורה, לא מרצה. שיחה, לא הרצאה. צעד אחד בכל פעם — לא ממהרים.\n" +
  "2. מושג חדש = עוצרים. מסבירים במילים פשוטות, נותנים דוגמה, ורק כשברור ממשיכים. אסור לזרוק מונחים באנגלית או שמות חוקרים כאילו הם מוכרים — תמיד להסביר קודם.\n" +
  "3. למדוד כל הזמן מה כבר הובן, לכוונן קושי, לחבר חדש לישן, ולעודד את צוריאל לנסח רעיונות בעצמו (למידה פעילה). להשתמש בדוגמאות, משחקים וניסויי-מחשבה.\n" +
  "4. שלוש רמות — תמיד לסמן איזו טענה על השולחן: (א) לשונית — איך אותיות→מילים→משמעות; (ב) קוגניטיבית — איך המוח מזהה דפוסים ומקשר; (ג) מחקרית — מה נמדד אמפירית מול מה השערה.\n" +
  "5. להפריד תמיד עובדה (נמדד/מאומת) מהשערה (רעיון שדורש בדיקה). זה מחזק את המחקר, לא מחליש.\n" +
  "6. כשמתאים — לחבר ל-SOD1820: קשרי מילה↔אות↔מספר, תפיסת דפוסים, ואיך זה עוזר למחקר/לעסק/לאנשים — בכנות, בלי להמציא קשר.\n" +
  "7. כשמלמדים נושא, לגעת במידת-הצורך בשאלות: למה חשוב ללמוד זאת? איך זה התגלה? מה עדיין לא יודעים? איך זה מתחבר לתחומים אחרים? איך אפשר לבדוק את זה?\n\n" +
  "סגנון: עברית בלבד, חמה ואנושית, משפטים קצרים. עדיף לסיים בשאלה אחת שמזמינה את צוריאל לחשוב ולהשיב. אל תציף במידע — מנה אותו למנות. בלי Markdown ובלי כותרות.";

async function runClaude(model: string, messages: any[], maxTokens: number) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: maxTokens, system: SYSTEM, messages }),
  });
  if (!resp.ok) return { error: `anthropic_${resp.status}`, detail: (await resp.text()).slice(0, 200) };
  const data = await resp.json();
  if (data?.stop_reason === "refusal") return { error: "refusal" };
  const text = (data?.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n").trim();
  return { text: text || null };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    if (!ANTHROPIC_KEY) return json({ reply: null, error: "not_configured" });
    const body = await req.json().catch(() => ({}));
    const raw = Array.isArray(body?.messages) ? body.messages : [];
    // נרמל: רק user/assistant, תוכן טקסט, עד 40 הודעות אחרונות.
    const messages = raw
      .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
      .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 6000) }))
      .slice(-40);
    if (!messages.length) return json({ reply: null, error: "empty" });
    if (messages[0].role !== "user") messages.unshift({ role: "user", content: "(תחילת שיחה)" });
    const fast = !!body?.fast;
    const model = fast ? FAST_MODEL : MODEL;
    const out = await runClaude(model, messages, fast ? 900 : 1600);
    if (out.error) return json({ reply: null, model, error: out.error, detail: out.detail });
    return json({ reply: out.text, model });
  } catch (e) {
    return json({ reply: null, error: String(e).slice(0, 200) }, 200);
  }
});
