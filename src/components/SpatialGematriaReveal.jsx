import React, { useEffect, useMemo, useRef, useState } from "react";
import { openNumberDrawer } from "../lib/numberDrawer.js";

// SpatialResearchScene v1, kept on the existing component path to preserve the
// already-live post marker integration. This is a presentation layer only.
// Research truth remains in canonical engines / Research OS.

const STAGES = ["whole", "outer", "outerDone", "inner", "innerDone", "cross"];
const DWELL = { whole: 650, outer: 1300, outerDone: 750, inner: 1050, innerDone: 900 };

const CSS = `
.srs{--blue:#68c8ff;--blue2:#bfeaff;--gold:#f0c95f;--gold2:#ffe9a9;--text:#f3eee1;--muted:#b6ad9d;
  max-width:680px;margin:24px auto;padding:18px 12px 16px;border:1px solid rgba(216,181,66,.34);border-radius:22px;
  background:radial-gradient(120% 100% at 50% 0%,rgba(38,29,78,.9),rgba(9,7,20,.98) 72%);color:var(--text);direction:rtl;text-align:center;overflow:hidden}
.srs-kick{font-size:12px;letter-spacing:.13em;opacity:.62}.srs-title{font-size:clamp(22px,5.8vw,30px);font-weight:900;margin:5px 0 3px}
.srs-sub{font-size:clamp(13px,3.6vw,15px);line-height:1.55;opacity:.76;max-width:500px;margin:0 auto 10px}
.srs-stage{position:relative;max-width:520px;margin:8px auto 6px;min-height:330px;perspective:1000px}
.srs-main,.srs-inner-plane{transition:transform .7s cubic-bezier(.22,.61,.36,1),opacity .7s ease,filter .7s ease;transform-style:preserve-3d}
.srs-main{position:relative;padding:22px 8px 16px;z-index:2}.srs[data-stage="inner"] .srs-main,.srs[data-stage="innerDone"] .srs-main,.srs[data-stage="cross"] .srs-main{transform:translateZ(-80px) scale(.91);opacity:.28;filter:blur(.5px)}
.srs-row{display:flex;justify-content:center;gap:clamp(5px,2.2vw,12px);margin:3px 0;min-width:0}
.srs-tile{appearance:none;border:1px solid rgba(232,220,190,.18);background:linear-gradient(180deg,rgba(255,255,255,.065),rgba(255,255,255,.025));
  color:var(--text);font:inherit;font-family:Georgia,'Times New Roman',serif;font-size:clamp(14px,4vw,19px);line-height:1.25;border-radius:11px;
  min-height:42px;padding:7px 9px;cursor:pointer;box-shadow:inset 0 1px rgba(255,255,255,.07);transition:transform .25s ease,border-color .25s ease,background .25s ease,opacity .5s ease}
.srs-tile:focus-visible{outline:2px solid var(--gold);outline-offset:2px}.srs-tile:active{transform:scale(.96)}
.srs-tile.is-selected{border-color:rgba(104,200,255,.46);background:rgba(104,200,255,.08)}
.srs[data-stage="inner"] .srs-tile.is-outer,.srs[data-stage="innerDone"] .srs-tile.is-outer,.srs[data-stage="cross"] .srs-tile.is-outer{opacity:.25}
.srs-hull{position:absolute;inset:0;pointer-events:none;z-index:1}.srs-hull polygon{vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}
.srs-hull-outer{fill:rgba(104,200,255,.055);stroke:var(--blue);stroke-width:3;filter:drop-shadow(0 0 7px rgba(104,200,255,.42));opacity:0;transition:opacity .45s ease}
.srs[data-stage="outer"] .srs-hull-outer,.srs[data-stage="outerDone"] .srs-hull-outer{opacity:1}
.srs-inner-plane{position:absolute;inset:32px 7% 16px;z-index:4;display:flex;flex-direction:column;justify-content:center;opacity:0;pointer-events:none;transform:translateZ(-30px) scale(.84)}
.srs[data-stage="inner"] .srs-inner-plane,.srs[data-stage="innerDone"] .srs-inner-plane,.srs[data-stage="cross"] .srs-inner-plane{opacity:1;pointer-events:auto;transform:translateZ(70px) scale(1)}
.srs-inner-shell{margin:auto;max-width:360px;padding:18px 12px 14px;border-radius:22px;border:1px solid rgba(240,201,95,.36);background:radial-gradient(circle at 50% 20%,rgba(240,201,95,.14),rgba(18,13,28,.9) 70%);box-shadow:0 18px 40px rgba(0,0,0,.35)}
.srs-inner-label{font-size:12px;opacity:.64;margin-bottom:5px}.srs-inner-plane .srs-tile{border-color:rgba(240,201,95,.34);background:rgba(240,201,95,.075)}
.srs-readouts{display:grid;grid-template-columns:1fr 1fr;gap:9px;max-width:560px;margin:6px auto 0}.srs-card{border-radius:16px;padding:10px 9px 11px;opacity:.22;transform:translateY(3px);transition:opacity .45s ease,transform .45s ease}
.srs-card.on{opacity:1;transform:none}.srs-card.outer{border:1px solid rgba(104,200,255,.3);background:rgba(104,200,255,.07)}.srs-card.inner{border:1px solid rgba(240,201,95,.32);background:rgba(240,201,95,.07)}
.srs-label{font-size:12px;line-height:1.35;opacity:.72}.srs-value{appearance:none;border:0;background:none;color:inherit;font:inherit;font-size:clamp(34px,10vw,48px);font-weight:900;line-height:1.05;padding:2px 8px;cursor:pointer}.srs-card.outer .srs-value{color:var(--blue2)}.srs-card.inner .srs-value{color:var(--gold2)}
.srs-cross{font-size:14px;line-height:1.55;opacity:0;max-width:520px;margin:11px auto 0;transition:opacity .5s ease}.srs[data-stage="cross"] .srs-cross{opacity:1}.srs-cross b{color:var(--gold2)}.srs-note{font-size:12px;opacity:.58;margin-top:3px}
.srs-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:12px}.srs-action{appearance:none;border:1px solid rgba(218,185,74,.35);background:rgba(218,185,74,.08);color:#f0d98f;border-radius:999px;padding:8px 15px;min-height:42px;font:inherit;font-size:13px;font-weight:800;cursor:pointer}.srs-action.active{background:rgba(218,185,74,.18);border-color:rgba(240,201,95,.58)}
@media(max-width:420px){.srs{padding:15px 7px 14px;border-radius:18px}.srs-stage{min-height:300px}.srs-main{padding:16px 2px 12px}.srs-row{gap:4px}.srs-tile{font-size:14px;padding:6px 6px;min-height:40px;border-radius:9px}.srs-inner-plane{inset:20px 4% 8px}.srs-inner-shell{padding:14px 8px 11px}.srs-readouts{gap:7px}.srs-card{padding:9px 6px 10px}.srs-value{font-size:36px}}
@media(max-width:340px){.srs-tile{font-size:13px;padding:5px 4px}.srs-stage{min-height:285px}.srs-value{font-size:33px}.srs-action{padding:7px 12px}}
@media(prefers-reduced-motion:reduce){.srs-main,.srs-inner-plane,.srs-card,.srs-cross,.srs-tile,.srs-hull-outer{transition:none!important}}
`;

function prefersReducedMotion(){
  try{return window.matchMedia("(prefers-reduced-motion: reduce)").matches;}catch{return false;}
}

function useCountUp(target, active, duration){
  const [value,setValue]=useState(active?0:target);
  const raf=useRef(0);
  useEffect(()=>{
    if(!active){setValue(target);return;}
    let start=null;
    const step=(ts)=>{if(start==null)start=ts;const p=Math.min(1,(ts-start)/duration);const e=1-Math.pow(1-p,3);setValue(Math.round(target*e));if(p<1)raf.current=requestAnimationFrame(step);};
    raf.current=requestAnimationFrame(step);return()=>cancelAnimationFrame(raf.current);
  },[target,active,duration]);
  return value;
}

function normalizeSpec(spec){
  const items=[];
  (spec.rows||[]).forEach((row,r)=>row.forEach((label,c)=>items.push({item_id:`r${r}c${c}`,label,row:r,column:c})));
  const innerSet=new Set();
  Object.entries(spec.innerCells||{}).forEach(([r,cols])=>cols.forEach(c=>innerSet.add(`r${r}c${c}`)));
  const outerIds=items.filter(x=>!innerSet.has(x.item_id)).map(x=>x.item_id);
  const innerIds=items.filter(x=>innerSet.has(x.item_id)).map(x=>x.item_id);
  return {
    scene_id:spec.scene_id||spec.reveal_id||"spatial_scene",
    title:spec.title,subtitle:spec.subtitle,crossref:spec.crossref,
    items:spec.items||items,
    groups:spec.groups||{
      outer:{group_id:"outer",role:"outer",member_item_ids:outerIds,label:spec.outer?.label||"החיצוניות",aggregate_value:spec.outer?.value},
      inner:{group_id:"inner",role:"inner",member_item_ids:innerIds,label:spec.inner?.label||"הפנים",aggregate_value:spec.inner?.value},
    },
  };
}

function convexHull(points){
  if(points.length<3)return points;
  const pts=[...points].sort((a,b)=>a.x===b.x?a.y-b.y:a.x-b.x);
  const cross=(o,a,b)=>(a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x);
  const lower=[];for(const p of pts){while(lower.length>=2&&cross(lower[lower.length-2],lower[lower.length-1],p)<=0)lower.pop();lower.push(p);}
  const upper=[];for(let i=pts.length-1;i>=0;i--){const p=pts[i];while(upper.length>=2&&cross(upper[upper.length-2],upper[upper.length-1],p)<=0)upper.pop();upper.push(p);}
  lower.pop();upper.pop();return lower.concat(upper);
}

export default function SpatialGematriaReveal({spec}){
  const scene=useMemo(()=>normalizeSpec(spec||{}),[spec]);
  const reduce=useMemo(prefersReducedMotion,[]);
  const [stage,setStage]=useState(reduce?"cross":"whole");
  const [runKey,setRunKey]=useState(0);
  const [manual,setManual]=useState(null);
  const [hull,setHull]=useState({points:"",w:1,h:1});
  const rootRef=useRef(null);const stageRef=useRef(null);const tileRefs=useRef(new Map());const timers=useRef([]);
  const outer=scene.groups.outer;const inner=scene.groups.inner;
  const outerSet=useMemo(()=>new Set(outer.member_item_ids||[]),[outer]);
  const innerSet=useMemo(()=>new Set(inner.member_item_ids||[]),[inner]);

  useEffect(()=>{
    if(reduce){setStage("cross");return;}
    timers.current.forEach(clearTimeout);timers.current=[];setStage("whole");setManual(null);
    const run=()=>{let acc=0;STAGES.slice(0,-1).forEach((s,i)=>{acc+=DWELL[s];timers.current.push(setTimeout(()=>setStage(STAGES[i+1]),acc));});};
    let io;const el=rootRef.current;
    if(el&&"IntersectionObserver" in window){io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){run();io.disconnect();}},{threshold:.32});io.observe(el);}else run();
    return()=>{timers.current.forEach(clearTimeout);io&&io.disconnect();};
  },[reduce,runKey]);

  useEffect(()=>{
    const measure=()=>{
      const host=stageRef.current;if(!host)return;const base=host.getBoundingClientRect();const pts=[];
      (outer.member_item_ids||[]).forEach(id=>{const el=tileRefs.current.get(id);if(!el)return;const r=el.getBoundingClientRect();const pad=5;pts.push({x:r.left-base.left-pad,y:r.top-base.top-pad},{x:r.right-base.left+pad,y:r.top-base.top-pad},{x:r.right-base.left+pad,y:r.bottom-base.top+pad},{x:r.left-base.left-pad,y:r.bottom-base.top+pad});});
      const h=convexHull(pts);setHull({points:h.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "),w:Math.max(1,base.width),h:Math.max(1,base.height)});
    };
    const id=requestAnimationFrame(measure);let ro;if("ResizeObserver" in window&&stageRef.current){ro=new ResizeObserver(measure);ro.observe(stageRef.current);}window.addEventListener("resize",measure);return()=>{cancelAnimationFrame(id);ro&&ro.disconnect();window.removeEventListener("resize",measure);};
  },[scene,outer.member_item_ids]);

  const idx=STAGES.indexOf(stage);const outerActive=manual==="outer"||idx>=1;const innerActive=manual==="inner"||idx>=3;
  const outerVal=useCountUp(outer.aggregate_value||0,!reduce&&stage==="outer",1150);const innerVal=useCountUp(inner.aggregate_value||0,!reduce&&stage==="inner",900);
  const showOuter=reduce||manual==="outer"||idx>=2;const showInner=reduce||manual==="inner"||idx>=4;
  const itemsById=useMemo(()=>Object.fromEntries(scene.items.map(x=>[x.item_id,x])),[scene.items]);
  const innerRows=useMemo(()=>{const xs=(inner.member_item_ids||[]).map(id=>itemsById[id]).filter(Boolean).sort((a,b)=>a.row-b.row||a.column-b.column);const map=new Map();xs.forEach(x=>{if(!map.has(x.row))map.set(x.row,[]);map.get(x.row).push(x);});return [...map.values()];},[inner.member_item_ids,itemsById]);

  const openGem=(term)=>{try{openNumberDrawer(String(term));}catch{/* delegated data-gem remains fallback */}};
  const selectGroup=(g)=>{timers.current.forEach(clearTimeout);setManual(g);setStage(g==="outer"?"outerDone":"innerDone");};
  const replay=()=>{timers.current.forEach(clearTimeout);setRunKey(k=>k+1);};

  return <div className="srs spatial-reveal-root" data-stage={stage} ref={rootRef} dir="rtl">
    <style>{CSS}</style>
    <div className="srs-kick">גימטריה מרחבית · Spatial Research Scene</div>
    <div className="srs-title">{scene.title}</div>{scene.subtitle&&<div className="srs-sub">{scene.subtitle}</div>}
    <div className="srs-stage" ref={stageRef}>
      <div className="srs-main">
        <svg className="srs-hull" viewBox={`0 0 ${hull.w} ${hull.h}`} preserveAspectRatio="none" aria-hidden="true"><polygon className="srs-hull-outer" points={hull.points}/></svg>
        {(spec.rows||[]).map((row,r)=><div className="srs-row" key={r}>{row.map((label,c)=>{const id=`r${r}c${c}`;const isOuter=outerSet.has(id);const isInner=innerSet.has(id);return <button key={id} ref={el=>{if(el)tileRefs.current.set(id,el);else tileRefs.current.delete(id);}} className={`srs-tile ${isOuter?"is-outer":""} ${manual&&((manual==="outer"&&isOuter)||(manual==="inner"&&isInner))?"is-selected":""}`} data-item-id={id} data-gem={label} type="button" onClick={()=>openGem(label)} aria-label={`${label} — פתיחת מחקר גימטריה`}>{label}</button>;})}</div>)}
      </div>
      <div className="srs-inner-plane" aria-hidden={!innerActive}>
        <div className="srs-inner-shell"><div className="srs-inner-label">נכנסים פנימה · ששת האריחים נבנים מחדש כ־1–2–3</div>{innerRows.map((row,i)=><div className="srs-row" key={i}>{row.map(item=><button key={item.item_id} type="button" className="srs-tile" data-gem={item.label} onClick={()=>openGem(item.label)}>{item.label}</button>)}</div>)}</div>
      </div>
    </div>
    <div className="srs-readouts">
      <div className={`srs-card outer ${showOuter?"on":""}`}><div className="srs-label">{outer.label}</div><button type="button" className="srs-value" data-gem={outer.aggregate_value} onClick={()=>openGem(outer.aggregate_value)}>{showOuter?(stage==="outer"?outerVal:outer.aggregate_value):"—"}</button></div>
      <div className={`srs-card inner ${showInner?"on":""}`}><div className="srs-label">{inner.label}</div><button type="button" className="srs-value" data-gem={inner.aggregate_value} onClick={()=>openGem(inner.aggregate_value)}>{showInner?(stage==="inner"?innerVal:inner.aggregate_value):"—"}</button></div>
    </div>
    {scene.crossref&&<div className="srs-cross">הצלבה: <b>{scene.crossref.term} = {scene.crossref.value}</b><div className="srs-note">{scene.crossref.note}</div></div>}
    {!reduce&&<div className="srs-actions"><button type="button" className={`srs-action ${manual==="outer"?"active":""}`} onClick={()=>selectGroup("outer")}>חוץ · {outer.aggregate_value}</button><button type="button" className={`srs-action ${manual==="inner"?"active":""}`} onClick={()=>selectGroup("inner")}>פנים · {inner.aggregate_value}</button><button type="button" className="srs-action" onClick={replay}>הצג שוב ↻</button></div>}
  </div>;
}
