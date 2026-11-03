// The adopted 31.10 library card and operational meter, reused by both consumers.
// Preparation is never publication or source admission.
import React from "react";
import { Link } from "react-router-dom";
import { getBookReaderManifest } from "../../data/bookReader2029.js";
import { bookPreparation } from "../../data/bookPreparation2029.js";
import { AHAVAT_BOOK_SLUG, AHAVAT_CARD_SUMMARY, AHAVAT_CARD_TOPICS, AHAVAT_COVER_IMAGE } from "../../data/ahavatBookNavigation2029.js";
import "./booksLibraryCard2029.css";
const shortText=(value,max=220)=>{const text=String(value||"").replace(/\s+/g," ").trim();return text.length<=max?text:text.slice(0,max-1).trimEnd()+"…";};

// Prototype card (Ahavat Torah only): real source page, summary, representative
// topics and one primary action. Other books keep the existing tile.
export function PreparationStatus({ entry, title, previewOpen = false }) {
  const status = bookPreparation(entry);
  return <div className="books29-preparation" data-book-ready={status.ready ? "true" : "false"}>
    <div className="books29-preparation-heading"><span>{status.ready ? "ההכנה הושלמה" : previewOpen ? "פתוח לקריאה · בהכנה" : "סגור — בהכנה"}</span><strong>{status.percent === null ? "טרם נמדד" : <><bdi>{status.percent}%</bdi> <span>השלמה מתועדת</span></>}</strong></div>
    {status.percent !== null ? <progress max="100" value={status.percent} aria-label={`התקדמות הכנת ${title}`} /> : null}
    <details><summary>מה הושלם ומה נשאר?</summary>
      <p>חמישה שלבי הכנה במשקל שווה. האחוז משקף התקדמות מתועדת, לא אחוז מן הידע שבספר. שלב שטרם נבדק אינו נחשב שהושלם.</p>
      <ul>{status.steps.map(step => <li key={step.id}><span>{step.label}</span><bdi>{step.completed === null ? "טרם אושר" : `${step.completed}/${step.total}`}</bdi></li>)}</ul>
      <p>מפת יחידות והסברי עמודים אינם פירוש מלא לכל פסקה. השלמת ההכנה אינה אישור פרסום או אימות במנוע.</p>
    </details>
  </div>;
}

function AhavatPrototypeCard({ book, reader, preparation, readingHref, returnTo }) {
  const deepEntry = readingHref || (import.meta.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW === "true" && reader.experience?.href);
  // ZURIEL: Ahavat stays open for Preview reading independently of completion.
  const previewOpen = Boolean(deepEntry);
  const status = bookPreparation(preparation);
  return <article className="sod29-book-tile books29-card" data-book-card="ahavat-torah-prototype" aria-labelledby="books29-card-ahavat-title">
    <img className="books29-card-cover" src={AHAVAT_COVER_IMAGE.src} width={AHAVAT_COVER_IMAGE.width} height={AHAVAT_COVER_IMAGE.height} alt={AHAVAT_COVER_IMAGE.alt} loading="lazy" decoding="async" />
    <div className="books29-card-body">
      <div className="sod29-kicker">ספר ומקור · {reader.pdfPages} עמודים</div>
      <h3 id="books29-card-ahavat-title">{book.label}</h3>
      <p className="books29-card-author">{reader.author}</p>
      <p className="books29-card-summary">{AHAVAT_CARD_SUMMARY}</p>
      <ul className="books29-card-topics" aria-label="נושאים בספר">{AHAVAT_CARD_TOPICS.map(topic => <li key={topic}>{topic}</li>)}</ul>
      <PreparationStatus entry={preparation} title={book.label} previewOpen={previewOpen} />
      <div className="books29-card-actions">
        {status.ready || previewOpen ? <Link className="sod29-action books29-card-primary" to={deepEntry || `/book/${AHAVAT_BOOK_SLUG}`} state={returnTo ? {publicLibraryReturn:returnTo} : undefined}>פתח את הספר</Link> : <button type="button" className="sod29-action" disabled>סגור — בהכנה</button>}
      </div>
    </div>
  </article>;
}

export function BookCard({ book, preparation, readingHref, returnTo, readable }) {
  const slug = book?.metadata?.slug;
  const reader = getBookReaderManifest(slug);
  if (slug === AHAVAT_BOOK_SLUG && reader) return <AhavatPrototypeCard book={book} reader={reader} preparation={preparation} readingHref={readingHref} returnTo={returnTo} />;
  const coverage = { ...(book?.metadata?.coverage || {}), ...(book?.metadata?.coverage_2029 || {}) };
  const status = bookPreparation(preparation);
  return <article className="sod29-book-tile books29-library-tile" data-book-slug={slug || "unknown"}>
    <div className="sod29-book-cover" aria-hidden="true">▤</div>
    <div className="sod29-kicker">ספר ומקור</div>
    <h3>{book.label}</h3>
    <p className="sod29-muted">{shortText(reader?.introduction || book.description || "פרטי הספר בהכנה.", 180)}</p>
    <PreparationStatus entry={preparation} title={book.label} />
    <div className="sod29-actions">
      {reader ? <span className="sod29-chip">PDF מלא · {reader.pdfPages} עמודים</span> : null}
      {coverage.unresolved_total != null ? <span className="sod29-chip">{coverage.unresolved_total} נקודות פתוחות</span> : null}
    </div>
    <div className="books29-card-actions">{readable !== false && status.ready && slug ? <Link className="sod29-action" to={slug ? `/book/${slug}` : "/books"}>פתח את הספר</Link> : <button type="button" className="sod29-action" disabled>סגור — בהכנה</button>}</div>
  </article>;
}
