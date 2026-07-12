import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { rwCss } from "../lib/research/theme.js";
import ResearchCenter, { LEFT_TABS } from "./ResearchCenter.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { on, emit, EVENTS } from "../lib/research/eventBus.js";
import ElsResultsPanel from "./ElsResultsPanel.jsx";
import Navbar from "./layout/Navbar.jsx";
import { setForcedMode } from "../lib/themeMode.js";

// 🏛️ ResearchShell — «מעבדת המחקר». שלד קבוע, סרגלים בסגנון ChatGPT.
// ימין = «מנועי המחקר · [הכלי הפעיל]» (דינמי-הקשרי — ארגז-הכלים של המודול).
// שמאל = «עולם המשתמש» (קבוע — אתה, לא הכלי). מרכז = ה-Canvas. עץ אחד, מודול מביא את כליו.
const num = (k, d) => { try { const v = parseInt(localStorage.getItem(k)); return Number.isFinite(v) ? v : d; } catch { return d; } };
const ICONS = { tools: ["🔧", "🤖"], context: ["👤", "🧠", "📂", "🗺️"] };

// ארגז-הכלים ההקשרי של כל מודול (מנועי המחקר). ניתן להרחבה — מודול חדש = שורה.
const TOOL_ENGINES = {
  journey: { title: "מסע חיפוש", items: ["גימטריה (ליבה)", "דילוגי אותיות", "פסוקים (פרק:פסוק)", "מאותו ערך במאגר", "מספרים קשורים", "עובדה ⇄ פרשנות", "פתח כל מנוע בנפרד"] },
  els: { title: "דילוגי אותיות", items: ["חיפוש שם", "כמה מונחים יחד", "חיפוש בתוך חיפוש (קרבה)", "כולל קרובים", "מרחקי דילוג", "כיוון", "ספר", "רשימת תוצאות + מיקום", "צפיפות + גרף מרחקים", "מסך מלא"] },
  name: { title: "תורת השם", items: ["17 שיטות", "פסוק לשם", "התכנסויות", "בני משפחה", "כרטיס שיתוף", "ניתוח AI"] },
  midrash: { title: "בית המדרש", items: ["שיטות הצלבה", "מפרשים", "פסוקים קשורים", "גימטריה · מילוי · אתב״ש", "השוואות"] },
  life: { title: "ניתוח חיים · מפת שדה", items: ["צירי זמן", "אשכולות", "קשרים", "פילטרים", "השוואת מפות", "Insight", "Story"] },
  family: { title: "הקשרים במשפחה", items: ["שמות בני המשפחה", "התכנסויות", "חוצה-שיטות", "קישור לדף-המספר"] },
  compare: { title: "השוואת שניים", items: ["שני ביטויים", "הצלבה חזקה (אותה שיטה)", "הצלבה עקיפה (חוצה-שיטות)", "טבלת כל השיטות", "סכום → דף-מספר"] },
  verse: { title: "חיפוש בפסוקים", items: ["לפי טקסט (תת-מחרוזת)", "לפי גימטריה — 11 שיטות", "מילה · רצף-מילים · סך-הפסוק", "🆕 טווח-ערכים (מ–עד)", "🆕 סינון לפי חומש", "הדגשת המופע בפסוק", "ישות לכל פסוק (➕ הוסף · 🔗 שתף)", "קישור לדף-המספר לכל ערך"] },
  import: { title: "ניתוח קובץ", items: ["אקסל / CSV", "11 שיטות", "זיהוי התכנסויות", "אימות ערך-נתון", "צירוף-המוני למחקר", "ייצוא CSV"] },
  gematria: { title: "מחשבון גימטריה", items: ["17 שיטות", "חיפוש מורכב", "הצלבות", "אות-אות", "הוסף למחקר"] },
  notarikon: { title: "נוטריקון", items: ["ראשי-תיבות + ערך", "🆕 אמצעי-תיבות", "סופי-תיבות + ערך", "🆕 השוואת-התכנסות (3 ערכים)", "🆕 חיפוש הפוך בתורה (ראשי/סופי)", "ישות לכל תוצאה", "קישור לדף-המספר"] },
};

const PanelIcon = ({ size = 19 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="16" rx="2.5" /><line x1="9" y1="4" x2="9" y2="20" />
  </svg>
);

// 📖 קיר-ימין הקשרי לבית-המדרש (workspace_layout_standard: «ימין = מה הכלי עושה»).
// ניווט-מדורים + קפיצה-לשיטה דרך ה-Event Bus → אפס תלות בבית-המדרש (הוא מאזין).
const MIDRASH_SECTIONS = [
  { tab: "methods", icon: "📐", label: "שיטות הגימטריה" },
  { tab: "calc", icon: "🧮", label: "מחשבון גימטריה" },
  { tab: "crosses", icon: "✨", label: "חידושי הצלבות" },
  { tab: "convergence", icon: "🌐", label: "צירי התכנסות" },
  { tab: "community", icon: "👥", label: "חידושי גולשים" },
  { tab: "verified", icon: "🔵", label: "פוסטים מאומתים" },
  { tab: "submit", icon: "✍️", label: "הגשת חידוש" },
  { tab: "sod1820", icon: "✦", label: "1820 · סוד הסודות" },
];
const MIDRASH_METHODS = ["רגיל", "מילוי", "מסתתר", "קדמי", "גדול", "סידורי", "אתבש", "אלבם", "ריבוע", "הכפלה"];
function MidrashNav() {
  const go = (tab, method) => emit(EVENTS.MIDRASH_NAV, { tab, method });
  return (
    <div className="rw-panel" style={{ borderBottom: "1px solid var(--rw-line,#ece4d3)" }}>
      <div className="rw-ph"><span>📂 מדורי בית-המדרש</span></div>
      <div className="rw-pb">
        <div className="rw-mnav">
          {MIDRASH_SECTIONS.map(s => (
            <button key={s.tab} className="rw-mnav-i" onClick={() => go(s.tab)} title={s.label}>
              <span>{s.icon}</span> {s.label}
            </button>
          ))}
        </div>
        <div className="rw-muted" style={{ margin: "14px 0 7px", fontSize: 12, fontWeight: 700 }}>📐 קפיצה לשיטה</div>
        <div className="rw-mchips">
          {MIDRASH_METHODS.map(m => (
            <button key={m} className="rw-mchip" onClick={() => go("methods", m)} title={`לימוד שיטת ${m}`}>{m}</button>
          ))}
        </div>
        <div className="rw-muted" style={{ marginTop: 9, fontSize: 11.5, lineHeight: 1.6 }}>לחיצה על שיטה → קופץ ללימוד שלה במרכז, עם דוגמה חיה.</div>
      </div>
    </div>
  );
}

export default function ResearchShell({ children, subnav }) {
  const { cart = [] } = useResearch();
  const [sp] = useSearchParams();
  const tool = sp.get("tool");
  const eng = tool && TOOL_ENGINES[tool];
  const rightTitle = eng ? eng.title : "ארגז הכלים";

  const [sheet, setSheet] = useState(false);
  const [rightOpen, setRightOpen] = useState(() => { try { return localStorage.getItem("rw_right_open") !== "0"; } catch { return true; } });
  const [leftOpen, setLeftOpen] = useState(() => { try { return localStorage.getItem("rw_left_open") !== "0"; } catch { return true; } });
  const [rightW, setRightW] = useState(() => num("rw_right_w", 320));
  const [leftW, setLeftW] = useState(() => num("rw_left_w", 250));
  // כניסה ראשונה לעולם-המשתמש → נוחתים על הפנקס (גדול); אחר-כך נזכרת בחירת המשתמש.
  const [leftTab, setLeftTab] = useState(() => { try { return localStorage.getItem("rw_left_tab") || "notes"; } catch { return "notes"; } });
  const [leftSeen, setLeftSeen] = useState(cart.length);
  useEffect(() => { if (leftOpen) setLeftSeen(cart.length); }, [leftOpen, cart.length]);
  useEffect(() => { try { localStorage.setItem("rw_left_tab", leftTab); } catch { /**/ } }, [leftTab]);
  const leftDot = !leftOpen && cart.length > leftSeen;
  // פתיחת השמאל ישירות לטאב מבוקש (מהמסילה) — מהלך משוכלל: אייקון במסילה = קיצור לטאב
  const openLeftTo = id => { if (id) setLeftTab(id); setLeftOpen(true); };

  // תוצאות חיות מהכלי הפעיל (כרגע ELS) → מוצגות בקיר הימני (Event Bus)
  const [elsState, setElsState] = useState(null);
  useEffect(() => on(EVENTS.ELS_STATE, setElsState), []);
  useEffect(() => { if (tool !== "els") setElsState(null); }, [tool]);

  useEffect(() => { document.title = "היכל הגילוי · סוד 1820"; }, []);
  // המעבדה תמיד «בצבע יום»: כופים בהיר *לפני* שהילדים (הנאב) מתרנדרים — useState-init רץ פעם אחת
  // בתחילת הרינדור, לפני ה-children → הנאב נצבע בהיר כבר ברינדור הראשון. שחזור ביציאה.
  useState(() => { setForcedMode("light"); });
  useEffect(() => () => setForcedMode(null), []);
  useEffect(() => { try { localStorage.setItem("rw_right_open", rightOpen ? "1" : "0"); localStorage.setItem("rw_right_w", String(rightW)); } catch { /**/ } }, [rightOpen, rightW]);
  useEffect(() => { try { localStorage.setItem("rw_left_open", leftOpen ? "1" : "0"); localStorage.setItem("rw_left_w", String(leftW)); } catch { /**/ } }, [leftOpen, leftW]);

  const Grip = ({ side }) => {
    const drag = useRef(null);
    const startW = side === "right" ? rightW : leftW;
    const setW = side === "right" ? setRightW : setLeftW;
    const down = e => { drag.current = { x: e.clientX, w: startW }; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /**/ } };
    const move = e => { if (!drag.current) return; const dx = e.clientX - drag.current.x; const w = side === "right" ? drag.current.w - dx : drag.current.w + dx; setW(Math.max(150, Math.min(560, w))); };
    const up = () => { drag.current = null; };
    return <button className="rw-grip" title="גרור לשינוי רוחב" onPointerDown={down} onPointerMove={move} onPointerUp={up}><b>⋮⋮</b></button>;
  };
  // מסילה מקופלת: אייקון-פאנל פותח · אייקוני-תוכן הם קיצורים. בשמאל כל אייקון פותח לטאב שלו.
  const Rail = ({ icons, tabs, onOpen, onPick, dot, side }) => (
    <div className={"rw-rail " + (side === "left" ? "l" : "r")}>
      {dot && <span className="rw-rail-dot" />}
      <button className="rw-rail-toggle" onClick={onOpen} title="פתח סרגל"><PanelIcon size={20} /></button>
      <div className="rw-rail-icons">
        {tabs
          ? tabs.map(t => <button key={t.id} className="rw-rail-i" onClick={() => onPick(t.id)} title="פתח">{t.icon}</button>)
          : icons.map((i, k) => <button key={k} className="rw-rail-i" onClick={onOpen}>{i}</button>)}
      </div>
    </div>
  );

  // סרגל ימני — ארגז-הכלים ההקשרי של המודול הפעיל + תוצאות חיות + AI
  const RightPanel = () => (
    <aside className="rw-pwrap" style={{ width: rightW }}>
      <div className="rw-phead"><span>{rightTitle}</span><button onClick={() => setRightOpen(false)} title="קפל סרגל"><PanelIcon /></button></div>
      {tool === "els" && <ElsResultsPanel state={elsState} onLoad={sv => emit(EVENTS.ELS_LOAD, sv)} />}
      {tool === "midrash" && <MidrashNav />}
      {eng && tool !== "midrash" && (
        <details className="rw-panel" open={!(tool === "els" && elsState?.has)}>
          <summary className="rw-ph" style={{ cursor: "pointer", listStyle: "none" }}><span>💡 מה הכלי «{eng.title}» יודע</span></summary>
          <div className="rw-pb">
            <div className="rw-muted" style={{ marginBottom: 9, fontSize: 12, lineHeight: 1.6 }}>
              אלו היכולות של הכלי הפעיל — מפעילים אותן <b>בכלי עצמו</b> שבמרכז המסך (זו רשימת-מידע, לא כפתורים).
            </div>
            <ul className="rw-caps">{eng.items.map((it, i) => <li key={i}>{it}</li>)}</ul>
          </div>
        </details>
      )}
      <ResearchCenter variant="tools" />
    </aside>
  );

  return (
    <div className="rw" dir="rtl">
      <style>{rwCss()}</style>
      {/* שורה 1 — הנאב הרגיל של האתר (בצבע יום); שורה 2 (מתחת) — סרגל כלי-המעבדה */}
      <Navbar />
      {subnav && <div className="rw-subbar">{subnav}</div>}

      <div className={"rw-stage" + (!rightOpen && !leftOpen ? " wide" : "")}>
        {rightOpen ? <><RightPanel /><Grip side="right" /></> : <Rail side="right" icons={ICONS.tools} onOpen={() => setRightOpen(true)} />}

        <main className="rw-work">{children}</main>

        {leftOpen
          ? <><Grip side="left" />
              <aside className="rw-pwrap left" style={{ width: leftW }}>
                <div className="rw-phead"><span>עולם המשתמש</span><button onClick={() => setLeftOpen(false)} title="קפל סרגל"><PanelIcon /></button></div>
                <ResearchCenter variant="context" tabbed activeTab={leftTab} onTab={setLeftTab} />
              </aside></>
          : <Rail side="left" tabs={LEFT_TABS} dot={leftDot} onPick={openLeftTo} onOpen={() => setLeftOpen(true)} />}
      </div>

      <button className="rw-fab" onClick={() => setSheet(true)}>🧠 המחקר שלי ▲</button>
      <div className={"rw-backdrop" + (sheet ? " open" : "")} onClick={() => setSheet(false)} />
      <div className={"rw-sheet" + (sheet ? " open" : "")}>
        <div className="rw-grab" onClick={() => setSheet(false)} />
        <ResearchCenter />
      </div>
    </div>
  );
}
