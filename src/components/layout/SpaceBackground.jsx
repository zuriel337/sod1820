import React from "react";

// רקע גלובלי מלכותי לכל הדפים הכהים (מרונדר ב-Layout): עיר סגולה-לילית עם כתר זהב
// ומנדלה גיאומטרית (public/royal-bg.jpg). התמונה כבר בשפת המותג (סגול+זהב) — לכן
// שומרים את הצבעים (בלי דואוטון/גרייסקייל), רק מחשיכים לעדינות ומחשיכים את המרכז
// (טור התוכן) כדי שהטקסט יישאר קריא; הבניינים והכתר מציצים בשוליים.
export default function SpaceBackground() {
  return (
    <div aria-hidden style={{
      position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden", isolation: "isolate",
      background: "radial-gradient(120% 80% at 50% -8%, #1A1230 0%, #0C0818 55%, #07050e 100%)",
    }}>
      {/* התמונה — צבעים נשמרים, מוחשכת לרקע עדין */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "url(/royal-bg.jpg)", backgroundSize: "cover", backgroundPosition: "center",
        filter: "brightness(0.58) saturate(1.05)", opacity: 0.55,
      }} />
      {/* כיסוי כהה במרכז (טור התוכן) — קריאות; השוליים נשארים חשופים */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(90deg, transparent 0%, rgba(12,8,24,0.55) 9%, rgba(12,8,24,0.93) 25%, #0C0818 40%, #0C0818 60%, rgba(12,8,24,0.93) 75%, rgba(12,8,24,0.55) 91%, transparent 100%)",
      }} />
      {/* עיגון עדין מלמעלה ומלמטה */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, rgba(7,5,14,0.55) 0%, transparent 20%, transparent 80%, rgba(7,5,14,0.6) 100%)",
      }} />
      {/* זוהר זהב עדין למעלה (המשך לכתר שבתמונה) */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(60% 36% at 50% 0%, rgba(233,200,74,0.08), transparent 60%)",
      }} />
    </div>
  );
}
