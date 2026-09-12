// wa-avatars — admin maintenance utility for contributor WhatsApp avatars.
// G0 hardening: removes the embedded static guard. A real user JWT is verified server-side and the actor must be admin.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const BUCKET = "gallery";
const DIR = "sod1820/avatars";
const MAX_MEDIA = 8 * 1024 * 1024;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: CORS });

async function requireAdmin(req: Request) {
  const match = (req.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  if (!match || !SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.auth.getUser(match[1]);
  if (error || !data.user) return null;
  const { data: actor, error: actorError } = await admin.from("users").select("id,role").eq("id", data.user.id).maybeSingle();
  if (actorError || actor?.role !== "admin") return null;
  return admin;
}

function pick(v: any): any[] { return Array.isArray(v) ? v : (v?.result ?? []); }
function slugifyId(s: string): string { return (s || "").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "x"; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const sb = await requireAdmin(req);
  if (!sb) return json({ error: "forbidden" }, 403);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty body is valid */ }
  const only = String(body.name || "").trim();
  const force = body.force === true;

  const waAdmin = async (method: string, payload: unknown, http: string) => {
    const { data, error } = await sb.rpc("wa_admin", { p_method: method, p_payload: payload, p_http: http });
    if (error) throw error;
    return data;
  };

  const rehost = async (url: string, key: string): Promise<string | null> => {
    if (!/^https:\/\//i.test(url)) return null;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const buf = new Uint8Array(await res.arrayBuffer());
      if (!buf.byteLength || buf.byteLength > MAX_MEDIA) return null;
      const ct = res.headers.get("content-type") || "image/jpeg";
      if (!/^image\/(jpeg|png|webp)$/i.test(ct.split(";")[0].trim())) return null;
      const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
      const path = `${DIR}/${key}.${ext}`;
      const up = await sb.storage.from(BUCKET).upload(path, buf, { contentType: ct, upsert: true });
      if (up.error) return null;
      return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    } catch { return null; }
  };

  const nameMap = new Map<string, string>();
  const { data: sources } = await sb.from("channel_ingest_sources").select("chat_id").eq("enabled", true);
  for (const source of (sources || [])) {
    try {
      const hist = await waAdmin("getChatHistory", { chatId: source.chat_id, count: 100 }, "POST");
      for (const message of pick(hist)) {
        const name = String(message.senderName || "").trim();
        const sender = String(message.senderId || "");
        if (name && sender && !nameMap.has(name)) nameMap.set(name, sender);
      }
    } catch { /* one source failure must not abort the batch */ }
  }
  const { data: vip } = await sb.from("wa_vip_inbox").select("sender,sender_name").limit(500);
  for (const row of (vip || [])) {
    const name = String(row.sender_name || "").trim();
    if (name && row.sender && !nameMap.has(name)) nameMap.set(name, row.sender);
  }

  let q = sb.from("contributors").select("slug,code,display_name,avatar_url,wa_names");
  if (only) q = q.eq("display_name", only);
  const { data: contributors, error: contributorsError } = await q;
  if (contributorsError) return json({ error: contributorsError.message }, 500);
  const targets = (contributors || []).filter((c: any) => c.display_name && (force || !c.avatar_url));

  const results: any[] = [];
  for (const c of targets) {
    const names = [String(c.display_name || "").trim(), ...((c.wa_names || []) as string[]).map((x) => String(x).trim())].filter(Boolean);
    const sid = names.map((name) => nameMap.get(name)).find(Boolean) || "";
    if (!sid) { results.push({ name: c.display_name, status: "no-sender" }); continue; }
    try {
      const avatar = await waAdmin("getAvatar", { chatId: sid }, "POST");
      const sourceUrl = avatar?.result?.urlAvatar || avatar?.urlAvatar || "";
      if (!sourceUrl) { results.push({ name: c.display_name, status: "no-avatar" }); continue; }
      const hosted = await rehost(sourceUrl, slugifyId(c.code || c.slug || c.display_name));
      if (!hosted) { results.push({ name: c.display_name, status: "rehost-fail" }); continue; }
      const { error } = await sb.from("contributors").update({ avatar_url: hosted }).eq("slug", c.slug);
      results.push({ name: c.display_name, status: error ? "update-fail" : "ok", avatar_url: hosted });
    } catch { results.push({ name: c.display_name, status: "failed" }); }
  }

  return json({ ok: true, updated: results.filter((r) => r.status === "ok").length, results });
});
