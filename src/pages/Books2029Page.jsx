import NavigationIcon2029 from "../components/experience2029/NavigationIcon2029.jsx";
import { use2029Palette } from "../lib/palette.js";
import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Sod2029Shell, { use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import {
  fetchBookEntities,
  fetchBookEntityBySlug,
  fetchPublicBookResearch,
  bookContextPatch,
  bookToWorkspaceItem,
  researchRowToWorkspaceItem,
  parseSourceRefLocator,
  buildBookResearchPresentation,
} from "../lib/research/bookResearchProjection.js";
import {
  fetchBookMaterialMap,
  isBookMaterialPreview,
} from "../lib/research/bookMaterialMap2029.js";
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
    <span className="sod-action-announcement" role="status">{failed ? "השמירה לא הושלמה. נסה שוב." : saved ? "הפריט שמור בספרייה" : ""}</span>
  </>;
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

function MaterialMap({ material }) {
  if (!material?.available) return null;
  const source = material.source || {};
  const mappedUnits = material.findings.length;
  const resolvedWitnessCount = material.witnessClosures.length;
  const openCount = material.openQuestions.length;
  const completion = material.completion;
  const intake = material.researchIntake;

  return <section className="sod29-section" id="book-material-map">
    <div className="sod29-section-head">
      <div>
        <div className="sod29-kicker">PREVIEW · MATERIAL MAP</div>
        <h2>מפת החומר</h2>
        <div className="sod29-muted">מה באמת קיים בספר: מקור, מבנה, ממצאים, שיטות, קשרים ושאלות פתוחות. זו תצוגה של חבילת חומר ציבורית ומתועדת.</div>
      </div>
      <div className="sod29-actions">
        <span className="sod29-chip">פיילוט Preview</span>
        {source.pdfUrl ? <a className="sod29-action" href={source.pdfUrl} target="_blank" rel="noreferrer"><NavigationIcon2029 name="expand" /> פתח את המקור</a> : null}
      </div>
    </div>

    <div className="sod29-grid">
      <div className="sod29-card wide"><h3>המקור</h3><p>{source.subtitle || "חבילת המקור מחוברת לספר."}</p>{source.promise ? <p>{source.promise}</p> : null}</div>
      <div className="sod29-card"><h3>זהות החבילה</h3><p>{source.identity || material.slug}</p><p>{source.generatedAt ? `צילום מצב: ${source.generatedAt}` : "צילום מצב מתועד"}</p></div>
      {completion ? <div className="sod29-card wide"><h3>{completion.label}</h3><p>{completion.summary}</p><small>{[completion.blockingOpen != null ? `${completion.blockingOpen} חסמים` : null, completion.nextPhase ? `השלב הבא: ${completion.nextPhase}` : null].filter(Boolean).join(" · ")}</small></div> : null}
    </div>

    {material.inventory.length ? <div className="sod29-actions" aria-label="מלאי החומר המתועד">
      {material.inventory.map(item => <span className="sod29-chip" key={item.key}>{item.value} {item.label}</span>)}
    </div> : null}

    <div className="sod29-book-families">
      {material.sections.length ? <details className="sod29-book-family" open>
        <summary><span><strong>מה יש בספר</strong><small>מפת החומר לפי חטיבות ועמודים, לפני שאלות האימות והחישוב.</small></span><span className="sod29-chip">{material.sections.length}</span></summary>
        <div className="sod29-book-family-body"><div className="sod29-grid">{material.sections.map(item => <div className="sod29-card" key={item.id}><h3>{item.title}</h3><small>{[item.pages, item.status].filter(Boolean).join(" · ")}</small><p>{item.material}</p></div>)}</div></div>
      </details> : null}

      <details className="sod29-book-family" open>
        <summary><span><strong>מבנה וכיסוי</strong><small>היקף החומר ומצב הכיסוי נשמרים כמדדים נפרדים.</small></span><span className="sod29-chip">{material.metrics.length + material.coverage.length}</span></summary>
        <div className="sod29-book-family-body">
          {material.metrics.length ? <div className="sod29-book-overview-grid">{material.metrics.map(metric => <div className="sod29-book-overview-card" key={metric.id}><strong>{metric.value}</strong><span>{metric.label}{metric.note ? ` · ${metric.note}` : ""}</span></div>)}</div> : null}
          {material.coverage.length ? <div className="sod29-list">{material.coverage.map(item => <div className="sod29-row" key={item.id}><div><strong>{item.label} · {item.value}</strong>{item.note ? <small>{item.note}</small> : null}</div></div>)}</div> : null}
        </div>
      </details>

      <details className="sod29-book-family" open>
        <summary><span><strong>ממצאים ומאגרי נתונים</strong><small>יחידות חומר מזוהות עם מראה־מקום, מצב והערת מחקר.</small></span><span className="sod29-chip">{mappedUnits}</span></summary>
        <div className="sod29-book-family-body"><div className="sod29-list">{material.findings.map(item => <div className="sod29-row" key={item.id}><div><strong>{item.id} · {item.title}</strong><small>{[item.locus, item.status].filter(Boolean).join(" · ")}</small>{item.note ? <p className="sod29-muted">{item.note}</p> : null}</div></div>)}</div></div>
      </details>

      <details className="sod29-book-family" open>
        <summary><span><strong>שיטות, משפחות ומספרים</strong><small>הדפוסים והפרוצדורות שהחומר כבר מאפשר לזהות.</small></span><span className="sod29-chip">{material.methods.length}</span></summary>
        <div className="sod29-book-family-body"><div className="sod29-grid">{material.methods.map(item => <div className="sod29-card" key={item.id}><h3>{item.title}</h3><p>{item.text}</p></div>)}</div></div>
      </details>

      <details className="sod29-book-family">
        <summary><span><strong>קשרים ונקודות כניסה</strong><small>קשרים מתועדים בתוך הספר, או נקודות הכניסה המרכזיות כשאין עדיין טבלת קשרים מלאה.</small></span><span className="sod29-chip">{material.connections.length}</span></summary>
        <div className="sod29-book-family-body"><div className="sod29-list">{material.connections.map(item => <div className="sod29-row" key={item.id}><div><strong>{item.title}</strong>{item.meta ? <small>{item.meta}</small> : null}{item.text ? <p className="sod29-muted">{item.text}</p> : null}</div></div>)}</div></div>
      </details>

      {resolvedWitnessCount ? <details className="sod29-book-family" open>
        <summary><span><strong>נסגר מול המקור</strong><small>מקומות שהיו חסרים ואותרו ישירות ב־PDF; סגירת עדות אינה בהכרח סגירת החישוב.</small></span><span className="sod29-chip">{resolvedWitnessCount}</span></summary>
        <div className="sod29-book-family-body"><div className="sod29-list">{material.witnessClosures.map(item => <div className="sod29-row" key={item.id}><div><strong>{item.title}</strong><small>{[item.locus, item.status].filter(Boolean).join(" · ")}</small>{item.note ? <p className="sod29-muted">{item.note}</p> : null}</div></div>)}</div></div>
      </details> : null}

      <details className="sod29-book-family" open>
        <summary><span><strong>המשך מחקר — לא חוסם</strong><small>עבודות חילוץ ושאלות מקור נשמרות במפורש; הן אינן מבטלות את השלמת מפת החומר.</small></span><span className="sod29-chip">{openCount}</span></summary>
        <div className="sod29-book-family-body"><div className="sod29-list">{material.openQuestions.map((item, index) => <div className="sod29-row" key={item.id}><div><strong>{index + 1}</strong><small>{item.text}</small></div></div>)}</div></div>
      </details>

      {intake?.steps.length ? <details className="sod29-book-family" open>
        <summary><span><strong>מסלול הכנסה למחקר</strong><small>{intake.principle || "קליטה סלקטיבית אל Research OS הקיים."}</small></span><span className="sod29-chip">{intake.steps.length}</span></summary>
        <div className="sod29-book-family-body"><div className="sod29-list">{intake.steps.map((item, index) => <div className="sod29-row" key={item.id}><div><strong>{index + 1} · {item.title}</strong><small>{[item.target, item.status].filter(Boolean).join(" · ")}</small>{item.note ? <p className="sod29-muted">{item.note}</p> : null}</div></div>)}</div></div>
      </details> : null}
    </div>

    <div className="sod29-section-head"><div><div className="sod29-kicker">השלבים</div><h2>איפה אנחנו ומה הבא</h2></div></div>
    <div className="sod29-grid">
      <div className="sod29-card"><h3>1 · החומר נמצא</h3><p>כל 99 עמודי המקור רשומים במפת החומר הציבורית, וה־PDF המקורי מחובר לפתיחה.</p></div>
      <div className="sod29-card"><h3>2 · הנתונים הופרדו</h3><p>{mappedUnits} יחידות חומר ו־{material.methods.length} משפחות/שיטות מסודרות לפי מקור, חישוב וקורפוס.</p></div>
      <div className="sod29-card"><h3>3 · השלב הנוכחי נסגר</h3><p>{completion?.summary || (openCount ? `${openCount} נקודות נשמרו להמשך מחקר ואינן מוצגות כמנעול.` : "כל הנקודות המתועדות נסגרו.")}</p></div>
      <div className="sod29-card"><h3>4 · הבא: קליטה סלקטיבית</h3><p>{intake?.principle || "מחברים את המקור פעם אחת ומקדמים רק ממצאים שנבדקו, בלי ליצור מערכת מחקר נוספת."}</p></div>
    </div>
  </section>;
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
      {isBookMaterialPreview(slug) ? <span className="sod29-chip">מפת חומר · Preview</span> : null}
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

  if (state.loading) return <section className="sod29-section"><div className="sod29-state">טוען את הספרייה הפעילה…</div></section>;
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
  const [searchParams] = useSearchParams();
  const focusResearchId = searchParams.get("research") || null;
  const [state, setState] = useState({ loading: true, book: null, research: null, material: null, researchError: null, error: null });
  const currentContext = research.context || null;

  useEffect(() => {
    let alive = true;
    setState({ loading: true, book: null, research: null, material: null, researchError: null, error: null });
    fetchBookEntityBySlug(slug)
      .then(async book => {
        if (!book) return { book: null, pack: null, material: null, researchError: null };
        const [material, researchResult] = await Promise.all([
          fetchBookMaterialMap(slug),
          fetchPublicBookResearch(book, { limit: 80, focusId: focusResearchId })
            .then(pack => ({ pack, error: null }))
            .catch(error => ({ pack: null, error })),
        ]);
        return { book, pack: researchResult.pack, material, researchError: researchResult.error };
      })
      .then(({ book, pack, material, researchError }) => {
        if (!alive) return;
        setState({ loading: false, book, research: pack, material, researchError, error: null });
        if (book) {
          const patch = bookContextPatch({ book, slug, hasRoot: Boolean(currentContext?.subject), focusSelection: null });
          if (patch) research.updateResearchContext?.(patch);
        }
      })
      .catch(error => alive && setState({ loading: false, book: null, research: null, error }));
    return () => { alive = false; };
  }, [slug, focusResearchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const book = state.book;
  const pack = state.research;
  const material = state.material;
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
  const mappedMaterialTotal = material?.available ? material.findings.length : 0;

  if (state.loading) return <section className="sod29-section"><div className="sod29-state">טוען את הספר ואת המחקר המקושר אליו…</div></section>;
  if (state.error) return <section className="sod29-section"><div className="sod29-state error">לא ניתן לפתוח את הספר: {String(state.error?.message || state.error)}</div></section>;
  if (!book) return <section className="sod29-section"><div className="sod29-state warn">הספר אינו פעיל/נגיש כרגע. לא מציגים snapshot קשיח במקום זהות חיה.</div><div className="sod29-actions"><Link className="sod29-action" to="/books">חזרה לספרייה</Link></div></section>;

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
        <div className="sod29-book-overview-card"><strong>{Math.max(presentation.total, mappedMaterialTotal)}</strong><span>יחידות חומר ממופות</span></div>
        <div className="sod29-book-overview-card"><strong>{primary ? String(primary.value) : "—"}</strong><span>{primary ? coverageLabel(primary.key) : "כיסוי מבני"}</span></div>
        <div className="sod29-book-overview-card"><strong>{witnessLabel(tiers)}</strong><span>מקור / עדות</span></div>
        <div className="sod29-book-overview-card"><strong>{String(coverage.exact_witness_close_read || coverage.exact_witness || coverage.historical_witness_collation || "—")}</strong><span>מצב העדות המדויקת</span></div>
      </div>
    </section>

    <MaterialMap material={material} />

    {isBookMaterialPreview(slug) && !material?.available ? <section className="sod29-section"><div className="sod29-state warn">מפת החומר הציבורית של הפיילוט אינה זמינה כרגע. הספר עצמו נשאר קריא.</div></section> : null}

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
      {state.researchError ? <div className="sod29-state warn">שכבת המחקר הציבורית הנוספת אינה זמינה כרגע. מפת החומר שמעליה נשארת עצמאית וקריאה.</div> : null}
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
  useEffect(() => { applySeo({ title: slug ? "ספר · SOD1820" : "ספרים ומקורות · SOD1820", description: "ספרים, מקורות, עדים ומחקר ב־SOD1820", path: slug ? `/book/${slug}` : "/books" }); }, [slug]);
  return <Sod2029Shell surface="books" symbol="▤" eyebrow="BOOKS · SOURCES · WITNESSES" title={slug ? "ספר ומקור" : "ספרים ומקורות"} description="ספרייה אחת מעל זהויות ומקורות חיים. המקור אינו רק קובץ — הוא שער למחקר, לעדות ולמראה־מקום.">{slug ? <BookDetail slug={slug} /> : <LibraryView />}</Sod2029Shell>;
}
