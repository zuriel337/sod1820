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
  // ללא הגדרת מפתחות — לא שולחים (ולא נשארים פתוחים לכולם).
  if (!VAPID_PUBLIC || !VAPID_PRIVATE || !ADMIN_KEY) {
    return json({ error: "push not configured (missing VAPID/ADMIN secrets)" }, 503);
  }
  try {
    const { title, body, url, topic, admin_key } = await req.json();
    if (admin_key !== ADMIN_KEY) return json({ error: "unauthorized" }, 401);

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth, topics");

    // topic ריק → הכל. אחרת: מנויים שסימנו את הנושא, או שלא סימנו נושאים (=הכל).
    const targets = (subs || []).filter((s: { topics?: string[] }) =>
      !topic || !Array.isArray(s.topics) || s.topics.length === 0 || s.topics.includes(topic)
    );

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
