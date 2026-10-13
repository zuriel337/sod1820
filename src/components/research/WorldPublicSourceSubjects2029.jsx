import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  fetchPublicSourceSubjectIndex,
  filterPublicSourceSubjects,
} from "../../lib/research/worldPublicSourceSubjects2029.js";
import "./worldPublicSourceSubjects2029.css";

// One World reader stage. Source works are shown AFTER approved Topic identities,
// not falsely promoted to Topics by their title, previous CMS category or author.
const CHUNK = 18;
const EMPTY = { loading: true, cards: [], totals: { zvi: null, hashmal: null },
  available: { zvi: false, hashmal: false }, error: false, incomplete: false };

export default function WorldPublicSourceSubjects2029() {
  const anchor = useRef(null);
  const location = useLocation();
  const [armed, setArmed] = useState(false);
  const [version, setVersion] = useState(0);
  const [state, setState] = useState(EMPTY);
  const [origin, setOrigin] = useState("all");
  const [query, setQuery] = useState("");
  const [visibleTopics, setVisibleTopics] = useState(CHUNK);
  const [visibleSources, setVisibleSources] = useState(CHUNK);

  useEffect(() => {
    const requested = new URLSearchParams(location.search).get("subjectSource");
    if (requested === "zvi" || requested === "hashmal") {
      setOrigin(requested);
      setVisibleTopics(CHUNK);
      setVisibleSources(CHUNK);
    }
  }, [location.search]);

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

  const results = useMemo(() => filterPublicSourceSubjects(state.cards, { origin, query }), [state.cards, origin, query]);
  const topics = results.filter((item) => item.type === "approved_topic");
  const sources = results.filter((item) => item.type === "source_work");
  const selectOrigin = (next) => {
    setOrigin(next); setVisibleTopics(CHUNK); setVisibleSources(CHUNK);
  };
  const card = (item) => <Link key={item.id} className="sod29-world-source-subject-item" to={item.href}>
    <span className="sod29-world-source-subject-kind">
      {item.type === "approved_topic" ? "נושא מאושר · צבי" : "מקור לקריאה · סוד החשמל"}
    </span>
    <strong>{item.title}</strong>
    {item.description ? <span className="sod29-world-source-subject-desc">{item.description}</span> : null}
    {item.values?.length ? <span className="sod29-world-source-subject-meta">
      מספרים: {item.values.slice(0, 5).join(" · ")}
    </span> : null}
    <small>פתח {item.type === "approved_topic" ? "נושא" : "מקור"} ←</small>
  </Link>;

  return <div ref={anchor} className="sod29-world-source-subject-index"
    aria-label="נושאים ומקורות מתוך עץ המציאות" data-world-public-source-subjects>
    <div className="sod29-world-source-subject-head">
      <div>
        <h3>לגלות נושאים דרך המקורות</h3>
        <p>נושאים מאושרים וקשריהם מצד אחד, מקורות מלאים מהצד השני. אותו עולם — בלי קטגוריות ישנות.</p>
      </div>
      {!state.loading && !state.error ? <span className="sod29-world-source-subject-count">
        {state.totals.zvi ?? "—"} נושאים מאושרים · {state.totals.hashmal ?? "—"} פרסומי מקור
      </span> : null}
    </div>
    <div className="sod29-world-source-subject-filters" role="group" aria-label="בחירה לפי מקור">
      {[["all", "הכול"], ["zvi", "צבי"], ["hashmal", "סוד החשמל"]].map(([key, label]) =>
        <button key={key} type="button" aria-pressed={origin === key}
          onClick={() => selectOrigin(key)}>{label}</button>)}
    </div>
    <div className="sod29-world-source-subject-origin-links">
      <Link to="/world?source=tzvi-opoc#world-contributor-material">כל דברי המקור של צבי ←</Link>
      <Link to="/world?source=sod-hashmal#world-corpus-sod-hashmal">ספריית סוד החשמל המלאה ←</Link>
    </div>
    <label className="sod29-world-source-subject-search">
      <span>חיפוש לפי נושא, מקור או מספר</span>
      <input type="search" value={query} onChange={(e) => {
        setQuery(e.target.value); setVisibleTopics(CHUNK); setVisibleSources(CHUNK);
      }} placeholder="מה מעניין אותך לגלות?" />
    </label>

    {state.loading || !armed ? <p role="status">טוען נושאים ומקורות ציבוריים…</p> : null}
    {state.error ? <p role="status">הנושאים והמקורות אינם זמינים כרגע. <button type="button"
      onClick={() => setVersion((v) => v + 1)}>נסה שוב</button></p> : null}
    {!state.loading && !state.error && !state.available.zvi
      ? <p role="status">רשימת הנושאים המאושרים אינה זמינה כרגע.</p> : null}
    {!state.loading && !state.error && !state.available.hashmal
      ? <p role="status">ספריית סוד החשמל אינה זמינה כרגע.</p> : null}
    {state.incomplete && !state.loading ? <p role="status">חלק מהחומר אינו כלול בחלון הנוכחי. ספריית המקור נשארת זמינה.</p> : null}

    {origin !== "hashmal" && (state.available.zvi || topics.length > 0) ? <section className="sod29-world-source-subject-group" aria-label="נושאים מאושרים">
      <h4>נושאים מאושרים</h4>
      <p>נושאים בעלי זהות קיימת בעולם. לחיצה פותחת את הקשרים והמקורות שכבר שויכו אליהם.</p>
      <div className="sod29-world-source-subject-list">{topics.slice(0, visibleTopics).map(card)}</div>
      {!state.loading && !topics.length ? <p>לא נמצאו נושאים במסנן הזה.</p> : null}
      {topics.length > visibleTopics ? <button type="button" className="sod29-world-source-subject-more"
        onClick={() => setVisibleTopics((n) => n + CHUNK)}>עוד נושאים ({topics.length - visibleTopics})</button> : null}
    </section> : null}

    {origin !== "zvi" && (state.available.hashmal || sources.length > 0) ? <section className="sod29-world-source-subject-group" aria-label="מקורות שעדיין אינם נושא מאושר">
      <h4>מקורות סוד החשמל</h4>
      <p>המקורות האלה פתוחים לקריאה. המיפוי למשפחות תוכן קיים, אך קשר לנושא בעץ יוצג רק כשהוא מתועד ומאושר — לא לפי כותרת או קטגוריה.</p>
      <div className="sod29-world-source-subject-list">{sources.slice(0, visibleSources).map(card)}</div>
      {!state.loading && !sources.length ? <p>לא נמצאו מקורות במסנן הזה.</p> : null}
      {sources.length > visibleSources ? <button type="button" className="sod29-world-source-subject-more"
        onClick={() => setVisibleSources((n) => n + CHUNK)}>עוד מקורות ({sources.length - visibleSources})</button> : null}
    </section> : null}
    {!state.loading && !state.error ? <p className="sod29-world-source-subject-footer">
      מוצגים {Math.min(visibleTopics, topics.length) + Math.min(visibleSources, sources.length)} מתוך {results.length} פריטים בחיפוש.
    </p> : null}
  </div>;
}
