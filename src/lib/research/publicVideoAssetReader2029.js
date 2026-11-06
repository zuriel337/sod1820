// DEF-003: video_media_assets_v1 is a heavy projection (it re-derives every placement from ~1,300 posts on each query; measured
// 1.29 s per read, EXPLAIN ANALYZE 2026-11-06). fetchPublicVideo2029 reads it twice per /video/:id request (identity, then the
// verification read after the source gates), and a crawler fan-out multiplies that into timeouts and 503s.
// This reader keeps the call sequence and every comparison of fetchPublicVideo2029 unchanged and only answers the repeated
// per-asset reads from ONE network row: a superset select is fetched once, the exact-equality filters and the requested
// column projection are applied locally. Create one reader per request (api/og.js does); errors and empty answers are never remembered.
export const VIDEO_ASSET_SUPERSET = Object.freeze([
  "public_id", "primary_source_type", "primary_source_id", "video_kind", "media_url", "youtube_id", "poster_url", "thumb_url", "google_indexable",
]);
const ASSET_ID = /^eq\.([0-9a-f]{32})$/i;

export function createVideoAssetReader({ fetchRows, ttlMs = 60_000, maxEntries = 500, now = Date.now } = {}) {
  if (typeof fetchRows !== "function") throw new TypeError("fetchRows is required");
  const entries = new Map(); // assetId -> { at, promise }
  const prune = () => {
    const t = now();
    for (const [key, value] of entries) if (t - value.at > ttlMs) entries.delete(key);
    while (entries.size > maxEntries) entries.delete(entries.keys().next().value);
  };
  return async function readRows(table, params = {}, options) {
    const match = table === "video_media_assets_v1" ? ASSET_ID.exec(String(params.public_id || "")) : null;
    const select = String(params.select || "").split(",").map((c) => c.trim()).filter(Boolean);
    const filters = Object.entries(params).filter(([key]) => !["select", "limit", "public_id"].includes(key));
    const local = match && select.length && select.every((c) => VIDEO_ASSET_SUPERSET.includes(c))
      && filters.every(([key, value]) => VIDEO_ASSET_SUPERSET.includes(key) && /^eq\./.test(String(value)));
    if (!local) return fetchRows(table, params, options);

    const assetId = match[1].toLowerCase();
    prune();
    let entry = entries.get(assetId);
    if (!entry) {
      const promise = Promise.resolve(fetchRows(table, { select: VIDEO_ASSET_SUPERSET.join(","), public_id: `eq.${assetId}`, limit: "1" }, options))
        .then((rows) => { if (!Array.isArray(rows)) throw new Error("invalid_video_source_response"); if (!rows.length) entries.delete(assetId); return rows; },
          (error) => { entries.delete(assetId); throw error; });
      entry = { at: now(), promise };
      entries.set(assetId, entry);
    }
    const rows = await entry.promise;
    const limit = Number.parseInt(params.limit, 10);
    const out = rows
      .filter((row) => filters.every(([key, value]) => String(row?.[key] ?? "") === String(value).slice(3)))
      .map((row) => Object.fromEntries(select.map((c) => [c, row[c]])));
    return Number.isFinite(limit) && limit >= 0 ? out.slice(0, limit) : out;
  };
}
