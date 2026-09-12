// share-to-facebook — executor for posts explicitly authorized by admin-only posts.share_to_fb state.
// G0 root-of-trust: cron/service invocation requires existing FB_ADMIN_KEY; no credential belongs in cron command text.
// Deploy with verify_jwt=false because this function uses its own service-to-service secret boundary.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_KEY = (Deno.env.get("FB_ADMIN_KEY") || "").trim();
const FB_PAGE_ID = Deno.env.get("FB_PAGE_ID") || "";
const FB_TOKEN = Deno.env.get("FB_PAGE_ACCESS_TOKEN") || "";
const FB_API = Deno.env.get("FB_GRAPH_VERSION") || "v21.0";
const SITE_URL = (Deno.env.get("SITE_URL") || "https://sod1820.co.il").replace(/\/$/, "");
const BATCH = Math.min(20, Math.max(1, Number(Deno.env.get("FB_SHARE_BATCH") || "5")));

function json(b: unknown, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } }); }
async function patchPost(id: number, body: Record<string, unknown>) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/posts?id=eq.${id}`, {
    method: "PATCH",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`patch ${r.status}`);
}
async function shareOne(p: any): Promise<{ id: number; ok: boolean; fb_id?: string; error?: string }> {
  const link = encodeURI(`${SITE_URL}/${p.slug}`);
  const caption = [p.title, (p.excerpt || "").trim(), link].filter(Boolean).join("\n\n");
  try {
    let fbId = "";
    if (p.image_url) {
      const form = new URLSearchParams({ url: p.image_url, caption, access_token: FB_TOKEN, published: "true" });
      const r = await fetch(`https://graph.facebook.com/${FB_API}/${FB_PAGE_ID}/photos`, { method: "POST", body: form });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error?.message || `fb ${r.status}`);
      fbId = d.post_id || d.id || "";
    } else {
      const form = new URLSearchParams({ message: caption, link, access_token: FB_TOKEN });
      const r = await fetch(`https://graph.facebook.com/${FB_API}/${FB_PAGE_ID}/feed`, { method: "POST", body: form });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error?.message || `fb ${r.status}`);
      fbId = d.id || "";
    }
    await patchPost(p.id, { fb_posted_at: new Date().toISOString(), fb_post_id: fbId, fb_error: null });
    return { id: p.id, ok: true, fb_id: fbId };
  } catch (e) {
    const msg = String((e as Error).message || e).slice(0, 400);
    await patchPost(p.id, { fb_error: msg }).catch(() => {});
    return { id: p.id, ok: false, error: msg };
  }
}

Deno.serve(async (req) => {
  if (!ADMIN_KEY) return json({ ok: false, error: "not_configured" }, 503);
  if (req.headers.get("x-fb-admin-key") !== ADMIN_KEY) return json({ ok: false, error: "forbidden" }, 403);
  if (!SERVICE_KEY || !SUPABASE_URL) return json({ ok: false, error: "not_configured" }, 503);
  if (!FB_PAGE_ID || !FB_TOKEN) return json({ ok: true, skipped: "no_fb_credentials" });

  const q = new URLSearchParams({
    select: "id,slug,title,excerpt,image_url,ai_touched",
    share_to_fb: "eq.true",
    fb_posted_at: "is.null",
    order: "date.asc",
    limit: String(BATCH),
  });
  const r = await fetch(`${SUPABASE_URL}/rest/v1/posts?${q}`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } });
  if (!r.ok) return json({ ok: false, error: `query ${r.status}` }, 500);
  const rows = (await r.json()).filter((p: any) => p.ai_touched !== true);
  const results = [];
  for (const p of rows) results.push(await shareOne(p));
  return json({ ok: true, picked: rows.length, results });
});
