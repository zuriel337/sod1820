import React, { useState, Suspense, lazy } from "react";
import { useSearchParams } from "react-router-dom";
import { NumHrefCtx } from "../lib/numHrefCtx.js";

// 🔢 כלי «דף מספר» בתוך המעבדה — מטמיע את דף-המספר הקנוני (EntityPage) *בתוך* השלד,
// כך שהמטייל בין מספרים נשאר במעבדה. ה-NumHrefCtx גורם לכל הקישורים הפנימיים
// (מספרים-קרובים · תהודה · הצלבות) להישאר ב-/research?tool=number&n=… במקום לצאת ל-/number.
// EntityPage נטען בעצלתיים (lazy) → קוד דף-המספר לא נגרר לבאנדל-הראשי של המעבדה,
// אלא רק כשבאמת פותחים מספר. חוסך נתח גדול מהטעינה הראשונית.
const EntityPage = lazy(() => import("../pages/EntityPage.jsx"));
const KEY_NUMS = [1820, 358, 26, 86, 541, 1776, 14, 45];
const labHref = n => `/research?tool=number&n=${n}`;

export default function NumberTool() {
  const [sp, setSp] = useSearchParams();
  const n = sp.get("n");
  const [q, setQ] = useState("");
  const open = v => {
    const x = parseInt(v ?? q, 10);
    if (Number.isFinite(x) && x > 0) setSp({ tool: "number", n: String(x) });
  };

  // מספר נבחר → דף-המספר מוטמע במעבדה
  if (n) {
    return (
      <div>
        <button className="rw-tchip" onClick={() => setSp({ tool: "number" })} style={{ marginBottom: 12 }}>← מספר אחר</button>
        <NumHrefCtx.Provider value={labHref}>
          <Suspense fallback={<div className="rw-card rw-muted">טוען דף מספר…</div>}>
            <EntityPage embedPhrase={n} />
          </Suspense>
        </NumHrefCtx.Provider>
      </div>
    );
  }

  // מסך-פתיחה — הקלדת מספר
  return (
    <div className="rw-card">
      <div className="rw-muted" style={{ fontWeight: 700, marginBottom: 12 }}>🔢 דף מספר · פתח כל מספר וראה הכל — גימטריאות · הצלבות · התכנסויות · אירועים. הטיול נשאר כאן במעבדה.</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input className="rw-num-in" inputMode="numeric" dir="ltr" value={q}
          onChange={e => setQ(e.target.value.replace(/[^\d]/g, ""))}
          onKeyDown={e => e.key === "Enter" && open()}
          aria-label="הקלד מספר" placeholder="הקלד מספר…" />
        <button className="rw-tchip on" onClick={() => open()} disabled={!q} style={!q ? { opacity: 0.5 } : undefined}>פתח דף מספר ←</button>
      </div>
      <div className="rw-muted" style={{ margin: "16px 0 8px", fontSize: 12.5, fontWeight: 700 }}>מספרי-מפתח:</div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {KEY_NUMS.map(k => (
          <button key={k} className="rw-chip" style={{ cursor: "pointer" }} onClick={() => open(k)}>{k.toLocaleString("he")}</button>
        ))}
      </div>
    </div>
  );
}
