import React, { useEffect, useMemo, useState } from "react";
import { AHAVAT_BOOK_SLUG, AHAVAT_COVER_IMAGE, ahavatDivisionForPage, ahavatNavigationHierarchy, ahavatNavigationSearch } from "../../data/ahavatBookNavigation2029.js";
import { AHAVAT_DS01_BOOKS, AHAVAT_DS01_SOURCE_PAGE, AHAVAT_DS01_TOTAL, ahavatDs01RowSum } from "../../data/ahavatTorahDs01Source2029.js";
import { AHAVAT_TORAH_DATASETS, sectionForPage } from "../../data/ahavatTorahSystem2029.js";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";
import { bookToWorkspaceItem, fetchBookEntityBySlug } from "../../lib/research/bookResearchProjection.js";
import { dossierSelectionSourceRef, selectionToWorkspaceItem } from "../../lib/research/bookSelectionAdapter.js";
import "./ahavatBookEntry2029.css";

const DATASET_STATE_LABEL = Object.freeze({ closed: "טבלה קריאה", partial: "קריאה חלקית", open: "פתוח לקריאה", unknown: "טרם הוכרע" });

export function AhavatBookFigure2029() {
  return <figure className="ahavat29-cover">
    <img src={AHAVAT_COVER_IMAGE.src} width={AHAVAT_COVER_IMAGE.width} height={AHAVAT_COVER_IMAGE.height} alt={AHAVAT_COVER_IMAGE.alt} decoding="async" />
    <figcaption>{AHAVAT_COVER_IMAGE.caption}</figcaption>
  </figure>;
}

export function AhavatBookToc2029({ page, onOpenPage, onSelectDataset }) {
  const [query, setQuery] = useState("");
  const hierarchy = useMemo(() => ahavatNavigationHierarchy(), []);
  const results = useMemo(() => ahavatNavigationSearch(query), [query]);
  const current = ahavatDivisionForPage(page);
  const open = result => {
    const dataset = result.datasetId ? AHAVAT_TORAH_DATASETS.find(item => item.id === result.datasetId) : null;
    if (dataset) onSelectDataset(dataset); else onOpenPage(result.page);
  };

  return <section className="ahavat29-toc" id="ahavat29-toc" aria-labelledby="ahavat29-toc-title">
    <header>
      <div><span>תוכן עניינים</span><h2 id="ahavat29-toc-title">שבע חטיבות · אזורי המקור · הנושאים והטבלאות</h2></div>
      <p>החטיבות הן סדר הקריאה. האזורים הם החלוקה לפי המקור. הנושאים והטבלאות פותחים את העמוד שבו הם נמצאים.</p>
    </header>
    <label className="ahavat29-toc-search"><span>חיפוש נושא בספר</span>
      <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="למשל: שם ה׳, 1820, אותיות, אסתר" />
    </label>
    {query.trim().length >= 2 ? <div className="ahavat29-toc-results" role="status" aria-live="polite">
      {results.length ? results.map(result => <button type="button" key={`${result.kind}-${result.id}`} data-toc-kind={result.kind} onClick={() => open(result)}>
        <b>{result.label}</b><small><bdi>{result.detail}</bdi></small>
      </button>) : <p>לא נמצא נושא תואם. אפשר לדפדף בחטיבות או לפתוח עמוד ישירות.</p>}
    </div> : null}
    <ol className="ahavat29-toc-list">
      {hierarchy.map(division => <li key={division.id} className={division.id === current.id ? "is-current" : ""} data-toc-division={division.id}>
        <button type="button" className="ahavat29-toc-division" aria-current={division.id === current.id ? "true" : undefined} onClick={() => onOpenPage(division.from)}>
          <span>חטיבה {division.index}</span><strong>{division.title}</strong><small><bdi dir="ltr">PDF {division.from}–{division.to}</bdi></small>
        </button>
        <div className="ahavat29-toc-kinds">
          <div><em>חלקי הספר</em>{division.areas.map(area => <button type="button" key={area.id} data-toc-kind="area" onClick={() => onOpenPage(area.page)}>{area.shortTitle}<small><bdi dir="ltr">{area.from}–{area.to}</bdi></small></button>)}</div>
          <div><em>נושאים</em><ul>{division.points.map(point => <li key={point}>{point}</li>)}</ul></div>
          {division.topics.length ? <div><em>טבלאות ומבנים</em>{division.topics.map(topic => <button type="button" key={topic.id} data-toc-kind="topic" onClick={() => onSelectDataset(topic)}>{topic.title}<small><bdi>{topic.total}</bdi></small></button>)}</div> : null}
        </div>
      </li>)}
    </ol>
  </section>;
}

function SelectionActions({ page, selection }) {
  const research = useResearch();
  const [book, setBook] = useState(null);
  const [note, setNote] = useState("");
  const subject = research?.context?.subject;
  const numeric = selection?.total && /^[\d,]+$/.test(selection.total) ? selection.total.replaceAll(",", "") : "";

  useEffect(() => {
    if (!selection) return undefined;
    let alive = true;
    fetchBookEntityBySlug(AHAVAT_BOOK_SLUG).then(found => { if (alive) setBook(found || null); }).catch(() => { if (alive) setBook(null); });
    return () => { alive = false; };
  }, [Boolean(selection)]); // eslint-disable-line react-hooks/exhaustive-deps

  const addSelection = () => {
    const sourceRef = dossierSelectionSourceRef(book, { id: selection.id, pdf_page: page }, "id");
    const item = selectionToWorkspaceItem(book, { source_ref: sourceRef, title: selection.title }) || bookToWorkspaceItem(book);
    research?.addToResearch?.(item);
    setNote("הבחירה נוספה למחקר.");
  };

  return <div className="ahavat29-selection-actions" aria-label="פעולות לבחירה הנוכחית">
    <a href={`#ahavat29-source`} onClick={event => { event.preventDefault(); selection?.onSource?.(); }}>המקור · PDF {page}</a>
    <a href={`/2029/control?surface=books-unified-reader&book=${AHAVAT_BOOK_SLUG}&page=${page}`}>בקורא האחיד</a>
    {numeric ? <a href={`/2029/number/${numeric}`}>המספר {selection.total}</a> : null}
    {subject?.href ? <a href={subject.href}>חזרה למחקר: {subject.label || "המחקר הנוכחי"}</a> : null}
    {book && selection ? <button type="button" onClick={addSelection}>הוסף למחקר</button> : null}
    {note ? <span role="status">{note}</span> : null}
    <details className="ahavat29-source-details ahavat29-gaps"><summary>מה עדיין לא מחובר</summary>
      <p>החיבור לעץ, להיכל ולעולם עדיין אינו קיים עבור בחירה בתוך ספר, ולכן לא מוצג כאן כפתור. {book ? "" : "גם ההוספה למחקר תוצג רק כשזהות הספר החיה זמינה בסשן."}</p>
    </details>
  </div>;
}

// Selected-unit panel above the explanation column. For DS-01 it projects the
// existing PDF 6 reading as a five-book picker; it computes nothing new.
export function AhavatSelectionPanel2029({ page, datasetId, onOpenPage }) {
  const [bookId, setBookId] = useState(AHAVAT_DS01_BOOKS[0].id);
  const [parasha, setParasha] = useState("");
  const division = ahavatDivisionForPage(page);
  const area = sectionForPage(page);
  const dataset = AHAVAT_TORAH_DATASETS.find(item => item.id === datasetId && item.pages.includes(page)) || null;
  const divine = dataset?.id === "DS-01";
  const active = AHAVAT_DS01_BOOKS.find(book => book.id === bookId) || AHAVAT_DS01_BOOKS[0];
  const row = divine ? active.rows.find(([name]) => name === parasha) : null;
  const selection = dataset ? { id: dataset.id, title: row ? `${dataset.title} · ${active.title} · ${row[0]}` : dataset.title, total: dataset.total, onSource: () => onOpenPage(page, dataset.id) } : { id: `page-${page}`, title: `${area.shortTitle} · PDF ${page}`, total: "", onSource: () => onOpenPage(page) };

  return <section className="ahavat29-selection" id="ahavat29-selection" aria-labelledby="ahavat29-selection-title" data-selection-dataset={dataset?.id || ""}>
    <header>
      <div><span>הבחירה שלך · חטיבה {division.title} · {area.shortTitle}</span><h2 id="ahavat29-selection-title">{dataset ? dataset.title : `מקור והסבר · עמוד ${page}`}</h2></div>
      {dataset ? <b>{dataset.total}</b> : <b>PDF {page}</b>}
    </header>
    {dataset ? <p>{dataset.summary} <small>{DATASET_STATE_LABEL[dataset.state]}</small></p> : <p>בחרו נושא בתוכן העניינים, או דפדפו בעמודי המקור. הסבר הקטע שנבחר יופיע כאן, לצד העמוד.</p>}
    {divine ? <div className="ahavat29-selection-divine">
      <div className="ahavat29-selection-books" role="group" aria-label="בחירת חומש">
        {AHAVAT_DS01_BOOKS.map(book => <button type="button" key={book.id} aria-pressed={book.id === bookId} onClick={() => { setBookId(book.id); setParasha(""); onOpenPage(AHAVAT_DS01_SOURCE_PAGE, "DS-01", { preservePosition: true }); }}><small>{book.title}</small><strong>{book.count}</strong></button>)}
      </div>
      <p>{active.title}: סיכום מודפס {active.printed} = {active.count}; שורות הפרשות נסגרות ל־{ahavatDs01RowSum(active)}. חמשת הסיכומים יחד: {AHAVAT_DS01_TOTAL.toLocaleString("en-US")}. זהו מניין המחבר, לא ספירת קורפוס עצמאית.</p>
      <div className="ahavat29-selection-parashot" role="group" aria-label={`פרשות ${active.title}`}>
        {active.rows.map(([name, count]) => <button type="button" key={name} aria-pressed={name === parasha} onClick={() => setParasha(name)}><span>{name}</span><b>{count}</b></button>)}
      </div>
      {row ? <p className="ahavat29-selection-picked" role="status">פרשת {row[0]}: {row[1]} מופעים בקריאת הספר · הטבלה המודפסת בעמוד 6.</p> : null}
    </div> : null}
    <SelectionActions page={page} selection={selection} />
  </section>;
}
