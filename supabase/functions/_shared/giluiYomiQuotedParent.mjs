// Evidence-only quote pointer for the existing group proof (#1514): gilui-yomi and, by ZURIEL 24.11.2026, torat-haremez.
// Green API's quotedMessage / extendedTextMessageData stanzaId is a WhatsApp
// message ID. Do not infer a reply from author, text, timestamp, or proximity.
// This does NOT authorize publication; downstream readers must join source_id,
// group_chat_id, proof, author eligibility and a published parent.
const MESSAGE_ID = /^[A-Za-z0-9_-]{16,128}$/;
export const GROUP_QUOTE_CHANNELS = Object.freeze(new Set(["gilui-yomi", "torat-haremez"]));

export function giluiYomiQuotedParent(message, channel) {
  if (!GROUP_QUOTE_CHANNELS.has(channel) || !message || typeof message !== "object") return null;
  const nested = message.quotedMessage;
  const extended = message.extendedTextMessageData || message.extendedTextMessage;
  const ids = [nested?.stanzaId, extended?.stanzaId]
    .filter((id) => typeof id === "string" && id.length > 0);
  if (!ids.length || ids.some((id) => !MESSAGE_ID.test(id))) return null;
  if (new Set(ids).size > 1) return null; // Ambiguous conflicting provider identifiers
  const ownId = message.idMessage;
  if (typeof ownId !== "string" || !MESSAGE_ID.test(ownId) || ids[0] === ownId) return null;
  return ids[0];
}

export function giluiYomiQuotedText(message, channel) {
  if (!GROUP_QUOTE_CHANNELS.has(channel) || message?.typeMessage !== "quotedMessage") return "";
  const value = message?.extendedTextMessageData?.text ?? message?.extendedTextMessage?.text;
  return typeof value === "string" ? value : "";
}

// A reply in a group that may later join a Community thread (#1514, writer_material_home_law v7 §44.3, §48; ZURIEL 24.11.2026):
// it is ingested with its proof and its quoted-parent id, then kept off the public group-source reader (the intake marker
// group_source_intake_public is closed) until the Community admission step decides. Now gets one update per thread, never one
// per reply. A quotedMessage whose parent id is invalid is still a reply (fail closed).
export function groupReplyPendingAdmission(message, channel) {
  if (!GROUP_QUOTE_CHANNELS.has(channel) || !message || typeof message !== "object") return false;
  return message.typeMessage === "quotedMessage" || giluiYomiQuotedParent(message, channel) !== null;
}
