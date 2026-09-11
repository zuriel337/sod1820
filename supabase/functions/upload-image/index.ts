import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

async function requireAdmin(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match || !SUPABASE_URL || !SERVICE_ROLE_KEY) return null;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.getUser(match[1]);
  if (error || !data.user) return null;

  const { data: actor, error: actorError } = await admin
    .from("users")
    .select("id,role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (actorError || actor?.role !== "admin") return null;
  return { admin, userId: data.user.id };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const actor = await requireAdmin(req);
  if (!actor) return json({ error: "forbidden" }, 403);

  try {
    const body = await req.json().catch(() => ({}));
    const path = String(body?.path || "").replace(/^\/+/, "").trim();
    const base64 = typeof body?.base64 === "string" ? body.base64 : "";
    const contentType = String(body?.contentType || "image/jpeg").slice(0, 120);

    if (!path || !base64) return json({ error: "missing path or base64" }, 400);
    if (base64.length > 16_000_000) return json({ error: "payload too large" }, 413);

    const bin = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const { data, error } = await actor.admin.storage
      .from("media")
      .upload(path, bin, { contentType, upsert: true });

    if (error) return json({ error: error.message }, 500);

    const publicUrl = actor.admin.storage.from("media").getPublicUrl(path).data.publicUrl;
    return json({ ok: true, path: data?.path, publicUrl, actor_id: actor.userId });
  } catch (error) {
    return json({ error: String(error) }, 500);
  }
});
