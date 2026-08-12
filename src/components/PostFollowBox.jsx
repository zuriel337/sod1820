import React from "react";
import WatchButton from "./WatchButton.jsx";
import { F } from "../theme.js";
import { usePalette, PALETTES } from "../lib/palette.js";
import { resolveAuthor } from "../lib/authors.js";

// 🔔 מעקב בתחתית פוסט — subscription_funnel_law v10: הפוסט הוא **שער**, לא יעד.
// שתי פעולות קטנות ומובחנות, שתיהן דרך ה-WatchButton הקנוני היחיד והמנוע הקנוני:
//   📁 עקוב אחרי הקטגוריה (cat:<שם>)  ·  ✍️ עקוב אחרי הכתב (author:<שם>)
// אין post:<id>, אין מעקב-אחרי-פוסט, אין fan-out לפוסט. לא נראה כמו שיתוף/ניוזלטר —
// אזור-מעקב מובחן (קו-הפרדה + כותרת), פילים קטנות ממורכזות, בלי עומס.
// paletteMode=postMode כדי שיתאים לצבע-הפוסט (נעול-כהה מול מצב-אתר בהיר).
export default function PostFollowBox({ categories = [], author = "", postMode = null }) {
  const auto = usePalette();
  const P = postMode ? (PALETTES[postMode] || auto) : auto;
  const primaryCat = (categories || []).find(Boolean) || null;
  const by = resolveAuthor(author);
  const hasWriter = by.name && by.name !== "המערכת";
  if (!primaryCat && !hasWriter) return null;

  return (
    <div style={{ marginTop: 34, paddingTop: 20, borderTop: `1px solid ${P.border}`, textAlign: "center", direction: "rtl" }}>
      <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 15.5, fontWeight: 800, marginBottom: 12 }}>
        🔔 רוצה לדעת כשיש חדש?
      </div>
      <div style={{ display: "flex", gap: 9, justifyContent: "center", flexWrap: "wrap" }}>
        {primaryCat && (
          <WatchButton topic={`cat:${primaryCat}`} source="post_footer" compact paletteMode={postMode}
            icon="📁" label={`עקוב אחרי ${primaryCat}`} followLabel={`עוקב אחרי ${primaryCat} ✓`} explainer="" />
        )}
        {hasWriter && (
          <WatchButton topic={`author:${by.name}`} source="post_footer" compact ghost paletteMode={postMode}
            icon="✍️" label={`עקוב אחרי ${by.name}`} followLabel={`עוקב אחרי ${by.name} ✓`} explainer="" />
        )}
      </div>
    </div>
  );
}
