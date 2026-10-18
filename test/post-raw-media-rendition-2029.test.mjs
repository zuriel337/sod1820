import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  rewritePostRawImages2029, preparePostRawMediaHtml2029, postRawImageSource, postRawImageSrcset,
  POST_RAW_IMAGE_SIZES, POST_RAW_IMAGE_WIDTHS,
} from "../src/lib/postRawMediaRendition2029.js";
import { hardenPassiveMediaHtml } from "../src/lib/mediaEgressGuard.js";

const SB = "https://linswmnnkjxvweumprav.supabase.co";
const PNG = `${SB}/storage/v1/object/public/gallery/sod1820/posts/fz1073/plane-363-hamashiach-card-20261001.png`;
const JPG = `${SB}/storage/v1/object/public/gallery/sod1820/posts/fz1073/assaf-rajuan-evidence-frame-20261001.jpg`;
const opts = { supabaseUrl: SB, hasCanonicalCover: true };

// Verbatim shape of public.posts id=5112 (read-only): figure marker + bare img with src/alt/style.
const CARD = `<figure data-sod363-card="v1" style="max-width:576px;margin:26px auto 24px">
  <img src="${PNG}" alt="רמזים במציאות — נוסעי המטוס יורדים במדרגות, 363 = המשיח" style="display:block;width:100%;height:auto;border-radius:16px">
  <figcaption>x</figcaption></figure>`;
const PLAIN = `<img src="${JPG}" alt="פריים מתוך מקור הווידאו עם הכיתוב על אסף רג'ואן" style="display:block;width:100%;height:auto;border-radius:14px">`;

const attr = (tag, name) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1]?.replace(/&amp;/g, "&");
const imgs = (html) => html.match(/<img\b(?:"[^"]*"|'[^']*'|[^'">])*>/g) || [];
const countAttr = (tag, name) => (tag.match(new RegExp(`\\s${name}(?=[\\s=>/])`, "gi")) || []).length;

test("Legacy/default helper is untouched: hardenPassiveMediaHtml neither imports nor applies image rewriting", () => {
  const guard = readFileSync(new URL("../src/lib/mediaEgressGuard.js", import.meta.url), "utf8");
  assert.doesNotMatch(guard, /import\s|Rendition|srcset/);
  assert.equal(hardenPassiveMediaHtml(`${CARD}${PLAIN}`), `${CARD}${PLAIN}`);
  assert.equal(hardenPassiveMediaHtml(`<video src="a.mp4" autoplay>`), `<video src="a.mp4" playsinline preload="none" data-sod-egress-guard="passive">`);
  for (const f of ["src/legacy/legacy.jsx", "src/components/ui.jsx", "src/components/InsightCard.jsx", "src/pages/PostEditorPage.jsx"]) {
    assert.doesNotMatch(readFileSync(new URL(`../${f}`, import.meta.url), "utf8"), /postRawMediaRendition2029/, f);
  }
});

test("Post2029Page is the only opt-in caller", () => {
  const page = readFileSync(new URL("../src/pages/Post2029Page.jsx", import.meta.url), "utf8");
  assert.match(page, /preparePostRawMediaHtml2029\(post\.content \|\| "", \{ supabaseUrl: SUPABASE_URL, hasCanonicalCover: Boolean\(coverItem\) \}\)/);
  assert.doesNotMatch(page, /hardenPassiveMediaHtml/);
});

test("original src + alt stay as fallback/SEO; srcset 480/768/941, sizes for a 576px column, lazy/async/low-priority", () => {
  const [tag] = imgs(rewritePostRawImages2029(PLAIN, opts));
  assert.equal(attr(tag, "src"), JPG);
  assert.equal(attr(tag, "alt"), "פריים מתוך מקור הווידאו עם הכיתוב על אסף רג'ואן");
  assert.equal(attr(tag, "style"), "display:block;width:100%;height:auto;border-radius:14px");
  const srcset = attr(tag, "srcset");
  assert.deepEqual(POST_RAW_IMAGE_WIDTHS, [480, 768, 941]);
  assert.equal(srcset, [480, 768, 941].map((w) => `${SB}/storage/v1/render/image/public/gallery/sod1820/posts/fz1073/assaf-rajuan-evidence-frame-20261001.jpg?width=${w}&resize=contain ${w}w`).join(", "));
  assert.equal(attr(tag, "sizes"), POST_RAW_IMAGE_SIZES);
  assert.equal(POST_RAW_IMAGE_SIZES, "(max-width: 576px) 100vw, 576px");
  assert.equal(attr(tag, "loading"), "lazy");
  assert.equal(attr(tag, "decoding"), "async");
  assert.equal(attr(tag, "fetchpriority"), "low");
});

test("low priority only when a canonical cover exists; nothing else about the tag changes", () => {
  const [tag] = imgs(rewritePostRawImages2029(PLAIN, { supabaseUrl: SB, hasCanonicalCover: false }));
  assert.equal(attr(tag, "fetchpriority"), undefined);
  assert.equal(attr(tag, "loading"), "lazy");
});

test("selection math: mobile picks 941, desktop 1x picks 768 from the 576px column", () => {
  const widths = POST_RAW_IMAGE_WIDTHS;
  const slot = (viewport) => (viewport <= 576 ? viewport : 576);
  const pick = (viewport, dpr) => widths.find((w) => w >= slot(viewport) * dpr) ?? widths.at(-1);
  assert.equal(pick(390, 3), 941);
  assert.equal(pick(390, 2), 941);
  assert.equal(pick(390, 1), 480);
  assert.equal(pick(1280, 1), 768);
  assert.equal(pick(1280, 2), 941);
});

test("figure[data-sod363-card=v1] > img gets verified 941x1672 geometry; other figures/imgs do not", () => {
  const [card] = imgs(rewritePostRawImages2029(CARD, opts));
  assert.equal(attr(card, "width"), "941");
  assert.equal(attr(card, "height"), "1672");
  assert.equal(attr(card, "src"), PNG);
  const [other] = imgs(rewritePostRawImages2029(`<figure data-sod363-card="v2">${PLAIN}</figure>`, opts));
  assert.equal(attr(other, "width"), undefined);
  const [bare] = imgs(rewritePostRawImages2029(PLAIN, opts));
  assert.equal(attr(bare, "height"), undefined);
  const nested = rewritePostRawImages2029(`<figure data-sod363-card="v1"><div>${PLAIN}</div></figure>`, opts);
  assert.equal(attr(imgs(nested)[0], "width"), undefined, "only a direct child img is covered by the policy");
});

test("existing width/height/loading/decoding/fetchpriority are kept, never duplicated", () => {
  const html = `<figure data-sod363-card="v1"><img src="${PNG}" alt="a" width="300" height="200" loading="eager" decoding="sync" fetchpriority="high"></figure>`;
  const [tag] = imgs(rewritePostRawImages2029(html, opts));
  for (const n of ["width", "height", "loading", "decoding", "fetchpriority", "src", "alt"]) assert.equal(countAttr(tag, n), 1, n);
  assert.equal(attr(tag, "width"), "300");
  assert.equal(attr(tag, "loading"), "eager");
  assert.equal(attr(tag, "fetchpriority"), "high");
  const onlyW = imgs(rewritePostRawImages2029(`<figure data-sod363-card="v1"><img src="${PNG}" alt="a" width="300"></figure>`, opts))[0];
  assert.equal(attr(onlyW, "width"), "300");
  assert.equal(attr(onlyW, "height"), undefined, "a single existing dimension is never mixed with policy geometry");
  const fixedH = imgs(rewritePostRawImages2029(`<figure data-sod363-card="v1"><img src="${PNG}" alt="a" style="width:100%;height:240px"></figure>`, opts))[0];
  assert.equal(attr(fixedH, "width"), undefined, "an explicit CSS height is not overridden by intrinsic geometry");
});

test("idempotent: a second pass is a no-op (already-rendered)", () => {
  const once = rewritePostRawImages2029(`${CARD}${PLAIN}`, opts);
  assert.equal(rewritePostRawImages2029(once, opts), once);
  for (const tag of imgs(once)) for (const n of ["srcset", "sizes", "loading", "decoding", "fetchpriority"]) assert.equal(countAttr(tag, n), 1, n);
});

test("unchanged byte-for-byte: external, GIF, SVG, query/hash, other project, already responsive, in <picture>, no src, duplicate src", () => {
  const cases = [
    `<img src="https://example.com/a.png" alt="x">`,
    `<img src="${SB}/storage/v1/object/public/gallery/a/anim.gif" alt="x">`,
    `<img src="${SB}/storage/v1/object/public/gallery/a/logo.svg" alt="x">`,
    `<img src="${PNG}?v=2" alt="x">`,
    `<img src="${PNG}#frag" alt="x">`,
    `<img src="https://other.supabase.co/storage/v1/object/public/gallery/a.png" alt="x">`,
    `<img src="http://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/a.png" alt="x">`,
    `<img src="${SB}/storage/v1/render/image/public/gallery/a.png?width=500" alt="x">`,
    `<img src="${SB}/storage/v1/object/sign/gallery/a.png" alt="x">`,
    `<img src="${SB}/storage/v1/object/public/gallery/../private/a.png" alt="x">`,
    `<img src="${SB}/storage/v1/object/public/gallery/%2e%2e/a.png" alt="x">`,
    `<img src="${SB}/storage/v1/object/public/gallery/ש/a.png" alt="x">`,
    `<img src="${PNG}" srcset="a.png 1x" alt="x">`,
    `<img src="${PNG}" sizes="100vw" alt="x">`,
    `<img src="${PNG}" data-sod-media-rendition="2029" alt="x">`,
    `<picture><source srcset="a.webp" type="image/webp"><img src="${PNG}" alt="x"></picture>`,
    `<img alt="x">`,
    `<img data-src="${PNG}" alt="x">`,
    `<img src="${PNG}" src="${JPG}" alt="x">`,
    `<img src="data:image/png;base64,AAAA" alt="x">`,
  ];
  for (const html of cases) assert.equal(rewritePostRawImages2029(html, opts), html, html);
});

test("malformed HTML never throws and never breaks surrounding markup", () => {
  const cases = [
    `<img src="${PNG}" alt="unterminated`,
    `<img src="${PNG}`,
    `<p>before</p><img src='${PNG}" alt="x"><p>after</p>`,
    `<img src="${PNG}" alt="x" "stray">`,
    `<img src=${PNG} alt=x>`,
    `<<img src="${PNG}">`,
    `<figure data-sod363-card="v1"><img src="${PNG}"`,
    "",
    null,
    undefined,
  ];
  for (const html of cases) {
    assert.equal(typeof rewritePostRawImages2029(html, opts), "string");
  }
  assert.equal(rewritePostRawImages2029(`<img src="${PNG}" alt="unterminated`, opts), `<img src="${PNG}" alt="unterminated`);
  assert.equal(rewritePostRawImages2029(`<img src="${PNG}" alt="x" "stray">`, opts), `<img src="${PNG}" alt="x" "stray">`);
  assert.equal(rewritePostRawImages2029(`<p>before</p><img src='${PNG}" alt="x"><p>after</p>`, opts), `<p>before</p><img src='${PNG}" alt="x"><p>after</p>`);
  // '>' inside a quoted attribute does not truncate the tag.
  const [tag] = imgs(rewritePostRawImages2029(`<img src="${PNG}" alt="a > b">`, opts));
  assert.equal(attr(tag, "alt"), "a > b");
  assert.equal(countAttr(tag, "srcset"), 1);
  // Self-closing and unquoted-attribute forms stay well-formed.
  assert.match(rewritePostRawImages2029(`<img src="${PNG}" alt="x" />`, opts), / sizes="[^"]+" data-sod-media-rendition="2029" loading="lazy"[^>]* \/>$/);
  // Missing config disables rewriting entirely (failure fallback = original markup).
  assert.equal(rewritePostRawImages2029(PLAIN, {}), PLAIN);
});

test("postRawImageSource only accepts canonical public raster URLs in this Storage", () => {
  assert.deepEqual(postRawImageSource(PNG, SB), { origin: SB, bucket: "gallery", path: "sod1820/posts/fz1073/plane-363-hamashiach-card-20261001.png" });
  assert.ok(postRawImageSource(`${SB}/storage/v1/object/public/media/a/b.WEBP`, SB));
  assert.ok(postRawImageSource(`${SB}/storage/v1/object/public/media/a/b.jpeg`, SB));
  assert.equal(postRawImageSource(PNG, ""), null);
  assert.equal(postRawImageSource(` ${PNG}`, SB), null);
  assert.equal(postRawImageSource("not a url", SB), null);
  assert.match(postRawImageSrcset(postRawImageSource(PNG, SB)), /width=480&resize=contain 480w, .*width=768&resize=contain 768w, .*width=941&resize=contain 941w$/);
});

test("surrounding post markup (text, video guard, links) is byte-identical outside img tags", () => {
  const html = `<p>טקסט <a href="https://example.com?a=1&b=2">קישור</a></p>${CARD}<video src="x.mp4" autoplay></video><h2>כותרת</h2>${PLAIN}<p>סוף</p>`;
  const out = preparePostRawMediaHtml2029(html, opts);
  const strip = (s) => s.replace(/<img\b(?:"[^"]*"|'[^']*'|[^'">])*>/g, "<img>");
  assert.equal(strip(out), strip(hardenPassiveMediaHtml(html)));
});

test("CanonicalMediaImage2029: primary defaults to eager + fetchPriority high, non-primary stays lazy, explicit overrides win", async () => {
  const cache = new URL("../node_modules/.cache/", import.meta.url).pathname;
  mkdirSync(cache, { recursive: true });
  const dir = mkdtempSync(join(cache, "canonical-media-img-"));
  await build({
    configFile: false, logLevel: "silent", root: dir,
    build: {
      ssr: new URL("../src/components/experience2029/CanonicalMediaImage2029.jsx", import.meta.url).pathname,
      outDir: dir, emptyOutDir: false, minify: false,
      rollupOptions: { external: ["react", "react-dom"], output: { format: "esm", entryFileNames: "img.mjs" } },
    },
  });
  const { default: Img } = await import(pathToFileURL(join(dir, "img.mjs")).href);
  const render = (props) => renderToStaticMarkup(React.createElement(Img, { src: "https://example.com/a.jpg", alt: "a", ...props }));
  const primary = render({ primary: true });
  assert.match(primary, /loading="eager"/);
  assert.match(primary, /fetchPriority="high"|fetchpriority="high"/i);
  const plain = render({});
  assert.match(plain, /loading="lazy"/);
  assert.doesNotMatch(plain, /fetchpriority/i);
  assert.match(render({ thumbnail: true }), /loading="lazy"/);
  const overridden = render({ primary: true, loading: "lazy", fetchPriority: "low" });
  assert.match(overridden, /loading="lazy"/);
  assert.match(overridden, /fetchpriority="low"/i);
  assert.match(render({ loading: "eager" }), /loading="eager"/);
  assert.match(primary, /src="https:\/\/example.com\/a.jpg"/);
  assert.match(primary, /alt="a"/);
});
