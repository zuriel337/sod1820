// share-to-facebook — executor for posts explicitly authorized by admin-only posts.share_to_fb state.
// G0 root-of-trust: cron/service invocation requires existing FB_ADMIN_KEY; no credential belongs in cron command text.
// Provider credentials remain owned by canonical fb_publish_* -> social_admin -> Vault. This Edge only executes the queue.
// Deploy with verify_jwt=false because this function uses its own service-to-service secret boundary.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ADMIN_KEY = (Deno.env.get("FB_ADMIN_KEY") || "").trim();
const SITE_URL = (Deno.env.get("SITE_URL") || "https://sod1820.co.il").replace(/\/$/, "");
const BATCH = Math.min(20, Math.max(1, Number(Deno.env.get("FB_SHARE_BATCH") || "5")));

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
function json(b: unknown, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } }); }
function publishedId(rpcResult: any): string | null {
  const inner = rpcResult?.result ?? rpcResult;
  return inner?.id ?? inner?.post_id ?? inner?.fb_post_id ?? inner?.result?.id ?? null;
}
function rpcFailed(rpcResult: any): boolean {
  const status = Number(rpcResult?.http_status || 0);
  const inner = rpcResult?.result ?? rpcResult;
  return status >= 400 || rpcResult?.ok === false || inner?.ok === false || !!rpcResult?.error || !!inner?.error;
}
async function patchPost(id: number, body: Record<string, unknown>) {
  const { error } = await admin.from("posts").update(body).eq("id", id);
  if (error) throw error;
}
async function shareOne(p: any): Promise<{ id: number; ok: boolean; fb_id?: string; error?: string }> {
  const link = encodeURI(`${SITE_URL}/${p.slug}`);
  const caption = [p.title, (p.excerpt || "").trim(), link].filter(Boolean).join("\n\n");
  try {
    let result: any;
    let publishError: any;
    if (p.image_url) {
      const call = await admin.rpc("fb_publish_photo", { p_image_url: p.image_url, p_caption: caption, p_page_id: null });
      result = call.data; publishError = call.error;
    } else {
      const call = await admin.rpc("fb_publish_post", { p_message: caption, p_link: link, p_page_id: null });
      result = call.data; publishError = call.error;
    }
    if (publishError || rpcFailed(result)) throw new Error(publishError?.message || "canonical_publish_failed");
    const fbId = publishedId(result) || "";
    await patchPost(p.id, { fb_posted_at: new Date().toISOString(), fb_post_id: fbId || null, fb_error: null });
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

  const { data, error } = await admin.from("posts")
    .select("id,slug,title,excerpt,image_url,ai_touched")
    .eq("share_to_fb", true)
    .is("fb_posted_at", null)
    .order("date", { ascending: true })
    .limit(BATCH);
  if (error) return json({ ok: false, error: "query_failed" }, 500);
  const rows = (data || []).filter((p: any) => p.ai_touched !== true);
  const results = [];
  for (const p of rows) results.push(await shareOne(p));
  return json({ ok: true, picked: rows.length, results });
});
