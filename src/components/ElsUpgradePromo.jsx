import React, { useState } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";

// 🧬 פרומו «הצופן החדש נבנה עכשיו» — יושב ב-host page **מעל** ה-iframe של הצופן.
//    ⛔ אינו חלק ממנוע ה-ELS. אינו נוגע ב-public/tzofen.html, ב-iframe או בהתנהגות המנוע.
//    סגירה = מקומית לפרומו בלבד (מסתירה את הכרטיס הזה ותו לא). נשמרת ב-localStorage
//    עם מפתח ממוספר — שינוי נוסח עתידי = מפתח חדש → הפרומו יופיע שוב.
//    צבעים דרך usePalette() → קריא בכהה ובבהיר (city_background_dual_theme_law).
const CLOSED_KEY = "els_promo_closed_v1";

export default function ElsUpgradePromo() {
  const P = usePalette();
  const [closed, setClosed] = useState(() => {
    try { return localStorage.getItem(CLOSED_KEY) === "1"; } catch { return false; }
  });
  if (closed) return null;

  const close = () => {
    try { localStorage.setItem(CLOSED_KEY, "1"); } catch { /* ignore */ }
    setClosed(true);
  };

  const CHIPS = ["צירים", "כיוונים", "גאומטריות", "וריאציות", "חיפוש מוצלב", "אתב״ש", "חיפוש עמוק", "Raziel"];
  const line = { color: P.line || P.accentDim };

  return (
    <div
      dir="rtl"
      style={{
        position: "relative", maxWidth: 940, margin: "0 auto 14px", padding: "16px 18px",
        background: P.cardGrad, border: `1px solid ${line.color}`, borderRadius: 14,
        fontFamily: F.body, boxSizing: "border-box",
      }}
    >
      {/* ✕ סגירה — ב-RTL insetInlineEnd הוא הצד השמאלי, כך שאינו מתנגש בכותרת שמתחילה מימין */}
      <button
        type="button" onClick={close} aria-label="סגור את ההודעה" title="סגור"
        style={{
          position: "absolute", top: 8, insetInlineEnd: 8,
          width: 32, height: 32, lineHeight: "30px", padding: 0,
          background: "transparent", border: `1px solid ${line.color}`, borderRadius: 9,
          color: P.inkSoft, fontSize: 16, fontWeight: 700, cursor: "pointer", flex: "none",
        }}
      >✕</button>

      {/* padding-inline-end מפנה מקום ל-✕ כדי שהכותרת לא תרוץ מתחתיו */}
      <div style={{ fontFamily: F.heading, fontWeight: 800, fontSize: 17, color: P.ink, marginBottom: 8, paddingInlineEnd: 40 }}>
        🧬 הצופן החדש נבנה עכשיו
      </div>

      <div style={{ color: P.inkSoft, fontSize: 14.5, lineHeight: 1.85 }}>
        אנחנו הופכים את הצופן מכלי שמוצא ממצאים<br />
        למערכת שמאפשרת לחקור אותם.
        <div style={{ marginTop: 9, color: P.ink, fontWeight: 700 }}>
          מצאתם ממצא?<br />מכאן המחקר רק מתחיל.
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, margin: "11px 0 12px" }}>
        {CHIPS.map(c => (
          <span key={c} style={{
            background: P.cardSoft, border: `1px solid ${line.color}`, color: P.accentText,
            borderRadius: 999, padding: "4px 11px", fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap",
          }}>{c}</span>
        ))}
      </div>

      <div style={{ color: P.accentText, fontSize: 14, fontWeight: 700, lineHeight: 1.75 }}>
        מנוע אחד. אינסוף דרכי חקירה. ממשק פשוט.
      </div>
      <div style={{ color: P.inkSoft, fontSize: 13.5, lineHeight: 1.75, marginTop: 4 }}>
        🔎 הגרסה הנוכחית פתוחה לבדיקה.
      </div>
    </div>
  );
}
