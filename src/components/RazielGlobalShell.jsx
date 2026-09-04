import React, { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { getAiAnalysis } from "../lib/supabase.js";

function pageContext(pathname, search) {
  const p = new URLSearchParams(search || "");
  const tool = p.get("tool");
  let type = "page";
  if (/^\/number\//.test(pathname)) type = "number";
  else if (/^\/codes\//.test(pathname) || pathname === "/code") type = "cipher";
  else if (pathname === "/beit-midrash" || pathname === "/research" && tool === "midrash") type = "source";
  else if (pathname === "/research") type = tool || "research";
  else if (pathname === "/post" || pathname.split("/").filter(Boolean).length === 1) type = "content";
  return {
    pathname, search: search || "", type,
    title: typeof document !== "undefined" ? document.title : "",
    tool: tool || null,
  };
}

export default function RazielGlobalShell() {
  const { pathname, search } = useLocation();
  const { isAdmin } = useAuth();
  const [panel, setPanel] = useState(null);
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const ctx = useMemo(() => pageContext(pathname, search), [pathname, search]);
  const buildProgress = 66;

  async function ask() {
    const question = q.trim();
    if (!isAdmin || !question || busy) return;
    setBusy(true); setAnswer("");
    try {
      const facts = [
        `עמוד נוכחי: ${ctx.pathname}${ctx.search}`,
        `סוג עמוד: ${ctx.type}`,
        ctx.tool ? `כלי פעיל: ${ctx.tool}` : "",
        ctx.title ? `כותרת העמוד: ${ctx.title}` : "",
        `שאלת המנהל: ${question}`,
      ].filter(Boolean).join("\n");
      const out = await getAiAnalysis({ kind:"research", subject:question, facts, fast:true,
        persona:"raziel", operation:"site_global_shell_v1", ref:ctx.pathname, ref_name:ctx.title || ctx.type });
      setAnswer(typeof out === "string" ? out : out?.text || out?.reply || "רזיאל לא החזיר תשובה כרגע.");
    } catch { setAnswer("רזיאל לא זמין כרגע. נסה שוב בעוד רגע."); }
    finally { setBusy(false); }
  }

  const items = [
    { id:"raziel", icon:"✨", label:"רזיאל", live:isAdmin },
    { id:"pulse", icon:"◉", label:"עכשיו", live:true },
    { id:"journey", icon:"🧭", label:"המסע שלי", live:false },
    { id:"saved", icon:"🔖", label:"שמורים", live:false },
    { id:"build", icon:"🏗️", label:`${buildProgress}%`, live:true },
  ];

  function activate(id) {
    if (id === "build") {
      if (pathname === "/" || pathname === "/home-new" || pathname === "/בית-חדש") {
        document.getElementById("build-progress")?.scrollIntoView({behavior:"smooth",block:"start"});
      } else {
        window.location.assign("/#build-progress");
      }
      return;
    }
    setPanel(p => p === id ? null : id);
  }

  return <div dir="rtl">
    {panel && <div style={{
      position:"fixed", left:14, right:14, bottom:68, margin:"0 auto", width:"min(720px,calc(100vw - 28px))",
      maxHeight:"62vh", overflow:"auto", zIndex:1201, background:"rgba(16,11,32,.98)", color:"#f7f1df",
      border:"1px solid rgba(218,180,86,.38)", borderRadius:18, padding:18, boxShadow:"0 18px 60px rgba(0,0,0,.42)"
    }}>
      <button onClick={()=>setPanel(null)} aria-label="סגור" style={{float:"left",border:0,background:"transparent",color:"#cfc4e6",fontSize:20,cursor:"pointer"}}>×</button>
      {panel === "raziel" && <>
        <div style={{fontSize:21,fontWeight:900,color:"#f1d77c"}}>✨ רזיאל</div>
        {!isAdmin ? <>
          <p style={{lineHeight:1.7}}>החוקר האישי של SOD1820 ילך איתכם בין מספרים, צפנים, מקורות ומחקרים — ויבין מה אתם רואים עכשיו.</p>
          <strong style={{color:"#d9bd67"}}>🏗️ בבנייה</strong>
        </> : <>
          <div style={{fontSize:12,opacity:.68,margin:"6px 0 12px"}}>מצב מנהל · {ctx.type} · {ctx.pathname}</div>
          <textarea value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();ask();}}}
            placeholder="שאל את רזיאל על העמוד הזה…" rows={3} style={{width:"100%",boxSizing:"border-box",borderRadius:12,padding:11,background:"#18102d",color:"#fff",border:"1px solid #594878",resize:"vertical"}} />
          <button onClick={ask} disabled={busy||!q.trim()} style={{marginTop:8,border:0,borderRadius:10,padding:"9px 15px",fontWeight:800,cursor:"pointer"}}>{busy?"רזיאל חושב…":"שאל את רזיאל"}</button>
          {answer && <div style={{whiteSpace:"pre-wrap",lineHeight:1.65,marginTop:14,paddingTop:12,borderTop:"1px solid rgba(255,255,255,.1)"}}>{answer}</div>}
        </>}
      </>}
      {panel === "pulse" && <>
        <div style={{fontSize:21,fontWeight:900,color:"#f1d77c"}}>◉ עכשיו ב־SOD1820</div>
        <p style={{lineHeight:1.7}}>כאן ירוכזו העדכונים החיים של האתר — מחקרים, כתבים, צפנים, סרטים ועדכונים שמגיעים מהמערכת ומהוואטסאפ.</p>
        <div style={{padding:"10px 12px",borderRadius:12,background:"rgba(255,255,255,.05)",fontSize:13}}>תצוגת הבקרה קיימת. חיבור זרם העדכונים המלא נמצא בבנייה.</div>
      </>}
      {(panel === "journey" || panel === "saved") && <>
        <div style={{fontSize:21,fontWeight:900,color:"#f1d77c"}}>{panel==="journey"?"🧭 המסע שלי":"🔖 שמורים"}</div>
        <p style={{lineHeight:1.7}}>{panel==="journey"?"כאן תוכלו לראות את הדרך שעברתם באתר ולחזור לממצאים ולמחקרים שפתחתם.":"כאן יישמרו מספרים, פסוקים, צפנים, מקורות וממצאים שתרצו לקחת איתכם להמשך המחקר."}</p>
        <strong style={{color:"#d9bd67"}}>🏗️ בבנייה</strong>
      </>}
    </div>}

    <nav aria-label="שורת הבקרה של SOD1820" style={{
      position:"fixed", left:10, right:10, bottom:8, margin:"0 auto", width:"min(720px,calc(100vw - 20px))",
      zIndex:1200, display:"grid", gridTemplateColumns:"repeat(5,1fr)", alignItems:"stretch",
      background:"rgba(12,8,24,.94)", backdropFilter:"blur(16px)", border:"1px solid rgba(218,180,86,.34)",
      borderRadius:16, boxShadow:"0 10px 36px rgba(0,0,0,.34)", overflow:"hidden"
    }}>
      {items.map(it => <button key={it.id} onClick={()=>activate(it.id)} style={{
        position:"relative", minWidth:0, border:0, borderInlineStart:"1px solid rgba(255,255,255,.06)",
        background:panel===it.id?"rgba(218,180,86,.11)":"transparent", color:it.live?"#f2df9b":"#aaa0ba",
        padding:"8px 4px 9px", cursor:"pointer", fontSize:11, fontWeight:800
      }}>
        <span style={{display:"block",fontSize:17,lineHeight:1.1}}>{it.icon}</span>
        <span style={{display:"block",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginTop:3}}>{it.label}</span>
        {!it.live && <span style={{position:"absolute",top:4,right:5,fontSize:7}}>🏗️</span>}
        {it.id==="pulse" && <span style={{position:"absolute",top:6,left:"50%",marginLeft:11,width:5,height:5,borderRadius:"50%",background:"#d9bd67",boxShadow:"0 0 8px #d9bd67"}} />}
        {it.id==="build" && <span style={{position:"absolute",bottom:0,right:0,height:2,width:`${buildProgress}%`,background:"linear-gradient(90deg,#8f6fd6,#d4af37)"}} />}
      </button>)}
    </nav>
  </div>;
}
