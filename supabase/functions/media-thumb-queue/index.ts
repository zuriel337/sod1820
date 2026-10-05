// media-thumb-queue — GitHub Action worker boundary for channel video thumbnails.
// Auth is the existing service-to-service FB_ADMIN_KEY; service_role never leaves this Edge function.
const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SB = Deno.env.get("SUPABASE_URL") || "";
const ADMIN = Deno.env.get("FB_ADMIN_KEY") || "";
import { findPendingPosters } from "../_shared/mediaPosterLane.js";
const VID = /\.(mp4|mov|webm|m4v|avi|mkv)($|\?|#)/i;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-fb-admin-key, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "POST only" }, 405);
  if (!ADMIN || req.headers.get("x-fb-admin-key") !== ADMIN) return json({ ok: false, error: "unauthorized" }, 401);
  if (!SR || !SB) return json({ ok: false, error: "missing service role / url" }, 503);

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const op = String(body.op || "");
  const H = { apikey: SR, Authorization: `Bearer ${SR}` };

  try {
    if (op === "list") {
      const limit = Math.min(200, Math.max(1, +body.limit || 60));
      const channel = body.channel ? `&channel=eq.${encodeURIComponent(String(body.channel))}` : "";
      const url = `${SB}/rest/v1/channel_updates?select=id,image_url,channel&or=(thumb_url.is.null,thumb_url.eq.)&image_url=not.is.null&order=created_at.desc&limit=${limit}${channel}`;
      const r = await fetch(url, { headers: H });
      const d = await r.json().catch(() => []);
      if (!r.ok) return json({ ok: false, error: d?.message || `list ${r.status}` }, 502);
      const rows = (Array.isArray(d) ? d : []).filter((x: any) => VID.test(x.image_url || "")).map((x: any) => ({ id: x.id, url: x.image_url }));
      return json({ ok: true, rows });
    }

    // Canonical 2029 media-bucket video originals whose derivatives/poster.jpg is missing. Derived live from
    // Storage objects (no queue/table); the worker uploads through sign-upload (bucket=media).
    if (op === "list_video_posters") {
      const limit = Math.min(25, Math.max(1, +body.limit || 10));
      const listDir = async (prefix: string, { limit: pageLimit = 200, offset = 0 }: { limit?: number; offset?: number } = {}) => {
        const r = await fetch(`${SB}/storage/v1/object/list/media`, {
          method: "POST", headers: { ...H, "content-type": "application/json" },
          body: JSON.stringify({ prefix, limit: pageLimit, offset, sortBy: { column: "name", order: "asc" } }),
        });
        if (!r.ok) throw new Error(`storage list ${r.status}`);
        const d = await r.json().catch(() => []);
        return (Array.isArray(d) ? d : []).map((x: any) => ({ name: String(x.name || ""), isFolder: !x.id }));
      };
      // Stateless continuation: the caller echoes `next_cursor` back as `cursor` while `truncated` is true.
      const cursor = /^\d{4}(\/\d{2}(\/[0-9a-f-]{36})?)?$/i.test(String(body.cursor || "")) ? String(body.cursor) : null;
      const maxDirs = Math.min(400, Math.max(1, +body.max_dirs || 400));
      const { pending, truncated, next_cursor, visited, requests } = await findPendingPosters({ listDir, limit, maxDirs, maxRequests: 1500, cursor });
      return json({ ok: true, bucket: "media", rows: pending.map((p) => ({ ...p, url: `${SB}/storage/v1/object/public/media/${p.original_path}` })), truncated, next_cursor, visited, requests });
    }

    if (op === "set") {
      const id = String(body.id || "");
      const thumb = String(body.thumb_url || "");
      if (!id || !thumb) return json({ ok: false, error: "id + thumb_url required" }, 400);
      if (!/^https:\/\//i.test(thumb)) return json({ ok: false, error: "https thumb_url required" }, 400);
      const r = await fetch(`${SB}/rest/v1/channel_updates?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { ...H, "content-type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ thumb_url: thumb }),
      });
      if (!r.ok) return json({ ok: false, error: `set ${r.status}` }, 502);
      return json({ ok: true });
    }

    return json({ ok: false, error: "unknown op" }, 400);
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});
