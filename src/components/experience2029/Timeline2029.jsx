import React from "react";
import "./timeline2029.css";
import { TIMELINE_PUBLIC_LABEL, TIMELINE_CURRENT_LABEL } from "../../lib/research/timeline2029.js";

// Shared public Timeline (ציר הזמן) for Post and Number. `rows` come from buildPublicTimeline().
export default function Timeline2029({ rows = [], surface = "post", subtitle = "מה פורסם · מה קרה · מתי", onSelect = null, onInspect = null, id, className = "", children = null }) {
  if (!rows.length) return null;
  return <section
    id={id}
    className={`sod29-post-timeline sod29-timeline ${className}`.trim()}
    data-experience-capability="public-timeline"
    data-timeline-surface={surface}
    aria-label={TIMELINE_PUBLIC_LABEL}
  >
    <header>
      <h2>{TIMELINE_PUBLIC_LABEL}</h2>
      {subtitle ? <p>{subtitle}</p> : null}
    </header>
    <ol>
      {rows.map((row, index) => <li key={row.id || index} className={row.isCurrent ? "is-current" : undefined} aria-current={row.isCurrent ? "location" : undefined} data-temporal-role={row.temporalRole || undefined}>
        <div className="sod29-post-timeline-dot" aria-hidden="true" />
        <div className="sod29-timeline-body">
          {row.isCurrent ? <b className="sod29-timeline-here">{TIMELINE_CURRENT_LABEL}</b> : null}
          <div className="sod29-timeline-dates">
            {row.dates
              ? <time dateTime={String(row.date).slice(0, 10)}>
                <span className="sod29-timeline-hebrew">{row.dates.hebrew}</span>
                <span className="sod29-timeline-sep" aria-hidden="true"> · </span>
                <bdo dir="ltr" className="sod29-timeline-gregorian">{row.dates.gregorian}</bdo>
              </time>
              : <span className="sod29-timeline-nodate">תאריך לא ידוע</span>}
            {row.roleLabel ? <span className="sod29-post-timeline-role">{row.roleLabel}</span> : null}
          </div>
          {onSelect
            ? <button type="button" className="sod29-timeline-title" onClick={() => onSelect(row, index)}>{row.label}</button>
            : row.href ? <a className="sod29-timeline-title" href={row.href}>{row.label}</a> : <strong className="sod29-timeline-title">{row.label}</strong>}
          {onInspect && !onSelect ? <button type="button" className="sod29-timeline-inspect" onClick={() => onInspect(row, index)} aria-label={`הקשר: ${row.label}`}>הקשר</button> : null}
          {row.sourceLabel ? <small>{row.sourceLabel}</small> : null}
          {row.note ? <p>{row.note}</p> : null}
        </div>
      </li>)}
    </ol>
    {children}
  </section>;
}
