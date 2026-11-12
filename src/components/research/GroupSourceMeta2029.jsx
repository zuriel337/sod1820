import React, { useState } from "react";
import { Link } from "react-router-dom";
import { numberHref, splitGroupMessageNumbers } from "../../lib/research/groupMessageNumbers2029.js";
import "./groupSourceMeta2029.css";

// Presentation pieces of one public group source (tracks: תורת הרמז, כי לה׳ המלוכה — גימטריות, ...).
// Pure projection of fields already admitted by worldGroupSource.js; no reader, no store, no new name.

export function GroupSourceBadge({ item }) {
  return item?.sourceGroupLabel ? <span className="sod29-group-badge" data-group-key={item.sourceGroup?.key || undefined}>{item.sourceGroupLabel}</span> : null;
}

/** Preview + full media. A video never autoplays; it loads its player only on demand. */
export function GroupSourceMedia({ item, compact = false }) {
  const media = item?.media;
  const [armed, setArmed] = useState(false);
  if (!media) return null;
  if (media.kind === "image") {
    return <img className={`sod29-group-media is-image${compact ? " is-compact" : ""}`} src={media.url} alt={`תמונה מהקבוצה · ${item.sourceGroupLabel || ""}`.trim()} loading="lazy" decoding="async" />;
  }
  if (media.kind === "audio") return <audio className="sod29-group-media is-audio" src={media.url} controls preload="none" aria-label={`הקלטה מהקבוצה · ${item.sourceGroupLabel || ""}`.trim()} />;
  if (armed) return <video className="sod29-group-media is-video" src={media.url} poster={media.thumbUrl || undefined} controls preload="metadata" playsInline aria-label={`סרטון מהקבוצה · ${item.sourceGroupLabel || ""}`.trim()} />;
  return <button type="button" className={`sod29-group-media is-video-poster${compact ? " is-compact" : ""}`} onClick={() => setArmed(true)} aria-label="הצג את הנגן">
    {media.thumbUrl ? <img src={media.thumbUrl} alt="" loading="lazy" decoding="async" /> : null}<span aria-hidden="true">▶</span>
  </button>;
}

/** The writer's name; a link to the existing member page only when the identity is server-proven (creatorHref). */
export function GroupSourceCreator({ item, prefix = "" }) {
  const name = item?.creator || "שם הכותב לא צוין";
  return item?.creatorHref
    ? <Link className="sod29-group-creator" to={item.creatorHref} data-group-creator="verified">{prefix}{name}</Link>
    : <span className="sod29-group-creator" data-group-creator="unverified">{prefix}{name}</span>;
}

/** The text of one group message with each standalone number as a link to its Number page. `onNumber(href)` lets a surface without a Router
 *  (the Now panel) navigate itself; a modified click (new tab) always keeps the plain link. */
export function GroupMessageText({ text, onNumber = null }) {
  const parts = splitGroupMessageNumbers(text);
  return <>{parts.map((part, index) => {
    if (part.number == null) return part.text;
    const href = numberHref(part.number);
    const label = `למספר ${part.number}`;
    return onNumber
      ? <a key={index} className="sod29-group-number" href={href} aria-label={label}
          onClick={(event) => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button) return; event.preventDefault(); onNumber(href); }}>{part.text}</a>
      : <Link key={index} className="sod29-group-number" to={href} aria-label={label}>{part.text}</Link>;
  })}</>;
}
