import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  fetchPublicSourceSubjectIndex,
  filterPublicSourceSubjects,
  interleavePublicSubjectCards,
  searchPublicGroupSourcePage,
  groupPublicSourceMessages,
  canonicalSourceSubjectCards,
} from "../../lib/research/worldPublicSourceSubjects2029.js";
import { searchCorpusContentPage, WORLD_SOURCE_CORPORA } from "../../lib/research/worldSourceCorpus.js";
import { bilingualDateLabel } from "../../lib/relativeTime2029.js";
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
const EMPTY_SEARCH = { term: "", loading: false, posts: [], messages: [], page: 0, corpusMore: false,
  groupBefore: null, groupMore: false, errors: false };
const HASHMAL = WORLD_SOURCE_CORPORA.find((item) => item.key === "sod-hashmal");
const WorldZviApprovedFindings2029 = React.lazy(() => import("./WorldZviApprovedFindings2029.jsx"));

function mergeById(previous, next, idOf) {
  const unique = new Map(previous.map((row) => [idOf(row), row]));
  for (const row of next) if (!unique.has(idOf(row))) unique.set(idOf(row), row);
  return [...unique.values()];
}

export default function WorldPublicSourceSubjects2029({ peopleIndex = null }) {
  const anchor = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [armed, setArmed] = useState(false);
  const [version, setVersion] = useState(0);
  const [state, setState] = useState(EMPTY);
  const [election, setElection] = useState(ELECTION_EMPTY);
  const [origin, setOrigin] = useState("all");
  const [query, setQuery] = useState(() => new URLSearchParams(location.search).get("q") || "");
  const [settledQuery, setSettledQuery] = useState("");
  const [visibleItems, setVisibleItems] = useState(CHUNK);
  const [search, setSearch] = useState(EMPTY_SEARCH);
  const [searchVersion, setSearchVersion] = useState(0);

  useEffect(() => {
    const requested = new URLSearchParams(location.search).get("subjectSource");
    setOrigin(["zvi", "hashmal", "topic"].includes(requested) || /^writer:[a-z0-9-]+$/.test(requested || "") ? requested : "all");
    setQuery(new URLSearchParams(location.search).get("q") || "");
    setVisibleItems(CHUNK);
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
    const timer = setTimeout(() => setSettledQuery(query.trim().replace(/\s+/g, " ")), 350);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const term = settledQuery;
    if (!armed || term.length < 2 || term.length > 160 || !HASHMAL) {
      setSearch(EMPTY_SEARCH);
      return undefined;
    }
    let alive = true;
    setSearch({ ...EMPTY_SEARCH, term, loading: true });
    Promise.allSettled([
      searchCorpusContentPage(HASHMAL, term),
      searchPublicGroupSourcePage(term, { peopleBySlug: peopleIndex?.bySlug || {} }),
    ]).then(([corpus, group]) => {
      if (!alive) return;
      setSearch({ term, loading: false, posts: corpus.status === "fulfilled" ? corpus.value.items : [],
        messages: group.status === "fulfilled" ? group.value.rows : [], page: 0,
        corpusMore: corpus.status === "fulfilled" && corpus.value.hasMore,
        groupBefore: group.status === "fulfilled" ? group.value.nextBefore : null,
        groupMore: group.status === "fulfilled" && group.value.hasMore,
        errors: corpus.status === "rejected" || group.status === "rejected" });
    });
    return () => { alive = false; };
  }, [armed, settledQuery, searchVersion, peopleIndex?.bySlug]);

  const loadMoreSearch = async () => {
    if (search.loading || search.term !== settledQuery || (!search.corpusMore && !search.groupMore)) return;
    const snapshot = search;
    setSearch((current) => ({ ...current, loading: true }));
    const [corpus, group] = await Promise.allSettled([
      snapshot.corpusMore ? searchCorpusContentPage(HASHMAL, snapshot.term, snapshot.page + 1) : Promise.resolve(null),
      snapshot.groupMore ? searchPublicGroupSourcePage(snapshot.term, { before: snapshot.groupBefore,
        peopleBySlug: peopleIndex?.bySlug || {} }) : Promise.resolve(null),
    ]);
    setSearch((current) => {
      if (current.term !== snapshot.term) return current;
      const sourcePage = corpus.status === "fulfilled" ? corpus.value : null;
      const groupPage = group.status === "fulfilled" ? group.value : null;
      return { ...current, loading: false,
        posts: sourcePage ? mergeById(current.posts, sourcePage.items, (row) => row.id) : current.posts,
        messages: groupPage ? mergeById(current.messages, groupPage.rows, (row) => row.sourceRef) : current.messages,
        page: sourcePage ? snapshot.page + 1 : snapshot.page,
        corpusMore: sourcePage ? sourcePage.hasMore : snapshot.corpusMore,
        groupBefore: groupPage ? groupPage.nextBefore : snapshot.groupBefore,
        groupMore: groupPage ? groupPage.hasMore : snapshot.groupMore,
        errors: corpus.status === "rejected" || group.status === "rejected" };
    });
  };

  useEffect(() => {
    if (!armed) return;
    let alive = true;
    setElection((previous) => ({ ...previous, loading: true, error: false }));
    fetchElectionWorldContentProjection()
      .then((next) => { if (alive) setElection({ loading: false, error: false, ...next }); })
      .catch(() => { if (alive) setElection({ loading: false, error: true, contentProjection: null, summary: null }); });
    return () => { alive = false; };
  }, [armed, version]);

  const writerSlug = origin.startsWith("writer:") ? origin.slice("writer:".length) : origin === "zvi" ? "tzvi-opoc" : null;
  const selectedWriter = writerSlug ? peopleIndex?.bySlug?.[writerSlug] || null : null;
  const selectedWriterName = selectedWriter && peopleIndex.people.filter((person) =>
    person.displayName === selectedWriter.displayName).length === 1 ? selectedWriter.displayName : "";
  const results = useMemo(() => {
    const textMatches = search.term === settledQuery ? search.posts : [];
    const posts = canonicalSourceSubjectCards({ hashmalPosts: textMatches }).map((card) => ({ ...card,
      description: textMatches.find((row) => `posts:${row.id}` === card.id)?.matchedExcerpt || card.description }));
    const messages = search.term === settledQuery ? groupPublicSourceMessages(search.messages) : [];
    const combined = mergeById([...posts, ...messages], state.cards, (card) => card.id);
    return interleavePublicSubjectCards(filterPublicSourceSubjects(combined, { origin, query,
      creatorName: selectedWriterName }));
  }, [state.cards, search, settledQuery, origin, query, selectedWriterName]);
  const landing = useMemo(() => buildWorldUnifiedPublicContentLanding({
    peopleIndex,
    contentPages: [state.contentProjection, election.contentProjection].filter(Boolean),
  }), [peopleIndex, state.contentProjection, election.contentProjection]);
  const landingSection = (key) => landing.sections.find((section) => section.key === key) || null;
  const selectOrigin = (next) => {
    setOrigin(next); setVisibleItems(CHUNK);
    const params = new URLSearchParams(location.search);
    if (next === "all") params.delete("subjectSource"); else params.set("subjectSource", next);
    const slug = next.startsWith("writer:") ? next.slice("writer:".length)
      : next === "zvi" ? "tzvi-opoc" : next === "hashmal" ? "sod-hashmal" : null;
    if (slug) {
      if (params.get("source") !== slug) params.delete("sourceRef");
      params.set("source", slug);
    } else {
      params.delete("source");
      params.delete("sourceRef");
    }
    const hash = location.hash.startsWith("#source-occurrence-") ? "" : location.hash;
    navigate(`${location.pathname}?${params.toString()}${hash}`, { replace: true });
  };
  const changeQuery = (value) => {
    setQuery(value); setVisibleItems(CHUNK);
    const params = new URLSearchParams(location.search);
    if (value) params.set("q", value); else params.delete("q");
    navigate(`${location.pathname}?${params.toString()}${location.hash}`, { replace: true });
  };
  const card = (item) => item.type === "source_message" ? <article key={item.id} className="sod29-world-source-subject-item">
    <span className="sod29-world-source-subject-kind">הודעת מקור · {item.creator}</span>
    <details><summary>{item.title}</summary><p>{item.fullText}</p>
      {item.fullText.length >= 1200 ? <p>הודעה זו מוצגת כאן באופן חלקי.</p> : null}
      {item.occurrences.length > 1 ? <p>{item.occurrences.length} הופעות בנוסח המוצג</p> : null}
      <ul>{item.occurrences.map((occurrence) => <li key={occurrence.ref}>
        {occurrence.href ? <Link to={occurrence.href}>פתיחת המקור</Link> : <span>ההודעה מוצגת כאן</span>}
        {occurrence.at ? ` · ${bilingualDateLabel(occurrence.at)}` : ""}
      </li>)}</ul>
    </details>
  </article> : <Link key={item.id} className="sod29-world-source-subject-item" to={item.href}>
    <span className="sod29-world-source-subject-kind">
      {item.type === "approved_topic" ? (item.origin === "zvi" ? "נושא קיים · צבי" : "נושא קיים") : "מקור לקריאה · סוד החשמל"}
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
        <p>נושאים, מקורות וקטעים ממקומות שונים נפגשים כאן. כל מקור נשאר נגיש עם הייחוס שלו.</p>
      </div>
      {!state.loading && !state.error ? <div className="sod29-world-source-subject-counts" aria-label="מלאי הנושאים והמקורות">
        <span className="sod29-world-source-subject-count">{landing.people.total ?? "אין נתון"} אנשים ציבוריים</span>
        <span className="sod29-world-source-subject-count">{landingSection("sources")?.total ?? "אין נתון"} מקורות שנטענו בעדשה זו</span>
        <span className="sod29-world-source-subject-count">{landingSection("series")?.total ?? "אין נתון"} סדרות וקטגוריות</span>
        <span className="sod29-world-source-subject-count">{state.totals.allTopics ?? "אין נתון"} נושאים קיימים בעץ</span>
      </div> : null}
    </div>
    <div className="sod29-world-source-subject-filters" role="group" aria-label="בחירה לפי מקור">
      {[["all", "הכול"], ["zvi", "צבי"], ["topic", "נושאים אחרים"], ["hashmal", "סוד החשמל"]].map(([key, label]) =>
        <button key={key} type="button" aria-pressed={origin === key}
          onClick={() => selectOrigin(key)}>{label}</button>)}
    </div>
    {peopleIndex?.people?.length ? <label className="sod29-world-source-subject-search">
      <span>חומר לפי כותב</span>
      <select value={origin.startsWith("writer:") ? origin : ""} onChange={(event) => selectOrigin(event.target.value || "all")}>
        <option value="">כל הכותבים</option>
        {peopleIndex.people.map((person) => <option key={person.slug} value={`writer:${person.slug}`}>{person.displayName}</option>)}
      </select>
    </label> : null}
    <div className="sod29-world-source-subject-origin-links">
      <Link to="/world?source=tzvi-opoc#world-contributor-material">כל דברי המקור של צבי ←</Link>
      <Link to="/world?source=sod-hashmal#world-corpus-sod-hashmal">ספריית סוד החשמל המלאה ←</Link>
    </div>
    <label className="sod29-world-source-subject-search">
      <span>חיפוש לפי נושא, מקור או מספר</span>
      <input type="search" value={query} maxLength={160} onChange={(e) => changeQuery(e.target.value)}
        placeholder={CANONICAL_PUBLIC_UI_COPY.search.subjectSourceNumber} />
    </label>

    {state.loading || !armed ? <p role="status">טוען נושאים ומקורות ציבוריים…</p> : null}
    {state.error ? <p role="status">הנושאים והמקורות אינם זמינים כרגע. <button type="button"
      onClick={() => setVersion((v) => v + 1)}>נסה שוב</button></p> : null}
    {!state.loading && !state.error && !state.available.zvi
      ? <p role="status">רשימת הנושאים המאושרים אינה זמינה כרגע.</p> : null}
    {!state.loading && !state.error && !state.available.hashmal
      ? <p role="status">ספריית סוד החשמל אינה זמינה כרגע.</p> : null}
    {state.incomplete && !state.loading ? <p role="status">חלק מהחומר אינו כלול בחלון הנוכחי. ספריית המקור נשארת זמינה.</p> : null}

    <section className="sod29-world-source-subject-group" aria-label="נושאים ומקורות">
      <h4>נושאים ומקורות</h4>
      <p>תוצאה יכולה להיות נושא, קטע או מקור לקריאה. חיפוש באותו נושא אינו יוצר קשר מאומת מעצמו.</p>
      <div className="sod29-world-source-subject-list">{results.slice(0, visibleItems).map(card)}</div>
      {!state.loading && !search.loading && !results.length ? <p>לא נמצאו פריטים בחומר שנטען.</p> : null}
      {results.length > visibleItems ? <button type="button" className="sod29-world-source-subject-more"
        onClick={() => setVisibleItems((n) => n + CHUNK)}>עוד תוצאות ({results.length - visibleItems})</button> : null}
      {search.term === settledQuery && search.loading ? <p role="status">מחפש גם בתוך מקורות…</p> : null}
      {search.term === settledQuery && search.errors ? <p role="status">חלק מהמקורות לא נטענו. <button type="button" onClick={() => setSearchVersion((n) => n + 1)}>נסה שוב</button></p> : null}
      {search.term === settledQuery && !search.loading && (search.corpusMore || search.groupMore) ? <button type="button"
        className="sod29-world-source-subject-more" onClick={loadMoreSearch}>חיפוש בהמשך המקורות</button> : null}
      {settledQuery.length >= 2 ? <p>החיפוש בודק את הנושאים שנטענו, מקורות סוד החשמל והודעות ציבוריות בחלון שנבדק. ייתכן שיש חומר נוסף.</p> : null}
    </section>
    {settledQuery.length >= 2 && settledQuery === query.trim().replace(/\s+/g, " ")
      && (origin === "all" || selectedWriter?.id) ? <React.Suspense fallback={<p role="status">מחפש קטעים…</p>}>
      <WorldZviApprovedFindings2029 key={`world-search:${settledQuery}:${selectedWriter?.id || "all"}`}
        scope="all" query={settledQuery} contributorId={selectedWriter?.id || null} autoOpen />
    </React.Suspense> : null}
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
      מוצגים {Math.min(visibleItems, results.length)} מתוך {results.length} פריטים שנטענו בחיפוש.
    </p> : null}
  </div>;
}
