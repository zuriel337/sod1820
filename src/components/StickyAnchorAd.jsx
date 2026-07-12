import React, { useEffect, useRef, useState } from "react";
import { ADSENSE_CLIENT, ADSENSE_ENABLED, ADSENSE_SLOTS, ensureAdSenseScript, adCountryAllowed } from "../lib/adsense.js";
import { useMediaQuery } from "../lib/useMediaQuery.js";

// 📌 מודעה נעוצה בתחתית המסך (anchor) — מובייל בלבד, בדפי קריאה (פוסטים/ארכיון).
// בדסקטופ במקומה מוצגת מודעת הצד 300×600 (SideRailAd).
// • נסגרת בלחיצת ✕ ולא חוזרת באותו ביקור (sessionStorage) — חובה לפי מדיניות גוגל וגם טעם טוב.
// • מכבדת safe-area של הנייד; z-index מתחת לדיאלוגים.
// • מרימה אוטומטית את כפתורי השיתוף הצפים (👑/🙏) שלא יישבו עליה — דרך class על <body>.
// • בלי מזהה מפרסם/יחידה → no-op מוחלט (לא נטען, לא מוצג).
const DISMISS_KEY = "sod_anchor_ad_dismissed";

export default function StickyAnchorAd({ slot }) {
  const slotId = slot || ADSENSE_SLOTS.anchor || "";
  const isMobile = useMediaQuery("(max-width: 899px)");
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
  });
  const pushed = useRef(false);

  const live = ADSENSE_ENABLED && !!slotId && !dismissed && isMobile && adCountryAllowed();

  // push יחיד ליחידה (גם תחת StrictMode) + הרמת הכפתורים הצפים בזמן שהרצועה פתוחה.
  useEffect(() => {
    if (!live) { document.body.classList.remove("sod-anchor-on"); return; }
    document.body.classList.add("sod-anchor-on");
    if (!pushed.current) {
      ensureAdSenseScript();
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); pushed.current = true; } catch { /* ייטען כשהסקריפט מוכן */ }
    }
    return () => document.body.classList.remove("sod-anchor-on");
  }, [live]);

  if (!live) return null;

  function close() {
    setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* noop */ }
  }

  return (
    <>
      {/* מרים את כפתורי השיתוף הצפים מעל הרצועה (PostShareFab / PrayerSharePopup) */}
      <style>{`
        body.sod-anchor-on .psf-wrap,
        body.sod-anchor-on .psp-fab-wrap { bottom: calc(82px + env(safe-area-inset-bottom, 0px)); }
      `}</style>
      <div
        role="complementary" aria-label="מודעה"
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 850, direction: "rtl",
          background: "rgba(8,5,2,0.97)", borderTop: "1px solid rgba(212,175,55,0.30)",
          boxShadow: "0 -8px 24px rgba(0,0,0,0.45)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <button
          onClick={close} aria-label="סגירת המודעה"
          style={{
            position: "absolute", top: -13, left: 10, width: 26, height: 26, borderRadius: "50%",
            background: "rgba(8,5,2,0.97)", border: "1px solid rgba(212,175,55,0.4)", color: "#e8c84a",
            fontSize: 16, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
          }}
        >×</button>
        <div style={{ textAlign: "center", fontSize: 9, letterSpacing: 2, opacity: 0.4, padding: "3px 0 0", color: "#e8c84a" }}>תוכן שיווקי</div>
        <ins
          className="adsbygoogle"
          style={{ display: "block", height: 60, width: "100%" }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={slotId}
          data-ad-format="horizontal"
          data-full-width-responsive="true"
        />
      </div>
    </>
  );
}
