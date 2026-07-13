import React, { useState, useEffect, Suspense, lazy } from "react";
import { useSearchParams } from "react-router-dom";
import { NumHrefCtx } from "../lib/numHrefCtx.js";
import NumberEngineLogo from "./NumberEngineLogo.jsx";
import { emit, EVENTS } from "../lib/research/eventBus.js";
import { calcGem } from "../theme.js";

// 🔢 כלי «דף המספר» בתוך המעבדה — «הגוגל של המספרים». מטמיע את דף-המספר הקנוני (EntityPage)
// *בתוך* השלד, כך שהמטייל בין מספרים/מילים נשאר במעבדה. מקבל מספר *או* מילה/משפט —
// EntityPage פותר את שניהם (resolve) ומציג את כל הגימטריות, ההצלבות וההתכנסויות.
// ה-NumHrefCtx גורם לקישורים הפנימיים להישאר ב-/research?tool=number&n=… במקום לצאת ל-/number.
// EntityPage נטען בעצלתיים (lazy) → קוד דף-המספר לא נגרר לבאנדל-הראשי של המעבדה.
const EntityPage = lazy(() => import("../pages/EntityPage.jsx"));
const KEY_NUMS = [1820, 358, 26, 86, 541, 1776, 14, 45];
const SAMPLE_WORDS = ["משיח", "גאולה", "ישראל"];
const labHref = n => `/research?tool=number&n=${encodeURIComponent(n)}`;

export default function NumberTool() {
  const [sp, setSp] = useSearchParams();
  const n = sp.get("n");
  const [q, setQ] = useState("");
  // מקבל מספר *או* מילה/משפט — שניהם נפתחים בדף-המספר (EntityPage פותר אוטומטית).
  const open = v => {
    const val = String(v ?? q).trim();
    if (val) setSp({ tool: "number", n: val });
  };

  // 🎯 שידור הישות שבמוקד → הפאנל ההקשרי (מספר או ביטוי; ביטוי-עברי מציג את כל השיטות)
  useEffect(() => {
    if (!n) { emit(EVENTS.ENTITY_BLUR); return; }
    const isNum = /^\d+$/.test(n.trim());
    const word = /[א-ת]/.test(n) ? n : null;
    emit(EVENTS.ENTITY_FOCUS, { title: n, word, value: isNum ? Number(n) : calcGem(word || n) });
  }, [n]);
  useEffect(() => () => emit(EVENTS.ENTITY_BLUR), []);

  // ערך נבחר (מספר או ביטוי) → דף-המספר מוטמע במעבדה
  if (n) {
    return (
      <div>
        <button className="rw-tchip" onClick={() => setSp({ tool: "number" })} style={{ marginBottom: 12 }}>← חיפוש חדש</button>
        <NumHrefCtx.Provider value={labHref}>
          <Suspense fallback={<div className="rw-card rw-muted">טוען דף המספר…</div>}>
            <EntityPage embedPhrase={n} />
          </Suspense>
        </NumHrefCtx.Provider>
      </div>
    );
  }

  // מסך-פתיחה — «הגוגל של המספרים»: מספר · מילה · משפט
  return (
    <div className="rw-card" style={{ textAlign: "center", padding: "26px 20px" }}>
      <div style={{ marginBottom: 12 }}><NumberEngineLogo text="הגוגל של המספרים" size={40} to={null} /></div>
      <div className="rw-muted" style={{ fontWeight: 600, marginBottom: 16, lineHeight: 1.7, maxWidth: 480, marginInline: "auto" }}>
        הקלידו <b>מספר · מילה · או משפט</b> — וראו את הכל בדף-המספר: כל הגימטריות ברשימה, הביטויים השווים, ההצלבות, ההתכנסויות והאירועים.
      </div>
      <div style={{ display: "flex", gap: 8, maxWidth: 520, margin: "0 auto" }}>
        <input className="rw-num-in" dir="auto" value={q} style={{ flex: 1, textAlign: "center" }}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === "Enter" && open()}
          aria-label="הקלד מספר או מילה" placeholder="מספר · מילה · משפט…" />
        <button className="rw-tchip on" onClick={() => open()} disabled={!q.trim()} style={!q.trim() ? { opacity: 0.5 } : undefined}>חפש ←</button>
      </div>
      <div className="rw-muted" style={{ margin: "18px 0 8px", fontSize: 12.5, fontWeight: 700 }}>מספרי-מפתח:</div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "center" }}>
        {KEY_NUMS.map(k => (
          <button key={k} className="rw-chip" style={{ cursor: "pointer" }} onClick={() => open(k)}>{k.toLocaleString("he")}</button>
        ))}
      </div>
      <div className="rw-muted" style={{ margin: "14px 0 8px", fontSize: 12.5, fontWeight: 700 }}>או מילה:</div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "center" }}>
        {SAMPLE_WORDS.map(w => (
          <button key={w} className="rw-chip" style={{ cursor: "pointer" }} onClick={() => open(w)}>{w}</button>
        ))}
      </div>
    </div>
  );
}
