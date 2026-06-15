// share-to-facebook — משתף אוטומטית לדף פייסבוק כל פוסט שסומן share_to_fb=true.
// טריגר: pg_cron כל כמה דקות → net.http_post → הפונקציה סורקת ושולחת ל-Facebook Graph API.
// אבטחה: verify_jwt=true (נקרא עם Bearer של מפתח Supabase). שמירה על הפרדת זרמים: ai_touched מוחרג.
// סודות נדרשים (Edge Function Secrets): FB_PAGE_ID, FB_PAGE_ACCESS_TOKEN. אופציונלי: SITE_URL, FB_GRAPH_VERSION, FB_SHARE_BATCH.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FB_PAGE_ID   = Deno.env.get("FB_PAGE_ID") || "";
const FB_TOKEN     = Deno.env.get("FB_PAGE_ACCESS_TOKEN") || "";
const FB_API       = Deno.env.get("FB_GRAPH_VERSION") || "v21.0";
const SITE_URL     = (Deno.env.get("SITE_URL") || "https://sod1820.co.il").replace(/\/$/, "");
const BATCH        = Number(Deno.env.get("FB_SHARE_BATCH") || "5");

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
}

async function patchPost(id: number, body: Record<string, unknown>) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/posts?id=eq.${id}`, {
    method: "PATCH",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`patch ${r.status}: ${(await r.text()).slice(0, 200)}`);
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

Deno.serve(async () => {
  if (!FB_PAGE_ID || !FB_TOKEN) return json({ ok: true, skipped: "no_fb_credentials" });
  // פוסטים שסומנו לשיתוף, טרם שותפו, ולא נגועי-AI (חוק הפרדת הזרמים)
  const q = new URLSearchParams({
    select: "id,slug,title,excerpt,image_url,ai_touched",
    share_to_fb: "eq.true",
    fb_posted_at: "is.null",
    order: "date.asc",
    limit: String(BATCH),
  });
  const r = await fetch(`${SUPABASE_URL}/rest/v1/posts?${q}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!r.ok) return json({ ok: false, error: `query ${r.status}: ${(await r.text()).slice(0, 200)}` }, 500);
  const rows = (await r.json()).filter((p: any) => p.ai_touched !== true);
  const results = [];
  for (const p of rows) results.push(await shareOne(p));
  return json({ ok: true, picked: rows.length, results });
});
