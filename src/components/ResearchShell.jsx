import React, { useState, useEffect, useRef } from "react";
import { rwCss } from "../lib/research/theme.js";
import ResearchCenter from "./ResearchCenter.jsx";

// 🏛️ ResearchShell — שלד קבוע. שני סרגלים בצדדים, גרירה אמיתית לשינוי-רוחב + קיפול לסרגל.
// שמאל = העולם שלי (אני·המחקר·שמורים) · ימין = מנועים (AI) · מרכז = המעבדה (גמיש).
// «שמאל הוא מה שנכנס, ימין הוא מה שהמערכת עושה, מרכז הוא מה שנוצר.» מובייל = Bottom-Sheet.
const num = (k, d) => { try { const v = parseInt(localStorage.getItem(k)); return Number.isFinite(v) ? v : d; } catch { return d; } };

export default function ResearchShell({ children }) {
  const [sheet, setSheet] = useState(false);
  const [rightOpen, setRightOpen] = useState(() => { try { return localStorage.getItem("rw_right_open") !== "0"; } catch { return true; } });
  const [leftOpen, setLeftOpen] = useState(() => { try { return localStorage.getItem("rw_left_open") !== "0"; } catch { return true; } });
  const [rightW, setRightW] = useState(() => num("rw_right_w", 320));
  const [leftW, setLeftW] = useState(() => num("rw_left_w", 250));
  useEffect(() => { document.title = "סביבת המחקר · סוד 1820"; }, []);
  useEffect(() => { try { localStorage.setItem("rw_right_open", rightOpen ? "1" : "0"); localStorage.setItem("rw_right_w", String(rightW)); } catch { /**/ } }, [rightOpen, rightW]);
  useEffect(() => { try { localStorage.setItem("rw_left_open", leftOpen ? "1" : "0"); localStorage.setItem("rw_left_w", String(leftW)); } catch { /**/ } }, [leftOpen, leftW]);

  // ✋ גרירה אמיתית: שינוי-רוחב תוך כדי גרירה; תזוזה זעירה = לחיצה (קיפול); גרירה מתחת למינ׳ = קיפול
  const Grip = ({ side }) => {
    const drag = useRef(null);
    const startW = side === "right" ? rightW : leftW;
    const setW = side === "right" ? setRightW : setLeftW;
    const collapse = side === "right" ? () => setRightOpen(false) : () => setLeftOpen(false);
    const down = e => { drag.current = { x: e.clientX, w: startW, moved: 0 }; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /**/ } };
    const move = e => {
      if (!drag.current) return;
      const dx = e.clientX - drag.current.x;
      drag.current.moved = Math.max(drag.current.moved, Math.abs(dx));
      // ימין: הפאנל מימין למפריד → גרירה ימינה(dx>0) מקטינה. שמאל: הפוך.
      let w = side === "right" ? drag.current.w - dx : drag.current.w + dx;
      setW(Math.max(120, Math.min(560, w)));
    };
    const up = () => {
      const d = drag.current; drag.current = null; if (!d) return;
      if (d.moved < 6) { side === "right" ? setRightOpen(o => !o) : setLeftOpen(o => !o); }   // לחיצה = החלפת מצב
      else if ((side === "right" ? rightW : leftW) < 150) collapse();                          // נגרר קטן מדי = קיפול
    };
    return <button className="rw-grip" title="גרור לשינוי רוחב · לחץ לקיפול" onPointerDown={down} onPointerMove={move} onPointerUp={up}><b>⋮⋮</b></button>;
  };
  const Rail = ({ label, icon, onClick }) => (
    <button className="rw-rail" onClick={onClick} title="פתח"><span className="ic">{icon}</span>{label}</button>
  );

  return (
    <div className="rw" dir="rtl">
      <style>{rwCss()}</style>
      <header className="rw-head">
        <div className="rw-logo">סוד <b>1820</b></div>
        <div className="rw-search">🔎 חפש מספר · ביטוי · פסוק · פוסט…</div>
        <div className="rw-ic" title="התראות">🔔</div>
        <div className="rw-av">א</div>
      </header>

      <div className={"rw-stage" + (!rightOpen && !leftOpen ? " wide" : "")}>
        {/* ימין — מנועים / AI */}
        {rightOpen
          ? <><aside className="rw-pwrap" style={{ width: rightW }}><ResearchCenter variant="tools" /></aside><Grip side="right" /></>
          : <Rail label="מנועים · AI" icon="🤖" onClick={() => setRightOpen(true)} />}

        <main className="rw-work">{children}</main>

        {/* שמאל — העולם שלי */}
        {leftOpen
          ? <><Grip side="left" /><aside className="rw-pwrap left" style={{ width: leftW }}><ResearchCenter variant="context" /></aside></>
          : <Rail label="העולם שלי" icon="👤" onClick={() => setLeftOpen(true)} />}
      </div>

      {/* מובייל — כפתור קבוע + Bottom Sheet */}
      <button className="rw-fab" onClick={() => setSheet(true)}>🧠 המחקר שלי ▲</button>
      <div className={"rw-backdrop" + (sheet ? " open" : "")} onClick={() => setSheet(false)} />
      <div className={"rw-sheet" + (sheet ? " open" : "")}>
        <div className="rw-grab" onClick={() => setSheet(false)} />
        <ResearchCenter />
      </div>
    </div>
  );
}
