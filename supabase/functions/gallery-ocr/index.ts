// gallery-ocr v5 — סריקה מלאה: טקסט + תיאור + ישויות + מספרים + סוג תמונה + גימטריה מובנית (ביטוי + כל השיטות)
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
function parseJsonLoose(raw: string): any {
  const clean = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  try { return JSON.parse(clean); } catch { /* try salvage */ }
  const a = clean.indexOf("{"); const b = clean.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(clean.slice(a, b + 1)); } catch { /* ignore */ } }
  return { text: clean, scene: "", entities: [], numbers: [], image_type: "", gematria: null };
}
async function scanImage(imageUrl: string): Promise<{ text: string; numbers: number[]; meta: Record<string, unknown> }> {
  const imgResp = await fetch(imageUrl);
  if (!imgResp.ok) throw new Error(`fetch image ${imgResp.status}`);
  const buf = await imgResp.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) throw new Error("too_large");
  const b64 = toBase64(buf);
  const prompt =
    "נתח את התמונה במלואה. החזר אך ורק JSON תקין ללא Markdown במבנה: " +
    '{"text": string, "scene": string, "entities": string[], "numbers": number[], "image_type": string, "gematria": {"phrase": string, "values": {"<שם השיטה>": number}} | null}. ' +
    "text = תעתוק מדויק של כל הטקסט בתמונה (עברית/אנגלית), שורה אחר שורה. " +
    "scene = משפט-שניים בעברית שמתארים מה רואים בתמונה (אובייקטים, אנשים, מקום, פעולה). " +
    "entities = רשימת מילות-מפתח בעברית של מה שמופיע/נרמז: חפצים (למשל רכב, תרנגול), מקומות (למשל הודו), אישים, בעלי-חיים, סמלים, ומושגים תורניים/תיאולוגיים. " +
    "numbers = כל מספר שלם שמופיע בתמונה כספרות (אל תחשב גימטריה — רק תעתוק). " +
    'image_type = אחד מ: "gematria" (צילום מסך של תוכנת/מחשבון גימטריה), "news" (כתבה/צילום מסך חדשותי), "photo" (תצלום מהמציאות), "document" (מסמך/טקסט), "other". ' +
    "gematria = אם ורק אם זו תוכנת/מחשבון גימטריה: phrase = הביטוי/המילה שמחושב/ת, values = אובייקט של כל השיטות שמופיעות עם ערכן המספרי (לדוגמה {\"רגיל\":1139,\"גדול\":1139,\"משולש\":4531,\"ריבוע\":4865,\"מילוי\":2729,\"אתבש\":1537}). שמור על שמות השיטות בדיוק כפי שמופיעים בתמונה. אם זו אינה תוכנת גימטריה — gematria=null.";
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: MODEL, max_tokens: 4000,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: mediaType(imageUrl), data: b64 } },
        { type: "text", text: prompt },
      ] }],
    }),
  });
  if (!resp.ok) throw new Error(`anthropic ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  const data = await resp.json();
  const raw = (data.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n");
  const p = parseJsonLoose(raw);
  const text = typeof p.text === "string" ? p.text : "";
  const scene = typeof p.scene === "string" ? p.scene : "";
  const entities = Array.isArray(p.entities) ? p.entities.map((x: any) => String(x).trim()).filter(Boolean) : [];
  const imageType = typeof p.image_type === "string" ? p.image_type.trim() : "";
  // גימטריה מובנית
  let gematria: any = null;
  if (p.gematria && typeof p.gematria === "object" && (p.gematria.phrase || p.gematria.values)) {
    const vals: Record<string, number> = {};
    if (p.gematria.values && typeof p.gematria.values === "object") {
      for (const [k, v] of Object.entries(p.gematria.values)) {
        const n = parseInt(String(v), 10);
        if (Number.isInteger(n)) vals[String(k).trim()] = n;
      }
    }
    gematria = { phrase: typeof p.gematria.phrase === "string" ? p.gematria.phrase.trim() : "", values: vals };
  }
  // איגוד מספרים: מהתמונה + ערכי שיטות הגימטריה
  const fromImg = Array.isArray(p.numbers) ? p.numbers.map((n: any) => parseInt(n, 10)) : [];
  const fromGem = gematria ? Object.values(gematria.values as Record<string, number>) : [];
  const numbers = [...new Set([...fromImg, ...fromGem]
    .filter((n: number) => Number.isInteger(n) && n >= 0 && n < 1_000_000))];
  const combined = [
    text,
    scene ? `תיאור: ${scene}` : "",
    entities.length ? `נושאים: ${entities.join(", ")}` : "",
    gematria ? `גימטריה: ${gematria.phrase} — ${Object.entries(gematria.values).map(([k, v]) => `${k} ${v}`).join(", ")}` : "",
  ].filter(Boolean).join("\n\n");
  const meta = { scene, entities, image_type: imageType, gematria };
  return { text: combined, numbers, meta };
}

Deno.serve(async (req: Request) => {
  try {
    if (RUN_KEY && req.headers.get("x-run-key") !== RUN_KEY) return json({ error: "unauthorized" }, 401);
    if (!ANTHROPIC_KEY) return json({ error: "missing ANTHROPIC_API_KEY secret" }, 500);

    let limit = 5, retry = false, rescanOld = false;
    try {
      const b = await req.json();
      if (b?.limit) limit = Math.min(+b.limit, 50);
      if (b?.retry_errors) retry = true;
      if (b?.rescan_old) rescanOld = true; // סריקה מחדש של פורמט ישן (ללא "תיאור:")
    } catch { /* defaults */ }

    let filter = "ocr_status=eq.pending";
    if (retry) filter = "ocr_status=in.(pending,error)";
    if (rescanOld) filter = "ocr_status=eq.done&ocr_text=not.ilike.*תיאור:*";
    const selUrl = `${SUPABASE_URL}/rest/v1/gallery_images?${filter}&image_url=not.is.null&select=id,image_url&limit=${limit}`;
    const sel = await fetch(selUrl, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } });
    const selBody = await sel.text();
    let rows: any;
    try { rows = JSON.parse(selBody); } catch { return json({ stage: "select_parse", status: sel.status, body: selBody.slice(0, 300) }, 500); }
    if (!Array.isArray(rows)) return json({ stage: "select", status: sel.status, body: rows }, 500);

    let done = 0, errors = 0;
    const sample: any[] = [];
    for (const row of rows) {
      try {
        const { text, numbers, meta } = await scanImage(row.image_url);
        await patchRow(row.id, { ocr_text: text, ocr_numbers: numbers, ocr_meta: meta, image_type: (meta as any).image_type || null, ocr_status: "done", ocr_at: new Date().toISOString() });
        done++;
        if (sample.length < 2) sample.push({ url: row.image_url, numbers, image_type: (meta as any).image_type, gematria: (meta as any).gematria, preview: text.slice(0, 160) });
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
