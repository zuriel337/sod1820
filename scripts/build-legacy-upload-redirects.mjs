// S-56: the allow list of old image addresses that may be redirected (public-reading-deploy/legacy-upload-redirect.js). It lists the stored
// upload images ("YYYY/MM/<hash>.<ext>" under media/uploads/) that a public Post shows — read anonymously from the public Posts only (the same
// public boundary the site uses: no "טיוטה" / "פורום" tag), so a file that no public page shows is never redirected to.
// Optional --check: one HEAD request per listed copy, to confirm each answers 200 with an image type (no body downloaded).
//   node scripts/build-legacy-upload-redirects.mjs [--check]
import { readFileSync, writeFileSync } from "node:fs";

const API = "https://linswmnnkjxvweumprav.supabase.co";
const ANON = /SUPABASE_ANON\s*=\s*'([^']+)'/.exec(readFileSync(new URL("../src/lib/supabase.js", import.meta.url), "utf8"))[1];
const H = { apikey: ANON, Authorization: `Bearer ${ANON}` };
const KEY = /\/storage\/v1\/object\/public\/media\/uploads\/(\d{4}\/\d{2}\/[0-9a-f]{16}\.(?:jpe?g|png|gif|webp))(?![A-Za-z0-9])/gi;

// The public WordPress archive (ZURIEL 25.11.2026: the whole historical public archive is open, old images included). Migrated library files
// that no Post uses at all — not even a hidden one — read 25.11.2026 from media_migration_queue (status done) against every Post, and each
// looked at: historical research images (Hanukkah, calculator and news screenshots), no personal information. Images that only a draft or
// forum Post shows are not here and stay protected; the one such file (post 103, a draft) is left out on purpose.
const ARCHIVE = ["2016/12/d80687f0426ee862.jpg", "2018/08/3319667ce2ad91dd.jpg", "2019/06/e4fe1dcc5b206a43.jpg", "2020/02/3fbe8a2a06067b83.png",
  "2020/02/60c2e6e00bae330f.jpg", "2020/02/a1fb1869dd96ca88.png", "2024/04/d269214193d88cc1.jpg"];

// Images only a draft shows stay closed, under both of their stored names (the hashed copy and the earlier copy under the original name).
const CLOSED = ["2024/08/1946b8e3a370147e.jpg", "2024/08/2023_11_14_11.24.35-1.jpg"];

const keys = new Set();
let posts = 0;
for (let from = 0; ; from += 200) {
  const response = await fetch(`${API}/rest/v1/posts?select=id,content,image_url&or=(tags.is.null,tags.not.ov.{טיוטה,פורום})&order=id&limit=200&offset=${from}`, { headers: H });
  if (!response.ok) throw new Error(`posts read failed: ${response.status}`);
  const page = await response.json();
  for (const row of page) {
    posts++;
    for (const match of `${row.content || ""} ${row.image_url || ""} `.matchAll(KEY)) keys.add(match[1].toLowerCase());
  }
  if (page.length < 200) break;
}
const sorted = [...keys].sort();

if (process.argv.includes("--check")) {
  const bad = []; let index = 0; const checkList = [...sorted, ...ARCHIVE];
  await Promise.all(Array.from({ length: 16 }, async () => {
    while (index < checkList.length) {
      const key = checkList[index++];
      const response = await fetch(`${API}/storage/v1/object/public/media/uploads/${key}`, { method: "HEAD", redirect: "manual" }).catch(() => null);
      if (response?.status !== 200 || !/^image\//.test(response.headers.get("content-type") || "")) bad.push(`${key} ${response?.status ?? "network"}`);
    }
  }));
  console.log(JSON.stringify({ checked: checkList.length, failed: bad.length, examples: bad.slice(0, 10) }));
  if (bad.length) process.exitCode = 1;
}

writeFileSync(new URL("../public-reading-deploy/legacy-upload-public-keys.json", import.meta.url),
  JSON.stringify({ schema: 1, source: "public Posts (anonymous read)", posts, count: sorted.length, keys: sorted,
    archive: ARCHIVE.filter(key => !keys.has(key)).sort(), closed: CLOSED }) + "\n");
console.log(JSON.stringify({ posts, keys: sorted.length }));
