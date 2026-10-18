// POST_RAW_MEDIA_RENDITION_2029_V1
// Opt-in 2029 Post presentation for raw <img> tags inside authored post HTML.
// The original src and alt stay in the DOM (fallback + SEO); this only appends responsive
// delivery attributes for public raster files in this project's Supabase Storage.
// hardenPassiveMediaHtml (mediaEgressGuard.js) is intentionally untouched: Legacy and every
// other caller keep their exact behavior, and only Post2029Page calls this module.
import { hardenPassiveMediaHtml } from "./mediaEgressGuard.js";

// Reading column is max 576px; 941 is the widest rendition worth fetching for it at 2-3x DPR.
export const POST_RAW_IMAGE_WIDTHS = Object.freeze([480, 768, 941]);
export const POST_RAW_IMAGE_SIZES = "(max-width: 576px) 100vw, 576px";

// Verified intrinsic geometry for authored figures that carry a marker attribute on the
// <figure> directly wrapping the <img>. Applied only when the img has no width/height of its own.
// Extend by adding rows; no DB or CSS change is needed.
export const POST_RAW_IMAGE_DIMENSION_POLICIES = Object.freeze([
  Object.freeze({ figureAttr: "data-sod363-card", figureValue: "v1", width: 941, height: 1672 }),
]);

const OBJECT_PATH = /^\/storage\/v1\/object\/public\/([A-Za-z0-9._-]+)\/((?:[A-Za-z0-9._~%-]+\/)*[A-Za-z0-9._~%-]+\.(?:png|jpe?g|webp))$/i;
const UNSAFE_ENCODED = /%(?:2e|2f|5c|00)/i;

const ATTR = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const TAG_BODY = `(?:"[^"]*"|'[^']*'|[^'">])*`;
const IMG_OR_FIGURE_IMG = new RegExp(`(<figure\\b(${TAG_BODY})>\\s*)?<img\\b(${TAG_BODY})>`, "gi");
const PICTURE_SPAN = /<picture\b[\s\S]*?<\/picture\s*>/gi;

function parseAttrs(raw) {
  const attrs = [];
  for (const m of raw.matchAll(ATTR)) {
    attrs.push({ name: m[1].toLowerCase(), value: m[2] ?? m[3] ?? m[4] ?? null });
  }
  // Anything the tokenizer could not consume (stray quotes etc.) marks the tag as malformed.
  const residue = raw.replace(ATTR, "").replace(/\s+/g, "");
  return { attrs, malformed: residue !== "" };
}

function attrValue(attrs, name) {
  const hit = attrs.find((a) => a.name === name);
  return hit ? hit.value : undefined;
}

const hasAttr = (attrs, name) => attrs.some((a) => a.name === name);

/**
 * Returns { origin, bucket, path } for a canonical public raster URL in this project's Storage,
 * or null for anything else (external, GIF/SVG, query/hash/credentials, non-canonical form).
 */
export function postRawImageSource(src, supabaseUrl) {
  if (typeof src !== "string" || !src || /[\s\u0000-\u001f]/.test(src) || !supabaseUrl) return null;
  let url;
  let base;
  try {
    url = new URL(src);
    base = new URL(supabaseUrl);
  } catch {
    return null;
  }
  if (url.href !== src || url.protocol !== "https:" || url.origin !== base.origin) return null;
  if (url.search || url.hash || url.username || url.password) return null;
  if (url.pathname.includes("..") || url.pathname.includes("//") || UNSAFE_ENCODED.test(url.pathname)) return null;
  const match = OBJECT_PATH.exec(url.pathname);
  return match ? { origin: url.origin, bucket: match[1], path: match[2] } : null;
}

export function postRawImageRenditionUrl(source, width) {
  return `${source.origin}/storage/v1/render/image/public/${source.bucket}/${source.path}?width=${width}&resize=contain`;
}

export function postRawImageSrcset(source, widths = POST_RAW_IMAGE_WIDTHS) {
  return widths.map((w) => `${postRawImageRenditionUrl(source, w)} ${w}w`).join(", ");
}

function policyDimensions(figureAttrsRaw, policies) {
  if (figureAttrsRaw == null) return null;
  const { attrs, malformed } = parseAttrs(figureAttrsRaw);
  if (malformed) return null;
  return policies.find((p) => attrValue(attrs, p.figureAttr) === p.figureValue) || null;
}

function rewriteImgTag(match, figureOpen, figureAttrsRaw, imgAttrsRaw, options) {
  const { supabaseUrl, hasCanonicalCover, dimensionPolicies } = options;
  const selfClose = /(?<=["'\s])\/\s*$/.test(imgAttrsRaw);
  const attrsRaw = selfClose ? imgAttrsRaw.replace(/\s*\/\s*$/, "") : imgAttrsRaw;
  const { attrs, malformed } = parseAttrs(attrsRaw);
  if (malformed) return match;
  // Duplicate or missing src, or anything already responsive/rendered: leave the tag alone.
  if (attrs.filter((a) => a.name === "src").length !== 1) return match;
  if (["srcset", "sizes", "data-sod-media-rendition"].some((n) => hasAttr(attrs, n))) return match;
  const source = postRawImageSource(attrValue(attrs, "src"), supabaseUrl);
  if (!source) return match;

  const add = [`srcset="${postRawImageSrcset(source).replace(/&/g, "&amp;")}"`, `sizes="${POST_RAW_IMAGE_SIZES}"`, `data-sod-media-rendition="2029"`];
  if (!hasAttr(attrs, "loading")) add.push(`loading="lazy"`);
  if (!hasAttr(attrs, "decoding")) add.push(`decoding="async"`);
  if (hasCanonicalCover && !hasAttr(attrs, "fetchpriority")) add.push(`fetchpriority="low"`);

  const policy = policyDimensions(figureOpen ? figureAttrsRaw : null, dimensionPolicies);
  if (policy && !hasAttr(attrs, "width") && !hasAttr(attrs, "height")) {
    const style = attrValue(attrs, "style") || "";
    const fixedHeight = /(?:^|;)\s*height\s*:\s*(?!auto\b)/i.test(style);
    if (!fixedHeight) add.push(`width="${policy.width}"`, `height="${policy.height}"`);
  }

  const tag = `<img${attrsRaw} ${add.join(" ")}${selfClose ? " /" : ""}>`;
  return `${figureOpen || ""}${tag}`;
}

/**
 * Appends responsive delivery attributes to eligible raw <img> tags. Pure string transform;
 * any non-eligible or malformed tag, and all other markup, is returned byte-for-byte.
 */
export function rewritePostRawImages2029(html, {
  supabaseUrl,
  hasCanonicalCover = false,
  dimensionPolicies = POST_RAW_IMAGE_DIMENSION_POLICIES,
} = {}) {
  if (!html) return "";
  const text = String(html);
  if (!supabaseUrl || !/<img\b/i.test(text)) return text;
  const options = { supabaseUrl, hasCanonicalCover: !!hasCanonicalCover, dimensionPolicies };
  const pictures = [...text.matchAll(PICTURE_SPAN)].map((m) => [m.index, m.index + m[0].length]);
  try {
    return text.replace(IMG_OR_FIGURE_IMG, (match, figureOpen, figureAttrs, imgAttrs, offset) => {
      const at = offset + (figureOpen ? figureOpen.length : 0);
      if (pictures.some(([from, to]) => at >= from && at < to)) return match;
      return rewriteImgTag(match, figureOpen, figureAttrs, imgAttrs, options);
    });
  } catch {
    return text;
  }
}

/** Post2029Page entry point: responsive raw images plus the shared passive video/audio guard. */
export function preparePostRawMediaHtml2029(html, options) {
  return hardenPassiveMediaHtml(rewritePostRawImages2029(html, options));
}
