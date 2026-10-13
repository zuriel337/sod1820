import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchPublicSourceSubjectIndex,
  filterPublicSourceSubjects,
  publicSourceSubjectCategories,
} from "../../lib/research/worldPublicSourceSubjects2029.js";
import "./worldPublicSourceSubjects2029.css";

// A subsection INSIDE World "עיון לפי נושא" — never a replacement for its
// canonical convergence catalog. Sources remain sources, Topics remain Topics.
const CHUNK = 18;
const EMPTY = { loading: false, cards: [], totals: { zvi: null, hashmal: null }, error: false, incomplete: false };

export default function WorldPublicSourceSubjects2029() {
  const anchor = useRef(null);
  const [armed, setArmed] = useState(false);
  const [version, setVersion] = useState(0);
  const [state, setState] = useState(EMPTY);
  const [origin, setOrigin] = useState("all");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(CHUNK);

  useEffect(() => {
    const node = anchor.current;
    if (!node || typeof IntersectionObserver === "undefined") { setArmed(true); return; }
    const io = new IntersectionObserver((events) => {
      if (events.some((event) => event.isIntersecting)) { setArmed(true); io.disconnect(); }
    }, { rootMargin: "500px" });
    io.observe(node);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!armed) return;
    let alive = true;
    setState((prev) => ({ ...prev, loading: true, error: false }));
    fetchPublicSourceSubjectIndex()
      .then((next) => { if (alive) setState({ ...next, loading: false, error: false }); })
      .catch(() => { if (alive) setState((prev) => ({ ...prev, loading: false, error: true })); });
    return () => { alive = false; };
  }, [armed, version]);

  const categories = useMemo(() => publicSourceSubjectCategories(state.cards), [state.cards]);
  const results = useMemo(() => filterPublicSourceSubjects(state.cards, { origin, category, query }), [state.cards, origin, category, query]);
  const sourceSwitch = (next) => { setOrigin(next); setCategory("all"); setVisible(CHUNK); };
  const chooseCategory = (next) => { setCategory(next); setVisible(CHUNK); };
  const more = results.length > visible;

  return <div ref={anchor} className="sod29-world-source-subject-index" aria-label="נושאים לפי צבי וסוד החשמל" data-world-public-source-subjects>
    <div className="sod29-world-source-subject-head">
      <div>
        <h3>הנושאים של צבי וסוד החשמל</h3>
        <p>נושאים מאושרים של צבי ופרסומי המקור של סוד החשמל, עם השמות והשיוכים המקוריים.</p>
      </div>
      {!state.loading && !state.error ? <span className="sod29-world-source-subject-count">
        {state.totals.zvi ?? "—"} נושאי צבי · {state.totals.hashmal ?? "—"} פרסומי סוד החשמל
      </span> : null}
    </div>

    <div className="sod29-world-source-subject-filters" role="group" aria-label="בחירה לפי מקור">
      {[["all", "הכול"], ["zvi", "צבי"], ["hashmal", "סוד החשמל"]].map(([key, label]) =>
        <button key={key} type="button" aria-pressed={origin === key} onClick={() => sourceSwitch(key)}>{label}</button>)}
    </div>
    <label className="sod29-world-source-subject-search">
      <span>חיפוש בנושאים</span>
      <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setVisible(CHUNK); }}
        placeholder="חפש נושא, כותרת או קטגוריה…" />
    </label>
    {origin !== "zvi" && categories.length ? <div className="sod29-world-source-subject-categories" role="group" aria-label="קטגוריות סוד החשמל">
      <button type="button" aria-pressed={category === "all"} onClick={() => chooseCategory("all")}>כל הקטגוריות</button>
      {categories.map(({ name, count }) => <button type="button" key={name} aria-pressed={category === name} onClick={() => chooseCategory(name)}>{name} · {count}</button>)}
    </div> : null}

    {state.loading || !armed ? <p role="status">טוען את הנושאים והמקורות הציבוריים…</p> : null}
    {state.error ? <p role="status">הנושאים לא נטענו כעת. <button type="button" onClick={() => setVersion((v) => v + 1)}>נסה שוב</button></p> : null}
    {state.incomplete && !state.loading ? <p role="status">חלק מהחומר עדיין אינו כלול בקריאה הזו; אפשר לפתוח את ספריית המקור המלאה.</p> : null}

    {!state.loading && !state.error && !results.length ? <p role="status">לא נמצאו פרסומים או נושאים בחיפוש הזה.</p> : null}
    <div className="sod29-world-source-subject-list">
      {results.slice(0, visible).map((item) =>
        <Link key={item.id} className="sod29-world-source-subject-item" to={item.href}>
          <span className="sod29-world-source-subject-kind">{item.type === "approved_topic" ? "נושא מאושר · צבי" : "פרסום מקור · סוד החשמל"}</span>
          <strong>{item.title}</strong>
          {item.description ? <span className="sod29-world-source-subject-desc">{item.description}</span> : null}
          {item.categories.length ? <span className="sod29-world-source-subject-meta">{item.categories.slice(0, 3).join(" · ")}</span> : null}
          <small>לפתיחה ←</small>
        </Link>)}
    </div>
    {more ? <button type="button" className="sod29-world-source-subject-more" onClick={() => setVisible((n) => n + CHUNK)}>
      הצג עוד נושאים ({results.length - visible} נוספים)
    </button> : null}
    {!state.loading && !state.error && results.length ? <p className="sod29-world-source-subject-footer">מוצגים {Math.min(visible, results.length)} מתוך {results.length} פריטים בסינון הנוכחי.</p> : null}
  </div>;
}
