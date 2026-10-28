import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  fetchPublicSourceSubjectIndex,
  filterPublicSourceSubjects,
} from "../../lib/research/worldPublicSourceSubjects2029.js";
import { fetchElectionWorldContentProjection } from "../../lib/research/worldElectionContentProjection.js";
import { buildWorldUnifiedPublicContentLanding } from "../../lib/research/worldUnifiedPublicContentLanding.js";
import { CANONICAL_PUBLIC_UI_COPY } from "../../lib/presentation/canonicalPresentation.js";
import "./worldPublicSourceSubjects2029.css";

// One World reader stage. Source works are shown AFTER approved Topic identities,
// not falsely promoted to Topics by their title, previous CMS category or author.
const CHUNK = 18;
const EMPTY = { loading: true, cards: [], totals: { allTopics: null, zvi: null, hashmal: null },
  available: { allTopics: false, zvi: false, hashmal: false }, error: false, incomplete: false };
const ELECTION_EMPTY = { loading: true, contentProjection: null, summary: null, error: false };

export default function WorldPublicSourceSubjects2029({ peopleIndex = null }) {
  const anchor = useRef(null);
  const location = useLocation();
  const [armed, setArmed] = useState(false);
  const [version, setVersion] = useState(0);
  const [state, setState] = useState(EMPTY);
  const [election, setElection] = useState(ELECTION_EMPTY);
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

  useEffect(() => {
    if (!armed) return;
    let alive = true;
    setElection((previous) => ({ ...previous, loading: true, error: false }));
    fetchElectionWorldContentProjection()
      .then((next) => { if (alive) setElection({ loading: false, error: false, ...next }); })
      .catch(() => { if (alive) setElection({ loading: false, error: true, contentProjection: null, summary: null }); });
    return () => { alive = false; };
  }, [armed, version]);

  const results = useMemo(() => filterPublicSourceSubjects(state.cards, { origin, query }), [state.cards, origin, query]);
  const landing = useMemo(() => buildWorldUnifiedPublicContentLanding({
    peopleIndex,
    contentPages: [state.contentProjection, election.contentProjection].filter(Boolean),
  }), [peopleIndex, state.contentProjection, election.contentProjection]);
  const landingSection = (key) => landing.sections.find((section) => section.key === key) || null;
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
    {item.type === "approved_topic" ? <span className="sod29-world-source-subject-meta">
      חוזק תצוגה: {item.meterScore ?? "טרם דורג"} · אינו ציון אמת
    </span> : null}
    <small>{item.type === "approved_topic" ? CANONICAL_PUBLIC_UI_COPY.action.topic : CANONICAL_PUBLIC_UI_COPY.action.source} ←</small>
  </Link>;

  return <div ref={anchor} id="world-public-content-map" className="sod29-world-source-subject-index"
    aria-label="נושאים ומקורות מתוך עץ המציאות" data-world-public-source-subjects>
    <div className="sod29-world-source-subject-head">
      <div>
        <h3>מפת החומר הציבורי</h3>
        <p>אנשים, מקורות, סדרות, ממצאים וחיבורים מתועדים לעץ — כל שכבה נשארת נפרדת.</p>
      </div>
      {!state.loading && !state.error ? <div className="sod29-world-source-subject-counts" aria-label="מלאי הנושאים והמקורות">
        <span className="sod29-world-source-subject-count">{landing.people.total ?? "אין נתון"} אנשים ציבוריים</span>
        <span className="sod29-world-source-subject-count">{landingSection("sources")?.total ?? "אין נתון"} מקורות שנטענו בעדשה זו</span>
        <span className="sod29-world-source-subject-count">{landingSection("series")?.total ?? "אין נתון"} סדרות וקטגוריות</span>
        <span className="sod29-world-source-subject-count">{state.totals.allTopics ?? "אין נתון"} נושאים קיימים בעץ</span>
      </div> : null}
    </div>
    {!state.loading && !state.error ? <p className="sod29-world-source-subject-inventory-note">
      78 נושאי צבי נשארים תת־קבוצה של הנושאים הקיימים לצורך תאימות. פרסומי סוד החשמל נשארים מקורות בסדרה, ואינם נספרים כנושאים. חומר של כותב נבחר נטען רק לאחר הבחירה מעל.
    </p> : null}
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
      }} placeholder={CANONICAL_PUBLIC_UI_COPY.search.subjectSourceNumber} />
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
      <h4>נושאים קיימים בתאימות · {state.totals.zvi ?? "—"} נושאי צבי מתוך {state.totals.allTopics ?? "—"}</h4>
      <p>אלה אותן זהויות נושא של העץ הכללי, מסודרות לפי חוזק התצוגה. הן אינן מדד לקורפוס המקורות; המד מסביר סדר בלבד ואינו ציון אמת.</p>
      <div className="sod29-world-source-subject-list">{topics.slice(0, visibleTopics).map(card)}</div>
      {!state.loading && !topics.length ? <p>לא נמצאו נושאים במסנן הזה.</p> : null}
      {topics.length > visibleTopics ? <button type="button" className="sod29-world-source-subject-more"
        onClick={() => setVisibleTopics((n) => n + CHUNK)}>עוד נושאים ({topics.length - visibleTopics})</button> : null}
    </section> : null}

    {origin !== "zvi" && (state.available.hashmal || sources.length > 0) ? <section className="sod29-world-source-subject-group" aria-label="מקורות שעדיין אינם נושא מאושר">
      <h4>סדרת מקורות · סוד החשמל</h4>
      <p>המקורות האלה פתוחים לקריאה כסדרה. קשר לעץ מוצג רק כשהוא מתועד ומאושר — לא לפי כותרת, מחבר או קטגוריה.</p>
      <div className="sod29-world-source-subject-list">{sources.slice(0, visibleSources).map(card)}</div>
      {!state.loading && !sources.length ? <p>לא נמצאו מקורות במסנן הזה.</p> : null}
      {sources.length > visibleSources ? <button type="button" className="sod29-world-source-subject-more"
        onClick={() => setVisibleSources((n) => n + CHUNK)}>עוד מקורות ({sources.length - visibleSources})</button> : null}
    </section> : null}
    {!election.loading && !election.error && election.summary ? <section className="sod29-world-source-subject-group" id="world-elections-content" aria-label="חתך בחירות בישראל">
      <h4>חתך עץ · בחירות בישראל</h4>
      <p>שני מחזורי הבחירות ממופים לאותו חוזה ציבורי: מקור, הופעה, חישוב מנוע, נגזרת מערכת ופרשנות נשארים שכבות נפרדות. זהו מיפוי בבדיקה אנושית, לא החלטת עץ חדשה.</p>
      <div className="sod29-world-source-subject-meta">{election.summary.cycles.join(" · ")}</div>
      <div className="sod29-world-source-subject-meta">{election.summary.sources} מקורות · {election.summary.sourceFacts} עובדות מקור · {election.summary.engineCalculations} חישובי מנוע · {election.summary.systemDerivations} נגזרות מערכת · {election.summary.interpretations} פרשנויות</div>
      <p className="sod29-world-source-subject-desc">נקודת החדשות 1,456 נשמרת כתמונת דיווח של 70% ספירה; הנגזרת ל־456 נשארת יישום מתועד של שיטת האחד והאפס, ואינה תוצאת בחירות או שוויון עצמאי.</p>
      <p className="sod29-world-source-subject-desc">{election.summary.galleryPublicCount} תמונות גלריה עברו דרך הקורא הציבורי הקיים. קשרים מוצעים אינם מוצגים כקשרי עץ עד לאסמכתת edge או החלטה ממשלית מתועדת.</p>
    </section> : null}
    {election.error ? <p role="status">חתך הבחירות אינו זמין כרגע; מפת המקורות האחרת נשארת זמינה.</p> : null}
    {!state.loading && !state.error ? <p className="sod29-world-source-subject-footer">
      מוצגים {Math.min(visibleTopics, topics.length) + Math.min(visibleSources, sources.length)} מתוך {results.length} פריטים בחיפוש.
    </p> : null}
  </div>;
}
