export const SIX_MIB = 6 * 1024 * 1024;

export const MIME_POLICY = Object.freeze({
  image: Object.freeze({ maxBytes: 25 * 1024 * 1024, mimeToExt: Object.freeze({
    "image/png": ["png"], "image/jpeg": ["jpg", "jpeg"], "image/webp": ["webp"], "image/gif": ["gif"], "image/avif": ["avif"],
  }) }),
  video: Object.freeze({ maxBytes: 2 * 1024 * 1024 * 1024, mimeToExt: Object.freeze({
    "video/mp4": ["mp4"], "video/webm": ["webm"], "video/quicktime": ["mov"],
  }) }),
  audio: Object.freeze({ maxBytes: 500 * 1024 * 1024, mimeToExt: Object.freeze({
    "audio/mpeg": ["mp3"], "audio/mp4": ["m4a", "mp4"], "audio/x-m4a": ["m4a"], "audio/wav": ["wav"], "audio/webm": ["webm"], "audio/ogg": ["ogg"],
  }) }),
  document: Object.freeze({ maxBytes: 250 * 1024 * 1024, mimeToExt: Object.freeze({
    "application/pdf": ["pdf"], "application/msword": ["doc"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"], "text/plain": ["txt"],
  }) }),
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HINT_OWNER_KIND = "research_item_hint";
const HINT_MEDIA_ROLE = "evidence_image";
const PRIVATE_BUCKET = "submission-inbox";
const RECEIPT_TTL_SECONDS = 7200;
export function isUuid(value) { return UUID_RE.test(String(value || "")); }
export function normalizeMime(value) { return String(value || "").split(";")[0].trim().toLowerCase(); }
function extensionOf(filename) { const m = String(filename || "").trim().match(/\.([A-Za-z0-9]{1,8})$/); return m ? m[1].toLowerCase() : ""; }

export function validateDeclaredFile({ kind, mime, size, filename }) {
  const policy = MIME_POLICY[kind];
  if (!policy) throw new Error("unsupported_kind");
  const cleanMime = normalizeMime(mime);
  const allowedExts = policy.mimeToExt[cleanMime];
  if (!allowedExts) throw new Error("unsupported_mime");
  const bytes = Number(size);
  if (!Number.isSafeInteger(bytes) || bytes <= 0 || bytes > policy.maxBytes) throw new Error("invalid_size");
  const ext = extensionOf(filename);
  if (!ext || !allowedExts.includes(ext)) throw new Error("extension_mismatch");
  return { kind, mime: cleanMime, size: bytes, ext, maxBytes: policy.maxBytes };
}

function yyyymm(now) { return { yyyy: String(now.getUTCFullYear()), mm: String(now.getUTCMonth() + 1).padStart(2, "0") }; }

export function buildUploadIntent({ scope, kind, mime, size, filename, userId, contributorId = null, isAdmin = false, now = new Date(), idFactory = crypto.randomUUID }) {
  const file = validateDeclaredFile({ kind, mime, size, filename });
  const { yyyy, mm } = yyyymm(now);
  if (!isUuid(userId)) throw new Error("auth_required");
  if (scope === "public") {
    if (!isAdmin) throw new Error("admin_required");
    const assetId = idFactory();
    if (!isUuid(assetId)) throw new Error("invalid_asset_id");
    return { scope, bucket: "media", path: `sod1820/2029/${kind}/${yyyy}/${mm}/${assetId}/original.${file.ext}`, assetId, submissionId: null, transport: "tus", ...file };
  }
  if (scope === "submission") {
    const submissionId = idFactory();
    if (!isUuid(submissionId)) throw new Error("invalid_submission_id");
    const ownerRoot = contributorId ? (() => { if (!isUuid(contributorId)) throw new Error("invalid_contributor_id"); return `contributors/${contributorId}`; })() : `accounts/${userId}`;
    return { scope, bucket: "submission-inbox", path: `sod1820/2029/${ownerRoot}/${yyyy}/${mm}/${submissionId}/${kind}/original.${file.ext}`, assetId: null, submissionId, transport: "tus", ...file };
  }
  throw new Error("unsupported_scope");
}

export function mayVerifyPath({ scope, path, userId, contributorId = null, isAdmin = false }) {
  const p = String(path || "");
  if (scope === "public") return isAdmin && p.startsWith("sod1820/2029/");
  if (scope !== "submission" || !isUuid(userId)) return false;
  if (contributorId && isUuid(contributorId) && p.startsWith(`sod1820/2029/contributors/${contributorId}/`)) return true;
  return p.startsWith(`sod1820/2029/accounts/${userId}/`);
}

// Objects larger than this are never re-hashed server-side (multi-GB video stays bounded);
// they verify on size + mime and the receipt records sha256_verified:false.
export const VERIFY_HASH_MAX_BYTES = 32 * 1024 * 1024;
const SHA256_RE = /^[0-9a-f]{64}$/;

export function normalizeSha256(value) {
  const v = String(value || "").trim().toLowerCase();
  return SHA256_RE.test(v) ? v : "";
}

// Pure completion decision. TUS/Storage transport success is never an input: only the owner-readable
// read-back (actual) compared with the declared intent (expected) can produce a verified receipt.
export function evaluateReadBack({ scope, bucket, path, expected, actual }) {
  const checks = {
    size_match: Number.isSafeInteger(actual?.size) && actual.size === expected.size,
    mime_match: !!actual?.mime && actual.mime === expected.mime,
  };
  const hashRequested = !!expected.sha256;
  const hashChecked = hashRequested && typeof actual?.sha256 === "string";
  if (hashChecked) checks.sha256_match = actual.sha256 === expected.sha256;
  const ok = Object.values(checks).every(Boolean);
  const out = { ok, verified: ok, action: "verify", scope, bucket, path, expected, actual, checks };
  if (ok) {
    out.artifact_pointer = `${bucket}/${path}`;
    out.receipt = {
      kind: "media_upload_verified_receipt", scope, bucket, path, size: actual.size, mime: actual.mime,
      sha256: hashChecked ? actual.sha256 : null, sha256_verified: hashChecked,
      verification: hashChecked ? "readback_sha256_size_mime" : "readback_size_mime",
    };
  }
  return out;
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function hmac(payload, secret) {
  if (!secret) throw new Error("receipt_secret_required");
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

export function buildHintMediaIntent({ hintId, userId, mime, size, filename, now = new Date(), idFactory = crypto.randomUUID }) {
  if (!isUuid(hintId)) throw new Error("hint_id_required");
  const intent = buildUploadIntent({
    scope: "submission",
    kind: "image",
    mime,
    size,
    filename,
    userId,
    contributorId: null,
    now,
    idFactory,
  });
  return { ...intent, ownerKind: HINT_OWNER_KIND, ownerId: hintId, role: HINT_MEDIA_ROLE };
}

export function makeHintMediaReceiptPayload({ phase, userId, hintId, path, submissionId, mime, size, storageObjectId = null, cleanupMode = null, now = new Date(), ttlSeconds = RECEIPT_TTL_SECONDS }) {
  if (!['issued', 'verified', 'cleanup'].includes(phase)) throw new Error("invalid_receipt_phase");
  if (!isUuid(userId) || !isUuid(hintId) || !isUuid(submissionId)) throw new Error("invalid_receipt_identity");
  if (storageObjectId !== null && !isUuid(storageObjectId)) throw new Error("invalid_storage_object_id");
  if (phase === "cleanup" && !['detach', 'delete'].includes(cleanupMode)) throw new Error("invalid_cleanup_mode");
  if (phase !== "cleanup" && cleanupMode !== null) throw new Error("invalid_cleanup_mode");
  const issuedAt = Math.floor(now.getTime() / 1000);
  const ttl = Number(ttlSeconds);
  if (!Number.isSafeInteger(ttl) || ttl <= 0 || ttl > RECEIPT_TTL_SECONDS) throw new Error("invalid_receipt_ttl");
  const expectedPrefix = `sod1820/2029/accounts/${userId}/`;
  if (!String(path || "").startsWith(expectedPrefix)) throw new Error("receipt_path_forbidden");
  const cleanMime = normalizeMime(mime);
  const bytes = Number(size);
  if (!MIME_POLICY.image.mimeToExt[cleanMime]) throw new Error("unsupported_mime");
  if (!Number.isSafeInteger(bytes) || bytes <= 0 || bytes > MIME_POLICY.image.maxBytes) throw new Error("invalid_size");
  return {
    v: 1,
    phase,
    owner_kind: HINT_OWNER_KIND,
    user_id: userId,
    hint_id: hintId,
    bucket: PRIVATE_BUCKET,
    path: String(path),
    submission_id: submissionId,
    kind: "image",
    role: HINT_MEDIA_ROLE,
    visibility: "private",
    mime: cleanMime,
    size: bytes,
    storage_object_id: storageObjectId,
    cleanup_mode: cleanupMode,
    iat: issuedAt,
    exp: issuedAt + ttl,
  };
}

export async function signHintMediaReceipt(payload, secret) {
  const encoded = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = bytesToBase64Url(await hmac(`v1.${encoded}`, secret));
  return `v1.${encoded}.${signature}`;
}

export async function verifyHintMediaReceipt(token, secret, { phase, userId, hintId = null, now = new Date() } = {}) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3 || parts[0] !== "v1") throw new Error("invalid_receipt");
  let supplied;
  let expected;
  let payload;
  try {
    supplied = base64UrlToBytes(parts[2]);
    expected = await hmac(`v1.${parts[1]}`, secret);
    payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[1])));
  } catch {
    throw new Error("invalid_receipt");
  }
  if (!constantTimeEqual(supplied, expected)) throw new Error("invalid_receipt_signature");
  const nowSeconds = Math.floor(now.getTime() / 1000);
  if (payload?.v !== 1 || payload?.owner_kind !== HINT_OWNER_KIND || payload?.bucket !== PRIVATE_BUCKET) throw new Error("invalid_receipt_scope");
  if (phase && payload.phase !== phase) throw new Error("invalid_receipt_phase");
  if (!isUuid(userId) || payload.user_id !== userId) throw new Error("receipt_owner_mismatch");
  if (hintId && payload.hint_id !== hintId) throw new Error("receipt_hint_mismatch");
  if (!isUuid(payload.hint_id) || !isUuid(payload.submission_id)) throw new Error("invalid_receipt_identity");
  if (payload.storage_object_id !== null && !isUuid(payload.storage_object_id)) throw new Error("invalid_storage_object_id");
  if (payload.phase === "cleanup" && !['detach', 'delete'].includes(payload.cleanup_mode)) throw new Error("invalid_cleanup_mode");
  if (payload.phase !== "cleanup" && payload.cleanup_mode !== null) throw new Error("invalid_cleanup_mode");
  if (!Number.isSafeInteger(payload.iat) || !Number.isSafeInteger(payload.exp) || payload.exp <= nowSeconds || payload.iat > nowSeconds + 60 || payload.exp - payload.iat > RECEIPT_TTL_SECONDS) throw new Error("receipt_expired");
  if (!String(payload.path || "").startsWith(`sod1820/2029/accounts/${userId}/`)) throw new Error("receipt_path_forbidden");
  if (payload.kind !== "image" || payload.role !== HINT_MEDIA_ROLE || payload.visibility !== "private") throw new Error("invalid_receipt_semantics");
  if (!MIME_POLICY.image.mimeToExt[normalizeMime(payload.mime)]) throw new Error("unsupported_mime");
  if (!Number.isSafeInteger(payload.size) || payload.size <= 0 || payload.size > MIME_POLICY.image.maxBytes) throw new Error("invalid_size");
  return payload;
}

export const HINT_MEDIA_CONTRACT = Object.freeze({
  ownerKind: HINT_OWNER_KIND,
  role: HINT_MEDIA_ROLE,
  bucket: PRIVATE_BUCKET,
  receiptTtlSeconds: RECEIPT_TTL_SECONDS,
  signedReadTtlSeconds: 60,
});
