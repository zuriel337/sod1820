// src/lib/waReply.js — שכבת Admin-Reply (Phase 3B · מוקשח) · קליינט → RPC wa_admin_reply (אדמין-gated).
// ⛔ reuse בלבד: translate/prepare=video_translate raw · send=wa_send.
// 🔒 send שולח artifact-מאושר בלבד (לא טקסט חופשי) — מה שנשלח = בדיוק מה ש-prepare אישר. Idempotent.
import { supabase } from "./supabase.js";

// תרגום-תצוגה (הודעה-נכנסת → עברית). לא יוצר artifact, לא שולח. מתעד עלות (ref/group/user).
export async function waTranslate({ text, target = "he", ref = null, group = null, userRef = null }) {
  if (!supabase || !text) return { error: "no_input" };
  try {
    const { data, error } = await supabase.rpc("wa_admin_reply", { p_action: "translate", p_payload: { text, target, ref, group, user_ref: userRef } });
    if (error) return { error: error.message || "rpc_error" };
    if (data?.error) return { error: data.error };
    const r = data?.result?.result || data?.result || {};
    return { ok: true, text: r.text || null, detected: r.detected_lang || null, confidence: r.confidence ?? null, model: r.model || null, usage: r.usage || null };
  } catch (e) { return { error: String(e?.message || e) }; }
}

// prepare — מכין artifact-מאושר: מתרגם תשובה-עברית→שפת-מקבל ושומר את הטקסט המדויק. מחזיר {artifact, text}.
// chat_id מהרשומה (item.group). לחיצה-כפולה = אותו artifact (done_key דטרמיניסטי).
export async function waPrepareReply({ chatId, hebrew, target, ref = null, userRef = null, msgIn = null }) {
  if (!supabase || !chatId || !hebrew || !target) return { error: "missing" };
  try {
    const { data, error } = await supabase.rpc("wa_admin_reply", { p_action: "prepare", p_payload: { chat_id: chatId, text: hebrew, target, ref, group: chatId, user_ref: userRef, msg_in: msgIn } });
    if (error) return { error: error.message || "rpc_error" };
    if (data?.error) return { error: data.error, detail: data.detail };
    return { ok: true, artifact: data.artifact, text: data.text, target: data.target, detected: data.detected, confidence: data.confidence };
  } catch (e) { return { error: String(e?.message || e) }; }
}

// send — Human-Gate: שולח artifact-מאושר בלבד (מה שהוצג ב-prepare, מילה-במילה). Idempotent (double-click בטוח).
export async function waSendArtifact({ artifact }) {
  if (!supabase || !artifact) return { error: "missing_artifact" };
  try {
    const { data, error } = await supabase.rpc("wa_admin_reply", { p_action: "send", p_payload: { artifact } });
    if (error) return { error: error.message || "rpc_error" };
    if (data?.error) return { error: data.error, detail: data.detail };
    return { ok: true, chatId: data.chat_id, text: data.text, at: data.at, by: data.by, idempotent: !!data.idempotent, inProgress: !!data.in_progress };
  } catch (e) { return { error: String(e?.message || e) }; }
}
