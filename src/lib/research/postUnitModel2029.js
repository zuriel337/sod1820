// ONE unit model for the flagship series "מפת המציאות" (ZURIEL 12.11.2026, sections 3, 9 and 12). The same projection describes a unit of
// the Elections post (5107), the plane post (5112) and any other series post: identity, anchor, author, source, proven added-time, main
// message, media, numbers and links — plus the canonical REFERENCES an editor chose. It is derived from the DISPLAYED source and the
// existing proofs; it creates no engine, store, graph or ranking and copies no content. The array is also published on the existing
// research context (`dimensions.postUnits`) so a future hints pane can read identities and references from the same place.
// It is NOT an admission to any hints pane and NOT a research relation: series membership, "רמזים חזקים", the Reality Graph and the
// hints pane stay separate domains.
import { PROVEN_POST_SOURCE_UPDATES, addedDateLabel, plainDayLabel } from "./postSourceUpdates2029.js";
import { resolveUnitMessage, readLocalUnitChoices } from "./postSemanticDesign2029.js";
import { videoRefBySrc } from "./postVideoReferences2029.js";

export function classifyLink(href) {
  const h = String(href || "");
  if (/^\/(?:2029\/)?number\//.test(h)) return "number";
  if (/^\/topic\//.test(h)) return "topic";
  if (/^\/world\b/.test(h)) return "world";
  if (/^\/(?:2029\/)?post\//.test(h) || /^\/[^/?#]+\/?(?:[?#]|$)/.test(h)) return "post";
  if (/^https?:\/\//.test(h)) return "external";
  if (h.startsWith("#")) return "anchor";
  return "other";
}

const textOf = (node) => (node?.textContent || "").replace(/\s+/g, " ").trim();

// → [{ ref, key, postId, anchor, title, author, source, added, eventDate, sourceDate, message, media, numbers, links, references, seriesKey }]
export function buildPostUnitModels(root, { post, postHref = "", seriesKey = "reality-map" } = {}) {
  if (!root?.querySelectorAll || !post) return [];
  const postId = Number(post.id);
  const proven = Object.fromEntries((PROVEN_POST_SOURCE_UPDATES[postId] || []).map((entry) => [entry.targetId, entry]));
  const choices = readLocalUnitChoices(postId);
  const authors = [...new Set([...(Array.isArray(post.authors) ? post.authors : []), ...(post.author ? [post.author] : [])].map((v) => String(v).trim()).filter(Boolean))];
  const seen = new Set();
  const out = [];
  for (const unit of root.querySelectorAll("[data-sod-unit]")) {
    const key = unit.getAttribute("data-sod-unit");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const entry = proven[key] || null;
    const media = [...unit.querySelectorAll("video,img")].map((m) => {
      const src = m.tagName === "VIDEO" ? (m.querySelector("source")?.getAttribute("src") || m.getAttribute("src") || "") : (m.getAttribute("src") || "");
      const video = m.tagName === "VIDEO" ? videoRefBySrc(postId, src) : null;
      return { kind: m.tagName === "VIDEO" ? "video" : "image", src, videoId: video?.id || null, catalog: video?.catalog?.status || null };
    }).filter((m) => m.src);
    const numbers = [...new Set([...unit.querySelectorAll("[data-gem]")].map((n) => n.getAttribute("data-gem")).filter((v) => /^\d+$/.test(v)))].map(Number);
    const links = [...unit.querySelectorAll("a[href]")].filter((a) => !a.closest(".sod29-unit-extras,.sod29-unit-tools")).map((a) => ({ href: a.getAttribute("href"), kind: classifyLink(a.getAttribute("href")), label: textOf(a).slice(0, 80) }));
    out.push({
      ref: `posts:${postId}#${key}`, key, postId,
      anchor: `${postHref}#${encodeURIComponent(key)}`,
      title: textOf(unit.querySelector("h1,h2,h3,h4")).slice(0, 140),
      author: { names: authors },
      source: { sourceRef: `posts:${postId}`, slug: post.slug || null },
      added: entry ? { at: entry.updatedAt, label: addedDateLabel(entry) || null, basis: entry.timeBasis || "exact_pair", beforeRevision: entry.beforeRevision, afterRevision: entry.afterRevision } : null,
      eventDate: plainDayLabel(entry?.eventDate) || null,
      sourceDate: plainDayLabel(entry?.sourceDate) || null,
      message: resolveUnitMessage(postId, key),
      media, numbers, links,
      references: Array.isArray(choices[key]?.refs) ? choices[key].refs.map(({ kind, ref, href, mode }) => ({ kind, ref, href, mode })) : [],
      seriesKey,
    });
  }
  return out;
}
