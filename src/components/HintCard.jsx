import React from "react";
import { Link } from "react-router-dom";
import { cleanName } from "../lib/galleryName.js";
import { stripHtml } from "../lib/format.js";
import { isNewSince } from "../lib/crossesNew.js";
import { domNum, hintNums, hintTags, shortDate } from "../lib/reality.js";
import { trackImageClick } from "../lib/tracking.js";

// Single hint card — CSS classes (rs-card, rs-imgwrap, etc.) must be injected by the parent layout.
// onOpen() — called when user clicks the image to open lightbox.
// onPick(n) — called when user clicks an extra number tag.
export default function HintCard({ hint: h, idx = 0, cutoff, palette, onPick, onOpen, onAddToStream }) {
  const fresh = cutoff ? isNewSince(h, cutoff) : false;
  const v = domNum(h);
  const title = cleanName(h.name);
  const tags = hintTags(h);
  const extraNums = hintNums(h).filter(n => n !== v).slice(0, 3);
  const desc = !title && h.description ? stripHtml(h.description) : null;

  return (
    <article className={`rs-card${fresh ? " fresh" : ""}`} style={{ animationDelay: `${Math.min(idx, 14) * 35}ms` }}>
      <div className="rs-imgwrap" onClick={() => { trackImageClick(h.id, v); onOpen?.(); }}>
        {h.image_url
          ? <img src={h.image_url} alt={title || ""} loading="lazy" />
          : <div style={{ height: 160, background: palette?.cardGrad }} />}
        <span className="rs-shade" />
        {fresh && <span className="rs-new">🆕 חדש</span>}
        {v != null && <Link to={`/number/${v}`} className="rs-num" onClick={e => e.stopPropagation()} title="לדף המספר">{v}</Link>}
        <span className="rs-zoom" aria-hidden>⤢</span>
        {onAddToStream && (
          <button
            onClick={e => { e.stopPropagation(); onAddToStream(); }}
            title="הוסף לזרם המציאות"
            style={{ position: "absolute", bottom: 9, insetInlineEnd: 9, zIndex: 3, background: "rgba(212,175,55,0.92)", color: "#1a0e00",
              border: "none", borderRadius: 999, width: 26, height: 26, fontSize: 14, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}
          >+</button>
        )}
      </div>
      {(title || desc || shortDate(h) || tags.length > 0 || extraNums.length > 0) && (
        <div className="rs-body">
          {shortDate(h) && <div className="rs-date">🗓️ {shortDate(h)}</div>}
          {title && <div className="rs-title">{title}</div>}
          {desc && <div className="rs-title">{desc}</div>}
          {(tags.length > 0 || extraNums.length > 0) && (
            <div className="rs-tags">
              {tags.map((t, i) => <span key={`t${i}`} className="rs-tag">{t}</span>)}
              {extraNums.map(n => <button key={`n${n}`} className="rs-tag" onClick={() => onPick?.(n)}>#{n}</button>)}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
