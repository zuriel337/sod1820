// S-56 (ZURIEL 25.11.2026): old WordPress image addresses (/wp-content/uploads/YYYY/MM/<name>) answer with one permanent redirect to the
// stored public copy, instead of a 404. No new store or table: the copy's name is a fixed function of the original path, the one the media
// migration used for every file (media_migration_queue, verified 25.11.2026 on all 4,357 migrated files):
//   uploads/YYYY/MM/<first 16 hex of sha256(decoded original path)>.<lower-case extension>, in the public "media" bucket.
// Privacy: only images that a public Post already shows are redirected — the allow list (legacy-upload-public-keys.json) is built from public
// Post content only (scripts/build-legacy-upload-redirects.mjs, anonymous read). Any other address keeps its 404, so a file that no public page
// shows never becomes reachable by its old name. WordPress size variants (<name>-300x200.jpg) lead to their original.
// Future publication changes (ZURIEL 25.11.2026): the list is only a fast first filter. Each redirect is also confirmed at request time against
// the live public Posts, with the site's one public boundary (publicPostOnlyFilter): a Post hidden, tagged "טיוטה"/"פורום" or deleted after the
// list was built stops redirecting its images at once. If that read fails, nothing is redirected (fail closed: the old 404 stays). The browser
// never keeps the redirect (no-store); the platform CDN keeps it LEGACY_UPLOAD_CDN_SECONDS at most, the fresh window of a Post document.
// Not covered here (a separate decision): the stored copy itself sits in the public "media" bucket, so a hidden Post's image stays readable at
// its storage address; this redirect never leads to it, but does not remove it either.
// Nothing here is part of the page code or of an ordinary document request: the list loads and the read runs only for an old address.
import { publicPostOnlyFilter } from "../src/lib/research/publicPostBoundary.js";

export const LEGACY_UPLOAD_PREFIX = "/wp-content/uploads/";
export const LEGACY_UPLOAD_CDN_SECONDS = 300;
export const LEGACY_UPLOAD_STORAGE = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/uploads/";
// The public project address and the public anonymous key, as in the other server readers (first-words.js, api/og.js). The browser module
// src/lib/supabase.js is not imported: it creates a client, which a server function must not load.
const SUPABASE_URL = "https://linswmnnkjxvweumprav.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM";
const STORED_KEY = /^\d{4}\/\d{2}\/[0-9a-f]{16}\.(?:jpe?g|png|gif|webp)$/;
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

/** Whether a public Post shows this stored copy right now (content or cover), read with the anonymous key and the site's public boundary. */
export async function legacyUploadPublicNow(key, { fetchImpl = globalThis.fetch, timeoutMs = 3000 } = {}) {
  if (typeof key !== "string" || !STORED_KEY.test(key)) return false;
  const object = `"*/storage/v1/object/public/media/uploads/${key}*"`;
  const params = new URLSearchParams({ select: "id", limit: "1",
    and: `(or(${publicPostOnlyFilter()}),or(content.ilike.${object},image_url.ilike.${object}))` });
  const response = await fetchImpl(`${SUPABASE_URL}/rest/v1/posts?${params}`, {
    headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` }, signal: AbortSignal.timeout(timeoutMs) });
  if (!response?.ok) throw new Error(`legacy upload check unavailable: ${response?.status}`);
  const rows = await response.json();
  return Array.isArray(rows) && rows.length > 0;
}

/** The redirect target of an old image address, or null (keep the 404). `keys` and `publicNow` are injectable for tests. */
export async function legacyUploadTarget(pathname, { keys = null, publicNow = legacyUploadPublicNow } = {}) {
  const key = await legacyUploadKey(pathname);
  if (!key) return null;
  const allowed = keys || await publicKeys();
  if (!allowed.has(key)) return null;
  return await publicNow(key) === true ? LEGACY_UPLOAD_STORAGE + key : null;
}
