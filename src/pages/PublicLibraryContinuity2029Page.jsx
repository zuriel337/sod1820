import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import Sod2029Shell, { FrameState } from "../components/experience2029/Sod2029Shell.jsx";
import NavigationIcon2029 from "../components/experience2029/NavigationIcon2029.jsx";
import BookSourceReader2029 from "../components/books2029/BookSourceReader2029.jsx";
import { fetchPublicLibrary2029, fetchPublicLibraryItem2029, publicLibraryMetadata2029 } from "../lib/research/publicLibraryContinuity2029.js";
import { publicBookReadingLocation2029 } from "../lib/research/bookPublicReadingLocation2029.js";
import { applySeo } from "../lib/seo.js";
import { bilingualDateLabel } from "../lib/relativeTime2029.js";
import { BookCard, PreparationStatus } from "../components/books2029/BooksLibraryCards2029.jsx";
import "./publicLibraryContinuity2029.css";

const RESEARCH_PATH = `/codes/${encodeURIComponent("מחקר")}`;
const AhavatTorahSystem2029Page = lazy(() => import("./AhavatTorahSystem2029Page.jsx"));
const rootHref = (kind, collection) => kind === "books" ? "/books" : collection === "research" ? RESEARCH_PATH : "/codes";

function returnHref(kind, collection, location) {
  const requested = new URLSearchParams(location.search).get("returnTo") || location.state?.publicLibraryReturn;
  if (requested) {
    try {
      const url = new URL(requested, "https://sod1820.co.il");
      if (url.origin === "https://sod1820.co.il" && !url.username && !url.password
        && ["/books", "/codes", RESEARCH_PATH, "/codes/מחקר"].includes(url.pathname)) return url.pathname + url.search + url.hash;
    } catch { /* keep the named library as the exact safe alternative */ }
  }
  return rootHref(kind, collection);
}

function usePublicReading(kind, slug, collection, query, offset) {
  const [attempt, setAttempt] = useState(0), abortRef = useRef(null);
  const key = JSON.stringify([kind, slug, collection, query, offset, attempt]);
  const [state, setState] = useState({ key: null, status: "loading", value: null });
  useEffect(() => {
    const abort = new AbortController(); abortRef.current = abort;
    setState({ key, status: "loading", value: null });
    let read = slug ? fetchPublicLibraryItem2029(kind, slug, { signal: abort.signal })
      : fetchPublicLibrary2029({ kind, collection, q: query, offset, signal: abort.signal });
    if (kind === "books") read = Promise.all([read, fetch("/book-data/books.preparation.json", {signal:abort.signal})
      .then(response=>response.ok?response.json():null).catch(()=>null)])
      .then(([value,preparation])=>value?{...value,preparation:preparation?.schema === "books-preparation-projection.v1" ? preparation.books : {}}:null);
    read.then(value => { if (!abort.signal.aborted) setState({ key, status: "ready", value }); })
      .catch(() => { if (!abort.signal.aborted) setState({ key, status: "failed", value: null }); });
    return () => abort.abort();
  }, [key]);
  return {
    ...(state.key === key ? state : { status: "loading", value: null }),
    retry: () => setAttempt(value => value + 1),
    cancel: () => { abortRef.current?.abort(); setState({ key, status: "canceled", value: null }); },
  };
}

function PublicationImage({ src, title, source = false }) {
  const [failed, setFailed] = useState(null);
  if (!src || failed === src) return source
    ? <FrameState kind="unavailable" title="תמונת המטריצה אינה זמינה לקריאה"><p>אפשר לקרוא את הפרסום ואת מראה־המקום השמור בהמשך העמוד.</p></FrameState>
    : <div className="public-library29-card-symbol" aria-hidden="true"><NavigationIcon2029 name="els" /></div>;
  return <img src={src} alt={source ? `תמונת המטריצה שפורסמה: ${title}` : ""} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(src)} />;
}

function LibraryCard({ item, returnTo, preparation }) {
  if (item.kind === "books") return <BookCard
    book={{id:item.id,label:item.title,description:item.description,metadata:{slug:item.slug}}}
    preparation={preparation} returnTo={returnTo} readable={false}
    readingHref={item.slug === "ahavat-torah" && item.readerState === "source_bound" && item.manifest ? `${item.href}?returnTo=${encodeURIComponent(returnTo)}` : undefined} />;
  return <article className="public-library29-card" data-public-source-ref={item.sourceRef || undefined}>
    <Link to={item.href} state={{ publicLibraryReturn: returnTo }}>
      <div className="public-library29-card-art">{item.kind === "books"
        ? <div className="public-library29-book-cover" aria-hidden="true"><NavigationIcon2029 name="books" /><span>{item.title}</span></div>
        : <PublicationImage src={item.image} title={item.title} />}</div>
      <div className="public-library29-card-copy">
        <span className="public-library29-eyebrow">{item.kind === "books" ? "ספר ומקור" : "צופן שפורסם"}</span>
        <h2>{item.title}</h2>
        {item.description ? <p>{item.description}</p> : null}
        {item.kind === "codes" ? <div className="public-library29-meta"><span>{item.scope === "tanakh" ? "תנ״ך" : item.scope === "torah" ? "תורה" : "היקף לא צוין"}</span>{item.skip != null ? <span>דילוג <bdi>{item.skip}</bdi></span> : null}</div> : null}
        <span className="public-library29-open">{item.kind === "books" && !["source_bound", "ready"].includes(item.readerState) ? "פרטי הספר וזמינות המקור" : "פתיחה לקריאה"}<span aria-hidden="true"> ←</span></span>
      </div>
    </Link>
  </article>;
}

function PublicCipher({ item }) {
  const { hash } = useLocation();
  return <article className="public-library29-detail" data-public-source-ref={item.sourceRef}>
    <header className="public-library29-source-head">
      <span className="public-library29-eyebrow">פרסום צופן שמור</span>
      <h2>{item.title}</h2>
      <p className="public-library29-credit">{item.author}{item.createdAt ? ` · נשמר ${bilingualDateLabel(item.createdAt, "תאריך לא צוין")}` : ""}</p>
      <div className="public-library29-meta">
        {item.term ? <span>ציר החיפוש: {item.term}</span> : null}
        {item.skip != null ? <span>דילוג <bdi>{item.skip}</bdi></span> : null}
        <span>{item.scope === "tanakh" ? "תנ״ך" : item.scope === "torah" ? "תורה" : "היקף המקור לא צוין"}</span>
      </div>
    </header>
    {item.matrixImage ? <figure className="public-library29-source-image"><PublicationImage src={item.matrixImage} title={item.title} source /><figcaption>תמונת המטריצה שנשמרה עם הפרסום.</figcaption></figure>
      : <FrameState kind="unavailable" title="תצוגת המטריצה השמורה אינה זמינה"><p>הפרסום זמין לקריאה. לא נשמרה עבורו תמונת מטריצה ציבורית שניתן לפתוח כאן.</p></FrameState>}
    <section className="public-library29-prose" id="description"><h3>הטקסט שפורסם עם הצופן</h3>{item.description ? <p>{item.description}</p> : <p>לא צורף לפרסום טקסט הסבר.</p>}</section>
    {item.annotations?.length ? <section className="public-library29-prose" id="findings"><span className="public-library29-eyebrow">סימונים נלווים לפרסום</span><h3>המילים שסומנו במטריצה</h3><p>אלו סימונים מתוך אותו פרסום. הקשר והמשמעות שלהם דורשים עיון; הם אינם מקורות עצמאיים נוספים.</p><ul className="public-library29-terms">{item.annotations.map(annotation => <li key={annotation.term}>{annotation.term}</li>)}</ul></section> : null}
    <details className="public-library29-locator"><summary>פרטי המקור ומראה־המקום</summary><dl><div><dt>מזהה הפרסום</dt><dd><bdi>{item.sourceRef}</bdi></dd></div>
      {item.exactLocator ? <><div><dt>מזהה קורפוס</dt><dd><bdi>{item.exactLocator.corpusId}</bdi></dd></div><div><dt>מיקום התחלה שמור</dt><dd><bdi>{item.exactLocator.startIndex}</bdi></dd></div><div><dt>כיוון הדילוג</dt><dd>{item.exactLocator.direction === "back" ? "לאחור" : "קדימה"}</dd></div></> : <div><dt>מראה־מקום</dt><dd>לא נשמר מראה־מקום מלא שניתן לשחזר במדויק.</dd></div>}
    </dl></details>
    <section className="public-library29-capability" data-experience-capability="cipher-search-unavailable"><h3>חיפוש חדש בצופן התנ״כי</h3><p>מנוע החיפוש החדש אינו פתוח לציבור כרגע. אפשר להמשיך לקרוא פרסומים בספריית הצפנים.</p><Link className="sod29-action" to="/codes">לספריית הצפנים</Link></section>
    {hash === "#cipher-research" ? <section id="cipher-research" className="public-library29-capability" data-experience-capability="cipher-discussion-unavailable"><h3>הדיון המקושר לצופן</h3><p>הדיון סביב הפרסום אינו זמין בקורא הציבורי הזה כרגע. טקסט הצופן ומראה־המקום השמור שלו זמינים באותו עמוד.</p><a className="sod29-action" href="#description">לטקסט הפרסום</a></section> : null}
  </article>;
}

function PublicBook({ item, retry }) {
  const location = useLocation();
  const external = item.readerState === "external_source_reader_unavailable";
  const locator = external && item.manifest ? publicBookReadingLocation2029(item.manifest, location) : null;
  const externalHref = locator && !locator.issue ? `${item.sourceHref}#page=${locator.page}&view=FitH` : item.sourceHref;
  if (item.readerState === "preparation_closed") return <article className="public-library29-detail" data-public-source-ref={item.sourceRef || undefined} data-book-preparation-closed="true">
    <h2>{item.title}</h2>{item.description ? <p>{item.description}</p>:null}
    <PreparationStatus entry={item.preparation?.[item.slug]} title={item.title}/>
    <FrameState title="הספר בהכנה"><p>המקור והעבודה הקיימת נשמרים. הספר ייפתח לקריאה בנפרד; זה אינו סימון שההכנה הושלמה.</p><Link className="sod29-action" to="/books">חזרה לספרייה</Link></FrameState>
  </article>;
  return <article className="public-library29-detail" data-public-source-ref={item.sourceRef || undefined}>
    <header className="public-library29-source-head"><span className="public-library29-eyebrow">ספר ומקור</span><h2>{item.title}</h2>{item.description ? <p>{item.description}</p> : null}</header>
    {item.readerState === "ready" && item.manifest ? <BookSourceReader2029 key={item.id} manifest={item.manifest} publicReadOnly />
      : <section data-experience-capability="public-book-source-reading" data-capability-state={item.readerState}><FrameState kind="unavailable" title="קורא המקור של הספר אינו זמין כרגע">
        <p>{external ? "הספר מפנה לקובץ באתר חיצוני. לא ניתן לבדוק ולהציג אותו בתוך הקורא כרגע; אפשר לפתוח את המקור בחלון נפרד." : item.readerState === "public_source_file_unavailable" ? "קובץ המקור אינו נטען כרגע. אפשר לנסות שוב או לבחור מקור אחר בספרייה." : "פרטי הספר זמינים לציבור, אך אין כרגע חיבור מאומת לקובץ המקור שניתן לקרוא כאן."}</p>
        {locator?.issue ? <p>מראה־המקום שבקישור אינו מזוהה בקובץ הזה. הקישור הבא פותח את המקור המלא.</p> : null}
        <div className="sod29-actions">{external && item.sourceHref ? <a className="sod29-action" href={externalHref} target="_blank" rel="noreferrer">פתיחת המקור החיצוני ↗</a> : <button className="sod29-action" type="button" onClick={retry}>ניסיון טעינה נוסף</button>}<Link className="sod29-action" to="/books">לספרים ומקורות</Link></div>
      </FrameState></section>}
    <section className="public-library29-capability" data-experience-capability="book-research-unavailable"><h3>מחקר בספר</h3><p>כלי המחקר וההסברים של המערכת ייפתחו בנפרד מקריאת המקור.</p></section>
  </article>;
}

// Route owner supplies kind; /codes/מחקר is a public, unlisted collection of
// published records, distinct from the closed /code search capability.
export default function PublicLibraryContinuity2029Page({ kind = "codes", collection = "published" }) {
  const { slug: routeSlug } = useParams(), location = useLocation(), [params, setParams] = useSearchParams();
  const researchCollection = kind === "codes" && (collection === "research" || routeSlug === "מחקר");
  const selectedCollection = researchCollection ? "research" : "published";
  const slug = researchCollection ? null : routeSlug || null;
  const query = slug ? "" : params.get("q") || "", page = Math.max(0, Math.min(4166, Math.trunc(Number(params.get("page")) || 1) - 1));
  const [draft, setDraft] = useState(query);
  useEffect(() => setDraft(query), [query]);
  const data = usePublicReading(kind, slug, selectedCollection, query, page * 24);
  const item = slug && data.status === "ready" ? data.value : null;
  const title = kind === "books" ? "ספרים ומקורות" : researchCollection ? "פרסומי מחקר בצפנים" : "ספריית הצפנים";
  const href = rootHref(kind, selectedCollection);
  useEffect(() => {
    if (data.status !== "ready" || !item) return;
    const id = location.hash.slice(1);
    if (!["description", "findings", "cipher-research", "book-reader29-source"].includes(id)) return;
    const frame = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "auto" }));
    return () => cancelAnimationFrame(frame);
  }, [data.status, item, location.hash]);
  useEffect(() => {
    applySeo({ ...publicLibraryMetadata2029({ kind, item, detail: Boolean(slug), collection: selectedCollection,
      loading: data.status === "loading", failed: ["failed", "canceled"].includes(data.status) }), path: slug ? item?.href || `${kind === "books" ? "/book" : "/codes"}/${encodeURIComponent(slug)}` : href });
  }, [kind, slug, selectedCollection, data.status, item, href]);
  const changePage = nextPage => { const next = new URLSearchParams(params); next.set("page", String(nextPage + 1)); setParams(next); };
  if (kind === "books" && item?.slug === "ahavat-torah" && item.readerState === "ready" && item.manifest && params.get("reader") !== "source") return <Suspense fallback={<Sod2029Shell surface="books" title="אהבת תורה"><FrameState kind="loading" title="פותח את קורא אהבת תורה">המקור הציבורי אומת; טוען את הקורא הקיים.</FrameState></Sod2029Shell>}>
    <AhavatTorahSystem2029Page publicReadOnly preparation={item.preparation?.[item.slug]} returnTo={returnHref(kind,selectedCollection,location)}/>
  </Suspense>;
  return <Sod2029Shell surface={kind === "books" ? "books" : "els"} symbol={<NavigationIcon2029 name={kind === "books" ? "books" : "els"} />} eyebrow="קריאה במקורות" title={title}
    description={kind === "books" ? "פותחים ספר, מוצאים את המקום וממשיכים לקרוא במקור." : "חוזרים לצפנים שפורסמו, לטקסט ולמראה־המקום שנשמרו עמם."}>
    <main className="public-library29" dir="rtl" data-experience-capability={kind === "books" ? "public-book-library" : "public-cipher-library"}>
      {slug ? <nav className="public-library29-breadcrumb" aria-label="חזרה לספרייה"><Link to={returnHref(kind, item?.sourceCollection || selectedCollection, location)}>→ חזרה ל{title}</Link></nav> : <form className="public-library29-search" onSubmit={event => { event.preventDefault(); const next = new URLSearchParams(params); if (draft.trim()) next.set("q", draft.trim()); else next.delete("q"); next.delete("page"); setParams(next); }}><label htmlFor="public-library29-query">חיפוש ב{title}<input id="public-library29-query" type="search" value={draft} maxLength={120} onChange={event => setDraft(event.target.value)} placeholder={kind === "books" ? "שם הספר" : "מילה או שם הצופן"} /></label><button className="sod29-action" type="submit"><NavigationIcon2029 name="search" /> חיפוש</button></form>}
      {data.status === "loading" ? <FrameState kind="loading" title={slug ? "פותח את המקור" : "טוען את הספרייה"} progress={{ onCancel: data.cancel }}>בודק זמינות לקריאה ציבורית.</FrameState>
        : data.status === "failed" ? <FrameState kind="error" title="הטעינה לא הושלמה"><p>המקור לא נטען. אפשר לנסות שוב.</p><button className="sod29-action" type="button" onClick={data.retry}>ניסיון טעינה נוסף</button></FrameState>
          : data.status === "canceled" ? <FrameState title="הטעינה בוטלה"><button className="sod29-action" type="button" onClick={data.retry}>חידוש הטעינה</button></FrameState>
            : slug ? item ? kind === "books" ? <PublicBook item={item} retry={data.retry} /> : <PublicCipher item={item} />
              : <FrameState kind="empty" title="הפריט אינו זמין לציבור בכתובת הזאת"><Link className="sod29-action" to={href}>חזרה ל{title}</Link></FrameState>
              : <>
                {data.value?.items.length ? <div className={kind === "books" ? "sod29-book-grid" : "public-library29-grid"}>{data.value.items.map(row => <LibraryCard key={row.id} item={row} preparation={data.value.preparation?.[row.slug]} returnTo={location.pathname + location.search + location.hash} />)}</div>
                  : <FrameState kind="empty" title={query ? "לא נמצאו פרסומים לחיפוש הזה" : page ? "אין פרסומים נוספים בעמוד הזה" : "אין כרגע פרסומים זמינים בספרייה הזאת"}>{query ? "אפשר לנסות שם או מילה אחרת." : "הספרייה מציגה מקורות הזמינים לקריאה ציבורית."}</FrameState>}
                {page > 0 || data.value?.more ? <nav className="public-library29-pagination" aria-label="דפי הספרייה"><button className="sod29-action" type="button" disabled={page === 0} onClick={() => changePage(page - 1)}>→ הקודם</button><span>עמוד <bdi>{page + 1}</bdi></span><button className="sod29-action" type="button" disabled={!data.value?.more} onClick={() => changePage(page + 1)}>הבא ←</button></nav> : null}
              </>}
      {kind === "books" && !slug && data.status !== "loading" ? <section className="sod29-section" aria-labelledby="public-books29-tanakh-title"><h2 id="public-books29-tanakh-title">ספרי התנ״ך — בהכנה</h2><p>כ״ד ספרי התנ״ך יקבלו כאן מקום לקריאה לפי ספר, פרק ופסוק. הקריאה בהם מתוך הספרייה עדיין אינה זמינה.</p></section>:null}
    </main>
  </Sod2029Shell>;
}

export function PublicBooks2029Page() { return <PublicLibraryContinuity2029Page kind="books" />; }
export function PublicCiphers2029Page() { return <PublicLibraryContinuity2029Page kind="codes" />; }
