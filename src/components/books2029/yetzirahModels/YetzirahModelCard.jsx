import React,{Suspense,lazy,useEffect,useId,useRef,useState} from 'react';
import {use2029Palette} from '../../../lib/palette.js';
import {useSourceModel} from './useSourceModel.js';
import {selectedComponent,sourcePayload,componentSummary} from './sourceModels.js';
import './yetzirahModels.css';
const ModelCanvas=lazy(()=>import('./YetzirahModelCanvas.jsx'));
const ACTIVATION='yetzirah-model-explicit-activation';
function useReducedMotion(root,override,ready){
  const [reduced,setReduced]=useState(false);
  useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');const sync=()=>setReduced(media.matches||root.current?.closest('[data-frame-reduced-motion]')?.getAttribute('data-frame-reduced-motion')==='true');sync();media.addEventListener('change',sync);const observer=new MutationObserver(sync);observer.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['data-frame-reduced-motion']});return()=>{media.removeEventListener('change',sync);observer.disconnect();};},[root,ready]);
  return Boolean(override||reduced);
}
class GpuBoundary extends React.Component {
  state={failed:false};static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<p role="status">ההמחשה הגרפית אינה זמינה. הבחירה, ההסבר והמקור נשארים פתוחים.</p>:this.props.children;}
}
export default function YetzirahModelCard({modelKey,sourceBundle,selectedId,onSelect,onOpenSource,reducedMotion=false}){
  const {model,error,retry}=useSourceModel(modelKey,sourceBundle),palette=use2029Palette();
  const root=useRef(null),start=useRef(null),instance=useId();
  const [internal,setInternal]=useState(null),[open,setOpen]=useState(false),[gpuError,setGpuError]=useState(null),[rotate,setRotate]=useState(false),[isolated,setIsolated]=useState(false);
  const reduced=useReducedMotion(root,reducedMotion,Boolean(model));
  const active=model?selectedComponent(model,selectedId===undefined?(internal||model.components[0].stable_id):selectedId):null;
  useEffect(()=>{const other=e=>{if(e.detail!==instance){setOpen(false);setRotate(false);}};document.addEventListener(ACTIVATION,other);return()=>document.removeEventListener(ACTIVATION,other);},[instance]);
  useEffect(()=>{if(reduced)setRotate(false);},[reduced]);
  const select=c=>{setInternal(c.stable_id);onSelect?.(c.stable_id,sourcePayload(model,c));};
  const close=()=>{setOpen(false);setRotate(false);start.current?.focus();};
  const begin=()=>{document.dispatchEvent(new CustomEvent(ACTIVATION,{detail:instance}));setGpuError(null);setRotate(false);setOpen(true);};
  const style={'--ym-surface':palette.card,'--ym-soft':palette.cardSoft,'--ym-ink':palette.ink,'--ym-muted':palette.inkSoft,'--ym-line':palette.borderStrong,'--ym-action':palette.accentText,'--ym-focus':palette.focusRing,'--ym-depth':palette.accentSecondary,'--ym-discovery':palette.accentDiscovery};
  if(error)return <section className="ym-model" style={style} dir="rtl"><p role="alert">נתוני המקור אינם זמינים או שמראה המקום אינו תואם. אין המחשה ללא מקור מזוהה.</p><button onClick={retry}>נסה שוב</button><details><summary>פרטי המקור</summary><code>{error}</code></details></section>;
  if(!model)return <section className="ym-model" style={style} dir="rtl"><p role="status">טוען את מבנה המקור…</p></section>;
  const openSource=(c,relation)=>onOpenSource?.(sourcePayload(model,c,relation));
  function sourceAction(c,relation=null){const s=relation?.source||c.source;return onOpenSource?<button type="button" onClick={()=>openSource(c,relation)}>פתח את עמוד המקור {s.pdf_page}</button>:<a href={`${model.pdfUrl}${s.source_anchor}`} target="_blank" rel="noreferrer">פתח את עמוד המקור {s.pdf_page}</a>;}
  return <section ref={root} className="ym-model" style={style} dir="rtl" data-yetzirah-model={modelKey} data-selected-id={active?.stable_id||''} data-motion-reduced={String(reduced)} onKeyDown={e=>{if(e.key==='Escape'&&open){e.stopPropagation();close();}}} aria-labelledby={`${instance}-title`}>
    <header className="ym-heading"><span>ייצוג של מבנה הספר</span><h2 id={`${instance}-title`}>{model.title}</h2><p>{model.legend}</p></header>
    <div className="ym-toolbar"><button ref={start} type="button" aria-expanded={open} aria-controls={`${instance}-stage`} onClick={open?close:begin}>{open?'סגור את ההמחשה':'פתח המחשה בתלת־ממד'}</button>{open&&<><button type="button" aria-pressed={rotate} disabled={reduced||Boolean(gpuError)} onClick={()=>setRotate(v=>!v)}>סיבוב עדין</button><button type="button" aria-pressed={isolated} onClick={()=>setIsolated(v=>!v)}>בודד את הבחירה</button></>}</div>
    {open&&<div id={`${instance}-stage`} className="ym-stage" data-gpu-state={gpuError?'unavailable':'active'}>{gpuError?<p role="status">ההמחשה הגרפית אינה זמינה. אפשר לבחור ברשימה, לקרוא את ההסבר ולפתוח את המקור.</p>:<GpuBoundary><Suspense fallback={<p role="status">פותח את ההמחשה…</p>}><ModelCanvas model={model} selectedId={active?.stable_id} onSelect={id=>{const c=selectedComponent(model,id);if(c)select(c);}} palette={palette} reducedMotion={reduced} rotate={rotate&&!reduced} isolated={isolated} onUnavailable={reason=>{setGpuError(reason);setRotate(false);}} /></Suspense></GpuBoundary>}</div>}
    <div className="ym-reading-grid"><nav className="ym-components" aria-label="בחירת רכיב במודל">{model.components.map(c=><button key={c.stable_id} type="button" data-component-id={c.stable_id} aria-pressed={active?.stable_id===c.stable_id} onClick={()=>select(c)}><strong>{c.label_he}</strong>{c.seal_letters&&<bdi className="ym-seal" dir="rtl" data-seal-letters={c.seal_letters.join('')}>{c.seal_letters.join('')}</bdi>}</button>)}</nav>
    <article className="ym-selection" aria-live="polite" aria-atomic="true">{active?<><span>הרכיב הנבחר</span><h3>{active.label_he}</h3>{active.seal_letters&&<bdi className="ym-seal ym-seal-large" dir="rtl">{active.seal_letters.join('')}</bdi>}<span>דברי הספר · תקציר</span><p>{componentSummary(model,active)}</p><span>הסבר נלווה</span><p>הכיוון והחותם שייכים למקור המסוים הזה. נקודת המבט, הצבע והמרחק משמשים להמחשה בלבד.</p>{sourceAction(active)}</>:<p>בחרו רכיב מן הרשימה כדי לקרוא את ההסבר ולפתוח את מקורו.</p>}</article></div>
    <details className="ym-legend" open><summary>מקרא · הספר וההמחשה</summary><p>{model.editorial}</p><p>הצבע והאור מדגישים בחירה בלבד. אין להם משמעות של אימות, מדרגה או חשיבות במקור.</p></details>
    {model.relations.length>0&&<details className="ym-relations"><summary>הקשרים שמציג המקור</summary>{model.relations.map(r=><article key={r.stable_id} data-relation-id={r.stable_id}><p>{r.explanation_he}</p>{sourceAction(active||model.components[0],r)}</article>)}</details>}
    <details className="ym-provenance"><summary>פרטי המקור</summary><p>מזהה המבנה: <bdi dir="ltr">{model.id}</bdi></p><p>עמוד PDF {model.page} · נוסח המקור נשמר בנפרד מבחירות ההמחשה.</p>{active&&<p><bdi dir="ltr">{active.source.source_ref}</bdi></p>}<p>חומר מקור והסבר נלווה. לא בוצעה בדיקת מנוע.</p></details>
  </section>;
}
