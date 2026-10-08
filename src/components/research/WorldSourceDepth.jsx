import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchWorldSourceDepth } from "../../lib/research/worldSourceDepth.js";

// World source/subject depth: editorial subject (category) -> attested Topic -> Number/Projector.
// Consumes the governed projection only; renders honest states for missing links.
export default function WorldSourceDepth() {
  const [state, setState] = useState({ loading: true, depth: null, error: null });
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchWorldSourceDepth()
      .then((depth) => { if (alive) setState({ loading: false, depth, error: null }); })
      .catch((error) => { if (alive) setState({ loading: false, depth: null, error }); });
    return () => { alive = false; };
  }, []);

  if (state.loading) return null;
  if (state.error || !state.depth) {
    return <section className="sod29-section sod29-world-sourcedepth" aria-label="נושאים ומקורות">
      <p className="sod29-muted">הנושאים והמקורות אינם זמינים כרגע.</p>
    </section>;
  }
  const { depth } = state;
  const current = depth.categories.find((c) => c.category === selected) || null;
  return <section className="sod29-section sod29-world-sourcedepth" id="world-source-depth" aria-label="נושאים ומקורות">
    <div className="sod29-section-head">
      <div>
        <div className="sod29-kicker">נושאי העומק</div>
        <h2>נושאים ומקורות</h2>
        <div className="sod29-muted">
          {depth.complete ? "" : "מוצגת קריאה חלקית. "}
          {depth.topicsTotal} נושאים מאושרים, מהם {depth.topicsLinked} מקושרים למקור בקשר מתועד.
        </div>
      </div>
    </div>
    <div className="sod29-world-sourcedepth-chips" role="list">
      {depth.categories.map((c) => (
        <button key={c.category} type="button" role="listitem" className="sod29-world-sourcedepth-chip"
          aria-pressed={selected === c.category}
          onClick={() => setSelected(selected === c.category ? null : c.category)}>
          {c.category} <small>{c.count}</small>
        </button>
      ))}
    </div>
    {current ? <div className="sod29-world-sourcedepth-panel">
      <h3>{current.category} · {current.count} פוסטים</h3>
      {current.linkState === "attested"
        ? <ul>{current.linkedTopics.map(({ topic }) => (
            <li key={topic.slug}><Link to={`/topic/${encodeURIComponent(topic.slug)}`}>{topic.title || topic.slug}</Link></li>
          ))}</ul>
        : <p className="sod29-muted">אין עדיין קשר מאושר בין נושא זה לבין נושא מאושר. המקור מוצג כמות שהוא.</p>}
      <Link to={`/category/${encodeURIComponent(current.category)}`}>לכל הפוסטים בנושא</Link>
    </div> : null}
    <details className="sod29-world-sourcedepth-dir">
      <summary>כל הנושאים המאושרים שאינם מקושרים למקור ({depth.unlinkedTopics.length})</summary>
      <ul>{depth.unlinkedTopics.map((t) => (
        <li key={t.slug}><Link to={`/topic/${encodeURIComponent(t.slug)}`}>{t.title || t.slug}</Link></li>
      ))}</ul>
    </details>
  </section>;
}
