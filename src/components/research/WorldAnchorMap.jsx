import React from "react";

export default function WorldAnchorMap({ projection, loading, error, onOpen }) {
  if (loading) {
    return <section className="sod29-section sod29-world-anchor-map"><div className="sod29-muted">טוען את עוגני המחקר…</div></section>;
  }
  if (error || !projection?.roots?.length) return null;

  return <section className="sod29-section sod29-world-anchor-map" aria-label="עוגני המחקר">
    <div className="sod29-section-head">
      <div>
        <div className="sod29-kicker">מפת עוגנים חיה</div>
        <h2>עוגני המחקר</h2>
        <div className="sod29-muted">עוגן הוא נקודת ניווט שאושרה אנושית. המחוברים אליו הם קשרי מחקר חיים — לא דירוג אמת.</div>
      </div>
    </div>

    <div className="sod29-world-anchor-roots">
      {projection.roots.map((root) => <article className="sod29-world-anchor-root" key={root.id}>
        <button type="button" className="sod29-world-anchor-root-button" onClick={() => onOpen?.(root.value)}>
          <span>{root.role === "super_anchor" ? "עוגן־על" : "עוגן מחקר"}</span>
          <strong>{root.value}</strong>
          <small>{root.children.length} מחוברים</small>
        </button>
        {root.children.length ? <div className="sod29-world-anchor-children">
          {root.children.map((child) => <button
            key={child.edgeId}
            type="button"
            className="sod29-world-anchor-child"
            onClick={() => onOpen?.(child.value)}
            title={child.explainWhy || undefined}
          >
            <strong>{child.value}</strong>
            <span>מחובר ל־{root.value}</span>
          </button>)}
        </div> : <div className="sod29-muted">אין כרגע חיבורים מאושרים להצגה.</div>}
      </article>)}
    </div>
  </section>;
}
