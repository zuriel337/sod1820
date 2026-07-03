// 🤖 wa-webhook — בוט וואטסאפ אוטונומי לקבוצת «הגילוי היומי – כי לה׳ המלוכה».
// Green API שולח לכאן כל הודעה נכנסת → הבוט מזהה רמז → מאמת במנוע (fn_ragil) → מגיב לבד.
// גדרות: רק קבוצת-היעד · מתג wa_bot_config.enabled · הגבלת קצב · dedup · סינון תוכן רגיש ·
// טריגר מצומצם (מילה בודדת / «ביטוי=מספר») · לוג מלא · לעולם לא כותב לאתר.
// אימות: סוד ב-?s= (Green API קורא ל-URL עם המחרוזת). service_role אוטומטי מה-env.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SECRET = "s0d1820wahook_7yq2c9";
const GROUP = "120363397037220315@g.us";
const SIGN = "⚙️ מאומת במנוע · sod1820";
const SENSITIVE = /(נדקר|נרצח|נהרג|הרוג|רצח|פיגוע|טרור|מוות|נפטר|אסון|שריפ|דקיר|מת\b)/;
const STOP = new Set(["שלום","תודה","כן","לא","בסדר","אמן","הי","היי","אוקיי","מעולה","יפה","וואו","מאומת"]);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

const ok = () => new Response("ok", { status: 200 });
// ניקוי ניקוד/טעמים → אותיות עבריות ורווחים בלבד
const clean = (s: string) => (s || "").replace(/[֑-ׇ]/g, "").replace(/[^א-ת\s]/g, " ").replace(/\s+/g, " ").trim();

async function ragil(phrase: string): Promise<number> {
  const { data, error } = await sb.rpc("fn_ragil", { phrase });
  if (error) return 0;
  return Number(data) || 0;
}
async function convergences(value: number, exclude: string): Promise<string[]> {
  const { data } = await sb.from("gematria_words").select("phrase")
    .eq("ragil", value).limit(25);
  const seen = new Set([clean(exclude)]);
  const out: string[] = [];
  for (const r of (data || [])) {
    const p = (r as { phrase: string }).phrase || "";
    if (!p || SENSITIVE.test(p) || seen.has(clean(p))) continue;
    seen.add(clean(p)); out.push(p);
    if (out.length >= 3) break;
  }
  return out;
}
async function reply(message: string, quotedId: string) {
  await sb.rpc("wa_admin", {
    p_method: "sendMessage",
    p_payload: { chatId: GROUP, message, quotedMessageId: quotedId },
    p_http: "POST",
  });
}
async function log(row: Record<string, unknown>) {
  try { await sb.from("wa_bot_log").insert(row); } catch { /* noop */ }
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    if (url.searchParams.get("s") !== SECRET) return new Response("forbidden", { status: 403 });

    const body = await req.json().catch(() => ({}));
    if (body?.typeWebhook !== "incomingMessageReceived") return ok();

    const chatId = body?.senderData?.chatId || "";
    if (chatId !== GROUP) return ok();   // רק קבוצת-היעד (לא שומרים שום דבר מקבוצות אחרות)

    const msgId = body?.idMessage || "";
    const sender = body?.senderData?.sender || "";
    const senderName = body?.senderData?.senderName || "";
    const md = body?.messageData || {};
    const text = (md?.textMessageData?.textMessage || md?.extendedTextMessageData?.text || "").trim();
    if (!msgId || !text) return ok();
    if (text.includes("sod1820") || text.includes(SIGN)) return ok();   // הגנה מלולאה

    // dedup — כבר טופל?
    const { data: dup } = await sb.from("wa_bot_log").select("id").eq("msg_id", msgId).maybeSingle();
    if (dup) return ok();

    // מתג כיבוי + הגבלת קצב
    const { data: cfg } = await sb.from("wa_bot_config").select("enabled,max_per_hour").eq("group_id", GROUP).maybeSingle();
    if (!cfg || cfg.enabled === false) { await log({ group_id: GROUP, msg_id: msgId, sender, sender_name: senderName, text_in: text, action: "disabled" }); return ok(); }
    const since = new Date(Date.now() - 3600e3).toISOString();
    const { count } = await sb.from("wa_bot_log").select("id", { count: "exact", head: true })
      .eq("group_id", GROUP).eq("action", "replied").gte("created_at", since);
    if ((count || 0) >= (cfg.max_per_hour || 20)) { await log({ group_id: GROUP, msg_id: msgId, sender, sender_name: senderName, text_in: text, action: "rate_limited" }); return ok(); }

    // ── זיהוי טריגר ──
    let phrase = "", claimed: number | null = null;
    const eq = text.indexOf("=");
    if (eq > 0) {                                   // «ביטוי=מספר»
      phrase = clean(text.slice(0, eq));
      const m = text.slice(eq + 1).match(/\d{1,6}/);
      claimed = m ? parseInt(m[0], 10) : null;
    } else {                                        // מילה בודדת (הזמנה: «שלחו לי מילה»)
      const c = clean(text);
      const words = c.split(" ").filter(Boolean);
      if (words.length === 1 && words[0].length >= 2 && !STOP.has(words[0])) phrase = c;
    }
    if (!phrase) { await log({ group_id: GROUP, msg_id: msgId, sender, sender_name: senderName, text_in: text, action: "no_trigger" }); return ok(); }

    const value = await ragil(phrase);
    if (value <= 0) { await log({ group_id: GROUP, msg_id: msgId, sender, sender_name: senderName, text_in: text, action: "no_trigger" }); return ok(); }

    const conv = await convergences(value, phrase);
    const convLine = conv.length ? `\nבאותו ערך במנוע: ${conv.map((p) => `*${p}*`).join(" · ")}` : "";

    let message: string;
    if (claimed !== null && claimed !== value) {
      message = `בדקתי במנוע 🙏\n*${phrase}* = *${value}* (ולא ${claimed} — אולי כתיב או רווח שונה).${convLine}\n\n${SIGN}`;
    } else if (claimed !== null) {
      message = `יפה 🙏 אימתתי במנוע:\n*${phrase}* = *${value}* ✓${convLine}\n\n${SIGN}`;
    } else {
      message = `*${phrase}* = *${value}* 🎯${convLine}\n\n${SIGN}`;
    }

    await reply(message, msgId);
    await log({ group_id: GROUP, msg_id: msgId, sender, sender_name: senderName, text_in: text, value, reply_out: message, action: "replied" });
    return ok();
  } catch (_e) {
    return ok();   // webhook תמיד מחזיר 200 (לא מבקשים retry)
  }
});
