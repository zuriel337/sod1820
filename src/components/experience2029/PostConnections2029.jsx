import React, { useEffect, useState } from "react";
import "./postCategories2029.css";
import "./royal2029.css";

// The Post's public connections, in the site's own connection language (ZURIEL 26.11.2026): the "חיבורים נוספים" the context rail lists for every surface, as one compact row of the
// Post's own chips (k29-cat: label + value). Pilot Posts hand over their authored connections; every other Post reads its own from the canonical Reality Graph
// (postGraphConnections2029.js: the one graph reader, admitted by the one access-controlled resolver). Nothing renders when there is no real connection. A long list shows the first
// four and "עוד N". Each chip has its own address (#post-connection-<id>) so "חזרה מדויקת" lands on it. The block's own address is #post-public-connections (the admin tool keeps
// #post-connections: one address, one owner). Loaded when the reader comes near, or at once when the address points here. No research panel, no new store.
export const POST_CONNECTIONS_ANCHOR_2029 = "post-public-connections";
export const POST_CONNECTIONS_VISIBLE_2029 = 4;
export const postConnectionAnchor2029 = (finding) => `post-connection-${finding.id}`;

export default function PostConnections2029({ post = null, findings = [], onOpen, focusId = "", read = null }) {
  const given = Array.isArray(findings) ? findings.filter(item => item?.href && item?.label) : [];
  const [loaded, setLoaded] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (given.length || !post) return undefined;
    let alive = true;
    (async () => {
      try {
        const reader = read || (await import("../../lib/research/postGraphConnections2029.js")).readPostGraphConnections;
        const result = await reader(post);
        if (alive) setLoaded(result.items || []);
      } catch { if (alive) setLoaded([]); }
    })();
    return () => { alive = false; };
  }, [post?.id, given.length]);
  const rows = given.length ? given : (loaded || []).filter(item => item?.href && item?.label).slice(0, 8);
  if (!rows.length) return null;
  const hidden = rows.slice(POST_CONNECTIONS_VISIBLE_2029);
  const targetHidden = focusId && hidden.some(item => postConnectionAnchor2029(item) === focusId);
  const expanded = open || targetHidden;
  const shown = expanded ? rows : rows.slice(0, POST_CONNECTIONS_VISIBLE_2029);
  return <nav id={POST_CONNECTIONS_ANCHOR_2029} className={`post-connections r29${expanded ? " is-open" : ""}`} aria-label="חיבורים נוספים" data-experience-capability="post-public-connections">
    <span className="post-connections-kicker">חיבורים נוספים</span>
    <span className="k29-cats post-connections-list">
      {shown.map(item => <a key={item.id} id={postConnectionAnchor2029(item)} className="k29-cat" href={item.href}
        title={item.reason || undefined} data-post-connection={item.id} onClick={event => onOpen?.(event, item.href, item)}>
        {item.label}{item.value ? <b>{item.value}</b> : null}
      </a>)}
      {hidden.length && !expanded ? <button type="button" className="k29-cat post-connections-more" aria-expanded="false" onClick={() => setOpen(true)}>עוד {hidden.length}</button> : null}
    </span>
  </nav>;
}
