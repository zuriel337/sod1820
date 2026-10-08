import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchCorpusPage, fetchCorpusSource } from "../../lib/research/worldSourceCorpus.js";

// Public corpus with one selected full-text source; excerpts never stand in for full source.
// Counts come from the read, never assumed; load failure is shown as failure, never as an empty library.
const yearOf = (d) => { const y = String(d || "").slice(0, 4); return /^\d{4}$/.test(y) ? y : ""; };
const EMPTY = { items: [], excludedCount: 0, total: null, page: 0, hasMore: false, loading: true, error: false };

export default function WorldSourceCorpus({ spec, recentCount = null }) {
  const [st, setSt] = useState(EMPTY);
  const token = useRef(0);
  const [selected, setSelected] = useState(null);
  const [source, setSource] = useState({ loading: false });
  useEffect(() => {
    let live = true;
    if (!selected) return;
    setSource({ loading: true });
    fetchCorpusSource(spec, selected.id).then((result) => {
      if (live) setSource({ loading: false, id: selected.id, text: result.text });
    }).catch(() => { if (live) setSource({ loading: false, id: selected.id, error: true }); });
    return () => { live = false; };
  }, [spec, selected]);
  const load = useCallback((page) => {
    const mine = ++token.current;
    setSt((s) => ({ ...s, loading: true, error: false }));
    fetchCorpusPage(spec, page)
      .then((res) => {
        if (mine !== token.current) return; // late response for a previous corpus/page
        if (!page) setSelected(res.items[0] || null);
        setSt((s) => ({
          items: page ? [...s.items, ...res.items] : res.items,
          excludedCount: (page ? s.excludedCount : 0) + res.excluded.length,
          total: res.total ?? s.total,
          page, hasMore: res.hasMore, loading: false, error: false,
        }));
      })
      .catch(() => { if (mine === token.current) setSt((s) => ({ ...s, loading: false, error: true })); });
  }, [spec]);
  useEffect(() => { setSt(EMPTY); setSelected(null); load(0); return () => { token.current += 1; }; }, [load]);

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
    {st.items.length ? <label>בחירת מקור לקריאה
      <select aria-label="בחירת מקור בסוד החשמל" value={selected?.id || ""} onChange={(event) => setSelected(st.items.find((item) => item.id === event.target.value))} style={{ display: "block", width: "100%", minHeight: 44, fontSize: 16, marginBlock: 12 }}>
        {st.items.map((item) => <option key={item.id} value={item.id}>{item.title}{yearOf(item.date) ? ` · ${yearOf(item.date)}` : ""}</option>)}
      </select>
    </label> : null}
    {selected ? <article className="sod29-world-corpus-reading" style={{ maxWidth: 780, marginInline: "auto", overflowWrap: "anywhere" }}>
      <h3>{selected.title}</h3>
      <p style={{ fontSize: 14 }}>{yearOf(selected.date)}{selected.homeHidden ? " · לא מוצג בדף הבית" : ""} · מקור: סוד החשמל</p>
      {source.loading || source.id !== selected.id ? <p role="status">טוען את המקור המלא…</p> : source.error ? <p role="status">המקור המלא לא נטען. אפשר לנסות לפתוח את עמוד המקור.</p> : <div data-experience-capability="corpus-full-source" style={{ whiteSpace: "pre-wrap", fontFamily: "'Noto Sans Hebrew',sans-serif", fontSize: 18, lineHeight: 1.8 }}>{source.text}</div>}
      <p style={{ fontSize: 14 }}><Link to={selected.href}>לעמוד המקור עם העיצוב והמדיה המקוריים</Link></p>
      <p style={{ fontSize: 14 }}>פרסום מקור אינו אימות מחקרי. אין כאן טענה לקיומו או להיעדרו של מחקר קשור.</p>
    </article> : null}
    {st.loading ? <p className="sod29-muted" role="status">טוען מקורות…</p> : null}
    {st.error ? <p className="sod29-muted">טעינת הספרייה נכשלה — זו אינה ספרייה ריקה. <button type="button" className="sod29-world-subject-more" onClick={() => load(st.page)}>נסו שוב</button></p> : null}
    {!st.loading && !st.error && !st.items.length ? <p className="sod29-muted">לא נמצאו מקורות ציבוריים בספרייה זו.</p> : null}
    {st.hasMore && !st.loading ? <button type="button" className="sod29-world-subject-more" onClick={() => load(st.page + 1)}>עוד מקורות</button> : null}
  </section>;
}
