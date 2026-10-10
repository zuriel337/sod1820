import React, { lazy, Suspense, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { expressionOccurrences, boundaryAnchor } from '../../lib/spatial/glyphGeometry.js';
import { useThemePreset } from '../../lib/themeMode.js';
import { resolveExperienceContext, SPATIAL_LEVEL } from '../../lib/experienceContext.js';
import './spatialGlyphScene2029.css';
import NavigationIcon2029 from './NavigationIcon2029.jsx';

const GlyphVolume = lazy(()=>import('./GlyphVolume2029.jsx'));
class VolumeBoundary extends React.Component {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(){this.props.onUnavailable();}
  render(){return this.state.failed?null:this.props.children;}
}
export function GlyphOutline2029({ geometry, className='', painted=false, connector=false }) {
  const id=useId().replace(/:/g,'');
  if(!geometry)return null;
  const [x0,y0,x1,y1]=geometry.bounds, pad=18;
  const anchor=connector?boundaryAnchor(geometry,[0,-1]):null;
  return <svg className={`sod29-glyph-outline ${className}`} viewBox={`${x0-pad} ${-y1-pad} ${x1-x0+pad*2} ${y1-y0+pad*2+(connector?100:0)}`} aria-hidden="true" focusable="false">
    {painted&&<defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--s29-discovery)"/><stop offset=".42" stopColor="var(--s29-accent)"/><stop offset="1" stopColor="var(--s29-accent-secondary)"/></linearGradient></defs>}
    <path d={geometry.path} transform="scale(1,-1)" fill={painted?`url(#${id})`:'currentColor'} fillRule="evenodd" />
    {anchor&&<path d={`M${anchor[0]} ${-anchor[1]} v90`} stroke="var(--s29-discovery)" strokeWidth="4" fill="none"/>}
  </svg>;
}
export default function SpatialGlyphScene2029({ expression, selectedIndex, onSelect, expansion=null, children, surface='journey', label='מרחב האותיות' }) {
  const root=useRef(null), theme=useThemePreset(), sceneId=useId();
  const occurrences=useMemo(()=>expressionOccurrences(expression),[expression]);
  const [localIndex,setLocalIndex]=useState(0),[open,setOpen]=useState(false),[gpu,setGpu]=useState(false),[ready,setReady]=useState(false),[failed,setFailed]=useState(false),[reduced,setReduced]=useState(true),[view,setView]=useState('depth');
  const index=Math.min(Math.max(selectedIndex??localIndex,0),Math.max(occurrences.length-1,0));
  const focus=occurrences[index], geometry=focus?.geometry;
  useEffect(()=>{setLocalIndex(0);setOpen(false);},[expression]);
  useEffect(()=>{setOpen(false);},[index]);
  useEffect(()=>{
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    const read=()=>setReduced(media.matches || !!root.current?.closest('[data-frame-reduced-motion="true"]') || navigator.connection?.saveData===true);
    read(); media.addEventListener('change',read);
    const observer=new MutationObserver(read); observer.observe(document.documentElement,{attributes:true,subtree:true,attributeFilter:['data-frame-reduced-motion']});
    return ()=>{media.removeEventListener('change',read);observer.disconnect();};
  },[]);
  useEffect(()=>{
    const focus=(event)=>{if(event.detail!==sceneId){setGpu(false);setReady(false);}};
    window.addEventListener('sod-spatial-focus',focus);
    return ()=>window.removeEventListener('sod-spatial-focus',focus);
  },[sceneId]);
  const unavailable=useCallback(()=>{setFailed(true);setReady(false);},[]);
  const loaded=useCallback(()=>setReady(true),[]);
  const select=(i)=>{if(onSelect)onSelect(i);else setLocalIndex(i);setOpen(false);};
  const parts=useMemo(()=>expressionOccurrences(expansion||''),[expansion]);
  if(!focus)return null;
  const policy=resolveExperienceContext({surface,requestedSpatialLevel:SPATIAL_LEVEL.S4,reducedMotion:reduced,capabilities:{webgl:!failed,slowNetwork:typeof navigator!=='undefined'&&['slow-2g','2g'].includes(navigator.connection?.effectiveType)}});
  const volumeAllowed=policy.spatial.effectiveLevel===SPATIAL_LEVEL.S4;
  const canGPU=gpu&&volumeAllowed&&!failed&&!!geometry;
  const anchor=boundaryAnchor(geometry,[0,-1]);
  return <section ref={root} className="sod29-glyph-scene" aria-label={label} data-renderer={canGPU&&ready?'gpu':'outline'} data-occurrence={focus.id} data-open={open}>
    <header><div><span className="sod29-glyph-kicker">אות · צורה · עומק</span><h3>{expression}</h3></div><span className="sod29-glyph-count">{index+1} / {occurrences.length}</span></header>
    <div className="sod29-glyph-stage">
      <div className="sod29-glyph-halo" aria-hidden="true" />
      <div className={`sod29-glyph-flat ${canGPU&&ready?'is-covered':''}`}>
        {geometry?<GlyphOutline2029 geometry={geometry} painted connector={open}/>:<span className="sod29-glyph-native">{focus.grapheme}</span>}
      </div>
      {canGPU&&<VolumeBoundary onUnavailable={unavailable}><Suspense fallback={null}><GlyphVolume geometry={geometry} reveal={open} view={view} theme={theme} onUnavailable={unavailable} onReady={loaded}/></Suspense></VolumeBoundary>}
      <div className="sod29-glyph-stage-caption"><span>אות {focus.grapheme}</span><span>{canGPU&&ready?'אפשר לסובב בעדינות':open?'מבט פנימה':'בחרו אות והעמיקו בה'}</span></div>
    </div>
    <div className="sod29-glyph-picker" aria-label="בחירת אות">
      {occurrences.map((item,i)=><button type="button" key={item.id} aria-label={`אות ${item.grapheme}, מיקום ${i+1}`} aria-pressed={i===index} onClick={()=>select(i)}>{item.geometry?<GlyphOutline2029 geometry={item.geometry}/>:item.grapheme}</button>)}
    </div>
    <div className="sod29-glyph-controls">
      {!!parts.length&&<button type="button" aria-expanded={open} onClick={()=>setOpen(x=>!x)}><NavigationIcon2029 name="milui" size={20}/>{open?'סגירת המילוי':'פתיחת המילוי'}</button>}
      {volumeAllowed&&geometry&&!failed&&<button type="button" aria-pressed={gpu} onClick={()=>{if(!gpu)window.dispatchEvent(new CustomEvent('sod-spatial-focus',{detail:sceneId}));setGpu(x=>!x);setReady(false);}}><NavigationIcon2029 name={gpu?'front':'depth'} size={20}/>{gpu?'תצוגה שטוחה':'הפעלת תלת־ממד'}</button>}
      {canGPU&&<button type="button" onClick={()=>setView(x=>x==='front'?'depth':'front')}><NavigationIcon2029 name={view==='front'?'rotate':'front'} size={20}/>{view==='front'?'מבט עומק':'מבט חזית'}</button>}
    </div>
    {failed&&<p className="sod29-glyph-note" role="status">תצוגת העומק אינה זמינה כרגע. האותיות והפעולות זמינות בתצוגה השטוחה.</p>}
    {open&&parts.length>0&&<div className="sod29-glyph-expansion" data-anchor={anchor?.join(',')}><span className="sod29-glyph-connector" aria-hidden="true"/><p>{focus.grapheme} ← {expansion}</p><div>{parts.map(part=><span key={part.id}>{part.geometry?<GlyphOutline2029 geometry={part.geometry} painted/>:part.grapheme}</span>)}</div>{children}</div>}
  </section>;
}
