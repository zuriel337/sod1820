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
