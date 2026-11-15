// Group images and videos on the Zvi / «תורת הרמז» path (ZURIEL 11.11.2026): a public source group's image or video becomes public
// under the same gates as its text — a verified writer (sender id -> one contributor phone / verified WhatsApp link), an approved writer
// (four-writer list + editorial flag), no hold — with a PUBLIC COPY of the media and a redacted caption.
// Shared by wa-channel-ingest (Deno) and its Node tests. Nothing here decides identity or approval: the server does
// (record_channel_update_group_media_proof_v1 -> group_source_media_publishable_v1, re-checked by record_group_source_public_media_v1
// and by the public reader). This file only routes a message onto that path and performs the one public write the server allowed.
import { waPublicMediaPath, waStableAssetId, waUploadAlreadyExists } from "./waMediaAsset.js";

// Only a plain image or video message. A reply/quote with an attached file, a document, a sticker and audio never take this path.
export const WA_GROUP_MEDIA_TYPES = Object.freeze({ imageMessage: "image", videoMessage: "video" });
const PRIVATE_REF = /^storage-object:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// The private original of a research-first channel is stored as an opaque Storage object id (submission-inbox), never a URL.
export const waIsPrivateMediaRef = (value) => PRIVATE_REF.test(String(value || ""));

// groupSource: an incoming message of a public source group — the only messages that may get a group proof.
// groupMedia: such a message that is a plain image or video of the kind the bytes were checked for.
export function waGroupMessageRoute({ worldGroup = false, outgoing = false, chatId = "", typeMessage = "", mediaKind = null } = {}) {
  const groupSource = worldGroup === true && outgoing !== true && String(chatId || "").endsWith("@g.us");
  const type = String(typeMessage || "");
  const kind = Object.hasOwn(WA_GROUP_MEDIA_TYPES, type) ? WA_GROUP_MEDIA_TYPES[type] : null;
  const groupMedia = groupSource && kind !== null && kind === mediaKind;
  return Object.freeze({ groupSource, groupMedia, kind: groupMedia ? kind : null });
}

// The intake marker of channel_updates: a group message without media (text, as before), or a group image/video whose PRIVATE original
// was stored. A media message whose bytes failed, audio, outgoing and non-group messages never carry it.
export function waGroupIntakePublic(route, imageUrl) {
  if (!route?.groupSource) return false;
  if (!imageUrl) return true;
  return route.groupMedia === true && waIsPrivateMediaRef(imageUrl);
}

// Proof first; the public copy only when the server answered publishable = true; then the record, which re-checks the rule, the exact path,
// the type and the size against the private original. Every failure leaves the message private and is traced (no sender id in traces).
// media: { buf: Uint8Array, ct: string, ext: string } — the same bytes that were stored privately (or re-read for a reviewed backfill).
export async function waProveAndPublishGroupMedia({ sb, trace, bucket, updateId, source, msgId, chatId, senderId, typeMessage, kind, sourceTs, media }) {
  const note = (step, extra = {}) => trace.push({ msgId, step, channel: source?.channel, ...extra });
  try {
    if (!updateId || !media?.buf || (kind !== "image" && kind !== "video")) { note("group-media-skip", { reason: "invalid_arguments" }); return { published: false }; }
    const pr = await sb.rpc("record_channel_update_group_media_proof_v1", {
      p_update_id: updateId, p_source_id: source?.id, p_ext_msg_id: msgId, p_group_chat_id: chatId,
      p_sender_jid: senderId, p_incoming: true, p_type_message: typeMessage,
    });
    if (pr.error || pr.data?.ok !== true) { note("group-media-proof-skip", { reason: String(pr.error?.message || pr.data?.error || "unknown") }); return { published: false }; }
    if (pr.data?.publishable !== true) { note("group-media-private", { basis: String(pr.data?.identity_basis || "") }); return { published: false }; }
    const assetId = await waStableAssetId(source.channel, msgId);
    const path = waPublicMediaPath(kind, assetId, sourceTs, media.ext);
    const up = await sb.storage.from(bucket).upload(path, media.buf, { contentType: media.ct, upsert: false });
    if (up.error && !waUploadAlreadyExists(up.error)) { note("group-media-upload-fail", { error: String(up.error.message || up.error) }); return { published: false }; }
    const rec = await sb.rpc("record_group_source_public_media_v1", { p_update_id: updateId, p_object_path: path });
    if (rec.error || rec.data?.ok !== true) { note("group-media-record-skip", { reason: String(rec.error?.message || rec.data?.error || "unknown") }); return { published: false }; }
    note("group-media-public", { kind, assetId });
    return { published: true, path };
  } catch (e) {
    note("group-media-throw", { error: String(e?.message || e) });
    return { published: false };
  }
}
