import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { use2029Palette } from '../../lib/palette.js';
import { useSourceModel } from './yetzirahModels/useSourceModel.js';
import { componentSummary, DIRECTION_VECTORS, selectedComponent, sourcePayload } from './yetzirahModels/sourceModels.js';
import './depthsLearningWorkspace2029.css';

const ModelCanvas = lazy(() => import('./yetzirahModels/YetzirahModelCanvas.jsx'));
const PAIR_NAMES = ['ראשית ואחרית', 'טוב ורע', 'רום ותחת', 'מזרח ומערב', 'צפון ודרום'];

class CanvasBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function DepthsLearningWorkspace2029({ selectedId, onSelect, onRelation, onSource, page, renderSource }) {
  const { model, error, retry } = useSourceModel('ten-depths');
  const palette = use2029Palette();
  const root = useRef(null), start = useRef(null), heading = useRef(null), savedView = useRef(null);
  const [view, setView] = useState('model');
  const [opened, setOpened] = useState(false), [failed, setFailed] = useState(false);
  const [isolated, setIsolated] = useState(false), [rotate, setRotate] = useState(false);
  const [reduced, setReduced] = useState(true), [mobile, setMobile] = useState(false);
  const [revision, setRevision] = useState(0), [share, setShare] = useState(40);
  useEffect(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)'), compact = matchMedia('(max-width: 1000px)');
    const sync = () => { setReduced(motion.matches || Boolean(root.current?.closest('[data-frame-reduced-motion="true"]'))); setMobile(compact.matches); };
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['data-frame-reduced-motion'] });
    motion.addEventListener('change', sync); compact.addEventListener('change', sync); sync();
    return () => { observer.disconnect(); motion.removeEventListener('change', sync); compact.removeEventListener('change', sync); };
  }, []);
  useEffect(() => { if (reduced) setRotate(false); }, [reduced]);
  const active = model && (selectedComponent(model, selectedId) || model.components.find(c => c.id === 'up'));
  const invalidSelection = Boolean(model && selectedId && !selectedComponent(model, selectedId));
  const pairIndex = model && active ? model.relations.findIndex(r => r.from_id === active.id || r.to_id === active.id) : 0;
  const pair = model?.relations[pairIndex];
  const members = pair ? model.components.filter(c => c.id === pair.from_id || c.id === pair.to_id) : [];
  const spatial = Boolean(active && DIRECTION_VECTORS[active.id]);
  const select = c => { onSelect(c.stable_id); const relation = model.relations.find(r => r.from_id === c.id || r.to_id === c.id); onRelation(relation.stable_id); onSource(sourcePayload(model, c)); };
  const step = index => { const relation = model.relations[index]; select(model.components.find(c => c.id === relation.from_id)); };
  const showSource = () => { if (active) onSource(sourcePayload(model, active), true); setView('source'); };
  const returnToModel = async () => { if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen(); if(active) onSource(sourcePayload(model,active), true); setView('model'); requestAnimationFrame(() => heading.current?.focus()); };
  const close = () => { setOpened(false); setRotate(false); requestAnimationFrame(() => start.current?.focus()); };
  const style = { '--dw-source-share': `${share}%`, '--dw-panel': palette.card, '--dw-soft': palette.cardSoft, '--dw-ink': palette.ink, '--dw-muted': palette.inkSoft, '--dw-line': palette.borderStrong, '--dw-accent': palette.accentText, '--dw-focus': palette.focusRing, '--dw-discovery': palette.accentDiscovery, '--dw-depth': palette.accentSecondary };
  return <main ref={root} className="depths-workspace" style={style} data-mobile-view={view} dir="rtl" onKeyDown={event => { if (event.key === 'Escape' && opened) { event.stopPropagation(); close(); } }}>
    <header className="dw-heading">
      <div><span>ספר יצירה · הגוף המשולב · PDF 53</span><h1 ref={heading} tabIndex={-1}>לגלות את עשרת העומקים</h1><p>חמישה זוגות. בחרו כיוון, גלו את הזוג שלו וחזרו לדברי הספר.</p></div>
      <a href="/2029/control?surface=sefer-yetzirah-world&structure=sy-structure%3Aten-depths&page=53">לכל מבני הספר</a>
    </header>
    <nav className="dw-view-tabs" aria-label="מצבי הלימוד">{[['model','המבנה'],['explanation','ההסבר'],['source',`המקור · ${page}`]].map(([id,label]) => <button key={id} type="button" aria-pressed={view === id} onClick={() => id === 'source' ? showSource() : setView(id)}>{label}</button>)}</nav>
    {error && <p role="alert">נתוני המבנה לא נטענו. המקור נשאר פתוח. <button type="button" onClick={retry}>נסה שוב</button></p>}
    {invalidSelection && <p role="alert">העומק שבקישור אינו שייך למבנה הזה. <a href="/2029/control?surface=sefer-yetzirah-world&experience=depths&page=53">פתח את נקודת ההתחלה</a></p>}
    {!model && !error && <p role="status">פותחים את מפת העומקים…</p>}
    <div className="dw-workbench">
      <section className="dw-explore" aria-label="מרחב המבנה וההסבר">
        {model && !invalidSelection && <>
          <nav className="dw-journey" aria-label="חמשת זוגות העומקים">{model.relations.map((r,index) => <button type="button" key={r.stable_id} aria-pressed={pairIndex === index} onClick={() => step(index)}><small>{String(index + 1).padStart(2,'0')}</small><span>{PAIR_NAMES[index]}</span><i aria-hidden="true" /></button>)}</nav>
          <section className="dw-model-area" aria-label="ייצוג של מבנה הספר">
            <header className="dw-stage-heading"><div><span>{spatial ? 'כיווני החלל' : 'זוג מושגי בדברי הספר'}</span><h2>{PAIR_NAMES[pairIndex]}</h2></div><span>{pairIndex + 1} / 5 זוגות</span></header>
            <div className="dw-stage" data-pair-kind={spatial ? 'space' : 'reading'}>
              {!opened && spatial ? <div className="dw-invitation"><div className="dw-axis-mark" aria-hidden="true"><i /><i /><i /></div><h3>להיכנס אל המבנה</h3><p>שישה כיוונים בחלל. זוגות הזמן והערך מלווים אותם בקריאה.</p><button ref={start} type="button" onClick={() => { setFailed(false); setOpened(true); }}>פתח את המרחב בתלת־ממד</button></div> : <>
                {opened && (!mobile || view === 'model') && !failed && <CanvasBoundary onFailure={() => setFailed(true)}><Suspense fallback={<p role="status">פותחים את המרחב…</p>}><ModelCanvas model={model} selectedId={active.stable_id} onSelect={id => { const c = selectedComponent(model,id); if(c) select(c); }} palette={palette} reducedMotion={reduced} rotate={rotate && !reduced} isolated={isolated} focusIds={members.map(c => c.stable_id)} framing="learning" viewRevision={revision} savedViewRef={savedView} onUnavailable={() => setFailed(true)} /></Suspense></CanvasBoundary>}
                {opened && failed && <div className="dw-fallback" role="status"><h3>ממשיכים לקרוא ולבחור</h3><p>התלת־ממד אינו זמין במכשיר הזה. חמשת הזוגות, ההסבר והמקור נשארים כאן.</p></div>}
                {!spatial && <div className="dw-concept-pair"><span>זוג קריאה · ללא ציר פיזי</span><strong>{members.map(c => c.label_he).join(' ↔ ')}</strong><p>{pair.explanation_he}</p></div>}
              </>}
              {opened && <div className="dw-stage-caption" aria-live="polite"><span>הבחירה שלך</span><strong>{active.label_he}</strong><span>{spatial ? `בזוג ${PAIR_NAMES[pairIndex]}` : 'מופיע בקריאה, ללא כיוון בחלל'}</span></div>}
            </div>
            <div className="dw-tools">{opened && <><button type="button" aria-pressed={isolated} onClick={() => setIsolated(value => !value)}>מיקוד בזוג</button><button type="button" onClick={() => { setRevision(value => value + 1); setIsolated(false); setRotate(false); }}>מבט התחלתי</button><button type="button" disabled={reduced || failed} aria-pressed={rotate} onClick={() => setRotate(value => !value)}>סיבוב עדין</button><button ref={start} type="button" onClick={close}>סגור תלת־ממד</button></>}</div>
            <nav className="dw-components" aria-label="בחירת עומק בזוג">{members.map(c => <button type="button" key={c.stable_id} data-depth-id={c.id} aria-pressed={active.id === c.id} onClick={() => select(c)}>{c.label_he}</button>)}</nav>
          </section>
          <article className="dw-explanation" aria-live="polite"><div><span>הסבר נלווה · הבחירה הנוכחית</span><h2>{active.label_he}</h2><p>{componentSummary(model,active)}</p><p>{spatial ? 'בחרו את העומק שמולו, או התמקדו בזוג כדי לראות את היחס ביניהם. הכיוונים שייכים למקור; המרחקים והצבע הם אמצעי המחשה.' : 'הזוג מתאר זמן או ערך. הוא נשאר חלק מרשימת עשרת העומקים, ומוצג כאן בקריאה לצד שלושת זוגות הכיוונים.'}</p></div><div className="dw-counterpart"><span>העומק שכנגדו</span><button type="button" onClick={() => select(members.find(c => c.id !== active.id))}>{members.find(c => c.id !== active.id)?.label_he} <b aria-hidden="true">↔</b></button><button type="button" onClick={showSource}>קרא את המקור · PDF {active.source.pdf_page}</button></div></article>
          <nav className="dw-step-nav" aria-label="התקדמות בלימוד"><button type="button" disabled={pairIndex === 0} onClick={() => step(pairIndex - 1)}>הזוג הקודם</button><span>{pairIndex + 1} מתוך 5</span><button type="button" disabled={pairIndex === 4} onClick={() => step(pairIndex + 1)}>הזוג הבא</button></nav>
          <details className="dw-source-details"><summary>פרטי המקור וההמחשה</summary><p>דברי הספר · תקציר: {model.passageSummary}</p><p>{model.editorial}</p><p>המחשה והסבר נלווה. אין סימון של אימות מנוע.</p></details>
        </>}
      </section>
      <div className="dw-source-column"><div className="dw-source-caption"><span>המקור לצד כל בחירה</span><button type="button" onClick={() => view === 'source' ? returnToModel() : showSource()}>{view === 'source' ? 'חזרה למבנה' : 'הרחב מקור'}</button></div>{renderSource(returnToModel, mobile && view !== 'source', showSource, mobile)}</div>
    </div>
    <label className="dw-split">חלוקת המסך · {share}% מקור <input type="range" min="32" max="48" value={share} onChange={event => setShare(Number(event.target.value))} /><span>{100-share}% מרחב</span></label>
  </main>;
}
