// media-thumbs — מייצר תמונת-תצוגה (poster) לכל עדכון-וידאו (channel_updates) שחסר thumb_url.
// רץ ב-GitHub Action (ubuntu, ffmpeg מותקן). אימות מול השרת דרך FB_ADMIN_KEY בלבד.
// זרימה: media-thumb-queue(list) → הורדה → ffmpeg פריים → sign-upload(PUT) → media-thumb-queue(set).
import { spawnSync } from "node:child_process";
import { writeFileSync, readFileSync, unlinkSync } from "node:fs";
import { pathToFileURL } from "node:url";

const SB = process.env.SUPABASE_URL || "https://linswmnnkjxvweumprav.supabase.co";
const KEY = process.env.FB_ADMIN_KEY;
if (!KEY) { console.error("missing FB_ADMIN_KEY"); process.exit(1); }
const FN = (n) => `${SB}/functions/v1/${n}`;
const H = { "x-fb-admin-key": KEY, "content-type": "application/json" };

async function post(fn, body) {
  const r = await fetch(FN(fn), { method: "POST", headers: H, body: JSON.stringify(body) });
  return r.json().catch(() => ({}));
}

const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

// Poster lane: canonical media-bucket 2029 video original -> derivatives/poster.jpg (server-side ffmpeg; no client capture).
// Idempotent: the queue only lists originals without a poster, and the signed upload refuses an existing object.
export async function processVideoPoster({ original_path, poster_path, url }, deps = {}) {
  const { post: postFn = post, fetchImpl = fetch, frame = defaultFrame } = deps;
  if (!poster_path || !/^sod1820\/2029\/video\/.+\/derivatives\/poster\.jpg$/.test(poster_path)) return { ok: false, error: "bad_poster_path" };
  const src = await fetchImpl(url);
  if (!src.ok) return { ok: false, error: `download ${src.status}` };
  const buf = Buffer.from(await src.arrayBuffer());
  if (!buf.length || buf.length > MAX_VIDEO_BYTES) return { ok: false, error: `size ${buf.length}` };
  const img = frame(buf, original_path);
  if (!img || !img.length) return { ok: false, error: "no_frame" };
  const sign = await postFn("sign-upload", { bucket: "media", path: poster_path });
  if (!sign.ok) return { ok: false, error: `sign ${sign.error}` };
  const put = await fetchImpl(sign.put_url, { method: "PUT", headers: { "content-type": "image/jpeg" }, body: img });
  if (!put.ok) return { ok: false, error: `put ${put.status}` };
  return { ok: true, poster_path, public_url: sign.public_url };
}

function defaultFrame(buf, original_path) {
  const tag = original_path.replace(/[^a-z0-9]/gi, "_").slice(-60);
  const vid = `/tmp/poster-${tag}.bin`, jpg = `/tmp/poster-${tag}.jpg`;
  try {
    writeFileSync(vid, buf);
    for (const ss of [1, 0.2]) {
      spawnSync("ffmpeg", ["-y", "-ss", String(ss), "-i", vid, "-frames:v", "1", "-vf", "scale=640:-1", "-q:v", "4", jpg], { stdio: "ignore" });
      try { const img = readFileSync(jpg); if (img.length) return img; } catch { /* retry next offset */ }
    }
    return null;
  } finally {
    try { unlinkSync(vid); } catch { /* noop */ }
    try { unlinkSync(jpg); } catch { /* noop */ }
  }
}

// Bounded continuation over the stateless scan: follow next_cursor page by page until a pending batch is found,
// the end is reached (truncated=false) or the page budget is spent. Nothing is persisted between runs.
export const POSTER_MAX_PAGES = 12;
export async function collectPosterBatch({ postFn = post, maxPages = POSTER_MAX_PAGES, limit = 10 } = {}) {
  let cursor = null, pages = 0, visited = 0;
  for (;;) {
    const list = await postFn("media-thumb-queue", { op: "list_video_posters", limit, ...(cursor ? { cursor } : {}) });
    pages++;
    if (!list.ok) return { ok: false, error: list, pages, visited };
    visited += list.visited || 0;
    const rows = list.rows || [];
    const more = !!list.truncated && !!list.next_cursor;
    if (rows.length || !more || pages >= maxPages) return { ok: true, rows, truncated: more, next_cursor: more ? list.next_cursor : null, pages, visited, exhausted_budget: !rows.length && more };
    cursor = list.next_cursor;
  }
}

async function posterLane() {
  const list = await collectPosterBatch();
  if (!list.ok) { console.error("poster list failed:", JSON.stringify(list.error)); return 1; }
  const rows = list.rows || [];
  console.log(`canonical 2029 videos without poster: ${rows.length} (pages:${list.pages} dirs:${list.visited})${list.truncated ? ` (scan bounded; more exists after ${list.next_cursor})` : ""}`);
  let ok = 0, fail = 0;
  for (const row of rows) {
    try {
      const r = await processVideoPoster(row);
      if (r.ok) { console.log(`OK poster ${r.poster_path}`); ok++; } else { console.log(`FAIL poster ${row.original_path}: ${r.error}`); fail++; }
    } catch (e) { console.log(`FAIL poster ${row.original_path}: ${e.message || e}`); fail++; }
  }
  console.log(`poster lane done — ok:${ok} fail:${fail}`);
  return fail ? 1 : 0;
}

async function main() {
  const list = await post("media-thumb-queue", { op: "list", limit: 100 });
  if (!list.ok) { console.error("list failed:", JSON.stringify(list)); process.exit(1); }
  const rows = list.rows || [];
  console.log(`pending videos without thumbnail: ${rows.length}`);
  let ok = 0, fail = 0;
  for (const { id, url } of rows) {
    const mp4 = `/tmp/${id}.mp4`, jpg = `/tmp/${id}.jpg`;
    try {
      const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
      writeFileSync(mp4, buf);
      const ff = (ss) => spawnSync("ffmpeg", ["-y", "-ss", String(ss), "-i", mp4, "-frames:v", "1", "-vf", "scale=640:-1", "-q:v", "4", jpg], { stdio: "ignore" });
      ff(1); let img; try { img = readFileSync(jpg); } catch { img = null; }
      if (!img || !img.length) { ff(0.2); try { img = readFileSync(jpg); } catch { img = null; } }
      if (!img || !img.length) { console.log(`FAIL frame ${id}`); fail++; continue; }
      const sign = await post("sign-upload", { bucket: "gallery", path: `sod1820/channel-thumbs/${id}.jpg` });
      if (!sign.ok) { console.log(`FAIL sign ${id}: ${sign.error}`); fail++; continue; }
      const put = await fetch(sign.put_url, { method: "PUT", headers: { "content-type": "image/jpeg" }, body: img });
      if (!put.ok) { console.log(`FAIL put ${id}: ${put.status}`); fail++; continue; }
      const set = await post("media-thumb-queue", { op: "set", id, thumb_url: sign.public_url });
      if (!set.ok) { console.log(`FAIL set ${id}: ${set.error}`); fail++; continue; }
      console.log(`OK ${id}`); ok++;
    } catch (e) {
      console.log(`FAIL ${id}: ${e.message || e}`); fail++;
    } finally {
      try { unlinkSync(mp4); } catch { /* noop */ }
      try { unlinkSync(jpg); } catch { /* noop */ }
    }
  }
  console.log(`done — ok:${ok} fail:${fail}`);
  const posterFail = await posterLane();
  if (posterFail) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e); process.exit(1); });
