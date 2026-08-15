import React from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";

// 🔭 פרומו «הצופן החדש בדרך» — יושב ב-host page **מעל** ה-iframe של הצופן.
//    זהו רכיב-תצוגה בלבד: אפס לוגיקה, אפס state, אפס fetch, אפס נגיעה במנוע.
//    ⛔ אינו חלק ממנוע ה-ELS. אינו משנה את public/tzofen.html, את ה-iframe או את ה-hash שלו.
//    מקור-אמת יחיד לטקסט הזה — הרכיב הזה. מוצג ב-/code וב-/research?tool=els (אותם שני משטחים).
//    צבעים דרך usePalette() → קריא גם בכהה (/code) וגם בבהיר (ההיכל), לפי city_background_dual_theme_law.
export default function ElsUpgradePromo() {
  const P = usePalette();
  const CHIPS = ["צירים חדשים", "כיוונים", "גאומטריות", "וריאציות", "חיפושים מוצלבים", "אתב״ש", "חיפוש עמוק", "Raziel כחוקר אישי"];

  return (
    <div
      dir="rtl"
      style={{
        maxWidth: 940, margin: "0 auto 14px", padding: "16px 18px",
        background: P.cardGrad, border: `1px solid ${P.line || P.accentDim}`,
        borderRadius: 14, fontFamily: F.body, boxSizing: "border-box",
      }}
    >
      <div style={{ fontFamily: F.heading, fontWeight: 800, fontSize: 17, color: P.ink, marginBottom: 8 }}>
        🔭 הצופן החדש בדרך
      </div>

      <div style={{ color: P.inkSoft, fontSize: 14.5, lineHeight: 1.8 }}>
        אנחנו בונים כאן מערכת ELS חדשה — עמוקה, חכמה ופשוטה לשימוש.
        <br />
        בקרוב תוכלו לא רק למצוא ממצאים, אלא גם להפוך אותם לנקודות מוצא למחקר:
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, margin: "11px 0 12px" }}>
        {CHIPS.map(c => (
          <span
            key={c}
            style={{
              background: P.cardSoft, border: `1px solid ${P.line || P.accentDim}`,
              color: P.accentText, borderRadius: 999, padding: "4px 11px",
              fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap",
            }}
          >{c}</span>
        ))}
      </div>

      <div style={{ color: P.accentText, fontSize: 14, fontWeight: 700, lineHeight: 1.75 }}>
        המטרה: מנוע אחד. אינסוף אפשרויות מחקר. ממשק פשוט.
      </div>
      <div style={{ color: P.inkSoft, fontSize: 13.5, lineHeight: 1.75, marginTop: 4 }}>
        הגרסה הנוכחית זמינה לבדיקה בזמן שאנחנו בונים את המערכת החדשה.
      </div>
    </div>
  );
}
