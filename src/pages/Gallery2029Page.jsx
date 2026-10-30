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
import "./gallery2029.css";

const readWindow = (options) => loadPublicGallerySourceWindow({ ...options,
  listGalleryImages: getImagesByGallery, fetchSourceContext: fetchGallerySourceContext });
const ordinaryClick = (event) => !event.defaultPrevented && event.button === 0
  && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

function GalleryBody() {
  const location = useLocation();
  const navigate = useNavigate();
  const research = useResearch();
  const requestRef = useRef(0);
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
        surfaceFocus: { id: item.mediaId, type: "image", label: item.label, primary: item.label,
          reference: item.sourceIdentity?.ref, locator: `#${slotKey}`, href: exactHref, sourceLabel: title } } }));
  }, [routeKey, item?.galleryImageId]); // Existing Context only; no gallery store/provider.

  useEffect(() => {
    if (!item || !slotKey || !location.hash) return;
    const frame = requestAnimationFrame(() => {
      const element = document.getElementById(slotKey);
      element?.scrollIntoView({ block: "start", behavior: "instant" });
      element?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [routeKey, current.status, slotKey, location.hash]);

  const sourceReturn = () => ({ href: exactHref, label: title, subject,
    selection: { entityId: item.galleryImageId, entityType: "image", sourceRef: item.sourceRef, locator: `#${slotKey}` },
    lens: "gallery", dimensions: { galleryImageId: item.galleryImageId, wpGalleryId,
      activeSectionId: slotKey, galleryNumberPath: "stored_tag_not_verified_calculation" },
    journey: research.context?.journey || null });
  const remember = () => {
    research.updateResearchContext?.({ returnTo: sourceReturn() });
    if (`${location.pathname}${location.search}${location.hash}` !== exactHref) navigate(exactHref, { replace: true });
  };

  const openExpression = async (row, origin) => {
    const request = ++requestRef.current;
    setOpening(slotKey); setError(null);
    try {
      const fresh = await fetchGallerySourceContext({ imageIds: [item.galleryImageId] });
      if (request !== requestRef.current) return false;
      const selected = resolvePublicGallerySelection({ wpGalleryId, scannedIds: [item.galleryImageId], items: fresh.items }, item.galleryImageId);
      const freshItem = galleryOccurrenceItem(selected);
      if (!gateSourceSelectionIsCurrent(freshItem, origin)
        || row.text !== origin.sourceText.slice(origin.selectionStart, origin.selectionEnd)) {
        if (!freshItem) setState((old) => ({ ...old, status: "unavailable", selected: null, page: null }));
        setError("המקור אינו זמין או שהטקסט השמור השתנה. רעננו ובחרו את הביטוי מחדש.");
        return false;
      }
      const resolved = await resolveTopicExpressionFocus2029(row, { profileReader: fetchNumberMethodProfile });
      if (request !== requestRef.current) return false;
      const focus = resolved.focus;
      const method = focus && gatePublicMethodRows(focus.rows).find((entry) => entry.methodKey === focus.method
        && entry.computedValue === focus.resultValue);
      if (!method || (origin.expectedMethodVersion != null
        && String(method.definitionVersion ?? "") !== String(origin.expectedMethodVersion))) {
        setError("השיטה, הערך או גרסת החישוב אינם תואמים עוד. פתחו מחדש את השיטות; לא הוחלפה שיטה אוטומטית.");
        return false;
      }
      const returnTo = sourceReturn();
      research.setResearchContext?.({ subject: { id: String(focus.root), type: "number", label: String(focus.root), href: focus.href },
        selection: { entityId: `${item.sourceRef}:${origin.selectionStart}-${origin.selectionEnd}`, entityType: "gematria_expression",
          sourceRef: item.sourceRef, locator: `#${slotKey}`, expression: focus.expression, method: focus.method,
          methodVersion: method.definitionVersion == null ? null : String(method.definitionVersion),
          resultValue: focus.resultValue, focusKind: "expression" },
        lens: "gematria", locale: research.context?.locale || "he", journey: research.context?.journey || null, returnTo,
        dimensions: { expressionFocusExplicit: true, focusOrigin: "gallery", wpGalleryId, galleryImageId: item.galleryImageId,
          storedTextSelectionKind: "stored_ocr", storedTextSelectionStart: origin.selectionStart,
          storedTextSelectionEnd: origin.selectionEnd, storedTextSelectionSourceRef: item.sourceRef,
          sourceMethodPairing: "not_asserted" } });
      // Exact source in the previous history entry; same canonical Number page,
      // no gallery-local calculator, inspector or numeric interpretation.
      if (`${location.pathname}${location.search}${location.hash}` !== exactHref) navigate(exactHref, { replace: true });
      navigate(focus.href);
      return true;
    } catch {
      if (request === requestRef.current) setError("בדיקת המקור או המנוע נכשלה. אפשר לנסות שוב; אין זו תוצאה ריקה.");
      return false;
    } finally { if (request === requestRef.current) setOpening(null); }
  };

  if (!gallerySourceHref2029(wpGalleryId)) return <FrameState kind="empty" title="הגלריה עדיין לא בפיילוט">כרגע מחוברות גלריות 29 ו־81 בלבד.</FrameState>;
  if (current.status === "loading") return <FrameState kind="loading" title="פותח את הגלריה">בודק את המקורות הציבוריים ואת המיקום השמור.</FrameState>;
  const page = current.page;
  const source = item ? gateSourcePresentation(item) : null;
  const p = item?.legacyPlacement;
  const thumbnails = (page?.scannedIds || []).map((id) => galleryOccurrenceItem(resolvePublicGallerySelection(page, id))).filter(Boolean);
  return <article className="g29-gallery" dir="rtl" data-gallery-id={wpGalleryId}>
    <header className="g29-heading"><p className="sod29-kicker">גלריות המחקר · חלון ראשון ב־2029</p>
      <h2>{title}</h2><p>אותן תמונות, אותו מקור. אפשר לעבור בין התמונות ולהעמיק בלי לאבד את המקום.</p>
      <nav aria-label="המשך מחקר"><Link className="sod29-action" to="/topic/1237">לציר התגלות</Link><Link className="sod29-action" to="/world">לעולם</Link></nav>
    </header>
    {current.status === "failed" ? <p role="status">הקריאה נכשלה. אין להסיק שהגלריה ריקה.</p> : null}
    {current.status === "unavailable" ? <p role="status">התמונה המבוקשת אינה זמינה כאן לפי תנאי הפרסום הנוכחיים. לא הוחלפה בתמונה אחרת.</p> : null}
    {current.status === "empty_window" ? <p role="status">אין תמונות ציבוריות זמינות בחלון הזה. ייתכנו תמונות בחלונות אחרים.</p> : null}
    {current.status === "failed" || current.status === "unavailable" ? <button className="sod29-action" onClick={() => setRetry((n) => n + 1)}>בדיקה מחדש</button> : null}
    {item ? <section id={slotKey} tabIndex={-1} className="g29-exhibit" data-gallery-selected={item.galleryImageId}>
      <div className="g29-canvas"><CanonicalMediaImage2029 item={item} primary loading="eager" alt={p.originalName || item.label} /></div>
      <div className="g29-placard">
        <p className="sod29-kicker">{source.kindLabel} · מיקום שמור {p.ordering ?? "לא תועד"}</p>
        <h3>{p.originalName || item.label}</h3>
        {p.originalCaption ? <p className="g29-caption">{p.originalCaption}</p> : <p>לא נשמר כיתוב נפרד במקור.</p>}
        {source.numbers.length ? <details><summary>מספרים שסומנו במקור · {source.numbers.length}</summary>
          <p>תיוגי ניווט שמורים, לא אימות של חישוב או קשר בעץ.</p>
          <div className="g29-tags">{source.numbers.map((number) => <Link key={number} className="sod29-action" to={numberExpressionFocusHref(number)}
            onClick={(event) => { if (ordinaryClick(event)) remember(); }}><bdi>{number}</bdi> ←</Link>)}</div>
        </details> : null}
        <div className="rv"><SourceMethodResearch key={item.galleryImageId} item={item} slotKey={slotKey} sectionId={slotKey}
          readProfile={fetchNumberMethodProfile} onOpenExpression={openExpression} openingKey={opening} focusError={error} focusErrorKey={slotKey} /></div>
        <details><summary>המקור, הקרדיט והיסטוריית המיקומים</summary>
          <p>פרטי מקור וקליטה — לא תאריך אירוע. הופעות של אותה תמונה אינן ראיות עצמאיות.</p>
          {source.history.map((placement) => <section key={placement.galleryImageId} className="g29-history">
            <h4>{placement.galleryName || `גלריה ${placement.wpGalleryId}`} · מיקום {placement.ordering ?? "לא תועד"}</h4>
            <p>{placement.originalName}</p><p className="g29-caption">{placement.originalCaption}</p>
            {[placement.originalCredit?.author, placement.originalCredit?.publication].filter(Boolean).length ? <p>קרדיט: {[placement.originalCredit.author, placement.originalCredit.publication].filter(Boolean).join(" · ")}</p> : null}
            {placement.occurredAt ? <p>{placement.dateProvenance?.occurredAt?.derivedFrom === "path" ? `תיקיית מקור: ${placement.occurredAt.slice(0, 7)}. יום האירוע אינו ידוע.`
              : `תאריך שמור: ${bilingualDateLabel(placement.occurredAt)}. אינו תאריך אירוע מאומת.`}</p> : null}
            {placement.createdAt ? <p>נקלט בארכיון: {bilingualDateLabel(placement.createdAt)}</p> : null}
            {gallerySourceHref2029(placement.wpGalleryId, placement.galleryImageId) ? <Link className="sod29-action"
              to={gallerySourceHref2029(placement.wpGalleryId, placement.galleryImageId)}>למיקום הזה בגלריה ←</Link> : null}
          </section>)}
          <p>אסמכתת מקור: <bdi>{item.sourceRef}</bdi></p>
          <a className="sod29-action" href={item.imageUrl} target="_blank" rel="noreferrer">התמונה המקורית בגודל מלא</a>
        </details>
      </div>
    </section> : null}
    {page ? <section className="g29-browse" aria-label="בחירת תמונה בגלריה">
      <p>{page.scannedIds.length ? <>חלון {page.offset + 1}–{page.nextOffset} מתוך {page.totalListed} מיקומים ברשימה · בסדר השמור, לא בדירוג חשיבות.</>
        : "לא נטענו מיקומים בחלון הזה. אין בכך הוכחה שהגלריה ריקה."}</p>
      <div className="g29-thumbnails">{thumbnails.map((thumb) => <Link key={thumb.galleryImageId} to={gallerySourceHref2029(wpGalleryId, thumb.galleryImageId)}
        aria-current={item?.galleryImageId === thumb.galleryImageId ? "true" : undefined} aria-label={`בחר תמונה: ${thumb.legacyPlacement.originalName || thumb.label}`}>
        <CanonicalMediaImage2029 item={thumb} thumbnail alt="" /><span>{thumb.legacyPlacement.originalName || thumb.label}</span>
      </Link>)}</div>
      {page.withheld ? <p>{page.withheld} מיקומים בחלון לא מוצגים כי לא נמצאה הופעה ציבורית חד־משמעית.</p> : null}
      {page.occurrencesTruncated ? <p>היסטוריית ההופעות חלקית; יש הופעות מעבר לחלון הקריאה.</p> : null}
      <nav aria-label="חלונות הגלריה">
        {page.offset > 0 ? <Link className="sod29-action" to={`${subject.href}&offset=${Math.max(0, page.offset - page.limit)}`}>→ החלון הקודם</Link> : null}
        {page.hasMore ? <Link className="sod29-action" to={`${subject.href}&offset=${page.nextOffset}`}>החלון הבא ←</Link> : null}
      </nav>
    </section> : null}
  </article>;
}

export default function Gallery2029Page() {
  return <Sod2029Shell surface="world" title="גלריית מחקר" introVariant="none"><GalleryBody /></Sod2029Shell>;
}
