// Asks the Storage render endpoint once for every smaller copy an imported Post's article offers (postArticleCore2029.js), so that no reader pays
// the first transform (0.9–1.9 s on a miss; measured 16.11.2026). A RELEASE STEP: each first copy is a billed transformation; run it only for the
// Posts being released, after the approval of that release. Read-only towards the database (public anonymous read of the rows).
//
//   node scripts/warm-article-image-renditions.mjs --ids 1,5,31,192      (only these Posts)
//   node scripts/warm-article-image-renditions.mjs --all [--limit 200]    (the proven imported Posts)
//   add --dry-run to count the copies without asking for them
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const args = process.argv.slice(2);
const option = name => { const index = args.indexOf(`--${name}`); return index >= 0 ? (args[index + 1] && !args[index + 1].startsWith("--") ? args[index + 1] : true) : null; };
const API = "https://linswmnnkjxvweumprav.supabase.co";
const ANON = /SUPABASE_ANON\s*=\s*'([^']+)'/.exec(readFileSync(new URL("../src/lib/supabase.js", import.meta.url), "utf8"))[1];
const proof = JSON.parse(readFileSync(new URL("../public-reading-deploy/article-first-proven.json", import.meta.url), "utf8"));
const ids = option("ids") ? String(option("ids")).split(",").map(value => value.trim()).filter(Boolean) : option("all") ? Object.keys(proof.posts).slice(0, Number(option("limit") || 100000)) : null;
if (!ids?.length) throw new Error("warm_renditions_needs --ids or --all");

const { window } = new JSDOM("<!doctype html><html><body></body></html>");
globalThis.document = window.document;
const { postArticleSourceHtmlFromRow2029 } = await import("../src/lib/research/postArticlePipeline2029.js");
const { postImageRenditionSet2029 } = await import("../src/lib/research/postArticleCore2029.js");
// the copies the document handler really offers: with the originals' real widths (scripts/scan-article-image-facts.mjs), none that is the original
const FACTS = JSON.parse(readFileSync(new URL("../public-reading-deploy/article-image-facts.json", import.meta.url), "utf8")).images || {};
const isCopy = url => url.includes("/storage/v1/render/image/");

const urls = new Set();
for (let from = 0; from < ids.length; from += 100) {
  const slice = ids.slice(from, from + 100);
  const response = await fetch(`${API}/rest/v1/posts?id=in.(${slice.join(",")})&select=id,slug,source,content,image_url,tags,categories,author,title`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
  if (!response.ok) throw new Error(`warm_renditions_read_${response.status}`);
  for (const row of await response.json()) {
    for (const entry of postImageRenditionSet2029(row.image_url, FACTS).split(", ").filter(Boolean)) urls.add(entry.replace(/ \d+w$/, ""));
    const template = window.document.createElement("template"); template.innerHTML = postArticleSourceHtmlFromRow2029(row, { facts: FACTS });
    for (const image of template.content.querySelectorAll("img[srcset]")) for (const entry of image.getAttribute("srcset").split(", ")) urls.add(entry.replace(/ \d+w$/, ""));
  }
}
for (const url of [...urls]) if (!isCopy(url)) urls.delete(url);   // an original is not a copy to warm
console.log(JSON.stringify({ posts: ids.length, copies: urls.size, dryRun: Boolean(option("dry-run")) }));
if (option("dry-run")) process.exit(0);
const queue = [...urls]; let done = 0, failed = 0; const started = Date.now();
await Promise.all(Array.from({ length: 4 }, async () => {
  while (queue.length) {
    const url = queue.shift();
    try { const response = await fetch(url, { headers: { accept: "image/avif,image/webp,*/*" } }); await response.arrayBuffer(); if (!response.ok) failed += 1; } catch { failed += 1; }
    done += 1;
  }
}));
console.log(JSON.stringify({ requested: done, failed, seconds: Math.round((Date.now() - started) / 1000) }));
