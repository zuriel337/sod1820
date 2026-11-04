import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { use2029Palette } from '../../lib/palette.js';
import { useSourceModel } from './yetzirahModels/useSourceModel.js';
import { componentSummary, DIRECTION_VECTORS, selectedComponent, sourcePayload } from './yetzirahModels/sourceModels.js';
import { DEPTHS_GUIDE } from './depthsLearningGuide2029.js';
import { DEPTHS_DEFAULT_READING } from './tenDepthsReadingDepthData2029.js';
import './depthsLearningWorkspace2029.css';

const ModelCanvas = lazy(() => import('./yetzirahModels/YetzirahModelCanvas.jsx'));
const ReadingDepth = lazy(() => import('./TenDepthsReadingDepth2029.jsx'));
const PAIR_NAMES = ['ראשית ואחרית', 'טוב ורע', 'רום ותחת', 'מזרח ומערב', 'צפון ודרום'];

class CanvasBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure?.(); }
  render() { return this.state.failed ? this.props.fallback||null : this.props.children; }
}

export default function DepthsLearningWorkspace2029({ selectedId, onSelect, onRelation, onSource, page, renderSource }) {
  const { model, error, retry, bundle } = useSourceModel('ten-depths');
  const palette = use2029Palette();
  const root = useRef(null), start = useRef(null), heading = useRef(null), savedView = useRef(null);
  const [view, setView] = useState(() => typeof window!=='undefined'&&new URLSearchParams(window.location.search).has('reading')?'reading':'model');
  const [readingId,setReadingId] = useState(() => typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('reading')||DEPTHS_DEFAULT_READING);
  const [readingReturnRevision,setReadingReturnRevision] = useState(0);
  const returnView = useRef(typeof window!=='undefined'&&new URLSearchParams(window.location.search).has('reading')?'reading':'model');
  const [opened, setOpened] = useState(false), [failed, setFailed] = useState(false);
  const [isolated, setIsolated] = useState(false), [rotate, setRotate] = useState(false);
  const [reduced, setReduced] = useState(true), [mobile, setMobile] = useState(false);
  const [revision, setRevision] = useState(0), [share, setShare] = useState(40);
  const [guided, setGuided] = useState(false), [zoom, setZoom] = useState(0);
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
  const guide = DEPTHS_GUIDE[pairIndex];
  const revealed = guided && model ? model.relations.slice(2, pairIndex + 1).flatMap(r => model.components.filter(c => c.id === r.from_id || c.id === r.to_id).map(c => c.stable_id)) : null;
  const select = c => { onSelect(c.stable_id); const relation = model.relations.find(r => r.from_id === c.id || r.to_id === c.id); onRelation(relation.stable_id); onSource(sourcePayload(model, c)); };
  const step = index => { const relation = model.relations[index]; select(model.components.find(c => c.id === relation.from_id)); };
  const chooseReading = id => { setReadingId(id); const url=new URL(window.location.href);url.searchParams.set('reading',id);window.history.replaceState({},'',`${url.pathname}${url.search}${url.hash}`); };
  const changeView = nextView => { if(nextView==='reading')chooseReading(readingId);else {const url=new URL(window.location.href);url.searchParams.delete('reading');window.history.replaceState({},'',`${url.pathname}${url.search}${url.hash}`);}returnView.current=nextView==='reading'?'reading':'model';setView(nextView); };
  const showSource = () => { returnView.current=view==='reading'?'reading':'model';if (active) onSource(sourcePayload(model, active), true); setView('source'); };
  const showReadingSource = reading => { chooseReading(reading.id);returnView.current='reading';onSource({source:reading.source},true);setView('source'); };
  const returnToModel = async () => { if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen(); if(active) onSource(sourcePayload(model,active), true); if(returnView.current==='reading')setReadingReturnRevision(value=>value+1);setView(returnView.current); requestAnimationFrame(() => {const target=returnView.current==='reading'?root.current?.querySelector('.dw-printed-reading h3'):heading.current;target?.focus();}); };
  const close = () => { setOpened(false); setRotate(false); requestAnimationFrame(() => start.current?.focus()); };
  const style = { '--dw-source-share': `${share}%`, '--dw-panel': palette.card, '--dw-soft': palette.cardSoft, '--dw-ink': palette.ink, '--dw-muted': palette.inkSoft, '--dw-line': palette.borderStrong, '--dw-accent': palette.accentText, '--dw-focus': palette.focusRing, '--dw-discovery': palette.accentDiscovery, '--dw-depth': palette.accentSecondary, '--dw-warm': palette.warmAccent };
  return <main ref={root} className="depths-workspace" style={style} data-mobile-view={view} dir="rtl" onKeyDown={event => { if (event.key === 'Escape' && opened) { event.stopPropagation(); close(); } }}>
    <header className="dw-heading">
      <div><span>ספר יצירה · הגוף המשולב · PDF 53</span><h1 ref={heading} tabIndex={-1}>לגלות את עשרת העומקים</h1><p>מהרשימה שבספר אל חקירה של זמן, ערך וכיווני המרחב.</p></div>
      <a href="/2029/control?surface=sefer-yetzirah-world&structure=sy-structure%3Aten-depths&page=53">לכל מבני הספר</a>
    </header>
    <nav className="dw-view-tabs" aria-label="מצבי הלימוד">{[['model','המבנה'],['explanation','ההסבר'],['reading','קריאת עומק'],['source',`המקור · ${page}`]].map(([id,label]) => <button key={id} type="button" aria-pressed={view === id} onClick={() => id === 'source' ? showSource() : changeView(id)}>{label}</button>)}</nav>
    {error && <p role="alert">נתוני המבנה לא נטענו. המקור נשאר פתוח. <button type="button" onClick={retry}>נסה שוב</button></p>}
    {invalidSelection && <p role="alert">העומק שבקישור אינו שייך למבנה הזה. <a href="/2029/control?surface=sefer-yetzirah-world&experience=depths&page=53">פתח את נקודת ההתחלה</a></p>}
    {!model && !error && <p role="status">פותחים את מפת העומקים…</p>}
    <div className="dw-workbench">
      <section className="dw-explore" aria-label="מרחב המבנה וההסבר">
        {model && !invalidSelection && <>
          <div className="dw-learning-mode" aria-label="בחירת דרך הלימוד"><div><span>לבחור איך לגלות</span><p>{view==='reading'?'קריאת עומק · המשנה והפירושים המודפסים':guided ? 'מסלול מודרך · זוג אחר זוג, בסדר המקור' : 'חקירה חופשית · כל הכיוונים, כל זוג לבחירתכם'}</p></div><div><button type="button" aria-pressed={guided&&view!=='reading'} onClick={() => { setGuided(true); setIsolated(false); setZoom(0); step(0); changeView('model'); }}>התחל מסלול מודרך</button><button type="button" aria-pressed={!guided&&view!=='reading'} onClick={() => {setGuided(false);changeView('model');}}>חקירה חופשית</button><button type="button" aria-pressed={view==='reading'} onClick={()=>changeView(view==='reading'?'model':'reading')}>קריאת עומק ופירושים</button></div></div>
          {view==='reading' && <CanvasBoundary fallback={<section role="alert"><p>קריאת העומק אינה זמינה כרגע. המקור נשאר נגיש.</p><button type="button" onClick={()=>changeView('model')}>חזרה למבנה</button></section>}><Suspense fallback={<p role="status">פותחים את קריאת העומק…</p>}><ReadingDepth bundle={bundle} model={model} selectedId={active.stable_id} readingId={readingId} focusRevision={readingReturnRevision} onReading={chooseReading} onComponent={select} onSource={showReadingSource} onModel={c=>{select(c);changeView('model');}} /></Suspense></CanvasBoundary>}
          <nav className="dw-journey" aria-label="חמשת זוגות העומקים">{model.relations.map((r,index) => <button type="button" key={r.stable_id} aria-pressed={pairIndex === index} onClick={() => step(index)}><small>{String(index + 1).padStart(2,'0')}</small><span>{PAIR_NAMES[index]}</span><i aria-hidden="true" /></button>)}</nav>
          <section className="dw-model-area" aria-label="ייצוג של מבנה הספר">
            <header className="dw-stage-heading"><div><span>ייצוג של מבנה הספר · {spatial ? 'כיווני החלל' : 'זוג לקריאה'}</span><h2>{PAIR_NAMES[pairIndex]}</h2></div><span className="dw-stage-index"><b>{String(pairIndex + 1).padStart(2,'0')}</b> מתוך 05</span></header>
            <div className="dw-stage" data-pair-kind={spatial ? 'space' : 'reading'}>
              {!opened && spatial ? <div className="dw-invitation"><div className="dw-axis-mark" aria-hidden="true"><i /><i /><i /></div><h3>להיכנס אל המבנה</h3><p>שישה כיוונים בחלל. זוגות הזמן והערך מלווים אותם בקריאה.</p><button ref={start} type="button" onClick={() => { setFailed(false); setOpened(true); }}>פתח את המרחב בתלת־ממד</button></div> : <>
                {opened && spatial && view!=='reading' && (!mobile || view === 'model') && !failed && <CanvasBoundary onFailure={() => setFailed(true)}><Suspense fallback={<p role="status">פותחים את המרחב…</p>}><ModelCanvas model={model} selectedId={active.stable_id} onSelect={id => { const c = selectedComponent(model,id); if(c) select(c); }} palette={palette} reducedMotion={reduced} rotate={rotate && !reduced} isolated={isolated} focusIds={members.map(c => c.stable_id)} revealedIds={revealed} cameraPair={pairIndex} viewZoom={zoom} framing="learning" viewRevision={revision} savedViewRef={savedView} onUnavailable={() => setFailed(true)} /></Suspense></CanvasBoundary>}
                {opened && failed && <div className="dw-fallback" role="status"><h3>ממשיכים לקרוא ולבחור</h3><p>התלת־ממד אינו זמין במכשיר הזה. חמשת הזוגות, ההסבר והמקור נשארים כאן.</p></div>}
                {!spatial && <div className="dw-concept-pair"><span>זוג קריאה · ללא ציר פיזי</span><div className="dw-concept-choices">{members.map(c => <button type="button" key={c.id} aria-pressed={c.id===active.id} onClick={()=>select(c)}>{c.label_he}</button>)}</div><p>{pair.explanation_he}</p></div>}
              </>}
              {opened && <div className="dw-stage-caption" aria-live="polite"><span>הבחירה שלך</span><strong>{active.label_he}</strong><span>{spatial ? `בזוג ${PAIR_NAMES[pairIndex]}` : 'מופיע בקריאה, ללא כיוון בחלל'}</span></div>}
            </div>
            <div className="dw-tools">{opened && spatial && <><button type="button" aria-pressed={isolated} onClick={() => setIsolated(value => !value)}>מיקוד בזוג</button><button type="button" onClick={() => { setRevision(value => value + 1); setZoom(0); setIsolated(false); setRotate(false); }}>מבט התחלתי</button><button type="button" disabled={reduced || failed} aria-pressed={rotate} onClick={() => setRotate(value => !value)}>סיבוב עדין</button><button type="button" disabled={zoom>=3||failed} aria-label="התקרב למבנה" onClick={()=>setZoom(value=>value+1)}>+</button><button type="button" disabled={zoom<=-2||failed} aria-label="התרחק מהמבנה" onClick={()=>setZoom(value=>value-1)}>−</button><button ref={start} type="button" onClick={close}>סגור תלת־ממד</button></>}</div>
            {spatial && <div className="dw-encoding" aria-label="מקרא ההמחשה"><span><i className="dw-key-selected" />הבחירה</span><span><i className="dw-key-pair" />בן הזוג</span><span><i className="dw-key-rest" />יתר הכיוונים</span><p>גררו לסיבוב · בחרו רכיב או השתמשו בכפתורים</p></div>}
            <nav className="dw-components" aria-label="בחירת עומק בזוג">{members.map(c => <button type="button" key={c.stable_id} data-depth-id={c.id} aria-pressed={active.id === c.id} onClick={() => select(c)}>{c.label_he}</button>)}</nav>
          </section>
          <section className="dw-guide-card" aria-label="מדריך התחנה"><div><span>הסבר נלווה · תחנה {pairIndex+1}</span><h2>{guide.title}</h2><p>{guide.explanation}</p></div><aside><span>לנסות עכשיו</span><p>{guide.question}</p><button type="button" onClick={showSource}>התבוננו בפסקת המקור</button></aside>{guided && <nav className="dw-tour-nav" aria-label="ניווט במסלול המודרך"><button type="button" disabled={pairIndex===0} onClick={()=>step(pairIndex-1)}>התחנה הקודמת</button><span>{pairIndex+1} מתוך 5 תחנות</span><button type="button" disabled={pairIndex===4} onClick={()=>step(pairIndex+1)}>לתחנה הבאה</button></nav>}</section>
          <article className="dw-explanation" aria-live="polite"><div><span>הסבר נלווה · הבחירה הנוכחית</span><h2>{active.label_he}</h2><p>{componentSummary(model,active)}</p><p>{spatial ? 'בחרו את העומק שמולו, או התמקדו בזוג כדי לראות את היחס ביניהם. הכיוונים שייכים למקור; המרחקים והצבע הם אמצעי המחשה.' : 'הזוג מתאר זמן או ערך. הוא נשאר חלק מרשימת עשרת העומקים, ומוצג כאן בקריאה לצד שלושת זוגות הכיוונים.'}</p></div><div className="dw-counterpart"><span>העומק שכנגדו</span><button type="button" onClick={() => select(members.find(c => c.id !== active.id))}>{members.find(c => c.id !== active.id)?.label_he} <b aria-hidden="true">↔</b></button><button type="button" onClick={showSource}>קרא את המקור · PDF {active.source.pdf_page}</button></div></article>
          <nav className="dw-step-nav" aria-label="התקדמות בלימוד"><button type="button" disabled={pairIndex === 0} onClick={() => step(pairIndex - 1)}>הזוג הקודם</button><span>{pairIndex + 1} מתוך 5</span><button type="button" disabled={pairIndex === 4} onClick={() => step(pairIndex + 1)}>הזוג הבא</button></nav>
          <details className="dw-source-details"><summary>פרטי המקור וההמחשה</summary><p>דברי הספר · תקציר: {model.passageSummary}</p><p>{model.editorial}</p><p>צבע הבחירה מסמן את הרכיב הנבחר; צבע העומק המשני מסמן את בן הזוג; יתר הכיוונים בגוון חם. הטבעות ומשטח הרקע הם אמצעי התמצאות, ללא יחידת מידה או משמעות נוספת במקור. הגודל, התאורה, התנועה וזווית המצלמה הם בחירות המחשה, לא דירוג.</p><p>המחשה והסבר נלווה. אין סימון של אימות מנוע.</p></details>
        </>}
      </section>
      <div className="dw-source-column"><div className="dw-source-caption"><span>המקור לצד כל בחירה</span><button type="button" onClick={() => view === 'source' ? returnToModel() : showSource()}>{view === 'source' ? returnView.current==='reading'?'חזרה לקריאת העומק':'חזרה למבנה' : 'הרחב מקור'}</button></div>{renderSource(returnToModel, mobile && view !== 'source', showSource, mobile)}</div>
    </div>
    <label className="dw-split">חלוקת המסך · {share}% מקור <input type="range" min="32" max="48" value={share} onChange={event => setShare(Number(event.target.value))} /><span>{100-share}% מרחב</span></label>
  </main>;
}
