// post-save — G0 hardened compatibility edge for the post editor.
// Authorization: authenticated user JWT -> public.rd_is_admin().
// The historical shared static edit token is intentionally NOT an authorization factor.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info, x-supabase-api-version",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS } });
}

async function requireCanonicalAdmin(req: Request): Promise<boolean> {
  const authz = req.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authz) || !SUPABASE_URL || !ANON_KEY) return false;
  const actor = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authz } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await actor.rpc("rd_is_admin");
  return !error && data === true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: "not_configured" }, 503);

  if (!(await requireCanonicalAdmin(req))) return json({ error: "forbidden" }, 403);

  try {
    const body = await req.json().catch(() => ({}));
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await admin.rpc("sys_save_post", {
      p_id: body?.id ?? null,
      p_title: body?.title ?? "",
      p_slug: body?.slug ?? null,
      p_content: body?.content ?? "",
      p_excerpt: body?.excerpt ?? "",
      p_categories: Array.isArray(body?.categories) ? body.categories : [],
      p_tags: Array.isArray(body?.tags) ? body.tags : [],
      p_author: body?.author ?? null,
      p_image_url: body?.image_url ?? null,
      p_source: body?.source ?? "ai",
      p_ai_touched: !!body?.ai_touched,
    });
    if (error) return json({ error: error.message || "save_failed" }, 400);
    return json({ ok: true, ...(data || {}) });
  } catch (error) {
    return json({ error: String(error).slice(0, 200) }, 500);
  }
});
