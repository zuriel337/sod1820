import React from "react";
import { Link } from "react-router-dom";
import { cleanName } from "../lib/galleryName.js";
import { stripHtml } from "../lib/format.js";
import { isNewSince } from "../lib/crossesNew.js";
import { domNum, hintNums, hintTags, shortDate, streamLabel } from "../lib/reality.js";
import { trackImageClick } from "../lib/tracking.js";

// Single hint card — CSS classes (rs-card, rs-imgwrap, etc.) must be injected by the parent layout.
// onOpen() — called when user clicks the image to open lightbox.
// onPick(n) — called when user clicks an extra number tag.
// onEdit() — called when admin clicks ✏️ to open edit modal.
export default function HintCard({ hint: h, idx = 0, cutoff, palette, onPick, onOpen, onAddToStream, onEdit }) {
  const fresh = cutoff ? isNewSince(h, cutoff) : false;
  const v = domNum(h);
  const title = cleanName(h.name);
  const tags = hintTags(h);
  const extraNums = hintNums(h).filter(n => n !== v).slice(0, 3);
  const desc = h.description ? stripHtml(h.description) : null;
  const added = streamLabel(h);   // 🌊 «נוסף לזרם» — מתי התמונה נכנסה לזרם (לא מתי האירוע קרה)

  return (
    <article className={`rs-card${fresh ? " fresh" : ""}`} style={{ animationDelay: `${Math.min(idx, 14) * 35}ms` }}>
      {added && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 11px", fontSize: 11, fontWeight: 800,
          color: fresh ? "#ffc0c9" : (palette?.accentText || "#c9a227"),
          background: fresh ? "linear-gradient(90deg,rgba(224,85,106,.16),transparent)" : "linear-gradient(90deg,rgba(212,175,55,.10),transparent)",
          borderBottom: `1px solid ${palette?.border || "#2c2145"}` }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", flex: "none", background: fresh ? "#e0556a" : (palette?.accentText || "#c9a227"), boxShadow: fresh ? "0 0 7px #e0556a" : "none" }} />
          {fresh ? "🆕 נוסף לזרם" : "נוסף לזרם"} · {added}
        </div>
      )}
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
        {onEdit && (
          <button
            onClick={e => { e.stopPropagation(); onEdit(); }}
            title="ערוך תמונה"
            style={{ position: "absolute", bottom: 9, insetInlineStart: 9, zIndex: 3, background: "rgba(0,0,0,0.55)", color: "#fff",
              border: "1px solid rgba(255,255,255,0.3)", borderRadius: 999, width: 26, height: 26, fontSize: 12, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center" }}
          >✏️</button>
        )}
      </div>
      {(title || desc || shortDate(h) || tags.length > 0 || extraNums.length > 0 || v != null) && (
        <div className="rs-body">
          {shortDate(h) && <div className="rs-date">🗓️ {shortDate(h)}</div>}
          {title && (v != null
            ? <Link to={`/number/${v}`} className="rs-title rs-titlelink" title={`לדף המספר ${v}`}>{title}</Link>
            : <div className="rs-title">{title}</div>)}
          {desc && <div className="rs-title">{desc}</div>}
          {(tags.length > 0 || extraNums.length > 0) && (
            <div className="rs-tags">
              {tags.map((t, i) => <span key={`t${i}`} className="rs-tag">{t}</span>)}
              {extraNums.map(n => <button key={`n${n}`} className="rs-tag" onClick={() => onPick?.(n)}>#{n}</button>)}
            </div>
          )}
          {/* קישור ברור לדף המספר הקנוני — כל רמז הוא שער לדף המספר (עץ אחד), לא פוסט */}
          {v != null && (
            <Link to={`/number/${v}`} className="rs-golink" title={`לדף המספר ${v}`}>🔢 לדף המספר {v} ←</Link>
          )}
        </div>
      )}
    </article>
  );
}
