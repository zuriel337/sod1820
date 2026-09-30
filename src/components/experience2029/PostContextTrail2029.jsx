import React from "react";

export default function PostContextTrail2029({ items = [] }) {
  if (!items.length) return null;
  return <nav
    className="sod29-post-context-trail"
    data-experience-capability="post-context-trail"
    aria-label="מסלול החיבורים"
  >
    <span className="sod29-post-context-trail-mark">✦</span>
    <div>
      {items.map((item, index) => <React.Fragment key={item.id}>
        {index ? <span className="sod29-post-context-separator" aria-hidden="true">‹</span> : null}
        {item.href
          ? <a href={item.href} aria-current={item.active ? "page" : undefined}>{item.label}</a>
          : <span aria-current={item.active ? "page" : undefined}>{item.label}</span>}
      </React.Fragment>)}
    </div>
  </nav>;
}
