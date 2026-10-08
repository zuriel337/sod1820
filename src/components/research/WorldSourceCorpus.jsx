import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchCorpusPage } from "../../lib/research/worldSourceCorpus.js";

// Full available source library for one corpus. Source text (excerpt) is shown expanded; research stays collapsed.
// Counts come from the read, never assumed; load failure is shown as failure, never as an empty library.
const yearOf = (d) => { const y = String(d || "").slice(0, 4); return /^\d{4}$/.test(y) ? y : ""; };
const EMPTY = { items: [], excludedCount: 0, total: null, page: 0, hasMore: false, loading: true, error: false };

export default function WorldSourceCorpus({ spec, recentCount = null }) {
  const [st, setSt] = useState(EMPTY);
  const token = useRef(0);
  const load = useCallback((page) => {
    const mine = ++token.current;
    setSt((s) => ({ ...s, loading: true, error: false }));
    fetchCorpusPage(spec, page)
      .then((res) => {
        if (mine !== token.current) return; // late response for a previous corpus/page
        setSt((s) => ({
          items: page ? [...s.items, ...res.items] : res.items,
          excludedCount: (page ? s.excludedCount : 0) + res.excluded.length,
          total: res.total ?? s.total,
          page, hasMore: res.hasMore, loading: false, error: false,
        }));
      })
      .catch(() => { if (mine === token.current) setSt((s) => ({ ...s, loading: false, error: true })); });
  }, [spec]);
  useEffect(() => { setSt(EMPTY); load(0); return () => { token.current += 1; }; }, [load]);

  return <section className="sod29-section sod29-world-corpus" id={`world-corpus-${spec.key}`} aria-label={`כל המקורות של ${spec.label}`} data-experience-capability="world-source-corpus">
    <div className="sod29-section-head"><div>
      <div className="sod29-kicker">הספרייה המלאה</div>
      <h2>{spec.label} — כל המקורות</h2>
      <div className="sod29-muted">
        {st.total != null ? `${st.total} מקורות זמינים בספרייה` : "טוען את הספרייה…"}
        {st.excludedCount ? ` · ${st.excludedCount} פריטים ללא כותרת לא מוצגים` : ""}
        {recentCount != null ? ` · ${recentCount} מהם בין העדכונים האחרונים (זרם העדכונים האחרונים אינו הספרייה המלאה)` : ""}
      </div>
    </div></div>
    {st.items.length ? <ul className="sod29-world-corpus-list">{st.items.map((item) => <li key={item.id}>
      <Link to={item.href}><strong>{item.title}</strong></Link>
      {yearOf(item.date) ? <small> · {yearOf(item.date)}</small> : null}
      {item.homeHidden ? <small> · לא מוצג בדף הבית</small> : null}
      {item.excerpt ? <p className="sod29-world-corpus-source"><small className="sod29-muted">תקציר: </small>{item.excerpt}</p> : null}
      <p className="sod29-muted"><Link to={item.href}>לקריאת המקור המלא</Link> · פרסום מקור אינו אימות מחקרי.</p>
    </li>)}</ul> : null}
    {st.loading ? <p className="sod29-muted" role="status">טוען מקורות…</p> : null}
    {st.error ? <p className="sod29-muted">טעינת הספרייה נכשלה — זו אינה ספרייה ריקה. <button type="button" className="sod29-world-subject-more" onClick={() => load(st.page)}>נסו שוב</button></p> : null}
    {!st.loading && !st.error && !st.items.length ? <p className="sod29-muted">לא נמצאו מקורות ציבוריים בספרייה זו.</p> : null}
    {st.hasMore && !st.loading ? <button type="button" className="sod29-world-subject-more" onClick={() => load(st.page + 1)}>עוד מקורות</button> : null}
  </section>;
}
