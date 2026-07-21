import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { stripHtml } from "../lib/format.js";
import { getWhatsNewCounts } from "../lib/whatsNew.js";

// 🔔 כרטיס «מה חדש בקהילה מאז ביקורך» — פורום-בלבד (החלטת צוריאל).
// שאר הזרמים כבר חיים בבית: «עדכונים אחרונים» = פעילות · טיקר תחתון = ערוצים · טיקר עליון = פיתוח.
// כאן רק הזרם החברתי שאין לו מונה-אישי אחר — ומראה את **כותרת הפריט האחרון** בפורום, לא רק מספר.
// חוק-ברזל (לא-עמוס): מופיע רק כשיש חדש בפורום מאז הביקור; אין חדש → לא מרונדר כלל.
export default function WhatsNewCard() {
  const P = usePalette();
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    let live = true;
    getWhatsNewCounts().then(c => { if (live) setCounts(c); }).catch(() => {});
    return () => { live = false; };
  }, []);

  // אין חדש בפורום → לא מציגים כלום (אפס עומס).
  if (!counts || !counts.forum) return null;
  const m = counts.forumLatest;
  const text = m ? (stripHtml(m.text || "").slice(0, 72) || m.label) : "";
  const more = counts.forum - 1;   // כמה חדשים נוספים מעבר לאחרון שמוצג
  const dark = P.mode !== "light";

  return (
    <section className="hn-wrap" style={{ padding: "16px 18px 4px" }}>
      <style>{`
        .wn-card { max-width: 660px; margin: 0 auto; box-sizing: border-box;
          display: flex; align-items: center; gap: 13px; flex-wrap: wrap;
          background: linear-gradient(160deg, ${dark ? "rgba(212,175,55,.10)" : "rgba(212,175,55,.14)"}, ${P.card});
          border: 1px solid ${P.borderStrong}; border-radius: 16px; padding: 12px 16px;
          box-shadow: 0 6px 22px ${P.glow}; }
        .wn-title { display: inline-flex; align-items: center; gap: 7px; white-space: nowrap;
          color: ${P.accentText}; font-family: ${F.heading}; font-weight: 800; font-size: 14px; }
        .wn-title .dot { width: 8px; height: 8px; border-radius: 50%; background: #e0556a;
          box-shadow: 0 0 8px #e0556a; animation: wn-ping 1.9s ease-out infinite; }
        @keyframes wn-ping { 0%{ box-shadow: 0 0 0 0 rgba(224,85,106,.5) } 100%{ box-shadow: 0 0 0 8px rgba(224,85,106,0) } }
        .wn-preview { flex: 1; min-width: 0; display: inline-flex; align-items: center; gap: 8px;
          text-decoration: none; color: ${P.ink}; font-family: ${F.body}; font-size: 13.5px;
          border: 1px solid ${P.border}; background: ${P.cardSoft}; border-radius: 12px;
          padding: 8px 13px; min-height: 38px; box-sizing: border-box; transition: border-color .12s; }
        .wn-preview:hover { border-color: ${P.accent}; }
        .wn-preview .txt { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0; }
        .wn-preview .who { color: ${P.accentDim}; }
        .wn-preview .n { flex: none; background: ${P.accentBtn}; color: ${P.onAccent}; border-radius: 999px;
          font-family: ${F.heading}; font-size: 11px; font-weight: 800; padding: 1px 8px; white-space: nowrap;
          font-variant-numeric: tabular-nums; }
        .wn-btn { white-space: nowrap; text-decoration: none; background: ${P.accentBtn}; color: ${P.onAccent};
          font-family: ${F.heading}; font-weight: 800; font-size: 13px; border-radius: 999px;
          padding: 9px 18px; min-height: 40px; display: inline-flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 16px ${P.glow}; }
        .wn-btn:active { transform: translateY(1px); }
        /* 📱 סמארטפון — נערם וממורכז יפה, מטרות-מגע נדיבות, בלי גלישה אופקית */
        @media (max-width: 560px) {
          .wn-card { flex-direction: column; align-items: stretch; text-align: center; gap: 11px; padding: 15px 14px; }
          .wn-title { justify-content: center; width: 100%; font-size: 15px; }
          .wn-preview { width: 100%; font-size: 14px; }
          .wn-btn { width: 100%; max-width: 300px; margin: 0 auto; font-size: 14px; padding: 11px 18px; }
        }
      `}</style>

      <div className="wn-card">
        <span className="wn-title"><span className="dot" aria-hidden />🔔 מה חדש בקהילה מאז ביקורך</span>
        <Link to={m ? m.href : "/forum"} className="wn-preview">
          {m
            ? <>
                <span className="txt">{m.em} {text} <span className="who">· ✍️ {m.who}</span></span>
                {more > 0 && <span className="n">+{more}</span>}
              </>
            : <span className="txt">עדכונים חדשים בפורום המחקר</span>}
        </Link>
        <Link to="/forum" className="wn-btn">🌐 לפורום ←</Link>
      </div>
    </section>
  );
}
