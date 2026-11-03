import React from "react";
import "./globalLivingRibbon2029.css";

// Source details remain available to the existing Now sheet. The header notice
// is static and does not consume, rotate or replace the shared feed data.

export function NowSourceDetail2029({ row, onOpen, feed }) {
  const item = row?.item || {};
  return <div className="sod29-now-source-detail">
    {item.fullText ? <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{item.fullText}</p> : null}
    {item.fullTextTruncated ? <small>זהו קטע תחום מהעדכון הציבורי.</small> : null}
    {item.mediaHref ? /\.(?:mp4|webm|mov)$/i.test(item.mediaHref)
      ? <video src={item.mediaHref} controls preload="none" aria-label="סרטון מתוך עדכון ציבורי" style={{ maxWidth: "100%" }} />
      : <img src={item.mediaHref} loading="lazy" decoding="async" alt="מדיה מתוך העדכון הציבורי" style={{ maxWidth: "100%", height: "auto" }} /> : null}
    {row?.href ? <button type="button" className="sod29-action" onClick={() => { feed?.see?.(row);onOpen?.(row.href); }}>פתח את המקור</button>
      : <small>העדכון הציבורי מוצג כאן. לא צורף קישור מדויק למקור.</small>}
  </div>;
}

export function livingRibbonItems(rows, previewMessage) {
  const quote = previewMessage ? previewMessage.parts.map((title, index) => ({
    id: `${previewMessage.id}:${index}`, title: previewMessage.excerpts?.[index] || title, typeLabel: "מסר", detail: previewMessage,
  })) : [];
  const live = (Array.isArray(rows) ? rows : []).filter(row => (
    (row?.id && row?.title && typeof row?.href === "string" && /^\/(?:world(?:[?#]|$)|(?:topic|post)\/[a-z0-9_%.-]+(?:[?#]|$)|2029\/(?:posts|number)\/[a-z0-9-]+(?:[?#]|$))/i.test(row.href) && !/[?&](?:token|signed|email|phone|name|birth)=/i.test(row.href)) || row?.id && row?.title && row.href == null
      && row.item?.kind === "source" && !["private", "person_only", "family_shared"].includes(row.item?.privacy_scope)
      && ["published_channel_update", "published_gallery_update"].includes(row?.item?.publicState)
      && /^(?:channel_updates|gallery_images):[0-9a-f-]{36}$/i.test(row?.item?.sourceRef || "")
      && Boolean(row.item.fullText || row.item.mediaHref)
  ))
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
    {row.item?.fullText || row.item?.mediaHref ? <NowSourceDetail2029 row={row} onOpen={onOpen} feed={feed} /> : <>
      {row.item?.summary ? <p>{row.item.summary}</p> : null}
      <p>לקריאת הפריט המלא פתח את המקור.</p>
      {row.href ? <button type="button" className="sod29-action" onClick={() => { feed?.see?.(row); onOpen?.(row.href); }}>פתח את המקור</button> : null}
    </>}
  </section>;
}

export const RENEWAL_NOTICE_2029 = "האתר מתחדש ונבנה בהדרגה. נתקלתם בתקלה או שיש לכם רעיון לשיפור? עזרו לנו לבנות אותו יחד.";

export default function GlobalLivingRibbon2029({ onContact }) {
  return <section className="sod29-living-ribbon" aria-label="האתר מתחדש" data-ribbon-state="renewal" dir="rtl">
    <p className="sod29-living-notice">{RENEWAL_NOTICE_2029}</p>
    <button type="button" className="sod29-living-contact" onClick={onContact} aria-haspopup="dialog">דיווח או הצעה ←</button>
  </section>;
}
