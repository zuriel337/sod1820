import React, { useEffect, useId, useRef, useState } from "react";
import { use2029Palette } from "../../lib/palette.js";
import { bilingualDateLabel } from "../../lib/relativeTime2029.js";
import "./contributorPublicExtras2029.css";

const MESSAGE_MAX = 4000;
const safeUrl = (url) => typeof url === "string" && (/^\/(?!\/)/.test(url) || /^https:\/\//i.test(url)) ? url : "";
const text = (value) => typeof value === "string" ? value.trim() : "";
const KIND_LABELS = { gallery: "גלריה", post: "פוסט", article: "מאמר", link: "קישור", value: "ערך", note: "הערה", text: "טקסט", image: "תמונה", media: "מדיה", video: "וידאו", audio: "שמע" };
const kindLabel = (kind) => {
  const raw = text(kind);
  if (!raw) return "";
  const known = KIND_LABELS[raw.toLowerCase().replace(/[\s-]+/g, "_")];
  return known || (/[\u0590-\u05FF]/.test(raw) ? raw : "");
};
const hasValue = (value) => value != null && text(String(value)) !== "";
const mediaOf = (item, image) => (Array.isArray(item?.media) ? item.media : []).map((m) => ({ url: safeUrl(m?.url), caption: text(m?.caption) })).filter((m) => m.url && m.url !== image);
const tokens = (P) => ({ "--cx-card": P.card, "--cx-soft": P.cardSoft, "--cx-ink": P.ink, "--cx-muted": P.inkSoft,
  "--cx-border": P.border, "--cx-accent": P.accentText, "--cx-gold": P.brandGold, "--cx-focus": P.focusRing || P.accent });

export function ContributorOverview2029({ overview }) {
  const P = use2029Palette();
  const ready = overview?.state === "ready";
  const joined = ready ? bilingualDateLabel(overview.joinedAt) : "";
  const tenure = ready ? text(overview.tenureLabel) : "";
  const since = ready ? bilingualDateLabel(overview.pageSince) : "";
  const loading = overview?.state === "loading";
  const lastSeenReady = ready && overview.lastSeenState === "ready";
  const lastSeen = lastSeenReady ? bilingualDateLabel(overview.lastSeenAt) : "";
  const lastSeenText = lastSeen || (!ready ? "" : overview.lastSeenState === "loading" ? "נטען…" : "חיבור אחרון אינו מוצג");
  const about = ready ? text(overview.about) : "";
  const focus = ready ? text(overview.currentFocus) : "";
  const rows = [["חבר מאז", joined, joined ? tenure : ""], ["הדף פעיל מאז", since, ""], ["חיבור אחרון", lastSeenText, ""]].filter(([, value]) => value);
  return <section className="cx-overview" style={tokens(P)} aria-labelledby="cx-overview-title" data-state={ready ? "ready" : loading ? "loading" : "unavailable"}>
    <h2 id="cx-overview-title" className="cx-title cx-sr">סקירה</h2>
    {!ready ? <p className="cx-muted" role="status">{loading ? "טוען את פרטי הסקירה…" : "פרטי הסקירה אינם זמינים כרגע."}</p> : <>
      {rows.length ? <dl className="cx-facts">{rows.map(([label, value, note]) => <div key={label}><dt>{label}</dt>
        <dd><bdi>{value}</bdi>{note ? <span className="cx-muted"> · {note}</span> : null}</dd></div>)}</dl>
        : <p className="cx-muted">תאריכי חברות אינם זמינים.</p>}
      {about ? <div className="cx-block"><h3>אודות</h3><p>{about}</p></div> : null}
      {focus ? <div className="cx-block"><h3>מיקוד נוכחי</h3><p>{focus}</p></div> : null}
    </>}
  </section>;
}

export function ContributorStudio2029({ items, available }) {
  const P = use2029Palette();
  const list = Array.isArray(items) ? items.filter((item) => item && (text(item.title) || text(item.body) || safeUrl(item.imageUrl) || safeUrl(item.href) || hasValue(item.value) || mediaOf(item, "").length)) : [];
  if (available !== false && !list.length) return null;
  return <section className="cx-studio" style={tokens(P)} aria-labelledby="cx-studio-title">
    <h2 id="cx-studio-title" className="cx-title">חומרים מהסטודיו</h2>
    {available === false ? <p className="cx-muted" role="status">הסטודיו אינו זמין כרגע.</p>
      : <ul className="cx-cards">{list.map((item, index) => {
        const title = text(item.title), body = text(item.body), image = safeUrl(item.imageUrl), href = safeUrl(item.href);
        const date = bilingualDateLabel(item.createdAt);
        const media = mediaOf(item, image), kind = kindLabel(item.kind);
        return <li key={item.id ?? index} className="cx-card">
          {kind || date ? <div className="cx-card-meta">{kind ? <span className="cx-kind">{kind}</span> : null}
            {date ? <time dateTime={item.createdAt}>{date}</time> : null}</div> : null}
          {title ? <h3>{href ? <a href={href}>{title}</a> : title}</h3> : null}
          {image ? <img src={image} alt="" loading="lazy" decoding="async" /> : null}
          {body ? <p className="cx-body">{body}</p> : null}
          {media.length ? <div className="cx-media">{media.map((m) => <figure key={m.url}><img src={m.url} alt={m.caption} loading="lazy" decoding="async" />
            {m.caption ? <figcaption>{m.caption}</figcaption> : null}</figure>)}</div> : null}
          {href && !title ? <a className="cx-cta" href={href}>פתיחה</a> : null}
          {hasValue(item.value) ? <span className="cx-value"><bdi className="pc-number">{String(item.value)}</bdi></span> : null}
        </li>;
      })}</ul>}
  </section>;
}

export function ContributorActionRow2029({ children }) {
  const P = use2029Palette();
  const items = React.Children.toArray(children);
  if (!items.length) return null;
  return <div className="cx-actions" style={tokens(P)} role="group" aria-label="פעולות על הכותב">{items}</div>;
}

const MESSAGE_STATUS = {
  sending: "שולח…", sent: "ההודעה נשלחה.", error: "לא התקבל אישור שליחה. בדקו בתיבת ההודעות לפני ניסיון נוסף.",
  login_required: "כדי לשלוח הודעה צריך להתחבר.", unavailable: "שליחת הודעות אינה זמינה כרגע.",
};

export function ContributorMessageDialog2029({ open, onClose, onSubmit, state = "idle", writerName }) {
  const P = use2029Palette();
  const [body, setBody] = useState("");
  const titleId = useId(), areaId = useId(), statusId = useId();
  const dialog = useRef(null), area = useRef(null), opener = useRef(null);
  const busy = state === "sending";
  const blocked = state === "login_required" || state === "unavailable";
  const trimmed = body.trim();
  const canSend = !busy && !blocked && state !== "sent" && trimmed.length > 0 && body.length <= MESSAGE_MAX;
  useEffect(() => {
    if (!open) return undefined;
    opener.current = document.activeElement;
    (area.current || dialog.current)?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; opener.current?.focus?.(); };
  }, [open]);
  useEffect(() => { if (state === "sent") setBody(""); }, [state]);
  useEffect(() => {
    if (!open) return;
    const active = document.activeElement;
    if (busy) { if (!dialog.current?.contains(active) || active === area.current || active?.disabled) dialog.current?.focus(); }
    else if (!blocked && state !== "sent" && (active === dialog.current || active === document.body)) (area.current || dialog.current)?.focus();
    else if (active?.disabled || !dialog.current?.contains(active)) dialog.current?.focus();
  }, [open, busy, blocked, state]);
  if (!open) return null;
  const keys = (event) => {
    if (event.key === "Escape") { event.stopPropagation(); if (!busy) onClose?.(); return; }
    if (event.key !== "Tab") return;
    const nodes = [...dialog.current.querySelectorAll("button:not([disabled]),textarea:not([disabled]),a[href]")];
    if (!nodes.length) { event.preventDefault(); dialog.current.focus(); return; }
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  const submit = (event) => { event.preventDefault(); if (canSend) onSubmit?.(trimmed); };
  const status = MESSAGE_STATUS[state] || "";
  return <div className="cx-backdrop" style={tokens(P)} onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose?.(); }}>
    <div className="cx-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} dir="rtl" lang="he" ref={dialog} tabIndex={-1} onKeyDown={keys}>
      <h2 id={titleId} className="cx-title">{writerName ? `הודעה ל${writerName}` : "הודעה לכותב"}</h2>
      <form onSubmit={submit}>
        <label htmlFor={areaId}>ההודעה שלך</label>
        <textarea id={areaId} ref={area} value={body} maxLength={MESSAGE_MAX} rows={6} disabled={busy || blocked || state === "sent"}
          aria-describedby={statusId} onChange={(event) => setBody(event.target.value)} />
        <div className="cx-count cx-muted" aria-hidden="true"><bdi>{body.length}</bdi> / <bdi>{MESSAGE_MAX}</bdi></div>
        <p id={statusId} className="cx-status" role={state === "error" ? "alert" : "status"} data-state={state}>{status}</p>
        <div className="cx-dialog-actions">
          <button type="submit" className="cx-primary" disabled={!canSend} aria-busy={busy}>{busy ? "שולח…" : "שליחה"}</button>
          <button type="button" onClick={onClose} disabled={busy}>{state === "sent" ? "סגירה" : "ביטול"}</button>
        </div>
      </form>
    </div>
  </div>;
}
