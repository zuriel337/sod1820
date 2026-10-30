import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import CanonicalMediaFigure2029 from "../experience2029/CanonicalMediaFigure2029.jsx";
import {
  GATE_GALLERIES, GATE_PHRASES, GALLERY_PAGE_SIZE, CONNECTION_STATUS, CONNECTION_TARGETS, REVELATION_1237,
  TRUMP_NOT_ELECTORS, TRUMP_THRESHOLD_LAYERS, buildGateProjection, classifyConnections, israelElectionsNote,
  gateMethodFocus2029, gatePublicMethodRows, gateSourcePresentation, gateSourceTextSelection,
  loadGalleryPage, loadMethodCards, splitSourceTimes, verifyReviewedStatements,
} from "../../lib/research/revelation1237Gate2029.js";
import { ELECTIONS_ISRAEL_21_26_BUNDLE } from "../../lib/research/electionsIsrael21_26Seed2029.js";
import { relationStatusCopy } from "../../lib/research/worldMapViewModel2029.js";
import { bilingualDateLabel } from "../../lib/relativeTime2029.js";
import { numberExpressionFocusHref } from "../../lib/research/numberExpressionFocus.js";
import { gallerySourceHref2029 } from "../../lib/research/topicSourceContext.js";
import "./revelation1237Gate2029.css";

const clean = (value) => value == null ? "" : String(value).trim();
const fmtDate = (value) => bilingualDateLabel(value, "תאריך לא זמין");
const SPELLED = (text) => text.split("").join(" ");

const NAV = Object.freeze([
  ["rv-center", "המרכז"], ["rv-galleries", "גלריות"], ["rv-news", "אירועים"],
  ["rv-elections", "בחירות"], ["rv-posts", "פוסטים"], ["rv-connections", "חיבורים"],
]);

// ── hero ────────────────────────────────────────────────────────────────────────────────
function GateHero() {
  return <header className="rv-hero" data-rv-hero>
    <div className="rv-sky" aria-hidden="true">
      <span className="rv-light" /><span className="rv-rays" /><span className="rv-stars" />
      <svg className="rv-tree" viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" focusable="false">
        <defs>
          <linearGradient id="rv-trunk" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#0a0705" /><stop offset="1" stopColor="#6e5320" />
          </linearGradient>
        </defs>
        <g fill="none" stroke="url(#rv-trunk)" strokeLinecap="round" strokeWidth="5">
          <path d="M200 300 C198 250 202 210 200 160" />
          <path d="M200 205 C170 190 150 170 128 138" strokeWidth="3.5" /><path d="M200 190 C232 176 252 156 276 124" strokeWidth="3.5" />
          <path d="M200 165 C186 140 180 118 176 84" strokeWidth="3" /><path d="M200 160 C214 134 222 108 226 74" strokeWidth="3" />
          <path d="M128 138 C112 128 100 112 92 94" strokeWidth="2" /><path d="M276 124 C292 114 304 98 312 80" strokeWidth="2" />
          <path d="M176 84 C170 70 166 58 164 44" strokeWidth="1.6" /><path d="M226 74 C232 62 236 50 238 38" strokeWidth="1.6" />
        </g>
      </svg>
    </div>
    <div className="rv-hero-copy">
      <p className="rv-eyebrow">ציר עצמאי · התגלות מתוך הסתרה</p>
      <h2 className="rv-h">
        <span className="rv-numeral" dir="ltr" aria-label="אלף מאתיים שלושים ושבע">1,237</span>
        <span className="rv-title">התגלות</span>
      </h2>
      <p className="rv-lede">אור שמתגלה מתוך הסתרה: מספר אחד שחוזר בשיטות, בגלריות, באירועים ובמקורות. כל שכבה כאן נשארת נפרדת — מקור, דיווח, חישוב ופרשנות.</p>
      <nav className="rv-nav" aria-label="פרקי השער">
        {NAV.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
      </nav>
    </div>
  </header>;
}

// ── center: the two methods ───────────────────────────────────────────────────────────────
function MethodCard({ card, onOpenExpression, openingKey, focusError, focusErrorKey }) {
  const unavailable = card.status === "unavailable" || card.status === "failed";
  const focus = gateMethodFocus2029(card);
  const key = `rv-method-${card.id}`;
  const opening = openingKey === key;
  const canOpen = Boolean(focus && onOpenExpression);
  const activate = () => { if (canOpen && !opening) onOpenExpression(focus.row, focus.origin); };
  const triggerProps = { type: "button", className: "rv-method-trigger", disabled: !canOpen || opening,
    "aria-busy": opening || undefined, onClick: activate };
  return <article id={key} className="rv-method" data-status={card.status} aria-label={`${card.expression} בשיטת ${card.methodKey}`}>
    <p className="rv-method-role">{card.role}</p>
    <h3 className="rv-spelling" lang="he"><button {...triggerProps} aria-label={`פירוט החישוב של ${card.expression} בשיטת ${card.methodKey}`}>„{card.expression}”</button></h3>
    <p className="rv-method-name">שיטה: <strong>{card.methodLabel || card.methodKey}</strong></p>
    {unavailable
      ? <p className="rv-value rv-value-missing" role="status">{card.status === "failed" ? "קריאת המנוע נכשלה — הערך אינו ידוע כרגע." : "המנוע לא החזיר ערך בשיטה הזו."}</p>
      : <p className="rv-value"><button {...triggerProps} dir="ltr" aria-label={`פירוט התוצאה ${card.value} עבור ${card.expression} בשיטת ${card.methodKey}`}>{Number(card.value).toLocaleString("en-US")}</button>
        {card.status === "different_value" ? <small>ערך המנוע שונה מ־1,237</small> : null}</p>}
    {card.sub ? <p className="rv-muted">{card.sub}</p> : null}
    {card.plainValue != null ? <p className="rv-muted">בשיטה הרגילה: <span dir="ltr">{card.plainValue.toLocaleString("en-US")}</span> — שני ערכים נפרדים, לא אותה שיטה.</p> : null}
    {canOpen ? <p className="rv-muted">{opening ? "פותח את פירוט החישוב…" : "לחצו על הביטוי או התוצאה כדי לראות איך מחשבים."}</p> : null}
    {focusError && focusErrorKey === key ? <p className="sod29-topic-focus-error" role="status">{focusError}</p> : null}
    <details className="rv-method-details"><summary>פרטי השיטה והבדיקה</summary>
      <p>{unavailable ? "אין כרגע תוצאה זמינה בשיטה הזו. אין להסיק מכך שערכה אפס." : "התוצאה נקראה ממנוע הגימטריה. התאמת צעדי החישוב מוצגת בחלונית רק כשהם זמינים ונבדקו; אין בכך אימות של פרשנות."}</p>
      {card.definitionVersion != null ? <p>גרסת השיטה: {String(card.definitionVersion)}</p> : null}
      {card.family ? <p>משפחת החישוב ברישום: <code dir="ltr">{card.family}</code></p> : null}
      <p>קורא התוצאות: <code dir="ltr">fn_method_profile</code></p>
    </details>
  </article>;
}

function Center({ cards, ...focusProps }) {
  return <section className="rv-section rv-center" id="rv-center" aria-labelledby="rv-center-h">
    <div className="rv-section-head"><p className="rv-kicker">מרכז מספרי</p><h2 id="rv-center-h">1,237 — שתי דרכים להגיע אליו</h2></div>
    <div className="rv-numberline">
      {cards ? cards.map((card, index) => <React.Fragment key={card.id}>
        {index ? <span className="rv-equals" aria-hidden="true">=</span> : null}
        <MethodCard card={card} {...focusProps} />
      </React.Fragment>) : <p role="status">טוען מהמנוע…</p>}
    </div>
    <p className="rv-note">כשהתוצאה זמינה, אפשר לפתוח את הביטוי בשיטה המוצגת לידו ולהעמיק בחישוב. האיות נשמר כפי שהוא כתוב כאן, כולל הרווחים.</p>
  </section>;
}

// ── source card ──────────────────────────────────────────────────────────────────────────
export function SourceMethodResearch({ item, slotKey, sectionId, readProfile, onOpenExpression, openingKey, focusError, focusErrorKey }) {
  const [selection, setSelection] = useState(null);
  const [state, setState] = useState(null);
  const [limit, setLimit] = useState(8);
  const requestRef = useRef(0);
  const text = item?.intrinsic?.extraction?.text || "";
  useEffect(() => {
    requestRef.current += 1; setSelection(null); setState(null); setLimit(8);
    return () => { requestRef.current += 1; };
  }, [item.galleryImageId, item.imageUrl, text]);
  const select = (event) => {
    const next = gateSourceTextSelection(item, { start: event.currentTarget.selectionStart,
      end: event.currentTarget.selectionEnd, slotKey, sectionId });
    if (next?.origin.selectionStart === selection?.origin.selectionStart
      && next?.origin.selectionEnd === selection?.origin.selectionEnd) return;
    requestRef.current += 1; setSelection(next); setState(null); setLimit(8);
  };
  const load = async () => {
    if (!selection || !readProfile) return;
    const request = ++requestRef.current;
    setState({ status: "loading" });
    try {
      const rows = gatePublicMethodRows(await readProfile(selection.expression));
      if (request === requestRef.current) setState({ status: "ready", rows });
    } catch {
      if (request === requestRef.current) setState({ status: "failed" });
    }
  };
  const activate = async (row) => {
    const request = requestRef.current;
    const opened = await onOpenExpression?.({ text: selection.expression, method: row.methodKey, value: row.computedValue,
      sourcePath: `${item.sourceRef}#stored-ocr:${selection.origin.selectionStart}-${selection.origin.selectionEnd}` },
    { ...selection.origin, expectedMethodVersion: row.definitionVersion ?? null });
    // A failed fresh check invalidates the displayed method choices as well.
    if (opened === false && request === requestRef.current) setState(null);
  };
  return <details className="rv-source-research">
    <summary>חקירת ביטוי ושיטות מהמקור</summary>
    {text ? <>
      <p>סמנו ביטוי בתוך הטקסט השמור, בעכבר או במקלדת, ואז פתחו את השיטות שלו.</p>
      <p className="rv-muted">זהו טקסט OCR שמור, שעשוי להיות חלקי או שגוי. בחירת ביטוי לחקירה אינה אימות של מה שנכתב בתמונה.</p>
      <textarea className="rv-source-text" aria-label="טקסט שמור לבחירת ביטוי" readOnly value={text}
        disabled={openingKey === slotKey} rows={5} onSelect={select} onMouseUp={select} onKeyUp={select} />
      {selection ? <p>הביטוי שנבחר: <strong>{selection.expression}</strong></p> : null}
      <button type="button" className="rv-btn" disabled={!selection || !readProfile || state?.status === "loading"}
        onClick={load}>{state?.status === "loading" ? "טוען שיטות…" : "פתיחת שיטות לביטוי שנבחר"}</button>
      {state?.status === "failed" ? <p role="status">השיטות אינן זמינות כרגע. אפשר לנסות שוב; אין זו תוצאה ריקה.</p> : null}
      {state?.status === "ready" ? <>
        <h4>שיטות נוספות מהמנוע לבחירה</h4>
        <p className="rv-muted">תוצאות המנוע לביטוי שבחרתם, לא קביעה שהערכים האלה מופיעים במקור. אלה השיטות הציבוריות הזמינות בקריאה הזו.</p>
        {!state.rows.length ? <p role="status">לא התקבלו שיטות ציבוריות זמינות לבחירה הזו; אין להסיק שערך הביטוי אפס.</p> : null}
        <div className="rv-source-methods">{state.rows.slice(0, limit).map((row) => <button type="button" className="rv-btn" key={row.methodKey}
          disabled={!onOpenExpression || openingKey === slotKey}
          aria-label={`פתח ${selection.expression} בשיטת ${row.displayLabel || row.methodKey}: ${row.computedValue}`}
          onClick={() => activate(row)}>
          {row.displayLabel || row.methodKey} · <bdi>{row.computedValue.toLocaleString("en-US")}</bdi>
        </button>)}</div>
        {state.rows.length > limit ? <button type="button" className="rv-btn" onClick={() => setLimit((count) => count + 8)}>עוד שיטות</button> : null}
      </> : null}
      {openingKey === slotKey ? <p role="status">בודק מחדש את המקור והחישוב…</p> : null}
      {focusError && focusErrorKey === slotKey ? <p role="status">{focusError}</p> : null}
    </> : <p>אין כרגע טקסט OCR שמור לבחירה. אפשר לפתוח את התמונה המקורית; התיוגים אינם תחליף לביטוי מדויק.</p>}
  </details>;
}

function SourceCard({ item, statements = [], compact = false, slotKey, sectionId, onRememberSource, unavailableSourceIds = [], ...focusProps }) {
  if (unavailableSourceIds.includes(item.galleryImageId)) return <article id={slotKey} className="rv-source">
    <p role="status">המקור אינו זמין לתצוגה כרגע. תוכנו והנגזרות הקודמות הוסתרו; אפשר לרענן את הדף.</p>
  </article>;
  item = { ...item, occurrences: item.occurrences?.filter((entry) => !unavailableSourceIds.includes(entry.legacyPlacement?.galleryImageId)) };
  const times = splitSourceTimes(item);
  const source = gateSourcePresentation(item);
  const placement = item.legacyPlacement || {};
  // `source` is storage provenance (e.g. a migration tag), not a credit to the creator.
  const credit = ["author", "publication"].map((key) => clean(placement.originalCredit?.[key])).filter(Boolean);
  const caption = clean(placement.originalCaption || item.description);
  const galleries = (item.occurrences || []).map((entry) => entry.legacyPlacement).filter((p) => p?.wpGalleryId != null);
  return <article id={slotKey} className="rv-source" data-source-kind={source.imageType || "unknown"} data-gallery-image-id={item.galleryImageId || undefined}>
    <CanonicalMediaFigure2029 item={item} alt={item.label} thumbnail className="rv-source-figure" />
    <div className="rv-source-body">
      <p className="rv-kicker">{source.kindLabel}</p>
      <h3>{clean(placement.originalName) || item.label}</h3>
      {statements.map((statement) => <p key={statement.id} className="rv-statement"><span className="rv-chip" data-status="source_statement">נאמר במקור</span> הניסוח מצוטט בכיתוב המקור; אין זה קשר עץ.</p>)}
      {caption ? (compact || caption.length < 220
        ? <p className="rv-caption">{caption}</p>
        : <details className="rv-caption"><summary>{caption.slice(0, 200)}…</summary><p>{caption}</p></details>) : null}
      <details className="rv-source-history"><summary>היסטוריית המקור והתיארוך</summary>
        <p className="rv-muted">אלה פרטי מקור ומיקום שמורים, לא תאריכי אירוע מאומתים.</p>
        {source.history.map((p) => {
          const stored = p.occurredAt, derived = p.dateProvenance?.occurredAt?.derivedFrom;
          return <div key={p.galleryImageId}>
            <p>{p.wpGalleryId != null ? `גלריה ${p.wpGalleryId}` : "מיקום מקור"}{p.ordering != null ? ` · מקום ${p.ordering}` : ""}</p>
            {p.originalName ? <p>{p.originalName}</p> : null}
            {p.originalCaption && p.galleryImageId !== item.galleryImageId ? <p>{p.originalCaption}</p> : null}
            {stored ? <p>{derived === "path" && /^\d{4}-\d{2}/.test(stored)
              ? <>תיקיית מקור: <bdi>{stored.slice(0, 7)}</bdi> · תיארוך לפי נתיב הקובץ; יום האירוע אינו ידוע.</>
              : <>תאריך שמור: {fmtDate(stored)} · {derived === "name" ? "נגזר משם הפריט או מעדכון המקור, לא תאריך אירוע מאומת." : "מקור התיארוך לא אומת."}</>}</p> : null}
            {p.createdAt ? <p>נקלט בארכיון: {fmtDate(p.createdAt)}</p> : null}
          </div>;
        })}
        {!source.history.length && times.archivedAt ? <p>נקלט בארכיון: {fmtDate(times.archivedAt)}</p> : null}
      </details>
      {source.numbers.length ? <details><summary>מספרים שסומנו במקור ({source.numbers.length})</summary>
        <p className="rv-muted">תיוגים שמורים לצורך ניווט, לא שיוך מאומת לביטוי או לשיטה. הקישורים מיועדים לדף המספר הכללי, בהתאם לזמינותו ולהרשאות.</p>
        <div className="rv-source-methods">{source.numbers.map((value) => <Link className="rv-link" key={value} to={numberExpressionFocusHref(value)}
          onClick={(event) => { if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey)
            onRememberSource?.(item, slotKey, sectionId); }}
          state={{ returnTo: `/topic/1237#${slotKey}`, sourceRef: item.sourceRef }}><bdi>{value}</bdi> ←</Link>)}</div>
      </details> : null}
      <SourceMethodResearch item={item} slotKey={slotKey} sectionId={sectionId} {...focusProps} />
      {credit.length ? <p className="rv-credit">קרדיט: {credit.join(" · ")}</p> : null}
      {galleries.length ? <p className="rv-muted">מופיע ב־{galleries.length} {galleries.length === 1 ? "מיקום" : "מיקומים"}:{" "}
        {galleries.map((p, i) => <React.Fragment key={p.galleryImageId}>{i ? " · " : ""}<bdi>גלריה {p.wpGalleryId}{p.ordering != null ? `, מקום ${p.ordering}` : ""}</bdi></React.Fragment>)}</p> : null}
      {galleries.map((p) => { const href = gallerySourceHref2029(p.wpGalleryId, p.galleryImageId); return href ? <Link
        key={p.galleryImageId} className="rv-link" to={href}
        onClick={() => onRememberSource?.(item, slotKey, sectionId)}>לתמונה בגלריה {p.wpGalleryId} ←</Link> : null; })}
    </div>
  </article>;
}

// ── galleries ────────────────────────────────────────────────────────────────────────────
function GalleryColumn({ spec, state, onMore, ...focusProps }) {
  const items = state?.items || [];
  return <article className="rv-gallery" aria-labelledby={`rv-gal-${spec.wpGalleryId}`}>
    <header>
      <p className="rv-kicker">גלריית מחקר {spec.wpGalleryId}</p>
      <h3 id={`rv-gal-${spec.wpGalleryId}`}>{spec.title}</h3>
      {state?.totalListed != null ? <p className="rv-muted">{state.totalListed} תמונות ברשימת הגלריה · מוצגות לפי הסדר השמור בגלריה, לא לפי ערך או חשיבות.</p> : null}
    </header>
    {!state || (state.loading && !items.length) ? <p role="status">פותח את הגלריה…</p> : null}
    {state?.error ? <p role="status">הגלריה אינה זמינה כרגע. אין זה אומר שהיא ריקה.</p> : null}
    {state?.withheld ? <p className="rv-muted">{state.withheld} פריטים לא הוצגו כי אינם עומדים בתנאי הפרסום הציבורי הנוכחיים.</p> : null}
    <div className="rv-gallery-list">{items.map((item) => <SourceCard key={item.galleryImageId} item={item} compact
      slotKey={`rv-source-gallery-${spec.wpGalleryId}-${item.galleryImageId}`} sectionId="rv-galleries" {...focusProps} />)}</div>
    {state?.hasMore || state?.error ? <button type="button" className="rv-btn" disabled={state.loading} aria-busy={state.loading || undefined} onClick={onMore}>{state.loading ? "טוען…" : state.error ? "נסה שוב את הגלריה" : "עוד מהגלריה"}</button> : null}
    <Link className="rv-link" to={gallerySourceHref2029(spec.wpGalleryId)}>פתיחת הגלריה ב־2029 ←</Link>
  </article>;
}

// ── connections ──────────────────────────────────────────────────────────────────────────
function Connections({ connections, relationState, onOpen, canOpen }) {
  return <section className="rv-section" id="rv-connections" aria-labelledby="rv-conn-h">
    <div className="rv-section-head"><p className="rv-kicker">חיבורים</p><h2 id="rv-conn-h">איך 1,237 נפגש עם נושאים אחרים</h2></div>
    <ul className="rv-legend" aria-label="מקרא סוגי חיבור">
      {Object.entries(CONNECTION_STATUS).map(([key, value]) => <li key={key}><span className="rv-chip" data-status={key}>{value.label}</span> {value.detail}</li>)}
    </ul>
    <div className="rv-conn-grid">
      {connections.map((row) => <article key={row.id} className="rv-conn" data-status={row.status} data-sensitive={row.sensitive || undefined}>
        <span className="rv-chip" data-status={row.status}>{CONNECTION_STATUS[row.status].label}</span>
        <h3>{row.title}</h3>
        <p>{row.note}</p>
        {row.status === "shared_source" && row.evidence?.href ? <Link className="rv-link" to={row.evidence.href}>לקריאת ההקשר במקור המשותף ←</Link> : null}
        {row.status !== "tree" ? <Link className="rv-link" to={`/topic/${encodeURIComponent(row.slug)}`}>לטופיק הקיים ←</Link> : null}
        {row.sensitive ? <p className="rv-sensitive">תוכן רגיש: אין תמונות או מספרים מודגשים בכרטיס הזה.</p> : null}
      </article>)}
    </div>
    <div className="rv-tree-open">
      <h3>קשרי עץ מתועדים</h3>
      <p>קשר עץ מוצג רק עם edgeRef או החלטה ממשלית. הוא נפתח לפי בקשה מהעץ הקיים; שום קשר לא נוצר או מופעל כאן.</p>
      {canOpen && (!relationState || relationState.status === "idle") ? <button type="button" className="rv-btn" onClick={onOpen}>פתיחת קשרי העץ של הציר</button> : null}
      {!canOpen ? <p role="status">{relationStatusCopy("unavailable")}</p> : null}
      {relationState?.status === "failed" || relationState?.status === "partial" ? <button type="button" className="rv-btn" onClick={onOpen}>נסו שוב</button> : null}
      {relationState ? <p role="status" data-relation-status={relationState.status}>{relationStatusCopy(relationState.status, relationState.relations?.length || 0)}</p> : null}
      {relationState?.relations?.length ? <ul className="rv-edges">{relationState.relations.map((row) => <li key={row.edgeRef}>
        {row.fromLabel || row.fromNodeId} · {row.relationType} · {row.toLabel || row.toNodeId} <code dir="ltr">{row.edgeRef}</code></li>)}</ul> : null}
    </div>
  </section>;
}

// ── gate ─────────────────────────────────────────────────────────────────────────────────
/**
 * @param {object} props
 * @param {object} props.readers  injected existing readers (see revelation1237Gate2029.js)
 * Topic sources are read here through the existing fetchTopicSourceContext (the Topic page does not load
 * them for an inactive Topic node).
 * @param {Array} props.relatedPosts  posts already admitted by the Topic projection
 */
export default function Revelation1237Gate2029({ readers, relatedPosts = [], onProjection = null,
  onOpenExpression = null, onRememberSource = null, unavailableSourceIds = [], openingKey = null, focusError = null, focusErrorKey = null }) {
  const location = useLocation();
  const restoredSourceRef = useRef(null);
  const [cards, setCards] = useState(null);
  const [galleries, setGalleries] = useState({});
  const [relationState, setRelationState] = useState(null);
  const [topic, setTopic] = useState({ status: "loading", context: null });
  const galleryEpoch = useRef(0);
  const pendingGalleries = useRef(new Set());

  useEffect(() => {
    let alive = true;
    readers.fetchTopicSourceContext({ topicSlug: REVELATION_1237.topicSlug })
      .then((context) => alive && setTopic(context ? { status: "ok", context } : { status: "unavailable", context: null }))
      .catch(() => alive && setTopic({ status: "failed", context: null }));
    return () => { alive = false; };
  }, [readers]);
  const sourceContext = topic.context;
  const topicNodeId = sourceContext?.topicNodeId || null;

  // The source cards arrive asynchronously. Restore only an exact rendered card
  // on navigation, once per location key; never infer a missing source or alter history.
  useEffect(() => {
    if (!/^#rv-source-[a-zA-Z0-9_-]+$/.test(location.hash)) return undefined;
    const key = `${location.key}:${location.hash}`;
    if (restoredSourceRef.current === key) return undefined;
    // A gallery above the target can still change the page height. Wait for the
    // bounded initial windows, not merely the target's first DOM appearance.
    if (!cards || topic.status === "loading"
      || GATE_GALLERIES.some((spec) => !galleries[spec.wpGalleryId] || galleries[spec.wpGalleryId].loading)) return undefined;
    const target = document.getElementById(location.hash.slice(1));
    if (!target) return undefined;
    const frame = requestAnimationFrame(() => {
      target.scrollIntoView({ block: "start" }); restoredSourceRef.current = key;
    });
    return () => cancelAnimationFrame(frame);
  }, [location.hash, location.key, galleries, sourceContext, cards, topic.status]);

  useEffect(() => {
    let alive = true;
    loadMethodCards({ fetchMethodProfile: readers.fetchMethodProfile }).then((next) => alive && setCards(next));
    return () => { alive = false; };
  }, [readers]);

  const openGallery = useCallback(async (spec, offset = 0, epoch = galleryEpoch.current) => {
    const requestKey = `${epoch}:${spec.wpGalleryId}`;
    if (pendingGalleries.current.has(requestKey)) return;
    pendingGalleries.current.add(requestKey);
    setGalleries((prev) => ({ ...prev, [spec.wpGalleryId]: { ...prev[spec.wpGalleryId], loading: true, error: false } }));
    try {
      const page = await loadGalleryPage({ wpGalleryId: spec.wpGalleryId, listGalleryImages: readers.listGalleryImages,
        fetchSourceContext: readers.fetchGallerySourceContext, offset, limit: GALLERY_PAGE_SIZE });
      if (epoch !== galleryEpoch.current) return;
      setGalleries((prev) => ({ ...prev, [spec.wpGalleryId]: {
        ...page, loading: false, error: false,
        withheld: (offset ? prev[spec.wpGalleryId]?.withheld || 0 : 0) + page.withheld,
        items: [...new Map([...(offset ? prev[spec.wpGalleryId]?.items || [] : []), ...page.items]
          .map((item) => [item.galleryImageId, item])).values()] } }));
    } catch {
      if (epoch === galleryEpoch.current) setGalleries((prev) => ({ ...prev, [spec.wpGalleryId]: { ...(prev[spec.wpGalleryId] || {}), loading: false, error: true } }));
    } finally {
      pendingGalleries.current = new Set([...pendingGalleries.current].filter((key) => key !== requestKey));
    }
  }, [readers]);
  useEffect(() => {
    const epoch = ++galleryEpoch.current;
    setGalleries({});
    GATE_GALLERIES.forEach((spec) => { openGallery(spec, 0, epoch); });
    return () => { galleryEpoch.current += 1; };
  }, [openGallery]);

  const items = sourceContext?.items || [];
  const statements = useMemo(() => verifyReviewedStatements(items), [items]);
  const connections = useMemo(() => classifyConnections({ context: sourceContext, statements, treeRelations: [] }), [sourceContext, statements]);
  const coronaIds = new Set(statements.filter((row) => row.connection === "corona").map((row) => row.galleryImageId));
  const coronaItems = items.filter((item) => coronaIds.has(item.galleryImageId));
  const otherItems = items.filter((item) => !coronaIds.has(item.galleryImageId));
  const statementsFor = (item) => statements.filter((row) => row.galleryImageId === item.galleryImageId);
  const indiaLink = (sourceContext?.links?.topics || []).find((row) => row.slug === "india-axis") || null;
  const israel = israelElectionsNote(ELECTIONS_ISRAEL_21_26_BUNDLE);

  const projection = useMemo(() => buildGateProjection({ sourceItems: [...items, ...Object.values(galleries).flatMap((g) => g.items || [])] }),
    [items, galleries]);
  useEffect(() => { onProjection?.(projection); }, [projection, onProjection]);

  const openRelations = useCallback(async () => {
    if (!topicNodeId || !readers.openRelations) return;
    setRelationState({ status: "loading", relations: [] });
    try {
      const result = await readers.openRelations({ nodeId: topicNodeId });
      setRelationState({ status: result.status, relations: result.relations || [] });
    } catch {
      setRelationState({ status: "failed", relations: [] });
    }
  }, [topicNodeId, readers]);

  const sourceFocusProps = { readProfile: readers.fetchMethodProfile, onOpenExpression, onRememberSource, unavailableSourceIds, openingKey, focusError, focusErrorKey };
  return <article className="rv" data-topic-slug={REVELATION_1237.topicSlug} data-entity-type="convergence">
    <GateHero />
    <Center cards={cards} onOpenExpression={onOpenExpression} openingKey={openingKey} focusError={focusError} focusErrorKey={focusErrorKey} />

    <section className="rv-section" id="rv-galleries" aria-labelledby="rv-gal-h">
      <div className="rv-section-head"><p className="rv-kicker">גלריות המחקר</p><h2 id="rv-gal-h">המקורות המצולמים</h2></div>
      <p className="rv-note">כל תמונה נקראת מחדש דרך הקורא הציבורי בכל פתיחה. תמונה שאינה עומדת בתנאי הפרסום לא תוצג. הכיתובים, המיקומים והקרדיטים נשמרים כלשונם.</p>
      <div className="rv-gallery-pair">
        {GATE_GALLERIES.map((spec) => <GalleryColumn key={spec.wpGalleryId} spec={spec} state={galleries[spec.wpGalleryId]}
          onMore={() => openGallery(spec, galleries[spec.wpGalleryId]?.nextOffset || 0)} {...sourceFocusProps} />)}
      </div>
    </section>

    <section className="rv-section" id="rv-news" aria-labelledby="rv-news-h">
      <div className="rv-section-head"><p className="rv-kicker">חדשות ואירועים</p><h2 id="rv-news-h">מה קרה, ומתי דווח</h2></div>
      <p className="rv-note">זמן הדיווח נשמר בנפרד מהתוצאה הסופית: דיווח הוא תמונת מצב של רגע מסוים, לא תוצאה.</p>
      {topic.status === "loading" ? <p role="status">טוען את מקורות הציר…</p> : null}
      {topic.status === "failed" ? <p role="status">קריאת מקורות הציר נכשלה. אין זה אומר שאין מקורות.</p> : null}
      {topic.status === "unavailable" ? <p role="status">הטופיק אינו מאושר לתצוגה ציבורית כרגע, ולכן מקורותיו אינם מוצגים.</p> : null}
      {coronaItems.length ? <>
        <h3 className="rv-sub">קורונה</h3>
        <div className="rv-source-grid">{coronaItems.map((item) => <SourceCard key={item.galleryImageId} item={item} statements={statementsFor(item)}
          slotKey={`rv-source-news-${item.galleryImageId}`} sectionId="rv-news" {...sourceFocusProps} />)}</div>
      </> : null}
      {indiaLink ? <div className="rv-india">
        <h3 className="rv-sub">הודו</h3>
        <p>{indiaLink.note}</p>
        <Link className="rv-link" to={indiaLink.href}>פתיחת המקור המשותף בציר ההודי ←</Link>
      </div> : null}
      {otherItems.length ? <>
        <h3 className="rv-sub">מקורות נוספים בציר</h3>
        <div className="rv-source-grid">{otherItems.map((item) => <SourceCard key={item.galleryImageId} item={item} statements={statementsFor(item)}
          slotKey={`rv-source-other-${item.galleryImageId}`} sectionId="rv-news" {...sourceFocusProps} />)}</div>
      </> : null}
    </section>

    <section className="rv-section" id="rv-elections" aria-labelledby="rv-elec-h">
      <div className="rv-section-head"><p className="rv-kicker">בחירות</p><h2 id="rv-elec-h">ישראל וארצות הברית</h2></div>
      <div className="rv-elections">
        <article className="rv-card">
          <h3>ארצות הברית · טראמפ</h3>
          <p className="rv-warning"><strong>סף צירי הוועידה, לא אלקטורים.</strong> {TRUMP_NOT_ELECTORS}</p>
          <ol className="rv-layers">
            {Object.values(TRUMP_THRESHOLD_LAYERS).map((layer) => <li key={layer.key} data-layer={layer.key}>
              <h4>{layer.title}</h4><p>{layer.text}</p>{layer.state ? <small>{layer.state}</small> : null}</li>)}
          </ol>
          <Link className="rv-link" to="/topic/trump">לטופיק „דונלד טראמפ” ←</Link>
        </article>
        <article className="rv-card">
          <h3>ישראל</h3>
          <p>1,237 אינו נושא־משנה של הבחירות. הוא מופיע בהן כטענת מקור אחד, ונשאר שכבת פרשנות נפרדת.</p>
          {israel ? <blockquote className="rv-quote" data-layer="interpretation"><h4>פרשנות</h4>{israel.text}
            {israel.governanceState === "human_gate_pending" ? <small className="rv-muted"> · ממתין להחלטת השער האנושי</small> : null}</blockquote>
            : <p role="status">ניסוח המקור אינו זמין כרגע.</p>}
          <Link className="rv-link" to="/world#world-elections-content">לחתך הבחירות בעולם ←</Link>
        </article>
      </div>
    </section>

    <section className="rv-section" id="rv-posts" aria-labelledby="rv-posts-h">
      <div className="rv-section-head"><p className="rv-kicker">פוסטים, סדרות וקרדיטים</p><h2 id="rv-posts-h">הסיפורים שמאחורי המספר</h2></div>
      {relatedPosts.length
        ? <div className="rv-posts">{relatedPosts.map((row, index) => {
          const slug = clean(row.slug);
          return slug ? <Link key={row.sourcePath || `${slug}-${index}`} className="rv-card rv-post" to={row.href || `/post/${encodeURIComponent(slug)}`}>
            <p className="rv-kicker">פוסט</p><h3>{clean(row.title || row.text) || "פוסט קשור"}</h3>{row.note ? <p>{row.note}</p> : null}</Link> : null;
        })}</div>
        : <p className="rv-note" role="status">אין כרגע פוסטים שנקשרו לציר דרך מקור מתועד. הקרדיטים של כל מקור מופיעים בכרטיס שלו, כפי שנכתבו.</p>}
    </section>

    <Connections connections={connections} relationState={relationState} onOpen={openRelations}
      canOpen={Boolean(topicNodeId && readers.openRelations)} />
  </article>;
}
