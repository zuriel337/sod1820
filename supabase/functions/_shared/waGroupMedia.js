// Group images and videos on the Zvi / «תורת הרמז» path (ZURIEL 11.11.2026): a public source group's image or video becomes public
// under the same gates as its text — a verified writer (sender id -> one contributor phone / verified WhatsApp link), an approved writer
// (four-writer list + editorial flag), no hold — with a PUBLIC COPY of the media and a redacted caption.
// Shared by wa-channel-ingest (Deno) and its Node tests. Nothing here decides identity or approval: the server does
// (record_channel_update_group_media_proof_v1 -> group_source_media_publishable_v1, re-checked by record_group_source_public_media_v1
// and by the public reader). This file only routes a message onto that path and performs the one public write the server allowed.
import { WA_MEDIA_MAX_BYTES, waPublicMediaPath, waSniffMedia, waStableAssetId, waUploadAlreadyExists } from "./waMediaAsset.js";

// Only a plain image or video message. A reply/quote with an attached file, a document, a sticker and audio never take this path.
export const WA_GROUP_MEDIA_TYPES = Object.freeze({ imageMessage: "image", videoMessage: "video" });
const PRIVATE_REF = /^storage-object:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Explicit verified recovery only: old messages can fall outside getChatHistory's
// bounded window. An exact provider envelope supplements that window; it does not
// prove ownership or publication. The existing database/source/media gates still run.
export async function waRecoverMissingGroupMessages({ rows, chatId, targetIds, verifiedRecovery, fetchMessage }) {
  if (!verifiedRecovery || !String(chatId || "").endsWith("@g.us") || !targetIds.length) return rows;
  const recovered = [...rows];
  const present = new Set(rows.map(row => String(row?.idMessage || "")));
  for (const id of [...new Set(targetIds)].slice(0, 50)) {
    if (!id || present.has(id)) continue;
    let response;
    try { response = await fetchMessage({ chatId, idMessage: id }); } catch { continue; }
    const message = response?.result;
    if (response?.http_status !== 200 || !message || Array.isArray(message)
      || message.idMessage !== id || message.chatId !== chatId || message.type !== "incoming"
      || message.isDeleted || message.deletedMessageId || message.isEdited || message.editedMessageId
      || typeof message.senderId !== "string" || !message.senderId
      || !Number.isFinite(message.timestamp) || message.timestamp <= 0) continue;
    recovered.push(message);
    present.add(id);
  }
  return recovered;
}

// The private original of a research-first channel is stored as an opaque Storage object id (submission-inbox), never a URL.
export const waIsPrivateMediaRef = (value) => PRIVATE_REF.test(String(value || ""));

// groupSource: an incoming message of a public source group — the only messages that may get a group proof.
// groupMedia: such a message that is a plain image or video of the kind the bytes were checked for.
/** @param {{worldGroup?: boolean, outgoing?: boolean, chatId?: string, typeMessage?: string, mediaKind?: string|null}} input */
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

const mime = value => String(value || "").split(";")[0].trim().toLowerCase();
const sha256 = async bytes => [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
  .map(byte => byte.toString(16).padStart(2, "0")).join("");

// Reviewed recovery reads the exact opaque object already bound to this source.
// Credentials stay in the existing Edge runtime; receipts contain no signed URL.
export async function waReadPrivateGroupMedia({ sb, updateId, objectRef, kind }) {
  if (!waIsPrivateMediaRef(objectRef)) throw new Error("invalid_private_ref");
  const resolved = await sb.rpc("private_channel_media_access", {
    p_channel_update_id: updateId, p_storage_object_id: objectRef.slice("storage-object:".length),
  });
  const original = resolved.data;
  if (resolved.error || !original?.ok || original.bucket !== "submission-inbox"
    || !(original.size > 0 && original.size <= WA_MEDIA_MAX_BYTES)) throw new Error("private_source_unavailable");
  const read = await sb.storage.from(original.bucket).download(original.path);
  if (read.error || !read.data || read.data.size !== original.size) throw new Error("private_source_size_mismatch");
  const buf = new Uint8Array(await read.data.arrayBuffer());
  const sniffed = waSniffMedia(buf, kind);
  if (!sniffed || mime(original.mime) !== sniffed.contentType || mime(read.data.type) !== sniffed.contentType)
    throw new Error("private_source_mime_mismatch");
  return { buf, ct: sniffed.contentType, ext: sniffed.ext, sha256: await sha256(buf) };
}

export async function waInspectPublicGroupMedia({ sb, bucket, path, media }) {
  const read = await sb.storage.from(bucket).download(path);
  if (read.error) {
    if (String(read.error.status || read.error.statusCode) === "404" || /object not found/i.test(read.error.message || ""))
      return { exists: false, verified: false };
    throw new Error("public_copy_read_failed");
  }
  if (!read.data || read.data.size !== media.buf.byteLength || mime(read.data.type) !== mime(media.ct))
    throw new Error("public_copy_size_or_mime_mismatch");
  const digest = await sha256(new Uint8Array(await read.data.arrayBuffer()));
  const sourceDigest = await sha256(media.buf);
  if (digest !== sourceDigest) throw new Error("public_copy_sha256_mismatch");
  return { exists: true, verified: true, mime: mime(media.ct), size: media.buf.byteLength, sha256: digest };
}

// Proof first; the public copy only when the server answered publishable = true; then the record, which re-checks the rule, the exact path,
// the type and the size against the private original. Every failure leaves the message private and is traced (no sender id in traces).
// media: { buf: Uint8Array, ct: string, ext: string } — the same bytes that were stored privately (or re-read for a reviewed backfill).
export async function waProveAndPublishGroupMedia({ sb, trace, bucket, updateId, source, msgId, chatId, senderId, typeMessage, kind, sourceTs, media, verifyCopy = false }) {
  const note = (step, extra = {}) => trace.push({ msgId, step, channel: source?.channel, ...extra });
  try {
    if (!updateId || !media?.buf || (kind !== "image" && kind !== "video")) { note("group-media-skip", { reason: "invalid_arguments" }); return { published: false }; }
    const assetId = await waStableAssetId(source.channel, msgId);
    const path = waPublicMediaPath(kind, assetId, sourceTs, media.ext);
    const existing = verifyCopy ? await waInspectPublicGroupMedia({ sb, bucket, path, media }) : null;
    const pr = await sb.rpc("record_channel_update_group_media_proof_v1", {
      p_update_id: updateId, p_source_id: source?.id, p_ext_msg_id: msgId, p_group_chat_id: chatId,
      p_sender_jid: senderId, p_incoming: true, p_type_message: typeMessage,
    });
    if (pr.error || pr.data?.ok !== true) { note("group-media-proof-skip", { reason: String(pr.error?.message || pr.data?.error || "unknown") }); return { published: false }; }
    if (pr.data?.publishable !== true) { note("group-media-private", { basis: String(pr.data?.identity_basis || "") }); return { published: false }; }
    const up = existing?.verified ? { error: null } : await sb.storage.from(bucket).upload(path, media.buf, { contentType: media.ct, upsert: false });
    if (up.error && !waUploadAlreadyExists(up.error)) { note("group-media-upload-fail", { error: String(up.error.message || up.error) }); return { published: false }; }
    const receipt = verifyCopy ? await waInspectPublicGroupMedia({ sb, bucket, path, media }) : null;
    if (verifyCopy && !receipt?.verified) throw new Error("public_copy_readback_missing");
    const rec = await sb.rpc("record_group_source_public_media_v1", { p_update_id: updateId, p_object_path: path });
    if (rec.error || rec.data?.ok !== true) { note("group-media-record-skip", { reason: String(rec.error?.message || rec.data?.error || "unknown") }); return { published: false }; }
    note("group-media-public", { kind, assetId, ...(receipt ? { receipt, reused: existing?.verified === true } : {}) });
    return { published: true, path, ...(receipt ? { receipt } : {}) };
  } catch (e) {
    note("group-media-throw", { error: String(e?.message || e) });
    return { published: false };
  }
}
