import { uploadResumableMedia } from "../mediaResumableUpload.js";
import { SUPABASE_ANON, SUPABASE_URL, supabase } from "../supabase.js";

export const LIFE_JOURNEY_HINT_IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/avif";
export const LIFE_JOURNEY_HINT_IMAGE_MAX_BYTES = 25 * 1024 * 1024;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_IMAGE_MIMES = new Set(LIFE_JOURNEY_HINT_IMAGE_ACCEPT.split(","));
const MEDIA_ENDPOINT = `${SUPABASE_URL}/functions/v1/media-upload-intent`;

function assertNotAborted(signal) {
  if (signal?.aborted) throw new DOMException("The operation was aborted", "AbortError");
}

function cleanUuid(value, errorCode) {
  const normalized = String(value || "").trim();
  if (!UUID_RE.test(normalized)) throw new Error(errorCode);
  return normalized;
}

export function validateLifeJourneyHintImage(file) {
  if (!file || typeof file.size !== "number") return { ok: false, error: "file_required" };
  if (!ALLOWED_IMAGE_MIMES.has(String(file.type || "").toLowerCase())) return { ok: false, error: "unsupported_mime" };
  if (!Number.isSafeInteger(file.size) || file.size <= 0 || file.size > LIFE_JOURNEY_HINT_IMAGE_MAX_BYTES) return { ok: false, error: "invalid_size" };
  if (!String(file.name || "").trim()) return { ok: false, error: "filename_required" };
  return { ok: true };
}

export function lifeJourneyHintMediaErrorMessage(error) {
  if (error?.name === "AbortError" || /aborted/i.test(String(error?.message || ""))) return "הפעולה בוטלה.";
  const message = String(error?.message || error || "");
  if (/principal_changed|auth_required|unauthorized/i.test(message)) return "החשבון השתנה או שהחיבור פג. התחברו מחדש ונסו שוב.";
  if (/unsupported_mime|extension_mismatch/i.test(message)) return "אפשר לצרף תמונת PNG, JPG, WEBP, GIF או AVIF בלבד.";
  if (/invalid_size/i.test(message)) return "התמונה חייבת להיות גדולה מאפס ועד 25MB.";
  if (/file_required|filename_required/i.test(message)) return "בחרו תמונה מהמכשיר.";
  if (/hint_media_owner_denied|hint_media_access_denied|hint_media_bind_denied|forbidden|denied/i.test(message)) return "אין הרשאה לצרף או לקרוא תמונה ברמז הזה.";
  if (/media_not_verified|verify|readback/i.test(message)) return "הקובץ הועלה אך לא עבר אימות. נסו שוב עם התמונה המקורית.";
  if (/cleanup_pending/i.test(message)) return "ההסרה עדיין ממתינה. אפשר לנסות שוב.";
  return "לא ניתן להשלים כרגע את פעולת התמונה הפרטית.";
}

async function sessionForPrincipal(client, expectedUserId, signal) {
  assertNotAborted(signal);
  const expected = cleanUuid(expectedUserId, "auth_required");
  const { data, error } = await client.auth.getSession();
  assertNotAborted(signal);
  const session = data?.session;
  if (error || !session?.access_token || session.user?.id !== expected) throw new Error("principal_changed");
  return session;
}

async function invokePrivateHintMedia(body, {
  expectedUserId,
  signal,
  client = supabase,
  endpoint = MEDIA_ENDPOINT,
  anonKey = SUPABASE_ANON,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!client?.auth?.getSession || typeof fetchImpl !== "function") throw new Error("auth_required");
  const session = await sessionForPrincipal(client, expectedUserId, signal);
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: anonKey,
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal,
  });
  const data = await response.json().catch(() => ({}));
  assertNotAborted(signal);
  await sessionForPrincipal(client, expectedUserId, signal);
  if (!response.ok) throw new Error(String(data?.error || `hint_media_http_${response.status}`));
  return data;
}

export async function attachLifeJourneyHintImage({
  hintId,
  file,
  expectedUserId,
  onProgress,
  onPhase,
  signal,
  client = supabase,
  endpoint = MEDIA_ENDPOINT,
  anonKey = SUPABASE_ANON,
  fetchImpl = globalThis.fetch,
} = {}) {
  const valid = validateLifeJourneyHintImage(file);
  if (!valid.ok) throw new Error(valid.error);
  const hint = cleanUuid(hintId, "hint_id_required");
  const options = { expectedUserId, signal, client, endpoint, anonKey, fetchImpl };

  onPhase?.("issuing");
  const intent = await invokePrivateHintMedia({
    action: "issue",
    owner_kind: "research_item_hint",
    hint_id: hint,
    kind: "image",
    mime: file.type,
    size: file.size,
    filename: file.name,
  }, options);
  if (intent?.ok !== true || !intent.upload_receipt || intent.hint_id !== hint) throw new Error("hint_media_issue_failed");

  await sessionForPrincipal(client, expectedUserId, signal);
  onPhase?.("uploading");
  await uploadResumableMedia(file, intent, { onProgress, signal, fetchImpl });
  await sessionForPrincipal(client, expectedUserId, signal);

  onPhase?.("verifying");
  const verified = await invokePrivateHintMedia({
    action: "verify_hint_media",
    hint_id: hint,
    upload_receipt: intent.upload_receipt,
  }, options);
  if (verified?.ok !== true || verified.verified !== true || !verified.binding_receipt) throw new Error("media_not_verified");

  onPhase?.("binding");
  const bound = await invokePrivateHintMedia({
    action: "bind_hint_media",
    hint_id: hint,
    binding_receipt: verified.binding_receipt,
  }, options);
  if (bound?.ok !== true || !UUID_RE.test(String(bound.storage_object_id || ""))) throw new Error("hint_media_bind_failed");
  onPhase?.("ready");
  return Object.freeze({
    hintId: hint,
    storageObjectId: bound.storage_object_id,
    kind: bound.kind || "image",
    role: bound.role || "evidence_image",
    visibility: "private",
    alreadyBound: Boolean(bound.already_bound),
  });
}

export async function readLifeJourneyHintImage({ hintId, storageObjectId, expectedUserId, signal, ...options } = {}) {
  const hint = cleanUuid(hintId, "hint_id_required");
  const objectId = cleanUuid(storageObjectId, "storage_object_id_required");
  const data = await invokePrivateHintMedia({
    action: "read_hint_media",
    hint_id: hint,
    storage_object_id: objectId,
  }, { expectedUserId, signal, ...options });
  if (data?.ok !== true || typeof data.signed_url !== "string" || !data.signed_url) throw new Error("hint_media_access_denied");
  return Object.freeze({
    hintId: hint,
    storageObjectId: objectId,
    signedUrl: data.signed_url,
    expiresInSeconds: Number(data.expires_in_seconds || 0),
    mime: data.mime || null,
    size: Number(data.size || 0),
  });
}

export async function detachLifeJourneyHintImage({ hintId, storageObjectId, expectedUserId, signal, ...options } = {}) {
  const hint = cleanUuid(hintId, "hint_id_required");
  const objectId = cleanUuid(storageObjectId, "storage_object_id_required");
  const data = await invokePrivateHintMedia({
    action: "detach_hint_media",
    hint_id: hint,
    storage_object_id: objectId,
  }, { expectedUserId, signal, ...options });
  if (data?.ok !== true && data?.cleanup_pending !== true) throw new Error("hint_media_detach_failed");
  return Object.freeze({
    ok: data.ok === true,
    cleanupPending: data.cleanup_pending === true,
    cleanupReceipt: typeof data.cleanup_receipt === "string" ? data.cleanup_receipt : null,
  });
}

export async function retryLifeJourneyHintImageCleanup({ cleanupReceipt, expectedUserId, signal, ...options } = {}) {
  if (!cleanupReceipt) throw new Error("cleanup_receipt_required");
  const data = await invokePrivateHintMedia({
    action: "retry_hint_media_cleanup",
    cleanup_receipt: cleanupReceipt,
  }, { expectedUserId, signal, ...options });
  if (data?.ok !== true && data?.cleanup_pending !== true) throw new Error("hint_media_cleanup_failed");
  return Object.freeze({
    ok: data.ok === true,
    cleanupPending: data.cleanup_pending === true,
    cleanupReceipt: data.cleanup_pending === true ? cleanupReceipt : null,
  });
}
