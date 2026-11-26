// Staff-only client for the community network blocks (proposal 26.11.2026; the RPCs exist only after the SQL is approved and applied).
// It is imported only by the moderator panel, which is already loaded for moderators alone; nothing here is part of the shell or of a public page.
// The server is the authority: it refuses non-staff callers, checks every rule, and never returns an address or a network reference.
import { supabase } from "../supabase.js";

export const NET_BLOCK_DURATIONS = Object.freeze([
  Object.freeze({ id: "h24", label: "24 שעות" }),
  Object.freeze({ id: "d3", label: "3 ימים" }),
  Object.freeze({ id: "d7", label: "7 ימים" }),
]);
export const NET_BLOCK_REASON_MIN = 10;
export const NET_BLOCK_REASON_MAX = 300;
const ERRORS = {
  not_authorized: "אין הרשאה לפעולה הזו.",
  reason_required: "יש לכתוב סיבה (10 עד 300 תווים).",
  not_guest_post: "אפשר לפעול רק על הודעת אורח.",
  no_network_reference: "הודעה ישנה: אין לה קישור לרשת, ולכן אי אפשר לחסום לפיה. אפשר להסתיר אותה.",
  already_blocked: "הרשת הזו כבר חסומה.",
  too_many_blocks: "בוצעו הרבה חסימות בשעה האחרונה. נסו שוב מאוחר יותר.",
  bad_duration: "משך החסימה אינו תקין.",
  not_found: "החסימה לא נמצאה או שכבר הסתיימה.",
};
export function netBlockErrorMessage(error) {
  const text = `${error?.message || ""} ${error?.details || ""}`;
  for (const [code, message] of Object.entries(ERRORS)) if (text.includes(code) || text.includes(code.replace("_", " "))) return message;
  return "הפעולה לא הושלמה. אפשר לנסות שוב.";
}
export function cleanNetBlockReason(value) {
  return String(value ?? "").replace(/[\u0001-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g, "").replace(/\s+/g, " ").trim().slice(0, NET_BLOCK_REASON_MAX);
}
export const netBlockReasonValid = value => cleanNetBlockReason(value).length >= NET_BLOCK_REASON_MIN;
const call = async (client, name, args) => { const { data, error } = await client.rpc(name, args); if (error) throw error; return data; };
export const blockGuestFromMessage = ({ messageId, duration, reason, hide = true }, client = supabase) =>
  call(client, "community_guest_block_from_message_v1", { p_message_id: messageId, p_duration: duration, p_reason: cleanNetBlockReason(reason), p_hide: hide !== false });
export const hideGuestMessage = ({ messageId, reason }, client = supabase) =>
  call(client, "community_guest_hide_v1", { p_message_id: messageId, p_reason: cleanNetBlockReason(reason) });
export const liftNetBlock = ({ blockId, reason }, client = supabase) =>
  call(client, "community_net_block_lift_v1", { p_block_id: blockId, p_reason: cleanNetBlockReason(reason) });
export const requestPermanentNetBlock = ({ blockId, reason }, client = supabase) =>
  call(client, "community_net_block_request_permanent_v1", { p_block_id: blockId, p_reason: cleanNetBlockReason(reason) });
export const approvePermanentNetBlock = ({ blockId, reason }, client = supabase) =>
  call(client, "community_net_block_approve_permanent_v1", { p_block_id: blockId, p_reason: cleanNetBlockReason(reason) });
export async function fetchNetBlocks({ includeEnded = false, limit = 50 } = {}, client = supabase) {
  const data = await call(client, "community_net_blocks_list_v1", { p_include_ended: !!includeEnded, p_limit: limit });
  return (Array.isArray(data) ? data : []).filter(row => typeof row?.id === "string").map(row => ({
    id: row.id, state: row.state, duration: row.duration_kind, createdAt: row.created_at || null, expiresAt: row.expires_at || null,
    reason: typeof row.reason === "string" ? row.reason : "", by: row.created_by_name || "", linkedMessages: Number(row.linked_messages) || 0,
    permanentRequested: row.permanent_requested === true, liftedAt: row.lifted_at || null, liftedBy: row.lifted_by_name || "", liftReason: row.lift_reason || "",
  }));
}
