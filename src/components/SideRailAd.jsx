import React, { useEffect, useRef } from "react";
import { ADSENSE_CLIENT, ADSENSE_ENABLED, ADSENSE_SLOTS, ensureAdSenseScript } from "../lib/adsense.js";
import { useMediaQuery } from "../lib/useMediaQuery.js";

// 🟦 מודעת צד אנכית 300×600 לדסקטופ — בדפי קריאה (פוסטים/ארכיון).
// נעוצה בשוליים השמאליים (הצד ה"חיצוני" ל-RTL), ממורכזת אנכית, רק כשיש מקום אמיתי
// בצד עמודת התוכן (≥1280px). במובייל לא מוצגת — שם יש את האנקור התחתון במקומה.
// בלי מזהה מפרסם/יחידה → no-op מוחלט.
export default function SideRailAd({ slot }) {
  const slotId = slot || ADSENSE_SLOTS.side || "";
  const wideEnough = useMediaQuery("(min-width: 1280px)");
  const pushed = useRef(false);

  const live = ADSENSE_ENABLED && !!slotId && wideEnough;

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
        position: "fixed", left: 16, top: "50%", transform: "translateY(-50%)",
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
