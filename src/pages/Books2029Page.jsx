import NavigationIcon2029 from "../components/experience2029/NavigationIcon2029.jsx";
import { use2029Palette } from "../lib/palette.js";
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
  buildBookResearchPresentation,
} from "../lib/research/bookResearchProjection.js";
import {
  presentBookCoverageKey,
  presentBookCoverageValue,
  presentBookEditionStatus,
  presentBookLocatorKind,
  presentBookScreenState,
  presentBookTechnicalTerm,
} from "../lib/research/bookHebrewPresentation.js";
import { applySeo } from "../lib/seo.js";

function coverageLabel(key) {
  return presentBookCoverageKey(key).labelHe;
}

function coverageValueLabel(value) {
  return presentBookCoverageValue(value).labelHe;
}

function screenLabel(state) {
  return presentBookScreenState(state).labelHe;
}

function technicalLabel(term) {
  return presentBookTechnicalTerm(term).labelHe;
}

function shortText(value, max = 220) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

function witnessLabel(tiers) {
  const witness = tiers?.witness || {};
  const bits = [witness.provider, witness.native_id || witness.shelfmark].filter(Boolean);
  return bits.join(" · ") || witness.identity || "עדות המקור טרם הוגדרה";
}

function editionLabel(tiers) {
  const edition = tiers?.edition || {};
  const bits = [edition.place, edition.gregorian_year || edition.hebrew_year].filter(Boolean);
  return bits.join(" · ") || presentBookEditionStatus(edition.status).labelHe;
}

function locatorLabel(tiers) {
  const kind = tiers?.locator?.kind;
  if (!kind) return "מראה־מקום טרם הוגדר";
  return presentBookLocatorKind(kind).labelHe;
}

function primaryCoverage(coverage) {
  const order = ["structural_sections", "structural", "structural_digital_object", "content_scan", "research_map", "deep_research"];
  for (const key of order) if (coverage?.[key] != null) return { key, value: coverage[key] };
  return null;
}

function SaveBookItemAction({ item, research }) {
  const palette = use2029Palette();
  const [failed, setFailed] = useState(false);
  const saved = Boolean(item?.id && research.saved?.some(entry => entry.id === item.id));
  return <>
    <button type="button" className="sod29-action" data-action="save"
      style={{ "--action-success": palette.successText, "--action-danger": palette.dangerText }}
      data-state={failed ? "error" : saved ? "success" : "idle"} aria-pressed={saved && !failed} disabled={!item}
      onClick={() => { try { setFailed(!research.saveItem?.(item)); } catch { setFailed(true); } }}>
      <NavigationIcon2029 name={failed ? "issue" : saved ? "check" : "save"} />{failed ? "נסה לשמור שוב" : saved ? "נשמר" : "שמור"}
    </button>
    <span className="sod-action-announcement" role="status">{failed ? screenLabel("save_failure") : saved ? screenLabel("save_success") : ""}</span>
  </>;
}

function ResearchFindingRow({ entry, book, research }) {
  const row = entry.row;
  const loc = entry.representation?.sourceLocator || parseSourceRefLocator(row.source_ref);
  const item = researchRowToWorkspaceItem(row, book);
  const locus = loc?.page ? `עמוד ${loc.page}` : loc?.zone ? "מראה־מקום מפורט" : null;
  const title = entry.titleHe || entry.kindPresentation?.labelHe || "פריט מחקר";
  const verification = entry.verificationPresentation?.labelHe || entry.verificationLabel;
  return <div className="sod29-row sod29-book-research-row">
    <div>
      <strong>{shortText(title, 260)}</strong>
      <small>{[entry.kindPresentation?.labelHe, entry.statusPresentation?.labelHe, verification, locus].filter(Boolean).join(" · ")}</small>
    </div>
    <div className="sod29-actions"><SaveBookItemAction item={item} research={research} /></div>
  </div>;
}

function ResearchFamily({ group, book, research, defaultOpen = false }) {
  const visible = group.items.slice(0, 4);
  const rest = group.items.slice(4);
  return <details className="sod29-book-family" open={defaultOpen}>
    <summary>
      <span><strong>{group.label}</strong><small>{group.description}</small></span>
      <span className="sod29-chip">{group.items.length}</span>
    </summary>
    <div className="sod29-book-family-body">
      <div className="sod29-list">{visible.map(entry => <ResearchFindingRow key={entry.row.id} entry={entry} book={book} research={research} />)}</div>
      {rest.length ? <details className="sod29-book-family-more">
        <summary>עוד {rest.length} ממצאים</summary>
        <div className="sod29-list">{rest.map(entry => <ResearchFindingRow key={entry.row.id} entry={entry} book={book} research={research} />)}</div>
      </details> : null}
    </div>
  </details>;
}

function BookCard({ book }) {
  const slug = book?.metadata?.slug;
  const coverage = { ...(book?.metadata?.coverage || {}), ...(book?.metadata?.coverage_2029 || {}) };
  const primary = primaryCoverage(coverage);
  return <Link className="sod29-book-tile" to={slug ? `/book/${slug}` : "/books"}>
    <div className="sod29-book-cover" aria-hidden="true">▤</div>
    <div className="sod29-kicker">ספר ומקור</div>
    <h3>{book.label}</h3>
    <p className="sod29-muted">{primary ? `${coverageLabel(primary.key)} · ${coverageValueLabel(primary.value)}` : "ספר חי במערכת המחקר"}</p>
    <div className="sod29-actions">
      <span className="sod29-chip">{book.is_active ? "פעיל" : "לא פעיל"}</span>
      {coverage.unresolved_total != null ? <span className="sod29-chip">{coverage.unresolved_total} נקודות פתוחות</span> : null}
    </div>
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

  if (state.loading) return <section className="sod29-section"><div className="sod29-state">{screenLabel("library_loading")}</div></section>;
  if (state.error) return <section className="sod29-section"><div className="sod29-state error">{screenLabel("network_error")}</div></section>;

  return <>
    <section className="sod29-focus-stage">
      <div className="sod29-command-shell">
        <div className="sod29-command-copy">
          <div className="sod29-kicker">ספרים ומקורות</div>
          <h2>הספרייה אינה רק מדף.<br />כל ספר הוא שער למחקר.</h2>
          <div className="sod29-muted">כל ספר מחובר למקור, למהדורה, למראה־מקום ולמחקר שנצבר סביבו. אפשר להתחיל בקריאה פשוטה ולהעמיק רק כשצריך.</div>
          <div className="sod29-actions"><span className="sod29-chip">{state.books.length} ספרים פעילים</span><span className="sod29-chip">מקור · מחקר · מראה־מקום</span></div>
        </div>
        <div className="sod29-orbit-map" aria-hidden="true">
          <div className="sod29-orbit-center">מקור<br />אחד</div>
          <span className="sod29-orbit-node n1">ספר</span>
          <span className="sod29-orbit-node n2">עדות</span>
          <span className="sod29-orbit-node n3">מראה־מקום</span>
          <span className="sod29-orbit-node n4">מחקר</span>
        </div>
      </div>
    </section>

    <section className="sod29-section">
      <div className="sod29-section-head"><div><div className="sod29-kicker">הספרייה</div><h2>הספרייה הפעילה</h2><div className="sod29-muted">פתחו ספר כדי לראות מה כבר מופה, אילו ממצאים קיימים, מאיזה מקור הם מגיעים ומה עדיין פתוח לבדיקה.</div></div></div>
      {state.books.length ? <div className="sod29-book-grid">{state.books.map(book => <BookCard key={book.id} book={book} />)}</div> : <div className="sod29-state">{screenLabel("no_authorized_books")}</div>}
    </section>

    <section className="sod29-section sod29-placeholder">
      <div className="sod29-section-head"><div><div className="sod29-kicker">{technicalLabel("CORPUS PROJECTION")}</div><h2>תנ״ך · קבוצת ספרים</h2></div></div>
      <p className="sod29-muted">תשתית המערכת כבר הגדירה את התנ״ך כקורפוס בן 24 זהויות ספר, ולא כ״ספר 25״. הספרים יישארו סגורים עד שהקורא ואישור ההפעלה יהיו מוכנים; לכן הם אינם מוצגים כאן כאילו הם כבר ספרייה ציבורית חיה.</p>
    </section>

    <section className="sod29-section sod29-placeholder">
      <div className="sod29-section-head"><div><div className="sod29-kicker">{technicalLabel("PERSONAL SOURCE INTAKE")}</div><h2>חקור ספר משלך</h2><div className="sod29-muted">המסלול המתוכנן: מקור פרטי, קליטה ראשונית, בחירת מטרת מחקר ומחקר עומק בספר. תשתית האחסון וההרשאות עדיין אינה מחוברת, ולכן הכפתור אינו מדמה העלאה.</div></div></div>
      <button className="sod29-action" disabled>העלאת ספר פרטי · {screenLabel("action_unavailable")}</button>
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
        const pack = await fetchBookResearch(book, { limit: 80 });
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
  const coverage = useMemo(() => ({
    ...(book?.metadata?.coverage || {}),
    ...(book?.metadata?.coverage_2029 || {}),
  }), [book]);
   const rows = pack?.rows || [];
  const presentation = useMemo(() => buildBookResearchPresentation(rows), [rows]);
  const primary = useMemo(() => primaryCoverage(coverage), [coverage]);
  const coveragePairs = useMemo(() => Object.entries(coverage)
    .filter(([key, value]) => key !== "residuals" && key !== "unresolved_breakdown" && value != null && typeof value !== "object")
    .slice(0, 8), [coverage]);
  const residuals = Array.isArray(coverage.residuals) ? coverage.residuals : [];
  const unresolvedTotal = Number(coverage.unresolved_total || 0) || 0;
  const witnessCoverage = coverage.exact_witness_close_read
    || coverage.exact_witness
    || coverage.historical_witness_collation
    || null;

  if (state.loading) return <section className="sod29-section"><div className="sod29-state">{screenLabel("book_loading")}</div></section>;
  if (state.error) return <section className="sod29-section"><div className="sod29-state error">{screenLabel("network_error")}</div></section>;
  if (!book) return <section className="sod29-section"><div className="sod29-state warn">{screenLabel("book_unavailable")}</div><div className="sod29-actions"><Link className="sod29-action" to="/books">חזרה לספרייה</Link></div></section>;

  const addBook = () => { const item = bookToWorkspaceItem(book); if (item) research.addToResearch?.(item); };

  return <>
    <section className="sod29-focus-stage">
      <div className="sod29-book-detail-hero">
        <div className="sod29-book-cover" aria-hidden="true">▤</div>
        <div>
          <div className="sod29-kicker">ספר · מקור · מחקר</div>
          <h2>{book.label}</h2>
          <p className="sod29-muted">מתחילים מהעיקר: מה כבר מופה, מה נמצא במחקר, מאיזה מקור זה מגיע ומה עדיין דורש המשך בדיקה. שכבות העדות נשמרות בנפרד מאחורי התצוגה האנושית.</p>
          <div className="sod29-actions"><SaveBookItemAction key={book.id} item={bookToWorkspaceItem(book)} research={research} /><button type="button" className="sod29-action" data-action="research" onClick={addBook}><NavigationIcon2029 name="add" /> הוסף למחקר</button><button className="sod29-action" onClick={() => shell.openRaziel()} disabled={shell.razielLocked}>{shell.razielLocked ? "✦ רזיאל · נעול" : "✦ שאל את רזיאל"}</button></div>
        </div>
      </div>
    </section>

    <section className="sod29-section sod29-book-overview">
      <div className="sod29-section-head"><div><div className="sod29-kicker">העיקר</div><h2>מצב הספר עכשיו</h2><div className="sod29-muted">תמונת פתיחה אחת לפני שנכנסים לפרטים, למטריצות או לכלי עומק.</div></div></div>
      <div className="sod29-book-overview-grid">
        <div className="sod29-book-overview-card"><strong>{presentation.total}</strong><span>ממצאי מחקר קריאים</span></div>
        <div className="sod29-book-overview-card"><strong>{primary ? coverageValueLabel(primary.value) : "—"}</strong><span>{primary ? coverageLabel(primary.key) : "כיסוי מבני"}</span></div>
        <div className="sod29-book-overview-card"><strong>{witnessLabel(tiers)}</strong><span>מקור / עדות</span></div>
        <div className="sod29-book-overview-card"><strong>{witnessCoverage ? coverageValueLabel(witnessCoverage) : "—"}</strong><span>מצב העדות המדויקת</span></div>
      </div>
    </section>

    <section className="sod29-section">
      <div className="sod29-section-head"><div><div className="sod29-kicker">המקור</div><h2>מאיפה החומר מגיע</h2><div className="sod29-muted">הספר, המהדורה, העדות ומראה־המקום נשארים זהויות נפרדות; כאן מציגים אותם בשפה קריאה.</div></div></div>
      <div className="sod29-grid">
        <div className="sod29-card"><h3>עדות / מקור</h3><p>{witnessLabel(tiers)}</p></div>
        <div className="sod29-card"><h3>מהדורה</h3><p>{editionLabel(tiers)}</p></div>
        <div className="sod29-card"><h3>מראה־מקום</h3><p>{locatorLabel(tiers)}</p></div>
      </div>
    </section>

    {coveragePairs.length ? <section className="sod29-section">
      <div className="sod29-section-head"><div><div className="sod29-kicker">מה כבר מכוסה</div><h2>מפת הכיסוי</h2><div className="sod29-muted">מיפוי מבני, קריאה צמודה, עדות מדויקת ומיצוי מקור הם מצבים שונים — ולא מתאחדים לציון אחד.</div></div></div>
      <div className="sod29-grid">{coveragePairs.map(([k,v]) => <div className="sod29-card" key={k}><h3>{coverageLabel(k)}</h3><p>{coverageValueLabel(v)}</p></div>)}</div>
    </section> : null}

    <section className="sod29-section" id="book-research-summary">
      <div className="sod29-section-head"><div><div className="sod29-kicker">מה כבר נחקר</div><h2>המחקר סביב הספר</h2><div className="sod29-muted">חומר המחקר מסודר כאן לפי צורתו: מנגנונים, מבנים וממצאים. מצב המחקר ומצב הבדיקה נשמרים כצירים נפרדים.</div></div><span className="sod29-chip">{presentation.total} ממצאים</span></div>
      {pack?.restricted ? <div className="sod29-state warn">{screenLabel("restricted")}</div> : null}
      {pack?.truncated ? <div className="sod29-state">{screenLabel("truncated")}</div> : null}
      {presentation.groups.length ? <div className="sod29-book-families">{presentation.groups.map((group, index) => <ResearchFamily key={group.id} group={group} book={book} research={research} defaultOpen={index === 0} />)}</div> : <div className="sod29-state">{screenLabel("no_approved_material")}</div>}
    </section>

    <section className="sod29-section">
      <div className="sod29-section-head"><div><div className="sod29-kicker">מה עדיין פתוח</div><h2>נקודות להמשך בדיקה</h2><div className="sod29-muted">כאן מופיעים רק סימנים מפורשים מן המחקר או ממפת הכיסוי — לא ניחושים ולא ״ציון אמת״.</div></div></div>
      <div className="sod29-grid">
        <div className="sod29-card"><h3>ממצאים עם אות בדיקה מפורש</h3><p>{presentation.reviewCount ? `${presentation.reviewCount} ממצאים מסומנים להמשך בדיקה.` : "לא נמצאו כרגע אותות בדיקה מפורשים בשורות הקריאות."}</p></div>
        <div className="sod29-card"><h3>נקודות לא פתורות במיפוי</h3><p>{unresolvedTotal ? `${unresolvedTotal} נקודות רשומות במפת הכיסוי.` : "לא רשמה המערכת מספר נפרד של נקודות לא פתורות לספר הזה."}</p></div>
        <div className="sod29-card"><h3>נקודות המשך מפורשות</h3><p>{residuals.length ? `${residuals.length} נקודות המשך רשומות בפרטי הבדיקה.` : "לא רשמה המערכת רשימת המשך נפרדת."}</p></div>
      </div>
    </section>
  </>;
}

export default function Books2029Page() {
  const { slug } = useParams();
  useEffect(() => { applySeo({ title: slug ? "ספר · SOD1820" : "ספרים ומקורות · SOD1820", description: "ספרים, מקורות, עדים ומחקר ב־SOD1820", path: slug ? `/book/${slug}` : "/books" }); }, [slug]);
  return <Sod2029Shell surface="books" symbol="▤" eyebrow={technicalLabel("BOOKS · SOURCES · WITNESSES")} title={slug ? "ספר ומקור" : "ספרים ומקורות"} description="ספרייה אחת מעל זהויות ומקורות חיים. המקור אינו רק קובץ — הוא שער למחקר, לעדות ולמראה־מקום.">{slug ? <BookDetail slug={slug} /> : <LibraryView />}</Sod2029Shell>;
}
