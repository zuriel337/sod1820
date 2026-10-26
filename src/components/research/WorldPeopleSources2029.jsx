import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { bilingualDateLabel } from "../../lib/relativeTime2029.js";
import {
  WORLD_SOURCE_FILTERS,
  WORLD_SOURCE_ITEMS_PAGE_SIZE,
  fetchWorldContributorPublicMaterial,
  filterWorldPeopleAndSources,
  worldCatalogFilterForSourceRef,
} from "../../lib/research/worldPeopleSourcesProjection.js";
import { WORLD_PEOPLE_PAGE_SIZE } from "../../lib/research/worldPublicPeopleIndex.js";
import { WORLD_SOURCE_CORPORA } from "../../lib/research/worldSourceCorpus.js";
import WorldSourceCorpus from "./WorldSourceCorpus.jsx";
import WorldCatalogCards2029 from "./WorldCatalogCards2029.jsx";
import { worldFocusedMaterialWindow } from "../../lib/research/worldFocusedMaterial2029.js";

export default function WorldPeopleSources2029({ index, loading = false, error = null, recentCounts = {}, focusedSourceRef = null }) {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const source = params.get("source") || "";
  const corpus = WORLD_SOURCE_CORPORA.find((entry) => entry.key === source) || null;
  const selected = index?.bySlug?.[source] || null;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(() => source
    ? worldCatalogFilterForSourceRef(focusedSourceRef)
    : "all");
  const [peopleLimit, setPeopleLimit] = useState(WORLD_PEOPLE_PAGE_SIZE);
  const [itemLimit, setItemLimit] = useState(WORLD_SOURCE_ITEMS_PAGE_SIZE);
  const [material, setMaterial] = useState({ slug: null, loading: false, data: null, error: null });
  const focusedCard = useRef(null);
  const appliedFocus = useRef(null);

  const chooseSource = (slug) => {
    setItemLimit(WORLD_SOURCE_ITEMS_PAGE_SIZE);
    setFilter(slug ? "sources" : "all");
    const next = new URLSearchParams(location.search);
    next.set("view", "sources");
    if (slug) next.set("source", slug); else next.delete("source");
    next.delete("subjectSource");
    next.delete("sourceRef");
    navigate(`${location.pathname}?${next.toString()}#world-source-selection`);
  };

  useEffect(() => {
    let alive = true;
    if (!selected) {
      setMaterial({ slug: null, loading: false, data: null, error: null });
      return () => { alive = false; };
    }
    setMaterial({ slug: selected.slug, loading: true, data: null, error: null });
    fetchWorldContributorPublicMaterial(selected, {
      sourceLimit: itemLimit + 1,
      filter,
      sourceRef: focusedSourceRef,
    })
      .then((data) => {
        if (alive) setMaterial({ slug: selected.slug, loading: false, data, error: null });
      })
      .catch((readError) => {
        if (alive) setMaterial({ slug: selected.slug, loading: false, data: null, error: readError });
      });
    return () => { alive = false; };
  }, [selected, itemLimit, filter, focusedSourceRef]);

  useEffect(() => {
    if (!source || !focusedSourceRef) return;
    setItemLimit(WORLD_SOURCE_ITEMS_PAGE_SIZE);
    setFilter(worldCatalogFilterForSourceRef(focusedSourceRef));
  }, [source, focusedSourceRef]);

  useEffect(() => {
    setPeopleLimit(WORLD_PEOPLE_PAGE_SIZE);
  }, [query, filter]);

  const chooseFilter = (key) => {
    setItemLimit(WORLD_SOURCE_ITEMS_PAGE_SIZE);
    setFilter(key);
  };

  const selectedMaterial = material.slug === selected?.slug
    ? material
    : { slug: selected?.slug || null, loading: Boolean(selected), data: null, error: null };
  const filtered = filterWorldPeopleAndSources({
    people: index?.people || [],
    items: selectedMaterial.data?.items || [],
  }, { query, filter });
  const shownPeople = filtered.people.slice(0, peopleLimit);
  const nonTopics = filtered.items.filter((row) => row.type !== "topics");
  const topics = filtered.items.filter((row) => row.type === "topics");
  const orderedItems = [...nonTopics, ...topics];
  const materialWindow = worldFocusedMaterialWindow(orderedItems, {
    limit: itemLimit,
    sourceRef: focusedSourceRef,
    availableItems: focusedSourceRef && filter !== "all"
      && worldCatalogFilterForSourceRef(focusedSourceRef) !== filter
      ? [{ sourceRef: focusedSourceRef }]
      : selectedMaterial.data?.items || [],
  });
  const shownItems = materialWindow.rows;
  const writerHref = selected ? `${selected.href}?${new URLSearchParams({
    returnTo: `${location.pathname}${location.search}${location.hash}`,
  })}` : null;

  useEffect(() => {
    const key = `${source}:${focusedSourceRef || ""}`;
    if (!focusedSourceRef) { appliedFocus.current = null; return; }
    if (!materialWindow.focusedItem || !focusedCard.current || appliedFocus.current === key) return;
    focusedCard.current.focus({ preventScroll: true });
    focusedCard.current.scrollIntoView({ block: "center", behavior: "auto" });
    appliedFocus.current = key;
  }, [source, focusedSourceRef, materialWindow.focusedItem]);

  return <div className="sod29-world-people-sources" id="world-source-selection">
    <section className="sod29-world-source-homes" aria-label="כל האנשים הציבוריים בעולם">
      <header><div className="sod29-kicker">דפי כותבים שהתעדכנו לאחרונה</div><h2>העדכניים ביותר תחילה</h2>
        <p>מוצגים תחילה עד 20 דפים ציבוריים לפי מועד העדכון. רשומות פרטיות, נעולות או בבנייה אינן נכנסות לאינדקס.</p></header>
      <div className="sod29-world-source-controls">
        <label><span>חיפוש לפי אדם, כותרת או מספר</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="שם, כותרת או מספר…" /></label>
        <div role="group" aria-label="סינון אנשים ומקורות">
          {WORLD_SOURCE_FILTERS.map(([key, label]) => <button type="button" key={key} aria-pressed={filter === key}
            onClick={() => chooseFilter(key)}>{label}</button>)}
        </div>
      </div>
      {loading ? <p role="status">פותח את האינדקס הציבורי…</p> : null}
      {error ? <p role="status">האינדקס הציבורי אינו זמין כרגע.</p> : null}
      {!loading && !error && (filter === "all" || filter === "people") ? <>
        <p className="sod29-world-source-count">מוצגים {shownPeople.length} מתוך {filtered.people.length} אנשים ציבוריים</p>
        <div className="sod29-world-source-home-grid">
          {shownPeople.map((person) => <article key={person.slug} className={selected?.slug === person.slug ? "is-selected" : ""}>
            <span>{person.slug === "tzvi-opoc" ? "מקור בולט" : person.role}</span>
            <strong>{person.displayName}</strong>
            {person.code ? <small>מספר כתב · {person.code}</small> : null}
            <small>{person.updatedAt ? <>עודכן · <time dateTime={person.updatedAt}>{bilingualDateLabel(person.updatedAt)}</time></> : "תאריך עדכון לא צוין"}</small>
            <div className="sod29-actions">
              <button type="button" aria-pressed={selected?.slug === person.slug} onClick={() => chooseSource(person.slug)}>החומר בעולם</button>
              <Link to={person.href}>דף הכתב</Link>
            </div>
          </article>)}
        </div>
        {shownPeople.length < filtered.people.length ? <button className="sod29-action" type="button"
          onClick={() => setPeopleLimit((value) => value + WORLD_PEOPLE_PAGE_SIZE)}>לכל דפי הכותבים ({filtered.people.length - shownPeople.length} נוספים)</button> : null}
      </> : null}
    </section>

    <section className="sod29-world-source-homes" aria-label="ספריות ומקורות בולטים">
      <header><div className="sod29-kicker">ספריות בולטות</div><h2>מקורות שאפשר לקרוא כסדרה</h2>
        <p>סוד החשמל וצבי נשארים כניסות בולטות, אך אינם מוצגים כאילו הם כל העולם.</p></header>
      <div className="sod29-world-source-home-grid">
        {WORLD_SOURCE_CORPORA.map((spec) => <button type="button" key={spec.key} aria-expanded={corpus?.key === spec.key}
          aria-controls={`world-corpus-${spec.key}`} onClick={() => chooseSource(corpus?.key === spec.key ? "" : spec.key)}>
          <span>ספריית מקורות</span><strong>{spec.label}</strong><small>לקרוא את החומר הציבורי ←</small>
        </button>)}
      </div>
    </section>

    {corpus ? <WorldSourceCorpus spec={corpus} recentCount={recentCounts?.[corpus.authorLabel] ?? null} /> : null}

    {source && focusedSourceRef && !selected && !corpus && !loading && !error
      ? <p role="status">המקור שבקישור אינו זמין בתצוגה הציבורית.</p> : null}

    {selected ? <section className="sod29-section sod29-world-selected-source" aria-label={`החומר הציבורי של ${selected.displayName}`}>
      <header className="sod29-section-head"><div><div className="sod29-kicker">החומר הציבורי שנבחר</div>
        <h2>{selected.displayName}</h2><p>הקטלוג נטען במנות לאחר הבחירה. ממצא מחקר נשאר מחובר למקורו ואינו נספר כמקור נוסף.</p></div>
        <Link className="sod29-action" to={writerHref}>לדף הכתב המלא</Link></header>
      {selectedMaterial.loading ? <p role="status">פותח כתבים, מקורות, צפנים ונושאים…</p> : null}
      {selectedMaterial.error ? <div role="status"><strong>חלק מהחומר אינו זמין כרגע.</strong><p>לא מוצג 0 במקום נתון שלא התקבל.</p></div> : null}
      {selectedMaterial.data?.partial ? <p role="status">חלק מן הקוראים לא השלימו טעינה; נתון חסר מוצג כ״אין נתון״.</p> : null}
      {selectedMaterial.data ? <>
        {materialWindow.focusState === "filtered_out" ? <p role="status">המקור שבקישור מוסתר במסנן הנוכחי.</p> : null}
        {materialWindow.focusState === "unavailable" ? <p role="status">{selectedMaterial.data.partial
          ? "לא ניתן לאמת את המקור שבקישור מתוך המידע שנטען."
          : "המקור שבקישור אינו זמין בתצוגה הציבורית."}</p> : null}
        <p className="sod29-world-source-count">מוצגים {shownItems.length} מתוך {orderedItems.length} פריטים שנטענו במסנן
          {selectedMaterial.data.hasMoreSources ? " · קיימים מקורות ציבוריים נוספים" : ""}</p>
        {!orderedItems.length ? <p role="status">אין חומר ציבורי במסנן הזה.</p> : null}
        <WorldCatalogCards2029 items={shownItems} labels={Object.fromEntries(WORLD_SOURCE_FILTERS)}
          focusedSourceRef={focusedSourceRef} focusedCardRef={focusedCard} />
        {materialWindow.hasMore || selectedMaterial.data.hasMoreSources ? <button className="sod29-action" type="button"
          onClick={() => setItemLimit((value) => value + WORLD_SOURCE_ITEMS_PAGE_SIZE)}>עוד</button> : null}
      </> : null}
    </section> : null}
  </div>;
}
