// S-56 (ZURIEL 25.11.2026): old WordPress image addresses (/wp-content/uploads/YYYY/MM/<name>) answer with one permanent redirect to the
// stored public copy, instead of a 404. No new store or table: the copy's name is a fixed function of the original path, the one the media
// migration used for every file (media_migration_queue, verified 25.11.2026 on all 4,357 migrated files):
//   uploads/YYYY/MM/<first 16 hex of sha256(decoded original path)>.<lower-case extension>, in the public "media" bucket.
// Privacy: only images that a public Post already shows are redirected — the allow list (legacy-upload-public-keys.json) is built from public
// Post content only (scripts/build-legacy-upload-redirects.mjs, anonymous read). Any other address keeps its 404, so a file that no public page
// shows never becomes reachable by its old name. WordPress size variants (<name>-300x200.jpg) lead to their original.
// Pure functions plus one lazy read of the allow list: nothing here is part of the page code or of an ordinary document request.

export const LEGACY_UPLOAD_PREFIX = "/wp-content/uploads/";
export const LEGACY_UPLOAD_STORAGE = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/uploads/";
const IMAGE = /\.(jpe?g|png|gif|webp)$/i;
const SIZE_VARIANT = /-\d{1,5}x\d{1,5}(?=\.[A-Za-z0-9]+$)/;

const hex = buffer => Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, "0")).join("");

/** The stored key ("YYYY/MM/<hash>.<ext>") of an old upload path, or null when the path is not an old image address. */
export async function legacyUploadKey(pathname) {
  if (typeof pathname !== "string" || !pathname.startsWith(LEGACY_UPLOAD_PREFIX)) return null;
  let rest;
  try { rest = decodeURIComponent(pathname.slice(LEGACY_UPLOAD_PREFIX.length)); } catch { return null; }
  const match = /^(\d{4}\/\d{2})\/([^/\\]+)$/.exec(rest);
  if (!match || !IMAGE.test(match[2]) || /[\u0000-\u001f\u007f]/.test(rest)) return null;
  const original = match[2].replace(SIZE_VARIANT, "");
  const hash = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`uploads/${match[1]}/${original}`))).slice(0, 16);
  return `${match[1]}/${hash}.${original.split(".").pop().toLowerCase()}`;
}

let allowList = null;
async function publicKeys() {
  if (!allowList) allowList = import("./legacy-upload-public-keys.json", { with: { type: "json" } })
    .then(module => new Set(module.default.keys)).catch(error => { allowList = null; throw error; });
  return allowList;
}

/** The redirect target of an old image address, or null (keep the 404). `keys` is injectable for tests. */
export async function legacyUploadTarget(pathname, { keys = null } = {}) {
  const key = await legacyUploadKey(pathname);
  if (!key) return null;
  const allowed = keys || await publicKeys();
  return allowed.has(key) ? LEGACY_UPLOAD_STORAGE + key : null;
}
