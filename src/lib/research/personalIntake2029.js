import { supabase, SUPABASE_URL } from "../supabase.js";
import { buildResearchIntakeTransport } from "./researchIntakeTransport.js";
import { uploadResumableMedia, verifyUploadedMedia } from "../mediaResumableUpload.js";

const ENDPOINT = `${SUPABASE_URL}/functions/v1/media-upload-intent`;

const clean = (value) => String(value ?? "").trim();

export const PERSONAL_INTAKE_KIND = Object.freeze({
  TEXT: "text",
  NUMBER: "number",
  DATE: "date",
  PERSON: "person",
  EVENT: "event",
  URL: "url",
  FILE: "file",
});

export function personalIntakeTitle(kind, value, file = null) {
  if (kind === PERSONAL_INTAKE_KIND.FILE) return file?.name || "קובץ אישי";
  const v = clean(value);
  if (kind === PERSONAL_INTAKE_KIND.NUMBER) return v ? `מספר · ${v}` : "מספר";
  if (kind === PERSONAL_INTAKE_KIND.DATE) return v ? `תאריך · ${v}` : "תאריך";
  if (kind === PERSONAL_INTAKE_KIND.PERSON) return v || "אדם";
  if (kind === PERSONAL_INTAKE_KIND.EVENT) return v || "אירוע";
  if (kind === PERSONAL_INTAKE_KIND.URL) return v || "קישור";
  return v.slice(0, 90) || "פריט אישי";
}

export function buildPersonalIntakeEntity({ kind, value = "", file = null, verifiedUpload = null, itemId = crypto.randomUUID(), surface = "my-workspace" } = {}) {
  const title = personalIntakeTitle(kind, value, file);
  const artifact = verifiedUpload?.storage_object_id ? {
    ref: `storage-object:${verifiedUpload.storage_object_id}`,
    kind: verifiedUpload.receipt?.kind || verifiedUpload.kind || "artifact",
    media_type: verifiedUpload.receipt?.mime || verifiedUpload.actual?.mime || file?.type || null,
    availability: "private",
    replayable: true,
    access: { tier: "personal" },
  } : null;
  const transport = buildResearchIntakeTransport({
    rawInput: kind === PERSONAL_INTAKE_KIND.FILE ? (file?.name || title) : value,
    rawKind: kind,
    rawRef: `personal-input:${itemId}`,
    sourceArtifact: artifact,
    temporal: kind === PERSONAL_INTAKE_KIND.DATE ? { input_time: clean(value), access: { tier: "personal" } } : null,
    origin: { channel: "web", surface },
    persistence: { mode: "workspace_library", persisted_ref: itemId },
    accessTier: "personal",
  });
  const entity = {
    id: itemId,
    ref: itemId,
    type: "personal_intake",
    title,
    link: null,
    intake_kind: kind,
    intake: transport,
    privacy: "personal",
    artifact: verifiedUpload?.storage_object_id ? {
      storage_object_id: verifiedUpload.storage_object_id,
      kind: verifiedUpload.receipt?.kind || verifiedUpload.kind || null,
      mime: verifiedUpload.receipt?.mime || verifiedUpload.actual?.mime || file?.type || null,
      size: Number(verifiedUpload.receipt?.size || verifiedUpload.actual?.size || file?.size || 0),
      verification: verifiedUpload.receipt?.verification || null,
    } : null,
    created_at_client: new Date().toISOString(),
  };
  return entity;
}

async function accessToken() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error("authentication_required");
  return token;
}

async function post(body, signal) {
  const token = await accessToken();
  const r = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    signal,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d?.ok === false) throw new Error(d?.error || `media_intent_${r.status}`);
  return { token, data: d };
}

function fileKind(file) {
  const mime = clean(file?.type).toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "document";
}

export async function uploadPersonalIntakeFile(file, { onProgress, signal } = {}) {
  if (!file) throw new Error("file_required");
  const kind = fileKind(file);
  const issued = await post({
    action: "issue",
    scope: "personal",
    kind,
    mime: file.type,
    size: file.size,
    filename: file.name,
  }, signal);
  await uploadResumableMedia(file, issued.data, { onProgress, signal });
  const verified = await verifyUploadedMedia(issued.data, {
    endpoint: ENDPOINT,
    accessToken: issued.token,
    signal,
  });
  if (!verified.storage_object_id) throw new Error("verified_object_identity_missing");
  return { ...verified, kind };
}

export async function readPersonalIntakeMedia(item, { signal } = {}) {
  const storageId = item?.artifact?.storage_object_id;
  if (!item?.id || !storageId) throw new Error("personal_media_reference_required");
  return (await post({
    action: "read_personal_media",
    item_id: item.id,
    storage_object_id: storageId,
  }, signal)).data;
}

export async function deletePersonalIntakeMedia(item, { signal } = {}) {
  const storageId = item?.artifact?.storage_object_id;
  if (!item?.id || !storageId) return { ok: true, deleted: false };
  return (await post({
    action: "delete_personal_media",
    item_id: item.id,
    storage_object_id: storageId,
  }, signal)).data;
}


export async function discardVerifiedPersonalUpload(verifiedUpload, { signal } = {}) {
  const path = verifiedUpload?.receipt?.path || verifiedUpload?.path;
  if (!path) return { ok: true, deleted: false };
  return (await post({
    action: "delete_verified_upload",
    scope: "personal",
    path,
  }, signal)).data;
}


export async function cleanupAllPersonalIntakeMedia({ signal } = {}) {
  return (await post({ action: "cleanup_personal_media" }, signal)).data;
}
