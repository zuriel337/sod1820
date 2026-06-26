// facebook-publish — פרסום פוסט או תמונה לדף הפייסבוק דרך Graph API.
//
// סודות נדרשים (Supabase → Edge Functions → Secrets):
//   FACEBOOK_PAGE_ID     = מזהה דף הפייסבוק
//   FACEBOOK_PAGE_TOKEN  = Page Access Token עם הרשאות pages_manage_posts + pages_read_engagement
//   SUPABASE_URL         = https://linswmnnkjxvweumprav.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY = ...
//
// POST { type: 'post', post_id: string }  → מפרסם טקסט + קישור לפוסט
// POST { type: 'image', image_id: string } → מפרסם תמונה עם כיתוב

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAGE_ID    = Deno.env.get("FACEBOOK_PAGE_ID")    || "";
const PAGE_TOKEN = Deno.env.get("FACEBOOK_PAGE_TOKEN") || "";
const GRAPH      = Deno.env.get("META_GRAPH_VERSION")  || "v21.0";
const SITE_URL   = "https://sod1820.co.il";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function postToFeed(message: string, link?: string): Promise<{ id: string }> {
  const body: Record<string, string> = { message, access_token: PAGE_TOKEN };
  if (link) body.link = link;
  const r = await fetch(`https://graph.facebook.com/${GRAPH}/${PAGE_ID}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || `Meta API ${r.status}`);
  return d;
}

async function postPhoto(imageUrl: string, caption: string): Promise<{ id: string }> {
  const body = { url: imageUrl, caption, access_token: PAGE_TOKEN };
  const r = await fetch(`https://graph.facebook.com/${GRAPH}/${PAGE_ID}/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || `Meta API ${r.status}`);
  return d;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  if (!PAGE_ID || !PAGE_TOKEN) {
    return json({ ok: false, skipped: "missing secrets: FACEBOOK_PAGE_ID / FACEBOOK_PAGE_TOKEN" }, 200);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  );

  try {
    const body = await req.json().catch(() => ({})) as Record<string, string>;
    const { type, post_id, image_id } = body;

    if (type === "post" && post_id) {
      const { data: post, error } = await supabase
        .from("posts")
        .select("id, title, excerpt, slug, image_url, categories, tags")
        .eq("id", post_id)
        .single();
      if (error || !post) return json({ ok: false, error: "post not found" }, 404);

      const title = post.title || "";
      const excerpt = (post.excerpt || "").replace(/<[^>]+>/g, "").trim().slice(0, 200);
      const link = `${SITE_URL}/${post.slug}`;
      const tags = (post.tags || []).map((t: string) => `#${t.replace(/\s+/g, "_")}`).slice(0, 5).join(" ");

      const message = [title, excerpt, tags].filter(Boolean).join("\n\n");

      const result = await postToFeed(message, link);
      return json({ ok: true, fb_post_id: result.id, type: "post" });
    }

    if (type === "image" && image_id) {
      const { data: img, error } = await supabase
        .from("gallery_images")
        .select("id, name, image_url, primary_value, all_values, tags, occurred_at")
        .eq("id", image_id)
        .single();
      if (error || !img) return json({ ok: false, error: "image not found" }, 404);

      if (!img.image_url) return json({ ok: false, error: "image has no URL" }, 400);

      const parts: string[] = [];
      if (img.name) parts.push(img.name);
      if (img.primary_value) parts.push(`מספר: ${img.primary_value}`);
      if (img.occurred_at) {
        const d = new Date(img.occurred_at).toLocaleDateString("he-IL");
        parts.push(`תאריך: ${d}`);
      }
      if (img.tags?.length) {
        parts.push((img.tags as string[]).map(t => `#${t.replace(/\s+/g, "_")}`).join(" "));
      }
      parts.push(SITE_URL);

      const caption = parts.join("\n");
      const result = await postPhoto(img.image_url, caption);
      return json({ ok: true, fb_post_id: result.id, type: "image" });
    }

    return json({ ok: false, error: "type must be 'post' or 'image' with matching id" }, 400);
  } catch (e) {
    return json({ ok: false, error: String(e) }, 200);
  }
});
