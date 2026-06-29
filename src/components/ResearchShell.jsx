import React, { useState, useEffect, useRef } from "react";
import { rwCss } from "../lib/research/theme.js";
import ResearchCenter from "./ResearchCenter.jsx";

// 🏛️ ResearchShell — שלד קבוע. שני סרגלים מתקפלים בצדדים (גרירה/לחיצה, סגנון IDE):
// ימין = אזור עבודה (הקשרי למדור) · שמאל = אזור אישי (שלי). מרכז = הכלי, גמיש.
// מובייל: Bottom-Sheet. מצב בהיר זהב-על-קרם.
export default function ResearchShell({ children }) {
  const [sheet, setSheet] = useState(false);
  const [workOpen, setWorkOpen] = useState(() => { try { return localStorage.getItem("rw_work_open") !== "0"; } catch { return true; } });
  const [meOpen, setMeOpen] = useState(() => { try { return localStorage.getItem("rw_me_open") !== "0"; } catch { return true; } });
  useEffect(() => { document.title = "סביבת המחקר · סוד 1820"; }, []);
  useEffect(() => { try { localStorage.setItem("rw_work_open", workOpen ? "1" : "0"); } catch { /* noop */ } }, [workOpen]);
  useEffect(() => { try { localStorage.setItem("rw_me_open", meOpen ? "1" : "0"); } catch { /* noop */ } }, [meOpen]);

  // גרירה/לחיצה על הסרגל-מפריד: גרירה לכיוון הקצה (או לחיצה) מקפלת
  const Grip = ({ side, onCollapse }) => {
    const start = useRef(null);
    const down = e => { start.current = { x: e.clientX }; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ } };
    const up = e => {
      if (!start.current) return;
      const dx = e.clientX - start.current.x; start.current = null;
      // קליק (תזוזה קטנה) או גרירה לכיוון הקצה → קיפול. ימין: גרירה ימינה(dx>0). שמאל: שמאלה(dx<0)
      if (Math.abs(dx) < 6 || (side === "right" ? dx > 30 : dx < -30)) onCollapse();
    };
    return <button className="rw-grip" title="גרור או לחץ — קפל לסרגל" onPointerDown={down} onPointerUp={up}><b>⋮⋮</b></button>;
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

      <div className={"rw-stage" + (!workOpen && !meOpen ? " wide" : "")}>
        {/* ימין — אזור עבודה */}
        {workOpen
          ? <><aside className="rw-pwrap"><ResearchCenter variant="work" /></aside><Grip side="right" onCollapse={() => setWorkOpen(false)} /></>
          : <Rail label="אזור עבודה" icon="🧠" onClick={() => setWorkOpen(true)} />}

        <main className="rw-work">{children}</main>

        {/* שמאל — אזור אישי */}
        {meOpen
          ? <><Grip side="left" onCollapse={() => setMeOpen(false)} /><aside className="rw-pwrap left"><ResearchCenter variant="personal" /></aside></>
          : <Rail label="אזור אישי" icon="👤" onClick={() => setMeOpen(true)} />}
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
