import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchWorldSourceDepth, fetchCategorySources } from "../../lib/research/worldSourceDepth.js";

// World subject stage: editorial category carousel -> permitted public source works (paginated)
// -> attested Topic (only where a graph `source` edge exists). Consumes governed projections only.
// Loads lazily when scrolled near, so visitors who never reach it pay no read cost.
const yearOf = (d) => { const y = String(d || "").slice(0, 4); return /^\d{4}$/.test(y) ? y : ""; };

function SourceWorks({ category }) {
  const [st, setSt] = useState({ rows: [], page: 0, hasMore: false, loading: true, error: false });
  const load = useCallback((page) => {
    setSt((s) => ({ ...s, loading: true, error: false }));
    fetchCategorySources(category, page)
      .then(({ rows, hasMore }) => setSt((s) => ({ rows: page ? [...s.rows, ...rows] : rows, page, hasMore, loading: false, error: false })))
      .catch(() => setSt((s) => ({ ...s, loading: false, error: true })));
  }, [category]);
  useEffect(() => { setSt({ rows: [], page: 0, hasMore: false, loading: true, error: false }); load(0); }, [load]);
  return <div className="sod29-world-subject-works">
    {st.rows.length ? <ul>{st.rows.map((r) => <li key={r.id || r.slug}>
      <Link to={`/post/${encodeURIComponent(r.slug)}`}>{r.title || r.slug}</Link>
      {yearOf(r.date) ? <small>{yearOf(r.date)}</small> : null}
    </li>)}</ul> : null}
    {st.loading ? <p className="sod29-muted" role="status">טוען מקורות…</p> : null}
    {st.error ? <p className="sod29-muted">טעינת המקורות נכשלה. <button type="button" className="sod29-world-subject-more" onClick={() => load(st.page)}>נסו שוב</button></p> : null}
    {!st.loading && !st.error && !st.rows.length ? <p className="sod29-muted">אין כרגע מקורות ציבוריים בנושא הזה.</p> : null}
    {st.hasMore && !st.loading ? <button type="button" className="sod29-world-subject-more" onClick={() => load(st.page + 1)}>עוד מקורות</button> : null}
  </div>;
}

export default function WorldSourceDepth() {
  const hostRef = useRef(null);
  const [armed, setArmed] = useState(false);
  const [state, setState] = useState({ loading: true, depth: null, error: null });
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof IntersectionObserver === "undefined") { setArmed(true); return undefined; }
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { setArmed(true); io.disconnect(); } }, { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!armed) return undefined;
    let alive = true;
    fetchWorldSourceDepth()
      .then((depth) => { if (alive) setState({ loading: false, depth, error: null }); })
      .catch((error) => { if (alive) setState({ loading: false, depth: null, error }); });
    return () => { alive = false; };
  }, [armed]);

  const { depth } = state;
  const current = depth?.categories.find((c) => c.category === selected) || null;
  return <section ref={hostRef} className="sod29-section sod29-world-sourcedepth" id="world-source-depth" aria-label="נושאים ומקורות">
    <div className="sod29-section-head">
      <div>
        <div className="sod29-kicker">נושאי העומק</div>
        <h2>נושאים ומקורות</h2>
        {depth ? <div className="sod29-muted">
          {depth.complete ? "" : "מוצגת קריאה חלקית. "}
          {depth.topicsTotal} נושאים מאושרים, מהם {depth.topicsLinked} מקושרים למקור בקשר מתועד.
        </div> : null}
      </div>
    </div>
    {state.loading ? <p className="sod29-muted" role="status">{armed ? "טוען נושאים…" : ""}</p> : null}
    {state.error || (!state.loading && !depth) ? <p className="sod29-muted">הנושאים והמקורות אינם זמינים כרגע.</p> : null}
    {depth ? <>
      <div className="sod29-world-subject-stage">
        <div className="sod29-world-subject-rail" role="list" aria-label="קטגוריות עריכה">
          {depth.categories.map((c) => (
            <button key={c.category} type="button" role="listitem" className="sod29-world-subject-card"
              aria-pressed={selected === c.category}
              onClick={() => setSelected(selected === c.category ? null : c.category)}>
              <b>{c.category}</b>
              <small>{c.count} פוסטים{c.linkState === "attested" ? " · נושא מקושר" : ""}</small>
            </button>
          ))}
        </div>
        {current ? <div className="sod29-world-subject-panel">
          <h3>{current.category} <small>· {current.count} פוסטים</small></h3>
          {current.linkState === "attested"
            ? <div className="sod29-world-subject-topics"><b>נושא מאושר בקשר מתועד</b>
                <ul>{current.linkedTopics.map(({ topic }) => (
                  <li key={topic.slug}><Link to={`/topic/${encodeURIComponent(topic.slug)}`}>{topic.title || topic.slug}</Link></li>
                ))}</ul></div>
            : <p className="sod29-muted">אין עדיין קשר מתועד בין קטגוריה זו לנושא מאושר. המקורות מוצגים כמות שהם.</p>}
          <SourceWorks category={current.category} />
        </div> : <p className="sod29-muted">בחרו קטגוריה כדי לראות את המקורות הציבוריים שלה.</p>}
      </div>
      <details className="sod29-world-sourcedepth-dir">
        <summary>כל הנושאים המאושרים שאינם מקושרים למקור ({depth.unlinkedTopics.length})</summary>
        <ul>{depth.unlinkedTopics.map((t) => (
          <li key={t.slug}><Link to={`/topic/${encodeURIComponent(t.slug)}`}>{t.title || t.slug}</Link></li>
        ))}</ul>
      </details>
    </> : null}
  </section>;
}
