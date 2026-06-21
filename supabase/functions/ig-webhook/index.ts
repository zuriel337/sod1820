// ig-webhook — Webhook לאינסטגרם: על כל תגובה חדשה שולח "תגובה פרטית" (DM) אוטומטית למגיב.
// משתמש ב-Private Reply API של Instagram (recipient.comment_id) — מותר DM אחד לכל תגובה.
// פריסה: verify_jwt=false (Meta קוראת לפונקציה). אימות: hub.verify_token (GET) + X-Hub-Signature-256 (POST, אופציונלי).
//
// Secrets נדרשים: IG_VERIFY_TOKEN, IG_USER_ID (מזהה חשבון IG עסקי), IG_PAGE_TOKEN (Page/IG access token).
// אופציונלי: IG_APP_SECRET (לאימות חתימה), IG_GRAPH_VERSION (v21.0), IG_DM_TEMPLATE (טקסט ה-DM),
//            IG_PUBLIC_REPLY (טקסט תגובה ציבורית, ריק=כבוי), IG_SKIP_SELF (true).

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VERIFY_TOKEN = Deno.env.get("IG_VERIFY_TOKEN") || "";
const IG_USER_ID   = Deno.env.get("IG_USER_ID") || "";
const PAGE_TOKEN   = Deno.env.get("IG_PAGE_TOKEN") || "";
const APP_SECRET   = Deno.env.get("IG_APP_SECRET") || "";
const GRAPH        = Deno.env.get("IG_GRAPH_VERSION") || "v21.0";
const DM_TEMPLATE  = Deno.env.get("IG_DM_TEMPLATE") ||
  "שלום! 🙏 תודה על התגובה. הצטרפו לבית המדרש של סוד 1820 לעוד חידושי גימטריה ורמזי גאולה: https://sod1820.co.il";
const PUBLIC_REPLY = Deno.env.get("IG_PUBLIC_REPLY") || "";
const SKIP_SELF    = (Deno.env.get("IG_SKIP_SELF") || "true") !== "false";

function txt(b: string, s = 200) { return new Response(b, { status: s }); }
function json(b: unknown, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } }); }

async function logRow(row: Record<string, unknown>) {
  await fetch(`${SUPABASE_URL}/rest/v1/ig_comment_dms`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify(row),
  }).catch(() => {});
}

// מסמן עיבוד תגובה אטומית: מנסה INSERT, אם כבר קיים → כבר טופלה (לא שולח DM כפול)
async function claimComment(c: { comment_id: string; ig_user_id?: string; username?: string; comment_text?: string }): Promise<boolean> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/ig_comment_dms`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ comment_id: c.comment_id, ig_user_id: c.ig_user_id, username: c.username, comment_text: c.comment_text, dm_status: "pending" }),
  });
  if (r.status === 409) return false; // primary key קיים → כבר טופלה
  return r.ok;
}

async function markDm(comment_id: string, status: string, error?: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/ig_comment_dms?comment_id=eq.${comment_id}`, {
    method: "PATCH",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ dm_status: status, dm_sent_at: status === "sent" ? new Date().toISOString() : null, error: error || null }),
  }).catch(() => {});
}

async function sendPrivateReply(comment_id: string, text: string) {
  const r = await fetch(`https://graph.facebook.com/${GRAPH}/${IG_USER_ID}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { comment_id }, message: { text }, access_token: PAGE_TOKEN }),
  });
  if (!r.ok) throw new Error((await r.json())?.error?.message || `dm ${r.status}`);
}

async function publicReply(comment_id: string, text: string) {
  const form = new URLSearchParams({ message: text, access_token: PAGE_TOKEN });
  await fetch(`https://graph.facebook.com/${GRAPH}/${comment_id}/replies`, { method: "POST", body: form }).catch(() => {});
}

// אימות חתימת Meta (X-Hub-Signature-256 = sha256 HMAC של גוף הבקשה ב-APP_SECRET)
async function validSignature(raw: string, header: string | null): Promise<boolean> {
  if (!APP_SECRET) return true; // לא הוגדר → מדלגים על האימות
  if (!header?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(APP_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `sha256=${hex}` === header;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // 1) אימות מנוי ה-Webhook (Meta GET)
  if (req.method === "GET") {
    if (url.searchParams.get("hub.mode") === "subscribe" &&
        url.searchParams.get("hub.verify_token") === VERIFY_TOKEN) {
      return txt(url.searchParams.get("hub.challenge") || "");
    }
    return txt("forbidden", 403);
  }

  if (req.method !== "POST") return txt("method", 405);

  const raw = await req.text();
  if (!(await validSignature(raw, req.headers.get("x-hub-signature-256")))) return txt("bad signature", 401);

  let payload: any = {};
  try { payload = JSON.parse(raw); } catch { return json({ ok: false }, 400); }

  const events: any[] = [];
  for (const entry of payload.entry || []) {
    for (const ch of entry.changes || []) {
      if (ch.field === "comments" && ch.value?.id) events.push(ch.value);
    }
  }

  const results = [];
  for (const ev of events) {
    const comment_id = ev.id;
    const fromId = ev.from?.id || "";
    const username = ev.from?.username || "";
    if (SKIP_SELF && fromId && IG_USER_ID && fromId === IG_USER_ID) continue; // לא להגיב לעצמנו
    if (!PAGE_TOKEN || !IG_USER_ID) { await logRow({ comment_id, ig_user_id: fromId, username, comment_text: ev.text, dm_status: "skipped_no_creds" }); continue; }

    const claimed = await claimComment({ comment_id, ig_user_id: fromId, username, comment_text: ev.text });
    if (!claimed) { results.push({ comment_id, skipped: "already_handled" }); continue; }

    try {
      await sendPrivateReply(comment_id, DM_TEMPLATE);
      if (PUBLIC_REPLY) await publicReply(comment_id, PUBLIC_REPLY);
      await markDm(comment_id, "sent");
      results.push({ comment_id, ok: true });
    } catch (e) {
      const msg = String((e as Error).message || e).slice(0, 300);
      await markDm(comment_id, "error", msg);
      results.push({ comment_id, ok: false, error: msg });
    }
  }
  // Meta דורשת 200 מהיר
  return json({ ok: true, handled: results.length, results });
});
