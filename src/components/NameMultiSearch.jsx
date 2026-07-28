import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { getNameMulti, getAiAnalysis, logNameResearch } from "../lib/supabase.js";
import { aggregateFindings } from "../lib/nameNormalize.js";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { shareOrCopy } from "../lib/share.js";

// 🔎 חיפוש-שם רב-מסלולי (NameLab «חובה») — «לא נמצא» ≠ «אין מחקר».
// שם + שם-משפחה + תאריך-לידה + שאלה → מסלולי-מחקר, כל אחד עם מקור. שמות-פנים לא נחשפים.
//
// שלושת חוקי-הפרוטוקול (צוריאל, נעולים):
//  1. סדר המחקר = חוק: «דני ממן» → ① דני → ② ממן → ③ דני ממן (סינתזה). הצירוף אף פעם לא ראשון.
//  2. רובריקה בלי תוצאה = לא קיימת ב-UI (findings===0 → don't render). לא מוחקים מה-DB — רק לא מציגים.
//  3. תאריך + שאלה = שכבת-מחקר נוספת *אחרי* מחקר-השם, לא משנים אותו.

const C = { bg:"#f6f7f9", card:"#fff", ink:"#1b1d22", dim:"#5b6472", line:"#e4e7ec", blue:"#2f6df6", blueLine:"#d9e5ff", gold:"#b78900", green:"#1f8a4c", mut:"#9aa1ad", red:"#c0392b" };
const F = { h:"'Heebo',system-ui,sans-serif", m:"ui-monospace,SFMono-Regular,monospace" };

// fn פנימי → תווית-מקור ניטרלית (traceability בלי חשיפת ארכיטקטורה)
const SRC = {
  fn_tanach_together:"מקורות התנ״ך", fn_name_in_tanach:"מקורות התנ״ך", fn_tanach_proximity:"קרבה בתנ״ך",
  fn_name_in_verse:"רצף בפסוק", fn_verses_by_gematria:"מנוע הגימטריה", fn_split_gematria:"גימטריה מפוצלת",
  fn_notarikon:"ראשי/סופי תיבות", fn_hebrew_root:"מנוע השורש", fn_name_variants:"וריאציות-כתיב", fn_els_search:"מנוע הדילוגים",
};
const ST = { ok:{mk:"✓",c:C.green}, empty:{mk:"○",c:C.mut}, skipped:{mk:"–",c:"#c3c8d0"} };
// חוק רמת-הראיה: כל ממצא מסווג — ישיר / התאמת-ערך / פרשני
const EV = {
  direct:      { t:"ממצא ישיר",  bg:"#eef4ee", bd:"#cfe4d3", c:C.green },
  value_match: { t:"התאמת-ערך", bg:"#fff7e6", bd:"#f0e2b8", c:C.gold  },
  interpretive:{ t:"פרשני",      bg:"#eef3ff", bd:"#d3e0fb", c:C.blue  },
};
// 📖 מילון בשפה פשוטה — למי שרואה את זה בפעם הראשונה (בלי ז'רגון).
const ENGINE_HELP = {
  "גימטריה": "לכל אות יש מספר; מחברים את כל האותיות. שני ביטויים עם אותו סכום = «התאמת-ערך». זו לא הוכחה שהם קשורים — רק שהמספר שווה.",
  "מילוי": "כותבים כל אות כשם-האות המלא (א→«אלף», ב→«בית») ומחשבים את הערך של הכתיב המלא. כמו «להגדיל» את המילה ולראות מה בתוכה.",
  "אנגרם": "אותן אותיות בדיוק — בסדר אחר. כמו «אבי» ו«ביא». מציגים רק אנגרמות שבאמת קיימות כמילה, לא צירופי-אותיות סתם.",
  "וריאציית-כתיב": "אותו שם בכתיב אחר — מלא או חסר. למשל «דוד»/«דויד», «יעקב»/«יעקוב».",
  "תמורה בתנ״ך": "מחליפים אותיות לפי כלל קבוע (כמו אתב״ש: א↔ת, ב↔ש) — ובודקים אם המילה שיצאה מופיעה בתנ״ך.",
};
const EV_HELP = {
  direct: "ממצא ישיר — הופעה אמיתית בתנ״ך, או מילה/אנגרמה שבאמת קיימת. הכי חזק.",
  value_match: "התאמת-ערך — רק המספר (הגימטריה) שווה. מעניין, אבל לא הוכחת-קשר.",
  interpretive: "פרשני — הצעת פרשנות של ה-AI על בסיס כמה ממצאים. רמז, לא עובדה.",
};

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
        {on && t.evidence && EV[t.evidence] && <span title="רמת הראיה של הממצא" style={{ background:EV[t.evidence].bg, border:`1px solid ${EV[t.evidence].bd}`, borderRadius:999, color:EV[t.evidence].c, fontFamily:F.h, fontSize:10, fontWeight:800, padding:"2px 8px" }}>{EV[t.evidence].t}</span>}
        {src && <span style={{ background:"#eef4ee", border:"1px solid #cfe4d3", borderRadius:999, color:C.green, fontFamily:F.h, fontSize:10.5, fontWeight:800, padding:"2px 8px" }}>✓ {src}</span>}
      </div>
      {on && sampleText(t) && <div style={{ color:"#3a4553", fontFamily:F.h, fontSize:12.5, lineHeight:1.6, marginTop:6 }}>{sampleText(t)}</div>}
      {t.id === "split_gem" && t.data && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:7 }}>
          {(t.data.parts || []).map((p,i)=>(<span key={i} style={{ background:"#f3f7ff", border:`1px solid ${C.blueLine}`, borderRadius:999, padding:"3px 10px", fontFamily:F.h, fontSize:12, fontWeight:700, color:C.ink }}>{p.part} <b style={{ fontFamily:F.m, color:C.blue }}>{p.value}</b></span>))}
          {t.data.sum != null && <span style={{ background:"#fff7e6", border:"1px solid #f0e2b8", borderRadius:999, padding:"3px 10px", fontFamily:F.h, fontSize:12, fontWeight:800, color:C.gold }}>סכום {t.data.sum}</span>}
        </div>
      )}
      {t.id === "graded_prox" && t.data && (
        <div style={{ display:"grid", gap:5, marginTop:7 }}>
          <div style={{ fontFamily:F.h, fontSize:13, color:C.ink }}>דרגת התאמה: <b style={{ color:C.green }}>{t.data.top_grade}/5</b> — {t.data.top_label}</div>
          {(t.data.ladder||[]).map((l,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontFamily:F.h, fontSize:12.5, opacity: l.achieved?1:0.4 }}>
              <span style={{ color: l.achieved?C.green:C.mut, fontWeight:900, width:14, textAlign:"center" }}>{l.achieved?"✓":"○"}</span>
              <span style={{ color:C.ink, flex:1 }}>{l.label}</span>
              {l.count>0 && <b style={{ fontFamily:F.m, color:C.blue }}>{l.count}</b>}
            </div>
          ))}
        </div>
      )}
      {t.id === "transforms" && Array.isArray(t.data) && t.data.length>0 && (
        <div style={{ display:"grid", gap:6, marginTop:7 }}>
          {t.data.map((tr,i)=>(
            <div key={i} style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", background:"#fbfcfe", border:`1px solid ${C.line}`, borderRadius:8, padding:"6px 10px", fontFamily:F.h, fontSize:12.5 }}>
              <span style={{ color:C.mut, fontWeight:700 }}>{tr.method}</span>
              <b style={{ color:C.ink, fontSize:14 }}>{tr.word}</b>
              <b style={{ fontFamily:F.m, color:C.blue }}>{tr.value}</b>
              {(tr.in_tanach||0) > 0
                ? <span style={{ color:C.green, fontWeight:700 }}>✓ בתנ״ך ×{tr.in_tanach}{(tr.verses||[])[0] ? ` · ${tr.verses[0]}` : ""}</span>
                : <span style={{ color:C.mut }}>לא בתנ״ך</span>}
            </div>
          ))}
        </div>
      )}
      {t.id === "milui" && Array.isArray(t.data) && (
        <div style={{ display:"grid", gap:8, marginTop:7 }}>
          {t.data.map((pt,i)=>(
            <div key={i}>
              <div style={{ fontFamily:F.h, fontSize:12.5, color:C.ink }}><b>{pt.part}</b> · מילוי <b style={{ fontFamily:F.m, color:C.gold }}>{pt.milui}</b> <span style={{ color:C.mut }}>(רגיל {pt.ragil})</span></div>
              {(pt.matches||[]).length>0 && <div style={{ color:C.mut, fontFamily:F.h, fontSize:11, margin:"3px 0" }}>ביטויים בעלי אותו ערך <span style={{ opacity:.8 }}>(התאמת-ערך — לא משמעות · הסיכום המנורמל למעלה)</span>:</div>}
              <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                {(pt.matches||[]).slice(0,6).map((m,j)=>(<Link key={j} to={`/number/${encodeURIComponent(m.phrase)}`} title={`מקור: ${m.source}`} style={{ textDecoration:"none", background:"#fbfcfe", border:`1px solid ${C.line}`, borderRadius:999, padding:"3px 10px", fontFamily:F.h, fontSize:12, fontWeight:700, color:C.ink }}>{m.phrase}</Link>))}
                {(pt.matches||[]).length>6 && <span style={{ color:C.mut, fontFamily:F.h, fontSize:11, alignSelf:"center" }}>+{(pt.matches||[]).length-6}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      {t.id === "anagrams" && Array.isArray(t.data) && (
        <div style={{ display:"grid", gap:7, marginTop:7 }}>
          {t.data.filter(pt=>(pt.anagrams||[]).length>0).map((pt,i)=>(
            <div key={i} style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", fontFamily:F.h, fontSize:12.5 }}>
              <b style={{ color:C.ink }}>{pt.part}</b><span style={{ color:C.mut }}>→</span>
              {(pt.anagrams||[]).map((a,j)=>(<Link key={j} to={`/number/${encodeURIComponent(a.word)}`} style={{ textDecoration:"none", background:"#faf6ff", border:"1px solid #e6d8f7", borderRadius:999, padding:"3px 10px", color:"#6a4fbf", fontWeight:700 }}>{a.word} <span style={{ fontSize:10, opacity:.75 }}>{a.type}</span></Link>))}
            </div>
          ))}
        </div>
      )}
      {t.id === "shared_num" && t.data && (
        <div style={{ display:"grid", gap:6, marginTop:7 }}>
          {(t.data.cross_parts||[]).map((c,i)=>(
            <div key={"c"+i} style={{ background:"#fff7e6", border:"1px solid #f0e2b8", borderRadius:8, padding:"6px 10px", fontFamily:F.h, fontSize:12.5, color:C.ink }}>
              <b style={{ fontFamily:F.m, color:C.gold }}>{c.value}</b> משותף ל-{c.parts} רכיבים · {(c.sources||[]).map(s=>`${s.part}(${s.method})`).join(" · ")}
            </div>
          ))}
          {(t.data.internal||[]).slice(0,8).map((r,i)=>(
            <div key={"i"+i} style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap", fontFamily:F.h, fontSize:12.5, color:C.dim }}>
              <b style={{ color:C.ink }}>{r.part}</b>=<b style={{ fontFamily:F.m, color:C.blue }}>{r.value}</b>
              <span style={{ color:C.mut }}>ב-{r.methods} שיטות:</span>
              {(r.ms||[]).map((m,j)=>(<span key={j} style={{ background:"#f3f7ff", border:`1px solid ${C.blueLine}`, borderRadius:999, padding:"1px 8px", fontSize:11, fontWeight:700 }}>{m}</span>))}
            </div>
          ))}
        </div>
      )}
      {t.id === "variants" && Array.isArray(t.data) && t.data.length>0 && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:7 }}>
          {t.data.map((v,i)=>(<Link key={i} to={`/name-lab?w=${encodeURIComponent(v.form)}`} title={v.note} style={{ textDecoration:"none", background:"#f3f7ff", border:`1px solid ${C.blueLine}`, borderRadius:999, padding:"3px 11px", fontFamily:F.h, fontSize:12.5, fontWeight:700, color:C.blue }}>{v.form}</Link>))}
        </div>
      )}
    </div>
  );
}

// 🎯 קונצנזוס — סינתזה: ממצאים שכמה מסלולים בלתי-תלויים הצביעו עליהם.
function ConsensusBox({ consensus }) {
  if (!Array.isArray(consensus) || consensus.length === 0) return null;
  return (
    <div style={{ background:"linear-gradient(180deg,#fff,#eef7f0)", border:"1px solid #cfe4d3", borderRadius:12, padding:"13px 15px" }}>
      <div style={{ color:C.green, fontFamily:F.h, fontSize:14.5, fontWeight:800, marginBottom:3 }}>🎯 קונצנזוס רב-מנועי</div>
      <div style={{ color:C.dim, fontFamily:F.h, fontSize:11.5, marginBottom:9 }}>ממצאים שכמה <b>מסלולים בלתי-תלויים</b> הצביעו עליהם — לא כמה מצא מנוע אחד. «הפסוק שלך» לא נכלל בספירה.</div>
      <div style={{ display:"grid", gap:7 }}>
        {consensus.map((c,i)=>(
          <div key={i} style={{ background:"#fff", border:`1px solid ${C.line}`, borderRadius:10, padding:"9px 12px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <span style={{ background:"#1f8a4c", color:"#fff", borderRadius:999, minWidth:22, height:22, lineHeight:"22px", textAlign:"center", fontFamily:F.m, fontSize:13, fontWeight:800, padding:"0 6px" }}>{c.consensus}</span>
              <span style={{ color:C.mut, fontFamily:F.h, fontSize:11 }}>{c.type}</span>
              {c.type === "מילה"
                ? <Link to={`/number/${encodeURIComponent(c.target)}`} style={{ color:C.ink, fontFamily:F.h, fontSize:15.5, fontWeight:800, textDecoration:"none" }}>«{c.target}»</Link>
                : <span style={{ color:C.blue, fontFamily:F.h, fontSize:14.5, fontWeight:800 }}>{c.target}</span>}
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:6 }}>
              {(c.families||[]).map((fam,j)=>(<span key={j} style={{ background:"#eef4ee", border:"1px solid #cfe4d3", borderRadius:999, color:C.green, fontFamily:F.h, fontSize:10.5, fontWeight:800, padding:"2px 8px" }}>{fam}</span>))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 🕯️ הפסוק שלך — מתחיל באות הראשונה של השם, מסתיים באחרונה.
function NameVerseBox({ nv }) {
  if (!nv || !(nv.verses||[]).length) return null;
  return (
    <div style={{ background:"linear-gradient(180deg,#fffdf5,#fff7e6)", border:"1px solid #f0e2b8", borderRadius:12, padding:"13px 15px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:6 }}>
        <span style={{ color:C.gold, fontFamily:F.h, fontSize:14.5, fontWeight:800 }}>🕯️ הפסוק שלך</span>
        <span style={{ color:C.dim, fontFamily:F.h, fontSize:11.5 }}>מתחיל ב־<b>{nv.first}</b> ומסתיים ב־<b>{nv.last}</b></span>
      </div>
      <div style={{ color:C.blue, fontFamily:F.h, fontSize:12, fontWeight:800 }}>{nv.verses[0].ref}</div>
      <div style={{ color:C.ink, fontFamily:F.h, fontSize:15.5, lineHeight:1.85 }}>{nv.verses[0].text}</div>
      <div style={{ color:C.mut, fontFamily:F.h, fontSize:11, marginTop:6 }}>נהוג לאומרו בסוף תפילת העמידה · {nv.count} פסוקים אפשריים</div>
    </div>
  );
}

// 📊 ממצאים מנורמלים — Raw→Normalize→Dedupe→Rank→Render. שכבת-תצוגה (לא מנוע-משמעות):
// מאחד כתיבים זהים-מהותית + כפילויות בין-מנועיות, מדרג משמעותי-ראשון, Top-N + «הצג עוד».
// provenance נשמר: לחיצה על «מקור» מראה את המנועים והכתיבים המקוריים.
function NormalizedFindings({ items }) {
  const [all, setAll] = useState(false);
  const [openKey, setOpenKey] = useState(null);
  const [help, setHelp] = useState(false);
  // אילו מנועים באמת מופיעים בתוצאות — נסביר רק אותם (לא להציף)
  const shownEngines = [...new Set(items.flatMap(it => it.source_engines.map(s => s.engine)))].filter(e => ENGINE_HELP[e]);
  if (!items || !items.length) return null;
  const shown = all ? items : items.slice(0, 8);
  return (
    <div style={{ background:"linear-gradient(180deg,#ffffff,#f7f9fc)", border:`1px solid ${C.blueLine}`, borderRadius:14, padding:"14px 15px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:3 }}>
        <span style={{ fontSize:16 }}>📊</span>
        <span style={{ color:C.ink, fontFamily:F.h, fontSize:16, fontWeight:800 }}>ממצאים מנורמלים</span>
        <span style={{ color:C.mut, fontFamily:F.h, fontSize:11.5 }}>{items.length} ייחודיים</span>
        <span style={{ flex:1 }} />
        <button onClick={()=>setHelp(h=>!h)} style={{ cursor:"pointer", background: help?C.blue:"#fff", border:`1px solid ${help?C.blue:C.blueLine}`, borderRadius:999, color: help?"#fff":C.blue, fontFamily:F.h, fontSize:12, fontWeight:800, padding:"4px 12px" }}>❓ מה זה?</button>
      </div>
      <div style={{ color:C.mut, fontFamily:F.h, fontSize:11, marginBottom:10 }}>ביטוי שנמצא בכמה מנועים עולה למעלה. כל שורה פותחת את מקורותיה — שום דבר לא נמחק.</div>
      {/* 📖 מדריך למתחיל — נפתח בלחיצה על «מה זה?» */}
      {help && (
        <div style={{ background:"#f8fbff", border:`1px solid ${C.blueLine}`, borderRadius:12, padding:"12px 14px", marginBottom:12, display:"grid", gap:9 }}>
          <div style={{ color:C.ink, fontFamily:F.h, fontSize:13, fontWeight:800 }}>מה רואים כאן?</div>
          <div style={{ color:C.dim, fontFamily:F.h, fontSize:12.5, lineHeight:1.7 }}>אספנו כל מה שהמנועים מצאו על השם, <b>ניקינו כפילויות</b> (אותו ביטוי שנכתב בכמה צורות = פעם אחת), והצגנו את <b>החשוב קודם</b>. «<b style={{color:C.green}}>×N מסלולים</b>» = כמה מנועים <b>שונים ועצמאיים</b> הגיעו לאותו ביטוי — יותר מנועים = ממצא חזק יותר. לחיצה על ביטוי פותחת את דף-המספר שלו; «מקור» מראה מאיפה בא.</div>
          <div style={{ color:C.ink, fontFamily:F.h, fontSize:12.5, fontWeight:800, marginTop:2 }}>המנועים שהופיעו:</div>
          <div style={{ display:"grid", gap:7 }}>
            {shownEngines.map(e=>(
              <div key={e} style={{ display:"flex", gap:8, alignItems:"baseline" }}>
                <span style={{ background:"#f3f7ff", border:`1px solid ${C.blueLine}`, borderRadius:999, color:C.blue, fontFamily:F.h, fontSize:11, fontWeight:800, padding:"2px 9px", whiteSpace:"nowrap", flexShrink:0 }}>{e}</span>
                <span style={{ color:C.dim, fontFamily:F.h, fontSize:12, lineHeight:1.6 }}>{ENGINE_HELP[e]}</span>
              </div>
            ))}
          </div>
          <div style={{ color:C.mut, fontFamily:F.h, fontSize:11.5, lineHeight:1.6, borderTop:`1px dashed ${C.blueLine}`, paddingTop:8 }}>
            🟢 <b>ממצא ישיר</b> = הכי חזק (הופעה אמיתית) · 🟡 <b>התאמת-ערך</b> = רק המספר שווה · 🔵 <b>פרשני</b> = הצעה. <b>המשמעות</b> («מה זה אומר עליי») — אצל רזיאל/מטטרון למטה. כאן רק העובדות.
          </div>
        </div>
      )}
      <div style={{ display:"grid", gap:7 }}>
        {shown.map((it) => {
          const multi = it.source_engines.length > 1;
          const ev = EV[it.evidence_level];
          const open = openKey === it.normalized_key;
          return (
            <div key={it.normalized_key} style={{ background:"#fff", border:`1px solid ${multi ? "#cfe4d3" : C.line}`, borderRadius:10, padding:"9px 12px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                <Link to={`/number/${encodeURIComponent(it.display_value)}`} style={{ color:C.ink, fontFamily:F.h, fontSize:15, fontWeight:800, textDecoration:"none" }}>{it.display_value}</Link>
                {it.value != null && <span style={{ color:C.dim, fontFamily:F.h, fontSize:11.5 }}>ערך <b style={{ fontFamily:F.m, color:C.gold }}>{it.value}</b></span>}
                <span style={{ flex:1 }} />
                {ev && <span style={{ background:ev.bg, border:`1px solid ${ev.bd}`, borderRadius:999, color:ev.c, fontFamily:F.h, fontSize:10, fontWeight:800, padding:"2px 8px" }}>{ev.t}</span>}
                {multi
                  ? <span style={{ background:"#eef7f0", border:"1px solid #cfe4d3", borderRadius:999, color:C.green, fontFamily:F.h, fontSize:10.5, fontWeight:800, padding:"2px 8px" }}>×{it.source_engines.length} מסלולים</span>
                  : (it.occurrences > 1 && <span style={{ color:C.mut, fontFamily:F.m, fontSize:12, fontWeight:700 }}>×{it.occurrences}</span>)}
                <button onClick={()=>setOpenKey(open?null:it.normalized_key)} title="הצג מקור" style={{ cursor:"pointer", background:"transparent", border:`1px solid ${C.line}`, borderRadius:999, color:C.dim, fontFamily:F.h, fontSize:10.5, fontWeight:700, padding:"2px 9px" }}>{open?"סגור":"מקור"}</button>
              </div>
              {/* איחוד בין-מנועי גלוי: אילו מנועים, כמה כל אחד */}
              <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:6 }}>
                {it.source_engines.map((s,i)=>(<span key={i} style={{ background:"#f3f7ff", border:`1px solid ${C.blueLine}`, borderRadius:999, color:C.blue, fontFamily:F.h, fontSize:10.5, fontWeight:700, padding:"2px 8px" }}>{s.engine}{s.count>1?` ×${s.count}`:""}</span>))}
              </div>
              {open && (
                <div style={{ marginTop:8, paddingTop:8, borderTop:`1px dashed ${C.line}`, color:C.dim, fontFamily:F.h, fontSize:11.5, lineHeight:1.7 }}>
                  <b style={{ color:C.ink }}>{it.provenance.length} מקורות מקוריים</b> (נשמרים כפי-שהם):
                  <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:5 }}>
                    {it.provenance.map((p,i)=>(<span key={i} style={{ background:"#fbfcfe", border:`1px solid ${C.line}`, borderRadius:7, padding:"2px 8px", fontFamily:F.h, fontSize:11.5 }}><b style={{ color:C.ink }}>{p.raw}</b> <span style={{ color:C.mut }}>· {p.engine}</span></span>))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {items.length > 8 && (
        <button onClick={()=>setAll(!all)} style={{ marginTop:10, cursor:"pointer", background:"#fff", border:`1px solid ${C.line}`, borderRadius:999, color:C.blue, fontFamily:F.h, fontSize:12.5, fontWeight:800, padding:"7px 15px" }}>{all ? "הצג פחות ▲" : `הצג עוד ${items.length - 8} ▼`}</button>
      )}
    </div>
  );
}

// כלל-הזהב: מרנדרים רק מסלולים עם תוצאה (status='ok').
const ok = (arr) => (arr || []).filter(t => t.status === "ok");

const EXAMPLES = ["דני ממן", "אברהם", "יוסף בן יעקב", "מרים"];

export default function NameMultiSearch({ name, onResolve }) {
  const [nm, setNm] = useState(name || "");
  const [surname, setSurname] = useState("");
  const [birth, setBirth] = useState("");
  const [question, setQuestion] = useState("");
  const [more, setMore] = useState(false);        // מסוף: פותח את השדות האופציונליים (משפחה/תאריך/שאלה)
  const [res, setRes] = useState(null);
  const [phase, setPhase] = useState("idle");     // idle|busy|done|err
  const [ai, setAi] = useState(null);
  const [aiState, setAiState] = useState("idle");
  const { addToResearch, saveItem } = useResearch();
  const seededRef = useRef("");
  const autoRef = useRef(false);

  const run = useCallback(async () => {
    const w = (nm || "").trim();
    if (!w) return;
    seededRef.current = w;                          // כדי ש-onResolve→name-prop לא יפעיל ריצה כפולה
    autoRef.current = false;
    onResolve?.(w);                                // מזין את «השם הפעיל» לשאר כלי-הדף (הכרטיסייה הסגורה)
    setPhase("busy"); setRes(null); setAi(null); setAiState("idle"); setSumOpen(false); setSumText(null); setSumState("idle");
    try {
      const t0 = Date.now();
      const d = await getNameMulti(w, { surname, birthdate: birth, question });
      if (!d) { setPhase("err"); return; }
      setRes(d); setPhase("done");
      logNameResearch(d.graded ? d.combo : d, Date.now() - t0); // 📊 לוח-איכות (fire-and-forget)
      if (question.trim()) saveItem?.({ id:"nameq:"+w+":"+Date.now(), type:"name_question", title:`${w} — ${question.trim()}`, meta:{ question:question.trim(), name:w } });
    } catch { setPhase("err"); }
  }, [nm, surname, birth, question, saveItem, onResolve]);

  // מזרימים שם מ-URL/דף → ממלאים ומריצים אוטומטית פעם אחת (deep-link משתף)
  useEffect(() => {
    const w = (name || "").trim();
    if (w && w !== seededRef.current) { seededRef.current = w; setNm(w); autoRef.current = true; }
  }, [name]);
  useEffect(() => {
    if (autoRef.current && nm.trim()) { autoRef.current = false; run(); }
  }, [nm, run]);

  const analyze = useCallback(async () => {
    if (!res || aiState === "busy") return;
    setAiState("busy"); setAi(null);
    const combo = res.graded ? res.combo : res;
    const facts = `[הנחיה: אתה חוקר מלווה. ענה על שאלת המשתמש בהתבסס על עובדות-המנוע בלבד — הפרד עובדה מפרשנות, בלי נבואות. אם אין די בסיס, אמור זאת בכנות.]\n\nשאלה: ${res.question?.text || question}\nעובדות המחקר: ${res.question?.ai_facts || ""}\nמסלולים עם תוצאות: ${ok(combo?.tracks).map(t=>`${t.label}=${t.count}`).join(" · ")}`;
    try {
      const out = await getAiAnalysis({ kind:"name_lab", subject: res.input?.components?.full || nm, facts });
      setAi(out || null); setAiState(out ? "done" : "off");
    } catch { setAiState("off"); }
  }, [res, aiState, question, nm]);

  const comp = res?.input?.components;
  const vals = comp?.values;
  const graded = res?.graded === true;

  // חוק 1 — הסדר: ① השם הפרטי, ② שם-המשפחה, … ואז ③ הצירוף המלא כסינתזה בסוף.
  const parts = graded ? (res.sources || []) : [];
  const synthesisTracks = graded ? res.combo?.tracks : res?.tracks;
  // 📊 נרמול-ממצאים על כל המסלולים (צירוף + רכיבים) — Raw→Normalize→Dedupe→Rank.
  const normalized = useMemo(() => {
    if (!res) return [];
    try {
      // מדורג: מסמכי-הטוקנים נותנים את המנועים לפי-רכיב (מילוי/אנגרם/תמורה/גימטריית-הרכיב);
      // מהצירוף לוקחים רק את מה שהוא *ייחודי* לשם המלא (גימטריית-הצירוף + וריאציות-הכתיב המלאות),
      // כדי לא לספור פעמיים את אותו ממצא ("כפול שתיים"). שם-יחיד = כל המסלולים כרגיל.
      const lists = graded
        ? [...(res.sources || []).map(s => s.doc?.tracks),
           (res.combo?.tracks || []).filter(t => t.id === "combo_gem" || t.id === "variants")]
        : [res.tracks];
      return aggregateFindings(lists);
    } catch { return []; }   // שכבת-תצוגה לעולם לא מפילה את הדף
  }, [res, graded]);

  // 🔮 פופ-אפ «סיכום המחקר» — מטטרון מסכם את כל הממצאים בכמה שורות יפות לשיתוף.
  const [sumOpen, setSumOpen] = useState(false);
  const [sumText, setSumText] = useState(null);
  const [sumState, setSumState] = useState("idle"); // idle|busy|done|off
  const makeSummary = useCallback(async () => {
    setSumOpen(true);
    if (sumText || sumState === "busy") return;
    setSumState("busy");
    const top = normalized.slice(0, 6).map(it => `${it.display_value}${it.value != null ? ` (${it.value})` : ""}${it.source_engines.length > 1 ? ` — ${it.source_engines.length} מסלולים` : ""}`).join(" · ");
    const verse = res?.name_verse?.verses?.[0];
    const cons = (res?.consensus || [])[0];
    const facts = `[הנחיה: אתה מטטרון — החוקר המלווה. כתוב סיכום-מחקר קצר, יפה ומרגש (3-5 שורות) על השם, בשפה נגישה שאנשים ירצו לשתף. הממצאים הם עובדה מהמנוע — הפרד עובדה מפרשנות, בלי נבואות. אל תמציא — רק מהעובדות למטה.]\n\nשם: ${comp?.full || nm} (ערך ${vals?.full})\nממצאים בולטים (מנורמל): ${top || "—"}${cons ? `\nהכי מוסכם: ${cons.target} (${cons.consensus} משפחות)` : ""}${verse ? `\nהפסוק שלך: ${verse.ref} — ${verse.text}` : ""}`;
    try { const out = await getAiAnalysis({ kind: "name_lab", subject: comp?.full || nm, facts }); setSumText(out || null); setSumState(out ? "done" : "off"); }
    catch { setSumState("off"); }
  }, [normalized, res, comp, vals, nm, sumText, sumState]);

  return (
    <section dir="rtl" style={{ display:"grid", gap:14 }}>
      {/* ===== מסוף המחקר ===== */}
      <div style={{ background:C.card, border:`1px solid ${C.blueLine}`, borderRadius:16, overflow:"hidden", boxShadow:"0 2px 10px rgba(20,25,40,.05)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:9, padding:"11px 16px", background:"linear-gradient(180deg,#f5f8ff,#eef3ff)", borderBottom:`1px solid ${C.blueLine}` }}>
          <span style={{ display:"flex", gap:5 }}>
            <span style={{ width:9, height:9, borderRadius:999, background:"#f0b6b6" }} />
            <span style={{ width:9, height:9, borderRadius:999, background:"#f0dca6" }} />
            <span style={{ width:9, height:9, borderRadius:999, background:"#bfe4cd" }} />
          </span>
          <span style={{ color:C.ink, fontFamily:F.m, fontSize:12.5, fontWeight:800, letterSpacing:.3 }}>מעבדת-השם · מסוף מחקר</span>
          <span style={{ flex:1 }} />
          <span style={{ color:C.mut, fontFamily:F.h, fontSize:11 }}>«לא נמצא» ≠ «אין מחקר»</span>
        </div>

        <form onSubmit={e=>{ e.preventDefault(); run(); }} style={{ padding:"16px", display:"grid", gap:12 }}>
          {/* שורת-הפרומפט: השם הפרטי (חובה) */}
          <label style={{ display:"flex", alignItems:"center", gap:10, background:"#fbfcff", border:`1.5px solid ${nm.trim()?C.blue:C.line}`, borderRadius:12, padding:"4px 12px", transition:"border-color .15s" }}>
            <span style={{ color:C.blue, fontFamily:F.m, fontSize:22, fontWeight:800, lineHeight:1 }}>‹</span>
            <input value={nm} onChange={e=>setNm(e.target.value)} placeholder="הקלד שם פרטי…" required
              style={{ flex:1, minWidth:0, fontFamily:F.h, fontSize:22, fontWeight:800, padding:"12px 0", border:"none", outline:"none", background:"transparent", color:C.ink }} />
            {nm && <button type="button" onClick={()=>{ setNm(""); setRes(null); setPhase("idle"); }} title="נקה" style={{ cursor:"pointer", background:"transparent", border:"none", color:C.mut, fontSize:20, lineHeight:1, padding:"0 4px" }}>×</button>}
          </label>

          {/* שדות אופציונליים — נפתחים; חוק 3: שכבה נוספת, לא משנים את מחקר-השם */}
          {!more ? (
            <button type="button" onClick={()=>setMore(true)} style={{ justifySelf:"start", cursor:"pointer", background:"transparent", border:"none", color:C.blue, fontFamily:F.h, fontSize:12.5, fontWeight:800, padding:"0 2px" }}>
              ＋ שם-משפחה · תאריך · שאלה
            </button>
          ) : (
            <div style={{ display:"grid", gap:8, background:"#f8f9fb", border:`1px solid ${C.line}`, borderRadius:12, padding:"11px 12px" }}>
              <div style={{ color:C.mut, fontFamily:F.h, fontSize:11, fontWeight:700 }}>שכבות נוספות (לא חובה) — שם-המשפחה מרחיב את המחקר; תאריך ושאלה נכנסים אחרי מחקר-השם.</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <input value={surname} onChange={e=>setSurname(e.target.value)} placeholder="שם-משפחה…" style={{ flex:"1 1 130px", minWidth:0, fontFamily:F.h, fontSize:15, fontWeight:700, padding:"10px 12px", borderRadius:10, border:`1px solid ${C.line}`, background:"#fff", color:C.ink, minHeight:44 }} />
                <input value={birth} onChange={e=>setBirth(e.target.value)} placeholder="תאריך-לידה…" style={{ flex:"1 1 130px", minWidth:0, fontFamily:F.h, fontSize:15, fontWeight:700, padding:"10px 12px", borderRadius:10, border:`1px solid ${C.line}`, background:"#fff", color:C.ink, minHeight:44 }} />
              </div>
              <textarea value={question} onChange={e=>setQuestion(e.target.value)} placeholder="יש לך שאלה על השם? כתוב אותה כאן…" rows={2} style={{ width:"100%", boxSizing:"border-box", fontFamily:F.h, fontSize:14, fontWeight:600, padding:"10px 12px", borderRadius:10, border:`1px solid ${C.line}`, background:"#fff", color:C.ink, resize:"vertical" }} />
            </div>
          )}

          <button type="submit" disabled={!nm.trim() || phase==="busy"} style={{ cursor:"pointer", background:C.blue, border:"none", borderRadius:10, color:"#fff", fontFamily:F.h, fontSize:15.5, fontWeight:800, padding:"13px 22px", minHeight:48, opacity: (!nm.trim()||phase==="busy")?0.6:1 }}>
            {phase==="busy" ? "🔬 חוקר…" : `🔎 חקור את «${nm.trim() || "השם"}»`}
          </button>

          {phase==="idle" && !nm && (
            <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap" }}>
              <span style={{ color:C.mut, fontFamily:F.h, fontSize:11.5 }}>נסה:</span>
              {EXAMPLES.map((ex,i)=>(
                <button key={i} type="button" onClick={()=>{ setNm(ex); autoRef.current=true; }} style={{ cursor:"pointer", background:"#f3f7ff", border:`1px solid ${C.blueLine}`, borderRadius:999, color:C.blue, fontFamily:F.h, fontSize:12, fontWeight:700, padding:"5px 12px" }}>{ex}</button>
              ))}
            </div>
          )}
        </form>
      </div>

      {phase==="err" && <div style={{ color:C.red, fontFamily:F.h, fontSize:14, textAlign:"center" }}>החיפוש לא זמין כרגע. נסה שוב.</div>}

      {phase==="busy" && <div style={{ color:C.dim, fontFamily:F.h, fontSize:14, textAlign:"center", padding:"8px 0" }}>🔬 חוקר את «{nm.trim()}» בכל המנועים…</div>}

      {phase==="done" && res && (<>
        {/* הערת-הרחבה (חיפוש מדורג) / סיכום (יחיד) */}
        {graded ? (res.note && (
          <div style={{ background:"#fff7e6", border:"1px solid #f0e2b8", borderRadius:12, padding:"12px 14px" }}>
            <div style={{ color:C.gold, fontFamily:F.h, fontSize:13.5, fontWeight:800 }}>ℹ️ {res.note}</div>
          </div>
        )) : (
          <div style={{ background: res.literal_full_found ? "#eef7f0" : "#fff7e6", border:`1px solid ${res.literal_full_found ? "#cfe4d3":"#f0e2b8"}`, borderRadius:12, padding:"12px 14px" }}>
            <div style={{ color: res.literal_full_found ? C.green : C.gold, fontFamily:F.h, fontSize:14.5, fontWeight:800 }}>{res.summary}</div>
          </div>
        )}

        {/* פירוק + ערכים (עובדה, לא רובריקה) */}
        {comp && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
            <span style={{ background:"#f3f7ff", border:`1px solid ${C.blueLine}`, borderRadius:999, padding:"5px 12px", fontFamily:F.h, fontSize:13, fontWeight:800, color:C.ink }}>{comp.full} <b style={{ fontFamily:F.m, color:C.gold }}>{vals?.full}</b></span>
            {vals?.parts && Object.entries(vals.parts).map(([k,v])=>(<span key={k} style={{ background:"#fff", border:`1px solid ${C.line}`, borderRadius:999, padding:"5px 12px", fontFamily:F.h, fontSize:12.5, fontWeight:700, color:C.dim }}>{k} <b style={{ fontFamily:F.m, color:C.blue }}>{v}</b></span>))}
            {comp.initials && <span style={{ background:"#fff", border:`1px solid ${C.line}`, borderRadius:999, padding:"5px 12px", fontFamily:F.h, fontSize:12.5, fontWeight:700, color:C.dim }}>ר״ת {comp.initials}</span>}
          </div>
        )}

        {/* 🕯️ הפסוק שלך — מורם למעלה (הרגע האישי הראשון) */}
        <NameVerseBox nv={res.name_verse} />

        {/* 🔮 סיכום המחקר — פופ-אפ אחד יפה לשיתוף (מטטרון מסכם את הכל) */}
        <button onClick={makeSummary} style={{ cursor:"pointer", background:"linear-gradient(135deg,#b78900,#e7c869)", border:"none", borderRadius:12, color:"#1b1d22", fontFamily:F.h, fontSize:15, fontWeight:800, padding:"13px 20px", minHeight:48, boxShadow:"0 4px 16px rgba(183,137,0,.25)" }}>🔮 קבל סיכום מחקר — בכמה שורות ←</button>

        {/* 📊 סיכום מנורמל — קודם המסקנה המאוחדת, אז הפירוט לפי מסלול מתחת */}
        <NormalizedFindings items={normalized} />

        {/* ===== חוק 1 — סדר המחקר ===== */}
        {/* ① ② … רכיבים בנפרד (רק בחיפוש מדורג) */}
        {graded && parts.map((s, i) => {
          const okt = ok(s.doc?.tracks);
          if (okt.length === 0) return null;                     // כלל-הזהב: רכיב בלי ממצא לא מרונדר
          return (
            <div key={"p"+i} style={{ display:"grid", gap:8 }}>
              <div style={{ display:"flex", alignItems:"baseline", gap:9 }}>
                <span style={{ background:C.blue, color:"#fff", borderRadius:999, minWidth:24, height:24, lineHeight:"24px", textAlign:"center", fontFamily:F.m, fontSize:13, fontWeight:800 }}>{i+1}</span>
                <span style={{ color:C.ink, fontFamily:F.h, fontSize:16, fontWeight:800 }}>מחקר «{s.source}»</span>
                <span style={{ color:C.mut, fontFamily:F.h, fontSize:11.5 }}>{okt.length} מסלולים עם ממצא</span>
              </div>
              <div style={{ display:"grid", gap:8 }}>{okt.map((t,j)=><TrackCard key={j} t={t} />)}</div>
            </div>
          );
        })}

        {/* ③ סינתזה — הצירוף המלא (או, בשם-יחיד, המחקר המלא) */}
        {(() => {
          const okt = ok(synthesisTracks);
          const hasSynth = okt.length > 0 || (Array.isArray(res.consensus) && res.consensus.length > 0);
          if (!hasSynth) return null;
          return (
            <div style={{ display:"grid", gap:10, background: graded ? "linear-gradient(180deg,#fbfdff,#f3f7ff)" : "transparent", border: graded ? `1px solid ${C.blueLine}` : "none", borderRadius:14, padding: graded ? "14px 15px" : 0 }}>
              {graded && (
                <div style={{ display:"flex", alignItems:"baseline", gap:9, flexWrap:"wrap" }}>
                  <span style={{ fontSize:17 }}>🔗</span>
                  <span style={{ color:C.ink, fontFamily:F.h, fontSize:16, fontWeight:800 }}>סינתזה — הצירוף המלא «{res.full}»</span>
                  <span style={{ color:C.mut, fontFamily:F.h, fontSize:11.5 }}>מצליב בין הרכיבים שנחקרו למעלה</span>
                </div>
              )}
              {okt.length > 0 && <div style={{ display:"grid", gap:8 }}>{okt.map((t,j)=><TrackCard key={j} t={t} />)}</div>}
              <ConsensusBox consensus={res.consensus} />
            </div>
          );
        })()}

        {/* ===== חוק 3 — שכבת-מחקר נוספת: שאלה (תאריך) ===== */}
        {res.question && (
          <div style={{ background:"linear-gradient(180deg,#fff,#f3f7ff)", border:`1px solid ${C.blueLine}`, borderRadius:12, padding:"13px 15px" }}>
            <div style={{ color:C.mut, fontFamily:F.h, fontSize:10.5, fontWeight:800, letterSpacing:1, textTransform:"uppercase", marginBottom:6 }}>שכבת-מחקר נוספת</div>
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

        <button onClick={()=>addToResearch?.({ id:"namemulti:"+(comp?.full||nm), type:"name", title:comp?.full||nm, value:vals?.full })} style={{ justifySelf:"start", cursor:"pointer", background:"#fff", border:`1px solid ${C.line}`, borderRadius:999, color:C.ink, fontFamily:F.h, fontSize:13, fontWeight:800, padding:"9px 16px", minHeight:44 }}>➕ הוסף למחקר</button>
      </>)}

      {/* 🔮 פופ-אפ סיכום-המחקר — «כל הדברים היפים» בכמה שורות, לשיתוף */}
      {sumOpen && (
        <div onClick={()=>setSumOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(12,16,30,.55)", zIndex:5000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div onClick={e=>e.stopPropagation()} dir="rtl" style={{ background:"#fff", borderRadius:20, maxWidth:440, width:"100%", padding:"20px 20px 18px", boxShadow:"0 24px 70px rgba(0,0,0,.4)", maxHeight:"85vh", overflowY:"auto" }}>
            <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:12 }}>
              <span style={{ fontSize:22 }}>🔮</span>
              <div style={{ flex:1 }}>
                <div style={{ color:C.ink, fontFamily:F.h, fontSize:17, fontWeight:800, lineHeight:1.2 }}>סיכום המחקר</div>
                <div style={{ color:C.mut, fontFamily:F.h, fontSize:12 }}>{comp?.full || nm} · ערך {vals?.full}</div>
              </div>
              <button onClick={()=>setSumOpen(false)} style={{ cursor:"pointer", background:"#f3f4f6", border:"none", borderRadius:999, width:32, height:32, fontSize:18, color:C.dim, lineHeight:1 }}>×</button>
            </div>
            {sumState==="busy" ? (
              <div style={{ color:C.dim, fontFamily:F.h, fontSize:15, textAlign:"center", padding:"26px 0", lineHeight:1.7 }}>🔬 מטטרון מסכם את הממצאים היפים…</div>
            ) : sumState==="done" && sumText ? (
              <div style={{ color:C.ink, fontFamily:F.h, fontSize:16, lineHeight:1.95, background:"linear-gradient(180deg,#fffdf5,#fff7e6)", border:"1px solid #f0e2b8", borderRadius:14, padding:"16px 17px", whiteSpace:"pre-wrap" }}>{sumText}</div>
            ) : (
              <div style={{ color:C.dim, fontFamily:F.h, fontSize:14, textAlign:"center", padding:"18px 0" }}>הסיכום לא זמין כרגע. <button onClick={()=>{ setSumText(null); setSumState("idle"); makeSummary(); }} style={{ cursor:"pointer", background:"none", border:"none", color:C.blue, fontWeight:800, textDecoration:"underline" }}>נסה שוב</button></div>
            )}
            <div style={{ color:C.mut, fontFamily:F.h, fontSize:11, textAlign:"center", margin:"11px 0" }}>עובדה מהמנוע · הופרדה מפרשנות · בלי נבואות</div>
            {sumState==="done" && sumText && (
              <div style={{ display:"flex", gap:9, justifyContent:"center", flexWrap:"wrap" }}>
                <button onClick={()=>shareOrCopy({ title:`מעבדת השם — ${comp?.full||nm}`, text:`🔮 ${comp?.full||nm} (${vals?.full})\n\n${sumText}\n\n`, url:`${location.origin}/name-lab?w=${encodeURIComponent(comp?.full||nm)}` })} style={{ cursor:"pointer", background:C.blue, border:"none", borderRadius:999, color:"#fff", fontFamily:F.h, fontSize:14, fontWeight:800, padding:"11px 22px", minHeight:44 }}>🔗 שתף</button>
                <button onClick={()=>{ try{ navigator.clipboard.writeText(`${comp?.full||nm} (${vals?.full})\n${sumText}`);}catch{} }} style={{ cursor:"pointer", background:"#fff", border:`1px solid ${C.line}`, borderRadius:999, color:C.ink, fontFamily:F.h, fontSize:14, fontWeight:800, padding:"11px 22px", minHeight:44 }}>📋 העתק</button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
