import React, { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import CanonicalMediaImage2029 from '../experience2029/CanonicalMediaImage2029.jsx';
import RealityStreamFollow2029 from './RealityStreamFollow2029.jsx';
import ShareActions from '../ShareActions.jsx';
import { worldMediaPublicShare } from '../../lib/research/worldFindingShare.js';
import { getRealityHints } from '../../lib/supabase.js';
import { fetchGallerySourceContext } from '../../lib/research/entityHubProjection.js';
import { realityStreamDatePresentation2029, loadPublicRealityStream2029 } from '../../lib/research/topicSourceContext.js';
import { publicMediaCaption, publicMediaTitle } from '../../lib/presentation/contentTitle.js';
import { numberExpressionFocusHref } from '../../lib/research/numberExpressionFocus.js';
import './realityRiver2029.css';

const RiverPicture = memo(function RiverPicture({ item, index, selected, registerCard }) {
  const title = publicMediaTitle(item.legacyPlacement?.originalName) || 'תמונה מתוך הזרם';
  const date = realityStreamDatePresentation2029(item);
  const share = useMemo(() => worldMediaPublicShare(item, {
    origin: typeof window !== 'undefined' ? window.location.origin : null,
  }), [item]);
  const tag = Number.isSafeInteger(item.storedNumbers?.primary) && item.storedNumbers.primary > 0 ? item.storedNumbers.primary : null;
  const cardRef = useCallback(el => registerCard(item.galleryImageId, el), [item.galleryImageId, registerCard]);
  return <article ref={cardRef} className={`r29-picture${selected ? ' is-current' : ''}`} data-river-image={item.galleryImageId}>
    <Link to={item.streamHref} className="r29-picture-frame" aria-label={`פתיחת המקור: ${title}`}>
      <span className="r29-image-surface"><CanonicalMediaImage2029 item={item} alt={title} loading={index < 3 ? 'eager' : 'lazy'} />
        {date ? <span className="r29-image-date" title={date.description} aria-label={`${date.kind}: ${date.label}. ${date.description}`}>
          <time dateTime={date.dateTime} dir="ltr">{date.label}</time><span>{date.kind}</span>
        </span> : <span className="r29-image-date">תאריך לא צוין</span>}
      </span>
    </Link>
    <div className="r29-picture-meta">
      {tag ? <Link className="r29-num" to={numberExpressionFocusHref(tag)} aria-label={`לדף המספר ${tag}`}><bdi>{tag.toLocaleString('en-US')}</bdi></Link> : null}
      <div className="r29-picture-copy"><p className="r29-picture-title">{title}</p>
      {item.legacyPlacement?.galleryName ? <p className="r29-gallery-name">מתוך: {publicMediaCaption(item.legacyPlacement.galleryName)}</p> : null}</div>
      {share ? <ShareActions type="image" {...share} title={title} variant="icon" sourceSurface="home_reality_stream_2029" force /> : null}
    </div>
  </article>;
});

/** Legacy river silhouette only. All content is admitted by 2029 source readers. */
export function RealityRiver2029({ items = [], loading = false, failed = false, onRetry, follow = null }) {
  const view = useRef(null), cards = useRef(new Map()), knob = useRef(null), rail = useRef(null), slider = useRef(null), ticks = useRef(null);
  const geometry = useRef({ max: 0, travel: 0, cards: [] }), frame = useRef(null), positionRef = useRef(0);
  const [position, setPosition] = useState(0);
  const regionId = useId();
  const current = items[position] || items[0];
  const currentTitle = publicMediaTitle(current?.legacyPlacement?.originalName) || 'תמונה מתוך הזרם';
  const currentCaption = publicMediaCaption(current?.legacyPlacement?.originalCaption);
  const date = realityStreamDatePresentation2029(current);
  const numbers = [...new Set([current?.storedNumbers?.primary, ...(current?.storedNumbers?.all || [])])]
    .filter(n => Number.isSafeInteger(n) && n > 0).slice(0, 4);

  const registerCard = useCallback((id, element) => {
    if (element) cards.current.set(id, element); else cards.current.delete(id);
  }, []);
  const synchronize = useCallback(() => {
    const el = view.current;
    if (!el) return;
    const metrics = geometry.current, top = Math.max(0, el.scrollTop);
    const ratio = metrics.max ? Math.min(1, top / metrics.max) : 0;
    // Moving the handle never rerenders cards, shares or the reading panel.
    if (knob.current) knob.current.style.transform = `translate3d(-50%,${ratio * metrics.travel}px,0)`;
    if (slider.current) slider.current.value = String(ratio * 100);
    const index = metrics.cards.findIndex(card => card.bottom > top + 45);
    const next = index < 0 ? Math.max(0, items.length - 1) : index;
    if (positionRef.current !== next) { positionRef.current = next; setPosition(next); }
  }, [items]);
  const schedule = useCallback(() => {
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => { frame.current = null; synchronize(); });
  }, [synchronize]);
  const seek = value => {
    const el = view.current;
    if (!el) return;
    el.scrollTop = Number(value) / 100 * geometry.current.max;
    schedule();
  };
  const jump = index => {
    const el = view.current, card = geometry.current.cards[index];
    if (!el || !card) return;
    el.scrollTop = Math.max(0, card.top - 12);
    schedule();
  };
  const pointerSeek = event => {
    const bounds = event.currentTarget.getBoundingClientRect();
    seek(Math.max(0, Math.min(100, (event.clientY - bounds.top) / Math.max(1, bounds.height) * 100)));
  };
  useEffect(() => {
    // Warm the rest of the window once the page is idle (DOM only, no render): otherwise lazy pictures stay
    // collapsed, the total height grows after a jump, and the handle's End/drag lands mid-window.
    if (!items.length) return undefined;
    const idle = window.requestIdleCallback || (fn => setTimeout(fn, 900)), cancel = window.cancelIdleCallback || clearTimeout;
    const id = idle(() => cards.current.forEach(card => card.querySelectorAll('img').forEach(image => { image.loading = 'eager'; })));
    return () => cancel(id);
  }, [items]);
  useEffect(() => {
    const el = view.current;
    if (!el) return;
    el.scrollTop = 0;
    const measure = () => {
      // Geometry is read on resize/image layout, never once per scroll event.
      geometry.current = { max: Math.max(0, el.scrollHeight - el.clientHeight),
        travel: Math.max(0, (rail.current?.clientHeight || 0) - (knob.current?.offsetHeight || 0)),
        cards: items.map(item => { const card = cards.current.get(item.galleryImageId);
          return { top: card?.offsetTop || 0, bottom: (card?.offsetTop || 0) + (card?.offsetHeight || 0) }; }) };
      // Rail marks sit where the handle rests when that picture is at the top of the window (DOM only, no render).
      const { max, travel, cards: spans } = geometry.current, half = (knob.current?.offsetHeight || 0) / 2;
      ticks.current?.childNodes.forEach((tick, i) => {
        tick.style.top = `${(max ? Math.min(1, Math.max(0, (spans[i]?.top || 0) - 12) / max) : 0) * travel + half}px`;
      });
      schedule();
    };
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(el);
    cards.current.forEach(card => observer?.observe(card));
    // Old browsers still refresh geometry when media finish loading.
    el.addEventListener('load', measure, true);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); el.removeEventListener('load', measure, true); window.removeEventListener('resize', measure);
      if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null; };
  }, [items, loading, failed, schedule]); // Window progress only, never a viewed/follow signal.

  return <section id="reality-stream" className="r29-river" dir="rtl" aria-label="זרם המציאות" data-reality-river>
    <header className="r29-heading"><div><p className="r29-eyebrow">תמונה פותחת סיפור</p>
      <h2>זרם המציאות</h2><p>רגעים, מספרים וסיפורים. גוללים בתמונות, ופותחים את המקור כדי להעמיק.</p></div>
      <Link to="/world?view=gallery&flow=1" className="r29-link">לכל הגלריות ←</Link></header>
    {loading ? <p className="r29-status" role="status">פותחים את התמונות בזרם…</p> : null}
    {failed ? <div className="r29-status" role="alert">לא הצלחנו לפתוח את הזרם כרגע. <button type="button" onClick={onRetry}>לנסות שוב</button></div> : null}
    {!loading && !failed && !items.length ? <p className="r29-status">אין כרגע תמונות ציבוריות זמינות בחלון הזה.</p> : null}
    {!loading && !failed && items.length ? <>
      <div className="r29-progress"><span>בתצוגה: <bdi>{position + 1}</bdi> מתוך <bdi>{items.length}</bdi></span>
        <span>עוד <bdi>{Math.max(0, items.length - position - 1)}</bdi> בהמשך החלון</span></div>
      <div className="r29-stage">
        <aside className="r29-detail" aria-label="הסיפור שבתמונה"><div className="r29-detail-inner" key={current.galleryImageId}>
          <div className="r29-detail-head">
            <span className="r29-detail-thumb" aria-hidden="true"><CanonicalMediaImage2029 item={current} thumbnail alt="" /></span>
            <div><span className="r29-detail-label">מבט מקרוב · תמונה <bdi>{position + 1}</bdi></span><h3>{currentTitle}</h3></div>
          </div>
          <div className="r29-detail-body">
            {date ? <p className="r29-date">{date.kind} · <time dir="ltr" dateTime={date.dateTime}>{date.label}</time></p> : null}
            {current?.legacyPlacement?.galleryName ? <p className="r29-gallery-name">מתוך: {publicMediaCaption(current.legacyPlacement.galleryName)}</p> : null}
            {currentCaption ? <p className="r29-description">{currentCaption}</p> : <p className="r29-description">התמונה פתוחה לעיון במקורה, עם הכיתובים וההקשר שנשמרו איתה.</p>}
          </div>
          <div className="r29-detail-foot">
            {numbers.length ? <><p className="r29-number-label">מספרים שסומנו במקור</p><div className="r29-numbers">{numbers.map(n =>
              <Link key={n} to={numberExpressionFocusHref(n)} aria-label={`לדף המספר ${n}`}><bdi>{n.toLocaleString('en-US')}</bdi>
                <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" aria-hidden="true"><path d="m3 9 6-6M3 3h6v6" /></svg></Link>)}</div></> : null}
            <Link className="r29-open" to={current.streamHref}>למקור ולהקשר ←</Link>
            <p className="r29-note">התיוגים במקור אינם כשלעצמם אימות חישוב או קשר בעץ.</p>
          </div>
        </div></aside>
        <div className="r29-window" id={regionId} ref={view} onScroll={schedule} tabIndex={0} role="region" aria-label="התמונות בזרם — אפשר לגלול">
          {items.map((item, index) => <RiverPicture key={item.galleryImageId} item={item} index={index}
            selected={index === position} registerCard={registerCard} />)}
          <Link className="r29-end" to="/world?view=gallery&flow=1">יש עוד מה לגלות · לכל הגלריות ←</Link>
        </div>
        <div className="r29-rod"><span aria-hidden="true">תחילה</span><div className="r29-rail" ref={rail}>
          <div className="r29-ticks" ref={ticks} aria-hidden="true">{items.map(item => <i key={item.galleryImageId} />)}</div>
          <div className="r29-knob" ref={knob} aria-hidden="true"><i /><i /><i /></div>
          <input ref={slider} type="range" min="0" max="100" step="0.1" defaultValue="0"
            aria-label="ידית הגלילה של זרם המציאות" aria-controls={regionId}
            aria-valuetext={`תמונה ${position + 1} מתוך ${items.length}`} onChange={event => seek(event.target.value)}
            onPointerDown={event => { event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId); pointerSeek(event); }}
            onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) pointerSeek(event); }}
            onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }} />
        </div><span aria-hidden="true">המשך</span></div>
      </div>
      <nav className="r29-memory" aria-label="חזרה לתמונות שכבר עברנו בחלון">
        <span>חזרה מהירה</span>{items.slice(0, position + 1).map((item, index) => <button key={item.galleryImageId} type="button"
          aria-label={`חזרה לתמונה ${index + 1}`} aria-current={index === position ? 'true' : undefined} onClick={() => jump(index)}>
          <CanonicalMediaImage2029 item={item} thumbnail alt="" /><bdi>{index + 1}</bdi></button>)}
      </nav>
      <p className="r29-note">חלון מתוך הזרם, לא כל הארכיון. ההתקדמות כאן מתארת גלילה בלבד.
        <span className="r29-note-tags"> התיוגים במקור אינם כשלעצמם אימות חישוב או קשר בעץ.</span></p>
    </> : null}
    {follow}
  </section>;
}

export default function HomeRealityRiver2029() {
  const [retry, setRetry] = useState(0), [state, setState] = useState({ status: 'loading', items: [] });
  useEffect(() => {
    let alive = true;
    setState({ status: 'loading', items: [] });
    loadPublicRealityStream2029({ listHints: getRealityHints, fetchSourceContext: fetchGallerySourceContext })
      .then(result => { if (alive) setState({ ...result, status: 'ready' }); })
      .catch(() => { if (alive) setState({ status: 'failed', items: [] }); });
    return () => { alive = false; };
  }, [retry]);
  return <RealityRiver2029 items={state.items} loading={state.status === 'loading'} failed={state.status === 'failed'}
    onRetry={() => setRetry(n => n + 1)} follow={<RealityStreamFollow2029 source="home_reality_stream_2029" />} />;
}
