// Post categories as links, wherever a post is shown (like the classic home): each category opens its category page.
// "רמזים חזקים" is the flagship category and gets the canonical strong-hint mark (diamond) first. A category chip inside
// another link or a <summary> (`nested`) is a role="link" span, so no <a> is nested in an <a>.
import React from "react";
import { categoryLabel, categoryIcon } from "../../lib/categoryIcons.js";
import { STRONG_HINT_CATEGORY } from "../StrongHintBadge.jsx";
import "./postCategories2029.css";

const categoryHref = (name) => `/category/${encodeURIComponent(name)}`;

function Chip({ name, nested }) {
  const strong = name === STRONG_HINT_CATEGORY;
  const className = `k29-cat${strong ? " is-strong" : ""}`;
  const title = strong ? "רמז חזק — לקטגוריה" : `${name} — לקטגוריה`;
  const body = strong ? <><span aria-hidden="true">{categoryIcon(name)}</span> רמז חזק</> : categoryLabel(name);
  if (!nested) return <a className={className} href={categoryHref(name)} title={title}>{body}</a>;
  const go = (event) => { event.preventDefault(); event.stopPropagation(); window.location.assign(categoryHref(name)); };
  return <span className={className} role="link" tabIndex={0} title={title} onClick={go}
    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") go(event); }}>{body}</span>;
}

export default function PostCategories2029({ categories, max = 4, nested = false, className = "" }) {
  const list = (Array.isArray(categories) ? categories : []).map((name) => String(name || "").trim()).filter(Boolean);
  if (!list.length) return null;
  const ordered = [...list.filter((name) => name === STRONG_HINT_CATEGORY), ...list.filter((name) => name !== STRONG_HINT_CATEGORY)].slice(0, max);
  return <span className={`k29-cats${className ? ` ${className}` : ""}`} aria-label="קטגוריות הפוסט">
    {ordered.map((name) => <Chip key={name} name={name} nested={nested} />)}
  </span>;
}
