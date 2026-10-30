import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Sod2029Shell, { FrameState } from "../components/experience2029/Sod2029Shell.jsx";
import CanonicalMediaImage2029 from "../components/experience2029/CanonicalMediaImage2029.jsx";
import { SourceMethodResearch } from "../components/research/Revelation1237Gate2029.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { getImagesByGallery } from "../lib/supabase.js";
import { fetchGallerySourceContext } from "../lib/research/entityHubProjection.js";
import { fetchNumberMethodProfile } from "../lib/research/numberCoreProjection.js";
import { resolveTopicExpressionFocus2029 } from "../lib/research/topicExpressionFocus2029.js";
import { numberExpressionFocusHref } from "../lib/research/numberExpressionFocus.js";
import { gatePublicMethodRows, gateSourcePresentation, gateSourceSelectionIsCurrent } from "../lib/research/revelation1237Gate2029.js";
import { gallerySourceHref2029, galleryOccurrenceItem, loadPublicGallerySourceWindow, resolvePublicGallerySelection } from "../lib/research/topicSourceContext.js";
import { bilingualDateLabel } from "../lib/relativeTime2029.js";
import { publicMediaCaption, publicMediaTitle } from "../lib/presentation/contentTitle.js";
import { canonicalMediaPublicLabel } from "../lib/presentation/canonicalPresentation.js";
import "./gallery2029.css";

const readWindow = (options) => loadPublicGallerySourceWindow({ ...options,
  listGalleryImages: getImagesByGallery, fetchSourceContext: fetchGallerySourceContext });
const ordinaryClick = (event) => !event.defaultPrevented && event.button === 0
  && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
const readingLabel = (item) => canonicalMediaPublicLabel({
  title: publicMediaTitle(item?.legacyPlacement?.originalName),
  description: publicMediaCaption(item?.legacyPlacement?.originalCaption),
}, { fallback: "תמונה מהגלריה" });

function GalleryImageCard({ item, index, selected, opening, error, onRemember, onOpenExpression, onSelect }) {
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const p = item.legacyPlacement;
  const source = gateSourcePresentation(item);
  const slotKey = `gallery-source-${item.galleryImageId}`;
  const title = publicMediaTitle(p.originalName);
  const caption = publicMediaCaption(p.originalCaption);
  const kind = p.imageType === "gematria" ? "גימטריה" : p.imageType === "hint" ? "רמזים בתמונה"
    : p.imageType === "event" ? "מן החדשות" : "מהגלריה";
  const numberLink = (number) => <Link key={number} className="g29-number" to={numberExpressionFocusHref(number)}
    onClick={(event) => { if (ordinaryClick(event)) onRemember(item); }} aria-label={`לדף המספר ${number}`}><bdi>{number.toLocaleString("en-US")}</bdi>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d="m3 9 6-6M3 3h6v6" /></svg></Link>;
  return <section id={slotKey} tabIndex={-1} className="g29-exhibit" data-gallery-image-id={item.galleryImageId}
    data-gallery-selected={selected ? item.galleryImageId : undefined} aria-label={title || `תמונה ${index + 1}`}>
    <a className="g29-canvas" href={item.imageUrl} target="_blank" rel="noreferrer" aria-label={`הגדלת התמונה: ${title || "תמונה מהגלריה"}`}>
      <CanonicalMediaImage2029 item={item} primary loading={index < 2 ? "eager" : "lazy"} alt={title || "תמונה מהגלריה"} />
    </a>
    <div className="g29-placard">
      <div className="g29-card-heading"><span className="g29-kind">{kind}</span><span className="g29-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span></div>
      {title ? <h3>{title}</h3> : null}
      {caption ? <><p className={`g29-caption${captionExpanded ? " is-expanded" : ""}`}>{caption}</p>
        {caption.length > 170 ? <button className="g29-text-button" type="button" aria-expanded={captionExpanded}
          onClick={() => setCaptionExpanded((value) => !value)}>{captionExpanded ? "פחות טקסט" : "להמשך הקריאה"}</button> : null}</> : null}
      {source.numbers.length ? <div className="g29-number-row" aria-label="המספרים שסומנו לתמונה">
        <span className="g29-number-label">המספרים שסומנו</span><div className="g29-tags">{source.numbers.slice(0, 3).map(numberLink)}</div>
        {source.numbers.length > 3 ? <details className="g29-more-numbers"><summary>עוד {source.numbers.length - 3} מספרים</summary><div className="g29-tags">{source.numbers.slice(3).map(numberLink)}</div></details> : null}
      </div> : null}
      <details className="g29-depth" onToggle={(event) => { if (event.currentTarget.open) onSelect(item); }}>
        <summary><span>לגלות עוד</span><svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d="m9 3-6 6M3 3v6h6" /></svg></summary>
        <div className="g29-depth-body">
          {source.numbers.length ? <p className="g29-note">המספרים הם תיוגים שמורים של התמונה. אפשר לעיין בהם; הם אינם אישור לחישוב או לחיבור.</p> : null}
          <div className="rv"><SourceMethodResearch item={item} slotKey={slotKey} sectionId={slotKey} publicCopy
            readProfile={fetchNumberMethodProfile} onOpenExpression={(row, origin) => onOpenExpression(item, row, origin)}
            openingKey={opening} focusError={error?.key === slotKey ? error.message : null} focusErrorKey={slotKey} /></div>
          <details className="g29-source-details"><summary>המקור והסיפור שמאחורי התמונה</summary>
            <p className="g29-note">כאן שמורים הכיתובים, הקרדיטים והמקומות שבהם התמונה הופיעה. הופעות חוזרות אינן מקורות עצמאיים.</p>
            {source.history.map((placement) => <section key={placement.galleryImageId} className="g29-history">
              <h4>{placement.galleryName || "מיקום נוסף בגלריה"}</h4>
              {placement.originalName ? <p>{publicMediaCaption(placement.originalName)}</p> : null}
              {placement.originalCaption ? <p className="g29-original-caption">{publicMediaCaption(placement.originalCaption)}</p> : null}
              {(publicMediaCaption(placement.originalName) !== (placement.originalName || "")
                || publicMediaCaption(placement.originalCaption) !== (placement.originalCaption || "")) ? <details className="g29-verbatim">
                  <summary>הנוסח השמור במקור</summary>
                  {placement.originalName ? <pre>{placement.originalName}</pre> : null}
                  {placement.originalCaption ? <pre>{placement.originalCaption}</pre> : null}
                </details> : null}
              {[placement.originalCredit?.author, placement.originalCredit?.publication].filter(Boolean).length ? <p>קרדיט: {[placement.originalCredit.author, placement.originalCredit.publication].filter(Boolean).join(" · ")}</p> : null}
              {placement.occurredAt ? <p className="g29-note">{placement.dateProvenance?.occurredAt?.derivedFrom === "path" ? `תיקיית המקור: ${placement.occurredAt.slice(0, 7)}. זה אינו תאריך אירוע מאומת.`
                : `תאריך שנשמר עם התמונה: ${bilingualDateLabel(placement.occurredAt)}. זה אינו תאריך אירוע מאומת.`}</p> : null}
              {placement.createdAt ? <p className="g29-note">נוסף לארכיון: {bilingualDateLabel(placement.createdAt)}</p> : null}
              {gallerySourceHref2029(placement.wpGalleryId, placement.galleryImageId) ? <Link className="g29-text-link"
                to={gallerySourceHref2029(placement.wpGalleryId, placement.galleryImageId)}>לראות בהקשר הזה ←</Link> : null}
            </section>)}
            <details className="g29-reference"><summary>פרטי האסמכתה</summary><bdi>{item.sourceRef}</bdi></details>
          </details>
        </div>
      </details>
    </div>
  </section>;
}

function GalleryBody() {
  const location = useLocation();
  const navigate = useNavigate();
  const research = useResearch();
  const requestRef = useRef(0);
  const restoredRouteRef = useRef(null);
  const [state, setState] = useState({ status: "loading" });
  const [retry, setRetry] = useState(0);
  const [opening, setOpening] = useState(null);
  const [error, setError] = useState(null);
  const params = new URLSearchParams(location.search);
  const galleryId = params.get("gallery");
  const wpGalleryId = /^[1-9]\d*$/.test(galleryId || "") ? Number(galleryId) : null;
  const imageId = params.get("image");
  const offsetText = params.get("offset") || "0";
  const offset = /^\d+$/.test(offsetText) ? Number(offsetText) : NaN;
  const routeKey = `${galleryId}:${location.search}`;

  useEffect(() => {
    let alive = true;
    requestRef.current += 1;
    setOpening(null); setError(null); setState({ status: "loading", routeKey });
    readWindow({ wpGalleryId, imageId, offset }).then((result) => {
      if (alive) setState({ ...result, routeKey });
    }).catch(() => { if (alive) setState({ status: "failed", routeKey }); });
    return () => { alive = false; requestRef.current += 1; };
  }, [routeKey, retry]); // routeKey includes the complete requested gallery locator

  const current = state.routeKey === routeKey ? state : { status: "loading" };
  const item = galleryOccurrenceItem(current.selected);
  const slotKey = item ? `gallery-source-${item.galleryImageId}` : null;
  const exactHref = item ? gallerySourceHref2029(wpGalleryId, item.galleryImageId) : null;
  const title = item?.legacyPlacement?.galleryName || `גלריה ${galleryId}`;
  const subject = { id: String(wpGalleryId), type: "gallery", label: title, href: gallerySourceHref2029(wpGalleryId) };

  useEffect(() => {
    if (!item) return;
    research.updateResearchContext?.((previous) => ({ subject,
      selection: { entityId: item.galleryImageId, entityType: "image", sourceRef: item.sourceRef, locator: `#${slotKey}` },
      lens: "gallery", dimensions: { ...(previous?.dimensions || {}), readingFocus: null, surfaceFindings: [],
        topicSlug: null, expressionFocusExplicit: false, galleryImageId: item.galleryImageId, wpGalleryId,
        surfaceFocus: { id: item.mediaId, type: "image", label: readingLabel(item), primary: readingLabel(item),
          reference: item.sourceIdentity?.ref, locator: `#${slotKey}`, href: exactHref, sourceLabel: title } } }));
  }, [routeKey, item?.galleryImageId]); // Existing Context only; no gallery store/provider.

  useEffect(() => {
    if (!item || !slotKey) return;
    const previous = restoredRouteRef.current;
    restoredRouteRef.current = routeKey;
    if (!location.hash && (!previous || previous === routeKey)) return;
    const frame = requestAnimationFrame(() => {
      const element = document.getElementById(location.hash ? slotKey : "gallery-top");
      element?.scrollIntoView({ block: "start", behavior: "instant" });
      element?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [routeKey, current.status, slotKey, location.hash]);

  const sourceReturn = (sourceItem) => ({ href: gallerySourceHref2029(wpGalleryId, sourceItem.galleryImageId), label: title, subject,
    selection: { entityId: sourceItem.galleryImageId, entityType: "image", sourceRef: sourceItem.sourceRef, locator: `#gallery-source-${sourceItem.galleryImageId}` },
    lens: "gallery", dimensions: { galleryImageId: sourceItem.galleryImageId, wpGalleryId,
      activeSectionId: `gallery-source-${sourceItem.galleryImageId}`, galleryNumberPath: "stored_tag_not_verified_calculation" },
    journey: research.context?.journey || null });
  const remember = (sourceItem) => {
    const returnTo = sourceReturn(sourceItem);
    research.updateResearchContext?.({ returnTo });
    if (`${location.pathname}${location.search}${location.hash}` !== returnTo.href) navigate(returnTo.href, { replace: true });
  };

  const openExpression = async (sourceItem, row, origin) => {
    const request = ++requestRef.current;
    const sourceSlot = `gallery-source-${sourceItem.galleryImageId}`;
    const sourceHref = gallerySourceHref2029(wpGalleryId, sourceItem.galleryImageId);
    const fail = (message) => setError({ key: sourceSlot, message });
    setOpening(sourceSlot); setError(null);
    try {
      const fresh = await fetchGallerySourceContext({ imageIds: [sourceItem.galleryImageId] });
      if (request !== requestRef.current) return false;
      const selected = resolvePublicGallerySelection({ wpGalleryId, scannedIds: [sourceItem.galleryImageId], items: fresh.items }, sourceItem.galleryImageId);
      const freshItem = galleryOccurrenceItem(selected);
      if (!gateSourceSelectionIsCurrent(freshItem, origin)
        || row.text !== origin.sourceText.slice(origin.selectionStart, origin.selectionEnd)) {
        if (!freshItem) setState((old) => ({ ...old, status: "unavailable", selected: null, page: null }));
        fail("התמונה אינה זמינה או שהטקסט שלה השתנה. רעננו ובחרו את הביטוי מחדש.");
        return false;
      }
      const resolved = await resolveTopicExpressionFocus2029(row, { profileReader: fetchNumberMethodProfile });
      if (request !== requestRef.current) return false;
      const focus = resolved.focus;
      const method = focus && gatePublicMethodRows(focus.rows).find((entry) => entry.methodKey === focus.method
        && entry.computedValue === focus.resultValue);
      if (!method || (origin.expectedMethodVersion != null
        && String(method.definitionVersion ?? "") !== String(origin.expectedMethodVersion))) {
        fail("החישוב השתנה או שהשיטה אינה זמינה כעת. פתחו מחדש את השיטות ונסו שוב.");
        return false;
      }
      const returnTo = sourceReturn(sourceItem);
      research.setResearchContext?.({ subject: { id: String(focus.root), type: "number", label: String(focus.root), href: focus.href },
        selection: { entityId: `${sourceItem.sourceRef}:${origin.selectionStart}-${origin.selectionEnd}`, entityType: "gematria_expression",
          sourceRef: sourceItem.sourceRef, locator: `#${sourceSlot}`, expression: focus.expression, method: focus.method,
          methodVersion: method.definitionVersion == null ? null : String(method.definitionVersion),
          resultValue: focus.resultValue, focusKind: "expression" },
        lens: "gematria", locale: research.context?.locale || "he", journey: research.context?.journey || null, returnTo,
        dimensions: { expressionFocusExplicit: true, focusOrigin: "gallery", wpGalleryId, galleryImageId: sourceItem.galleryImageId,
          storedTextSelectionKind: "stored_ocr", storedTextSelectionStart: origin.selectionStart,
          storedTextSelectionEnd: origin.selectionEnd, storedTextSelectionSourceRef: sourceItem.sourceRef,
          sourceMethodPairing: "not_asserted" } });
      // Exact source in the previous history entry; same canonical Number page,
      // no gallery-local calculator, inspector or numeric interpretation.
      if (`${location.pathname}${location.search}${location.hash}` !== sourceHref) navigate(sourceHref, { replace: true });
      navigate(focus.href);
      return true;
    } catch {
      if (request === requestRef.current) fail("לא הצלחנו לפתוח את החישוב כרגע. אפשר לנסות שוב בעוד רגע.");
      return false;
    } finally { if (request === requestRef.current) setOpening(null); }
  };

  if (!gallerySourceHref2029(wpGalleryId)) return <FrameState kind="empty" title="הגלריה עדיין לא זמינה כאן"><Link to="/world">לגלריות ולסיפורים בעולם</Link></FrameState>;
  if (current.status === "loading") return <FrameState kind="loading" title="פותחים את הגלריה">עוד רגע, התמונות בדרך…</FrameState>;
  const page = current.page;
  const images = (page?.scannedIds || []).map((id) => galleryOccurrenceItem(resolvePublicGallerySelection(page, id))).filter(Boolean);
  const select = (sourceItem) => research.updateResearchContext?.({
    selection: { entityId: sourceItem.galleryImageId, entityType: "image", sourceRef: sourceItem.sourceRef,
      locator: `#gallery-source-${sourceItem.galleryImageId}` },
    dimensions: { galleryImageId: sourceItem.galleryImageId, surfaceFocus: { id: sourceItem.mediaId, type: "image",
      label: readingLabel(sourceItem), primary: readingLabel(sourceItem), reference: sourceItem.sourceIdentity?.ref,
      locator: `#gallery-source-${sourceItem.galleryImageId}`, href: gallerySourceHref2029(wpGalleryId, sourceItem.galleryImageId), sourceLabel: title } },
  });
  return <article id="gallery-top" className="g29-gallery" dir="rtl" data-gallery-id={wpGalleryId}>
    <header className="g29-heading">
      <nav className="g29-breadcrumb" aria-label="מיקום בגלריות"><Link to="/world">העולם</Link><span aria-hidden="true">/</span><span>גלריות</span></nav>
      <div className="g29-heading-line"><div><p className="g29-eyebrow">סוד 1820 · מבט בתמונות</p>
        <h2>{title}</h2></div><svg className="g29-gallery-mark" width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
          <rect x="11" y="7" width="45" height="48" rx="7" transform="rotate(-8 11 7)" /><rect x="17" y="16" width="45" height="48" rx="7" />
          <circle cx="46" cy="31" r="5" /><path d="m23 53 12-14 9 9 6-6 7 11" />
        </svg></div>
      <p className="g29-intro">תמונות, מספרים ועוד כיוון להתבוננות.</p>
      <div className="g29-heading-bottom"><nav aria-label="המשך הגלישה"><Link className="g29-text-link" to="/topic/1237">לסיפור של התגלות ←</Link>
        <Link className="g29-text-link" to={gallerySourceHref2029(wpGalleryId === 29 ? 81 : 29)}>לגלריה נוספת ←</Link></nav>
        {images.length ? <span className="g29-count"><bdi>{images.length}</bdi> תמונות לעיון</span> : null}</div>
    </header>
    {current.status === "failed" ? <p className="g29-message" role="status">לא הצלחנו לטעון את התמונות כרגע. נסו שוב בעוד רגע.</p> : null}
    {current.status === "unavailable" ? <p className="g29-message" role="status">התמונה המבוקשת אינה זמינה כאן כרגע.</p> : null}
    {current.status === "empty_window" ? <p className="g29-message" role="status">אין כרגע תמונות זמינות בחלק הזה של הגלריה. אפשר לעבור לתמונות הבאות.</p> : null}
    {current.status === "failed" || current.status === "unavailable" ? <button className="sod29-action" onClick={() => setRetry((n) => n + 1)}>בדיקה מחדש</button> : null}
    <div className="g29-flow" aria-label="תמונות הגלריה">{images.map((image, index) => <GalleryImageCard key={image.galleryImageId}
      item={image} index={index} selected={item?.galleryImageId === image.galleryImageId} opening={opening} error={error}
      onRemember={remember} onOpenExpression={openExpression} onSelect={select} />)}</div>
    {page ? <footer className="g29-browse">
      <span className="g29-footer-note">לכל תמונה יש סיפור. ממשיכים לגלות?</span>
      <nav aria-label="עוד תמונות בגלריה">
        {page.offset > 0 ? <Link className="g29-page-link" to={`${subject.href}&offset=${Math.max(0, page.offset - page.limit)}`}>→ התמונות הקודמות</Link> : null}
        {page.hasMore ? <Link className="g29-page-link is-next" to={`${subject.href}&offset=${page.nextOffset}`}>התמונות הבאות ←</Link> : null}
      </nav>
      {page.withheld || page.occurrencesTruncated ? <details className="g29-coverage"><summary>מידע על התצוגה</summary>
        {page.withheld ? <p>חלק מהתמונות אינן זמינות להצגה כאן כרגע.</p> : null}
        {page.occurrencesTruncated ? <p>יש לתמונות הופעות נוספות שאינן מוצגות בקריאה הזו.</p> : null}
      </details> : null}
    </footer> : null}
  </article>;
}

export default function Gallery2029Page() {
  return <Sod2029Shell surface="world" title="גלריות" introVariant="none"><GalleryBody /></Sod2029Shell>;
}
