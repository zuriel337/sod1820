// facebook-publish — direct admin publishing for one post or one gallery image.
// G0 hardening: real user JWT -> canonical rd_is_admin() -> canonical social RPCs.
// Provider credentials stay owned by social_admin/Vault; this Edge is only an admin UI adapter.
// Deploy with verify_jwt=true. Distinct from share-to-facebook, which is the queued post executor.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SITE_URL = (Deno.env.get("SITE_URL") || "https://sod1820.co.il").replace(/\/$/, "");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
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

function publishedId(rpcResult: any): string | null {
  const inner = rpcResult?.result ?? rpcResult;
  return inner?.id ?? inner?.post_id ?? inner?.fb_post_id ?? inner?.result?.id ?? null;
}

function rpcFailed(rpcResult: any): boolean {
  const status = Number(rpcResult?.http_status || 0);
  const inner = rpcResult?.result ?? rpcResult;
  return status >= 400 || rpcResult?.ok === false || inner?.ok === false || !!rpcResult?.error || !!inner?.error;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) return json({ error: "not_configured" }, 503);
  if (!(await requireCanonicalAdmin(req))) return json({ error: "forbidden" }, 403);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const body = await req.json().catch(() => ({})) as Record<string, string>;
    const { type, post_id, image_id } = body;

    if (type === "post" && post_id) {
      const { data: post, error } = await admin
        .from("posts")
        .select("id,title,excerpt,slug,tags")
        .eq("id", post_id)
        .single();
      if (error || !post) return json({ ok: false, error: "post_not_found" }, 404);

      const title = post.title || "";
      const excerpt = (post.excerpt || "").replace(/<[^>]+>/g, "").trim().slice(0, 200);
      const link = `${SITE_URL}/${post.slug}`;
      const tags = (post.tags || []).map((t: string) => `#${t.replace(/\s+/g, "_")}`).slice(0, 5).join(" ");
      const message = [title, excerpt, tags].filter(Boolean).join("\n\n");

      const { data: result, error: publishError } = await admin.rpc("fb_publish_post", {
        p_message: message,
        p_link: link,
        p_page_id: null,
      });
      if (publishError || rpcFailed(result)) {
        return json({ ok: false, error: "publish_failed" }, 502);
      }
      return json({ ok: true, fb_post_id: publishedId(result), type: "post" });
    }

    if (type === "image" && image_id) {
      const { data: img, error } = await admin
        .from("gallery_images")
        .select("id,name,image_url,primary_value,tags,occurred_at")
        .eq("id", image_id)
        .single();
      if (error || !img) return json({ ok: false, error: "image_not_found" }, 404);
      if (!img.image_url) return json({ ok: false, error: "image_has_no_url" }, 400);

      const parts: string[] = [];
      if (img.name) parts.push(img.name);
      if (img.primary_value) parts.push(`מספר: ${img.primary_value}`);
      if (img.occurred_at) parts.push(`תאריך: ${new Date(img.occurred_at).toLocaleDateString("he-IL")}`);
      if (img.tags?.length) parts.push((img.tags as string[]).map((t) => `#${t.replace(/\s+/g, "_")}`).join(" "));
      parts.push(SITE_URL);

      const { data: result, error: publishError } = await admin.rpc("fb_publish_photo", {
        p_image_url: img.image_url,
        p_caption: parts.join("\n"),
        p_page_id: null,
      });
      if (publishError || rpcFailed(result)) {
        return json({ ok: false, error: "publish_failed" }, 502);
      }
      return json({ ok: true, fb_post_id: publishedId(result), type: "image" });
    }

    return json({ ok: false, error: "type_must_match_id" }, 400);
  } catch (error) {
    return json({ ok: false, error: String((error as Error)?.message || error).slice(0, 300) }, 500);
  }
});
