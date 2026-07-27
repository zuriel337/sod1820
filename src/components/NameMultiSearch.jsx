import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { getNameMulti, getAiAnalysis } from "../lib/supabase.js";
import { useResearch } from "../lib/research/ResearchProvider.jsx";

// 🔎 חיפוש-שם רב-מסלולי (NameLab «חובה») — «לא נמצא» ≠ «אין מחקר».
// שם + שם-משפחה + תאריך-לידה + שאלה → מסלולי-מחקר, כל אחד עם מקור. שמות-פנים לא נחשפים.

const C = { bg:"#f6f7f9", card:"#fff", ink:"#1b1d22", dim:"#5b6472", line:"#e4e7ec", blue:"#2f6df6", blueLine:"#d9e5ff", gold:"#b78900", green:"#1f8a4c", mut:"#9aa1ad", red:"#c0392b" };
const F = { h:"'Heebo',system-ui,sans-serif", m:"ui-monospace,SFMono-Regular,monospace" };

// fn פנימי → תווית-מקור ניטרלית (traceability בלי חשיפת ארכיטקטורה)
const SRC = {
  fn_tanach_together:"מקורות התנ״ך", fn_name_in_tanach:"מקורות התנ״ך", fn_tanach_proximity:"קרבה בתנ״ך",
  fn_name_in_verse:"רצף בפסוק", fn_verses_by_gematria:"מנוע הגימטריה", fn_split_gematria:"גימטריה מפוצלת",
  fn_notarikon:"ראשי/סופי תיבות", fn_hebrew_root:"מנוע השורש", fn_name_variants:"וריאציות-כתיב", fn_els_search:"מנוע הדילוגים",
};
const ST = { ok:{mk:"✓",c:C.green}, empty:{mk:"○",c:C.mut}, skipped:{mk:"–",c:"#c3c8d0"} };

const inp = { flex:1, minWidth:130, fontFamily:F.h, fontSize:15, fontWeight:700, padding:"11px 13px", borderRadius:10, border:`1px solid ${C.line}`, background:"#fff", color:C.ink, minHeight:44, boxSizing:"border-box" };

function sampleText(t) {
  const s = t.sample;
  if (!s) return null;
  if (s.ref && s.text) return <span><b style={{ color:C.blue }}>{s.ref}</b> — {String(s.text).slice(0,70)}…</span>;
  if (s.ref && s.verses != null) return <span><b style={{ color:C.blue }}>{s.ref}</b> · {s.verses} פסוקים</span>;
  if (s.ref && s.distance != null) return <span><b style={{ color:C.blue }}>{s.ref}</b> · מרחק {s.distance} · {s.order}</span>;
  if (s.ref) return <b style={{ color:C.blue }}>{s.ref}</b>;
  return null;
}

function TrackCard({ t }) {
  const st = ST[t.status] || ST.empty;
  const src = SRC[t.source_fn];
  const on = t.status === "ok";
  return (
    <div style={{ background: on ? "#fff" : "#fbfcfe", border:`1px solid ${on ? C.blueLine : C.line}`, borderRadius:12, padding:"11px 13px", opacity: t.status==="skipped"?0.7:1 }}>
      <div style={{ display:"flex", alignItems:"center", gap:9, flexWrap:"wrap" }}>
        <span style={{ color:st.c, fontWeight:900, fontSize:15, width:16, textAlign:"center" }}>{st.mk}</span>
        <span style={{ color:C.ink, fontFamily:F.h, fontSize:14.5, fontWeight:800 }}>{t.label}</span>
        {t.count > 0 && <b style={{ fontFamily:F.m, color: on?C.blue:C.mut, fontSize:15 }}>{t.count}</b>}
        {t.value != null && <span style={{ color:C.dim, fontFamily:F.h, fontSize:12 }}>ערך <b style={{ fontFamily:F.m, color:C.gold }}>{t.value}</b></span>}
        <span style={{ flex:1 }} />
        {src && <span style={{ background:"#eef4ee", border:"1px solid #cfe4d3", borderRadius:999, color:C.green, fontFamily:F.h, fontSize:10.5, fontWeight:800, padding:"2px 8px" }}>✓ {src}</span>}
      </div>
      {on && sampleText(t) && <div style={{ color:"#3a4553", fontFamily:F.h, fontSize:12.5, lineHeight:1.6, marginTop:6 }}>{sampleText(t)}</div>}
      {t.id === "split_gem" && t.data && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:7 }}>
          {(t.data.parts || []).map((p,i)=>(<span key={i} style={{ background:"#f3f7ff", border:`1px solid ${C.blueLine}`, borderRadius:999, padding:"3px 10px", fontFamily:F.h, fontSize:12, fontWeight:700, color:C.ink }}>{p.part} <b style={{ fontFamily:F.m, color:C.blue }}>{p.value}</b></span>))}
          {t.data.sum != null && <span style={{ background:"#fff7e6", border:"1px solid #f0e2b8", borderRadius:999, padding:"3px 10px", fontFamily:F.h, fontSize:12, fontWeight:800, color:C.gold }}>סכום {t.data.sum}</span>}
        </div>
      )}
      {t.id === "variants" && Array.isArray(t.data) && t.data.length>0 && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:7 }}>
          {t.data.map((v,i)=>(<Link key={i} to={`/name-lab?w=${encodeURIComponent(v.form)}`} title={v.note} style={{ textDecoration:"none", background:"#f3f7ff", border:`1px solid ${C.blueLine}`, borderRadius:999, padding:"3px 11px", fontFamily:F.h, fontSize:12.5, fontWeight:700, color:C.blue }}>{v.form}</Link>))}
        </div>
      )}
      {t.status === "empty" && !sampleText(t) && <div style={{ color:C.mut, fontFamily:F.h, fontSize:12, marginTop:5 }}>לא נמצאו תוצאות במסלול זה.</div>}
      {t.status === "skipped" && <div style={{ color:C.mut, fontFamily:F.h, fontSize:12, marginTop:5 }}>{t.note || "דולג."}</div>}
    </div>
  );
}

export default function NameMultiSearch({ name }) {
  const [nm, setNm] = useState(name || "");
  const [surname, setSurname] = useState("");
  const [birth, setBirth] = useState("");
  const [question, setQuestion] = useState("");
  const [res, setRes] = useState(null);
  const [phase, setPhase] = useState("idle"); // idle|busy|done|err
  const [ai, setAi] = useState(null);
  const [aiState, setAiState] = useState("idle");
  const { addToResearch, saveItem } = useResearch();

  // מזרימים את השם מהחיפוש הראשי של הדף, אך הוא נשאר ניתן-לעריכה בתיבה כאן
  useEffect(() => { if (name) setNm(name); }, [name]);

  const run = useCallback(async () => {
    const w = (nm || "").trim();
    if (!w) return;
    setPhase("busy"); setRes(null); setAi(null); setAiState("idle");
    try {
      const d = await getNameMulti(w, { surname, birthdate: birth, question });
      if (!d) { setPhase("err"); return; }
      setRes(d); setPhase("done");
      // שמירה אוטומטית של השאלה עם המחקר (גם וגם)
      if (question.trim()) saveItem?.({ id:"nameq:"+w+":"+Date.now(), type:"name_question", title:`${w} — ${question.trim()}`, meta:{ question:question.trim(), name:w } });
    } catch { setPhase("err"); }
  }, [nm, surname, birth, question, saveItem]);

  const analyze = useCallback(async () => {
    if (!res || aiState === "busy") return;
    setAiState("busy"); setAi(null);
    const facts = `[הנחיה: אתה חוקר מלווה. ענה על שאלת המשתמש בהתבסס על עובדות-המנוע בלבד — הפרד עובדה מפרשנות, בלי נבואות. אם אין די בסיס, אמור זאת בכנות.]\n\nשאלה: ${res.question?.text || question}\nעובדות המחקר: ${res.question?.ai_facts || ""}\nמסלולים עם תוצאות: ${(res.tracks||[]).filter(t=>t.status==="ok").map(t=>`${t.label}=${t.count}`).join(" · ")}`;
    try {
      const out = await getAiAnalysis({ kind:"name_lab", subject: res.input?.components?.full || nm, facts });
      setAi(out || null); setAiState(out ? "done" : "off");
    } catch { setAiState("off"); }
  }, [res, aiState, question, nm]);

  const comp = res?.input?.components;
  const vals = comp?.values;

  return (
    <section dir="rtl" style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:16, padding:"18px 20px", display:"grid", gap:14 }}>
      <div>
        <h2 style={{ color:C.ink, fontFamily:F.h, fontSize:19, fontWeight:800, margin:"0 0 3px" }}>🔎 חיפוש רב-מסלולי</h2>
        <div style={{ color:C.dim, fontFamily:F.h, fontSize:12.5 }}>שם-משפחה · תאריך-לידה · שאלה — והמערכת מנסה כל סוג התאמה. «לא נמצא» ≠ «אין מחקר».</div>
      </div>

      <form onSubmit={e=>{ e.preventDefault(); run(); }} style={{ display:"grid", gap:8 }}>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <input value={nm} onChange={e=>setNm(e.target.value)} placeholder="שם פרטי (חובה)…" required style={{ ...inp, flex:"2 1 180px", fontSize:17, borderColor: nm.trim()?C.blueLine:C.line }} />
          <input value={surname} onChange={e=>setSurname(e.target.value)} placeholder="שם-משפחה…" style={inp} />
          <input value={birth} onChange={e=>setBirth(e.target.value)} placeholder="תאריך-לידה…" style={inp} />
        </div>
        <textarea value={question} onChange={e=>setQuestion(e.target.value)} placeholder="יש לך שאלה על השם? כתוב אותה כאן…" rows={2} style={{ ...inp, minWidth:0, width:"100%", resize:"vertical", fontWeight:600 }} />
        <button type="submit" disabled={!nm.trim() || phase==="busy"} style={{ cursor:"pointer", background:C.blue, border:"none", borderRadius:10, color:"#fff", fontFamily:F.h, fontSize:15, fontWeight:800, padding:"12px 22px", minHeight:44, opacity: (!nm.trim()||phase==="busy")?0.6:1 }}>
          {phase==="busy" ? "חוקר…" : `🔎 חקור את «${nm.trim() || "השם"}»`}
        </button>
        <div style={{ color:C.mut, fontFamily:F.h, fontSize:11.5 }}>חובה: שם פרטי בלבד. שם-משפחה ותאריך-לידה מרחיבים את המחקר.</div>
      </form>

      {phase==="err" && <div style={{ color:C.red, fontFamily:F.h, fontSize:14 }}>החיפוש לא זמין כרגע. נסה שוב.</div>}

      {phase==="done" && res && (<>
        {/* סיכום */}
        <div style={{ background: res.literal_full_found ? "#eef7f0" : "#fff7e6", border:`1px solid ${res.literal_full_found ? "#cfe4d3":"#f0e2b8"}`, borderRadius:12, padding:"12px 14px" }}>
          <div style={{ color: res.literal_full_found ? C.green : C.gold, fontFamily:F.h, fontSize:14.5, fontWeight:800 }}>{res.summary}</div>
          <div style={{ color:C.dim, fontFamily:F.h, fontSize:12.5, marginTop:4 }}>{res.tracks_with_results} מסלולים עם תוצאות מתוך {(res.tracks||[]).length}.</div>
        </div>

        {/* 🕯️ הפסוק שלך — מתחיל באות הראשונה של השם, מסתיים באחרונה */}
        {res.name_verse && (res.name_verse.verses||[]).length > 0 && (
          <div style={{ background:"linear-gradient(180deg,#fffdf5,#fff7e6)", border:"1px solid #f0e2b8", borderRadius:12, padding:"13px 15px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:6 }}>
              <span style={{ color:C.gold, fontFamily:F.h, fontSize:14.5, fontWeight:800 }}>🕯️ הפסוק שלך</span>
              <span style={{ color:C.dim, fontFamily:F.h, fontSize:11.5 }}>מתחיל ב־<b>{res.name_verse.first}</b> ומסתיים ב־<b>{res.name_verse.last}</b></span>
            </div>
            <div style={{ color:C.blue, fontFamily:F.h, fontSize:12, fontWeight:800 }}>{res.name_verse.verses[0].ref}</div>
            <div style={{ color:C.ink, fontFamily:F.h, fontSize:15.5, lineHeight:1.85 }}>{res.name_verse.verses[0].text}</div>
            <div style={{ color:C.mut, fontFamily:F.h, fontSize:11, marginTop:6 }}>נהוג לאומרו בסוף תפילת העמידה · {res.name_verse.count} פסוקים אפשריים</div>
          </div>
        )}

        {/* פירוק + ערכים */}
        {comp && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
            <span style={{ background:"#f3f7ff", border:`1px solid ${C.blueLine}`, borderRadius:999, padding:"5px 12px", fontFamily:F.h, fontSize:13, fontWeight:800, color:C.ink }}>{comp.full} <b style={{ fontFamily:F.m, color:C.gold }}>{vals?.full}</b></span>
            {vals?.parts && Object.entries(vals.parts).map(([k,v])=>(<span key={k} style={{ background:"#fff", border:`1px solid ${C.line}`, borderRadius:999, padding:"5px 12px", fontFamily:F.h, fontSize:12.5, fontWeight:700, color:C.dim }}>{k} <b style={{ fontFamily:F.m, color:C.blue }}>{v}</b></span>))}
            {comp.initials && <span style={{ background:"#fff", border:`1px solid ${C.line}`, borderRadius:999, padding:"5px 12px", fontFamily:F.h, fontSize:12.5, fontWeight:700, color:C.dim }}>ר״ת {comp.initials}</span>}
          </div>
        )}

        {/* מסלולים */}
        <div style={{ display:"grid", gap:8 }}>
          {(res.tracks||[]).map((t,i)=><TrackCard key={i} t={t} />)}
        </div>

        {/* שאלה → AI */}
        {res.question && (
          <div style={{ background:"linear-gradient(180deg,#fff,#f3f7ff)", border:`1px solid ${C.blueLine}`, borderRadius:12, padding:"13px 15px" }}>
            <div style={{ color:C.ink, fontFamily:F.h, fontSize:13.5, fontWeight:800, marginBottom:6 }}>❓ {res.question.text}</div>
            {aiState==="done" && ai ? (
              <div style={{ color:C.ink, fontFamily:F.h, fontSize:15, lineHeight:1.8 }}>{ai}</div>
            ) : aiState==="busy" ? (
              <div style={{ color:C.dim, fontFamily:F.h, fontSize:14 }}>🔬 החוקר מנתח…</div>
            ) : aiState==="off" ? (
              <div style={{ color:C.dim, fontFamily:F.h, fontSize:13.5 }}>הניתוח לא זמין כרגע. <button onClick={analyze} style={{ cursor:"pointer", background:"none", border:"none", color:C.blue, fontWeight:700, textDecoration:"underline" }}>נסה שוב</button></div>
            ) : (
              <button onClick={analyze} style={{ cursor:"pointer", background:`linear-gradient(135deg,${C.blue},#5b8bff)`, border:"none", borderRadius:10, color:"#fff", fontFamily:F.h, fontSize:14, fontWeight:800, padding:"10px 18px", minHeight:44 }}>🤖 נתח את השאלה (עובדה מהמנוע, לא נבואה)</button>
            )}
            <div style={{ color:C.mut, fontFamily:F.h, fontSize:11, marginTop:7 }}>💾 השאלה נשמרה עם המחקר.</div>
          </div>
        )}

        <button onClick={()=>addToResearch?.({ id:"namemulti:"+(comp?.full||name), type:"name", title:comp?.full||name, value:vals?.full })} style={{ justifySelf:"start", cursor:"pointer", background:"#fff", border:`1px solid ${C.line}`, borderRadius:999, color:C.ink, fontFamily:F.h, fontSize:13, fontWeight:800, padding:"9px 16px", minHeight:44 }}>➕ הוסף למחקר</button>
      </>)}
    </section>
  );
}
