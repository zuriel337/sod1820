import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import BookFullscreenButton2029 from "../components/books2029/BookFullscreenButton2029.jsx";
import NavigationIcon2029 from "../components/experience2029/NavigationIcon2029.jsx";
import Sod2029Shell from "../components/experience2029/Sod2029Shell.jsx";
import {
  AHAVAT_TORAH_DATASETS,
  AHAVAT_TORAH_DEEP_PAGES,
  AHAVAT_TORAH_EXTRACTION_LAYERS,
  AHAVAT_TORAH_AI_EXPLANATIONS_HE,
  AHAVAT_TORAH_FINDINGS,
  AHAVAT_TORAH_PIPELINE,
  AHAVAT_TORAH_SECTIONS,
  AHAVAT_TORAH_SOURCE,
  AHAVAT_TORAH_TRUTH_STATES,
  hebrewBlockKind,
  readingArcForPage,
  sectionForPage,
} from "../data/ahavatTorahSystem2029.js";
import { applySeo } from "../lib/seo.js";
import { AHAVAT_DS01_BOOKS, AHAVAT_DS01_SOURCE_PAGE, AHAVAT_DS01_TOTAL, ahavatDs01RowSum } from "../data/ahavatTorahDs01Source2029.js";
import "./ahavatTorahSystem2029.css";

const AhavatTorahSpatialScene2029 = lazy(() => import("../components/books2029/AhavatTorahSpatialScene2029.jsx"));

function requestedPage() {
  if (typeof window === "undefined") return 6;
  const value = Number(new URLSearchParams(window.location.search).get("page"));
  return Number.isInteger(value) && value >= 1 && value <= AHAVAT_TORAH_SOURCE.pdfPages ? value : 6;
}

function replaceSelectionInUrl(page, findingId, datasetId = "") {
  const next = new URL(window.location.href);
  next.searchParams.set("page", String(page));
  if (findingId) next.searchParams.set("finding", findingId);
  else next.searchParams.delete("finding");
  if (datasetId) next.searchParams.set("dataset", datasetId);
  else next.searchParams.delete("dataset");
  window.history.replaceState({}, "", `${next.pathname}${next.search}${next.hash}`);
}

function StatusPill({ status }) {
  const state = AHAVAT_TORAH_TRUTH_STATES[status];
  return <span className={`ahavat29-status-pill is-${state.tone}`} title={state.description}>{state.label}</span>;
}

function SourcePanel({ page, contextLabel, onPage }) {
  const pdfUrl = `${AHAVAT_TORAH_SOURCE.pdfUrl}#page=${page}&view=FitH`;
  const [pageDraft, setPageDraft] = useState(String(page));
  const fullscreenRef = useRef(null);

  useEffect(() => setPageDraft(String(page)), [page]);

  const submitPage = event => {
    event.preventDefault();
    const nextPage = Math.min(AHAVAT_TORAH_SOURCE.pdfPages, Math.max(1, Number(pageDraft) || 1));
    onPage(nextPage);
  };

  return <aside ref={fullscreenRef} id="ahavat29-source" className="ahavat29-source book-fullscreen29-target" aria-labelledby="ahavat29-source-title">
    <header>
      <div><span>המקור נשאר פתוח</span><h2 id="ahavat29-source-title">עמוד PDF {page}</h2></div>
      <div className="ahavat29-source-actions"><b>{contextLabel}</b><BookFullscreenButton2029 targetRef={fullscreenRef} fallbackHref={pdfUrl} controls="ahavat29-source" /></div>
    </header>
    <div className="ahavat29-pdf-frame" data-book-pdf-frame>
      <iframe key={page} src={pdfUrl} title={`${AHAVAT_TORAH_SOURCE.title}, עמוד PDF ${page}`} loading="eager" />
    </div>
    <form className="ahavat29-page-nav" onSubmit={submitPage} aria-label="ניווט בכל 99 עמודי המקור">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="לעמוד הקודם">הקודם</button>
      <label><span>עמוד PDF</span><input inputMode="numeric" min="1" max={AHAVAT_TORAH_SOURCE.pdfPages} value={pageDraft} onChange={event => setPageDraft(event.target.value)} /></label>
      <span>מתוך {AHAVAT_TORAH_SOURCE.pdfPages}</span>
      <button type="submit">עבור</button>
      <button type="button" disabled={page >= AHAVAT_TORAH_SOURCE.pdfPages} onClick={() => onPage(page + 1)} aria-label="לעמוד הבא">הבא</button>
    </form>
    <dl data-book-reader-secondary>
      <div><dt>זהות מקור</dt><dd>{AHAVAT_TORAH_SOURCE.identity}</dd></div>
      <div><dt>מחבר</dt><dd>{AHAVAT_TORAH_SOURCE.author}</dd></div>
      <div><dt>דפוס</dt><dd>{AHAVAT_TORAH_SOURCE.imprint}</dd></div>
      <div><dt>מעמד</dt><dd>עד מקור · לא פרסום ממצא</dd></div>
    </dl>
    <nav aria-label="קישורי מקור" data-book-reader-secondary>
      <a href={pdfUrl} target="_blank" rel="noreferrer">פתח PDF בעמוד {page} ↗</a>
      <a href={AHAVAT_TORAH_SOURCE.catalogUrl} target="_blank" rel="noreferrer">רשומת HebrewBooks ↗</a>
    </nav>
    <p data-book-reader-secondary>המקור קודם לכל שכבת הסבר; מספר העמוד נשמר כמראה־המקום הקבוע.</p>
  </aside>;
}

function OrbitMap({ selectedId, onSelect }) {
  return <section className="ahavat29-map" aria-labelledby="ahavat29-map-title">
    <header>
      <div><span>מפת המקור</span><h2 id="ahavat29-map-title">שמונה אזורים · ספר אחד</h2></div>
      <p>בחר אזור כדי לפתוח את עמוד ההתחלה שלו ולקרוא הסבר עכשווי לצד המקור.</p>
    </header>
    <div className="ahavat29-orbit" role="group" aria-label="אזורי ספר אהבת תורה">
      <div className="ahavat29-orbit-core"><small>מקור אחד</small><strong>אהבת<br />תורה</strong><span>99 עמודים</span></div>
      <i className="ahavat29-orbit-ring is-one" aria-hidden="true" />
      <i className="ahavat29-orbit-ring is-two" aria-hidden="true" />
      {AHAVAT_TORAH_SECTIONS.map((section, index) => <button
        type="button"
        key={section.id}
        className={selectedId === section.id ? "is-active" : ""}
        style={{ "--i": index, "--section-color": section.color }}
        aria-pressed={selectedId === section.id}
        onClick={() => onSelect(section)}
      >
        <span>{section.index}</span><strong>{section.shortTitle}</strong><small>עמ׳ {section.range[0]}–{section.range[1]}</small>
      </button>)}
    </div>
  </section>;
}

function SectionReader({ section, onPage }) {
  return <article className="ahavat29-reader" aria-labelledby="ahavat29-reader-title">
    <header>
      <span style={{ "--section-color": section.color }}>{section.index}</span>
      <div><small>עמודי PDF {section.range[0]}–{section.range[1]}</small><h2 id="ahavat29-reader-title">{section.title}</h2></div>
      <StatusPill status={section.status} />
    </header>
    <p className="ahavat29-reader-lead">{section.description}</p>
    <section>
      <span>הסבר קריאה עכשווי</span>
      <p>{section.guide}</p>
      <small>הסבר נלווה · המקור המלא פתוח לצדו.</small>
    </section>
    <footer>
      <button type="button" onClick={() => onPage(section.page)}>פתח את עמוד ההתחלה במקור</button>
      <span>{section.range[1] - section.range[0] + 1} עמודים באזור</span>
    </footer>
  </article>;
}

function FindingCard({ finding, active, onSelect }) {
  return <button type="button" className={active ? "is-active" : ""} onClick={() => onSelect(finding)} aria-pressed={active}>
    <header><span>{finding.dataset}</span><StatusPill status={finding.status} /></header>
    <strong className="ahavat29-finding-value">{finding.value}</strong>
    <h3>{finding.title}</h3>
    <p>{finding.sourceNote}</p>
    <footer><span>עמ׳ {finding.pages.join(" / ")}</span><b>הצג מקור ←</b></footer>
  </button>;
}

const DATASET_FILTERS = Object.freeze([
  { id: "all", label: "הכול" },
  { id: "closed", label: "סגור במקור" },
  { id: "partial", label: "חלקי" },
  { id: "open", label: "פתוח" },
  { id: "unknown", label: "לא מוכרע" },
]);

function DatasetCatalog({ selectedId, onSelect }) {
  const [filter, setFilter] = useState("all");
  const visible = filter === "all"
    ? AHAVAT_TORAH_DATASETS
    : AHAVAT_TORAH_DATASETS.filter(dataset => dataset.state === filter);
  const selected = AHAVAT_TORAH_DATASETS.find(dataset => dataset.id === selectedId) || null;

  return <section className="ahavat29-datasets" aria-labelledby="ahavat29-datasets-title">
    <header>
      <div><span>מפת המחקר המלאה בשכבה הקיימת</span><h2 id="ahavat29-datasets-title">כל 13 מאגרי הבדיקה</h2></div>
      <p>מפת עבודה של החומר שכבר נקרא, חולץ וקושר לעמודיו.</p>
    </header>
    <nav className="ahavat29-dataset-filters" aria-label="סינון מאגרי בדיקה">
      {DATASET_FILTERS.map(item => <button type="button" key={item.id} className={filter === item.id ? "is-active" : ""} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}<b>{item.id === "all" ? AHAVAT_TORAH_DATASETS.length : AHAVAT_TORAH_DATASETS.filter(dataset => dataset.state === item.id).length}</b></button>)}
    </nav>
    <div className="ahavat29-dataset-grid">
      {visible.map(dataset => <button type="button" key={dataset.id} className={selectedId === dataset.id ? "is-active" : ""} aria-pressed={selectedId === dataset.id} onClick={() => onSelect(dataset)}>
        <header><span>{dataset.id}</span><StatusPill status={dataset.truthState} /></header>
        <strong>{dataset.title}</strong>
        <b>{dataset.total}</b>
        <p>{dataset.summary}</p>
        <footer><span>PDF {dataset.pages.join(" · ")}</span><em>פתח מקור ופרטים ←</em></footer>
      </button>)}
    </div>
    {selected ? <article className="ahavat29-dataset-detail" aria-live="polite">
      <div><span>{selected.id} · {selected.pages.length} עמודי מקור</span><h3>{selected.title}</h3><p>{selected.summary}</p></div>
      <section><span>השלב הבא למאגר הזה</span><p>{selected.nextStep}</p></section>
      <button type="button" onClick={() => onSelect(selected)}>פתח PDF בעמוד {selected.pages[0]}</button>
    </article> : null}
  </section>;
}

const SPATIAL_TABS = Object.freeze([
  { id: "datasets", label: "מאגרי הספר", count: 13 },
  { id: "letters", label: "טבלת האותיות", count: 187 },
  { id: "moses", label: "מופעי משה", count: 37 },
  { id: "calculations", label: "חישובים", count: 7 },
  { id: "families", label: "משפחות 1,820", count: 9 },
  { id: "contradictions", label: "פערים במקור", count: 10 },
]);

const DATASET_STATE_LABELS = Object.freeze({
  closed: "סגור במקור",
  partial: "חלקי",
  open: "פתוח לקריאה",
  unknown: "טרם הוכרע",
});

function sourceStateLabel(value = "") {
  if (/^CLOSED/.test(value)) return "סגור בשכבת המקור";
  if (/^PARTIAL/.test(value)) return "שכבה חלקית";
  if (/^OPEN/.test(value)) return "פתוח לקריאה";
  if (/SOURCE_VERIFIED|VISUALLY_VERIFIED/.test(value)) return "נבדק מול המקור";
  if (/UNCERTAIN/.test(value)) return "קריאה לא מוכרעת";
  if (/UNKNOWN|UNRESOLVED/.test(value)) return "טרם הוכרע";
  if (/SUBSTANTIALLY RESOLVED/.test(value)) return "נפתר ברובו";
  if (/ARITHMETIC_VERIFIED/.test(value)) return "החשבון נבדק";
  if (/SOURCE CLAIM|AUTHOR_COUNT/.test(value)) return "דברי הספר";
  return value || "לא צוין";
}

function visibleBook(value = "") {
  if (value === "unclear") return "לא ברור במקור";
  if (value === "-") return "לא משויך לחומש";
  return value || "—";
}

function exactPage(value, fallback = 6) {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 && page <= AHAVAT_TORAH_SOURCE.pdfPages ? page : fallback;
}

function visibleLetter(value = "") {
  const hebrew = value.match(/[א-ת][א-ת״׳]?/u)?.[0];
  if (!hebrew) return "—";
  return /candidate|SUSPECT|uncertainty/i.test(value) ? `${hebrew} · קריאה מועמדת` : hebrew;
}

function SpatialDatasetLegend({ selectedId, onSelect }) {
  return <div className="ahavat29-spatial-legend" role="list" aria-label="שלושה עשר מאגרי הספר">
    {AHAVAT_TORAH_DATASETS.map(dataset => <button
      type="button"
      role="listitem"
      key={dataset.id}
      className={`is-${dataset.state} ${selectedId === dataset.id ? "is-active" : ""}`}
      aria-pressed={selectedId === dataset.id}
      onClick={() => onSelect(dataset)}
    >
      <span>{dataset.id}</span>
      <strong>{dataset.title}</strong>
      <small>{dataset.pages.length} עמודי מקור · {DATASET_STATE_LABELS[dataset.state]}</small>
    </button>)}
  </div>;
}

function DatasetTable({ selectedId, onSelect }) {
  return <div className="ahavat29-data-table-wrap">
    <table className="ahavat29-data-table">
      <thead><tr><th>מאגר</th><th>נושא</th><th>תוצאה בדברי הספר</th><th>עמודי מקור</th><th>מצב</th><th><span className="sr-only">פעולה</span></th></tr></thead>
      <tbody>{AHAVAT_TORAH_DATASETS.map(dataset => <tr key={dataset.id} className={selectedId === dataset.id ? "is-active" : ""}>
        <td><b>{dataset.id}</b></td><td>{dataset.title}</td><td>{dataset.total}</td><td>{dataset.pages.join(" · ")}</td><td>{DATASET_STATE_LABELS[dataset.state]}</td>
        <td><button type="button" onClick={() => onSelect(dataset)}>פתח PDF {dataset.pages[0]}</button></td>
      </tr>)}</tbody>
    </table>
  </div>;
}

function OccurrenceTable({ table, kind, onPage }) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(36);
  const rows = table?.rows || [];
  const normalized = normalizeSearch(query);
  const filtered = useMemo(() => rows.filter(row => !normalized || normalizeSearch(Object.values(row).filter(value => typeof value === "string" || typeof value === "number").join(" ")).includes(normalized)), [normalized, rows]);
  const visibleRows = filtered.slice(0, limit);
  const letters = kind === "letters";

  useEffect(() => setLimit(36), [kind, query]);

  return <div className="ahavat29-occurrence">
    <div className="ahavat29-table-tools">
      <label><span>חיפוש בתוך הטבלה</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={letters ? "אות, פרשה, חומש או מספר" : "פרשה, חומש או מספר"} /></label>
      <strong>{filtered.length} שורות</strong>
    </div>
    <div className="ahavat29-data-table-wrap">
      <table className="ahavat29-data-table">
        <thead>{letters
          ? <tr><th>אות</th><th>פרשה</th><th>חומש</th><th>ערך</th><th>מצב קריאה</th><th>מקור</th></tr>
          : <tr><th>חומש</th><th>פרשה</th><th>בדברי הספר</th><th>ערך</th><th>מצב קריאה</th><th>מקור</th></tr>}
        </thead>
        <tbody>{visibleRows.map((row, index) => {
          const page = exactPage(row.pdf_page, table?.pdf_pages?.[0] || 6);
          return letters ? <tr key={`${row.pdf_page}-${row.letter}-${row.parasha}-${index}`}>
            <td><b>{visibleLetter(row.letter)}</b></td><td>{row.parasha || "—"}</td><td>{visibleBook(row.book)}</td><td>{row.normalized_integer || row.source_value || "—"}</td><td>{sourceStateLabel(row.verification_state)}</td>
            <td><button type="button" onClick={() => onPage(page)}>PDF {page}</button></td>
          </tr> : <tr key={`${row.sefer}-${row.parasha}-${index}`}>
            <td>{row.sefer || "—"}</td><td>{row.parasha || "—"}</td><td>{row.printed || "—"}</td><td>{row.decimal ?? "—"}</td><td>{sourceStateLabel(row.confidence)}</td>
            <td><button type="button" onClick={() => onPage(exactPage(table?.pdf_pages?.[0], 70))}>PDF {table?.pdf_pages?.[0] || 70}</button></td>
          </tr>;
        })}</tbody>
      </table>
    </div>
    {limit < filtered.length ? <button className="ahavat29-show-more" type="button" onClick={() => setLimit(value => value + 36)}>הצג עוד 36 שורות</button> : null}
    {!filtered.length ? <p className="ahavat29-table-empty">לא נמצאה התאמה בטבלה.</p> : null}
    <details className="ahavat29-source-details"><summary>פרטי המקור</summary><p>{table?.title}</p><p>עמודי PDF: {(table?.pdf_pages || []).join(" · ")}</p><p>מצב השכבה: {sourceStateLabel(table?.status)}</p></details>
  </div>;
}

function ResearchCards({ kind, records = [], onPage }) {
  return <div className={`ahavat29-research-cards is-${kind}`}>
    {records.map((record, index) => {
      const pages = record.pdf_pages || [];
      const page = exactPage(pages[0]);
      if (kind === "calculations") return <article key={record.calculation_id}>
        <header><span>{record.calculation_id}</span><b>{sourceStateLabel(record.confidence)}</b></header>
        <strong>{record.output}</strong>
        <p>{(record.intermediate_values || []).join(" · ")}</p>
        <footer><small>{sourceStateLabel(record.truth_class)}</small><button type="button" onClick={() => onPage(page)}>פתח PDF {page}</button></footer>
      </article>;
      if (kind === "families") return <article key={`family-${record.n}`}>
        <header><span>{String(record.n).padStart(2, "0")}</span><b>מבנה מתוך הספר</b></header>
        <strong>{record.construction}</strong>
        <p>{sourceStateLabel(record.truth_class)}</p>
        <footer><small>עמודי מקור {pages.join(" · ")}</small><button type="button" onClick={() => onPage(page)}>פתח PDF {page}</button></footer>
      </article>;
      return <article key={record.id || index}>
        <header><span>{record.id}</span><b>{sourceStateLabel(record.status)}</b></header>
        <strong>{record.conflict}</strong>
        <p>פער מתועד: {record.delta}</p>
        <footer><small>הפער נשמר כפי שנמצא ואינו מתוקן אוטומטית.</small><button type="button" onClick={() => onPage(page)}>פתח PDF {page}</button></footer>
      </article>;
    })}
  </div>;
}

function DivineNameSourceModel({ onPage }) {
  const [activeId, setActiveId] = useState("bereshit");
  const [showScene, setShowScene] = useState(false);
  const active = AHAVAT_DS01_BOOKS.find(book => book.id === activeId) || AHAVAT_DS01_BOOKS[0];
  const selectBook = id => {
    setActiveId(id);
    onPage(AHAVAT_DS01_SOURCE_PAGE);
  };

  return <section className="ahavat29-ds01" aria-labelledby="ahavat29-ds01-title">
    <header>
      <div><span>מגדל עוז · דברי הספר · PDF 6</span><h3 id="ahavat29-ds01-title">מניין שם ה׳ בחמשת החומשים</h3></div>
      <strong>{AHAVAT_DS01_TOTAL.toLocaleString("en-US")}</strong>
    </header>
    <p className="ahavat29-ds01-guide"><b>הסבר נלווה:</b> המחבר פותח בשאלה כמה פעמים נזכר השם בתורה, מונה לפי פרשות ומסכם כל חומש. חמשת הסיכומים המודפסים נותנים יחד 1,820. זהו המניין המובא בספר; ההמחשה מציגה אותו כפי שנדפס.</p>
    <div className="ahavat29-ds01-equation" aria-label="סכום חמשת החומשים">
      {AHAVAT_DS01_BOOKS.map((book, index) => <React.Fragment key={book.id}>{index > 0 ? <span aria-hidden="true">+</span> : null}<button type="button" className={activeId === book.id ? "is-active" : ""} onClick={() => selectBook(book.id)}><small>{book.title}</small><strong>{book.count}</strong></button></React.Fragment>)}
      <span aria-hidden="true">=</span><b>1,820</b>
    </div>
    <div className="ahavat29-ds01-controls"><button type="button" aria-expanded={showScene} onClick={() => setShowScene(value => !value)}>{showScene ? "סגור מבנה תלת־ממדי" : "פתח מבנה תלת־ממדי"}</button><button type="button" onClick={() => onPage(AHAVAT_DS01_SOURCE_PAGE)}>פתח את דברי הספר · PDF 6</button></div>
    {showScene ? <div className="ahavat29-ds01-scene"><Suspense fallback={<p role="status">טוען את מבנה חמשת החומשים…</p>}><AhavatTorahSpatialScene2029 mode="ds01" activeId={activeId} onSelect={selectBook} /></Suspense><small>גובה = המניין המודפס לכל חומש · לחיצה פותחת את עמוד המקור</small></div> : null}
    <div className="ahavat29-ds01-detail" aria-live="polite"><div><span>{active.title} · {active.printed} בדברי הספר</span><strong>{active.count} מופעים במניין המחבר</strong><p>{active.reading === "closed" ? `תאי הפרשות שנקראו נסגרים לסכום החומש: ${ahavatDs01RowSum(active)}.` : "סכום החומש נקרא בעמוד; תאי הפרשות דורשים הכרעה נוספת ולכן אינם מוצגים כמניין סגור."}</p></div><button type="button" onClick={() => onPage(AHAVAT_DS01_SOURCE_PAGE)}>ראה PDF 6</button></div>
    {active.rows.length ? <div className="ahavat29-data-table-wrap"><table className="ahavat29-data-table"><thead><tr><th>פרשה</th><th>מופעי השם בדברי הספר</th><th>מקור</th></tr></thead><tbody>{active.rows.map(([name, count]) => <tr key={name}><td>{name}</td><td><b>{count}</b></td><td><button type="button" onClick={() => onPage(AHAVAT_DS01_SOURCE_PAGE)}>PDF 6</button></td></tr>)}</tbody></table></div> : null}
    <details className="ahavat29-source-details"><summary>פרטי המקור והקריאה</summary><p>אהבת תורה, חלק א׳, עמוד מודפס א׳, PDF 6. המניין הוא טענת המחבר. חיבור חמשת הסיכומים נבדק חשבונית; לא בוצעה כאן ספירת קורפוס עצמאית. בשמות ובבמדבר נותרה אי־התאמה בקריאת תאי הפרשות ולכן מוצג רק הסכום המודפס.</p></details>
  </section>;
}

function SpatialTables({ bundle, bundleState, selectedId, onSelect, onPage }) {
  const [tab, setTab] = useState("datasets");
  const [showScene, setShowScene] = useState(false);
  const selected = AHAVAT_TORAH_DATASETS.find(dataset => dataset.id === selectedId) || AHAVAT_TORAH_DATASETS[0];
  const occurrenceTables = bundle?.occurrence_tables || [];

  const selectById = id => {
    const dataset = AHAVAT_TORAH_DATASETS.find(item => item.id === id);
    if (dataset) onSelect(dataset);
  };

  return <section className="ahavat29-spatial" aria-labelledby="ahavat29-spatial-title">
    <header>
      <div><span>מצפה הנתונים של הספר</span><h2 id="ahavat29-spatial-title">טבלאות שאפשר להיכנס לתוכן</h2></div>
      <p>התלת־ממד מציג מבנה אמיתי: גובה הוא מספר עמודי המקור, צבע הוא מצב הקריאה, וכל מגדל פותח את ה־PDF המדויק.</p>
    </header>

    <DivineNameSourceModel onPage={onPage} />

    <div className="ahavat29-spatial-key" aria-label="מקרא המצפה">
      <span><i className="is-height" />גובה = מספר עמודי מקור</span>
      <span><i className="is-color" />צבע = מצב קריאה</span>
      <span><i className="is-order" />מיקום = סדר המאגר</span>
    </div>

    <div className="ahavat29-spatial-stage">
      <div className="ahavat29-spatial-stage-head">
        <div><span>המאגר הנבחר</span><strong>{selected.id} · {selected.title}</strong><small>{selected.pages.length} עמודי מקור · PDF {selected.pages.join(" · ")}</small></div>
        <button type="button" aria-expanded={showScene} onClick={() => setShowScene(value => !value)}>{showScene ? "סגור מצפה תלת־ממדי" : "פתח מצפה תלת־ממדי"}</button>
      </div>
      {showScene ? <div className="ahavat29-spatial-scene">
        <Suspense fallback={<p role="status">טוען את המצפה התלת־ממדי…</p>}>
          <AhavatTorahSpatialScene2029 datasets={AHAVAT_TORAH_DATASETS} activeId={selected.id} onSelect={selectById} />
        </Suspense>
        <span className="ahavat29-spatial-hint">גרירה לסיבוב · גלילה להתקרבות · לחיצה לבחירת מאגר</span>
      </div> : <div className="ahavat29-spatial-poster"><strong>13</strong><span>מגדלי מקור מוכנים לפתיחה</span><small>המודל נטען רק בלחיצה כדי שהספר וה־PDF יישארו מהירים.</small></div>}
      <SpatialDatasetLegend selectedId={selected.id} onSelect={onSelect} />
    </div>

    <nav className="ahavat29-table-tabs" aria-label="טבלאות אהבת תורה">
      {SPATIAL_TABS.map(item => <button type="button" key={item.id} className={tab === item.id ? "is-active" : ""} aria-pressed={tab === item.id} onClick={() => setTab(item.id)}><span>{item.label}</span><b>{item.count}</b></button>)}
    </nav>

    <div className="ahavat29-table-panel">
      {bundleState === "loading" ? <p role="status">טוען את טבלאות הספר…</p> : null}
      {bundleState === "error" ? <p role="alert">שכבת הטבלאות לא נטענה. ה־PDF המלא נשאר זמין.</p> : null}
      {bundleState === "ready" && tab === "datasets" ? <DatasetTable selectedId={selected.id} onSelect={onSelect} /> : null}
      {bundleState === "ready" && tab === "letters" ? <OccurrenceTable table={occurrenceTables[0]} kind="letters" onPage={onPage} /> : null}
      {bundleState === "ready" && tab === "moses" ? <OccurrenceTable table={occurrenceTables[1]} kind="moses" onPage={onPage} /> : null}
      {bundleState === "ready" && tab === "calculations" ? <ResearchCards kind="calculations" records={bundle?.calculations} onPage={onPage} /> : null}
      {bundleState === "ready" && tab === "families" ? <ResearchCards kind="families" records={bundle?.number_families} onPage={onPage} /> : null}
      {bundleState === "ready" && tab === "contradictions" ? <ResearchCards kind="contradictions" records={bundle?.contradictions} onPage={onPage} /> : null}
    </div>
  </section>;
}

function normalizeSearch(value = "") {
  return value.normalize("NFKD").replace(/[\u0591-\u05c7]/g, "").replace(/\s+/g, " ").trim().toLocaleLowerCase("he");
}

function FullBookReader({ page, bundle, bundleState, pageTextBundle, pageTextState, onPage }) {
  const [query, setQuery] = useState("");
  const record = AHAVAT_TORAH_DEEP_PAGES.find(item => item.page === page) || null;
  const machinePage = pageTextBundle?.pages?.find(item => Number(item.pdf_page) === page) || null;
  const readingArc = readingArcForPage(page);
  const pageBlocks = useMemo(() => (bundle?.content_blocks || []).filter(block => Number(block.pdf_page) === page), [bundle, page]);
  const pageSources = useMemo(() => (bundle?.sources || []).filter(source => (source.pdf_pages || []).map(Number).includes(page)), [bundle, page]);
  const pageDatasets = AHAVAT_TORAH_DATASETS.filter(dataset => dataset.pages.includes(page));
  const normalizedQuery = normalizeSearch(query);
  const searchablePages = useMemo(() => (pageTextBundle?.pages || []).map(item => ({
    ...item,
    flatText: item.text.replace(/\s+/g, " ").trim(),
    normalizedText: normalizeSearch(item.text),
  })), [pageTextBundle]);
  const searchResults = useMemo(() => {
    if (normalizedQuery.length < 2) return [];
    return searchablePages.flatMap(item => {
      const position = item.normalizedText.indexOf(normalizedQuery);
      if (position < 0) return [];
      const start = Math.max(0, position - 72);
      return [{ page: item.pdf_page, snippet: `${start ? "…" : ""}${item.flatText.slice(start, start + 210)}${item.flatText.length > start + 210 ? "…" : ""}` }];
    }).slice(0, 24);
  }, [normalizedQuery, searchablePages]);
  const extractedPages = pageTextBundle?.pages?.filter(item => item.extraction_status === "machine_candidate").length || 0;

  return <section className="ahavat29-depth" aria-labelledby="ahavat29-depth-title">
    <header>
      <div><span>הספר מתחילתו ועד סופו</span><h2 id="ahavat29-depth-title">99 עמודים · קורא מלא וחיפוש</h2></div>
      <p>לכל עמוד יש מקור PDF והסבר ניווט עברי. {extractedPages || "כל"} עמודים זמינים גם כתעתיק מכונה לחיפוש; 15 עמודים קיבלו קריאת עומק אנושית־מחקרית.</p>
    </header>
    <div className="ahavat29-search">
      <label htmlFor="ahavat29-search-input"><span>חיפוש בכל הספר</span><input id="ahavat29-search-input" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="לדוגמה: אברהם, אותיות, אלף תת״ך" /></label>
      <small>החיפוש פותח כל תוצאה לצד עמוד המקור.</small>
      {normalizedQuery.length >= 2 ? <div className="ahavat29-search-results" aria-live="polite">
        <strong>{searchResults.length ? `${searchResults.length} תוצאות ראשונות` : "לא נמצאה התאמה"}</strong>
        {searchResults.map(result => <button type="button" key={`${result.page}-${result.snippet}`} onClick={() => onPage(result.page)}><b>PDF {result.page}</b><span>{result.snippet}</span></button>)}
      </div> : null}
    </div>

    <nav className="ahavat29-page-atlas" aria-label="כל 99 עמודי הספר">
      {Array.from({ length: AHAVAT_TORAH_SOURCE.pdfPages }, (_, index) => index + 1).map(pageNumber => {
        const deep = AHAVAT_TORAH_DEEP_PAGES.some(item => item.page === pageNumber);
        const hasText = pageTextBundle?.pages?.some(item => item.pdf_page === pageNumber && item.extraction_status === "machine_candidate");
        return <button type="button" key={pageNumber} className={`${pageNumber === page ? "is-active" : ""} ${deep ? "is-deep" : hasText ? "is-machine" : "is-source"}`} aria-pressed={pageNumber === page} onClick={() => onPage(pageNumber)} title={deep ? "קריאת עומק" : hasText ? "תעתיק מכונה" : "מקור בלבד"}>{pageNumber}</button>;
      })}
    </nav>
    <div className="ahavat29-page-atlas-legend"><span className="is-deep">קריאת עומק</span><span className="is-machine">תעתיק מכונה</span><span className="is-source">מקור בלבד</span></div>

    <article className="ahavat29-depth-reader">
      <header><div><span>PDF {page}{record?.printed ? ` · עמוד מודפס ${record.printed}` : ""}</span><h3>{readingArc.title}</h3></div><StatusPill status={record ? "source_verified" : "machine_candidate"} /></header>
      <section className="ahavat29-ai-guide">
        <span>הסבר נלווה · מפת קריאה</span>
        <p>{readingArc.explanation}</p>
        <small>הסבר נלווה לעמודים {readingArc.range[0]}–{readingArc.range[1]} · המקור פתוח לצדו.</small>
      </section>

      {record ? <>
        <dl>
          <div><dt>יחידות תוכן</dt><dd>{record.blocks}</dd></div>
          <div><dt>טבלאות</dt><dd>{record.tables}</dd></div>
          <div><dt>קריאות פתוחות</dt><dd>{record.unresolved}</dd></div>
        </dl>
        {bundleState === "loading" ? <p role="status">טוען את יחידות התוכן…</p> : null}
        {bundleState === "error" ? <p role="alert">קובץ המחקר לא נטען. המקור עצמו נשאר זמין בחלון ה־PDF.</p> : null}
        {bundleState === "ready" ? <div className="ahavat29-depth-blocks">
          {pageBlocks.map((block, index) => <section key={block.block_id || `${page}-${index}`}>
            <span>{String(index + 1).padStart(2, "0")} · {hebrewBlockKind(block.block_id)}</span>
            {block.text_he ? <p>{block.text_he}</p> : null}
            {AHAVAT_TORAH_AI_EXPLANATIONS_HE[block.block_id] ? <small><b>הסבר נלווה:</b> {AHAVAT_TORAH_AI_EXPLANATIONS_HE[block.block_id]}</small> : null}
            <a href={`${AHAVAT_TORAH_SOURCE.pdfUrl}#page=${page}&view=FitH`} target="_blank" rel="noreferrer">ראה מקור בעמוד {page} ↗</a>
          </section>)}
          {!pageBlocks.length ? <p>אין יחידות טקסט להצגה בעמוד זה בשכבה הנוכחית.</p> : null}
        </div> : null}
      </> : <div className="ahavat29-depth-empty"><span>קריאת עומק בהמשך</span><h3>העמוד נגיש במלואו כמקור וכתעתיק</h3><p>אפשר לקרוא ולחפש עכשיו, כשה־PDF המקורי נשאר צמוד לעמוד.</p></div>}

      {(pageDatasets.length || pageSources.length) ? <section className="ahavat29-page-links" aria-label="קשרי מחקר לעמוד">
        <span>קשרים שכבר אותרו בעמוד</span>
        <div>{pageDatasets.map(dataset => <b key={dataset.id}>{dataset.id} · {dataset.title}</b>)}{pageSources.map((source, index) => <b key={`${source.source_as_printed}-${index}`}>מקור: {source.source_as_printed}</b>)}</div>
      </section> : null}

      {pageTextState === "loading" ? <p role="status">טוען את תעתיק הספר המלא…</p> : null}
      {pageTextState === "error" ? <p role="alert">התעתיק לא נטען. ה־PDF המקורי נשאר זמין.</p> : null}
      {pageTextState === "ready" ? <details className="ahavat29-machine-text" open={!record}>
        <summary>תעתיק מלא לעמוד {page}</summary>
        {machinePage?.text ? <pre>{machinePage.text}</pre> : <p>לא חולץ טקסט מן העמוד. ייתכן שזהו עמוד ריק או עמוד תמונה בלבד.</p>}
      </details> : null}
      <a className="ahavat29-page-source-link" href={`${AHAVAT_TORAH_SOURCE.pdfUrl}#page=${page}&view=FitH`} target="_blank" rel="noreferrer">פתח את עמוד {page} ב־PDF המקורי ↗</a>
    </article>
  </section>;
}

function ExtractionLayers({ onPage }) {
  return <section className="ahavat29-extraction" aria-labelledby="ahavat29-extraction-title">
    <header><div><span>החומר הבא שאפשר לפתוח</span><h2 id="ahavat29-extraction-title">עוד שש שכבות מתוך הספר</h2></div><p>הסריקה המלאה כבר מאפשרת להפוך את החומר לאינדקסים, טבלאות וקשרים — תמיד עם חזרה לעמוד המקור.</p></header>
    <div>{AHAVAT_TORAH_EXTRACTION_LAYERS.map((layer, index) => <article key={layer.id}>
      <span>{String(index + 1).padStart(2, "0")}</span><h3>{layer.title}</h3><p>{layer.detail}</p><footer><small>PDF {layer.pages}</small><button type="button" onClick={() => onPage(layer.openingPage)}>פתח במקור</button></footer>
    </article>)}</div>
  </section>;
}

export default function AhavatTorahSystem2029Page() {
  const [page, setPage] = useState(requestedPage);
  const initialFinding = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("finding") || "";
  const initialDataset = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("dataset") || "";
  const [findingId, setFindingId] = useState(initialFinding);
  const [datasetId, setDatasetId] = useState(initialDataset);
  const [bundle, setBundle] = useState(null);
  const [bundleState, setBundleState] = useState("loading");
  const [pageTextBundle, setPageTextBundle] = useState(null);
  const [pageTextState, setPageTextState] = useState("loading");
  const selectedSection = useMemo(() => sectionForPage(page), [page]);
  const selectedFinding = AHAVAT_TORAH_FINDINGS.find(finding => finding.id === findingId) || null;

  useEffect(() => {
    let active = true;
    fetch(AHAVAT_TORAH_SOURCE.researchBundleUrl, { credentials: "same-origin" })
      .then(response => {
        if (!response.ok) throw new Error(`research bundle ${response.status}`);
        return response.json();
      })
      .then(nextBundle => {
        if (!active) return;
        setBundle(nextBundle);
        setBundleState("ready");
      })
      .catch(() => {
        if (!active) return;
        setBundleState("error");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    fetch(AHAVAT_TORAH_SOURCE.pageTextBundleUrl, { credentials: "same-origin" })
      .then(response => {
        if (!response.ok) throw new Error(`page text bundle ${response.status}`);
        return response.json();
      })
      .then(nextBundle => {
        if (!active) return;
        setPageTextBundle(nextBundle);
        setPageTextState("ready");
      })
      .catch(() => {
        if (!active) return;
        setPageTextState("error");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    applySeo({
      title: `אהבת תורה · מערכת מקור ומחקר · עמוד ${page}`,
      description: "תצוגת Preview מוגנת לספר אהבת תורה: מקור PDF, מפת הספר וממצאים במעמדים נפרדים.",
      path: "/2029/control",
      noindex: true,
    });
  }, [page]);

  const selectSection = section => {
    setPage(section.page);
    setFindingId("");
    setDatasetId("");
    replaceSelectionInUrl(section.page, "", "");
    if (window.matchMedia("(max-width: 900px)").matches) {
      window.requestAnimationFrame(() => document.getElementById("ahavat29-reader")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  };

  const selectFinding = finding => {
    setPage(finding.page);
    setFindingId(finding.id);
    setDatasetId("");
    replaceSelectionInUrl(finding.page, finding.id, "");
    if (window.matchMedia("(max-width: 900px)").matches) {
      window.requestAnimationFrame(() => document.getElementById("ahavat29-finding-detail")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  };

  const selectDataset = dataset => {
    setPage(dataset.pages[0]);
    setFindingId("");
    setDatasetId(dataset.id);
    replaceSelectionInUrl(dataset.pages[0], "", dataset.id);
    window.requestAnimationFrame(() => document.getElementById("ahavat29-source")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const openPage = nextPage => {
    setPage(nextPage);
    setFindingId("");
    setDatasetId("");
    replaceSelectionInUrl(nextPage, "", "");
    document.getElementById("ahavat29-source")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return <Sod2029Shell
    title="אהבת תורה"
    eyebrow="ספרים ומקורות · מערכת מחקר"
    description="המקור, מבנה הספר והממצאים נשארים מחוברים — בלי לערבב את מעמד האמת שלהם."
    status="Preview מוגן · קריאה בלבד"
    surface="books"
    symbol={<NavigationIcon2029 name="books" />}
    introVariant="none"
    wide
  >
    <main className="ahavat29" data-preview-only="true" data-publication-effect="none" data-source-identity={AHAVAT_TORAH_SOURCE.identity}>
      <section className="ahavat29-intro" aria-labelledby="ahavat29-title">
        <div>
          <span>ר׳ פנחס זלמן הורוויץ · תרס״ה</span>
          <h1 id="ahavat29-title">ספר עתיק הופך<br /><em>למרחב מחקר חי</em></h1>
          <p>המקור הוא המרכז: PDF מלא, מפה של הספר, הסבר עברי וממצאים שנפתחים בדיוק בעמוד שבו נכתבו.</p>
        </div>
        <aside><strong>קורא מלא · Preview</strong><p>כל הספר זמין לדפדוף, חיפוש ומסך מלא. נוסח הספר נשאר גלוי בכל רגע.</p></aside>
      </section>

      <section className="ahavat29-metrics" aria-label="מצב מערכת אהבת תורה">
        <article><strong>99</strong><span>עמודי מקור</span><small>PDF אחד וזהות מקור אחת</small></article>
        <article><strong>98</strong><span>עמודי תעתיק</span><small>ועמוד ריק אחד מתועד</small></article>
        <article><strong>15</strong><span>דפי עומק</span><small>תעתיק, פרפרזה ונתונים</small></article>
        <article><strong>13</strong><span>מאגרי בדיקה</span><small>סגורים, חלקיים ופתוחים</small></article>
        <article className="is-locked"><strong>0</strong><span>ממצאים ציבוריים</span><small>Preview בלבד</small></article>
      </section>

      <div className="ahavat29-layout">
        <div className="ahavat29-story">
          <OrbitMap selectedId={selectedSection.id} onSelect={selectSection} />
          <div id="ahavat29-reader"><SectionReader section={selectedSection} onPage={openPage} /></div>

          <section className="ahavat29-findings" aria-labelledby="ahavat29-findings-title">
            <header><div><span>חלונות ראשונים לחומר</span><h2 id="ahavat29-findings-title">ארבעה ממצאים · ארבעה מצבי בדיקה</h2></div><p>הכרטיס פותח את עמוד המקור. הצבע מתאר את מצב העדות, לא את מידת העניין.</p></header>
            <div>{AHAVAT_TORAH_FINDINGS.map(finding => <FindingCard key={finding.id} finding={finding} active={finding.id === findingId} onSelect={selectFinding} />)}</div>
          </section>

          {selectedFinding ? <article id="ahavat29-finding-detail" className="ahavat29-finding-detail" aria-labelledby="ahavat29-finding-detail-title">
            <header><div><span>{selectedFinding.dataset} · עמוד {selectedFinding.page}</span><h2 id="ahavat29-finding-detail-title">{selectedFinding.title}</h2></div><StatusPill status={selectedFinding.status} /></header>
            <div className="ahavat29-equation"><strong>{selectedFinding.value}</strong><span>{selectedFinding.formula}</span></div>
            <section><span>מה אפשר לומר כרגע?</span><p>{selectedFinding.explanation}</p></section>
            <footer><span>מעמד חישוב: {selectedFinding.calculation}</span><button type="button" onClick={() => openPage(selectedFinding.page)}>חזרה לעמוד המקור</button></footer>
          </article> : null}

          <DatasetCatalog selectedId={datasetId} onSelect={selectDataset} />

          <SpatialTables bundle={bundle} bundleState={bundleState} selectedId={datasetId} onSelect={selectDataset} onPage={openPage} />

          <ExtractionLayers onPage={openPage} />

          <FullBookReader page={page} bundle={bundle} bundleState={bundleState} pageTextBundle={pageTextBundle} pageTextState={pageTextState} onPage={openPage} />

          <section className="ahavat29-pipeline" aria-labelledby="ahavat29-pipeline-title">
            <header><span>המערכת שאנחנו בונים</span><h2 id="ahavat29-pipeline-title">מהמקור ועד מוצר שאפשר לסמוך עליו</h2></header>
            <ol>{AHAVAT_TORAH_PIPELINE.map(step => <li key={step.index} className={`is-${step.state}`}><span>{step.index}</span><strong>{step.title}</strong><b>{step.value}</b><small>{step.label}</small></li>)}</ol>
            <p>המקור נשמר בשלמותו, וכל שכבה נוספת נבנית מעליו עם קישור לעמוד.</p>
          </section>

          <footer className="ahavat29-legend" aria-label="מקרא מצבי אמת">
            {Object.entries(AHAVAT_TORAH_TRUTH_STATES).map(([key, state]) => <span key={key} className={`is-${state.tone}`} title={state.description}>{state.label}</span>)}
          </footer>
        </div>

        <SourcePanel page={page} contextLabel={selectedFinding?.dataset || datasetId || selectedSection.shortTitle} onPage={openPage} />
      </div>
    </main>
  </Sod2029Shell>;
}
