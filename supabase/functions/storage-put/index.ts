// storage-put — מעלה תמונה/קובץ (base64) לאחסון ציבורי דרך service-role, ומחזיר public URL.
// מאפשר לסוכנים לארח תמונות (למשל JPEG לאינסטגרם) בלי תלות בפריסת Vercel.
// אימות: header x-fb-admin-key (אותו סוד של facebook-admin). service-role מוזרק אוטומטית ע"י Supabase.
//
// POST { bucket?="gallery", path, b64, mime?="image/jpeg", upsert?=true }
//   → { ok, path, public_url }

const SR        = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SB_URL    = Deno.env.get("SUPABASE_URL") || "";
const ADMIN_KEY = Deno.env.get("FB_ADMIN_KEY") || "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-fb-admin-key, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!ADMIN_KEY) return json({ ok: false, error: "FB_ADMIN_KEY not configured" }, 403);
  if (req.headers.get("x-fb-admin-key") !== ADMIN_KEY) return json({ ok: false, error: "unauthorized" }, 401);
  if (!SR || !SB_URL) return json({ ok: false, error: "missing service role / url" }, 400);

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const bucket = String(body.bucket || "gallery");
  const path = String(body.path || "").replace(/^\/+/, "");
  const mime = String(body.mime || "image/jpeg");
  const upsert = body.upsert === false ? "false" : "true";
  if (!path || !body.b64) return json({ ok: false, error: "path and b64 required" }, 400);

  try {
    const b64 = String(body.b64).replace(/^data:[^;]+;base64,/, "");
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const r = await fetch(`${SB_URL}/storage/v1/object/${bucket}/${path}`, {
      method: "POST",
      // apikey header נדרש עבור מפתח ה-service בפורמט החדש (sb_secret_…)
      headers: { Authorization: `Bearer ${SR}`, apikey: SR, "Content-Type": mime, "x-upsert": upsert },
      body: bin,
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return json({ ok: false, error: d?.message || d?.error || `storage ${r.status}`, detail: d }, 200);
    return json({ ok: true, bucket, path, public_url: `${SB_URL}/storage/v1/object/public/${bucket}/${path}` });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 200);
  }
});
