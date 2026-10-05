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

// listDir(prefix, { limit, offset }) -> [{ name, isFolder }] : one Storage level, name asc, standard limit+offset paging.
// Stateless, bounded scan with an exact continuation (no queue/table/store; the cursor is only echoed to the caller):
//  - every level is listed with offset paging, so a directory with more entries than one page is fully reachable;
//  - `cursor` = the last asset dir already visited, "YYYY/MM/<asset>" (names sort asc, so resume = strictly after it);
//  - the scan stops at `limit` pending items, `maxDirs` visited asset dirs or `maxRequests` list calls;
//  - truncated=true means "more may exist" and next_cursor is where the next call must resume; truncated=false is the end.
export const POSTER_SCAN_DEFAULTS = { limit: 10, maxDirs: 400, maxRequests: 1500, pageSize: 200 };

export async function findPendingPosters({ listDir, limit = 10, maxDirs = 400, maxRequests = 1500, pageSize = 200, cursor = null }) {
  const pending = [];
  let visited = 0, requests = 0, last = null;
  const over = () => requests >= maxRequests;
  const page = async (prefix, offset) => { requests++; return listDir(prefix, { limit: pageSize, offset }); };
  // Async generator over the folder names of one level, in order, resuming after `after` (exclusive) when given.
  async function* folders(prefix, after = null) {
    for (let offset = 0; ; offset += pageSize) {
      if (over()) { yield null; return; }
      const entries = await page(prefix, offset);
      for (const e of entries) if (e.isFolder && (after === null || e.name > after)) yield e.name;
      if (entries.length < pageSize) return;
    }
  }
  const [cy = null, cm = null, ca = null] = String(cursor || "").split("/");
  const result = (truncated) => ({ pending, truncated, next_cursor: truncated ? last : null, visited, requests });
  for await (const year of folders(VIDEO_ROOT, cy && /^\d{4}$/.test(cy) ? String(+cy - 1).padStart(4, "0") : null)) {
    if (year === null) return result(true);
    if (!/^\d{4}$/.test(year)) continue;
    const sameYear = year === cy;
    for await (const month of folders(`${VIDEO_ROOT}/${year}`, sameYear && cm ? String(+cm - 1).padStart(2, "0") : null)) {
      if (month === null) return result(true);
      if (!/^(0[1-9]|1[0-2])$/.test(month)) continue;
      const sameMonth = sameYear && month === cm;
      for await (const asset of folders(`${VIDEO_ROOT}/${year}/${month}`, sameMonth ? ca : null)) {
        if (asset === null) return result(true);
        if (visited >= maxDirs || requests + 2 > maxRequests) return result(true);
        visited++;
        last = `${year}/${month}/${asset}`;
        const dir = `${VIDEO_ROOT}/${year}/${month}/${asset}`;
        const entries = await page(dir, 0);
        const original = entries.find((e) => !e.isFolder && ORIGINAL_NAME_RE.test(e.name));
        if (!original) continue;
        const path = `${dir}/${original.name}`;
        if (!isCanonicalVideoOriginalPath(path)) continue;
        const has = (await page(`${dir}/derivatives`, 0)).some((e) => !e.isFolder && e.name === POSTER_NAME);
        if (has) continue;
        pending.push({ original_path: path, poster_path: posterPathForOriginal(path) });
        if (pending.length >= limit) return result(true);
      }
    }
  }
  return result(false);
}
