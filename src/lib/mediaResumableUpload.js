// SOD1820 2029 media resumable transport.
// Consumes a server-issued media-upload-intent. It owns transport only, not storage identity,
// contribution semantics, publication state, or Human-Gate decisions.

export const TUS_VERSION = "1.0.0";
export const TUS_CHUNK_SIZE = 6 * 1024 * 1024;

function toBase64Utf8(value) {
  const bytes = new TextEncoder().encode(String(value));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function encodeTusMetadata(metadata = {}) {
  return Object.entries(metadata)
    .filter(([, value]) => value !== undefined && value !== null && String(value) !== "")
    .map(([key, value]) => `${key} ${toBase64Utf8(value)}`)
    .join(",");
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function resumeOffset(uploadUrl, token, signal) {
  const r = await fetch(uploadUrl, {
    method: "HEAD",
    headers: { "Tus-Resumable": TUS_VERSION, "x-signature": token },
    signal,
  });
  if (!r.ok) throw new Error(`tus_head_${r.status}`);
  const offset = Number(r.headers.get("upload-offset") || "0");
  if (!Number.isSafeInteger(offset) || offset < 0) throw new Error("tus_bad_offset");
  return offset;
}

export async function uploadResumableMedia(file, intent, { onProgress, signal, retryDelays = [0, 1000, 3000, 5000, 10000] } = {}) {
  if (!file || typeof file.size !== "number") throw new Error("file_required");
  if (!intent?.tus?.endpoint || !intent?.signed_upload?.token) throw new Error("tus_intent_required");
  if (Number(intent.size) !== file.size) throw new Error("size_changed_after_intent");
  if (String(intent.mime || "") !== String(file.type || "")) throw new Error("mime_changed_after_intent");

  const token = intent.signed_upload.token;
  const metadata = encodeTusMetadata(intent.tus.metadata || {
    bucketName: intent.bucket,
    objectName: intent.path,
    contentType: intent.mime,
  });

  const created = await fetch(intent.tus.endpoint, {
    method: "POST",
    headers: {
      "Tus-Resumable": TUS_VERSION,
      "Upload-Length": String(file.size),
      "Upload-Metadata": metadata,
      "x-signature": token,
    },
    signal,
  });
  if (!created.ok) throw new Error(`tus_create_${created.status}`);
  const location = created.headers.get("location");
  if (!location) throw new Error("tus_missing_location");
  const uploadUrl = new URL(location, intent.tus.endpoint).toString();

  let offset = Number(created.headers.get("upload-offset") || "0");
  if (!Number.isSafeInteger(offset) || offset < 0) offset = 0;

  while (offset < file.size) {
    const end = Math.min(offset + (intent.tus.chunk_size || TUS_CHUNK_SIZE), file.size);
    const chunk = file.slice(offset, end);
    let patched = false;
    let lastError;

    for (const delay of retryDelays) {
      if (delay) await sleep(delay);
      try {
        const r = await fetch(uploadUrl, {
          method: "PATCH",
          headers: {
            "Tus-Resumable": TUS_VERSION,
            "Upload-Offset": String(offset),
            "Content-Type": "application/offset+octet-stream",
            "x-signature": token,
          },
          body: chunk,
          signal,
        });
        if (!r.ok) throw new Error(`tus_patch_${r.status}`);
        const next = Number(r.headers.get("upload-offset") || end);
        if (!Number.isSafeInteger(next) || next <= offset || next > file.size) throw new Error("tus_invalid_server_offset");
        offset = next;
        patched = true;
        onProgress?.({ bytesUploaded: offset, bytesTotal: file.size, percentage: (offset / file.size) * 100 });
        break;
      } catch (error) {
        lastError = error;
        try { offset = await resumeOffset(uploadUrl, token, signal); }
        catch { /* retry from known offset */ }
      }
    }
    if (!patched) throw lastError || new Error("tus_patch_failed");
  }

  return { ok: true, uploadUrl, bucket: intent.bucket, path: intent.path, size: file.size, mime: intent.mime };
}
