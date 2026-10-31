export const AVATAR_UPLOAD_POLICY = Object.freeze({
  maxBytes: 5 * 1024 * 1024,
  types: { 'image/jpeg': ['jpg', 'jpeg'], 'image/png': ['png'], 'image/webp': ['webp'], 'image/gif': ['gif'] },
});

export function validateProfileAvatar(file) {
  const extension = String(file?.name || '').split('.').pop()?.toLowerCase();
  const type = String(file?.type || '').toLowerCase();
  if (!AVATAR_UPLOAD_POLICY.types[type]?.includes(extension)) throw new Error('בחרו תמונת JPG, PNG, WebP או GIF.');
  if (!Number.isFinite(file.size) || file.size < 1 || file.size > AVATAR_UPLOAD_POLICY.maxBytes) throw new Error('גודל התמונה צריך להיות עד 5MB.');
  return { extension, type };
}

export function ownedProfileAvatarUrl(value, uid, origin) {
  if (typeof value !== 'string' || typeof uid !== 'string') return null;
  try {
    const url = new URL(value);
    const match = /^\/storage\/v1\/object\/public\/gallery\/avatars\/([0-9a-f-]{36})-(\d{13})\.(jpg|jpeg|png|webp|gif)$/.exec(url.pathname);
    return url.origin === origin && !url.search && !url.hash && !url.username && !url.password && value === url.href
      && match?.[1] === uid ? url.href : null;
  } catch { return null; }
}
