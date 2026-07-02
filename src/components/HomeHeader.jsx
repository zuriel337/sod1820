import React from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";

// 👑 הכותרת המלכותית הקנונית של עמוד הבית — רכיב אחד לכל הסקשנים (אחידות ומלכותיות).
// המראה: קווי-זהב דוהים משני הצדדים · כותרת regal עם זוהר · תת-כותרת · קישור-פעולה.
// dark=true לסקשנים על רקע GALLERY_BG (אוצרות/זרם) — זהב קבוע שלא תלוי במצב יום/לילה.
// אסור להוסיף כותרת-סקשן inline בעמוד הבית — רק דרך הרכיב הזה.
export default function HomeHeader({ title, sub, action, badge, dark = false }) {
  const P = usePalette();
  const gold = dark ? "#e8c84a" : P.accentText;
  const line = dark ? "rgba(212,175,55,.45)" : P.borderStrong;
  const glow = dark ? "0 0 34px rgba(232,200,74,.3)" : `0 0 30px ${P.glow}`;
  const subColor = dark ? "#a99a7c" : P.inkSoft;
  const hairline = { flex: 1, height: 1, background: `linear-gradient(90deg,transparent,${line},transparent)` };
  return (
    <div style={{ textAlign: "center", marginBottom: 20, direction: "rtl" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, maxWidth: 640, margin: "0 auto 6px" }}>
        <span aria-hidden style={hairline} />
        <h2 style={{ color: gold, fontFamily: F.regal, fontSize: "clamp(21px,3.4vw,29px)", fontWeight: 800, margin: 0, textShadow: glow, whiteSpace: "nowrap" }}>
          {title}
          {badge && <span style={{ verticalAlign: "middle", marginInlineStart: 10 }}>{badge}</span>}
        </h2>
        <span aria-hidden style={hairline} />
      </div>
      {sub && <div style={{ color: subColor, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.7 }}>{sub}</div>}
      {action && (
        <Link to={action.to} style={{ display: "inline-block", marginTop: 6, color: gold, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700, textDecoration: "none" }}>
          {action.label}
        </Link>
      )}
    </div>
  );
}
