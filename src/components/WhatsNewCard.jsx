import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getWhatsNewCounts } from "../lib/whatsNew.js";

// 🔔 כרטיס «מה חדש מאז ביקורך» — מצביע קומפקטי לדף הבית (מעל «עדכונים אחרונים»).
// חוק-ברזל (לא-עמוס): מופיע רק כשיש משהו חדש; אין חדש → לא מרונדר כלל. מקור אחד עם מרכז השידורים.
// מובייל-ראשון: שורה אחת בדסקטופ, ובמובייל נערם וממורכז יפה (כותרת · צ'יפים · כפתור).
const CHIPS = [
  { key: "forum", emoji: "💬", label: "פורום", acc: "#4fd6a8" },
  { key: "activity", emoji: "✨", label: "פעילות", acc: "#e8c84a" },
  // 📢 ערוצים = מצביע בלבד, בלי מספר: הם תמיד מלאים ויש להם טיקר-ערוצים חי למטה → מונה כאן = כפילות ומנפח.
  { key: "channels", emoji: "📢", label: "ערוצים", acc: "#37d67a", noCount: true },
  { key: "dev", emoji: "🛠️", label: "פיתוח", acc: "#a78bfa" },
];

export default function WhatsNewCard() {
  const P = usePalette();
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    let live = true;
    getWhatsNewCounts().then(c => { if (live) setCounts(c); }).catch(() => {});
    return () => { live = false; };
  }, []);

  // אין נתונים עדיין, או אין שום דבר חדש → לא מציגים כלום (אפס עומס).
  if (!counts || !counts.total) return null;
  // צ'יפ מוצג אם יש בו חדש — או אם הוא מצביע-בלבד (ערוצים) שנשאר קבוע בלי מספר.
  const active = CHIPS.filter(c => c.noCount || counts[c.key] > 0);
  const dark = P.mode !== "light";

  return (
    <section className="hn-wrap" style={{ padding: "16px 18px 4px" }}>
      <style>{`
        .wn-card { max-width: 660px; margin: 0 auto; box-sizing: border-box;
          display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
          background: linear-gradient(160deg, ${dark ? "rgba(212,175,55,.10)" : "rgba(212,175,55,.14)"}, ${P.card});
          border: 1px solid ${P.borderStrong}; border-radius: 16px; padding: 12px 16px;
          box-shadow: 0 6px 22px ${P.glow}; }
        .wn-title { display: inline-flex; align-items: center; gap: 7px; white-space: nowrap;
          color: ${P.accentText}; font-family: ${F.heading}; font-weight: 800; font-size: 14.5px; }
        .wn-title .dot { width: 8px; height: 8px; border-radius: 50%; background: #e0556a;
          box-shadow: 0 0 8px #e0556a; animation: wn-ping 1.9s ease-out infinite; }
        @keyframes wn-ping { 0%{ box-shadow: 0 0 0 0 rgba(224,85,106,.5) } 100%{ box-shadow: 0 0 0 8px rgba(224,85,106,0) } }
        .wn-chips { display: flex; gap: 8px; flex-wrap: wrap; flex: 1; justify-content: flex-start; min-width: 0; }
        .wn-chip { display: inline-flex; align-items: center; gap: 6px; text-decoration: none;
          border: 1px solid ${P.border}; background: ${P.cardSoft}; border-radius: 999px;
          padding: 5px 12px; min-height: 34px; box-sizing: border-box;
          color: ${P.ink}; font-family: ${F.heading}; font-size: 12.5px; font-weight: 700;
          transition: transform .12s, border-color .12s; }
        .wn-chip:hover { transform: translateY(-1px); border-color: var(--acc); }
        .wn-chip .n { background: var(--acc); color: #14100a; border-radius: 999px;
          font-size: 11.5px; font-weight: 800; padding: 0 7px; font-variant-numeric: tabular-nums; }
        .wn-btn { white-space: nowrap; text-decoration: none; background: ${P.accentBtn}; color: ${P.onAccent};
          font-family: ${F.heading}; font-weight: 800; font-size: 13px; border-radius: 999px;
          padding: 9px 18px; min-height: 40px; display: inline-flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 16px ${P.glow}; }
        .wn-btn:active { transform: translateY(1px); }
        /* 📱 סמארטפון — נערם וממורכז יפה, מטרות-מגע נדיבות, בלי גלישה אופקית */
        @media (max-width: 560px) {
          .wn-card { flex-direction: column; text-align: center; gap: 11px; padding: 15px 14px; }
          .wn-title { justify-content: center; width: 100%; font-size: 15px; }
          .wn-chips { justify-content: center; width: 100%; }
          .wn-chip { font-size: 13px; padding: 7px 13px; }
          .wn-btn { width: 100%; max-width: 300px; font-size: 14px; padding: 11px 18px; }
        }
      `}</style>

      <div className="wn-card">
        <span className="wn-title"><span className="dot" aria-hidden />🔔 מה חדש מאז ביקורך</span>
        <div className="wn-chips">
          {active.map(c => (
            <Link key={c.key} to={`/broadcasts?tab=${c.key}`} className="wn-chip" style={{ "--acc": c.acc }}>
              <span>{c.emoji} {c.label}</span>
              {!c.noCount && <span className="n">{counts[c.key]}</span>}
            </Link>
          ))}
        </div>
        <Link to="/broadcasts" className="wn-btn">📡 מרכז השידורים ←</Link>
      </div>
    </section>
  );
}
