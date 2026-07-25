// 🤖 wa-webhook — בוט וואטסאפ אוטונומי (רב-קבוצתי). מגיב לרמזים בקבוצות שמופעלות
// ב-wa_bot_config: מאמת במנוע (fn_ragil) → מפרש (התכנסויות) → מגיב → מוסיף למאגר (wa_add_word).
// גדרות: רק קבוצות מאושרות · מתג enabled · הגבלת קצב · dedup · סינון תוכן רגיש ·
// טריגר מצומצם (מילה בודדת / «ביטוי=מספר») · לוג מלא. אימות webhook בסוד ?s=.
// 🔇 מדיניות מענה (החלטת צוריאל 22.7.2026): הבוט *תמיד סורק ושומר* (מילים למאגר + תיבת-VIP),
//    אבל *עונה רק כשפונים אליו* — «רזיאל» בהודעה, או תגובה (reply) להודעת הבוט / פקודת «עומק».
//    בלי פנייה = שקט מוחלט (שומר, לא כותב).
import { createClient } from "jsr:@supabase/supabase-js@2";

const SECRET = "s0d1820wahook_7yq2c9";
const OCR_URL = "https://linswmnnkjxvweumprav.supabase.co/functions/v1/wa-ocr?s=" + SECRET;
const SIGN = "🔯 רזיאל · מאומת במנוע · sod1820";
const SENSITIVE = /(נדקר|נרצח|נהרג|הרוג|רצח|פיגוע|טרור|מוות|נפטר|אסון|שריפ|דקיר|מת\b)/;
const STOP = new Set(["שלום","תודה","כן","לא","בסדר","אמן","הי","היי","אוקיי","מעולה","יפה","וואו","מאומת","בוקר","ערב","לילה"]);

const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const ok = () => new Response("ok", { status: 200 });
const clean = (s: string) => (s || "").replace(/[֑-ׇ]/g, "").replace(/[^א-ת\s]/g, " ").replace(/\s+/g, " ").trim();
const langOf = (s: string) => { const he = /[א-ת]/.test(s), en = /[A-Za-z]/.test(s), ar = /[؀-ۿ]/.test(s); return he ? (en ? "he+en" : "he") : ar ? "ar" : en ? "en" : "other"; };
// 👑 תיבת-VIP: כל הודעה של איש-זהב נשמרת גולמית (upsert לפי msg_id → לא כפול, לא אובד).
async function vipInbox(row: Record<string, unknown>) { try { await sb.from("wa_vip_inbox").upsert(row, { onConflict: "msg_id" }); } catch { /* noop */ } }

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
    if (!msgId) return ok();

    // 🎯 האם פונים לבוט? = תגובה (reply) להודעת הבוט (מזוהה בחתימה) → רק אז הוא עונה.
    //    («רזיאל» בטקסט נבדק בהמשך לכל הודעה). בלי פנייה → סורק ושומר בשקט.
    const quoted = md?.quotedMessage || null;
    const quotedText = quoted ? (quoted.textMessage || quoted.extendedTextMessageData?.text || quoted.extendedTextMessage?.text || "") : "";
    const replyToBot = !!quoted && (/sod1820/i.test(quotedText) || quotedText.includes("🔯"));

    const { data: dup } = await sb.from("wa_bot_log").select("id").eq("msg_id", msgId).maybeSingle();
    if (dup) return ok();
    const sinceH = new Date(Date.now() - 3600e3).toISOString();

    // 👑 אנשי-זהב (VIP): הודעותיהם תמיד נשמרות. מענה — רק בפנייה (ככל שאר הקבוצה, מדיניות 22.7.2026).
    const { data: vips } = await sb.from("wa_vip_senders").select("sender,name_match").eq("active", true);
    const isVip = (vips || []).some((v: { sender?: string; name_match?: string }) =>
      (v.sender && sender.startsWith(v.sender)) || (v.name_match && senderName.includes(v.name_match)));

    // 👁️ תמונה → OCR אוטומטי (קורא את התמונה/הטופס). סורק ושומר תמיד; עונה רק אם פונים אליו. cap 15/שעה.
    const fileData = md?.fileMessageData || {};
    const imgUrl = (md?.typeMessage === "imageMessage" || fileData.downloadUrl) ? (fileData.downloadUrl || "") : "";
    if (imgUrl) {
      const { count: oc } = await sb.from("wa_bot_log").select("id", { count: "exact", head: true }).eq("group_id", chatId).eq("action", "ocr_replied").gte("created_at", sinceH);
      if ((oc || 0) >= 15) { await log({ group_id: chatId, msg_id: msgId, sender, sender_name: senderName, text_in: "[image]", action: "ocr_rate_limited" }); return ok(); }
      let ocr: { numbers?: number[]; text?: string } | null = null;
      try { const r = await fetch(OCR_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl: imgUrl }) }); ocr = await r.json(); } catch { /* noop */ }
      const nums = Array.isArray(ocr?.numbers) ? ocr.numbers.slice(0, 25) : [];
      const otext = String(ocr?.text || "").trim();
      if (!nums.length && !otext) { await log({ group_id: chatId, msg_id: msgId, sender, sender_name: senderName, text_in: "[image]", action: "ocr_empty" }); return ok(); }
      if (isVip) await vipInbox({ group_id: chatId, msg_id: msgId, sender, sender_name: senderName, kind: "image", text_raw: otext, numbers: nums, lang: langOf(otext) });
      // פנייה לבוט על תמונה = «רזיאל» בכיתוב או reply להודעת-בוט. אחרת: נסרק ונשמר, בלי מענה.
      const imgAddressed = replyToBot || /רזיאל/.test(String(fileData.caption || ""));
      if (!imgAddressed) { await log({ group_id: chatId, msg_id: msgId, sender, sender_name: senderName, text_in: "[image]", action: "ocr_scanned" }); return ok(); }
      const head = otext.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 5).join("\n").slice(0, 400);
      const numLine = nums.length ? `\n\n🔢 מספרים: ${nums.join(", ")}` : "";
      await reply(chatId, `👁️ קראתי את התמונה:\n${head}${numLine}\n\n${SIGN}`, msgId);
      await log({ group_id: chatId, msg_id: msgId, sender, sender_name: senderName, text_in: "[image]", action: "ocr_replied" });
      return ok();
    }

    const text = (md?.textMessageData?.textMessage || md?.extendedTextMessageData?.text || "").trim();
    if (!text) return ok();
    if (text.includes("sod1820") || text.includes(SIGN)) return ok();
    // 👑 כל הודעת-טקסט של איש-זהב נשמרת מיד (גם שפה אחרת / בלי גימטריה) — «אל תפספס שום הודעה».
    if (isVip) await vipInbox({ group_id: chatId, msg_id: msgId, sender, sender_name: senderName, kind: "text", text_raw: text, lang: langOf(text) });

    // 🎯 פונים לבוט? = «רזיאל» בהודעה או תגובה (reply) להודעת הבוט. רק אז עונים.
    const called = /רזיאל/.test(text);
    const addressed = called || replyToBot;

    // 🎯 פקודת-עומק: reply על הודעה + «עומק»/«תעמיק»/🔎 → בקשה מפורשת → תמיד עונים ומעמיקים.
    const extInfo = md?.extendedTextMessageData || {};
    const replyText = (extInfo.text || md?.textMessageData?.textMessage || "").trim();
    if (quoted && /(^|\s)(עומק|תעמיק|🔎)(\s|$)/.test(replyText)) {
      const qtext = quoted.textMessage || quoted.extendedTextMessageData?.text || quoted.extendedTextMessage?.text || "";
      const eqq = qtext.indexOf("=");
      const qphrase = clean(eqq > 0 ? qtext.slice(0, eqq) : qtext);
      const qMsgId = extInfo.stanzaId || quoted.stanzaId || msgId;
      if (qphrase && qphrase.length >= 2) {
        try { await reply(chatId, "🔎 מעמיק על ההודעה הזו — בקרוב תשובה 🙏", qMsgId); } catch { /* noop */ }
        await sb.from("wa_deep_queue").insert({ chat_id: chatId, msg_id: qMsgId, sender, sender_name: senderName, phrase: qphrase, claimed: null });
        await log({ group_id: chatId, msg_id: msgId, sender, sender_name: senderName, text_in: text, action: "deep_command" });
        return ok();
      }
    }

    // ── טריגר ── (החוק: כותבים «רזיאל» כדי לדבר איתו)
    const base = called ? text.replace(/רזיאל/g, " ").replace(/[?!.]/g, " ").replace(/\s+/g, " ").trim() : text;
    if (called && !base) {
      await reply(chatId, "כן, אני כאן 🔯 כתבו לי מילה או «ביטוי=מספר» ואחשב במנוע — או ענו «עומק» על הודעה כדי שאעמיק.", msgId);
      await log({ group_id: chatId, msg_id: msgId, sender, sender_name: senderName, text_in: text, action: "raziel_hi" });
      return ok();
    }
    let phrase = "", claimed: number | null = null;
    const eq = base.indexOf("=");
    if (eq > 0) {
      phrase = clean(base.slice(0, eq));
      const m = base.slice(eq + 1).match(/\d{1,6}/); claimed = m ? parseInt(m[0], 10) : null;
    } else {
      const c = clean(base); const w = c.split(" ").filter(Boolean);
      // VIP: בלי תקרת-מילים, רק לא ברכה-בודדת (למנוע «תודה» → מסה). קרוא/רגיל כרגיל.
      const okWord = called ? (w.length >= 1 && w.length <= 6 && c.length >= 2)
        : isVip ? (c.length >= 2 && !(w.length === 1 && STOP.has(w[0])))
        : (w.length >= 1 && w.length <= 5 && c.length >= 2 && !(w.length === 1 && STOP.has(w[0])));
      if (okWord) phrase = c;
    }
    if (!phrase) { await log({ group_id: chatId, msg_id: msgId, sender, sender_name: senderName, text_in: text, action: "no_trigger" }); return ok(); }

    // 🔇 לא פונים לבוט → סורק ושומר בלבד (מוסיף למאגר), *בלי מענה ובלי תור-עומק*.
    if (!addressed) {
      const added = await addWord(phrase, chatId.replace("@g.us", ""), senderName);
      await log({ group_id: chatId, msg_id: msgId, sender, sender_name: senderName, text_in: text, action: added === "added" ? "scanned+saved" : "scanned" });
      return ok();
    }

    // ── מכאן: פונים לבוט → עונים. הגבלת-קצב חלה על מענה בלבד (השמירה כבר בוצעה למעלה בלי-פנייה). ──
    const since = new Date(Date.now() - 3600e3).toISOString();
    const { count } = await sb.from("wa_bot_log").select("id", { count: "exact", head: true })
      .eq("group_id", chatId).eq("action", "replied").gte("created_at", since);
    if ((count || 0) >= (cfg.max_per_hour || 20)) {
      const added = await addWord(phrase, chatId.replace("@g.us", ""), senderName);
      await log({ group_id: chatId, msg_id: msgId, sender, sender_name: senderName, text_in: text, action: added === "added" ? "rate_limited+saved" : "rate_limited" });
      return ok();
    }

    // ⚡ תשובה מהירה מיד · חישוב עמוק «אחר כך» (פעימת-הדקה). אנשי-זהב תמיד → עומק.
    const words = clean(phrase).split(" ").filter(Boolean);
    const deep = words.length >= 3 || phrase.length > 20 || isVip;

    if (deep) {
      try { await reply(chatId, "🔎 קיבלתי! בודק את הדברים שלכם במנוע — בקרוב תשובה 🙏", msgId); } catch { /* noop */ }
      await sb.from("wa_deep_queue").insert({ chat_id: chatId, msg_id: msgId, sender, sender_name: senderName, phrase, claimed, raw_text: text });
      await log({ group_id: chatId, msg_id: msgId, sender, sender_name: senderName, text_in: text, action: "queued" });
      return ok();
    }

    // מילה בודדת פשוטה — מענה מיידי קל
    const value = await ragil(phrase);
    if (value <= 0) { await log({ group_id: chatId, msg_id: msgId, sender, sender_name: senderName, text_in: text, action: "no_trigger" }); return ok(); }
    const conv = await convergences(value, phrase);
    const convLine = conv.length ? `\nבאותו ערך במנוע: ${conv.map((p) => `*${p}*`).join(" · ")}` : "";
    const message = claimed !== null
      ? (claimed !== value ? `בדקתי במנוע 🙏\n*${phrase}* = *${value}* (ולא ${claimed}).${convLine}\n\n${SIGN}` : `יפה 🙏 *${phrase}* = *${value}* ✓${convLine}\n\n${SIGN}`)
      : `*${phrase}* = *${value}* 🎯${convLine}\n\n${SIGN}`;
    await reply(chatId, message, msgId);
    const added = await addWord(phrase, chatId.replace("@g.us", ""), senderName);
    await log({ group_id: chatId, msg_id: msgId, sender, sender_name: senderName, text_in: text, value, reply_out: message, action: added === "added" ? "replied+saved" : "replied" });
    return ok();
  } catch { return ok(); }
});
