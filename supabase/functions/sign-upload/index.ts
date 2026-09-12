// sign-upload — signed-upload issuer used by the canonical media-thumbs workflow.
// KEEP+PORT during G0; agent-upload remains the canonical agent-media bridge for its supported image scope.
const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SB = Deno.env.get("SUPABASE_URL") || "";
const ADMIN = Deno.env.get("FB_ADMIN_KEY") || "";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-fb-admin-key, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!ADMIN || req.headers.get("x-fb-admin-key") !== ADMIN) return json({ ok: false, error: "unauthorized" }, 401);
  if (!SR || !SB) return json({ ok: false, error: "not configured" }, 503);

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const bucket = String(body.bucket || "gallery").trim();
  const path = String(body.path || "").replace(/^\/+/, "").trim();
  if (!path || path.includes("..")) return json({ ok: false, error: "invalid path" }, 400);
  if (!/^[a-z0-9_-]{1,64}$/i.test(bucket)) return json({ ok: false, error: "invalid bucket" }, 400);

  try {
    const r = await fetch(`${SB}/storage/v1/object/upload/sign/${bucket}/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SR}`, apikey: SR },
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return json({ ok: false, error: d?.message || `sign ${r.status}` }, 502);
    const rel = String(d.url || "").replace(/^\/+/, "");
    return json({
      ok: true,
      bucket,
      path,
      put_url: `${SB}/storage/v1/${rel}`,
      public_url: `${SB}/storage/v1/object/public/${bucket}/${path}`,
    });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});
