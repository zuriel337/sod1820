// WhatsApp channel media → the existing 2029 public media identity (docs/sod1820-media-ingress-storage-convention-v1.md):
//   media/sod1820/2029/<kind>/YYYY/MM/<asset-id>/original.<ext>
// Shared by wa-channel-ingest (Deno) and its Node tests. No new store, no new table: the asset id lives in the path, the
// message identity stays in channel_updates.ext_msg_id, and one is derived from the other (UUID v5 over channel + message id),
// so a repeated, recovered or concurrent run maps the same message to the same object and never writes a second copy.

export const WA_MEDIA_MAX_BYTES = 45 * 1024 * 1024;

// Green API message types that may carry a binary we keep. Stickers, documents and contacts stay out.
export function waMessageMediaKind(typeMessage, mimeType) {
  const type = String(typeMessage || ""), mime = String(mimeType || "").toLowerCase();
  if (type === "imageMessage") return "image";
  if (type === "videoMessage") return "video";
  if (type === "audioMessage") return "audio";
  // quotedMessage / extendedTextMessage with an attached file keep the existing mime-based rule (images/videos), plus audio.
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return null;
}

const ascii = (bytes, offset, length) => String.fromCharCode(...bytes.subarray(offset, offset + length));

// The content type is decided from the bytes themselves and must belong to the declared kind; a provider header or an
// error page can never turn into a public object of another type. Returns null for anything outside the allowlist.
export function waSniffMedia(bytes, kind) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 12) return null;
  const ftyp = ascii(bytes, 4, 4) === "ftyp", brand = ftyp ? ascii(bytes, 8, 4) : "";
  if (kind === "image") {
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { contentType: "image/jpeg", ext: "jpg" };
    if (ascii(bytes, 0, 8) === "\x89PNG\r\n\x1a\n") return { contentType: "image/png", ext: "png" };
    if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return { contentType: "image/webp", ext: "webp" };
    return null;
  }
  if (kind === "video") {
    if (ftyp && !/^M4[AB] $/.test(brand)) return { contentType: "video/mp4", ext: "mp4" };
    if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return { contentType: "video/webm", ext: "webm" };
    return null;
  }
  if (kind === "audio") {
    if (ascii(bytes, 0, 4) === "OggS") return { contentType: "audio/ogg", ext: "ogg" };          // WhatsApp voice notes (Opus)
    if (ascii(bytes, 0, 3) === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe6) === 0xe2)) return { contentType: "audio/mpeg", ext: "mp3" };
    if (bytes[0] === 0xff && (bytes[1] & 0xf6) === 0xf0) return { contentType: "audio/aac", ext: "aac" };
    if (ftyp) return { contentType: "audio/mp4", ext: "m4a" };
    if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WAVE") return { contentType: "audio/wav", ext: "wav" };
    return null;
  }
  return null;
}

// UUID v5 (RFC 9562) in a fixed project namespace over "<channel>:<message id>": stable, opaque, not guessable from titles.
const NAMESPACE = "6f0c2f4e-1b1d-5b8a-9c3e-2029a5e7d1c0";
export async function waStableAssetId(channel, messageId) {
  const ns = NAMESPACE.replace(/-/g, "").match(/../g).map(hex => parseInt(hex, 16));
  const name = new TextEncoder().encode(`wa-channel:${String(channel)}:${String(messageId)}`);
  const input = new Uint8Array(ns.length + name.length); input.set(ns); input.set(name, ns.length);
  const hash = new Uint8Array(await globalThis.crypto.subtle.digest("SHA-1", input)).slice(0, 16);
  hash[6] = (hash[6] & 0x0f) | 0x50; hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = [...hash].map(byte => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function waPublicMediaPath(kind, assetId, sourceTs, ext) {
  if (!["image", "video", "audio"].includes(kind) || !/^[0-9a-f-]{36}$/.test(assetId) || !/^[a-z0-9]{2,4}$/.test(ext)) throw new Error("invalid_media_path");
  const d = new Date(Number(sourceTs) * 1000);
  return `sod1820/2029/${kind}/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${assetId}/original.${ext}`;
}

// Storage answers 409 / "already exists" when the deterministic object was written by an earlier run: same message, same bytes.
export function waUploadAlreadyExists(error) {
  if (!error) return false;
  return String(error.statusCode || error.status || "") === "409" || /already exists|duplicate/i.test(String(error.message || error.error || error));
}
