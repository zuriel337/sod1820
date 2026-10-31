import React, { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import CanonicalMediaImage2029 from '../experience2029/CanonicalMediaImage2029.jsx';
import RealityStreamFollow2029 from './RealityStreamFollow2029.jsx';
import ShareActions from '../ShareActions.jsx';
import { worldMediaPublicShare } from '../../lib/research/worldFindingShare.js';
import { getRealityHints } from '../../lib/supabase.js';
import { fetchGallerySourceContext } from '../../lib/research/entityHubProjection.js';
import { galleryImageDatePresentation, loadPublicRealityStream2029 } from '../../lib/research/topicSourceContext.js';
import { publicMediaCaption, publicMediaTitle } from '../../lib/presentation/contentTitle.js';
import { numberExpressionFocusHref } from '../../lib/research/numberExpressionFocus.js';
import './realityRiver2029.css';

/** Legacy river silhouette only. All content is admitted by 2029 source readers. */
export function RealityRiver2029({ items = [], loading = false, failed = false, onRetry, follow = null }) {
  const view = useRef(null), cards = useRef(new Map());
  const [position, setPosition] = useState(0), [ratio, setRatio] = useState(0);
  const regionId = useId();
  const current = items[position] || items[0];
  const currentTitle = publicMediaTitle(current?.legacyPlacement?.originalName) || 'תמונה מתוך הזרם';
  const currentCaption = publicMediaCaption(current?.legacyPlacement?.originalCaption);
  const date = galleryImageDatePresentation(current);
  const numbers = [...new Set([current?.storedNumbers?.primary, ...(current?.storedNumbers?.all || [])])]
    .filter(n => Number.isSafeInteger(n) && n > 0).slice(0, 4);

  const synchronize = () => {
    const el = view.current;
    if (!el) return;
    const max = Math.max(0, el.scrollHeight - el.clientHeight);
    setRatio(max ? el.scrollTop / max : 0);
    const top = el.getBoundingClientRect().top;
    const index = items.findIndex(item => {
      const card = cards.current.get(item.galleryImageId);
      return card && card.getBoundingClientRect().bottom > top + 45;
    });
    setPosition(index < 0 ? Math.max(0, items.length - 1) : index);
  };
  const seek = value => {
    const el = view.current;
    if (!el) return;
    el.scrollTop = Number(value) / 100 * Math.max(0, el.scrollHeight - el.clientHeight);
    synchronize();
  };
  const jump = index => {
    const el = view.current, card = cards.current.get(items[index]?.galleryImageId);
    if (!el || !card) return;
    el.scrollTop += card.getBoundingClientRect().top - el.getBoundingClientRect().top - 12;
    synchronize();
  };
  const pointerSeek = event => {
    const bounds = event.currentTarget.getBoundingClientRect();
    seek(Math.max(0, Math.min(100, (event.clientY - bounds.top) / Math.max(1, bounds.height) * 100)));
  };
  useEffect(() => {
    const el = view.current;
    if (!el) return;
    el.scrollTop = 0;
    synchronize();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(synchronize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [items]); // Current-window progress only; never a persistent viewed/follow signal.

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
        <aside className="r29-detail" aria-label="הסיפור שבתמונה">
          <span className="r29-detail-label">מבט מקרוב</span><h3>{currentTitle}</h3>
          {date ? <p className="r29-date">עדכון במקור · <time dir="ltr" dateTime={date.dateTime}>{date.label}</time></p> : null}
          {currentCaption ? <p className="r29-description">{currentCaption}</p> : <p className="r29-description">התמונה פתוחה לעיון במקורה, עם הכיתובים וההקשר שנשמרו איתה.</p>}
          {numbers.length ? <><p className="r29-number-label">מספרים שסומנו במקור</p><div className="r29-numbers">{numbers.map(n =>
            <Link key={n} to={numberExpressionFocusHref(n)} aria-label={`לדף המספר ${n}`}><bdi>{n.toLocaleString('en-US')}</bdi> ↗</Link>)}</div></> : null}
          <Link className="r29-open" to={current.streamHref}>למקור ולהקשר ←</Link>
          <p className="r29-note">התיוגים במקור אינם כשלעצמם אימות חישוב או קשר בעץ.</p>
        </aside>
        <div className="r29-window" id={regionId} ref={view} onScroll={synchronize} tabIndex={0} role="region" aria-label="התמונות בזרם — אפשר לגלול">
          <div className="r29-thread" aria-hidden="true" />
          {items.map((item, index) => {
            const title = publicMediaTitle(item.legacyPlacement?.originalName) || 'תמונה מתוך הזרם';
            const authoredDate = galleryImageDatePresentation(item);
            const share = worldMediaPublicShare(item, { origin: typeof window !== 'undefined' ? window.location.origin : null });
            return <article key={item.galleryImageId} ref={el => { if (el) cards.current.set(item.galleryImageId, el); else cards.current.delete(item.galleryImageId); }}
              className={`r29-picture${index === position ? ' is-current' : ''}`} data-river-image={item.galleryImageId}>
              <Link to={item.streamHref} className="r29-picture-frame" aria-label={`פתיחת המקור: ${title}`}>
                <CanonicalMediaImage2029 item={item} alt={title} loading={index < 3 ? 'eager' : 'lazy'} />
                {authoredDate ? <time className="r29-image-date" dateTime={authoredDate.dateTime} dir="ltr" title="תאריך העדכון שנכתב במקור">{authoredDate.label}</time> : null}
              </Link><div className="r29-picture-meta"><p className="r29-picture-title">{title}</p>
                {share ? <ShareActions type="image" {...share} title={title} variant="icon" sourceSurface="home_reality_stream_2029" force /> : null}</div>
            </article>;
          })}
          <Link className="r29-end" to="/world?view=gallery&flow=1">יש עוד מה לגלות · לכל הגלריות ←</Link>
        </div>
        <div className="r29-rod"><span aria-hidden="true">תחילה</span><div className="r29-rail">
          <div className="r29-knob" style={{ top: `${ratio * 100}%` }} aria-hidden="true"><i /><i /><i /></div>
          <input type="range" min="0" max="100" step="0.1" value={ratio * 100}
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
      <p className="r29-note">חלון מתוך הזרם, לא כל הארכיון. ההתקדמות כאן מתארת גלילה בלבד.</p>
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
