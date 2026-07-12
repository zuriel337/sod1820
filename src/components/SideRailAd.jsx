import React, { useEffect, useRef } from "react";
import { ADSENSE_CLIENT, ADSENSE_ENABLED, ADSENSE_SLOTS, ensureAdSenseScript, adCountryAllowed } from "../lib/adsense.js";
import { useMediaQuery } from "../lib/useMediaQuery.js";

// 🟦 מודעת צד אנכית 300×600 לדסקטופ — בדפי קריאה (פוסטים ישנים).
// side="right"|"left" — רצועה בכל צד של עמודת התוכן, ממורכזת אנכית. מוצגת רק כשיש מקום
// אמיתי לשתי הרצועות משני צדי התוכן (≥1500px). במובייל לא מוצגת — שם יש את האנקור התחתון.
// בלי מזהה מפרסם/יחידה → no-op מוחלט.
export default function SideRailAd({ side = "right", slot }) {
  const slotId = slot || (side === "left" ? (ADSENSE_SLOTS.sideLeft || ADSENSE_SLOTS.side) : ADSENSE_SLOTS.side) || "";
  const wideEnough = useMediaQuery("(min-width: 1500px)");   // מקום לשתי רצועות + עמודת-קריאה
  const pushed = useRef(false);

  const live = ADSENSE_ENABLED && !!slotId && wideEnough && adCountryAllowed();

  useEffect(() => {
    if (!live || pushed.current) return;
    ensureAdSenseScript();
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); pushed.current = true; } catch { /* ייטען כשהסקריפט מוכן */ }
  }, [live]);

  if (!live) return null;

  return (
    <div
      role="complementary" aria-label="מודעה"
      style={{
        position: "fixed", [side === "left" ? "left" : "right"]: 16, top: "50%", transform: "translateY(-50%)",
        width: 300, zIndex: 840, direction: "rtl",
      }}
    >
      <div style={{ textAlign: "center", fontSize: 9, letterSpacing: 2, opacity: 0.35, marginBottom: 4, color: "#e8c84a" }}>תוכן שיווקי</div>
      <ins
        className="adsbygoogle"
        style={{ display: "block", width: 300, height: 600 }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slotId}
        data-ad-format="vertical"
        data-full-width-responsive="false"
      />
    </div>
  );
}
