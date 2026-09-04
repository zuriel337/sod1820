import React, { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { getAiAnalysis } from "../lib/supabase.js";
import { BUILD_PROGRESS } from "../lib/knowledgeMap.js";

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
  const [collapsed, setCollapsed] = useState(false);
  const ctx = useMemo(() => pageContext(pathname, search), [pathname, search]);
  const buildProgress = BUILD_PROGRESS;

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
    { id:"journey", icon:"🧭", label:"המחקר שלי", live:false },
    { id:"tray", icon:"＋", label:"לחקירה", live:false },
    { id:"saved", icon:"🔖", label:"האוסף שלי", live:false },
    { id:"links", icon:"🔗", label:"קשרים", live:false },
    { id:"recent", icon:"🕘", label:"המשך", live:false },
    { id:"build", icon:"🏗️", label:`V2 · ${buildProgress}%`, live:true },
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

  const locationLabel = ctx.title?.replace(/\\s*[|–—-]\\s*SOD1820.*$/i,"").slice(0,46) || ctx.pathname;

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
      {(panel === "journey" || panel === "saved" || panel === "tray" || panel === "links" || panel === "recent") && <>
        <div style={{fontSize:21,fontWeight:900,color:"#f1d77c"}}>{panel==="journey"?"🧭 המחקר שלי":panel==="saved"?"🔖 האוסף שלי":panel==="tray"?"＋ מגש החקירה":panel==="links"?"🔗 קשרים":"🕘 המשך מאיפה שהפסקתי"}</div>
        <p style={{lineHeight:1.7}}>{panel==="journey"?"כאן יתחברו המחקרים שכבר שמרתם, מסעות החקירה והדרך שעברתם באתר — במקום ליצור מערכת שמורים נוספת.":panel==="saved"?"האוסף האישי יאחד את research_items והשמירות הקיימות: מספרים, פסוקים, צפנים, מקורות וממצאים.":panel==="tray"?"אספו לכאן כמה פריטים מכל רחבי האתר, השוו ביניהם ובקשו מרזיאל לחקור אותם יחד.":panel==="links"?"הקשרים של הדבר שאתם רואים עכשיו — מספרים, פסוקים, צפנים, מקורות ואנשים — יופיעו כאן בלי לעזוב את העמוד.":"חזרה חכמה לעמודים, מחקרים וממצאים אחרונים, בדיוק מהנקודה שבה הפסקתם."}</p>
        <strong style={{color:"#d9bd67"}}>🏗️ בבנייה</strong>
      </>}
    </div>}

    <div aria-hidden="true" style={{
      position:"fixed", left:10, right:10, bottom:67, margin:"0 auto", width:"min(720px,calc(100vw - 20px))",
      zIndex:1199, textAlign:"center", pointerEvents:"none", padding:"5px 12px",
      color:"rgba(244,223,154,.88)", fontFamily:"serif", fontSize:"clamp(10px,2.6vw,13px)",
      letterSpacing:".35px", textShadow:"0 0 10px rgba(218,180,86,.34), 0 0 24px rgba(143,111,214,.2)"
    }}>
      <span style={{opacity:.42, marginInlineEnd:8}}>✦</span>
      וידע כל פעול כי אתה פעלתו · ויבין כל יצור כי אתה יצרתו
      <span style={{opacity:.42, marginInlineStart:8}}>✦</span>
    </div>

    {!collapsed ? <nav aria-label="שורת הבקרה של SOD1820" style={{
      position:"fixed", left:8, right:8, bottom:7, margin:"0 auto", width:"min(1180px,calc(100vw - 16px))",
      zIndex:1200, display:"grid", gridTemplateColumns:"minmax(135px,1.25fr) repeat(8,minmax(62px,.72fr)) 34px",
      alignItems:"stretch", background:"rgba(9,7,19,.96)", backdropFilter:"blur(18px)",
      border:"1px solid rgba(218,180,86,.28)", borderRadius:13, boxShadow:"0 10px 38px rgba(0,0,0,.38)", overflow:"hidden"
    }}>
      <div title={ctx.pathname} style={{minWidth:0,padding:"7px 11px",borderInlineEnd:"1px solid rgba(255,255,255,.07)",display:"flex",flexDirection:"column",justifyContent:"center"}}>
        <span style={{fontSize:8.5,color:"#9f93b4",fontWeight:800,letterSpacing:.5}}>אתה נמצא כאן</span>
        <span style={{fontSize:11.5,color:"#eee5cf",fontWeight:800,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>⌖ {locationLabel}</span>
      </div>
      {items.map(it => <button key={it.id} onClick={()=>activate(it.id)} style={{
        position:"relative",minWidth:0,border:0,borderInlineEnd:"1px solid rgba(255,255,255,.055)",
        background:panel===it.id?"rgba(218,180,86,.11)":"transparent",color:it.live?"#f2df9b":"#aaa0ba",
        padding:"6px 3px 7px",cursor:"pointer",fontSize:9.5,fontWeight:800
      }}>
        <span style={{fontSize:14,marginInlineEnd:4}}>{it.icon}</span>
        <span style={{whiteSpace:"nowrap"}}>{it.label}</span>
        {!it.live && <span style={{position:"absolute",top:2,right:3,fontSize:6.5}}>🏗️</span>}
        {it.id==="pulse" && <span style={{position:"absolute",top:5,left:6,width:4,height:4,borderRadius:"50%",background:"#d9bd67",boxShadow:"0 0 7px #d9bd67"}} />}
        {it.id==="build" && <span style={{position:"absolute",bottom:0,right:0,height:2,width:`${buildProgress}%`,background:"linear-gradient(90deg,#8f6fd6,#d4af37)"}} />}
      </button>)}
      <button onClick={()=>setCollapsed(true)} title="מזער" style={{border:0,background:"transparent",color:"#9f93b4",cursor:"pointer",fontSize:15}}>⌄</button>
    </nav> : <button onClick={()=>setCollapsed(false)} style={{
      position:"fixed",bottom:9,left:"50%",transform:"translateX(-50%)",zIndex:1200,border:"1px solid rgba(218,180,86,.35)",
      borderRadius:999,background:"rgba(9,7,19,.96)",color:"#f2df9b",padding:"7px 14px",fontSize:10.5,fontWeight:800,cursor:"pointer",
      boxShadow:"0 8px 28px rgba(0,0,0,.32)"
    }}>✨ SOD · ◉ עכשיו · ⌃</button>}
  </div>;
}
