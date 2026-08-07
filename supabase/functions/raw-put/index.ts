// raw-put — streams a raw binary body to public storage via service-role.
// Avoids base64 memory blowup for larger files (video). Auth: x-fb-admin-key (same secret as facebook-admin/storage-put).
// POST /raw-put?bucket=media&path=uploads/2026/08/x.mp4&mime=video/mp4  (raw bytes as body)
//   -> { ok, bucket, path, public_url }
const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SB_URL = Deno.env.get("SUPABASE_URL") || "";
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
  const u = new URL(req.url);
  const bucket = String(u.searchParams.get("bucket") || "media");
  const path = String(u.searchParams.get("path") || "").replace(/^\/+/, "");
  const mime = String(u.searchParams.get("mime") || "application/octet-stream");
  const upsert = u.searchParams.get("upsert") === "false" ? "false" : "true";
  if (!path) return json({ ok: false, error: "path required" }, 400);
  try {
    const buf = await req.arrayBuffer();
    if (!buf || buf.byteLength === 0) return json({ ok: false, error: "empty body" }, 400);
    const r = await fetch(`${SB_URL}/storage/v1/object/${bucket}/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SR}`, apikey: SR, "Content-Type": mime, "x-upsert": upsert },
      body: buf,
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return json({ ok: false, error: d?.message || d?.error || `storage ${r.status}`, detail: d }, 200);
    return json({ ok: true, bucket, path, bytes: buf.byteLength, public_url: `${SB_URL}/storage/v1/object/public/${bucket}/${path}` });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 200);
  }
});
