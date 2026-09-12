// facebook-publish — direct admin publishing for one post or one gallery image.
// G0 hardening: real user JWT -> canonical rd_is_admin() before any service-role read/provider mutation.
// Deploy with verify_jwt=true. This remains distinct from share-to-facebook, which is the queued post executor.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const PAGE_ID = Deno.env.get("FB_PAGE_ID") || Deno.env.get("FACEBOOK_PAGE_ID") || "";
const PAGE_TOKEN = Deno.env.get("FB_PAGE_ACCESS_TOKEN") || Deno.env.get("FACEBOOK_PAGE_TOKEN") || "";
const GRAPH = Deno.env.get("FB_GRAPH_VERSION") || Deno.env.get("META_GRAPH_VERSION") || "v21.0";
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

async function postToFeed(message: string, link?: string): Promise<{ id: string }> {
  const body: Record<string, string> = { message, access_token: PAGE_TOKEN };
  if (link) body.link = link;
  const r = await fetch(`https://graph.facebook.com/${GRAPH}/${PAGE_ID}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || `Meta API ${r.status}`);
  return data;
}

async function postPhoto(imageUrl: string, caption: string): Promise<{ id: string }> {
  const body = { url: imageUrl, caption, access_token: PAGE_TOKEN };
  const r = await fetch(`https://graph.facebook.com/${GRAPH}/${PAGE_ID}/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || `Meta API ${r.status}`);
  return data;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) return json({ error: "not_configured" }, 503);
  if (!(await requireCanonicalAdmin(req))) return json({ error: "forbidden" }, 403);
  if (!PAGE_ID || !PAGE_TOKEN) return json({ ok: false, error: "facebook_not_configured" }, 503);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const body = await req.json().catch(() => ({})) as Record<string, string>;
    const { type, post_id, image_id } = body;

    if (type === "post" && post_id) {
      const { data: post, error } = await admin
        .from("posts")
        .select("id,title,excerpt,slug,image_url,categories,tags")
        .eq("id", post_id)
        .single();
      if (error || !post) return json({ ok: false, error: "post_not_found" }, 404);

      const title = post.title || "";
      const excerpt = (post.excerpt || "").replace(/<[^>]+>/g, "").trim().slice(0, 200);
      const link = `${SITE_URL}/${post.slug}`;
      const tags = (post.tags || []).map((t: string) => `#${t.replace(/\s+/g, "_")}`).slice(0, 5).join(" ");
      const message = [title, excerpt, tags].filter(Boolean).join("\n\n");
      const result = await postToFeed(message, link);
      return json({ ok: true, fb_post_id: result.id, type: "post" });
    }

    if (type === "image" && image_id) {
      const { data: img, error } = await admin
        .from("gallery_images")
        .select("id,name,image_url,primary_value,all_values,tags,occurred_at")
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

      const result = await postPhoto(img.image_url, parts.join("\n"));
      return json({ ok: true, fb_post_id: result.id, type: "image" });
    }

    return json({ ok: false, error: "type_must_match_id" }, 400);
  } catch (error) {
    return json({ ok: false, error: String((error as Error)?.message || error).slice(0, 300) }, 500);
  }
});
