import React, { useEffect, useRef } from "react";
import { ADSENSE_CLIENT, ADSENSE_ENABLED, ADSENSE_SLOTS, ensureAdSenseScript, adCountryAllowed } from "../lib/adsense.js";

// יחידת מודעה אחת של AdSense. ללא מזהה מפרסם/יחידה — לא מציג כלום (no-op).
// • place — מיקום לוגי ("post"/"list") שממנו נשלף מזהה היחידה מ-env.
// • slot — אפשר לעקוף ידנית את מזהה היחידה.
// • label — האם להציג כיתוב עדין "תוכן שיווקי" מעל המודעה (שקיפות + טעם).
//
// הערה ל-SPA: כל <ins> דורש push יחיד. ref-guard מונע push כפול (גם תחת StrictMode).
// המודעה ממוקמת *מחוץ* ל-.sod-post-content — כך חוקי ניקוי ה-WP לא נוגעים בה.
export default function AdSlot({ place = "post", slot, format = "auto", responsive = true, label = true, style }) {
  const pushed = useRef(false);
  const slotId = slot || ADSENSE_SLOTS[place] || "";

  useEffect(() => {
    if (!ADSENSE_ENABLED || !slotId || !adCountryAllowed() || pushed.current) return;
    ensureAdSenseScript();
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch { /* AdSense עוד לא נטען — push יקרה כשהמערך יתרוקן */ }
  }, [slotId]);

  // בלי מזהה מפרסם / בלי יחידה / מבקר לא-ישראלי — לא מרנדרים כלום.
  if (!ADSENSE_ENABLED || !slotId || !adCountryAllowed()) return null;

  return (
    <div style={{ margin: "40px auto", maxWidth: 728, textAlign: "center", ...style }}>
      {label && (
        <div style={{ fontSize: 10.5, letterSpacing: 2, opacity: 0.4, marginBottom: 6, textTransform: "uppercase", fontFamily: "inherit" }}>
          תוכן שיווקי
        </div>
      )}
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </div>
  );
}
