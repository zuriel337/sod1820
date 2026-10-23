import React, { useEffect, useMemo, useState } from "react";
import NavigationIcon2029 from "../components/experience2029/NavigationIcon2029.jsx";
import Sod2029Shell from "../components/experience2029/Sod2029Shell.jsx";
import {
  AHAVAT_TORAH_DATASETS,
  AHAVAT_TORAH_DEEP_PAGES,
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
import "./ahavatTorahSystem2029.css";

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

  useEffect(() => setPageDraft(String(page)), [page]);

  const submitPage = event => {
    event.preventDefault();
    const nextPage = Math.min(AHAVAT_TORAH_SOURCE.pdfPages, Math.max(1, Number(pageDraft) || 1));
    onPage(nextPage);
  };

  return <aside id="ahavat29-source" className="ahavat29-source" aria-labelledby="ahavat29-source-title">
    <header>
      <div><span>המקור נשאר פתוח</span><h2 id="ahavat29-source-title">עמוד PDF {page}</h2></div>
      <b>{contextLabel}</b>
    </header>
    <div className="ahavat29-pdf-frame">
      <iframe key={page} src={pdfUrl} title={`${AHAVAT_TORAH_SOURCE.title}, עמוד PDF ${page}`} loading="eager" />
    </div>
    <form className="ahavat29-page-nav" onSubmit={submitPage} aria-label="ניווט בכל 99 עמודי המקור">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="לעמוד הקודם">הקודם</button>
      <label><span>עמוד PDF</span><input inputMode="numeric" min="1" max={AHAVAT_TORAH_SOURCE.pdfPages} value={pageDraft} onChange={event => setPageDraft(event.target.value)} /></label>
      <span>מתוך {AHAVAT_TORAH_SOURCE.pdfPages}</span>
      <button type="submit">עבור</button>
      <button type="button" disabled={page >= AHAVAT_TORAH_SOURCE.pdfPages} onClick={() => onPage(page + 1)} aria-label="לעמוד הבא">הבא</button>
    </form>
    <dl>
      <div><dt>זהות מקור</dt><dd>{AHAVAT_TORAH_SOURCE.identity}</dd></div>
      <div><dt>מחבר</dt><dd>{AHAVAT_TORAH_SOURCE.author}</dd></div>
      <div><dt>דפוס</dt><dd>{AHAVAT_TORAH_SOURCE.imprint}</dd></div>
      <div><dt>מעמד</dt><dd>עד מקור · לא פרסום ממצא</dd></div>
    </dl>
    <nav aria-label="קישורי מקור">
      <a href={pdfUrl} target="_blank" rel="noreferrer">פתח PDF בעמוד {page} ↗</a>
      <a href={AHAVAT_TORAH_SOURCE.catalogUrl} target="_blank" rel="noreferrer">רשומת HebrewBooks ↗</a>
    </nav>
    <p>מספר העמוד הוא מראה־מקום ל־PDF. הסברים ומיפויים במסך מסומנים בנפרד ואינם חלק מנוסח הספר.</p>
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
      <small>הסבר זה נוצר כשכבת ניווט מסייעת. הוא אינו ציטוט מן הספר ואינו ממצא קנוני.</small>
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
      <p>סגור פירושו שהעוגן או המבנה נסגרו בתוך הספר — לא שהנתון פורסם ולא שהוא אומת מול כל קורפוס אפשרי.</p>
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
      <small>החיפוש פועל על תעתיק מכונה מועמד. תמיד מאמתים את התוצאה בחלון ה־PDF.</small>
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
        <span>הסבר AI בעברית · מפת קריאה מועמדת</span>
        <p>{readingArc.explanation}</p>
        <small>זהו הסבר מסייע לטווח עמודים {readingArc.range[0]}–{readingArc.range[1]}, לא ציטוט ולא הכרעת אמת. יש לקרוא אותו לצד עמוד המקור.</small>
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
            {AHAVAT_TORAH_AI_EXPLANATIONS_HE[block.block_id] ? <small><b>הסבר AI בעברית:</b> {AHAVAT_TORAH_AI_EXPLANATIONS_HE[block.block_id]}</small> : null}
            <a href={`${AHAVAT_TORAH_SOURCE.pdfUrl}#page=${page}&view=FitH`} target="_blank" rel="noreferrer">ראה מקור בעמוד {page} ↗</a>
          </section>)}
          {!pageBlocks.length ? <p>אין יחידות טקסט להצגה בעמוד זה בשכבה הנוכחית.</p> : null}
        </div> : null}
      </> : <div className="ahavat29-depth-empty"><span>קריאת עומק טרם אומתה</span><h3>העמוד נגיש במלואו כמקור וכתעתיק מכונה</h3><p>התעתיק מאפשר חיפוש וקריאה ראשונית, אך שיבושי OCR אינם מתוקנים אוטומטית ואינם הופכים לממצא.</p></div>}

      {(pageDatasets.length || pageSources.length) ? <section className="ahavat29-page-links" aria-label="קשרי מחקר לעמוד">
        <span>קשרים שכבר אותרו בעמוד</span>
        <div>{pageDatasets.map(dataset => <b key={dataset.id}>{dataset.id} · {dataset.title}</b>)}{pageSources.map((source, index) => <b key={`${source.source_as_printed}-${index}`}>מקור: {source.source_as_printed}</b>)}</div>
      </section> : null}

      {pageTextState === "loading" ? <p role="status">טוען את תעתיק הספר המלא…</p> : null}
      {pageTextState === "error" ? <p role="alert">התעתיק לא נטען. ה־PDF המקורי נשאר זמין.</p> : null}
      {pageTextState === "ready" ? <details className="ahavat29-machine-text" open={!record}>
        <summary>תעתיק מכונה מלא לעמוד {page} · דורש אימות מול המקור</summary>
        {machinePage?.text ? <pre>{machinePage.text}</pre> : <p>לא חולץ טקסט מן העמוד. ייתכן שזהו עמוד ריק או עמוד תמונה בלבד.</p>}
      </details> : null}
      <a className="ahavat29-page-source-link" href={`${AHAVAT_TORAH_SOURCE.pdfUrl}#page=${page}&view=FitH`} target="_blank" rel="noreferrer">פתח את עמוד {page} ב־PDF המקורי ↗</a>
    </article>
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
          <p>לא רק PDF ולא רשימת מספרים: מקור קבוע, מפה של הספר, הסבר נפרד וממצאים שאפשר לבחון בעמוד שבו נולדו.</p>
        </div>
        <aside><strong>קורא מלא · Preview</strong><p>כל הספר זמין כעת לדפדוף ולחיפוש. תעתיק מכונה, קריאת עומק וממצא נשארים מעמדות נפרדים.</p></aside>
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

          <FullBookReader page={page} bundle={bundle} bundleState={bundleState} pageTextBundle={pageTextBundle} pageTextState={pageTextState} onPage={openPage} />

          <section className="ahavat29-pipeline" aria-labelledby="ahavat29-pipeline-title">
            <header><span>המערכת שאנחנו בונים</span><h2 id="ahavat29-pipeline-title">מהמקור ועד מוצר שאפשר לסמוך עליו</h2></header>
            <ol>{AHAVAT_TORAH_PIPELINE.map(step => <li key={step.index} className={`is-${step.state}`}><span>{step.index}</span><strong>{step.title}</strong><b>{step.value}</b><small>{step.label}</small></li>)}</ol>
            <p>הצינור אינו מקצר דרך: מיפוי מלא אינו שווה לתעתיק מלא; תעתיק אינו שווה לאימות; ואימות אינו שווה לפרסום.</p>
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

