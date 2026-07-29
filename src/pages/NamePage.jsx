import React from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import SearchTabs from "../components/SearchTabs.jsx";
import NameLabPage from "./NameLabPage.jsx";

// ===== 🔥 השער הויראלי — /name "מה השם שלך מסתיר?" =====
// שיתוף-קודם, רגשי, פשוט. מוביל לאותו עץ (/number/:value) — מנוע אחד, שני שערים.
// הכותרת נשארת למעלה, ומיד מתחתיה מוטמעת מעבדת-השם המלאה (full): חיפוש שם →
// מיד קופצות התוצאות (ערך · הפסוק בתורה · השם בתורה · כל כלי-המחקר) באותו מקום, לא למטה.

export default function NamePage() {
  const P = usePalette();
  return (
    <div style={{ background: P.pageBg, minHeight: "92vh", direction: "rtl", position: "relative", zIndex: 1, padding: "40px 18px 70px" }}>
      <div style={{ maxWidth: 760, width: "100%", boxSizing: "border-box", margin: "0 auto" }}>
        <SearchTabs />

        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <div style={{ fontSize: "clamp(28px,6.5vw,50px)", fontWeight: 900, fontFamily: F.regal, color: P.heroNum,
            textShadow: `0 0 36px ${P.glow}`, lineHeight: 1.12 }}>✨ מה השם שלך מסתיר?</div>
          <div style={{ marginTop: 12, color: P.inkSoft, fontFamily: F.body, fontSize: "clamp(15px,2.6vw,18px)", fontWeight: 500, maxWidth: 480, marginInline: "auto" }}>
            הקלידו את שמכם — וגלו מיד את הסוד הגימטרי, הפסוק בתורה וכל המחקר שמאחוריו.
          </div>
        </div>

        {/* 🧪 מעבדת-השם המלאה מוטמעת ישר אחרי הכותרת — חיפוש → התוצאות (כולל הפסוק בתורה) קופצות כאן. */}
        <NameLabPage embedded full />
      </div>
    </div>
  );
}
