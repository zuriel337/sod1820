// The real width of every original image the proven imported Posts show (their cover and the article images that get smaller copies), read from
// the first bytes of each file (an HTTP Range request on the public object: no transformation, nothing billed but the bytes read). With the
// width known, postImageRenditionSet2029 offers copies only below it and the original itself at its real width, so no copy is ever the original
// re-encoded at its own size (16.11.2026: a cover's "1080" copy was the 1,024 px original re-encoded, 157 KB against 151 KB).
// Read-only towards the database (public anonymous read of the rows). Writes public-reading-deploy/article-image-facts.json.
//   node scripts/scan-article-image-facts.mjs [--limit 50]
import { readFileSync, writeFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const args = process.argv.slice(2);
const limit = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : Infinity;
const API = "https://linswmnnkjxvweumprav.supabase.co";
const ANON = /SUPABASE_ANON\s*=\s*'([^']+)'/.exec(readFileSync(new URL("../src/lib/supabase.js", import.meta.url), "utf8"))[1];
const proof = JSON.parse(readFileSync(new URL("../public-reading-deploy/article-first-proven.json", import.meta.url), "utf8"));
const ids = Object.keys(proof.posts).slice(0, limit);

const { window } = new JSDOM("<!doctype html><html><body></body></html>");
globalThis.document = window.document;
const { postArticleImageOriginals2029 } = await import("../src/lib/research/postArticleCore2029.js");
const { postArticleSourceHtmlFromRow2029 } = await import("../src/lib/research/postArticlePipeline2029.js");

// width × height from the header of a JPEG, PNG, GIF or WebP file; null when the bytes read do not reach it
export function imageSize(bytes) {
  const b = bytes, u16 = i => (b[i] << 8) | b[i + 1], l16 = i => b[i] | (b[i + 1] << 8), u32 = i => ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3];
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { w: u32(16), h: u32(20), type: "png" };
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return { w: l16(6), h: l16(8), type: "gif" };
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) {
    const chunk = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (chunk === "VP8 ") return { w: l16(26) & 0x3fff, h: l16(28) & 0x3fff, type: "webp" };
    if (chunk === "VP8L") { const v = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24); return { w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1, type: "webp" }; }
    if (chunk === "VP8X") return { w: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), h: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)), type: "webp" };
    return null;
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i + 9 < b.length;) {
      if (b[i] !== 0xff) { i += 1; continue; }
      const marker = b[i + 1];
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01 || marker === 0xff) { i += marker === 0xff ? 1 : 2; continue; }
      const length = u16(i + 2);
      if ((marker >= 0xc0 && marker <= 0xcf) && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) return { w: u16(i + 7), h: u16(i + 5), type: "jpeg" };
      i += 2 + length;
    }
    return null;
  }
  return null;
}

async function measure(url) {
  for (const end of [16383, 131071, 524287]) {   // the header is almost always in the first 16 KB; more only when it is not
    const response = await fetch(url, { headers: { range: `bytes=0-${end}` } });
    if (!(response.ok || response.status === 206)) return { error: response.status };
    const bytes = new Uint8Array(await response.arrayBuffer());
    const total = Number((response.headers.get("content-range") || "").split("/")[1]) || bytes.length;
    const size = imageSize(bytes);
    if (size) return { ...size, bytes: total };
    if (bytes.length >= total) return { error: "unreadable" };
  }
  return { error: "unreadable" };
}

const urls = new Set();
for (let from = 0; from < ids.length; from += 100) {
  const slice = ids.slice(from, from + 100);
  const response = await fetch(`${API}/rest/v1/posts?id=in.(${slice.join(",")})&select=id,slug,source,content,image_url,tags,categories,author,title`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
  if (!response.ok) throw new Error(`image_facts_read_${response.status}`);
  for (const row of await response.json()) for (const url of postArticleImageOriginals2029(postArticleSourceHtmlFromRow2029(row), row.image_url)) urls.add(url);
}
const queue = [...urls].sort(); const images = {}; const failed = {};
await Promise.all(Array.from({ length: 6 }, async () => {
  while (queue.length) {
    const url = queue.shift();
    try { const fact = await measure(url); if (fact.error) failed[url] = fact.error; else images[url] = [fact.w, fact.h, fact.bytes]; } catch (error) { failed[url] = String(error.message || error).slice(0, 60); }
  }
}));
const out = { generated: new Date().toISOString().slice(0, 10), posts: ids.length, measured: Object.keys(images).length, failed: Object.keys(failed).length,
  images: Object.fromEntries(Object.entries(images).sort()) };
writeFileSync(new URL("../public-reading-deploy/article-image-facts.json", import.meta.url), JSON.stringify(out) + "\n");
console.log(JSON.stringify({ posts: ids.length, originals: urls.size, measured: out.measured, failed: out.failed, failures: Object.entries(failed).slice(0, 5) }));
