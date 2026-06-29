import React, { useState, useEffect } from "react";
import { rwCss } from "../lib/research/theme.js";
import ResearchCenter from "./ResearchCenter.jsx";

// 🏛️ ResearchShell — השלד הקבוע של «סביבת המחקר» (research_workspace_law).
// Header קבוע · Workspace מתחלף (children) · מרכז המחקר גלובלי (ימין בדסקטופ /
// Bottom-Sheet במובייל). מצב בהיר זהב-על-קרם, מובייל-ראשון. עוטף עמודים — לא מחליף.
export default function ResearchShell({ children, navActive = "research" }) {
  const [sheet, setSheet] = useState(false);
  // 🧱 פאנלים מתקפלים — לסגור/לפתוח ימין (מרכז המחקר) ושמאל (ניווט) → להרחיב את אזור הכלים
  const [rcOpen, setRcOpen] = useState(() => { try { return localStorage.getItem("rw_rc_open") !== "0"; } catch { return true; } });
  const [navOpen, setNavOpen] = useState(() => { try { return localStorage.getItem("rw_nav_open") !== "0"; } catch { return true; } });
  useEffect(() => { document.title = "סביבת המחקר · סוד 1820"; }, []);
  useEffect(() => { try { localStorage.setItem("rw_rc_open", rcOpen ? "1" : "0"); } catch { /* noop */ } }, [rcOpen]);
  useEffect(() => { try { localStorage.setItem("rw_nav_open", navOpen ? "1" : "0"); } catch { /* noop */ } }, [navOpen]);
  const full = !rcOpen && !navOpen;
  const toggleFull = () => { const v = !full; setRcOpen(!v ? true : false); setNavOpen(!v ? true : false); };

  const Nav = () => (
    <nav className="rw-nav">
      <a className={navActive === "research" ? "on" : undefined}>🧮 <span>מחקר</span></a>
      <a>🏠 <span>תוכן</span></a>
      <a>📂 <span>סביבת העבודה</span></a>
      <a>👤 <span>אני</span></a>
      <div className="rw-future">לאן אפשר להגיע →
        <div className="lk">🕸️ מפת הקשרים <span className="rw-adv">מתקדם</span></div>
        <div className="rw-exp">רואים <b>איך כל מספר · פסוק · פוסט מחוברים</b> זה לזה ברשת אחת. נפתח בשלב מתקדם.</div>
        <div className="lk">⏱️ ציר הזמן שלי <span className="rw-adv">מתקדם</span></div>
        <div className="rw-exp">כל מה שחקרת, <b>מסודר לפי זמן</b>. חוזרים בקלות לכל מחקר. (מתקדם)</div>
      </div>
    </nav>
  );

  return (
    <div className="rw" dir="rtl">
      <style>{rwCss()}</style>
      <header className="rw-head">
        <div className="rw-logo">סוד <b>1820</b></div>
        <div className="rw-search">🔎 חפש מספר · ביטוי · פסוק · פוסט…</div>
        <button className={"rw-ic rw-ptog" + (navOpen ? "" : " on")} title="ניווט שמאל" onClick={() => setNavOpen(o => !o)}>☰</button>
        <button className={"rw-ic rw-ptog" + (rcOpen ? "" : " on")} title="מרכז המחקר (ימין)" onClick={() => setRcOpen(o => !o)}>🧠</button>
        <button className={"rw-ic rw-ptog" + (full ? " on" : "")} title={full ? "צא ממסך מלא" : "מסך מלא לאזור הכלים"} onClick={toggleFull}>{full ? "✕" : "⛶"}</button>
        <div className="rw-ic" title="התראות">🔔</div>
        <div className="rw-av">א</div>
      </header>

      <div className={"rw-grid" + (rcOpen ? "" : " rc-off") + (navOpen ? "" : " nav-off")}>
        {rcOpen && <aside className="rw-rc"><ResearchCenter /></aside>}
        <main className="rw-work">{children}</main>
        {navOpen && <Nav />}
      </div>

      {/* מובייל — כפתור קבוע + Bottom Sheet (ChatGPT) */}
      <button className="rw-fab" onClick={() => setSheet(true)}>🧠 המחקר שלי ▲</button>
      <div className={"rw-backdrop" + (sheet ? " open" : "")} onClick={() => setSheet(false)} />
      <div className={"rw-sheet" + (sheet ? " open" : "")}>
        <div className="rw-grab" onClick={() => setSheet(false)} />
        <ResearchCenter />
      </div>
    </div>
  );
}
