import React, { useState } from "react";
import { Link } from "react-router-dom";
import { BRAND_LOCKUP_NAV_2029 } from "../../lib/brandAssets2029.js";

// Hints that entered the tree, pinned at the top of the chat. The latest one is a
// single line; pressing the toggle shows the earlier ones, one line each.
// The mark is the complete approved system lockup (never cropped or recolored).
export function TreeMark() {
  return <img className="sod29-tree-pin-mark" src={BRAND_LOCKUP_NAV_2029.src} width={22} height={22} alt="" aria-hidden="true" decoding="async" />;
}

function localPath(href) {
  try { const url = new URL(href); return `${url.pathname}${url.search}`; } catch { return null; }
}

// The numbers are also the marker a future recognition feature (a live meter or the
// Golden Projector) would look up by; showing them here is only the visible half.
function PinNumbers({ numbers }) {
  if (!numbers?.length) return null;
  return <span className="sod29-tree-pin-numbers" aria-label="מספרים מסומנים">{numbers.map(n => <b key={n}>{n}</b>)}</span>;
}

function PinLine({ hint }) {
  const to = hint.href ? localPath(hint.href) : null;
  const content = <>
    <TreeMark />
    <strong className="sod29-tree-pin-label">נכנס לעץ</strong>
    <PinNumbers numbers={hint.numbers} />
    <span className="sod29-tree-pin-line" dir="auto">{hint.line}</span>
  </>;
  const title = hint.authorName ? `${hint.authorName}: ${hint.line}` : hint.line;
  return to ? <Link to={to} className="sod29-tree-pin" title={title}>{content}</Link> : <span className="sod29-tree-pin" title={title}>{content}</span>;
}

export default function CommunityTreeHints2029({ hints }) {
  const [open, setOpen] = useState(false);
  if (!hints?.length) return null;
  const [latest, ...earlier] = hints;
  return <section className="sod29-tree-pins" aria-label="רמזים שנכנסו לעץ" data-tree-pins={hints.length}>
    <div className="sod29-tree-pins-head" data-tree-pin={latest.id}>
      <PinLine hint={latest} />
      {earlier.length ? <button type="button" className="sod29-tree-pins-toggle" aria-expanded={open} aria-controls="community-tree-pins-earlier" onClick={() => setOpen(value => !value)}>
        {open ? "סגירה" : `עוד ${earlier.length}`} <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button> : null}
    </div>
    {earlier.length ? <ul id="community-tree-pins-earlier" hidden={!open}>
      {earlier.map(hint => <li key={hint.id} data-tree-pin={hint.id}><PinLine hint={hint} /></li>)}
    </ul> : null}
  </section>;
}
