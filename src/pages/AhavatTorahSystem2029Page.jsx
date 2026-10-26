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
  ahavatCompanionPage,
  ahavatCurrentOccurrenceReading,
  ahavatDatasetSourcePage,
  hebrewBlockKind,
  readingArcForPage,
  sectionForPage,
} from "../data/ahavatTorahSystem2029.js";
import { applySeo } from "../lib/seo.js";
import { AHAVAT_DS01_BOOKS, AHAVAT_DS01_SOURCE_PAGE, AHAVAT_DS01_TOTAL, ahavatDs01RowSum } from "../data/ahavatTorahDs01Source2029.js";
import { AHAVAT_LETTER_FORMS, AHAVAT_LETTER_READINGS, AHAVAT_LETTER_READING_LOCATIONS, ahavatLetterBalance, ahavatLetterNumber, ahavatLetterSourceFragments, ahavatSourceCountRows, ahavatSourceCountPage, ahavatSourceCountBars, ahavatSourceCountCsv } from "../data/ahavatTorahLetters2029.js";
import { AHAVAT_PARASHA_COUNT_FORMS, AHAVAT_PARASHA_COUNT_READINGS } from "../data/ahavatTorahParashaCounts2029.js";
import { AhavatTorahPeopleReader2029, AhavatTorahRootsReader2029, AhavatTorahMegillotReader2029 } from "../components/books2029/AhavatTorahSourceTables2029.jsx";
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
        <footer><span>{dataset.pages.length ? `PDF ${dataset.pages.join(" · ")}` : "מראה־המקום בבירור"}</span><em>{dataset.pages.length ? "פתח מקור ופרטים ←" : "פרטי האיתור ←"}</em></footer>
      </button>)}
    </div>
    {selected ? <article className="ahavat29-dataset-detail" aria-live="polite">
      <div><span>{selected.id} · {selected.pages.length ? `${selected.pages.length} עמודי מקור` : "מראה־המקום בבירור"}</span><h3>{selected.title}</h3><p>{selected.summary}</p></div>
      <section><span>השלב הבא למאגר הזה</span><p>{selected.nextStep}</p></section>
      {selected.pages.length ? <button type="button" onClick={() => onSelect(selected)}>פתח PDF בעמוד {selected.pages[0]}</button> : <details className="ahavat29-source-details"><summary>פרטי המקור והאיתור</summary><p>{selected.locatorReview?.note}</p><p>ה־PDF נשאר פתוח בעמוד הנוכחי.</p></details>}
    </article> : null}
  </section>;
}

const SPATIAL_TABS = Object.freeze([
  { id: "datasets", label: "מאגרי הספר", count: 13 },
  { id: "letters", label: "טבלת האותיות", count: 187 },
  { id: "moses", label: "מופעי משה", count: 10 },
  { id: "aseh", label: "מופעי עשה", count: 5 },
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
      <small>{dataset.pages.length ? `${dataset.pages.length} עמודי מקור` : "מראה־המקום בבירור"} · {DATASET_STATE_LABELS[dataset.state]}</small>
    </button>)}
  </div>;
}

function DatasetTable({ selectedId, onSelect }) {
  return <div className="ahavat29-data-table-wrap">
    <table className="ahavat29-data-table">
      <thead><tr><th>מאגר</th><th>נושא</th><th>תוצאה בדברי הספר</th><th>עמודי מקור</th><th>מצב</th><th><span className="sr-only">פעולה</span></th></tr></thead>
      <tbody>{AHAVAT_TORAH_DATASETS.map(dataset => <tr key={dataset.id} className={selectedId === dataset.id ? "is-active" : ""}>
        <td><b>{dataset.id}</b></td><td>{dataset.title}</td><td>{dataset.total}</td><td>{dataset.pages.length ? dataset.pages.join(" · ") : "מראה־המקום בבירור"}</td><td>{DATASET_STATE_LABELS[dataset.state]}</td>
        <td><button type="button" onClick={() => onSelect(dataset)}>{dataset.pages.length ? `פתח PDF ${dataset.pages[0]}` : "פרטי האיתור"}</button></td>
      </tr>)}</tbody>
    </table>
  </div>;
}

function OccurrenceTable({ table, kind, onPage }) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(36);
  const currentReading = ahavatCurrentOccurrenceReading(table);
  const rows = table?.current_reading ? currentReading?.rows || [] : table?.rows || [];
  const normalized = normalizeSearch(query);
  const filtered = useMemo(() => rows.filter(row => !normalized || normalizeSearch(Object.values(row).filter(value => typeof value === "string" || typeof value === "number").join(" ")).includes(normalized)), [normalized, rows]);
  const visibleRows = filtered.slice(0, limit);
  const letters = kind === "letters";

  useEffect(() => setLimit(36), [kind, query]);

  return <div className="ahavat29-occurrence">
    {table?.current_reading && !currentReading ? <p role="alert">הקריאה המעודכנת אינה תואמת לעד המקור. ה־PDF נשאר זמין.</p> : null}
    {(currentReading?.summary_he || table?.summary_he) ? <div className="ahavat29-ds01-guide"><strong>{currentReading?.title_he || table.title}</strong><p>{currentReading?.summary_he || table.summary_he}</p><div className="ahavat29-ds01-controls"><button type="button" onClick={() => onPage(70)}>פתח מקור הקריאה · PDF 70</button></div></div> : null}
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
    <details className="ahavat29-source-details"><summary>פרטי המקור</summary><p>{table?.title}</p><p>עמודי PDF: {(table?.pdf_pages || []).join(" · ")}</p><p>מצב השכבה: {sourceStateLabel(table?.status)}</p>
      {(currentReading?.source_note_he || table?.source_note_he) ? <p>{currentReading?.source_note_he || table.source_note_he}</p> : null}
      {currentReading?.book_totals ? <ul>{currentReading.book_totals.map(book => <li key={book.sefer}>{book.sefer}: {book.printed} = {book.decimal}</li>)}</ul> : null}
      {currentReading ? <details className="ahavat29-machine-text"><summary>תעתיק קודם · {table.rows.length} שורות</summary><p>קריאות מוקדמות נשמרות לתיעוד; אינן מחליפות את הקריאה המחודשת מול ה־PDF.</p><pre>{table.rows.map(row => `${row.sefer} · ${row.parasha} · ${row.printed || "לא מודפס"} · ${row.decimal}`).join("\n")}</pre></details> : null}
    </details>
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
    <div className="ahavat29-ds01-detail" aria-live="polite"><div><span>{active.title} · {active.printed} בדברי הספר</span><strong>{active.count} מופעים בסיכום המודפס</strong><p>{active.reading === "closed" ? `קריאת הפרשות נסגרת לסיכום החומש: ${ahavatDs01RowSum(active)}.` : `תעתיק מועמד של הפרשות: ${ahavatDs01RowSum(active)}. הסיכום המודפס: ${active.count}. הפרש: ${ahavatDs01RowSum(active) - active.count}. ${active.note}`}</p></div><button type="button" onClick={() => onPage(AHAVAT_DS01_SOURCE_PAGE)}>ראה PDF 6</button></div>
    <div className="ahavat29-data-table-wrap"><table className="ahavat29-data-table"><thead><tr><th>פרשה</th><th>{active.reading === "closed" ? "המניין שנקרא בספר" : "תעתיק מועמד של המניין"}</th><th>מקור</th></tr></thead><tbody>{active.rows.map(([name, count]) => <tr key={name}><td>{name}</td><td><b>{count}</b></td><td><button type="button" onClick={() => onPage(AHAVAT_DS01_SOURCE_PAGE)}>PDF 6</button></td></tr>)}</tbody></table></div>
    <details className="ahavat29-source-details"><summary>פרטי המקור והקריאה</summary><p>אהבת תורה, חלק א׳, עמוד מודפס א׳, PDF 6. המניין הוא טענת המחבר. לאחר תיקון שלוש קריאות מספריות מול צילום העמוד, 54 שורות הפרשות נסגרות חשבונית לחמשת הסיכומים המודפסים; לא בוצעה כאן ספירת קורפוס עצמאית.</p></details>
  </section>;
}

function LetterSectionTranscript({ source, onPage }) {
  const [bundle, setBundle] = useState(null);
  const [state, setState] = useState("loading");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/book-data/ahavat-torah.letter-sections.json", { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error("letter_source_unavailable"); return response.json(); })
      .then(value => { setBundle(value); setState("ready"); })
      .catch(error => { if (error.name !== "AbortError") setState("error"); });
    return () => controller.abort();
  }, []);
  const fragments = ahavatLetterSourceFragments(bundle, source.form);
  return <div className="ahavat29-letter-transcript">
    <p>קריאת סעיף {source.name} לצד המקור</p>
    {state === "loading" ? <p role="status">טוען את סעיף האות…</p> : null}
    {state === "error" || (state === "ready" && !fragments.length) ? <p role="alert">התעתיק לא נטען. סעיף המקור נשאר פתוח לקריאה ב־PDF.</p> : null}
    {fragments.map((fragment, index) => <details className="ahavat29-machine-text" open key={`${source.form}-${index}`}>
      <summary>תעתיק לקריאה · PDF {fragment.pdf_page} · {fragment.column === "right" ? "הטור הימני" : "הטור השמאלי"}</summary>
      <pre dir="rtl">{fragment.text}</pre>
      <div className="ahavat29-ds01-controls"><button type="button" onClick={() => onPage(fragment.pdf_page)}>פתח מקור הקטע · PDF {fragment.pdf_page}</button></div>
    </details>)}
    <details className="ahavat29-source-details"><summary>פרטי התעתיק</summary><p>התעתיק חולץ מאזור הסעיף בדפוס ונועד לסייע בקריאה ואיתור. הוא אינו ציטוט מאומת, אינו חילוץ מספרי של תאי הטבלה ואינו תוצאת מנוע. אותיות עמומות, סימני הדפוס וספרות נשארו כפי שחולצו ולא תוקנו לפי סכום משוער. חלוקת הטורים ועמודי המעבר נבדקה מול הצילום; מילות שומר־דף מתחת לגוף הטור אינן חלק מן הקטע. ה־PDF נשאר המקור המחייב.</p></details>
  </div>;
}

function LetterSourceReader({ onPage, countMode = false, selectedDatasetId }) {
  const forms = countMode ? AHAVAT_PARASHA_COUNT_FORMS : AHAVAT_LETTER_FORMS;
  const readings = countMode ? AHAVAT_PARASHA_COUNT_READINGS : AHAVAT_LETTER_READINGS;
  const formParam = countMode ? "countKind" : "letter";
  const bookParam = countMode ? "countBook" : "letterBook";
  const readerId = countMode ? "ahavat29-counts" : "ahavat29-letters";
  const [form, setForm] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get(formParam);
    return (forms.find(item => item.form === requested) || forms.find(item => item.datasetId === selectedDatasetId) || forms[0]).form;
  });
  const [bookId, setBookId] = useState(() => {
    const id = new URLSearchParams(window.location.search).get(bookParam);
    return Object.values(readings).some(books => books.some(book => book.id === id)) ? id : "all";
  });
  const [query, setQuery] = useState("");
  const [showScene, setShowScene] = useState(false);
  const [selectedBar, setSelectedBar] = useState("");
  const source = forms.find(item => item.form === form) || forms[0];
  const books = readings[form];
  const subject = countMode ? source.name : `אות ${form}׳`;
  useEffect(() => {
    if (!countMode) return;
    const selected = forms.find(item => item.datasetId === selectedDatasetId);
    if (selected && selected.form !== form) {
      setForm(selected.form);
      setQuery("");
      setSelectedBar("");
      const url = new URL(window.location.href);
      url.searchParams.set(formParam, selected.form);
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
      onPage(ahavatSourceCountPage(readings[selected.form], selected.pages, bookId), selected.datasetId);
    }
  }, [countMode, forms, form, formParam, selectedDatasetId, bookId, readings, onPage]);
  const hasReadingGap = books?.some(book => { const delta = ahavatLetterBalance(book).delta; return delta !== null && delta !== 0; });
  const unresolvedRows = books?.flatMap(book => book.rows).filter(row => row.count === null).length || 0;
  const unresolvedCheckpoints = books?.some(book => book.count === null || book.cumulative === null);
  const rows = useMemo(() => ahavatSourceCountRows(books, bookId, query), [books, bookId, query]);
  const activeBook = books?.find(book => book.id === bookId);
  const readingPages = activeBook?.pages || source.pages;
  const bars = useMemo(() => ahavatSourceCountBars(books, bookId), [books, bookId]);
  const openSourcePage = page => onPage(page, countMode ? source.datasetId : "");

  const select = (nextForm, nextBook = bookId) => {
    setForm(nextForm);
    setBookId(nextBook);
    setSelectedBar("");
    setQuery("");
    const url = new URL(window.location.href);
    url.searchParams.set(formParam, nextForm);
    url.searchParams.set(bookParam, nextBook);
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    const nextSource = forms.find(item => item.form === nextForm);
    onPage(ahavatSourceCountPage(readings[nextForm], nextSource.pages, nextBook), countMode ? nextSource.datasetId : "");
  };

  const selectBar = id => {
    if (!activeBook) select(form, id);
    else { setSelectedBar(id); openSourcePage(ahavatSourceCountPage(books, source.pages, bookId, id)); }
  };

  const downloadRows = () => {
    const csv = ahavatSourceCountCsv(books, countMode ? source.name : form, bookId, query, AHAVAT_TORAH_SOURCE.pdfUrl, countMode ? "מניין" : "אות");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ahavat-torah-${form}-${bookId}.csv`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <section className="ahavat29-letters" id={readerId} aria-labelledby={`${readerId}-title`}>
    <header><div><span>{countMode ? "תיבות ואותיות לפי פרשה" : "סופר ומונה אותיות התורה"} · דברי הספר</span><h3 id={`${readerId}-title`}>{countMode ? "מנייני הפרשות והחומשים" : "נכנסים אל האותיות"}</h3></div><strong>{countMode ? "54" : "28"}<small>{countMode ? "פרשות · שני מניינים" : "צורות בדפוס"}</small></strong></header>
    <p className="ahavat29-ds01-guide"><b>הסבר נלווה:</b> {countMode ? source.explanation : "המחבר עובר אות אחר אות, ומונה אותה בכל פרשה. כ״ב האותיות מתפרטות כאן גם לחמש אותיות סופיות ולשׁין ושׂין בנפרד. בחירת צורה פותחת את מקומה המדויק בספר."}</p>
    <nav className={countMode ? "ahavat29-letter-books" : "ahavat29-letter-alphabet"} aria-label={countMode ? "בחירת מניין הפרשות" : "צורות האותיות בדפוס"}>{forms.map(item => <button type="button" key={item.form} aria-label={item.name} aria-pressed={item.form === form} onClick={() => select(item.form)}>{countMode ? item.name : <><b>{item.form}</b><small>{item.name}</small></>}</button>)}</nav>
    <div className="ahavat29-letter-location" aria-live="polite"><div><strong>{countMode ? source.unit : source.form}</strong><span>{source.name} · {source.pages.length === 1 ? "עמוד מקור אחד" : "הסעיף נמשך לעמוד הבא"}</span></div><div>{source.pages.map(page => <button type="button" key={page} onClick={() => openSourcePage(page)}>פתח PDF {page}</button>)}</div></div>
    {books ? <>
      <p className="ahavat29-ds01-guide">{countMode ? `במניין ${source.unit}` : `לאות ${form}׳`} מוצגת כאן קריאה של פרשות הספר: <b>{ahavatLetterNumber(books.at(-1).cumulative)}</b> בסיכום הספר. המספר של כל חומש הוא חלקו לפי הסיכומים המודפסים; השורה שמתחתיו מראה עד היכן הגיע הסכום המצטבר.</p>
      <div className="ahavat29-letter-checkpoints" aria-label={`מניין ${source.name} לפי חומש`}>{books.map(book => <button type="button" key={book.id} aria-pressed={bookId === book.id} onClick={() => select(form, book.id)}><span>{book.title}</span><strong>{ahavatLetterNumber(book.count)}</strong><small>מצטבר {ahavatLetterNumber(book.cumulative)}</small></button>)}</div>
      <nav className="ahavat29-letter-books" aria-label={`בחירת חומש ${countMode ? "במניין" : "באות"} ${source.name}`}><button type="button" aria-pressed={bookId === "all"} onClick={() => select(form, "all")}>כל התורה</button>{books.map(book => <button type="button" key={book.id} aria-pressed={bookId === book.id} onClick={() => select(form, book.id)}>{book.title}</button>)}</nav>
      <div className="ahavat29-table-tools"><label><span>{countMode ? "חיפוש במנייני הפרשות" : "חיפוש בפרשות האות"}</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="פרשה, חומש, מספר או אותיות המניין" /></label><strong aria-live="polite">{rows.length} פרשות</strong></div>
      <div className="ahavat29-ds01-controls"><button type="button" aria-expanded={showScene} onClick={() => setShowScene(value => !value)}>{showScene ? `סגור מבנה ${countMode ? "המניינים" : "האות"} בתלת־ממד` : `פתח מבנה ${countMode ? "המניינים" : "האות"} בתלת־ממד`}</button>{readingPages.map(page => <button type="button" key={page} onClick={() => openSourcePage(page)}>המקור המלא · PDF {page}</button>)}<button type="button" disabled={!rows.length} onClick={downloadRows}>הורד טבלה למחקר · {rows.length} שורות</button></div>
      {showScene ? <div className="ahavat29-letter-scene"><Suspense fallback={<p role="status">טוען את מבנה המניין…</p>}><AhavatTorahSpatialScene2029 mode={countMode ? "parasha-count" : "letter"} letterLabel={source.name} bars={bars} activeId={selectedBar || bookId} onSelect={selectBar} /></Suspense><p>ייצוג של מבנה הספר · גובה = {countMode ? `מניין ${source.unit}` : `מספר מופעי ${form}׳`} {activeBook ? "בכל פרשה" : "בכל חומש"} · לחיצה פותחת את המקור</p></div> : null}
      <div className="ahavat29-letter-bars" aria-label={`מופעי ${source.name} ${activeBook ? "בפרשות החומש" : "בחומשים"}`}>{bars.map(bar => <button type="button" key={bar.id} aria-pressed={selectedBar === bar.id} onClick={() => selectBar(bar.id)}><span>{bar.label}</span><i style={{ "--letter-share": `${bar.count / Math.max(1, ...bars.map(item => item.count)) * 100}%` }} /><b>{ahavatLetterNumber(bar.count)}</b></button>)}</div>
      {rows.length ? <div className="ahavat29-data-table-wrap"><table className="ahavat29-data-table"><caption>{subject} · {activeBook?.title || "כל התורה"} · קריאת דברי הספר</caption><thead><tr><th>פרשה</th><th>חומש</th><th>המניין בדפוס</th><th>מספר</th><th>מקור</th></tr></thead><tbody>{rows.map(row => <tr key={row.parasha}><td>{row.parasha}</td><td>{row.book}</td><td>{row.printed === "?" ? "לא הוכרע" : row.printed}</td><td><b>{ahavatLetterNumber(row.count)}</b></td><td><button type="button" onClick={() => openSourcePage(row.page)}>PDF {row.page}</button></td></tr>)}</tbody></table></div> : <p role="status">לא נמצאה פרשה מתאימה לחיפוש.</p>}
      <details className="ahavat29-source-details"><summary>פרטי המקור והקריאה</summary><p>PDF {source.pages.join(" · ")}, {countMode ? source.location : AHAVAT_LETTER_READING_LOCATIONS[form]}. השורות נבדקו מול צילום הסעיף. {unresolvedRows || unresolvedCheckpoints ? `${unresolvedRows} תאי פרשות טרם הוכרעו; ערך לא מוכרע אינו אפס ואינו מוצג כעמודה בגרף. סיכום הכולל תא כזה נשאר פתוח.` : "כל 54 תאי הפרשות פוענחו מספרית."} {hasReadingGap ? "נותרו פערים בין קריאת השורות לבין חלק מסיכומי הדפוס; שתי הקריאות נשמרות להכרעה בלי לשנות מספר כדי להתאים לסכום." : !unresolvedRows && !unresolvedCheckpoints ? "חמשת סיכומי הפרשות נסגרים לסיכומים המצטברים המודפסים." : ""} חלקו של חומש מתקבל בהפרש בין שני סיכומים עוקבים. עמודות החומשים מייצגות את סיכומי הספר; עמודות הפרשות מייצגות את קריאת השורות. זו קריאת המניין של המחבר; לא בוצעה ספירת קורפוס עצמאית במנוע.</p><ul>{books.map(book => {
        const balance = ahavatLetterBalance(book);
        return <li key={book.id}>{book.title}: {book.printed} = {ahavatLetterNumber(book.cumulative)} מצטבר. חלק החומש לפי הסיכומים: {ahavatLetterNumber(book.count)}; קריאת השורות: {ahavatLetterNumber(balance.rowTotal)}. {balance.delta === null ? "הקריאה המספרית טרם הושלמה." : balance.delta ? `פער קריאה: ${balance.delta}.` : "סכום השורות תואם."}</li>;
      })}</ul></details>
    </> : <div className="ahavat29-letter-reading"><p><b>הסבר נלווה:</b> בסעיף {source.name} כל פרשה מקבלת מניין משלה, והמחבר ממשיך בסיכום מצטבר מחומש לחומש. {/[ךםןףץ]/.test(form) ? "הצורה הסופית נכתבת בסעיף עצמאי, ולכן אין לצרף אותה אוטומטית למניין הצורה הרגילה." : form === "שׁ" || form === "שׂ" ? "הדפוס מבחין בין שׁין לשׂין; לכל אחת יש סעיף ומניין משלה." : "אפשר לקרוא את רצף הפרשות ואת סיכום האות במלואם בעמוד המקור."}</p><button type="button" onClick={() => onPage(source.pages[0])}>קרא את סעיף {source.name} בספר · PDF {source.pages[0]}</button><LetterSectionTranscript source={source} onPage={onPage} /></div>}
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
      <p>התלת־ממד מציג מבנה אמיתי: גובה הוא מספר עמודי המקור, צבע הוא מצב הקריאה, ומאגר שאותר פותח את ה־PDF המדויק.</p>
    </header>

    <DivineNameSourceModel onPage={onPage} />
    <LetterSourceReader onPage={onPage} />
    <LetterSourceReader countMode selectedDatasetId={selectedId} onPage={onPage} />
    <AhavatTorahPeopleReader2029 onPage={onPage} />
    <AhavatTorahRootsReader2029 onPage={onPage} />
    <AhavatTorahMegillotReader2029 onPage={onPage} selectedDatasetId={selectedId} />

    <div className="ahavat29-spatial-key" aria-label="מקרא המצפה">
      <span><i className="is-height" />גובה = מספר עמודי מקור</span>
      <span><i className="is-color" />צבע = מצב קריאה</span>
      <span><i className="is-order" />מיקום = סדר המאגר</span>
    </div>

    <div className="ahavat29-spatial-stage">
      <div className="ahavat29-spatial-stage-head">
        <div><span>המאגר הנבחר</span><strong>{selected.id} · {selected.title}</strong><small>{selected.pages.length ? `${selected.pages.length} עמודי מקור · PDF ${selected.pages.join(" · ")}` : "מראה־המקום בבירור; ה־PDF נשאר פתוח"}</small></div>
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
      {bundleState === "ready" && tab === "aseh" ? <OccurrenceTable table={occurrenceTables[2]} kind="aseh" onPage={onPage} /> : null}
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
  const [companion, setCompanion] = useState(null);
  const [companionState, setCompanionState] = useState("loading");
  useEffect(() => {
    const controller = new AbortController();
    fetch(AHAVAT_TORAH_SOURCE.commentaryBundleUrl, { signal: controller.signal, credentials: "same-origin" })
      .then(response => { if (!response.ok) throw new Error("companion_unavailable"); return response.json(); })
      .then(value => { setCompanion(value); setCompanionState("ready"); })
      .catch(error => { if (error.name !== "AbortError") setCompanionState("error"); });
    return () => controller.abort();
  }, []);
  const pageGuide = ahavatCompanionPage(companion, page);
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
      <header><div><span>PDF {page}{record?.printed ? ` · עמוד מודפס ${record.printed}` : ""}</span><h3>{pageGuide?.title || readingArc.title}</h3></div><StatusPill status={record ? "source_verified" : "machine_candidate"} /></header>
      <section className="ahavat29-ai-guide">
        <span>הסבר נלווה · {pageGuide ? `עמוד ${page}` : "מפת קריאה"}</span>
        <p>{pageGuide?.companion_explanation || readingArc.explanation}</p>
        {pageGuide?.reading_points?.length ? <ul>{pageGuide.reading_points.map(point => <li key={point}>{point}</li>)}</ul> : null}
        {pageGuide ? <div className="ahavat29-ds01-controls"><button type="button" onClick={() => onPage(page)}>פתח מקור ההסבר · PDF {page}</button></div> : <small>הסבר נלווה לעמודים {readingArc.range[0]}–{readingArc.range[1]} · המקור פתוח לצדו.</small>}
        {companionState === "loading" ? <p role="status">טוען את ההסבר לעמוד…</p> : null}
        {companionState === "error" ? <p role="alert">ההסבר המפורט לא נטען. מפת הקריאה ועמוד המקור נשארים זמינים.</p> : null}
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
      </> : !pageGuide ? <div className="ahavat29-depth-empty"><h3>העמוד נגיש במלואו כמקור וכתעתיק</h3><p>אפשר לקרוא ולחפש עכשיו, כשה־PDF המקורי נשאר צמוד לעמוד.</p></div> : null}

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
  const locatedDataset = AHAVAT_TORAH_DATASETS.find(dataset => dataset.id === datasetId && dataset.pages.includes(page));

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
    const nextPage = ahavatDatasetSourcePage(dataset, page);
    setPage(nextPage);
    setFindingId("");
    setDatasetId(dataset.id);
    replaceSelectionInUrl(nextPage, "", dataset.id);
    if (dataset.pages.length) {
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
      window.requestAnimationFrame(() => document.getElementById("ahavat29-source")?.scrollIntoView({ behavior, block: "start" }));
    }
  };

  const openPage = (nextPage, contextDatasetId = "") => {
    const context = AHAVAT_TORAH_DATASETS.find(dataset => dataset.id === contextDatasetId && dataset.pages.includes(nextPage));
    setPage(nextPage);
    setFindingId("");
    setDatasetId(context?.id || "");
    replaceSelectionInUrl(nextPage, "", context?.id || "");
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
    document.getElementById("ahavat29-source")?.scrollIntoView({ behavior, block: "start" });
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

        <SourcePanel page={page} contextLabel={selectedFinding?.dataset || locatedDataset?.id || selectedSection.shortTitle} onPage={openPage} />
      </div>
    </main>
  </Sod2029Shell>;
}
