// gallery-ocr v3 — הבנת תמונה מלאה: טקסט+מספרים + סיווג מובנה (ocr_meta)
// פרוס דרך MCP deploy_edge_function (verify_jwt=false). נקרא עם limit (ברירת מחדל 3).
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const MODEL = Deno.env.get("OCR_MODEL") || "claude-sonnet-4-6";
const MAX_BYTES = 4_500_000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
function mediaType(url: string): string {
  const u = url.toLowerCase().split("?")[0];
  if (u.endsWith(".png")) return "image/png";
  if (u.endsWith(".webp")) return "image/webp";
  if (u.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}
function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf); let bin = ""; const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(bin);
}
async function patchRow(id: string, body: Record<string, unknown>) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/gallery_images?id=eq.${id}`, {
    method: "PATCH",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`patch ${r.status}: ${(await r.text()).slice(0, 200)}`);
}
const PROMPT = [
  "נתח את התמונה והחזר אך ורק JSON תקין (ללא Markdown) עם השדות הבאים:",
  "text: תעתוק מדויק של כל הטקסט בתמונה (עברית/אנגלית), שורה אחר שורה.",
  "numbers: מערך כל המספרים השלמים שמופיעים כספרות (ללא חישוב).",
  "category: סוג התמונה — אחד מ: news_screenshot, document, portrait, car, map, gematria_chart, building, nature, event_photo, meme, social_post, video_frame, weapon, money, religious, other.",
  "is_news: true/false — האם זו ידיעה או צילום מסך חדשותי.",
  "country: שם המדינה הרלוונטית בתמונה בעברית (למשל סין, איראן, ארהב, ישראל), אחרת null.",
  "source: שם מקור החדשות/הפרסום אם מזוהה (ערוץ/אתר/רשת חברתית), אחרת null.",
  "topic: נושא קצר בעברית (2-5 מילים).",
  "people: מערך שמות אנשים שמופיעים או מוזכרים.",
  "gematria_word: אם זו תמונה ממחשבון/תוכנת גימטריה — המילה או הביטוי העברי המרכזי שמחושב; אחרת null.",
  "language: שפת הטקסט הראשית (עברית/אנגלית/אחר).",
  "summary: תיאור קצר במשפט אחד מה רואים בתמונה.",
].join("\n");
async function analyze(imageUrl: string) {
  const imgResp = await fetch(imageUrl);
  if (!imgResp.ok) throw new Error(`fetch image ${imgResp.status}`);
  const buf = await imgResp.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) throw new Error("too_large");
  const b64 = toBase64(buf);
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: 1800, messages: [{ role: "user", content: [
      { type: "image", source: { type: "base64", media_type: mediaType(imageUrl), data: b64 } },
      { type: "text", text: PROMPT },
    ] }] }),
  });
  if (!resp.ok) throw new Error(`anthropic ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  const data = await resp.json();
  const raw = (data.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n");
  const clean = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  let o: any = {};
  try { o = JSON.parse(clean); } catch { o = { text: clean }; }
  const numbers = Array.isArray(o.numbers)
    ? [...new Set(o.numbers.map((n: any) => parseInt(n, 10)).filter((n: number) => Number.isInteger(n) && n >= 0 && n < 100000))]
    : [];
  const meta = {
    category: o.category ?? null, is_news: o.is_news ?? null, country: o.country ?? null,
    source: o.source ?? null, topic: o.topic ?? null,
    people: Array.isArray(o.people) ? o.people.slice(0, 20) : [],
    gematria_word: o.gematria_word ?? null,
    language: o.language ?? null, summary: o.summary ?? null,
  };
  return { text: typeof o.text === "string" ? o.text : "", numbers, meta };
}
Deno.serve(async (req: Request) => {
  try {
    if (!ANTHROPIC_KEY) return json({ error: "missing ANTHROPIC_API_KEY" }, 500);
    let limit = 3;
    try { const b = await req.json(); if (b?.limit) limit = Math.min(+b.limit, 20); } catch { /* */ }
    // בוחר כל תמונה שעדיין חסר לה הסיווג העשיר (ocr_meta) — כולל כאלה שכבר נסרקו לטקסט בלבד
    const sel = await fetch(`${SUPABASE_URL}/rest/v1/gallery_images?ocr_meta=is.null&image_url=not.is.null&select=id,image_url&limit=${limit}`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } });
    const rows = await sel.json();
    if (!Array.isArray(rows)) return json({ stage: "select", body: rows }, 500);
    let done = 0, errors = 0; const sample: any[] = [];
    for (const row of rows) {
      try {
        const { text, numbers, meta } = await analyze(row.image_url);
        await patchRow(row.id, { ocr_text: text, ocr_numbers: numbers, ocr_meta: meta, ocr_status: "done", ocr_at: new Date().toISOString() });
        done++;
        if (sample.length < 3) sample.push({ url: row.image_url, ...meta, numbers });
      } catch (e) {
        try { await patchRow(row.id, { ocr_status: "error", ocr_text: String(e).slice(0, 400), ocr_at: new Date().toISOString() }); } catch { /* */ }
        errors++;
      }
    }
    return json({ picked: rows.length, done, errors, sample });
  } catch (e) {
    return json({ stage: "handler", error: String(e) }, 500);
  }
});
