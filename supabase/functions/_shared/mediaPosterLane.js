// Poster lane for canonical 2029 media-bucket videos (POST_PUBLISHING_2029_CHAIN_V1_CLOSEOUT).
// EXTEND_EXISTING: pending work is DERIVED from canonical Storage objects (original exists + poster missing).
// There is no queue, table or identity here; the poster is a dependent representation of the stored
// video (docs/2029-media-performance-delivery-map-v1.md §7.3). Pure over an injected `listDir`.

export const VIDEO_ROOT = "sod1820/2029/video";
export const POSTER_NAME = "poster.jpg";
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
export const ORIGINAL_PATH_RE = new RegExp(`^${VIDEO_ROOT}/(\\d{4})/(0[1-9]|1[0-2])/(${UUID})/original\\.(mp4|mov|webm|m4v)$`, "i");
const ORIGINAL_NAME_RE = /^original\.(mp4|mov|webm|m4v)$/i;

export const isCanonicalVideoOriginalPath = (p) => ORIGINAL_PATH_RE.test(String(p || ""));

// original.mp4 -> sibling derivatives/poster.jpg ; null when the path is not a canonical 2029 original.
export function posterPathForOriginal(originalPath) {
  const p = String(originalPath || "");
  return isCanonicalVideoOriginalPath(p) ? p.replace(/\/original\.[^/]+$/, `/derivatives/${POSTER_NAME}`) : null;
}

// listDir(prefix) -> [{ name, isFolder }] (one Storage level, bounded by the caller). Returns at most `limit` pending items.
export async function findPendingPosters({ listDir, limit = 10, maxDirs = 400 }) {
  const pending = [];
  let visited = 0;
  const sub = async (prefix) => (await listDir(prefix)).filter((e) => e.isFolder).map((e) => e.name);
  for (const year of await sub(VIDEO_ROOT)) {
    if (!/^\d{4}$/.test(year)) continue;
    for (const month of await sub(`${VIDEO_ROOT}/${year}`)) {
      if (!/^(0[1-9]|1[0-2])$/.test(month)) continue;
      for (const asset of await sub(`${VIDEO_ROOT}/${year}/${month}`)) {
        if (++visited > maxDirs) return { pending, truncated: true };
        const dir = `${VIDEO_ROOT}/${year}/${month}/${asset}`;
        const entries = await listDir(dir);
        const original = entries.find((e) => !e.isFolder && ORIGINAL_NAME_RE.test(e.name));
        if (!original) continue;
        const path = `${dir}/${original.name}`;
        if (!isCanonicalVideoOriginalPath(path)) continue;
        const poster = posterPathForOriginal(path);
        const has = (await listDir(`${dir}/derivatives`)).some((e) => !e.isFolder && e.name === POSTER_NAME);
        if (has) continue;
        pending.push({ original_path: path, poster_path: poster });
        if (pending.length >= limit) return { pending, truncated: true };
      }
    }
  }
  return { pending, truncated: false };
}
