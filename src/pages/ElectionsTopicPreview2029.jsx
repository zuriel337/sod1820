import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import topic from "../../docs/reviews/elections-topic-navigation-proposal-20261123.json";
import sourcePaths from "../data/electionsTopicSourcePaths2029.json";

// Preview only. Canonical Topic identity is still pending. No writes or graph mutations.
const POSITIONS = [[-210,-75,-25],[-55,35,115],[125,-85,-20],[200,115,-85]];
const LINKS = [[0,1],[1,2],[2,3]];
const STAGES = topic.sections;
const SOURCE_URL = (id) => sourcePaths[String(id)] ? "/post/" + sourcePaths[String(id)] : null;
function ElectionsJourneyMap({ selected, onSelect }) {
  const canvasRef = useRef(null);
  const [angles, setAngles] = useState({ a: 0.3, b: -0.18, zoom: 1 });
  const angleRef = useRef(angles); angleRef.current = angles;
  useEffect(() => {
    const canvas=canvasRef.current;
    if (!canvas) return undefined;
    const ctx=canvas.getContext("2d");
    if (!ctx) return undefined;
    let points=[], dragging=null, moved=0;
    const project=(p,w,h)=> {
      const {a,b,zoom}=angleRef.current;
      const x=p[0]*Math.cos(a)-p[2]*Math.sin(a);
      const z=p[0]*Math.sin(a)+p[2]*Math.cos(a);
      const y=p[1]*Math.cos(b)-z*Math.sin(b);
      const depth=p[1]*Math.sin(b)+z*Math.cos(b);
      const scale=550/(550+depth)*Math.min(w/590,h/370)*zoom;
      return {x:w/2+x*scale,y:h/2+y*scale,r:Math.max(13,23*scale),depth};
    };
    const draw=()=>{
      const rect=canvas.getBoundingClientRect();
      const w=rect.width,h=rect.height,d=Math.min(window.devicePixelRatio||1,2);
      if (!w||!h) return;
      if (canvas.width!==Math.round(w*d)||canvas.height!==Math.round(h*d)) {
        canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);
      }
      ctx.setTransform(d,0,0,d,0,0);
      ctx.clearRect(0,0,w,h);
      points=POSITIONS.map(p=>project(p,w,h));
      LINKS.forEach(([i,j])=>{
        ctx.beginPath();ctx.moveTo(points[i].x,points[i].y);ctx.lineTo(points[j].x,points[j].y);
        ctx.setLineDash([5,7]);ctx.strokeStyle="#afbad8";ctx.lineWidth=1.7;ctx.stroke();ctx.setLineDash([]);
      });
      points.map((p,i)=>({...p,i})).sort((p,q)=>q.depth-p.depth).forEach(p=>{
        const active=p.i===selected;
        ctx.beginPath();ctx.arc(p.x,p.y,p.r+7,0,Math.PI*2);ctx.fillStyle=active?"#d4a75a45":"#aab8da22";ctx.fill();
        const g=ctx.createRadialGradient(p.x-5,p.y-5,1,p.x,p.y,p.r);
        g.addColorStop(0,active?"#f8df9f":"#d2d8e6");g.addColorStop(1,active?"#b4873e":"#48647f");
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();
        ctx.fillStyle="#f5ebd6";ctx.font="13px system-ui";ctx.textAlign="center";ctx.fillText(["2019","14 × 100","2021–22","2026"][p.i],p.x,p.y+p.r+20);
      });
    };
    const down=e=>{dragging={x:e.clientX,y:e.clientY};moved=0;canvas.setPointerCapture(e.pointerId)};
    const move=e=>{if(!dragging)return;const dx=e.clientX-dragging.x,dy=e.clientY-dragging.y;moved+=Math.abs(dx)+Math.abs(dy);dragging={x:e.clientX,y:e.clientY};setAngles(v=>({ ...v,a:v.a+dx*.008,b:Math.max(-1.1,Math.min(1.1,v.b+dy*.006))}));};
    const up=e=>{if(!dragging)return;dragging=null;if(moved>8)return;const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;const pick=points.map((p,i)=>({i,dist:Math.hypot(x-p.x,y-p.y),r:p.r})).filter(p=>p.dist<=p.r+10).sort((a,b)=>a.dist-b.dist)[0];if(pick)onSelect(pick.i)};
    const wheel=e=>{e.preventDefault();setAngles(v=>({...v,zoom:Math.min(1.6,Math.max(.7,v.zoom*(e.deltaY<0?1.08:.92)))}))};
    const ro=new ResizeObserver(draw);
    ro.observe(canvas);
    canvas.addEventListener("pointerdown",down);canvas.addEventListener("pointermove",move);canvas.addEventListener("pointerup",up);canvas.addEventListener("wheel",wheel,{passive:false});
    draw();
    return ()=>{ro.disconnect();canvas.removeEventListener("pointerdown",down);canvas.removeEventListener("pointermove",move);canvas.removeEventListener("pointerup",up);canvas.removeEventListener("wheel",wheel)};
  },[angles,selected,onSelect]);
  return <canvas ref={canvasRef} aria-label="מפת תחנות בחירות — ארבע תחנות" role="img" style={{width:"100%",height:"min(48vh,390px)",minHeight:265,touchAction:"none",display:"block"}}/>;
}

export default function ElectionsTopicPreview2029(){
  const [selected,setSelected]=useState(0);
  const station=STAGES[selected];
  const base={fontFamily:"system-ui, sans-serif",background:"radial-gradient(ellipse at 50% 10%,#352b21,#10141d 68%,#0b0e14)",minHeight:"100vh",color:"#efe8d9",padding:"20px 14px",direction:"rtl"};
  const card={background:"#1d222cc9",border:"1px solid #b99b654b",borderRadius:16,padding:18};
  const btn={background:"#2c3442",color:"#f2dfb6",border:"1px solid #a98f61",borderRadius:9,padding:"10px 15px",cursor:"pointer",fontSize:14};
  return <main style={base}><div style={{maxWidth:1100,margin:"0 auto"}}>
    <div style={{color:"#d1b175",fontSize:12,letterSpacing:1}}>SOD1820 · WORLD · PREVIEW ONLY</div>
    <h1 style={{fontSize:"clamp(26px,4vw,42px)",margin:"8px 0"}}>{topic.hero.title}</h1>
    <p style={{color:"#c4c3bf",maxWidth:800,lineHeight:1.85}}>{topic.hero.intro}</p>
    <div style={{...card,marginBottom:16,background:"#30281c99"}}>זהו פריוויו ענפי של מסלול תוכן, ולא טופיק שפורסם במסד. הקווים מציגים רצף ניווט מוצע, לא קשרי גרף שאושרו.</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,330px),1fr))",gap:16}}>
      <section style={card}>
        <h2 style={{fontSize:17,margin:0}}>מפת המסע</h2>
        <ElectionsJourneyMap selected={selected} onSelect={setSelected}/>
        <div style={{display:"flex",gap:8,justifyContent:"center"}}>
          <button style={btn} onClick={()=>setSelected(x=>(x+3)%4)}>הקודם</button>
          <span style={{alignSelf:"center",color:"#d8c7a6"}}>{selected+1} / 4</span>
          <button style={btn} onClick={()=>setSelected(x=>(x+1)%4)}>הבא</button>
        </div>
      </section>
      <section style={card}>
        <span style={{fontSize:12,color:"#c9a86d"}}>תחנה {selected+1} מתוך 4</span>
        <h2 style={{fontSize:24,margin:"12px 0"}}>{station.title}</h2>
        <p style={{lineHeight:1.9,color:"#e0dbd2"}}>{station.body}</p>
        <h3 style={{fontSize:15,color:"#d4b878"}}>צמתי מספר</h3>
        <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
          {(station.numbers||[]).map(n=><Link key={n} to={"/number/"+n} style={{...btn,textDecoration:"none",padding:"7px 13px"}}>{n}</Link>)}
        </div>
        <h3 style={{fontSize:15,color:"#d4b878"}}>פוסטים מקוריים</h3>
        <div style={{display:"flex",flexDirection:"column",gap:9}}>
          {(station.sources||[]).map(({id})=>SOURCE_URL(id)?<Link key={id} to={SOURCE_URL(id)} style={{color:"#bcd6f5",overflowWrap:"anywhere"}}>פתיחת פוסט מקור #{id}</Link>:<span key={id} style={{color:"#bbb"}}>מקור #{id} — קישור עדיין לא אומת</span>)}
          {!station.sources?.length && <span style={{fontSize:13,color:"#aeb8c8"}}>תחנת מספרים — מקור התיעוד בפוסט #5107</span>}
        </div>
        <p style={{fontSize:12,color:"#adb4c2",marginTop:22}}>סטטוס: {station.verification}. אירועים היסטוריים וחיבורים מספריים מוצגים בנפרד.</p>
      </section>
    </div>
    <div style={{display:"flex",gap:9,flexWrap:"wrap",marginTop:16}}>
      {STAGES.map((s,i)=><button key={s.id} style={{...btn,background:selected===i?"#846333":"#29303a"}} onClick={()=>setSelected(i)}>{s.title}</button>)}
    </div>
    <p style={{fontSize:12,color:"#999",marginTop:26}}>לא נוספו קשתות למסד. אין שינוי ב־SEO, ב־topic_cards או בכתובת הקנונית. ההפעלה מותנית בדגל VITE_ELECTIONS_TOPIC_PREVIEW=true בבניית הפריוויו בלבד.</p>
  </div></main>;
}
