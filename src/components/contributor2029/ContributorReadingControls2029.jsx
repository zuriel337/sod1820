import React, { useId, useState } from "react";
import { use2029Palette } from "../../lib/palette.js";
import "./contributorReadingControls2029.css";

const BIO_MAX = 600;
const FEATURED_MAX = 3;
const safeHref = (href) => typeof href === "string" && (/^\/(?!\/)/.test(href) || /^https:\/\//i.test(href)) ? href : "";
const text = (value) => typeof value === "string" ? value.trim() : "";

const useScope = () => {
  const P = use2029Palette();
  return { "--rc-card": P.card, "--rc-soft": P.cardSoft, "--rc-ink": P.ink, "--rc-muted": P.inkSoft,
    "--rc-border": P.border, "--rc-accent": P.accentText, "--rc-gold": P.brandGold, "--rc-focus": P.focusRing || P.accent };
};

export function WriterReadingActions2029({ saved = false, onSave, onResume, isOwner = false, onFeature, featured = false, busy = false, status = "" }) {
  const scope = useScope();
  const message = text(status);
  return <div className="rc-actions" dir="rtl" style={scope} aria-busy={busy || undefined}>
    {typeof onSave === "function" ? <button type="button" className="rc-btn" aria-pressed={Boolean(saved)} disabled={busy} onClick={() => onSave(!saved)}>{saved ? "נשמר" : "שמירה לקריאה"}</button> : null}
    {typeof onResume === "function" ? <button type="button" className="rc-btn" disabled={busy} onClick={() => onResume()}>המשך קריאה</button> : null}
    {isOwner && typeof onFeature === "function" ? <button type="button" className="rc-btn" aria-pressed={Boolean(featured)} disabled={busy} onClick={() => onFeature(!featured)}>{featured ? "ביטול בחירה" : "בחירה להצגה"}</button> : null}
    {message ? <span className="rc-status" role="status">{message}</span> : null}
  </div>;
}

export function WriterReadingSummary2029({ resume, savedCount, onOpenWorkspace, localOnly = false }) {
  const scope = useScope();
  const href = safeHref(resume?.href);
  const title = text(resume?.title);
  const count = Number.isFinite(savedCount) && savedCount >= 0 ? Math.floor(savedCount) : null;
  if (!href && count === null && typeof onOpenWorkspace !== "function") return null;
  return <section className="rc-summary" dir="rtl" style={scope} aria-label="הקריאה שלי">
    <span className="rc-kicker">פרטי, רק לך{localOnly ? " · נשמר במכשיר זה בלבד" : ""}</span>
    {href ? <a className="rc-link" href={href}>להמשיך לקרוא{title ? `: ${title}` : ""}</a> : null}
    {count !== null ? <span className="rc-muted">נשמרו לקריאה: <bdi>{count}</bdi></span> : null}
    {typeof onOpenWorkspace === "function" ? <button type="button" className="rc-btn" onClick={() => onOpenWorkspace()}>לאזור האישי</button> : null}
  </section>;
}

export function WriterFeatured2029({ items, writerName }) {
  const scope = useScope();
  const list = (Array.isArray(items) ? items : []).map((item) => ({ id: item?.id, title: text(item?.title), href: safeHref(item?.href) }))
    .filter((item) => item.id != null && item.title && item.href).slice(0, FEATURED_MAX);
  const headingId = useId();
  if (!list.length) return null;
  const name = text(writerName);
  return <section className="rc-featured" dir="rtl" style={scope} aria-labelledby={headingId}>
    <h3 id={headingId} className="rc-heading">בחירת הכותב{name ? <span className="rc-muted"> · {name}</span> : null}</h3>
    <ul className="rc-list">{list.map((item) => <li key={item.id}><a className="rc-link" href={item.href}>{item.title}</a></li>)}</ul>
  </section>;
}

const STATE_MESSAGE = {
  saving: "שומר…",
  saved: "ההקדמה נשמרה ומוצגת בפומבי.",
  error: "השמירה נכשלה. הטקסט נשמר בשדה — אפשר לנסות שוב.",
  login_required: "כדי לשמור יש להתחבר. הטקסט נשמר בשדה.",
};

export function WriterIntroductionEditor2029({ bio, onSave, state = "idle", onClose }) {
  const scope = useScope();
  const [draft, setDraft] = useState(typeof bio === "string" ? bio : "");
  const id = useId();
  const length = Array.from(draft).length;
  const over = length > BIO_MAX;
  const saving = state === "saving";
  const message = STATE_MESSAGE[state] || "";
  return <form className="rc-editor" dir="rtl" style={scope} onSubmit={(event) => { event.preventDefault(); if (!saving && !over && typeof onSave === "function") onSave(draft.trim()); }}>
    <label className="rc-heading" htmlFor={`${id}-bio`}>הקדמה ציבורית</label>
    <p id={`${id}-hint`} className="rc-muted">ההקדמה תוצג לכל מי שנכנס לעמוד הכותב. אין שמירה אוטומטית — היא נשמרת רק בלחיצה על הכפתור.</p>
    <textarea id={`${id}-bio`} className="rc-input" value={draft} rows={5} maxLength={BIO_MAX * 2} aria-describedby={`${id}-hint ${id}-count`} aria-invalid={over || state === "error" || undefined}
      onChange={(event) => setDraft(event.target.value)} />
    <span id={`${id}-count`} className="rc-muted" data-over={over}><bdi>{length}</bdi> / <bdi>{BIO_MAX}</bdi>{over ? " — יש לקצר את הטקסט" : ""}</span>
    {message ? <span className="rc-status" role={state === "error" || state === "login_required" ? "alert" : "status"} data-state={state}>{message}</span> : null}
    <div className="rc-row">
      <button type="submit" className="rc-btn rc-primary" disabled={saving || over}>שמירת הקדמה ציבורית</button>
      {typeof onClose === "function" ? <button type="button" className="rc-btn" onClick={() => onClose()}>סגירה</button> : null}
    </div>
  </form>;
}
