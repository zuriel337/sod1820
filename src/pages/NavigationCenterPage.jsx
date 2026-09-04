import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { KNOWLEDGE_WORLDS, BUILD_PROGRESS } from "../lib/knowledgeMap.js";

function KnowledgeUniverse() {
  const P = usePalette();
  const worlds = [
    {k:"numbers",label:"מספרים",icon:"🔢",to:"/number",x:50,y:12,z:2},
    {k:"codes",label:"צפנים · ELS",icon:"🔠",to:"/codes",x:82,y:31,z:1},
    {k:"books",label:"ספרים ומקורות",icon:"📚",to:"/beit-midrash",x:78,y:72,z:0},
    {k:"community",label:"קהילה",icon:"💬",to:"/community",x:50,y:88,z:1},
    {k:"archive",label:"ארכיון הידע",icon:"🗃️",to:"/post",x:20,y:72,z:0},
    {k:"discover",label:"לגלות",icon:"✨",to:"/post",x:17,y:31,z:1},
  ];
  return (
    <section className="sod-universe" aria-label="מפת עולמות SOD1820" style={{
      position:"relative",height:"clamp(330px,46vw,500px)",maxWidth:900,margin:"8px auto 28px",
      borderRadius:30,overflow:"hidden",border:`1px solid ${P.borderStrong}`,
      background:`radial-gradient(circle at 50% 48%, ${P.card} 0, ${P.cardSoft} 34%, transparent 72%)`,
      boxShadow:"inset 0 0 80px rgba(0,0,0,.08),0 24px 70px rgba(0,0,0,.10)",perspective:"900px"
    }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden style={{position:"absolute",inset:"7%",width:"86%",height:"86%",opacity:.55}}>
        <ellipse cx="50" cy="50" rx="39" ry="31" fill="none" stroke={P.borderStrong} strokeWidth=".35" strokeDasharray="2 2"/>
        {worlds.map(w=><line key={w.k} x1="50" y1="50" x2={w.x} y2={w.y} stroke={P.borderStrong} strokeWidth=".3"/>)}
      </svg>
      <div style={{position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%) translateZ(55px)",width:"clamp(112px,18vw,160px)",aspectRatio:"1",borderRadius:"50%",display:"grid",placeItems:"center",textAlign:"center",background:P.cardGrad,border:`1px solid ${P.borderStrong}`,boxShadow:"0 0 45px rgba(212,175,55,.16)",zIndex:4}}>
        <div><div style={{fontSize:26}}>🌳</div><b style={{display:"block",color:P.accentText,fontFamily:F.regal,fontSize:18}}>SOD1820</b><small style={{color:P.inkSoft,fontFamily:F.body}}>גוף ידע אחד</small></div>
      </div>
      {worlds.map(w=><Link key={w.k} to={w.to} className="sod-universe-node" style={{
        position:"absolute",left:`${w.x}%`,top:`${w.y}%`,transform:`translate(-50%,-50%) translateZ(${w.z*18}px)`,
        width:"clamp(86px,14vw,132px)",minHeight:"clamp(70px,10vw,96px)",padding:"9px",boxSizing:"border-box",
        display:"grid",placeItems:"center",alignContent:"center",gap:4,textAlign:"center",textDecoration:"none",
        borderRadius:"50%",background:P.card,border:`1px solid ${P.border}`,boxShadow:"0 10px 30px rgba(0,0,0,.10)",zIndex:3
      }}><span style={{fontSize:"clamp(20px,3vw,28px)"}}>{w.icon}</span><b style={{color:P.ink,fontFamily:F.heading,fontSize:"clamp(10px,1.5vw,13px)"}}>{w.label}</b></Link>)}
      <div style={{position:"absolute",bottom:14,left:0,right:0,textAlign:"center",color:P.inkSoft,fontFamily:F.body,fontSize:11}}>כל נקודה היא דלת · כל קו הוא קשר</div>
      <style>{`
        .sod-universe-node{transition:transform .28s ease,border-color .28s ease,box-shadow .28s ease}
        .sod-universe-node:hover{transform:translate(-50%,-50%) translateZ(75px) scale(1.07)!important;box-shadow:0 16px 42px rgba(0,0,0,.16)!important}
        @media(max-width:620px){.sod-universe{height:390px!important}.sod-universe-node{width:88px!important;min-height:72px!important}}
        @media(prefers-reduced-motion:no-preference){.sod-universe-node{animation:sodFloat 6s ease-in-out infinite alternate}.sod-universe-node:nth-of-type(even){animation-delay:-2.5s}@keyframes sodFloat{to{margin-top:-5px}}}
      `}</style>
    </section>
  );
}

function WorldCard({ world, q }) {
  const P = usePalette();
  const items = useMemo(() => {
    const n = q.trim();
    if (!n) return world.items;
    return world.items.filter(it => (it.label+" "+(it.note||"")+" "+(it.state||"")).includes(n));
  }, [world.items, q]);
  if (q.trim() && !items.length && !(world.title+" "+world.kicker+" "+world.stat).includes(q.trim())) return null;
  return (
    <section style={{
      background:P.cardGrad,border:`1px solid ${P.border}`,borderTop:`2px solid ${P.borderStrong}`,
      borderRadius:18,padding:18,boxShadow:"0 14px 44px rgba(0,0,0,.08)"
    }}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:14,flexWrap:"wrap"}}>
        <div>
          <h2 style={{margin:0,color:P.accentText,fontFamily:F.regal,fontSize:23,fontWeight:900}}>{world.title}</h2>
          <div style={{color:P.inkSoft,fontFamily:F.body,fontSize:13.5,lineHeight:1.6,marginTop:5}}>{world.kicker}</div>
        </div>
        <div style={{color:P.accentText,fontFamily:F.numeric,fontSize:11,fontWeight:900,border:`1px solid ${P.borderStrong}`,borderRadius:999,padding:"5px 9px",whiteSpace:"nowrap"}}>{world.stat}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:10,marginTop:14}}>
        {items.map(it => {
          const body = <>
            <div style={{fontSize:24,lineHeight:1}}>{it.emoji}</div>
            <div style={{minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
                <b style={{color:it.locked?P.inkSoft:P.ink,fontFamily:F.heading,fontSize:14}}>{it.label}</b>
                <span style={{
                  color:it.locked?P.accentDim:P.accentText,border:`1px solid ${it.locked?P.border:P.borderStrong}`,
                  borderRadius:999,padding:"1px 6px",fontFamily:F.heading,fontSize:9,fontWeight:900
                }}>{it.state || "פעיל"}</span>
              </div>
              {it.note && <div style={{color:P.inkSoft,fontFamily:F.body,fontSize:11.5,lineHeight:1.5,marginTop:4}}>{it.note}</div>}
            </div>
          </>;
          const style={display:"flex",alignItems:"flex-start",gap:10,padding:"12px",borderRadius:13,border:`1px ${it.locked?"dashed":"solid"} ${P.border}`,background:P.card,textDecoration:"none",opacity:it.locked?.7:1};
          return it.locked
            ? <div key={it.label} aria-disabled="true" style={style}>{body}</div>
            : <Link key={it.to+it.label} to={it.to} style={style}>{body}</Link>;
        })}
      </div>
    </section>
  );
}

export default function NavigationCenterPage() {
  const P = usePalette();
  const [q,setQ]=useState("");
  return (
    <div dir="rtl" style={{maxWidth:1280,margin:"0 auto",padding:"46px 18px 110px",position:"relative",zIndex:1}}>
      <section style={{textAlign:"center",marginBottom:26}}>
        <div style={{color:P.accentDim,fontFamily:F.heading,fontSize:11,fontWeight:900,letterSpacing:2.4}}>SOD1820 · SYSTEM MAP</div>
        <h1 style={{margin:"8px 0 10px",color:P.accentText,fontFamily:F.regal,fontSize:"clamp(30px,5vw,52px)",fontWeight:900}}>🗺️ מפת המערכת</h1>
        <p style={{maxWidth:760,margin:"0 auto",color:P.inkSoft,fontFamily:F.body,fontSize:16,lineHeight:1.9}}>
          כאן רואים את כל SOD1820 במבט אחד — מה כבר חי, מה נמצא בבנייה, ואילו דלתות ייפתחו בהמשך.
          זו לא רשימת עמודים, אלא מפת הידע והמערכת שנבנית סביבם.
        </p>
        <div style={{display:"inline-flex",alignItems:"center",gap:10,marginTop:18,padding:"9px 13px",border:`1px solid ${P.borderStrong}`,borderRadius:999,background:P.card}}>
          <span style={{fontFamily:F.heading,fontSize:11,fontWeight:900,color:P.accentText}}>🏗️ SOD1820 V2</span>
          <span style={{fontFamily:F.numeric,fontSize:14,fontWeight:900,color:P.accentText}}>{BUILD_PROGRESS}%</span>
          <span style={{width:120,height:4,borderRadius:999,background:P.border,overflow:"hidden"}}><i style={{display:"block",width:`${BUILD_PROGRESS}%`,height:"100%",background:P.accent}} /></span>
        </div>
      </section>

      <KnowledgeUniverse />\n\n      <div style={{maxWidth:560,margin:"0 auto 24px"}}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="חפשו עולם, כלי, יכולת או משהו שבדרך…"
          style={{width:"100%",boxSizing:"border-box",background:P.card,border:`1px solid ${P.borderStrong}`,borderRadius:999,color:P.ink,fontFamily:F.body,fontSize:15,padding:"12px 18px",outline:"none",textAlign:"center"}} />
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(360px,1fr))",gap:16}}>
        {KNOWLEDGE_WORLDS.map(w => <WorldCard key={w.title} world={w} q={q} />)}
      </div>

      <section style={{marginTop:24,border:`1px solid ${P.borderStrong}`,borderRadius:18,padding:"22px",background:P.cardSoft,textAlign:"center"}}>
        <div style={{color:P.accentText,fontFamily:F.regal,fontSize:20,fontWeight:900}}>🏛️ ההיכל יהיה הדרך המרחבית להיכנס לכל המפה הזאת</div>
        <p style={{maxWidth:760,margin:"8px auto 0",color:P.inkSoft,fontFamily:F.body,fontSize:14,lineHeight:1.8}}>
          הניווט מביא אתכם מהר. ההיכל יאפשר לשוטט בין מספרים, צפנים, ספרים, אנשים וקשרים במרחב אחד.
          רזיאל יהיה שכבת ה-AI שתלווה את אותו גוף ידע מכל עמוד.
        </p>
      </section>
    </div>
  );
}
