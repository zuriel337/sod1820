// storage-put-raw — Source Video large-binary streaming bridge.
// source_video_publish_law still names this capability; KEEP+PORT until a safe canonical replacement exists.
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
  if (req.method !== "POST") return json({ ok: false, error: "POST only" }, 405);
  if (!ADMIN_KEY || req.headers.get("x-fb-admin-key") !== ADMIN_KEY) return json({ ok: false, error: "unauthorized" }, 401);
  if (!SR || !SB_URL) return json({ ok: false, error: "not configured" }, 503);

  const u = new URL(req.url);
  const bucket = (u.searchParams.get("bucket") || "gallery").trim();
  const path = (u.searchParams.get("path") || "").replace(/^\/+/, "").trim();
  const mime = (req.headers.get("content-type") || "application/octet-stream").slice(0, 160);
  if (!path || path.includes("..")) return json({ ok: false, error: "invalid path" }, 400);
  if (!/^[a-z0-9_-]{1,64}$/i.test(bucket)) return json({ ok: false, error: "invalid bucket" }, 400);
  if (!req.body) return json({ ok: false, error: "empty body" }, 400);

  try {
    const r = await fetch(`${SB_URL}/storage/v1/object/${bucket}/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SR}`, apikey: SR, "Content-Type": mime, "x-upsert": "true" },
      body: req.body,
      // @ts-ignore Deno streaming request body
      duplex: "half",
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return json({ ok: false, error: d?.message || d?.error || `storage ${r.status}` }, 502);
    return json({ ok: true, bucket, path, public_url: `${SB_URL}/storage/v1/object/public/${bucket}/${path}` });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});
