import React, { useEffect, useMemo, useState } from "react";
import Marquee from "../Marquee.jsx";
import "./globalLivingRibbon2029.css";

// One preview-only editorial message, shown as four excerpts. It is not a
// public source, verified research, or an attribution to a named speaker.

export function livingRibbonItems(rows, previewMessage) {
  const quote = previewMessage ? previewMessage.parts.map((title, index) => ({
    id: `${previewMessage.id}:${index}`, title: previewMessage.excerpts?.[index] || title, typeLabel: "מסר", detail: previewMessage,
  })) : [];
  const live = (Array.isArray(rows) ? rows : []).filter(row => row?.id && row?.title && typeof row?.href === "string" && /^\/(?:world(?:[?#]|$)|(?:topic|post)\/[a-z0-9_%.-]+(?:[?#]|$)|2029\/(?:posts|number)\/[a-z0-9-]+(?:[?#]|$))/i.test(row.href) && !/[?&](?:token|signed|email|phone|name|birth)=/i.test(row.href))
    .map(row => ({ id: `feed:${row.id}`, title: row.title, typeLabel: row.kind === "convergence" || row.kind === "finding" ? "רצף החיבורים" : "דופק העולם", detail: { kind: "feed", row } }));
  return [...quote, ...live];
}

export function LivingRibbonDetail2029({ detail, onOpen, feed }) {
  if (detail?.kind === "message") return <section aria-label="המסר המלא" dir="rtl">
    <h3>ציטוט מדברי דובר</h3>
    <p>תצוגת בדיקה · שם הדובר אינו ידוע. הציטוט מבטא את דבריו ואינו תחזית מאומתת של המערכת.</p>
    {detail.parts.map((part, i) => <p key={i}><b>חלק {"אבגד"[i]}׳</b> {part}</p>)}
    <p>הפסוקים משויכים לתהילים מ״ד, כ״ו–כ״ז; כאן מובא נוסח דברי הדובר.</p>
  </section>;
  const row = detail?.kind === "feed" ? detail.row : null;
  if (!row) return null;
  return <section aria-label="פרטי העדכון" dir="rtl"><h3>{row.title}</h3><p>{row.typeLabel}</p>
    {row.item?.summary ? <p>{row.item.summary}</p> : null}
    <p>לקריאת הפריט המלא פתח את המקור.</p>
    {row.href ? <button type="button" className="sod29-action" onClick={() => { feed?.see?.(row); onOpen?.(row.href); }}>פתח את המקור</button> : null}
  </section>;
}

export default function GlobalLivingRibbon2029({ feed, onOpen, preview = false }) {
  const [previewMessage, setPreviewMessage] = useState(null);
  useEffect(() => {
    let live = true;
    if (preview && import.meta.env.VITE_INTEGRATED_PREVIEW === "true") import("./livingRibbonPreview2029.js").then(module => { if (live) setPreviewMessage(module.PREVIEW_MESSAGE); });
    return () => { live = false; };
  }, [preview]);
  const [quiet, setQuiet] = useState(false);
  const [paused, setPaused] = useState(false);
  const [focused, setFocused] = useState(false);
  const [index, setIndex] = useState(0);
  const items = useMemo(() => livingRibbonItems(feed?.rows, previewMessage), [feed?.rows, previewMessage]);
  useEffect(() => { setIndex(i => items.length ? i % items.length : 0); }, [items.length]);
  useEffect(() => {
    if (paused || focused || quiet || items.length < 2 || typeof window === "undefined") return undefined;
    const mobile = window.matchMedia("(max-width: 700px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timer = window.setInterval(() => { if (mobile.matches && !reduced.matches) setIndex(i => (i + 1) % items.length); }, 8000);
    return () => window.clearInterval(timer);
  }, [items.length, paused, focused, quiet]);
  if (!items.length) return null;
  const itemButton = item => <button type="button" className="sod29-living-item" onClick={() => onOpen(item.detail)}><span>{item.typeLabel}</span><bdi>{item.title}</bdi></button>;
  if (quiet) return <section className="sod29-living-ribbon is-quiet" aria-label="פס הגילויים החיים"><button type="button" className="sod29-living-pause" onClick={() => setQuiet(false)} aria-label="הרחב את פס הגילויים">✦</button></section>;
  return <section className="sod29-living-ribbon" aria-label="פס הגילויים החיים" dir="rtl" onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <span className="sod29-living-mark" aria-hidden="true">✦</span>
    <div className="sod29-living-desktop"><Marquee speedPxPerSec={35} gap={36} paused={paused || focused} accessibleCopies ariaLabel="גילויים ועדכונים">
      {items.map(item => <React.Fragment key={item.id}>{itemButton(item)}</React.Fragment>)}
    </Marquee></div>
    <div className="sod29-living-mobile" key={items[index % items.length].id}>{itemButton(items[index % items.length])}</div>
    <button type="button" className="sod29-living-pause" onClick={() => setQuiet(true)} aria-label="צמצם את פס הגילויים">−</button>
    <button type="button" className="sod29-living-pause" aria-label={paused ? "המשך תנועה" : "השהה תנועה"} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? "המשך" : "השהה"}</button>
  </section>;
}
