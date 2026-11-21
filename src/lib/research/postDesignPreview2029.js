function sourceDocument(html = "") {
  if (!globalThis.document?.createElement) return null;
  const template = document.createElement("template");
  template.innerHTML = html;
  return template.content;
}

function comparableImage(src) {
  try {
    const url = new URL(src, "https://sod1820.co.il");
    return /^https?:$/.test(url.protocol) ? url.origin + url.pathname : "";
  } catch {
    return "";
  }
}

// Only a cover with a demonstrable primary-player duplicate yields. Source
// clips inside a unit or marked secondary do not own the header.
export function previewPostMedia2029(post) {
  const cover = post?.image_url && comparableImage(post.image_url);
  if (!cover) return { duplicateCover: false };
  const source = sourceDocument(post.content);
  const media = [...(source?.querySelectorAll("video, iframe[src]") || [])].filter(node => {
    if (node.closest('[data-sod-unit], [data-media-role="secondary"], aside, details')) return false;
    return node.tagName === "VIDEO" || /(?:youtube(?:-nocookie)?\.com\/embed\/|player\.vimeo\.com\/video\/)/i.test(node.getAttribute("src"));
  });
  const primary = media.find(node => node.closest('[data-media-role="primary"]')) || media[0];
  if (!primary) return { duplicateCover: false };
  const poster = primary.getAttribute("poster") || primary.getAttribute("data-poster");
  if (poster && comparableImage(poster) === cover) return { duplicateCover: true };
  const videoId = primary.getAttribute("src")?.match(/\/embed\/([A-Za-z0-9_-]{11})(?:[?#/]|$)/)?.[1];
  const youtubeCover = videoId && /\/\/i[0-9]?\.ytimg\.com\//.test(cover) && cover.includes(`/vi/${videoId}/`);
  return { duplicateCover: Boolean(youtubeCover) };
}

export function previewPostSourceLinks2029(html) {
  if (!html.includes("<a")) return [];
  const source = sourceDocument(html);
  const links = new Map();
  for (const anchor of source?.querySelectorAll("a[href]") || []) {
    if (anchor.closest("[data-sod-unit]")) continue;
    const href = anchor.getAttribute("href").trim();
    const label = (anchor.textContent || anchor.getAttribute("aria-label") || "").trim();
    if (!label || !/^(?:https?:\/\/|\/(?:post|number|topic)\/)/i.test(href) || links.has(href)) continue;
    links.set(href, { href, label });
    if (links.size === 12) break;
  }
  return [...links.values()];
}
