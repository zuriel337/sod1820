// gallery-ocr v4 — סריקה מלאה: תמלול טקסט + תיאור סצנה + ישויות/נושאים + מספרים
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const RUN_KEY = Deno.env.get("OCR_RUN_KEY") || "";
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
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
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
async function scanImage(imageUrl: string): Promise<{ text: string; numbers: number[] }> {
  const imgResp = await fetch(imageUrl);
  if (!imgResp.ok) throw new Error(`fetch image ${imgResp.status}`);
  const buf = await imgResp.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) throw new Error("too_large");
  const b64 = toBase64(buf);
  const prompt =
    "נתח את התמונה במלואה. החזר אך ורק JSON תקין ללא Markdown במבנה: " +
    '{"text": string, "scene": string, "entities": string[], "numbers": number[]}. ' +
    "text = תעתוק מדויק של כל הטקסט בתמונה (עברית/אנגלית), שורה אחר שורה. " +
    "scene = משפט-שניים בעברית שמתארים מה רואים בתמונה (אובייקטים, אנשים, מקום, פעולה). " +
    "entities = רשימת מילות-מפתח בעברית של מה שמופיע/נרמז: חפצים (למשל רכב, תרנגול), מקומות (למשל הודו), אישים, בעלי-חיים, סמלים, ומושגים תורניים/תיאולוגיים. " +
    "numbers = כל מספר שלם שמופיע בתמונה כספרות (אל תחשב גימטריה — רק תעתוק).";
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: MODEL, max_tokens: 2000,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: mediaType(imageUrl), data: b64 } },
        { type: "text", text: prompt },
      ] }],
    }),
  });
  if (!resp.ok) throw new Error(`anthropic ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  const data = await resp.json();
  const raw = (data.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n");
  const clean = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  let p: any = {};
  try { p = JSON.parse(clean); } catch { p = { text: clean, scene: "", entities: [], numbers: [] }; }
  const text = typeof p.text === "string" ? p.text : "";
  const scene = typeof p.scene === "string" ? p.scene : "";
  const entities = Array.isArray(p.entities) ? p.entities.map((x: any) => String(x).trim()).filter(Boolean) : [];
  const numbers = Array.isArray(p.numbers)
    ? [...new Set(p.numbers.map((n: any) => parseInt(n, 10)).filter((n: number) => Number.isInteger(n) && n >= 0 && n < 100000))]
    : [];
  const combined = [
    text,
    scene ? `תיאור: ${scene}` : "",
    entities.length ? `נושאים: ${entities.join(", ")}` : "",
  ].filter(Boolean).join("\n\n");
  return { text: combined, numbers };
}

Deno.serve(async (req: Request) => {
  try {
    if (RUN_KEY && req.headers.get("x-run-key") !== RUN_KEY) return json({ error: "unauthorized" }, 401);
    if (!ANTHROPIC_KEY) return json({ error: "missing ANTHROPIC_API_KEY secret" }, 500);

    let limit = 5, retry = false;
    try { const b = await req.json(); if (b?.limit) limit = Math.min(+b.limit, 50); if (b?.retry_errors) retry = true; } catch { /* defaults */ }

    const statusFilter = retry ? "in.(pending,error)" : "eq.pending";
    const selUrl = `${SUPABASE_URL}/rest/v1/gallery_images?ocr_status=${statusFilter}&image_url=not.is.null&select=id,image_url&limit=${limit}`;
    const sel = await fetch(selUrl, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } });
    const selBody = await sel.text();
    let rows: any;
    try { rows = JSON.parse(selBody); } catch { return json({ stage: "select_parse", status: sel.status, body: selBody.slice(0, 300) }, 500); }
    if (!Array.isArray(rows)) return json({ stage: "select", status: sel.status, body: rows }, 500);

    let done = 0, errors = 0;
    const sample: any[] = [];
    for (const row of rows) {
      try {
        const { text, numbers } = await scanImage(row.image_url);
        await patchRow(row.id, { ocr_text: text, ocr_numbers: numbers, ocr_status: "done", ocr_at: new Date().toISOString() });
        done++;
        if (sample.length < 2) sample.push({ url: row.image_url, numbers, preview: text.slice(0, 160) });
      } catch (e) {
        try { await patchRow(row.id, { ocr_status: "error", ocr_text: String(e).slice(0, 500), ocr_at: new Date().toISOString() }); } catch { /* ignore */ }
        errors++;
        if (sample.length < 2) sample.push({ url: row.image_url, error: String(e).slice(0, 200) });
      }
    }
    return json({ picked: rows.length, done, errors, sample });
  } catch (e) {
    return json({ stage: "handler", error: String(e), stack: (e as any)?.stack?.slice(0, 400) }, 500);
  }
});
