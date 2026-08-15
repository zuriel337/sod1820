// capture-video-thumb — שומר פריים ברזולוציה מלאה שנלכד בצד-הלקוח (canvas) כתמונת-כיסוי לוידאו.
// הלקוח (StoryViewer/רצועות אור-הגאולה) טוען <video crossorigin> מוסתר, מצייר פריים ל-<canvas>
// בגודל המקורי המלא (videoWidth×videoHeight), ומייצא JPEG איכותי — «פיקסלים בדיוק כמו הווידאו».
// כאן רק שומרים: מעלים ל-Storage וקובעים channel_updates.thumb_url — *רק אם הוא עדיין ריק*.
//
// ⚠️ פונקציה ציבורית (בלי סוד — הלקוח לא יכול להחזיק סוד), לכן מוגנת בהיצרות:
//   • טבלה קבועה channel_updates בלבד · • עדכון רק כשה-thumb ריק (אין דריסה) · • תקרת-גודל · • JPEG בלבד.
// כך הנזק המרבי מקריאה זדונית = למלא thumb חסר בתמונה — אדמין תמיד יכול לחדש דרך gen-thumb.
//
// POST { id, b64 }  → { ok, public_url } | { ok:true, skipped:"has_thumb"|"no_row" }

import { createClient } from "jsr:@supabase/supabase-js@2";

const SB_URL = Deno.env.get("SUPABASE_URL") || "";
const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const BUCKET = "media";
const PREFIX = "_thumb/c/";                 // תואם ל-gen-thumb (namespacing לפי טבלה)
const MAX_BYTES = 1_800_000;                // ~1.8MB — פריים JPEG איכותי, לא יותר
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "POST only" }, 405);
  if (!SB_URL || !SR) return json({ ok: false, error: "missing service role / url" }, 500);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const id = String(body.id || "");
  if (!UUID_RE.test(id)) return json({ ok: false, error: "bad_id" }, 400);
  if (!body.b64) return json({ ok: false, error: "b64_required" }, 400);

  // מפענחים base64 (data-URL או גולמי) ומאמתים גודל + חתימת-JPEG
  const raw = String(body.b64).replace(/^data:[^;]+;base64,/, "");
  let bin: Uint8Array;
  try { bin = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0)); }
  catch { return json({ ok: false, error: "bad_b64" }, 400); }
  if (bin.byteLength < 500 || bin.byteLength > MAX_BYTES) return json({ ok: false, error: "bad_size" }, 400);
  if (bin[0] !== 0xff || bin[1] !== 0xd8) return json({ ok: false, error: "not_jpeg" }, 400); // JPEG SOI

  const admin = createClient(SB_URL, SR);

  // עדכון רק כשאין thumb — בלי דריסה, ובלי לגעת בשורות שלא קיימות
  const { data: row, error: qErr } = await admin
    .from("channel_updates").select("id,thumb_url").eq("id", id).maybeSingle();
  if (qErr) return json({ ok: false, error: "query", detail: qErr.message }, 500);
  if (!row) return json({ ok: true, skipped: "no_row" });
  if (row.thumb_url) return json({ ok: true, skipped: "has_thumb", thumb_url: row.thumb_url });

  const path = `${PREFIX}${id}.jpg`;
  const up = await admin.storage.from(BUCKET).upload(path, bin, {
    contentType: "image/jpeg", upsert: true, cacheControl: "31536000",
  });
  if (up.error) return json({ ok: false, error: "upload", detail: up.error.message }, 500);

  const pub = `${SB_URL}/storage/v1/object/public/${BUCKET}/${path}`;
  const { error: uErr } = await admin
    .from("channel_updates").update({ thumb_url: pub }).eq("id", id).is("thumb_url", null);
  if (uErr) return json({ ok: false, error: "update", detail: uErr.message }, 500);

  return json({ ok: true, public_url: pub });
});
