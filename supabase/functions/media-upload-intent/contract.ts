export const SIX_MIB = 6 * 1024 * 1024;

export const MIME_POLICY = Object.freeze({
  image: Object.freeze({
    maxBytes: 25 * 1024 * 1024,
    mimeToExt: Object.freeze({
      "image/png": ["png"],
      "image/jpeg": ["jpg", "jpeg"],
      "image/webp": ["webp"],
      "image/gif": ["gif"],
      "image/avif": ["avif"],
    }),
  }),
  video: Object.freeze({
    maxBytes: 2 * 1024 * 1024 * 1024,
    mimeToExt: Object.freeze({
      "video/mp4": ["mp4"],
      "video/webm": ["webm"],
      "video/quicktime": ["mov"],
    }),
  }),
  audio: Object.freeze({
    maxBytes: 500 * 1024 * 1024,
    mimeToExt: Object.freeze({
      "audio/mpeg": ["mp3"],
      "audio/mp4": ["m4a", "mp4"],
      "audio/x-m4a": ["m4a"],
      "audio/wav": ["wav"],
      "audio/webm": ["webm"],
      "audio/ogg": ["ogg"],
    }),
  }),
  document: Object.freeze({
    maxBytes: 250 * 1024 * 1024,
    mimeToExt: Object.freeze({
      "application/pdf": ["pdf"],
      "application/msword": ["doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
      "text/plain": ["txt"],
    }),
  }),
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): boolean {
  return UUID_RE.test(String(value || ""));
}

export function normalizeMime(value: unknown): string {
  return String(value || "").split(";")[0].trim().toLowerCase();
}

function extensionOf(filename: unknown): string {
  const name = String(filename || "").trim();
  const match = name.match(/\.([A-Za-z0-9]{1,8})$/);
  return match ? match[1].toLowerCase() : "";
}

export function validateDeclaredFile({ kind, mime, size, filename }: any) {
  const policy: any = (MIME_POLICY as any)[kind];
  if (!policy) throw new Error("unsupported_kind");
  const cleanMime = normalizeMime(mime);
  const allowedExts: string[] | undefined = policy.mimeToExt[cleanMime];
  if (!allowedExts) throw new Error("unsupported_mime");
  const bytes = Number(size);
  if (!Number.isSafeInteger(bytes) || bytes <= 0 || bytes > policy.maxBytes) throw new Error("invalid_size");
  const ext = extensionOf(filename);
  if (!ext || !allowedExts.includes(ext)) throw new Error("extension_mismatch");
  return { kind, mime: cleanMime, size: bytes, ext, maxBytes: policy.maxBytes };
}

function yyyymm(now: Date) {
  return {
    yyyy: String(now.getUTCFullYear()),
    mm: String(now.getUTCMonth() + 1).padStart(2, "0"),
  };
}

export function buildUploadIntent({
  scope,
  kind,
  mime,
  size,
  filename,
  userId,
  contributorId = null,
  isAdmin = false,
  now = new Date(),
  idFactory = crypto.randomUUID,
}: any) {
  const file = validateDeclaredFile({ kind, mime, size, filename });
  const { yyyy, mm } = yyyymm(now);
  if (!isUuid(userId)) throw new Error("auth_required");

  if (scope === "public") {
    if (!isAdmin) throw new Error("admin_required");
    const assetId = idFactory();
    if (!isUuid(assetId)) throw new Error("invalid_asset_id");
    return {
      scope,
      bucket: "media",
      path: `sod1820/2029/${kind}/${yyyy}/${mm}/${assetId}/original.${file.ext}`,
      assetId,
      submissionId: null,
      transport: file.size > SIX_MIB ? "tus" : "signed",
      ...file,
    };
  }

  if (scope === "submission") {
    const submissionId = idFactory();
    if (!isUuid(submissionId)) throw new Error("invalid_submission_id");
    const ownerRoot = contributorId
      ? (() => {
          if (!isUuid(contributorId)) throw new Error("invalid_contributor_id");
          return `contributors/${contributorId}`;
        })()
      : `accounts/${userId}`;
    return {
      scope,
      bucket: "submission-inbox",
      path: `sod1820/2029/${ownerRoot}/${yyyy}/${mm}/${submissionId}/${kind}/original.${file.ext}`,
      assetId: null,
      submissionId,
      transport: file.size > SIX_MIB ? "tus" : "signed",
      ...file,
    };
  }

  throw new Error("unsupported_scope");
}

export function mayVerifyPath({ scope, path, userId, contributorId = null, isAdmin = false }: any): boolean {
  const p = String(path || "");
  if (scope === "public") return isAdmin && p.startsWith("sod1820/2029/");
  if (scope !== "submission" || !isUuid(userId)) return false;
  if (contributorId && isUuid(contributorId) && p.startsWith(`sod1820/2029/contributors/${contributorId}/`)) return true;
  return p.startsWith(`sod1820/2029/accounts/${userId}/`);
}
