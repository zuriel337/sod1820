import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import BookFullscreenButton2029 from "./BookFullscreenButton2029.jsx";
import {
  chapterForBookPage,
  clampBookPage,
} from "../../data/bookReader2029.js";
import "./bookSourceReader2029.css";

function pageFromUrl(manifest) {
  if (typeof window === "undefined") return 1;
  return clampBookPage(manifest, new URLSearchParams(window.location.search).get("page"));
}

function replacePageInUrl(page) {
  if (typeof window === "undefined") return;
  const next = new URL(window.location.href);
  next.searchParams.set("page", String(page));
  window.history.replaceState({}, "", `${next.pathname}${next.search}${next.hash}`);
}

function sourcePagesForRow(row) {
  const sourceRef = String(row?.source_ref || "");
  const pages = [];
  for (const match of sourceRef.matchAll(/(?:#|\b)p(?:df)?[:=\s-]?(\d{1,4})(?:[–-](\d{1,4}))?/gi)) {
    const start = Number(match[1]);
    const end = Number(match[2] || match[1]);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || end - start > 50) continue;
    for (let page = start; page <= end; page += 1) pages.push(page);
  }
  return pages;
}

function normalizeSearch(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[\u0591-\u05c7]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("he");
}

async function fetchJsonAsset(url) {
  if (!url) return null;
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) throw new Error(`Book asset unavailable (${response.status})`);
  return response.json();
}

export default function BookSourceReader2029({ manifest, researchRows = [] }) {
  const [page, setPage] = useState(() => pageFromUrl(manifest));
  const [draftPage, setDraftPage] = useState(String(page));
  const [searchQuery, setSearchQuery] = useState("");
  const [deepReading, setDeepReading] = useState({ loading: false, pageText: null, commentary: null });
  const fullscreenRef = useRef(null);
  const chapter = chapterForBookPage(manifest, page);
  const deferredQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    const requested = pageFromUrl(manifest);
    setPage(requested);
    setDraftPage(String(requested));
    setSearchQuery("");
  }, [manifest]);

  useEffect(() => {
    let alive = true;
    if (!manifest.pageTextUrl && !manifest.commentaryUrl) {
      setDeepReading({ loading: false, pageText: null, commentary: null });
      return () => { alive = false; };
    }
    setDeepReading({ loading: true, pageText: null, commentary: null });
    Promise.allSettled([
      fetchJsonAsset(manifest.pageTextUrl),
      fetchJsonAsset(manifest.commentaryUrl),
    ]).then(([pageTextResult, commentaryResult]) => {
      if (!alive) return;
      setDeepReading({
        loading: false,
        pageText: pageTextResult.status === "fulfilled" ? pageTextResult.value : null,
        commentary: commentaryResult.status === "fulfilled" ? commentaryResult.value : null,
      });
    });
    return () => { alive = false; };
  }, [manifest.pageTextUrl, manifest.commentaryUrl]);

  const commentaryByPage = useMemo(() => new Map(
    (deepReading.commentary?.pages || []).map(item => [Number(item.pdf_page), item]),
  ), [deepReading.commentary]);
  const pageCommentary = commentaryByPage.get(page) || null;
  const normalizedQuery = normalizeSearch(deferredQuery);
  const searchIndex = useMemo(() => (deepReading.pageText?.pages || [])
    .filter(item => item.extraction_status === "machine_candidate")
    .map(item => ({ ...item, normalizedText: normalizeSearch(item.text) })), [deepReading.pageText]);
  const searchResults = useMemo(() => {
    if (normalizedQuery.length < 2) return [];
    return searchIndex
      .filter(item => item.normalizedText.includes(normalizedQuery))
      .slice(0, 24)
      .map(item => ({
        page: Number(item.pdf_page),
        title: commentaryByPage.get(Number(item.pdf_page))?.title
          || chapterForBookPage(manifest, Number(item.pdf_page))?.title
          || manifest.title,
      }));
  }, [commentaryByPage, manifest, normalizedQuery, searchIndex]);
  const searchablePages = searchIndex.length;
  const imageOnlyPages = useMemo(() => (deepReading.pageText?.pages || [])
    .filter(item => item.extraction_status === "image_only")
    .map(item => item.pdf_page), [deepReading.pageText]);

  const openPage = nextPage => {
    const safePage = clampBookPage(manifest, nextPage);
    setPage(safePage);
    setDraftPage(String(safePage));
    replacePageInUrl(safePage);
  };

  const pdfPageUrl = `${manifest.pdfUrl}#page=${page}&view=FitH`;
  const relatedRows = useMemo(() => researchRows.filter(row => sourcePagesForRow(row).includes(page)).slice(0, 4), [page, researchRows]);

  const submitPage = event => {
    event.preventDefault();
    openPage(draftPage);
  };

  return <section className="book-reader29" aria-labelledby="book-reader29-title">
    <header className="book-reader29-heading">
      <div>
        <span>דברי הספר · המקור פתוח תמיד</span>
        <h2 id="book-reader29-title">קוראים ומבינים באותו מסך</h2>
        <p>{manifest.introduction}</p>
      </div>
      <details className="book-reader29-source-details">
        <summary>פרטי המקור</summary>
        <dl>
          <div><dt>שם הספר</dt><dd>{manifest.title}</dd></div>
          <div><dt>מחבר / ייחוס</dt><dd>{manifest.author}</dd></div>
          <div><dt>שפת המקור</dt><dd>{manifest.language}</dd></div>
          <div><dt>היקף</dt><dd>{manifest.pdfPages} עמודי PDF · {manifest.chapters.length} חטיבות קריאה</dd></div>
          {deepReading.pageText ? <div><dt>חיפוש טקסט</dt><dd>{searchablePages}/{manifest.pdfPages} עמודים · שכבת איתור בלבד</dd></div> : null}
          {imageOnlyPages.length ? <div><dt>עמודים חזותיים</dt><dd>{imageOnlyPages.join(", ")} · נקראים ישירות מן ה־PDF</dd></div> : null}
          {deepReading.commentary?.source_layers?.printed_commentary ? <div><dt>פירוש מודפס במהדורה</dt><dd>{deepReading.commentary.source_layers.printed_commentary}</dd></div> : null}
          {pageCommentary?.technical_note ? <div><dt>הבחנת קריאה</dt><dd>{pageCommentary.technical_note}</dd></div> : null}
        </dl>
        {deepReading.commentary?.source_note ? <p className="book-reader29-source-note">{deepReading.commentary.source_note}</p> : null}
      </details>
    </header>

    <div className="book-reader29-layout">
      <aside ref={fullscreenRef} id="book-reader29-source" className="book-reader29-source book-fullscreen29-target" aria-label={`המקור המלא של ${manifest.title}`}>
        <header>
          <div><span>דברי הספר · PDF · עמוד {page} מתוך {manifest.pdfPages}</span><h3>{manifest.title}</h3></div>
          <BookFullscreenButton2029 targetRef={fullscreenRef} fallbackHref={pdfPageUrl} controls="book-reader29-source" />
        </header>

        <div className="book-reader29-pdf" data-book-pdf-frame>
          <iframe key={pdfPageUrl} src={pdfPageUrl} title={`${manifest.title}, עמוד ${page}`} loading="eager" />
        </div>

        <form className="book-reader29-page-nav" onSubmit={submitPage} aria-label={`מעבר בין עמודי ${manifest.title}`} data-book-reader-secondary>
          <button type="button" disabled={page <= 1} onClick={() => openPage(page - 1)}>→ הקודם</button>
          <label htmlFor={`book-reader29-page-${manifest.slug}`}><span>עמוד</span><input id={`book-reader29-page-${manifest.slug}`} inputMode="numeric" min="1" max={manifest.pdfPages} value={draftPage} onChange={event => setDraftPage(event.target.value)} /></label>
          <button type="submit">פתח</button>
          <button type="button" disabled={page >= manifest.pdfPages} onClick={() => openPage(page + 1)}>הבא ←</button>
        </form>

        <a className="book-reader29-external" href={pdfPageUrl} target="_blank" rel="noreferrer" data-book-reader-secondary>פתח את עמוד {page} בחלון נפרד ↗</a>
      </aside>

      <div className="book-reader29-guide">
        <article className="book-reader29-current" aria-live="polite">
          <span>הסבר נלווה · PDF {pageCommentary ? page : `${chapter?.from}–${chapter?.to}`}</span>
          <h3>{pageCommentary?.title || chapter?.title || manifest.title}</h3>
          <p>{pageCommentary?.companion_explanation || chapter?.guide || manifest.introduction}</p>
          {(pageCommentary?.reading_points || chapter?.points)?.length ? <ul>{(pageCommentary?.reading_points || chapter.points).map(point => <li key={point}>{point}</li>)}</ul> : null}
          <button type="button" onClick={() => openPage(pageCommentary?.pdf_page || chapter?.from || 1)}>{pageCommentary ? `פתח את עמוד ${page} בדברי הספר` : "פתח את תחילת החטיבה במקור"}</button>
        </article>

        {manifest.pageTextUrl ? <article className="book-reader29-search">
          <span>חיפוש בדברי הספר</span>
          <label htmlFor={`book-reader29-search-${manifest.slug}`}>
            <span>מילה או צירוף</span>
            <input
              id={`book-reader29-search-${manifest.slug}`}
              type="search"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="למשל: קולות, רוח, אברהם"
            />
          </label>
          {deepReading.loading ? <small role="status">מכין חיפוש בתוך הספר…</small> : null}
          {!deepReading.loading && normalizedQuery.length >= 2 ? <div className="book-reader29-search-results" aria-live="polite">
            <small>{searchResults.length ? `${searchResults.length} עמודים ראשונים נמצאו` : "לא נמצאה התאמה בשכבת האיתור"}</small>
            {searchResults.map(result => <button type="button" key={result.page} onClick={() => openPage(result.page)}>
              <strong>PDF {result.page}</strong><span>{result.title}</span>
            </button>)}
          </div> : null}
        </article> : null}

        <nav className="book-reader29-chapters" aria-label={`מפת הקריאה של ${manifest.title}`}>
          {manifest.chapters.map((item, index) => <button
            type="button"
            key={item.id}
            className={item.id === chapter?.id ? "is-active" : ""}
            aria-pressed={item.id === chapter?.id}
            onClick={() => openPage(item.from)}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{item.title}</strong>
            <small>PDF {item.from}–{item.to}</small>
          </button>)}
        </nav>

        <article className="book-reader29-keys">
          <span>שלושה מפתחות לפני שמעמיקים</span>
          <ol>{manifest.readingKeys.map(key => <li key={key}>{key}</li>)}</ol>
        </article>

        {relatedRows.length ? <article className="book-reader29-related">
          <span>מחקר שמצביע לעמוד הזה</span>
          <div>{relatedRows.map(row => <div key={row.id}><strong>{row.statement || row.kind || "ממצא מחקר"}</strong><small>{row.source_ref}</small></div>)}</div>
        </article> : null}

        {manifest.experience ? <a className="book-reader29-experience" href={manifest.experience.href}>
          <span>ייצוג של מבנה הספר</span>
          <strong>{manifest.experience.label}</strong>
          <small>המפה, המחקר או המרחב המיוחד של הספר ←</small>
        </a> : null}
      </div>
    </div>
  </section>;
}
