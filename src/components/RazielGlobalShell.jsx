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
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const ctx = useMemo(() => pageContext(pathname, search), [pathname, search]);

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
      const out = await getAiAnalysis({
        kind: "research",
        subject: question,
        facts,
        fast: true,
        persona: "raziel",
        operation: "site_global_shell_v1",
        ref: ctx.pathname,
        ref_name: ctx.title || ctx.type,
      });
      setAnswer(typeof out === "string" ? out : out?.text || out?.reply || "רזיאל לא החזיר תשובה כרגע.");
    } catch {
      setAnswer("רזיאל לא זמין כרגע. נסה שוב בעוד רגע.");
    } finally { setBusy(false); }
  }

  return <>
    <button onClick={() => setOpen(v => !v)} aria-label="רזיאל" style={{
      position:"fixed", left:18, bottom:18, zIndex:1200, border:"1px solid rgba(218,180,86,.5)",
      borderRadius:999, padding:"10px 15px", background:"rgba(12,8,24,.94)", color:"#f4df9a",
      boxShadow:"0 8px 30px rgba(0,0,0,.28)", cursor:"pointer", fontWeight:800
    }}>✨ רזיאל <small style={{opacity:.72}}>{isAdmin ? "· מנהל" : "· בבנייה"}</small></button>

    {open && <div dir="rtl" style={{
      position:"fixed", left:18, bottom:70, width:"min(390px, calc(100vw - 36px))", maxHeight:"70vh",
      overflow:"auto", zIndex:1201, background:"#100b20", color:"#f7f1df", border:"1px solid rgba(218,180,86,.38)",
      borderRadius:18, padding:18, boxShadow:"0 18px 60px rgba(0,0,0,.42)"
    }}>
      <div style={{fontSize:20,fontWeight:900,color:"#f1d77c"}}>✨ רזיאל</div>
      {!isAdmin ? <>
        <p style={{lineHeight:1.7,marginBottom:8}}>החוקר האישי של SOD1820 נבנה עכשיו כדי ללכת איתכם בין המספרים, הצפנים, המקורות והמחקרים באתר.</p>
        <div style={{fontSize:13,opacity:.72}}>בקרוב הוא יבין איפה אתם נמצאים, יסביר קשרים ויעזור לפתוח את הצעד הבא בחקירה.</div>
        <div style={{marginTop:14,fontWeight:800,color:"#d9bd67"}}>🏗️ בבנייה</div>
      </> : <>
        <div style={{fontSize:12,opacity:.68,margin:"6px 0 12px"}}>מצב מנהל · {ctx.type} · {ctx.pathname}</div>
        <textarea value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();ask();}}}
          placeholder="שאל את רזיאל על העמוד הזה…" rows={3} style={{width:"100%",boxSizing:"border-box",borderRadius:12,padding:11,background:"#18102d",color:"#fff",border:"1px solid #594878",resize:"vertical"}} />
        <button onClick={ask} disabled={busy||!q.trim()} style={{marginTop:8,border:0,borderRadius:10,padding:"9px 15px",fontWeight:800,cursor:"pointer"}}>{busy?"רזיאל חושב…":"שאל את רזיאל"}</button>
        {answer && <div style={{whiteSpace:"pre-wrap",lineHeight:1.65,marginTop:14,paddingTop:12,borderTop:"1px solid rgba(255,255,255,.1)"}}>{answer}</div>}
      </>}
    </div>}
  </>;
}
