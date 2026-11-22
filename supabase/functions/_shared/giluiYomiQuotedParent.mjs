// Evidence-only quote pointer for the existing gilui-yomi group proof.
// Green API's quotedMessage / extendedTextMessageData stanzaId is a WhatsApp
// message ID. Do not infer a reply from author, text, timestamp, or proximity.
// This does NOT authorize publication; downstream readers must join source_id,
// group_chat_id, proof, author eligibility and a published parent.
const MESSAGE_ID = /^[A-Za-z0-9_-]{16,128}$/;

export function giluiYomiQuotedParent(message, channel) {
  if (channel !== "gilui-yomi" || !message || typeof message !== "object") return null;
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
  if (channel !== "gilui-yomi" || message?.typeMessage !== "quotedMessage") return "";
  const value = message?.extendedTextMessageData?.text ?? message?.extendedTextMessage?.text;
  return typeof value === "string" ? value : "";
}
