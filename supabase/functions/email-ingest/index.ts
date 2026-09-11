// email-ingest — trusted external email webhook -> channel_updates broadcast layer.
// G0: the webhook credential is an Edge secret, never source code or query-string state.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SECRET = (Deno.env.get("EMAIL_INGEST_SECRET") || "").trim();
const sb = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const ALLOWED_CHANNELS = new Set(["main", "reality-code", "or-geula", "sod-hachashmal", "torat-haremez"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
function stripHtml(h: string): string {
  return (h || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
    .replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
async function hash(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return "mail_" + Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
}

Deno.serve(async (req: Request) => {
  if (!SECRET) return json({ ok: false, error: "not_configured" }, 503);
  if (req.headers.get("x-email-ingest-secret") !== SECRET) return json({ ok: false, error: "forbidden" }, 403);
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const u = new URL(req.url);
  const requestedChannel = (u.searchParams.get("channel") || "sod-hachashmal").trim();
  if (!ALLOWED_CHANNELS.has(requestedChannel)) return json({ ok: false, error: "invalid_channel" }, 400);
  const channel = requestedChannel;
  const credit = (u.searchParams.get("credit") || "סוד החשמל").trim().slice(0, 120);

  let subject = "", text = "", html = "", from = "", msgId = "";
  try {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const j = await req.json();
      subject = String(j.subject || j.Subject || "").slice(0, 500);
      text = String(j.text || j.plain || "");
      html = String(j.html || "");
      from = String(j.from || j.From || "").slice(0, 300);
      msgId = String(j["message-id"] || j.messageId || "").slice(0, 300);
    } else {
      const f = await req.formData();
      subject = String(f.get("subject") || "").slice(0, 500);
      text = String(f.get("text") || "");
      html = String(f.get("html") || "");
      from = String(f.get("from") || "").slice(0, 300);
      msgId = String(f.get("message-id") || "").slice(0, 300);
    }
  } catch (error) {
    return json({ ok: false, error: String(error).slice(0, 200) }, 400);
  }

  const bodyText = text.trim() ? text.trim() : stripHtml(html);
  const clean = bodyText.slice(0, 900);
  const full = [subject.trim(), clean].filter(Boolean).join("\n").trim();
  if (!full) return json({ ok: false, error: "empty" }, 400);

  const ext = msgId
    ? "mail_" + msgId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 40)
    : await hash(subject + "|" + clean.slice(0, 120));

  const { data: dup } = await sb.from("channel_updates").select("id").eq("ext_msg_id", ext).maybeSingle();
  if (dup) return json({ ok: true, dup: true });

  const { error } = await sb.from("channel_updates").insert({
    channel,
    text: full,
    credit,
    source: "email",
    status: "live",
    priority: 50,
    ext_msg_id: ext,
  });
  if (error) return json({ ok: false, error: String(error.message || error) }, 500);
  return json({ ok: true, channel, from });
});
