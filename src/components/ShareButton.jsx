import React, { useState } from "react";
import { C, F } from "../theme.js";

/**
 * כפתור שיתוף לחידוש — חלק מלולאת השיתוף (share viral loop).
 * הקישור מצביע ל-/i/:id (דף-נחיתה עם תצוגה מקדימה יפה בוואטסאפ/פייסבוק),
 * ומשם הגולש מנותב לחידוש/פוסט עצמו.
 *
 * נייד: Web Share API (שיתוף מקורי). מחשב: וואטסאפ ואז fallback להעתקה.
 */

// הדומיין הקנוני — כדי שכל שיתוף יצביע לפרודקשן (לא לדומיין preview).
const SITE = "https://sod1820.co.il";

export default function ShareButton({ insight, source = "card" }) {
  const [copied, setCopied] = useState(false);
  if (!insight?.id) return null;

  const url = `${SITE}/i/${insight.id}`;
  const text = `${insight.title}\n\nחידוש מאומת ✓ מבית המדרש של סוד1820:`;

  async function handleShare(e) {
    e.preventDefault();
    e.stopPropagation();

    // שיתוף מקורי (בעיקר נייד)
    if (navigator.share) {
      try {
        await navigator.share({ title: insight.title, text, url });
        return;
      } catch { /* בוטל — ממשיכים ל-fallback */ }
    }

    // מחשב: פתיחת וואטסאפ Web
    const wa = `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
    const win = window.open(wa, "_blank", "noopener,noreferrer");
    if (win) return;

    // fallback אחרון: העתקה ללוח
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* אין הרשאה — מתעלמים */ }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      data-share-source={source}
      style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        background: "transparent", border: `1px solid ${C.borderGold}`,
        color: C.goldLight, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700,
        borderRadius: 999, padding: "6px 14px", cursor: "pointer",
        transition: "all 0.18s",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = C.gold; e.currentTarget.style.color = C.bg; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.goldLight; }}
      aria-label="שתף חידוש זה"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
        <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" /><line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
      </svg>
      {copied ? "הקישור הועתק ✓" : "שתף"}
    </button>
  );
}
