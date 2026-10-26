import React, { useEffect, useMemo, useRef, useState } from "react";
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

export default function BookSourceReader2029({ manifest, researchRows = [] }) {
  const [page, setPage] = useState(() => pageFromUrl(manifest));
  const [draftPage, setDraftPage] = useState(String(page));
  const fullscreenRef = useRef(null);
  const chapter = chapterForBookPage(manifest, page);

  useEffect(() => {
    const requested = pageFromUrl(manifest);
    setPage(requested);
    setDraftPage(String(requested));
  }, [manifest]);

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
        </dl>
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
          <span>הסבר נלווה · PDF {chapter?.from}–{chapter?.to}</span>
          <h3>{chapter?.title || manifest.title}</h3>
          <p>{chapter?.guide || manifest.introduction}</p>
          {chapter?.points?.length ? <ul>{chapter.points.map(point => <li key={point}>{point}</li>)}</ul> : null}
          <button type="button" onClick={() => openPage(chapter?.from || 1)}>פתח את תחילת החטיבה במקור</button>
        </article>

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
