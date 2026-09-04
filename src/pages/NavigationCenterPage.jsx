import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { KNOWLEDGE_WORLDS, BUILD_PROGRESS } from "../lib/knowledgeMap.js";

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

      <div style={{maxWidth:560,margin:"0 auto 24px"}}>
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
