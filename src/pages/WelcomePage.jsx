import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { applySeo } from "../lib/seo.js";
import { track } from "../lib/tracking.js";
import { METHODS, onlyHeb } from "../lib/gematria.js";

// 🚪 /welcome — שער הכניסה לסוד 1820. יעד הכפתור «היכנסו» במייל-הפתיחה.
// עיקרון (identity_architecture_law): לא כולם «חוקרים». שלוש זהויות, מסלול טבעי: מבקר → מגלה → חוקר.
// כל אחד בוחר את רמת המעורבות שלו — בלי להעמיס זהות שעדיין לא מרגיש שייך אליה.
const RAGIL = METHODS.find(m => m.key === "רגיל");
const gval = (w) => { try { return RAGIL ? RAGIL.fn(w) : 0; } catch { return 0; } };

export default function WelcomePage() {
  const P = usePalette();
  const [name, setName] = useState("");
  const val = useMemo(() => gval(name), [name]);
  const hasHeb = useMemo(() => onlyHeb(name).length > 0, [name]);

  useEffect(() => {
    track("welcome");
    applySeo({ title: "ברוכים הבאים לסוד 1820", description: "יש כאן שלוש דרכים לגלות את העולם של סוד 1820 — לקרוא ולהתעניין, לבדוק שם או מספר משלכם, או להצטרף למחקר. בחרו את הקצב שלכם.", path: "/welcome" });
  }, []);

  const card = (accent) => ({ background: P.cardGrad, border: `1px solid ${P.border}`, borderRight: `4px solid ${accent}`, borderRadius: 16, padding: "20px 20px", boxShadow: "0 8px 26px rgba(0,0,0,0.10)" });
  const q = { color: P.ink, fontFamily: F.regal, fontSize: 19, fontWeight: 800, margin: "0 0 2px" };
  const idTag = { color: P.accentDim, fontFamily: F.heading, fontSize: 12, fontWeight: 700, letterSpacing: 1 };
  const linkRow = { color: P.accentText, fontFamily: F.heading, fontSize: 14.5, fontWeight: 700, textDecoration: "none", display: "inline-block" };
  const primary = { display: "inline-block", background: P.accentBtn, color: P.onAccent || "#1a0e00", fontFamily: F.heading, fontSize: 14.5, fontWeight: 800, textDecoration: "none", borderRadius: 999, padding: "11px 24px" };

  return (
    <div dir="rtl" style={{ maxWidth: 640, margin: "0 auto", padding: "28px 16px 100px", position: "relative", zIndex: 1 }}>
      {/* HERO */}
      <div style={{ textAlign: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 44, lineHeight: 1, marginBottom: 6 }}>👑</div>
        <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(26px,5.5vw,40px)", fontWeight: 800, margin: "0 0 10px" }}>ברוכים הבאים לסוד 1820</h1>
        <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 16.5, lineHeight: 1.8, maxWidth: 480, margin: "0 auto" }}>
          יש כאן <b style={{ color: P.accentText }}>שלוש דרכים</b> לגלות את העולם שלנו. בחרו את הקצב שלכם — אין חובה לחקור.
        </p>
      </div>
      <div style={{ textAlign: "center", color: P.accentDim, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, letterSpacing: 1, marginBottom: 24 }}>
        👀 מבקר &nbsp;→&nbsp; 🔎 מגלה &nbsp;→&nbsp; 🔬 חוקר
      </div>

      <div style={{ display: "grid", gap: 16 }}>

        {/* 👀 מבקר */}
        <div style={card(P.accentDim)}>
          <div style={idTag}>👀 מבקר</div>
          <div style={q}>רוצים רק לגלות?</div>
          <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.7, margin: "6px 0 13px" }}>היכנסו, קראו והסתכלו — בלי שום מחויבות.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            <Link to="/post?src=welcome" style={linkRow}>📖 קראו מחקרים ורמזים ←</Link>
            <Link to="/numbers?src=welcome" style={linkRow}>🌳 צפו בעץ ההתכנסויות ←</Link>
            <Link to="/?src=welcome" style={linkRow}>✨ ראו מה חדש בדף הבית ←</Link>
          </div>
        </div>

        {/* 🔎 מגלה — מחשבון חי */}
        <div style={card(P.accentText)}>
          <div style={idTag}>🔎 מגלה</div>
          <div style={q}>רוצים לבדוק משהו משלכם?</div>
          <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.7, margin: "6px 0 12px" }}>שם, מספר או תאריך — הקלידו וראו מה עולה, בזמן אמת.</p>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="נסו: השם שלכם…" autoComplete="off"
            style={{ width: "100%", boxSizing: "border-box", background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: "13px 15px", color: P.ink, fontFamily: F.body, fontSize: 17, outline: "none" }} />
          {hasHeb && (
            <div style={{ marginTop: 13, textAlign: "center", background: P.glow || "rgba(212,175,55,0.10)", border: `1px solid ${P.border}`, borderRadius: 14, padding: "15px 14px" }}>
              <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, marginBottom: 2 }}>הערך הרגיל</div>
              <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 38, fontWeight: 800, lineHeight: 1 }}>{val}</div>
              <Link to={`/number/${val}?src=welcome`} style={{ ...primary, marginTop: 12 }}>פתחו את דף המספר {val} ←</Link>
            </div>
          )}
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 14 }}>
            <Link to="/community/calculator?src=welcome" style={{ ...linkRow, fontSize: 13.5 }}>🔢 המחשבון המלא (13 שיטות) ←</Link>
            <Link to="/code?src=welcome" style={{ ...linkRow, fontSize: 13.5 }}>🔠 נסו למצוא צופן (ELS) ←</Link>
          </div>
        </div>

        {/* 🔬 חוקר */}
        <div style={card(P.accent || "#c9a52e")}>
          <div style={idTag}>🔬 חוקר</div>
          <div style={q}>רוצים להצטרף למחקר?</div>
          <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.7, margin: "6px 0 13px" }}>שלב מתקדם — למי שרוצה לתרום ולהתמיד.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            <Link to="/research?src=welcome" style={linkRow}>📂 שמרו ממצאים למחקר שלכם ←</Link>
            <Link to="/forum?src=welcome" style={linkRow}>💡 כתבו חידושים בפורום ←</Link>
            <Link to="/join?src=welcome" style={linkRow}>👥 הצטרפו לקהילה · קבלו קרדיטים ←</Link>
          </div>
        </div>
      </div>

      {/* פילוסופיה */}
      <p style={{ textAlign: "center", color: P.accentDim, fontFamily: F.body, fontSize: 14, lineHeight: 1.8, margin: "22px auto 0", maxWidth: 470 }}>
        אין חובה לבחור עכשיו — פשוט התחילו. מבקרים שהופכים למגלים, ומגלים שהופכים לחוקרים — <b style={{ color: P.accentText }}>בקצב שלכם</b>.
      </p>
    </div>
  );
}
