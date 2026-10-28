import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { bilingualDateLabel } from "../../lib/relativeTime2029.js";
import {
  WORLD_SOURCE_FILTERS,
  WORLD_SOURCE_ITEMS_PAGE_SIZE,
  fetchWorldContributorPublicMaterial,
  filterWorldPeopleAndSources,
} from "../../lib/research/worldPeopleSourcesProjection.js";
import { WORLD_PEOPLE_PAGE_SIZE } from "../../lib/research/worldPublicPeopleIndex.js";
import { WORLD_SOURCE_CORPORA } from "../../lib/research/worldSourceCorpus.js";
import WorldSourceCorpus from "./WorldSourceCorpus.jsx";
import { worldFocusedMaterialWindow } from "../../lib/research/worldFocusedMaterial2029.js";
import { CANONICAL_PUBLIC_UI_COPY } from "../../lib/presentation/canonicalPresentation.js";
import { fetchCanonicalGraphEntityFindings } from "../../lib/research/entityGraphFinding.js";
import WorldMapShell2029 from "./WorldMapShell2029.jsx";
import { createCanonicalRelationOpener } from "../../lib/research/worldGraphRelationOpener2029.js";

const TREE_RELATION_CACHE = new Map();
const WORLD_MAP_RELATION_OPENER = createCanonicalRelationOpener();

function MaterialLink({ href, children }) {
  if (!href) return <span>{children}</span>;
  return href.startsWith("/")
    ? <Link to={href}>{children}</Link>
    : <a href={href} target="_blank" rel="noreferrer">{children}</a>;
}
function materialLabel(type) {
  return Object.fromEntries(WORLD_SOURCE_FILTERS)[type] || "חומר ציבורי";
}
function materialDatePrefix(row) {
  if (row?.dateKind === "updated") return "עודכן · ";
  if (row?.dateKind === "published") return "פורסם · ";
  return "";
}

function DocumentedTreeRelations({ target }) {
  const [state, setState] = useState({ loading: false, rows: null, error: false });
  const load = () => {
    if (state.loading || state.rows) return;
    setState({ loading: true, rows: null, error: false });
    const request = TREE_RELATION_CACHE.get(target.nodeId) || fetchCanonicalGraphEntityFindings(target.nodeId);
    TREE_RELATION_CACHE.set(target.nodeId, request);
    request.then((findings) => {
      const rows = (Array.isArray(findings) ? findings : []).flatMap((finding) => (
        finding?.kind === "graph-relation" && finding?.identity?.relationRef?.startsWith("edge:")
          ? (finding?.projection?.relations || []).map((relation) => ({
            edgeRef: finding.identity.relationRef,
            relationType: relation.relationType || "קשר",
            from: relation.from?.label || relation.fromNodeId,
            to: relation.to?.label || relation.toNodeId,
          }))
          : []
      ));
      setState({ loading: false, rows, error: false });
    }).catch(() => {
      TREE_RELATION_CACHE.delete(target.nodeId);
      setState({ loading: false, rows: null, error: true });
    });
  };
  return <div className="sod29-world-tree-links">
    <button type="button" onClick={load}>חיבורים מתועדים לעץ</button>
    {state.loading ? <small role="status">פותח קשרים מתועדים…</small> : null}
    {state.error ? <small role="status">קשרי העץ אינם זמינים כרגע.</small> : null}
    {state.rows ? (state.rows.length ? <ul>{state.rows.map((relation) => <li key={relation.edgeRef}>
      {relation.from} · {relation.relationType} · {relation.to} <code dir="ltr">{relation.edgeRef}</code>
    </li>)}</ul> : <small>לא נמצאו קשרים בחלון הקשרים שנבדק; אין להסיק מכך שאין קשרים נוספים בעץ.</small>) : null}
  </div>;
}

export default function WorldPeopleSources2029({ index, loading = false, error = null, recentCounts = {}, focusedSourceRef = null }) {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const source = params.get("source") || "";
  const corpus = WORLD_SOURCE_CORPORA.find((entry) => entry.key === source) || null;
  const selected = index?.bySlug?.[source] || null;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [peopleLimit, setPeopleLimit] = useState(WORLD_PEOPLE_PAGE_SIZE);
  const [itemLimit, setItemLimit] = useState(WORLD_SOURCE_ITEMS_PAGE_SIZE);
  const [material, setMaterial] = useState({ slug: null, loading: false, data: null, error: null });
  const focusedCard = useRef(null);
  const appliedFocus = useRef(null);

  const chooseSource = (slug) => {
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
    fetchWorldContributorPublicMaterial(selected)
      .then((data) => {
        if (alive) setMaterial({ slug: selected.slug, loading: false, data, error: null });
      })
      .catch((readError) => {
        if (alive) setMaterial({ slug: selected.slug, loading: false, data: null, error: readError });
      });
    return () => { alive = false; };
  }, [selected]);

  useEffect(() => {
    setPeopleLimit(WORLD_PEOPLE_PAGE_SIZE);
    setItemLimit(WORLD_SOURCE_ITEMS_PAGE_SIZE);
  }, [query, filter, source]);

  const selectedMaterial = material.slug === selected?.slug
    ? material
    : { slug: selected?.slug || null, loading: Boolean(selected), data: null, error: null };
  const publicContent = selectedMaterial.data?.contentProjection || null;
  const sourceByRef = useMemo(() => new Map((publicContent?.sources || []).map((row) => [row.sourceRef, row])), [publicContent]);
  const occurrenceBySourceRef = useMemo(() => {
    const rows = new Map();
    for (const occurrence of publicContent?.occurrences || []) {
      const existing = rows.get(occurrence.sourceRef) || [];
      existing.push(occurrence);
      rows.set(occurrence.sourceRef, existing);
    }
    return rows;
  }, [publicContent]);
  const treeTargetsBySourceRef = useMemo(() => {
    const rows = new Map();
    for (const target of selectedMaterial.data?.treeFindingTargets || []) {
      for (const sourceRef of target.sourceRefs || []) {
        const targets = rows.get(sourceRef) || [];
        targets.push(target);
        rows.set(sourceRef, targets);
      }
    }
    return rows;
  }, [selectedMaterial.data]);
  const filtered = filterWorldPeopleAndSources({
    people: index?.people || [],
    items: selectedMaterial.data?.items || [],
  }, { query, filter });
  const shownPeople = filtered.people.slice(0, peopleLimit);
  const nonTopics = filtered.items.filter((row) => row.type !== "topics");
  const topics = filtered.items.filter((row) => row.type === "topics");
  const orderedItems = [...nonTopics, ...topics];
  const materialWindow = worldFocusedMaterialWindow(orderedItems, {
    limit: itemLimit, sourceRef: focusedSourceRef, availableItems: selectedMaterial.data?.items || [],
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
        <label><span>{CANONICAL_PUBLIC_UI_COPY.search.personTitleNumber}</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="שם, כותרת או מספר…" /></label>
        <div role="group" aria-label="סינון אנשים ומקורות">
          {WORLD_SOURCE_FILTERS.map(([key, label]) => <button type="button" key={key} aria-pressed={filter === key}
            onClick={() => setFilter(key)}>{label}</button>)}
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
              <Link to={person.href}>{CANONICAL_PUBLIC_UI_COPY.action.writer}</Link>
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
        <h2>{selected.displayName}</h2><p>הקטלוג נטען רק לאחר הבחירה. ממצא מחקר נשאר מחובר ל־source_ref שלו ואינו נספר כמקור נוסף.</p></div>
        <Link className="sod29-action" to={writerHref}>{CANONICAL_PUBLIC_UI_COPY.action.writer}</Link></header>
      {selectedMaterial.loading ? <p role="status">פותח כתבים, מקורות, צפנים ונושאים…</p> : null}
      {selectedMaterial.error ? <div role="status"><strong>חלק מהחומר אינו זמין כרגע.</strong><p>לא מוצג 0 במקום נתון שלא התקבל.</p></div> : null}
      {selectedMaterial.data?.partial ? <p role="status">חלק מן הקוראים לא השלימו טעינה; נתון חסר מוצג כ״אין נתון״.</p> : null}
      {selectedMaterial.data ? <>
        {materialWindow.focusState === "filtered_out" ? <p role="status">המקור שבקישור מוסתר במסנן הנוכחי.</p> : null}
        {materialWindow.focusState === "unavailable" ? <p role="status">{selectedMaterial.data.partial
          ? "לא ניתן לאמת את המקור שבקישור מתוך המידע שנטען."
          : "המקור שבקישור אינו זמין בתצוגה הציבורית."}</p> : null}
        <p className="sod29-world-source-count">מוצגים {shownItems.length} מתוך {orderedItems.length} פריטים במסנן · {selectedMaterial.data.total} פריטים ציבוריים נגישים בסך הכול</p>
        {publicContent?.coverage?.sources?.available ? <p className="sod29-muted">
          {publicContent.metrics.corpusSources} זהויות מקור נפרדות · {publicContent.metrics.occurrences} הופעות מדויקות.
          ממצא, נושא או אשכול אינם נספרים כמקור נוסף.
        </p> : <p className="sod29-muted">זהויות המקור אינן זמינות כרגע; לא מוצג מספר חלופי.</p>}
        {!orderedItems.length ? <p role="status">אין חומר ציבורי במסנן הזה.</p> : null}
        <div className="sod29-world-public-material-grid">
          {shownItems.map((row) => <article key={row.sourceRef} data-source-ref={row.sourceRef}
            ref={focusedSourceRef === row.sourceRef ? focusedCard : null}
            tabIndex={focusedSourceRef === row.sourceRef ? -1 : undefined}
            id={focusedSourceRef === row.sourceRef ? `source-occurrence-${row.sourceRef.split(":").pop()}` : undefined}>
            <div><span>{row.label || materialLabel(row.type)}</span>{row.date ? <time dateTime={row.date}>{materialDatePrefix(row)}{bilingualDateLabel(row.date)}</time> : <time>אין נתון</time>}</div>
            {row.mediaUrl ? <img loading="lazy" src={row.mediaUrl} alt="" /> : null}
            <h3>{row.title}</h3>
            {row.summary ? <p>{row.summary}</p> : null}
            {row.number != null ? <strong className="sod29-world-material-number">{row.number}</strong> : null}
            <code dir="ltr">{row.sourceRef}</code>
            {occurrenceBySourceRef.get(row.sourceRef)?.length > 1 ? <small>{occurrenceBySourceRef.get(row.sourceRef).length} הופעות מדויקות של אותה זהות מקור.</small> : null}
            {row.meta?.sourceRecordCount > 1 ? <small>{row.meta.sourceRecordCount} רשומות מקור נשמרו ללא כפילות מקור.</small> : null}
            <MaterialLink href={sourceByRef.get(row.sourceRef)?.sourceHref || row.href}>{(sourceByRef.get(row.sourceRef)?.sourceHref || row.href) ? `${CANONICAL_PUBLIC_UI_COPY.action.source} ←` : "אין קישור ציבורי מאומת"}</MaterialLink>
            {(treeTargetsBySourceRef.get(row.sourceRef) || []).map((target) => <DocumentedTreeRelations key={target.findingRef} target={target} />)}
          </article>)}
        </div>
        {materialWindow.hasMore ? <button className="sod29-action" type="button"
          onClick={() => setItemLimit((value) => value + WORLD_SOURCE_ITEMS_PAGE_SIZE)}>עוד</button> : null}
        {publicContent ? <WorldMapShell2029
          projection={publicContent}
          relationTargets={selectedMaterial.data.treeFindingTargets || []}
          openRelations={WORLD_MAP_RELATION_OPENER}
        /> : null}
      </> : null}
    </section> : null}
  </div>;
}
