// src/lib/waReply.js — שכבת Admin-Reply (Phase 3B) · קליינט → RPC wa_admin_reply (אדמין-gated).
// ⛔ בלי מנוע-תרגום/שליחה חדשים — reuse: translate=video_translate raw · send=wa_send.
// Human-Gate: שליחה נקראת רק אחרי אישור מפורש ב-UI. recipient מגיע מהרשומה (item.group), לא מקלט-חופשי.
import { supabase } from "./supabase.js";

// תרגום (הודעה→עברית · תשובה→שפת-המקבל). מתעד עלות ל-ai_token_log דרך הקצה (ref/group/user).
export async function waTranslate({ text, target = "he", ref = null, group = null, userRef = null }) {
  if (!supabase || !text) return { error: "no_input" };
  try {
    const { data, error } = await supabase.rpc("wa_admin_reply", {
      p_action: "translate",
      p_payload: { text, target, ref, group, user_ref: userRef },
    });
    if (error) return { error: error.message || "rpc_error" };
    // הקצה מחזיר {result:{result:{text,detected_lang,confidence,model,usage}}}
    const r = data?.result?.result || data?.result || {};
    return { ok: true, text: r.text || null, detected: r.detected_lang || null, confidence: r.confidence ?? null, model: r.model || null, usage: r.usage || null };
  } catch (e) { return { error: String(e?.message || e) }; }
}

// שליחה — Human-Gate: לקרוא רק אחרי אישור ZURIEL. chat_id מהרשומה (item.group).
export async function waSendReply({ chatId, text, msgIn = null }) {
  if (!supabase || !chatId || !text) return { error: "missing" };
  try {
    const { data, error } = await supabase.rpc("wa_admin_reply", {
      p_action: "send",
      p_payload: { chat_id: chatId, text, msg_in: msgIn },
    });
    if (error) return { error: error.message || "rpc_error" };
    if (data?.error) return { error: data.error, detail: data.detail };
    return { ok: true, chatId: data?.chat_id, at: data?.at, sent: data?.sent };
  } catch (e) { return { error: String(e?.message || e) }; }
}
