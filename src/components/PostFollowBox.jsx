import React from "react";
import WatchButton from "./WatchButton.jsx";
import { F } from "../theme.js";
import { usePalette, PALETTES } from "../lib/palette.js";
import { resolveAuthor } from "../lib/authors.js";

// 🔔 דשבורד-מעקב בתחתית פוסט — subscription_funnel_law v11: הפוסט הוא **שער**, לא יעד.
// «דשבורד קטן»: צ'קבוקס (וי) לכל קטגוריה של הפוסט + שורת-כתב — מסמנים וי על מה שרוצים
// לעקוב, **בלי פוש**. שתי קטגוריות → שני צ'קבוקסים (בקשת צוריאל). הכל דרך ה-WatchButton
// הקנוני היחיד והמנוע הקנוני (cat:<שם> / author:<שם>). אין post:<id>, אין fan-out לפוסט.
// paletteMode=postMode כדי שיתאים לצבע-הפוסט (נעול-כהה מול מצב-אתר בהיר).
export default function PostFollowBox({ categories = [], author = "", postMode = null }) {
  const auto = usePalette();
  const P = postMode ? (PALETTES[postMode] || auto) : auto;
  const cats = [...new Set((categories || []).filter(Boolean))];
  const by = resolveAuthor(author);
  const hasWriter = by.name && by.name !== "המערכת";
  if (!cats.length && !hasWriter) return null;

  return (
    <div style={{ marginTop: 34, paddingTop: 20, borderTop: `1px solid ${P.border}`, direction: "rtl" }}>
      <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 15.5, fontWeight: 800, marginBottom: 3, textAlign: "center" }}>
        🔔 עקוב וקבל עדכון כשעולה חדש
      </div>
      <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, marginBottom: 14, textAlign: "center" }}>
        סמן וי על מה שמעניין אותך — ונעדכן אותך.
      </div>
      <div style={{ maxWidth: 430, margin: "0 auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {cats.map((cat) => (
          <WatchButton key={`cat:${cat}`} topic={`cat:${cat}`} source="post_footer" checkbox noPush
            paletteMode={postMode} icon="📁" label={cat} explainer="" />
        ))}
        {hasWriter && (
          <WatchButton key={`author:${by.name}`} topic={`author:${by.name}`} source="post_footer" checkbox noPush
            paletteMode={postMode} icon="✍️" label={`מאת ${by.name}`} explainer="" />
        )}
      </div>
    </div>
  );
}
