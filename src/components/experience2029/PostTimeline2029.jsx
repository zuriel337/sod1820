import React from "react";

const ROLE_LABEL = Object.freeze({
  occurred: "קרה",
  published: "פורסם",
  discovered: "נמצא",
  admitted: "נוסף למחקר",
});

export default function PostTimeline2029({ items = [] }) {
  if (!items.length) return null;
  return <section
    className="sod29-post-timeline"
    data-experience-capability="post-factual-timeline"
    aria-label="ציר הזמן"
  >
    <header>
      <span>ציר הזמן</span>
      <strong>מה פורסם · מה קרה · מתי</strong>
    </header>
    <ol>
      {items.map((item) => <li key={item.id}>
        <div className="sod29-post-timeline-dot" aria-hidden="true" />
        <div>
          <time dateTime={item.date}>{item.date}</time>
          <span className="sod29-post-timeline-role">{ROLE_LABEL[item.temporalRole] || item.temporalRole}</span>
          {item.href ? <a href={item.href}>{item.label}</a> : <strong>{item.label}</strong>}
          {item.sourceLabel ? <small>{item.sourceLabel}</small> : null}
          {item.note ? <p>{item.note}</p> : null}
        </div>
      </li>)}
    </ol>
  </section>;
}
