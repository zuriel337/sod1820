import React from "react";
import "./postCategories2029.css";
import "./royal2029.css";

// The Post's public connections, in the site's own connection language (ZURIEL 26.11.2026): the same "חיבורים נוספים" list the context rail shows for every surface
// (SurfaceContextRail2029: label + value), as one compact row of the Post's own chips (k29-cat). It is given the findings the rail is given (publicSurfaceFindingsFromConnections:
// real, admitted, public links only) and renders nothing when there are none. Each chip has its own address (#post-connection-<id>) so "חזרה מדויקת" lands on it, not on the top.
// Loaded when the reader comes near (toolOnApproach2029), or at once when the address points here. No research panel, no new store.
export const postConnectionAnchor2029 = (finding) => `post-connection-${finding.id}`;

export default function PostConnections2029({ findings, onOpen }) {
  const rows = Array.isArray(findings) ? findings.filter(item => item?.href && item?.label) : [];
  if (!rows.length) return null;
  return <nav id="post-connections" className="post-connections r29" aria-label="חיבורים נוספים" data-experience-capability="post-public-connections">
    <span className="post-connections-kicker">חיבורים נוספים</span>
    <span className="k29-cats post-connections-list">
      {rows.map(item => <a key={item.id} id={postConnectionAnchor2029(item)} className="k29-cat" href={item.href}
        title={item.reason || undefined} data-post-connection={item.id} onClick={event => onOpen?.(event, item.href, item)}>
        {item.label}{item.value ? <b>{item.value}</b> : null}
      </a>)}
    </span>
  </nav>;
}
