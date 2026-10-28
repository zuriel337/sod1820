import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CanonicalMediaFigure2029 from "../experience2029/CanonicalMediaFigure2029.jsx";
import {
  GATE_GALLERIES, GATE_PHRASES, GALLERY_PAGE_SIZE, CONNECTION_STATUS, CONNECTION_TARGETS, REVELATION_1237,
  TRUMP_NOT_ELECTORS, TRUMP_THRESHOLD_LAYERS, buildGateProjection, classifyConnections, israelElectionsNote,
  loadGalleryPage, loadMethodCards, splitSourceTimes, verifyReviewedStatements,
} from "../../lib/research/revelation1237Gate2029.js";
import { ELECTIONS_ISRAEL_21_26_BUNDLE } from "../../lib/research/electionsIsrael21_26Seed2029.js";
import { relationStatusCopy } from "../../lib/research/worldMapViewModel2029.js";
import "./revelation1237Gate2029.css";

const clean = (value) => value == null ? "" : String(value).trim();
const fmtDate = (value) => {
  const text = clean(value);
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10).split("-").reverse().join(".") : text;
};
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
function MethodCard({ card }) {
  const unavailable = card.status === "unavailable" || card.status === "failed";
  return <article className="rv-method" data-status={card.status} aria-label={`${card.expression} בשיטת ${card.methodKey}`}>
    <p className="rv-method-role">{card.role}</p>
    <h3 className="rv-spelling" lang="he">„{card.expression}”</h3>
    <p className="rv-method-name">שיטה: <strong>{card.methodKey}</strong>{card.family ? <span className="rv-muted"> · {card.family}</span> : null}</p>
    {unavailable
      ? <p className="rv-value rv-value-missing" role="status">{card.status === "failed" ? "קריאת המנוע נכשלה — הערך אינו ידוע כרגע." : "המנוע לא החזיר ערך בשיטה הזו."}</p>
      : <p className="rv-value"><span dir="ltr">{Number(card.value).toLocaleString("en-US")}</span>
        {card.status === "confirmed" ? <small>אומת מול מנוע הגימטריה</small> : <small>ערך המנוע שונה מ־1,237</small>}</p>}
    {card.sub ? <p className="rv-muted">{card.sub}</p> : null}
    {card.plainValue != null ? <p className="rv-muted">בשיטה הרגילה: <span dir="ltr">{card.plainValue.toLocaleString("en-US")}</span> — שני ערכים נפרדים, לא אותה שיטה.</p> : null}
  </article>;
}

function Center({ cards }) {
  return <section className="rv-section rv-center" id="rv-center" aria-labelledby="rv-center-h">
    <div className="rv-section-head"><p className="rv-kicker">מרכז מספרי</p><h2 id="rv-center-h">1,237 — שתי דרכים להגיע אליו</h2></div>
    <div className="rv-numberline">
      {cards ? cards.map((card, index) => <React.Fragment key={card.id}>
        {index ? <span className="rv-equals" aria-hidden="true">=</span> : null}
        <MethodCard card={card} />
      </React.Fragment>) : <p role="status">טוען מהמנוע…</p>}
    </div>
    <p className="rv-note">הערכים מגיעים ממנוע הגימטריה הרשום (<code dir="ltr">fn_method_profile</code>) ולא מחושבים בדפדפן. האיות נבדק כפי שהוא כתוב כאן, כולל הרווחים.</p>
  </section>;
}

// ── source card ──────────────────────────────────────────────────────────────────────────
function SourceCard({ item, statements = [], compact = false }) {
  const times = splitSourceTimes(item);
  const placement = item.legacyPlacement || {};
  // `source` is storage provenance (e.g. a migration tag), not a credit to the creator.
  const credit = ["author", "publication"].map((key) => clean(placement.originalCredit?.[key])).filter(Boolean);
  const caption = clean(placement.originalCaption || item.description);
  const galleries = (item.occurrences || []).map((entry) => entry.legacyPlacement).filter((p) => p?.wpGalleryId != null);
  return <article className="rv-source" data-gallery-image-id={item.galleryImageId || undefined}>
    <CanonicalMediaFigure2029 item={item} alt={item.label} thumbnail className="rv-source-figure" />
    <div className="rv-source-body">
      <p className="rv-kicker">מקור</p>
      <h3>{clean(placement.originalName) || item.label}</h3>
      {statements.map((statement) => <p key={statement.id} className="rv-statement"><span className="rv-chip" data-status="source_statement">נאמר במקור</span> הניסוח מצוטט בכיתוב המקור; אין זה קשר עץ.</p>)}
      {caption ? (compact || caption.length < 220
        ? <p className="rv-caption">{caption}</p>
        : <details className="rv-caption"><summary>{caption.slice(0, 200)}…</summary><p>{caption}</p></details>) : null}
      <dl className="rv-times">
        <div><dt>זמן האירוע</dt><dd>{times.occurredAt ? fmtDate(times.occurredAt) : "לא נקבע במקור"}</dd></div>
        <div><dt>זמן הדיווח</dt><dd>כפי שנכתב בכותרת המקור (למעלה)</dd></div>
        <div><dt>תוצאה סופית</dt><dd>לא נטענת כאן</dd></div>
        <div><dt>נקלט בארכיון</dt><dd>{times.archivedAt ? fmtDate(times.archivedAt) : "—"} <span className="rv-muted">(אינו זמן האירוע)</span></dd></div>
      </dl>
      {credit.length ? <p className="rv-credit">קרדיט: {credit.join(" · ")}</p> : null}
      {galleries.length ? <p className="rv-muted">מופיע ב־{galleries.length} {galleries.length === 1 ? "מיקום" : "מיקומים"}:{" "}
        {galleries.map((p, i) => <React.Fragment key={p.galleryImageId}>{i ? " · " : ""}<bdi>גלריה {p.wpGalleryId}{p.ordering != null ? `, מקום ${p.ordering}` : ""}</bdi></React.Fragment>)}</p> : null}
    </div>
  </article>;
}

// ── galleries ────────────────────────────────────────────────────────────────────────────
function GalleryColumn({ spec, state, onMore }) {
  const items = state?.items || [];
  return <article className="rv-gallery" aria-labelledby={`rv-gal-${spec.wpGalleryId}`}>
    <header>
      <p className="rv-kicker">גלריית מחקר {spec.wpGalleryId}</p>
      <h3 id={`rv-gal-${spec.wpGalleryId}`}>{spec.title}</h3>
      {state?.totalListed != null ? <p className="rv-muted">{state.totalListed} תמונות ברשימת הגלריה · מוצגות לפי הסדר השמור בגלריה, לא לפי ערך או חשיבות.</p> : null}
    </header>
    {!state ? <p role="status">פותח את הגלריה…</p> : null}
    {state?.error ? <p role="status">הגלריה אינה זמינה כרגע. אין זה אומר שהיא ריקה.</p> : null}
    {state?.withheld ? <p className="rv-muted">{state.withheld} פריטים לא הוצגו כי אינם עומדים בתנאי הפרסום הציבורי הנוכחיים.</p> : null}
    <div className="rv-gallery-list">{items.map((item) => <SourceCard key={item.galleryImageId} item={item} compact />)}</div>
    {state?.hasMore ? <button type="button" className="rv-btn" onClick={onMore}>עוד מהגלריה</button> : null}
    <Link className="rv-link" to={`/archive?tab=galleries&gal=${spec.wpGalleryId}`}>פתיחת הגלריה בארכיון ←</Link>
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
export default function Revelation1237Gate2029({ readers, relatedPosts = [], onProjection = null }) {
  const [cards, setCards] = useState(null);
  const [galleries, setGalleries] = useState({});
  const [relationState, setRelationState] = useState(null);
  const [topic, setTopic] = useState({ status: "loading", context: null });

  useEffect(() => {
    let alive = true;
    readers.fetchTopicSourceContext({ topicSlug: REVELATION_1237.topicSlug })
      .then((context) => alive && setTopic(context ? { status: "ok", context } : { status: "unavailable", context: null }))
      .catch(() => alive && setTopic({ status: "failed", context: null }));
    return () => { alive = false; };
  }, [readers]);
  const sourceContext = topic.context;
  const topicNodeId = sourceContext?.topicNodeId || null;

  useEffect(() => {
    let alive = true;
    loadMethodCards({ fetchMethodProfile: readers.fetchMethodProfile }).then((next) => alive && setCards(next));
    return () => { alive = false; };
  }, [readers]);

  const openGallery = useCallback(async (spec, offset = 0) => {
    try {
      const page = await loadGalleryPage({ wpGalleryId: spec.wpGalleryId, listGalleryImages: readers.listGalleryImages,
        fetchSourceContext: readers.fetchGallerySourceContext, offset, limit: GALLERY_PAGE_SIZE });
      setGalleries((prev) => ({ ...prev, [spec.wpGalleryId]: {
        ...page, items: offset ? [...(prev[spec.wpGalleryId]?.items || []), ...page.items] : page.items } }));
    } catch {
      setGalleries((prev) => ({ ...prev, [spec.wpGalleryId]: { ...(prev[spec.wpGalleryId] || {}), error: true } }));
    }
  }, [readers]);
  useEffect(() => { GATE_GALLERIES.forEach((spec) => { openGallery(spec, 0); }); }, [openGallery]);

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

  return <article className="rv" data-topic-slug={REVELATION_1237.topicSlug} data-entity-type="convergence">
    <GateHero />
    <Center cards={cards} />

    <section className="rv-section" id="rv-galleries" aria-labelledby="rv-gal-h">
      <div className="rv-section-head"><p className="rv-kicker">גלריות המחקר</p><h2 id="rv-gal-h">המקורות המצולמים</h2></div>
      <p className="rv-note">כל תמונה נקראת מחדש דרך הקורא הציבורי בכל פתיחה. תמונה שאינה עומדת בתנאי הפרסום לא תוצג. הכיתובים, המיקומים והקרדיטים נשמרים כלשונם.</p>
      <div className="rv-gallery-pair">
        {GATE_GALLERIES.map((spec) => <GalleryColumn key={spec.wpGalleryId} spec={spec} state={galleries[spec.wpGalleryId]}
          onMore={() => openGallery(spec, galleries[spec.wpGalleryId]?.items?.length || 0)} />)}
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
        <div className="rv-source-grid">{coronaItems.map((item) => <SourceCard key={item.galleryImageId} item={item} statements={statementsFor(item)} />)}</div>
      </> : null}
      {indiaLink ? <div className="rv-india">
        <h3 className="rv-sub">הודו</h3>
        <p>{indiaLink.note}</p>
        <Link className="rv-link" to={indiaLink.href}>פתיחת המקור המשותף בציר ההודי ←</Link>
      </div> : null}
      {otherItems.length ? <>
        <h3 className="rv-sub">מקורות נוספים בציר</h3>
        <div className="rv-source-grid">{otherItems.map((item) => <SourceCard key={item.galleryImageId} item={item} statements={statementsFor(item)} />)}</div>
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
