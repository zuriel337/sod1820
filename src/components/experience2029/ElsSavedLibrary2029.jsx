import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { getMatrixLibraryPage } from "../../lib/elsMatrices.js";
import { hasExactSavedMatrix, savedMatrixWorkspaceHref } from "../../lib/elsSavedMatrix.js";
import { thumb } from "../../lib/img.js";
import "./elsSavedLibrary2029.css";

export default function ElsSavedLibrary2029({ view = "public", onView, onOpen, onClose }) {
  const { user, loading: authLoading } = useAuth();
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ rows: [], loading: true, more: false, error: false });
  const generation = useRef(0);
  const personal = view === "mine";
  const scopeKey = `${view}|${user?.id || ""}|${query}`;
  const scopeReady = state.scopeKey === scopeKey;
  const visibleRows = scopeReady ? state.rows : [];
  const loading = !scopeReady || state.loading;
  const load = async (offset, append, epoch) => {
    setState(current => ({ ...current, loading: true, error: false }));
    try {
      const result = await getMatrixLibraryPage({ view, userId: user?.id, query, offset });
      if (epoch !== generation.current) return;
      setState(current => ({ rows: append ? [...current.rows, ...result.rows.filter(row => !current.rows.some(old => old.id === row.id))] : result.rows, more: result.more, loading: false, error: false, scopeKey }));
    } catch {
      if (epoch === generation.current) setState(current => ({ ...current, loading: false, error: true }));
    }
  };
  useEffect(() => {
    const epoch = ++generation.current;
    setState({ rows: [], loading: true, more: false, error: false, scopeKey });
    if (!authLoading && (!personal || user)) load(0, false, epoch);
    else if (!authLoading) setState({ rows: [], loading: false, more: false, error: false, scopeKey });
    return () => { ++generation.current; };
  }, [view, user?.id, authLoading, query, revision]);

  return <section className="els29-library" aria-label="ספריית הצפנים">
    <header className="els29-library-head"><div><h2>{personal ? "הצפנים שלי" : "צפנים שפורסמו"}</h2><p>הצפנים הקיימים והשמירות החדשות, באותו מקום. פתחו צופן כדי להמשיך לחקור.</p></div><button className="sod29-action" type="button" onClick={onClose}>חזור לחיפוש</button></header>
    <div className="els29-library-tabs" role="group" aria-label="סוג ספריית הצפנים">
      <button type="button" className="sod29-action" aria-pressed={personal} onClick={() => onView("mine")}>הצפנים שלי</button>
      <button type="button" className="sod29-action" aria-pressed={!personal} onClick={() => onView("public")}>צפנים שפורסמו</button>
    </div>
    {personal && !user && !authLoading ? <p>כדי לראות את הצפנים שלך, <a href="/login">היכנסו לחשבון</a>.</p> : <>
      <form className="els29-library-search" onSubmit={event => { event.preventDefault();setQuery(draft.trim()); }}>
        <label>חיפוש בצפנים<input value={draft} onChange={event => setDraft(event.target.value)} maxLength={120} placeholder="מילה או שם הצופן" /></label><button className="sod29-action" type="submit">חפש בספרייה</button>
      </form>
      {scopeReady && state.error ? <div role="alert">הספרייה לא נטענה. <button type="button" className="sod29-action" onClick={() => visibleRows.length ? load(visibleRows.length, true, generation.current) : setRevision(value => value + 1)}>נסה שוב</button></div> : null}
      {!loading && !state.error && !visibleRows.length ? <p>{query ? "לא נמצאו צפנים לחיפוש הזה." : personal ? "עדיין אין כאן צפנים. אפשר לשמור מתוך המטריצה." : "אין כרגע צפנים שפורסמו להצגה."}</p> : null}
      <div className="els29-library-grid">
        {visibleRows.map(row => <article className="els29-library-card" key={row.id}>
          <a href={savedMatrixWorkspaceHref(row)} onClick={event => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) { event.preventDefault();onOpen(row); } }}>
            {row.image_url && row.visibility === "public" ? <img src={thumb(row.image_url, 480)} alt="" loading="lazy" /> : <div className="els29-library-placeholder" aria-hidden="true">{row.search_term}</div>}
            <h3>{row.title || row.search_term}</h3>
            <p>{row.scope === "tanakh" ? "תנ״ך" : "תורה"} · דילוג {row.direction === "back" ? "−" : ""}{row.skip_distance}</p>
            <span className="sod29-chip">{hasExactSavedMatrix(row) ? "מיקום שמור" : "צופן ותיק"}</span>
            {personal ? <span className="sod29-chip">{row.status === "published" && row.visibility === "public" ? "פורסם" : row.self_published ? "בתיק הציבורי" : "אישי"}</span> : null}
            {row.description ? <p className="els29-library-description">{row.description}</p> : null}
            <span className="els29-library-open">פתח למחקר ←</span>
          </a>
        </article>)}
      </div>
      {loading ? <p role="status">טוען צפנים…</p> : state.more ? <button className="sod29-action" type="button" onClick={() => load(visibleRows.length, true, generation.current)}>טען צפנים נוספים</button> : null}
    </>}
  </section>;
}
