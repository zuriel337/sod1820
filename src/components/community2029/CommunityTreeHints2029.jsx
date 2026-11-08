import React from "react";
import { Link } from "react-router-dom";
import { BRAND_LOCKUP_NAV_2029 } from "../../lib/brandAssets2029.js";

// Hints that entered the tree, pinned as one line each at the top of the chat.
// The mark is the complete approved system lockup (never cropped or recolored).
export function TreeMark() {
  return <img className="sod29-tree-pin-mark" src={BRAND_LOCKUP_NAV_2029.src} width={22} height={22} alt="" aria-hidden="true" decoding="async" />;
}

function localPath(href) {
  try { const url = new URL(href); return `${url.pathname}${url.search}`; } catch { return null; }
}

export default function CommunityTreeHints2029({ hints }) {
  if (!hints?.length) return null;
  return <section className="sod29-tree-pins" aria-label="רמזים שנכנסו לעץ" data-tree-pins={hints.length}>
    <ul>
      {hints.map(hint => {
        const to = hint.href ? localPath(hint.href) : null;
        const content = <>
          <TreeMark />
          <strong className="sod29-tree-pin-label">נכנס לעץ</strong>
          <span className="sod29-tree-pin-line" dir="auto">{hint.line}</span>
        </>;
        return <li key={hint.id} data-tree-pin={hint.id}>
          {to ? <Link to={to} className="sod29-tree-pin" title={hint.authorName ? `${hint.authorName}: ${hint.line}` : hint.line}>{content}</Link> : <span className="sod29-tree-pin">{content}</span>}
        </li>;
      })}
    </ul>
  </section>;
}
