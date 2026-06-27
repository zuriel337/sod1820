// send-push — שליחת התראת Web Push למנויים (push_subscriptions).
// מופעל אדמין/שרת עם PUSH_ADMIN_KEY. דורש secrets: VAPID_PUBLIC_KEY,
// VAPID_PRIVATE_KEY, VAPID_SUBJECT, PUSH_ADMIN_KEY. (SUPABASE_URL/SERVICE_ROLE מוזרקים).
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@sod1820.com";
const ADMIN_KEY = Deno.env.get("PUSH_ADMIN_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  // ללא הגדרת VAPID — לא שולחים (ולא נשארים פתוחים לכולם).
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return json({ error: "push not configured (missing VAPID secrets)" }, 503);
  }
  try {
    const { title, body, url, topic, admin_key } = await req.json();

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // הרשאה: או מפתח אדמין סטטי (שרת/cron), או משתמש מחובר עם role=admin (JWT מהדפדפן).
    // כך אדמין מחובר שולח בלי להזין מפתח — הדף ממילא נעול לאדמין.
    let authorized = !!(ADMIN_KEY && admin_key === ADMIN_KEY);
    if (!authorized) {
      const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
      if (token) {
        const { data: au } = await supabase.auth.getUser(token);
        const uid = au?.user?.id;
        if (uid) {
          const { data: urow } = await supabase.from("users").select("role").eq("id", uid).maybeSingle();
          if (urow?.role === "admin") authorized = true;
        }
      }
    }
    if (!authorized) return json({ error: "unauthorized" }, 401);
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth, topics, user_id, visitor_id");

    // מצב שקט — לאסוף זהויות מושתקות (muted_until בעתיד) ולדלג עליהן.
    const { data: muted } = await supabase
      .from("notification_prefs")
      .select("user_id, visitor_id, muted_until")
      .not("muted_until", "is", null);
    const now = Date.now();
    const mutedUsers = new Set<string>();
    const mutedVisitors = new Set<string>();
    (muted || []).forEach((m: { user_id?: string; visitor_id?: string; muted_until?: string }) => {
      if (m.muted_until && new Date(m.muted_until).getTime() > now) {
        if (m.user_id) mutedUsers.add(m.user_id);
        if (m.visitor_id) mutedVisitors.add(m.visitor_id);
      }
    });

    // topic ריק → הכל. אחרת: מנויים שסימנו את הנושא, או שלא סימנו נושאים (=הכל). מדלגים על מושתקים.
    const targets = (subs || []).filter((s: { topics?: string[]; user_id?: string; visitor_id?: string }) => {
      if (s.user_id && mutedUsers.has(s.user_id)) return false;
      if (s.visitor_id && mutedVisitors.has(s.visitor_id)) return false;
      return !topic || !Array.isArray(s.topics) || s.topics.length === 0 || s.topics.includes(topic);
    });

    const payload = JSON.stringify({
      title: title || "סוד1820",
      body: body || "",
      url: url || "/",
    });

    let sent = 0, gone = 0, failed = 0;
    await Promise.all(targets.map(async (s: { endpoint: string; p256dh: string; auth: string }) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        );
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) {
          gone++;
          await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        } else {
          failed++;
        }
      }
    }));

    return json({ sent, gone, failed, total: targets.length });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
