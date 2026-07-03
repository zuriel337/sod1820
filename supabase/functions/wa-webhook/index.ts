// 🤖 wa-webhook — בוט וואטסאפ אוטונומי (רב-קבוצתי). מגיב לרמזים בקבוצות שמופעלות
// ב-wa_bot_config: מאמת במנוע (fn_ragil) → מפרש (התכנסויות) → מגיב → מוסיף למאגר (wa_add_word).
// גדרות: רק קבוצות מאושרות · מתג enabled · הגבלת קצב · dedup · סינון תוכן רגיש ·
// טריגר מצומצם (מילה בודדת / «ביטוי=מספר») · לוג מלא. אימות webhook בסוד ?s=.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SECRET = "s0d1820wahook_7yq2c9";
const SIGN = "⚙️ מאומת במנוע · sod1820";
const SENSITIVE = /(נדקר|נרצח|נהרג|הרוג|רצח|פיגוע|טרור|מוות|נפטר|אסון|שריפ|דקיר|מת\b)/;
const STOP = new Set(["שלום","תודה","כן","לא","בסדר","אמן","הי","היי","אוקיי","מעולה","יפה","וואו","מאומת","בוקר","ערב","לילה"]);

const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const ok = () => new Response("ok", { status: 200 });
const clean = (s: string) => (s || "").replace(/[֑-ׇ]/g, "").replace(/[^א-ת\s]/g, " ").replace(/\s+/g, " ").trim();

async function ragil(phrase: string) { const { data, error } = await sb.rpc("fn_ragil", { phrase }); return error ? 0 : (Number(data) || 0); }
async function convergences(value: number, exclude: string) {
  const { data } = await sb.from("gematria_words").select("phrase").eq("ragil", value).limit(30);
  const seen = new Set([clean(exclude)]); const out: string[] = [];
  for (const r of (data || [])) { const p = (r as { phrase: string }).phrase || "";
    if (!p || SENSITIVE.test(p) || seen.has(clean(p))) continue; seen.add(clean(p)); out.push(p); if (out.length >= 3) break; }
  return out;
}
async function addWord(phrase: string, group: string, who: string) {
  const { data } = await sb.rpc("wa_add_word", { p_phrase: phrase, p_source: "wa-" + group.slice(0, 12), p_note: who ? "מאת " + who : null });
  return String(data || "");
}
async function reply(chatId: string, message: string, quotedId: string) {
  await sb.rpc("wa_admin", { p_method: "sendMessage", p_payload: { chatId, message, quotedMessageId: quotedId }, p_http: "POST" });
}
async function log(row: Record<string, unknown>) { try { await sb.from("wa_bot_log").insert(row); } catch { /* noop */ } }

Deno.serve(async (req) => {
  try {
    if (new URL(req.url).searchParams.get("s") !== SECRET) return new Response("forbidden", { status: 403 });
    const body = await req.json().catch(() => ({}));
    if (body?.typeWebhook !== "incomingMessageReceived") return ok();

    const chatId = body?.senderData?.chatId || "";
    if (!chatId.endsWith("@g.us")) return ok();
    // רק קבוצות שמופעלות ב-wa_bot_config (רב-קבוצתי) — אחרת מתעלמים ולא שומרים כלום
    const { data: cfg } = await sb.from("wa_bot_config").select("enabled,max_per_hour").eq("group_id", chatId).maybeSingle();
    if (!cfg || cfg.enabled === false) return ok();

    const msgId = body?.idMessage || "";
    const sender = body?.senderData?.sender || "";
    const senderName = body?.senderData?.senderName || "";
    const md = body?.messageData || {};
    const text = (md?.textMessageData?.textMessage || md?.extendedTextMessageData?.text || "").trim();
    if (!msgId || !text) return ok();
    if (text.includes("sod1820") || text.includes(SIGN)) return ok();

    const { data: dup } = await sb.from("wa_bot_log").select("id").eq("msg_id", msgId).maybeSingle();
    if (dup) return ok();

    const since = new Date(Date.now() - 3600e3).toISOString();
    const { count } = await sb.from("wa_bot_log").select("id", { count: "exact", head: true })
      .eq("group_id", chatId).eq("action", "replied").gte("created_at", since);
    if ((count || 0) >= (cfg.max_per_hour || 20)) { await log({ group_id: chatId, msg_id: msgId, sender, sender_name: senderName, text_in: text, action: "rate_limited" }); return ok(); }

    // ── טריגר ──
    let phrase = "", claimed: number | null = null;
    const eq = text.indexOf("=");
    if (eq > 0) {
      phrase = clean(text.slice(0, eq));
      const m = text.slice(eq + 1).match(/\d{1,6}/); claimed = m ? parseInt(m[0], 10) : null;
    } else {
      const c = clean(text); const words = c.split(" ").filter(Boolean);
      if (words.length >= 1 && words.length <= 5 && c.length >= 2 && !(words.length === 1 && STOP.has(words[0]))) phrase = c;
    }
    if (!phrase) { await log({ group_id: chatId, msg_id: msgId, sender, sender_name: senderName, text_in: text, action: "no_trigger" }); return ok(); }

    const value = await ragil(phrase);
    if (value <= 0) { await log({ group_id: chatId, msg_id: msgId, sender, sender_name: senderName, text_in: text, action: "no_trigger" }); return ok(); }

    const conv = await convergences(value, phrase);
    const convLine = conv.length ? `\nבאותו ערך במנוע: ${conv.map((p) => `*${p}*`).join(" · ")}` : "";
    // 📥 הוספה אוטומטית למאגר (רק אם חדש)
    const added = await addWord(phrase, chatId.replace("@g.us", ""), senderName);
    const savedLine = added === "added" ? "\n📥 נכנס למאגר סוד1820 ✓" : "";

    let message: string;
    if (claimed !== null && claimed !== value) message = `בדקתי במנוע 🙏\n*${phrase}* = *${value}* (ולא ${claimed} — אולי כתיב/רווח שונה).${convLine}${savedLine}\n\n${SIGN}`;
    else if (claimed !== null) message = `יפה 🙏 אימתתי במנוע:\n*${phrase}* = *${value}* ✓${convLine}${savedLine}\n\n${SIGN}`;
    else message = `*${phrase}* = *${value}* 🎯${convLine}${savedLine}\n\n${SIGN}`;

    await reply(chatId, message, msgId);
    await log({ group_id: chatId, msg_id: msgId, sender, sender_name: senderName, text_in: text, value, reply_out: message, action: "replied" });
    return ok();
  } catch { return ok(); }
});
