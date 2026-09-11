// post-ai-edit — AI post-content editor. G0 hardened: canonical admin authorization is required before any provider call.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANTHROPIC_KEY = (Deno.env.get("ANTHROPIC_API_KEY") || "").trim();
const GEMINI_KEY = (Deno.env.get("GEMINI_API_KEY") || "").trim();
const MODEL = (Deno.env.get("ANALYZE_MODEL") || "claude-sonnet-5").trim();
const GEMINI_MODEL_RAW = (Deno.env.get("GEMINI_MODEL") || "").trim();
const GEMINI_MODEL = GEMINI_MODEL_RAW.startsWith("gemini") ? GEMINI_MODEL_RAW : "gemini-2.5-flash";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info, x-supabase-api-version",
  "Access-Control-Max-Age": "86400",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS } });
}

async function requireCanonicalAdmin(req: Request): Promise<boolean> {
  const authz = req.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authz) || !SUPABASE_URL || !ANON_KEY) return false;
  const actor = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authz } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await actor.rpc("rd_is_admin");
  return !error && data === true;
}

async function logTokens(model: string, usage: { input_tokens?: number; output_tokens?: number } | undefined) {
  try {
    if (!SUPABASE_URL || !SERVICE_KEY || !usage) return;
    await fetch(`${SUPABASE_URL}/rest/v1/ai_token_log`, {
      method: "POST",
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ source: "post-edit", kind: "edit", model, input_tokens: usage.input_tokens || 0, output_tokens: usage.output_tokens || 0 }),
    });
  } catch { /* token logging does not block the editor */ }
}

const SYSTEM =
  "אתה עורך-תוכן מקצועי של אתר 'סוד 1820' (גימטריה, תורה וחכמת הקשרים). מקבלים ממך HTML של פוסט + הוראת-עריכה, ואתה מחזיר HTML משופר.\n" +
  "כללי-ברזל:\n" +
  "1. החזר רק את תוכן גוף הפוסט — HTML נקי ומודרני בלבד. ⛔ אסור מסמך שלם: בלי <!DOCTYPE>, <html>, <head>, <body>, <meta>, <title>, ובלי <style> עם כללי-body או עיצוב גלובלי. בלי Markdown, בלי גדרות-קוד (```), בלי הסברים לפני/אחרי. רק תגיות תוכן: <p>/<h2>/<h3>/<blockquote>/<ul>/<li>/<div>/<img>/<b>/<a>.\n" +
  "2. עברית, RTL. פסקאות ב-<p>, כותרות-משנה ב-<h2>/<h3>, הדגשות ב-<b>. טקסט זורם ונעים לקריאה.\n" +
  "3. אל תמציא ערכי גימטריה, פסוקים או מקורות. שמור על כל ערך/עובדה מהמקור. הפרד עובדה (מאומת) מרמז (פרשנות). בלי נבואות/תאריכים עתידיים/טענות על אנשים חיים.\n" +
  "4. פסוק/ציטוט-מקור: <blockquote class=\"sod-verse\">…«הפסוק»… <b>מילים מרכזיות</b></blockquote>.\n" +
  "5. ריבוע גימטריה — רק כשיש שוויון/התכנסות אמיתי (≥2 ביטויים באותו ערך): <div class=\"sod-gematria-box\"><div class=\"gb-title\">🔢 גימטריה — עובדה מאומתת במנוע</div><div class=\"gb-rows\"><div><b>ערך</b> = ביטוי = ביטוי</div></div><div class=\"gb-note\">…</div></div>. אין שוויון → אין ריבוע.\n" +
  "6. ביטוי-גימטריה בטקסט: <a href=\"/number/הביטוי\" class=\"sod-gemlink\" data-gem=\"הביטוי\">הביטוי</a>; ערך מספרי: <a href=\"/number/הערך\" class=\"sod-numlink\" data-gem=\"הערך\"><b>הערך</b></a>.\n" +
  "7. שמור על תמונות קיימות (<img>) ועל בלוקי <style> אם קיימים במקור (אנימציות פנימיות בלבד, לא עיצוב גלובלי).\n" +
  "8. אם אין תוכן קודם (פוסט חדש) — כתוב פוסט חדש מלא לפי ההוראה. אם יש — ערוך אותו לפי ההוראה תוך שמירה על המבנה והעובדות.";

function stripFences(t: string): string {
  let s = (t || "").trim();
  const fence = s.match(/^```(?:html)?\s*([\s\S]*?)\s*```$/i);
  if (fence) s = fence[1].trim();
  return s;
}
function extractBody(t: string): string {
  let s = stripFences(t);
  const bm = s.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bm) s = bm[1];
  s = s.replace(/<!DOCTYPE[^>]*>/gi, "")
       .replace(/<\/?html[^>]*>/gi, "")
       .replace(/<head[\s\S]*?<\/head>/gi, "")
       .replace(/<\/?body[^>]*>/gi, "")
       .replace(/<meta[^>]*>/gi, "")
       .replace(/<title[\s\S]*?<\/title>/gi, "");
  return s.trim();
}

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

async function runGemini(user: string, maxTokens: number) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.6, thinkingConfig: { thinkingBudget: 0 } },
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
  if (req.method !== "POST") return json({ html: null, error: "method_not_allowed" }, 405);
  if (!(await requireCanonicalAdmin(req))) return json({ html: null, error: "forbidden" }, 403);

  try {
    const body = await req.json().catch(() => ({}));
    const engine = String(body?.engine || "gemini").toLowerCase() === "claude" ? "claude" : "gemini";
    if (engine === "claude" && !ANTHROPIC_KEY) return json({ html: null, engine, error: "not_configured" });
    if (engine === "gemini" && !GEMINI_KEY) return json({ html: null, engine, error: "not_configured" });

    const title = String(body?.title || "").slice(0, 300);
    const instruction = String(body?.instruction || "").slice(0, 4000);
    const content = String(body?.content || "").slice(0, 24000);
    if (!instruction) return json({ html: null, engine, error: "empty_instruction" }, 400);

    const user =
      (title ? `כותרת הפוסט: ${title}\n\n` : "") +
      `הוראת העריכה:\n${instruction}\n\n` +
      (content
        ? `תוכן ה-HTML הנוכחי של הפוסט:\n\"\"\"\n${content}\n\"\"\"\n\nהחזר את כל גוף ה-HTML המעודכן (רק תגיות תוכן, בלי מסמך שלם, בלי הסברים).`
        : `אין תוכן קודם — כתוב פוסט חדש מלא כתגיות תוכן HTML לפי ההוראה (בלי מסמך שלם, בלי הסברים).`);

    const maxTokens = 8000;
    const model = engine === "gemini" ? GEMINI_MODEL : MODEL;
    const out = engine === "gemini" ? await runGemini(user, maxTokens) : await runClaude(model, user, maxTokens);

    if (out.error) return json({ html: null, engine, model, error: out.error, detail: out.detail }, 502);
    await logTokens(model, out.usage);
    return json({ html: out.text ? extractBody(out.text) : null, engine, model });
  } catch (error) {
    return json({ html: null, error: String(error).slice(0, 200) }, 500);
  }
});
