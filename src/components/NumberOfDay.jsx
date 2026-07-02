import React from "react";
import { Link } from "react-router-dom";
import { F, KEY_NUMBERS } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import HomeHeader from "./HomeHeader.jsx";

// 🗓 "המספר של היום" — באנר יומי שמתחלף לבד (דטרמיניסטי לפי התאריך).
// בוחר מספר-ליבה מ-KEY_NUMBERS + מציג את התאריך העברי (לוח עברי מובנה ב-Intl).
// כל מספר = עדשה על הגרף → קישור לדף המספר הקנוני (/number/:n) — חוק העץ האחד.

function hebrewDate() {
  try {
    return new Intl.DateTimeFormat("he-u-ca-hebrew", { day: "numeric", month: "long", year: "numeric" }).format(new Date());
  } catch { return ""; }
}

export default function NumberOfDay() {
  const P = usePalette();
  const keys = Object.keys(KEY_NUMBERS).map(Number).sort((a, b) => a - b);
  if (!keys.length) return null;
  const dayIdx = Math.floor(Date.now() / 864e5) % keys.length;
  const n = keys[dayIdx];
  const meaning = KEY_NUMBERS[n];
  const heb = hebrewDate();

  return (
    <section className="hn-wrap" style={{ padding: "0 18px 40px" }}>
      <HomeHeader title="🗓 המספר של היום" sub={heb ? `${heb} — כל יום מספר-ליבה אחר עולה לבמה` : "כל יום מספר-ליבה אחר עולה לבמה"} />
      <Link to={`/number/${n}`} className="nod" style={{
        display: "flex", alignItems: "stretch", gap: 0, textDecoration: "none",
        background: P.cardGrad, border: `1px solid ${P.borderStrong}`, borderRadius: 18,
        overflow: "hidden", boxShadow: `0 6px 26px ${P.glow}`,
      }}>
        {/* המספר הגדול */}
        <div className="nod-num" style={{
          flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "22px 26px", background: P.card, borderInlineEnd: `1px solid ${P.border}`, minWidth: 130,
        }}>
          <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 9.5, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>המספר של היום</div>
          <div style={{ color: P.heroNum, fontFamily: F.mono, fontWeight: 900, fontSize: "clamp(44px,9vw,72px)", lineHeight: 0.95, textShadow: `0 0 26px ${P.glow}` }}>{n}</div>
        </div>
        {/* תוכן */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "18px 20px" }}>
          {heb && <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, fontWeight: 700, marginBottom: 6 }}>🗓 {heb}</div>}
          <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(18px,3.4vw,24px)", fontWeight: 800, lineHeight: 1.35, marginBottom: 6 }}>{meaning}</div>
          <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.6 }}>
            כל מספר מסתיר עולם — גלו מה מתכנס סביב <b style={{ color: P.accentText, fontFamily: F.mono }}>{n}</b>.
          </div>
          <span style={{ marginTop: 10, color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800 }}>✨ גלו את כל עולמו ←</span>
        </div>
      </Link>
      <style>{`
        .nod { transition: transform .15s, border-color .15s; }
        .nod:hover { transform: translateY(-3px); border-color: ${P.accent}; }
        @media (max-width: 480px) {
          .nod { flex-direction: column; }
          .nod-num { border-inline-end: none !important; border-bottom: 1px solid ${P.border};
            flex-direction: row !important; gap: 14px; min-width: 0 !important; padding: 14px 18px !important; }
        }
      `}</style>
    </section>
  );
}
