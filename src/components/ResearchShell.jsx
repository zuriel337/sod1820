import React, { useState, useEffect, useRef } from "react";
import { rwCss } from "../lib/research/theme.js";
import ResearchCenter from "./ResearchCenter.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";

// 🏛️ ResearchShell — שלד קבוע, סרגלים מקצועיים (investing/IDE):
// כפתור-קיפול ברור בכותרת הפאנל · גרירה לשינוי-רוחב · סרגל-סגור מראה את האייקונים שבפנים
// + נקודת-שינוי כשמשהו התעדכן בזמן שהיה סגור. שמאל = העולם שלי · ימין = מנועים · מרכז = המעבדה.
const num = (k, d) => { try { const v = parseInt(localStorage.getItem(k)); return Number.isFinite(v) ? v : d; } catch { return d; } };
const ICONS = { tools: ["🤖", "🔔"], context: ["👤", "🧠", "📂", "🗺️"] };

export default function ResearchShell({ children }) {
  const { cart = [] } = useResearch();
  const [sheet, setSheet] = useState(false);
  const [rightOpen, setRightOpen] = useState(() => { try { return localStorage.getItem("rw_right_open") !== "0"; } catch { return true; } });
  const [leftOpen, setLeftOpen] = useState(() => { try { return localStorage.getItem("rw_left_open") !== "0"; } catch { return true; } });
  const [rightW, setRightW] = useState(() => num("rw_right_w", 320));
  const [leftW, setLeftW] = useState(() => num("rw_left_w", 250));
  // נקודת-שינוי: כמה פריטים נראו לאחרונה כשהאזור היה פתוח (העולם שלי מכיל את «המחקר הפעיל»)
  const [leftSeen, setLeftSeen] = useState(cart.length);
  useEffect(() => { if (leftOpen) setLeftSeen(cart.length); }, [leftOpen, cart.length]);
  const leftDot = !leftOpen && cart.length > leftSeen;

  useEffect(() => { document.title = "סביבת המחקר · סוד 1820"; }, []);
  useEffect(() => { try { localStorage.setItem("rw_right_open", rightOpen ? "1" : "0"); localStorage.setItem("rw_right_w", String(rightW)); } catch { /**/ } }, [rightOpen, rightW]);
  useEffect(() => { try { localStorage.setItem("rw_left_open", leftOpen ? "1" : "0"); localStorage.setItem("rw_left_w", String(leftW)); } catch { /**/ } }, [leftOpen, leftW]);

  // ✋ גרירה לשינוי-רוחב בלבד (הקיפול עובר לכפתור-הכותרת המפורש)
  const Grip = ({ side }) => {
    const drag = useRef(null);
    const startW = side === "right" ? rightW : leftW;
    const setW = side === "right" ? setRightW : setLeftW;
    const down = e => { drag.current = { x: e.clientX, w: startW }; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /**/ } };
    const move = e => {
      if (!drag.current) return;
      const dx = e.clientX - drag.current.x;
      const w = side === "right" ? drag.current.w - dx : drag.current.w + dx;
      setW(Math.max(150, Math.min(560, w)));
    };
    const up = () => { drag.current = null; };
    return <button className="rw-grip" title="גרור לשינוי רוחב" onPointerDown={down} onPointerMove={move} onPointerUp={up}><b>⋮⋮</b></button>;
  };

  // פאנל פתוח עם כותרת + כפתור-קיפול ברור
  const Panel = ({ side, title, variant, onClose, w, left }) => (
    <aside className={"rw-pwrap" + (left ? " left" : "")} style={{ width: w }}>
      <div className="rw-phead">
        <span>{title}</span>
        <button onClick={onClose} title="קפל">{side === "right" ? "⟩" : "⟨"}</button>
      </div>
      <ResearchCenter variant={variant} />
    </aside>
  );
  // סרגל סגור — אייקונים בפנים + נקודת-שינוי + פתיחה
  const Rail = ({ label, icons, onOpen, dot, side }) => (
    <button className="rw-rail" onClick={onOpen} title="פתח">
      {dot && <span className="rw-rail-dot" />}
      <span className="chev">{side === "right" ? "⟨" : "⟩"}</span>
      <span className="rw-rail-icons">{icons.map((i, k) => <span key={k}>{i}</span>)}</span>
      <span className="lbl">{label}</span>
    </button>
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
        {/* ימין — מנועים */}
        {rightOpen
          ? <><Panel side="right" title="מנועים · AI" variant="tools" w={rightW} onClose={() => setRightOpen(false)} /><Grip side="right" /></>
          : <Rail label="מנועים" icons={ICONS.tools} side="right" onOpen={() => setRightOpen(true)} />}

        <main className="rw-work">{children}</main>

        {/* שמאל — העולם שלי */}
        {leftOpen
          ? <><Grip side="left" /><Panel side="left" left title="העולם שלי" variant="context" w={leftW} onClose={() => setLeftOpen(false)} /></>
          : <Rail label="העולם שלי" icons={ICONS.context} side="left" dot={leftDot} onOpen={() => setLeftOpen(true)} />}
      </div>

      {/* מובייל — Bottom Sheet */}
      <button className="rw-fab" onClick={() => setSheet(true)}>🧠 המחקר שלי ▲</button>
      <div className={"rw-backdrop" + (sheet ? " open" : "")} onClick={() => setSheet(false)} />
      <div className={"rw-sheet" + (sheet ? " open" : "")}>
        <div className="rw-grab" onClick={() => setSheet(false)} />
        <ResearchCenter />
      </div>
    </div>
  );
}
