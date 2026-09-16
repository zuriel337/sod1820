import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Sod2029Shell, { use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import {
  fetchBookEntities,
  fetchBookEntityBySlug,
  fetchBookResearch,
  bookContextPatch,
  bookToWorkspaceItem,
  researchRowToWorkspaceItem,
  parseSourceRefLocator,
} from "../lib/research/bookResearchProjection.js";
import { applySeo } from "../lib/seo.js";

function BookCard({ book }) {
  const slug = book?.metadata?.slug;
  const coverage = book?.metadata?.coverage_2029 || book?.metadata?.coverage || {};
  return <Link className="sod29-book-tile" to={slug ? `/books/${slug}` : "/books"}>
    <div className="sod29-book-cover" aria-hidden="true">▤</div>
    <div className="sod29-kicker">BOOK IDENTITY</div>
    <h3>{book.label}</h3>
    <p className="sod29-muted">{coverage.research_map || coverage.content_scan || coverage.structural || "Book identity חי"}</p>
    <div className="sod29-actions"><span className="sod29-chip">Book · {book.is_active ? "active" : "inactive"}</span></div>
  </Link>;
}

function LibraryView() {
  const [state, setState] = useState({ loading: true, books: [], error: null });
  useEffect(() => {
    let alive = true;
    fetchBookEntities({ limit: 60 })
      .then(books => alive && setState({ loading: false, books, error: null }))
      .catch(error => alive && setState({ loading: false, books: [], error }));
    return () => { alive = false; };
  }, []);

  if (state.loading) return <section className="sod29-section"><div className="sod29-state">טוען Book identities פעילות מה־Reality Graph…</div></section>;
  if (state.error) return <section className="sod29-section"><div className="sod29-state error">Book adapter נכשל: {String(state.error?.message || state.error)}</div></section>;

  return <>
    <section className="sod29-focus-stage">
      <div className="sod29-command-shell">
        <div className="sod29-command-copy">
          <div className="sod29-kicker">LIVE BOOK IDENTITIES</div>
          <h2>הספרייה אינה מדף.<br />היא שער למחקר המקורות.</h2>
          <div className="sod29-muted">הספרים מגיעים מהזהויות החיות במערכת. ספר, מהדורה, עד, קובץ דיגיטלי ומראה־מקום נשארים שכבות נפרדות — והמחקר מתחבר אליהם בלי ליצור Book Store נוסף.</div>
          <div className="sod29-actions"><span className="sod29-chip">{state.books.length} ספרים פעילים</span><span className="sod29-chip">Live identities only</span></div>
        </div>
        <div className="sod29-orbit-map" aria-hidden="true">
          <div className="sod29-orbit-center">מקור<br />אחד</div>
          <span className="sod29-orbit-node n1">Book</span>
          <span className="sod29-orbit-node n2">Witness</span>
          <span className="sod29-orbit-node n3">Locator</span>
          <span className="sod29-orbit-node n4">Research</span>
        </div>
      </div>
    </section>

    <section className="sod29-section">
      <div className="sod29-section-head"><div><div className="sod29-kicker">ACTIVE LIBRARY</div><h2>הספרייה הפעילה</h2><div className="sod29-muted">הרשימה מגיעה מ־nodes(type=book,is_active=true). אין רשימת ספרים קשיחה ברכיב.</div></div></div>
      {state.books.length ? <div className="sod29-book-grid">{state.books.map(book => <BookCard key={book.id} book={book} />)}</div> : <div className="sod29-state">אין כרגע ספרים פעילים לקריאה ציבורית.</div>}
    </section>

    <section className="sod29-section sod29-placeholder">
      <div className="sod29-section-head"><div><div className="sod29-kicker">CORPUS PROJECTION</div><h2>תנ״ך · Library Group</h2></div></div>
      <p className="sod29-muted">ה־Foundation כבר קבע Tanakh כ־corpus projection מעל 24 Book identities, לא כ“ספר 25”. הם נשארים inactive-first עד שה־runtime/projection וה־Human Gate יאשרו הפעלה. לכן הם לא מוצגים כאן כאילו הם כבר ספרייה ציבורית חיה.</p>
    </section>

    <section className="sod29-section sod29-placeholder">
      <div className="sod29-section-head"><div><div className="sod29-kicker">PERSONAL SOURCE INTAKE</div><h2>חקור ספר משלך</h2><div className="sod29-muted">הכיוון נעול: Private Source → Light Intake → בחירת מטרת מחקר → Book Research Lab. ה־private storage/RLS runtime עדיין לא מחובר, ולכן הכפתור לא מזייף העלאה.</div></div></div>
      <button className="sod29-action" disabled>העלאת ספר פרטי · runtime pending</button>
    </section>
  </>;
}

function BookDetail({ slug }) {
  const research = useResearch();
  const shell = use2029Shell();
  const [state, setState] = useState({ loading: true, book: null, research: null, error: null });
  const currentContext = research.context || null;

  useEffect(() => {
    let alive = true;
    setState({ loading: true, book: null, research: null, error: null });
    fetchBookEntityBySlug(slug)
      .then(async book => {
        if (!book) return { book: null, pack: null };
        const pack = await fetchBookResearch(book, { limit: 40 });
        return { book, pack };
      })
      .then(({ book, pack }) => {
        if (!alive) return;
        setState({ loading: false, book, research: pack, error: null });
        if (book) {
          const patch = bookContextPatch({ book, slug, hasRoot: Boolean(currentContext?.subject), focusSelection: null });
          if (patch) research.updateResearchContext?.(patch);
        }
      })
      .catch(error => alive && setState({ loading: false, book: null, research: null, error }));
    return () => { alive = false; };
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const book = state.book;
  const pack = state.research;
  const tiers = book?.metadata?.identity_tiers || {};
  const coverage = book?.metadata?.coverage_2029 || book?.metadata?.coverage || {};
  const summary = pack?.summary || {};
  const rows = pack?.rows || [];
  const coveragePairs = useMemo(() => Object.entries(coverage).slice(0, 8), [coverage]);

  if (state.loading) return <section className="sod29-section"><div className="sod29-state">טוען Book + Source/Witness research דרך ה־adapter הקנוני…</div></section>;
  if (state.error) return <section className="sod29-section"><div className="sod29-state error">לא ניתן לפתוח את הספר: {String(state.error?.message || state.error)}</div></section>;
  if (!book) return <section className="sod29-section"><div className="sod29-state warn">הספר אינו פעיל/נגיש כרגע. לא מציגים snapshot קשיח במקום זהות חיה.</div><div className="sod29-actions"><Link className="sod29-action" to="/books">חזרה לספרייה</Link></div></section>;

  const saveBook = () => { const item = bookToWorkspaceItem(book); if (item) research.saveItem?.(item); };
  const addBook = () => { const item = bookToWorkspaceItem(book); if (item) research.addToResearch?.(item); };

  return <>
    <section className="sod29-focus-stage">
      <div className="sod29-book-detail-hero">
        <div className="sod29-book-cover" aria-hidden="true">▤</div>
        <div>
          <div className="sod29-kicker">BOOK IDENTITY</div>
          <h2>{book.label}</h2>
          <p className="sod29-muted">Book ≠ Source Work ≠ Edition ≠ Textual Version ≠ Witness ≠ Digital Object ≠ Locator. המסך מקרין את כל השכבות סביב אותה זהות בלי לאחד אותן בטעות.</p>
          <div className="sod29-actions"><button className="sod29-action" onClick={saveBook}>♡ שמור</button><button className="sod29-action" onClick={addBook}>＋ הוסף למחקר</button><button className="sod29-action" onClick={() => shell.openRaziel()}>✦ רזיאל</button><Link className="sod29-action primary" to="/heichal">◇ חקור בהיכל</Link></div>
        </div>
      </div>
    </section>

    <section className="sod29-section">
      <div className="sod29-section-head"><div><div className="sod29-kicker">SOURCE LAYERS</div><h2>שכבות הזהות והעדות</h2></div></div>
      <div className="sod29-grid">
        <div className="sod29-card"><h3>Witness</h3><p>{tiers.witness?.provider || tiers.witness?.identity || "לא הוגדר"}</p></div>
        <div className="sod29-card"><h3>Digital Object</h3><p>{tiers.digital_object?.mime || tiers.digital_object?.kind || "לא הוגדר"}</p></div>
        <div className="sod29-card"><h3>Locator</h3><p>{tiers.locator?.kind || "לא הוגדר"}</p></div>
      </div>
    </section>

    {coveragePairs.length ? <section className="sod29-section"><div className="sod29-section-head"><div><div className="sod29-kicker">COVERAGE AXES</div><h2>מה באמת מכוסה</h2><div className="sod29-muted">Structural coverage, Research Map, Exact Witness ו־Source Exhaustion אינם אותו דבר.</div></div></div><div className="sod29-grid">{coveragePairs.map(([k,v]) => <div className="sod29-card" key={k}><h3>{k.replaceAll("_"," ")}</h3><p>{typeof v === "string" || typeof v === "number" ? String(v) : JSON.stringify(v)}</p></div>)}</div></section> : null}

    <section className="sod29-section">
      <div className="sod29-section-head"><div><div className="sod29-kicker">RESEARCH OS</div><h2>מחקר שמקושר לספר</h2><div className="sod29-muted">הקריאה bounded ותחת RLS. source_ref הוא provenance/compatibility, לא ספריית אמת נוספת.</div></div><span className="sod29-chip">{summary.total || 0} rows</span></div>
      {pack?.restricted ? <div className="sod29-state warn">שכבת המחקר מוגנת עבור הסשן הנוכחי. לא מרחיבים הרשאות כדי למלא UI.</div> : null}
      {rows.length ? <div className="sod29-list">{rows.slice(0, 16).map(row => {
        const loc = parseSourceRefLocator(row.source_ref);
        const item = researchRowToWorkspaceItem(row, book);
        return <div className="sod29-row" key={row.id}><div><strong>{row.statement || row.kind || "Research Object"}</strong><small>{row.kind || "research"} · {row.status || "status unknown"}{loc.page ? ` · p${loc.page}` : ""} · {row.engine_detail?.verification_state || "verification unknown"}</small></div><div className="sod29-actions"><button className="sod29-action" onClick={() => item && research.saveItem?.(item)}>שמור</button></div></div>;
      })}</div> : <div className="sod29-state">אין Research Objects קריאים כרגע לספר הזה. אין snapshot קשיח שמתחזה למחקר חי.</div>}
    </section>
  </>;
}

export default function Books2029Page() {
  const { slug } = useParams();
  useEffect(() => { applySeo({ title: slug ? "ספר · SOD1820" : "ספרים ומקורות · SOD1820", description: "ספרים, מקורות, עדים ומחקר ב־SOD1820 2029", path: slug ? `/books/${slug}` : "/books" }); }, [slug]);
  return <Sod2029Shell surface="books" symbol="▤" eyebrow="BOOKS · SOURCES · WITNESSES" title={slug ? "ספר ומקור" : "ספרים ומקורות"} description="ספרייה אחת מעל זהויות ומקורות חיים. המקור אינו רק קובץ — הוא שער למחקר, לעדות, למראה־מקום ולהמשך בהיכל.">{slug ? <BookDetail slug={slug} /> : <LibraryView />}</Sod2029Shell>;
}
