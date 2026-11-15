import React, { useEffect, useRef } from "react";
import { ADSENSE_CLIENT, ADSENSE_SLOTS, adsAllowedHere, ensureAdSenseScript } from "../lib/adsense.js";

// יחידת מודעה אחת של AdSense (2029). ללא מזהה מפרסם/יחידה, מחוץ לישראל או בצפיית בוט — לא מרנדרת כלום.
// • place — "post" | "list": מכאן נשלף מזהה היחידה. • label — כיתוב עדין "תוכן שיווקי" (שקיפות).
// המקום שמור מראש (min-height) כדי שהמודעה לא תזיז תוכן שכבר נקרא (CLS נשאר בסף הקבוע 0.1).
// כל <ins> דורש push יחיד; ה־ref מונע push כפול (גם תחת StrictMode).
export default function AdSlot({ place = "post", format = "auto", label = true, minHeight = 280 }) {
  const pushed = useRef(false);
  const slotRef = useRef(null);
  const slotId = ADSENSE_SLOTS[place] || "";
  const show = Boolean(slotId) && adsAllowedHere();

  useEffect(() => {
    if (!show || pushed.current) return undefined;
    const start = () => {
      if (pushed.current) return;
      ensureAdSenseScript();
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); pushed.current = true; }
      catch { /* הסקריפט עוד לא נטען — ה־push יתבצע כשהמערך יתרוקן */ }
    };
    // The unit sits after the article. Its library (about 650 KB with the ad frames) used to start the moment the article rendered, in the same seconds as the
    // cover image and the visitor's first interaction. It now starts when the unit comes within a screen and a half of the viewport: at once on a short
    // post, as the visitor scrolls on a long one. The reserved height is unchanged, so nothing moves.
    const node = slotRef.current;
    if (!node || typeof IntersectionObserver === "undefined") { start(); return undefined; }
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); start(); } }, { rootMargin: "1200px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [show]);

  if (!show) return null;
  return (
    <aside ref={slotRef} className="sod29-ad-slot" data-ad-place={place} aria-label="תוכן שיווקי" dir="rtl"
      style={{ margin: "40px auto", maxWidth: 728, minHeight, textAlign: "center", contain: "layout paint" }}>
      {label && <div style={{ fontSize: 10.5, letterSpacing: 2, opacity: 0.45, marginBottom: 6, fontFamily: "inherit" }}>תוכן שיווקי</div>}
      <ins className="adsbygoogle" style={{ display: "block", minHeight: minHeight - 24 }}
        data-ad-client={ADSENSE_CLIENT} data-ad-slot={slotId} data-ad-format={format} data-full-width-responsive="true" />
    </aside>
  );
}
