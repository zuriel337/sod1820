import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { calcGem } from "../theme.js";

// 📅 תאריכים עבריים — תאריך לועזי → התאריך העברי המקביל (hebcal) + הגימטריה שלו.
// עדשה על העץ האחד: הערך מקשר ל-/number/:value (לא משכפל). @hebcal/core נטען דינמית.
export default function DatesTool() {
  const now = new Date();
  const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const [gDate, setGDate] = useState(iso);
  const [afterSunset, setAfterSunset] = useState(false);
  const [heb, setHeb] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!gDate) { setHeb(null); return; }
    let alive = true; setBusy(true);
    (async () => {
      try {
        const [y, m, d] = gDate.split("-").map(Number);
        if (!y || !m || !d) { if (alive) { setHeb(null); setBusy(false); } return; }
        const { HDate } = await import("@hebcal/core");
        let hd = new HDate(new Date(y, m - 1, d));
        if (afterSunset) hd = hd.next();               // אחרי השקיעה = היום העברי הבא
        const rendered = hd.renderGematriya();          // «כ״ב סִיוָן תש״נ»
        const pretty = rendered.replace(/[֑-ׇ]/g, ""); // בלי ניקוד/טעמים
        const clean = rendered.replace(/[^א-ת]/g, "");  // רק אותיות — לגימטריה
        if (alive) setHeb({ pretty, clean, value: calcGem(clean) });
      } catch { if (alive) setHeb(null); }
      finally { if (alive) setBusy(false); }
    })();
    return () => { alive = false; };
  }, [gDate, afterSunset]);

  return (
    <div className="rw-card" style={{ maxWidth: 560, margin: "0 auto", display: "grid", gap: 16 }}>
      <div>
        <div style={{ fontWeight: 800, fontSize: 20, color: "var(--ink,#1b1d22)", marginBottom: 4 }}>📅 תאריכים עבריים</div>
        <div className="rw-muted" style={{ fontSize: 13.5, lineHeight: 1.6 }}>
          תאריך לועזי → התאריך העברי המקביל + הגימטריה שלו. כל ערך מקשר לדף-המספר.
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input type="date" value={gDate} onChange={e => setGDate(e.target.value)} className="rw-num-in" style={{ maxWidth: 200, textAlign: "center" }} />
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 700, color: "var(--ink2,#5b6472)", cursor: "pointer" }}>
          <input type="checkbox" checked={afterSunset} onChange={e => setAfterSunset(e.target.checked)} /> אחרי השקיעה
        </label>
      </div>
      {busy && <div className="rw-muted" style={{ textAlign: "center" }}>מחשב…</div>}
      {heb && !busy && (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ textAlign: "center", background: "var(--accS,#eef3ff)", border: "1px solid var(--line,#e4e7ec)", borderRadius: 14, padding: "16px 12px" }}>
            <div className="rw-muted" style={{ fontSize: 12, letterSpacing: 2 }}>התאריך העברי</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "var(--ink,#1b1d22)", margin: "6px 0" }} dir="rtl">{heb.pretty}</div>
          </div>
          <Link to={`/number/${heb.value}`} className="rw-tchip on" style={{ textAlign: "center", textDecoration: "none", display: "block", padding: "12px" }}>
            גימטריה: {heb.value} · גלה הכל ←
          </Link>
        </div>
      )}
    </div>
  );
}
