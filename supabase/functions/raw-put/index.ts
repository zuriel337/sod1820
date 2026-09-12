// raw-put — legacy large-binary streaming bridge. KEEP+PORT during G0 transition.
// Do not retire until Source Video / large-document callers have a proven canonical replacement.
// Auth: existing service-to-service FB_ADMIN_KEY. service_role remains server-side only.
const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SB_URL = Deno.env.get("SUPABASE_URL") || "";
const ADMIN_KEY = Deno.env.get("FB_ADMIN_KEY") || "";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-fb-admin-key, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!ADMIN_KEY || req.headers.get("x-fb-admin-key") !== ADMIN_KEY) return json({ ok: false, error: "unauthorized" }, 401);
  if (!SR || !SB_URL) return json({ ok: false, error: "not configured" }, 503);

  const u = new URL(req.url);
  const bucket = String(u.searchParams.get("bucket") || "media").trim();
  const path = String(u.searchParams.get("path") || "").replace(/^\/+/, "").trim();
  const mime = String(u.searchParams.get("mime") || "application/octet-stream").slice(0, 160);
  const upsert = u.searchParams.get("upsert") === "false" ? "false" : "true";
  if (!path || path.includes("..")) return json({ ok: false, error: "invalid path" }, 400);
  if (!/^[a-z0-9_-]{1,64}$/i.test(bucket)) return json({ ok: false, error: "invalid bucket" }, 400);

  try {
    const buf = await req.arrayBuffer();
    if (!buf.byteLength) return json({ ok: false, error: "empty body" }, 400);
    const r = await fetch(`${SB_URL}/storage/v1/object/${bucket}/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SR}`, apikey: SR, "Content-Type": mime, "x-upsert": upsert },
      body: buf,
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return json({ ok: false, error: d?.message || d?.error || `storage ${r.status}` }, 502);
    return json({ ok: true, bucket, path, bytes: buf.byteLength, public_url: `${SB_URL}/storage/v1/object/public/${bucket}/${path}` });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});
