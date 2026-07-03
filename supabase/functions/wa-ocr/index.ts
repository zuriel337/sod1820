// 👁️ wa-ocr — קורא תמונה בקבוצת וואטסאפ (טופס לוטו/צ'אנס וכו') דרך Claude vision.
// קלט: {chatId, idMessage} (מושך downloadUrl מ-Green) או {imageUrl}. מחזיר {text, numbers}.
// יושר: תעתוק בלבד — לא מחשב גימטריה כאן (זה נעשה במנוע אחר כך).
import { createClient } from "jsr:@supabase/supabase-js@2";

const SECRET = "s0d1820wahook_7yq2c9";
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const MODEL = Deno.env.get("OCR_MODEL") || "claude-sonnet-4-6";
const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

function mediaType(url: string): string {
  const u = url.toLowerCase().split("?")[0];
  if (u.endsWith(".png")) return "image/png";
  if (u.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}
function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf); let bin = ""; const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(bin);
}
async function downloadUrl(chatId: string, idMessage: string): Promise<string> {
  const { data } = await sb.rpc("wa_admin", { p_method: "downloadFile", p_payload: { chatId, idMessage }, p_http: "POST" });
  return (data as { result?: { downloadUrl?: string } })?.result?.downloadUrl || "";
}
async function ocr(imageUrl: string) {
  const r = await fetch(imageUrl); if (!r.ok) throw new Error(`img ${r.status}`);
  const b64 = toBase64(await r.arrayBuffer());
  const prompt = 'זו תמונה — אולי טופס לוטו/צ׳אנס/פיס. החזר JSON תקין בלבד (בלי Markdown): {"text": string, "numbers": number[]}. ' +
    "text = תעתוק מדויק של כל הטקסט/המספרים בתמונה, שורה-שורה. " +
    "numbers = כל המספרים שמולאו או מסומנים בטופס, כספרות שלמות (תעתוק בלבד — אל תחשב כלום).";
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: 1500, messages: [{ role: "user", content: [
      { type: "image", source: { type: "base64", media_type: mediaType(imageUrl), data: b64 } },
      { type: "text", text: prompt },
    ] }] }),
  });
  if (!resp.ok) throw new Error(`anthropic ${resp.status}: ${(await resp.text()).slice(0, 160)}`);
  const data = await resp.json();
  const raw = (data.content || []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("\n");
  const clean = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  let p: { text?: string; numbers?: unknown[] } = {};
  try { p = JSON.parse(clean); } catch { p = { text: clean, numbers: [] }; }
  const numbers = Array.isArray(p.numbers)
    ? [...new Set(p.numbers.map((n) => parseInt(String(n), 10)).filter((n) => Number.isInteger(n) && n >= 0 && n < 1000000))]
    : [];
  return { text: typeof p.text === "string" ? p.text : "", numbers };
}

Deno.serve(async (req) => {
  try {
    if (new URL(req.url).searchParams.get("s") !== SECRET) return new Response("forbidden", { status: 403 });
    if (!ANTHROPIC_KEY) return json({ error: "not_configured" });
    const body = await req.json().catch(() => ({}));
    let imageUrl = body.imageUrl || "";
    if (!imageUrl && body.chatId && body.idMessage) imageUrl = await downloadUrl(body.chatId, body.idMessage);
    if (!imageUrl) return json({ error: "no_image" });
    const res = await ocr(imageUrl);
    return json(res);
  } catch (e) {
    return json({ error: String(e).slice(0, 200) }, 200);
  }
});
