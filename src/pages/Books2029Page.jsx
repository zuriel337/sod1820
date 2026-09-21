import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Sod2029Shell, { FrameState, use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
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
import { applySeo } from "../lib/seo.js";

const COVERAGE_LABELS = {
  structural: "מיפוי מבני",
  structural_digital_object: "מבנה המקור הדיגיטלי",
  structural_sections: "חלקים מבניים",
  research_map: "מפת המחקר",
  content_scan: "סריקת תוכן",
  close_read: "קריאה צמודה",
  exact_witness: "עדות מדויקת",
  exact_witness_close_read: "קריאת העדות",
  source_exhaustion: "מיצוי המקור",
  corpus_exhaustion: "מיצוי הקורפוס",
  deep_research: "מחקר עומק",
  active_blocks: "בלוקים פעילים",
  exact_lexical_census: "מפקד לשוני מדויק",
  historical_witness_collation: "השוואת עדים היסטוריים",
  unresolved_total: "נקודות לא פתורות",
};

function coverageLabel(key) {
  return COVERAGE_LABELS[key] || String(key || "").replaceAll("_", " ");
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
  return bits.join(" · ") || edition.status || "פרטי המהדורה עדיין חלקיים";
}

function locatorLabel(tiers) {
  const kind = tiers?.locator?.kind;
  if (!kind) return "מראה־מקום טרם הוגדר";
  if (kind.includes("section")) return "מראה־מקום לפי חלק/סעיף";
  if (kind.includes("page")) return "מראה־מקום לפי עמוד ומקטע";
  return kind.replaceAll("_", " ");
}

function primaryCoverage(coverage) {
  const order = ["structural_sections", "structural", "structural_digital_object", "content_scan", "research_map", "deep_research"];
  for (const key of order) if (coverage?.[key] != null) return { key, value: coverage[key] };
  return null;
}

function ResearchFindingRow({ entry, book, research }) {
  const row = entry.row;
  const loc = entry.representation?.sourceLocator || parseSourceRefLocator(row.source_ref);
  const item = researchRowToWorkspaceItem(row, book);
  const locus = loc?.page ? `עמוד ${loc.page}` : loc?.zone ? loc.zone.replaceAll("_", " ") : null;
  return <div className="sod29-row sod29-book-research-row">
    <div>
      <strong>{shortText(row.statement || entry.representation?.title || row.kind || "ממצא מחקר", 260)}</strong>
      <small>{[entry.statusLabel, entry.verificationLabel, locus].filter(Boolean).join(" · ")}</small>
    </div>
    <div className="sod29-actions"><button className="sod29-action" onClick={() => item && research.saveItem?.(item)}>♡ שמור</button></div>
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
    <p className="sod29-muted">{primary ? `${coverageLabel(primary.key)} · ${String(primary.value)}` : "ספר חי במערכת המחקר"}</p>
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

  if (state.loading) return <section className="sod29-section"><FrameState kind="loading" title="טוען את הספרייה הפעילה" progress={{ phase: "קורא את זהויות הספרים הפעילות" }}>הספרייה מתחברת לזהויות ולכיסוי המחקר הקיימים.</FrameState></section>;
  if (state.error) return <section className="sod29-section"><div className="sod29-state error">לא ניתן לטעון את הספרייה: {String(state.error?.message || state.error)}</div></section>;

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

  if (state.loading) return <section className="sod29-section"><FrameState kind="loading" title="טוען את הספר והמחקר" progress={{ phase: "קורא זהות מקור ומחקר מקושר" }}>הספר נשאר אותו ספר; המערכת אוספת את שכבות המקור והמחקר להצגה אחת.</FrameState></section>;
  if (state.error) return <section className="sod29-section"><div className="sod29-state error">לא ניתן לפתוח את הספר: {String(state.error?.message || state.error)}</div></section>;
  if (!book) return <section className="sod29-section"><div className="sod29-state warn">הספר אינו פעיל/נגיש כרגע. לא מציגים snapshot קשיח במקום זהות חיה.</div><div className="sod29-actions"><Link className="sod29-action" to="/books">חזרה לספרייה</Link></div></section>;

  const saveBook = () => { const item = bookToWorkspaceItem(book); if (item) research.saveItem?.(item); };
  const addBook = () => { const item = bookToWorkspaceItem(book); if (item) research.addToResearch?.(item); };

  return <>
    <section className="sod29-focus-stage">
      <div className="sod29-book-detail-hero">
        <div className="sod29-book-cover" aria-hidden="true">▤</div>
        <div>
          <div className="sod29-kicker">ספר · מקור · מחקר</div>
          <h2>{book.label}</h2>
          <p className="sod29-muted">מתחילים מהעיקר: מה כבר מופה, מה נמצא במחקר, מאיזה מקור זה מגיע ומה עדיין דורש המשך בדיקה. שכבות העדות נשמרות בנפרד מאחורי התצוגה האנושית.</p>
          <div className="sod29-actions"><button className="sod29-action" onClick={saveBook}>♡ שמור</button><button className="sod29-action" onClick={addBook}>＋ הוסף למחקר</button><button className="sod29-action" onClick={() => shell.openRaziel()}>✦ שאל את רזיאל</button><Link className="sod29-action primary" to="/heichal">◇ חקור לעומק בהיכל</Link></div>
        </div>
      </div>
    </section>

    <section className="sod29-section sod29-book-overview">
      <div className="sod29-section-head"><div><div className="sod29-kicker">העיקר</div><h2>מצב הספר עכשיו</h2><div className="sod29-muted">תמונת פתיחה אחת לפני שנכנסים לפרטים, למטריצות או לכלי עומק.</div></div></div>
      <div className="sod29-book-overview-grid">
        <div className="sod29-book-overview-card"><strong>{presentation.total}</strong><span>ממצאי מחקר קריאים</span></div>
        <div className="sod29-book-overview-card"><strong>{primary ? String(primary.value) : "—"}</strong><span>{primary ? coverageLabel(primary.key) : "כיסוי מבני"}</span></div>
        <div className="sod29-book-overview-card"><strong>{witnessLabel(tiers)}</strong><span>מקור / עדות</span></div>
        <div className="sod29-book-overview-card"><strong>{String(coverage.exact_witness_close_read || coverage.exact_witness || coverage.historical_witness_collation || "—")}</strong><span>מצב העדות המדויקת</span></div>
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
      <div className="sod29-grid">{coveragePairs.map(([k,v]) => <div className="sod29-card" key={k}><h3>{coverageLabel(k)}</h3><p>{String(v)}</p></div>)}</div>
    </section> : null}

    <section className="sod29-section" id="book-research-summary">
      <div className="sod29-section-head"><div><div className="sod29-kicker">מה כבר נחקר</div><h2>מחקר סביב הספר</h2><div className="sod29-muted">אותו Research OS, מסודר כאן לפי צורת החומר: מנגנונים, מבנים וממצאים. סטטוס ואימות נשמרים כפי שהם במקור.</div></div><span className="sod29-chip">{presentation.total} ממצאים</span></div>
      {pack?.restricted ? <div className="sod29-state warn">חלק משכבת המחקר מוגן עבור הסשן הנוכחי. לא מרחיבים הרשאות כדי למלא את המסך.</div> : null}
      {pack?.truncated ? <div className="sod29-state">מוצגת קריאה bounded של שכבת המחקר; חומר נוסף נשאר במאגר ולא נחתך סמנטית.</div> : null}
      {presentation.groups.length ? <div className="sod29-book-families">{presentation.groups.map((group, index) => <ResearchFamily key={group.id} group={group} book={book} research={research} defaultOpen={index === 0} />)}</div> : <div className="sod29-state">אין כרגע Research Objects קריאים לסשן הזה. עדיין אפשר לראות את מצב המקור והכיסוי בלי להמציא ממצאים.</div>}
    </section>

    <section className="sod29-section">
      <div className="sod29-section-head"><div><div className="sod29-kicker">מה עדיין פתוח</div><h2>נקודות להמשך בדיקה</h2><div className="sod29-muted">כאן מופיעים רק סימנים מפורשים מהמחקר או מה־coverage — לא ניחושים ולא “ציון אמת”.</div></div></div>
      <div className="sod29-grid">
        <div className="sod29-card"><h3>ממצאים עם אות בדיקה מפורש</h3><p>{presentation.reviewCount ? `${presentation.reviewCount} ממצאים מסומנים ב־pending / unresolved / mismatch או מצב מקביל.` : "לא נמצאו כרגע אותות בדיקה מפורשים בשורות הקריאות."}</p></div>
        <div className="sod29-card"><h3>נקודות לא פתורות במיפוי</h3><p>{unresolvedTotal ? `${unresolvedTotal} נקודות רשומות ב־coverage.` : "לא רשום unresolved_total נפרד לספר הזה."}</p></div>
        <div className="sod29-card"><h3>שאריות מחקר מפורשות</h3><p>{residuals.length ? residuals.map(x => String(x).replaceAll("_", " ")).join(" · ") : "לא רשומה רשימת residuals נפרדת."}</p></div>
      </div>
    </section>
  </>;
}

export default function Books2029Page() {
  const { slug } = useParams();
  useEffect(() => { applySeo({ title: slug ? "ספר · SOD1820" : "ספרים ומקורות · SOD1820", description: "ספרים, מקורות, עדים ומחקר ב־SOD1820 2029", path: slug ? `/book/${slug}` : "/books" }); }, [slug]);
  return <Sod2029Shell surface="books" symbol="▤" eyebrow="BOOKS · SOURCES · WITNESSES" title={slug ? "ספר ומקור" : "ספרים ומקורות"} description="ספרייה אחת מעל זהויות ומקורות חיים. המקור אינו רק קובץ — הוא שער למחקר, לעדות, למראה־מקום ולהמשך בהיכל.">{slug ? <BookDetail slug={slug} /> : <LibraryView />}</Sod2029Shell>;
}
