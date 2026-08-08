// media-thumbs — מייצר תמונת-תצוגה (poster) לכל עדכון-וידאו (channel_updates) שחסר thumb_url.
// רץ ב-GitHub Action (ubuntu, ffmpeg מותקן). אימות מול השרת דרך FB_ADMIN_KEY בלבד.
// זרימה: media-thumb-queue(list) → הורדה → ffmpeg פריים → sign-upload(PUT) → media-thumb-queue(set).
import { spawnSync } from "node:child_process";
import { writeFileSync, readFileSync, unlinkSync } from "node:fs";

const SB = process.env.SUPABASE_URL || "https://linswmnnkjxvweumprav.supabase.co";
const KEY = process.env.FB_ADMIN_KEY;
if (!KEY) { console.error("missing FB_ADMIN_KEY"); process.exit(1); }
const FN = (n) => `${SB}/functions/v1/${n}`;
const H = { "x-fb-admin-key": KEY, "content-type": "application/json" };

async function post(fn, body) {
  const r = await fetch(FN(fn), { method: "POST", headers: H, body: JSON.stringify(body) });
  return r.json().catch(() => ({}));
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
}
main().catch((e) => { console.error(e); process.exit(1); });
