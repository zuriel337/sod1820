import React, { useState } from "react";
import { Link } from "react-router-dom";

function localPath(href) {
  try { const url = new URL(href); return `${url.pathname}${url.search}`; } catch { return null; }
}

function PendingRow({ item, onReview }) {
  const to = item.href ? localPath(item.href) : null;
  const line = <>
    <strong className="sod29-community-pending-author">{item.authorName}</strong>
    <span className="sod29-community-pending-line" dir="auto">{item.line}</span>
  </>;
  return <li data-pending-guest={item.id}>
    {to ? <Link to={to} className="sod29-community-pending-jump" title="מעבר להודעה">{line} <span aria-hidden="true">←</span></Link> : <span className="sod29-community-pending-jump">{line}</span>}
    <span className="sod29-community-pending-actions">
      <button type="button" className="sod29-community-text-action" onClick={() => onReview(item.id, "approve")}>אישור</button>
      <button type="button" className="sod29-community-text-action" onClick={() => onReview(item.id, "hide")}>הסתרה</button>
    </span>
  </li>;
}

// ZURIEL: don't make a moderator hunt the feed for a greyed-out guest message —
// pin the count and let it open into a list that jumps straight to each one.
export default function CommunityGuestReviewPanel2029({ pending, onReview }) {
  const [open, setOpen] = useState(false);
  if (!pending?.length) return null;
  return <section className="sod29-community-pending-panel" aria-label="הודעות אורח שממתינות לבדיקה">
    <button type="button" className="sod29-community-pending-toggle" aria-expanded={open} aria-controls="community-pending-guest-list" onClick={() => setOpen(value => !value)}>
      <span className="sod29-community-pending-dot" aria-hidden="true" />
      <span>{pending.length === 1 ? "הודעת אורח אחת פורסמה ועדיין לא נבדקה" : `${pending.length} הודעות אורח פורסמו ועדיין לא נבדקו`} · מוצגות באפור</span>
      <span aria-hidden="true">{open ? "▴" : "▾"}</span>
    </button>
    {open ? <ul id="community-pending-guest-list">
      {pending.map(item => <PendingRow key={item.id} item={item} onReview={onReview} />)}
    </ul> : null}
  </section>;
}
