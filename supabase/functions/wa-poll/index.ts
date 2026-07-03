// 🔁 wa-poll — גשר קריאה (עוקף את ה-webhook התקוע של Green). pg_cron קורא לכאן כל דקה.
// קורא getChatHistory לכל קבוצה מופעלת → מעביר הודעות *חדשות* (עד 150 שניות, לא בלוג) ל-wa-webhook.
// ה-webhook עושה את כל השאר (אימות/מענה/עומק/הוספה/dedup). כך אין כפילות לוגיקה.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SECRET = "s0d1820wahook_7yq2c9";
const HOOK = "https://linswmnnkjxvweumprav.supabase.co/functions/v1/wa-webhook?s=" + SECRET;
const CUTOFF = 150; // שניות — רק הודעות טריות (מונע מענה לבֶּקלוֹג ישן בהפעלה ראשונה)
const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

async function waAdmin(method: string, payload: unknown, http: string) {
  const { data } = await sb.rpc("wa_admin", { p_method: method, p_payload: payload, p_http: http });
  return data;
}

Deno.serve(async (req) => {
  if (new URL(req.url).searchParams.get("s") !== SECRET) return new Response("forbidden", { status: 403 });
  const { data: cfgs } = await sb.from("wa_bot_config").select("group_id").eq("enabled", true);
  const nowSec = Date.now() / 1000;
  let forwarded = 0;
  for (const cfg of (cfgs || [])) {
    const chatId = (cfg as { group_id: string }).group_id;
    let hist;
    try { hist = await waAdmin("getChatHistory", { chatId, count: 20 }, "POST"); } catch { continue; }
    const msgs = (hist?.result || []) as Array<Record<string, any>>;
    // מהישן לחדש — כדי שהמענה יישמר בסדר
    for (const m of msgs.slice().reverse()) {
      if (m.type !== "incoming") continue;
      if (!m.timestamp || (nowSec - m.timestamp) > CUTOFF) continue;
      const ext = m.extendedTextMessage || {};
      const text = m.textMessage || ext.text || "";
      const msgId = m.idMessage;
      if (!text || !msgId) continue;
      const { data: dup } = await sb.from("wa_bot_log").select("id").eq("msg_id", msgId).maybeSingle();
      if (dup) continue;
      const payload = {
        typeWebhook: "incomingMessageReceived",
        idMessage: msgId,
        senderData: { chatId, sender: m.senderId || "", senderName: m.senderName || "" },
        messageData: {
          typeMessage: m.typeMessage || "textMessage",
          textMessageData: { textMessage: m.textMessage || "" },
          extendedTextMessageData: { text: ext.text || "", stanzaId: ext.stanzaId || "" },
          quotedMessage: m.quotedMessage || null,
        },
      };
      try { await fetch(HOOK, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); forwarded++; } catch { /* noop */ }
    }
  }
  return new Response(JSON.stringify({ forwarded }), { headers: { "Content-Type": "application/json" } });
});
