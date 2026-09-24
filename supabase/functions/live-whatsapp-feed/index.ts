// live-whatsapp-feed — bounded public projection for the existing Legacy LiveChannelFeed.
// Scope is intentionally narrow: expose Torat-Haremez updates to the existing bottom WhatsApp/Now feed
// without changing channel_updates.status, Research Intake routing, or the 2029 System Frame.
// Deploy with verify_jwt=false: this endpoint is intentionally public, read-only, fixed-channel,
// field-minimized, bounded to 60 rows, and never exposes private storage-object references.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=45, stale-while-revalidate=120",
};

const sb = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const PLACEHOLDER = /^(?:📷 עדכון|🎬 עדכון וידאו)$/;
const safePublicUrl = (v: unknown) => {
  const s = String(v || "").trim();
  return /^https:\/\//i.test(s) ? s : null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: CORS });

  let requested = 60;
  try {
    const body = await req.json();
    requested = Number(body?.limit || 60);
  } catch { /* default */ }
  const limit = Math.max(1, Math.min(Number.isFinite(requested) ? requested : 60, 60));

  const { data, error } = await sb
    .from("channel_updates")
    .select("id,text,image_url,thumb_url,credit,channel,is_urgent,created_at,link_url,source,status,page_only,expires_at")
    .eq("channel", "torat-haremez")
    .eq("page_only", false)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("created_at", { ascending: false })
    .limit(180);

  if (error) {
    return new Response(JSON.stringify({ error: "source_read_failed" }), { status: 500, headers: CORS });
  }

  const items = [];
  for (const row of (data || [])) {
    const text = String(row.text || "").trim();
    const hasText = !!text && !PLACEHOLDER.test(text);
    const imageUrl = safePublicUrl(row.image_url);
    const thumbUrl = safePublicUrl(row.thumb_url);

    // Private source binaries are represented as storage-object:<uuid>. Never project those refs
    // to the browser. Text/caption can still be public in this explicitly-authorized feed.
    if (!hasText && !imageUrl) continue;

    items.push({
      id: row.id,
      text: hasText ? text : "📷 עדכון",
      image_url: imageUrl,
      thumb_url: thumbUrl,
      credit: row.status === "live" ? (row.credit || "תורת הרמז") : "תורת הרמז",
      channel: "torat-haremez",
      is_urgent: row.status === "live" ? !!row.is_urgent : false,
      created_at: row.created_at,
      link_url: row.status === "live" ? (row.link_url || null) : null,
      source: row.source || "auto",
    });
    if (items.length >= limit) break;
  }

  return new Response(JSON.stringify({ items }), { status: 200, headers: CORS });
});
