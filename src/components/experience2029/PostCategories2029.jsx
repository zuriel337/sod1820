// Post categories as links, wherever a post is shown (like the classic home): each category opens its category page.
// "רמזים חזקים" is the flagship category and is listed first (no diamond mark in the chip). A category chip inside
// another link or a <summary> (`nested`) is a role="link" span, so no <a> is nested in an <a>.
import React from "react";
import { categoryLabel } from "../../lib/categoryIcons.js";
import { STRONG_HINT_CATEGORY } from "../StrongHintBadge.jsx";
import { canonicalPostCategories } from "../../lib/postCategoryIdentity.js";
import { postClassification2029 } from "../../lib/research/postsCatalog2029Projection.js";
import "./postCategories2029.css";

const categoryHref = (name) => `/2029/posts?category=${encodeURIComponent(name)}`;

function Chip({ name, nested, item }) {
  const strong = name === STRONG_HINT_CATEGORY;
  const className = `k29-cat${strong ? " is-strong" : ""}`;
  const title = item ? `${item.prefix}: ${name}` : strong ? "רמזים חזקים — לקטגוריה" : `${name} — לקטגוריה`;
  const body = item ? <><span className="k29-post-role">{item.prefix}:</span> {name}</> : categoryLabel(name);
  const href = item?.href || categoryHref(name);
  if (!nested) return <a className={className} href={href} title={title} data-post-classification={item?.role}>{body}</a>;
  const go = (event) => { event.preventDefault(); event.stopPropagation(); window.location.assign(href); };
  return <span className={className} role="link" tabIndex={0} title={title} onClick={go} data-post-classification={item?.role}
    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") go(event); }}>{body}</span>;
}

export default function PostCategories2029({ categories, post, compact = false, max = 4, nested = false, className = "" }) {
  // Opt in only on Posts surfaces. Home/World/Legacy consumers keep their existing
  // categories and navigation; no shared source category semantics are rewritten.
  if (post) {
    const { items } = postClassification2029(post);
    const visible = (compact ? items.filter(item => item.role !== "legacy-media-label") : items).slice(0, max);
    if (!visible.length) return null;
    return <span className={`k29-cats k29-post-classification${className ? ` ${className}` : ""}`} aria-label="סדרה וסיווג הפוסט">
      {visible.map(item => <Chip key={`${item.role}:${item.name}`} name={item.name} item={item} nested={nested} />)}
    </span>;
  }
  const list = canonicalPostCategories(categories);
  if (!list.length) return null;
  const ordered = [...list.filter((name) => name === STRONG_HINT_CATEGORY), ...list.filter((name) => name !== STRONG_HINT_CATEGORY)].slice(0, max);
  return <span className={`k29-cats${className ? ` ${className}` : ""}`} aria-label="קטגוריות הפוסט">
    {ordered.map((name) => <Chip key={name} name={name} nested={nested} />)}
  </span>;
}
