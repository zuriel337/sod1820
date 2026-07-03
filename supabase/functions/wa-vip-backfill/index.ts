// 🕰️ wa-vip-backfill — סריקה חד-פעמית של היסטוריית קבוצה: לוכד את *כל* הודעות אנשי-הזהב
// (שמעון/צבי) שכבר נכתבו → שומר בתיבת-VIP (wa_vip_inbox) + מחלץ כל ביטוי עברי ומכניס לנתיב-VIP
// (wa_add_vip_word → עמודה נפרדת vip_source). כך לא מפספסים שום הודעה, גם רטרואקטיבית.
// קלט: ?s=SECRET&group=<chatId>&count=<N>. תמונות נשמרות בתיבה (בלי OCR כאן — לחסוך עלות).
import { createClient } from "jsr:@supabase/supabase-js@2";

const SECRET = "s0d1820wahook_7yq2c9";
const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const clean = (s: string) => (s || "").replace(/[֑-ׇ]/g, "").replace(/[^א-ת\s]/g, " ").replace(/\s+/g, " ").trim();
const langOf = (s: string) => { const he = /[א-ת]/.test(s), en = /[A-Za-z]/.test(s), ar = /[؀-ۿ]/.test(s); return he ? (en ? "he+en" : "he") : ar ? "ar" : en ? "en" : "other"; };
function extractPhrases(t: string): string[] {
  const parts = (t || "").split(/[\n,;=·|•\-–—:()"'".!?׃־]+/);
  const out: string[] = [];
  for (const raw of parts) {
    const c = clean(raw); if (!c) continue;
    const w = c.split(" ").filter(Boolean);
    if (c.length >= 2 && c.length <= 40 && w.length >= 1 && w.length <= 6) out.push(c);
  }
  return [...new Set(out)].slice(0, 15);
}

Deno.serve(async (req) => {
  const u = new URL(req.url);
  if (u.searchParams.get("s") !== SECRET) return new Response("forbidden", { status: 403 });
  const group = u.searchParams.get("group") || "";
  const count = Math.min(500, parseInt(u.searchParams.get("count") || "300", 10) || 300);
  if (!group) return new Response(JSON.stringify({ error: "no_group" }), { status: 400 });

  const { data: vips } = await sb.from("wa_vip_senders").select("sender,name_match").eq("active", true);
  const isVip = (sender: string, name: string) => (vips || []).some((v: { sender?: string; name_match?: string }) =>
    (v.sender && (sender || "").startsWith(v.sender)) || (v.name_match && (name || "").includes(v.name_match)));

  const { data: hist } = await sb.rpc("wa_admin", { p_method: "getChatHistory", p_payload: { chatId: group, count }, p_http: "POST" });
  const msgs = ((hist as { result?: unknown[] })?.result || []) as Array<Record<string, any>>;

  let seen = 0, inbox = 0, added = 0, existed = 0;
  const perSender: Record<string, number> = {};
  for (const m of msgs) {
    if (m.type !== "incoming") continue;
    const sender = m.senderId || "";
    const senderName = m.senderName || "";
    if (!isVip(sender, senderName)) continue;
    const msgId = m.idMessage; if (!msgId) continue;
    seen++;
    perSender[senderName] = (perSender[senderName] || 0) + 1;

    const isImg = m.typeMessage === "imageMessage" || !!m.downloadUrl || !!m.fileMessageData;
    const text = m.textMessage || m.extendedTextMessage?.text || m.caption || m.fileMessageData?.caption || "";
    const kind = isImg ? "image" : "text";

    // תיבת-VIP — כל הודעה נשמרת (upsert לפי msg_id). תמונה בלי OCR כאן — רק סימון kind=image.
    const phrases = kind === "text" ? extractPhrases(text) : [];
    try {
      await sb.from("wa_vip_inbox").upsert({
        group_id: group, msg_id: msgId, sender, sender_name: senderName,
        kind, text_raw: text, lang: langOf(text), phrases,
      }, { onConflict: "msg_id" });
      inbox++;
    } catch { /* noop */ }

    for (const p of phrases) {
      try {
        const { data: r } = await sb.rpc("wa_add_vip_word", { p_phrase: p, p_vip: senderName || null, p_note: senderName ? "מאת " + senderName + " (רטרו)" : null });
        if (String(r) === "added") added++; else if (String(r) === "exists") existed++;
      } catch { /* noop */ }
    }
  }
  return new Response(JSON.stringify({ total: msgs.length, vip_seen: seen, inbox_saved: inbox, words_added: added, words_existed: existed, per_sender: perSender }), { headers: { "Content-Type": "application/json" } });
});
